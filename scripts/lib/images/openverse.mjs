// Openverse (CC-licensed, ~800M items). No API key needed for anonymous use.
// Returns {url,width,height,license,author,sourceUrl,provider} or null.

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

export async function search(query) {
  try {
    const res = await timedFetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license_type=commercial&page_size=10`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const results = data?.results || [];

    // Collect qualifying images, prefer widest.
    let best = null;
    let bestWidth = 0;
    for (const item of results) {
      const width = item.width || 0;
      if (width < 800) continue;

      // license_type=commercial filter already ensures commercial use. Map
      // Openverse license codes to proper CC license names.
      let license = "CC (unknown)";
      if (item.license) {
        if (item.license === "cc0") {
          license = "CC0 1.0";
        } else if (item.license === "pdm") {
          license = "Public Domain Mark";
        } else {
          const version = item.license_version ? ` ${item.license_version}` : "";
          license = `CC ${item.license.toUpperCase()}${version}`.trim();
        }
      }

      if (width > bestWidth) {
        best = {
          url: item.url,
          width,
          height: item.height || 0,
          license,
          author: (item.creator || "").trim().slice(0, 60),
          sourceUrl: item.foreign_landing_url || "",
          provider: "Openverse",
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
      "https://api.openverse.org/v1/images/?q=test&license_type=commercial&page_size=1"
    );
    return r.ok ? "Openverse: OK ✅" : `Openverse: FAILED (HTTP ${r.status})`;
  } catch (e) {
    return `Openverse: FAILED (${e.message})`;
  }
}
