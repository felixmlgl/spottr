/**
 * POST /api/join-waitlist (Vercel Function): a gym member joins the waitlist for their gym, from the site's popup.
 * Stores the sign-up in Postgres at Neon (table and per-gym view in db/waitlist.sql).
 *
 * Environment variables (set by the Neon integration on Vercel; .env.local for `npm run dev`):
 * - DATABASE_URL  required to store; locally, use the Neon `dev` branch, not production's
 *
 * In local dev, vite.config.ts serves the same handler; without DATABASE_URL it prints the sign-up instead.
 * Only npm imports: Vercel runs this file on its own, outside the Vite build.
 */

import { neon } from '@neondatabase/serverless';

/** Accepted fields and their maximum length */
const FIELDS = { gym: 150, city: 100, name: 100, email: 200, source: 32, page: 200 };
type Field = keyof typeof FIELDS;
const REQUIRED: Field[] = ['gym', 'city', 'name', 'email'];

export interface WaitlistSignup extends Record<Field, string> {
  /** The member agreed that we may tell their gym their first name */
  shareName: boolean;
}

export interface WaitlistEnv {
  DATABASE_URL?: string;
}

export interface WaitlistResult {
  status: number;
  body: { ok: true; dryRun?: boolean } | { ok: false; error: string };
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

/** Checks the form and stores it. With `dryRunWithoutDatabase` (local dev), a missing DATABASE_URL prints it instead. */
export async function handleWaitlistSignup(
  input: unknown,
  env: WaitlistEnv,
  { dryRunWithoutDatabase = false } = {},
): Promise<WaitlistResult> {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  // Bots fill in every field, including the one people never see: pretend it worked
  if (typeof raw.website === 'string' && raw.website.trim()) return { status: 200, body: { ok: true } };

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
    if (!dryRunWithoutDatabase) return fail(503, 'The waitlist is not set up');
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
    return { status: 200, body: { ok: true, dryRun: true } };
  }

  try {
    const sql = neon(env.DATABASE_URL);
    // Signing up again for the same gym updates the name and the choice instead of counting twice
    await sql`
      insert into waitlist_signups (email, first_name, gym_name, city, gym_key, share_name, source, page)
      values (${signup.email}, ${signup.name}, ${signup.gym}, ${signup.city}, ${gymKey(signup.gym, signup.city)},
              ${signup.shareName}, ${signup.source || null}, ${signup.page || null})
      on conflict (email, gym_key) do update
        set first_name = excluded.first_name, share_name = excluded.share_name, updated_at = now()`;
  } catch (err) {
    console.error('[join-waitlist] Could not store the sign-up:', err);
    return fail(502, 'The sign-up could not be stored');
  }
  return { status: 200, body: { ok: true } };
}

export async function POST(request: Request): Promise<Response> {
  const input: unknown = await request.json().catch(() => null);
  const { status, body } = await handleWaitlistSignup(input, process.env);
  return Response.json(body, { status });
}
