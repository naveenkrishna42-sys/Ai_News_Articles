// TIVRA News — Amazon Associates links for gadget articles.
//
// Deliberately conservative. Links are built from the device name string, so
// there is no way for the model to invent a product: the worst case is a
// search page with no results, never a link to the wrong phone. No price or
// stock data is shown anywhere — Amazon's Product Advertising API is the only
// sanctioned source for that, this site does not qualify for it yet, and a
// scraped or model-guessed price would go stale and breach their terms.
//
// A manual override (config.affiliate.products) can point a specific device
// at a real product URL you verified yourself; everything else falls back to
// the search link. Same shape as the manual device-photo override.
//
// Amazon requires the disclosure to be visible wherever links appear, so
// renderBuyBox() always emits it — there is no flag to turn it off.

import { escapeHtml } from "./template.mjs";

const MARKETPLACES = {
  "amazon.in": "https://www.amazon.in",
  "amazon.com": "https://www.amazon.com",
  "amazon.co.uk": "https://www.amazon.co.uk",
};

export const DISCLOSURE =
  "As an Amazon Associate, TIVRA News earns from qualifying purchases. Prices and availability are shown on Amazon and may change.";

function affiliateConfig(config) {
  const a = config?.affiliate || {};
  if (!a.enabled || !a.amazonTag) return null;
  const base = MARKETPLACES[a.marketplace] || MARKETPLACES["amazon.in"];
  return { base, tag: a.amazonTag, products: a.products || {} };
}

/**
 * Buy URL for a device. Manual override first, then a search link.
 * Returns "" when affiliate links are disabled or the name is unusable.
 */
// Table headers and placeholders that are not products. Without this a
// generic column header like "Value" becomes a "Check Value price on Amazon"
// button pointing at a meaningless search.
const NOT_A_PRODUCT = new Set(
  ["spec", "specs", "specification", "specifications", "value", "price", "feature", "features",
   "device a", "device b", "model", "phone", "product", "item", "rank", "verdict", "winner"]
);

export function buyUrl(deviceName, config) {
  const cfg = affiliateConfig(config);
  if (!cfg || !deviceName || deviceName.trim().length < 3) return "";
  if (NOT_A_PRODUCT.has(deviceName.trim().toLowerCase())) return "";
  // A real device name carries a model identifier — a digit or a letter+digit
  // token ("15", "S25", "X7") — which generic prose headings do not.
  if (!/\d/.test(deviceName)) return "";

  const override = cfg.products[deviceName.trim().toLowerCase()];
  if (override) {
    const sep = override.includes("?") ? "&" : "?";
    return `${override}${sep}tag=${encodeURIComponent(cfg.tag)}`;
  }
  return `${cfg.base}/s?k=${encodeURIComponent(deviceName.trim())}&tag=${encodeURIComponent(cfg.tag)}`;
}

/**
 * The buy box shown under a gadget article: one button per device plus the
 * Amazon-required disclosure. Returns "" when disabled, so callers can
 * concatenate it unconditionally.
 */
export function renderBuyBox(deviceNames, config) {
  const cfg = affiliateConfig(config);
  if (!cfg) return "";

  const buttons = (deviceNames || [])
    .filter((n) => n && n.trim().length > 2)
    .map((name) => {
      const url = buyUrl(name, config);
      if (!url) return "";
      return `<a href="${escapeHtml(url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-block;background:#e11d48;color:#fff;font-weight:700;font-size:.9rem;text-decoration:none;padding:11px 18px;border-radius:8px;margin:6px 8px 6px 0;">Check ${escapeHtml(name)} price on Amazon <span style="font-weight:400;opacity:.85;">(paid link)</span></a>`;
    })
    .filter(Boolean);

  if (!buttons.length) return "";

  return `<div class="buybox" style="margin:30px 0;padding:18px 20px;background:#fff;border:1px solid #e2e8f0;border-left:4px solid #e11d48;border-radius:0 12px 12px 0;">
<div style="font-size:.8rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#be123c;margin-bottom:10px;">Where to buy</div>
${buttons.join("")}
<p style="font-size:.75rem;color:#64748b;margin:10px 0 0;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
}
