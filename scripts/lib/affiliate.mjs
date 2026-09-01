// TIVRA News — Universal Multi-Merchant Affiliate & Listicle Engine (Cuelinks V3 & Amazon Associates).
//
// 1. Multi-Store Listicles: Renders direct official merchant cards (Ajio, Myntra, Tata CLiQ, Amazon, Flipkart).
// 2. Single Products: Strict entity sanitizer prevents junk queries like "Top 10..." from searching Amazon.
// 3. Financial Products: Contextual routing for FDs vs Credit Cards vs Loans.
// 4. Pre-Publish Quality Gate: Zero broken keyword searches across all articles.

import { escapeHtml } from "./template.mjs";

const CUELINKS_CID = "310115";
const AMAZON_TAG = "sirmohana-21";

export const DISCLOSURE =
  "As an affiliate and partner, TIVRA News earns from qualifying purchases and verified partner referrals. Prices, discounts, and availability are subject to change.";

function cuelinksRedirect(targetUrl) {
  return `https://linksredirect.com/?cid=${CUELINKS_CID}&source=api&url=${encodeURIComponent(targetUrl)}`;
}

/**
 * Known merchant store profiles
 */
const KNOWN_MERCHANTS = [
  {
    pattern: /reliance|jiomart/i,
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
    pattern: /firstcry|\bbaby\b/i,
    name: "FirstCry",
    url: cuelinksRedirect("https://www.firstcry.com"),
    color: "#ff7043",
    icon: "🍼",
    cta: "Shop Baby Essentials on FirstCry"
  },
  {
    pattern: /makemytrip|\bflight\b|\bhotel\b|travel\s*deal/i,
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
    pattern: /payroll|rise\s*works|contractor|remote\s*hiring/i,
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
 * Strict product name sanitizer.
 * Discards junk, headlines, and non-product phrases.
 */
function sanitizeProductName(name) {
  if (!name) return "";
  let clean = name.trim();
  if (clean.includes(":")) clean = clean.split(":")[0].trim();
  if (clean.includes(" — ")) clean = clean.split(" — ")[0].trim();
  if (clean.includes(" - ")) clean = clean.split(" - ")[0].trim();

  // If the string contains listicle / broad article phrases, it is NOT a valid single product query
  const junkPattern = /top\s*\d+|best\s*\d+|shopping\s*sites|sites\s*in\s*india|clothes|fashion|apps|ecommerce|discounts?|schemes?|savings?|republic\s*day|deals?|offers?|sales?|price\s*drops?|worth\s*checking|how\s*to|why/gi;
  if (junkPattern.test(clean) && clean.split(/\s+/).length > 3) {
    return ""; // Invalidate junk queries
  }

  clean = clean.replace(junkPattern, "").trim();
  return (clean.length >= 3 && clean.length <= 35) ? clean : "";
}

/**
 * Builds Amazon Associates search URL
 */
export function buyUrl(cleanName, config) {
  const tag = config?.affiliate?.amazonTag || AMAZON_TAG;
  if (!cleanName || cleanName.length < 3) {
    return `https://www.amazon.in/deals?tag=${encodeURIComponent(tag)}`;
  }
  return `https://www.amazon.in/s?k=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(tag)}`;
}

/**
 * Main Buy Box & Multi-Store Action Box Generator
 */
export function renderBuyBox(deviceNames = [], config = {}, category = "", directUrl = "", title = "") {
  const catLower = (category || "").toLowerCase();
  const textContext = `${title} ${category} ${(deviceNames || []).join(" ")}`.toLowerCase();

  // 1. MULTI-STORE CLOTHING & SHOPPING LISTICLES (e.g. "Top 10 Online Shopping Sites for Clothes")
  const isClothingListicle = /top\s*\d+.*(shopping|cloth|fashion|apparel)|best.*(shopping sites|clothing sites|fashion sites)/i.test(textContext);
  if (isClothingListicle) {
    const ajioUrl = "https://ajo.clnk.in/w0kl";
    const myntraUrl = cuelinksRedirect("https://www.myntra.com");
    const tataUrl = cuelinksRedirect("https://www.tatacliq.com");
    const amazonFashionUrl = buyUrl("clothing fashion", config);
    const flipkartFashionUrl = cuelinksRedirect("https://www.flipkart.com/clothing-and-accessories");

    return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #e11d48;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#be123c;margin-bottom:14px;">Official Fashion Stores & Verified Deals</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(ajioUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#2c4152;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛍️ Shop on Ajio (Up to 80% Off + 9% Rewards)</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span>
  </a>
  <a href="${escapeHtml(myntraUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#ff3f6c;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛍️ Shop on Myntra (Official Deals)</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span>
  </a>
  <a href="${escapeHtml(tataUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#da1c5c;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛍️ Shop on Tata CLiQ Luxury</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span>
  </a>
  <a href="${escapeHtml(amazonFashionUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#e11d48;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛒 Shop Amazon Fashion (Prime Offers)</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span>
  </a>
  <a href="${escapeHtml(flipkartFashionUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#2874f0;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛒 Shop Flipkart Fashion</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
  }

  // 2. EXPLICIT DIRECT URL
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

  // 4. CONTEXTUAL FINANCIAL PRODUCTS (Fixed Deposits vs Credit Cards vs Loans)
  const isFdOrSavings = /fixed deposit|\bfd\b|senior citizen|interest rate|deposit scheme|savings account/i.test(textContext);
  const isCreditCard = /credit card|cashback card|reward card|lounge access card/i.test(textContext) || catLower.includes("credit card");
  const isLoanOrMortgage = /home loan|personal loan|car loan|mortgage|\bemi\b/i.test(textContext);
  const isFinancial = isFdOrSavings || isCreditCard || isLoanOrMortgage || /\bbank\b|\bbanking\b|\bfinance\b/i.test(catLower);

  if (isFinancial) {
    const cpcUrl = config?.affiliate?.cuelinks?.cpcUrl || "https://clnk.in/B5IL";

    if (isFdOrSavings) {
      return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #059669;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#047857;margin-bottom:12px;">Verified Banking & High-Interest Rates</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(cpcUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#059669;color:#ffffff;font-weight:700;font-size:.95rem;text-decoration:none;padding:12px 22px;border-radius:8px;transition:background 0.2s;">
    <span>🏦 Compare Verified Bank FD Rates & Schemes</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
    }

    if (isCreditCard) {
      return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #0284c7;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0369a1;margin-bottom:12px;">Top Credit Card Offers & Cashback Rewards</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(cpcUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#0284c7;color:#ffffff;font-weight:700;font-size:.95rem;text-decoration:none;padding:12px 22px;border-radius:8px;transition:background 0.2s;">
    <span>💳 Apply for Top Cashback & Lifetime Free Cards</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
    }

    return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #059669;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#047857;margin-bottom:12px;">Verified Partner Offers & Financial Tools</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(cpcUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#059669;color:#ffffff;font-weight:700;font-size:.95rem;text-decoration:none;padding:12px 22px;border-radius:8px;transition:background 0.2s;">
    <span>⚡ Check Today's Top Financial Rates & Cashback</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
  }

  // 5. GENERIC PHYSICAL GADGETS (Dual Store Comparison: Amazon + Flipkart)
  const candidateName = (deviceNames && deviceNames[0]) || title || "";
  const cleanProd = sanitizeProductName(candidateName);

  // If query was junk/unresolvable, route to official Amazon Deals Hub instead of broken search query!
  const amazonUrl = cleanProd ? buyUrl(cleanProd, config) : `https://www.amazon.in/deals?tag=${AMAZON_TAG}`;
  const flipkartUrl = cleanProd
    ? cuelinksRedirect(`https://www.flipkart.com/search?q=${encodeURIComponent(cleanProd)}`)
    : cuelinksRedirect("https://www.flipkart.com/offers-store");

  const displayLabel = cleanProd || "Trending Electronics & Gadgets";

  return `<div class="buybox" style="margin:30px 0;padding:20px 22px;background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #e11d48;border-radius:0 12px 12px 0;box-shadow:0 2px 6px rgba(0,0,0,0.03);">
<div style="font-size:.82rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#be123c;margin-bottom:12px;">Compare Prices & Where to Buy</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(amazonUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#e11d48;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛒 Check ${escapeHtml(displayLabel)} on Amazon</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span>
  </a>
  <a href="${escapeHtml(flipkartUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#2874f0;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛍️ Check on Flipkart</span> <span style="font-weight:400;font-size:0.75rem;opacity:.9;">(Paid link)</span>
  </a>
</div>
<p style="font-size:.75rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
}
