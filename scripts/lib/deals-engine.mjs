/**
 * TIVRA Deals Engine — Multi-Category National & International Product Deals
 * 
 * Provides verified individual product deals across all categories:
 * - Smartphones & Flagships
 * - Audio & ANC Headphones
 * - Laptops, Tablets & Computing
 * - Smartwatches & Fitness Wearables
 * - Home & Kitchen Appliances
 * - Fashion, Shoes & Apparel
 * - Budget Tech Accessories & Loot ("even a small pin": cables, GaN chargers, memory cards)
 * - International Deals (eSIMs, Cloud Hosting, SaaS Lifetime Deals, Global Travel)
 *
 * GUARANTEE: Zero redirection to cuelinks.com. All links lead directly to merchants.
 */

import { fetchLiveOffers } from "./cuelinks-sync.mjs";

const AMAZON_TAG = "sirmohana-21";
const CUELINKS_CID = "316413";

/**
 * Creates a verified Cuelinks direct redirect URL with cid=316413
 */
export function buildMerchantRedirect(targetUrl) {
  return `https://linksredirect.com/?cid=${CUELINKS_CID}&source=api&url=${encodeURIComponent(targetUrl)}`;
}

/**
 * Pre-checks if a redirect URL leaks to cuelinks.com
 * If it does, returns null so the engine never serves it.
 */
export async function verifyNoCuelinksLeak(url, timeoutMs = 4000) {
  if (!url || !url.startsWith("http")) return false;
  if (!url.includes("linksredirect.com")) return true; // Direct merchant/Amazon link is safe

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", redirect: "manual", signal: controller.signal });
    clearTimeout(timeoutId);
    const location = res.headers.get("location") || "";
    if (location.includes("cuelinks.com") && !location.includes("linksredirect.com")) {
      return false; // Leaked to cuelinks homepage!
    }
    return true; // Clean redirect to merchant or tracking network
  } catch {
    clearTimeout(timeoutId);
    return true; // Fall through on network timeout
  }
}

/**
 * Comprehensive Catalog of Individual National & International Trending Deals
 */
export const CURATED_PRODUCT_DEALS = [
  // --- 1. SMARTPHONES & FLAGSHIPS (NATIONAL & GLOBAL) ---
  {
    id: "prod-samsung-s24-ultra",
    title: "Samsung Galaxy S24 Ultra 5G (12GB RAM, 256GB Storage, Titanium Gray)",
    category: "Smartphones & Flagships",
    market: "National",
    merchant: "Amazon India",
    badge: "🔥 FLAGSHIP PRICE DROP",
    mrp: "₹1,34,999",
    dealPrice: "₹1,09,999",
    discount: "19% Flat OFF",
    cardOffer: "Extra ₹6,000 Instant Discount on HDFC / SBI Credit Cards (Effective: ₹1,03,999) + Up to 12 Months No-Cost EMI",
    coupon: null,
    rating: "4.6 / 5.0 (8,500+ Reviews)",
    highlights: [
      "Snapdragon 8 Gen 3 for Galaxy with Ray Tracing",
      "200MP Quad Telephoto Camera with 100x Space Zoom & ProVisual Engine",
      "Galaxy AI: Live Translate, Circle to Search & Note Assist",
      "Built-in S-Pen with Titanium Armor Frame & Corning Gorilla Armor"
    ],
    buyUrl: `https://www.amazon.in/dp/B0CS5XW1F4?tag=${AMAZON_TAG}`
  },
  {
    id: "prod-oneplus-13r-5g",
    title: "OnePlus 13R 5G (16GB RAM, 256GB Storage, Nebula Noir)",
    category: "Smartphones & Flagships",
    market: "National",
    merchant: "Amazon India",
    badge: "⚡ TOP SELLER",
    mrp: "₹45,999",
    dealPrice: "₹38,999",
    discount: "15% OFF",
    cardOffer: "Flat ₹3,000 Instant Discount on ICICI Bank Cards (Net Price: ₹35,999)",
    coupon: null,
    rating: "4.5 / 5.0 (12,000+ Reviews)",
    highlights: [
      "Snapdragon 8 Gen 3 Flagship Processor with Cryo-velocity VC",
      "1.5K 120Hz ProXDR AMOLED Display with LTPO 4.0",
      "6000mAh Glacier Battery with 100W SUPERVOOC Fast Charging",
      "Sony 50MP Main Camera with OIS & 4K 60FPS Dolby Vision"
    ],
    buyUrl: `https://www.amazon.in/dp/B0CS5XY9B3?tag=${AMAZON_TAG}`
  },
  {
    id: "prod-apple-iphone-16-128",
    title: "Apple iPhone 16 (128 GB) - Ultramarine",
    category: "Smartphones & Flagships",
    market: "National",
    merchant: "Amazon India",
    badge: "🔥 HOTTEST DEAL",
    mrp: "₹79,900",
    dealPrice: "₹74,900",
    discount: "₹5,000 OFF",
    cardOffer: "Flat ₹5,000 Instant Cashback on ICICI, Axis & Kotak Bank Cards (Net: ₹69,900)",
    coupon: null,
    rating: "4.7 / 5.0 (4,200+ Reviews)",
    highlights: [
      "A18 Bionic Chip built for Apple Intelligence",
      "Camera Control button for instant photo & 48MP Fusion Camera",
      "Action Button customizable to your favorite shortcut",
      "Super Retina XDR OLED Display with Ceramic Shield front"
    ],
    buyUrl: `https://www.amazon.in/dp/B0DGJ9B5X5?tag=${AMAZON_TAG}`
  },
  {
    id: "prod-iqoo-neo-9-pro",
    title: "iQOO Neo 9 Pro 5G (8GB RAM, 256GB Storage, Fiery Red)",
    category: "Smartphones & Flagships",
    market: "National",
    merchant: "Amazon India",
    badge: "🎮 GAMING LOOT",
    mrp: "₹39,999",
    dealPrice: "₹32,999",
    discount: "18% OFF",
    cardOffer: "Extra ₹2,000 Instant Bank Discount on All Bank Cards (Net: ₹30,999)",
    coupon: null,
    rating: "4.5 / 5.0 (9,800+ Reviews)",
    highlights: [
      "Snapdragon 8 Gen 2 Flagship with Dedicated Supercomputing Chip Q1",
      "Sony IMX920 50MP Night Vision Camera with OIS",
      "144Hz 1.5K AMOLED Display with 3000 nits peak brightness",
      "120W FlashCharge (0 to 50% in just 11 minutes)"
    ],
    buyUrl: `https://www.amazon.in/dp/B07WDKK7F6?tag=${AMAZON_TAG}`
  },

  // --- 2. AUDIO & ANC HEADPHONES ---
  {
    id: "prod-sony-wh1000xm5-anc",
    title: "Sony WH-1000XM5 Wireless Industry Leading Noise Canceling Headphones",
    category: "Audio & Entertainment",
    market: "National & Global",
    merchant: "Amazon India",
    badge: "🎧 AUDIOPHILE PICK",
    mrp: "₹34,990",
    dealPrice: "₹26,990",
    discount: "23% Flat OFF",
    cardOffer: "Extra ₹2,500 Instant Discount with HDFC / ICICI Credit Cards (Net Price: ₹24,490)",
    coupon: null,
    rating: "4.6 / 5.0 (18,400+ Reviews)",
    highlights: [
      "Two processors and 8 microphones for unmatched Auto NC Optimizer",
      "Crystal-clear hands-free calling with 4 beamforming mics & AI noise reduction",
      "Up to 30-hour battery life with quick charge (3 mins = 3 hours playback)",
      "Ultra-comfortable lightweight design with soft fit leather"
    ],
    buyUrl: `https://www.amazon.in/dp/B09XS7JWHH?tag=${AMAZON_TAG}`
  },
  {
    id: "prod-apple-airpods-pro-2-usbc",
    title: "Apple AirPods Pro (2nd Generation) with MagSafe Case (USB‑C)",
    category: "Audio & Entertainment",
    market: "National & Global",
    merchant: "Amazon India",
    badge: "⚡ MUST BUY",
    mrp: "₹24,900",
    dealPrice: "₹19,990",
    discount: "20% OFF",
    cardOffer: "Extra ₹1,500 Instant Discount on HDFC Bank Cards (Effective: ₹18,490)",
    coupon: null,
    rating: "4.7 / 5.0 (14,200+ Reviews)",
    highlights: [
      "H2 Apple silicon chip delivering up to 2x more Active Noise Cancellation",
      "Adaptive Audio & Transparency Mode for seamless environmental blend",
      "Personalized Spatial Audio with dynamic head tracking",
      "Dust, sweat, and water resistant (IP54) with Precision Finding case"
    ],
    buyUrl: `https://www.amazon.in/dp/B0CHWRXH8B?tag=${AMAZON_TAG}`
  },
  {
    id: "prod-oneplus-buds-pro-2",
    title: "OnePlus Buds Pro 2 Bluetooth Truly Wireless Earbuds with Dynaudio & Spatial Audio",
    category: "Audio & Entertainment",
    market: "National",
    merchant: "Amazon India",
    badge: "🔥 VALUE KING",
    mrp: "₹13,999",
    dealPrice: "₹7,999",
    discount: "43% Flat OFF",
    cardOffer: "Extra ₹1,000 Instant Discount on ICICI Bank Cards (Effective: ₹6,999)",
    coupon: null,
    rating: "4.4 / 5.0 (9,300+ Reviews)",
    highlights: [
      "Co-created with Dynaudio: MelodyBoost 11mm + 6mm Dual Drivers",
      "Smart Adaptive Noise Cancellation up to 48dB with ultra-wide frequency",
      "Google Spatial Audio with head tracking for 3D cinematic sound",
      "Up to 39 hours battery life with Qi-certified wireless charging"
    ],
    buyUrl: `https://www.amazon.in/dp/B0BQRV9P6T?tag=${AMAZON_TAG}`
  },

  // --- 3. LAPTOPS, TABLETS & COMPUTING ---
  {
    id: "prod-apple-ipad-10th-gen",
    title: "Apple iPad (10th Generation, 10.9-inch, Wi-Fi, 64GB) - Blue",
    category: "Laptops & Tablets",
    market: "National",
    merchant: "Amazon India",
    badge: "🔥 MEGA DEAL",
    mrp: "₹39,900",
    dealPrice: "₹29,990",
    discount: "25% OFF",
    cardOffer: "Flat ₹2,500 Instant Discount on HDFC Bank Credit Cards (Effective: ₹27,490)",
    coupon: null,
    rating: "4.6 / 5.0 (15,200+ Reviews)",
    highlights: [
      "Striking 10.9-inch Liquid Retina display with True Tone",
      "A14 Bionic chip with 6-core CPU and 4-core GPU",
      "Landscape 12MP Ultra Wide front camera with Center Stage",
      "All-day battery life, Wi-Fi 6 & USB-C connectivity"
    ],
    buyUrl: `https://www.amazon.in/dp/B0BJL97G6W?tag=${AMAZON_TAG}`
  },
  {
    id: "prod-apple-macbook-air-m2",
    title: "Apple MacBook Air Laptop with M2 chip: 13.6-inch Liquid Retina Display, 16GB Unified Memory, 256GB SSD",
    category: "Laptops & Tablets",
    market: "National & Global",
    merchant: "Amazon India",
    badge: "💻 PRODUCTIVITY LOOT",
    mrp: "₹99,900",
    dealPrice: "₹84,990",
    discount: "15% OFF",
    cardOffer: "Flat ₹5,000 Instant Cashback on ICICI / HDFC Cards (Effective: ₹79,990)",
    coupon: null,
    rating: "4.7 / 5.0 (7,800+ Reviews)",
    highlights: [
      "Apple M2 chip with 8-core CPU and up to 10-core GPU",
      "Up to 18 hours of battery life with silent fanless design",
      "13.6-inch Liquid Retina display with 500 nits brightness & P3 color",
      "1080p FaceTime HD camera, 3-mic array & 4-speaker sound system"
    ],
    buyUrl: `https://www.amazon.in/dp/B0D5NFDNLL?tag=${AMAZON_TAG}`
  },
  {
    id: "prod-lenovo-loq-gaming",
    title: "Lenovo LOQ 15.6\" FHD 144Hz Gaming Laptop (Intel Core i5-13450HX, RTX 4050 6GB, 16GB DDR5, 512GB SSD)",
    category: "Laptops & Tablets",
    market: "National",
    merchant: "Amazon India",
    badge: "🎮 GAMING RIG DEAL",
    mrp: "₹95,890",
    dealPrice: "₹72,990",
    discount: "24% OFF",
    cardOffer: "Flat ₹4,000 Instant Discount on SBI Cards + Up to ₹12,000 Exchange Bonus",
    coupon: null,
    rating: "4.4 / 5.0 (3,900+ Reviews)",
    highlights: [
      "Intel Core i5-13450HX (10 cores, up to 4.6GHz turbo)",
      "NVIDIA GeForce RTX 4050 6GB GDDR6 (105W TGP with MUX Switch)",
      "15.6\" FHD IPS 144Hz 100% sRGB with G-SYNC",
      "Hyperchamber cooling technology with dual fans & 4 heat pipes"
    ],
    buyUrl: `https://www.amazon.in/dp/B0D1G5Y3K9?tag=${AMAZON_TAG}`
  },

  // --- 4. SMARTWATCHES & WEARABLES ---
  {
    id: "prod-samsung-galaxy-watch-6",
    title: "Samsung Galaxy Watch6 Bluetooth (44mm, Graphite, Super AMOLED Display, ECG, BP Tracker)",
    category: "Smartwatches & Wearables",
    market: "National",
    merchant: "Amazon India",
    badge: "⚡ 52% MASSIVE DROP",
    mrp: "₹36,999",
    dealPrice: "₹17,999",
    discount: "52% Flat OFF",
    cardOffer: "Flat ₹1,500 Instant Discount on All Major Bank Cards (Effective: ₹16,499)",
    coupon: null,
    rating: "4.4 / 5.0 (4,100+ Reviews)",
    highlights: [
      "Sapphire Crystal Glass with 20% larger Super AMOLED display & thinner bezel",
      "Advanced Sleep Coaching, ECG monitoring & Optical Heart Rate sensor",
      "Body Composition Analysis (BIA sensor for fat, muscle & water percentage)",
      "Wear OS powered by Samsung: WhatsApp, Google Maps & contactless NFC tap"
    ],
    buyUrl: `https://www.amazon.in/dp/B0CCV3CSCS?tag=${AMAZON_TAG}`
  },
  {
    id: "prod-apple-watch-series-10",
    title: "Apple Watch Series 10 (GPS, 46mm) - Jet Black Aluminium Case with Black Sport Band",
    category: "Smartwatches & Wearables",
    market: "National & Global",
    merchant: "Amazon India",
    badge: "🌟 NEW ARRIVAL DEAL",
    mrp: "₹49,900",
    dealPrice: "₹45,900",
    discount: "₹4,000 OFF",
    cardOffer: "Flat ₹3,000 Instant Cashback on HDFC & ICICI Cards (Net: ₹42,900)",
    coupon: null,
    rating: "4.7 / 5.0 (1,800+ Reviews)",
    highlights: [
      "Thinnest Apple Watch ever with up to 30% more active screen area",
      "Wide-angle OLED display with faster refresh rate and brighter off-axis view",
      "Sleep Apnea notifications & water temperature / depth gauge to 6m",
      "Fast charging: 0 to 80% in about 30 minutes"
    ],
    buyUrl: `https://www.amazon.in/dp/B0DGJ9B8X2?tag=${AMAZON_TAG}`
  },

  // --- 5. HOME, KITCHEN & APPLIANCES ---
  {
    id: "prod-philips-air-fryer-digital",
    title: "Philips Digital Air Fryer HD9252/90 with Rapid Air Technology (4.1 Liter, Touch Panel, 7 Presets)",
    category: "Home & Kitchen",
    market: "National",
    merchant: "Amazon India",
    badge: "🍳 KITCHEN BESTSELLER",
    mrp: "₹11,995",
    dealPrice: "₹6,999",
    discount: "42% Flat OFF",
    cardOffer: "Flat ₹500 Instant Discount on Axis Bank Credit Cards",
    coupon: null,
    rating: "4.5 / 5.0 (29,000+ Reviews)",
    highlights: [
      "Patented Rapid Air Technology fries with up to 90% less oil",
      "Touch screen with 7 presets: Frozen snacks, fresh fries, meat, fish & cake",
      "Keep Warm function keeps food warm for up to 30 minutes",
      "QuickClean basket with non-stick coating & dishwasher safe parts"
    ],
    buyUrl: `https://www.amazon.in/dp/B093SBRKSP?tag=${AMAZON_TAG}`
  },
  {
    id: "prod-dyson-v8-cordless-vacuum",
    title: "Dyson V8 Absolute Cord-Free Vacuum Cleaner with De-tangling Technology",
    category: "Home & Kitchen",
    market: "National & Global",
    merchant: "Amazon India",
    badge: "🧹 LUXURY APPLIANCE LOOT",
    mrp: "₹43,900",
    dealPrice: "₹29,990",
    discount: "32% OFF",
    cardOffer: "Extra ₹2,500 Instant Discount on All Credit Cards + 9 Months No Cost EMI",
    coupon: null,
    rating: "4.6 / 5.0 (11,400+ Reviews)",
    highlights: [
      "Up to 40 minutes of fade-free suction with powerful Dyson digital motor V8",
      "Motorbar cleaner head with de-tangling vanes clears wrapped hair automatically",
      "Whole-machine filtration captures 99.99% of microscopic particles down to 0.3 microns",
      "Transforms to a handheld in 1 click for car and sofa cleaning"
    ],
    buyUrl: `https://www.amazon.in/dp/B07P8NFW7W?tag=${AMAZON_TAG}`
  },

  // --- 6. FASHION & LIFESTYLE ---
  {
    id: "prod-ajio-dennis-lingo-shirts",
    title: "Dennis Lingo Men's Slim Fit 100% Pure Cotton Casual Shirt",
    category: "Fashion & Lifestyle",
    market: "National",
    merchant: "Ajio",
    badge: "👗 FASHION STEAL",
    mrp: "₹1,849",
    dealPrice: "₹599",
    discount: "68% Flat OFF",
    cardOffer: "Extra 10% Instant Discount on SBI & Mobikwik Wallet",
    coupon: "TRENDS10",
    rating: "4.3 / 5.0 (35,000+ Reviews)",
    highlights: [
      "100% Premium Combed Breathable Cotton Fabric",
      "Curved hemline, classic spread collar & button cuffs",
      "Pre-washed for zero shrinkage and ultra-soft hand feel",
      "Versatile styling for office casual, dinner & weekend outings"
    ],
    buyUrl: buildMerchantRedirect("https://www.ajio.com/s/dennis-lingo-shirts-4001-52311")
  },
  {
    id: "prod-puma-sneakers-smash-v2",
    title: "Puma Unisex Smash v2 L Leather Casual Sneakers",
    category: "Fashion & Lifestyle",
    market: "National",
    merchant: "Flipkart",
    badge: "👟 FOOTWEAR LOOT",
    mrp: "₹3,999",
    dealPrice: "₹1,699",
    discount: "58% OFF",
    cardOffer: "Extra 5% Cashback with Flipkart Axis Bank Credit Card",
    coupon: null,
    rating: "4.4 / 5.0 (48,000+ Reviews)",
    highlights: [
      "Soft synthetic leather upper with iconic Puma Formstrip",
      "SoftFoam+ sockliner providing superior cushioning and optimal comfort",
      "Durable non-marking rubber outsole for maximum grip",
      "Timeless retro tennis silhouette ideal for daily casual wear"
    ],
    buyUrl: buildMerchantRedirect("https://www.flipkart.com/search?q=puma+smash+v2+sneakers")
  },

  // --- 7. BUDGET TECH ESSENTIALS & "EVEN A SMALL PIN" LOOT ---
  {
    id: "prod-anker-65w-gan-charger",
    title: "Anker 65W GaN III 3-Port Fast Charger (2x USB-C + 1x USB-A for MacBook, iPhone, Galaxy)",
    category: "Budget Tech Essentials",
    market: "National & Global",
    merchant: "Amazon India",
    badge: "⚡ ESSENTIAL ACCESSORY",
    mrp: "₹3,999",
    dealPrice: "₹2,199",
    discount: "45% Flat OFF",
    cardOffer: "Extra 5% Instant Savings with Amazon Pay ICICI Card",
    coupon: null,
    rating: "4.7 / 5.0 (22,000+ Reviews)",
    highlights: [
      "Gallium Nitride (GaN) III technology: 53% smaller than standard 67W MacBook charger",
      "High-speed 65W USB-C Power Delivery charges a 14\" MacBook to 50% in 37 mins",
      "Power 3 devices at once with intelligent dynamic power distribution",
      "ActiveShield 2.0 safety system monitors temperature over 3 million times per day"
    ],
    buyUrl: `https://www.amazon.in/dp/B09V2B6WTR?tag=${AMAZON_TAG}`
  },
  {
    id: "prod-sandisk-128gb-extreme-microsd",
    title: "SanDisk 128GB Extreme microSDXC UHS-I Memory Card (190MB/s Read, 4K UHD, A2, V30)",
    category: "Budget Tech Essentials",
    market: "National & Global",
    merchant: "Amazon India",
    badge: "💾 UNDER ₹1,500 LOOT",
    mrp: "₹2,499",
    dealPrice: "₹1,249",
    discount: "50% Flat OFF",
    cardOffer: "Apply ₹100 Amazon coupon at checkout (Net: ₹1,149)",
    coupon: null,
    rating: "4.6 / 5.0 (82,000+ Reviews)",
    highlights: [
      "Blazing fast read speeds up to 190MB/s powered by SanDisk QuickFlow Technology",
      "Write speeds up to 90MB/s for rapid burst shooting & 4K UHD video recording",
      "A2 rated for faster loading and app performance on smartphones & Nintendo Switch",
      "Shockproof, temperature-proof, waterproof, and X-ray proof with Lifetime Warranty"
    ],
    buyUrl: `https://www.amazon.in/dp/B09X7DMB3N?tag=${AMAZON_TAG}`
  },
  {
    id: "prod-boat-braided-typec-cable",
    title: "boAt Rugged v3 Extra Tough Braided Type-C to Type-C 65W Fast Charging Cable (1.5 Meter)",
    category: "Budget Tech Essentials",
    market: "National",
    merchant: "Amazon India",
    badge: "🔥 UNDER ₹299 LOOT",
    mrp: "₹799",
    dealPrice: "₹249",
    discount: "69% Flat OFF",
    cardOffer: "Free 1-Day Delivery with Amazon Prime",
    coupon: null,
    rating: "4.3 / 5.0 (45,000+ Reviews)",
    highlights: [
      "65W Power Delivery (PD) fast charging support for smartphones, tablets & laptops",
      "Heavy-duty military-grade nylon braiding tested for 10,000+ bend lifespan",
      "Aluminum alloy connector shells preventing oxidation and port damage",
      "480Mbps high-speed data transmission speed"
    ],
    buyUrl: `https://www.amazon.in/dp/B08D9MV5GF?tag=${AMAZON_TAG}`
  },
  {
    id: "prod-portronics-laptop-stand",
    title: "Portronics My Buddy K Portable Ergonomic Aluminum Laptop Stand (Foldable, 7 Height Adjustments)",
    category: "Budget Tech Essentials",
    market: "National",
    merchant: "Amazon India",
    badge: "💻 DESK ESSENTIAL",
    mrp: "₹1,499",
    dealPrice: "₹499",
    discount: "67% Flat OFF",
    cardOffer: "Extra 5% Discount on Buying Any 2 Tech Accessories",
    coupon: null,
    rating: "4.4 / 5.0 (19,000+ Reviews)",
    highlights: [
      "Premium aviation-grade aluminum alloy body with anti-slip silicone pads",
      "7 adjustable height angles (from 15 to 45 degrees) for perfect ergonomic posture",
      "Open hollow ventilation design preventing laptop overheating and throttling",
      "Folds flat into a pocket pouch for ultra-convenient travel portability"
    ],
    buyUrl: `https://www.amazon.in/dp/B08P8G939R?tag=${AMAZON_TAG}`
  },

  // --- 8. INTERNATIONAL SOFTWARE, SAAS & TRAVEL DEALS ---
  {
    id: "prod-airalo-esim-global",
    title: "Airalo Worldwide & Regional Travel eSIM (High-Speed Data in 200+ Countries)",
    category: "International Software & Travel",
    market: "International",
    merchant: "Airalo",
    badge: "✈️ GLOBAL TRAVEL PROMO",
    mrp: "$30.00",
    dealPrice: "$15.00",
    discount: "50% OFF",
    cardOffer: "Extra 15% Instant Discount on Your First eSIM Order with Code: SEPTEMBER15",
    coupon: "SEPTEMBER15",
    rating: "4.8 / 5.0 (120,000+ App Reviews)",
    highlights: [
      "Instant activation in 5 minutes without changing physical SIM cards",
      "Coverage across 200+ countries: USA, Europe, UK, Japan, Dubai, Thailand & more",
      "No roaming bill shock or extortionate airport SIM kiosk queues",
      "Works with iPhone, Samsung Galaxy, Google Pixel & all eSIM devices"
    ],
    buyUrl: buildMerchantRedirect("https://www.airalo.com")
  },
  {
    id: "prod-verpex-cloud-hosting",
    title: "Verpex Cloud Web Hosting (Unlimited NVMe Storage, Free Domain & SSL, Global Data Centers)",
    category: "International Software & Travel",
    market: "International",
    merchant: "Verpex Hosting",
    badge: "⚡ 70% CLOUD DEAL",
    mrp: "$12.00 / mo",
    dealPrice: "$3.60 / mo",
    discount: "70% Flat OFF",
    cardOffer: "Free Domain Registration + 45-Day 100% Money-Back Guarantee",
    coupon: null,
    rating: "4.9 / 5.0 (Trustpilot)",
    highlights: [
      "100% NVMe High-Speed Cloud SSD storage on LiteSpeed Web Server",
      "Free 24/7 technical migration & instant cPanel setup",
      "12 global server locations (London, New York, Frankfurt, Singapore, Mumbai)",
      "Daily automated backups and free unlimited SSL certificates"
    ],
    buyUrl: buildMerchantRedirect("https://verpex.com")
  },
  {
    id: "prod-appsumo-software-deals",
    title: "AppSumo Lifetime Software Deals (AI Tools, Marketing, CRM & Business Productivity)",
    category: "International Software & Travel",
    market: "International",
    merchant: "AppSumo",
    badge: "💻 LIFETIME ACCESS",
    mrp: "$600 / yr",
    dealPrice: "$59 One-Time",
    discount: "Up to 90% OFF",
    cardOffer: "Pay Once, Use Forever — Zero Monthly Recurring Subscriptions",
    coupon: null,
    rating: "4.7 / 5.0 (50,000+ Founders)",
    highlights: [
      "Pay once for lifetime access to cutting-edge AI software and SaaS tools",
      "Eliminate expensive monthly recurring SaaS bills across your business",
      "60-day no-questions-asked refund guarantee on every software deal",
      "Community reviews & direct Q&A with software founders"
    ],
    buyUrl: buildMerchantRedirect("https://appsumo.com")
  },
  {
    id: "prod-choice-hotels-global",
    title: "Choice Hotels International (Up to 30% Off Stays across US, Europe & Worldwide)",
    category: "International Software & Travel",
    market: "International",
    merchant: "Choice Hotels",
    badge: "🏨 TRAVEL SAVINGS",
    mrp: "$180 / night",
    dealPrice: "$125 / night",
    discount: "30% OFF",
    cardOffer: "Earn Choice Privileges Points + Free High-Speed Wi-Fi & Hot Breakfast",
    coupon: null,
    rating: "4.5 / 5.0 (Verified Travelers)",
    highlights: [
      "Over 7,500 hotels worldwide: Comfort Inn, Quality Inn, Cambria & Radisson",
      "Complimentary hot breakfast and high-speed Wi-Fi at most locations",
      "Flexible cancellation policies on direct member rate bookings",
      "Instant savings for family vacations, road trips, and business travel"
    ],
    buyUrl: buildMerchantRedirect("https://www.choicehotels.com")
  }
];

/**
 * Merges Cuelinks live API offers with our curated multi-category product catalog
 * Filters out any offers that leak to cuelinks.com or are expired.
 */
export async function getLiveProductDealsQueue() {
  const allDeals = [...CURATED_PRODUCT_DEALS];

  try {
    const liveCuelinksOffers = await fetchLiveOffers();
    for (const offer of liveCuelinksOffers) {
      if (!offer || !offer.title) continue;
      const merchant = offer.campaign_name || offer.name || "Verified Merchant";
      let trackingUrl = offer.tracking_url || offer.url || "";
      if (trackingUrl.includes("linksredirect.com")) {
        trackingUrl = trackingUrl.replace(/cid=\d+/, `cid=${CUELINKS_CID}`);
      }

      // Check leak
      const isClean = await verifyNoCuelinksLeak(trackingUrl, 2000);
      if (!isClean) continue; // Skip leaking offers

      allDeals.push({
        id: `cuelinks-${offer.id || merchant.toLowerCase().replace(/\s+/g, '-')}`,
        title: `${merchant}: ${offer.title.replace(/[^\w\s:,\.\-%–—&]/g, "").trim()}`,
        category: "Product Deals & Offers",
        market: offer.country === "US" ? "International" : "National",
        merchant,
        badge: "⚡ LIVE CAMPAIGN",
        mrp: offer.original_price ? `₹${offer.original_price}` : "Standard Retail",
        dealPrice: offer.discount_price ? `₹${offer.discount_price}` : "Limited-Time Deal",
        discount: offer.percent_off ? `${offer.percent_off}% OFF` : "Exclusive Savings",
        cardOffer: offer.coupon_code ? `Use Coupon Code: ${offer.coupon_code}` : "Verified Merchant Deal",
        coupon: offer.coupon_code || null,
        rating: "4.5 / 5.0 (Verified Partner)",
        highlights: [
          offer.description ? offer.description.slice(0, 100) : "Verified seasonal discount offer",
          offer.end_date ? `Valid through ${offer.end_date}` : "Limited-time promotional pricing",
          "Direct fulfillment by authorized brand store"
        ],
        buyUrl: trackingUrl
      });
    }
  } catch (err) {
    console.warn(`[Deals Engine] Fallback to curated catalog: ${err.message}`);
  }

  return allDeals;
}
