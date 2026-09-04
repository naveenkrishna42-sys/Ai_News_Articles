import assert from 'assert';
import { formatTelegramDeal } from '../scripts/telegram-deals.mjs';

console.log("Running Telegram Deals Broadcaster Unit Tests...\n");

const mockDeal = {
  id: "test-deal-1",
  title: "Sony WH-1000XM5 Wireless Noise Canceling Headphones",
  category: "Audio & Entertainment",
  merchant: "Amazon India",
  badge: "🎧 AUDIOPHILE PICK",
  mrp: "₹34,990",
  dealPrice: "₹26,990",
  discount: "23% Flat OFF",
  cardOffer: "Extra ₹2,500 Instant Discount with HDFC Credit Cards (Net: ₹24,490)",
  coupon: "SONY1000",
  rating: "4.6 / 5.0 (18,400+ Reviews)",
  highlights: [
    "Two processors and 8 microphones for industry-leading ANC",
    "Up to 30 hours battery life with rapid charging"
  ],
  buyUrl: "https://www.amazon.in/dp/B09XS7JWHH?tag=sirmohana-21"
};

// Test 1: Full formatting check
const formatted = formatTelegramDeal(mockDeal);
assert.ok(formatted.includes("Sony WH-1000XM5"), "Title must be present");
assert.ok(formatted.includes("₹26,990"), "Deal price must be present");
assert.ok(formatted.includes("₹34,990"), "MRP must be present");
assert.ok(formatted.includes("23% Flat OFF"), "Discount % must be present");
assert.ok(formatted.includes("HDFC Credit Cards"), "Card offer must be present");
assert.ok(formatted.includes("SONY1000"), "Coupon code must be present");
assert.ok(formatted.includes("Buy on Amazon India"), "Merchant buy link must be present");
assert.ok(formatted.includes(mockDeal.buyUrl), "Direct buy URL must match");
console.log("✓ Test 1: Product deal formatting with price, MRP, card offer & coupon passed");

// Test 2: Verify NO article or blog links are present (Pure Deals Only)
assert.ok(!formatted.includes("tivranews.com/articles"), "Telegram post must NOT contain website article links (pure deals only)");
assert.ok(!formatted.includes("Read Full Review"), "Telegram post must NOT contain article reading prompts");
console.log("✓ Test 2: Pure deals directive verified (Zero article links)");

// Test 3: Verify Zero cuelinks redirect leaks
assert.ok(!formatted.includes("clnk.in"), "Must NOT contain dead clnk.in shortlinks");
assert.ok(!formatted.includes("cuelinks.com"), "Must NOT display or link to cuelinks homepage");
console.log("✓ Test 3: Anti-Cuelinks leak verification passed");

console.log("\n✅ ALL Telegram Deals Broadcaster unit tests passed with 100% success!");
