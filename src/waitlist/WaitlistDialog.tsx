/**
 * The join-the-waitlist popup for gym members: where they train and how to reach them, then a link to pass on to people
 * from the same gym. The more members of one gym sign up, the stronger the case we bring to that gym.
 * The sign-up POSTs to /api/join-waitlist (api/join-waitlist.ts), which emails a link to confirm it. That link and the
 * one to remove the sign-up open this popup again (LinkFlow), which posts to /api/waitlist-link.
 * Opened through openWaitlist() (Waitlist.tsx).
 */

import React, { useEffect, useState } from 'react';
import { Check, Copy, Loader2, MailCheck, Share } from 'lucide-react';
import { CheckDot } from '../components/CheckDot';
import { Field, inputClass, Popup, PopupHeading, primaryButton } from '../components/Popup';
import { PRIVACY_ANCHOR, type WaitlistLink, type WaitlistPrefill } from './Waitlist';
import type { WaitlistStatus } from '../../api/join-waitlist';

const CONTACT_EMAIL = 'info@tryspottr.app';
const TITLE_ID = 'waitlist-title';

const EMPTY_FIELDS = { gym: '', city: '', name: '', email: '' };
type Fields = typeof EMPTY_FIELDS;

/** The same sign-up as a prefilled email, for when sending fails. */
const mailtoFor = (fields: Fields, shareName: boolean) => {
  const body = [
    `Gym: ${fields.gym}`,
    `City: ${fields.city}`,
    `Name: ${fields.name}`,
    `Email: ${fields.email}`,
    `My gym may know my first name: ${shareName ? 'yes' : 'no'}`,
  ].join('\n');
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Waitlist: ${fields.gym}`)}&body=${encodeURIComponent(body)}`;
};

/**
 * Opens this popup with the gym already filled in (main.tsx forwards "/waitlist" to "/#waitlist").
 * "src=share" marks the sign-ups that came from members passing it on.
 */
const linkFor = ({ gym, city }: WaitlistPrefill) =>
  `${window.location.origin}/waitlist?${new URLSearchParams({ gym, city, src: 'share' })}`;

const quietButton =
  'inline-flex items-center justify-center px-5 py-3 rounded-full text-ink font-medium hover:bg-black/[0.05] transition-colors cursor-pointer';

const devNote = (
  <p className="text-xs text-ink-2 rounded-xl bg-white/70 ring-1 ring-black/[0.06] px-3 py-2">
    Local dev: no email was sent. It&rsquo;s printed in the terminal running the dev server, with its links.
  </p>
);

/** The link to pass on: the share sheet where there is one, else the clipboard. */
const PassItOn: React.FC<{ fields: WaitlistPrefill }> = ({ fields }) => {
  const url = linkFor(fields);
  const [copied, setCopied] = useState(false);
  const canShare = 'share' in navigator;

  const share = async () => {
    if (canShare) {
      try {
        await navigator.share({ title: 'Spottr', text: `Join the Spottr waitlist for ${fields.gym}`, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // No share sheet after all: copy instead
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // The link stays on screen to copy by hand
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 rounded-2xl bg-white/70 ring-1 ring-black/[0.06] p-4">
      <p className="text-sm text-ink leading-relaxed">
        Every member who joins makes the case for <span className="font-semibold">{fields.gym}</span>. Send this to the people
        you train with.
      </p>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <input
          readOnly
          value={url}
          aria-label="Waitlist link for your gym"
          onFocus={(e) => e.currentTarget.select()}
          className={`${inputClass} min-w-0 flex-1 text-ink-2`}
        />
        <button
          type="button"
          onClick={share}
          className="self-start shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-semibold text-accent-ink ring-1 ring-accent-ink/30 hover:bg-accent/10 transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4" aria-hidden /> : canShare ? <Share className="w-4 h-4" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
          {copied ? 'Copied' : canShare ? 'Share link' : 'Copy link'}
        </button>
      </div>
    </div>
  );
};

const WaitlistFlow: React.FC<{ prefill?: WaitlistPrefill; onDone: () => void }> = ({ prefill, onDone }) => {
  const [fields, setFields] = useState<Fields>({ ...EMPTY_FIELDS, ...prefill });
  const [shareName, setShareName] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'error' | WaitlistStatus>('idle');
  const [dryRun, setDryRun] = useState(false);

  const update = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => setFields((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/join-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fields,
          shareName,
          page: `${window.location.pathname}${window.location.hash}`,
          // Where the visit came from, e.g. "?src=flyer" on a QR code or "?src=share" on a member's link
          source: new URLSearchParams(window.location.search).get('src') ?? '',
          // Honeypot: people never see this field, bots fill it in
          website: String(new FormData(e.currentTarget).get('website') ?? ''),
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; status?: WaitlistStatus; dryRun?: boolean } | null;
      if (!res.ok || !data?.ok) throw new Error(`Sign-up failed (${res.status})`);
      setDryRun(Boolean(data.dryRun));
      setStatus(data.status ?? 'sent');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent' || status === 'recently-sent' || status === 'confirmed') {
    const firstName = fields.name.split(' ')[0];
    const email = <span className="font-semibold text-ink">{fields.email}</span>;
    return (
      <div className="flex flex-col items-start gap-5">
        {status === 'confirmed' ? (
          <CheckDot className="w-12 h-12" />
        ) : (
          // Not done yet: the sign-up only counts once the email is confirmed
          <span className="w-12 h-12 rounded-full bg-accent/10 text-accent-ink flex items-center justify-center">
            <MailCheck className="w-6 h-6" aria-hidden />
          </span>
        )}
        {status === 'confirmed' ? (
          <PopupHeading id={TITLE_ID} label="Join the waitlist" title={`You're on the list, ${firstName}.`}>
            We&rsquo;ll email you at {email} once Spottr is at {fields.gym}.
          </PopupHeading>
        ) : (
          <PopupHeading id={TITLE_ID} label="Join the waitlist" title={`Check your inbox, ${firstName}.`}>
            {status === 'sent' ? (
              <>
                We sent a link to {email}. Confirm it so your sign-up counts for {fields.gym}.
              </>
            ) : (
              <>
                We emailed {email} a few minutes ago. The link in that email confirms this sign-up too.
              </>
            )}
          </PopupHeading>
        )}
        {dryRun && devNote}
        <PassItOn fields={fields} />
        <button type="button" onClick={onDone} className={primaryButton}>
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <PopupHeading id={TITLE_ID} label="Join the waitlist" title="Want Spottr at your gym?">
        Tell us where you train. Once enough members of a gym ask for it, we take the list to that gym, and email you when
        it&rsquo;s there.
      </PopupHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Your gym">
          <input value={fields.gym} onChange={update('gym')} required maxLength={150} autoComplete="off" className={inputClass} placeholder="Iron District Fitness" />
        </Field>
        <Field label="City">
          <input value={fields.city} onChange={update('city')} required maxLength={100} autoComplete="address-level2" className={inputClass} placeholder="Oakland" />
        </Field>
        <Field label="First name">
          <input value={fields.name} onChange={update('name')} required maxLength={100} autoComplete="given-name" className={inputClass} placeholder="Jordan" />
        </Field>
        <Field label="Email">
          <input
            value={fields.email}
            onChange={update('email')}
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            className={inputClass}
            placeholder="jordan@example.com"
          />
        </Field>
      </div>
      <label className="flex items-start gap-3 text-sm text-ink leading-relaxed cursor-pointer">
        <input
          type="checkbox"
          checked={shareName}
          onChange={(e) => setShareName(e.target.checked)}
          className="mt-1 w-4 h-4 shrink-0 accent-accent-ink cursor-pointer"
        />
        <span>
          You can tell my gym my first name when you show them the list.{' '}
          <span className="text-ink-2">Otherwise they only hear how many members asked.</span>
        </span>
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="sr-only" />
      {status === 'error' && (
        <p role="alert" className="text-sm text-ink rounded-xl bg-coral/15 ring-1 ring-coral/40 px-4 py-3">
          Your sign-up didn&rsquo;t go through.{' '}
          <a href={mailtoFor(fields, shareName)} className="font-semibold text-accent-ink hover:text-ink underline">
            Send it by email instead
          </a>{' '}
          or try again.
        </p>
      )}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-ink-2">
          We only email you about Spottr at your gym.{' '}
          {/* A new tab, so the form stays filled in */}
          <a href={`/privacy#${PRIVACY_ANCHOR}`} target="_blank" rel="noopener" className="font-semibold text-accent-ink hover:text-ink">
            Privacy
          </a>
        </p>
        <button type="submit" disabled={status === 'sending'} className={primaryButton}>
          {status === 'sending' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
          Join the waitlist
        </button>
      </div>
    </form>
  );
};

type LinkResult = WaitlistPrefill & { name: string };

/** A link from the confirmation email: confirming starts right away, removing waits for the member to say so. */
const LinkFlow: React.FC<{ link: WaitlistLink; onDone: () => void; onSignUp: () => void }> = ({ link, onDone, onSignUp }) => {
  const confirming = link.action === 'confirm';
  const [state, setState] = useState<'ask' | 'working' | 'done' | 'invalid' | 'error'>(confirming ? 'working' : 'ask');
  const [result, setResult] = useState<LinkResult | null>(null);

  const run = async () => {
    setState('working');
    try {
      const res = await fetch('/api/waitlist-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(link),
      });
      const data = (await res.json().catch(() => null)) as ({ ok: true } & LinkResult) | { ok: false } | null;
      if (data?.ok) {
        setResult(data);
        setState('done');
      } else {
        setState(res.status === 400 || res.status === 404 ? 'invalid' : 'error');
      }
    } catch {
      setState('error');
    }
  };

  useEffect(() => {
    // Confirming twice is harmless (React runs this twice in dev)
    if (confirming) run();
  }, []);

  const heading = (title: string, children?: React.ReactNode) => (
    <PopupHeading id={TITLE_ID} label="Waitlist" title={title}>
      {children}
    </PopupHeading>
  );

  if (state === 'working') {
    return (
      <div className="flex flex-col items-start gap-5">
        <Loader2 className="w-8 h-8 text-accent-ink animate-spin" aria-hidden />
        {heading(confirming ? 'Confirming your sign-up…' : 'Removing your sign-up…')}
      </div>
    );
  }

  if (state === 'ask') {
    return (
      <div className="flex flex-col items-start gap-5">
        {heading('Remove your sign-up?', "We'll take you off the waitlist for this gym and won't email you about it.")}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={run} className={primaryButton}>
            Remove my sign-up
          </button>
          <button type="button" onClick={onDone} className={quietButton}>
            Keep it
          </button>
        </div>
      </div>
    );
  }

  if (state === 'done' && result) {
    return (
      <div className="flex flex-col items-start gap-5">
        <CheckDot className="w-12 h-12" />
        {confirming ? (
          <>
            {heading(
              `You're confirmed, ${result.name.split(' ')[0]}.`,
              `Your sign-up now counts for ${result.gym}. We'll email you once Spottr is there.`,
            )}
            <PassItOn fields={result} />
          </>
        ) : (
          heading("You're off the list.", `Your sign-up for ${result.gym} is deleted.`)
        )}
        <button type="button" onClick={onDone} className={primaryButton}>
          Done
        </button>
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <div className="flex flex-col items-start gap-5">
        {confirming
          ? heading(
              "This link doesn't work anymore",
              "It may be from an older email, or the sign-up was removed. Sign up again and we'll send you a new link.",
            )
          : heading(
              "This link doesn't work anymore",
              `The sign-up may already be removed. If you still get emails from us, write to ${CONTACT_EMAIL}.`,
            )}
        <button type="button" onClick={confirming ? onSignUp : onDone} className={primaryButton}>
          {confirming ? 'Sign up again' : 'Done'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-5">
      {heading('Something went wrong', `Try again in a moment, or write to ${CONTACT_EMAIL}.`)}
      <button type="button" onClick={run} className={primaryButton}>
        Try again
      </button>
    </div>
  );
};

export const WaitlistDialog: React.FC<{ prefill?: WaitlistPrefill; link?: WaitlistLink; onClose: () => void }> = ({
  prefill,
  link,
  onClose,
}) => {
  // An email link that no longer works can lead back to the form
  const [activeLink, setActiveLink] = useState(link);
  return (
    <Popup labelledBy={TITLE_ID} onClose={onClose}>
      {(close) =>
        activeLink ? (
          <LinkFlow link={activeLink} onDone={close} onSignUp={() => setActiveLink(undefined)} />
        ) : (
          <WaitlistFlow prefill={prefill} onDone={close} />
        )
      }
    </Popup>
  );
};
