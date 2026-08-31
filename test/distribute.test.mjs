import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('Running Distribution Module test...');

// Verify that distribute.mjs exports the required functions or runs in dry-run mode
const scriptPath = path.resolve('scripts/distribute.mjs');
assert(fs.existsSync(scriptPath), 'scripts/distribute.mjs must exist');

const { pickTopStories, buildOneSignalPayload, buildTelegramMessage } = await import('../scripts/distribute.mjs');

const sampleArticles = [
  { slug: 'story-1', title: 'Normal News Headline', category: 'World', date: '2026-08-31', url: '/articles/story-1.html' },
  { slug: 'deal-1', title: 'Massive 50% Off Deal on Smartphone', category: 'Deals', date: '2026-08-31', url: '/articles/deal-1.html', description: 'Save big now' },
  { slug: 'story-2', title: 'Breaking Flash Report', category: 'India', date: '2026-08-31', url: '/articles/story-2.html' }
];

const top = pickTopStories(sampleArticles, 2);
assert(top.length === 2, 'Should pick requested number of stories');
assert(top[0].category === 'Deals', 'Should prioritize Deals category');

const oneSignalPayload = buildOneSignalPayload('app-123', top[0]);
assert(oneSignalPayload.app_id === 'app-123', 'OneSignal payload must contain app_id');
assert(oneSignalPayload.headings.en.includes('Deal'), 'Heading must contain deal context');

const telegramMsg = buildTelegramMessage(top[0]);
assert(telegramMsg.includes(top[0].title), 'Telegram message must include title');
assert(telegramMsg.includes('https://tivranews.com/articles/deal-1.html'), 'Telegram message must include full link');

console.log('✅ Distribution Module tests passed.');
