// TIVRA News — RSS aggregation.
// Pulls every configured Google News feed in parallel and returns clean,
// deduplicated story candidates. Categorization is free: it comes from
// which feed a story arrived on. No AI is spent here.

import crypto from "node:crypto";

const FETCH_TIMEOUT_MS = 15_000;

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function tagContent(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return "";
  return decodeEntities(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).trim();
}

// Normalized title hash — the permanent identity of a story. Stopwords and
// punctuation are stripped so minor headline edits don't create "new" stories.
const STOPWORDS = new Set(
  "a an the of in on at to for with and or as is are was were be by from into over after before his her its their this that these those says said".split(" ")
);

export function storyKey(title) {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .sort();
  return crypto.createHash("md5").update(words.join("-")).digest("hex").slice(0, 16);
}

// Fuzzy same-story check used within one run (catches reworded headlines the
// exact-hash misses). >60% significant-word overlap = same story.
export function significantWords(title) {
  return new Set(
    title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOPWORDS.has(w))
  );
}

export function titlesOverlap(aWords, bWords) {
  if (aWords.size === 0 || bWords.size === 0) return false;
  let shared = 0;
  for (const w of aWords) if (bWords.has(w)) shared++;
  return shared / Math.min(aWords.size, bWords.size) > 0.6;
}

async function fetchFeed(feed) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(feed.url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (TIVRA News aggregator)" },
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return [];
    const xml = await res.text();

    const items = [];
    const itemBlocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
    for (const block of itemBlocks.slice(0, 40)) {
      let title = tagContent(block, "title");
      if (!title) continue;
      // Google News appends " - Publisher" to titles; keep the publisher as
      // the source name and strip it from the headline.
      let sourceName = tagContent(block, "source") || "";
      if (title.includes(" - ")) {
        const parts = title.split(" - ");
        if (!sourceName) sourceName = parts[parts.length - 1].trim();
        title = parts.slice(0, -1).join(" - ").trim();
      }
      const link = tagContent(block, "link");
      const pubDate = tagContent(block, "pubDate");
      const description = tagContent(block, "description").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

      const maxAgeHours = feed.maxAgeHours || 72; // Default strict 72h (3 days) freshness threshold
      if (pubDate) {
        const ageMs = Date.now() - new Date(pubDate).getTime();
        if (Number.isFinite(ageMs) && ageMs > maxAgeHours * 3600_000) continue;
      }

      items.push({
        key: storyKey(title),
        title,
        sourceName: sourceName || "News agencies",
        sourceUrl: link,
        category: feed.category,
        pubDate,
        summary: description.slice(0, 600),
      });
    }
    return items;
  } catch {
    return []; // one dead feed never blocks the run
  }
}

export async function fetchAllFeeds(feeds) {
  const results = await Promise.all(feeds.map(fetchFeed));
  const byCategory = new Map();
  for (const feed of feeds) if (!byCategory.has(feed.category)) byCategory.set(feed.category, []);
  results.forEach((items, i) => {
    byCategory.get(feeds[i].category).push(...items);
  });
  return byCategory;
}
