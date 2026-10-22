import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { BarShapeProps, Rectangle } from 'recharts';

export const ACCENT = '#4D80FF';
export const INK = '#0E1117';
export const INK_SECONDARY = '#4B5262';
export const MUTED_BAR = '#CDD3DE';
export const GRID = '#E7EAF0';

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`panel p-6 sm:p-8 min-w-0 ${className}`}>{children}</div>
);

export const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`hud-label ${className}`}>{children}</span>
);

export const PageHeader: React.FC<{
  eyebrow?: React.ReactNode;
  title: string;
  subtitle?: string;
  aside?: React.ReactNode;
}> = ({ eyebrow, title, subtitle, aside }) => (
  <div className="pt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
    <div>
      {eyebrow && <div className="text-sm font-medium text-ink-2 tracking-wide mb-1 flex items-center gap-2 flex-wrap">{eyebrow}</div>}
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="text-base text-ink-2 mt-2 max-w-2xl">{subtitle}</p>}
    </div>
    {aside}
  </div>
);

export const DemoBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-ink bg-surface ring-1 ring-black/[0.06]">
    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
    Demo data
  </span>
);

/** Pill segmented control, same style as the member app's exercise switcher. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  className = '',
  ariaLabel,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={`flex items-center p-1 bg-paper rounded-full shadow-xs overflow-x-auto max-w-full ${className}`}>
      {options.map((opt) => {
        const isSelected = value === opt.id;
        return (
          <button
            key={String(opt.id)}
            onClick={() => onChange(opt.id)}
            aria-pressed={isSelected}
            className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              isSelected ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export const TrendChip: React.FC<{ value: number; previous: number; comparison: string }> = ({
  value,
  previous,
  comparison,
}) => {
  const change = previous === 0 ? 0 : ((value - previous) / previous) * 100;
  const rounded = Math.round(change * 10) / 10;
  const flat = Math.abs(rounded) < 0.5;
  const up = rounded > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className="text-xs text-ink-2 mt-1 flex items-center gap-1 flex-wrap">
      <span
        className={`inline-flex items-center gap-0.5 font-semibold ${
          flat ? 'text-ink-2' : up ? 'bg-lime text-[#0E1117] rounded-full pl-1 pr-1.5 py-px' : 'text-ink'
        }`}
      >
        <Icon className="w-3.5 h-3.5 stroke-[2]" aria-hidden />
        {flat ? '0%' : `${up ? '+' : '−'}${Math.abs(rounded).toFixed(Math.abs(rounded) < 10 ? 1 : 0)}%`}
      </span>
      <span>{comparison}</span>
    </p>
  );
};

/** White rounded tooltip matching the member app's recharts tooltip. */
export const ChartTooltip: React.FC<{ title: string; value: string; note?: string }> = ({ title, value, note }) => (
  <div className="bg-paper rounded-xl p-3 shadow-lg border border-black/[0.04]">
    <p className="text-xs text-ink-2">{title}</p>
    <p className="text-sm font-bold text-ink mt-0.5">{value}</p>
    {note && <p className="text-[11px] text-ink-2 font-medium">{note}</p>}
  </div>
);

export const axisProps = {
  stroke: INK_SECONDARY,
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

/** Diagonal-striped fill for the empty track behind bars. Put <HatchDefs /> inside the chart, then use HATCH as a fill. */
export const HATCH = 'url(#hatch)';
export const HatchDefs: React.FC<{ id?: string; color?: string }> = ({ id = 'hatch', color = GRID }) => (
  <defs>
    <pattern id={id} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="2" height="7" fill={color} />
    </pattern>
  </defs>
);

/** Bar shape that paints highlighted bars in the accent and the rest in a recessive gray. */
export const highlightBar = (isHighlighted: (index: number) => boolean, fill = MUTED_BAR, accent = ACCENT) =>
  function HighlightBar(props: BarShapeProps) {
    return <Rectangle {...props} fill={isHighlighted(props.index) ? accent : fill} />;
  };
