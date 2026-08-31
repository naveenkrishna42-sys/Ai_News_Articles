import fs from 'fs';
let content = fs.readFileSync('scripts/lib/template.mjs', 'utf8');
content = content.replace(
  '<figure class="hero"><img src="https://wsrv.nl/?url=${encodeURIComponent(heroImage)}&w=1200&output=webp" alt="${safeTitle}" width="1200" height="675">${credit}</figure>',
  '<figure class="hero"><img src="${heroImage.replace(/&amp;/g, \'&\').replace(/w=[0-9]+/, \'w=1200\').replace(/h=[0-9]+/, \'h=675\')}" alt="${safeTitle}" width="1200" height="675">${credit}</figure>'
);
fs.writeFileSync('scripts/lib/template.mjs', content, 'utf8');
console.log('Fixed template.mjs images');
