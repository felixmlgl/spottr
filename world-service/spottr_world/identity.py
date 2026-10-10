"""Global identity lifecycle and the shared world state.

Processing is causal with a fixed decision lag: the world state for tick t is emitted when evidence up
to t + LAG is in. That lets recent assignments be revised (a link confirmed 2 s after two tracklets
started still gives them one identity from their first tick), and works the same on a live stream
(the published state is LAG seconds behind real time). Every decision and revision goes to an audit log.

Global identities are clusters of local tracklets joined by confirmed links (cross-camera or temporal),
built with union-find under cannot-link constraints: one identity never holds two simultaneous
tracklets from the same camera, nor simultaneous tracklets that disagree on the floor.
"""
from __future__ import annotations

import math
from collections import Counter
from dataclasses import dataclass

import numpy as np

from .association import (LINK_MARGIN, LINK_SCORE, PENDING_SCORE, REVOKE_SCORE, TEMPORAL_EVAL_DELAY_S, Link,
                          PairEvidence, decide_cross_camera, link_confidence, temporal_candidates)
from .tracklets import TICK_S, Tracklet

LAG_S = 3.0
STEP_TICKS = 1
OCCLUDED_S = 5.0          # after this long unseen, an identity is considered to have left
EXITED_SHOW_S = 2.0       # keep "exited" in the world state briefly so clients can fade it out
CONFLICT_DIST_M = 1.5
CONFIRMED_CONF = 0.75
AMBIGUOUS_REACQ_S = 8.0   # an unresolved "maybe a returning person" stays flagged this long, then settles as new


@dataclass
class _Cluster:
    gid: int
    members: list[str]


class UnionFind:
    def __init__(self):
        self.p: dict[str, str] = {}

    def find(self, x: str) -> str:
        self.p.setdefault(x, x)
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def union(self, a: str, b: str) -> None:
        self.p[self.find(a)] = self.find(b)


def _label(gid: int) -> str:
    return f"Person {gid:02d}"


class IdentityResolver:
    def __init__(self, tracklets: list[Tracklet], pairs: dict[tuple[str, str], PairEvidence], n_ticks: int):
        self.tl = {t.key: t for t in tracklets}
        self.pairs = pairs
        self.pair_index: dict[str, list[tuple[str, str]]] = {}
        for k in pairs:
            self.pair_index.setdefault(k[0], []).append(k)
            self.pair_index.setdefault(k[1], []).append(k)
        self.n_ticks = n_ticks
        self.lag = int(round(LAG_S / TICK_S))
        self.cross: dict[tuple[str, str], Link] = {}
        self.cross_margin: dict[tuple[str, str], float] = {}
        self.temporal: dict[str, Link] = {}
        self.temporal_ambiguous: dict[str, list[dict]] = {}
        self.temporal_done: set[str] = set()
        self.temporal_ambiguous_tick: dict[str, int] = {}
        self.blocked_logged: set[tuple[str, str]] = set()
        self.pending: dict[tuple[str, str], dict] = {}
        self.gid_of: dict[str, int] = {}
        self.next_gid = 1
        self.events: list[dict] = []
        self.hist: dict[int, list[tuple[int, np.ndarray]]] = {}
        self.last_obs: dict[int, tuple[int, np.ndarray, list[str]]] = {}
        self.first_obs: dict[int, int] = {}
        self.observed_ticks: Counter = Counter()
        self.by_start = sorted(tracklets, key=lambda t: t.t_start)

    # ---------------------------------------------------------------- constraints
    def _compatible(self, X: list[str], Y: list[str]) -> tuple[bool, str]:
        for p in X:
            tp = self.tl[p]
            for q in Y:
                tq = self.tl[q]
                lo, hi = max(tp.t_start, tq.t_start), min(tp.t_end, tq.t_end)
                if hi - lo < 2:
                    continue
                if tp.camera_id == tq.camera_id:
                    return False, f"{p} and {q} are simultaneous in one camera"
                ev = self.pairs.get((p, q)) or self.pairs.get((q, p))
                if ev is None:
                    return False, f"{p} and {q} never come within the gate"
                if float(np.mean(ev.dist)) > CONFLICT_DIST_M:
                    return False, f"{p} and {q} disagree by {np.mean(ev.dist):.1f} m"
        return True, ""

    def _clusters(self, upto: int) -> list[list[str]]:
        uf = UnionFind()
        members: dict[str, list[str]] = {}
        for k, t in self.tl.items():
            if t.t_start <= upto:
                members[k] = [k]
                uf.find(k)
        links = [l for l in list(self.cross.values()) + list(self.temporal.values())
                 if l.a in members and l.b in members]
        links.sort(key=lambda l: -l.confidence)
        for l in links:
            ra, rb = uf.find(l.a), uf.find(l.b)
            if ra == rb:
                continue
            ok, why = self._compatible(members[ra], members[rb])
            if not ok:
                if (l.a, l.b) not in self.blocked_logged:
                    self.blocked_logged.add((l.a, l.b))
                    self.events.append({"tick": upto, "type": "link_blocked", "link": [l.a, l.b], "reason": why})
                continue
            uf.union(ra, rb)  # rb becomes the root
            members[rb] = members[rb] + members.pop(ra)
        return [m for r, m in members.items() if uf.find(r) == r]

    def _assign_gids(self, clusters: list[list[str]], tick: int) -> dict[str, int]:
        clusters = sorted(clusters, key=lambda c: min(self.tl[k].t_start for k in c))
        taken: set[int] = set()
        new_map: dict[str, int] = {}
        for c in clusters:
            prior = sorted({self.gid_of[k] for k in c if k in self.gid_of})
            gid = next((g for g in prior if g not in taken), None)
            if gid is None:
                gid = self.next_gid
                self.next_gid += 1
                if prior:  # every prior identity was kept by an older cluster: this part was split off
                    self.events.append({"tick": tick, "type": "identity_split", "gid": gid, "label": _label(gid),
                                        "from": prior, "tracklets": list(c)})
                else:
                    self.events.append({"tick": tick, "type": "identity_created", "gid": gid,
                                        "label": _label(gid), "tracklets": list(c)})
            for g in prior:
                if g != gid and g not in taken:
                    self.events.append({"tick": tick, "type": "identities_merged", "gid": gid, "absorbed": g,
                                        "label": _label(gid)})
                    taken.add(g)
            taken.add(gid)
            for k in c:
                new_map[k] = gid
        self.gid_of = new_map
        return new_map

    # ---------------------------------------------------------------- decisions at step T
    def _decide(self, T: int) -> None:
        active = {k for k, t in self.tl.items() if t.t_start <= T <= t.t_end + 2}
        confirmed, pending = decide_cross_camera(self.pairs, active, T)
        for k, (sc, margin, info) in confirmed.items():
            conf = link_confidence(sc, margin)
            if k not in self.cross:
                self.cross[k] = Link("cross_camera", k[0], k[1], sc, conf, T, info)
                self.events.append({"tick": T, "type": "cross_camera_link", "link": list(k), "score": round(sc, 2),
                                    "confidence": conf, "evidence": info})
            else:
                l = self.cross[k]
                l.score, l.confidence, l.evidence = sc, conf, info
            self.cross_margin[k] = margin
        for k in list(self.cross):
            if k in confirmed or (k[0] not in active and k[1] not in active):
                continue
            info = self.pairs[k].upto(T)
            if info is None or info["score"] < REVOKE_SCORE:
                l = self.cross.pop(k)
                self.events.append({"tick": T, "type": "link_revoked", "link": list(k),
                                    "reason": "evidence fell below threshold", "evidence": info, "was": l.score})
            else:
                # still plausible but no longer the clear winner: keep, mark contested
                self.cross_margin[k] = pending.get(k, {}).get("margin") or 0.0
                self.cross[k].evidence = dict(info, contested=True)
        self.pending = {k: v for k, v in pending.items() if k not in self.cross}

        # temporal links (re-acquisition after occlusion / exit, or handoff without overlap)
        delay = int(round(TEMPORAL_EVAL_DELAY_S / TICK_S))
        for t in self.by_start:
            if t.t_start > T:
                break
            if t.key in self.temporal_done:
                continue
            if T < min(t.t_start + delay, t.t_end):
                continue
            self.temporal_done.add(t.key)
            clusters = self._clusters(T)
            mine = next(c for c in clusters if t.key in c)
            if any(self.tl[m].t_start < t.t_start - 1 for m in mine):
                continue  # already continues an ongoing identity through a cross-camera link
            # Candidates: identities with no track in this camera right now. Either lost everywhere
            # (occlusion, exit, handoff through a blind spot) or still seen by another camera, in which
            # case that camera's live position is the reference ("one camera lost them, the other didn't").
            ended = []
            for c in clusters:
                if t.key in c:
                    continue
                members = [self.tl[m] for m in c]
                same_cam = [m for m in members if m.camera_id == t.camera_id]
                if any(min(m.t_end, t.t_end) - max(m.t_start, t.t_start) >= 2 for m in same_cam):
                    continue
                gid = self.gid_of.get(c[0], -1)
                live = [m for m in members if m.camera_id != t.camera_id and m.at(t.t_start) is not None]
                app_ref = max(same_cam, key=lambda x: x.t_end) if same_cam else None
                # "Lost here, still seen there" only for identities this camera saw before; a first
                # sighting in this camera is a cross-camera association and goes through pair evidence.
                if live and same_cam:
                    o = live[0]
                    ended.append((gid, app_ref or o, o.pos[o.at(t.t_start)], t.t_start, "seen_by_other_camera"))
                elif not live:
                    last = max(members, key=lambda x: x.t_end)
                    if last.t_end <= t.t_start + 1:
                        ended.append((gid, app_ref or last, last.pos[-1], last.t_end, "lost"))
            cands = temporal_candidates(t, ended, T)
            if not cands:
                continue
            best = cands[0]
            margin = best["score"] - max(0.0, cands[1]["score"] if len(cands) > 1 else 0.0)
            if best["score"] >= best["need"] and margin >= LINK_MARGIN and best["app_ok"]:
                conf = link_confidence(best["score"] + (LINK_SCORE - best["need"]), margin)
                ev = dict(best, margin=round(margin, 2))
                self.temporal[t.key] = Link("temporal", best["prev"], t.key, best["score"], conf, T, ev)
                self.events.append({"tick": T, "type": "reacquired", "link": [best["prev"], t.key],
                                    "confidence": conf, "evidence": ev})
            elif best["score"] >= PENDING_SCORE:
                self.temporal_ambiguous[t.key] = cands[:3]
                self.temporal_ambiguous_tick[t.key] = T
                self.events.append({"tick": T, "type": "ambiguous_reacquisition", "tracklet": t.key,
                                    "candidates": cands[:3]})

    # ---------------------------------------------------------------- world state at tick t
    def _fused(self, members: list[str], tick: int) -> tuple[np.ndarray, list[Tracklet]] | None:
        P, Wt, seen = [], [], []
        for k in members:
            tr = self.tl[k]
            i = tr.at(tick)
            if i is None:
                continue
            P.append(tr.pos[i])
            Wt.append(1 / tr.sigma[i] ** 2)
            seen.append(tr)
        if not P:
            return None
        Wt = np.array(Wt)
        return (np.array(P) * Wt[:, None]).sum(0) / Wt.sum(), seen

    def _emit(self, t: int, clusters: list[list[str]], gmap: dict[str, int]) -> dict:
        people = []
        for c in clusters:
            gid = gmap[c[0]]
            now = self._fused(c, t)
            if now is not None:
                # centred smoothing (the lag lets us look 2 ticks ahead)
                acc = [now[0]]
                for dt in (-2, -1, 1, 2):
                    f = self._fused(c, t + dt)
                    if f is not None:
                        acc.append(f[0])
                pos = np.mean(acc, axis=0)
                seen = now[1]
                self.last_obs[gid] = (t, pos, [s.key for s in seen])
                self.first_obs.setdefault(gid, t)
                self.observed_ticks[gid] += 1
                h = self.hist.setdefault(gid, [])
                h.append((t, pos))
                if len(h) > 30:
                    del h[:-30]
                state = "active"
            else:
                if gid not in self.last_obs:
                    continue
                last_t, pos, _ = self.last_obs[gid]
                unseen = (t - last_t) * TICK_S
                if unseen <= OCCLUDED_S:
                    state = "temporarily_occluded"
                elif unseen <= OCCLUDED_S + EXITED_SHOW_S:
                    state = "exited"
                else:
                    continue
                seen = []
            vel = np.zeros(2)
            h = [(tt, p) for tt, p in self.hist.get(gid, []) if t - tt <= 5]
            if state == "active" and len(h) >= 3:
                tt = np.array([x[0] for x in h]) * TICK_S
                pp = np.array([x[1] for x in h])
                A = np.column_stack([tt - tt[-1], np.ones(len(tt))])
                vel = np.linalg.lstsq(A, pp, rcond=None)[0][0]
            speed = float(np.linalg.norm(vel))
            if speed < 0.15:
                vel, speed = np.zeros(2), 0.0
            # links and evidence
            cset = set(c)
            links = [l for l in self.cross.values() if l.a in cset and l.b in cset]
            links += [l for l in self.temporal.values() if l.a in cset and l.b in cset]
            seen_keys = {s.key for s in seen}
            live_links = [l for l in links if l.a in seen_keys and l.b in seen_keys]
            ambiguous_with = []
            for k in seen_keys:
                for pk in self.pair_index.get(k, []):
                    if pk in self.pending and not (pk[0] in cset and pk[1] in cset):
                        other = pk[1] if pk[0] == k else pk[0]
                        if self.tl[other].at(t) is not None:
                            ambiguous_with.append({"tracklet": other, "gid": gmap.get(other),
                                                   "score": round(self.pending[pk]["score"], 2)})
                if k in self.temporal_ambiguous and (t - self.temporal_ambiguous_tick[k]) * TICK_S <= AMBIGUOUS_REACQ_S:
                    ambiguous_with += [{"gid": cnd["gid"], "tracklet": cnd["prev"], "score": cnd["score"]}
                                       for cnd in self.temporal_ambiguous[k]]
            contested = any(self.cross_margin.get((l.a, l.b), LINK_MARGIN) < LINK_MARGIN for l in live_links
                            if l.kind == "cross_camera")
            observed_s = self.observed_ticks[gid] * TICK_S
            conf = 0.55 + 0.4 * min(1.0, observed_s / 3.0)
            if live_links:
                conf = max(conf, min(l.confidence for l in live_links))
            tlinks = [l for l in links if l.kind == "temporal"]
            if tlinks:
                conf = min(conf, max(l.confidence for l in tlinks))
            is_amb = bool(ambiguous_with) or contested
            if state != "active":
                conf *= math.exp(-((t - self.last_obs[gid][0]) * TICK_S) / 5.0)
            if is_amb:
                conf = min(conf, 0.5)
            lifecycle = "ambiguous" if is_amb and state == "active" else state
            if state == "exited":
                display = None
            elif is_amb:
                display = "Needs confirmation"
            elif conf >= CONFIRMED_CONF:
                display = "Confirmed"
            else:
                display = "Tracking"
            people.append({
                "global_person_id": f"g{gid:03d}",
                "label": _label(gid),
                "x": round(float(pos[0]), 3), "y": round(float(pos[1]), 3),
                "vx": round(float(vel[0]), 3), "vy": round(float(vel[1]), 3),
                "speed_mps": round(speed, 2),
                "heading_deg": round(math.degrees(math.atan2(vel[1], vel[0])), 1) if speed > 0 else None,
                "camera_ids": sorted({s.camera_id for s in seen}),
                "local_track_ids": sorted(seen_keys),
                "identity_confidence": round(conf, 3),
                "state": lifecycle,
                "display_state": display,
                "evidence": _evidence_summary(live_links or links, ambiguous_with, len({s.camera_id for s in seen})),
                "last_observed_t": round(self.last_obs[gid][0] * TICK_S, 2),
            })
        people.sort(key=lambda p: p["global_person_id"])
        return {"tick": t, "t": round(t * TICK_S, 2), "people": people}

    def run(self, on_frame) -> None:
        for T in range(0, self.n_ticks + self.lag, STEP_TICKS):
            self._decide(T)
            clusters = self._clusters(T)
            gmap = self._assign_gids(clusters, T)
            t = T - self.lag
            if t >= 0:
                on_frame(self._emit(t, clusters, gmap), gmap)


def _evidence_summary(links: list[Link], ambiguous_with: list[dict], n_cams: int) -> dict:
    basis = set()
    items = []
    for l in links:
        e = l.evidence
        if l.kind == "cross_camera":
            if e.get("geo", 0) > 1.0:
                basis.add("geometry")
            if e.get("geo", 0) > 1.0 and e.get("overlap_s", 0) >= 1:
                basis.add("timing")
            if e.get("motion", 0) > 0.3:
                basis.add("motion")
            if e.get("app", 0) > 0.3:
                basis.add("appearance")
            items.append({"type": "cross_camera", "tracklets": [l.a, l.b], "confidence": l.confidence,
                          "floor_distance_m": e.get("recent_dist_m"), "overlap_s": e.get("overlap_s"),
                          "geometry_llr": round(e.get("geo", 0), 2), "motion_llr": round(e.get("motion", 0), 2),
                          "appearance_llr": round(e.get("app", 0), 2), "appearance_similarity": e.get("app_sim"),
                          "margin": e.get("margin"), "contested": bool(e.get("contested"))})
        else:
            basis.add("timing")
            if e.get("geo", 0) > 1.0:
                basis.add("geometry")
            if e.get("app", 0) > 0.3:
                basis.add("appearance")
            items.append({"type": "reacquired", "tracklets": [l.a, l.b], "confidence": l.confidence,
                          "gap_s": e.get("gap_s"), "distance_m": e.get("dist_m"),
                          "appearance_similarity": e.get("app_sim")})
    return {"cameras_now": n_cams, "supported_by": sorted(basis), "links": items[:4],
            "ambiguous_with": ambiguous_with[:3]}
