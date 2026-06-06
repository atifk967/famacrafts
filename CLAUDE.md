# Famacrafts — Project Guide

## Overview

**Famacrafts** is a handmade-craft studio in Lahore. This is their marketing and catalog website. Customers browse products and tap "Order on WhatsApp" — no checkout, no cart, no accounts. Sales happen entirely over WhatsApp.

- **Business type:** Homegrown craft studio (flower boxes, gift baskets, cards, workshop kits)
- **Primary action:** WhatsApp inquiry per product
- **Content managers:** Non-technical team (edit `products.js` only)

---

## Tech Stack

**Zero build step. Pure static HTML.**

| Layer | Tech |
|-------|------|
| HTML | Single `index.html` — markup + inline CSS + inline JS |
| Data | `products.js` — global `window.FAMACRAFTS` object |
| Fonts | Google Fonts CDN (Cormorant Garamond, Dancing Script, Italiana, Inter) |
| Images | `assets/products/` (local) OR Cloudinary URLs (preferred for CDN delivery) |
| Hosting | Netlify drag-and-drop OR `vercel --prod` OR any static host |
| Local dev | `npx serve .` |

No npm. No bundler. No framework. No dependencies to install or break.

---

## File Structure

```
formacraft/
├── CLAUDE.md          ← you are here
├── design.md          ← complete visual spec and component guide
├── index.html         ← entire site (HTML + CSS + JS, all inline)
├── products.js        ← all catalog data (team edits this file only)
└── assets/
    ├── famacrafts-logo.jpg   ← hand-drawn circular logo (existing)
    └── products/             ← product images (1:1 square, 1080×1080 ideal)
```

---

## Running Locally

```bash
cd /Users/atif/Code/formacraft
npx serve .
# → opens at http://localhost:3000
```

No install needed. `npx serve .` downloads `serve` on first run (~2 seconds).

Alternative (zero dependencies):
```bash
python3 -m http.server 3000
# → http://localhost:3000
```

**Do not open `index.html` directly as a `file://` URL** — the `products.js` script load will be blocked by CORS in most browsers. Always use a server.

---

## Adding / Editing Products

Open `products.js`. Find the `products: [...]` array. Append a new object:

```js
{
  id:          "my-new-product",      // kebab-case, unique across all products
  name:        "Product Name",
  tagline:     "One-line description shown on the card",
  description: "Longer text shown when user taps Read more. Optional.",
  image:       "assets/products/my-new-product.jpg",  // see Image section below
  category:    "Cards",               // free text — shown as a small label
  tags:        ["Gift", "Card"]       // not currently shown, useful for future filtering
}
```

Save the file. Refresh the browser. The product appears immediately.

**To reorder:** move the object up or down in the array.
**To remove:** delete the object.

---

## Image Strategy

### Option A — Local (simple, for getting started)
- Save photo to `assets/products/{id}.jpg`
- Use `"image": "assets/products/{id}.jpg"` in `products.js`
- 1:1 square ratio recommended (1080×1080px ideal)
- Site will serve the image as-is — no CDN, no optimization

### Option B — Cloudinary (recommended for production / many products)
- Sign up free at [cloudinary.com](https://cloudinary.com)
- Upload via the Media Library web UI (drag & drop — no code)
- Copy the image's "secure URL" and paste it into `products.js` as the `image` value
- The site auto-injects optimization params: `w_800,q_80,f_auto` for catalog cards
- Free tier: 25 GB storage + 25 GB bandwidth/month — plenty for hundreds of products

**Cloudinary URL pattern** (the code handles this automatically):
```
https://res.cloudinary.com/{cloud_name}/image/upload/w_800,q_80,f_auto/{public_id}
```

---

## WhatsApp Integration

Every product "Order on WhatsApp" button opens:
```
https://wa.me/{whatsapp}?text={encoded message}
```

The message template is set in `products.js`:
```js
whatsappTemplate: "Hi Famacrafts! I saw *{PRODUCT}* on your site and would love to know more."
```

`{PRODUCT}` is replaced with the product name at click time. To change the message, edit `whatsappTemplate`.

**To update the WhatsApp number:** change the `whatsapp` field in `products.js` — no other file needs to change.

---

## Deploying

### Netlify (easiest)
1. Go to [netlify.com/drop](https://netlify.com/drop)
2. Drag the entire `formacraft/` folder onto the page
3. Done — live URL in seconds

### Vercel
```bash
npx vercel --prod
```

### GitHub Pages
Push to a repo, enable Pages from `main` branch root. Done.

---

## Design Reference

Full visual spec (colors, typography, components, spacing) is in [design.md](design.md).

**Key tokens:**
- Primary accent: `#E5A4BC` (`--pink-deep`)
- Text: `#2D2433` (`--ink`)
- Page bg: `#FBF7FA` (`--bg`)
- Display font: Cormorant Garamond italic
- Script accent: Dancing Script, `rotate(-2deg)`, pink

**Never use:** orange, brown, terracotta, peach, gold, olive. The brand is cool pastels only.

---

## Coding Conventions

- All HTML, CSS, and JS lives in `index.html` (by design — zero-config deploy)
- Data lives in `products.js` only — never hardcode product content in `index.html`
- No jQuery, no React, no bundler — plain ES5-compatible JS
- `esc()` helper escapes all user-sourced strings before inserting into innerHTML
- WhatsApp URLs always built via the `waUrl()` function — never inline template literals
- Images always use `loading="lazy"` except the first product (which uses `loading="eager"` for LCP)
- All hover states wrapped in `@media (hover: hover)` to skip touch devices

---

## Future Phases

| Phase | Feature | Notes |
|-------|---------|-------|
| 2 | Workshop registration forms | Add Tally or Typeform embed URL to workshop objects in `products.js` |
| 3 | Pricing display | Add optional `price` field to product schema; conditionally render |
| 4 | More categories (flowers, wreaths, etc.) | Just add products with new `category` values — no code change |
| 5 | Extract CSS/JS to separate files | When file gets unwieldy; same static architecture, just split |
