/**
 * TIVRA News — Global Multi-Country High-EPC Campaign & Offers Synchronizer (US + India + Global)
 *
 * Automatically fetches and scores active, high-EPC campaigns from Cuelinks API (v3) across:
 * 1. High-Payout CPL (Credit Cards ₹1,200 - ₹1,950/lead, Bank Accounts, Loans).
 * 2. Travel & Hospitality (Scapia Zero-Forex ₹1,200, BOB Etihad ₹1,350, Agoda, MakeMyTrip, Trip.com, Klook).
 * 3. Online Education & Courses (Coursera, Udemy).
 * 4. SaaS, Web Hosting & Cloud (Hostinger 37.5%, Verpex $52.50, Bluehost 50%, AppSumo 52.5%).
 * 5. Retail & Fashion (Ajio 9%, Myntra, Tata CLiQ, Croma, Reliance Digital, Amazon, Flipkart).
 *
 * Captures revenue from BOTH CPL Leads (highest ROI) and Sales (CPS).
 */

import fs from 'fs';
import path from 'path';

const CUELINKS_API_KEY = process.env.CUELINKS_API_KEY || "xnrsT6vr3TP64MM7FSvCvdwY2jvD_jLrwU7B0zXvReI";
const CACHE_FILE = path.resolve('data/cuelinks-offers.json');
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours cache to avoid rate limits

/**
 * Top High-Yield Fallback Campaigns across India, US, and Worldwide
 */
export const DEFAULT_CAMPAIGNS = {
  // --- HIGH-PAYOUT CPL (CREDIT CARDS & BANKING — ₹900 - ₹1,950 PER LEAD) ---
  auBankCreditCard: {
    name: "AU Bank Credit Card",
    payout: "₹1,950 / lead",
    commission: "CPL",
    country: "India",
    category: "Credit Cards & Cashback",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fcconboarding.au.bank.in%2Fauccself%2F",
    tier: 1,
  },
  sbiSimplyClick: {
    name: "SBI Simply Click Credit Card",
    payout: "₹1,890 / lead",
    commission: "CPL",
    country: "India",
    category: "Credit Cards & Cashback",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.sbicard.com%2Fsprint%2FsimplyClickMaster",
    tier: 1,
  },
  sbiCashback: {
    name: "SBI Cashback Credit Card",
    payout: "₹1,890 / lead",
    commission: "CPL",
    country: "India",
    category: "Credit Cards & Cashback",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.sbicard.com%2Fsprint%2Fcashback",
    tier: 1,
  },
  axisBankCreditCard: {
    name: "Axis Bank Credit Card",
    payout: "₹1,890 / lead",
    commission: "CPL",
    country: "India",
    category: "Credit Cards & Cashback",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fweb.axis.bank.in%2FDigitalChannel%2FWebForm%2F",
    tier: 1,
  },
  hdfcSwiggyCard: {
    name: "HDFC Swiggy Cashback Credit Card",
    payout: "₹1,829 / lead",
    commission: "CPL",
    country: "India",
    category: "Credit Cards & Cashback",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fapplyonline.hdfc.bank.in%2Fcards%2Fcredit-cards.html",
    tier: 1,
  },
  kiwiCreditCard: {
    name: "Kiwi RuPay UPI Credit Card",
    payout: "₹1,650 / lead",
    commission: "CPL",
    country: "India",
    category: "Credit Cards & Cashback",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fapply.gokiwi.in%2F",
    tier: 1,
  },
  scapiaTravelCard: {
    name: "Federal Scapia Zero-Forex Travel Card",
    payout: "₹1,200 / lead",
    commission: "CPL",
    country: "India",
    category: "Credit Cards & Cashback",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fapply.scapia.cards%2Flanding_page",
    tier: 1,
  },
  hdfcBankCreditCard: {
    name: "HDFC Bank Credit Cards",
    payout: "₹1,050 / lead",
    commission: "CPL",
    country: "India",
    category: "Credit Cards & Cashback",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fapplyonline.hdfc.bank.in%2Fcards%2Fcredit-cards.html%23nbb",
    tier: 1,
  },
  kotak811Savings: {
    name: "Kotak 811 Zero Balance Savings Account",
    payout: "₹210 / lead",
    commission: "CPL",
    country: "India",
    category: "Credit Cards & Cashback",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.kotak811.com%2Fopen-zero-balance-savings-account",
    tier: 2,
  },

  // --- TRAVEL & HOSPITALITY ---
  bobEtihadCard: {
    name: "BOB Card Etihad Travel Perks",
    payout: "₹1,350 / sale",
    commission: "CPL",
    country: "India",
    category: "Travel & Hotels",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fetihadguest.bobcard.in%2F",
    tier: 1,
  },
  makeMyTrip: {
    name: "MakeMyTrip Flights & Hotels",
    payout: "Verified Deals",
    commission: "CPS",
    country: "India",
    category: "Travel & Hotels",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.makemytrip.com",
    tier: 2,
  },
  agodaTravel: {
    name: "Agoda Worldwide Hotel Booking",
    payout: "6.0% / sale",
    commission: "CPS",
    country: "Global",
    category: "Travel & Hotels",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.agoda.com",
    tier: 2,
  },
  tripCom: {
    name: "Trip.com International Flights & Stays",
    payout: "7.0% / sale",
    commission: "CPS",
    country: "Global",
    category: "Travel & Hotels",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.trip.com",
    tier: 2,
  },

  // --- ONLINE COURSES & CAREER ---
  courseraCourses: {
    name: "Coursera Professional Certificates & Degrees",
    payout: "20.0% / sale",
    commission: "CPS",
    country: "Global",
    category: "Education & Career",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.coursera.org",
    tier: 2,
  },
  udemyCourses: {
    name: "Udemy Tech & Business Courses",
    payout: "15.0% / sale",
    commission: "CPS",
    country: "Global",
    category: "Education & Career",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.udemy.com",
    tier: 2,
  },

  // --- SAAS, CLOUD & WEB HOSTING ---
  hostinger: {
    name: "Hostinger Cloud & Web Hosting",
    payout: "37.50% / sale",
    commission: "CPS",
    country: "Global",
    category: "Web Hosting & Cloud",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.hostinger.com",
    tier: 1,
  },
  // --- US HIGH-EPC & GLOBAL BOUNTIES ---
  choiceHotels: {
    name: "Choice Hotels US & International",
    payout: "$32.14 / click",
    commission: "CPC",
    epc7Day: 66.22,
    country: "US",
    category: "Travel & Hotels",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.choicehotels.com",
    tier: 1,
  },
  airwallex: {
    name: "Airwallex Global Business Account",
    payout: "₹20,250 / sale",
    commission: "CPS",
    epc7Day: 65.18,
    country: "US",
    category: "Business & SaaS",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.airwallex.com",
    tier: 1,
  },
  appsumo: {
    name: "AppSumo Lifetime Software Deals",
    payout: "52.50% / sale",
    commission: "CPS",
    country: "Global",
    category: "Software & AI Tools",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fappsumo.com",
    tier: 2,
  },
  verpexHosting: {
    name: "Verpex Cloud Web Hosting",
    payout: "$52.50 / sale",
    commission: "CPS",
    country: "US",
    category: "Web Hosting & Cloud",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fverpex.com",
    tier: 1,
  },

  // --- HIGH-VOLUME COMMERCE & FASHION ---
  ajioFashion: {
    name: "Ajio Fashion & Apparel",
    commission: "9% CPS",
    payout: "9%",
    country: "India",
    category: "Product Deals & Offers",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.ajio.com",
    tier: 2,
  },
  myntraFashion: {
    name: "Myntra Fashion Deals",
    commission: "CPS",
    payout: "Verified Deals",
    country: "India",
    category: "Product Deals & Offers",
    url: "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.myntra.com",
    tier: 2,
  }
};

/**
 * Universal Offer & Campaign Scoring Function
 * Accounts for 7-Day EPC, High Fixed Bounties (CPL), and High Commission %
 */
export function scoreOffer(offer) {
  const payoutStr = String(offer.payout || offer.discount || offer.commission || "");
  const numMatch = payoutStr.match(/(\d+(\.\d+)?)/);
  const numValue = numMatch ? parseFloat(numMatch[1]) : 0;
  const epc = parseFloat(offer.epc7Day || offer.epc || 0);

  // 1. High-payout CPL (Credit Cards & Banking ₹900 - ₹2,000) or Mega Fixed Bounties (>= 5,000)
  if (offer.commission === "CPL" || offer.payout_type === "Per Lead" || (!payoutStr.includes("%") && numValue >= 900) || epc >= 30 || /choice hotels|airwallex|payroll/i.test(offer.title || offer.name || "")) {
    return { tier: 1, label: "Top High-Payout Lead / Global Bounty", score: 3000 + numValue + epc * 10 };
  }

  // 2. High Percentage CPS (>= 7% e.g. AppSumo 52.5%, Ajio 9%, Hostinger 37%) or High CPC ($5+)
  if (payoutStr.includes("%") || (offer.commission === "CPS" && numValue >= 7) || epc >= 10) {
    return { tier: 2, label: "High-Commission CPS", score: 1000 + numValue * 10 + epc * 5 };
  }

  // 3. High-Volume Retail & Global Travel (Trip.com, Agoda, Myntra, Tata CLiQ)
  if (/trip|agoda|myntra|ajio|tatacliq|croma|reliance/i.test(offer.title || offer.name || "")) {
    return { tier: 3, label: "High-Volume Commerce & Travel", score: 500 + numValue * 5 };
  }

  return { tier: 4, label: "Standard Commercial Deal", score: 100 + numValue };
}

/**
 * Converts any target URL into an official Cuelinks affiliate link.
 * If shorten=true, requests a branded clnk.in shortlink.
 * Falls back to standard linksredirect.com format if API fails or rate-limits.
 */
export async function convertLinkToCuelinks(targetUrl, shorten = false, apiKey = CUELINKS_API_KEY) {
  if (!targetUrl || typeof targetUrl !== "string" || !targetUrl.startsWith("http")) return "";
  const fallback = `https://linksredirect.com/?cid=316413&source=api&url=${encodeURIComponent(targetUrl)}`;
  if (!apiKey) return fallback;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("https://developers.cuelinks.com/pub_api/v3/links/convert", {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: targetUrl,
        channel_id: 316413,
        shorten: Boolean(shorten)
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) return fallback;
    const json = await res.json();
    if (json && json.data) {
      if (shorten && json.data.short_url) return json.data.short_url;
      if (json.data.tracking_url) return json.data.tracking_url;
    }
    return fallback;
  } catch (e) {
    return fallback;
  }
}

/**
 * Filters out expired offers based on end_date or status.
 */
export function filterActiveOffers(offers = []) {
  const now = new Date();
  return offers.filter((item) => {
    if (!item) return false;
    if (item.status && item.status.toLowerCase() === 'inactive') return false;
    if (item.end_date) {
      const expiry = new Date(item.end_date);
      if (!isNaN(expiry.getTime()) && expiry < now) {
        return false; // Expired
      }
    }
    // Enforce channel ID 316413 on any linksredirect URL
    if (item.tracking_url && item.tracking_url.includes("linksredirect.com")) {
      item.tracking_url = item.tracking_url.replace(/cid=\d+/, "cid=316413");
    }
    return true;
  });
}

/**
 * Fetches live offers & campaigns from Cuelinks API with disk caching.
 * Fetches both high-payout CPL campaigns (Credit Cards & Banking) and live retail offers.
 */
export async function fetchLiveOffers(apiKey = CUELINKS_API_KEY, countryCode = "") {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf8');
      if (raw && raw.trim().startsWith('{')) {
        const cached = JSON.parse(raw);
        if (Date.now() - (cached.timestamp || 0) < CACHE_TTL_MS && Array.isArray(cached.offers) && cached.offers.length > 0) {
          const active = filterActiveOffers(cached.offers);
          if (active.length > 0) return active;
        }
      }
    }
  } catch (e) {}

  if (!apiKey) return Object.values(DEFAULT_CAMPAIGNS);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    // 1. Fetch live CPL campaigns (Credit Cards & Banking Leads)
    const cplUrl = "https://developers.cuelinks.com/pub_api/v3/campaigns.json?campaign_type=CPL&per_page=50";
    // 2. Fetch live promotional offers
    const offersUrl = countryCode
      ? `https://developers.cuelinks.com/pub_api/v3/offers.json?per_page=50&country=${encodeURIComponent(countryCode)}`
      : "https://developers.cuelinks.com/pub_api/v3/offers.json?per_page=50";

    const [cplRes, offersRes] = await Promise.allSettled([
      fetch(cplUrl, { headers: { "Authorization": `Token ${apiKey}`, "Content-Type": "application/json" }, signal: controller.signal }),
      fetch(offersUrl, { headers: { "Authorization": `Token ${apiKey}`, "Content-Type": "application/json" }, signal: controller.signal })
    ]);
    clearTimeout(timeoutId);

    const combined = [];

    // Process CPL campaigns
    if (cplRes.status === "fulfilled" && cplRes.value.ok) {
      const cplData = await cplRes.value.json();
      const campaigns = Array.isArray(cplData.data) ? cplData.data : [];
      for (const camp of campaigns) {
        if (!camp.url) continue;
        const trackingUrl = `https://linksredirect.com/?cid=316413&source=api&url=${encodeURIComponent(camp.url)}`;
        combined.push({
          id: camp.id,
          name: camp.name,
          title: `${camp.name} — Apply Online (Instant Approval)`,
          campaign_name: camp.name,
          payout: `₹${camp.payout} / lead`,
          commission: "CPL",
          payout_type: camp.payout_type || "Per Lead",
          tracking_url: trackingUrl,
          url: camp.url,
          category: camp.categories?.[0]?.name || "Credit Cards & Cashback",
          isCpl: true,
          status: "active"
        });
      }
    }

    // Process retail offers
    if (offersRes.status === "fulfilled" && offersRes.value.ok) {
      const offersData = await offersRes.value.json();
      const rawOffers = Array.isArray(offersData.data) ? offersData.data : (Array.isArray(offersData.offers) ? offersData.offers : []);
      for (const o of rawOffers) {
        combined.push(o);
      }
    }

    const active = filterActiveOffers(combined);

    // Save to disk cache atomically
    try {
      const dir = path.dirname(CACHE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmpFile = `${CACHE_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify({ timestamp: Date.now(), offers: active }), 'utf8');
      fs.renameSync(tmpFile, CACHE_FILE);
    } catch (err) {
      try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify({ timestamp: Date.now(), offers: active }), 'utf8');
      } catch (e) {}
    }

    return active.length > 0 ? active : Object.values(DEFAULT_CAMPAIGNS);
  } catch (err) {
    clearTimeout(timeoutId);
    return Object.values(DEFAULT_CAMPAIGNS);
  }
}

/**
 * Product-First Verified Deals Selector
 * Returns structured, verified, active commercial stories directly anchored to live products.
 */
export async function getVerifiedProductDeals(todayStr = new Date().toISOString().slice(0, 10)) {
  const liveOffers = await fetchLiveOffers();
  const verifiedDeals = [];

  for (const offer of liveOffers) {
    const title = offer.title || offer.name || "";
    if (!title || title.length < 10) continue;

    const merchant = offer.campaign_name || offer.name || "Verified Partner";
    let trackingUrl = offer.tracking_url || offer.url || "";
    if (trackingUrl.includes("linksredirect.com")) {
      trackingUrl = trackingUrl.replace(/cid=\d+/, "cid=316413");
    }

    // Clean headline
    let cleanTitle = title;
    if (!cleanTitle.toLowerCase().includes(merchant.toLowerCase())) {
      cleanTitle = `${merchant}: ${cleanTitle}`;
    }
    cleanTitle = cleanTitle.replace(/[^\w\s:,\.\-%–—&]/g, "").trim();

    verifiedDeals.push({
      key: `deal-${offer.id || merchant.toLowerCase().replace(/\s+/g, '-')}-${todayStr}`,
      title: cleanTitle.slice(0, 110),
      productName: merchant,
      category: offer.isCpl ? "Credit Cards & Cashback" : "Product Deals & Offers",
      merchant,
      couponCode: offer.coupon_code || null,
      validUntil: offer.end_date || null,
      directUrl: trackingUrl,
      sourceName: `${merchant} Official Offers`,
      sourceUrl: trackingUrl,
      summary: offer.description || `${merchant} verified commercial offer and application link.`,
      isProductFirstDeal: true
    });
  }

  return verifiedDeals;
}
