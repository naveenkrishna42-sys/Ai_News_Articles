import assert from 'assert';
import { scoreOffer, filterActiveOffers, DEFAULT_CAMPAIGNS } from '../scripts/lib/cuelinks-sync.mjs';

console.log("Running Cuelinks Sync Unit Tests...");

// Test 1: Tier 1 Mega Bounty Scoring
const tier1Offer = { title: "Global Payroll Enterprise Subscription", payout: "32000 INR" };
const score1 = scoreOffer(tier1Offer);
assert.strictEqual(score1.tier, 1, "Expected Tier 1 for Rs 32k payout");
console.log("✓ Tier 1 scoring test passed");

// Test 2: Tier 2 High Commission CPS Scoring
const tier2Offer = { title: "Ajio All Stars Sale 2026", payout: "9.0% CPS" };
const score2 = scoreOffer(tier2Offer);
assert.strictEqual(score2.tier, 2, "Expected Tier 2 for 9% CPS");
console.log("✓ Tier 2 scoring test passed");

// Test 3: Tier 4 CPC Scoring
const tier4Offer = { title: "General Banking Click", payout: "0.15 INR Per Click" };
const score4 = scoreOffer(tier4Offer);
assert.strictEqual(score4.tier, 4, "Expected Tier 4 for CPC");
console.log("✓ Tier 4 scoring test passed");

// Test 4: Expired offers filtering
const pastDate = new Date(Date.now() - 86400000).toISOString();
const futureDate = new Date(Date.now() + 86400000).toISOString();

const testOffers = [
  { id: 1, title: "Active Offer", end_date: futureDate },
  { id: 2, title: "Expired Offer", end_date: pastDate },
  { id: 3, title: "Inactive Status Offer", status: "inactive" },
  { id: 4, title: "No Expiry Offer" }
];

const active = filterActiveOffers(testOffers);
assert.strictEqual(active.length, 2, "Expected exactly 2 active offers");
assert.strictEqual(active[0].id, 1);
assert.strictEqual(active[1].id, 4);
console.log("✓ Expiration filtering test passed");

// Test 5: Fallback Campaigns Integrity
assert.ok(DEFAULT_CAMPAIGNS.megaSaaS.url.includes("clnk.in/B5IT"));
assert.ok(DEFAULT_CAMPAIGNS.b2bGrowth.url.includes("clnk.in/BV9q"));
assert.ok(DEFAULT_CAMPAIGNS.ajioFashion.url.includes("ajo.clnk.in/w0kl"));
assert.ok(DEFAULT_CAMPAIGNS.cpcRewards.url.includes("clnk.in/B5IL"));
console.log("✓ Fallback campaigns test passed");

console.log("✅ All Cuelinks Sync unit tests passed successfully!\n");
