// AI News Factory — archive page
// Reads /archive/index.json (list of months) and /archive/{month}.json
// (full article list for a given month), both regenerated on every build
// by scripts/build-index.mjs. This is where articles live once they age
// out of the homepage's 30-day rolling window — nothing is ever deleted.

const PAGE_SIZE = 18;

const state = {
  monthArticles: [],
  shown: 0,
  currentMonth: null,
};

const grid = document.getElementById("archiveGrid");
const emptyState = document.getElementById("archiveEmpty");
const loadMoreBtn = document.getElementById("archiveLoadMore");
const monthChips = document.getElementById("monthChips");
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

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

function renderNextPage() {
  const next = state.monthArticles.slice(state.shown, state.shown + PAGE_SIZE);
  grid.insertAdjacentHTML("beforeend", next.map(cardHtml).join(""));
  state.shown += next.length;

  emptyState.hidden = state.monthArticles.length !== 0;
  loadMoreBtn.hidden = state.shown >= state.monthArticles.length;
}

function loadMonth(month) {
  state.currentMonth = month;
  grid.innerHTML = "";
  state.shown = 0;

  [...monthChips.children].forEach((c) => c.classList.toggle("active", c.dataset.month === month));

  fetch(`/archive/${month}.json`, { cache: "no-store" })
    .then((r) => r.json())
    .then((data) => {
      state.monthArticles = data.articles || [];
      renderNextPage();
    })
    .catch(() => {
      emptyState.textContent = "Couldn't load this month's articles — please refresh.";
      emptyState.hidden = false;
    });
}

loadMoreBtn.addEventListener("click", renderNextPage);

fetch("/archive/index.json", { cache: "no-store" })
  .then((r) => r.json())
  .then((data) => {
    const months = data.months || [];
    if (months.length === 0) {
      emptyState.textContent = "No archived articles yet — check back once articles age past 30 days.";
      emptyState.hidden = false;
      return;
    }

    months.forEach((m) => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.textContent = `${m.label} (${m.count})`;
      chip.dataset.month = m.month;
      chip.addEventListener("click", () => loadMonth(m.month));
      monthChips.appendChild(chip);
    });

    loadMonth(months[0].month); // default to most recent month
  })
  .catch(() => {
    emptyState.textContent = "Couldn't load the archive right now — please refresh.";
    emptyState.hidden = false;
  });
