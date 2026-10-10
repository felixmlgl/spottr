import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import type { CameraConfig, CameraObservation } from './types';
import { cameraShort, personColor } from './display';
import { useVideoSync } from './usePlayback';
import { cameraTint } from './WorldMap';

interface Props {
  camera: CameraConfig;
  videoUrl: string | null;
  videoStartsAt: number;
  t: number;
  playing: boolean;
  observations: CameraObservation[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  debug: boolean;
  onHover?: (cameraId: string | null) => void;
}

export const CameraCard: React.FC<Props> = ({
  camera,
  videoUrl,
  videoStartsAt,
  t,
  playing,
  observations,
  selected,
  onSelect,
  debug,
  onHover,
}) => {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useVideoSync(ready ? video : null, t, playing, videoStartsAt);
  const [W, H] = camera.image_size;
  const resolved = observations.filter((o) => o.global_person_id);
  const people = new Set(resolved.map((o) => o.global_person_id)).size;

  return (
    <div
      className="bg-white rounded-[20px] ring-1 ring-black/[0.05] overflow-hidden flex flex-col min-w-0"
      onMouseEnter={() => onHover?.(camera.camera_id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${cameraTint(camera.camera_id)}1F`, color: cameraTint(camera.camera_id) }}
          >
            <Camera className="w-3.5 h-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1D1D1F] truncate">{camera.label}</p>
            <p className="text-[11px] text-[#6E6E73]">
              {people} {people === 1 ? 'person' : 'people'} in view
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-[#6E6E73] bg-[#F5F5F7] rounded-full px-2 py-0.5">{cameraShort(camera.camera_id)}</span>
      </div>
      <div className="relative bg-[#1D1D1F]" style={{ aspectRatio: `${W} / ${H}` }}>
        {videoUrl && !failed ? (
          <video
            ref={setVideo}
            src={videoUrl}
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={() => setReady(true)}
            onError={() => setFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
            aria-label={`${camera.label} recording`}
          />
        ) : (
          <img src={camera.plate_url} alt={`${camera.label}, empty room`} className="absolute inset-0 w-full h-full object-cover opacity-80" />
        )}
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" aria-hidden={!debug}>
          {observations.map((o) => {
            const [x1, y1, x2, y2] = o.bbox;
            const gid = o.global_person_id;
            const color = personColor(gid);
            const isSel = gid !== null && gid === selected;
            const dim = selected !== null && !isSel;
            const amb = o.display_state === 'Needs confirmation';
            const label = gid ? o.label ?? '' : debug ? 'not resolved' : '';
            const chip = debug ? `${label}${label ? ' · ' : ''}${cameraShort(camera.camera_id)}:${o.local_track_id}` : label;
            return (
              <g
                key={o.local_track_id}
                opacity={dim ? 0.25 : 1}
                className={gid ? 'cursor-pointer' : undefined}
                onClick={(e) => {
                  if (!gid) return;
                  e.stopPropagation();
                  onSelect(isSel ? null : gid);
                }}
              >
                <rect
                  x={x1}
                  y={y1}
                  width={x2 - x1}
                  height={y2 - y1}
                  rx={8}
                  fill={isSel ? color : 'transparent'}
                  fillOpacity={isSel ? 0.12 : 0}
                  stroke={color}
                  strokeWidth={isSel ? 5 : gid ? 3 : 1.5}
                  strokeDasharray={amb ? '10 7' : gid ? undefined : '4 5'}
                />
                {chip && (
                  <g transform={`translate(${x1} ${Math.max(22, y1 - 6)})`}>
                    <rect x={0} y={-22} width={chip.length * 9.2 + 16} height={26} rx={13} fill={gid ? color : '#636366'} />
                    <text x={8} y={-4} fontSize={16} fontWeight={600} fill="#FFFFFF">
                      {chip}
                    </text>
                  </g>
                )}
                {debug && (
                  <circle cx={o.floor_point_px[0]} cy={o.floor_point_px[1]} r={5} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
                )}
              </g>
            );
          })}
          {debug &&
            camera.landmarks_px.map((l) => (
              <g key={l.landmark_id} transform={`translate(${l.pixel[0]} ${l.pixel[1]})`}>
                <rect x={-7} y={-7} width={14} height={14} transform="rotate(45)" fill="#FFFFFF" stroke={cameraTint(camera.camera_id)} strokeWidth={3} />
              </g>
            ))}
        </svg>
      </div>
    </div>
  );
};
