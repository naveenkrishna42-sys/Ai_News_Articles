// AI News Factory — archive page
// Loads /archive/index.json (list of months), then /archive/<month>.json
// on demand when a month is picked — keeps each request small even once
// the site has years of history.

const PAGE_SIZE = 12;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
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
        <div class="card-meta"><span>${a.date}</span></div>
      </div>
    </article>`;
}

document.getElementById("year").textContent = new Date().getFullYear();

const monthPicker = document.getElementById("monthPicker");
const grid = document.getElementById("articleGrid");
const emptyState = document.getElementById("emptyState");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const searchInput = document.getElementById("searchInput");

const state = { current: [], shown: 0, query: "" };

function renderNextPage() {
  const q = state.query.trim().toLowerCase();
  const filtered = state.current.filter(
    (a) => !q || a.title.toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q)
  );
  if (state.shown === 0) grid.innerHTML = "";
  const next = filtered.slice(state.shown, state.shown + PAGE_SIZE);
  grid.insertAdjacentHTML("beforeend", next.map(cardHtml).join(""));
  state.shown += next.length;
  emptyState.hidden = filtered.length !== 0;
  loadMoreBtn.hidden = state.shown >= filtered.length;
}

function loadMonth(monthKey, chipEl) {
  [...monthPicker.children].forEach((c) => c.classList.toggle("active", c === chipEl));
  grid.innerHTML = `<p style="color:var(--text-muted)">Loading…</p>`;
  fetch(`/archive/${monthKey}.json`, { cache: "no-store" })
    .then((r) => r.json())
    .then((data) => {
      state.current = data.articles || [];
      state.shown = 0;
      renderNextPage();
    })
    .catch(() => {
      grid.innerHTML = "";
      emptyState.textContent = "Couldn't load that month right now.";
      emptyState.hidden = false;
    });
}

searchInput.addEventListener("input", (e) => {
  state.query = e.target.value;
  state.shown = 0;
  renderNextPage();
});
loadMoreBtn.addEventListener("click", renderNextPage);

fetch("/archive/index.json", { cache: "no-store" })
  .then((r) => r.json())
  .then((data) => {
    const months = data.months || [];
    if (months.length === 0) {
      monthPicker.innerHTML = "";
      emptyState.textContent = "No archived months yet — check back once articles age past 30 days.";
      emptyState.hidden = false;
      return;
    }
    monthPicker.innerHTML = months
      .map((m) => `<button class="chip" data-month="${m.month}">${escapeHtml(m.label)} (${m.count})</button>`)
      .join("");
    monthPicker.addEventListener("click", (e) => {
      if (e.target.matches(".chip")) loadMonth(e.target.dataset.month, e.target);
    });
    // Load the most recent month by default
    const firstChip = monthPicker.querySelector(".chip");
    if (firstChip) loadMonth(firstChip.dataset.month, firstChip);
  })
  .catch(() => {
    emptyState.textContent = "Couldn't load the archive index right now.";
    emptyState.hidden = false;
  });
