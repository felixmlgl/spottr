import React from 'react';
import type { CameraConfig, Vec2, WorldMapConfig, WorldPerson } from './types';
import { cameraShort, personColor } from './display';

const CAMERA_TINT: Record<string, string> = { cam1: '#34C759', cam2: '#30B0C7' };
const tint = (id: string) => CAMERA_TINT[id] ?? '#8E8E93';

interface Props {
  config: WorldMapConfig;
  people: WorldPerson[];
  trails: Map<string, Vec2[]>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  debug: boolean;
  hoverCamera?: string | null;
}

const pts = (p: Vec2[]) => p.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

function CameraIcon({ cam, highlighted }: { cam: CameraConfig; highlighted: boolean }) {
  const [x, y] = cam.position;
  const a = (cam.heading_deg * Math.PI) / 180;
  const half = (cam.fov_deg * Math.PI) / 360;
  const r = 2.4;
  const wedge = `M ${x} ${y} L ${x + r * Math.cos(a - half)} ${y + r * Math.sin(a - half)} A ${r} ${r} 0 0 1 ${
    x + r * Math.cos(a + half)
  } ${y + r * Math.sin(a + half)} Z`;
  const color = tint(cam.camera_id);
  // label sits on the side away from the viewing direction
  const lx = x - Math.cos(a) * 1.25;
  const ly = y - Math.sin(a) * 1.25;
  return (
    <g>
      <path d={wedge} fill={color} fillOpacity={highlighted ? 0.28 : 0.16} />
      <circle cx={x} cy={y} r={0.55} fill="#FFFFFF" stroke={color} strokeWidth={0.12} />
      {/* camera glyph */}
      <g transform={`translate(${x} ${y}) rotate(${cam.heading_deg})`}>
        <rect x={-0.28} y={-0.18} width={0.42} height={0.36} rx={0.07} fill={color} />
        <path d="M 0.14 -0.1 L 0.32 -0.2 L 0.32 0.2 L 0.14 0.1 Z" fill={color} />
      </g>
      <g transform={`translate(${lx} ${ly})`}>
        <rect x={-1.55} y={-0.42} width={3.1} height={0.84} rx={0.42} fill="#FFFFFF" stroke="#E5E5EA" strokeWidth={0.04} />
        <text textAnchor="middle" y={0.16} fontSize={0.46} fontWeight={600} fill="#1D1D1F">
          {cam.label}
        </text>
      </g>
    </g>
  );
}

export const WorldMap: React.FC<Props> = ({ config, people, trails, selected, onSelect, debug, hoverCamera }) => {
  const fm = config.floor_map;
  const outline = fm.outline ?? [
    [0, 0],
    [fm.width_m, 0],
    [fm.width_m, fm.height_m],
    [0, fm.height_m],
  ];
  const xs = [...outline.map((p) => p[0]), ...config.cameras.map((c) => c.position[0])];
  const ys = [...outline.map((p) => p[1]), ...config.cameras.map((c) => c.position[1])];
  const pad = 1.6;
  const vb = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad];
  const byId = new Map(people.map((p) => [p.global_person_id, p]));
  const visible = people.filter((p) => p.state !== 'exited' || p.global_person_id === selected);
  const order = [...visible].sort((a, b) => (a.global_person_id === selected ? 1 : 0) - (b.global_person_id === selected ? 1 : 0));

  const grid: React.ReactNode[] = [];
  for (let gx = Math.ceil(vb[0]); gx < vb[0] + vb[2]; gx += 1)
    grid.push(<line key={`gx${gx}`} x1={gx} y1={vb[1]} x2={gx} y2={vb[1] + vb[3]} stroke="#F2F2F7" strokeWidth={0.03} />);
  for (let gy = Math.ceil(vb[1]); gy < vb[1] + vb[3]; gy += 1)
    grid.push(<line key={`gy${gy}`} x1={vb[0]} y1={gy} x2={vb[0] + vb[2]} y2={gy} stroke="#F2F2F7" strokeWidth={0.03} />);

  return (
    <svg
      viewBox={vb.join(' ')}
      className="w-full h-auto select-none touch-manipulation"
      role="group"
      aria-label="Bird's-eye map of the Great Hall with one marker per person"
      onClick={() => onSelect(null)}
    >
      <defs>
        <clipPath id="room-clip">
          <polygon points={pts(outline)} />
        </clipPath>
      </defs>
      <rect x={vb[0]} y={vb[1]} width={vb[2]} height={vb[3]} fill="#FFFFFF" />
      {grid}

      {/* room */}
      <polygon points={pts(outline)} fill="#FAFAFA" stroke="#C7C7CC" strokeWidth={0.12} strokeLinejoin="round" />

      {/* where each camera can see people on the floor (from observed detections), clipped to the room */}
      <g clipPath="url(#room-clip)">
        {config.cameras.map((c) => (
          <polygon
            key={c.camera_id}
            points={pts(c.coverage_polygon)}
            fill={tint(c.camera_id)}
            fillOpacity={hoverCamera === c.camera_id ? 0.12 : 0.045}
            stroke={tint(c.camera_id)}
            strokeOpacity={0.35}
            strokeWidth={0.06}
            strokeDasharray="0.25 0.2"
          />
        ))}
      </g>

      {debug && (
        <g>
          {fm.outline_measured && (
            <polygon points={pts(fm.outline_measured)} fill="none" stroke="#FF9500" strokeOpacity={0.6} strokeWidth={0.06} strokeDasharray="0.4 0.25" />
          )}
          {Object.entries(fm.walls).map(([k, seg]) => (
            <line key={k} x1={seg[0][0]} y1={seg[0][1]} x2={seg[1][0]} y2={seg[1][1]} stroke="#FF9500" strokeWidth={0.08} strokeDasharray="0.3 0.2" />
          ))}
          {fm.landmarks.map((l) => (
            <g key={l.id} transform={`translate(${l.world[0]} ${l.world[1]})`}>
              <rect x={-0.16} y={-0.16} width={0.32} height={0.32} transform="rotate(45)" fill="#FFFFFF" stroke={tint(l.camera_id)} strokeWidth={0.06} />
              <text x={0.3} y={0.14} fontSize={0.32} fill="#6E6E73">
                {l.id}
              </text>
            </g>
          ))}
        </g>
      )}

      {config.cameras.map((c) => (
        <CameraIcon key={c.camera_id} cam={c} highlighted={hoverCamera === c.camera_id} />
      ))}

      {/* association links (debug): each camera currently observing a person */}
      {debug &&
        visible.map((p) =>
          p.camera_ids.map((cid) => {
            const cam = config.cameras.find((c) => c.camera_id === cid);
            if (!cam) return null;
            return (
              <line
                key={`${p.global_person_id}-${cid}`}
                x1={cam.position[0]}
                y1={cam.position[1]}
                x2={p.x}
                y2={p.y}
                stroke={tint(cid)}
                strokeOpacity={0.35}
                strokeWidth={0.04}
              />
            );
          }),
        )}
      {debug &&
        visible.flatMap((p) =>
          (p.evidence.ambiguous_with ?? []).map((g) => {
            const q = byId.get(`g${String(g).padStart(3, '0')}`);
            if (!q) return null;
            return (
              <line key={`${p.global_person_id}-amb-${g}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#FF9500" strokeWidth={0.07} strokeDasharray="0.15 0.12" />
            );
          }),
        )}

      {/* trails */}
      {visible.map((p) => {
        const tr = trails.get(p.global_person_id);
        if (!tr || tr.length < 2) return null;
        const dim = selected && selected !== p.global_person_id;
        return (
          <polyline
            key={`trail-${p.global_person_id}`}
            points={pts(tr)}
            fill="none"
            stroke={personColor(p.global_person_id)}
            strokeOpacity={dim ? 0.08 : 0.35}
            strokeWidth={0.12}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}

      {/* people */}
      {order.map((p) => {
        const color = personColor(p.global_person_id);
        const isSel = p.global_person_id === selected;
        const dim = selected !== null && !isSel;
        const amb = p.state === 'ambiguous';
        const hidden = p.state === 'temporarily_occluded' || p.state === 'exited';
        const tracking = p.display_state === 'Tracking';
        const op = dim ? 0.3 : hidden ? 0.45 : 1;
        const moving = p.heading_deg !== null && p.speed_mps > 0.3;
        const ha = ((p.heading_deg ?? 0) * Math.PI) / 180;
        return (
          <g
            key={p.global_person_id}
            transform={`translate(${p.x} ${p.y})`}
            opacity={op}
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label={`${p.label}, ${p.display_state ?? 'left the view'}`}
            aria-pressed={isSel}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(isSel ? null : p.global_person_id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(isSel ? null : p.global_person_id);
              }
            }}
          >
            <circle r={1.1} fill="transparent" />
            {isSel && <circle r={0.82} fill={color} fillOpacity={0.15} stroke={color} strokeOpacity={0.5} strokeWidth={0.05} />}
            {moving && !hidden && (
              <path
                d={`M ${Math.cos(ha) * 0.72} ${Math.sin(ha) * 0.72} L ${Math.cos(ha + 2.6) * 0.42} ${Math.sin(ha + 2.6) * 0.42} L ${
                  Math.cos(ha - 2.6) * 0.42
                } ${Math.sin(ha - 2.6) * 0.42} Z`}
                fill={color}
                fillOpacity={0.9}
              />
            )}
            <circle
              r={0.42}
              fill={amb || hidden ? '#FFFFFF' : color}
              fillOpacity={tracking ? 0.75 : 1}
              stroke={amb || hidden ? color : '#FFFFFF'}
              strokeWidth={amb || hidden ? 0.11 : 0.09}
              strokeDasharray={amb ? '0.18 0.12' : hidden ? '0.06 0.1' : undefined}
            />
            {amb && (
              <text textAnchor="middle" y={0.16} fontSize={0.46} fontWeight={700} fill={color}>
                ?
              </text>
            )}
            <g transform="translate(0 -0.95)">
              <rect
                x={-p.label.length * 0.135 - 0.2}
                y={-0.34}
                width={p.label.length * 0.27 + 0.4}
                height={0.6}
                rx={0.3}
                fill="#FFFFFF"
                fillOpacity={0.94}
                stroke={isSel ? color : '#E5E5EA'}
                strokeWidth={0.04}
              />
              <text textAnchor="middle" y={0.08} fontSize={0.36} fontWeight={600} fill="#1D1D1F">
                {p.label}
              </text>
            </g>
            {debug && (
              <text textAnchor="middle" y={0.95} fontSize={0.28} fill="#6E6E73">
                {p.global_person_id} · {p.local_track_ids.map((k) => k.replace('cam', 'P')).join(' ')}
              </text>
            )}
          </g>
        );
      })}

      {/* scale bar */}
      <g transform={`translate(${vb[0] + 0.8} ${vb[1] + vb[3] - 0.7})`}>
        <line x1={0} y1={0} x2={2} y2={0} stroke="#8E8E93" strokeWidth={0.06} />
        <line x1={0} y1={-0.15} x2={0} y2={0.15} stroke="#8E8E93" strokeWidth={0.06} />
        <line x1={2} y1={-0.15} x2={2} y2={0.15} stroke="#8E8E93" strokeWidth={0.06} />
        <text x={2.3} y={0.12} fontSize={0.36} fill="#8E8E93">
          2 m (approx.)
        </text>
      </g>
    </svg>
  );
};

export { tint as cameraTint, cameraShort };
