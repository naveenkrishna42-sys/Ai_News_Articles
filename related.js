// TIVRA News - related stories box on article pages.
// High-performance, lightweight related stories widget (<10KB payload).
(function () {
  const box = document.getElementById("relatedArticles");
  if (!box) return;

  const legacyScript = document.querySelector('script[src*="related.js"]');
  const category = box.dataset.category || (legacyScript && legacyScript.dataset.category) || "";
  const slug = box.dataset.slug || (legacyScript && legacyScript.dataset.slug) || "";
  const limit = Number((legacyScript && legacyScript.dataset.limit) || 3) || 3;

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
  function slugifyCategory(cat) {
    return String(cat || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  fetch("/related-feed.json", { cache: "default" })
    .then((r) => r.json())
    .then((map) => {
      const catSlug = slugifyCategory(category);
      const pool = map[catSlug] || map["all"] || [];
      const picks = pool.filter((a) => !a.url.includes(slug) && a.slug !== slug).slice(0, limit);

      if (!picks.length) { box.remove(); return; }

      box.innerHTML =
        '<div style="font-weight:800;color:#0b1220;font-size:.84rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;border-left:4px solid #e11d48;padding-left:10px;">Recommended Stories</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">' +
        picks
          .map(
            (a) => `
        <a href="${a.url}" style="display:flex;flex-direction:column;background:#fff;border:1px solid #e5e9f0;border-radius:12px;overflow:hidden;text-decoration:none;box-shadow:0 2px 6px rgba(0,0,0,0.03);transition:transform 0.2s;">
          ${a.image ? `<img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy" style="width:100%;height:120px;object-fit:cover;display:block;">` : ""}
          <span style="padding:10px 12px;font-size:.88rem;font-weight:700;color:#0b1220;line-height:1.35;">${esc(a.title)}</span>
        </a>`
          )
          .join("") +
        "</div>";
    })
    .catch(() => {
      // Fallback if needed
      box.remove();
    });
})();
