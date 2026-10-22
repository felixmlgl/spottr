import React from 'react';

/** The dot-matrix Spottr wordmark (same as the welcome page and the deck), drawn in ink for light headers (blue is kept for actions). */
export const Logo: React.FC<{ className?: string }> = ({ className = 'h-7' }) => (
  <span
    role="img"
    aria-label="Spottr"
    className={`block aspect-[480/135] bg-ink [mask:url(/brand/spottr-logo.png)_center/contain_no-repeat] ${className}`}
  />
);
