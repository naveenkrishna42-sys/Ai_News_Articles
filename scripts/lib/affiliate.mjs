/**
 * TIVRA News — Universal Contextual Affiliate & Commercial Action Hub
 *
 * Algorithmic, dynamic monetization engine:
 * 1. Category-Aware Multi-Merchant Routing (Fashion -> Ajio/Myntra; Tech -> Amazon/Flipkart/Croma/Reliance).
 * 2. High-Converting Clean CTA Labels ("Buy at Amazon", "Buy at Flipkart", "Buy at Ajio").
 * 3. Dynamic In-line Listicle Item Linking (Auto-detects items in <h3> headings and injects buttons).
 * 4. Zero dead links, zero junk queries, 100% dynamic without hardcoding.
 */

const AMAZON_TAG = "sirmohana-21";
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
 * Known merchant directory with clean, high-converting action buttons.
 */
export const KNOWN_MERCHANTS = [
  {
    pattern: /choice\s*hotels|choice\s*privileges/i,
    name: "Choice Hotels",
    url: cuelinksRedirect("https://www.choicehotels.com"),
    color: "#d97706",
    icon: "🏨",
    cta: "Book at Choice Hotels ($32 CPC)"
  },
  {
    pattern: /norwegian\s*cruise|virgin\s*voyages|cruise\s*vacation|cruise\s*deal/i,
    name: "Norwegian Cruise Line",
    url: cuelinksRedirect("https://www.ncl.com"),
    color: "#0284c7",
    icon: "🚢",
    cta: "Explore Norwegian Cruise Deals"
  },
  {
    pattern: /verpex|web\s*hosting|cloud\s*hosting|hostinger|bluehost/i,
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
    pattern: /makemytrip|\bflight\b|\bhotel\b/i,
    name: "MakeMyTrip",
    url: cuelinksRedirect("https://www.makemytrip.com"),
    color: "#eb2026",
    icon: "✈️",
    cta: "Book on MakeMyTrip"
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
    url: `https://www.amazon.in/deals?tag=${AMAZON_TAG}`,
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
 * Builds Amazon Associates search URL.
 */
export function buyUrl(cleanName, config) {
  const tag = config?.affiliate?.amazonTag || AMAZON_TAG;
  if (!cleanName || cleanName.length < 3) {
    return `https://www.amazon.in/deals?tag=${encodeURIComponent(tag)}`;
  }
  return `https://www.amazon.in/s?k=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(tag)}`;
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
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#be123c;margin-bottom:14px;">Verified Direct Deal & Official Store Offer</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(directUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#e11d48;color:#fff;font-weight:700;font-size:.95rem;text-decoration:none;padding:12px 24px;border-radius:8px;transition:opacity 0.2s;">
    <span>⚡ Claim Verified Deal (${escapeHtml(cleanProd.slice(0, 45))}) &rarr;</span>
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
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#be123c;margin-bottom:14px;">Official Fashion Stores & Verified Deals</div>
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
    <span>🛍️ Buy at Flipkart Fashion</span>
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
  <a href="https://www.amazon.in/deals?tag=${AMAZON_TAG}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#e11d48;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛒 Buy at Amazon Deals</span>
  </a>
  <a href="${escapeHtml(cuelinksRedirect("https://www.flipkart.com/offers-store"))}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#2874f0;color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>🛍️ Buy at Flipkart Offers</span>
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
    const cpcCardUrl = cuelinksRedirect("https://www.bankbazaar.com/credit-card.html");
    const cpcFdUrl = cuelinksRedirect("https://www.bankbazaar.com/fixed-deposit-rate.html");
    const oneMgUrl = cuelinksRedirect("https://www.1mg.com");

    return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #0284c7;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0369a1;margin-bottom:12px;">🛡️ Verified Health Insurance & Healthcare Benefits</div>
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

  // 4. FINANCIAL PRODUCTS (Fixed Deposits vs Credit Cards)
  const isFdOrSavings = /fixed deposit|\bfd\b|senior citizen|interest rate|deposit scheme|savings account/i.test(textContext);
  const isCreditCard = /credit card|cashback card|reward card|lounge access card/i.test(textContext) || catLower.includes("credit card");
  const isFinancial = isFdOrSavings || isCreditCard || /\bbank\b|\bbanking\b|\bfinance\b/i.test(catLower);

  if (isFinancial) {
    const cpcUrl = config?.affiliate?.cuelinks?.cpcUrl || cuelinksRedirect("https://www.bankbazaar.com/credit-card.html");
    const cpcFdUrl = cuelinksRedirect("https://www.bankbazaar.com/fixed-deposit-rate.html");

    if (isFdOrSavings) {
      return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #059669;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#047857;margin-bottom:12px;">Verified Banking & High-Interest Rates</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(cpcFdUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:#059669;color:#ffffff;font-weight:700;font-size:.95rem;text-decoration:none;padding:12px 22px;border-radius:8px;transition:background 0.2s;">
    <span>🏦 Compare Bank FD Rates & Schemes</span>
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
    <span>💳 Apply for Cashback & Lifetime Free Cards</span>
  </a>
</div>
<p style="font-size:.76rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
    }
  }

  // 5. BRAND-SPECIFIC SINGLE MERCHANT DETECTION
  for (const merchant of KNOWN_MERCHANTS) {
    if (merchant.pattern.test(textContext)) {
      return `<div class="buybox" style="margin:30px 0;padding:20px 22px;background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid ${merchant.color};border-radius:0 12px 12px 0;box-shadow:0 2px 6px rgba(0,0,0,0.03);">
<div style="font-size:.82rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${merchant.color};margin-bottom:12px;">Top Offers & Official Store Deals</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
  <a href="${escapeHtml(merchant.url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:${merchant.color};color:#fff;font-weight:700;font-size:.92rem;text-decoration:none;padding:12px 20px;border-radius:8px;transition:opacity 0.2s;">
    <span>${merchant.icon} ${escapeHtml(merchant.cta)}</span>
  </a>
</div>
<p style="font-size:.75rem;color:#64748b;margin:12px 0 0;line-height:1.4;">${escapeHtml(DISCLOSURE)}</p>
</div>`;
    }
  }

  // 6. UNIVERSAL MULTI-SOURCE VALUE MATRIX (Electronics, EVs, Gadgets, Hardware)
  const candidateName = (deviceNames && deviceNames[0]) || title || "";
  const cleanProd = sanitizeProductName(candidateName);

  const amazonUrl = cleanProd ? buyUrl(cleanProd, config) : `https://www.amazon.in/deals?tag=${AMAZON_TAG}`;
  const flipkartUrl = cleanProd
    ? cuelinksRedirect(`https://www.flipkart.com/search?q=${encodeURIComponent(cleanProd)}`)
    : cuelinksRedirect("https://www.flipkart.com/offers-store");
  const cromaUrl = cuelinksRedirect(`https://www.croma.com/searchB?q=${encodeURIComponent(cleanProd || "deals")}`);
  const relianceUrl = cuelinksRedirect("https://www.reliancedigital.in");

  const prodLabel = cleanProd ? cleanProd : "Trending Gadgets";

  return `<div class="buybox" style="margin:30px 0;padding:22px 24px;background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #e11d48;border-radius:0 12px 12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#be123c;margin-bottom:14px;">Compare Prices & Best Value Deals</div>
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
  const isFinanceOrCards = catLower.includes("card") || catLower.includes("bank") || catLower.includes("finance") || /credit card|lounge access|fixed deposit/i.test(titleLower);
  if (!bodyHtml || !bodyHtml.includes("<h3>")) return bodyHtml;

  return bodyHtml.replace(/<h3>(\d+\.\s*([\s\S]*?))<\/h3>/gi, (match, fullHeading, rawTitle) => {
    const headingLower = rawTitle.toLowerCase();
    let btnHtml = "";

    // Check against known merchants dynamically
    for (const merchant of KNOWN_MERCHANTS) {
      if (merchant.pattern.test(headingLower)) {
        btnHtml = `<div style="margin:10px 0 16px;"><a href="${escapeHtml(merchant.url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:${merchant.color};color:#fff;font-weight:700;font-size:.88rem;text-decoration:none;padding:8px 16px;border-radius:6px;"><span>${merchant.icon} ${escapeHtml(merchant.cta)}</span></a></div>`;
        break;
      }
    }

    // If financial / credit card topic, DO NOT inject Amazon or Flipkart product buy buttons!
    if (isFinanceOrCards || /card|bank|account|loan|insurance|elite|rewards|points/i.test(headingLower)) {
      btnHtml = `<div style="margin:10px 0 16px;"><a href="${escapeHtml(cuelinksRedirect('https://www.bankbazaar.com/credit-card.html'))}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#0284c7;color:#fff;font-weight:700;font-size:.84rem;text-decoration:none;padding:8px 14px;border-radius:6px;"><span>💳 Compare Features & Eligibility</span></a></div>`;
    } else if (!btnHtml) {
      // ONLY generate Amazon/Flipkart purchase buttons in designated commercial shopping categories
      const isPhysicalShoppingCategory = catLower.includes("deal") || catLower.includes("gadget") || catLower.includes("comparison") || catLower.includes("offer");
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
