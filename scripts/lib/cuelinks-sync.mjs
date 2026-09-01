/**
 * TIVRA News — Global Multi-Country High-EPC Campaign & Offers Synchronizer (US + India + Global)
 *
 * Automatically fetches and scores active, high-EPC campaigns from Cuelinks API (v3) across:
 * 1. United States (High CPC $32/click, $12/click, Amazon US + High CPS Airwallex, Verpex, AppSumo, Virgin Voyages).
 * 2. India (Ajio 9% CPS, Myntra, Tata CLiQ, Reliance Digital, Croma, Bank FD CPC).
 * 3. Global / All Countries (Trip.com, Agoda, Qatar Airways, HostelWorld 18.75%, Hostinger 37.5%, Bluehost 50%, Wondershare 22.5%).
 *
 * Captures revenue from BOTH Clicks (CPC) and Sales (CPS).
 */

import fs from 'fs';
import path from 'path';

const CUELINKS_API_KEY = process.env.CUELINKS_API_KEY || "xnrsT6vr3TP64MM7FSvCvdwY2jvD_jLrwU7B0zXvReI";
const CACHE_FILE = path.resolve('data/cuelinks-offers.json');
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours cache to avoid rate limits

/**
 * Top Global High-EPC Fallback Campaigns across US, India, and Worldwide
 */
export const DEFAULT_CAMPAIGNS = {
  // --- UNITED STATES (HIGH CPC & HIGH BOUNTIES) ---
  verpexHosting: {
    name: "Verpex Cloud Web Hosting",
    payout: "$52.50 / sale",
    commission: "CPS",
    epc7Day: 157.43,
    country: "US",
    category: "Web Hosting & Cloud",
    url: "https://linksredirect.com/?cid=310115&source=api&url=https%3A%2F%2Fverpex.com",
    tier: 1,
  },
  choiceHotels: {
    name: "Choice Hotels US & International",
    payout: "$32.14 / click",
    commission: "CPC",
    epc7Day: 66.22,
    country: "US",
    category: "Travel & Hotels",
    url: "https://linksredirect.com/?cid=310115&source=api&url=https%3A%2F%2Fwww.choicehotels.com",
    tier: 1,
  },
  airwallex: {
    name: "Airwallex Global Business Account",
    payout: "₹20,250 / sale",
    commission: "CPS",
    epc7Day: 65.18,
    country: "US",
    category: "Business & SaaS",
    url: "https://clnk.in/BV9q",
    tier: 1,
  },
  norwegianCruise: {
    name: "Norwegian Cruise Line",
    payout: "$12.86 / click",
    commission: "CPC",
    epc7Day: 55.49,
    country: "US",
    category: "Travel & Cruises",
    url: "https://linksredirect.com/?cid=310115&source=api&url=https%3A%2F%2Fwww.ncl.com",
    tier: 1,
  },
  virginVoyages: {
    name: "Virgin Voyages Luxury Cruises",
    payout: "₹16,071 / sale",
    commission: "CPS",
    epc7Day: 45.56,
    country: "US",
    category: "Travel & Cruises",
    url: "https://linksredirect.com/?cid=310115&source=api&url=https%3A%2F%2Fwww.virginvoyages.com",
    tier: 1,
  },
  appsumo: {
    name: "AppSumo Lifetime Software Deals",
    payout: "52.50% / sale",
    commission: "CPS",
    epc7Day: 22.97,
    country: "Global",
    category: "Software & AI Tools",
    url: "https://linksredirect.com/?cid=310115&source=api&url=https%3A%2F%2Fappsumo.com",
    tier: 2,
  },
  amazonUs: {
    name: "Amazon US Shopping & Deals",
    payout: "$6.43 / click",
    commission: "CPC",
    epc7Day: 8.43,
    country: "US",
    category: "Shopping & Gadgets",
    url: "https://linksredirect.com/?cid=310115&source=api&url=https%3A%2F%2Fwww.amazon.com",
    tier: 2,
  },

  // --- INDIA (MASSIVE COMMERCE VOLUME & CPS) ---
  riseWorks: {
    name: "Rise Works Global Payroll",
    payout: "₹32,000 / sale",
    commission: "CPS",
    country: "India / US",
    category: "Business",
    url: "https://clnk.in/B5IT",
    tier: 1,
  },
  ajioFashion: {
    name: "Ajio Fashion & Apparel",
    commission: "9% CPS",
    payout: "9%",
    country: "India",
    category: "Product Deals & Offers",
    url: "https://ajo.clnk.in/w0kl",
    tier: 2,
  },
  hostinger: {
    name: "Hostinger Cloud & Web Hosting",
    payout: "37.50% / sale",
    commission: "CPS",
    country: "Global",
    category: "Web Hosting & Cloud",
    url: "https://linksredirect.com/?cid=310115&source=api&url=https%3A%2F%2Fwww.hostinger.com",
    tier: 2,
  },
  bluehost: {
    name: "Bluehost WordPress Hosting",
    payout: "49.88% / sale",
    commission: "CPS",
    country: "Global",
    category: "Web Hosting & Cloud",
    url: "https://linksredirect.com/?cid=310115&source=api&url=https%3A%2F%2Fwww.bluehost.com",
    tier: 2,
  },
  wondershare: {
    name: "Wondershare Video & Creative Software",
    payout: "22.50% / sale",
    commission: "CPS",
    country: "Global",
    category: "Software & AI Tools",
    url: "https://linksredirect.com/?cid=310115&source=api&url=https%3A%2F%2Fwww.wondershare.com",
    tier: 2,
  },
  hostelworld: {
    name: "HostelWorld Global Travel Stays",
    payout: "18.75% / sale",
    commission: "CPS",
    country: "Global",
    category: "Travel & Hotels",
    url: "https://linksredirect.com/?cid=310115&source=api&url=https%3A%2F%2Fwww.hostelworld.com",
    tier: 2,
  },
  cpcRewards: {
    name: "Daily Financial Rates & Cashback Hub",
    payout: "CPC Clicks",
    commission: "CPC",
    country: "India",
    category: "Credit Cards & Cashback",
    url: "https://clnk.in/B5IL",
    tier: 4,
  }
};

/**
 * Universal Offer & Campaign Scoring Function
 * Accounts for 7-Day EPC, CPC Clicks, High Fixed Bounties, and High Commission %
 */
export function scoreOffer(offer) {
  const payoutStr = String(offer.payout || offer.discount || offer.commission || "");
  const numMatch = payoutStr.match(/(\d+(\.\d+)?)/);
  const numValue = numMatch ? parseFloat(numMatch[1]) : 0;
  const epc = parseFloat(offer.epc7Day || offer.epc || 0);

  // 1. High-EPC US Campaigns (EPC >= 30) or Mega Bounties (>= 5,000)
  if (epc >= 30 || numValue >= 5000 || /32000|20250|16071|choice hotels|norwegian|verpex|airwallex|payroll/i.test(offer.title || offer.name || "")) {
    return { tier: 1, label: "Top High-EPC Global Bounty", score: 2000 + epc * 10 + numValue };
  }

  // 2. High Percentage CPS (>= 7% e.g. Ajio 9%, AppSumo 52%, Hostinger 37%) or High CPC ($5+)
  if ((payoutStr.includes("%") && numValue >= 7) || (offer.commission === "CPC" && numValue >= 5) || epc >= 10) {
    return { tier: 2, label: "High-Commission CPS / Premium CPC", score: 1000 + epc * 5 + numValue * 10 };
  }

  // 3. High-Volume Retail & Global Travel (Amazon, Flipkart, Myntra, Trip.com, Agoda)
  if (payoutStr.includes("%") || /amazon|flipkart|myntra|trip|agoda|electronics|gadget/i.test(offer.title || offer.name || "")) {
    return { tier: 3, label: "High-Volume Commerce & Travel", score: 400 + numValue * 5 };
  }

  // 4. Guaranteed CPC Clicks
  return { tier: 4, label: "Daily CPC Rewards", score: 100 + numValue };
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
    return true;
  });
}

/**
 * Fetches live offers & campaigns from Cuelinks API with disk caching.
 * Supports multi-country querying (US, IN, Global).
 */
export async function fetchLiveOffers(apiKey = CUELINKS_API_KEY, countryCode = "") {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (Date.now() - (cached.timestamp || 0) < CACHE_TTL_MS && Array.isArray(cached.offers)) {
        return filterActiveOffers(cached.offers);
      }
    }
  } catch (e) {}

  if (!apiKey) return Object.values(DEFAULT_CAMPAIGNS);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const url = countryCode
      ? `https://developers.cuelinks.com/pub_api/v3/offers.json?per_page=50&country=${encodeURIComponent(countryCode)}`
      : "https://developers.cuelinks.com/pub_api/v3/offers.json?per_page=50";

    const res = await fetch(url, {
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return Object.values(DEFAULT_CAMPAIGNS);
    }

    const data = await res.json();
    const rawOffers = Array.isArray(data.offers) ? data.offers : [];
    const active = filterActiveOffers(rawOffers);

    // Save to disk cache
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify({ timestamp: Date.now(), offers: active }), 'utf8');
    } catch (err) {}

    return active.length > 0 ? active : Object.values(DEFAULT_CAMPAIGNS);
  } catch (err) {
    clearTimeout(timeoutId);
    return Object.values(DEFAULT_CAMPAIGNS);
  }
}
