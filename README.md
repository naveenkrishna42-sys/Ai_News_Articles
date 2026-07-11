# AI News Factory

A static news site that auto-publishes whatever `.html` article files you push
to GitHub. No backend, no database — `scripts/build-index.mjs` scans
`/articles` on every deploy and generates the homepage feed.

## How it works

1. Your article generator produces a self-contained `.html` file (like the
   sample already in `/articles`) with a `<title>`, a `<meta name="description">`,
   a hero `<img>`, a `📅 YYYY-MM-DD` date, and a `📂 Category` tag.
2. You drop that file into `/articles/` and push to GitHub.
3. The host (Cloudflare Pages) detects the push, runs `npm run build`, which
   regenerates every generated file (`articles.json`, `/archive/*.json`,
   and the sitemaps) from every file in `/articles`.
4. The homepage (`index.html`) fetches `articles.json` at page load and
   renders the feed, category filters, and search — automatically, with no
   manual step.

**Scheduled publishing:** if an article's `📅` date is in the future, the
build script keeps it out of `articles.json`, the archive, and the sitemaps
until that date arrives. Because rebuilds only happen on push or on a
schedule you set up, an article dated for a future day will actually appear
on the site the next time a build runs on/after that date. To get true
"publish exactly at midnight on the date" behavior with no further pushes,
add a scheduled GitHub Action that pings Cloudflare Pages' deploy hook once
a day (see "Optional: scheduled auto-publish" below).

## Built for bulk: 100 articles/day, kept live 30+ days

This is the part that matters once you're publishing at real volume instead
of a handful of samples. At 100 articles/day you'll have ~3,000 articles a
month and ~36,000 a year — a single ever-growing JSON file or sitemap would
eventually slow the homepage down and blow past search engines' sitemap
limits. So the site is split into two tiers:

- **Homepage (`/`, `articles.json`)** — a rolling **30-day window** only.
  Every article stays here for at least 30 days from its publish date, with
  the newest first, search, and category filters. This is what stays fast
  no matter how large the archive gets.
- **Archive (`/archive.html`)** — every article ever published, grouped by
  month (`/archive/2026-07.json`, etc.), browsable with a month picker.
  Nothing is ever deleted — an article simply "graduates" from the homepage
  feed into the archive once it passes the 30-day mark. Its URL never
  changes, so old links and search rankings aren't affected.

Sitemaps follow the same split: `sitemap-pages.xml` for the static pages,
one `sitemap-articles-YYYY-MM.xml` per month of articles, and
`sitemap-index.xml` tying them all together (this is the URL you submit to
Google Search Console / Bing Webmaster Tools — not the per-month files).
`/sitemap.xml` still resolves too, as an alias, in case you've already
submitted that exact URL somewhere.

### Filename convention for daily bulk uploads

Name every article file with a **date prefix**, e.g.:

```
2026-07-11-spain-wildfire.html
2026-07-11-fed-rate-decision.html
2026-07-12-champions-league-draw.html
```

Two reasons this matters at 100/day: (1) it guarantees the filename — which
becomes the URL slug — can never collide even if two unrelated stories
happen to generate similar titles, and (2) `/articles` stays sortable and
scannable by eye as it grows into the thousands. The build script also logs
a warning if it ever detects a duplicate slug, so a collision won't fail
silently.

### Monetizing via paid/sponsored links — the compliance-safe way

Selling backlinks (paid placements that pass SEO ranking value) violates
Google's link scheme policies unless those links are explicitly marked as
non-endorsed. If you plan to monetize this way in addition to display ads:

- Any link that exists because of a paid arrangement must carry
  `rel="sponsored"` (add `rel="sponsored nofollow"` to be extra safe):
  ```html
  <a href="https://advertiser-site.com" rel="sponsored nofollow" target="_blank">Advertiser Name</a>
  ```
- Label sponsored articles or paid placements as "Sponsored" or
  "Advertisement" near the top, so readers can tell them apart from
  editorial coverage.
- Never disguise a paid link as an ordinary editorial citation.

This is written up as site policy (linked in every page's footer) at
`editorial-policy.html`, so it's something you can point advertisers and ad
network reviewers to directly.

## One-time setup

### 1. Push this folder to GitHub
```
cd ai-news-factory
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/ai-news-factory.git
git push -u origin main
```

### 2. Connect Cloudflare Pages (free, allows commercial/ad-monetized use)
1. Go to https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select this repo.
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `public`
4. Deploy.

> **Two separate problems, two separate fixes.** Cloudflare's newer unified
> project type runs `npm run build` (which now correctly writes everything
> into `/public`), then runs a *second*, independent step — `npx wrangler
> deploy` — to actually upload the site. That deploy step does **not** read
> the dashboard's "Build output directory" setting; instead it looks for a
> `wrangler.jsonc` file in your repo, and auto-creates one pointed at the
> project root (`.`) if it doesn't find one. That root folder includes
> `node_modules` (which the build process installs to get `wrangler`
> itself, including a ~120 MB `workerd` binary) — over Cloudflare's 25 MB
> per-file limit, so the deploy fails.
>
> The fix is `wrangler.jsonc` in this repo, which explicitly sets
> `"assets": { "directory": "public" }`. As long as that file is committed,
> wrangler uses it instead of auto-generating its own — don't delete it,
> and keep the dashboard's output directory set to `public` too (both need
> to agree).

> Why not GitHub Pages? GitHub Pages' hosting is meant for docs/portfolio
> sites and isn't the right fit for an ad-monetized production site.
> Cloudflare Pages is free, allows commercial use, and gives you unlimited
> bandwidth — GitHub stays your content repo either way, so your "push a
> file, site updates" workflow doesn't change.

### 3. Add a custom domain (needed for AdSense approval)
In the Pages project → **Custom domains** → add your domain (e.g.
`ainewsfactory.com` or a subdomain like `news.yourdomain.com`). Cloudflare
gives you free SSL automatically. Domain registration itself isn't free
(~$8–12/yr from a registrar like Namecheap, Porkbun, or Cloudflare
Registrar) — that's the one real cost in this whole stack.

### 4. Fill in the placeholders before going live
- `ads.txt` — replace `pub-0000000000000000` with your real AdSense publisher ID once approved.
- Every `.html` file (including future ones from your generator) has
  `ca-pub-XXXXXXXXXXXXXXXX` in two places (script tag + `data-ad-client`) —
  replace with your real publisher ID. Easiest done as a find-and-replace
  in your generator template so every new article is correct automatically.
- `contact.html` — replace `contact@yourdomain.com` with a real inbox.
- `privacy.html` / `terms.html` / `cookie-policy.html` / `editorial-policy.html` /
  `dmca.html` — replace `[DATE]` with your launch date.
- `scripts/build-index.mjs` — set the `SITE_URL` environment variable in
  Cloudflare Pages (**Settings → Environment variables**) to your real
  domain, e.g. `https://ainewsfactory.com`, so the sitemaps have correct
  absolute URLs.

## Daily use: publishing an article

1. Generate the article `.html` file(s) as you already do — at 100/day this
   can be dozens of files in one commit, that's fine.
2. Save each into `/articles/` with a **date-prefixed filename** (see "Built
   for bulk" above), e.g. `2026-07-12-spain-wildfire-update.html` — the
   filename becomes the URL (`/articles/2026-07-12-spain-wildfire-update.html`).
3. `git add articles/*.html && git commit -m "Articles for 2026-07-12" && git push`

**If your generator hasn't been updated yet:** run the auto-fix script on
new files before committing — it patches the known old-template issues
(dead category nav, broken `/article/<uuid>` related-links, incomplete
footer) without you touching the generator:
```
node scripts/fix-article-template.mjs articles/*.html
```
It's safe to run on every batch, every time — files that are already fixed
are left untouched. This is a stopgap; updating the generator's template
(see "Article template requirements" below) is the permanent fix so you
don't need this step at all going forward.

4. Cloudflare Pages rebuilds automatically (usually live within ~1 minute).
   The homepage feed, archive, category filters, and all sitemaps update on
   their own — nothing else to touch. New articles show on the homepage
   immediately and stay there for 30 days, then move to the archive
   automatically — nothing to do on your end when that happens.

## Optional: scheduled auto-publish (no push needed on the publish date)

If you want future-dated articles to go live automatically at the right
time, even if you don't push anything that day:

1. In Cloudflare Pages → your project → **Settings → Builds & deployments**,
   create a **Deploy hook** (gives you a secret URL).
2. Add a GitHub Actions workflow at `.github/workflows/scheduled-publish.yml`:
   ```yaml
   name: Scheduled publish check
   on:
     schedule:
       - cron: "0 3 * * *"  # daily at 03:00 UTC — adjust as needed
   jobs:
     trigger:
       runs-on: ubuntu-latest
       steps:
         - run: curl -X POST "${{ secrets.CF_DEPLOY_HOOK_URL }}"
   ```
3. Add `CF_DEPLOY_HOOK_URL` as a repository secret (Settings → Secrets and
   variables → Actions) with the URL from step 1.

This is optional — without it, the site still auto-updates on every push,
which covers most workflows.

## File structure

```
ai-news-factory/
├── articles/                ← drop new article .html files here (source of truth)
│                              name them YYYY-MM-DD-slug.html (see "Built for bulk")
├── scripts/
│   └── build-index.mjs      ← builds /public from source files on every deploy:
│                              articles.json, /archive/*.json, all sitemaps
├── index.html                ← homepage source (30-day feed, search, category filters)
├── script.js                  ← homepage feed logic
├── archive.html               ← full-history archive page (month picker)
├── archive.js                  ← archive page logic
├── style.css                    ← shared design tokens (matches article template)
├── about.html / contact.html / privacy.html / cookie-policy.html /
│   terms.html / disclaimer.html / editorial-policy.html / dmca.html
├── ads.txt
├── robots.txt                    ← points crawlers at /sitemap-index.xml
├── _redirects                     ← maps /privacy → /privacy.html etc for Cloudflare
├── package.json
├── wrangler.jsonc                  ← tells Cloudflare's deploy step to use /public, not project root
├── .gitignore                      ← excludes node_modules/ and public/ from git
└── public/                          ← GENERATED on every build — this is what gets
                                       deployed. Don't edit files here directly;
                                       edit the source files above instead.
    ├── articles.json                ← rolling 30-day homepage feed
    ├── archive/
    │   ├── index.json                ← list of months + counts
    │   └── YYYY-MM.json               ← full article list for that month
    ├── sitemap-index.xml               ← submit THIS to Search Console
    ├── sitemap-pages.xml
    ├── sitemap-articles-YYYY-MM.xml     ← one per month
    └── sitemap.xml                       ← alias of sitemap-index.xml
```

You never need to touch `/public` by hand — it's regenerated from scratch
every time `npm run build` runs, which Cloudflare does automatically on
every push.

## Article template requirements (update your generator to match)

Everything below is what the build script looks for in each `.html` file
in `/articles`. The **sample article was just fixed to match this exactly**
— use `articles/spain-wildfire.html` as the reference and update your
separate generator's template the same way, so every future article comes
out correct automatically instead of needing manual fixes.

**Required tags**, anywhere in the page:
```html
<title>Article Title</title>
<meta name="description" content="One or two sentence summary.">
<img src="https://..." alt="...">
<span>📅 2026-07-11</span>          <!-- publish date, YYYY-MM-DD -->
<span>📂 World</span>               <!-- category — see taxonomy below -->
```

**Optional tag** — only add this if you want zone/region segmentation:
```html
<span>🌍 India</span>               <!-- zone — see taxonomy below -->
```
If omitted, the article defaults to zone `"Global"`. You don't need to add
this to every article — mix zone-tagged and un-tagged freely.

**Related articles** — replace any hardcoded "Also Read" links (the old
template linked to `/article/<uuid>`, which doesn't correspond to any real
page on this site and was always broken) with this drop-in widget instead.
It pulls real, live links from `articles.json` at page-load time — no way
for it to go stale or 404:
```html
<div id="relatedArticles"></div>
<script src="/related.js" data-category="World" data-slug="your-file-slug-without-html" data-limit="3"></script>
```

**Footer** — every article needs the full legal-page set (the old template
was missing 5 of these), matching every other page on the site:
```html
<a href="/about">About Us</a>
<a href="/contact">Contact</a>
<a href="/archive.html">Archive</a>
<a href="/privacy">Privacy Policy</a>
<a href="/cookie-policy.html">Cookie Policy</a>
<a href="/terms">Terms</a>
<a href="/disclaimer">Disclaimer</a>
<a href="/editorial-policy.html">Editorial Policy</a>
<a href="/dmca.html">DMCA</a>
<a href="/sitemap-index.xml">Sitemap</a>
```

## Category & zone taxonomy

The homepage builds its category and region filters dynamically from
whatever appears in your articles — there's no fixed list to configure in
code. Use whatever `📂` values you want, but keeping them **consistent**
(same spelling/casing) across your generator matters, since `"Crypto"` and
`"crypto news"` will show up as two different filter chips. Suggested set,
covering the topics you mentioned wanting to cover:

`World` · `Politics` · `Business` · `Markets` · `Crypto` · `Tech` ·
`Science` · `Space` · `Health` · `Sports` · `Entertainment` · `Astrology` ·
`Environment` (natural disasters)

For `🌍` zones, a simple starting set: `Global`, `India`, `US`, `Europe`,
`Asia`, `Africa`, `Oceania` — or go country-level if you want finer
targeting (`India`, `UK`, `Australia`, etc.). The homepage auto-detects a
visitor's rough region from their browser timezone and pre-selects that
chip if you have articles for it (they can always switch it manually) —
this only activates once you have more than one distinct zone in use.

## Realistic monetization roadmap (starting from zero traffic)

Ad networks and paid placements both depend on having an audience first —
none of them are switched on by finishing the code. Rough order that
actually works:

1. **Get the legal/compliance pages right (done)** — About, Contact,
   Privacy, Cookie Policy, Terms, Disclaimer, Editorial Policy, DMCA are
   all live and linked from every page. This is a prerequisite for every
   monetization method below, not optional groundwork.
2. **Publish consistently first, apply for ads second.** AdSense and
   Ezoic both want to see a real publishing history (weeks, not days) and
   genuine traffic before approval — applying on day one with zero readers
   usually gets rejected regardless of code quality. Once you're
   publishing daily and have some organic traffic (search, social,
   community shares), apply to AdSense; `ads.txt` and the ad slots are
   already wired up and waiting for your publisher ID.
3. **Affiliate links** can start immediately — no approval-gate,
   no minimum traffic — if any of your categories naturally fit products
   (e.g. a "Crypto" article linking to an exchange with a referral code).
   Mark these the same way as sponsored links (see `editorial-policy.html`)
   for FTC/consumer-protection disclosure compliance.
4. **Paid/sponsored placements** realistically come *after* you have
   traffic numbers to show advertisers — nobody pays to sponsor a post on
   a site with no readers yet. Once you have consistent traffic, the
   `editorial-policy.html` page and the `rel="sponsored"` convention
   described above are what you point advertisers to.
5. **Posting to communities**: most subreddits and forums have strict
   self-promotion / low-effort-AI-content rules and will remove or ban
   accounts that post AI-generated news links without disclosure or
   without being an established community member first — read each
   community's rules before posting, and prioritize communities where you
   participate genuinely rather than purely link-dropping.

In short: the site is now functionally complete end-to-end (every button
does something real); traffic and content consistency — not more code —
are what unlock each monetization stage above.



1. Copy an existing simple page (e.g. `about.html`) as a starting point so
   the header/nav/footer markup matches.
2. Add its filename to both `STATIC_FILES` and (if you want it in the
   sitemap) `STATIC_PAGES_FOR_SITEMAP` near the top of
   `scripts/build-index.mjs`.
3. Add a link to it in the footer block (copy-paste across every page —
   there's no shared template, so each `.html` file's footer is edited
   individually).
4. Push. The next build copies it into `/public` and includes it in
   `sitemap-pages.xml` automatically.
