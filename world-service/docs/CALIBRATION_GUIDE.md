# Calibrating your cameras to one floor map

*For the gym operator. About 20 minutes per site, once. You need: a floor plan (a photo of the
fire-escape plan is fine), a tape measure, and 6–8 small removable floor markers (e.g. tape crosses).*

## Why this matters

Each camera sees the gym from its own angle. Calibration tells Spottr where every spot of the floor in a
camera picture is on your floor plan. Once every camera is calibrated, the same member standing in view
of two cameras lands on the same spot of the map, and Spottr shows them as one person instead of two.

## Before you start

1. **Cameras stay put.** Calibration is only valid while a camera doesn't move. If a camera is bumped or
   re-aimed, redo that camera (5 minutes).
2. **Pick a quiet time.** You need a clear view of the floor for a few minutes.
3. **Know your floor plan's size.** Measure one long wall and one short wall.

## Step 1 · Floor plan

Open **Spottr for Gyms → World map → Pilot setup → Floor plan**. Upload the plan and enter its width and
depth in metres.

## Step 2 · Place the cameras

Drag each camera icon to where it hangs and turn the viewing direction roughly toward what it sees. This
only needs to be approximate; it drives the coverage preview.

## Step 3 · Calibration points (the important part)

For each camera:

1. Put markers on the floor where **this camera can see them**. 6–8 markers, spread out: near, far, left
   and right of the picture. Markers on the floor only, not on benches, racks or walls.
2. Where possible, place markers that **two cameras can both see**. Those let Spottr check that the
   cameras agree with each other.
3. In the setup screen, choose a point, **click it in the camera picture**, then **click the same spot on
   the floor plan**. Measure from two walls with the tape if you are unsure where it is on the plan.
4. Fixed features work too, as long as they sit on the floor and never move: tile corners, door
   thresholds, rug corners, the feet of a fixed machine.

## Step 4 · Check

Press **Check**. Spottr fits the camera to the floor and answers with a grade:

| Grade | Meaning | What to do |
| --- | --- | --- |
| **Good** | Positions within about 25 cm | Done |
| **Fair** | Within about 50 cm, or few / clustered points | Fine for a pilot; adding 2 more spread-out points usually fixes it |
| **Weak** | Not reliable | Read the reasons shown, then fix or add points |

Common reasons and fixes:

* *"Only 4–5 landmarks"*: add points until you have 6–8.
* *"Landmarks are clustered"*: add points in empty areas of the picture, especially far away and at the edges.
* *"Points that do not fit: …"*: that point was clicked in the wrong place on the picture or the plan. Remove and redo it.
* *"Projects behind the camera"*: a point was clicked above the floor (on a wall or a machine top).

## Step 5 · Preview and walk-through

The preview shows each camera's coverage on the plan. Where coverage overlaps, members are seen twice and
merged into one identity. Then walk one lap through the gym while someone watches the world map: one dot
should follow you smoothly across camera views. If the dot splits in two in one area, add calibration
points there.

## What Spottr does not need

No camera settings change, no new cameras, no markers left behind. Remove the tape after calibration.

---

*Great Hall note: that room had no floor plan and only a few floor features visible from both cameras. Spottr
estimated the map from the footage itself (body proportions plus where people were seen by both
cameras) and graded the result "fair". With markers and a measured plan the same steps give a
better-founded scale.*
