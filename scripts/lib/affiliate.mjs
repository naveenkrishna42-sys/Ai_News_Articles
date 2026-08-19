// TIVRA News — Affiliate & Partner links (Amazon Associates & CashKaro).
//
// Generates direct, high-converting product & banking/insurance action buttons.
// Credit Cards & Financial products route through CashKaro's banking offers engine.
// Tech & eCommerce products route through Amazon Associates (tag=sirmohana-21).
// Zero raw affiliate parameters or referral IDs are exposed in the button text.

import { escapeHtml } from "./template.mjs";

const MARKETPLACES = {
  "amazon.in": "https://www.amazon.in",
  "amazon.com": "https://www.amazon.com",
  "amazon.co.uk": "https://www.amazon.co.uk",
};

export const DISCLOSURE =
  "As an Amazon Associate and CashKaro partner, TIVRA News earns from qualifying purchases and verified financial applications. Offers, fees, interest rates, and cashback terms are subject to change.";

function affiliateConfig(config) {
  const a = config?.affiliate || {};
  if (!a.enabled) return null;
  const base = MARKETPLACES[a.marketplace] || MARKETPLACES["amazon.in"];
  const cashkaroUrl = a.cashkaro?.referralUrl || a.cashkaroReferral || "https://cashkaro.com?r=22926292&fname=Naveen+Maheswaram";
  const bankingUrl = "https://cashkaro.com/category/banking-finance-offers?r=22926292&fname=Naveen+Maheswaram";
  return {
    base,
    tag: a.amazonTag || "sirmohana-21",
    products: a.products || {},
    cashkaroUrl,
    bankingUrl,
    cashkaroEnabled: a.cashkaro?.enabled !== false,
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

  const override = cfg.products[deviceName.trim().toLowerCase()];
  if (override) {
    const sep = override.includes("?") ? "&" : "?";
    return `${override}${sep}tag=${encodeURIComponent(cfg.tag)}`;
  }
  return `${cfg.base}/s?k=${encodeURIComponent(deviceName.trim())}&tag=${encodeURIComponent(cfg.tag)}`;
}

/**
 * The action / buy box shown under articles.
 * Dynamically tailors the UI to Financial (Credit Cards / Banking / Insurance) vs Physical Products.
 */
export function renderBuyBox(deviceNames, config, category = "") {
  const cfg = affiliateConfig(config);
  if (!cfg) return "";

  const catLower = category.toLowerCase();
  const isFinancial = catLower.includes("card") || catLower.includes("cashback") || catLower.includes("bank") || catLower.includes("insurance");
  const isDeal = catLower.includes("deal") || catLower.includes("offer");

  // 1. FINANCIAL PRODUCTS (Credit Cards, Bank Accounts, Insurance)
  if (isFinancial) {
    let productName = (deviceNames && deviceNames[0]) || "This Card / Financial Offer";
    if (productName.includes(":")) productName = productName.split(":")[0].trim();
    if (productName.includes(" — ")) productName = productName.split(" — ")[0].trim();
    if (productName.includes(" - ")) productName = productName.split(" - ")[0].trim();
    if (productName.length > 45) productName = productName.slice(0, 45).trim();

    return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #059669;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#047857;margin-bottom:12px;">Verified Application & Exclusive Cashback Offer</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(cfg.bankingUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#059669;color:#ffffff;font-weight:700;font-size:.95rem;text-decoration:none;padding:12px 22px;border-radius:8px;transition:background 0.2s;">
    <span>💳 Apply Online & Claim Extra Joining Bonus / Cashback</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
  }

  // 2. PHYSICAL PRODUCTS & GADGETS (Amazon Deals & Gadget Comparisons)
  const amazonButtons = (deviceNames || [])
    .filter((n) => n && n.trim().length > 2)
    .map((name) => {
      let displayName = name.trim();
      if (displayName.includes(":")) displayName = displayName.split(":")[0].trim();
      if (displayName.includes(" — ")) displayName = displayName.split(" — ")[0].trim();
      if (displayName.includes(" - ")) displayName = displayName.split(" - ")[0].trim();
      if (displayName.length > 40) displayName = displayName.slice(0, 40).trim();

      const url = buyUrl(displayName || name, config);
      if (!url) return "";
      return `<a href="${escapeHtml(url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#e11d48;color:#fff;font-weight:700;font-size:.9rem;text-decoration:none;padding:11px 18px;border-radius:8px;margin:6px 8px 6px 0;transition:opacity 0.2s;"><span>🛒 Check ${escapeHtml(displayName)} Price on Amazon</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span></a>`;
    })
    .filter(Boolean);

  let extraCashbackBtn = "";
  if (cfg.cashkaroEnabled && cfg.cashkaroUrl) {
    extraCashbackBtn = `<a href="${escapeHtml(cfg.cashkaroUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#059669;color:#fff;font-weight:700;font-size:.9rem;text-decoration:none;padding:11px 18px;border-radius:8px;margin:6px 8px 6px 0;transition:opacity 0.2s;"><span>💰 Extra Cashback on Store Orders</span></a>`;
  }

  if (!amazonButtons.length && !extraCashbackBtn) return "";

  return `<div class="buybox" style="margin:30px 0;padding:20px 22px;background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #e11d48;border-radius:0 12px 12px 0;box-shadow:0 2px 6px rgba(0,0,0,0.03);">
<div style="font-size:.82rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#be123c;margin-bottom:12px;">Top Offers & Where to Buy</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;">
${amazonButtons.join("")}
${extraCashbackBtn}
</div>
<p style="font-size:.75rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
}
