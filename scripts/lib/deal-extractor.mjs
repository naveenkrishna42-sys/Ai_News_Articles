/**
 * TIVRA News â€” Amazon Direct ASIN & Product Link Resolver
 *
 * Resolves source article URLs (from Google News RSS / tech news feeds)
 * and scans the HTML for real Amazon ASINs (amazon.in/dp/B0XXXXXXXX).
 *
 * If found, returns the direct product URL monetized via Cuelinks (https://linksredirect.com/?cid=316413...)
 * If not found, falls back to targeted product search on Amazon India.
 */


const ASIN_REGEXES = [
  /amazon\.(?:in|com)\/(?:dp|gp\/(?:product|aw\/d)|d)\/([A-Z0-9]{10})/i,
  /data-asin=["']([A-Z0-9]{10})["']/i,
  /["']asin["']\s*:\s*["']([A-Z0-9]{10})["']/i,
  /\/product\/([A-Z0-9]{10})/i
];

export function extractAsinFromHtml(html) {
  if (!html || typeof html !== 'string') return null;
  for (const regex of ASIN_REGEXES) {
    const match = html.match(regex);
    if (match && match[1] && match[1].length === 10) {
      return match[1].toUpperCase();
    }
  }
  return null;
}

const CLEAN_NAME_REGEX = /^(.*?)(?:\s*[:â€”â€“-]\s*(?:price|specs|launch|deal|discount|sale|review|unveil|offers|buy).*$)/i;

/**
 * Clean product name from noisy news headlines
 */
export function extractCleanProductName(headline) {
  if (!headline) return "";
  let clean = String(headline).trim();

  // 1. Strip conversational lead-ins
  clean = clean
    .replace(/^(?:these\s+are\s+the\s+(?:\d+\s+)?|the\s+retired\s+|the\s+best\s+|you\s+don['’]t\s+need\s+[^.]+\.\s*(?:these\s+)?|inside\s+|deal\s+alert:\s*|amazon\s+sale:\s*|flipkart\s+sale:\s*)/i, "")
    .trim();

  // 2. If colon or dash separates product name from action
  for (const sep of [":", " — ", " – ", " - "]) {
    if (clean.includes(sep)) {
      const left = clean.split(sep)[0].trim();
      if (left.length >= 3 && left.length <= 45) {
        clean = left;
        break;
      }
    }
  }

  // 3. Split before deal action verbs
  clean = clean.split(/\s+(?:drops?\s+to|falls?\s+to|slashed\s+to|hits?\s+(?:a\s+)?(?:new|record|lowest)|gets?\s+a\s+|is\s+(?:now\s+)?(?:down|available|on\s+sale)|are\s+starting|earlier\s+than|worth\s+snatching|can\s+handle|unveils?\s+debut|at\s+lowest\s+price)\b/i)[0].trim();

  // 4. Strip noisy deal buzzwords and price suffixes
  clean = clean
    .replace(/\b(?:black\s+friday|cyber\s+monday|prime\s+day|big\s+billion\s+days|great\s+indian\s+festival|deals?|sales?|offers?|discounts?|price\s+in\s+india.*|price\s+cut.*|price\s+drop.*|under\s+(?:rs\.?|₹|\$)\s*\d+.*|for\s+(?:rs\.?|₹|\$)\s*\d+.*|editor-tested|review|analyzed|unpacked)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If generic deal headline collapses to only year/preposition filler, return clean commercial search query
  if (!clean || clean.length < 3 || /^for\s+202\d$/i.test(clean)) {
    return "Tech Deals";
  }

  // 5. Cap at 6 words max so Amazon search queries stay tight and high-converting
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 6) {
    clean = words.slice(0, 6).join(" ");
  }

  return clean.length >= 3 ? clean.slice(0, 45).trim() : String(headline).slice(0, 35).trim();
}

/**
 * Resolves Google News RSS redirect to the original publisher page
 */
export async function resolveOriginalUrl(sourceUrl, timeoutMs = 3500) {
  if (!sourceUrl || !sourceUrl.includes("news.google.com")) {
    return sourceUrl;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(sourceUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });
    return res.url || sourceUrl;
  } catch {
    return sourceUrl;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Scans article HTML for real Amazon ASINs
 */
export async function fetchAsinFromArticle(articleUrl, timeoutMs = 3500) {
  if (!articleUrl || articleUrl.includes("news.google.com")) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(articleUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const html = await res.text();

    const asin = extractAsinFromHtml(html);
    if (asin) return asin;
  } catch {
    // Network / timeout fallback
  } finally {
    clearTimeout(timeout);
  }
  return null;
}

/**
 * Resolves the best direct Amazon URL:
 * 1. Checks config overrides first
 * 2. Attempts to extract real ASIN from source article (https://www.amazon.in/dp/ASIN?tag=...)
 * 3. Falls back to targeted product search on Amazon India
 */

function getCuelinksApiKey() {
  return (process.env.CUELINKS_API_KEY || process.env.CUELINKS_BEARER_TOKEN || "").trim();
}
const CUELINKS_REGEX = /(?:flipkart\.com|fkrt\.it|myntra\.com|croma\.com|tatacliq\.com|nykaa\.com|vijaysales\.com|boat-lifestyle\.com)\/[^\s'"]+/i;

/**
 * Scans article HTML for Cuelinks-supported merchants and converts them via V3 API
 */
export async function fetchCuelinksUrlFromArticle(articleUrl, timeoutMs = 4500) {
  const cuelinksApiKey = getCuelinksApiKey();
  if (!cuelinksApiKey || !articleUrl || articleUrl.includes("news.google.com")) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(articleUrl, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(CUELINKS_REGEX);
    
    if (match && match[0]) {
      const rawUrl = "https://www." + match[0];
      
      // Convert via Cuelinks V3 API
      const apiRes = await fetch("https://developers.cuelinks.com/pub_api/v3/links/convert", {
        method: "POST",
        headers: {
          "Authorization": "Token " + cuelinksApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: rawUrl }),
        signal: controller.signal
      });
      
      if (apiRes.ok) {
        const data = await apiRes.json();
        return (data.data && data.data.tracking_url) ? data.data.tracking_url : (data.tracking_url || null);
      }
    }
  } catch {
    // Silent fallback
  } finally {
    clearTimeout(timeout);
  }
  return null;
}

import fs from "fs";
import path from "path";

function getAffiliateConfig() {
  try {
    const p = path.resolve("config/news-config.json");
    if (fs.existsSync(p)) {
      const cfg = JSON.parse(fs.readFileSync(p, "utf-8"));
      return cfg.affiliate || {};
    }
  } catch {
    // fallback
  }
  return {};
}

const _affCfg = getAffiliateConfig();

const CUELINKS_CID = process.env.CUELINKS_CID || _affCfg.cuelinks?.cid || "316413";
const DEFAULT_AMAZON_TAG = process.env.AMAZON_AFFILIATE_TAG || _affCfg.amazonTag || "sirmohana-21";

function buildCuelinksRedirect(url, subid = "tivra_deals") {
  return `https://linksredirect.com/?cid=${CUELINKS_CID}&subid=${encodeURIComponent(subid)}&source=api&url=${encodeURIComponent(url)}`;
}

export async function getBestMonetizedUrl(item, productName, amazonTag = DEFAULT_AMAZON_TAG, configOverrides = {}) {
  const tag = amazonTag || DEFAULT_AMAZON_TAG;
  const cleanName = extractCleanProductName(productName || item?.title || "");

  // 1. Config override check
  if (configOverrides[cleanName.toLowerCase()]) {
    const override = configOverrides[cleanName.toLowerCase()];
    return buildCuelinksRedirect(override);
  }

  // 2. Attempt URL resolution from sourceUrl
  if (item?.sourceUrl) {
    try {
      const realUrl = await resolveOriginalUrl(item.sourceUrl, 2500);
      if (realUrl && realUrl !== item.sourceUrl) {
        // Try Cuelinks (Flipkart, Myntra, Croma) FIRST
        const cuelinksUrl = await fetchCuelinksUrlFromArticle(realUrl, 3000);
        if (cuelinksUrl) return cuelinksUrl;

        // Fallback to direct Amazon ASIN with OneLink tag
        const asin = await fetchAsinFromArticle(realUrl, 2500);
        if (asin) {
          return `https://www.amazon.in/dp/${asin}?tag=${encodeURIComponent(tag)}`;
        }
      }
    } catch {
      // Fall through to search URL
    }
  }

  // 3. Fallback to clean search URL (Direct Amazon tag or Cuelinks Flipkart)
  if (cleanName.toLowerCase().includes("flipkart") || (item && item.title && item.title.toLowerCase().includes("flipkart"))) {
    return buildCuelinksRedirect(`https://www.flipkart.com/search?q=${encodeURIComponent(cleanName)}`);
  }
  return `https://www.amazon.in/s?k=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(tag)}`;
}


