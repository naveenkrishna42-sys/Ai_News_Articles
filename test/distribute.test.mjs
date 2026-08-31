import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('Running Distribution Module test...');

const scriptPath = path.resolve('scripts/distribute.mjs');
assert(fs.existsSync(scriptPath), 'scripts/distribute.mjs must exist');

const { pickTelegramDeals, isMonetizedDeal, buildOneSignalPayload, buildTelegramMessage } = await import('../scripts/distribute.mjs');

const sampleArticles = [
  { slug: 'story-1', title: 'Political Debate Update', category: 'Politics', date: '2026-08-31', url: '/articles/story-1.html' },
  { slug: 'deal-1', title: 'Ajio All Stars Fashion Sale: Up to 80% Off', category: 'Product Deals & Offers', date: '2026-08-31', url: '/articles/deal-1.html', description: 'Huge discounts' },
  { slug: 'saas-1', title: 'Global Payroll Platform Cuts Cross-Border Fees', category: 'Business', date: '2026-08-31', url: '/articles/saas-1.html', description: 'Automate hiring' },
  { slug: 'story-2', title: 'Local Traffic News', category: 'City', date: '2026-08-31', url: '/articles/story-2.html' }
];

// Test 1: isMonetizedDeal identifies affiliate/discount stories
assert.strictEqual(isMonetizedDeal(sampleArticles[0]), false, 'Politics is not a deal');
assert.strictEqual(isMonetizedDeal(sampleArticles[1]), true, 'Ajio sale is a deal');
assert.strictEqual(isMonetizedDeal(sampleArticles[2]), true, 'Global payroll is a high-ticket offer');
assert.strictEqual(isMonetizedDeal(sampleArticles[3]), false, 'City news is not a deal');

// Test 2: pickTelegramDeals returns ONLY monetized deals
const telegramDeals = pickTelegramDeals(sampleArticles, 5);
assert.strictEqual(telegramDeals.length, 2, 'Should only pick the 2 monetized deals');
assert.strictEqual(telegramDeals[0].slug, 'deal-1');
assert.strictEqual(telegramDeals[1].slug, 'saas-1');

// Test 3: Telegram message formats with correct CTA buttons
const ajioMsg = buildTelegramMessage(sampleArticles[1]);
assert.ok(ajioMsg.includes('https://ajo.clnk.in/w0kl'), 'Ajio post must include Ajio Cuelinks CTA');

const saasMsg = buildTelegramMessage(sampleArticles[2]);
assert.ok(saasMsg.includes('https://clnk.in/B5IT'), 'Payroll post must include Rise Works Cuelinks CTA');

console.log('✅ Distribution Module tests passed.');
