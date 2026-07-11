// AI News Factory — related articles widget
// Drop this into any article page like:
//
//   <div id="relatedArticles"></div>
//   <script src="/related.js" data-category="World" data-slug="spain-wildfire" data-limit="3"></script>
//
// It fetches /articles.json (same rolling-30-day feed the homepage uses),
// finds other articles in the same category, and renders real, working
// links — instead of hardcoded article IDs that don't correspond to any
// page on this site.
//
// If nothing matches (e.g. this is the only article in its category right
// now, or the article itself has aged out of the 30-day window), the
// widget hides itself rather than showing an empty box or a broken link.

(function () {
  const thisScript = document.currentScript;
  const category = (thisScript.dataset.category || "").toLowerCase();
  const currentSlug = thisScript.dataset.slug || "";
  const limit = parseInt(thisScript.dataset.limit || "3", 10);

  let container = document.getElementById("relatedArticles");
  if (!container) {
    container = document.createElement("div");
    container.id = "relatedArticles";
    thisScript.parentNode.insertBefore(container, thisScript);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  fetch("/articles.json", { cache: "no-store" })
    .then((r) => r.json())
    .then((data) => {
      const related = (data.articles || [])
        .filter((a) => a.slug !== currentSlug && a.category.toLowerCase() === category)
        .slice(0, limit);

      if (related.length === 0) {
        container.remove();
        return;
      }

      const items = related
        .map((a) => `<li style="margin-bottom:8px;"><a href="${a.url}" style="color:#3b82f6;text-decoration:none;font-weight:500;">${escapeHtml(a.title)}</a></li>`)
        .join("");

      container.innerHTML = `
        <div style="margin-top:40px;padding:24px;border-top:1px solid #e2e8f0;background:#f8fafc;border-radius:8px;">
          <h4 style="font-size:1.15rem;font-weight:700;margin-bottom:16px;color:#0f172a;">Also Read in ${escapeHtml(related[0].category)}</h4>
          <ul style="list-style-type:square;padding-left:20px;margin:0;">${items}</ul>
        </div>`;
    })
    .catch(() => container.remove());
})();
