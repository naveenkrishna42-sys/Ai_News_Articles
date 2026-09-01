
const FALLBACK_IMG = "https://images.pexels.com/photos/158651/news-newsletter-newspaper-information-158651.jpeg?auto=compress&cs=tinysrgb&h=400&w=600";
function getThumbnailUrl(url) {
  if (!url) return FALLBACK_IMG;
  url = url.replace(/&amp;/g, '&');
  if (url.includes('images.pexels.com') || url.includes('images.unsplash.com')) {
    return url.replace(/w=[0-9]+/, 'w=400').replace(/h=[0-9]+/, 'h=225');
  }
  if (url.includes('upload.wikimedia.org')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=400&output=webp`;
  }
  return url;
}
function getHeroUrl(url) {
  if (!url) return FALLBACK_IMG;
  url = url.replace(/&amp;/g, '&');
  if (url.includes('images.pexels.com') || url.includes('images.unsplash.com')) {
    return url.replace(/w=[0-9]+/, 'w=1200').replace(/h=[0-9]+/, 'h=675');
  }
  if (url.includes('upload.wikimedia.org')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1200&output=webp`;
  }
  return url;
}
// TIVRA News - category page
// Reads ?cat=<slug> from the URL and shows every recent article whose
// category slugifies to the same value (so "World News" and "world-news"
// both match cleanly regardless of exact casing/spacing in the source).

const PAGE_SIZE = 36;

function slugifyCategory(cat) {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthName = months[parseInt(m, 10) - 1] || m;
  return `${monthName} ${parseInt(d, 10)}, ${y}`;
}

function cardHtml(a) {
  const img = getThumbnailUrl(a.image);
  return `
    <article class="card">
      <a href="${a.url}"><img src="${img}" alt="${escapeHtml(a.title)}" width="400" height="225" loading="lazy"></a>
      <div class="card-body">
        <span class="cat-tag">${escapeHtml(a.category)}</span>
        <h3><a href="${a.url}">${escapeHtml(a.title)}</a></h3>
        <p class="excerpt">${escapeHtml((a.description || "").slice(0, 110))}${a.description && a.description.length > 110 ? "..." : ""}</p>
        <div class="card-meta"><span>${formatDate(a.date)}</span></div>
      </div>
    </article>`;
}

const params = new URLSearchParams(window.location.search);
const catSlug = params.get("cat") || "";

const grid = document.getElementById("articleGrid");
const emptyState = document.getElementById("emptyState");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const searchInput = document.getElementById("searchInput");

document.getElementById("year").textContent = new Date().getFullYear();

const state = { matching: [], shown: 0, query: "" };

function renderNextPage() {
  const q = state.query.trim().toLowerCase();
  const filtered = state.matching.filter(
    (a) => !q || a.title.toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q)
  );
  if (state.shown === 0) grid.innerHTML = "";
  const next = filtered.slice(state.shown, state.shown + PAGE_SIZE);
  grid.insertAdjacentHTML("beforeend", next.map(cardHtml).join(""));
  state.shown += next.length;
  emptyState.hidden = filtered.length !== 0;
  loadMoreBtn.hidden = state.shown >= filtered.length;
}

searchInput.addEventListener("input", (e) => {
  state.query = e.target.value;
  state.shown = 0;
  renderNextPage();
});
loadMoreBtn.addEventListener("click", renderNextPage);

fetch("/articles.json", { cache: "no-store" })
  .then((r) => r.json())
  .then((data) => {
    const all = data.articles || [];
    const matching = all.filter((a) => slugifyCategory(a.category) === catSlug);
    state.matching = matching;

    const label = matching[0] ? matching[0].category : catSlug.replace(/-/g, " ");
    document.title = `${label} News - TIVRA News`;
    document.getElementById("pageDescription").setAttribute(
      "content",
      `Latest ${label} news, updated automatically - AI News Factory.`
    );
    document.getElementById("categoryTitle").textContent = `${label} News`;
    document.getElementById("breadcrumbCat").textContent = label;
    document.getElementById("categorySub").textContent =
      matching.length > 0
        ? `${matching.length} recent ${label} ${matching.length === 1 ? "story" : "stories"}.`
        : `No recent ${label} stories yet - check back soon.`;

    renderNextPage();
  })
  .catch(() => {
    emptyState.textContent = "Couldn't load this category right now - please refresh.";
    emptyState.hidden = false;
  });
