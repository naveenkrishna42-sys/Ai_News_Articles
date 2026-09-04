import assert from 'assert';
import { getLiveProductDealsQueue, verifyNoCuelinksLeak, CURATED_PRODUCT_DEALS } from '../scripts/lib/deals-engine.mjs';

console.log("Running Multi-Category Product Deals Engine Unit Tests...\n");

// Test 1: Minimum curated catalog size
assert.ok(CURATED_PRODUCT_DEALS.length >= 20, "Curated catalog must have at least 20 diverse deals");
console.log(`✓ Test 1: Curated catalog contains ${CURATED_PRODUCT_DEALS.length} products across all categories.`);

// Test 2: Diverse category coverage
const categories = new Set(CURATED_PRODUCT_DEALS.map(d => d.category));
assert.ok(categories.has("Smartphones & Flagships"), "Must cover Smartphones");
assert.ok(categories.has("Audio & Entertainment"), "Must cover Audio");
assert.ok(categories.has("Laptops & Tablets"), "Must cover Laptops");
assert.ok(categories.has("Smartwatches & Wearables"), "Must cover Wearables");
assert.ok(categories.has("Home & Kitchen"), "Must cover Home & Kitchen");
assert.ok(categories.has("Fashion & Lifestyle"), "Must cover Fashion");
assert.ok(categories.has("Budget Tech Essentials"), "Must cover Budget Tech Essentials (small pin loot)");
assert.ok(categories.has("International Software & Travel"), "Must cover International Software & Travel");
console.log(`✓ Test 2: Category distribution verified across ${categories.size} core retail categories.`);

// Test 3: Essential product deal fields
for (const d of CURATED_PRODUCT_DEALS) {
  assert.ok(d.id, `Deal must have ID: ${JSON.stringify(d)}`);
  assert.ok(d.title, `Deal must have title: ${d.id}`);
  assert.ok(d.dealPrice, `Deal must have dealPrice: ${d.id}`);
  assert.ok(d.mrp, `Deal must have mrp: ${d.id}`);
  assert.ok(d.buyUrl, `Deal must have buyUrl: ${d.id}`);
  assert.ok(d.merchant, `Deal must have merchant: ${d.id}`);
  assert.ok(d.highlights && d.highlights.length >= 2, `Deal must have at least 2 highlights: ${d.id}`);
  // Guarantee NO dead shortlinks & NO personal tag exposure
  assert.ok(!d.buyUrl.includes("clnk.in"), `buyUrl MUST NOT contain dead clnk.in: ${d.buyUrl}`);
  assert.ok(!d.buyUrl.includes("sirmohana"), `buyUrl MUST NOT expose personal Amazon tag: ${d.buyUrl}`);
}
console.log("✓ Test 3: All deals contain mandatory price, specs, card offers and clean merchant URLs (Zero personal tag leakage).");

// Test 4: Verify Cuelinks direct redirect links never leak to cuelinks.com
const sampleRedirects = [
  "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.ajio.com",
  "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.flipkart.com",
  "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fwww.croma.com",
  "https://linksredirect.com/?cid=316413&source=api&url=https%3A%2F%2Fverpex.com"
];

for (const url of sampleRedirects) {
  const isSafe = await verifyNoCuelinksLeak(url, 3500);
  assert.strictEqual(isSafe, true, `URL must NOT redirect to cuelinks.com: ${url}`);
}
console.log("✓ Test 4: Live HTTP verification confirmed zero redirection leaks to cuelinks.com.");

console.log("\n✅ ALL Multi-Category Product Deals Engine unit tests passed with 100% success!");
