import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { LoadedPipelineData, PipelinePerson } from '../../services/pipelineAdapter';
import { blurBystanders, overlayRowsAtTime } from '../../services/privacyBlur';
import { mainExercise, spotlightTime } from '../../services/memberSession';

const HIGHLIGHT = '#34C759';

interface PersonSpotlightProps {
  data: LoadedPipelineData | null;
  /** Selectable people in picker order */
  people: PipelinePerson[];
  selectedId: string | null;
  /** Person previewed by hovering a list row, owned by the parent so the list and frame stay in sync */
  hoverId: string | null;
  onSelect: (personId: string) => void;
}

/** Nearest overlay time at which `pid` is on screen (tracking can drop people for a few frames). */
function nearestTimeWithPerson(data: LoadedPipelineData, pid: number, t: number): number {
  const frames = data.overlay?.frames || [];
  let best = t;
  let bestDist = Infinity;
  for (const f of frames) {
    const d = Math.abs(f.t - t);
    if (d < bestDist && f.p.some((row) => row[0] === pid)) {
      best = f.t;
      bestDist = d;
    }
  }
  return best;
}

export function personLabel(p: PipelinePerson): string {
  const ex = mainExercise(p);
  return ex ? `Person ${p.id} · ${p.total_reps} reps · ${ex}` : `Person ${p.id}`;
}

/**
 * A still from the clip with every tracked person greyed out and pixelated, and one person highlighted.
 * Hover (or tap) a box to preview someone, click to select; Prev/Next and ←/→ step through the list.
 */
export const PersonSpotlight: React.FC<PersonSpotlightProps> = ({
  data,
  people,
  selectedId,
  hoverId,
  onSelect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [frameHoverId, setFrameHoverId] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  const focusId = frameHoverId ?? hoverId ?? selectedId;
  const peopleById = useMemo(() => new Map(people.map((p) => [String(p.id), p])), [people]);
  const focusPerson = focusId ? peopleById.get(focusId) : undefined;

  // The frame follows the list (hovered or selected person), but not boxes hovered on the frame itself
  const anchorId = hoverId ?? selectedId;
  const anchorPerson = anchorId ? peopleById.get(anchorId) : undefined;
  const frameTime = useMemo(
    () => (data && anchorPerson ? nearestTimeWithPerson(data, anchorPerson.id, spotlightTime(anchorPerson)) : 0),
    [data, anchorPerson]
  );

  const W = data?.overlay?.width || data?.session.width || 1280;
  const H = data?.overlay?.height || data?.session.height || 720;

  useEffect(() => {
    setVideoReady(false);
  }, [data?.videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && videoReady && Math.abs(video.currentTime - frameTime) > 0.01) {
      video.currentTime = frameTime;
    }
  }, [frameTime, videoReady]);

  const rows = useMemo(() => overlayRowsAtTime(data?.overlay ?? null, frameTime), [data, frameTime]);

  const draw = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext('2d');
    // Keep the previous frame on screen while the video is still seeking
    if (!canvas || !ctx || !data || !video || video.readyState < 2 || video.seeking) return;

    const keep = focusPerson ? focusPerson.id : null;
    const sx = W / (data.session.width || W);
    const sy = H / (data.session.height || H);
    const focusRow = rows.find((r) => r[0] === keep);
    const focusRect = (r: number[]) => [r[1] * sx, r[2] * sy, (r[3] - r[1]) * sx, (r[4] - r[2]) * sy] as const;

    // Greyscale frame with the focused person's box in colour (canvas filters are a no-op on old Safari)
    ctx.filter = 'grayscale(1)';
    ctx.drawImage(video, 0, 0, W, H);
    ctx.filter = 'none';
    if (focusRow) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(...focusRect(focusRow));
      ctx.clip();
      ctx.drawImage(video, 0, 0, W, H);
      ctx.restore();
    }
    blurBystanders(ctx, video, rows, keep, data.session.width || W, data.session.height || H);

    // Dim everything except the focused person's box
    ctx.fillStyle = 'rgba(40, 40, 44, 0.35)';
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    if (focusRow) ctx.rect(...focusRect(focusRow));
    ctx.fill('evenodd');

    const lw = Math.max(1.5, W / 480);
    for (const row of rows) {
      const [pid, x1, y1, x2, y2] = row;
      if (pid === keep || !peopleById.has(String(pid))) continue;
      ctx.strokeStyle = 'rgba(210, 210, 215, 0.75)';
      ctx.lineWidth = lw;
      ctx.strokeRect(x1 * sx, y1 * sy, (x2 - x1) * sx, (y2 - y1) * sy);
    }

    if (focusRow && focusPerson) {
      const [, x1, y1, x2, y2] = focusRow;
      ctx.strokeStyle = HIGHLIGHT;
      ctx.lineWidth = lw * 2;
      ctx.strokeRect(x1 * sx, y1 * sy, (x2 - x1) * sx, (y2 - y1) * sy);

      const fontPx = Math.round(W / 45);
      ctx.font = `600 ${fontPx}px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif`;
      const label = personLabel(focusPerson);
      const tw = ctx.measureText(label).width;
      const pad = fontPx * 0.5;
      const tagH = fontPx + pad * 1.4;
      const tx = Math.min(Math.max(0, x1 * sx), W - tw - pad * 2);
      const ty = y1 * sy - tagH - 4 >= 0 ? y1 * sy - tagH - 4 : y2 * sy + 4;
      ctx.fillStyle = HIGHLIGHT;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw + pad * 2, tagH, tagH / 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, tx + pad, ty + tagH / 2);
    }
  };

  // Redraw on every relevant change; also after the video finishes seeking
  useEffect(draw);

  const personAt = (e: { clientX: number; clientY: number }): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * (data.session.width || W);
    const y = ((e.clientY - rect.top) / rect.height) * (data.session.height || H);
    // Smallest box under the pointer wins, so people in front of a big box stay pickable
    let hit: { id: string; area: number } | null = null;
    for (const [pid, x1, y1, x2, y2] of rows) {
      if (!peopleById.has(String(pid)) || x < x1 || x > x2 || y < y1 || y > y2) continue;
      const area = (x2 - x1) * (y2 - y1);
      if (!hit || area < hit.area) hit = { id: String(pid), area };
    }
    return hit?.id ?? null;
  };

  const step = (dir: 1 | -1) => {
    if (people.length === 0) return;
    const idx = people.findIndex((p) => String(p.id) === selectedId);
    const next = people[(idx + dir + people.length) % people.length];
    onSelect(String(next.id));
  };

  // ←/→ cycle people while the picker is on screen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const selectedIdx = people.findIndex((p) => String(p.id) === selectedId);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative w-full overflow-hidden rounded-[20px] bg-[#1D1D1F]"
        style={{ aspectRatio: `${W} / ${H}` }}
      >
        {data?.videoUrl && (
          <video
            key={data.videoUrl}
            ref={videoRef}
            src={data.videoUrl}
            crossOrigin="anonymous"
            preload="auto"
            muted
            playsInline
            className="hidden"
            onLoadedData={() => setVideoReady(true)}
            onSeeked={draw}
          />
        )}
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full h-full cursor-pointer touch-manipulation"
          onPointerMove={(e) => e.pointerType === 'mouse' && setFrameHoverId(personAt(e))}
          onPointerLeave={() => setFrameHoverId(null)}
          onClick={(e) => {
            const id = personAt(e);
            if (id) onSelect(id);
          }}
          aria-label="Video frame: click a person to select them"
        />
        {(!data || !videoReady) && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => step(-1)}
          disabled={people.length < 2}
          className="inline-flex items-center gap-1 pl-2.5 pr-3.5 py-2 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-sm font-medium text-[#1D1D1F] disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>
        <span className="text-xs text-[#6E6E73] text-center">
          {selectedIdx >= 0 ? `${selectedIdx + 1} of ${people.length}` : `${people.length} people`}
          <span className="hidden sm:inline"> · hover a person or use ← →</span>
        </span>
        <button
          onClick={() => step(1)}
          disabled={people.length < 2}
          className="inline-flex items-center gap-1 pl-3.5 pr-2.5 py-2 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-sm font-medium text-[#1D1D1F] disabled:opacity-40 cursor-pointer"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
