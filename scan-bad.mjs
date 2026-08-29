import fs from 'fs';
import path from 'path';

let badSeqs = new Set();
function scanFile(filepath) {
    const content = fs.readFileSync(filepath, 'utf8');
    // Match any sequence of 2-4 characters where the first is in the typical Mojibake range
    const matches = content.match(/[âÂð][\x80-\xFF\u0100-\uFFFF]{1,3}/g);
    if (matches) {
        matches.forEach(m => badSeqs.add(m));
    }
}

scanFile('category.html');
const rootFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
for (const file of rootFiles) scanFile(file);
console.log("Found sequences:");
console.log(Array.from(badSeqs).join('\n'));
