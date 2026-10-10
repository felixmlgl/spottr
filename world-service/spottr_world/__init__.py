"""Spottr shared-world tracking service.

Two (or more) fixed cameras are treated as observations of one floor-based world model.
The service owns every identity decision; clients only read its outputs.

Stages (each writes an artifact under out/<run>/ so later stages can be re-run alone):
  ingest      probe videos, frame/timestamp access (files now, RTSP/WebRTC later)
  track       per-camera person detection + pose + local tracklets -> immutable raw observations
  sync        time offset between cameras (audio prior + trajectory agreement)
  calibrate   per-camera image->floor homography from operator landmarks
  project     raw observations -> world coordinates (derived, versioned by calibration)
  associate   cross-camera association in rolling windows -> global identities
  world       per-timestamp shared world state (the source of truth downstream)
  evaluate    metrics against a manually reviewed ground-truth segment
"""

__version__ = "0.1.0"
