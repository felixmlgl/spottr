/**
 * POST /api/join-waitlist (Vercel Function): a gym member joins the waitlist for their gym, from the site's popup.
 *
 * So far this only checks the sign-up. Storing it (a list per gym, so we can show a gym how many of its members asked)
 * is the next step; until then the live site answers 503 and the popup offers to send the sign-up by email instead.
 * In local dev, vite.config.ts serves the same handler and prints the sign-up to the terminal.
 * No imports on purpose: Vercel runs this file on its own.
 */

/** Accepted fields and their maximum length */
const FIELDS = { gym: 150, city: 100, name: 100, email: 200, page: 200 };
type Field = keyof typeof FIELDS;
const REQUIRED: Field[] = ['gym', 'city', 'name', 'email'];

export interface WaitlistSignup extends Record<Field, string> {
  /** The member agreed that we may tell their gym their first name */
  shareName: boolean;
}

export interface WaitlistResult {
  status: number;
  body: { ok: true; dryRun?: boolean } | { ok: false; error: string };
}

const fail = (status: number, error: string): WaitlistResult => ({ status, body: { ok: false, error } });

/** Checks the form. With `dryRun` (local dev), prints the sign-up instead of storing it. */
export async function handleWaitlistSignup(input: unknown, { dryRun = false } = {}): Promise<WaitlistResult> {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  // Bots fill in every field, including the one people never see: pretend it worked
  if (typeof raw.website === 'string' && raw.website.trim()) return { status: 200, body: { ok: true } };

  const signup = { shareName: raw.shareName === true } as WaitlistSignup;
  for (const [key, max] of Object.entries(FIELDS) as [Field, number][]) {
    const given = raw[key];
    signup[key] = typeof given === 'string' ? given.trim().slice(0, max).replace(/\s+/g, ' ') : '';
  }
  const missing = REQUIRED.filter((key) => !signup[key]);
  if (missing.length) return fail(400, `Missing: ${missing.join(', ')}`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signup.email)) return fail(400, 'Invalid email');

  if (!dryRun) return fail(503, 'The waitlist is not stored yet');
  console.info(
    [
      '',
      '[join-waitlist] Not stored yet. The sign-up was:',
      '',
      `Gym: ${signup.gym}, ${signup.city}`,
      `Name: ${signup.name}${signup.shareName ? ' (may be shared with the gym)' : ''}`,
      `Email: ${signup.email}`,
      `Sent from ${signup.page || 'the site'}`,
      '',
    ].join('\n'),
  );
  return { status: 200, body: { ok: true, dryRun: true } };
}

export async function POST(request: Request): Promise<Response> {
  const input: unknown = await request.json().catch(() => null);
  const { status, body } = await handleWaitlistSignup(input);
  return Response.json(body, { status });
}
