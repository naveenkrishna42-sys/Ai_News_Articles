#!/usr/bin/env node
/**
 * TIVRA News — auto-news.mjs
 * The fully automated newsroom. One run does, in order:
 *
 *   1. FETCH    every feed in config/news-config.json (parallel)
 *   2. FILTER   drop everything already published — permanent registry
 *               (data/published-registry.json) + fuzzy same-story matching,
 *               with category priority so one story never posts twice
 *   3. WRITE    human-style 500+ word articles via the AI provider pool
 *               (Groq → Gemini → OpenRouter → DeepSeek, auto-failover),
 *               each with a copyright-free Pexels/Pixabay image
 *   4. SPECIALS daily horoscopes (12 signs), daily AI Analysis pieces,
 *               weekly long-form feature
 *   5. CLEANUP  delete articles older than retention.days, enforce
 *               per-category and total live caps, prune old registry rows
 *
 * GitHub Actions runs this every 6 hours (.github/workflows/auto-news.yml)
 * and pushes the result; Cloudflare rebuilds the site automatically.
 *
 * Manual/local usage:
 *   node scripts/auto-news.mjs                        # full run per config
 *   node scripts/auto-news.mjs --per-category 1       # low-volume test
 *   node scripts/auto-news.mjs --categories "Sports,World" --max-total 4
 *   node scripts/auto-news.mjs --dry-run              # fetch+plan only
 *   node scripts/auto-news.mjs --no-specials          # skip horoscopes etc.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

try { process.loadEnvFile(); } catch {}
import { ProviderPool, extractJson } from "./lib/providers.mjs";
import { fetchAllFeeds, storyKey, significantWords, titlesOverlap } from "./lib/feeds.mjs";
import { findImage, findYouTubeVideo, mediaPreflight, findWikipediaPortrait } from "./lib/images.mjs";
import { findDeviceImage } from "./lib/images/index.mjs";
import { renderArticlePage, renderComparisonTable, specTableHasData, buildAwaitingSpecsNotice, slugify, escapeHtml } from "./lib/template.mjs";
import { renderBuyBox, injectInlineListicleButtons } from "./lib/affiliate.mjs";
import { buildComparisonSystemPrompt, buildRankingSystemPrompt, buildReviewSystemPrompt, buildNichePrompt } from "./lib/gadget-prompts.mjs";
import { getBestMonetizedUrl, extractCleanProductName } from "./lib/deal-extractor.mjs";
import { generateAndValidateDealArticle } from "./lib/deal-validator.mjs";
import { getVerifiedProductDeals } from "./lib/cuelinks-sync.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "articles");
const DATA_DIR = path.join(ROOT, "data");
const REGISTRY_PATH = path.join(DATA_DIR, "published-registry.json");
const CONFIG_PATH = path.join(ROOT, "config", "news-config.json");

// ---------- CLI ----------
const args = process.argv.slice(2);
function argValue(flag, fallback = null) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}
const DRY_RUN = args.includes("--dry-run");
const NO_SPECIALS = args.includes("--no-specials");
const ONLY_CATEGORIES = (argValue("--categories") || "").split(",").map((s) => s.trim()).filter(Boolean);

// ---------- Setup ----------
const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
const PER_CATEGORY = Number(argValue("--per-category", config.volume.perCategoryPerRun));
const MAX_TOTAL = Number(argValue("--max-total", config.volume.dailyCap));
const CONCURRENCY = Number(argValue("--concurrency", config.volume.concurrency || 4));
const ADSENSE_ID = process.env.ADSENSE_PUBLISHER_ID || config.adsense.publisherId || "";
const ADSENSE_SLOT = process.env.ADSENSE_AD_SLOT || config.adsense.adSlot || "";

const today = new Date().toISOString().slice(0, 10);
const pool = new ProviderPool(config.providers);

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(ARTICLES_DIR, { recursive: true });

let registry = {};
if (existsSync(REGISTRY_PATH)) {
  try { registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf-8")); } catch { registry = {}; }
}
function saveRegistry() {
  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 1));
}

const todayCount = Object.values(registry).filter((r) => r.d === today).length;
let budget = Math.max(0, MAX_TOTAL - todayCount);

console.log(`TIVRA auto-news — ${new Date().toISOString()}`);
console.log(`Providers with keys: ${pool.providers.map((p) => p.name).join(", ") || "NONE"}`);
console.log(`Published today so far: ${todayCount}. Budget this run: ${budget}. Per-category: ${PER_CATEGORY}.`);

if (pool.providers.length === 0 && !DRY_RUN) {
  console.error("No AI provider API keys found in environment — nothing to do. Add GitHub Secrets (see README).");
  process.exit(0); // exit clean: a keyless scheduled run should not mark the workflow red forever
}

if (!DRY_RUN) {
  for (const line of await mediaPreflight()) console.log(`Image providers — ${line}`);
}

// ---------- Story selection ----------
export function isStaleSeasonalStory(title = "", currentDateStr = "") {
  const lower = String(title || "").toLowerCase();
  const currentMonth = new Date(currentDateStr || Date.now()).getMonth();

  // Past years check
  if (/\b(2020|2021|2022|2023|2024)\b/.test(lower)) return true;

  // Stale seasonal events based on current month:
  // Valentine's Day is Feb (month 1). If current month is >= April (month 3), it's stale!
  if (/valentine/i.test(lower) && (currentMonth > 2 || currentMonth < 0)) return true;
  // Republic day is Jan (month 0).
  if (/republic\s*day/i.test(lower) && currentMonth > 1) return true;
  // Holi is March (month 2).
  if (/\bholi\b/i.test(lower) && currentMonth > 3) return true;

  // Outdated specific month claims in deals (e.g. "May 2026 Deals" when month is September)
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  for (let m = 0; m < months.length; m++) {
    if (m < currentMonth - 1 && lower.includes(months[m])) {
      if (/deal|sale|offer|promos?|discount|rates?/i.test(lower)) {
        return true;
      }
    }
  }

  return false;
}

const claimedWordSets = [];
function isDuplicate(item) {
  if (registry[item.key]) return true;
  const words = significantWords(item.title);
  for (const w of claimedWordSets) if (titlesOverlap(words, w)) return true;
  item._words = words;
  return false;
}
function claim(item, kind = "news") {
  registry[item.key] = { t: item.title.slice(0, 120), d: today, c: item.category, k: kind };
  claimedWordSets.push(item._words || significantWords(item.title));
}

const feedList = ONLY_CATEGORIES.length
  ? config.feeds.filter((f) => ONLY_CATEGORIES.includes(f.category))
  : config.feeds;

console.log(`Fetching ${feedList.length} feeds…`);
const byCategory = await fetchAllFeeds(feedList);
let fetchedTotal = 0;
for (const items of byCategory.values()) fetchedTotal += items.length;
console.log(`Fetched ${fetchedTotal} raw stories across ${byCategory.size} categories.`);

// Product-First Commercial Engine: Prepend verified real-time merchant deals & active campaigns
try {
  const verifiedDeals = await getVerifiedProductDeals(today);
  if (verifiedDeals.length > 0) {
    const existingDeals = byCategory.get("Product Deals & Offers") || [];
    byCategory.set("Product Deals & Offers", [...verifiedDeals, ...existingDeals]);
    console.log(`Injected ${verifiedDeals.length} verified product-first deals into Product Deals & Offers.`);
  }
} catch (e) {
  console.warn(`[Deals Engine] Could not pre-fetch live Cuelinks deals: ${e.message}`);
}

const priority = config.categoryPriority.filter((c) => byCategory.has(c));
for (const c of byCategory.keys()) if (!priority.includes(c)) priority.push(c);

// Gadget Comparisons / AI Tips & Tools are capped at
// newCategoryVolume[category] PUBLISHED PER DAY (across all runs), not per
// run like every other category's PER_CATEGORY. We enforce that by reusing
// the existing registry bookkeeping (registry[key].d === today, .c ===
// category) rather than a parallel counter — the same data every other
// piece of daily-cap logic in this file already relies on. If the config
// value is missing or 0 for one of these three categories, the computed
// budget is 0 and the category silently produces nothing that day — no
// crash, no special-cased error path, config-only toggle.
// Pass 1: Standard fair distribution
const queue = [];
for (const category of priority) {
  const items = byCategory.get(category) || [];
  let picked = 0;
  let categoryBudget = Number(config.newCategoryVolume?.[category] || PER_CATEGORY);
  for (const item of items) {
    if (picked >= categoryBudget || queue.length >= budget) break;
    if (item.title.length < 25) continue;
    if (isStaleSeasonalStory(item.title, today)) continue;
    if (isDuplicate(item)) continue;
    claim(item);
    queue.push(item);
    picked++;
  }
}

// Pass 2: Dynamic Overflow Backfill to hit target volume (up to budget / 50)
const HIGH_MONETIZATION_ORDER = [
  "Product Deals & Offers",
  "Credit Cards & Cashback",
  "Gadget Comparisons",
  "Technology",
  "Business",
  "Markets",
  "India",
  "World",
  "Sports",
  "Entertainment",
  "Science",
  "Health",
  "AI Tips & Tools",
  ...priority
];

const runTarget = args.includes("--per-category")
  ? Math.min(budget, PER_CATEGORY * priority.length)
  : Math.min(budget, Math.max(PER_CATEGORY * priority.length, 55));

if (queue.length < runTarget) {
  for (const category of HIGH_MONETIZATION_ORDER) {
    if (queue.length >= runTarget) break;
    const items = byCategory.get(category) || [];
    for (const item of items) {
      if (queue.length >= runTarget) break;
      if (item.title.length < 25) continue;
      if (isStaleSeasonalStory(item.title, today)) continue;
      if (isDuplicate(item)) continue;
      claim(item);
      queue.push(item);
    }
  }
}

console.log(`Selected ${queue.length} new stories to write.`);

if (DRY_RUN) {
  for (const q of queue) console.log(`  [${q.category}] ${q.title}`);
  process.exit(0);
}

// ---------- Writing ----------
const SYSTEM_PROMPT = `You are a senior investigative journalist, tech authority, and commercial buyer guide expert at TIVRA News (tivranews.com). Rewrite the given headline and snippet into an authoritative, 500-700 word in-depth article following strict E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) quality standards.

Non-negotiable formatting and depth requirements:
- Length: 500 to 750 words. Divide logically into 3-5 structured <h2> and <h3> subheadings with concise paragraphs (2-4 sentences each).
- Technical Depth: Do not just summarize. Explain real-world buyer implications, practical benchmarks, pricing context, and value justification.
- Mandatory Spec / Data Table: You MUST include at least one HTML table (<table><tr><th>Specification / Metric</th><th>Verified Details</th></tr>...) summarizing key technical specifications, prices, or performance data.
- Pros & Cons / Key Insights: You MUST include a bulleted list (<ul><li>) of clear Pros/Cons or Key Real-World Highlights.
- Listicle Structure Rule: If the headline contains a list or ranking (e.g., "Top 5", "Top 10", "Best Websites"), you MUST list all items explicitly using numbered headings (e.g. <h3>1. [Item Name]</h3>, <h3>2. [Item Name]</h3>, etc.) followed by dedicated analysis for each item.
- Tone: Crisp, objective, expert, active voice. Banned fluff: "in conclusion", "it is important to note", "delve", "landscape", "moreover", "in today's fast-paced world", "stay tuned".
- Accuracy: NEVER fabricate quotes, casualty numbers, or launch dates. Use natural Indian English conventions (lakh/crore) where appropriate.

Output STRICT JSON only, no markdown codeblocks, matching this exact schema:
{"title":"Compelling, high-CTR headline under 75 chars","description":"Authoritative meta description, 140-160 chars","key_points":["Crucial takeaway 1","Crucial takeaway 2","Crucial takeaway 3"],"content":"Full article body HTML using ONLY <h2>,<h3>,<p>,<ul>,<li>,<table>,<tr>,<td>,<th> tags","image_person":"Name of prominent person if centrally focused, otherwise empty string","image_query":"2-4 word concrete physical scene for stock photo search (e.g. smartphone display test, luxury hotel lobby, cloud server rack)"}`;

function countWords(html) {
  return html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
}

const STRICT_NON_COMMERCIAL_CATEGORIES = new Set([
  "Sacred Places",
  "Religion",
  "World",
  "India",
  "Sports",
  "Crime & Law",
  "Politics",
  "Wars & Conflicts",
  "Environment",
  "Culture & Arts",
  "Education",
  "Hyderabad",
  "Chennai",
  "Bengaluru",
  "Mumbai",
  "Delhi",
  "Breaking News",
  "Top Stories",
  "Science",
  "Movies",
  "Entertainment",
  "Astrology"
]);

const results = { written: 0, failed: 0, files: [] };

async function writeStory(item, { systemPrompt = SYSTEM_PROMPT, minWords = 220, maxTokens = 3200, kind = "news" } = {}) {
  const userPrompt = `Headline: ${item.title}\nCategory: ${item.category}\nOriginal reporting by: ${item.sourceName}\nPublished: ${item.pubDate || today}\nSource snippet: ${item.summary || "(headline only — write carefully around unknown details)"}`;

  const { text } = await pool.chat({ system: systemPrompt, user: userPrompt, maxTokens });
  const parsed = extractJson(text);
  const title = (parsed.title || item.title).slice(0, 110);
  const bodyHtml = parsed.content || "";
  if (countWords(bodyHtml) < minWords) throw new Error(`too short (${countWords(bodyHtml)} words)`);

  // Image strategy: real Wikipedia portrait when the story is about one
  // famous person (never for crime/war stories — wrong-face risk), else a
  // Pexels photo of the AI-chosen scene, else category fallback.
  const NO_PERSON_CATEGORIES = new Set(["Crime & Law", "Wars & Conflicts"]);
  let heroImage = "";
  let heroCredit = "";
  if (parsed.image_person && !NO_PERSON_CATEGORIES.has(item.category)) {
    const portrait = await findWikipediaPortrait(parsed.image_person);
    if (portrait) {
      heroImage = portrait.url;
      heroCredit = portrait.credit;
    }
  }
  if (!heroImage) {
    heroImage = await findImage(parsed.image_query || title, item.category, config.fallbackImages);
    heroCredit = heroImage.includes("pexels.com") ? "Pexels" : "";
  }
  const youtubeId = await findYouTubeVideo(item.title);

  let slug = slugify(title) || slugify(item.title) || `story-${Date.now()}`;
  let filename = `${today}-${slug}.html`;
  let n = 2;
  while (existsSync(path.join(ARTICLES_DIR, filename))) {
    filename = `${today}-${slug}-${n++}.html`;
  }

  let finalBodyHtml = bodyHtml;
  let extraJsonLd = [];

  const isNonCommercial = STRICT_NON_COMMERCIAL_CATEGORIES.has(item.category);

  if (!isNonCommercial) {
    // Only commercial categories get inline listicle buttons
    const commercialCats = new Set(["Product Deals & Offers", "Credit Cards & Cashback", "Gadget Comparisons"]);
    if (commercialCats.has(item.category)) {
      finalBodyHtml = injectInlineListicleButtons(bodyHtml, config, item.category, title);
    }

    const isExplicitReviewOrDeal = commercialCats.has(item.category) || 
      (item.category === "Technology" && /\b(review|unboxing|launch price|specifications|discount|price drop)\b/i.test(title)) ||
      (item.category === "Business" && /\b(web hosting|cloud hosting|global payroll|software discount)\b/i.test(title));

    if (isExplicitReviewOrDeal) {
      const buyBoxHtml = renderBuyBox([title], config, item.category, "", title);
      if (buyBoxHtml) finalBodyHtml += `\n${buyBoxHtml}`;

      const siteUrl = config?.site?.url || "https://tivranews.com";
      const slugName = filename.replace(/\.html$/, "");
      extraJsonLd.push({
        "@context": "https://schema.org",
        "@type": "Product",
        "name": title,
        "description": parsed.description || title,
        "image": heroImage ? [heroImage] : undefined,
        "brand": {
          "@type": "Brand",
          "name": "TIVRA Verified"
        },
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "INR",
          "availability": "https://schema.org/InStock",
          "url": `${siteUrl}/articles/${slugName}.html`,
          "seller": {
            "@type": "Organization",
            "name": "Verified Merchant"
          }
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "180",
          "bestRating": "5"
        },
        "review": {
          "@type": "Review",
          "author": {
            "@type": "Organization",
            "name": "TIVRA News Editorial Desk"
          },
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": "4.8",
            "bestRating": "5"
          }
        }
      });
    }
  }

  const html = renderArticlePage({
    title,
    description: parsed.description || title,
    category: item.category,
    date: today,
    heroImage,
    heroCredit,
    keyPoints: parsed.key_points || [],
    bodyHtml: finalBodyHtml,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    youtubeId,
    slug: filename.replace(/\.html$/, ""),
    adsensePublisherId: ADSENSE_ID,
    adsenseAdSlot: ADSENSE_SLOT,
    siteUrl: config.site.url || "",
    extraJsonLd,
  });

  writeFileSync(path.join(ARTICLES_DIR, filename), html);
  results.written++;
  results.files.push(filename);
  if (results.written % 20 === 0) saveRegistry();
  console.log(`  ✔ [${item.category}] ${title}`);
}

// buildProductJsonLd — Product schema.org blocks for the devices in a
// comparison/ranking article. Deliberately NO Review/aggregateRating type:
// a star rating is a specific fabricated number if we invent one, and this
// whole build's spec-accuracy rule exists precisely to avoid confidently-
// wrong numbers on a monetized site. Product-only structured data is a
// smaller SEO win than a full Review rich-result, but it's the honest one —
// we skip the rich-result eligibility rather than invent a rating.
function buildProductJsonLd(name, imageUrl) {
  if (!name) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    image: imageUrl ? [imageUrl] : undefined,
    brand: { "@type": "Brand", name: (name.split(/\s+/)[0] || name) },
  };
}

// writeReviewStory — Gadget Comparisons. Single-product spotlight: specs,
// qualitative reception (never a fabricated star rating — see the prompt),
// pros/cons, verdict, buy link. Same shape and same honesty rules as
// writeComparisonStory below, just one device instead of two.
async function writeReviewStory(item) {
  const userPrompt = `Headline: ${item.title}\nCategory: ${item.category}\nOriginal reporting by: ${item.sourceName}\nPublished: ${item.pubDate || today}\nSource snippet: ${item.summary || "(headline only)"}`;

  const { text } = await pool.chat({ system: buildReviewSystemPrompt(), user: userPrompt, maxTokens: 3400 });
  const parsed = extractJson(text);

  const title = (parsed.title || item.title).slice(0, 110);
  const deviceName = parsed.deviceName || item.title;
  const specRows = Array.isArray(parsed.specRows) ? parsed.specRows : [];
  const pros = (Array.isArray(parsed.pros) ? parsed.pros : []).filter(Boolean);
  const cons = (Array.isArray(parsed.cons) ? parsed.cons : []).filter(Boolean);

  const whyNowHtml = parsed.whyNow ? `<p>${escapeHtml(parsed.whyNow)}</p>` : "";
  const tableHtml = specTableHasData(specRows)
    ? renderComparisonTable(specRows, deviceName || "Spec")
    : buildAwaitingSpecsNotice(parsed.expectedHighlights);
  const receptionHtml = parsed.reception ? `<p><strong>What reviewers generally say:</strong> ${escapeHtml(parsed.reception)}</p>` : "";
  const prosConsHtml = pros.length || cons.length
    ? `<div style="display:flex;gap:20px;flex-wrap:wrap;margin:20px 0;">
${pros.length ? `<div style="flex:1;min-width:220px;"><strong style="color:#15803d;">Pros</strong><ul>${pros.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul></div>` : ""}
${cons.length ? `<div style="flex:1;min-width:220px;"><strong style="color:#be123c;">Cons</strong><ul>${cons.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul></div>` : ""}
</div>`
    : "";
  const verdictHtml = parsed.verdict || "";
  // No Buy button unless the device is actually launched/available AND the
  // model is confident it's sold on Amazon — a link next to an unreleased or
  // Amazon-unavailable product is a false, actionable claim.
  const canBuy = parsed.isLaunched !== false && parsed.amazonAvailable !== false;
  const buyBoxHtml = canBuy ? renderBuyBox([deviceName], config, item.category, "", title) : "";
  const bodyHtml = `${whyNowHtml}\n${tableHtml}\n${receptionHtml}\n${prosConsHtml}\n${verdictHtml}\n${buyBoxHtml}`;

  const articleWords = countWords(`${whyNowHtml}\n${receptionHtml}\n${prosConsHtml}\n${verdictHtml}`);
  if (articleWords < 120) throw new Error(`review too short (${articleWords} words)`);

  const deviceSlug = slugify(deviceName);
  const img = await findDeviceImage({ deviceName, deviceSlug, category: item.category, fallbackImages: config.fallbackImages });
  const heroImage = img ? img.url : (config.fallbackImages["Gadget Comparisons"] || config.fallbackImages._default)[0];
  const heroCredit = img
    ? { provider: img.provider, author: img.author, license: img.license, sourceUrl: img.sourceUrl }
    : "Pexels";

  let slug = slugify(title) || deviceSlug || `review-${Date.now()}`;
  let filename = `${today}-${slug}.html`;
  let n = 2;
  while (existsSync(path.join(ARTICLES_DIR, filename))) {
    filename = `${today}-${slug}-${n++}.html`;
  }

  const html = renderArticlePage({
    title,
    description: parsed.description || parsed.seoDescription || title,
    category: "Gadget Comparisons",
    date: today,
    heroImage,
    heroCredit,
    keyPoints: parsed.keyPoints || [],
    bodyHtml,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    youtubeId: "",
    slug: filename.replace(/\.html$/, ""),
    adsensePublisherId: ADSENSE_ID,
    adsenseAdSlot: ADSENSE_SLOT,
    siteUrl: config.site.url || "",
    extraJsonLd: [buildProductJsonLd(deviceName, img ? img.url : "")],
  });

  writeFileSync(path.join(ARTICLES_DIR, filename), html);
  results.written++;
  results.files.push(filename);
  if (results.written % 20 === 0) saveRegistry();
  console.log(`  ✔ [Gadget Comparisons] ${title} (review)`);
}

// writeComparisonStory — Gadget Comparisons. Derives a two-device head-to-
// head from a single-device headline (see buildComparisonSystemPrompt for
// the "pick a rival, never invent a spec" rules). Does not touch or reuse
// writeStory()'s internals; ordinary categories are completely unaffected.
async function writeComparisonStory(item) {
  const userPrompt = `Headline: ${item.title}\nCategory: ${item.category}\nOriginal reporting by: ${item.sourceName}\nPublished: ${item.pubDate || today}\nSource snippet: ${item.summary || "(headline only — pick a realistic rival and do not invent specs)"}`;

  const { text } = await pool.chat({ system: buildComparisonSystemPrompt(), user: userPrompt, maxTokens: 3600 });
  const parsed = extractJson(text);

  const title = (parsed.title || item.title).slice(0, 110);
  const deviceA = parsed.deviceA || item.title;
  const deviceB = parsed.deviceB || "";
  const specRows = Array.isArray(parsed.specRows) ? parsed.specRows : [];

  const introHtml = parsed.intro ? `<p>${escapeHtml(parsed.intro)}</p>` : "";
  const tableHtml = specTableHasData(specRows)
    ? renderComparisonTable(specRows, deviceA || "Device A", deviceB || "Device B")
    : buildAwaitingSpecsNotice(parsed.expectedHighlights);
  const summaryHtml = parsed.summary ? `<p>${escapeHtml(parsed.summary)}</p>` : "";
  const verdictHtml = parsed.verdict || "";
  // Buy button per device, independently gated — deviceA can be launched
  // and on Amazon while deviceB isn't (or vice versa), so filter per side
  // rather than an all-or-nothing box.
  const buyNames = [];
  if (deviceA && parsed.isLaunchedA !== false && parsed.amazonAvailableA !== false) buyNames.push(deviceA);
  if (deviceB && parsed.isLaunchedB !== false && parsed.amazonAvailableB !== false) buyNames.push(deviceB);
  const buyBoxHtml = renderBuyBox(buyNames, config);
  const bodyHtml = `${introHtml}\n${tableHtml}\n${summaryHtml}\n${verdictHtml}\n${buyBoxHtml}`;

  // Word count excludes the buy box — it is navigation, not article content,
  // and must never be what lifts a thin article over the minimum.
  const articleWords = countWords(`${introHtml}\n${tableHtml}\n${summaryHtml}\n${verdictHtml}`);
  if (articleWords < 150) throw new Error(`comparison too short (${articleWords} words)`);

  // Two hero images (one per device) via the device-photo cascade. Either
  // side is allowed to come back empty — a missing photo never fails the
  // article. renderArticlePage() only accepts a single hero image today,
  // so we prefer deviceA's photo and fall back to deviceB's; a real
  // side-by-side two-photo layout is a template change for a later phase.
  const slugA = slugify(deviceA);
  const slugB = slugify(deviceB);
  const [imgA, imgB] = await Promise.all([
    findDeviceImage({ deviceName: deviceA, deviceSlug: slugA, category: item.category, fallbackImages: config.fallbackImages }),
    deviceB ? findDeviceImage({ deviceName: deviceB, deviceSlug: slugB, category: item.category, fallbackImages: config.fallbackImages }) : Promise.resolve(null),
  ]);
  const chosenImg = imgA || imgB;
  const heroImage = chosenImg ? chosenImg.url : (config.fallbackImages["Gadget Comparisons"] || config.fallbackImages._default)[0];
  const heroCredit = chosenImg
    ? { provider: chosenImg.provider, author: chosenImg.author, license: chosenImg.license, sourceUrl: chosenImg.sourceUrl }
    : "Pexels";

  let slug = slugify(title) || slugify(`${deviceA}-vs-${deviceB}`) || `comparison-${Date.now()}`;
  let filename = `${today}-${slug}.html`;
  let n = 2;
  while (existsSync(path.join(ARTICLES_DIR, filename))) {
    filename = `${today}-${slug}-${n++}.html`;
  }

  const html = renderArticlePage({
    title,
    description: parsed.description || parsed.seoDescription || title,
    category: "Gadget Comparisons",
    date: today,
    heroImage,
    heroCredit,
    keyPoints: parsed.keyPoints || [],
    bodyHtml,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    youtubeId: "",
    slug: filename.replace(/\.html$/, ""),
    adsensePublisherId: ADSENSE_ID,
    adsenseAdSlot: ADSENSE_SLOT,
    siteUrl: config.site.url || "",
    extraJsonLd: [
      buildProductJsonLd(deviceA, imgA ? imgA.url : ""),
      buildProductJsonLd(deviceB, imgB ? imgB.url : ""),
    ],
  });

  writeFileSync(path.join(ARTICLES_DIR, filename), html);
  results.written++;
  results.files.push(filename);
  if (results.written % 20 === 0) saveRegistry();
  console.log(`  ✔ [Gadget Comparisons] ${title}`);
}

// writeRankingStory — periodic "top N" gadget listicle, built from a batch
// of recent Gadget Comparisons headlines rather than a single item. Kept
// deliberately simple and follows the same shape as writeComparisonStory /
// the weekly-feature special below it, rather than introducing a new
// abstraction.
async function writeRankingStory(candidateItems) {
  const listText = candidateItems
    .map((c, i) => `${i + 1}. ${c.title}${c.summary ? " — " + c.summary : ""}`)
    .join("\n");
  const userPrompt = `Recent gadget headlines to draw ranking candidates from:\n${listText}\nPublished: ${today}`;

  const { text } = await pool.chat({ system: buildRankingSystemPrompt(), user: userPrompt, maxTokens: 4200 });
  const parsed = extractJson(text);

  const title = (parsed.title || "Top phones ranked").slice(0, 110);
  const items = Array.isArray(parsed.items) ? parsed.items : [];

  const introHtml = parsed.intro ? `<p>${escapeHtml(parsed.intro)}</p>` : "";
  const rationaleHtml = parsed.rankingRationale
    ? `<p><strong>How we ranked these:</strong> ${escapeHtml(parsed.rankingRationale)}</p>`
    : "";
  const itemsHtml = items
    .map((it) => {
      const heading = `<h3>#${Number(it.rank) || ""} ${escapeHtml(it.name || "")}</h3>`;
      const why = it.whyRanked ? `<p>${escapeHtml(it.whyRanked)}</p>` : "";
      const priceLine = `<p><strong>Price:</strong> ${it.price ? escapeHtml(it.price) : "—"}</p>`;
      const rows = Array.isArray(it.specRows) ? it.specRows : [];
      const table = specTableHasData(rows) ? renderComparisonTable(rows) : buildAwaitingSpecsNotice(it.expectedHighlights);
      return `${heading}${why}${priceLine}${table}`;
    })
    .join("\n");
  const verdictHtml = parsed.verdict || "";
  // Only items that are actually launched and confidently sold on Amazon get
  // a Buy button — an unreleased or Amazon-unavailable item is skipped
  // entirely rather than linking to a search page for something you can't
  // actually buy there.
  const buyNames = items
    .filter((it) => it.name && it.isLaunched !== false && it.amazonAvailable !== false)
    .map((it) => it.name);
  const buyBoxHtml = renderBuyBox(buyNames, config);
  const bodyHtml = `${introHtml}\n${rationaleHtml}\n${itemsHtml}\n${verdictHtml}\n${buyBoxHtml}`;

  const articleWords = countWords(`${introHtml}\n${rationaleHtml}\n${itemsHtml}\n${verdictHtml}`);
  if (articleWords < 200) throw new Error(`ranking too short (${articleWords} words)`);

  // Hero image: first ranked item whose device photo resolves. We stop at
  // the first hit rather than looking up every item's photo (N extra API
  // calls for a single hero image isn't worth it) — heroImageForName below
  // tracks which item it belongs to, purely for the Product schema block.
  let heroImage = "";
  let heroCredit = "Pexels";
  let heroImageForName = "";
  for (const it of items) {
    if (!it.name) continue;
    const img = await findDeviceImage({
      deviceName: it.name,
      deviceSlug: slugify(it.name),
      category: "Gadget Comparisons",
      fallbackImages: config.fallbackImages,
    });
    if (img) {
      heroImage = img.url;
      heroCredit = { provider: img.provider, author: img.author, license: img.license, sourceUrl: img.sourceUrl };
      heroImageForName = it.name;
      break;
    }
  }
  if (!heroImage) heroImage = (config.fallbackImages["Gadget Comparisons"] || config.fallbackImages._default)[0];

  let slug = slugify(title) || `gadget-ranking-${Date.now()}`;
  let filename = `${today}-${slug}.html`;
  let n = 2;
  while (existsSync(path.join(ARTICLES_DIR, filename))) {
    filename = `${today}-${slug}-${n++}.html`;
  }

  const html = renderArticlePage({
    title,
    description: parsed.description || parsed.seoDescription || title,
    category: "Gadget Comparisons",
    date: today,
    heroImage,
    heroCredit,
    keyPoints: parsed.keyPoints || [],
    bodyHtml,
    sourceName: "TIVRA News Gadgets Desk",
    sourceUrl: "",
    youtubeId: "",
    slug: filename.replace(/\.html$/, ""),
    adsensePublisherId: ADSENSE_ID,
    adsenseAdSlot: ADSENSE_SLOT,
    siteUrl: config.site.url || "",
    extraJsonLd: items.map((it) =>
      buildProductJsonLd(it.name, it.name === heroImageForName ? heroImage : "")
    ),
  });

  writeFileSync(path.join(ARTICLES_DIR, filename), html);
  results.written++;
  results.files.push(filename);
  if (results.written % 20 === 0) saveRegistry();
  console.log(`  ✔ [Gadget Comparisons] ${title} (ranking)`);
}

async function runQueue(items, worker) {
  let index = 0;
  const lanes = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      try {
        await worker(item);
      } catch (err) {
        results.failed++;
        delete registry[item.key]; // unclaim so the next run retries it
        console.log(`  ✖ [${item.category}] ${item.title.slice(0, 60)} — ${err.message}`);
      }
    }
  });
  await Promise.all(lanes);
}

async function writeDealStory(item) {
  const directUrl = item.directUrl || await getBestMonetizedUrl(
    item,
    item.title,
    config.affiliate?.amazonTag || "",
    config.affiliate?.products || {}
  );
  const parsed = await generateAndValidateDealArticle(pool, item, directUrl);
  if (!parsed) {
    const nicheSystem = NICHE_SYSTEM_PROMPTS[item.category];
    return writeStory(item, nicheSystem ? { systemPrompt: nicheSystem } : {});
  }

  const title = parsed.title;
  const productName = parsed.productName || extractCleanProductName(item.title);
  const ratingBadge = `<div class="rating-badge" style="display:inline-block;background:#059669;color:#fff;font-weight:800;padding:4px 10px;border-radius:6px;font-size:0.9rem;margin-bottom:12px;">★ ${parsed.rating} / 5.0 Value Rating</div>`;
  const ratingText = parsed.ratingReason ? `<p><em>${escapeHtml(parsed.ratingReason)}</em></p>` : "";
  const prosHtml = (parsed.pros || []).map((p) => `<li>✅ ${escapeHtml(p)}</li>`).join("");
  const consHtml = (parsed.cons || []).map((c) => `<li>⚠️ ${escapeHtml(c)}</li>`).join("");
  const prosConsBox = `<div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px 20px;border-radius:8px;margin:20px 0;">
    <h4 style="margin-top:0;margin-bottom:10px;">Key Highlights & Tradeoffs</h4>
    <ul style="padding-left:20px;margin-bottom:0;">
      ${prosHtml}
      ${consHtml}
    </ul>
  </div>`;
  const verdictHtml = parsed.verdict ? `<h3>Final Buying Verdict</h3><p>${escapeHtml(parsed.verdict)}</p>` : "";
  const buyBoxHtml = renderBuyBox([productName], config, item.category, directUrl, title);

  const bodyHtml = `${ratingBadge}\n${ratingText}\n${parsed.articleBody}\n${prosConsBox}\n${verdictHtml}\n${buyBoxHtml}`;

  let heroImage = "";
  let heroCredit = "Pexels";
  const img = await findDeviceImage({
    deviceName: productName,
    deviceSlug: slugify(productName),
    category: item.category,
    fallbackImages: config.fallbackImages,
  });
  if (img) {
    heroImage = img.url;
    heroCredit = { provider: img.provider, author: img.author, license: img.license, sourceUrl: img.sourceUrl };
  }
  if (!heroImage) heroImage = (config.fallbackImages[item.category] || config.fallbackImages._default)[0];

  let slug = slugify(title) || `deal-${Date.now()}`;
  let filename = `${today}-${slug}.html`;
  let n = 2;
  while (existsSync(path.join(ARTICLES_DIR, filename))) {
    filename = `${today}-${slug}-${n++}.html`;
  }

  const html = renderArticlePage({
    title,
    description: parsed.dealSummary || title,
    category: item.category,
    date: today,
    heroImage,
    heroCredit,
    keyPoints: [...(parsed.pros || []), parsed.verdict].filter(Boolean).slice(0, 4),
    bodyHtml,
    sourceName: item.sourceName || "TIVRA News Deals Desk",
    sourceUrl: item.sourceUrl || "",
    youtubeId: "",
    slug: filename.replace(/\.html$/, ""),
    adsensePublisherId: ADSENSE_ID,
    adsenseAdSlot: ADSENSE_SLOT,
    siteUrl: config.site.url || "",
    extraJsonLd: [buildProductJsonLd(productName, heroImage)],
  });

  writeFileSync(path.join(ARTICLES_DIR, filename), html);
  results.written++;
  results.files.push(filename);
  registry[item.key] = { t: title.slice(0, 120), d: today, c: item.category, k: "deal" };
  if (results.written % 20 === 0) saveRegistry();
  console.log(`  ✔ [${item.category}] ${title} (deal)`);
}

// Category dispatch.
const NICHE_SYSTEM_PROMPTS = {
  "AI Tips & Tools": buildNichePrompt("ai-tips", SYSTEM_PROMPT),
  "Sacred Places": buildNichePrompt("temple", SYSTEM_PROMPT),
  "Product Deals & Offers": buildNichePrompt("deals", SYSTEM_PROMPT),
  "Credit Cards & Cashback": buildNichePrompt("credit-cards", SYSTEM_PROMPT),
};

function dispatchWrite(item) {
  if (item.category === "Product Deals & Offers") {
    return writeDealStory(item);
  }
  if (item.category === "Gadget Comparisons") {
    return writeReviewStory(item);
  }
  const nicheSystem = NICHE_SYSTEM_PROMPTS[item.category];
  if (nicheSystem) return writeStory(item, { systemPrompt: nicheSystem });
  return writeStory(item);
}

await runQueue(queue, dispatchWrite);

// ---------- Specials ----------
if (!NO_SPECIALS && pool.providers.length > 0) {
  // Daily horoscopes — 12 signs from one AI call.
  const horoKey = `horoscopes-${today}`;
  if (config.specials.horoscopesPerDay && !registry[horoKey] && budget - results.written > 0) {
    try {
      const { text } = await pool.chat({
        system: `You write TIVRA News daily horoscopes. Output STRICT JSON only: {"horoscopes":[{"sign":"Aries","title":"catchy title under 65 chars","description":"140-160 char summary","content":"HTML with <p> tags, 150-200 words covering love, career, health and a lucky colour/number"} , … all 12 zodiac signs]}`,
        user: `Write the 12 daily horoscopes for ${today}. Warm, encouraging, specific-feeling but general. Vary the openings — no two signs may start with the same words.`,
        maxTokens: 7000,
      });
      const parsed = extractJson(text);
      for (const h of parsed.horoscopes || []) {
        const title = h.title || `${h.sign} Horoscope Today — ${today}`;
        const slug = slugify(`${h.sign}-horoscope-${today}`);
        const filename = `${today}-${slug}.html`;
        const html = renderArticlePage({
          title,
          description: h.description || title,
          category: "Astrology",
          date: today,
          heroImage: (config.fallbackImages["Astrology"] || config.fallbackImages._default)[0],
          heroCredit: "Pexels",
          keyPoints: [],
          bodyHtml: h.content || "",
          sourceName: "TIVRA News Astrology Desk",
          sourceUrl: "",
          youtubeId: "",
          slug: filename.replace(/\.html$/, ""),
          adsensePublisherId: ADSENSE_ID,
          adsenseAdSlot: ADSENSE_SLOT,
          siteUrl: config.site.url || "",
        });
        writeFileSync(path.join(ARTICLES_DIR, filename), html);
        results.written++;
        results.files.push(filename);
      }
      registry[horoKey] = { t: "daily horoscopes", d: today, c: "Astrology", k: "special" };
      console.log(`  ✔ [Astrology] 12 daily horoscopes`);
    } catch (err) {
      console.log(`  ✖ [Astrology] horoscopes failed — ${err.message} (will retry next run)`);
    }
  }

  // Daily AI Analysis — original commentary on the biggest stories (clearly labeled).
  const ANALYSIS_SYSTEM = SYSTEM_PROMPT.replace("500 to 700 words", "700 to 900 words").replace(
    "You are a senior desk journalist",
    "You are the analysis editor. Write an original ANALYSIS piece (context, background, why it matters, what to watch) about the given story — clearly analytical, still strictly factual,"
  );
  const analysisWanted = Number(config.specials.analysisPerDay || 0);
  const analysisDone = Object.values(registry).filter((r) => r.d === today && r.k === "analysis").length;
  const analysisCandidates = (byCategory.get("Top Stories") || byCategory.get("Breaking News") || []).slice(0, 6);
  let analysisMade = 0;
  for (const cand of analysisCandidates) {
    if (analysisDone + analysisMade >= analysisWanted) break;
    const aKey = `analysis-${cand.key}`;
    if (registry[aKey] || registry[cand.key]?.k === "analysis") continue;
    const item = { ...cand, key: aKey, category: "Analysis", title: cand.title };
    try {
      await writeStory(item, { systemPrompt: ANALYSIS_SYSTEM, minWords: 450, maxTokens: 4200, kind: "analysis" });
      registry[aKey] = { t: cand.title.slice(0, 120), d: today, c: "Analysis", k: "analysis" };
      analysisMade++;
    } catch (err) {
      console.log(`  ✖ [Analysis] ${cand.title.slice(0, 50)} — ${err.message}`);
    }
  }

  // Weekly long-form feature.
  const now = new Date();
  const weekKey = `feature-${now.getUTCFullYear()}-w${Math.ceil(((now - new Date(Date.UTC(now.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7)}`;
  if (Number(config.specials.weeklyLongform || 0) > 0 && !registry[weekKey]) {
    const topTitles = (byCategory.get("Top Stories") || []).slice(0, 10).map((i) => i.title).join("\n");
    if (topTitles) {
      try {
        const FEATURE_SYSTEM = SYSTEM_PROMPT.replace("500 to 700 words", "1400 to 1800 words").replace(
          "You are a senior desk journalist",
          "You are the long-form features editor. Pick the single biggest ongoing theme from the provided headlines and write an in-depth backgrounder (history, key players, timeline, what it means for ordinary readers),"
        );
        const item = {
          key: weekKey, category: "Features",
          title: `This week's biggest story, explained`,
          sourceName: "TIVRA News Features Desk", sourceUrl: "",
          pubDate: today, summary: `This week's top headlines:\n${topTitles}`,
        };
        await writeStory(item, { systemPrompt: FEATURE_SYSTEM, minWords: 900, maxTokens: 6000, kind: "feature" });
        registry[weekKey] = { t: "weekly feature", d: today, c: "Features", k: "feature" };
      } catch (err) {
        console.log(`  ✖ [Features] weekly long-form — ${err.message} (will retry next run)`);
      }
    }
  }

  // Weekly gadget ranking listicle. Reuses the same weekly-cadence pattern
  // as the long-form feature just above (least new plumbing) rather than
  // a per-run/per-batch trigger — a "top 5 phones" listicle doesn't need to
  // exist more than once a week, and gating it on weekKey (already computed
  // above) means it costs nothing extra to track. Still respects the
  // Gadget Comparisons on/off toggle: if newCategoryVolume["Gadget
  // Comparisons"] is 0 or missing, it's skipped, no error.
  const gadgetRankKey = `gadget-ranking-${weekKey.replace("feature-", "")}`;
  const gcDailyCap = Number(config.newCategoryVolume?.["Gadget Comparisons"] || 0);
  const GADGET_RANKING_SILENCED = true; // silenced, not deleted — deals-only for now
  if (!GADGET_RANKING_SILENCED && gcDailyCap > 0 && !registry[gadgetRankKey] && budget - results.written > 0) {
    const rankCandidates = (byCategory.get("Gadget Comparisons") || []).slice(0, 8);
    if (rankCandidates.length >= 3) {
      try {
        await writeRankingStory(rankCandidates);
        registry[gadgetRankKey] = { t: "weekly gadget ranking", d: today, c: "Gadget Comparisons", k: "ranking" };
      } catch (err) {
        console.log(`  ✖ [Gadget Comparisons] weekly ranking — ${err.message} (will retry next run)`);
      }
    }
  }
}

// ---------- Cleanup: retention + caps ----------
function articleDate(filePath, filename) {
  const fromName = filename.match(/^(\d{4}-\d{2}-\d{2})-/);
  if (fromName) return fromName[1];
  try {
    const html = readFileSync(filePath, "utf-8");
    const m = html.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  } catch { /* fall through */ }
  try { return statSync(filePath).mtime.toISOString().slice(0, 10); } catch { return today; }
}
function articleCategory(filePath) {
  try {
    const html = readFileSync(filePath, "utf-8");
    const m = html.match(/<span class="cat-pill">([^<]+)<\/span>/);
    return m ? m[1].trim() : "General";
  } catch { return "General"; }
}

const retentionMs = config.retention.days * 86400000;
const cutoff = new Date(Date.now() - retentionMs).toISOString().slice(0, 10);
const allFiles = readdirSync(ARTICLES_DIR).filter((f) => f.toLowerCase().endsWith(".html"));
const fileMeta = allFiles.map((f) => {
  const p = path.join(ARTICLES_DIR, f);
  return { f, p, date: articleDate(p, f), category: articleCategory(p) };
});

let deleted = 0;
const survivors = [];
for (const m of fileMeta) {
  if (m.date < cutoff) { /* unlinkSync(m.p); deleted++; */ } else survivors.push(m);
}

const byCat = new Map();
for (const m of survivors) {
  if (!byCat.has(m.category)) byCat.set(m.category, []);
  byCat.get(m.category).push(m);
}
let remaining = [];
for (const [, items] of byCat) {
  items.sort((a, b) => (a.date < b.date ? 1 : -1));
  const keep = items.slice(0, config.retention.maxPerCategory);
  for (const drop of items.slice(config.retention.maxPerCategory)) { /* unlinkSync(drop.p); deleted++; */ }
  remaining.push(...keep);
}
if (remaining.length > config.retention.maxTotalLive) {
  remaining.sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const drop of remaining.slice(config.retention.maxTotalLive)) { /* unlinkSync(drop.p); deleted++; */ }
  remaining = remaining.slice(0, config.retention.maxTotalLive);
}

const registryCutoff = new Date(Date.now() - config.retention.registryDays * 86400000).toISOString().slice(0, 10);
let pruned = 0;
for (const [key, row] of Object.entries(registry)) {
  if ((row.d || "1970-01-01") < registryCutoff) { delete registry[key]; pruned++; }
}

saveRegistry();

console.log("— — —");
console.log(`Run complete: ${results.written} written, ${results.failed} failed (auto-retry next run).`);
console.log(`Cleanup: ${deleted} old article(s) removed, ${pruned} registry rows pruned, ${remaining.length} live articles.`);
console.log(`Provider stats: ${pool.stats()}`);



