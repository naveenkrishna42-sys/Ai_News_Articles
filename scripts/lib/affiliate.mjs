// TIVRA News — Affiliate & Partner links (Amazon Associates & CashKaro).
//
// Generates direct, high-converting product & banking action buttons.
// Direct Amazon ASIN dp/ links and verified product search URLs.
// Zero generic CashKaro homepages on physical product deals.

import { escapeHtml } from "./template.mjs";

const MARKETPLACES = {
  "amazon.in": "https://www.amazon.in",
  "amazon.com": "https://www.amazon.com",
  "amazon.co.uk": "https://www.amazon.co.uk",
};

export const DISCLOSURE =
  "As an Amazon Associate, TIVRA News earns from qualifying purchases. Prices, discounts, and availability are subject to change.";

function affiliateConfig(config) {
  const a = config?.affiliate || {};
  if (!a.enabled) return null;
  const base = MARKETPLACES[a.marketplace] || MARKETPLACES["amazon.in"];
  // Removed broken CashKaro URL
  return {
    base,
    tag: a.amazonTag || "sirmohana-21",
    products: a.products || {},
    
  };
}

const NOT_A_PRODUCT = new Set([
  "spec", "specs", "specification", "specifications", "value", "price", "feature", "features",
  "device a", "device b", "model", "phone", "product", "item", "rank", "verdict", "winner"
]);

/**
 * Buy URL for an eCommerce product on Amazon.
 */
export function buyUrl(deviceName, config) {
  const cfg = affiliateConfig(config);
  if (!cfg || !deviceName || deviceName.trim().length < 3) return "";
  if (NOT_A_PRODUCT.has(deviceName.trim().toLowerCase())) return "";
  if (!/\d/.test(deviceName) && deviceName.trim().split(" ").length < 2) return "";

  const cleanName = deviceName.trim();
  const override = cfg.products[cleanName.toLowerCase()];
  if (override) {
    const sep = override.includes("?") ? "&" : "?";
    return `${override}${sep}tag=${encodeURIComponent(cfg.tag)}`;
  }
  return `${cfg.base}/s?k=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(cfg.tag)}`;
}

/**
 * The action / buy box shown under articles.
 * Dynamically tailors the UI to Financial vs Physical Direct Products.
 */
export function renderBuyBox(deviceNames, config, category = "", directUrl = "") {
  const cfg = affiliateConfig(config);
  if (!cfg) return "";

  const catLower = (category || "").toLowerCase();
  const isFinancial = catLower.includes("card") || catLower.includes("cashback") || catLower.includes("bank") || catLower.includes("insurance");

    // 1. FINANCIAL PRODUCTS (Credit Cards, Bank Accounts, Insurance)
  if (isFinancial) {
    if (!directUrl) return ""; // Do not inject broken generic links if no direct deal link exists
    let productName = (deviceNames && deviceNames[0]) || "This Financial Offer";
    if (productName.includes(":")) productName = productName.split(":")[0].trim();
    if (productName.includes(" — ")) productName = productName.split(" — ")[0].trim();
    if (productName.includes(" - ")) productName = productName.split(" - ")[0].trim();
    if (productName.length > 45) productName = productName.slice(0, 45).trim();

    return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #059669;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#047857;margin-bottom:12px;">Verified Offer & Application Details</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(directUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#059669;color:#ffffff;font-weight:700;font-size:.95rem;text-decoration:none;padding:12px 22px;border-radius:8px;transition:background 0.2s;">
    <span>💳 View Verified Offer & Apply Online</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
  }

  // 2. PHYSICAL PRODUCTS & GADGETS (Direct Amazon Product / ASIN Deals)
  const amazonButtons = (deviceNames || [])
    .filter((n) => n && n.trim().length > 2)
    .map((name) => {
      let displayName = name.trim();
      if (displayName.includes(":")) displayName = displayName.split(":")[0].trim();
      if (displayName.includes(" — ")) displayName = displayName.split(" — ")[0].trim();
      if (displayName.includes(" - ")) displayName = displayName.split(" - ")[0].trim();
      if (displayName.length > 40) displayName = displayName.slice(0, 40).trim();

      const url = directUrl || buyUrl(displayName || name, config);
      if (!url) return "";
      
      let storeName = "Amazon";
      let btnColor = "#e11d48";
      if (url.includes("flipkart.com")) { storeName = "Flipkart"; btnColor = "#2874f0"; }
      else if (url.includes("myntra.com")) { storeName = "Myntra"; btnColor = "#ff3f6c"; }
      
      let shortName = displayName.replace(/sale/i, "").replace(/20\d\d/g, "").replace(/flipkart/i, "").replace(/amazon/i, "").trim();
      if (!shortName || shortName.length < 3) shortName = "Deal";
      
      return `<a href="${escapeHtml(url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:${btnColor};color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;margin:6px 8px 6px 0;transition:opacity 0.2s;"><span>🛒 Check ${escapeHtml(shortName)} on ${storeName}</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span></a>`;
    })
    .filter(Boolean);

  if (!amazonButtons.length) return "";

  return `<div class="buybox" style="margin:30px 0;padding:20px 22px;background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #e11d48;border-radius:0 12px 12px 0;box-shadow:0 2px 6px rgba(0,0,0,0.03);">
<div style="font-size:.82rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#be123c;margin-bottom:12px;">Top Offers & Where to Buy</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;">
${amazonButtons.join("")}
</div>
<p style="font-size:.75rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
}
