// AI News Factory — homepage feed
// Reads /articles.json (regenerated on every build by scripts/build-index.mjs)
// and renders it. No server, no database — the JSON file IS the CMS.
//
// Two filter dimensions:
//   - category (📂 tag on each article, e.g. "World", "Crypto", "Astrology")
//   - zone     (🌍 tag on each article, e.g. "India", "US", "Global" — defaults
//               to "Global" if the article template doesn't set one)
//
// Both are readable from the URL (?cat=world&zone=india) so links from
// article pages (e.g. <a href="/?cat=world">World</a>) actually work,
// instead of pointing at a filter the homepage never applied.

const PAGE_SIZE = 9;

const state = {
  all: [],
  filtered: [],
  shown: 0,
  category: "all",
  zone: "all",
  query: "",
};

const grid = document.getElementById("articleGrid");
const emptyState = document.getElementById("emptyState");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const chipRow = document.getElementById("chipRow");
const categoryNav = document.getElementById("categoryNav");
const searchInput = document.getElementById("searchInput");
const zoneControls = document.getElementById("zoneControls");
const zoneChipRow = document.getElementById("zoneChipRow");

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
        <div class="card-meta"><span>${escapeHtml(a.zone || "Global")}</span><span>${timeAgo(a.date)}</span></div>
      </div>
    </article>`;
}

function updateUrl() {
  const params = new URLSearchParams();
  if (state.category !== "all") params.set("cat", state.category);
  if (state.zone !== "all") params.set("zone", state.zone);
  const qs = params.toString();
  const newUrl = qs ? `/?${qs}` : "/";
  history.replaceState(null, "", newUrl);
}

function applyFilters() {
  const q = state.query.trim().toLowerCase();
  state.filtered = state.all.filter((a) => {
    const matchesCat = state.category === "all" || a.category.toLowerCase() === state.category;
    const matchesZone = state.zone === "all" || (a.zone || "global").toLowerCase() === state.zone;
    const matchesQuery = !q || a.title.toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q);
    return matchesCat && matchesZone && matchesQuery;
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

// Rough timezone → region guess, used only to pre-select a zone chip on
// first visit if the site has zone-tagged articles. Visitors can always
// pick a different zone manually; nothing is forced.
function guessZoneFromTimezone() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const map = [
    [/^Asia\/(Kolkata|Calcutta)$/, "india"],
    [/^Asia\//, "asia"],
    [/^Europe\//, "europe"],
    [/^America\//, "americas"],
    [/^Africa\//, "africa"],
    [/^(Australia|Pacific)\//, "oceania"],
  ];
  for (const [re, zone] of map) {
    if (re.test(tz)) return zone;
  }
  return null;
}

function buildCategoryUI(categories) {
  categories.forEach((cat) => {
    const a = document.createElement("a");
    a.href = `/?cat=${encodeURIComponent(cat.toLowerCase())}`;
    a.textContent = cat;
    a.dataset.cat = cat.toLowerCase();
    categoryNav.insertBefore(a, categoryNav.querySelector('a[href="/archive.html"]'));
  });

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

  function setCategory(cat) {
    state.category = cat;
    [...chipRow.children].forEach((c) => c.classList.toggle("active", c.dataset.cat === cat));
    [...categoryNav.children].forEach((a) => a.classList.toggle("active", (a.dataset.cat || "all") === cat));
    updateUrl();
    applyFilters();
  }

  chipRow.addEventListener("click", (e) => {
    if (e.target.matches(".chip")) setCategory(e.target.dataset.cat);
  });
  categoryNav.addEventListener("click", (e) => {
    if (e.target.matches("a[data-cat]")) {
      e.preventDefault();
      setCategory(e.target.dataset.cat);
    }
  });

  return setCategory;
}

function buildZoneUI(zones) {
  // Only show the region row at all if articles actually use more than
  // just the "Global" default — otherwise it's an empty control nobody needs.
  if (zones.length <= 1) return null;

  zoneControls.hidden = false;

  const allChip = document.createElement("button");
  allChip.className = "chip active";
  allChip.textContent = "All Regions";
  allChip.dataset.zone = "all";
  zoneChipRow.appendChild(allChip);

  zones.forEach((zone) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = zone;
    chip.dataset.zone = zone.toLowerCase();
    zoneChipRow.appendChild(chip);
  });

  function setZone(zone) {
    state.zone = zone;
    [...zoneChipRow.children].forEach((c) => c.classList.toggle("active", c.dataset.zone === zone));
    updateUrl();
    applyFilters();
  }

  zoneChipRow.addEventListener("click", (e) => {
    if (e.target.matches(".chip")) setZone(e.target.dataset.zone);
  });

  return setZone;
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
    const zones = [...new Set(state.all.map((a) => a.zone || "Global"))].sort();

    const setCategory = buildCategoryUI(categories);
    const setZone = buildZoneUI(zones);

    // Apply whatever came in via URL (?cat=world&zone=india) so links
    // from article pages and shared URLs actually filter the feed.
    const params = new URLSearchParams(location.search);
    const urlCat = (params.get("cat") || "all").toLowerCase();
    const urlZone = (params.get("zone") || "").toLowerCase();

    if (categories.some((c) => c.toLowerCase() === urlCat)) setCategory(urlCat);

    if (urlZone && setZone && zones.some((z) => z.toLowerCase() === urlZone)) {
      setZone(urlZone);
    } else if (setZone && !urlZone) {
      // No explicit zone requested — try a soft auto-detect based on the
      // visitor's timezone, but only if it actually matches a zone we have
      // articles for. Never overrides an explicit URL param or search.
      const guess = guessZoneFromTimezone();
      if (guess && zones.some((z) => z.toLowerCase() === guess)) setZone(guess);
    }

    applyFilters();
  })
  .catch(() => {
    grid.innerHTML = "";
    emptyState.textContent = "Couldn't load articles right now — please refresh.";
    emptyState.hidden = false;
  });
