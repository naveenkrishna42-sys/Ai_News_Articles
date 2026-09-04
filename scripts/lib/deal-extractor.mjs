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
  let clean = headline.trim();

  // If colon or dash separates the product name from the action
  if (clean.includes(":")) {
    const left = clean.split(":")[0].trim();
    if (left.length >= 4 && left.length <= 40) clean = left;
  } else if (clean.includes(" â€” ")) {
    const left = clean.split(" â€” ")[0].trim();
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
    .replace(/\s+under â‚¹.*$/i, "")
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

const CUELINKS_API_KEY = "xnrsT6vr3TP64MM7FSvCvdwY2jvD_jLrwU7B0zXvReI";
const CUELINKS_REGEX = /(?:flipkart\.com|fkrt\.it|myntra\.com|croma\.com)\/[^\s'"]+/i;

/**
 * Scans article HTML for Cuelinks-supported merchants and converts them via V3 API
 */
export async function fetchCuelinksUrlFromArticle(articleUrl, timeoutMs = 4500) {
  if (!articleUrl || articleUrl.includes("news.google.com")) return null;
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
          "Authorization": "Token " + CUELINKS_API_KEY,
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

const CUELINKS_CID = "316413";

function buildCuelinksRedirect(url) {
  return `https://linksredirect.com/?cid=${CUELINKS_CID}&source=api&url=${encodeURIComponent(url)}`;
}

export async function getBestMonetizedUrl(item, productName, _amazonTag = "", configOverrides = {}) {
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

        // Fallback to Amazon ASIN
        const asin = await fetchAsinFromArticle(realUrl, 2500);
        if (asin) {
          return buildCuelinksRedirect(`https://www.amazon.in/dp/${asin}`);
        }
      }
    } catch {
      // Fall through to search URL
    }
  }

  // 3. Fallback to clean search URL monetized via Cuelinks
  if (cleanName.toLowerCase().includes("flipkart") || (item && item.title && item.title.toLowerCase().includes("flipkart"))) {
    return buildCuelinksRedirect(`https://www.flipkart.com/search?q=${encodeURIComponent(cleanName)}`);
  }
  return buildCuelinksRedirect(`https://www.amazon.in/s?k=${encodeURIComponent(cleanName)}`);
}


