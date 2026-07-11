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
   regenerates `articles.json` and `sitemap.xml` from every file in
   `/articles`.
4. The homepage (`index.html`) fetches `articles.json` at page load and
   renders the feed, category filters, and search — automatically, with no
   manual step.

**Scheduled publishing:** if an article's `📅` date is in the future, the
build script keeps it out of `articles.json` (and the sitemap) until that
date arrives. Because rebuilds only happen on push or on a schedule you set
up, an article dated for a future day will actually appear on the site the
next time a build runs on/after that date. To get true "publish exactly at
midnight on the date" behavior with no further pushes, add a scheduled
GitHub Action that pings Cloudflare Pages' deploy hook once a day (see
"Optional: scheduled auto-publish" below).

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
- `privacy.html` / `terms.html` — replace `[DATE]` with your launch date.
- `scripts/build-index.mjs` — set the `SITE_URL` environment variable in
  Cloudflare Pages (**Settings → Environment variables**) to your real
  domain, e.g. `https://ainewsfactory.com`, so `sitemap.xml` has correct
  absolute URLs.

## Daily use: publishing an article

1. Generate the article `.html` file as you already do.
2. Save it into `/articles/` with a URL-friendly filename, e.g.
   `2026-07-12-spain-wildfire-update.html` or `spain-wildfire.html` — the
   filename becomes the URL (`/articles/spain-wildfire.html`).
3. `git add articles/your-file.html && git commit -m "New article" && git push`
4. Cloudflare Pages rebuilds automatically (usually live within ~1 minute).
   The homepage, category filters, and sitemap all update on their own —
   nothing else to touch.

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

## Contact form setup (no email address ever shown on the site)

`contact.html` uses [Web3Forms](https://web3forms.com) — a free service built
exactly for this: a plain HTML form on a static site, with submissions
emailed straight to your inbox, no backend or server code required.

1. Go to https://web3forms.com and enter the email you want submissions
   sent to (e.g. your Gmail). They'll email you a free **Access Key**
   instantly — no account/signup needed.
2. Open `contact.html`, find this line near the top of the form:
   ```html
   <input type="hidden" name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY">
   ```
   replace `YOUR_WEB3FORMS_ACCESS_KEY` with the key you were emailed.
3. Push. That's it — the contact page never displays an email address;
   visitors only see a form, and submissions land in your inbox.

Free tier covers generous monthly submission volume for a new site; if you
ever outgrow it, Web3Forms has paid tiers, or you can switch to a
Cloudflare Pages Function calling an email API instead.

## How the homepage, category pages, and archive fit together

- **Homepage (`index.html`)** — one horizontally-scrolling carousel per
  category, showing that category's 10 most recent stories, plus a
  combined "Latest News" grid with search below. Categories are entirely
  driven by whatever `📂` tag your generator puts in each article — add a
  new category (Astro/Horoscope, Movies & Celebrities, Crime & Law,
  Climate & Environment, Local/Regional, whatever) just by tagging
  articles with it; a new carousel appears automatically, with no code
  change. A category with zero recent articles simply doesn't render a
  section — no empty/dead sections ever show up.
- **Category pages (`category.html?cat=<slug>`)** — every "View all →"
  link on the homepage goes here. Shows every recent (last 30 days)
  article in that one category, searchable, paginated.
- **Archive (`archive.html`)** — everything ever published, forever,
  organized by month. This is where "old" news goes after 30 days — it
  never actually gets deleted, so nothing you publish stops earning ad
  impressions or losing its search ranking just because it aged out of
  the homepage.

**On "1000 articles per category, FIFO":** rather than hard-deleting the
oldest article once a category hits some count (which would throw away
content that's still earning traffic/ad revenue and would break any
backlinks pointing at it), this site handles high volume by *rotating what's
featured, not deleting anything*: homepage/category pages = last 30 days
only (fast, always fresh), Archive = full permanent history by month. At
100 articles/day that's roughly 3,000/month in the archive, which the
monthly-file split (see `scripts/build-index.mjs`) keeps fast to load. If
you specifically want old articles' HTML files physically deleted from
the repo after some point (e.g. to control repo size), that's a separate,
deliberate cleanup step — say the word and I'll add a script for it, but
it's not on by default since it's a one-way door.



Just added: **Editorial Policy**, **Cookie Policy**, and **Copyright/DMCA**
pages — premium ad networks (Ezoic, Mediavine) and AdSense reviewers look
for these specifically, beyond the core About/Contact/Privacy/Terms set.

To add any future page yourself (an FAQ, an Author page, a category
landing page, etc.):

1. Copy an existing simple page, e.g. `about.html`, and rename it —
   `faq.html`.
2. Edit the `<title>`, `<meta name="description">`, and the content inside
   `<div class="prose">`. Keep the header/nav/footer blocks as-is so it
   matches the rest of the site.
3. Add the new filename to **two places** in `scripts/build-index.mjs` so
   it gets deployed and shows up in the sitemap:
   - the `STATIC_FILES` array near the top
   - the `staticPages` array inside `main()`
4. Optionally add a link to it in the footer of the other pages (find the
   `<footer class="site-footer">` block, copy the pattern of the existing
   links).
5. Commit and push — it'll appear on the next build, no other setup
   needed.

## File structure

```
ai-news-factory/
├── articles/              ← drop new article .html files here (source of truth)
├── scripts/
│   └── build-index.mjs    ← builds /public from source files on every deploy
├── index.html              ← homepage source (feed, search, category filters)
├── script.js               ← homepage feed logic
├── style.css                ← shared design tokens (matches article template)
├── about.html / contact.html / privacy.html / terms.html / disclaimer.html
├── editorial-policy.html / cookie-policy.html / dmca.html
├── ads.txt
├── robots.txt
├── _redirects               ← maps /privacy → /privacy.html etc for Cloudflare
├── package.json
├── wrangler.jsonc            ← tells Cloudflare's deploy step to use /public, not project root
├── .gitignore                ← excludes node_modules/ and public/ from git
└── public/                   ← GENERATED on every build — this is what gets
                                 deployed. Don't edit files here directly;
                                 edit the source files above instead.
```

You never need to touch `/public` by hand — it's regenerated from scratch
every time `npm run build` runs, which Cloudflare does automatically on
every push.
