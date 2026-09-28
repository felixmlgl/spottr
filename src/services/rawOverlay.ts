/**
 * "Raw" replay overlay: draws overlay.json exactly as exported by the vision backend, in the same style as
 * the backend's annotated video (render_video in backend/vision/render.py).
 *
 * - Nearest overlay frame for the time, no interpolation or smoothing
 * - Boxes as given (x1, y1, x2, y2), only scaled to the canvas
 * - Keypoints hidden only when marked -1, bones exactly from overlay.edges
 *
 * Sizes follow render.py: it upscales the frame by k = max(1, 1280 / W) and draws with fixed pixel sizes at that
 * resolution, so we draw in those output coordinates and scale the context down to the canvas.
 */
import { PipelineOverlay, PipelineOverlayFrame, PipelinePerson, PipelineSession, PipelineSet } from './pipelineAdapter';

// render.py colors are BGR; these are the same colors in RGB
const GREEN = 'rgb(60, 220, 60)';
const YELLOW = 'rgb(255, 210, 0)';
const GREY = 'rgb(170, 170, 170)';
const WHITE = 'rgb(255, 255, 255)';

const MISSING = -1;
// cv2.FONT_HERSHEY_SIMPLEX cap height is ~22 px at scale 1; sans-serif cap height is ~0.72 of the font size
const HERSHEY_CAP_PX = 22;
const SANS_CAP_RATIO = 0.72;

/** Nearest overlay frame to time t (binary search, no tolerance, no interpolation). */
export function nearestOverlayFrame(overlay: PipelineOverlay | null, t: number): PipelineOverlayFrame | null {
  const frames = overlay?.frames;
  if (!frames || frames.length === 0) return null;
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  return lo > 0 && t - frames[lo - 1].t < frames[lo].t - t ? frames[lo - 1] : frames[lo];
}

/** Port of person_state: (active set or null, reps done in it, total reps so far) at time t. */
function personState(person: PipelinePerson, t: number): { active: PipelineSet | null; done: number; total: number } {
  let active: PipelineSet | null = null;
  let done = 0;
  let total = 0;
  for (const s of person.sets || []) {
    const n = (s.rep_times_s || []).filter((rt) => rt <= t).length;
    total += n;
    if (s.start_s - 0.3 <= t && t <= s.end_s + 1.5) {
      active = s;
      done = n;
    }
  }
  return { active, done, total };
}

/** Port of _text: black outline (thickness + 2) under the colored text, baseline at org. */
function text(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, scale: number, color: string, thick = 1) {
  const fontPx = (HERSHEY_CAP_PX * scale) / SANS_CAP_RATIO;
  ctx.font = `${thick > 1 ? 600 : 400} ${fontPx}px -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = thick + 2;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(txt, x, y);
  ctx.fillStyle = color;
  ctx.fillText(txt, x, y);
}

const exerciseLabel = (exercise: string) => exercise.replace(/_/g, ' ');

export function drawRawOverlay(
  ctx: CanvasRenderingContext2D,
  overlay: PipelineOverlay | null,
  session: PipelineSession,
  t: number
) {
  const frame = nearestOverlayFrame(overlay, t);
  if (!overlay || !frame) return;

  const W = overlay.width || session.width || ctx.canvas.width;
  const H = overlay.height || session.height || ctx.canvas.height;
  const k = Math.max(1, 1280 / W);
  const OW = Math.floor((W * k) / 2) * 2;
  const OH = Math.floor((H * k) / 2) * 2;
  const edges = overlay.edges || [];
  const peopleById = new Map(session.people.map((p) => [p.id, p]));
  const ft = frame.t;

  ctx.save();
  ctx.scale(ctx.canvas.width / OW, ctx.canvas.height / OH);

  for (const row of frame.p) {
    const pid = row[0];
    const person = peopleById.get(pid);
    const isBystander = pid < 0 || !person;

    const state = person ? personState(person, ft) : { active: null, done: 0, total: 0 };
    const { active, done } = state;
    const color = isBystander ? GREY : active ? GREEN : person!.sets?.length ? YELLOW : GREY;

    // Keypoints in output pixels; only -1 means "not visible"
    const pts = Array.from({ length: 17 }, (_, i) => {
      const x = row[5 + i * 2];
      const y = row[6 + i * 2];
      return x === MISSING && y === MISSING ? null : { x: Math.trunc(x * k), y: Math.trunc(y * k) };
    });

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (const [a, b] of edges) {
      const pa = pts[a];
      const pb = pts[b];
      if (pa && pb) {
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }
    }
    for (const p of pts) {
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const x1 = Math.trunc(row[1] * k);
    const y1 = Math.trunc(row[2] * k);
    const x2 = Math.trunc(row[3] * k);
    const y2 = Math.trunc(row[4] * k);
    const justRepped = active !== null && (active.rep_times_s || []).some((rt) => ft - 0.4 < rt && rt <= ft);
    if (active !== null) {
      ctx.strokeStyle = color;
      ctx.lineWidth = justRepped ? 4 : 1;
      ctx.lineCap = 'butt';
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    }

    let label = isBystander ? 'bystander' : `P${pid}`;
    if (active !== null) label += ` ${exerciseLabel(active.exercise)} x${done}`;
    text(ctx, label, x1, Math.max(14, y1 - 6), 0.5, color);
    if (justRepped) text(ctx, '+1', x2 + 4, y1 + 18, 0.7, GREEN, 2);
  }

  // Session panel: running totals for everyone who has done a set
  let y = 26;
  for (const p of session.people.filter((p) => (p.sets || []).length > 0)) {
    const { total } = personState(p, ft);
    const ex = [...new Set(p.sets.filter((s) => s.start_s - 0.3 <= ft).map((s) => exerciseLabel(s.exercise)))]
      .sort()
      .join(', ');
    text(ctx, `P${p.id}  ${String(total).padStart(2)} reps  ${ex}`, 12, y, 0.6, WHITE);
    y += 24;
  }
  text(ctx, `t=${ft.toFixed(1).padStart(5)}s`, OW - 110, 24, 0.55, WHITE);

  ctx.restore();
}
