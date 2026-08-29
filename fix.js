const fs = require('fs');
const path = require('path');

const filepath = path.join(process.cwd(), 'scripts', 'lib', 'template.mjs');
let content = fs.readFileSync(filepath, 'utf8');

// The file was saved in ANSI but contains UTF-8 byte sequences.
// Let's actually read it as 'latin1' (which maps 1:1 to bytes) and convert it back to utf8!
const buffer = fs.readFileSync(filepath);
// If it was saved as UTF-8 but contains Mojibake, it's double-encoded.
// Let's try fixing the known Mojibake strings.

content = content.replace(/&ndash;/g, '-');
content = content.replace(/&mdash;/g, '-');
content = content.replace(/&mdash;/g, '-');
content = content.replace(/&lsaquo;/g, '‹');
content = content.replace(/&rsaquo;/g, '›');
content = content.replace(/&bull;/g, '•');
content = content.replace(/&lsquo;/g, '‘');
content = content.replace(/&rsquo;/g, '’');
content = content.replace(/&ldquo;/g, '“');
content = content.replace(/â€ /g, '”');
content = content.replace(/&copy;/g, '©');
content = content.replace(/\?"/g, '-');
content = content.replace(/\?/g, '›');

if (!content.includes('cuelinks-verification')) {
    content = content.replace('<head>', '<head>\n<meta name="cuelinks-verification" content="VERIFY-CL-RMCNURET">');
}

fs.writeFileSync(filepath, content, 'utf8');
console.log('Fixed using Node.js');
