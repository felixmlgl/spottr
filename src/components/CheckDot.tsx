import React from 'react';
import { Check } from 'lucide-react';

/** "Done" mark: an ink check on a lime disc. Pass `label` when the mark carries meaning on its own. */
export const CheckDot: React.FC<{ className?: string; label?: string }> = ({ className = 'w-5 h-5', label }) => (
  <span
    role={label ? 'img' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    className={`rounded-full bg-lime text-ink flex items-center justify-center shrink-0 ${className}`}
  >
    <Check className="w-[62%] h-[62%] stroke-[3]" />
  </span>
);
