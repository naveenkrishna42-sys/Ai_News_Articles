# TIVRA News — fully automated news website

**TIVRA** = **T**rusted **I**nsights, **V**erified **R**eports & **A**lerts
(*tīvra* / तीव्र — Sanskrit for "swift"). A static news site that writes,
publishes, and cleans up after itself. No server, no database, no manual
steps for the core news pipeline.

This README covers two things: (1) how to start/operate the site as it runs
today, and (2) what each part of the project actually does, so you don't
have to re-read the code to remember. For the full multi-phase build plan
(video pipeline, on-demand comparisons, SEO checklist) see
**`BUILD_BLUEPRINT.md`** — this README is about what's *already built and
running*; that file is about what's *planned next*.

---

## Quick start — one-time setup

1. **Add your API keys as GitHub Secrets.** GitHub repo → **Settings →
   Secrets and variables → Actions → New repository secret**. Add whichever
   of these you have (any missing one is skipped automatically, nothing
   crashes):

   | Secret name | Get it from | Needed? |
   |---|---|---|
   | `DEEPSEEK_API_KEY` | platform.deepseek.com | recommended (paid, cheap, reliable) |
   | `GROQ_API_KEY` | console.groq.com | recommended (free) |
   | `GEMINI_API_KEY` | aistudio.google.com/apikey | optional (free) |
   | `OPENROUTER_API_KEY` | openrouter.ai/keys | optional |
   | `PEXELS_API_KEY` | pexels.com/api | recommended (free, images) |
   | `PIXABAY_API_KEY` | pixabay.com/api/docs | optional (image backup) |
   | `UNSPLASH_ACCESS_KEY` | unsplash.com/developers | optional (image backup, gadget photos) |
   | `YOUTUBE_API_KEY` | console.cloud.google.com | optional (video embeds in articles) |
   | `ADSENSE_PUBLISHER_ID` | adsense.google.com | later, once AdSense-approved |
   | `ADSENSE_AD_SLOT` | adsense.google.com | later, once AdSense-approved |

   **At least one AI key + `PEXELS_API_KEY` is enough to run.** Wikimedia
   Commons and Openverse (used for gadget photos) need no key at all —
   they're free and keyless by design.

2. That's it — the schedule is already wired up (see below). No server to
   deploy, no database to create.

## Running it

**It already runs itself.** GitHub Actions (`.github/workflows/auto-news.yml`)
fires every 2 hours, writes new articles, self-heals broken images, rebuilds
the site, and pushes — Cloudflare picks up the push and redeploys
automatically (~1 minute). Your PC does not need to be on.

**Run it manually / early:** GitHub → **Actions** → **TIVRA auto news** →
**Run workflow**. Optionally set a small per-category number for a cheap
test run.

**Run it locally** (useful for testing changes before they hit the live
schedule):
```
node scripts/auto-news.mjs --dry-run              # see what it WOULD write, no AI calls
node scripts/auto-news.mjs --per-category 1        # tiny real run (needs env keys)
node scripts/auto-news.mjs --categories "Gadget Comparisons" --per-category 1
npm run build                                       # rebuild /public locally
```
Keys come from environment variables locally, e.g.
`node --env-file=path/to/.env scripts/auto-news.mjs`.

**Change the schedule:** edit the `cron:` line in
`.github/workflows/auto-news.yml` (currently `"0 */2 * * *"` = every 2
hours; cron times are UTC, IST = UTC+5:30).

---

## What gets published, and how to turn any of it on/off

Every category — old and new — is controlled entirely from
**`config/news-config.json`**. Nothing about turning a category on or off
requires touching code.

### The original news categories (unchanged)
~29 RSS-fed categories (Breaking News, India, World, Business, Sports,
Entertainment, Technology, Religion, city editions, etc.), each rewritten
from Google News RSS via the AI provider pool. Volume per run is
`volume.perCategoryPerRun` (currently 2/category/run). Plus daily specials:
12 zodiac horoscopes, a couple of "Analysis" pieces on the day's biggest
story, and one weekly long-form feature.

### The three new categories
| Category | What it is | Cap | How to disable |
|---|---|---|---|
| **Gadget Comparisons** | Picks up a phone-launch headline, has the AI choose a realistic rival device, and writes a structured head-to-head with a spec table | 3/day | delete its entry from `newCategoryVolume` (or set to `0`) — no crash, it just stops |
| **Sacred Places** | Evergreen temple/heritage pieces — history, significance, practical visiting info — not news-of-the-day | 3/day | same |
| **AI Tips & Tools** | Practical how-to pieces triggered off AI tool/feature news — concrete steps, not hype | 3/day | same |

Unlike every other category (capped **per run**), these three are capped
**per day** via the `newCategoryVolume` block in the config — because the
site runs 12 times a day but you asked for exactly 3 of each, not 3 × 12.
That counter reuses the same publish-registry the rest of the site already
tracks, so there's no separate bookkeeping to get out of sync.

To fully remove a category: delete its entry from `config.feeds`, from
`config.newCategoryVolume` (for the three new ones), and optionally from
`categoryPriority`/`featuredCategories` for cleanliness (harmless to leave
behind — both are filtered against what's actually present). One config
edit, no code changes, no redeploy of anything else.

### Why gadget comparisons work differently under the hood
Every other category is "one RSS headline → one AI rewrite." There's no RSS
feed that hands you "compare iPhone 16 vs Galaxy S25" as a single headline —
so for Gadget Comparisons, the AI is given ONE device from a headline and
asked to pick a realistic rival itself (e.g. a flagship gets compared
against the obvious flagship competitor). That part is fine to leave to the
model's general knowledge. **Individual spec values are not** — see below.

### The rule that protects the site from itself
Every gadget/comparison prompt (`scripts/lib/gadget-prompts.mjs`) tells the
model, explicitly and more than once: if you are not genuinely confident of
a spec value, output `null` — never a plausible-sounding guess. This isn't
a style choice. A published table of confidently-wrong specs (a made-up
battery size, an invented price) is exactly the kind of inaccurate content
that puts a monetized AdSense site at risk. A `null` renders as a clean
"—" in the table; nothing is ever silently guessed. The verdict is required
to actually commit to a recommendation too — "both are great" is explicitly
banned in the prompt, because it has no reader value and reads as filler.

---

## Where device photos come from (and the copyright reasoning)

Manufacturer press photos are copyrighted — scraping them off a phone
brand's website would be real infringement risk on a monetized site, so
this pipeline deliberately doesn't do that. Instead:

**Specs are facts, and facts aren't copyrightable** — the pipeline states
specifications freely (that's the whole comparison table), while never
reproducing another outlet's review prose.

**Photos** are resolved through a cascade, in this order, all copyright-safe:
1. **Manual override** — drop your own (rights-cleared) photo in
   `assets/devices/{device-slug}/` and it always wins over everything below.
   See `assets/devices/README.md` for the exact format.
2. **Wikimedia Commons** — real device photos, CC-licensed, no API key needed.
3. **Openverse** — ~800M CC-licensed items, no API key needed.
4. **Unsplash** — needs `UNSPLASH_ACCESS_KEY`; generic high-quality tech
   photos, not usually the exact device.
5. **Pexels → Pixabay** — the original site-wide fallback, generic stock.

Every photo from steps 2–4 carries a real, clickable attribution line under
the image (`Photo: {author} / {provider} ({license})`) — this is what makes
using someone's CC-licensed work actually compliant, not just convenient.

---

## Project map — what each file does

```
config/news-config.json      Single source of truth: feeds, volume, caps,
                              providers, fallback images. Edit this, not code,
                              to change what publishes.

scripts/auto-news.mjs        The main pipeline. Runs every 2 hours:
                              fetch feeds → dedupe → write articles (AI) →
                              specials (horoscopes/analysis/feature) →
                              cleanup (retention + caps) → save registry.

scripts/lib/
  providers.mjs               AI provider pool + failover (Groq → Gemini →
                               OpenRouter → DeepSeek) and JSON extraction
                               from model output.
  feeds.mjs                   RSS fetch + dedup/fuzzy-matching helpers.
  images.mjs                  Original general-purpose image cascade
                               (Pexels → Pixabay → category fallback) plus
                               Wikipedia portrait lookup for famous people.
  template.mjs                Renders every article page (shared masthead/
                               logo/nav/footer for the whole site). Also
                               exports renderComparisonTable() (the gadget
                               spec table) and buildHeroCredit() (handles
                               both old plain-string and new structured
                               image credits without breaking old articles).
  gadget-prompts.mjs           The three gadget/niche prompt builders:
                               comparison, ranking/listicle, and the temple/
                               AI-tips prompt variants (derived from the
                               site's main prompt via string substitution,
                               so tone/rules stay consistent).
  images/
    index.mjs                  Gadget-specific image cascade orchestrator:
                                manual → Wikimedia → Openverse → Unsplash →
                                query-degradation retry → generic fallback.
    wikimedia.mjs, openverse.mjs, unsplash.mjs, manual.mjs
                                Individual image provider modules, each
                                returns the same {url,width,height,license,
                                author,sourceUrl,provider} shape or null.

scripts/build-index.mjs      Regenerates /public from /articles on every
                              push: homepage feed (articles.json), monthly
                              archive JSONs, sitemaps, static file copy
                              (including assets/devices/ manual photos).
scripts/reimage.mjs          Self-healing pass: fixes expired Pixabay links
                              and generic fallback images, including running
                              gadget articles back through the device-photo
                              cascade.
scripts/rebrand.mjs          Applies TIVRA branding to manually-uploaded
                              content dropped in /incoming.

.github/workflows/auto-news.yml   The cron schedule + secrets wiring. This
                                   is the only place API keys get injected
                                   into the pipeline.

assets/devices/               Your manual, rights-cleared device photos.
                               Empty by default — the automatic cascade
                               covers most cases.

BUILD_BLUEPRINT.md            The full roadmap: what's built (Phase I —
                               images, Phase A — the 9 daily articles) vs.
                               what's next (Phase V — local video rendering,
                               Phase S — SEO/indexing checklist). Read this
                               for the bigger picture and the reasoning
                               behind each design decision.
```

---

## What's built vs. what's next

**Built and live:** the original ~29-category news pipeline (unchanged),
plus Gadget Comparisons / Sacred Places / AI Tips & Tools (3/day each),
the expanded copyright-safe image cascade, comparison spec tables, and
Product schema.org markup for comparison articles.

**Not built yet** (see `BUILD_BLUEPRINT.md` for the plan): the local video
generation pipeline (voiceover + spec-reveal videos you upload to YouTube
by hand at 11am), the on-demand "user types a comparison request" feature,
and the SEO/indexing checklist (Search Console verification, IndexNow,
Google News sitemap, Publisher Center application). None of the built
work depends on these — they're additive, whenever you're ready.

## Cloudflare settings (already connected)

- Build command: `npm run build` · Deploy: `npx wrangler deploy` (uses
  `wrangler.jsonc` → serves `/public`, 404s go to `404.html`).
- Live at: https://tivranews.com
- Optional: set `SITE_URL` env var in Cloudflare build settings to your
  custom domain so sitemap URLs are absolute-correct.

## Monetization checklist (when ready)

1. Buy a domain (~₹800/yr) and attach it in Cloudflare (Custom Domains).
2. Update `site.url` in `config/news-config.json` + `SITE_URL` in Cloudflare.
3. Apply for AdSense; once approved, put your publisher ID in `ads.txt`,
   GitHub Secrets `ADSENSE_PUBLISHER_ID`/`ADSENSE_AD_SLOT` (new articles
   pick it up automatically), and `config/news-config.json` → `adsense`.
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
- Every image fetcher fails closed (returns `null`, never throws) — a bad
  API key, a timeout, or a rate limit on any one image provider never stops
  an article from publishing; it just falls through to the next provider.
