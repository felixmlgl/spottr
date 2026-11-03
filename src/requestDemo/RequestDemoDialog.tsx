/**
 * The request-a-demo popup, in two steps: pick the gym size and see its price, then leave contact details.
 * The details POST to /api/request-demo (api/request-demo.ts), which emails them to the team.
 * Opened through openRequestDemo() (RequestDemo.tsx).
 */

import React, { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { CheckDot } from '../components/CheckDot';
import { Field, inputClass, Popup, PopupHeading, primaryButton } from '../components/Popup';
import { PRICING_TERMS, TierPicker, TierSummary } from '../components/TierPricing';
import { DEFAULT_TIER, formatUsd, Tier, TierId, tierById } from '../gyms/pricing';

const CONTACT_EMAIL = 'info@tryspottr.app';
const TITLE_ID = 'request-demo-title';

const LOCATION_OPTIONS = ['1', '2–4', '5–19', '20+'];

const EMPTY_FIELDS = { name: '', email: '', gym: '', city: '', locations: '', notes: '' };
type Fields = typeof EMPTY_FIELDS;

const sizeLabel = (tier: Tier) => `${tier.name} (${tier.members} members, ${formatUsd(tier.price)}/month)`;

/** The same request as a prefilled email, for when sending fails. */
const mailtoFor = (fields: Fields, tier: Tier) => {
  const body = [
    `Name: ${fields.name}`,
    `Email: ${fields.email}`,
    `Gym: ${fields.gym}`,
    `City: ${fields.city}`,
    `Locations: ${fields.locations}`,
    `Gym size: ${sizeLabel(tier)}`,
    fields.notes && `\n${fields.notes}`,
  ]
    .filter(Boolean)
    .join('\n');
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Demo request: ${fields.gym}`)}&body=${encodeURIComponent(body)}`;
};

const Heading: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <PopupHeading id={TITLE_ID} label="Request a demo" title={title}>
    {children}
  </PopupHeading>
);

type Step = 'size' | 'details' | 'sent';

const RequestDemoFlow: React.FC<{ initialTier?: TierId; onDone: () => void }> = ({ initialTier, onDone }) => {
  const [step, setStep] = useState<Step>('size');
  const [tierId, setTierId] = useState<TierId>(initialTier ?? DEFAULT_TIER);
  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [dryRun, setDryRun] = useState(false);
  const tier = tierById(tierId);

  const update = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/request-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fields,
          size: sizeLabel(tier),
          page: `${window.location.pathname}${window.location.hash}`,
          // Honeypot: people never see this field, bots fill it in
          website: String(new FormData(e.currentTarget).get('website') ?? ''),
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; dryRun?: boolean } | null;
      if (!res.ok || !data?.ok) throw new Error(`Request failed (${res.status})`);
      setDryRun(Boolean(data.dryRun));
      setStatus('idle');
      setStep('sent');
    } catch {
      setStatus('error');
    }
  };

  if (step === 'size') {
    return (
      <div className="flex flex-col gap-6">
        <Heading title="How big is your gym?">Pick the size of one location to see your price.</Heading>
        <TierPicker value={tierId} onChange={setTierId} />
        <TierSummary tier={tier} />
        <p className="text-xs text-ink-2 leading-relaxed">
          {PRICING_TERMS} Pilot pricing, not yet tested with paying gyms.
        </p>
        <button type="button" onClick={() => setStep('details')} className={`${primaryButton} sm:self-end`}>
          Continue
        </button>
      </div>
    );
  }

  if (step === 'sent') {
    const firstName = fields.name.split(' ')[0];
    return (
      <div className="flex flex-col items-start gap-5">
        <CheckDot className="w-12 h-12" />
        <Heading title={`Thanks${firstName ? `, ${firstName}` : ''}.`}>
          Your request is in. We&rsquo;ll get back to you at <span className="font-semibold text-ink">{fields.email}</span> to set
          up a demo.
        </Heading>
        {dryRun && (
          <p className="text-xs text-ink-2 rounded-xl bg-white/70 ring-1 ring-black/[0.06] px-3 py-2">
            Local dev: nothing was sent. The email is printed in the terminal running the dev server.
          </p>
        )}
        <button type="button" onClick={onDone} className={primaryButton}>
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => setStep('size')}
        className="self-start -ml-1 inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-ink cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Gym size
      </button>
      <Heading title="Tell us about your gym" />
      <p className="flex items-center justify-between gap-3 flex-wrap rounded-2xl bg-white/70 ring-1 ring-black/[0.06] px-4 py-3 text-sm text-ink">
        <span>
          <span className="font-semibold">{tier.name}</span>
          <span className="text-ink-2"> · {tier.members} members · </span>
          <span className="font-semibold">{formatUsd(tier.price)}</span>
          <span className="text-ink-2">/mo per location</span>
        </span>
        <button type="button" onClick={() => setStep('size')} className="font-semibold text-accent-ink hover:text-ink cursor-pointer">
          Change
        </button>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Your name">
          <input value={fields.name} onChange={update('name')} required maxLength={100} autoComplete="name" className={inputClass} placeholder="Jordan Lee" />
        </Field>
        <Field label="Work email">
          <input
            value={fields.email}
            onChange={update('email')}
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            className={inputClass}
            placeholder="jordan@yourgym.com"
          />
        </Field>
        <Field label="Gym name">
          <input value={fields.gym} onChange={update('gym')} required maxLength={150} autoComplete="organization" className={inputClass} placeholder="Iron District Fitness" />
        </Field>
        <Field label="City">
          <input value={fields.city} onChange={update('city')} required maxLength={100} className={inputClass} placeholder="Oakland" />
        </Field>
        <Field label="Number of locations" className="sm:col-span-2">
          <select value={fields.locations} onChange={update('locations')} required className={inputClass}>
            <option value="" disabled>
              Select…
            </option>
            {LOCATION_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Anything we should know?" optional>
        <textarea
          value={fields.notes}
          onChange={update('notes')}
          rows={3}
          maxLength={2000}
          className={`${inputClass} resize-none`}
          placeholder="Your cameras, goals, timeline…"
        />
      </Field>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="sr-only" />
      {status === 'error' && (
        <p role="alert" className="text-sm text-ink rounded-xl bg-coral/15 ring-1 ring-coral/40 px-4 py-3">
          Your request didn&rsquo;t go through.{' '}
          <a href={mailtoFor(fields, tier)} className="font-semibold text-accent-ink hover:text-ink underline">
            Send it by email instead
          </a>{' '}
          or try again.
        </p>
      )}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-ink-2">Goes straight to our team at {CONTACT_EMAIL}.</p>
        <button type="submit" disabled={status === 'sending'} className={primaryButton}>
          {status === 'sending' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
          Request a demo
        </button>
      </div>
    </form>
  );
};

export const RequestDemoDialog: React.FC<{ initialTier?: TierId; onClose: () => void }> = ({ initialTier, onClose }) => (
  <Popup labelledBy={TITLE_ID} onClose={onClose}>
    {(close) => <RequestDemoFlow initialTier={initialTier} onDone={close} />}
  </Popup>
);
