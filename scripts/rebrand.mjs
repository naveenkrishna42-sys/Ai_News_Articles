#!/usr/bin/env node
/**
 * TIVRA News — rebrand.mjs
 *
 * Converts legacy "AI News Factory" pages (made by the old AIWebFactory
 * desktop app) into proper TIVRA News articles: TIVRA template, working
 * image, JSON-LD, policy links — and a dated filename so the normal
 * 30-day retention manages them from then on.
 *
 * Also processes drop-in uploads: put ANY generated article .html into
 * the `incoming/` folder (from AIWebFactory or elsewhere) and the next
 * run publishes it as a TIVRA-branded article automatically.
 *
 * Runs in every scheduled workflow run. Manual: node scripts/rebrand.mjs
 */

import { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderArticlePage, slugify } from "./lib/template.mjs";
import { findImage, findWikipediaPortrait, personCandidatesFromTitle } from "./lib/images.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ARTICLES = path.join(ROOT, "articles");
const INCOMING = path.join(ROOT, "incoming");
const config = JSON.parse(readFileSync(path.join(ROOT, "config", "news-config.json"), "utf-8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function unescapeHtml(s) {
  return String(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function guessCategory(fileName, title) {
  const t = `${fileName} ${title}`.toLowerCase();
  if (/horoscope|zodiac|astrolog/.test(t)) return "Astrology";
  if (/cricket|football|match|world cup|ipl|tennis|argentina|england/.test(t)) return "Sports";
  if (/movie|film|actor|actress|bollywood|weds|dance|singer/.test(t)) return "Entertainment";
  if (/stock|market|deal|bank|econom|business/.test(t)) return "Business";
  if (/tech|google|phone|ai |space|moon/.test(t)) return "Technology";
  if (/temple|yatra|festival|travel/.test(t)) return "India";
  return "Top Stories";
}

function parseLegacy(html) {
  const title = unescapeHtml((html.match(/<title>([^<]*)<\/title>/) || [])[1] || "").trim();
  const description = unescapeHtml((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "").trim();
  const img = (html.match(/<img[^>]*src="([^"]+)"/) || [])[1] || "";
  const body = (html.match(/<div class="article-body">([\s\S]*?)<\/div>\s*(?:<div class="source-link">|<\/div>|<footer)/) || [])[1] || "";
  const source = (html.match(/<div class="source-link">[\s\S]*?href="([^"]+)"/) || [])[1] || "";
  return { title, description, img, body: body.trim(), source };
}

async function convert(filePath, fileName, isIncoming) {
  const html = readFileSync(filePath, "utf-8");
  if (!isIncoming && !/AI News Factory|News Factory/i.test(html)) return null; // already TIVRA
  const { title, description, img, body, source } = parseLegacy(html);
  if (!title || !body) {
    console.log(`  SKIP (unparseable): ${fileName}`);
    return null;
  }
  const category = guessCategory(fileName, title);
  const date = statSync(filePath).mtime.toISOString().slice(0, 10);

  // Keep the image only if it's a live CDN link; local /assets uploads were
  // never pushed to the repo, so replace those with a fresh matched photo.
  let heroImage = /^https?:\/\//.test(img) && !img.includes("pixabay.com/get") ? img : "";
  let heroCredit = heroImage.includes("pexels.com") ? "Pexels" : "";
  if (!heroImage) {
    for (const name of personCandidatesFromTitle(title)) {
      const w = await findWikipediaPortrait(name);
      if (w) { heroImage = w.url; heroCredit = w.credit; break; }
      await sleep(150);
    }
  }
  if (!heroImage) {
    heroImage = await findImage(title, category, config.fallbackImages);
    heroCredit = heroImage.includes("pexels.com") ? "Pexels" : "";
    await sleep(350);
  }

  const slug = `${date}-${slugify(title)}`;
  const page = renderArticlePage({
    title, description: description || title, category, date,
    heroImage, heroCredit, keyPoints: [], bodyHtml: body,
    sourceName: "", sourceUrl: source, youtubeId: "", slug,
    adsensePublisherId: config.adsense?.publisherId,
    adsenseAdSlot: config.adsense?.adSlot,
    siteUrl: config.site?.url || "",
  });
  writeFileSync(path.join(ARTICLES, `${slug}.html`), page);
  unlinkSync(filePath);
  return slug;
}

let done = 0;
if (existsSync(INCOMING)) {
  for (const f of readdirSync(INCOMING).filter((x) => x.endsWith(".html"))) {
    const slug = await convert(path.join(INCOMING, f), f, true);
    if (slug) { done++; console.log(`  incoming → ${slug}.html`); }
  }
} else {
  mkdirSync(INCOMING, { recursive: true });
}

for (const f of readdirSync(ARTICLES).filter((x) => x.endsWith(".html"))) {
  const slug = await convert(path.join(ARTICLES, f), f, false);
  if (slug) { done++; console.log(`  rebranded → ${slug}.html`); }
}

console.log(`rebrand.mjs: ${done} page(s) converted to TIVRA branding.`);
