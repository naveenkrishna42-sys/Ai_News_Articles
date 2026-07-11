#!/usr/bin/env node
/**
 * fix-article-template.mjs
 *
 * Patches known issues from the OLD article generator template in one or
 * more already-generated article .html files, without needing to touch
 * your generator itself. Use this as a stopgap while you update the
 * generator's template per README.md → "Article template requirements" —
 * or keep running it on every batch indefinitely if you'd rather not touch
 * the generator at all.
 *
 * What it fixes, per file:
 *   1. Dead category nav links (<nav>Home/Tech/Business/...</nav> using
 *      ?cat= links that used to go nowhere) → simplified Home/Archive nav.
 *      (Harmless to run even on files that already fixed this — no-op.)
 *   2. The old hardcoded "Also Read" box, which linked to /article/<uuid>
 *      URLs that don't exist on this site → the live related.js widget,
 *      using this article's own 📂 category and its filename as the slug.
 *   3. Incomplete footer (was missing Archive/Cookie/Editorial/DMCA links)
 *      → the standard 9-link footer used across the rest of the site.
 *   4. Inconsistent brand name in the header → "AI News Factory".
 *
 * Usage:
 *   node scripts/fix-article-template.mjs articles/*.html
 *   node scripts/fix-article-template.mjs articles/2026-07-12-some-file.html
 *
 * Safe to re-run — already-fixed files are left untouched (each fix is
 * conditional on the old pattern still being present).
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const STANDARD_FOOTER = `<footer>
  <div style="margin-bottom:10px;">
    <a href="/about.html">About Us</a>
    <a href="/contact.html">Contact</a>
    <a href="/privacy.html">Privacy Policy</a>
    <a href="/terms.html">Terms</a>
    <a href="/disclaimer.html">Disclaimer</a>
    <a href="/editorial-policy.html">Editorial Policy</a>
    <a href="/cookie-policy.html">Cookie Policy</a>
    <a href="/dmca.html">Copyright / DMCA</a>
    <a href="/sitemap-index.xml">Sitemap</a>
  </div>
  <div>© 2026 AI News Factory. All rights reserved.</div>
  <div style="margin-top:6px;font-size:0.75rem;">Content is AI-assisted / AI-generated for informational purposes. Always verify with original sources. See our <a href="/disclaimer.html">Disclaimer</a>.</div>
</footer>`;

const STANDARD_NAV = `<nav>
  <a href="/">Home</a>
  <a href="/archive.html">Archive</a>
</nav>`;

function extract(html, regex, fallback = "") {
  const m = html.match(regex);
  return m ? m[1].trim() : fallback;
}

function fixFile(filePath) {
  const original = readFileSync(filePath, "utf-8");
  let html = original;
  const changes = [];

  // 1. Nav — replace any <nav>...</nav> that still contains a "?cat="
  // link (the old dead-link pattern) with the simplified working nav.
  html = html.replace(/<nav>[\s\S]*?<\/nav>/, (block) => {
    if (block.includes("?cat=")) {
      changes.push("nav (removed dead ?cat= links)");
      return STANDARD_NAV;
    }
    return block;
  });

  // 2. "Also Read" box with hardcoded /article/<uuid> links → related.js
  const slug = path.basename(filePath).replace(/\.html?$/i, "");
  const category = extract(html, /📂\s*([^<]+)</, "General").trim();
  const alsoReadRegex = /<div class="also-read-box"[\s\S]*?<\/div>\s*<\/div>/;
  if (alsoReadRegex.test(html) && html.includes("/article/")) {
    html = html.replace(
      alsoReadRegex,
      `<div id="relatedArticles"></div>\n    <script src="/related.js" data-category="${category}" data-slug="${slug}" data-limit="3"></script>\n  </div>`
    );
    changes.push(`also-read box (now related.js, category="${category}")`);
  }

  // 3. Footer — replace if it doesn't already have all 9 required links.
  const footerMatch = html.match(/<footer>[\s\S]*?<\/footer>/);
  if (footerMatch && !footerMatch[0].includes("editorial-policy.html")) {
    html = html.replace(/<footer>[\s\S]*?<\/footer>/, STANDARD_FOOTER);
    changes.push("footer (added missing legal page links)");
  }

  // 4. Brand name consistency.
  if (html.includes("AIWebFactory News")) {
    html = html.replaceAll("AIWebFactory News", "AI News Factory");
    changes.push("brand name");
  }

  if (changes.length === 0) {
    console.log(`OK      ${filePath} — nothing to fix`);
    return;
  }

  writeFileSync(filePath, html);
  console.log(`FIXED   ${filePath}`);
  for (const c of changes) console.log(`          - ${c}`);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/fix-article-template.mjs articles/*.html");
  process.exit(1);
}

for (const f of files) {
  try {
    fixFile(f);
  } catch (err) {
    console.error(`ERROR   ${f}: ${err.message}`);
  }
}
