// Unsplash API. Commercial use permitted, high quality. Needs UNSPLASH_ACCESS_KEY.
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

// Pick randomly among top results to avoid identical photos across articles.
function pick(arr) {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}

export async function search(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  try {
    const res = await timedFetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`,
      { Authorization: `Client-ID ${key}` }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const results = data?.results || [];

    // Unsplash is a stock library, so a device search returns *some* phone
    // rather than *the* phone. Only accept a result that actually names the
    // device — otherwise return null and let the caller fall through to a
    // generic image that is honestly captioned "Representative image".
    const relevant = results.filter((p) =>
      matchesQuery(`${p.description || ""} ${p.alt_description || ""}`, query)
    );

    // Pick randomly among top 5 to vary articles by topic.
    const photo = pick(relevant.slice(0, 5));
    if (!photo) return null;

    return {
      url: photo.urls?.regular || "",
      width: photo.width || 0,
      height: photo.height || 0,
      license: "Unsplash Licence",
      author: (photo.user?.name || "").trim().slice(0, 60),
      sourceUrl: photo.links?.html || "",
      provider: "Unsplash",
    };
  } catch {
    return null;
  }
}

export async function preflight() {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    return "Unsplash: NO KEY (secret UNSPLASH_ACCESS_KEY missing)";
  }
  try {
    const r = await timedFetch(
      "https://api.unsplash.com/search/photos?query=test&per_page=1",
      { Authorization: `Client-ID ${key}` }
    );
    return r.ok ? "Unsplash: OK ✅" : `Unsplash: FAILED (HTTP ${r.status})`;
  } catch (e) {
    return `Unsplash: FAILED (${e.message})`;
  }
}
