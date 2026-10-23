import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { handleDemoRequest } from './api/request-demo.ts';
import { handleWaitlistSignup } from './api/join-waitlist.ts';

/** Dev middleware for a JSON POST route served by one of the api/ handlers. */
function postRoute(handle: (input: unknown) => Promise<{ status: number; body: unknown }>) {
  return (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      let input: unknown = null;
      try {
        input = JSON.parse(body || '{}');
      } catch {
        // Handled as missing fields
      }
      const result = await handle(input);
      res.statusCode = result.status;
      res.end(JSON.stringify(result.body));
    });
  };
}

function apiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'spottr-api-routes',
    configureServer(server) {
      // Same handlers as the Vercel Functions; without RESEND_API_KEY the demo request is printed to this terminal instead
      server.middlewares.use('/api/request-demo', postRoute((input) => handleDemoRequest(input, env, { dryRunWithoutKey: true })));
      // The waitlist isn't stored yet: sign-ups are printed here
      server.middlewares.use('/api/join-waitlist', postRoute((input) => handleWaitlistSignup(input, { dryRun: true })));

      server.middlewares.use('/api/recap', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { summary } = JSON.parse(body || '{}');
            const apiKey = process.env.GEMINI_API_KEY;

            if (!apiKey) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ recap: null, fallback: true }));
              return;
            }

            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({
              apiKey: process.env.GEMINI_API_KEY,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                },
              },
            });

            const exerciseStr =
              summary?.sessions
                ?.map((s: { rep_count: number; exercise_name: string }) => `${s.rep_count} reps of ${s.exercise_name}`)
                .join(', ') || 'General gym session';

            const prompt = `You are Spottr's AI Strength Coach ("Your gym's cameras count for you."). Generate an encouraging one-sentence workout recap for a gym member based on camera-counted repetitions:
- Exercises: ${exerciseStr}
- Total Reps: ${summary?.total_reps ?? 0}
- Active Duration: ${summary?.total_duration_s ?? 0} seconds
Tone: Athletic, motivating, concise (like Whoop / Strava). The app already shows total reps, sets and time next to the recap, so don't repeat those totals. Only refer to the exercises, reps and duration above. Do not comment on form, depth, tempo or technique: Spottr does not measure those. No markdown headers or bullet points.`;

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
            });

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ recap: response.text }));
          } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown server error';
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ recap: null, error: errorMessage }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Every variable from .env / .env.local, not only VITE_*: the dev API routes run on the server
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), apiPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
