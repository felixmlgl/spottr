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

/** Images always come from the live site: emails sent from a preview link there too, and previews need a Vercel login */
const SITE = 'https://tryspottr.app';

// The site's tokens (src/index.css). Email clients ignore stylesheets and web fonts, so everything is inline, and the
// serif falls back from Hoefler Text (Apple Mail; it pairs with the logo) to Georgia
const INK = '#0E1117';
// The night of the site's replay, and the background of og.png, which heads the email
const NIGHT = '#090B10';
const INK_2 = '#4B5262';
const INK_3 = '#636B7E';
const CANVAS = '#F2F4F8';
const LINE = '#D9DEE7';
const ACCENT_INK = '#2A5CDB';
const LIME = '#C7FF6A';
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "'Hoefler Text',Georgia,'Times New Roman',serif";

/**
 * The confirmation email, with its two links on `origin` (the site that served the form). `members` is how many other
 * members of the gym confirmed; like in the popup it's only mentioned from 3.
 */
export const confirmationEmail = (
  signup: Pick<WaitlistSignup, 'name' | 'email' | 'gym' | 'city'>,
  token: string,
  origin: string,
  members = 0,
) => {
  const confirmUrl = `${origin}/waitlist?confirm=${token}`;
  const leaveUrl = `${origin}/waitlist?leave=${token}`;
  const firstName = signup.name.split(' ')[0];
  const others = members >= 3 ? members : 0;
  const steps: [string, string][] = [
    ['You confirm.', "One tap on the button. Until then, your sign-up doesn't count."],
    ['We take the list to your gym.', `Once enough members of ${signup.gym} ask, we show them how many want Spottr.`],
    ['Spottr arrives.', "We email you once it's at your gym."],
  ];

  const text = [
    `Hi ${firstName},`,
    '',
    `you asked for Spottr at ${signup.gym}, ${signup.city}. Confirm your email so your sign-up counts:`,
    confirmUrl,
    ...(others ? ['', `You'd join ${others} members from ${signup.gym} who already confirmed.`] : []),
    '',
    'What happens next',
    ...steps.map(([title, body], i) => `${i + 1}. ${title} ${body}`),
    '',
    'Spottr counts your sets and reps from the cameras your gym already has. Nothing to wear, nothing to type, free for members.',
    '',
    "Didn't sign up? Ignore this email.",
    `Remove my sign-up: ${leaveUrl}`,
  ].join('\n');

  const p = (style: string, content: string) => `<p style="margin:0;font-family:${SANS};${style}">${content}</p>`;
  const divider = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:28px 0 0;border-bottom:1px solid ${LINE};font-size:0;line-height:0">&nbsp;</td></tr></table>`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Confirm your sign-up</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">One tap, and your sign-up counts for ${escapeHtml(signup.gym)}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${CANVAS}" style="background:${CANVAS}">
<tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
<tr><td bgcolor="${NIGHT}" style="background:${NIGHT};border-radius:24px 24px 0 0;font-size:0;line-height:0">
<!-- One cell for logo and image: two rows can show a hairline between them on phones -->
<div style="padding:28px 32px 0"><img src="${SITE}/brand/spottr-logo.png" width="112" alt="Spottr" style="display:block;border:0;width:112px;height:auto;color:#FFFFFF;font-family:${SANS};font-size:16px"></div>
<img src="${SITE}/og.png" width="560" alt="Your gym's cameras count every rep." style="display:block;border:0;width:100%;max-width:560px;height:auto;color:#FFFFFF;font-family:${SERIF};font-size:24px">
</td></tr>
<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:0 0 24px 24px;padding:32px">
<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${LIME};font-family:${SANS};font-size:13px;font-weight:600;color:${INK}">Waitlist</span>
<h1 style="margin:20px 0 0;font-family:${SERIF};font-size:32px;font-weight:400;line-height:1.15;letter-spacing:-0.01em;color:${INK}">One tap, and you count for ${escapeHtml(signup.gym)}.</h1>
${p(`margin-top:16px;font-size:16px;line-height:1.55;color:${INK_2}`, `Hi ${escapeHtml(firstName)}, you asked for Spottr at <strong style="color:${INK}">${escapeHtml(`${signup.gym}, ${signup.city}`)}</strong>. Confirm your email so your sign-up counts: confirmed sign-ups are the list we take to your gym.`)}
${others ? p(`margin-top:16px;font-size:16px;line-height:1.55;color:${INK}`, `You'd join <span style="background:${LIME};padding:0 4px;border-radius:4px;font-weight:600">${others} members</span> from ${escapeHtml(signup.gym)} who already confirmed.`) : ''}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px"><tr><td bgcolor="${ACCENT_INK}" style="background:${ACCENT_INK};border-radius:999px">
<a href="${confirmUrl}" style="display:inline-block;padding:14px 28px;border-radius:999px;font-family:${SANS};font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none">Confirm my sign-up</a>
</td></tr></table>
${p(`margin-top:16px;font-size:13px;line-height:1.5;color:${INK_3}`, `Button not working? Open <a href="${confirmUrl}" style="color:${ACCENT_INK};word-break:break-all">${confirmUrl}</a>`)}
${divider}
${p(`margin-top:24px;font-size:13px;font-weight:600;color:${INK_2}`, 'What happens next')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px">
${steps
  .map(
    ([title, body], i) => `<tr>
<td width="36" valign="top" style="padding:8px 0"><div style="width:24px;height:24px;border-radius:999px;background:${LIME};font-family:${SANS};font-size:13px;font-weight:600;line-height:24px;text-align:center;color:${INK}">${i + 1}</div></td>
<td valign="top" style="padding:8px 0;font-family:${SANS};font-size:15px;line-height:1.5;color:${INK_2}"><strong style="color:${INK}">${title}</strong> ${escapeHtml(body)}</td>
</tr>`,
  )
  .join('\n')}
</table>
${divider}
${p(`margin-top:24px;font-size:15px;line-height:1.55;color:${INK_2}`, `Spottr counts your sets and reps from the cameras your gym already has. Nothing to wear, nothing to type, free for members. <a href="${SITE}" style="color:${ACCENT_INK};font-weight:600;text-decoration:none">See how it works&nbsp;›</a>`)}
</td></tr>
<tr><td align="center" style="padding:24px 32px 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${INK_3}">
Didn't sign up? Ignore this email.<br>
<a href="${leaveUrl}" style="color:${INK_3};text-decoration:underline">Remove my sign-up</a> &middot; <a href="${SITE}" style="color:${INK_3};text-decoration:none">tryspottr.app</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return {
    from: FROM,
    to: [signup.email],
    reply_to: REPLY_TO,
    subject: `Confirm your sign-up: Spottr at ${signup.gym}`,
    text,
    html,
  };
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

  // Other members of this gym who confirmed, for the email to mention (from 3)
  let members = 0;
  try {
    const [gym] = await sql`
      select count(*)::int as members from waitlist_signups
      where gym_key = ${gymKey(signup.gym, signup.city)} and confirmed_at is not null`;
    members = gym.members;
  } catch (err) {
    // Only a nice-to-have: the email goes out without it
    console.error('[join-waitlist] Could not count the gym\'s members:', err);
  }
  const email = confirmationEmail(signup, token, origin, members);
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
