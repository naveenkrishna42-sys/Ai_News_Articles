import fs from 'fs';

let content = fs.readFileSync('scripts/lib/template.mjs', 'utf8');

// Replace standard unicode characters with HTML entities to prevent Mojibake
content = content.replace(/—/g, '&mdash;');
content = content.replace(/‹/g, '&lsaquo;');
content = content.replace(/›/g, '&rsaquo;');
content = content.replace(/•/g, '&bull;');
content = content.replace(/‘/g, '&lsquo;');
content = content.replace(/’/g, '&rsquo;');
content = content.replace(/“/g, '&ldquo;');
content = content.replace(/”/g, '&rdquo;');
content = content.replace(/©/g, '&copy;');

// The string â€º is also literal in the file sometimes? Let's fix that just in case it was hardcoded.
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

// Inject Cuelinks Verification Tag
if (!content.includes('cuelinks-verification')) {
    content = content.replace('<head>', '<head>\n<meta name="cuelinks-verification" content="VERIFY-CL-RMCNURET">');
}

fs.writeFileSync('scripts/lib/template.mjs', content, 'utf8');
console.log("Template fixed successfully.");
