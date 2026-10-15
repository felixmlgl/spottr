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
  ['Paid LOI', 'If the pilot delivers, we sign a paid letter of intent for the rollout across your locations.'],
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
      <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">From first call to paid rollout</h2>
    </div>
    <ol className="flex flex-col gap-3">
      {PILOT_STEPS.map(([title, body], i) => (
        <li key={title} className="flex gap-3">
          <span className="w-6 h-6 shrink-0 rounded-full bg-[#34C759] text-white text-xs font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <span>
            <span className="block text-sm font-semibold text-[#1D1D1F]">{title}</span>
            <span className="block text-[13px] text-[#6E6E73] mt-0.5 leading-relaxed">{body}</span>
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
        <span className="text-4xl font-bold tracking-tight text-[#1D1D1F]">{formatUsd(PRICE_PER_LOCATION_MONTH)}</span>
        <span className="text-sm text-[#6E6E73]">per location / month</span>
      </p>
      <span className="inline-flex mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-[#6E6E73] bg-white ring-1 ring-black/[0.06] whitespace-nowrap">
        Target price, not yet tested
      </span>
    </div>
    <ul className="flex flex-col gap-2">
      {INCLUDED.map((item) => (
        <li key={item} className="text-sm text-[#1D1D1F] flex gap-2">
          <Check className="w-4 h-4 text-[#34C759] shrink-0 mt-0.5" />
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
        <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">
          Pays for itself from <span className="text-[#248A3D]">{members} retained members</span>
        </h2>
        <p className="text-sm text-[#6E6E73] mt-1.5 leading-relaxed">
          per location and month: members who stay instead of cancelling. {formatUsd(PRICE_PER_LOCATION_MONTH)} ÷{' '}
          {formatUsd(dues)} average monthly dues = {members}.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-[#6E6E73]">Your average monthly dues</span>
        <Segmented
          ariaLabel="Average monthly dues"
          options={DUES_OPTIONS.map((d) => ({ id: d, label: formatUsd(d) }))}
          value={dues}
          onChange={setDues}
          className="self-start"
        />
      </div>
      <p className="text-xs text-[#6E6E73] leading-relaxed">
        For scale: this week Spottr flagged {AT_RISK_MEMBERS.length} slipping members at {GYM.name} Oakland (simulated).
      </p>
    </Card>
  );
};
