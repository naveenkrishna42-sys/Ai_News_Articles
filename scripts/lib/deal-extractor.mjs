/**
 * TIVRA News — Amazon Direct ASIN & Product Link Resolver
 *
 * Resolves source article URLs (from Google News RSS / tech news feeds)
 * and scans the HTML for real Amazon ASINs (amazon.in/dp/B0XXXXXXXX).
 *
 * If found, returns the direct product URL: https://www.amazon.in/dp/ASIN?tag=sirmohana-21
 * If not found, falls back to targeted product search on Amazon India.
 */

const ASIN_REGEX = /amazon\.in\/(?:dp|gp\/product|d)\/([A-Z0-9]{10})/i;
const CLEAN_NAME_REGEX = /^(.*?)(?:\s*[:—–-]\s*(?:price|specs|launch|deal|discount|sale|review|unveil|offers|buy).*$)/i;

/**
 * Clean product name from noisy news headlines
 */
export function extractCleanProductName(headline) {
  if (!headline) return "";
  let clean = headline.trim();

  // If colon or dash separates the product name from the action
  if (clean.includes(":")) {
    const left = clean.split(":")[0].trim();
    if (left.length >= 4 && left.length <= 40) clean = left;
  } else if (clean.includes(" — ")) {
    const left = clean.split(" — ")[0].trim();
    if (left.length >= 4 && left.length <= 40) clean = left;
  } else if (clean.includes(" - ")) {
    const left = clean.split(" - ")[0].trim();
    if (left.length >= 4 && left.length <= 40) clean = left;
  }

  // Strip common noisy prefix/suffixes
  clean = clean
    .replace(/^deal alert:\s*/i, "")
    .replace(/^amazon sale:\s*/i, "")
    .replace(/^flipkart sale:\s*/i, "")
    .replace(/\s+price in india.*$/i, "")
    .replace(/\s+price cut.*$/i, "")
    .replace(/\s+price drop.*$/i, "")
    .replace(/\s+discount.*$/i, "")
    .replace(/\s+under rs.*$/i, "")
    .replace(/\s+under ₹.*$/i, "")
    .trim();

  return clean.length >= 3 ? clean : headline.slice(0, 40).trim();
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

    const match = html.match(ASIN_REGEX);
    if (match && match[1] && match[1].length === 10) {
      return match[1].toUpperCase();
    }
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
export async function getBestAmazonUrl(item, productName, amazonTag = "sirmohana-21", configOverrides = {}) {
  const cleanName = extractCleanProductName(productName || item?.title || "");

  // 1. Config override check
  if (configOverrides[cleanName.toLowerCase()]) {
    const override = configOverrides[cleanName.toLowerCase()];
    const sep = override.includes("?") ? "&" : "?";
    return `${override}${sep}tag=${encodeURIComponent(amazonTag)}`;
  }

  // 2. Attempt ASIN resolution from sourceUrl
  if (item?.sourceUrl) {
    try {
      const realUrl = await resolveOriginalUrl(item.sourceUrl, 2500);
      if (realUrl && realUrl !== item.sourceUrl) {
        const asin = await fetchAsinFromArticle(realUrl, 2500);
        if (asin) {
          return `https://www.amazon.in/dp/${asin}?tag=${encodeURIComponent(amazonTag)}`;
        }
      }
    } catch {
      // Fall through to search URL
    }
  }

  // 3. Fallback to clean Amazon search URL
  return `https://www.amazon.in/s?k=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(amazonTag)}`;
}
