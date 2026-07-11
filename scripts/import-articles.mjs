#!/usr/bin/env node
/**
 * AI News Factory — import-articles.mjs
 *
 * Solves the "every export is named index.html" problem: your article
 * generator always names its export index.html (and always adds its own
 * robots.txt/sitemap.xml, which this repo already has its own copies of
 * and doesn't need). This script finds every index.html sitting inside
 * /incoming (however deep — one subfolder per download is fine, that's
 * what you get from extracting each zip individually), reads its <title>
 * and its 📅 date, builds a unique filename automatically, and copies it
 * straight into /articles.
 *
 * WORKFLOW:
 *   1. Download articles from your generator as usual (each is a zip
 *      containing index.html + robots.txt + sitemap.xml).
 *   2. Extract ALL of today's zips into ai-news-factory/incoming/
 *      (each one in its own subfolder is fine — this script looks
 *      recursively, you don't need to flatten anything).
 *   3. Run:  node scripts/import-articles.mjs   (or  npm run import)
 *   4. Renamed files land in /articles automatically. The script prints
 *      exactly what it did.
 *   5. git add articles/ && git commit -m "New articles" && git push
 *
 * Nothing in /incoming is deleted — safe to re-run, safe to clear out
 * /incoming by hand once you've confirmed the import worked.
 */

import { readFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const INCOMING_DIR = path.join(ROOT, "incoming");
const ARTICLES_DIR = path.join(ROOT, "articles");

function extract(html, regex, fallback = "") {
  const m = html.match(regex);
  return m ? m[1].trim() : fallback;
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

// Recursively find every file literally named index.html under a directory
function findIndexFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...findIndexFiles(full));
    } else if (entry.toLowerCase() === "index.html") {
      results.push(full);
    }
  }
  return results;
}

function uniqueDestPath(baseName) {
  let dest = path.join(ARTICLES_DIR, `${baseName}.html`);
  let n = 2;
  while (existsSync(dest)) {
    dest = path.join(ARTICLES_DIR, `${baseName}-${n}.html`);
    n++;
  }
  return dest;
}

function main() {
  if (!existsSync(INCOMING_DIR)) {
    mkdirSync(INCOMING_DIR, { recursive: true });
    console.log(`Created ${INCOMING_DIR} — extract your downloaded article zips in there, then run this again.`);
    return;
  }
  mkdirSync(ARTICLES_DIR, { recursive: true });

  const files = findIndexFiles(INCOMING_DIR);
  if (files.length === 0) {
    console.log("No index.html files found under /incoming. Extract your downloaded zips in there first.");
    return;
  }

  let imported = 0;
  for (const filePath of files) {
    const html = readFileSync(filePath, "utf-8");
    const title = decodeEntities(extract(html, /<title>([^<]*)<\/title>/i, "untitled"));
    const dateRaw = extract(html, /📅\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/, "");
    const today = new Date().toISOString().slice(0, 10);
    const date = dateRaw || today;
    const slug = slugify(title) || "article";
    const baseName = `${date}-${slug}`;

    const dest = uniqueDestPath(baseName);
    copyFileSync(filePath, dest);
    imported++;
    console.log(`✓ "${title}" → articles/${path.basename(dest)}`);
  }

  console.log(`\nImported ${imported} article(s) into /articles.`);
  console.log(`Next: git add articles/ && git commit -m "New articles" && git push`);
  console.log(`(Safe to delete everything under /incoming now — it was only copied, not moved.)`);
}

main();
