// TIVRA News — Universal Multi-Merchant Affiliate Routing Engine (Cuelinks V3 & Amazon Associates).
//
// Automatically detects the merchant brand (Reliance Digital, Croma, Ajio, Flipkart, Tata Cliq,
// Myntra, FirstCry, MakeMyTrip, 1mg, Rise Works, or Amazon) from article content/title/device.
// Converts merchant links through Cuelinks V3 API (cid=310115) and Amazon Associates (sirmohana-21).
// Zero incorrect cross-merchant fallbacks (e.g. Never puts Amazon on a Reliance/Croma deal).

import { escapeHtml } from "./template.mjs";

const CUELINKS_CID = "310115";
const AMAZON_TAG = "sirmohana-21";

export const DISCLOSURE =
  "As an affiliate and partner, TIVRA News earns from qualifying purchases and verified partner referrals. Prices, discounts, and availability are subject to change.";

function cuelinksRedirect(targetUrl) {
  return `https://linksredirect.com/?cid=${CUELINKS_CID}&source=api&url=${encodeURIComponent(targetUrl)}`;
}

/**
 * Known merchant store profiles across India and Global campaigns
 */
const KNOWN_MERCHANTS = [
  {
    pattern: /reliance|jiomart|digital\s*discount/i,
    name: "Reliance Digital",
    url: cuelinksRedirect("https://www.reliancedigital.in"),
    color: "#e42529",
    icon: "🛒",
    cta: "Shop Deals on Reliance Digital"
  },
  {
    pattern: /croma/i,
    name: "Croma",
    url: cuelinksRedirect("https://www.croma.com"),
    color: "#00796b",
    icon: "🛒",
    cta: "Check Offers on Croma"
  },
  {
    pattern: /tata\s*cliq|tatacliq/i,
    name: "Tata CLiQ",
    url: cuelinksRedirect("https://www.tatacliq.com"),
    color: "#da1c5c",
    icon: "🛍️",
    cta: "Shop Sale on Tata CLiQ"
  },
  {
    pattern: /vijay\s*sales/i,
    name: "Vijay Sales",
    url: cuelinksRedirect("https://www.vijaysales.com"),
    color: "#d8232a",
    icon: "🛒",
    cta: "Check Offers on Vijay Sales"
  },
  {
    pattern: /ajio/i,
    name: "Ajio",
    url: "https://ajo.clnk.in/w0kl",
    color: "#2c4152",
    icon: "🛍️",
    cta: "Shop Ajio Fashion Sale (9% Off)"
  },
  {
    pattern: /myntra/i,
    name: "Myntra",
    url: cuelinksRedirect("https://www.myntra.com"),
    color: "#ff3f6c",
    icon: "🛍️",
    cta: "Shop Sale on Myntra"
  },
  {
    pattern: /firstcry|baby/i,
    name: "FirstCry",
    url: cuelinksRedirect("https://www.firstcry.com"),
    color: "#ff7043",
    icon: "🍼",
    cta: "Shop Baby Essentials on FirstCry"
  },
  {
    pattern: /makemytrip|flight|hotel|travel\s*deal/i,
    name: "MakeMyTrip",
    url: cuelinksRedirect("https://www.makemytrip.com"),
    color: "#eb2026",
    icon: "✈️",
    cta: "Book Flights & Hotels on MakeMyTrip"
  },
  {
    pattern: /1mg|apollo|pharmacy|diagnostic|health\s*test|blood\s*test/i,
    name: "1mg",
    url: cuelinksRedirect("https://www.1mg.com"),
    color: "#ff6f61",
    icon: "🩺",
    cta: "Book Verified Lab Test on 1mg"
  },
  {
    pattern: /payroll|rise\s*works|contractor|remote\s*hiring|saas/i,
    name: "Rise Works",
    url: "https://clnk.in/B5IT",
    color: "#059669",
    icon: "💼",
    cta: "Explore Rise Global Payroll & HR Plans"
  },
  {
    pattern: /flipkart/i,
    name: "Flipkart",
    url: cuelinksRedirect("https://www.flipkart.com"),
    color: "#2874f0",
    icon: "🛒",
    cta: "Check Deals on Flipkart"
  }
];

/**
 * Cleans extracted product names of junk/filler terms
 */
function cleanProductName(name) {
  if (!name) return "";
  let clean = name.trim();
  if (clean.includes(":")) clean = clean.split(":")[0].trim();
  if (clean.includes(" — ")) clean = clean.split(" — ")[0].trim();
  if (clean.includes(" - ")) clean = clean.split(" - ")[0].trim();
  clean = clean
    .replace(/discounts?|schemes?|savings?|republic day|deals?|offers?|sales?|price drops?/gi, "")
    .trim();
  return clean.length > 40 ? clean.slice(0, 40).trim() : clean;
}

/**
 * Builds Amazon Associates search URL
 */
export function buyUrl(cleanName, config) {
  const tag = config?.affiliate?.amazonTag || AMAZON_TAG;
  const query = cleanName || "deals";
  return `https://www.amazon.in/s?k=${encodeURIComponent(query)}&tag=${encodeURIComponent(tag)}`;
}

/**
 * The action / buy box shown under articles.
 * Dynamically tailors the UI to Financial, Enterprise SaaS, Fashion, or Specific Merchant Stores.
 */
export function renderBuyBox(deviceNames = [], config = {}, category = "", directUrl = "", title = "") {
  const catLower = (category || "").toLowerCase();
  const textContext = `${title} ${category} ${(deviceNames || []).join(" ")}`.toLowerCase();

  // 1. FINANCIAL PRODUCTS (Credit Cards, Bank Accounts, Insurance, Loans)
  const isFinancial = catLower.includes("card") || catLower.includes("cashback") || catLower.includes("bank") || catLower.includes("insurance");
  if (isFinancial) {
    const cpcUrl = config?.affiliate?.cuelinks?.cpcUrl || "https://clnk.in/B5IL";
    const megaUrl = config?.affiliate?.cuelinks?.megaHighTicketUrl || "https://clnk.in/B5IT";
    const targetUrl = directUrl || megaUrl;

    return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #059669;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#047857;margin-bottom:12px;">Verified Partner Offer & High-Value Rewards</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(targetUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#059669;color:#ffffff;font-weight:700;font-size:.95rem;text-decoration:none;padding:12px 22px;border-radius:8px;transition:background 0.2s;">
    <span>💳 Apply Online & Claim Premium Card / Account Benefits</span>
  </a>
  <a href="${escapeHtml(cpcUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#0284c7;color:#ffffff;font-weight:700;font-size:.95rem;text-decoration:none;padding:12px 22px;border-radius:8px;transition:background 0.2s;">
    <span>⚡ Check Today's Top Financial Deals & Cashback</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
  }

  // 2. EXPLICIT DIRECT URL (if crawler found an exact product page)
  if (directUrl) {
    let storeName = "Merchant Store";
    let btnColor = "#e11d48";
    if (directUrl.includes("flipkart.com")) { storeName = "Flipkart"; btnColor = "#2874f0"; }
    else if (directUrl.includes("reliancedigital") || directUrl.includes("reliance")) { storeName = "Reliance Digital"; btnColor = "#e42529"; }
    else if (directUrl.includes("croma")) { storeName = "Croma"; btnColor = "#00796b"; }
    else if (directUrl.includes("ajio")) { storeName = "Ajio"; btnColor = "#2c4152"; }
    else if (directUrl.includes("myntra")) { storeName = "Myntra"; btnColor = "#ff3f6c"; }
    else if (directUrl.includes("amazon")) { storeName = "Amazon"; btnColor = "#e11d48"; }

    return `<div class="buybox" style="margin:30px 0;padding:20px 22px;background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid ${btnColor};border-radius:0 12px 12px 0;box-shadow:0 2px 6px rgba(0,0,0,0.03);">
<div style="font-size:.82rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${btnColor};margin-bottom:12px;">Verified Deal & Where to Buy</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(directUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:${btnColor};color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛒 Check Verified Deal on ${escapeHtml(storeName)}</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span>
  </a>
</div>
<p style="font-size:.75rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
  }

  // 3. BRAND-SPECIFIC MERCHANT DETECTION (Reliance Digital, Croma, Ajio, Tata Cliq, etc.)
  for (const merchant of KNOWN_MERCHANTS) {
    if (merchant.pattern.test(textContext)) {
      return `<div class="buybox" style="margin:30px 0;padding:20px 22px;background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid ${merchant.color};border-radius:0 12px 12px 0;box-shadow:0 2px 6px rgba(0,0,0,0.03);">
<div style="font-size:.82rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${merchant.color};margin-bottom:12px;">Top Offers & Official Store Deals</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(merchant.url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:${merchant.color};color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>${merchant.icon} ${escapeHtml(merchant.cta)}</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span>
  </a>
</div>
<p style="font-size:.75rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
    }
  }

  // 4. GENERIC CONSUMER GADGETS & ELECTRONICS (Dual Store Price Comparison: Amazon + Flipkart)
  const rawProduct = (deviceNames && deviceNames[0]) || cleanProductName(title) || "Trending Gadget Deals";
  const cleanProd = cleanProductName(rawProduct);
  
  if (!cleanProd || cleanProd.length < 3) return "";

  const amazonUrl = buyUrl(cleanProd, config);
  const flipkartUrl = cuelinksRedirect(`https://www.flipkart.com/search?q=${encodeURIComponent(cleanProd)}`);

  return `<div class="buybox" style="margin:30px 0;padding:20px 22px;background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #e11d48;border-radius:0 12px 12px 0;box-shadow:0 2px 6px rgba(0,0,0,0.03);">
<div style="font-size:.82rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#be123c;margin-bottom:12px;">Compare Prices & Where to Buy</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(amazonUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#e11d48;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛒 Check ${escapeHtml(cleanProd)} on Amazon</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span>
  </a>
  <a href="${escapeHtml(flipkartUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#2874f0;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛍️ Check on Flipkart</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span>
  </a>
</div>
<p style="font-size:.75rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
}
