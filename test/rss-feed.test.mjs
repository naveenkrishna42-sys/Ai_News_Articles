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
assert(feedContent.includes('rel="hub"'), 'feed.xml must contain WebSub hub link');

const newsSitemapPath = path.join(publicDir, 'news-sitemap.xml');
assert(fs.existsSync(newsSitemapPath), 'news-sitemap.xml must exist');
const newsSitemapContent = fs.readFileSync(newsSitemapPath, 'utf8');
assert(newsSitemapContent.includes('http://www.google.com/schemas/sitemap-news/0.9'), 'news-sitemap.xml must declare Google News XML namespace');

const robotsPath = path.join(publicDir, 'robots.txt');
assert(fs.existsSync(robotsPath), 'robots.txt must exist');
const robotsContent = fs.readFileSync(robotsPath, 'utf8');
assert(robotsContent.includes('news-sitemap.xml'), 'robots.txt must link to news-sitemap.xml');

const sitemapPath = path.join(publicDir, 'sitemap.xml');
assert(fs.existsSync(sitemapPath), 'sitemap.xml must exist');
const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
assert(sitemapContent.includes('<urlset'), 'sitemap.xml must be a direct urlset for instant Google Search Console processing');
assert(sitemapContent.includes('<lastmod>'), 'sitemap.xml must include lastmod tags');

console.log('✅ RSS Feed, WebSub Hub, Direct Sitemap & Google News Sitemap verification passed.');
