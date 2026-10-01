# Spottr onepager

Static one-page company website (Vite + Tailwind CSS v4, no backend, no data stored).
Self-contained: it does not depend on the app in the repo root or on `backend/`.

## Develop

```bash
cd onepager
npm install
npm run dev        # http://localhost:3100
npm run build      # -> onepager/dist
npm run preview    # http://localhost:4180
```

## Deploy to Vercel (own project, root directory = onepager)

```bash
npm i -g vercel                 # or: npx vercel ...
vercel login
cd onepager
vercel link --project spottr    # create/link project "spottr" (pick your scope)
vercel deploy --prod            # production deploy -> spottr.vercel.app if the name is free
```

If `spottr.vercel.app` is taken, Vercel assigns a variant (e.g. `spottr-xyz.vercel.app`). Then update the
absolute URLs in `index.html`: `canonical`, `og:url`, `og:image`, `twitter:image`.

Alternatively, in the Vercel dashboard: Import the GitHub repo, set **Root Directory** to `onepager`
(framework Vite is detected; settings are also pinned in `onepager/vercel.json`).

## Placeholders to fill (all marked `[TODO: …]` in `index.html`)

| Placeholder | Where |
|---|---|
| `[TODO: contact email]` | Header + hero + footer "Book a demo" (`mailto:`), footer contact line |
| `[TODO: Tally/Google Form link]` | Hero + footer "Get updates" |
| `[TODO: confirm with team]` | Privacy note under "How it works" (recorded clips today, on-site device is a goal) |
| `[TODO: hackathon date, what we placed or won, team size]` | Origin section |
| `[TODO: number of team members]` | Team intro |
| `[TODO: Name]`, `[TODO: Role]`, `[TODO: LinkedIn URL]` ×4 | Team cards |

Also confirm with the team before publishing:
- The hero/OG image shows a real lifter (P2) from the demo footage: get their consent for public use.
- One bystander the pose model missed (on the incline bench) was pixelated by hand in the web images.

## Files

- `index.html`: all content and meta tags
- `src/main.css`: Tailwind theme (brand tokens) and components
- `src/main.js`: fade-in on scroll (disabled with `prefers-reduced-motion`)
- `assets/`: images (see `assets/README.md`)
- `public/`: favicon, apple-touch-icon, `og-image.jpg` (1200×630, rendered from `assets/og-image-source.html`)
