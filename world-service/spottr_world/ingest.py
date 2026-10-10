"""Video ingestion: metadata probing and a replaceable frame-source interface.

Everything downstream consumes `FrameSource` (frame index, presentation timestamp, BGR image), so a
recorded file can later be swapped for a live RTSP/WebRTC stream without touching tracking code.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterator, Protocol

import cv2
import numpy as np


@dataclass
class VideoInfo:
    path: str
    width: int
    height: int
    fps: float
    frame_count: int
    duration_s: float

    def to_dict(self) -> dict:
        return asdict(self)


def probe(path: str | Path) -> VideoInfo:
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise FileNotFoundError(path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    info = VideoInfo(
        path=str(path),
        width=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        height=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        fps=round(fps, 4),
        frame_count=n,
        duration_s=round(n / fps, 3) if fps else 0.0,
    )
    cap.release()
    return info


class FrameSource(Protocol):
    camera_id: str

    def frames(self) -> Iterator[tuple[int, float, np.ndarray]]:
        """Yield (frame_index, timestamp_s in the source's own clock, BGR frame)."""
        ...


class FileSource:
    """Recorded video file. `stride` keeps every n-th frame (others are grabbed, not decoded to RGB)."""

    def __init__(self, camera_id: str, path: str | Path, stride: int = 1, start_s: float = 0.0, end_s: float | None = None):
        self.camera_id = camera_id
        self.path = str(path)
        self.stride = max(1, stride)
        self.start_s = start_s
        self.end_s = end_s

    def frames(self) -> Iterator[tuple[int, float, np.ndarray]]:
        cap = cv2.VideoCapture(self.path)
        if not cap.isOpened():
            raise FileNotFoundError(self.path)
        if self.start_s > 0:
            cap.set(cv2.CAP_PROP_POS_MSEC, self.start_s * 1000)
        i = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
        try:
            while True:
                if (i % self.stride) != 0:
                    if not cap.grab():
                        break
                    i += 1
                    continue
                ok, frame = cap.read()
                if not ok:
                    break
                # Real presentation timestamp, not i / fps: phone footage can be variable frame rate.
                t = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
                if self.end_s is not None and t > self.end_s:
                    break
                yield i, t, frame
                i += 1
        finally:
            cap.release()


class LiveStreamSource:
    """Placeholder for RTSP/WebRTC ingestion.

    Contract for the live version: same `frames()` iterator, timestamps taken from the stream's RTP/NTP
    clock (not arrival time) so that the sync stage can keep using one shared timeline.
    """

    def __init__(self, camera_id: str, url: str):
        self.camera_id = camera_id
        self.url = url

    def frames(self) -> Iterator[tuple[int, float, np.ndarray]]:
        raise NotImplementedError("Live streams are future work; process recorded files for the pilot demo.")
