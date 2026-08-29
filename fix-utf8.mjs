import fs from 'fs';
import path from 'path';

function fixFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    let original = content;
    
    // Replace ACTUAL UTF-8 characters with HTML entities
    content = content.replace(/—/g, '&mdash;');
    content = content.replace(/‹/g, '&lsaquo;');
    content = content.replace(/›/g, '&rsaquo;');
    content = content.replace(/•/g, '&bull;');
    content = content.replace(/‘/g, '&lsquo;');
    content = content.replace(/’/g, '&rsquo;');
    content = content.replace(/“/g, '&ldquo;');
    content = content.replace(/”/g, '&rdquo;');
    content = content.replace(/©/g, '&copy;');

    if (content !== original) {
        fs.writeFileSync(filepath, content, 'utf8');
        return true;
    }
    return false;
}

let count = 0;
const rootFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
for (const file of rootFiles) {
    if (fixFile(file)) count++;
}

if (fs.existsSync('articles')) {
    const articleFiles = fs.readdirSync('articles').filter(f => f.endsWith('.html'));
    for (const file of articleFiles) {
        if (fixFile(path.join('articles', file))) count++;
    }
}

console.log(`Fixed UTF-8 characters in ${count} HTML files.`);
