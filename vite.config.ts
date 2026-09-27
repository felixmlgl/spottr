import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function apiPlugin(): Plugin {
  return {
    name: 'spottr-api-routes',
    configureServer(server) {
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

            const prompt = `You are Spottr's AI Strength Coach ("Your gym's cameras count for you."). Generate an encouraging, 2-3 sentence personalized workout recap for a gym member based on edge camera-verified repetitions:
- Exercises: ${exerciseStr}
- Total Reps: ${summary?.total_reps ?? 0}
- Active Duration: ${summary?.total_duration_s ?? 0} seconds
Tone: Athletic, motivating, concise (like Whoop / Strava). Focus on rep completion, pacing, and movement control. No markdown headers or bullet points.`;

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

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiPlugin()],
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
