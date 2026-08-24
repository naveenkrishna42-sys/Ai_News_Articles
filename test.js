const fs = require('fs');
function articleCategory(filePath) {
  try {
    const html = fs.readFileSync(filePath, 'utf-8');
    const m = html.match(/<span class="cat-pill">([^<]+)<\/span>/);
    return m ? m[1].trim() : 'General';
  } catch { return 'General'; }
}
const files = fs.readdirSync('articles').filter(f => f.endsWith('.html'));
for (let i = 0; i < 5; i++) {
  const p = 'articles/' + files[i];
  console.log(p, articleCategory(p));
}
