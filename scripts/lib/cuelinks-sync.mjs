/**
 * TIVRA News — Automated Cuelinks V3 Campaign & Offers Synchronizer
 *
 * Automatically fetches active, non-expired merchant campaigns, discounts, coupons, and high-payout offers from Cuelinks API.
 * Prioritizes high-ticket B2B bounties (Tier 1: >= Rs 10,000), high-percentage CPS (Tier 2: >= 7% like Ajio 9%),
 * high-volume retail (Tier 3), and guaranteed CPC links (Tier 4).
 */

import fs from 'fs';
import path from 'path';

const CUELINKS_API_KEY = process.env.CUELINKS_API_KEY || "xnrsT6vr3TP64MM7FSvCvdwY2jvD_jLrwU7B0zXvReI";
const CACHE_FILE = path.resolve('data/cuelinks-offers.json');
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours cache to avoid excessive API hits

// Static high-value fallback campaigns in case API is offline or returns empty
export const DEFAULT_CAMPAIGNS = {
  megaSaaS: {
    name: "Rise Works Global Payroll",
    payout: "₹32,000",
    url: "https://clnk.in/B5IT",
    category: "Business",
    tier: 1,
  },
  b2bGrowth: {
    name: "Enterprise Business Solution",
    payout: "₹20,250",
    url: "https://clnk.in/BV9q",
    category: "Business",
    tier: 1,
  },
  ajioFashion: {
    name: "Ajio Fashion & Apparel",
    commission: "9%",
    url: "https://ajo.clnk.in/w0kl",
    category: "Product Deals & Offers",
    tier: 2,
  },
  cpcRewards: {
    name: "Daily Deals & Financial Cashback",
    payout: "₹0.15 / click",
    url: "https://clnk.in/B5IL",
    category: "Credit Cards & Cashback",
    tier: 4,
  }
};

/**
 * Determines the tier score of an offer / campaign.
 * Lower tier number = Higher publishing priority.
 */
export function scoreOffer(offer) {
  const payoutStr = String(offer.payout || offer.discount || "");
  const numMatch = payoutStr.match(/(\d+(\.\d+)?)/);
  const numValue = numMatch ? parseFloat(numMatch[1]) : 0;

  // Tier 1: Mega Fixed Bounties (>= 5000)
  if (numValue >= 5000 || /32000|20250|payroll|enterprise|saas/i.test(offer.title || offer.name || "")) {
    return { tier: 1, label: "Mega High-Payout Bounty", score: 1000 + numValue };
  }

  // Tier 2: High Percentage CPS (>= 7% e.g. Ajio 9%)
  if (payoutStr.includes("%") && numValue >= 7) {
    return { tier: 2, label: "High-Commission Fashion/Retail", score: 500 + numValue };
  }

  // Tier 3: Standard Retail & E-commerce (2% to 6%)
  if (payoutStr.includes("%") || /amazon|flipkart|myntra|electronics|gadget/i.test(offer.title || offer.name || "")) {
    return { tier: 3, label: "High-Volume Electronics & Lifestyle", score: 200 + numValue };
  }

  // Tier 4: CPC (Cost Per Click)
  return { tier: 4, label: "Daily CPC Rewards", score: 50 + numValue };
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
 * Fetches live offers from Cuelinks API with disk caching.
 */
export async function fetchLiveOffers(apiKey = CUELINKS_API_KEY) {
  // Check disk cache first
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (Date.now() - (cached.timestamp || 0) < CACHE_TTL_MS && Array.isArray(cached.offers)) {
        return filterActiveOffers(cached.offers);
      }
    }
  } catch (e) {
    // Ignore cache read error
  }

  if (!apiKey) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch("https://developers.cuelinks.com/pub_api/v3/offers.json?per_page=30", {
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Cuelinks Sync] API responded with status ${res.status}`);
      return [];
    }

    const json = await res.json();
    const rawOffers = json.data || [];
    const activeOffers = filterActiveOffers(rawOffers);

    // Save to cache
    try {
      const dir = path.dirname(CACHE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify({
        timestamp: Date.now(),
        count: activeOffers.length,
        offers: activeOffers
      }, null, 2), 'utf8');
    } catch (err) {
      console.warn("[Cuelinks Sync] Cache write error:", err.message);
    }

    return activeOffers;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[Cuelinks Sync] Error fetching offers: ${err.message}`);
    return [];
  }
}

/**
 * Returns prioritized list of active offers sorted by tier and score.
 */
export async function getPrioritizedCampaigns(apiKey = CUELINKS_API_KEY) {
  const liveOffers = await fetchLiveOffers(apiKey);

  const scoredLive = liveOffers.map((o) => {
    const s = scoreOffer(o);
    return {
      ...o,
      tier: s.tier,
      tierLabel: s.label,
      score: s.score,
      affiliateUrl: o.url || o.affiliate_url || o.tracking_url,
    };
  });

  // Sort: Tier 1 first, then higher score first
  scoredLive.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return b.score - a.score;
  });

  return {
    defaults: DEFAULT_CAMPAIGNS,
    liveOffers: scoredLive,
    topPicks: scoredLive.slice(0, 10)
  };
}
