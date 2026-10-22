import React from 'react';
import { ChevronRight, Info } from 'lucide-react';

// Both use native <details>: they open by tap, click or keyboard and need no state.
const SUMMARY = 'list-none [&::-webkit-details-marker]:hidden cursor-pointer';

/** "Details ›": detail that most visitors can skip, one tap away. */
export const Disclosure: React.FC<{ label?: React.ReactNode; className?: string; children: React.ReactNode }> = ({
  label = 'Details',
  className = '',
  children,
}) => (
  <details className={`group ${className}`}>
    <summary className={`${SUMMARY} inline-flex items-center gap-1 text-sm font-medium text-accent-ink hover:text-ink`}>
      {label}
      <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" aria-hidden />
    </summary>
    <div className="mt-3">{children}</div>
  </details>
);

/** ⓘ next to a label: a source note or caveat in a small popover. */
export const InfoTip: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <details className="group relative inline-block align-middle">
    <summary
      aria-label={label}
      className={`${SUMMARY} w-6 h-6 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ink group-open:text-ink`}
    >
      <Info className="w-4 h-4" aria-hidden />
    </summary>
    <div className="absolute z-20 left-0 top-7 w-64 max-w-[80vw] p-3 rounded-2xl bg-paper text-xs font-normal text-ink-2 leading-relaxed shadow-lg ring-1 ring-black/[0.06]">
      {children}
    </div>
  </details>
);
