// TIVRA News — article page template.
// Self-contained HTML (inline CSS) so every article renders perfectly forever,
// independent of future site-css changes. Carries the exact markers
// build-index.mjs parses: <title>, meta description, first <img>,
// "📅 YYYY-MM-DD" and "📂 Category".

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70)
    .replace(/-$/, "");
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/**
 * buildHeroCredit — format credit line for hero image.
 * Accepts either:
 *   - string: plain credit text ("Pexels", "Wikimedia...", "")
 *   - object: {provider, author, license, sourceUrl}
 * Returns figcaption inner HTML (may include <a> tag if sourceUrl exists).
 */
export function buildHeroCredit(heroCredit) {
  // String case: keep exact existing behavior unchanged
  if (typeof heroCredit === "string" || !heroCredit) {
    const credit = heroCredit;
    if (credit && credit.startsWith("Wikimedia")) {
      return `Photo: ${escapeHtml(credit)}`;
    } else if (credit) {
      return `Representative image · ${escapeHtml(credit)} (free license)`;
    } else {
      return "Representative image";
    }
  }

  // Object case: {provider, author, license, sourceUrl}
  if (typeof heroCredit === "object") {
    const { provider, author, license, sourceUrl } = heroCredit;
    
    // Build credit text: "Photo: {author / }{provider} ({license})"
    let creditText = "Photo: ";
    if (author) {
      creditText += escapeHtml(author) + " / ";
    }
    creditText += escapeHtml(provider || "");
    if (license) {
      creditText += ` (${escapeHtml(license)})`;
    }

    // If sourceUrl exists, wrap in link so credit is CC-compliant
    if (sourceUrl) {
      return `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">${creditText}</a>`;
    }
    return creditText;
  }

  // Fallback (shouldn't happen)
  return "Representative image";
}

/**
 * renderComparisonTable — HTML for a gadget comparison / ranking spec table.
 * Accepts an array of rows in either shape:
 *   - two-column comparison: {label, valueA, valueB}
 *   - single-column ranking:  {label, value}
 * Shape is auto-detected from the first row (does it have a "valueA" key?).
 * Any null/undefined/empty value renders as a muted em-dash, never a blank
 * cell and never the literal strings "null"/"undefined". Colours reuse the
 * site palette already defined in this file's <style> block: #0b1220
 * (dark heading text), #e11d48 (accent), #e2e8f0 (borders), #64748b (muted
 * text) — no new colours introduced.
 *
 * Mobile: the wrapper scrolls horizontally below the table's natural width
 * (overflow-x:auto) rather than reflowing into stacked cards, so a
 * two-column table never overflows a narrow (e.g. 360px) viewport — it just
 * becomes swipeable, and the max-width matches the site's existing
 * `.wrap{max-width:840px}` convention.
 *
 * This function is intentionally NOT wired into renderArticlePage()'s
 * signature — callers concatenate its output into bodyHtml themselves.
 */
export function renderComparisonTable(specRows, labelA = "Device A", labelB = "Device B") {
  if (!Array.isArray(specRows) || specRows.length === 0) return "";

  const isComparison = Object.prototype.hasOwnProperty.call(specRows[0] || {}, "valueA");

  const cell = (v) => {
    if (v === null || v === undefined || v === "") {
      return `<span style="color:#64748b">&mdash;</span>`;
    }
    return escapeHtml(String(v));
  };

  const thStyle = `padding:10px 14px;text-align:left;font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:#fff;background:#0b1220;border-bottom:2px solid #e11d48;white-space:nowrap;`;
  const tdLabelStyle = `padding:10px 14px;font-weight:700;color:#0b1220;border-bottom:1px solid #e2e8f0;white-space:nowrap;`;
  const tdValStyle = `padding:10px 14px;color:#334155;border-bottom:1px solid #e2e8f0;`;

  const headHtml = isComparison
    ? `<tr><th style="${thStyle}">Spec</th><th style="${thStyle}">${escapeHtml(labelA)}</th><th style="${thStyle}">${escapeHtml(labelB)}</th></tr>`
    : `<tr><th style="${thStyle}">Spec</th><th style="${thStyle}">Value</th></tr>`;

  const bodyHtml = specRows
    .map((row) => {
      const label = `<td style="${tdLabelStyle}">${escapeHtml(row.label || "")}</td>`;
      if (isComparison) {
        return `<tr>${label}<td style="${tdValStyle}">${cell(row.valueA)}</td><td style="${tdValStyle}">${cell(row.valueB)}</td></tr>`;
      }
      return `<tr>${label}<td style="${tdValStyle}">${cell(row.value)}</td></tr>`;
    })
    .join("");

  return `<div style="max-width:840px;margin:20px auto;overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px;">
<table style="width:100%;min-width:480px;border-collapse:collapse;font-size:.92rem;background:#fff;">
<thead>${headHtml}</thead>
<tbody>${bodyHtml}</tbody>
</table>
</div>`;
}

const LOGO_SVG = `<svg viewBox="0 0 210 44" width="150" height="32" aria-label="TIVRA News" role="img"><text x="0" y="27" font-family="Arial,Helvetica,sans-serif" font-size="27" font-weight="800" letter-spacing="2" fill="#f8fafc">T<tspan fill="#e11d48">I</tspan>VRA</text><polyline points="2,36 42,36 50,29 58,41 64,36 118,36" fill="none" stroke="#e11d48" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="118" cy="36" r="2.6" fill="#e11d48"/><text x="128" y="39" font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="600" letter-spacing="4" fill="#94a3b8">NEWS</text></svg>`;

export function renderArticlePage({
  title,
  description,
  category,
  date,          // YYYY-MM-DD
  heroImage,
  heroCredit,    // "Pexels" | "Pixabay" | "" OR {provider, author, license, sourceUrl}
  keyPoints,     // string[]
  bodyHtml,      // <h2>/<h3>/<p> content from the model
  sourceName,
  sourceUrl,
  youtubeId,     // optional
  slug,
  adsensePublisherId, // optional
  adsenseAdSlot,      // optional
  siteUrl = "",       // absolute origin for canonical/OG/JSON-LD
  extraJsonLd = [],    // optional array of extra schema.org objects (e.g.
                        // Product+Review for gadget comparisons) rendered as
                        // additional <script type="application/ld+json">
                        // tags alongside the NewsArticle block below.
}) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description).slice(0, 300);
  const catSlug = slugify(category);
  const year = date.slice(0, 4);
  const pageUrl = siteUrl ? `${siteUrl}/articles/${slug}.html` : "";

  // NewsArticle structured data — what search engines and Google Discover
  // read. Built with JSON.stringify so titles with quotes can't break it.
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title.slice(0, 110),
    description,
    image: heroImage ? [heroImage] : undefined,
    datePublished: date,
    dateModified: date,
    articleSection: category,
    author: { "@type": "Organization", name: "TIVRA News", url: siteUrl || undefined },
    publisher: {
      "@type": "Organization",
      name: "TIVRA News",
      logo: siteUrl ? { "@type": "ImageObject", url: `${siteUrl}/logo.svg` } : undefined,
    },
    mainEntityOfPage: pageUrl || undefined,
  });

  // Extra structured-data blocks (Product+Review for comparisons/rankings).
  // Each entry is JSON.stringify'd independently so one bad object can't
  // break the others; falsy entries are skipped silently.
  const extraJsonLdHtml = (extraJsonLd || [])
    .filter(Boolean)
    .map((obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`)
    .join("\n");

  const socialMeta = `
<meta property="og:type" content="article">
<meta property="og:site_name" content="TIVRA News">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDesc}">
${heroImage ? `<meta property="og:image" content="${escapeHtml(heroImage)}">` : ""}
${pageUrl ? `<meta property="og:url" content="${escapeHtml(pageUrl)}">\n<link rel="canonical" href="${escapeHtml(pageUrl)}">` : ""}
<meta property="article:published_time" content="${date}">
<meta property="article:section" content="${escapeHtml(category)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDesc}">
${heroImage ? `<meta name="twitter:image" content="${escapeHtml(heroImage)}">` : ""}
<script type="application/ld+json">${jsonLd}</script>
${extraJsonLdHtml}`;

  const hasAds = adsensePublisherId && !adsensePublisherId.startsWith("ca-pub-000") && !adsensePublisherId.includes("X");
  const adsHead = hasAds
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsensePublisherId}" crossorigin="anonymous"></script>`
    : "";
  const adBlock = hasAds
    ? `<div style="margin:32px 0;text-align:center;min-height:90px;"><ins class="adsbygoogle" style="display:block;text-align:center;" data-ad-layout="in-article" data-ad-format="fluid" data-ad-client="${adsensePublisherId}" data-ad-slot="${adsenseAdSlot || ""}"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`
    : "";

  const keyPointsHtml = (keyPoints || []).filter(Boolean).length
    ? `<div class="keypoints"><div class="kp-head">Key points</div><ul>${keyPoints
        .filter(Boolean)
        .map((p) => `<li>${escapeHtml(p)}</li>`)
        .join("")}</ul></div>`
    : "";

  const videoHtml = youtubeId
    ? `<div style="margin:30px 0;position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;"><iframe src="https://www.youtube.com/embed/${youtubeId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen loading="lazy" title="Related video coverage"></iframe></div>`
    : "";

  const ytSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`;
  const gnSearch = `https://news.google.com/search?q=${encodeURIComponent(title)}`;
  const credit = heroCredit ? `<figcaption>${buildHeroCredit(heroCredit)}</figcaption>` : `<figcaption>Representative image</figcaption>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle}</title>
<meta name="description" content="${safeDesc}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">${socialMeta}
${adsHead}
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f7f8fa;color:#1e293b;line-height:1.75}
a{color:#be123c}
header.masthead{background:#0b1220;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
header.masthead a.logo{display:inline-flex;align-items:center;text-decoration:none}
header.masthead a.home{color:#94a3b8;text-decoration:none;font-size:.85rem;white-space:nowrap}
header.masthead a.home:hover{color:#fff}
nav.catbar{background:#111a2e;padding:9px 20px;display:flex;gap:18px;overflow-x:auto;white-space:nowrap}
nav.catbar a{color:#94a3b8;text-decoration:none;font-size:.78rem;text-transform:uppercase;letter-spacing:.6px;font-weight:600}
nav.catbar a:hover{color:#fb7185}
.wrap{max-width:840px;margin:28px auto;padding:0 18px}
.crumb{font-size:.78rem;color:#64748b;margin-bottom:14px}
.crumb a{color:#be123c;text-decoration:none}
.cat-pill{display:inline-block;background:#fff1f2;color:#be123c;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;padding:4px 11px;border-radius:999px;margin-bottom:12px}
h1{font-size:clamp(1.5rem,4vw,2.15rem);font-weight:800;color:#0b1220;line-height:1.22;letter-spacing:-.4px;margin-bottom:12px}
.meta{font-size:.82rem;color:#64748b;margin-bottom:20px;display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.meta a{color:#be123c;text-decoration:none;font-weight:600}
figure.hero{margin:0 0 8px}
figure.hero img{width:100%;max-height:440px;object-fit:cover;border-radius:12px;background:#e2e8f0}
figure.hero figcaption{font-size:.72rem;color:#94a3b8;margin-top:6px}
.keypoints{background:#fff;border:1px solid #e2e8f0;border-left:4px solid #e11d48;border-radius:0 12px 12px 0;padding:18px 22px;margin:26px 0}
.keypoints .kp-head{font-size:.8rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#be123c;margin-bottom:10px}
.keypoints ul{margin:0 0 0 18px;color:#334155;font-size:.95rem}
.keypoints li{margin-bottom:7px}
.body{font-size:1.05rem;color:#334155}
.body h2{font-size:1.35rem;color:#0b1220;font-weight:800;margin:30px 0 12px;letter-spacing:-.3px}
.body h3{font-size:1.12rem;color:#0b1220;font-weight:700;margin:24px 0 10px}
.body p{margin-bottom:18px}
.srcbox{margin:34px 0 0;padding:18px 20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;font-size:.88rem;color:#475569}
.srcbox .s-head{font-weight:800;color:#0b1220;font-size:.8rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
.srcbox a{color:#be123c;text-decoration:none;font-weight:600}
.srcbox .links{display:flex;gap:16px;flex-wrap:wrap;margin-top:8px}
.related{margin-top:36px}
.notice{margin-top:26px;padding:14px 18px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;font-size:.8rem;color:#92400e}
footer.site{background:#0b1220;color:#94a3b8;text-align:center;padding:26px 18px;margin-top:52px;font-size:.82rem}
footer.site a{color:#64748b;text-decoration:none;margin:0 9px}
footer.site a:hover{color:#e2e8f0}
</style>
</head>
<body>
<header class="masthead">
  <a href="/" class="logo" aria-label="TIVRA News home">${LOGO_SVG}</a>
  <a href="/" class="home">← Home</a>
</header>
<nav class="catbar">
  <a href="/">Home</a>
  <a href="/category.html?cat=top-stories">Top Stories</a>
  <a href="/category.html?cat=india">India</a>
  <a href="/category.html?cat=world">World</a>
  <a href="/category.html?cat=business">Business</a>
  <a href="/category.html?cat=sports">Sports</a>
  <a href="/category.html?cat=entertainment">Entertainment</a>
  <a href="/category.html?cat=technology">Technology</a>
  <a href="/archive.html">Archive</a>
</nav>
<div class="wrap">
  <div class="crumb"><a href="/">Home</a> › <a href="/category.html?cat=${catSlug}">${escapeHtml(category)}</a></div>
  <span class="cat-pill">${escapeHtml(category)}</span>
  <h1>${safeTitle}</h1>
  <div class="meta">
    <span>📅 ${date}</span>
    <span>📂 ${escapeHtml(category)}</span>
    ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">Original source ↗</a>` : ""}
  </div>
  ${heroImage ? `<figure class="hero"><img src="${escapeHtml(heroImage)}" alt="${safeTitle}">${credit}</figure>` : ""}
  ${keyPointsHtml}
  <div class="body">
${bodyHtml}
  </div>
  ${adBlock}
  ${videoHtml}
  <div class="srcbox">
    <div class="s-head">Verify this story</div>
    Reported by ${escapeHtml(sourceName || "news agencies")}. This article was written with AI assistance from publicly available reporting — always cross-check important details with the original coverage.
    <div class="links">
      ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">Read the original report</a>` : ""}
      <a href="${gnSearch}" target="_blank" rel="noopener noreferrer nofollow">More coverage on Google News</a>
      <a href="${ytSearch}" target="_blank" rel="noopener noreferrer nofollow">Watch on YouTube</a>
    </div>
  </div>
  <div class="related" id="relatedArticles" data-category="${catSlug}" data-slug="${escapeHtml(slug)}"></div>
  <div class="notice">This content is AI-assisted and published for information only. TIVRA News links every story to its original source above — please verify dates, figures and statements there. See our <a href="/disclaimer.html" style="color:#92400e;font-weight:700;">Disclaimer</a> and <a href="/editorial-policy.html" style="color:#92400e;font-weight:700;">Editorial Policy</a>.</div>
</div>
<footer class="site">
  <div style="margin-bottom:8px;">
    <a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/archive.html">Archive</a><a href="/privacy.html">Privacy</a><a href="/cookie-policy.html">Cookies</a><a href="/terms.html">Terms</a><a href="/disclaimer.html">Disclaimer</a><a href="/editorial-policy.html">Editorial Policy</a><a href="/dmca.html">DMCA</a><a href="/sitemap-index.xml">Sitemap</a>
  </div>
  <div>© ${year} TIVRA News — Trusted Insights, Verified Reports &amp; Alerts.</div>
</footer>
<script src="/related.js" defer></script>
</body>
</html>`;
}
