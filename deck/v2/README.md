# Spottr pitch deck v2

Built from the pitch-deck meeting notes on top of the v1 deck (`deck/site/`, from branch `deck/first-draft`). Same design system; v2 adds `v2.css`.

- Open: `deck/v2/index.html` in a browser (arrow keys / click to move; the floor heat map on slide 7 animates 6am to close).
- PDF + PNG renders: `cd deck/scripts && npm i && node export-pdf-v2.mjs` → `deck/export/spottr-deck-v2.pdf`, `deck/qa/render-v2/`.
- New screenshots: `node screenshots-v2.mjs` with `npm run dev` running.

## Slide order (from the meeting)

| # | Slide | What changed vs v1 |
|---|---|---|
| 1 | Title | Old subtitle is now the title. Plain wordmark, dot removed (`site/assets/spottr-wordmark.svg`). Everyone listed as "Co-founder". |
| 2 | Hook | New. One stark statement on a dark slide. |
| 3 | Product summary | New. Catchy title + explanatory subtitle. |
| 4 | Opportunity | New. 81M US members, Whoop and Technogym growth, longevity trend. |
| 5 | Problem | Two-sided: members (tedious tracking) and gyms (no granular floor data). |
| 6 | Why now | Affordable vision (Gemini Flash), first movers, longevity, AI-as-a-service, "10–15 years" line. |
| 7 | Solution | Curated visuals: real squat replay + animated floor heat map (demo data). |
| 8 | How it works | Integration story: plug in our box, existing cameras, no gym IT. Real two-camera floor map. |
| 9 | Traction | Hackathon → built → week 1 of outreach → SF chain (8 gyms, 9th coming) from Nov 1. No build duration stated. |
| 10 | Market size | $2.2B TAM at 50% camera share; Bay Area → US → global ladder; Whoop / Technogym / EGYM as adjacent markets. |
| 11 | Business model | Gym subscription tiered by size per location + member freemium (AI trainer premium). CAC ≈ $0, data moat. |
| 12 | Competition | Manual vs automatic × own hardware vs existing infrastructure. EGYM, Technogym, Whoop, Hevy, Gravit, German startup. |
| 13 | Team | Group-photo placeholder, Berkeley, co-founder titles by default. |
| 14 | The ask | Template per program: connections, resources, network. |
| 15 | Closing | Back to title + contact. |
| A1–A7 | Appendix | Privacy & security, tech & architecture, market derivation (camera share, vision cost), competitor deep-dive, go-to-market, roadmap & identity linking, product gallery. |

## Open TODOs (yellow chips in the deck)

- Full names of Martin and Gard; real group photo; final CEO/CTO/CPO split once aligned with Gal (and add Gal if Gal joins).
- Chain name/logo (with permission); Howard's investor quote (with permission).
- Source the global gym count: $2.2B at 50% × $18K/yr implies ~245K gyms worldwide.
- Prices for the gym tiers, validated against gym size data.
- Name of the German competitor.
- Tailor the Ask slide per program.
- GDPR/CCPA framework after legal review.
- Real heat-map GIF from filmed footage (slide 7 currently uses the simulated demo gym).

## Things to double-check before sending

- **$2.2B definition changed.** v1 used $2.2B for US + Europe clubs (122,796) with no camera haircut. v2 uses it for global gyms at 50% camera share, as agreed in the meeting. Both can't be true with the same count; the A3 appendix shows the math.
- **Why-now cost claim.** The deck says cost per capability keeps falling (true as a trend), but Gemini Flash list prices step up on 2027-01-01. The footer says so.
- **Face recognition / locker-room cameras** are listed only as roadmap options with a legal-review flag. Today the product does no face recognition, and the privacy page says so.
- **How-it-works claims** (box, existing cameras, no gym IT) describe the target setup; the footer says live ingestion and the edge box are in development.
