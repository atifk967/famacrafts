// Famacrafts Worker entry point.
//
// Serves the static site via the `assets` binding (same behavior Cloudflare
// was providing implicitly before this file existed) and adds one extra
// route: an edge-caching, resizing proxy for the Supabase `product-images`
// bucket. Product/workshop images are rendered as same-origin URLs
// (/storage/product-images/...?w=N) instead of the raw supabase.co URL so
// that Cloudflare's free edge cache can absorb repeat visitor traffic —
// Supabase Storage egress is metered even on its own cache hits, Cloudflare's
// is not — and so catalog/home cards stop downloading multi-megabyte
// originals just to display a small thumbnail (Supabase Storage image
// transformations are a paid-plan feature we're not using).
import { PhotonImage, SamplingFilter, resize } from '@cf-wasm/photon/workerd';

const SUPABASE_ORIGIN = 'https://gggiojhvkpatmakkgkuq.supabase.co';
const BUCKET_PATH = '/storage/v1/object/public/product-images/';
const PROXY_PREFIX = '/storage/product-images/';
const MIN_WIDTH = 100;
const MAX_WIDTH = 2000;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith(PROXY_PREFIX)) {
      return proxyProductImage(request, url, ctx);
    }
    return env.ASSETS.fetch(request);
  },
};

function parseWidth(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n));
}

const JPEG_QUALITY = 80;

function resizeToJpeg(bytes, width) {
  let inputImage, outputImage;
  try {
    inputImage = PhotonImage.new_from_byteslice(bytes);
    const originalWidth = inputImage.get_width();
    const originalHeight = inputImage.get_height();
    if (!originalWidth || !originalHeight || originalWidth <= width) return null;

    const targetHeight = Math.round((originalHeight / originalWidth) * width);
    outputImage = resize(inputImage, width, targetHeight, SamplingFilter.Lanczos3);
    return outputImage.get_bytes_jpeg(JPEG_QUALITY);
  } finally {
    if (inputImage) inputImage.free();
    if (outputImage) outputImage.free();
  }
}

async function proxyProductImage(request, url, ctx) {
  const path = url.pathname.slice(PROXY_PREFIX.length);
  if (!path) return new Response('Not found', { status: 404 });

  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const upstream = await fetch(SUPABASE_ORIGIN + BUCKET_PATH + path);
  if (!upstream.ok) return new Response('Not found', { status: upstream.status });

  const width = parseWidth(url.searchParams.get('w'));
  let body = upstream.body;
  let contentType = upstream.headers.get('Content-Type') || 'application/octet-stream';

  if (width) {
    const originalBytes = new Uint8Array(await upstream.arrayBuffer());
    body = originalBytes;
    try {
      const resized = resizeToJpeg(originalBytes, width);
      if (resized) {
        body = resized;
        contentType = 'image/jpeg';
      }
    } catch (err) {
      // Corrupt/unsupported image, WASM failure, memory limit, etc. — fall
      // back to serving the untouched (but already-buffered) original
      // rather than erroring out.
    }
  }

  const response = new Response(body, { status: 200 });
  response.headers.set('Content-Type', contentType);
  response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
