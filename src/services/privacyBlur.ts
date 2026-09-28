/**
 * Privacy blur for the replay canvas: everyone except the selected member is pixelated head to toe.
 * Mirrors blur_people in backend/vision/classify.py so thumbnails, Gemini snapshots and the replay match.
 */
import { PipelineOverlay } from './pipelineAdapter';

// Overlay row: [person_id, x1, y1, x2, y2, kx0, ky0, ..., kx16, ky16] in video pixels, missing keypoint = -1
type OverlayRow = number[];

// COCO-17 limbs, same as EDGES in backend/vision/render.py
const LIMBS: [number, number][] = [
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], [5, 11], [6, 12], [11, 12],
  [11, 13], [13, 15], [12, 14], [14, 16], [0, 5], [0, 6],
];
const TORSO = [5, 6, 12, 11];

/**
 * One row per person around time t: the nearest overlay frame, plus anyone the pose model dropped for a
 * moment at their nearest detection within holdS, so nobody pops out of the blur for a few frames.
 */
export function overlayRowsAtTime(overlay: PipelineOverlay | null, t: number, holdS = 0.5): OverlayRow[] {
  const frames = overlay?.frames;
  if (!frames || frames.length === 0) return [];

  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  const center = lo > 0 && t - frames[lo - 1].t < frames[lo].t - t ? lo - 1 : lo;

  const rows: OverlayRow[] = [];
  const seen = new Set<number>();
  const take = (i: number) => {
    for (const row of frames[i].p) {
      if (!seen.has(row[0])) {
        seen.add(row[0]);
        rows.push(row);
      }
    }
  };
  if (Math.abs(frames[center].t - t) > holdS) return rows;
  take(center);
  for (let d = 1; ; d++) {
    const near = [center - d, center + d].filter(
      (i) => i >= 0 && i < frames.length && Math.abs(frames[i].t - t) <= holdS
    );
    if (near.length === 0) break;
    near.forEach(take);
  }
  return rows;
}

let scratch: HTMLCanvasElement | null = null;
let maskCanvas: HTMLCanvasElement | null = null;

function pixelate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, block: number) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  if (x1 <= x0 || y1 <= y0) return;
  const sw = Math.max(1, Math.round((x1 - x0) / block));
  const sh = Math.max(1, Math.round((y1 - y0) / block));

  scratch = scratch || document.createElement('canvas');
  scratch.width = sw;
  scratch.height = sh;
  const sctx = scratch.getContext('2d');
  if (!sctx) return;
  sctx.drawImage(ctx.canvas, x0, y0, x1 - x0, y1 - y0, 0, 0, sw, sh);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scratch, 0, 0, sw, sh, x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
}

/** Paints the member's own body back from the untouched frame, through a rough silhouette from their pose. */
function restoreSilhouette(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  row: OverlayRow,
  sx: number,
  sy: number
) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  maskCanvas = maskCanvas || document.createElement('canvas');
  if (maskCanvas.width !== W || maskCanvas.height !== H) {
    maskCanvas.width = W;
    maskCanvas.height = H;
  }
  const m = maskCanvas.getContext('2d');
  if (!m) return;

  const pts = Array.from({ length: 17 }, (_, i) => {
    const x = row[5 + i * 2];
    const y = row[6 + i * 2];
    return x >= 0 && y >= 0 ? { x: x * sx, y: y * sy } : null;
  });
  const th = Math.max(3, 0.07 * (row[4] - row[2]) * sy);

  m.globalCompositeOperation = 'source-over';
  m.clearRect(0, 0, W, H);
  m.fillStyle = '#000';
  m.strokeStyle = '#000';
  m.lineWidth = th;
  if (TORSO.every((i) => pts[i])) {
    m.beginPath();
    TORSO.forEach((i, k) => (k === 0 ? m.moveTo(pts[i]!.x, pts[i]!.y) : m.lineTo(pts[i]!.x, pts[i]!.y)));
    m.closePath();
    m.fill();
  }
  for (const [a, b] of LIMBS) {
    const pa = pts[a];
    const pb = pts[b];
    if (pa && pb) {
      m.beginPath();
      m.moveTo(pa.x, pa.y);
      m.lineTo(pb.x, pb.y);
      m.stroke();
    }
  }
  for (const p of pts) {
    if (p) {
      m.beginPath();
      m.arc(p.x, p.y, th, 0, Math.PI * 2);
      m.fill();
    }
  }
  m.globalCompositeOperation = 'source-in';
  m.drawImage(source, 0, 0, W, H);
  m.globalCompositeOperation = 'source-over';

  ctx.drawImage(maskCanvas, 0, 0);
}

/**
 * Pixelates every person except `keepId` on a canvas that already holds the video frame.
 * Far to near (feet lower in the frame = closer to the camera), so whoever is in front ends up on top:
 * a bystander behind the member is pixelated, then the member's silhouette is painted back over them.
 *
 * @param source the untouched frame (the <video>), used to restore the member
 * @param videoW,videoH the resolution the overlay coordinates are in
 */
export function blurBystanders(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  rows: OverlayRow[],
  keepId: number | null,
  videoW: number,
  videoH: number
) {
  const sx = ctx.canvas.width / videoW;
  const sy = ctx.canvas.height / videoH;
  const ordered = [...rows].sort((a, b) => a[4] - b[4] || Number(a[0] !== keepId) - Number(b[0] !== keepId));
  const keep = rows.find((r) => r[0] === keepId);
  let keepCovered = false;

  for (const row of ordered) {
    const [pid, x1, y1, x2, y2] = row;
    if (pid === keepId) {
      if (keepCovered) restoreSilhouette(ctx, source, row, sx, sy);
      continue;
    }
    const pw = 0.08 * (x2 - x1);
    const ph = 0.04 * (y2 - y1);
    const bx1 = x1 - pw;
    const by1 = y1 - ph;
    const bx2 = x2 + pw;
    const by2 = y2 + ph;
    pixelate(ctx, bx1 * sx, by1 * sy, (bx2 - bx1) * sx, (by2 - by1) * sy, Math.max(6, ((y2 - y1) / 10) * sy));
    if (keep && bx1 < keep[3] && bx2 > keep[1] && by1 < keep[4] && by2 > keep[2]) keepCovered = true;
  }
}
