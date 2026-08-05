// Edge-caching proxy for the Supabase `product-images` bucket.
//
// Product/workshop images are rendered as same-origin URLs
// (/storage/product-images/...) instead of the raw supabase.co URL so that
// Cloudflare's free edge cache can absorb repeat visitor traffic — Supabase
// Storage egress is metered even on cached hits, Cloudflare's is not.
const SUPABASE_ORIGIN = 'https://gggiojhvkpatmakkgkuq.supabase.co';
const BUCKET_PATH = '/storage/v1/object/public/product-images/';

export async function onRequestGet(context) {
  const { params, request } = context;
  const segments = Array.isArray(params.path) ? params.path : [params.path];
  const path = segments.filter(Boolean).join('/');
  if (!path) return new Response('Not found', { status: 404 });

  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), request);

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

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
