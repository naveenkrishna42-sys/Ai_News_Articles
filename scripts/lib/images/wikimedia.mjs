// Wikimedia Commons API search. CC/public-domain images of gadgets and people.
// Returns {url,width,height,license,author,sourceUrl,provider} or null.

import { matchesQuery } from "./relevance.mjs";

const TIMEOUT_MS = 10_000;

async function timedFetch(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, headers });
  } finally {
    clearTimeout(timer);
  }
}

// Bitmap extensions only; reject media, audio, vector formats.
const BITMAP_EXT = /\.(?:jpe?g|png|webp)$/i;
const REJECT_EXT = /\.(?:svg|pdf|tif|ogv)$/i;

export async function search(query) {
  try {
    const res = await timedFetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|size|extmetadata&format=json&origin=*&iiurlwidth=1600`,
      { "User-Agent": "TIVRA-News/1.0 (image lookup)" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages || {};

    // Collect qualifying images, prefer widest.
    let best = null;
    let bestWidth = 0;
    for (const page of Object.values(pages)) {
      const fileName = page.title || "";
      const info = page.imageinfo?.[0];
      if (!info) continue;

      // Reject unsupported formats.
      if (REJECT_EXT.test(fileName)) continue;
      if (!BITMAP_EXT.test(fileName)) continue;

      // Must actually depict what was searched for.
      if (!matchesQuery(fileName, query)) continue;

      // Reject < 800px wide.
      const width = parseInt(info.width, 10) || 0;
      if (width < 800) continue;

      // Reject non-free/fair-use licenses. Read from extmetadata like
      // findWikipediaPortrait does.
      const meta = info.extmetadata || {};
      const license = meta.LicenseShortName?.value || "";
      if (!license || /non-free|fair/i.test(license)) continue;

      // Extract author, strip HTML tags.
      const author = (meta.Artist?.value || "")
        .replace(/<[^>]+>/g, "")
        .trim()
        .slice(0, 60);

      // Prefer widest.
      if (width > bestWidth) {
        const thumbUrl = info.thumburl;
        const resultWidth = thumbUrl ? (parseInt(info.thumbwidth, 10) || 0) : width;
        const resultHeight = thumbUrl ? (parseInt(info.thumbheight, 10) || 0) : (parseInt(info.height, 10) || 0);
        best = {
          url: thumbUrl || info.url,
          width: resultWidth,
          height: resultHeight,
          license,
          author,
          sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURI(fileName.replace(/ /g, "_"))}`,
          provider: "Wikimedia",
        };
        bestWidth = width;
      }
    }
    return best;
  } catch {
    return null;
  }
}

export async function preflight() {
  try {
    const r = await timedFetch(
      "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=test&gsrnamespace=6&gsrlimit=1&format=json&origin=*",
      { "User-Agent": "TIVRA-News/1.0 (image lookup)" }
    );
    return r.ok ? "Wikimedia: OK ✅" : `Wikimedia: FAILED (HTTP ${r.status})`;
  } catch (e) {
    return `Wikimedia: FAILED (${e.message})`;
  }
}
