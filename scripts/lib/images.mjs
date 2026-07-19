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

export async function searchPexels(query) {
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

export async function searchPixabay(query) {
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

// NOTE: Pixabay is deliberately NOT in this chain. Its API image URLs are
// temporary and expire ("This URL is invalid or has expired") — hotlinking
// them puts dead images on the site. Pexels CDN URLs are permanent.
export async function findImage(titleOrQuery, category, fallbackImages) {
  const query = imageQueryFromTitle(titleOrQuery, category);
  let url = await searchPexels(query);
  if (!url && query !== category) {
    url = await searchPexels(category);
  }
  if (!url) {
    const pool = fallbackImages[category] || fallbackImages._default || [];
    url = pool[Math.floor(Math.random() * pool.length)] || "";
  }
  return url;
}

// ---- Wikipedia/Wikimedia portraits for famous people ----
// The only legal FREE source of real photos of specific actors, players and
// politicians. Wikimedia allows hotlinking; images of living people on
// Wikipedia are free-licensed (we verify via Commons and skip anything
// marked non-free/fair-use). Returns { url, credit } or null.

const PERSON_DESC = /actor|actress|singer|politician|minister|cricketer|footballer|athlete|player|director|producer|musician|composer|author|writer|business|executive|entrepreneur|scientist|astronaut|coach|captain|president|economist|judge|advocate|comedian|anchor|journalist|youtuber|rapper|dancer|model|chess|celebrity|filmmaker|host|founder/i;

export async function findWikipediaPortrait(name) {
  if (!name || name.trim().split(/\s+/).length < 2) return null; // full names only
  try {
    const sum = await timedFetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.trim())}`,
      { "User-Agent": "TIVRA-News/1.0 (image lookup)" }
    );
    if (!sum.ok) return null;
    const s = await sum.json();
    if (s.type !== "standard" || !PERSON_DESC.test(s.description || "")) return null;

    // High-res lead image + the underlying file name for the license check.
    const q = await timedFetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(s.title)}&prop=pageimages&piprop=thumbnail%7Cname&pithumbsize=1200&format=json&origin=*`,
      { "User-Agent": "TIVRA-News/1.0 (image lookup)" }
    );
    if (!q.ok) return null;
    const pages = (await q.json())?.query?.pages || {};
    const page = Object.values(pages)[0];
    const thumb = page?.thumbnail?.source;
    const fileName = page?.pageimage;
    if (!thumb || !fileName) return null;

    // License check on Commons — reject non-free/fair-use (also rejects
    // files that exist only on en.wikipedia, which are usually non-free).
    const li = await timedFetch(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=extmetadata&format=json&origin=*`,
      { "User-Agent": "TIVRA-News/1.0 (license check)" }
    );
    if (!li.ok) return null;
    const fpages = (await li.json())?.query?.pages || {};
    const fpage = Object.values(fpages)[0];
    const meta = fpage?.imageinfo?.[0]?.extmetadata;
    if (!meta) return null;
    const license = meta.LicenseShortName?.value || "";
    if (!license || /non-free|fair/i.test(license)) return null;
    const artist = (meta.Artist?.value || "").replace(/<[^>]+>/g, "").trim().slice(0, 60);

    return {
      url: thumb,
      credit: `Wikimedia Commons${artist ? ` / ${artist}` : ""} · ${license}`,
    };
  } catch {
    return null;
  }
}

// Capitalized-name candidates from a headline (for repairing old articles
// where no AI call is available): "Aamir Khan Confirms..." -> ["Aamir Khan"].
export function personCandidatesFromTitle(title) {
  const clean = title.replace(/[^A-Za-z\s.'-]/g, " ");
  const matches = clean.match(/(?:[A-Z][a-z'.-]+\s+){1,2}[A-Z][a-z'.-]+/g) || [];
  const out = [];
  for (const m of matches.map((s) => s.trim())) {
    const words = m.split(/\s+/);
    if (words.length >= 2) out.push(words.slice(0, 2).join(" ")); // "Aamir Khan Confirms" -> "Aamir Khan"
    if (words.length === 3) out.push(m);
  }
  return [...new Set(out)].slice(0, 3);
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
