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

const UNMONETIZABLE_REGIONAL_PATTERN = /\b(?:verizon|at&t|t-mobile|mint\s+mobile|visible\s+wireless|xfinity\s+mobile|boost\s+mobile|cricket\s+wireless|walmart|best\s+buy|costco|sam['’]?s\s+club|kohl['’]?s|macy['’]?s|nordstrom|home\s+depot|lowe['’]?s|b&h\s+photo|micro\s+center|gamestop|hulu|paramount\+|peacock|sling\s+tv|fubo|directv|espn\+|new\s+england\s+(?:black\s+friday|hotel)|sandals\s*(?:&|and)?\s*beaches|disney\s+(?:world|land|destination))\b/i;

const US_STREAMING_BUNDLE_PATTERN = /\b(?:streaming\s+deals?.*\b(?:max|apple\s+tv\+|paramount|hulu|peacock)|\b(?:max|paramount\+|hulu|peacock)\b.*streaming\s+deals?)\b/i;

/**
 * Filters out hyper-local / carrier-locked / US-only brick-and-mortar or streaming deals
 * in commercial categories while allowing global hardware & Amazon tech deals (Option A).
 */
export function isUnmonetizableRegionalDeal(title = "", summary = "", category = "") {
  const cat = String(category || "").trim();
  const commercialCats = new Set([
    "Product Deals & Offers",
    "Credit Cards & Cashback",
    "Gadget Comparisons",
  ]);
  if (cat && !commercialCats.has(cat)) return false;

  const combined = `${title} ${summary}`;
  if (UNMONETIZABLE_REGIONAL_PATTERN.test(title) || US_STREAMING_BUNDLE_PATTERN.test(title)) {
    return true;
  }
  if (/\b(?:verizon|at&t|t-mobile)\s+(?:trade-in|bill\s+credits?|new\s+line)\b/i.test(combined)) {
    return true;
  }
  return false;
}

const EDITORIAL_PREFIX_ONLY = /^(?:tivra\s+alert|deal\s+alert|amazon\s+sale|flipkart\s+sale|early\s+black\s+friday(?:\s+202\d)?|black\s+friday(?:\s+202\d)?|cyber\s+monday(?:\s+202\d)?|buyer['’]?s\s+guide|strategic\s+guide|expert\s+guide|prepare\s+for\s+\w+)$/i;

const CONVERSATIONAL_FRAGMENT = /^(?:i\s+|we\s+|you\s+|this\s+|these\s+|that\s+|why\s+|how\s+|what\s+|when\s+|where\s+|who\s+|is\s+|are\s+|can\s+|should\s+|staring\s+|prepare\s+|impressive\s+|ultimate\s+|decode\s+|decoding\s+|navigating\s+|maximizing\s+|evaluating\s+|unpacking\s+|anticipating\s+|exploring\s+|\[award)/i;

/**
 * Clean product name from noisy news headlines
 */
export function extractCleanProductName(headline) {
  if (!headline) return "";
  const rawHeadline = String(headline).trim();
  let clean = rawHeadline;

  // 1. Strip conversational lead-ins
  clean = clean
    .replace(/^(?:tivra\s+alert:\s*|deal\s+alert:\s*|amazon\s+sale:\s*|flipkart\s+sale:\s*|buyer['’]?s\s+guide:\s*|these\s+are\s+the\s+(?:\d+\s+)?|the\s+retired\s+|the\s+best\s+|you\s+don['’]t\s+need\s+[^.]+\.\s*(?:these\s+)?|inside\s+)/i, "")
    .trim();

  // 2. If colon or dash separates product name from action, pick the product side
  for (const sep of [":", " — ", " – ", " - "]) {
    if (clean.includes(sep)) {
      const parts = clean.split(sep).map((s) => s.trim()).filter(Boolean);
      const left = parts[0] || "";
      const right = parts[1] || "";
      if (EDITORIAL_PREFIX_ONLY.test(left) && right.length >= 3) {
        clean = right;
        break;
      }
      if (left.length >= 3 && left.length <= 55) {
        clean = left;
        break;
      }
    }
  }

  // 3. Split before deal action verbs
  clean = clean.split(/\s+(?:drops?\s+to|falls?\s+to|slashed\s+to|slashes\s+|hits?\s+(?:a\s+)?(?:new|record|lowest|\$|\d)|gets?\s+a\s+|is\s+(?:now\s+)?(?:down|available|on\s+sale|this|it)|are\s+(?:starting|they)|earlier\s+than|worth\s+(?:snatching|buying|it|booking)|can\s+handle|unveils?\s+debut|at\s+(?:lowest\s+price|up\s+to))\b/i)[0].trim();

  // 4. Strip noisy sale events, standalone years, editorial nouns, and price suffixes
  clean = clean
    .replace(/\b(?:pre-black\s+friday|early\s+black\s+friday|black\s+friday|cyber\s+monday|prime\s+day|big\s+billion\s+days|great\s+indian\s+festival|festive\s+sale|diwali\s+sale|mega[- ]sale|deals?|sales?|offers?|discounts?|price\s+in\s+india.*|price\s+cut.*|price\s+drop.*|under\s+(?:rs\.?|₹|\$)\s*[\d,]+.*|for\s+(?:rs\.?|₹|\$)\s*[\d,]+.*|starting\s+at\s+(?:rs\.?|₹|\$)\s*[\d,]+.*|editor-tested|full\s+review|value\s+review|price\s+review|deal\s+review|review|analyzed|unpacked|decoded|outlook|roundup|buying\s+guide|buyer['’]?s\s+guide|guide|value\s+analysis|analysis|forecast|strategies|strategy|what\s+to\s+expect)\b/gi, " ")
    .replace(/\b202\d\b/g, " ")
    .replace(/^['"‘’“”:\-\s]+|['"‘’“”:\-\s]+$/g, "")
    .replace(/\b(?:for|in|on|at|of|from|with|and|&|the|a|an)\s*$/i, "")
    .replace(/^(?:early|new|top|best)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Recover parent brand when sub-brand "Pixel" stands alone in a Google Pixel headline
  if (/^pixel(?:\s+\d+|\s+pro|\s+watch|\s+buds|\s+fold|\s+tablet|$)/i.test(clean) && !/\bgoogle\b/i.test(clean) && /\bgoogle\b/i.test(rawHeadline)) {
    clean = `Google ${clean}`;
  }

  // Reject conversational fragments or generic filler
  if (
    !clean ||
    clean.length < 3 ||
    CONVERSATIONAL_FRAGMENT.test(clean) ||
    /^(?:for|in|on|tech|premium\s+tech|smart\s+buys|holiday\s+savings)$/i.test(clean)
  ) {
    return "Tech Deals";
  }

  // 5. Cap at 6 words max so Amazon search queries stay tight and high-converting
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 6) {
    clean = words.slice(0, 6).join(" ");
  }

  return clean.length >= 3 ? clean.slice(0, 45).trim() : "Tech Deals";
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


