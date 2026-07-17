#!/usr/bin/env node
/**
 * TIVRA News — reimage.mjs (one-time repair / maintenance tool)
 *
 * Finds every article whose hero image is a category FALLBACK image (what
 * happens when the image APIs are unreachable during a run) and replaces it
 * with a photo actually matched to the headline. Updates the hero <img>,
 * og:image / twitter:image tags, JSON-LD, and the photo-credit caption.
 *
 * Usage:
 *   node scripts/reimage.mjs --dry-run     # count/list, change nothing
 *   node scripts/reimage.mjs               # fix files in place
 *
 * Pixabay is tried first here (higher rate limit — Pexels allows only
 * 200 requests/hour, too few for a large backfill). Articles that can't
 * get a real match are left untouched.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { searchPexels, searchPixabay, imageQueryFromTitle } from "./lib/images.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "articles");
const config = JSON.parse(readFileSync(path.join(ROOT, "config", "news-config.json"), "utf-8"));

const DRY_RUN = process.argv.includes("--dry-run");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fallbackSet = new Set(Object.values(config.fallbackImages).flat());

const files = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".html"));
let needsFix = [];
for (const f of files) {
  const p = path.join(ARTICLES_DIR, f);
  const html = readFileSync(p, "utf-8");
  const m = html.match(/<figure class="hero"><img src="([^"]+)"/);
  if (!m) continue; // pre-TIVRA article or no hero — leave alone
  const src = m[1].replace(/&amp;/g, "&");
  if (!fallbackSet.has(src)) continue; // already has a real matched image
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  const category = (html.match(/📂\s*([^<]+)</) || [])[1]?.trim() || "";
  needsFix.push({ f, p, src, title, category });
}

console.log(`${files.length} articles scanned — ${needsFix.length} using fallback images.`);
if (DRY_RUN) {
  needsFix.slice(0, 15).forEach((a) => console.log(`  [${a.category}] ${a.title.slice(0, 60)}`));
  process.exit(0);
}

let fixed = 0, skipped = 0;
for (const a of needsFix) {
  const query = imageQueryFromTitle(a.title, a.category);
  // Pixabay first (generous limit), Pexels as backup.
  let img = await searchPixabay(query);
  let credit = "Pixabay";
  if (!img) { img = await searchPexels(query); credit = "Pexels"; }
  if (!img || fallbackSet.has(img)) { skipped++; continue; }

  let html = readFileSync(a.p, "utf-8");
  const oldEsc = a.src.replace(/&/g, "&amp;");
  const newEsc = img.replace(/&/g, "&amp;");
  html = html.split(oldEsc).join(newEsc); // hero img + og/twitter metas
  html = html.split(a.src).join(img);     // JSON-LD (raw &)
  html = html.replace(
    /Representative image · (Pexels|Pixabay) \(free license\)/,
    `Representative image · ${credit} (free license)`
  );
  writeFileSync(a.p, html);
  fixed++;
  if (fixed % 25 === 0) console.log(`  …${fixed}/${needsFix.length} done`);
  await sleep(650); // stay politely under Pixabay's 100 requests/minute
}

console.log(`Re-imaged ${fixed} article(s); ${skipped} kept as-is (no good match found).`);
