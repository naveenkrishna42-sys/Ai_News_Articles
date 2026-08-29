import fs from 'fs';

const filepath = 'scripts/lib/deal-extractor.mjs';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Rename getBestAmazonUrl to getBestMonetizedUrl
content = content.replace(/export async function getBestAmazonUrl/g, 'export async function getBestMonetizedUrl');

// 2. Add Cuelinks conversion logic
const cuelinksCode = `
const CUELINKS_API_KEY = "xnrsT6vr3TP64MM7FSvCvdwY2jvD_jLrwU7B0zXvReI";
const CUELINKS_REGEX = /(?:flipkart\\.com|fkrt\\.it|myntra\\.com|croma\\.com)\\/[^\\s'"]+/i;

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
        return data.tracking_url || null;
      }
    }
  } catch {
    // Silent fallback
  } finally {
    clearTimeout(timeout);
  }
  return null;
}
`;

// Insert the code just before getBestMonetizedUrl
content = content.replace('export async function getBestMonetizedUrl', cuelinksCode + '\nexport async function getBestMonetizedUrl');

// 3. Update getBestMonetizedUrl logic to use Cuelinks first
const oldLogic = `  // 2. Attempt ASIN resolution from sourceUrl
  if (item?.sourceUrl) {
    try {
      const realUrl = await resolveOriginalUrl(item.sourceUrl, 2500);
      if (realUrl && realUrl !== item.sourceUrl) {
        const asin = await fetchAsinFromArticle(realUrl, 2500);
        if (asin) {
          return \`https://www.amazon.in/dp/\${asin}?tag=\${encodeURIComponent(amazonTag)}\`;
        }
      }
    } catch {
      // Fall through to search URL
    }
  }`;

const newLogic = `  // 2. Attempt URL resolution from sourceUrl
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
          return \`https://www.amazon.in/dp/\${asin}?tag=\${encodeURIComponent(amazonTag)}\`;
        }
      }
    } catch {
      // Fall through to search URL
    }
  }`;

content = content.replace(oldLogic, newLogic);

fs.writeFileSync(filepath, content, 'utf8');
console.log('Modified deal-extractor.mjs');
