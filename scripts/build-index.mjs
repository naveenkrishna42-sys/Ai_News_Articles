#!/usr/bin/env node

function slugifyCategory(cat) {
  return String(cat || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
/**
 * AI News Factory — build-index.mjs
 *
 * Scans /articles/*.html (self-contained article pages produced by the
 * article generator), pulls metadata out of each file, and writes:
 *   - articles.json          homepage feed: published articles from the
 *                            last FRESH_WINDOW_DAYS days only (kept small
 *                            and fast no matter how large the archive gets)
 *   - archive/index.json     list of every month that has articles
 *   - archive/YYYY-MM.json   full article list for that month (used by
 *                            archive.html so old content stays browsable
 *                            and linkable forever, just off the homepage)
 *   - sitemap-index.xml + sitemap-static.xml + sitemap-YYYY-MM.xml
 *                            every published article stays in the sitemap
 *                            permanently — nothing gets deindexed, it just
 *                            moves out of the homepage feed after 30 days
 *
 * Designed for high volume (built and tested conceptually against ~100
 * articles/day): the homepage never has to load more than ~30 days of
 * data, and the archive is paginated by month instead of one giant file.
 *
 * This runs automatically as the "build command" on every push — drop new
 * article .html file(s) into /articles, commit, push, done.
 *
 * SCHEDULING: an article whose 📅 date is in the future is parsed but
 * excluded from articles.json / archive / sitemap until that date arrives.
 * True hands-off "publish on date X with no push" needs a daily scheduled
 * deploy trigger — see README.md.
 */

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  rmSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "articles");

// Site config (name, featured category order, canonical URL) lives in
// config/news-config.json — the same control panel auto-news.mjs uses.
let CONFIG = { site: {}, featuredCategories: [] };
try {
  CONFIG = JSON.parse(readFileSync(path.join(ROOT, "config", "news-config.json"), "utf-8"));
} catch { /* build still works without the config */ }
const SITE_URL = process.env.SITE_URL || CONFIG.site.url || "https://example.com";

// Everything actually served lives in /public. Keeping the deploy output in
// its own folder (instead of the repo root) means node_modules — which
// Cloudflare's build step creates to install wrangler itself — never gets
// swept up into the deployed assets. Set "Build output directory" to
// "public" in your Cloudflare project settings.
const PUBLIC_DIR = path.join(ROOT, "public");

const STATIC_FILES = [
  "index.html",
  "category.html",
  "archive.html",
  "404.html",
  "about.html",
  "contact.html",
  "privacy.html",
  "terms.html",
  "affiliate-disclosure.html",
  "disclaimer.html",
  "editorial-policy.html",
  "cookie-policy.html",
  "dmca.html",
  "style.css",
  "script.js",
  "category.js",
  "related.js",
  "logo.svg",
  "favicon.svg",
  "ads.txt",
  "googlef491165cc2b344ea.html",
  "BingSiteAuth.xml",
  "OneSignalSDKWorker.js",
];

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function resetPublicDir(published) {
  rmSync(PUBLIC_DIR, { recursive: true, force: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });

  const publisherId = process.env.ADSENSE_PUBLISHER_ID || CONFIG.adsense?.publisherId || "";
  const hasAds = publisherId && !publisherId.startsWith("ca-pub-000") && !publisherId.includes("X");
  const adScript = hasAds
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}" crossorigin="anonymous"></script>`
    : "";

  const featuredCats = CONFIG.categoryPriority || ["Breaking News", "India", "World", "Business", "Sports", "Technology", "Health", "Product Deals & Offers", "Entertainment"];
  const navLinksHtml = `<a href="/" class="active">Home</a>` + featuredCats.slice(0, 10).map(c => `<a href="/category.html?cat=${encodeURIComponent(slugifyCategory(c))}">${escapeHtml(c)}</a>`).join("");

  for (const file of STATIC_FILES) {
    const srcPath = path.join(ROOT, file);
    if (existsSync(srcPath)) {
      if (file.endsWith(".html")) {
        let html = readFileSync(srcPath, "utf-8");
        if (hasAds) {
          html = html.replace("</head>", `${adScript}\n</head>`);
        }
        // Pre-render navigation links so categories are NEVER missing
        html = html.replace('<nav class="site-nav" id="categoryNav"><a href="/" class="active">Home</a></nav>', `<nav class="site-nav" id="categoryNav">${navLinksHtml}</nav>`);
        html = html.replace('<nav class="site-nav" id="categoryNav">\n  <a href="/" class="active">Home</a>\n  <!-- featured category links + "More" menu injected by script.js -->\n</nav>', `<nav class="site-nav" id="categoryNav">${navLinksHtml}</nav>`);
        
        if (file === "index.html") {
          const topArticles = published.slice(0, 48);
          const gridHtml = topArticles.map(cardHtml).join("");
          html = html.replace('<div class="grid" id="articleGrid" aria-live="polite"></div>', `<div class="grid" id="articleGrid" aria-live="polite">${gridHtml}</div>`);
        }
        writeFileSync(path.join(PUBLIC_DIR, file), html, "utf-8");
      } else if (hasAds && file === "ads.txt") {
        let txt = readFileSync(srcPath, "utf-8");
        const cleanPubId = publisherId.replace(/^ca-/, "");
        txt = txt.replaceAll("pub-0000000000000000", cleanPubId);
        writeFileSync(path.join(PUBLIC_DIR, file), txt, "utf-8");
      } else {
        copyFileSync(srcPath, path.join(PUBLIC_DIR, file));
      }
    }
  }

  copyDir(ARTICLES_DIR, path.join(PUBLIC_DIR, "articles"));

  const assetsDir = path.join(ROOT, "assets");
  if (existsSync(assetsDir)) {
    copyDir(assetsDir, path.join(PUBLIC_DIR, "assets"));
  }
}

function extract(html, regex, fallback = "") {
  const m = html.match(regex);
  return m ? m[1].trim() : fallback;
}

function stripTags(str) {
  return str.replace(/<[^>]+>/g, "").trim();
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}



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

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
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

function cardHtml(a) {
  const imgUrl = getThumbnailUrl(a.image);
  return `
    <article class="card">
      <a href="${a.url}"><img src="${imgUrl}" alt="${escapeHtml(a.title)}" width="400" height="225" loading="lazy"></a>
      <div class="card-body">
        <span class="cat-tag">${escapeHtml(a.category)}</span>
        <h3><a href="${a.url}">${escapeHtml(a.title)}</a></h3>
        <p class="excerpt">${escapeHtml((a.description || "").slice(0, 110))}${a.description && a.description.length > 110 ? "..." : ""}</p>
        <div class="card-meta"><span>${formatDate(a.date)}</span></div>
      </div>
    </article>`;
}

function parseArticle(filename) {
  const filePath = path.join(ARTICLES_DIR, filename);
  const html = readFileSync(filePath, "utf-8");
  const slug = filename.replace(/\.html?$/i, "");

  const title = decodeEntities(
    extract(html, /<title>([^<]*)<\/title>/i, slug)
  );

  const description = decodeEntities(
    extract(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i, "")
  );

  const image = extract(html, /<img[^>]+src=["']([^"']+)["']/i, "");

  const dateObj = new Date();
  const today = dateObj.toISOString().slice(0, 10);
  dateObj.setUTCDate(dateObj.getUTCDate() + 1);
  const tomorrow = dateObj.toISOString().slice(0, 10);

  // Multi-layer date extractor: Filename -> Meta tag -> JSON-LD -> Span -> fallback
  const filenameDate = filename.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2})/)?.[1] || "";
  const metaDate = extract(html, /<meta\s+property=["']article:published_time["']\s+content=["']([0-9]{4}-[0-9]{2}-[0-9]{2})["']/i, "");
  const jsonLdDate = extract(html, /"datePublished":\s*"([0-9]{4}-[0-9]{2}-[0-9]{2})"/i, "");
  const spanDate = extract(html, /([0-9]{4}-[0-9]{2}-[0-9]{2})/, "");
  const date = filenameDate || metaDate || jsonLdDate || spanDate || today;

  // Category is written as: <span class="cat-pill">World</span>
  const categoryRaw = decodeEntities(
    stripTags(extract(html, /<span class="cat-pill">([^<]+)<\/span>/, "General"))
  );

  const scheduled = date ? date > tomorrow : false;

  return {
    slug,
    title,
    description,
    image,
    date,
    category: categoryRaw.trim() || "General",
    url: `/articles/${slug}.html`,
    scheduled,
  };
}

function monthLabel(monthKey) {
  const [y, m] = monthKey.split("-");
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function main() {
  if (!existsSync(ARTICLES_DIR)) {
    console.error(`No /articles directory found at ${ARTICLES_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(ARTICLES_DIR).filter((f) => f.toLowerCase().endsWith(".html"));

  const all = files.map(parseArticle);

  // Warn (don't fail the build) if two source files produced the same slug —
  // at high daily volume this is the most common way an article silently
  // overwrites another. Keep filenames unique, e.g. prefix with the date.
  const seen = new Map();
  for (const a of all) {
    if (seen.has(a.slug)) seen.get(a.slug).push(a.slug);
    else seen.set(a.slug, [a.slug]);
  }
  // (slug is derived 1:1 from filename, so real collisions only happen if
  // two files literally share a filename, which the filesystem prevents —
  // this loop is a hook for future duplicate-title detection if wanted.)

  // Newest first
  all.sort((a, b) => (a.date < b.date ? 1 : -1));

  const published = all.filter((a) => !a.scheduled);
  const scheduledCount = all.length - published.length;

  // Assemble the deployable /public folder fresh on every build.
  resetPublicDir(published);

  // ---- Homepage feed ----
  // Two files, because one grew too heavy to be the thing a visitor waits on:
  // at ~7,500 articles the full feed is ~1 MB even after compression, and the
  // homepage cannot paint until it arrives.
  //
  //   feed-latest.json  the newest LIGHT_FEED_COUNT articles, trimmed to the
  //                     fields the homepage actually renders. First paint.
  //   articles.json     everything, fetched in the background afterwards so
  //                     search and deep pagination still cover the full set.
  //
  // Both are minified — pretty-printing this much JSON cost ~30% for nothing.
  const LIGHT_FEED_COUNT = 400;
  const meta = {
    generatedAt: new Date().toISOString(),
    site: CONFIG.site.name || "TIVRA News",
    featuredCategories: CONFIG.categoryPriority || [],
  };

  writeFileSync(
    path.join(PUBLIC_DIR, "feed-latest.json"),
    JSON.stringify({
      ...meta,
      total: published.length,
      // url is omitted: the client derives it from slug, and at this volume
      // that single field was ~650 KB of pure redundancy.
      articles: published.slice(0, LIGHT_FEED_COUNT).map((a) => ({
        slug: a.slug,
        title: a.title,
        description: (a.description || "").slice(0, 160),
        image: a.image,
        date: a.date,
        category: a.category,
      })),
    })
  );

  writeFileSync(
    path.join(PUBLIC_DIR, "articles.json"),
    JSON.stringify({ ...meta, articles: published })
  );

  // ---- Group by month (archive JSONs + sitemaps) ----
  const byMonth = new Map();
  for (const a of published) {
    const key = a.date.slice(0, 7); // YYYY-MM
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(a);
  }

  const monthsSorted = [...byMonth.keys()].sort().reverse();

  // ---- Archive: one JSON per month + an index (used by archive.html) ----
  const archiveDir = path.join(PUBLIC_DIR, "archive");
  mkdirSync(archiveDir, { recursive: true });
  for (const key of monthsSorted) {
    writeFileSync(
      path.join(archiveDir, `${key}.json`),
      JSON.stringify({ month: key, articles: byMonth.get(key) })
    );
  }
  writeFileSync(
    path.join(archiveDir, "index.json"),
    JSON.stringify({
      months: monthsSorted.map((key) => ({
        key,
        label: monthLabel(key),
        count: byMonth.get(key).length,
      })),
    })
  );

  // ---- Sitemaps: split by month so no single file risks the 50k-URL limit,
  // and a sitemap index ties them together. Every published article is
  // included regardless of age — moving out of the homepage feed after
  // FRESH_WINDOW_DAYS does not remove it from the sitemap or from search. ----
  const staticPages = [
    "",
    "archive.html",
    "about.html",
    "contact.html",
    "privacy.html",
    "terms.html",
    "disclaimer.html",
    "editorial-policy.html",
    "cookie-policy.html",
    "dmca.html",
  ];
  const slugifyCategory = (cat) =>
    cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const categorySlugs = [...new Set(published.map((a) => slugifyCategory(a.category)))];
  const categoryUrls = categorySlugs.map((slug) => `${SITE_URL}/category.html?cat=${slug}`);

  const staticUrls = [...staticPages.map((p) => `${SITE_URL}/${p}`), ...categoryUrls];
  writeFileSync(
    path.join(PUBLIC_DIR, "sitemap-static.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticUrls
      .map((u) => `  <url><loc>${u}</loc></url>`)
      .join("\n")}\n</urlset>\n`
  );

  for (const key of monthsSorted) {
    const items = byMonth.get(key);
    const urls = items.map((a) => `${SITE_URL}${a.url}`);
    writeFileSync(
      path.join(PUBLIC_DIR, `sitemap-${key}.xml`),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map((u) => `  <url><loc>${u}</loc></url>`)
        .join("\n")}\n</urlset>\n`
    );
  }

  const sitemapIndexEntries = [
    `${SITE_URL}/sitemap-static.xml`,
    ...monthsSorted.map((key) => `${SITE_URL}/sitemap-${key}.xml`),
  ];
  const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapIndexEntries
    .map((u) => `  <sitemap><loc>${u}</loc></sitemap>`)
    .join("\n")}\n</sitemapindex>\n`;
  writeFileSync(path.join(PUBLIC_DIR, "sitemap-index.xml"), sitemapIndexXml);
  // Serve the same index at the conventional /sitemap.xml address too
  // (Workers static assets don't support _redirects rewrites reliably).
  writeFileSync(path.join(PUBLIC_DIR, "sitemap.xml"), sitemapIndexXml);

  // ---- RSS 2.0 & Atom Feed Generation ----
  const rssItems = published.slice(0, 50).map((a) => {
    const pubDate = new Date(a.date).toUTCString();
    const itemUrl = `${SITE_URL}${a.url}`;
    const imageTag = a.image ? `<enclosure url="${escapeHtml(a.image)}" type="image/jpeg" length="0" />` : "";
    return `    <item>
      <title>${escapeHtml(a.title)}</title>
      <link>${itemUrl}</link>
      <guid isPermaLink="true">${itemUrl}</guid>
      <description>${escapeHtml(a.description || a.title)}</description>
      <category>${escapeHtml(a.category)}</category>
      <pubDate>${pubDate}</pubDate>
      ${imageTag}
    </item>`;
  }).join("\n");

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeHtml(CONFIG.site?.name || "TIVRA News")}</title>
    <link>${SITE_URL}</link>
    <description>${escapeHtml(CONFIG.site?.tagline || "Trusted Insights, Verified Reports & Alerts")}</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${rssItems}
  </channel>
</rss>`;

  writeFileSync(path.join(PUBLIC_DIR, "feed.xml"), rssXml);
  writeFileSync(path.join(PUBLIC_DIR, "rss.xml"), rssXml);


  // robots.txt with an absolute sitemap URL (generated, not copied).
  writeFileSync(
    path.join(PUBLIC_DIR, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap-index.xml\n`
  );

  console.log(`Copied static files + ${files.length} article(s) into /public`);
  console.log(`Homepage feed: ${published.length} articles. ${scheduledCount} scheduled for the future.`);
  console.log(`Sitemap index with ${sitemapIndexEntries.length} sub-sitemaps.`);
}

main();


