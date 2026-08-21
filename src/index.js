/**
 * Cloudflare Worker for TIVRA News (tivranews.com)
 *
 * Implements:
 *  1. Canonical 301 redirects (www -> apex, workers.dev -> custom domain).
 *  2. CORS preflight (OPTIONS) handler.
 *  3. Edge News Feed API with Worker Cache API (caches.default): GET /api/feed?category=...&page=1&limit=12
 *  4. Edge Search API with Relevance Scoring & Pagination: GET /api/search?q=...&page=1&limit=20
 *  5. Cloudflare-native caching headers (cloudflare-cdn-cache-control) + complete static extension handling.
 */

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Canonical Redirects (Permanent 301)
    if (
      url.hostname === "ainewsss.naveenkrishna42.workers.dev" ||
      url.hostname === "ainewss.naveenkrishna42.workers.dev" ||
      url.hostname === "www.tivranews.com"
    ) {
      url.hostname = "tivranews.com";
      return Response.redirect(url.toString(), 301);
    }

    // 2. CORS Preflight (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 3. Edge API: GET /api/feed
    if (url.pathname === "/api/feed") {
      try {
        const cacheKey = new Request(url.toString(), request);
        const cache = caches.default;
        const cached = await cache.match(cacheKey);
        if (cached) return cached;

        const catParam = url.searchParams.get("category") || "all";
        const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
        const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "12", 10)));

        const feedReq = new Request(new URL("/feed-latest.json", request.url));
        const feedRes = await env.ASSETS.fetch(feedReq);
        if (!feedRes.ok) {
          return new Response(JSON.stringify({ status: "error", message: "Feed unavailable" }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        const data = await feedRes.json();
        let articles = data.articles || [];

        if (catParam && catParam !== "all") {
          const targetSlug = slugify(catParam);
          articles = articles.filter(
            (a) => slugify(a.category) === targetSlug || a.category.toLowerCase() === catParam.toLowerCase()
          );
        }

        const total = articles.length;
        const totalPages = Math.ceil(total / limit);
        const start = (page - 1) * limit;
        const pagedArticles = articles.slice(start, start + limit);

        const responsePayload = {
          status: "ok",
          site: data.site || "TIVRA News",
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages,
          category: catParam,
          articles: pagedArticles,
        };

        const response = new Response(JSON.stringify(responsePayload), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=60",
            "cloudflare-cdn-cache-control": "public, max-age=300, stale-while-revalidate=600",
            "Access-Control-Allow-Origin": "*",
          },
        });

        ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
      } catch (err) {
        return new Response(JSON.stringify({ status: "error", message: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    // 4. Edge API: GET /api/search
    if (url.pathname === "/api/search") {
      try {
        const query = (url.searchParams.get("q") || "").trim().toLowerCase();
        if (query.length < 2) {
          return new Response(
            JSON.stringify({ status: "ok", query, total: 0, page: 1, totalPages: 0, articles: [] }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            }
          );
        }

        const cacheKey = new Request(url.toString(), request);
        const cache = caches.default;
        const cached = await cache.match(cacheKey);
        if (cached) return cached;

        const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
        const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));

        const feedReq = new Request(new URL("/feed-latest.json", request.url));
        const feedRes = await env.ASSETS.fetch(feedReq);
        if (!feedRes.ok) {
          return new Response(JSON.stringify({ status: "error", message: "Search feed unavailable" }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        const data = await feedRes.json();
        const terms = query.split(/\s+/).filter(Boolean);

        // Relevance Scoring: Title match weights 3x higher than description
        const scoredMatches = (data.articles || [])
          .map((a) => {
            const titleText = (a.title || "").toLowerCase();
            const descText = (a.description || "").toLowerCase();
            const catText = (a.category || "").toLowerCase();

            let score = 0;
            for (const t of terms) {
              if (titleText.includes(t)) score += 3;
              if (descText.includes(t)) score += 1;
              if (catText.includes(t)) score += 2;
            }
            return { article: a, score };
          })
          .filter((m) => m.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((m) => m.article);

        const total = scoredMatches.length;
        const totalPages = Math.ceil(total / limit);
        const start = (page - 1) * limit;
        const pagedMatches = scoredMatches.slice(start, start + limit);

        const responsePayload = {
          status: "ok",
          query,
          total,
          page,
          limit,
          totalPages,
          hasMore: page < totalPages,
          articles: pagedMatches,
        };

        const response = new Response(JSON.stringify(responsePayload), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=60",
            "cloudflare-cdn-cache-control": "public, max-age=600, stale-while-revalidate=1200",
            "Access-Control-Allow-Origin": "*",
          },
        });

        ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
      } catch (err) {
        return new Response(JSON.stringify({ status: "error", message: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    // 5. Default Static Asset Serving with Full Format Cache Optimization
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);

      if (response.ok) {
        const pathLower = url.pathname.toLowerCase();

        // 5a. JSON data files (dynamic feeds from auto-publisher)
        if (pathLower.endsWith(".json")) {
          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cache-Control", "public, max-age=60");
          newHeaders.set("cloudflare-cdn-cache-control", "public, max-age=120, stale-while-revalidate=300");
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        }

        // 5b. Static media, fonts, and assets (immutable cache)
        if (
          pathLower.endsWith(".css") ||
          pathLower.endsWith(".js") ||
          pathLower.endsWith(".svg") ||
          pathLower.endsWith(".png") ||
          pathLower.endsWith(".jpg") ||
          pathLower.endsWith(".jpeg") ||
          pathLower.endsWith(".webp") ||
          pathLower.endsWith(".avif") ||
          pathLower.endsWith(".gif") ||
          pathLower.endsWith(".ico") ||
          pathLower.endsWith(".woff") ||
          pathLower.endsWith(".woff2") ||
          pathLower.endsWith(".ttf") ||
          pathLower.endsWith(".webmanifest")
        ) {
          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cache-Control", "public, max-age=86400");
          newHeaders.set("cloudflare-cdn-cache-control", "public, max-age=604800, stale-while-revalidate=86400");
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        }
      }

      return response;
    }

    return new Response("Not Found", { status: 404 });
  },
};
