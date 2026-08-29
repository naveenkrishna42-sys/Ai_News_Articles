import fs from 'fs';
import path from 'path';

const replacements = {
    "â€¦": "...",
    "â†\x90": "&larr;",
    "â†’": "&rarr;",
    "ðŸ  ": "&#127968;",
    "ðŸ‡®ðŸ‡³": "&#127470;&#127475;",
    "â‚¹": "&#8377;",
    "â–º": "&#9658;"
};

function fixFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    let original = content;
    
    for (const [bad, good] of Object.entries(replacements)) {
        content = content.split(bad).join(good);
    }

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

console.log(`Fixed advanced Mojibake in ${count} HTML files.`);
