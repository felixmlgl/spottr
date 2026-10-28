"""Run the world service on the two-camera gym test scene and export it for the demo's "Two angles" option.

Inputs: videosCorrect/GymAngle1.mp4 (cam 1, southwest) and GymAngle2.mp4 (cam 2, southeast), the same room
and the same two people seen from two corners: the two halves of one generated 24 fps clip, cut at the camera
switch (frame 178). Output: public/world-demo-angles/ (same files as the /gyms/world-map export).

Calibration is the operator workflow from world-service/docs/CALIBRATION_GUIDE.md, done by hand with no
surveyed plan: cam 1 is fitted to the room's back corners, both side walls and the yoga mat's size
(0.65 x 1.85 m); every landmark cam 2 shares with cam 1 then gets its floor position from cam 1's fit.

    PY=world-service/.venv/bin/python
    $PY scripts/gym_two_angles.py --track     # once: detection + tracking (needs world-service/models/yolo26s-pose.pt)
    $PY scripts/gym_two_angles.py             # calibration + identities + export
"""
import argparse
import math
import sys
from pathlib import Path

import cv2
import numpy as np
from scipy.optimize import least_squares

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "world-service"))
from spottr_world import association, calibration as cal  # noqa: E402
from spottr_world import export as ex  # noqa: E402
from spottr_world import identity, pipeline  # noqa: E402
from spottr_world.pipeline import run  # noqa: E402

RUN = ROOT / "world-service" / "out" / "gym_two_angles"
OUT = ROOT / "public" / "world-demo-angles"
CALIB = ROOT / "world-service" / "data" / "calibration" / "gym_two_angles.json"
SIZE = (854, 480)
CAMERAS = [
    {"camera_id": "cam1", "label": "Camera 1", "video": str(ROOT / "videosCorrect" / "GymAngle1.mp4")},
    {"camera_id": "cam2", "label": "Camera 2", "video": str(ROOT / "videosCorrect" / "GymAngle2.mp4")},
]
MAT = (0.65, 1.85)  # m, the left yoga mat
ROOM_DEPTH = 7.0    # m, back wall to the camera wall (estimated: cameras hang just behind the visible floor)

# Pixel clicks on the background plates (854x480). Same id = same floor spot in both cameras.
NAMES = {
    "back_l": "Back wall, left corner", "back_r": "Back wall, right corner",
    "matA_fl": "Left mat, far-left corner", "matA_fr": "Left mat, far-right corner",
    "matB_fl": "Right mat, far-left corner", "matB_fr": "Right mat, far-right corner",
    "bike_l": "Bike, rear foot left", "bike_r": "Bike, rear foot right",
    "tread_l": "Treadmill, rear foot left", "tread_r": "Treadmill, rear foot right",
}
CLICKS = {
    "cam1": {"back_l": (269, 152), "back_r": (739, 137), "matA_fl": (658, 280), "matA_fr": (742, 272),
             "matB_fl": (749, 272), "matB_fr": (805, 270), "bike_l": (670, 210), "bike_r": (727, 210),
             "tread_l": (235, 267), "tread_r": (333, 257)},
    "cam2": {"back_l": (393, 101), "back_r": (815, 200), "matA_fl": (555, 343), "matA_fr": (662, 337),
             "matB_fl": (687, 348), "matB_fr": (773, 377), "bike_l": (667, 250), "bike_r": (733, 270),
             "tread_l": (293, 177), "tread_r": (350, 193)},
}
CAM1_WALLS = {"left": (23, 473), "right": (853, 273)}  # a point on each side wall's floor line, near the camera
MAT_PX = [(658, 280), (742, 272), (721, 461), (825, 445)]  # cam 1: far-l, far-r, near-l, near-r
# Floor visible in each picture (image polygon below the wall lines)
FLOOR_PX = {
    "cam1": [(269, 152), (739, 137), (853, 273), (853, 480), (0, 480), (23, 473)],
    "cam2": [(393, 101), (815, 200), (800, 480), (0, 480), (0, 277)],
}


def fit_cam1() -> np.ndarray:
    """Back corners at y=0, side walls at x=0 and x=W; solve W and the two wall depths from the mat's size."""
    src = np.array([CLICKS["cam1"]["back_l"], CLICKS["cam1"]["back_r"], CAM1_WALLS["left"], CAM1_WALLS["right"]], np.float32)

    def H_of(p):
        w, dl, dr = p
        return cv2.getPerspectiveTransform(src, np.array([(0, 0), (w, 0), (0, dl), (w, dr)], np.float32))

    def res(p):
        m = cal.apply_h(H_of(p), np.array(MAT_PX, float))
        return [np.linalg.norm(m[1] - m[0]) - MAT[0], np.linalg.norm(m[3] - m[2]) - MAT[0],
                np.linalg.norm(m[2] - m[0]) - MAT[1], np.linalg.norm(m[3] - m[1]) - MAT[1]]

    r = least_squares(res, [5, 5, 4], diff_step=1e-3)
    assert r.cost < 1e-2, f"cam 1 fit did not converge: {r.x} {r.fun}"
    return H_of(r.x)


def pose(H: np.ndarray) -> tuple[list, float, float]:
    """Approximate camera spot, heading and FOV for the map icon: where the projected image edges meet."""
    l0, l1, r0, r1, c = cal.apply_h(H, np.array([(0, 300), (0, 480), (853, 300), (853, 480), (427, 300)], float))
    A = np.array([l1 - l0, -(r1 - r0)]).T
    s = np.linalg.solve(A, r0 - l0)[0]
    pos = l0 + s * (l1 - l0)
    pos[1] = min(pos[1], ROOM_DEPTH)  # shortcut: no pinhole model, so the camera is pulled onto the back wall plane
    ang = lambda p: math.atan2(p[1] - pos[1], p[0] - pos[0])
    fov = abs(math.degrees(ang(r0) - ang(l0)))
    return pos.round(2).tolist(), round(math.degrees(ang(c)), 1), round(fov if fov <= 180 else 360 - fov, 1)


def calibration() -> dict:
    H1 = fit_cam1()
    world = {k: cal.apply_h(H1, np.array([px], float))[0] for k, px in CLICKS["cam1"].items()}
    px2 = np.array(list(CLICKS["cam2"].values()), float)
    H2, _ = cal.fit_homography(px2, np.array([world[k] for k in CLICKS["cam2"]]))
    width = round(float(world["back_r"][0]), 2)
    room = np.array([[0, 0], [width, ROOM_DEPTH]])
    cams = []
    for c, H in zip(CAMERAS, (H1, H2)):
        cid = c["camera_id"]
        px = np.array(list(CLICKS[cid].values()), float)
        wd = np.array([world[k] for k in CLICKS[cid]])
        rep = cal.reprojection_report(H, px, wd, SIZE)
        q, reasons = cal.grade(rep)
        pos, heading, fov = pose(H)
        floor = np.clip(cal.apply_h(H, np.array(FLOOR_PX[cid], float)), room[0], room[1])
        cams.append({
            "camera_id": cid, "label": c["label"], "video": Path(c["video"]).name, "image_size": list(SIZE),
            "time_offset_s": 0.0, "position_world": pos, "heading_deg": heading, "horizontal_fov_deg": fov,
            "camera_model": {"type": "floor_homography_only", "fx": None, "pitch_deg": None, "roll_deg": None, "height_m": None},
            "homography_image_to_world": (H / H[2, 2]).round(10).tolist(),
            "coverage_polygon_px": FLOOR_PX[cid], "coverage_polygon_world": floor.round(2).tolist(),
            "landmarks": [{"landmark_id": k, "pixel": list(v)} for k, v in CLICKS[cid].items()],
            "reprojection_error": rep, "quality": q, "quality_reasons": reasons, "source": "operator_landmarks",
        })
    reasons = [
        "no surveyed floor plan: metric scale comes from the yoga mat's assumed size (0.65 x 1.85 m)",
        "camera 2's landmark positions come from camera 1's fit, so they test agreement between cameras, not absolute accuracy",
        "camera positions on the map are approximate (no lens model)",
    ]
    return {
        "schema_version": cal.SCHEMA_VERSION,
        "calibration_id": "gym_two_angles_landmarks",
        "site": "Gym 01 test room",
        "units": "m",
        "frame": "x along the back wall (left to right in camera 1), y toward the cameras (SVG convention, y down)",
        "floor_map": {
            "width_m": width, "height_m": ROOM_DEPTH,
            "outline": [[0, 0], [width, 0], [width, ROOM_DEPTH], [0, ROOM_DEPTH]],
            "landmarks": [{"id": k, "name": NAMES[k], "camera_id": "cam1", "world": world[k].round(2).tolist(),
                           "world_source": "camera 1 fit (room corners + mat size)"} for k in CLICKS["cam1"]],
            "scale_note": "metric scale from the yoga mat's assumed size; no surveyed floor plan",
        },
        "cameras": cams,
        "sync": {"reference_camera": "cam1", "offsets_s": {"cam1": 0.0, "cam2": 0.0},
                 "method": "manual: both clips start at the same burned-in timestamp", "confidence": "assumed"},
        "cross_camera_alignment": {"method": "shared floor landmarks clicked in both cameras"},
        "quality": {"grade": "fair", "reasons": reasons},
    }


def face_boxes(obs: list[dict]) -> list:
    """Like export.head_boxes_for, but sized by the face keypoints (nose, eyes, ears) or the box height."""
    out = []
    for o in obs:
        x1, y1, x2, y2 = o["bbox"]
        bh = y2 - y1
        pts = [k for k in (o["keypoints"] or [])[:5] if k[2] >= 0.3]
        if len(pts) >= 2:
            cx = sum(k[0] for k in pts) / len(pts)
            cy = sum(k[1] for k in pts) / len(pts)
            spread = max(max(k[0] for k in pts) - min(k[0] for k in pts), max(k[1] for k in pts) - min(k[1] for k in pts))
            r = max(1.1 * spread, 0.07 * bh, 8)
        else:
            cx, cy, r = (x1 + x2) / 2, y1 + 0.1 * bh, 0.1 * bh
        out.append([round(cx - r), round(cy - r * 1.1), round(cx + r), round(cy + r)])
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--track", action="store_true", help="run detection + tracking first (slow)")
    ap.add_argument("--device", default=None)
    a = ap.parse_args()
    if a.track:
        from spottr_world.bootstrap import background_plate
        from spottr_world.track import track_camera
        for c in CAMERAS:
            track_camera(c["camera_id"], c["video"], RUN, device=a.device, stride=1)
            background_plate(c["video"], RUN / "plates" / f"{c['camera_id']}.jpg")
    doc = calibration()
    cal.save(doc, CALIB)
    for c in doc["cameras"]:
        print(f"{c['camera_id']}: {c['quality']} rmse {c['reprojection_error']['rmse_m']} m, at {c['position_world']} heading {c['heading_deg']}")
    # shortcut: both people stay on one spot for the whole 7 s clip, and at the default (one sample per 8 s
    # of standing still) the evidence for the right match (+3.7, wrong pairing -5) can't pass the link bar
    # before the clip ends. Drop this for recordings longer than ~15 s.
    association.STILL_TAU_S = 4.0
    # A recording, not a live feed: decide identities with the whole clip in view, so each person carries one
    # label in both cameras from the first frame (with the live 3 s look-ahead, camera 2's sightings showed as
    # Persons 03 and 04 until the links were confirmed, most of this 7 s clip).
    identity.LAG_S = pipeline.LAG_S = 8.0
    run(RUN, CAMERAS, doc)
    # Face-sized pixelation: the default radius grows with the box width, so the bench presser's raised arms
    # made it cover the whole press.
    ex.head_boxes_for = face_boxes
    ex.SEGMENTS = [{"id": "session", "title": "Two cameras, one room", "from_s": 0.0, "to_s": 7.3,  # GymAngle1 is the shorter clip (7.36 s)
                    "summary": "A bench press and sit-ups, seen from two corners of the same room."}]
    ex.export(RUN, OUT, {c["camera_id"]: c["video"] for c in CAMERAS})


if __name__ == "__main__":
    main()
