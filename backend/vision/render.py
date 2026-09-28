"""Annotated video (skeletons, person IDs, live rep counters) + compact overlay JSON for the dashboard."""
import subprocess

import cv2
import numpy as np

EDGES = [(5, 6), (5, 7), (7, 9), (6, 8), (8, 10), (5, 11), (6, 12), (11, 12), (11, 13), (13, 15), (12, 14), (14, 16),
         (0, 5), (0, 6)]
GREEN, YELLOW, GREY, WHITE = (60, 220, 60), (0, 210, 255), (170, 170, 170), (255, 255, 255)


def person_state(person, t):
    """(active_set or None, reps done in it, total reps so far) at time t."""
    active, done, total = None, 0, 0
    for s in person["sets"]:
        n = sum(rt <= t for rt in s["rep_times_s"])
        total += n
        if s["start_s"] - 0.3 <= t <= s["end_s"] + 1.5:
            active, done = s, n
    return active, done, total


def _text(img, txt, org, scale, color, thick=1):
    cv2.putText(img, txt, org, cv2.FONT_HERSHEY_SIMPLEX, scale, (0, 0, 0), thick + 2, cv2.LINE_AA)
    cv2.putText(img, txt, org, cv2.FONT_HERSHEY_SIMPLEX, scale, color, thick, cv2.LINE_AA)


def render_video(video_path, data, people, out_path, min_kp_conf=0.3):
    tid2p = {tid: p for p in people for tid in p["track_ids"]}
    W, H = data["width"], data["height"]
    k = max(1.0, 1280 / W)  # upscale small footage so labels stay readable
    OW, OH = int(W * k) // 2 * 2, int(H * k) // 2 * 2
    frames = data["frames"]
    fps = (len(frames) - 1) / max(frames[-1]["t"] - frames[0]["t"], 1e-6)
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{OW}x{OH}", "-r", f"{fps:.3f}",
         "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-preset", "veryfast",
         "-movflags", "+faststart", str(out_path)], stdin=subprocess.PIPE)
    cap = cv2.VideoCapture(str(video_path))
    lifters = [p for p in people if p["sets"]]
    for f in frames:
        ok, img = cap.read()
        if not ok:
            break
        img = cv2.resize(img, (OW, OH), interpolation=cv2.INTER_LINEAR)
        t = f["t"]
        for det in f["people"]:
            p = tid2p.get(det["id"])
            if p is None:
                continue
            active, done, total = person_state(p, t)
            color = GREEN if active else (YELLOW if p["sets"] else GREY)
            kp = np.array(det["kp"])
            pts = (kp[:, :2] * k).astype(int)
            ok_kp = kp[:, 2] >= min_kp_conf
            for a, b in EDGES:
                if ok_kp[a] and ok_kp[b]:
                    cv2.line(img, tuple(pts[a]), tuple(pts[b]), color, 2, cv2.LINE_AA)
            for i in np.where(ok_kp)[0]:
                cv2.circle(img, tuple(pts[i]), 2, color, -1, cv2.LINE_AA)
            x1, y1, x2, y2 = (np.array(det["box"]) * k).astype(int)
            just_repped = active is not None and any(t - 0.4 < rt <= t for rt in active["rep_times_s"])
            if active is not None:
                cv2.rectangle(img, (x1, y1), (x2, y2), color, 4 if just_repped else 1)
            label = f"P{p['id']}"
            if active is not None:
                label += f" {active['exercise'].replace('_', ' ')} x{done}"
            _text(img, label, (x1, max(14, y1 - 6)), 0.5, color)
            if just_repped:
                _text(img, "+1", (x2 + 4, y1 + 18), 0.7, GREEN, 2)
        # Session panel: running totals for everyone who has done a set.
        y = 26
        for p in lifters:
            _, _, total = person_state(p, t)
            ex = ", ".join(sorted({s["exercise"].replace("_", " ") for s in p["sets"] if s["start_s"] - 0.3 <= t}))
            _text(img, f"P{p['id']}  {total:>2} reps  {ex}", (12, y), 0.6, WHITE)
            y += 24
        _text(img, f"t={t:5.1f}s", (OW - 110, 24), 0.55, WHITE)
        ff.stdin.write(img.tobytes())
    cap.release()
    ff.stdin.close()
    ff.wait()


def overlay_json(data, people, fps=15, min_kp_conf=0.3):
    """Downsampled per-frame boxes + skeletons keyed by person id, for drawing on the <video> in the browser.

    frames[i] = {"t": s, "p": [[pid, x1, y1, x2, y2, kx0, ky0, ..., kx16, ky16], ...]}, missing keypoints = -1.
    """
    tid2pid = {tid: p["id"] for p in people for tid in p["track_ids"]}
    out, next_t = [], -1.0
    for f in data["frames"]:
        if f["t"] < next_t:
            continue
        next_t = f["t"] + 1.0 / fps
        rows = []
        for det in f["people"]:
            pid = tid2pid.get(det["id"])
            if pid is None:
                continue
            kp = [v for x, y, c in det["kp"] for v in ((int(round(x)), int(round(y))) if c >= min_kp_conf else (-1, -1))]
            rows.append([pid] + [int(round(v)) for v in det["box"]] + kp)
        out.append({"t": round(f["t"], 3), "p": rows})
    return {"fps": fps, "width": data["width"], "height": data["height"],
            "keypoints": "coco17", "edges": EDGES, "frames": out}
