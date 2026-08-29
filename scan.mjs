import fs from 'fs';
import path from 'path';

let nonAscii = new Set();
function scanFile(filepath) {
    const content = fs.readFileSync(filepath, 'utf8');
    const matches = content.match(/[^\x00-\x7F]/gu);
    if (matches) {
        matches.forEach(m => nonAscii.add(m));
    }
}

const rootFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
for (const file of rootFiles) scanFile(file);

if (fs.existsSync('articles')) {
    const articleFiles = fs.readdirSync('articles').filter(f => f.endsWith('.html'));
    for (const file of articleFiles) scanFile(path.join('articles', file));
}

console.log("Non-ASCII characters found:", Array.from(nonAscii).join(' '));
