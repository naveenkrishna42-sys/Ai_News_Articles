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
import { ProviderPool, extractJson } from "./lib/providers.mjs";
import { fetchAllFeeds, storyKey, significantWords, titlesOverlap } from "./lib/feeds.mjs";
import { findImage, findYouTubeVideo } from "./lib/images.mjs";
import { renderArticlePage, slugify } from "./lib/template.mjs";

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

// ---------- Story selection ----------
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

const priority = config.categoryPriority.filter((c) => byCategory.has(c));
for (const c of byCategory.keys()) if (!priority.includes(c)) priority.push(c);

const queue = [];
for (const category of priority) {
  const items = byCategory.get(category) || [];
  let picked = 0;
  for (const item of items) {
    if (picked >= PER_CATEGORY || queue.length >= budget) break;
    if (item.title.length < 25) continue;
    if (isDuplicate(item)) continue;
    claim(item);
    queue.push(item);
    picked++;
  }
}
console.log(`Selected ${queue.length} new stories to write.`);

if (DRY_RUN) {
  for (const q of queue) console.log(`  [${q.category}] ${q.title}`);
  process.exit(0);
}

// ---------- Writing ----------
const SYSTEM_PROMPT = `You are a senior desk journalist at TIVRA News, an Indian digital news outlet. Rewrite the given headline and snippet into an original news article that reads like it was written by an experienced human reporter.

Non-negotiable rules:
- 500 to 700 words. Use 3-5 <h2>/<h3> subheadings and short paragraphs (2-4 sentences).
- Vary sentence length. Active voice. Concrete and direct, never flowery.
- BANNED phrases and habits: "in conclusion", "it is important to note", "delve", "landscape", "furthermore", "moreover", "in today's fast-paced world", "stay tuned", starting consecutive paragraphs the same way.
- NEVER invent quotes, statistics, casualty figures, dates or names that are not in the provided material. If a detail is unknown, write around it ("officials have not yet confirmed…").
- Indian English conventions (lakh/crore where natural). Neutral, factual tone — report, don't editorialise.
- End with one short forward-looking paragraph (what happens next / what to watch).

Output STRICT JSON only, no markdown fences, exactly this shape:
{"title":"SEO headline under 70 chars, no clickbait","description":"news summary, 140-160 chars","key_points":["point 1","point 2","point 3"],"content":"article body HTML using only <h2>,<h3>,<p>,<ul>,<li> tags"}`;

function countWords(html) {
  return html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
}

const results = { written: 0, failed: 0, files: [] };

async function writeStory(item, { systemPrompt = SYSTEM_PROMPT, minWords = 300, maxTokens = 3200, kind = "news" } = {}) {
  const userPrompt = `Headline: ${item.title}\nCategory: ${item.category}\nOriginal reporting by: ${item.sourceName}\nPublished: ${item.pubDate || today}\nSource snippet: ${item.summary || "(headline only — write carefully around unknown details)"}`;

  const { text } = await pool.chat({ system: systemPrompt, user: userPrompt, maxTokens });
  const parsed = extractJson(text);
  const title = (parsed.title || item.title).slice(0, 110);
  const bodyHtml = parsed.content || "";
  if (countWords(bodyHtml) < minWords) throw new Error(`too short (${countWords(bodyHtml)} words)`);

  const [heroImage, youtubeId] = await Promise.all([
    findImage(title, item.category, config.fallbackImages),
    findYouTubeVideo(item.title),
  ]);

  let slug = slugify(title) || slugify(item.title) || `story-${Date.now()}`;
  let filename = `${today}-${slug}.html`;
  let n = 2;
  while (existsSync(path.join(ARTICLES_DIR, filename))) {
    filename = `${today}-${slug}-${n++}.html`;
  }

  const html = renderArticlePage({
    title,
    description: parsed.description || title,
    category: item.category,
    date: today,
    heroImage,
    heroCredit: heroImage.includes("pexels.com") ? "Pexels" : heroImage.includes("pixabay.com") ? "Pixabay" : "",
    keyPoints: parsed.key_points || [],
    bodyHtml,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    youtubeId,
    slug: filename.replace(/\.html$/, ""),
    adsensePublisherId: ADSENSE_ID,
    adsenseAdSlot: ADSENSE_SLOT,
    siteUrl: config.site.url || "",
  });

  writeFileSync(path.join(ARTICLES_DIR, filename), html);
  results.written++;
  results.files.push(filename);
  if (results.written % 20 === 0) saveRegistry();
  console.log(`  ✔ [${item.category}] ${title}`);
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

await runQueue(queue, (item) => writeStory(item));

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
    const m = html.match(/📂\s*([^<]+)</);
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
  if (m.date < cutoff) { unlinkSync(m.p); deleted++; } else survivors.push(m);
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
  for (const drop of items.slice(config.retention.maxPerCategory)) { unlinkSync(drop.p); deleted++; }
  remaining.push(...keep);
}
if (remaining.length > config.retention.maxTotalLive) {
  remaining.sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const drop of remaining.slice(config.retention.maxTotalLive)) { unlinkSync(drop.p); deleted++; }
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
