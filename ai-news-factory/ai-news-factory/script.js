// AI News Factory — homepage feed
// Reads /articles.json (regenerated on every build by scripts/build-index.mjs)
// and renders it. No server, no database — the JSON file IS the CMS.

const PAGE_SIZE = 9;

const state = {
  all: [],
  filtered: [],
  shown: 0,
  category: "all",
  query: "",
};

const grid = document.getElementById("articleGrid");
const emptyState = document.getElementById("emptyState");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const chipRow = document.getElementById("chipRow");
const categoryNav = document.getElementById("categoryNav");
const searchInput = document.getElementById("searchInput");

document.getElementById("year").textContent = new Date().getFullYear();

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
      <a href="${a.url}"><img src="${img}" alt="${escapeHtml(a.title)}" loading="lazy"></a>
      <div class="card-body">
        <span class="cat-tag">${escapeHtml(a.category)}</span>
        <h3><a href="${a.url}">${escapeHtml(a.title)}</a></h3>
        <p class="excerpt">${escapeHtml((a.description || "").slice(0, 110))}${a.description && a.description.length > 110 ? "…" : ""}</p>
        <div class="card-meta"><span>${timeAgo(a.date)}</span></div>
      </div>
    </article>`;
}

function applyFilters() {
  const q = state.query.trim().toLowerCase();
  state.filtered = state.all.filter((a) => {
    const matchesCat = state.category === "all" || a.category.toLowerCase() === state.category;
    const matchesQuery = !q || a.title.toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });
  state.shown = 0;
  grid.innerHTML = "";
  renderNextPage();
}

function renderNextPage() {
  const next = state.filtered.slice(state.shown, state.shown + PAGE_SIZE);
  grid.insertAdjacentHTML("beforeend", next.map(cardHtml).join(""));
  state.shown += next.length;

  emptyState.hidden = state.filtered.length !== 0;
  loadMoreBtn.hidden = state.shown >= state.filtered.length;
}

function buildCategoryUI(categories) {
  // Top nav (site-wide sections)
  categories.forEach((cat) => {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = cat;
    a.dataset.cat = cat.toLowerCase();
    categoryNav.appendChild(a);
  });

  // Filter chips (same categories, friendlier UI on the page itself)
  const allChip = document.createElement("button");
  allChip.className = "chip active";
  allChip.textContent = "All";
  allChip.dataset.cat = "all";
  chipRow.appendChild(allChip);

  categories.forEach((cat) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = cat;
    chip.dataset.cat = cat.toLowerCase();
    chipRow.appendChild(chip);
  });

  function setCategory(cat, el) {
    state.category = cat;
    [...chipRow.children].forEach((c) => c.classList.toggle("active", c.dataset.cat === cat));
    [...categoryNav.children].forEach((a) => a.classList.toggle("active", (a.dataset.cat || "all") === cat));
    applyFilters();
  }

  chipRow.addEventListener("click", (e) => {
    if (e.target.matches(".chip")) setCategory(e.target.dataset.cat, e.target);
  });
  categoryNav.addEventListener("click", (e) => {
    if (e.target.matches("a[data-cat]")) {
      e.preventDefault();
      setCategory(e.target.dataset.cat, e.target);
    }
  });
}

searchInput.addEventListener("input", (e) => {
  state.query = e.target.value;
  applyFilters();
});

loadMoreBtn.addEventListener("click", renderNextPage);

fetch("/articles.json", { cache: "no-store" })
  .then((r) => r.json())
  .then((data) => {
    state.all = data.articles || [];
    const categories = [...new Set(state.all.map((a) => a.category))].sort();
    buildCategoryUI(categories);
    applyFilters();
  })
  .catch(() => {
    grid.innerHTML = "";
    emptyState.textContent = "Couldn't load articles right now — please refresh.";
    emptyState.hidden = false;
  });
