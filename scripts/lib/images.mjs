// TIVRA News — copyright-safe imagery.
// Pexels first, Pixabay second, curated per-category fallback last — every
// article always gets an image, and every image is licensed for free
// commercial use (no attribution required, no takedown risk). We hotlink
// the providers' CDNs (both explicitly allow it) so the repo stays small.

const TIMEOUT_MS = 10_000;

const GENERIC = new Set(
  "news update updates latest breaking today live report reports story stories india indian world new says said amid after over from with will been have this that what when where why how".split(" ")
);

export function imageQueryFromTitle(title, category) {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !GENERIC.has(w));
  const query = words.slice(0, 4).join(" ");
  return query || category;
}

async function timedFetch(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, headers });
  } finally {
    clearTimeout(timer);
  }
}

function pick(arr) {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}

async function searchPexels(query) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const res = await timedFetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      { Authorization: key }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Random pick among top matches so same-category stories don't all
    // land on an identical photo.
    const photo = pick(data?.photos || []);
    return photo ? `${photo.src.landscape}` : null;
  } catch {
    return null;
  }
}

async function searchPixabay(query) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  try {
    const res = await timedFetch(
      `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=5&safesearch=true`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hit = pick(data?.hits || []);
    return hit ? hit.webformatURL : null;
  } catch {
    return null;
  }
}

// Run-start diagnostics: one test call per image provider so the Actions
// log states plainly whether each key works — no more silent fallbacks.
export async function mediaPreflight() {
  const report = [];
  if (!process.env.PEXELS_API_KEY) {
    report.push("Pexels: NO KEY (secret PEXELS_API_KEY missing)");
  } else {
    try {
      const r = await timedFetch("https://api.pexels.com/v1/search?query=news&per_page=1", {
        Authorization: process.env.PEXELS_API_KEY,
      });
      report.push(r.ok ? "Pexels: OK ✅" : `Pexels: FAILED (HTTP ${r.status}) — check the PEXELS_API_KEY secret value (should be ~56 letters/numbers, NO dash, from pexels.com/api)`);
    } catch (e) {
      report.push(`Pexels: FAILED (${e.message})`);
    }
  }
  if (!process.env.PIXABAY_API_KEY) {
    report.push("Pixabay: NO KEY (secret PIXABAY_API_KEY missing)");
  } else {
    try {
      const r = await timedFetch(`https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=news&per_page=3`);
      report.push(r.ok ? "Pixabay: OK ✅" : `Pixabay: FAILED (HTTP ${r.status}) — check the PIXABAY_API_KEY secret value (format 12345678-abc… WITH a dash, from pixabay.com/api/docs)`);
    } catch (e) {
      report.push(`Pixabay: FAILED (${e.message})`);
    }
  }
  return report;
}

export async function findImage(title, category, fallbackImages) {
  const query = imageQueryFromTitle(title, category);
  let url = await searchPexels(query);
  if (!url) url = await searchPixabay(query);
  if (!url && query !== category) {
    url = await searchPexels(category);
  }
  if (!url) {
    const pool = fallbackImages[category] || fallbackImages._default || [];
    url = pool[Math.floor(Math.random() * pool.length)] || "";
  }
  return url;
}

// Optional: a related YouTube video (needs YOUTUBE_API_KEY; silently skipped
// without it — the article still carries a YouTube search link either way).
export async function findYouTubeVideo(title) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return "";
  try {
    const res = await timedFetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(title)}&key=${key}`
    );
    if (!res.ok) return "";
    const data = await res.json();
    return data?.items?.[0]?.id?.videoId || "";
  } catch {
    return "";
  }
}
