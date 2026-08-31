import assert from 'assert';
import fs from 'fs';
import path from 'path';

// Check if build-index produces feed.xml and rss.xml with valid structure
console.log('Running RSS Feed verification test...');

const publicDir = path.resolve('public');
const feedPath = path.join(publicDir, 'feed.xml');
const rssPath = path.join(publicDir, 'rss.xml');

assert(fs.existsSync(feedPath), 'feed.xml must exist');
assert(fs.existsSync(rssPath), 'rss.xml must exist');

const feedContent = fs.readFileSync(feedPath, 'utf8');
assert(feedContent.includes('<rss version="2.0"'), 'feed.xml must be valid RSS 2.0');
assert(feedContent.includes('<channel>'), 'feed.xml must contain <channel>');
assert(feedContent.includes('<item>'), 'feed.xml must contain <item> entries');
assert(feedContent.includes('https://tivranews.com'), 'feed.xml must link to site URL');

console.log('✅ RSS Feed verification passed.');
