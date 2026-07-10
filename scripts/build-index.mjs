#!/usr/bin/env node
/**
 * AI News Factory — build-index.mjs
 *
 * Scans /articles/*.html (self-contained article pages produced by the
 * article generator), pulls metadata out of each file, and writes:
 *   - articles.json   (used by index.html to render the homepage feed)
 *   - sitemap.xml      (used by search engines)
 *
 * This runs automatically as the "build command" on every push, so there
 * is nothing to run by hand — just drop a new article .html file into
 * /articles, commit, push, and the host rebuilds and republishes.
 *
 * SCHEDULING: an article whose 📅 date is in the future is parsed and
 * included in articles.json but flagged "scheduled": true and excluded
 * from the public feed until that date arrives. Because static hosts only
 * rebuild on push (not on a timer), true hands-off "publish on date X"
 * requires either (a) pushing again on/after that date, or (b) wiring a
 * daily scheduled trigger to your host's deploy hook — see README.md.
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

// Everything actually served lives in /public. Keeping the deploy output in
// its own folder (instead of the repo root) means node_modules — which
// Cloudflare's build step creates to install wrangler itself — never gets
// swept up into the deployed assets. Set "Build output directory" to
// "public" in your Cloudflare project settings.
const PUBLIC_DIR = path.join(ROOT, "public");

const STATIC_FILES = [
  "index.html",
  "about.html",
  "contact.html",
  "privacy.html",
  "terms.html",
  "disclaimer.html",
  "style.css",
  "script.js",
  "ads.txt",
  "robots.txt",
  "_redirects",
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

  const today = new Date().toISOString().slice(0, 10);
  const scheduled = dateRaw ? dateRaw > today : false;

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

function main() {
  if (!existsSync(ARTICLES_DIR)) {
    console.error(`No /articles directory found at ${ARTICLES_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(ARTICLES_DIR).filter((f) => f.toLowerCase().endsWith(".html"));

  const all = files.map(parseArticle);

  // Newest first
  all.sort((a, b) => (a.date < b.date ? 1 : -1));

  const published = all.filter((a) => !a.scheduled);
  const scheduledCount = all.length - published.length;

  // Assemble the deployable /public folder fresh on every build.
  resetPublicDir();

  writeFileSync(
    path.join(PUBLIC_DIR, "articles.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), articles: published }, null, 2)
  );

  // sitemap.xml
  const staticPages = ["", "about.html", "contact.html", "privacy.html", "terms.html", "disclaimer.html"];
  const urls = [
    ...staticPages.map((p) => `${SITE_URL}/${p}`),
    ...published.map((a) => `${SITE_URL}${a.url}`),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
  writeFileSync(path.join(PUBLIC_DIR, "sitemap.xml"), sitemap);

  console.log(`Copied static files + ${files.length} article(s) into /public`);
  console.log(`Built public/articles.json: ${published.length} published, ${scheduledCount} scheduled for the future.`);
  console.log(`Built public/sitemap.xml with ${urls.length} URLs.`);
}

main();
