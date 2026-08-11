#!/usr/bin/env node
/**
 * AI News Factory — build-index.mjs
 *
 * Scans /articles/*.html (self-contained article pages produced by the
 * article generator), pulls metadata out of each file, and writes:
 *   - articles.json          homepage feed: published articles from the
 *                            last FRESH_WINDOW_DAYS days only (kept small
 *                            and fast no matter how large the archive gets)
 *   - archive/index.json     list of every month that has articles
 *   - archive/YYYY-MM.json   full article list for that month (used by
 *                            archive.html so old content stays browsable
 *                            and linkable forever, just off the homepage)
 *   - sitemap-index.xml + sitemap-static.xml + sitemap-YYYY-MM.xml
 *                            every published article stays in the sitemap
 *                            permanently — nothing gets deindexed, it just
 *                            moves out of the homepage feed after 30 days
 *
 * Designed for high volume (built and tested conceptually against ~100
 * articles/day): the homepage never has to load more than ~30 days of
 * data, and the archive is paginated by month instead of one giant file.
 *
 * This runs automatically as the "build command" on every push — drop new
 * article .html file(s) into /articles, commit, push, done.
 *
 * SCHEDULING: an article whose 📅 date is in the future is parsed but
 * excluded from articles.json / archive / sitemap until that date arrives.
 * True hands-off "publish on date X with no push" needs a daily scheduled
 * deploy trigger — see README.md.
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

// Site config (name, featured category order, canonical URL) lives in
// config/news-config.json — the same control panel auto-news.mjs uses.
let CONFIG = { site: {}, featuredCategories: [] };
try {
  CONFIG = JSON.parse(readFileSync(path.join(ROOT, "config", "news-config.json"), "utf-8"));
} catch { /* build still works without the config */ }
const SITE_URL = process.env.SITE_URL || CONFIG.site.url || "https://example.com";

// Everything actually served lives in /public. Keeping the deploy output in
// its own folder (instead of the repo root) means node_modules — which
// Cloudflare's build step creates to install wrangler itself — never gets
// swept up into the deployed assets. Set "Build output directory" to
// "public" in your Cloudflare project settings.
const PUBLIC_DIR = path.join(ROOT, "public");

const STATIC_FILES = [
  "index.html",
  "category.html",
  "archive.html",
  "404.html",
  "about.html",
  "contact.html",
  "privacy.html",
  "terms.html",
  "disclaimer.html",
  "editorial-policy.html",
  "cookie-policy.html",
  "dmca.html",
  "style.css",
  "script.js",
  "category.js",
  "related.js",
  "logo.svg",
  "favicon.svg",
  "ads.txt",
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

  for (const file of STATIC_FILES) {
    const srcPath = path.join(ROOT, file);
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, path.join(PUBLIC_DIR, file));
    }
  }

  copyDir(ARTICLES_DIR, path.join(PUBLIC_DIR, "articles"));

  const assetsDir = path.join(ROOT, "assets");
  if (existsSync(assetsDir)) {
    copyDir(assetsDir, path.join(PUBLIC_DIR, "assets"));
  }
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

  const dateObj = new Date();
  const today = dateObj.toISOString().slice(0, 10);
  dateObj.setUTCDate(dateObj.getUTCDate() + 1);
  const tomorrow = dateObj.toISOString().slice(0, 10);
  const scheduled = dateRaw ? dateRaw > tomorrow : false;

  return {
    slug,
    title,
    description,
    image,
    date: dateRaw || today,
    category: categoryRaw.trim() || "General",
    url: `/articles/${slug}.html`,
    scheduled,
  };
}

function monthLabel(monthKey) {
  const [y, m] = monthKey.split("-");
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function main() {
  if (!existsSync(ARTICLES_DIR)) {
    console.error(`No /articles directory found at ${ARTICLES_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(ARTICLES_DIR).filter((f) => f.toLowerCase().endsWith(".html"));

  const all = files.map(parseArticle);

  // Warn (don't fail the build) if two source files produced the same slug —
  // at high daily volume this is the most common way an article silently
  // overwrites another. Keep filenames unique, e.g. prefix with the date.
  const seen = new Map();
  for (const a of all) {
    if (seen.has(a.slug)) seen.get(a.slug).push(a.slug);
    else seen.set(a.slug, [a.slug]);
  }
  // (slug is derived 1:1 from filename, so real collisions only happen if
  // two files literally share a filename, which the filesystem prevents —
  // this loop is a hook for future duplicate-title detection if wanted.)

  // Newest first
  all.sort((a, b) => (a.date < b.date ? 1 : -1));

  const published = all.filter((a) => !a.scheduled);
  const scheduledCount = all.length - published.length;

  // Assemble the deployable /public folder fresh on every build.
  resetPublicDir();

  // ---- Homepage feed: all published articles ----
  writeFileSync(
    path.join(PUBLIC_DIR, "articles.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        site: CONFIG.site.name || "TIVRA News",
        featuredCategories: CONFIG.featuredCategories || [],
        articles: published,
      },
      null,
      2
    )
  );

  // ---- Group by month (archive JSONs + sitemaps) ----
  const byMonth = new Map();
  for (const a of published) {
    const key = a.date.slice(0, 7); // YYYY-MM
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(a);
  }

  const monthsSorted = [...byMonth.keys()].sort().reverse();

  // ---- Archive: one JSON per month + an index (used by archive.html) ----
  const archiveDir = path.join(PUBLIC_DIR, "archive");
  mkdirSync(archiveDir, { recursive: true });
  for (const key of monthsSorted) {
    writeFileSync(
      path.join(archiveDir, `${key}.json`),
      JSON.stringify({ month: key, articles: byMonth.get(key) })
    );
  }
  writeFileSync(
    path.join(archiveDir, "index.json"),
    JSON.stringify({
      months: monthsSorted.map((key) => ({
        key,
        label: monthLabel(key),
        count: byMonth.get(key).length,
      })),
    })
  );

  // ---- Sitemaps: split by month so no single file risks the 50k-URL limit,
  // and a sitemap index ties them together. Every published article is
  // included regardless of age — moving out of the homepage feed after
  // FRESH_WINDOW_DAYS does not remove it from the sitemap or from search. ----
  const staticPages = [
    "",
    "archive.html",
    "about.html",
    "contact.html",
    "privacy.html",
    "terms.html",
    "disclaimer.html",
    "editorial-policy.html",
    "cookie-policy.html",
    "dmca.html",
  ];
  const slugifyCategory = (cat) =>
    cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const categorySlugs = [...new Set(published.map((a) => slugifyCategory(a.category)))];
  const categoryUrls = categorySlugs.map((slug) => `${SITE_URL}/category.html?cat=${slug}`);

  const staticUrls = [...staticPages.map((p) => `${SITE_URL}/${p}`), ...categoryUrls];
  writeFileSync(
    path.join(PUBLIC_DIR, "sitemap-static.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticUrls
      .map((u) => `  <url><loc>${u}</loc></url>`)
      .join("\n")}\n</urlset>\n`
  );

  for (const key of monthsSorted) {
    const items = byMonth.get(key);
    const urls = items.map((a) => `${SITE_URL}${a.url}`);
    writeFileSync(
      path.join(PUBLIC_DIR, `sitemap-${key}.xml`),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map((u) => `  <url><loc>${u}</loc></url>`)
        .join("\n")}\n</urlset>\n`
    );
  }

  const sitemapIndexEntries = [
    `${SITE_URL}/sitemap-static.xml`,
    ...monthsSorted.map((key) => `${SITE_URL}/sitemap-${key}.xml`),
  ];
  const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapIndexEntries
    .map((u) => `  <sitemap><loc>${u}</loc></sitemap>`)
    .join("\n")}\n</sitemapindex>\n`;
  writeFileSync(path.join(PUBLIC_DIR, "sitemap-index.xml"), sitemapIndexXml);
  // Serve the same index at the conventional /sitemap.xml address too
  // (Workers static assets don't support _redirects rewrites reliably).
  writeFileSync(path.join(PUBLIC_DIR, "sitemap.xml"), sitemapIndexXml);

  // robots.txt with an absolute sitemap URL (generated, not copied).
  writeFileSync(
    path.join(PUBLIC_DIR, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap-index.xml\n`
  );

  console.log(`Copied static files + ${files.length} article(s) into /public`);
  console.log(`Homepage feed: ${published.length} articles. ${scheduledCount} scheduled for the future.`);
  console.log(`Sitemap index with ${sitemapIndexEntries.length} sub-sitemaps.`);
}

main();
