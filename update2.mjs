import fs from 'fs';

const filepath = 'scripts/auto-news.mjs';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(/getBestAmazonUrl/g, 'getBestMonetizedUrl');

fs.writeFileSync(filepath, content, 'utf8');
console.log('Modified auto-news.mjs');
