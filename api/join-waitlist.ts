/**
 * POST /api/join-waitlist (Vercel Function): a gym member joins the waitlist for their gym, from the site's popup.
 * Stores the sign-up in Postgres at Neon (table and per-gym view in db/waitlist.sql) and emails a link to confirm it,
 * through Resend. The email's links open the popup again ("/waitlist?confirm=…", "?leave=…"), which calls
 * api/waitlist-link.ts. Confirming once confirms every gym that email signed up for, so an address that is already
 * confirmed gets no new email.
 *
 * Environment variables (set on Vercel; .env.local for `npm run dev`):
 * - DATABASE_URL    required to store; set by the Neon integration. Locally, use the Neon `dev` branch, not production's
 * - RESEND_API_KEY  required to send the confirmation email (the same key as api/request-demo.ts)
 *
 * In local dev, vite.config.ts serves the same handler. Without DATABASE_URL it prints the sign-up instead of storing
 * it; without RESEND_API_KEY it stores the sign-up and prints the email, links included.
 * Only npm and Node imports: Vercel runs this file on its own, outside the Vite build.
 */

import { createHash, randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

/** Accepted fields and their maximum length */
const FIELDS = { gym: 150, city: 100, name: 100, email: 200, source: 32, page: 200 };
type Field = keyof typeof FIELDS;
const REQUIRED: Field[] = ['gym', 'city', 'name', 'email'];

const FROM = 'Spottr <waitlist@tryspottr.app>';
const REPLY_TO = 'info@tryspottr.app';
/** At most one confirmation email per address in this many minutes, so the form can't be used to flood an inbox */
const RESEND_AFTER_MINUTES = 10;

export interface WaitlistSignup extends Record<Field, string> {
  /** The member agreed that we may tell their gym their first name */
  shareName: boolean;
}

export interface WaitlistEnv {
  DATABASE_URL?: string;
  RESEND_API_KEY?: string;
}

/**
 * What the member should do next: `sent` check the inbox, `recently-sent` use the email sent a few minutes ago
 * (its link confirms this sign-up too), `confirmed` nothing (the address was confirmed before).
 */
export type WaitlistStatus = 'sent' | 'recently-sent' | 'confirmed';

export interface WaitlistResult {
  status: number;
  body: { ok: true; status?: WaitlistStatus; dryRun?: boolean } | { ok: false; error: string };
}

const fail = (status: number, error: string): WaitlistResult => ({ status, body: { ok: false, error } });

const normalize = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ'’]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** One key per gym, to count its sign-ups: "Gold's Gym", "golds gym " and "Golds Gym" in Oakland all count together. */
export const gymKey = (gym: string, city: string) => `${normalize(gym)} | ${normalize(city)}`;

/** Only the hash is stored, so the database alone can't be used to build working links. Same in api/waitlist-link.ts */
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The confirmation email, with its two links on `origin` (the site that served the form). */
const confirmationEmail = (signup: WaitlistSignup, token: string, origin: string) => {
  const confirmUrl = `${origin}/waitlist?confirm=${token}`;
  const leaveUrl = `${origin}/waitlist?leave=${token}`;
  const firstName = signup.name.split(' ')[0];
  const where = `${signup.gym}, ${signup.city}`;
  const text = [
    `Hi ${firstName},`,
    '',
    `Confirm that you want Spottr at ${where}:`,
    confirmUrl,
    '',
    "Confirmed sign-ups are what we take to your gym. We'll email you once Spottr is there.",
    '',
    "Didn't sign up? Ignore this email.",
    `Remove my sign-up: ${leaveUrl}`,
  ].join('\n');
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.5;color:#0E1117;max-width:480px">
<p>Hi ${escapeHtml(firstName)},</p>
<p>Confirm that you want Spottr at <strong>${escapeHtml(where)}</strong>.</p>
<p><a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#2A5CDB;color:#FFFFFF;font-weight:600;text-decoration:none">Confirm</a></p>
<p>Confirmed sign-ups are what we take to your gym. We'll email you once Spottr is there.</p>
<p style="font-size:13px;color:#4B5262">Didn't sign up? Ignore this email. <a href="${leaveUrl}" style="color:#4B5262">Remove my sign-up</a></p>
</div>`;
  return { from: FROM, to: [signup.email], reply_to: REPLY_TO, subject: `Confirm: you want Spottr at ${signup.gym}`, text, html };
};

/**
 * Checks the form, stores it and sends the confirmation email. `origin` is the site the links in the email point to.
 * With `dryRunWithoutKey` (local dev), a missing DATABASE_URL or RESEND_API_KEY prints instead of failing.
 */
export async function handleWaitlistSignup(
  input: unknown,
  env: WaitlistEnv,
  { origin, dryRunWithoutKey = false }: { origin: string; dryRunWithoutKey?: boolean },
): Promise<WaitlistResult> {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  // Bots fill in every field, including the one people never see: pretend it worked
  if (typeof raw.website === 'string' && raw.website.trim()) return { status: 200, body: { ok: true, status: 'sent' } };

  const signup = { shareName: raw.shareName === true } as WaitlistSignup;
  for (const [key, max] of Object.entries(FIELDS) as [Field, number][]) {
    const given = raw[key];
    signup[key] = typeof given === 'string' ? given.trim().slice(0, max).replace(/\s+/g, ' ') : '';
  }
  signup.email = signup.email.toLowerCase();
  signup.source = signup.source.replace(/[^\w-]/g, '');
  const missing = REQUIRED.filter((key) => !signup[key]);
  if (missing.length) return fail(400, `Missing: ${missing.join(', ')}`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signup.email)) return fail(400, 'Invalid email');

  if (!env.DATABASE_URL) {
    if (!dryRunWithoutKey) return fail(503, 'The waitlist is not set up');
    console.info(
      [
        '',
        '[join-waitlist] DATABASE_URL is not set, so nothing was stored. The sign-up was:',
        '',
        `Gym: ${signup.gym}, ${signup.city} (key "${gymKey(signup.gym, signup.city)}")`,
        `Name: ${signup.name}${signup.shareName ? ' (may be shared with the gym)' : ''}`,
        `Email: ${signup.email}`,
        `Sent from ${signup.page || 'the site'}${signup.source ? ` (src=${signup.source})` : ''}`,
        '',
      ].join('\n'),
    );
    return { status: 200, body: { ok: true, status: 'sent', dryRun: true } };
  }
  // Checked before storing: a sign-up nobody can confirm only clutters the list
  if (!env.RESEND_API_KEY && !dryRunWithoutKey) return fail(503, 'Email sending is not set up');

  const sql = neon(env.DATABASE_URL);
  const token = randomBytes(24).toString('base64url');
  const tokenHash = hashToken(token);
  let status: WaitlistStatus;
  try {
    // Whether this address confirmed before (for any gym), and whether it got a confirmation email just now
    const [address] = await sql`
      select coalesce(bool_or(confirmed_at is not null), false) as confirmed,
             coalesce(bool_or(confirm_sent_at > now() - make_interval(mins => ${RESEND_AFTER_MINUTES})), false) as recently_sent
      from waitlist_signups where email = ${signup.email}`;
    status = address.confirmed ? 'confirmed' : address.recently_sent ? 'recently-sent' : 'sent';
    const send = status === 'sent';
    // Signing up again for the same gym updates the name and the choice instead of counting twice. A new email gets a
    // new token (older links for this gym stop working); otherwise the token from the email already sent stays valid.
    await sql`
      insert into waitlist_signups (email, first_name, gym_name, city, gym_key, share_name, source, page, token_hash, confirmed_at)
      values (${signup.email}, ${signup.name}, ${signup.gym}, ${signup.city}, ${gymKey(signup.gym, signup.city)},
              ${signup.shareName}, ${signup.source || null}, ${signup.page || null}, ${tokenHash},
              case when ${status === 'confirmed'} then now() end)
      on conflict (email, gym_key) do update set
        first_name = excluded.first_name,
        share_name = excluded.share_name,
        updated_at = now(),
        confirmed_at = coalesce(waitlist_signups.confirmed_at, excluded.confirmed_at),
        token_hash = case when ${send} then excluded.token_hash else coalesce(waitlist_signups.token_hash, excluded.token_hash) end`;
  } catch (err) {
    console.error('[join-waitlist] Could not store the sign-up:', err);
    return fail(502, 'The sign-up could not be stored');
  }
  if (status !== 'sent') return { status: 200, body: { ok: true, status } };

  const email = confirmationEmail(signup, token, origin);
  if (!env.RESEND_API_KEY) {
    console.info(`\n[join-waitlist] RESEND_API_KEY is not set, so nothing was sent. The email to ${signup.email} would be:\n\n${email.text}\n`);
  } else {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(email),
      });
      if (!res.ok) {
        console.error(`[join-waitlist] Resend answered ${res.status}: ${await res.text()}`);
        return fail(502, 'The confirmation email could not be sent');
      }
    } catch (err) {
      console.error('[join-waitlist] Resend is unreachable:', err);
      return fail(502, 'The confirmation email could not be sent');
    }
  }

  // Only once the email is out: a failed send can be retried right away
  try {
    await sql`update waitlist_signups set confirm_sent_at = now() where token_hash = ${tokenHash}`;
  } catch (err) {
    // The email is out and the sign-up stored; only the limit on resending misses this one
    console.error('[join-waitlist] Could not note the sent email:', err);
  }
  return { status: 200, body: { ok: true, status: 'sent', dryRun: !env.RESEND_API_KEY || undefined } };
}

export async function POST(request: Request): Promise<Response> {
  const input: unknown = await request.json().catch(() => null);
  // Vercel only routes this project's own domains here, so the links point back to the site that served the form
  const { status, body } = await handleWaitlistSignup(input, process.env, { origin: new URL(request.url).origin });
  return Response.json(body, { status });
}
