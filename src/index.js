/**
 * Cloudflare Worker for TIVRA News (tivranews.com)
 *
 * Provides:
 *  1. Canonical 301 redirects (www -> apex, workers.dev -> custom domain).
 *  2. Edge News Feed API: GET /api/feed?category=...&page=1&limit=12
 *  3. Edge Fast Search API: GET /api/search?q=...
 *  4. High-performance static asset pass-through with edge caching.
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

    // 2. Edge API: GET /api/feed
    if (url.pathname === "/api/feed") {
      try {
        const catParam = url.searchParams.get("category") || "all";
        const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
        const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "12", 10)));

        // Fetch the fast feed JSON from static assets
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

        // Category filter if not "all"
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

        return new Response(JSON.stringify(responsePayload), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ status: "error", message: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    // 3. Edge API: GET /api/search
    if (url.pathname === "/api/search") {
      try {
        const query = (url.searchParams.get("q") || "").trim().toLowerCase();
        if (query.length < 2) {
          return new Response(JSON.stringify({ status: "ok", query, total: 0, articles: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        // Fetch feed from assets
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

        const matches = (data.articles || []).filter((a) => {
          const text = `${a.title || ""} ${a.description || ""} ${a.category || ""}`.toLowerCase();
          return terms.every((t) => text.includes(t));
        });

        return new Response(
          JSON.stringify({
            status: "ok",
            query,
            total: matches.length,
            articles: matches.slice(0, 30),
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "public, max-age=120, s-maxage=600, stale-while-revalidate=1200",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      } catch (err) {
        return new Response(JSON.stringify({ status: "error", message: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    // 4. Default: Static Asset Serving with Edge Cache optimization
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      
      // If serving images or css/js assets, add long-cache headers
      if (
        response.ok &&
        (url.pathname.endsWith(".css") ||
         url.pathname.endsWith(".js") ||
         url.pathname.endsWith(".svg") ||
         url.pathname.endsWith(".png") ||
         url.pathname.endsWith(".jpg") ||
         url.pathname.endsWith(".woff2"))
      ) {
        const newHeaders = new Headers(response.headers);
        newHeaders.set("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400");
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }

      return response;
    }

    return new Response("Not Found", { status: 404 });
  },
};
