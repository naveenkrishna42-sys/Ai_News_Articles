/**
 * TIVRA News — Universal Contextual Affiliate & Commercial Action Hub
 *
 * Algorithmic, dynamic monetization engine:
 * 1. High-Payout CPL Financial Routing (AU Bank ₹1,950, Axis ₹1,890, SBI ₹1,890, HDFC ₹1,829, Scapia ₹1,200).
 * 2. Dedicated Vertical Routing:
 *    - Travel -> Scapia Zero-Forex Card, MakeMyTrip, Agoda, Trip.com.
 *    - Education & Courses -> Coursera, Udemy.
 *    - Web Hosting & SaaS -> Hostinger, Verpex, AppSumo.
 *    - Fashion -> Ajio, Myntra, Tata CLiQ.
 *    - Physical Tech / Gadgets -> Amazon, Flipkart, Croma, Reliance Digital.
 * 3. Dynamic In-line Listicle Item Linking (Auto-detects items in <h3> headings and injects appropriate action buttons).
 * 4. Zero dead links, zero junk queries, 100% dynamic without hardcoding.
 */

import { resolveMerchantProductUrl } from "./deals-engine.mjs";

const CUELINKS_CID = "316413";

const DISCLOSURE = "As an affiliate and partner, TIVRA News earns from qualifying purchases and verified partner referrals. Prices, discounts, and availability are subject to change.";

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function cuelinksRedirect(targetUrl, cid = CUELINKS_CID) {
  if (!targetUrl) return "";
  return `https://linksredirect.com/?cid=${encodeURIComponent(cid)}&source=api&url=${encodeURIComponent(targetUrl)}`;
}

/**
 * Top-Tier Direct Campaigns (CPL Leads ₹900 - ₹1,950 & High-Commission CPS)
 */
export const HIGH_PAYOUT_CAMPAIGNS = {
  sbiSimplyClick: {
    name: "SBI Simply Click Credit Card",
    url: cuelinksRedirect("https://www.sbicard.com/sprint/simplyClickMaster"),
    payout: "₹1,890 / lead",
    cta: "Apply for SBI Simply Click Card (₹500 Gift Voucher)"
  },
  auBank: {
    name: "AU Bank Credit Card",
    url: cuelinksRedirect("https://cconboarding.au.bank.in/auccself/"),
    payout: "₹1,950 / lead",
    cta: "Apply for AU Bank Credit Card (Lifetime Free)"
  },
  hdfcSwiggy: {
    name: "HDFC Swiggy Credit Card",
    url: cuelinksRedirect("https://applyonline.hdfc.bank.in/cards/credit-cards.html"),
    payout: "₹1,829 / lead",
    cta: "Apply for HDFC Swiggy Card (10% Cashback)"
  },
  scapiaTravel: {
    name: "Federal Scapia Travel Card",
    url: cuelinksRedirect("https://apply.scapia.cards/landing_page"),
    payout: "₹1,200 / lead",
    cta: "Get Scapia Card (Zero Forex & Free Lounge Access)"
  },
  axisBank: {
    name: "Axis Bank Credit Card",
    url: cuelinksRedirect("https://web.axis.bank.in/DigitalChannel/WebForm/"),
    payout: "₹1,890 / lead",
    cta: "Apply for Axis Bank Credit Card"
  },
  kotak811: {
    name: "Kotak 811 Savings Account",
    url: cuelinksRedirect("https://www.kotak811.com/open-zero-balance-savings-account"),
    payout: "₹210 / lead",
    cta: "Open Kotak 811 Zero-Balance Account Online"
  }
};

/**
 * Known merchant directory with clean, high-converting action buttons.
 */
export const KNOWN_MERCHANTS = [
  // --- HIGH-PAYOUT CREDIT CARDS & BANKING (CPL) ---
  {
    pattern: /sbi\s*card|sbi\s*credit|simplyclick|simply\s*click|simplysave/i,
    name: "SBI Simply Click",
    url: HIGH_PAYOUT_CAMPAIGNS.sbiSimplyClick.url,
    color: "#0284c7",
    icon: "💳",
    cta: "Apply for SBI Simply Click (₹500 Voucher)"
  },
  {
    pattern: /au\s*bank|au\s*small\s*finance/i,
    name: "AU Bank Credit Card",
    url: HIGH_PAYOUT_CAMPAIGNS.auBank.url,
    color: "#7c3aed",
    icon: "💳",
    cta: "Apply for AU Bank Lifetime Free Card"
  },
  {
    pattern: /hdfc\s*swiggy|swiggy\s*card/i,
    name: "HDFC Swiggy Card",
    url: HIGH_PAYOUT_CAMPAIGNS.hdfcSwiggy.url,
    color: "#ea580c",
    icon: "💳",
    cta: "Apply for HDFC Swiggy Card (10% Cashback)"
  },
  {
    pattern: /scapia|zero\s*forex/i,
    name: "Federal Scapia",
    url: HIGH_PAYOUT_CAMPAIGNS.scapiaTravel.url,
    color: "#059669",
    icon: "✈️",
    cta: "Get Scapia Zero Forex Card (Lounge Access)"
  },
  {
    pattern: /kotak\s*811|zero\s*balance/i,
    name: "Kotak 811",
    url: HIGH_PAYOUT_CAMPAIGNS.kotak811.url,
    color: "#dc2626",
    icon: "🏦",
    cta: "Open Kotak 811 Zero Balance Account"
  },

  // --- TRAVEL & HOSPITALITY ---
  {
    pattern: /choice\s*hotels|choice\s*privileges/i,
    name: "Choice Hotels",
    url: cuelinksRedirect("https://www.choicehotels.com"),
    color: "#d97706",
    icon: "🏨",
    cta: "Book at Choice Hotels ($32 CPC)"
  },
  {
    pattern: /norwegian\s*cruise|\bncl\b/i,
    name: "Norwegian Cruise Line",
    url: cuelinksRedirect("https://www.ncl.com"),
    color: "#0284c7",
    icon: "🚢",
    cta: "Explore Norwegian Cruise Deals"
  },
  {
    pattern: /agoda/i,
    name: "Agoda",
    url: cuelinksRedirect("https://www.agoda.com"),
    color: "#2563eb",
    icon: "🏨",
    cta: "Book Hotels on Agoda (Up to 60% Off)"
  },
  {
    pattern: /trip\.com/i,
    name: "Trip.com",
    url: cuelinksRedirect("https://www.trip.com"),
    color: "#0284c7",
    icon: "✈️",
    cta: "Book Flights & Stays on Trip.com"
  },
  {
    pattern: /makemytrip/i,
    name: "MakeMyTrip",
    url: cuelinksRedirect("https://www.makemytrip.com"),
    color: "#eb2026",
    icon: "✈️",
    cta: "Book on MakeMyTrip"
  },

  // --- ONLINE EDUCATION & COURSES ---
  {
    pattern: /coursera/i,
    name: "Coursera",
    url: cuelinksRedirect("https://www.coursera.org"),
    color: "#0056d2",
    icon: "🎓",
    cta: "Explore Coursera Certificates & Degrees"
  },
  {
    pattern: /udemy/i,
    name: "Udemy",
    url: cuelinksRedirect("https://www.udemy.com"),
    color: "#a435f0",
    icon: "💻",
    cta: "Learn Skills on Udemy (Deals from ₹499)"
  },

  // --- WEB HOSTING & SAAS ---
  {
    pattern: /hostinger/i,
    name: "Hostinger",
    url: cuelinksRedirect("https://www.hostinger.com"),
    color: "#673de6",
    icon: "⚡",
    cta: "Get 75% Off Hostinger Cloud Hosting"
  },
  {
    pattern: /verpex/i,
    name: "Verpex Cloud Hosting",
    url: cuelinksRedirect("https://verpex.com"),
    color: "#4f46e5",
    icon: "⚡",
    cta: "Get 70% Off on Verpex Hosting"
  },
  {
    pattern: /appsumo|software\s*deal|lifetime\s*deal/i,
    name: "AppSumo",
    url: cuelinksRedirect("https://appsumo.com"),
    color: "#eab308",
    icon: "💻",
    cta: "Explore AppSumo Lifetime Deals"
  },

  // --- RETAIL & FASHION ---
  {
    pattern: /ajio/i,
    name: "Ajio",
    url: cuelinksRedirect("https://www.ajio.com"),
    color: "#2c4152",
    icon: "👗",
    cta: "Buy at Ajio (Official Store Deals)"
  },
  {
    pattern: /myntra/i,
    name: "Myntra",
    url: cuelinksRedirect("https://www.myntra.com"),
    color: "#ff3f6c",
    icon: "🛍️",
    cta: "Buy at Myntra"
  },
  {
    pattern: /tata\s*cliq|tatacliq/i,
    name: "Tata CLiQ",
    url: cuelinksRedirect("https://www.tatacliq.com"),
    color: "#da1c5c",
    icon: "🛍️",
    cta: "Buy at Tata CLiQ"
  },
  {
    pattern: /nykaa/i,
    name: "Nykaa",
    url: cuelinksRedirect("https://www.nykaa.com"),
    color: "#fc2779",
    icon: "💄",
    cta: "Buy at Nykaa"
  },
  {
    pattern: /firstcry|\bbaby\b/i,
    name: "FirstCry",
    url: cuelinksRedirect("https://www.firstcry.com"),
    color: "#ff7043",
    icon: "🍼",
    cta: "Buy at FirstCry"
  },
  {
    pattern: /croma/i,
    name: "Croma",
    url: cuelinksRedirect("https://www.croma.com"),
    color: "#00796b",
    icon: "🏬",
    cta: "Buy at Croma"
  },
  {
    pattern: /reliance|jiomart/i,
    name: "Reliance Digital",
    url: cuelinksRedirect("https://www.reliancedigital.in"),
    color: "#e42529",
    icon: "🛒",
    cta: "Buy at Reliance Digital"
  },
  {
    pattern: /vijay\s*sales/i,
    name: "Vijay Sales",
    url: cuelinksRedirect("https://www.vijaysales.com"),
    color: "#d8232a",
    icon: "🛒",
    cta: "Buy at Vijay Sales"
  },
  {
    pattern: /1mg|apollo|pharmacy|diagnostic|health\s*test|blood\s*test/i,
    name: "1mg",
    url: cuelinksRedirect("https://www.1mg.com"),
    color: "#ff6f61",
    icon: "🩺",
    cta: "Book Lab Test on 1mg"
  },
  {
    pattern: /payroll|hr\s*saas|workforce|remote\s*hiring|contractor|rise\s*works|keka/i,
    name: "Rise Works",
    url: cuelinksRedirect("https://www.riseworks.io"),
    color: "#059669",
    icon: "💼",
    cta: "Get Started on Rise Works ($350 Bounty)"
  },
  {
    pattern: /flipkart/i,
    name: "Flipkart",
    url: cuelinksRedirect("https://www.flipkart.com"),
    color: "#2874f0",
    icon: "🛍️",
    cta: "Buy at Flipkart"
  },
  {
    pattern: /amazon/i,
    name: "Amazon",
    url: cuelinksRedirect("https://www.amazon.in/deals"),
    color: "#e11d48",
    icon: "🛒",
    cta: "Buy at Amazon"
  }
];

/**
 * Strict product name sanitizer.
 */
export function sanitizeProductName(name) {
  if (!name) return "";
  let clean = name.trim();
  if (clean.includes(":")) clean = clean.split(":")[0].trim();
  if (clean.includes(" — ")) clean = clean.split(" — ")[0].trim();
  if (clean.includes(" - ")) clean = clean.split(" - ")[0].trim();

  const junkPattern = /top\s*\d+|best\s*\d+|shopping\s*sites|sites\s*in\s*india|clothes|fashion|apps|ecommerce|discounts?|schemes?|savings?|republic\s*day|deals?|offers?|sales?|price\s*drops?|worth\s*checking|how\s*to|why/gi;
  if (junkPattern.test(clean) && clean.split(/\s+/).length > 3) {
    return "";
  }

  clean = clean.replace(junkPattern, "").trim();
  return (clean.length >= 3 && clean.length <= 35) ? clean : "";
}

/**
 * Builds Amazon search URL monetized via Cuelinks (No personal ID leakage)
 */
export function buyUrl(cleanName) {
  if (!cleanName || cleanName.length < 3) {
    return cuelinksRedirect("https://www.amazon.in/deals");
  }
  return cuelinksRedirect(`https://www.amazon.in/s?k=${encodeURIComponent(cleanName)}`);
}

/**
 * Main Buy Box & Commercial Action Matrix Generator
 */
export function renderBuyBox(deviceNames = [], config = {}, category = "", directUrl = "", title = "") {
  const catLower = (category || "").toLowerCase();
  const textContext = `${title} ${category} ${(deviceNames || []).join(" ")}`.toLowerCase();

  // 0. VERIFIED DIRECT PRODUCT / DEAL URL (Product-First Commercial Engine)
  if (directUrl && typeof directUrl === "string" && directUrl.startsWith("http")) {
    const candidateName = (deviceNames && deviceNames[0]) || title || "Featured Offer";
    const cleanProd = sanitizeProductName(candidateName) || candidateName;
    return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #e11d48;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#be123c;margin-bottom:14px;">Verified Direct Deal &amp; Official Store Offer</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(directUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#e11d48;color:#fff;font-weight:700;font-size:.95rem;text-decoration:none;padding:12px 24px;border-radius:8px;transition:opacity 0.2s;">
    <span>⚡ Claim Verified Deal (${escapeHtml(cleanProd.slice(0, 45))}) &rarr;</span>
  </a>
  <a href="${escapeHtml(HIGH_PAYOUT_CAMPAIGNS.sbiSimplyClick.url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#0284c7;color:#fff;font-weight:700;font-size:.90rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>💳 Check 10% Card Cashback &amp; EMI &rarr;</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
  }

  // 1. CLOTHING, FASHION & FOOTWEAR LISTICLES
  const isClothingListicle = /top\s*\d+.*(shopping|cloth|fashion|apparel|shoe|sneaker)|best.*(shopping sites|clothing sites|fashion sites|sneakers)/i.test(textContext);
  if (isClothingListicle) {
    const ajioUrl = cuelinksRedirect("https://www.ajio.com");
    const myntraUrl = cuelinksRedirect("https://www.myntra.com");
    const tataUrl = cuelinksRedirect("https://www.tatacliq.com");
    const amazonFashionUrl = buyUrl("clothing fashion", config);
    const flipkartFashionUrl = cuelinksRedirect("https://www.flipkart.com/clothing-and-accessories");

    return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #e11d48;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#be123c;margin-bottom:14px;">Official Fashion Stores &amp; Verified Deals</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(ajioUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#2c4152;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>👗 Buy at Ajio</span>
  </a>
  <a href="${escapeHtml(myntraUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#ff3f6c;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛍️ Buy at Myntra</span>
  </a>
  <a href="${escapeHtml(tataUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#da1c5c;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛍️ Buy at Tata CLiQ</span>
  </a>
  <a href="${escapeHtml(amazonFashionUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#e11d48;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛒 Buy at Amazon Fashion</span>
  </a>
  <a href="${escapeHtml(flipkartFashionUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#2874f0;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛍️ Buy at Flipkart</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
  }

  // 2. BROAD E-COMMERCE LISTICLES (e.g. "Top 10 Online Shopping Websites")
  const isGeneralListicle = /top\s*\d+.*(shopping|website|site|store|app)|best.*(online shopping)/i.test(textContext);
  if (isGeneralListicle) {
    return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #e11d48;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#be123c;margin-bottom:14px;">Explore Verified Deals Across Top Shopping Portals</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(cuelinksRedirect("https://www.amazon.in/deals"))}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#e11d48;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛒 Buy at Amazon Deals</span>
  </a>
  <a href="${escapeHtml(cuelinksRedirect("https://www.flipkart.com/offers-store"))}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#2874f0;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛍️ Buy at Flipkart</span>
  </a>
  <a href="${escapeHtml(cuelinksRedirect("https://www.ajio.com"))}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#2c4152;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>👗 Buy at Ajio</span>
  </a>
  <a href="${escapeHtml(cuelinksRedirect("https://www.myntra.com"))}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#ff3f6c;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛍️ Buy at Myntra</span>
  </a>
  <a href="${escapeHtml(cuelinksRedirect("https://www.croma.com"))}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#00796b;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🏬 Buy at Croma</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
  }

  // 3. HEALTH & TERM INSURANCE / HEALTHCARE
  const isInsurance = /health\s*insurance|term\s*insurance|life\s*insurance|mediclaim|medical\s*insurance|insurance\s*policy|policybazaar/i.test(textContext);
  if (isInsurance) {
    const cpcFdUrl = cuelinksRedirect("https://www.bankbazaar.com/fixed-deposit-rate.html");
    const oneMgUrl = cuelinksRedirect("https://www.1mg.com");

    return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #0284c7;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0369a1;margin-bottom:12px;">🛡️ Verified Health Insurance &amp; Healthcare Benefits</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(cpcFdUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#0284c7;color:#ffffff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:background 0.2s;">
    <span>🛡️ Compare Health Insurance Plans</span>
  </a>
  <a href="${escapeHtml(oneMgUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#ff6f61;color:#ffffff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:background 0.2s;">
    <span>🩺 Book Preventive Health Tests on 1mg</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
  }

  // 4. FINANCIAL PRODUCTS (Credit Cards, Savings, Banking - High CPL Leads)
  const isFdOrSavings = /fixed deposit|\bfd\b|senior citizen|interest rate|deposit scheme|savings account/i.test(textContext);
  const isCreditCard = /credit card|cashback card|reward card|lounge access card/i.test(textContext) || catLower.includes("credit card");
  const isFinancial = isFdOrSavings || isCreditCard || /\bbank\b|\bbanking\b|\bfinance\b/i.test(catLower);

  if (isFinancial) {
    if (isFdOrSavings) {
      return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #059669;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#047857;margin-bottom:12px;">🏦 High-Interest Savings &amp; Fixed Deposits</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(HIGH_PAYOUT_CAMPAIGNS.kotak811.url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#059669;color:#ffffff;font-weight:700;font-size:.95rem;text-decoration:none;padding:12px 22px;border-radius:8px;transition:background 0.2s;">
    <span>🏦 Open Kotak 811 Zero-Balance Account</span>
  </a>
  <a href="${escapeHtml(HIGH_PAYOUT_CAMPAIGNS.auBank.url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#7c3aed;color:#ffffff;font-weight:700;font-size:.95rem;text-decoration:none;padding:12px 22px;border-radius:8px;transition:background 0.2s;">
    <span>⚡ AU Bank High-Interest Savings Account</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
    }

    if (isCreditCard) {
      return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #0284c7;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0369a1;margin-bottom:12px;">💳 Top Credit Card Offers &amp; Instant Approvals</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(HIGH_PAYOUT_CAMPAIGNS.sbiSimplyClick.url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#0284c7;color:#ffffff;font-weight:700;font-size:.95rem;text-decoration:none;padding:12px 22px;border-radius:8px;transition:background 0.2s;">
    <span>💳 Apply for SBI Simply Click (₹500 Voucher)</span>
  </a>
  <a href="${escapeHtml(HIGH_PAYOUT_CAMPAIGNS.auBank.url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#7c3aed;color:#ffffff;font-weight:700;font-size:.95rem;text-decoration:none;padding:12px 22px;border-radius:8px;transition:background 0.2s;">
    <span>💳 Apply for AU Bank (Lifetime Free)</span>
  </a>
  <a href="${escapeHtml(HIGH_PAYOUT_CAMPAIGNS.hdfcSwiggy.url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#ea580c;color:#ffffff;font-weight:700;font-size:.95rem;text-decoration:none;padding:12px 22px;border-radius:8px;transition:background 0.2s;">
    <span>💳 Apply for HDFC Swiggy Card (10% Cashback)</span>
  </a>
  <a href="${escapeHtml(HIGH_PAYOUT_CAMPAIGNS.scapiaTravel.url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#059669;color:#ffffff;font-weight:700;font-size:.95rem;text-decoration:none;padding:12px 22px;border-radius:8px;transition:background 0.2s;">
    <span>✈️ Apply for Scapia Zero-Forex Card</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
    }
  }

  // 5. BRAND-SPECIFIC SINGLE MERCHANT DETECTION (Prioritize specific partners before broad categories)
  for (const merchant of KNOWN_MERCHANTS) {
    if (merchant.pattern.test(textContext)) {
      const candidateName = (deviceNames && deviceNames[0]) || title || "";
      const dynamicUrl = candidateName
        ? resolveMerchantProductUrl(merchant.name, candidateName, merchant.url)
        : merchant.url;
      return `<div class="buybox" style="margin:30px 0;padding:20px 22px;background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid ${merchant.color};border-radius:0 12px 12px 0;box-shadow:0 2px 6px rgba(0,0,0,0.03);">
<div style="font-size:.82rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${merchant.color};margin-bottom:12px;">Top Offers &amp; Official Store Deals</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(dynamicUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:${merchant.color};color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>${merchant.icon} ${escapeHtml(merchant.cta)}</span>
  </a>
</div>
<p style="font-size:.75rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
    }
  }

  // 6. TRAVEL, FLIGHTS & HOTEL STAYS (Broad Travel Fallback)
  const isTravel = /flight|airline|hotel|resort|vacation|cruise|tourism|tourist|getaway|holiday\s*package|staycation|visa|travel/i.test(textContext);
  if (isTravel) {
    const agodaUrl = cuelinksRedirect("https://www.agoda.com");
    const mmtUrl = cuelinksRedirect("https://www.makemytrip.com");
    const tripUrl = cuelinksRedirect("https://www.trip.com");

    return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #0284c7;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0369a1;margin-bottom:12px;">✈️ Verified Travel Deals &amp; Zero-Forex Card</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(HIGH_PAYOUT_CAMPAIGNS.scapiaTravel.url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#059669;color:#ffffff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:background 0.2s;">
    <span>💳 Get Scapia Card (Zero Forex &amp; Airport Lounge)</span>
  </a>
  <a href="${escapeHtml(mmtUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#eb2026;color:#ffffff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:background 0.2s;">
    <span>✈️ Book Flights &amp; Hotels on MakeMyTrip</span>
  </a>
  <a href="${escapeHtml(agodaUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#2563eb;color:#ffffff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:background 0.2s;">
    <span>🏨 Book Hotels on Agoda (Up to 60% Off)</span>
  </a>
  <a href="${escapeHtml(tripUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#0284c7;color:#ffffff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:background 0.2s;">
    <span>🌍 Book on Trip.com</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
  }

  // 7. ONLINE COURSES, DEGREES & CAREER (Broad Education Fallback)
  const isEducation = /course|certificate|certification|degree|learning|tutorial|training|bootcamp|upskill|udemy|coursera|diploma/i.test(textContext) || catLower.includes("education");
  if (isEducation) {
    const courseraUrl = cuelinksRedirect("https://www.coursera.org");
    const udemyUrl = cuelinksRedirect("https://www.udemy.com");

    return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #0056d2;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0056d2;margin-bottom:12px;">🎓 Top Accredited Online Courses &amp; Certifications</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(courseraUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#0056d2;color:#ffffff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:background 0.2s;">
    <span>🎓 Explore Coursera Professional Certificates</span>
  </a>
  <a href="${escapeHtml(udemyUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#a435f0;color:#ffffff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:background 0.2s;">
    <span>💻 Learn Skills on Udemy (Offers from ₹499)</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
  }

  // 8. WEB HOSTING, CLOUD & SOFTWARE DEALS (Broad Hosting Fallback)
  const isHostingOrSaas = /hosting|cloud\s*server|vps|wordpress\s*hosting|domain\s*name|lifetime\s*deal|saas|software\s*deal/i.test(textContext);
  if (isHostingOrSaas) {
    const hostingerUrl = cuelinksRedirect("https://www.hostinger.com");
    const verpexUrl = cuelinksRedirect("https://verpex.com");
    const appsumoUrl = cuelinksRedirect("https://appsumo.com");

    return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #673de6;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#673de6;margin-bottom:12px;">⚡ Verified Web Hosting &amp; Software Discounts</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(hostingerUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#673de6;color:#ffffff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:background 0.2s;">
    <span>⚡ Get 75% Off Hostinger Cloud Hosting</span>
  </a>
  <a href="${escapeHtml(verpexUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#4f46e5;color:#ffffff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:background 0.2s;">
    <span>🚀 Get 70% Off Verpex Cloud Hosting</span>
  </a>
  <a href="${escapeHtml(appsumoUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#eab308;color:#ffffff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:background 0.2s;">
    <span>💻 Explore AppSumo Lifetime Deals</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
  }

  // 9. UNIVERSAL MULTI-SOURCE VALUE MATRIX (Electronics, EVs, Gadgets, Hardware ONLY)
  const candidateName = (deviceNames && deviceNames[0]) || title || "";
  const cleanProd = sanitizeProductName(candidateName);

  const amazonUrl = cleanProd ? buyUrl(cleanProd, config) : cuelinksRedirect("https://www.amazon.in/deals");
  const flipkartUrl = cleanProd
    ? cuelinksRedirect(`https://www.flipkart.com/search?q=${encodeURIComponent(cleanProd)}`)
    : cuelinksRedirect("https://www.flipkart.com/offers-store");
  const cromaUrl = cuelinksRedirect(`https://www.croma.com/searchB?q=${encodeURIComponent(cleanProd || "deals")}`);
  const relianceUrl = cuelinksRedirect("https://www.reliancedigital.in");

  const prodLabel = cleanProd ? cleanProd : "Trending Gadgets";

  return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #e11d48;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#be123c;margin-bottom:14px;">Compare Prices &amp; Best Value Deals</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(amazonUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#e11d48;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛒 Buy at Amazon (${escapeHtml(prodLabel)})</span>
  </a>
  <a href="${escapeHtml(flipkartUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#2874f0;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛍️ Buy at Flipkart</span>
  </a>
  <a href="${escapeHtml(cromaUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#00796b;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🏬 Buy at Croma</span>
  </a>
  <a href="${escapeHtml(relianceUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#e42529;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛒 Buy at Reliance Digital</span>
  </a>
  <a href="${escapeHtml(HIGH_PAYOUT_CAMPAIGNS.sbiSimplyClick.url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#0284c7;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>💳 Check 10% Card Discount / EMI &rarr;</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
}

/**
 * Dynamic In-line Listicle Item Linker
 * Parses <h3> headings and injects matching store/product buttons dynamically.
 */
export function injectInlineListicleButtons(bodyHtml = "", config = {}, category = "", title = "") {
  if (!bodyHtml || !bodyHtml.includes("<h3>")) return bodyHtml;

  const catLower = (category || "").toLowerCase();
  const titleLower = (title || "").toLowerCase();
  const isFinanceOrCards = catLower.includes("card") || catLower.includes("bank") || catLower.includes("finance") || /credit card|lounge access|fixed deposit|savings/i.test(titleLower);

  return bodyHtml.replace(/<h3>(\d+\.\s*([\s\S]*?))<\/h3>/gi, (match, fullHeading, rawTitle) => {
    const headingLower = rawTitle.toLowerCase();
    let btnHtml = "";

    // 1. Check against known merchants dynamically
    for (const merchant of KNOWN_MERCHANTS) {
      if (merchant.pattern.test(headingLower)) {
        btnHtml = `<div style="margin:10px 0 16px;"><a href="${escapeHtml(merchant.url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:${merchant.color};color:#fff;font-weight:700;font-size:.88rem;text-decoration:none;padding:8px 16px;border-radius:6px;"><span>${merchant.icon} ${escapeHtml(merchant.cta)}</span></a></div>`;
        break;
      }
    }

    // 2. High-Payout CPL Credit Cards & Finance
    if (isFinanceOrCards || /card|bank|account|loan|insurance|elite|rewards|points/i.test(headingLower)) {
      if (!btnHtml) {
        btnHtml = `<div style="margin:10px 0 16px;"><a href="${escapeHtml(HIGH_PAYOUT_CAMPAIGNS.sbiSimplyClick.url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#0284c7;color:#fff;font-weight:700;font-size:.84rem;text-decoration:none;padding:8px 14px;border-radius:6px;"><span>💳 Apply for Lifetime Free Card (Instant Approval)</span></a></div>`;
      }
    } else if (/hotel|flight|airline|resort|vacation|cruise|tourism|trip/i.test(headingLower)) {
      // 3. Travel & Stays
      if (!btnHtml) {
        btnHtml = `<div style="margin:10px 0 16px;"><a href="${escapeHtml(cuelinksRedirect('https://www.makemytrip.com'))}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#eb2026;color:#fff;font-weight:700;font-size:.84rem;text-decoration:none;padding:8px 14px;border-radius:6px;"><span>✈️ Book Stays &amp; Flights (Verified Deals)</span></a></div>`;
      }
    } else if (/course|certificate|certification|degree|learn|tutorial|training/i.test(headingLower)) {
      // 4. Online Courses & Education
      if (!btnHtml) {
        btnHtml = `<div style="margin:10px 0 16px;"><a href="${escapeHtml(cuelinksRedirect('https://www.coursera.org'))}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#0056d2;color:#fff;font-weight:700;font-size:.84rem;text-decoration:none;padding:8px 14px;border-radius:6px;"><span>🎓 Enroll in Certified Course &rarr;</span></a></div>`;
      }
    } else if (!btnHtml) {
      // 5. Designated Physical Commercial Shopping Categories
      const COMMERCIAL_SHOPPING_CATEGORIES = new Set([
        "product deals & offers",
        "gadget comparisons"
      ]);
      const isPhysicalShoppingCategory = COMMERCIAL_SHOPPING_CATEGORIES.has(catLower);
      if (isPhysicalShoppingCategory) {
        const cleanProd = sanitizeProductName(rawTitle);
        // Exclude people, abstract concepts, places, religious sites, politics, and matchups
        const isNonPhysical = /card|account|deposit|plan|scheme|service|hotel|stay|flight|cruise|pass|temple|church|mosque|shrine|vatican|cathedral|city|minister|president|police|murder|arrest|court|parliament|governor|vs\.|against|match|stance|efficiency|management|policy|reform|forecast|outlook/i.test(cleanProd);
        if (cleanProd && cleanProd.length >= 3 && !isNonPhysical) {
          const amzUrl = buyUrl(cleanProd, config);
          const fkUrl = cuelinksRedirect(`https://www.flipkart.com/search?q=${encodeURIComponent(cleanProd)}`);
          btnHtml = `<div style="display:flex;gap:8px;margin:10px 0 16px;flex-wrap:wrap;"><a href="${escapeHtml(amzUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#e11d48;color:#fff;font-weight:700;font-size:.84rem;text-decoration:none;padding:8px 14px;border-radius:6px;"><span>🛒 Buy ${escapeHtml(cleanProd)} on Amazon</span></a><a href="${escapeHtml(fkUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#2874f0;color:#fff;font-weight:700;font-size:.84rem;text-decoration:none;padding:8px 14px;border-radius:6px;"><span>🛍️ Buy on Flipkart</span></a></div>`;
        }
      }
    }

    return `<h3>${fullHeading}</h3>${btnHtml}`;
  });
}
