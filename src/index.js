/**
 * Cloudflare Worker for TIVRA News (tivranews.com)
 *
 * Implements:
 *  1. Canonical 301 redirects (www -> apex, workers.dev -> custom domain).
 *  2. CORS preflight (OPTIONS) handler.
 *  3. Edge News Feed API with Worker Cache API (caches.default): GET /api/feed
 *  4. Hybrid Semantic & Keyword Search API: GET /api/search (Workers AI + Vectorize with auto-fallback)
 *  5. Re-index endpoint for Vectorize: POST /api/index (Bearer token protected)
 *  6. Cloudflare-native caching headers (cloudflare-cdn-cache-control) + static assets.
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
          "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
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

    // 4. Edge API: GET /api/search (Hybrid Semantic + Keyword Fallback)
    if (url.pathname === "/api/search") {
      try {
        const query = (url.searchParams.get("q") || "").trim();
        if (query.length < 2) {
          return new Response(
            JSON.stringify({ status: "ok", query, total: 0, page: 1, totalPages: 0, articles: [], search_mode: "empty" }),
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

        // Attempt 4A: Semantic Search via Workers AI + Vectorize
        if (env.AI && env.VECTOR_INDEX) {
          try {
            const queryEmbedding = await env.AI.run("@cf/google/embeddinggemma-300m", {
              text: [query],
            });

            if (queryEmbedding && queryEmbedding.data && queryEmbedding.data[0]) {
              const vectorResults = await env.VECTOR_INDEX.query(queryEmbedding.data[0], {
                topK: limit * 2,
                returnMetadata: "all",
              });

              if (vectorResults && vectorResults.matches && vectorResults.matches.length > 0) {
                const semanticArticles = vectorResults.matches.map((m) => ({
                  slug: m.id,
                  title: m.metadata?.title || "",
                  description: m.metadata?.description || "",
                  category: m.metadata?.category || "General",
                  image: m.metadata?.image || "",
                  date: m.metadata?.date || "",
                  url: m.metadata?.url || `/articles/${m.id}.html`,
                  score: m.score,
                }));

                const start = (page - 1) * limit;
                const paged = semanticArticles.slice(start, start + limit);

                const responsePayload = {
                  status: "ok",
                  query,
                  total: semanticArticles.length,
                  page,
                  limit,
                  totalPages: Math.ceil(semanticArticles.length / limit),
                  hasMore: page < Math.ceil(semanticArticles.length / limit),
                  articles: paged,
                  search_mode: "semantic",
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
              }
            }
          } catch (semanticErr) {
            console.warn("Semantic search failed, falling back to keyword search:", semanticErr.message);
          }
        }

        // Attempt 4B: Weighted Keyword Search Fallback
        const feedReq = new Request(new URL("/feed-latest.json", request.url));
        const feedRes = await env.ASSETS.fetch(feedReq);
        if (!feedRes.ok) {
          return new Response(JSON.stringify({ status: "error", message: "Search feed unavailable" }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        const data = await feedRes.json();
        const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

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
          search_mode: "keyword",
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

    // 5. Re-index Endpoint for Vectorize: POST /api/index
    if (url.pathname === "/api/index" && request.method === "POST") {
      try {
        const authHeader = request.headers.get("Authorization") || "";
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        const expectedToken = env.INDEX_API_KEY || "tivra_secure_index_key_2026";

        if (!token || token !== expectedToken) {
          return new Response(JSON.stringify({ status: "error", message: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!env.AI || !env.VECTOR_INDEX) {
          return new Response(
            JSON.stringify({ status: "error", message: "AI or VECTOR_INDEX binding missing" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        const feedReq = new Request(new URL("/feed-latest.json", request.url));
        const feedRes = await env.ASSETS.fetch(feedReq);
        if (!feedRes.ok) {
          return new Response(JSON.stringify({ status: "error", message: "Could not fetch feed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const data = await feedRes.json();
        const articles = data.articles || [];
        let indexedCount = 0;

        // Process in batches of 50 to respect Workers AI limits
        const BATCH_SIZE = 50;
        for (let i = 0; i < articles.length; i += BATCH_SIZE) {
          const batch = articles.slice(i, i + BATCH_SIZE);
          const texts = batch.map(
            (a) => `${a.title || ""} ${a.description || ""} ${a.category || ""}`.trim()
          );

          const embeddings = await env.AI.run("@cf/google/embeddinggemma-300m", {
            text: texts,
          });

          if (embeddings && embeddings.data) {
            const vectors = embeddings.data.map((vec, idx) => ({
              id: batch[idx].slug || `art-${i + idx}`,
              values: vec,
              metadata: {
                title: batch[idx].title || "",
                description: (batch[idx].description || "").slice(0, 300),
                category: batch[idx].category || "General",
                image: batch[idx].image || "",
                date: batch[idx].date || "",
                url: `/articles/${batch[idx].slug}.html`,
              },
            }));

            await env.VECTOR_INDEX.upsert(vectors);
            indexedCount += vectors.length;
          }
        }

        return new Response(
          JSON.stringify({
            status: "ok",
            message: "Re-indexing complete",
            totalArticles: articles.length,
            indexedCount,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (err) {
        return new Response(JSON.stringify({ status: "error", message: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // 6. Default Static Asset Serving with Full Format Cache Optimization
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);

      if (response.ok) {
        const pathLower = url.pathname.toLowerCase();

        // 6a. JSON data files (dynamic feeds)
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

        // 6b. Static media, fonts, and assets (immutable cache)
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
