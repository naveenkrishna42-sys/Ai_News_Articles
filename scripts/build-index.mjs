#!/usr/bin/env node
/**
 * AI News Factory — build-index.mjs
 *
 * Scans /articles/*.html (self-contained article pages produced by the
 * article generator), pulls metadata out of each file, and writes the
 * entire deployable /public folder:
 *
 *   - articles.json            rolling last-30-day window (homepage feed)
 *   - archive/index.json       list of months with article counts
 *   - archive/YYYY-MM.json     full article list for that month
 *   - sitemap-pages.xml        static pages (about, contact, etc.)
 *   - sitemap-articles-*.xml   one sitemap file per month of articles
 *   - sitemap-index.xml        references every sitemap file above
 *   - sitemap.xml              alias of sitemap-index.xml (back-compat)
 *
 * This runs automatically as the "build command" on every push, so there
 * is nothing to run by hand — just drop new article .html file(s) into
 * /articles, commit, push, and the host rebuilds and republishes.
 *
 * SCALE DESIGN: at high volume (e.g. 100 articles/day) a single JSON file
 * with every article ever published would keep growing forever and slow
 * the homepage down. So the homepage only ever loads a 30-day rolling
 * window (WINDOW_DAYS below). Everything older is still live at its own
 * URL and fully indexable — it just moves into /archive, grouped by month,
 * browsable from archive.html. Nothing is ever deleted; articles simply
 * "graduate" from the homepage feed into the archive once they age out
 * of the window.
 *
 * SCHEDULING: an article whose 📅 date is in the future is parsed and
 * included in the data files but flagged "scheduled": true and excluded
 * from the public feed until that date arrives. Because static hosts only
 * rebuild on push (not on a timer), true hands-off "publish on date X"
 * requires either (a) pushing again on/after that date, or (b) wiring a
 * daily scheduled trigger to your host's deploy hook — see README.md.
 *
 * FILE NAMING AT SCALE: give every article file a unique, sortable name —
 * e.g. 2026-07-11-spain-wildfire.html — rather than relying on the
 * generator's plain slug. This guarantees no two articles ever collide on
 * disk (two different stories can otherwise generate the same slug) and
 * makes /articles trivially sortable by eye. See README.md.
 */

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  rmSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "articles");
const SITE_URL = process.env.SITE_URL || "https://example.com"; // overridden in README setup

const WINDOW_DAYS = 30; // homepage rolling window

// Everything actually served lives in /public. Keeping the deploy output in
// its own folder (instead of the repo root) means node_modules — which
// Cloudflare's build step creates to install wrangler itself — never gets
// swept up into the deployed assets. Set "Build output directory" to
// "public" in your Cloudflare project settings.
const PUBLIC_DIR = path.join(ROOT, "public");
const ARCHIVE_DIR = path.join(PUBLIC_DIR, "archive");

const STATIC_FILES = [
  "index.html",
  "about.html",
  "contact.html",
  "privacy.html",
  "cookie-policy.html",
  "terms.html",
  "disclaimer.html",
  "editorial-policy.html",
  "dmca.html",
  "archive.html",
  "style.css",
  "script.js",
  "archive.js",
  "related.js",
  "ads.txt",
  "robots.txt",
  "_redirects",
];

const STATIC_PAGES_FOR_SITEMAP = [
  "",
  "about.html",
  "contact.html",
  "archive.html",
  "privacy.html",
  "cookie-policy.html",
  "terms.html",
  "disclaimer.html",
  "editorial-policy.html",
  "dmca.html",
];

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function resetPublicDir() {
  rmSync(PUBLIC_DIR, { recursive: true, force: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });
  mkdirSync(ARCHIVE_DIR, { recursive: true });

  for (const file of STATIC_FILES) {
    const srcPath = path.join(ROOT, file);
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, path.join(PUBLIC_DIR, file));
    }
  }

  copyDir(ARTICLES_DIR, path.join(PUBLIC_DIR, "articles"));
}

function extract(html, regex, fallback = "") {
  const m = html.match(regex);
  return m ? m[1].trim() : fallback;
}

function stripTags(str) {
  return str.replace(/<[^>]+>/g, "").trim();
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseArticle(filename) {
  const filePath = path.join(ARTICLES_DIR, filename);
  const html = readFileSync(filePath, "utf-8");
  const slug = filename.replace(/\.html?$/i, "");

  const title = decodeEntities(
    extract(html, /<title>([^<]*)<\/title>/i, slug)
  );

  const description = decodeEntities(
    extract(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i, "")
  );

  const image = extract(html, /<img[^>]+src=["']([^"']+)["']/i, "");

  // Date is written in the meta row as: <span>📅 2026-07-11</span>
  const dateRaw = extract(html, /📅\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/, "");

  // Category is written as: <span>📂 World</span>
  const categoryRaw = decodeEntities(
    stripTags(extract(html, /📂\s*([^<]+)</, "General"))
  );

  // Zone/region is optional — written as: <span>🌍 India</span>. Articles
  // without it (including everything from before this feature existed)
  // default to "Global" so nothing breaks and nothing needs a rebuild.
  const zoneRaw = decodeEntities(
    stripTags(extract(html, /🌍\s*([^<]+)</, "Global"))
  );

  const today = new Date().toISOString().slice(0, 10);
  const scheduled = dateRaw ? dateRaw > today : false;
  const date = dateRaw || today;

  return {
    slug,
    title,
    description,
    image,
    date,
    month: date.slice(0, 7), // YYYY-MM, used for archive grouping
    category: categoryRaw.trim() || "General",
    zone: zoneRaw.trim() || "Global",
    url: `/articles/${slug}.html`,
    scheduled,
  };
}

function monthLabel(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildSitemapXml(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
}

function buildSitemapIndexXml(sitemapFiles) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapFiles
    .map((f) => `  <sitemap><loc>${SITE_URL}/${f}</loc></sitemap>`)
    .join("\n")}\n</sitemapindex>\n`;
}

function main() {
  if (!existsSync(ARTICLES_DIR)) {
    console.error(`No /articles directory found at ${ARTICLES_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(ARTICLES_DIR).filter((f) => f.toLowerCase().endsWith(".html"));

  // Duplicate-slug guard: two files with different names but the same
  // generator-produced slug won't collide on disk, but flag it loudly if
  // it ever happens so it's caught in build logs rather than silently
  // overwriting a card.
  const all = files.map(parseArticle);
  const seenSlugs = new Map();
  for (const a of all) {
    if (seenSlugs.has(a.slug)) {
      console.warn(`WARNING: duplicate slug "${a.slug}" — rename one of these files to keep both.`);
    }
    seenSlugs.set(a.slug, true);
  }

  // Newest first
  all.sort((a, b) => (a.date < b.date ? 1 : -1));

  const published = all.filter((a) => !a.scheduled);
  const scheduledCount = all.length - published.length;

  // Assemble the deployable /public folder fresh on every build.
  resetPublicDir();

  // ---- Homepage: rolling 30-day window ----
  const today = new Date();
  const cutoff = new Date(today.getTime() - WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
  const windowArticles = published.filter((a) => a.date >= cutoff);

  writeFileSync(
    path.join(PUBLIC_DIR, "articles.json"),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), windowDays: WINDOW_DAYS, articles: windowArticles },
      null,
      2
    )
  );

  // ---- Archive: grouped by month, every published article, forever ----
  const byMonth = new Map();
  for (const a of published) {
    if (!byMonth.has(a.month)) byMonth.set(a.month, []);
    byMonth.get(a.month).push(a);
  }

  const months = [...byMonth.keys()].sort().reverse(); // newest month first

  for (const month of months) {
    const articles = byMonth.get(month);
    writeFileSync(
      path.join(ARCHIVE_DIR, `${month}.json`),
      JSON.stringify(
        { month, label: monthLabel(month), count: articles.length, articles },
        null,
        2
      )
    );
  }

  writeFileSync(
    path.join(ARCHIVE_DIR, "index.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalArticles: published.length,
        months: months.map((m) => ({ month: m, label: monthLabel(m), count: byMonth.get(m).length })),
      },
      null,
      2
    )
  );

  // ---- Sitemaps: split by month so no single file ever approaches the
  // 50,000-URL sitemap protocol limit, plus an index tying them together.
  const sitemapPagesUrls = STATIC_PAGES_FOR_SITEMAP.map((p) => `${SITE_URL}/${p}`);
  writeFileSync(path.join(PUBLIC_DIR, "sitemap-pages.xml"), buildSitemapXml(sitemapPagesUrls));

  const sitemapFiles = ["sitemap-pages.xml"];
  for (const month of months) {
    const fname = `sitemap-articles-${month}.xml`;
    const urls = byMonth.get(month).map((a) => `${SITE_URL}${a.url}`);
    writeFileSync(path.join(PUBLIC_DIR, fname), buildSitemapXml(urls));
    sitemapFiles.push(fname);
  }

  const sitemapIndexXml = buildSitemapIndexXml(sitemapFiles);
  writeFileSync(path.join(PUBLIC_DIR, "sitemap-index.xml"), sitemapIndexXml);
  // Back-compat alias: if /sitemap.xml was already submitted to Search
  // Console, keep it resolving instead of 404ing.
  writeFileSync(path.join(PUBLIC_DIR, "sitemap.xml"), sitemapIndexXml);

  console.log(`Copied static files + ${files.length} article(s) into /public`);
  console.log(`Homepage window: ${windowArticles.length} article(s) published in the last ${WINDOW_DAYS} days.`);
  console.log(`Archive: ${published.length} total published article(s) across ${months.length} month(s), ${scheduledCount} scheduled for the future.`);
  console.log(`Sitemaps: ${sitemapFiles.length} file(s) referenced from sitemap-index.xml.`);
}

main();
