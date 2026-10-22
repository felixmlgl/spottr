/**
 * Pricing by gym size: pick the members at one location, see the price, what's included and the break-even.
 * Used on the landing page, the gym demo's pricing page and the first step of the request-a-demo popup.
 */

import React, { useId, useState } from 'react';
import { CheckDot } from './CheckDot';
import { openRequestDemo } from '../requestDemo/RequestDemo';
import {
  breakEvenMembers,
  CHAIN_DISCOUNTS,
  DEFAULT_TIER,
  EXTRA_BOX_MONTH,
  formatUsd,
  Tier,
  TierId,
  TIERS,
  tierById,
} from '../gyms/pricing';

export const PRICING_TERMS = `Annual contract. Chains save ${CHAIN_DISCOUNTS.map(
  (d) => `${Math.round(d.off * 100)}% from ${d.from} locations`,
).join(' and ')}. More cameras: +${formatUsd(EXTRA_BOX_MONTH)} a month per extra Spottr box.`;

/** Four radio cards, one per tier. */
export const TierPicker: React.FC<{ value: TierId; onChange: (id: TierId) => void }> = ({ value, onChange }) => {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="hud-label mb-2">Active members per location</legend>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TIERS.map((t) => (
          <label key={t.id} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={t.id}
              checked={value === t.id}
              onChange={() => onChange(t.id)}
              className="peer sr-only"
            />
            <span className="h-full flex flex-col rounded-2xl p-3 bg-white/50 ring-1 ring-black/[0.06] transition-colors hover:bg-white/80 peer-checked:bg-white peer-checked:ring-2 peer-checked:ring-accent-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
              <span className="text-sm font-semibold text-ink">{t.name}</span>
              <span className="text-xs text-ink-2 mt-0.5">{t.members}</span>
              <span className="text-sm font-semibold text-ink mt-3">
                {formatUsd(t.price)}
                <span className="font-normal text-ink-2">/mo</span>
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};

/** Price, what's included and the break-even for one tier. */
export const TierSummary: React.FC<{ tier: Tier }> = ({ tier }) => (
  <div className="flex flex-col gap-4">
    <p className="flex items-baseline gap-2 flex-wrap">
      <span className="num text-5xl text-ink">{formatUsd(tier.price)}</span>
      <span className="text-sm text-ink-2">per location / month</span>
    </p>
    <ul className="flex flex-col gap-2">
      {[`${tier.cameras} cameras included`, 'Spottr boxes and install included', 'Free for your members'].map((item) => (
        <li key={item} className="text-sm text-ink flex gap-2">
          <CheckDot className="w-[18px] h-[18px] mt-0.5" />
          {item}
        </li>
      ))}
    </ul>
    <div className="rounded-[20px] bg-white/70 ring-1 ring-white p-4">
      <p className="flex items-baseline gap-2 flex-wrap">
        <span className="num text-4xl text-ink">
          <span className="marker">{breakEvenMembers(tier)}</span>
        </span>
        <span className="text-sm text-ink">members kept a month covers it</span>
      </p>
      <p className="text-xs text-ink-2 mt-1.5">At {formatUsd(tier.dues)} average monthly dues, typical for this size.</p>
    </div>
  </div>
);

/** Picker, summary and the button that opens the request-a-demo popup with the picked size. */
export const TierPricing: React.FC = () => {
  const [tierId, setTierId] = useState<TierId>(DEFAULT_TIER);
  return (
    <div className="flex flex-col gap-5">
      <TierPicker value={tierId} onChange={setTierId} />
      <TierSummary tier={tierById(tierId)} />
      <p className="text-xs text-ink-2 leading-relaxed">{PRICING_TERMS}</p>
      <button
        type="button"
        onClick={() => openRequestDemo(tierId)}
        className="self-start inline-flex items-center px-6 py-3 rounded-full bg-accent-ink text-white font-semibold hover:bg-accent-deep transition-colors cursor-pointer"
      >
        Request a demo
      </button>
    </div>
  );
};
