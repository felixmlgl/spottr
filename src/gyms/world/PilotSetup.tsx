import React, { useMemo, useRef, useState } from 'react';
import { Camera, Check, CircleAlert, Cable, ImageUp, MapPin, MousePointerClick, Trash2 } from 'lucide-react';
import { Card, Eyebrow, Segmented } from '../components/ui';
import { isLive, postCalibration } from './api';
import { cameraTint } from './WorldMap';
import type { CalibrationResult, CameraConfig, Vec2, WorldMapConfig } from './types';

/**
 * Pilot setup: what a gym operator does once per site. The state here is exactly the body of
 * POST /calibration; fitting and grading always happen in the service.
 */

interface SetupCamera {
  camera_id: string;
  label: string;
  position: Vec2;
  heading_deg: number;
  fov_deg: number;
  range_m: number;
  plate_url: string | null;
  image_size: [number, number];
}

interface Pair {
  id: string;
  name: string;
  pixel: Vec2 | null;
  world: Vec2 | null;
}

const STEPS = [
  { id: 'plan', label: 'Floor plan' },
  { id: 'cameras', label: 'Cameras' },
  { id: 'points', label: 'Calibration points' },
  { id: 'preview', label: 'Preview' },
  { id: 'connect', label: 'Connect' },
] as const;
type StepId = (typeof STEPS)[number]['id'];

function seedCameras(config: WorldMapConfig): SetupCamera[] {
  return config.cameras.map((c) => ({
    camera_id: c.camera_id,
    label: c.label,
    position: c.position,
    heading_deg: c.heading_deg,
    fov_deg: c.fov_deg,
    range_m: 14,
    plate_url: c.plate_url,
    image_size: c.image_size,
  }));
}

function seedPairs(config: WorldMapConfig): Record<string, Pair[]> {
  const out: Record<string, Pair[]> = {};
  for (const c of config.cameras) {
    out[c.camera_id] = c.landmarks_px.map((l) => {
      const lm = config.floor_map.landmarks.find((x) => x.id === l.landmark_id);
      return { id: l.landmark_id, name: lm?.name ?? l.landmark_id, pixel: l.pixel, world: lm?.world ?? null };
    });
  }
  return out;
}

const cone = (c: SetupCamera) => {
  const a = (c.heading_deg * Math.PI) / 180;
  const h = (c.fov_deg * Math.PI) / 360;
  const [x, y] = c.position;
  const r = c.range_m;
  return `M ${x} ${y} L ${x + r * Math.cos(a - h)} ${y + r * Math.sin(a - h)} A ${r} ${r} 0 0 1 ${x + r * Math.cos(a + h)} ${y + r * Math.sin(a + h)} Z`;
};

const PlanMap: React.FC<{
  width: number;
  height: number;
  outline: Vec2[] | null;
  image: string | null;
  cameras: SetupCamera[];
  activeCamera?: string | null;
  points?: Pair[];
  activePoint?: string | null;
  onMoveCamera?: (id: string, p: Vec2) => void;
  onPlace?: (p: Vec2) => void;
}> = ({ width, height, outline, image, cameras, activeCamera, points, activePoint, onMoveCamera, onPlace }) => {
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const pad = 2;
  const toWorld = (e: React.PointerEvent | React.MouseEvent): Vec2 | null => {
    const el = svg.current;
    if (!el) return null;
    const pt = el.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = el.getScreenCTM();
    if (!m) return null;
    const w = pt.matrixTransform(m.inverse());
    return [Math.round(w.x * 10) / 10, Math.round(w.y * 10) / 10];
  };
  return (
    <svg
      ref={svg}
      viewBox={`${-pad} ${-pad} ${width + 2 * pad} ${height + 2 * pad}`}
      className={`w-full h-auto rounded-2xl bg-white ring-1 ring-black/[0.04] touch-none ${onPlace ? 'cursor-crosshair' : ''}`}
      onPointerMove={(e) => {
        if (!drag || !onMoveCamera) return;
        const w = toWorld(e);
        if (w) onMoveCamera(drag, w);
      }}
      onPointerUp={() => setDrag(null)}
      onPointerLeave={() => setDrag(null)}
      onClick={(e) => {
        if (!onPlace) return;
        const w = toWorld(e);
        if (w) onPlace(w);
      }}
      role="img"
      aria-label="Floor plan"
    >
      {image ? (
        <image href={image} x={0} y={0} width={width} height={height} preserveAspectRatio="none" opacity={0.85} />
      ) : (
        <polygon
          points={(outline ?? [[0, 0], [width, 0], [width, height], [0, height]]).map((p) => p.join(',')).join(' ')}
          fill="#FAFAFA"
          stroke="#C7C7CC"
          strokeWidth={0.12}
        />
      )}
      {cameras.map((c) => (
        <path key={`cone-${c.camera_id}`} d={cone(c)} fill={cameraTint(c.camera_id)} fillOpacity={activeCamera && activeCamera !== c.camera_id ? 0.05 : 0.13} />
      ))}
      {points?.map(
        (p) =>
          p.world && (
            <g key={p.id} transform={`translate(${p.world[0]} ${p.world[1]})`}>
              <circle r={p.id === activePoint ? 0.42 : 0.3} fill="#FFFFFF" stroke="#1D1D1F" strokeWidth={0.08} />
              <text x={0.45} y={0.15} fontSize={0.38} fill="#1D1D1F">
                {p.id.replace(/^c\d_/, '')}
              </text>
            </g>
          ),
      )}
      {cameras.map((c) => (
        <g
          key={c.camera_id}
          transform={`translate(${c.position[0]} ${c.position[1]})`}
          className={onMoveCamera ? 'cursor-grab' : undefined}
          onPointerDown={(e) => {
            if (!onMoveCamera) return;
            e.stopPropagation();
            (e.target as Element).setPointerCapture?.(e.pointerId);
            setDrag(c.camera_id);
          }}
        >
          <circle r={0.7} fill="#FFFFFF" stroke={cameraTint(c.camera_id)} strokeWidth={0.14} />
          <g transform={`rotate(${c.heading_deg})`}>
            <rect x={-0.34} y={-0.22} width={0.5} height={0.44} rx={0.08} fill={cameraTint(c.camera_id)} />
            <path d="M 0.16 -0.12 L 0.38 -0.24 L 0.38 0.24 L 0.16 0.12 Z" fill={cameraTint(c.camera_id)} />
          </g>
          <text y={-1.0} textAnchor="middle" fontSize={0.48} fontWeight={600} fill="#1D1D1F">
            {c.label}
          </text>
        </g>
      ))}
    </svg>
  );
};

export const PilotSetup: React.FC<{ config: WorldMapConfig }> = ({ config }) => {
  const [step, setStep] = useState<StepId>('plan');
  const [planImage, setPlanImage] = useState<string | null>(null);
  const [planSize, setPlanSize] = useState<Vec2>([config.floor_map.width_m, config.floor_map.height_m]);
  const [cameras, setCameras] = useState<SetupCamera[]>(() => seedCameras(config));
  const [pairs, setPairs] = useState<Record<string, Pair[]>>(() => seedPairs(config));
  const [activeCam, setActiveCam] = useState(config.cameras[0]?.camera_id ?? '');
  const [activePoint, setActivePoint] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, CalibrationResult | { error: string }>>({});
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const cam = cameras.find((c) => c.camera_id === activeCam) ?? cameras[0];
  const camConfig: CameraConfig | undefined = config.cameras.find((c) => c.camera_id === activeCam);
  const camPairs = pairs[activeCam] ?? [];
  const complete = camPairs.filter((p) => p.pixel && p.world);
  const serviceQuality = config.calibration.quality;

  const updatePair = (id: string, patch: Partial<Pair>) =>
    setPairs((all) => ({ ...all, [activeCam]: all[activeCam].map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  const addPoint = () => {
    const n = camPairs.length + 1;
    const id = `${activeCam}_p${n}`;
    setPairs((all) => ({ ...all, [activeCam]: [...(all[activeCam] ?? []), { id, name: `Floor mark ${n}`, pixel: null, world: null }] }));
    setActivePoint(id);
  };

  const request = useMemo(
    () => ({
      camera_id: activeCam,
      image_size: cam?.image_size ?? [1280, 720],
      landmarks: complete.map((p) => ({ landmark_id: p.id, pixel: p.pixel as Vec2 })),
      floor_landmarks: complete.map((p) => ({ id: p.id, name: p.name, world: p.world as Vec2 })),
      dry_run: true,
    }),
    [activeCam, cam, complete],
  );

  const fit = async () => {
    setBusy(true);
    try {
      const r = await postCalibration(request as Parameters<typeof postCalibration>[0]);
      setResult((all) => ({ ...all, [activeCam]: r }));
    } catch (e) {
      setResult((all) => ({ ...all, [activeCam]: { error: (e as Error).message } }));
    } finally {
      setBusy(false);
    }
  };

  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const r = result[activeCam];

  return (
    <div className="flex flex-col gap-6">
      <Card className="!p-5 sm:!p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Eyebrow>Pilot setup · about 20 minutes per site</Eyebrow>
            <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F] mt-1">Connect your cameras to one floor map</h2>
            <p className="text-sm text-[#6E6E73] mt-1 max-w-2xl">
              Prefilled with the Great Hall example. Every step works on your own floor plan; the calibration itself is fitted and
              graded by the Spottr service, never in the browser.
            </p>
          </div>
        </div>
        <ol className="flex gap-2 mt-5 overflow-x-auto pb-1" aria-label="Setup steps">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                onClick={() => setStep(s.id)}
                aria-current={s.id === step ? 'step' : undefined}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap cursor-pointer transition-colors ${
                  s.id === step ? 'bg-[#1D1D1F] text-white' : i < stepIdx ? 'bg-white text-[#1D1D1F]' : 'bg-white/60 text-[#6E6E73]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    i < stepIdx ? 'bg-[#34C759] text-white' : s.id === step ? 'bg-white text-[#1D1D1F]' : 'bg-[#E5E5EA] text-[#6E6E73]'
                  }`}
                >
                  {i < stepIdx ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                {s.label}
              </button>
            </li>
          ))}
        </ol>
      </Card>

      {step === 'plan' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
          <Card className="!p-4 sm:!p-6">
            <PlanMap width={planSize[0]} height={planSize[1]} outline={planImage ? null : config.floor_map.outline} image={planImage} cameras={[]} />
          </Card>
          <Card className="!p-5 flex flex-col gap-4">
            <Eyebrow>1 · Floor plan</Eyebrow>
            <p className="text-sm text-[#6E6E73]">
              Upload a floor plan (a photo of the fire-escape plan works) and enter its real size. It stays in your browser in this demo.
            </p>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPlanImage(URL.createObjectURL(f));
              }}
            />
            <button
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white text-sm font-medium text-[#1D1D1F] ring-1 ring-black/[0.06] hover:bg-[#FAFAFA] cursor-pointer"
            >
              <ImageUp className="w-4 h-4" /> {planImage ? 'Replace floor plan' : 'Upload floor plan'}
            </button>
            {planImage && (
              <button onClick={() => setPlanImage(null)} className="text-xs text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer self-start">
                Use the Great Hall outline instead
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              {(['Width', 'Depth'] as const).map((l, i) => (
                <label key={l} className="flex flex-col gap-1 text-xs text-[#6E6E73]">
                  {l} (m)
                  <input
                    type="number"
                    min={3}
                    max={200}
                    step={0.5}
                    value={planSize[i]}
                    onChange={(e) => {
                      const v = Math.max(3, Number(e.target.value) || 3);
                      setPlanSize((s) => (i === 0 ? [v, s[1]] : [s[0], v]));
                    }}
                    className="px-3 py-2 rounded-xl bg-white text-sm text-[#1D1D1F] ring-1 ring-black/[0.06]"
                  />
                </label>
              ))}
            </div>
            <p className="text-[12px] text-[#8E8E93]">
              Great Hall: no surveyed plan existed, so the outline shown is the one Spottr measured from both cameras (about{' '}
              {config.floor_map.width_m.toFixed(0)} × {config.floor_map.height_m.toFixed(0)} m).
            </p>
          </Card>
        </div>
      )}

      {step === 'cameras' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
          <Card className="!p-4 sm:!p-6">
            <PlanMap
              width={planSize[0]}
              height={planSize[1]}
              outline={planImage ? null : config.floor_map.outline}
              image={planImage}
              cameras={cameras}
              activeCamera={activeCam}
              onMoveCamera={(id, p) => setCameras((cs) => cs.map((c) => (c.camera_id === id ? { ...c, position: p } : c)))}
            />
            <p className="text-[12px] text-[#8E8E93] mt-3 flex items-center gap-1.5">
              <MousePointerClick className="w-3.5 h-3.5" /> Drag a camera to where it hangs.
            </p>
          </Card>
          <Card className="!p-5 flex flex-col gap-4">
            <Eyebrow>2 · Place cameras</Eyebrow>
            <Segmented ariaLabel="Camera" options={cameras.map((c) => ({ id: c.camera_id, label: c.label }))} value={activeCam} onChange={setActiveCam} />
            {cam &&
              (
                [
                  ['Viewing direction', 'heading_deg', -180, 180, 1, '°'],
                  ['Field of view', 'fov_deg', 30, 120, 1, '°'],
                  ['Approx. range', 'range_m', 4, 30, 0.5, ' m'],
                ] as const
              ).map(([label, key, min, max, stepv, unit]) => (
                <label key={key} className="flex flex-col gap-1 text-xs text-[#6E6E73]">
                  <span className="flex justify-between">
                    {label}
                    <span className="font-semibold text-[#1D1D1F] tabular-nums">
                      {Math.round(cam[key] * 10) / 10}
                      {unit}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={stepv}
                    value={cam[key]}
                    onChange={(e) => setCameras((cs) => cs.map((c) => (c.camera_id === activeCam ? { ...c, [key]: Number(e.target.value) } : c)))}
                    className="accent-[#34C759] cursor-pointer"
                  />
                </label>
              ))}
            <p className="text-[12px] text-[#8E8E93]">
              Rough placement is enough here: it drives the coverage preview. The exact mapping comes from the calibration points.
            </p>
          </Card>
        </div>
      )}

      {step === 'points' && cam && (
        <div className="flex flex-col gap-4">
          <Card className="!p-4 sm:!p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Segmented ariaLabel="Camera" options={cameras.map((c) => ({ id: c.camera_id, label: c.label }))} value={activeCam} onChange={(v) => { setActiveCam(v); setActivePoint(null); }} />
              <p className="text-[12px] text-[#6E6E73] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Pick a point, click it in the camera image, then on the floor plan.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative rounded-2xl overflow-hidden bg-[#1D1D1F]" style={{ aspectRatio: `${cam.image_size[0]} / ${cam.image_size[1]}` }}>
                {cam.plate_url && <img src={cam.plate_url} alt={`${cam.label} view, people removed`} className="absolute inset-0 w-full h-full object-cover" />}
                <svg
                  viewBox={`0 0 ${cam.image_size[0]} ${cam.image_size[1]}`}
                  className={`absolute inset-0 w-full h-full ${activePoint ? 'cursor-crosshair' : ''}`}
                  onClick={(e) => {
                    if (!activePoint) return;
                    const el = e.currentTarget;
                    const pt = el.createSVGPoint();
                    pt.x = e.clientX;
                    pt.y = e.clientY;
                    const m = el.getScreenCTM();
                    if (!m) return;
                    const w = pt.matrixTransform(m.inverse());
                    updatePair(activePoint, { pixel: [Math.round(w.x), Math.round(w.y)] });
                  }}
                >
                  {camPairs.map(
                    (p) =>
                      p.pixel && (
                        <g key={p.id} transform={`translate(${p.pixel[0]} ${p.pixel[1]})`}>
                          <circle r={p.id === activePoint ? 14 : 10} fill="#FFFFFF" fillOpacity={0.9} stroke={cameraTint(cam.camera_id)} strokeWidth={4} />
                          <text x={18} y={6} fontSize={20} fontWeight={600} fill="#FFFFFF" stroke="#1D1D1F" strokeWidth={4} paintOrder="stroke">
                            {p.id.replace(/^c\d_/, '')}
                          </text>
                        </g>
                      ),
                  )}
                </svg>
              </div>
              <PlanMap
                width={planSize[0]}
                height={planSize[1]}
                outline={planImage ? null : config.floor_map.outline}
                image={planImage}
                cameras={[cam]}
                activeCamera={activeCam}
                points={camPairs}
                activePoint={activePoint}
                onPlace={activePoint ? (w) => updatePair(activePoint, { world: w }) : undefined}
              />
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
            <Card className="!p-5">
              <div className="flex items-center justify-between">
                <Eyebrow>3 · Calibration points ({complete.length})</Eyebrow>
                <button onClick={addPoint} className="text-sm font-medium text-[#1D1D1F] px-3 py-1 rounded-full bg-white ring-1 ring-black/[0.06] hover:bg-[#FAFAFA] cursor-pointer">
                  Add point
                </button>
              </div>
              <ul className="mt-3 flex flex-col gap-1">
                {camPairs.map((p) => (
                  <li key={p.id}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl ${p.id === activePoint ? 'bg-white shadow-xs' : 'hover:bg-white/70'}`}
                    >
                      <button onClick={() => setActivePoint(p.id === activePoint ? null : p.id)} className="flex-1 min-w-0 text-left cursor-pointer">
                        <span className="block text-sm font-medium text-[#1D1D1F] truncate">{p.name}</span>
                        <span className="block text-[11px] text-[#6E6E73] tabular-nums">
                          image {p.pixel ? `${p.pixel[0]}, ${p.pixel[1]} px` : '—'} · floor {p.world ? `${p.world[0].toFixed(1)}, ${p.world[1].toFixed(1)} m` : '—'}
                        </span>
                      </button>
                      {p.pixel && p.world ? <Check className="w-4 h-4 text-[#34C759]" aria-label="complete" /> : <CircleAlert className="w-4 h-4 text-[#FF9500]" aria-label="incomplete" />}
                      <button
                        onClick={() => setPairs((all) => ({ ...all, [activeCam]: all[activeCam].filter((x) => x.id !== p.id) }))}
                        aria-label={`Remove ${p.name}`}
                        className="p-1 rounded-full hover:bg-[#F2F2F7] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[#8E8E93]" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-[12px] text-[#8E8E93] mt-3">
                Use marks that sit on the floor and never move: tile corners, rug corners, door thresholds, machine feet. 6–8 points spread
                over the whole visible floor work best. For a pilot, removable tape crosses that every camera can see make this
                faster and more accurate. In the Great Hall only a few features were visible from both sides.
              </p>
            </Card>

            <Card className="!p-5 flex flex-col gap-3">
              <Eyebrow>Calibration check</Eyebrow>
              {isLive ? (
                <>
                  <button
                    onClick={fit}
                    disabled={busy || complete.length < 4}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#34C759] text-white text-sm font-semibold hover:bg-[#2DB14F] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {busy ? 'Checking…' : `Check with ${complete.length} points`}
                  </button>
                  {r && 'error' in r && <p className="text-sm text-[#8A4B00]">{r.error}</p>}
                  {r && !('error' in r) && (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-[#1D1D1F]">
                        Grade <span className="font-semibold">{r.quality}</span> · floor error {r.reprojection_error.rmse_m.toFixed(2)} m
                        {r.reprojection_error.loo_rmse_m !== null && ` (${r.reprojection_error.loo_rmse_m.toFixed(2)} m leave-one-out)`}
                      </p>
                      {r.quality_reasons.map((q) => (
                        <p key={q} className="text-[12px] text-[#6E6E73]">
                          · {q}
                        </p>
                      ))}
                      {!!r.outliers.length && <p className="text-[12px] text-[#8A4B00]">Points that do not fit: {r.outliers.join(', ')}</p>}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-[#6E6E73]">
                    The Spottr service fits each camera to the floor and grades it. This hosted demo has no service attached, so here is
                    the grade the service produced for the Great Hall:
                  </p>
                  <p className="text-sm text-[#1D1D1F]">
                    Grade <span className="font-semibold">{serviceQuality.grade ?? 'n/a'}</span>
                    {serviceQuality.cross_camera_floor_agreement_m &&
                      ` · both cameras agree on a person's position within ${serviceQuality.cross_camera_floor_agreement_m.median.toFixed(2)} m (median)`}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {(serviceQuality.reasons ?? []).map((q) => (
                      <li key={q} className="text-[12px] text-[#6E6E73]">
                        · {q}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {camConfig && (
                <p className="text-[11px] text-[#8E8E93]">
                  Camera model estimated by the service: mounted ~{camConfig.camera_model.height_m.toFixed(1)} m high, tilted{' '}
                  {camConfig.camera_model.pitch_deg.toFixed(0)}° down.
                </p>
              )}
            </Card>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
          <Card className="!p-4 sm:!p-6">
            <PlanMap width={planSize[0]} height={planSize[1]} outline={planImage ? null : config.floor_map.outline} image={planImage} cameras={cameras} />
          </Card>
          <Card className="!p-5 flex flex-col gap-3">
            <Eyebrow>4 · Shared map preview</Eyebrow>
            <p className="text-sm text-[#6E6E73]">
              Where cones overlap, a member is seen twice and resolved to one identity. Where only one camera reaches, that camera
              carries the identity alone. Gaps are where nobody is tracked.
            </p>
            <ul className="flex flex-col gap-2">
              {cameras.map((c) => (
                <li key={c.camera_id} className="flex items-center gap-2 text-sm text-[#1D1D1F]">
                  <Camera className="w-4 h-4" style={{ color: cameraTint(c.camera_id) }} />
                  {c.label}
                  <span className="text-[#6E6E73] text-xs">· {(pairs[c.camera_id] ?? []).filter((p) => p.pixel && p.world).length} calibration points</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {step === 'connect' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Cable className="w-5 h-5 text-[#34C759]" />
              <Eyebrow>5 · How a pilot connects your existing cameras</Eyebrow>
            </div>
            <ol className="flex flex-col gap-3">
              {[
                ['Your recorder keeps recording', 'Most NVR/VMS systems can share each camera as an RTSP stream on your local network. Nothing is unplugged or replaced.'],
                ['A Spottr box reads the streams', 'A small computer on site runs the same pipeline as this demo: per-camera tracking, the shared floor map and one identity per person.'],
                ['One-time calibration', 'The steps on this page, about 20 minutes per site, then a check with a few walk-throughs.'],
                ['Your team sees the shared map', 'Sessions, zones and occupancy are computed from the one world state, not per camera.'],
              ].map(([t, b], i) => (
                <li key={t} className="flex gap-3">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-white text-[#1D1D1F] text-xs font-bold flex items-center justify-center ring-1 ring-black/[0.06]">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[#1D1D1F]">{t}</span>
                    <span className="block text-[13px] text-[#6E6E73]">{b}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
          <Card className="flex flex-col gap-3">
            <Eyebrow>What exists today</Eyebrow>
            <ul className="flex flex-col gap-2 text-sm text-[#1D1D1F]">
              <li className="flex gap-2">
                <Check className="w-4 h-4 text-[#34C759] shrink-0 mt-0.5" /> Processing of recorded video from two cameras into one shared world state
              </li>
              <li className="flex gap-2">
                <Check className="w-4 h-4 text-[#34C759] shrink-0 mt-0.5" /> Calibration fitting and grading through the service API
              </li>
              <li className="flex gap-2">
                <Check className="w-4 h-4 text-[#34C759] shrink-0 mt-0.5" /> Anonymous labels only; faces of detected people pixelated in the demo clips
              </li>
              <li className="flex gap-2 text-[#6E6E73]">
                <CircleAlert className="w-4 h-4 text-[#FF9500] shrink-0 mt-0.5" /> Live RTSP/WebRTC ingestion: designed for (same pipeline, replaceable video source), not built yet
              </li>
              <li className="flex gap-2 text-[#6E6E73]">
                <CircleAlert className="w-4 h-4 text-[#FF9500] shrink-0 mt-0.5" /> Linking the shared map to workout and member sessions: next step
              </li>
            </ul>
          </Card>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => setStep(STEPS[Math.max(0, stepIdx - 1)].id)}
          disabled={stepIdx === 0}
          className="px-4 py-2 rounded-full text-sm font-medium text-[#1D1D1F] bg-[#F5F5F7] disabled:opacity-40 cursor-pointer disabled:cursor-default"
        >
          Back
        </button>
        <button
          onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, stepIdx + 1)].id)}
          disabled={stepIdx === STEPS.length - 1}
          className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-[#34C759] hover:bg-[#2DB14F] disabled:opacity-40 cursor-pointer disabled:cursor-default"
        >
          Next
        </button>
      </div>
    </div>
  );
};
