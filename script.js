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
// TIVRA News - homepage & mobile news feed.
// Reads edge feed / static feed and renders: breaking ticker, auto-rotating hero slider,
// auto-scrolling category rails, mobile infinite scroll & smart search. No heavy frameworks.

const PAGE_SIZE = 48;
const HERO_COUNT = 5;
const HERO_INTERVAL = 5000;
const RAIL_INTERVAL = 4200;

const state = { all: [], filtered: [], shown: 0, category: "all", query: "", featured: [] };

const $ = (id) => document.getElementById(id);
const grid = $("articleGrid");
const emptyState = $("emptyState");
const loadMoreBtn = $("loadMoreBtn");
const chipRow = $("chipRow");
const categoryNav = $("categoryNav");
const searchInput = $("searchInput");

if ($("year")) $("year").textContent = new Date().getFullYear();
if ($("headDate")) {
  $("headDate").textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  });
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function slugifyCategory(cat) {
  return String(cat || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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


/* ---------- Breaking ticker ---------- */
function buildTicker(all) {
  if (!$("tickerTrack") || !$("ticker")) return;
  const items = all.slice(0, 12);
  if (!items.length) return;
  const links = items.map((a) => `<a href="${a.url}">${escapeHtml(a.title)}</a>`).join("");
  $("tickerTrack").innerHTML = links + links; // seamless loop
  $("ticker").hidden = false;
}

/* ---------- Hero slider ---------- */
let heroIndex = 0, heroTimer = null, heroSlides = 0;

function buildHero(all) {
  if (!$("heroTrack") || !$("hero")) return;
  const withImages = all.filter((a) => a.image);
  const picks = (withImages.length >= HERO_COUNT ? withImages : all).slice(0, HERO_COUNT);
  if (!picks.length) return;
  heroSlides = picks.length;

  $("heroTrack").innerHTML = picks.map((a, idx) => `
    <a class="hero-slide" href="${a.url}">
      <img src="${getHeroUrl(a.image)}" alt="${escapeHtml(a.title)}" width="1200" height="675" ${idx === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
      <div class="hero-overlay"></div>
      <div class="hero-text">
        <span class="cat-pill">${escapeHtml(a.category)}</span>
        <h2>${escapeHtml(a.title)}</h2>
        <div class="hero-meta">${formatDate(a.date)} · ${escapeHtml((a.description || "").slice(0, 90))}${(a.description || "").length > 90 ? "..." : ""}</div>
      </div>
    </a>`).join("");

  if ($("heroDots")) {
    $("heroDots").innerHTML = picks.map((_, i) =>
      `<button data-i="${i}" class="${i === 0 ? "active" : ""}" aria-label="Go to story ${i + 1}"></button>`).join("");
  }

  $("hero").hidden = false;

  const track = $("heroTrack");
  function goTo(i, smooth = true) {
    heroIndex = (i + heroSlides) % heroSlides;
    track.scrollTo({ left: track.clientWidth * heroIndex, behavior: smooth ? "smooth" : "auto" });
    if ($("heroDots")) {
      [...$("heroDots").children].forEach((d, di) => d.classList.toggle("active", di === heroIndex));
    }
  }
  if ($("heroDots")) {
    $("heroDots").addEventListener("click", (e) => {
      if (e.target.dataset.i !== undefined) { goTo(Number(e.target.dataset.i)); restartHero(); }
    });
  }
  if ($("heroPrev")) $("heroPrev").addEventListener("click", () => { goTo(heroIndex - 1); restartHero(); });
  if ($("heroNext")) $("heroNext").addEventListener("click", () => { goTo(heroIndex + 1); restartHero(); });

  let scrollDebounce;
  track.addEventListener("scroll", () => {
    clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(() => {
      const i = Math.round(track.scrollLeft / (track.clientWidth || 1));
      if (i !== heroIndex && i < heroSlides) {
        heroIndex = (i + heroSlides) % heroSlides;
        if ($("heroDots")) {
          [...$("heroDots").children].forEach((d, di) => d.classList.toggle("active", di === heroIndex));
        }
      }
    }, 80);
  }, { passive: true });

  function startHero() { heroTimer = setInterval(() => goTo(heroIndex + 1), HERO_INTERVAL); }
  function restartHero() { clearInterval(heroTimer); startHero(); }
  $("hero").addEventListener("mouseenter", () => clearInterval(heroTimer));
  $("hero").addEventListener("mouseleave", restartHero);
  $("hero").addEventListener("touchstart", () => clearInterval(heroTimer), { passive: true });
  $("hero").addEventListener("touchend", restartHero, { passive: true });
  startHero();
}

/* ---------- Category rails (auto-scrolling) ---------- */
function carouselCardHtml(a) {
  return `
    <a class="carousel-card" href="${a.url}">
      <img src="${a.image || FALLBACK_IMG}" alt="${escapeHtml(a.title)}" loading="lazy">
      <div class="cc-body">
        <h3>${escapeHtml(a.title)}</h3>
        <div class="cc-meta">${formatDate(a.date)}</div>
      </div>
    </a>`;
}

function buildCategoryCarousels(all, featuredOrder) {
  const el = $("categoryCarousels");
  if (!el) return;

  const byCategory = new Map();
  for (const a of all) {
    if (!byCategory.has(a.category)) byCategory.set(a.category, []);
    byCategory.get(a.category).push(a);
  }

  const featuredPresent = (featuredOrder || []).filter((c) => byCategory.has(c));
  const rest = [...byCategory.keys()].filter((c) => !featuredPresent.includes(c))
    .sort((a, b) => (byCategory.get(a)[0].date < byCategory.get(b)[0].date ? 1 : -1));
  const ordered = [...featuredPresent, ...rest.slice(0, Math.max(0, 12 - featuredPresent.length))];

  el.innerHTML = ordered.map((cat) => {
    const items = byCategory.get(cat).slice(0, 10);
    const slug = slugifyCategory(cat);
    return `
      <section class="category-section">
        <div class="category-section-head">
          <h2>${escapeHtml(cat)}</h2>
          <a href="/category.html?cat=${encodeURIComponent(slug)}">View all →</a>
        </div>
        <div class="carousel-track" data-rail>${items.map(carouselCardHtml).join("")}</div>
      </section>`;
  }).join("");

  document.querySelectorAll("[data-rail]").forEach((rail, idx) => {
    let paused = false;
    rail.addEventListener("mouseenter", () => (paused = true));
    rail.addEventListener("mouseleave", () => (paused = false));
    rail.addEventListener("touchstart", () => (paused = true), { passive: true });
    setInterval(() => {
      if (paused || document.hidden) return;
      const nearEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 20;
      if (nearEnd) rail.scrollTo({ left: 0, behavior: "smooth" });
      else rail.scrollBy({ left: 266, behavior: "smooth" });
    }, RAIL_INTERVAL + (idx % 3) * 700);
  });
}

/* ---------- Latest grid + search ---------- */
function cardHtml(a) {
  return `
    <article class="card">
      <a href="${a.url}"><img src="${getThumbnailUrl(a.image)}" alt="${escapeHtml(a.title)}" width="400" height="225" loading="lazy"></a>
      <div class="card-body">
        <span class="cat-tag">${escapeHtml(a.category)}</span>
        <h3><a href="${a.url}">${escapeHtml(a.title)}</a></h3>
        <p class="excerpt">${escapeHtml((a.description || "").slice(0, 110))}${a.description && a.description.length > 110 ? "..." : ""}</p>
        <div class="card-meta"><span>${formatDate(a.date)}</span></div>
      </div>
    </article>`;
}

function applyFilters() {
  const q = state.query.trim().toLowerCase();
  state.filtered = state.all.filter((a) => {
    const matchesCat = state.category === "all" || slugifyCategory(a.category) === state.category;
    const matchesQuery = !q || a.title.toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });
  state.shown = 0;
  if (grid) grid.innerHTML = "";
  renderNextPage();
}

function renderNextPage() {
  if (!grid) return;
  const next = state.filtered.slice(state.shown, state.shown + PAGE_SIZE);
  grid.insertAdjacentHTML("beforeend", next.map(cardHtml).join(""));
  state.shown += next.length;
  if (emptyState) emptyState.hidden = state.filtered.length !== 0;
  if (loadMoreBtn) loadMoreBtn.hidden = state.shown >= state.filtered.length;
}

function buildCategoryUI(categories, featuredOrder) {
  if (!categoryNav || !chipRow) return;
  categoryNav.innerHTML = '<a href="/" class="active">Home</a>';
  chipRow.innerHTML = "";

  const featured = (featuredOrder || []).filter((c) => categories.includes(c));
  const rest = categories.filter((c) => !featured.includes(c)).sort();

  for (const cat of featured) {
    const a = document.createElement("a");
    a.href = "/category.html?cat=" + encodeURIComponent(slugifyCategory(cat));
    a.textContent = cat;
    categoryNav.appendChild(a);
  }
  if (rest.length) {
    const details = document.createElement("details");
    details.className = "more";
    details.innerHTML = `<summary>More</summary><div class="more-menu">${rest
      .map((c) => `<a href="/category.html?cat=${encodeURIComponent(slugifyCategory(c))}">${escapeHtml(c)}</a>`)
      .join("")}<a href="/archive.html">Archive</a></div>`;
    categoryNav.appendChild(details);
    document.addEventListener("click", (e) => {
      if (!details.contains(e.target)) details.removeAttribute("open");
    });
  }

  // Filter chips over the latest grid - featured categories only, "All" first.
  const mkChip = (label, cat) => {
    const chip = document.createElement("button");
    chip.className = "chip" + (cat === "all" ? " active" : "");
    chip.textContent = label;
    chip.dataset.cat = cat;
    chipRow.appendChild(chip);
  };
  mkChip("All", "all");
  for (const cat of featured.slice(0, 8)) mkChip(cat, slugifyCategory(cat));

  chipRow.addEventListener("click", (e) => {
    if (!e.target.matches(".chip")) return;
    state.category = e.target.dataset.cat;
    [...chipRow.children].forEach((c) => c.classList.toggle("active", c.dataset.cat === state.category));
    applyFilters();
  });
}

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    state.query = e.target.value;
    applyFilters();
  });
}
if (loadMoreBtn) {
  loadMoreBtn.addEventListener("click", renderNextPage);

  // Mobile Infinite Scroll: automatic next page load on scroll
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadMoreBtn.hidden) {
        renderNextPage();
      }
    }, { rootMargin: "300px" });
    observer.observe(loadMoreBtn);
  }
}

/* ---------- Dual-Layer Circuit Breaker & Progressive Loading ---------- */
function renderFeed(articles, featured) {
  state.all = articles.map((a) => (a.url ? a : { ...a, url: `/articles/${a.slug}.html` }));
  state.featured = featured || [];
  buildTicker(state.all);
  buildHero(state.all);
  buildCategoryCarousels(state.all, state.featured);
  const categories = [...new Set(state.all.map((a) => a.category))];
  buildCategoryUI(categories, state.featured.length ? state.featured : categories);
  applyFilters();
}

function loadFullIndex() {
  fetch("/articles.json")
    .then((r) => r.json())
    .then((data) => {
      const all = data.articles || [];
      if (all.length <= state.all.length) return;
      const shown = state.shown;
      state.all = all.map((a) => (a.url ? a : { ...a, url: `/articles/${a.slug}.html` }));
      applyFilters();
      while (state.shown < shown && state.shown < state.filtered.length) renderNextPage();
    })
    .catch(() => {
      /* Feed is already on screen; site remains fast and usable */
    });
}

// 1. Fetch fast feed
fetch("/feed-latest.json")
  .then((r) => r.json())
  .then((data) => {
    renderFeed(data.articles || [], data.featuredCategories || []);
    if ((data.total || 0) > (data.articles || []).length) {
      if ("requestIdleCallback" in window) requestIdleCallback(loadFullIndex, { timeout: 4000 });
      else setTimeout(loadFullIndex, 1200);
    }
  })
  .catch(() => {
    // 2. Fallback to /articles.json
    fetch("/articles.json")
      .then((r) => r.json())
      .then((data) => renderFeed(data.articles || [], data.featuredCategories || []))
      .catch(() => {
        if (grid) grid.innerHTML = "";
        if (emptyState) {
          emptyState.textContent = "Couldn't load articles right now - please refresh.";
          emptyState.hidden = false;
        }
      });
  });
