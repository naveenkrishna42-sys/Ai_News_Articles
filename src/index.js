export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Redirect old workers.dev URL or www subdomain → new custom domain (permanent 301)
    if (
      url.hostname === "ainewsss.naveenkrishna42.workers.dev" ||
      url.hostname === "ainewss.naveenkrishna42.workers.dev" ||
      url.hostname === "www.tivranews.com"
    ) {
      url.hostname = "tivranews.com";
      return Response.redirect(url.toString(), 301);
    }

    // Normal: serve static assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};
