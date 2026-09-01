import assert from 'assert';
import { scoreOffer, filterActiveOffers, DEFAULT_CAMPAIGNS } from '../scripts/lib/cuelinks-sync.mjs';

console.log("Running Global Cuelinks Multi-Country & High-EPC Sync Unit Tests...\n");

// Test 1: Tier 1 High-EPC US Campaign Scoring (Choice Hotels $32.14 / click CPC)
const choiceHotelsScore = scoreOffer({
  name: "Choice Hotels US",
  payout: "$32.14 / click",
  commission: "CPC",
  epc7Day: 66.22
});
assert.strictEqual(choiceHotelsScore.tier, 1, "Choice Hotels must be Tier 1 High-EPC Bounty");
console.log("✓ Test 1: Choice Hotels ($32.14/clk) Tier 1 High-EPC scoring passed");

// Test 2: Tier 1 US CPS Bounty Scoring (Airwallex ₹20,250)
const airwallexScore = scoreOffer({
  name: "Airwallex Global Business Account",
  payout: "₹20,250 / sale",
  commission: "CPS",
  epc7Day: 65.18
});
assert.strictEqual(airwallexScore.tier, 1, "Airwallex must be Tier 1 Bounty");
console.log("✓ Test 2: Airwallex (₹20,250) Tier 1 scoring passed");

// Test 3: Tier 2 High-Commission CPS (AppSumo 52.5% & Ajio 9%)
const appSumoScore = scoreOffer({
  name: "AppSumo Lifetime Software Deals",
  payout: "52.50% / sale",
  commission: "CPS"
});
assert.strictEqual(appSumoScore.tier, 2, "AppSumo must be Tier 2 High-Commission");

const ajioScore = scoreOffer({
  name: "Ajio Fashion",
  payout: "9% CPS",
  commission: "CPS"
});
assert.strictEqual(ajioScore.tier, 2, "Ajio 9% must be Tier 2 High-Commission");
console.log("✓ Test 3: High-Commission CPS (AppSumo 52.5% & Ajio 9%) Tier 2 scoring passed");

// Test 4: Expiration filtering
const testOffers = [
  { name: "Active Deal", end_date: "2099-12-31" },
  { name: "Expired Deal", end_date: "2020-01-01" },
  { name: "No Expiry Deal" }
];
const activeOnly = filterActiveOffers(testOffers);
assert.strictEqual(activeOnly.length, 2, "Expired offers must be filtered out");
console.log("✓ Test 4: Expiration filtering test passed");

// Test 5: Global Fallback Campaigns Catalog
assert.ok(DEFAULT_CAMPAIGNS.choiceHotels, "Must include Choice Hotels fallback");
assert.ok(DEFAULT_CAMPAIGNS.verpexHosting, "Must include Verpex Hosting fallback");
assert.ok(DEFAULT_CAMPAIGNS.airwallex, "Must include Airwallex fallback");
assert.ok(DEFAULT_CAMPAIGNS.ajioFashion, "Must include Ajio Fashion fallback");
assert.ok(DEFAULT_CAMPAIGNS.appsumo, "Must include AppSumo fallback");
console.log("✓ Test 5: Global fallback campaigns database passed");

console.log("\n✅ ALL Global Cuelinks Multi-Country & High-EPC Sync unit tests passed successfully!\n");
