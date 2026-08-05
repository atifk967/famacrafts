// Famacrafts Worker entry point.
//
// Serves the static site via the `assets` binding (same behavior Cloudflare
// was providing implicitly before this file existed) and adds one extra
// route: an edge-caching proxy for the Supabase `product-images` bucket.
// Product/workshop images are rendered as same-origin URLs
// (/storage/product-images/...) instead of the raw supabase.co URL so that
// Cloudflare's free edge cache can absorb repeat visitor traffic — Supabase
// Storage egress is metered even on its own cache hits, Cloudflare's is not.
const SUPABASE_ORIGIN = 'https://gggiojhvkpatmakkgkuq.supabase.co';
const BUCKET_PATH = '/storage/v1/object/public/product-images/';
const PROXY_PREFIX = '/storage/product-images/';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith(PROXY_PREFIX)) {
      return proxyProductImage(request, url, ctx);
    }
    return env.ASSETS.fetch(request);
  },
};

async function proxyProductImage(request, url, ctx) {
  const path = url.pathname.slice(PROXY_PREFIX.length);
  if (!path) return new Response('Not found', { status: 404 });

  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const upstream = await fetch(SUPABASE_ORIGIN + BUCKET_PATH + path);
  if (!upstream.ok) return new Response('Not found', { status: upstream.status });

  const response = new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
  response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  response.headers.delete('Set-Cookie');

  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
