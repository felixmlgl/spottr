import React from 'react';

// lime → amber → coral, matching the --color-lime / amber / coral tokens
const STOPS: [number, [number, number, number]][] = [
  [0, [199, 255, 106]],
  [0.55, [255, 200, 61]],
  [1, [255, 107, 94]],
];

const tickColor = (t: number) => {
  const i = t <= STOPS[1][0] ? 0 : 1;
  const [a, ca] = STOPS[i];
  const [b, cb] = STOPS[i + 1];
  const k = (t - a) / (b - a);
  return `rgb(${ca.map((c, j) => Math.round(c + (cb[j] - c) * k)).join(',')})`;
};

/** Point on the half circle: t = 0 is the left end, 1 the right end. */
const polar = (t: number, r: number) => {
  const a = Math.PI * (1 - t);
  return [100 + r * Math.cos(a), 100 - r * Math.sin(a)] as const;
};

/**
 * Half-circle gauge of radial ticks, lit up to `value` (0..1) in lime → amber → coral, with a needle in currentColor.
 * Ticks past the value are a faint currentColor, so it works on light and dark cards.
 */
export const TickGauge: React.FC<{ value: number; label: string; ticks?: number; className?: string }> = ({
  value,
  label,
  ticks = 72,
  className = '',
}) => {
  const v = Math.min(1, Math.max(0, value));
  const [tipX, tipY] = polar(v, 76);
  // Needle is a thin wedge from a wide base at the hub to a point at the tip
  const [bx, by] = [(-(tipY - 100) / 76) * 3.5, ((tipX - 100) / 76) * 3.5];
  return (
    <svg viewBox="0 0 200 106" role="img" aria-label={label} className={className}>
      {Array.from({ length: ticks }, (_, i) => {
        const t = i / (ticks - 1);
        const [x1, y1] = polar(t, 66);
        const [x2, y2] = polar(t, 96);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={t <= v ? tickColor(t) : 'currentColor'}
            strokeWidth={1.9}
            strokeLinecap="round"
            opacity={t <= v ? 1 : 0.12}
          />
        );
      })}
      {Array.from({ length: 9 }, (_, i) => {
        const [x1, y1] = polar(i / 8, 52);
        const [x2, y2] = polar(i / 8, 57);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity={0.35} strokeWidth={1.2} strokeLinecap="round" />;
      })}
      <polygon points={`${100 + bx},${100 + by} ${tipX},${tipY} ${100 - bx},${100 - by}`} fill="currentColor" />
      <circle cx={100} cy={100} r={5} fill="currentColor" />
    </svg>
  );
};
