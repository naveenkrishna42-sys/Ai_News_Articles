#!/usr/bin/env node
/**
 * TIVRA News — reimage.mjs (self-healing image repair)
 *
 * Repairs articles whose hero image is broken or generic:
 *   - Pixabay hotlinks (their API URLs EXPIRE — never hotlink Pixabay)
 *   - category fallback images (used when image APIs were unreachable)
 *
 * For each, tries in order:
 *   1. Wikipedia portrait if the headline names a famous person
 *      (skipped for Crime & Law / Wars & Conflicts)
 *   2. Pexels photo matched to the headline (quota-limited via --budget,
 *      Pexels allows only 200 requests/hour)
 *   3. category fallback (stable Pexels URL — never a dead link)
 *
 * Runs automatically in every scheduled workflow run (self-healing), and
 * can be run manually:
 *   node scripts/reimage.mjs --dry-run
 *   node scripts/reimage.mjs --budget 150
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  searchPexels,
  imageQueryFromTitle,
  findWikipediaPortrait,
  personCandidatesFromTitle,
} from "./lib/images.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "articles");
const config = JSON.parse(readFileSync(path.join(ROOT, "config", "news-config.json"), "utf-8"));

const DRY_RUN = process.argv.includes("--dry-run");
const budgetIdx = process.argv.indexOf("--budget");
const PEXELS_BUDGET = budgetIdx !== -1 ? Number(process.argv[budgetIdx + 1]) : 150;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const NO_PERSON_CATEGORIES = new Set(["Crime & Law", "Wars & Conflicts"]);
const fallbackSet = new Set(Object.values(config.fallbackImages).flat());

function needsRepair(src) {
  return src.includes("pixabay.com/get") || fallbackSet.has(src);
}

const files = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".html"));
const targets = [];
for (const f of files) {
  const p = path.join(ARTICLES_DIR, f);
  const html = readFileSync(p, "utf-8");
  const m = html.match(/<figure class="hero"><img src="([^"]+)"/);
  if (!m) continue;
  const src = m[1].replace(/&amp;/g, "&");
  if (!needsRepair(src)) continue;
  const title = ((html.match(/<title>([^<]*)<\/title>/) || [])[1] || "")
    .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  const category = (html.match(/📂\s*([^<]+)</) || [])[1]?.trim().replace(/&amp;/g, "&") || "";
  const isPixabay = src.includes("pixabay.com/get");
  targets.push({ f, p, src, title, category, isPixabay });
}

// Broken (expired pixabay) links first — they're actively hurting the site.
targets.sort((a, b) => Number(b.isPixabay) - Number(a.isPixabay));

console.log(`${files.length} scanned — ${targets.length} need repair (${targets.filter((t) => t.isPixabay).length} expired-link, ${targets.length - targets.filter((t) => t.isPixabay).length} fallback).`);
if (DRY_RUN) process.exit(0);

let pexelsUsed = 0, wiki = 0, stock = 0, fallbackFixed = 0;

function applyImage(target, img, credit) {
  let html = readFileSync(target.p, "utf-8");
  const oldEsc = target.src.replace(/&/g, "&amp;");
  const newEsc = img.replace(/&/g, "&amp;");
  html = html.split(oldEsc).join(newEsc);
  html = html.split(target.src).join(img);
  const captionRe = /<figcaption>(?:Photo:|Representative image)[^<]*<\/figcaption>/;
  const caption = credit.startsWith("Wikimedia")
    ? `<figcaption>Photo: ${credit.replace(/&/g, "&amp;")}</figcaption>`
    : credit
      ? `<figcaption>Representative image · ${credit} (free license)</figcaption>`
      : `<figcaption>Representative image</figcaption>`;
  html = html.replace(captionRe, caption);
  writeFileSync(target.p, html);
}

for (const t of targets) {
  let img = null, credit = "";

  // 1. Real person portrait from Wikipedia.
  if (!NO_PERSON_CATEGORIES.has(t.category)) {
    for (const name of personCandidatesFromTitle(t.title)) {
      const w = await findWikipediaPortrait(name);
      if (w) { img = w.url; credit = w.credit; wiki++; break; }
      await sleep(150);
    }
  }

  // 2. Pexels scene photo (within hourly quota).
  if (!img && pexelsUsed < PEXELS_BUDGET) {
    pexelsUsed++;
    const found = await searchPexels(imageQueryFromTitle(t.title, t.category));
    if (found) { img = found; credit = "Pexels"; stock++; }
    await sleep(350);
  }

  // 3. Stable category fallback — only for expired links (a generic image
  //    beats a dead one; fallback-image articles just wait for more budget).
  if (!img && t.isPixabay) {
    const pool = config.fallbackImages[t.category] || config.fallbackImages._default || [];
    img = pool[Math.floor(Math.random() * pool.length)];
    credit = "Pexels";
    fallbackFixed++;
  }

  if (img) applyImage(t, img, credit);
}

console.log(`Repaired: ${wiki} Wikipedia portraits, ${stock} Pexels scene photos, ${fallbackFixed} stabilized on category images.`);
console.log(`Pexels requests used: ${pexelsUsed}/${PEXELS_BUDGET}. Remaining repairs continue next run.`);
