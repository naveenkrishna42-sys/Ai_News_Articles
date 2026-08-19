// TIVRA News — Affiliate & Partner links (Amazon Associates & CashKaro).
//
// Links are constructed safely to prevent invalid redirects.
// Amazon buttons search or deep-link with tag=sirmohana-21.
// CashKaro buttons provide cashback opportunities without exposing raw parameter strings in UI text.
// Disclosures are cleanly appended for regulatory compliance.

import { escapeHtml } from "./template.mjs";

const MARKETPLACES = {
  "amazon.in": "https://www.amazon.in",
  "amazon.com": "https://www.amazon.com",
  "amazon.co.uk": "https://www.amazon.co.uk",
};

export const DISCLOSURE =
  "As an Amazon Associate and CashKaro partner, TIVRA News earns from qualifying purchases and applications. Prices, cashback rates, and availability are subject to change.";

function affiliateConfig(config) {
  const a = config?.affiliate || {};
  if (!a.enabled) return null;
  const base = MARKETPLACES[a.marketplace] || MARKETPLACES["amazon.in"];
  const cashkaroUrl = a.cashkaro?.referralUrl || a.cashkaroReferral || "https://cashkaro.com?r=22926292&fname=Naveen+Maheswaram";
  return {
    base,
    tag: a.amazonTag || "sirmohana-21",
    products: a.products || {},
    cashkaroUrl,
    cashkaroEnabled: a.cashkaro?.enabled !== false,
  };
}

const NOT_A_PRODUCT = new Set([
  "spec", "specs", "specification", "specifications", "value", "price", "feature", "features",
  "device a", "device b", "model", "phone", "product", "item", "rank", "verdict", "winner"
]);

/**
 * Buy URL for a device or product on Amazon.
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
 * CashKaro Cashback Action URL
 */
export function cashkaroUrl(config) {
  const cfg = affiliateConfig(config);
  return cfg?.cashkaroUrl || "";
}

/**
 * The buy / deals box shown under gadget, deals, and credit card articles.
 */
export function renderBuyBox(deviceNames, config, category = "") {
  const cfg = affiliateConfig(config);
  if (!cfg) return "";

  const isFinancial = category.toLowerCase().includes("card") || category.toLowerCase().includes("cashback") || category.toLowerCase().includes("bank");
  const isDeal = category.toLowerCase().includes("deal") || category.toLowerCase().includes("offer");

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
      return `<a href="${escapeHtml(url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#e11d48;color:#fff;font-weight:700;font-size:.9rem;text-decoration:none;padding:11px 18px;border-radius:8px;margin:6px 8px 6px 0;transition:opacity 0.2s;"><span>🛒 Check ${escapeHtml(displayName)} on Amazon</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span></a>`;
    })
    .filter(Boolean);

  let cashkaroButton = "";
  if (cfg.cashkaroEnabled && cfg.cashkaroUrl) {
    const label = isFinancial
      ? "💳 Apply & Claim Extra Cashback via CashKaro"
      : isDeal
      ? "🎁 Get Extra Cashback on Deals via CashKaro"
      : "💰 Get Extra Cashback & Coupons via CashKaro";

    cashkaroButton = `<a href="${escapeHtml(cfg.cashkaroUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#059669;color:#fff;font-weight:700;font-size:.9rem;text-decoration:none;padding:11px 18px;border-radius:8px;margin:6px 8px 6px 0;transition:opacity 0.2s;"><span>${label}</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Partner Offer)</span></a>`;
  }

  if (!amazonButtons.length && !cashkaroButton) return "";

  return `<div class="buybox" style="margin:30px 0;padding:20px 22px;background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #e11d48;border-radius:0 12px 12px 0;box-shadow:0 2px 6px rgba(0,0,0,0.03);">
<div style="font-size:.82rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#be123c;margin-bottom:12px;">Top Offers & Where to Buy</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;">
${amazonButtons.join("")}
${cashkaroButton}
</div>
<p style="font-size:.75rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
}
