import React from 'react';
import { ArrowUpRight, LucideIcon } from 'lucide-react';

/** Card fills for the 2×2 tiles: brand blue, lime, or the standard glass panel. */
export const TILE_TONES = {
  // White text on blue: re-resolve the ink tokens children use (#DCE6FF on #2A5CDB is 4.6:1)
  blue: 'rounded-[28px] text-white bg-[radial-gradient(90%_70%_at_100%_0%,#6B95FF,transparent_70%),linear-gradient(160deg,#2A5CDB,#1F49B5)] shadow-[0_18px_50px_-20px_rgb(42_92_219/0.7)] [--color-ink:#FFFFFF] [--color-ink-2:#DCE6FF] [--color-accent-ink:#FFFFFF]',
  lime: 'rounded-[28px] bg-lime bg-[radial-gradient(90%_70%_at_100%_0%,#EEFFCC,transparent_70%)] shadow-[0_18px_50px_-20px_rgb(120_170_30/0.6)]',
  glass: 'panel',
};
export type TileTone = keyof typeof TILE_TONES;

/** Round "open" arrow: outlined circle that fills blue when its `group` parent is hovered. */
export const OpenArrow: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`w-10 h-10 shrink-0 rounded-full ring-1 ring-current/15 flex items-center justify-center transition-colors group-hover:bg-accent-ink group-hover:text-white group-hover:ring-transparent ${className}`}
  >
    <ArrowUpRight className="w-4 h-4" aria-hidden />
  </span>
);

/** Icon in a circle, top-left of a tile. Glass tiles get a white dot, colored tiles a translucent one. */
export const IconDot: React.FC<{ icon: LucideIcon; tone?: TileTone; className?: string }> = ({ icon: Icon, tone = 'glass', className }) => (
  <span
    className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${
      className ?? (tone === 'glass' ? 'bg-white/80 text-accent-ink' : 'bg-white/25 text-ink')
    }`}
  >
    <Icon className="w-[18px] h-[18px]" aria-hidden />
  </span>
);
