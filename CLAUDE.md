# Spottr

Automatic workout tracking from existing gym cameras.

- `/`: welcome page (looping gym clips, "Try our demo" button)
- `/demo`: member app (old `/?clip=…&person=…` links are forwarded here)
- `/gyms`: gym operator demo (`/gyms/overview`, `/floor`, `/world-map`, `/members`, `/privacy`, `/pilot`)

Stack: Vite + React + TypeScript + Tailwind v4. Deployed on Vercel (tryspottr.app) from `main`.
Design: Apple-style, light, accent `#34C759`.

## Rules

- Never modify anything in `backend/` (owned by teammates). Reading it is fine.
- Always work on a new branch. Push the branch, never merge into `main` (`main` deploys live).
- Before every push: `npm run build` and `npm run lint` must pass.
- Never commit `.env` files, API keys or secrets.
- Never claim more on privacy pages than the code actually does.
- Keep commits small with clear messages.

## Commands

- `npm run dev`: dev server on port 3000
- `npm run build`: production build to `dist/`
- `npm run lint`: type check (`tsc --noEmit`)

## Project structure

- `src/main.tsx`: entry point. Picks the page by URL (`/`, `/gyms/*`, everything else = member app) and renders Vercel Analytics.
- `src/router.tsx`: small pathname router (`usePathname`, `navigate`, `Link`). No router library.
- `src/Welcome.tsx`: welcome page at `/`.
- `src/App.tsx`, `src/components/`: member app (tabs, session replay, body map, weekly plan, settings; `components/intro/` is the demo intro).
- `src/gyms/`: gym operator demo (`GymsApp.tsx`, `GymNav.tsx`, `pages/`, `components/`). Lazy-loaded.
- `src/gyms/world/`: `/gyms/world-map` (two-camera shared floor map + pilot setup). Renders world-service output only: live API via `VITE_WORLD_API_URL`, else `public/world-demo/`.
- `src/services/`: app logic, e.g. `pipelineAdapter.ts` (loads the vision pipeline output), `privacyBlur.ts` (pixelates bystanders in the replay), `rawOverlay.ts` (draws the raw pose overlay), rep counting, recovery, plan and settings.
- `src/mocks/`: demo data. `mocks/gym/` is the seeded simulation behind `/gyms` (fictional "Iron District Fitness"); `memberData.ts`, `scenarios.ts`, `pipeline/` feed the member app.
- `src/hooks/`, `src/data/`, `src/types/schema.ts`: shared hooks, exercise/muscle data, shared types.
- `public/`: static files served as-is: `demo-data/` (pipeline output per clip: `session.json`, `overlay.json`, thumbnails), `videosCorrect/` (demo clips), `welcome/` (welcome-page clips and logos).
- `backend/`: Python vision pipeline (pose tracking, rep counting, exercise labels). Teammates' code; do not touch.
- `world-service/`: separate Python service for multi-camera shared-world tracking (calibration, sync, cross-camera identities, world state, FastAPI + static export). Docs in `world-service/docs/`. `models/` and `out/` are gitignored.
- `public/world-demo/`: static export of the world-service API for the world map (regenerate with `python -m spottr_world.export`).
- `docs/media/`: README images and videos.
- `vite.config.ts`: Vite config, plus the dev-only `/api/recap` route (Gemini). It doesn't exist on Vercel; the app falls back to a local recap.
- `vercel.json`: install/build settings and the SPA rewrite to `index.html`.
