/**
 * POST /api/waitlist-link (Vercel Function): what the links in the waitlist's confirmation email do, once the popup
 * has opened them ("/waitlist?confirm=…" and "?leave=…", see src/waitlist/). Body: { action, token }.
 * - confirm  confirms every gym the token's email signed up for
 * - remove   deletes the token's sign-up (that one gym)
 *
 * The email links open the site rather than this endpoint, and the popup posts here: mail scanners that open every
 * link to check it don't run the page's script, so they can't confirm or remove anything on their own.
 *
 * Environment variables: DATABASE_URL (see api/join-waitlist.ts). vite.config.ts serves the same handler in dev.
 * Only npm and Node imports: Vercel runs this file on its own, outside the Vite build.
 */

import { createHash } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

export interface WaitlistLinkEnv {
  DATABASE_URL?: string;
}

export interface WaitlistLinkResult {
  status: number;
  body: { ok: true; gym: string; city: string; name: string } | { ok: false; error: string };
}

const fail = (status: number, error: string): WaitlistLinkResult => ({ status, body: { ok: false, error } });

/** Same as in api/join-waitlist.ts */
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function handleWaitlistLink(input: unknown, env: WaitlistLinkEnv): Promise<WaitlistLinkResult> {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const { action, token } = raw;
  if (action !== 'confirm' && action !== 'remove') return fail(400, 'Unknown action');
  if (typeof token !== 'string' || !/^[\w-]{20,64}$/.test(token)) return fail(400, 'Invalid link');
  if (!env.DATABASE_URL) return fail(503, 'The waitlist is not set up');

  const sql = neon(env.DATABASE_URL);
  try {
    const rows =
      action === 'confirm'
        ? await sql`
            update waitlist_signups set confirmed_at = coalesce(confirmed_at, now())
            where email = (select email from waitlist_signups where token_hash = ${hashToken(token)})
            returning token_hash = ${hashToken(token)} as linked, gym_name, city, first_name`
        : await sql`
            delete from waitlist_signups where token_hash = ${hashToken(token)}
            returning true as linked, gym_name, city, first_name`;
    // The sign-up the link belongs to: its gym is the one the popup names
    const row = rows.find((r) => r.linked);
    if (!row) return fail(404, 'This link is no longer valid');
    return { status: 200, body: { ok: true, gym: row.gym_name, city: row.city, name: row.first_name } };
  } catch (err) {
    console.error(`[waitlist-link] Could not ${action}:`, err);
    return fail(502, 'Something went wrong');
  }
}

export async function POST(request: Request): Promise<Response> {
  const input: unknown = await request.json().catch(() => null);
  const { status, body } = await handleWaitlistLink(input, process.env);
  return Response.json(body, { status });
}
