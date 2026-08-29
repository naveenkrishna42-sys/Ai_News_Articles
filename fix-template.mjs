import fs from 'fs';

let content = fs.readFileSync('scripts/lib/template.mjs', 'utf8');
content = content.replace(/🏠/g, '&#127968;');
content = content.replace(/↗/g, '&#8599;');
content = content.replace(/©/g, '&copy;');
content = content.replace(/←/g, '&larr;');
content = content.replace(/→/g, '&rarr;');
content = content.replace(/…/g, '...');
fs.writeFileSync('scripts/lib/template.mjs', content, 'utf8');
console.log("Fixed template.mjs");
