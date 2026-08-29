const fs = require('fs');
const path = require('path');

const filepath = path.join(process.cwd(), 'scripts', 'lib', 'template.mjs');
let content = fs.readFileSync(filepath, 'utf8');

// The file was saved in ANSI but contains UTF-8 byte sequences.
// Let's actually read it as 'latin1' (which maps 1:1 to bytes) and convert it back to utf8!
const buffer = fs.readFileSync(filepath);
// If it was saved as UTF-8 but contains Mojibake, it's double-encoded.
// Let's try fixing the known Mojibake strings.

content = content.replace(/â€“/g, '—');
content = content.replace(/â€”/g, '—');
content = content.replace(/â€"/g, '—');
content = content.replace(/â€¹/g, '‹');
content = content.replace(/â€º/g, '›');
content = content.replace(/â€¢/g, '•');
content = content.replace(/â€˜/g, '‘');
content = content.replace(/â€™/g, '’');
content = content.replace(/â€œ/g, '“');
content = content.replace(/â€ /g, '”');
content = content.replace(/Â©/g, '©');
content = content.replace(/\?"/g, '—');
content = content.replace(/\?/g, '›');

if (!content.includes('cuelinks-verification')) {
    content = content.replace('<head>', '<head>\n<meta name="cuelinks-verification" content="VERIFY-CL-RMCNURET">');
}

fs.writeFileSync(filepath, content, 'utf8');
console.log('Fixed using Node.js');
