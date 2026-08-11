// TIVRA News — gadget/phone image cascade orchestrator.
// Sits alongside ../images.mjs (the general Pexels/Pixabay cascade for
// regular news stories). This one is specific to gadget comparison
// articles: manual override folder first, then free-licence photo APIs on
// the exact device name, then a query-degradation retry of those same
// APIs, then the old images.mjs cascade as the final catch-all.
//
// Every branch returns the shared {url,width,height,license,author,
// sourceUrl,provider} contract or null. Never throws.

import * as manual from "./manual.mjs";
import * as wikimedia from "./wikimedia.mjs";
import * as openverse from "./openverse.mjs";
import * as unsplash from "./unsplash.mjs";
import { findImage, mediaPreflight } from "../images.mjs";

// Per-run cache: same (deviceSlug, category) queried twice in one process
// only hits the network once. Cleared naturally when the process exits —
// no cross-run persistence needed (each cron run is a fresh process).
const cache = new Map();

// Providers tried on the exact device name, then again (if all miss) on
// the degraded query. Order matches the blueprint: Wikimedia (Commons,
// most reliable for gadgets) -> Openverse (broad CC index) -> Unsplash
// (needs a key, often skipped).
const CASCADE_PROVIDERS = [wikimedia, openverse, unsplash];

// Query degradation ladder. A free-tier LLM's `deviceName` field will
// realistically look like "Samsung Galaxy S24 Ultra 256GB Titanium Grey"
// or plainly "Samsung Galaxy S24 Ultra" — simple heuristic string ops are
// enough, no NLP needed:
//
//   1. Drop a trailing storage/color variant suffix, if present. We detect
//      this by finding a token that looks like a storage size (e.g. "256GB",
//      "1TB") and cutting the string there — everything after it (colors,
//      trim names) goes with it. If no storage token is found, this step is
//      a no-op and we fall through to step 2 with the same string.
//   2. Brand + product line only: drop the last word IF the device name has
//      4+ words (assumed to be a variant/tier suffix like "Ultra", "Pro
//      Max", "Plus"). E.g. "Samsung Galaxy S24 Ultra" -> "Samsung Galaxy
//      S24". This is intentionally crude — the goal is a broader query that
//      still names the actual product line, not a perfect parse.
//   3. Brand + category: first word of deviceName (assumed brand) + the
//      category name, e.g. "Samsung" + "smartphone" -> "Samsung
//      smartphone". Last resort before giving up on the API cascade
//      entirely and handing off to images.mjs.
//
// Returns an ARRAY of candidate degraded queries to try in order (steps 1,
// then 2, then 3), deduplicated, so the caller can stop at the first hit.
export function degradeQuery(deviceName, category) {
  const name = (deviceName || "").trim();
  if (!name) return [];

  const candidates = [];
  const words = name.split(/\s+/);

  // Step 1: drop storage/color variant suffix. Storage tokens look like
  // "256GB", "1TB", "128 GB". Cut the string at the first such token.
  const storageIdx = words.findIndex((w) => /^\d+\s?(?:GB|TB)$/i.test(w));
  if (storageIdx > 0) {
    candidates.push(words.slice(0, storageIdx).join(" "));
  }

  // Step 2: brand + product line — drop a trailing tier word if the name
  // has 4+ words (e.g. "Samsung Galaxy S24 Ultra" -> "Samsung Galaxy S24").
  // Apply this to the ORIGINAL name, not the step-1 result, since step 1
  // may not have fired.
  const baseWords = storageIdx > 0 ? words.slice(0, storageIdx) : words;
  if (baseWords.length >= 4) {
    candidates.push(baseWords.slice(0, -1).join(" "));
  } else if (baseWords.length >= 2 && storageIdx > 0) {
    // Storage suffix already stripped a variant; the shortened name itself
    // counts as a valid step-2-equivalent candidate if not already queued.
    candidates.push(baseWords.join(" "));
  }

  // Step 3: brand + category — first word only, assumed to be the brand.
  const brand = words[0];
  if (brand && category) {
    candidates.push(`${brand} ${category}`);
  }

  // Dedupe while preserving order, drop anything identical to the
  // original exact name (that was already tried in the first pass).
  const seen = new Set([name.toLowerCase()]);
  const out = [];
  for (const c of candidates) {
    const key = c.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(c.trim());
  }
  return out;
}

// Try wikimedia -> openverse -> unsplash, in order, for a single query
// string. Returns the first non-null result, or null if all miss.
async function tryCascade(query) {
  for (const provider of CASCADE_PROVIDERS) {
    const result = await provider.search(query);
    if (result) return result;
  }
  return null;
}

export async function findDeviceImage({ deviceName, deviceSlug, category, fallbackImages }) {
  const cacheKey = `${deviceSlug || ""}::${category || ""}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const result = await findDeviceImageUncached({ deviceName, deviceSlug, category, fallbackImages });
  cache.set(cacheKey, result);
  return result;
}

async function findDeviceImageUncached({ deviceName, deviceSlug, category, fallbackImages }) {
  try {
    // 1. Manual override always wins.
    const manualHit = await manual.search(deviceSlug);
    if (manualHit) {
      console.log(`Device image [${deviceSlug}]: Manual override`);
      return manualHit;
    }

    // 2-4. Exact device name across the API cascade.
    if (deviceName) {
      const exactHit = await tryCascade(deviceName);
      if (exactHit) {
        console.log(`Device image [${deviceSlug}]: ${exactHit.provider} (exact: "${deviceName}")`);
        return exactHit;
      }

      // 5. Query degradation — retry the same three providers, one
      // degraded query at a time, stopping at the first hit.
      const degraded = degradeQuery(deviceName, category);
      for (const query of degraded) {
        const hit = await tryCascade(query);
        if (hit) {
          console.log(`Device image [${deviceSlug}]: ${hit.provider} (degraded: "${query}")`);
          return hit;
        }
      }
    }

    // 6. Final catch-all: the existing general-purpose stock cascade.
    const url = await findImage(deviceName || category, category, fallbackImages || {});
    if (url) {
      console.log(`Device image [${deviceSlug}]: Stock fallback (images.mjs)`);
      return {
        url,
        width: 0,
        height: 0,
        license: "Free commercial use",
        author: "",
        sourceUrl: "",
        provider: "Stock",
      };
    }

    console.log(`Device image [${deviceSlug}]: no image found (all providers missed)`);
    return null;
  } catch (e) {
    console.log(`Device image [${deviceSlug}]: FAILED (${e.message})`);
    return null;
  }
}

export async function preflight() {
  const report = [];
  report.push(await manual.preflight());
  report.push(await wikimedia.preflight());
  report.push(await openverse.preflight());
  report.push(await unsplash.preflight());
  report.push(...(await mediaPreflight()));
  return report;
}
