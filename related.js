// TIVRA News — related stories box on article pages.
// Finds #relatedArticles (with data-category / data-slug), pulls the live
// feed, and renders up to 3 same-category stories. Works on both new TIVRA
// articles (data attrs on the div) and the older generator's pages (data
// attrs on the script tag). Styles are inline because article pages are
// self-contained. Hides itself if nothing matches — never an empty box.

(function () {
  const box = document.getElementById("relatedArticles");
  if (!box) return;

  const legacyScript = document.querySelector('script[src*="related.js"]');
  const category = box.dataset.category || (legacyScript && legacyScript.dataset.category) || "";
  const slug = box.dataset.slug || (legacyScript && legacyScript.dataset.slug) || "";
  const limit = Number((legacyScript && legacyScript.dataset.limit) || 3) || 3;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
  function slugifyCategory(cat) {
    return cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  fetch("/articles.json", { cache: "no-store" })
    .then((r) => r.json())
    .then((data) => {
      const all = data.articles || [];
      const catSlug = slugifyCategory(category);
      let picks = all.filter(
        (a) => slugifyCategory(a.category) === catSlug && !a.url.includes(slug)
      );
      if (picks.length < limit) {
        const extra = all.filter((a) => !a.url.includes(slug) && picks.indexOf(a) === -1);
        picks = picks.concat(extra);
      }
      picks = picks.slice(0, limit);
      if (!picks.length) { box.remove(); return; }

      box.innerHTML =
        '<div style="font-weight:800;color:#0b1220;font-size:.8rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;border-left:4px solid #e11d48;padding-left:10px;">Also read</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">' +
        picks
          .map(
            (a) => `
        <a href="${a.url}" style="display:flex;flex-direction:column;background:#fff;border:1px solid #e5e9f0;border-radius:12px;overflow:hidden;text-decoration:none;">
          ${a.image ? `<img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy" style="width:100%;height:110px;object-fit:cover;display:block;">` : ""}
          <span style="padding:10px 12px;font-size:.86rem;font-weight:700;color:#0b1220;line-height:1.35;">${esc(a.title)}</span>
        </a>`
          )
          .join("") +
        "</div>";
    })
    .catch(() => box.remove());
})();
