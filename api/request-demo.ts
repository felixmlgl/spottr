/**
 * POST /api/request-demo (Vercel Function): emails a demo request from the site's popup to the team, through Resend.
 *
 * Environment variables (Vercel project settings, or .env.local for `npm run dev`):
 * - RESEND_API_KEY     required to send; from resend.com
 * - DEMO_REQUEST_TO    inbox for the requests, default info@tryspottr.app
 * - DEMO_REQUEST_FROM  sender, default "Spottr <demo@tryspottr.app>" (tryspottr.app is verified in Resend)
 *
 * In local dev, vite.config.ts serves the same handler; without a key it prints the email instead of sending it.
 * No imports on purpose: Vercel runs this file on its own.
 */

/** Accepted fields and their maximum length */
const FIELDS = { name: 100, email: 200, gym: 150, city: 100, locations: 20, size: 120, notes: 2000, page: 200 };
type Field = keyof typeof FIELDS;
const REQUIRED: Field[] = ['name', 'email', 'gym', 'city', 'locations', 'size'];

export interface DemoRequestEnv {
  RESEND_API_KEY?: string;
  DEMO_REQUEST_TO?: string;
  DEMO_REQUEST_FROM?: string;
}

export interface DemoRequestResult {
  status: number;
  body: { ok: true; dryRun?: boolean } | { ok: false; error: string };
}

const fail = (status: number, error: string): DemoRequestResult => ({ status, body: { ok: false, error } });

/** Checks the form, builds the email and sends it. With `dryRunWithoutKey` (local dev), a missing key prints it instead. */
export async function handleDemoRequest(
  input: unknown,
  env: DemoRequestEnv,
  { dryRunWithoutKey = false } = {},
): Promise<DemoRequestResult> {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  // Bots fill in every field, including the one people never see: pretend it worked
  if (typeof raw.website === 'string' && raw.website.trim()) return { status: 200, body: { ok: true } };

  const req = {} as Record<Field, string>;
  for (const [key, max] of Object.entries(FIELDS) as [Field, number][]) {
    const given = raw[key];
    const value = typeof given === 'string' ? given.trim().slice(0, max) : '';
    // Only the notes may span several lines
    req[key] = key === 'notes' ? value : value.replace(/\s+/g, ' ');
  }
  const missing = REQUIRED.filter((key) => !req[key]);
  if (missing.length) return fail(400, `Missing: ${missing.join(', ')}`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.email)) return fail(400, 'Invalid email');

  const firstName = req.name.split(' ')[0];
  const email = {
    from: env.DEMO_REQUEST_FROM || 'Spottr <demo@tryspottr.app>',
    to: [env.DEMO_REQUEST_TO || 'info@tryspottr.app'],
    reply_to: req.email,
    subject: `Demo request: ${req.gym}, ${req.city}`,
    text: [
      'New demo request from tryspottr.app',
      '',
      `Name: ${req.name}`,
      `Email: ${req.email}`,
      `Gym: ${req.gym}`,
      `City: ${req.city}`,
      `Locations: ${req.locations}`,
      `Gym size: ${req.size}`,
      ...(req.notes ? ['', 'Notes:', req.notes] : []),
      '',
      `Sent from ${req.page || 'the site'}. Reply to this email to answer ${firstName} directly.`,
    ].join('\n'),
  };

  if (!env.RESEND_API_KEY) {
    if (!dryRunWithoutKey) return fail(503, 'Email sending is not set up');
    console.info(`\n[request-demo] RESEND_API_KEY is not set, so nothing was sent. The email would be:\n\n${email.text}\n`);
    return { status: 200, body: { ok: true, dryRun: true } };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(email),
    });
    if (!res.ok) {
      console.error(`[request-demo] Resend answered ${res.status}: ${await res.text()}`);
      return fail(502, 'The email could not be sent');
    }
  } catch (err) {
    console.error('[request-demo] Resend is unreachable:', err);
    return fail(502, 'The email could not be sent');
  }
  return { status: 200, body: { ok: true } };
}

export async function POST(request: Request): Promise<Response> {
  const input: unknown = await request.json().catch(() => null);
  const { status, body } = await handleDemoRequest(input, process.env);
  return Response.json(body, { status });
}
