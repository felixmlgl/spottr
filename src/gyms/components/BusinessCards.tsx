/**
 * The business side of the pitch, shared by the landing page and the pilot page:
 * how a pilot runs and what it costs at each gym size.
 */

import React from 'react';
import { TierPricing } from '../../components/TierPricing';
import { Card, Eyebrow } from './ui';

export const PILOT_STEPS = [
  ['Intro call', 'We look at your floor plan and the cameras you already have.'],
  ['Install', 'We set up the Spottr boxes your location needs, hardware included. They read your existing camera streams.'],
  ['Pilot', 'Your members use the app for free. You get the gym dashboard and alerts for slipping members.'],
  ['Rollout', 'If the pilot works for you, we agree on a rollout across your locations.'],
] as const;

export const PilotStepsCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <Card className={`flex flex-col gap-5 ${className}`}>
    <div>
      <Eyebrow>How a pilot works</Eyebrow>
      <h2 className="text-xl font-bold tracking-tight text-ink mt-0.5">From first call to rollout</h2>
    </div>
    <ol className="flex flex-col gap-3">
      {PILOT_STEPS.map(([title, body], i) => (
        <li key={title} className="flex gap-3">
          <span className="font-mono text-xs text-accent-ink pt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
          <span>
            <span className="block text-sm font-semibold text-ink">{title}</span>
            <span className="block text-[13px] text-ink-2 mt-0.5 leading-relaxed">{body}</span>
          </span>
        </li>
      ))}
    </ol>
  </Card>
);

export const PriceCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <Card className={`flex flex-col gap-5 ${className}`}>
    <div>
      <Eyebrow>Pricing</Eyebrow>
      <h2 className="text-xl font-bold tracking-tight text-ink mt-0.5">Priced by the size of your gym</h2>
      <span className="inline-flex mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-ink-2 bg-white ring-1 ring-black/[0.06] whitespace-nowrap">
        Pilot pricing
      </span>
    </div>
    <TierPricing />
  </Card>
);
