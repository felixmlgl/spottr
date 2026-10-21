/**
 * The business side of the pitch, shared by the landing page and the pilot page:
 * how a pilot runs, what it costs, and when it pays for itself.
 */

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { AT_RISK_MEMBERS, GYM } from '../../mocks/gym';
import { breakEvenMembers, DEFAULT_DUES, DUES_OPTIONS, formatUsd, PRICE_PER_LOCATION_MONTH } from '../pricing';
import { Card, Eyebrow, Segmented } from './ui';

const PILOT_STEPS = [
  ['Intro call', 'We look at your floor plan and the cameras you already have.'],
  ['Install', 'One or two Spottr boxes per location, hardware included. They read your existing camera streams.'],
  ['Pilot', 'Your members use the app for free. You get the operator dashboard and retention alerts.'],
  ['Rollout', 'If the pilot works for you, we agree on a rollout across your locations.'],
] as const;

const INCLUDED = [
  'One or two Spottr boxes per location, hardware included',
  'Works with the cameras you already have',
  'Operator dashboard and retention alerts',
  'Member app, free for your members',
];

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
      <p className="mt-2 flex items-baseline gap-2 flex-wrap">
        <span className="font-dot text-5xl font-black text-ink">{formatUsd(PRICE_PER_LOCATION_MONTH)}</span>
        <span className="text-sm text-ink-2">per location / month</span>
      </p>
      <span className="inline-flex mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-ink-2 bg-white ring-1 ring-black/[0.06] whitespace-nowrap">
        Pilot pricing
      </span>
    </div>
    <ul className="flex flex-col gap-2">
      {INCLUDED.map((item) => (
        <li key={item} className="text-sm text-ink flex gap-2">
          <Check className="w-4 h-4 text-accent-ink shrink-0 mt-0.5" />
          {item}
        </li>
      ))}
    </ul>
  </Card>
);

export const BreakEvenCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [dues, setDues] = useState<number>(DEFAULT_DUES);
  const members = breakEvenMembers(dues);
  return (
    <Card className={`flex flex-col gap-5 ${className}`}>
      <div>
        <Eyebrow>Break-even</Eyebrow>
        <h2 className="text-xl font-bold tracking-tight text-ink mt-0.5">
          Pays for itself from
        </h2>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="font-dot text-5xl font-black text-accent-ink">{members}</span>
          <span className="text-base font-semibold text-ink">retained members</span>
        </p>
        <p className="text-sm text-ink-2 mt-1.5 leading-relaxed">
          per location and month: members who stay instead of cancelling. {formatUsd(PRICE_PER_LOCATION_MONTH)} ÷{' '}
          {formatUsd(dues)} average monthly dues = {members}.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-ink-2">Your average monthly dues</span>
        <Segmented
          ariaLabel="Average monthly dues"
          options={DUES_OPTIONS.map((d) => ({ id: d, label: formatUsd(d) }))}
          value={dues}
          onChange={setDues}
          className="self-start"
        />
      </div>
      <p className="text-xs text-ink-2 leading-relaxed">
        For scale: this week Spottr flagged {AT_RISK_MEMBERS.length} slipping members at {GYM.name} Oakland (simulated).
      </p>
    </Card>
  );
};
