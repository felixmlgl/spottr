import React from 'react';

/** The dot-matrix Spottr wordmark (same as the welcome page and the deck), drawn dark for light headers. */
export const Logo: React.FC<{ className?: string }> = ({ className = 'h-7' }) => (
  <img src="/brand/spottr-logo.png" alt="Spottr" className={`w-auto brightness-0 opacity-90 ${className}`} />
);
