// Temporary diagnostic route to confirm Cloudflare Pages Functions are
// actually being invoked for this deployment before wiring real traffic
// to functions/storage/product-images. Safe to delete once confirmed.
export function onRequestGet() {
  return new Response('pong-diagnostic');
}
