// AI News Factory - category page
// Reads ?cat=<slug> from the URL and shows every recent article whose
// category slugifies to the same value (so "World News" and "world-news"
// both match cleanly regardless of exact casing/spacing in the source).

const PAGE_SIZE = 9;

function slugifyCategory(cat) {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function timeAgo(dateStr) {
  const then = new Date(dateStr + "T00:00:00Z").getTime();
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return dateStr;
}

function cardHtml(a) {
  const img = a.image || "https://images.pexels.com/photos/518543/pexels-photo-518543.jpeg?auto=compress&cs=tinysrgb&h=400&w=600";
  return `
    <article class="card">
      <a href="${a.url}"><img src="${img}" alt="${escapeHtml(a.title)}" width="400" height="225" loading="lazy"></a>
      <div class="card-body">
        <span class="cat-tag">${escapeHtml(a.category)}</span>
        <h3><a href="${a.url}">${escapeHtml(a.title)}</a></h3>
        <p class="excerpt">${escapeHtml((a.description || "").slice(0, 110))}${a.description && a.description.length > 110 ? "..." : ""}</p>
        <div class="card-meta"><span>${timeAgo(a.date)}</span></div>
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
    document.title = `${label} News - AI News Factory`;
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
