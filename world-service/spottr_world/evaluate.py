"""Evaluate the shared world state against a manually reviewed ground-truth segment.

Ground truth assigns camera-local tracks to real people (data/ground_truth/*.json). The world state
reports, for every global identity at every tick, which local tracklets it currently consists of.
From that we measure:

  IDF1                     identity F1 over person-ticks (Ristani et al. 2016), global identities vs GT people
  ID switches              times a GT person's global identity changes between consecutive observed ticks
  cross-camera recall      share of ticks where a GT person seen by both cameras is one identity (not two)
  missed associations      person-ticks where a GT person is split over >1 identity at the same tick
  false merges             person-ticks where one identity contains tracks of >1 GT person
  ambiguous share          share of GT person-ticks shown as "Needs confirmation"
  position disagreement    floor distance between the two cameras' projections of the same GT person
                           (no surveyed positions exist: this bounds calibration error, it is not absolute)

  python -m spottr_world.evaluate out/great_hall data/ground_truth/great_hall_030_090.json
"""
from __future__ import annotations

import gzip
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from scipy.optimize import linear_sum_assignment


def _gt_index(gt: dict, strict: bool) -> dict[tuple[str, int], str]:
    idx = {}
    for p in gt["persons"]:
        if strict and p.get("certainty") != "certain":
            continue
        for tr in p["tracks"]:
            idx[(tr["camera_id"], int(tr["local_track_id"]))] = p["gt_id"]
    return idx


def _local(key: str) -> tuple[str, int]:
    cam, rest = key.split(":")
    return cam, int(rest.split(".")[0])


def evaluate(run_dir: Path, gt_path: Path, strict: bool = True) -> dict:
    gt = json.loads(Path(gt_path).read_text())
    t0, t1 = gt["segment"]["from_s"], gt["segment"]["to_s"]
    idx = _gt_index(gt, strict)
    gt_people = {p["gt_id"] for p in gt["persons"] if not strict or p.get("certainty") == "certain"}
    two_cam_people = {p["gt_id"] for p in gt["persons"]
                      if len({t["camera_id"] for t in p["tracks"]}) > 1 and p["gt_id"] in gt_people}

    # camera observations: positions per (camera, local track) per tick
    cam_pos: dict[int, dict[tuple[str, int], list[float]]] = defaultdict(dict)
    for cam in ("cam1", "cam2"):
        p = run_dir / "camera_obs" / f"{cam}.jsonl.gz"
        with gzip.open(p, "rt") as f:
            for line in f:
                r = json.loads(line)
                if t0 <= r["t"] <= t1:
                    for o in r["observations"]:
                        if o["world"] is not None and "touches_frame_edge" not in o["quality_flags"]:
                            cam_pos[r["tick"]][(cam, o["local_track_id"])] = (o["world"], o["floor_method"])

    co = Counter()            # (gt, pred) -> ticks
    gt_ticks = Counter()
    pred_ticks = Counter()
    seq: dict[str, list[tuple[int, str]]] = defaultdict(list)
    split_ticks = merge_ticks = 0
    two_cam_ticks = unified_ticks = 0
    ambiguous_ticks = 0
    gt_person_ticks = 0
    merge_events = set()
    split_events = set()
    pos_err = []
    with gzip.open(run_dir / "world_state.jsonl.gz", "rt") as f:
        for line in f:
            fr = json.loads(line)
            if not (t0 <= fr["t"] <= t1):
                continue
            tick = fr["tick"]
            gt_to_preds: dict[str, set[str]] = defaultdict(set)
            gt_cams: dict[str, set[str]] = defaultdict(set)
            gt_amb: dict[str, bool] = {}
            for p in fr["people"]:
                if p["state"] not in ("active", "ambiguous"):
                    continue
                gts = set()
                for k in p["local_track_ids"]:
                    g = idx.get(_local(k))
                    if g:
                        gts.add(g)
                        gt_to_preds[g].add(p["global_person_id"])
                        gt_cams[g].add(k.split(":")[0])
                        gt_amb[g] = gt_amb.get(g, False) or p["state"] == "ambiguous"
                if not gts:
                    continue
                pred_ticks[p["global_person_id"]] += 1
                if len(gts) > 1:
                    merge_ticks += 1
                    merge_events.add((p["global_person_id"], tuple(sorted(gts))))
                for g in gts:
                    co[(g, p["global_person_id"])] += 1
            for g, preds in gt_to_preds.items():
                gt_ticks[g] += 1
                gt_person_ticks += 1
                ambiguous_ticks += gt_amb.get(g, False)
                main = sorted(preds)[0]
                seq[g].append((tick, main))
                if len(preds) > 1:
                    split_ticks += 1
                    split_events.add((g, tuple(sorted(preds))))
                if g in two_cam_people:
                    tracks_now = [k for k in cam_pos.get(tick, {}) if idx.get(k) == g]
                    cams_now = {k[0] for k in tracks_now}
                    if len(cams_now) > 1:
                        two_cam_ticks += 1
                        unified_ticks += len(preds) == 1 and len(gt_cams[g]) > 1
                        # position disagreement between the two cameras for this GT person
                        a = [cam_pos[tick][k] for k in tracks_now if k[0] == "cam1"]
                        b = [cam_pos[tick][k] for k in tracks_now if k[0] == "cam2"]
                        if a and b:
                            pos_err.append((float(np.linalg.norm(np.array(a[0][0]) - np.array(b[0][0]))),
                                            a[0][1] in ("ankles", "one_ankle") and b[0][1] in ("ankles", "one_ankle")))

    # IDF1: optimal one-to-one GT<->pred assignment by co-occurring ticks
    gts = sorted(gt_ticks)
    preds = sorted(pred_ticks)
    M = np.zeros((len(gts), len(preds)))
    for (g, p), n in co.items():
        if g in gts and p in preds:
            M[gts.index(g), preds.index(p)] = n
    r, c = linear_sum_assignment(-M) if M.size else ([], [])
    idtp = float(M[r, c].sum()) if M.size else 0.0
    n_gt = sum(gt_ticks.values())
    n_pred = sum(pred_ticks.values())
    idf1 = 2 * idtp / max(n_gt + n_pred, 1)
    switches = {g: sum(1 for (_, a), (_, b) in zip(s, s[1:]) if a != b) for g, s in seq.items()}
    per_person = {}
    assigned = {gts[i]: preds[j] for i, j in zip(r, c)}
    for g in gts:
        per_person[g] = {
            "ticks": gt_ticks[g],
            "main_identity": assigned.get(g),
            "identity_share": round(co[(g, assigned.get(g))] / gt_ticks[g], 3) if assigned.get(g) else 0.0,
            "identities_used": len({p for (gg, p) in co if gg == g}),
            "switches": switches.get(g, 0),
        }
    e = np.array([x for x, _ in pos_err]) if pos_err else np.zeros(0)
    e_feet = np.array([x for x, ok in pos_err if ok]) if pos_err else np.zeros(0)
    return {
        "segment_s": [t0, t1],
        "strict": strict,
        "gt_people": len(gts),
        "gt_person_ticks": n_gt,
        "IDF1": round(idf1, 3),
        "IDP": round(idtp / max(n_pred, 1), 3),
        "IDR": round(idtp / max(n_gt, 1), 3),
        "id_switches": int(sum(switches.values())),
        "cross_camera": {
            "co_observed_person_ticks": two_cam_ticks,
            "unified_person_ticks": int(unified_ticks),
            "recall": round(unified_ticks / max(two_cam_ticks, 1), 3),
        },
        "missed_associations": {"person_ticks": split_ticks, "distinct_events": len(split_events)},
        "false_merges": {"person_ticks": merge_ticks, "distinct_events": len(merge_events),
                         "events": [{"identity": m[0], "gt_people": list(m[1])} for m in sorted(merge_events)][:10]},
        "ambiguous_share": round(ambiguous_ticks / max(gt_person_ticks, 1), 3),
        "cross_camera_position_disagreement_m": {
            "all": None if not len(e) else {"n": int(len(e)), "median": round(float(np.median(e)), 2),
                                            "p90": round(float(np.percentile(e, 90)), 2)},
            "feet_visible_in_both": None if not len(e_feet) else {
                "n": int(len(e_feet)), "median": round(float(np.median(e_feet)), 2),
                "p90": round(float(np.percentile(e_feet, 90)), 2)},
        },
        "per_person": per_person,
    }


if __name__ == "__main__":
    run = Path(sys.argv[1])
    res = {"strict": evaluate(run, Path(sys.argv[2]), True), "with_probable": evaluate(run, Path(sys.argv[2]), False)}
    (run / "evaluation.json").write_text(json.dumps(res, indent=2))
    print(json.dumps(res["strict"], indent=2))
    print("with probable pairs: IDF1", res["with_probable"]["IDF1"], "false merges", res["with_probable"]["false_merges"]["person_ticks"])
