import fs from 'fs';
import path from 'path';

function fixFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    let original = content;
    
    // Fix known Mojibake in existing HTML files
    content = content.replace(/â€“/g, '&mdash;');
    content = content.replace(/â€”/g, '&mdash;');
    content = content.replace(/â€"/g, '&mdash;');
    content = content.replace(/â€¹/g, '&lsaquo;');
    content = content.replace(/â€º/g, '&rsaquo;');
    content = content.replace(/â€¢/g, '&bull;');
    content = content.replace(/â€˜/g, '&lsquo;');
    content = content.replace(/â€™/g, '&rsquo;');
    content = content.replace(/â€œ/g, '&ldquo;');
    content = content.replace(/â€\x9D/g, '&rdquo;');
    content = content.replace(/Â©/g, '&copy;');

    if (content !== original) {
        fs.writeFileSync(filepath, content, 'utf8');
        return true;
    }
    return false;
}

let count = 0;

// Fix root HTML files
const rootFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
for (const file of rootFiles) {
    if (fixFile(file)) count++;
}

// Fix articles HTML files
if (fs.existsSync('articles')) {
    const articleFiles = fs.readdirSync('articles').filter(f => f.endsWith('.html'));
    for (const file of articleFiles) {
        if (fixFile(path.join('articles', file))) count++;
    }
}

console.log(`Fixed Mojibake in ${count} HTML files.`);
