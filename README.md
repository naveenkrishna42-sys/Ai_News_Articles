# TIVRA News — fully automated news website

**TIVRA** = **T**rusted **I**nsights, **V**erified **R**eports & **A**lerts
(*tīvra* / तीव्र — Sanskrit for "swift"). A static news site that writes,
publishes, and cleans up after itself. No server, no database, no manual
steps.

## How the automation works

```
GitHub Actions (.github/workflows/auto-news.yml) — every 6 hours:
  1. FETCH    ~29 Google News RSS feeds (config/news-config.json)
  2. FILTER   skip everything already published (data/published-registry.json
              + fuzzy same-story matching across categories)
  3. WRITE    human-style 500+ word articles via the AI provider pool
              (Groq → Gemini → OpenRouter → DeepSeek, automatic failover)
              + copyright-free hero image (Pexels → Pixabay → fallback)
  4. SPECIALS daily horoscopes (12 signs), daily AI Analysis, weekly feature
  5. CLEANUP  delete articles older than 30 days, enforce 1000/category
              and 12,000 total caps, prune the registry
  6. PUSH     commit to this repo → Cloudflare rebuilds the live site (~1 min)
```

Everything is tunable in **`config/news-config.json`** — articles per run,
daily cap, retention days, feeds/categories, providers/models, featured
homepage categories. Editing that file is the only "maintenance" this
system ever needs.

## One-time setup: add your API keys as GitHub Secrets

GitHub repo → **Settings → Secrets and variables → Actions → New repository
secret**. Add each of these (any missing one is skipped automatically):

| Secret name | Get it from | Needed? |
|---|---|---|
| `DEEPSEEK_API_KEY` | platform.deepseek.com | recommended (paid, cheap, reliable) |
| `GROQ_API_KEY` | console.groq.com | recommended (free) |
| `GEMINI_API_KEY` | aistudio.google.com/apikey | optional (free) |
| `OPENROUTER_API_KEY` | openrouter.ai/keys | optional |
| `PEXELS_API_KEY` | pexels.com/api | recommended (free, images) |
| `PIXABAY_API_KEY` | pixabay.com/api/docs | optional (image backup) |
| `YOUTUBE_API_KEY` | console.cloud.google.com | optional (video embeds) |
| `ADSENSE_PUBLISHER_ID` | adsense.google.com | later, after approval |

At least ONE AI key + `PEXELS_API_KEY` is enough to run.

## Run it manually (single click)

GitHub → **Actions** → **TIVRA auto news** → **Run workflow**.
Optionally type a small per-category number (e.g. `1`) for a test run.

## Change the schedule

Edit the `cron:` line in `.github/workflows/auto-news.yml`
(`"0 */6 * * *"` = every 6 hours; times are UTC, IST = UTC+5:30).

## Change models or providers (when one gets decommissioned)

Edit the `providers` block in `config/news-config.json` — each entry is just
`baseUrl` + `model` + the name of the secret holding its key. Any
OpenAI-compatible provider works. Swap a model name, commit, done.

## Run locally (optional)

```
node scripts/auto-news.mjs --dry-run              # see what it would write
npm run news:test                                 # tiny real run (needs env keys)
node scripts/auto-news.mjs --per-category 2       # custom volume
npm run build                                     # rebuild /public
```

Keys come from environment variables — e.g.
`node --env-file=path/to/.env scripts/auto-news.mjs`.

## How the site itself works

- `scripts/auto-news.mjs` writes self-contained article pages into
  `/articles/` (filename = `YYYY-MM-DD-slug.html` = the URL).
- On every push, Cloudflare runs `npm run build`
  (`scripts/build-index.mjs`), which regenerates `/public`: homepage feed
  (`articles.json`), monthly archive JSONs, month-split sitemaps + index.
- `index.html` + `script.js` render the breaking ticker, auto-rotating hero
  slider, auto-scrolling category rails, and the searchable latest grid —
  all from `articles.json`, no backend.
- `category.html` (per-category pages), `archive.html` (browse by month),
  `404.html` (removed/old links land here, wired via `wrangler.jsonc`
  `not_found_handling`), `related.js` ("Also read" box on article pages).
- Branding: `logo.svg` (masthead, click → home) and `favicon.svg`.

## Cloudflare settings (already connected)

- Build command: `npm run build` · Deploy: `npx wrangler deploy` (uses
  `wrangler.jsonc` → serves `/public`, 404s go to `404.html`).
- Live at: https://ainewsss.naveenkrishna42.workers.dev
- Optional: set `SITE_URL` env var in Cloudflare build settings to your
  custom domain so sitemap URLs are absolute-correct (falls back to
  `config/news-config.json` → `site.url`).

## Monetization checklist (when ready)

1. Buy a domain (~₹800/yr) and attach it in Cloudflare (Custom Domains).
2. Update `site.url` in `config/news-config.json` + `SITE_URL` in Cloudflare.
3. Apply for AdSense; once approved put your publisher ID in
   `ads.txt`, GitHub Secret `ADSENSE_PUBLISHER_ID` (new articles pick it up
   automatically), and `config/news-config.json` → `adsense`.
4. All required policy pages already exist: About, Contact, Privacy, Terms,
   Disclaimer, Editorial Policy, Cookie Policy, DMCA.

## Safety properties

- A failed story is skipped and retried next run — a run never dies halfway.
- A provider that rate-limits goes on cooldown; the pool rotates on.
- No AI keys at all → the workflow exits cleanly (site untouched).
- The registry remembers 90 days of published stories — longer than the
  30-day article retention — so deleted stories are never re-published.
- Old-article deletion keeps the deployment far below Cloudflare's
  20,000-file limit (30-day retention + 12,000-file safety cap).
