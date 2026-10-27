/**
 * GET /api/waitlist-gyms (Vercel Function): the gyms the waitlist popup suggests while a member types, with the number
 * of confirmed members from 3 (the `waitlist_suggestions` view in db/waitlist.sql decides what's public).
 * The whole list in one response, filtered in the browser; Vercel's CDN keeps it for 5 minutes, so the database is
 * asked at most that often however many people open the popup.
 *
 * Environment variables: DATABASE_URL (see api/join-waitlist.ts). vite.config.ts serves the same handler in dev.
 * Only npm imports: Vercel runs this file on its own, outside the Vite build.
 */

import { neon } from '@neondatabase/serverless';

export interface WaitlistGym {
  gym: string;
  city: string;
  /** Confirmed members; left out below 3 */
  members?: number;
}

export interface WaitlistGymsEnv {
  DATABASE_URL?: string;
}

export interface WaitlistGymsResult {
  status: number;
  body: { ok: true; gyms: WaitlistGym[] } | { ok: false; error: string };
}

export async function handleWaitlistGyms(env: WaitlistGymsEnv): Promise<WaitlistGymsResult> {
  // Without a database (local dev) there's simply nothing to suggest
  if (!env.DATABASE_URL) return { status: 200, body: { ok: true, gyms: [] } };
  try {
    const sql = neon(env.DATABASE_URL);
    const rows = await sql`
      select gym, city, members from waitlist_suggestions
      order by members desc nulls last, gym limit 2000`;
    const gyms = rows.map((r) => ({ gym: r.gym, city: r.city, ...(r.members ? { members: r.members } : {}) }));
    return { status: 200, body: { ok: true, gyms } };
  } catch (err) {
    console.error('[waitlist-gyms] Could not load the gyms:', err);
    return { status: 502, body: { ok: false, error: 'The gyms could not be loaded' } };
  }
}

export async function GET(): Promise<Response> {
  const { status, body } = await handleWaitlistGyms(process.env);
  const headers: Record<string, string> = status === 200 ? { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } : {};
  return Response.json(body, { status, headers });
}
