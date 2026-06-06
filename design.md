# Famacrafts — Website Design Spec

**Direction B · "Garden"** — handmade-craft catalog site for Famacrafts, a small studio in Lahore making flower boxes, workshop kits, and small keepsakes.

This document is a complete handoff. It describes the visual system, components, behaviors, data layer, and file structure so the site can be rebuilt or extended cleanly.

---

## 1. Brand context

- **Business:** Famacrafts — handmade, slow-craft pieces and DIY workshop kits. Sells primarily via WhatsApp.
- **Customer:** Women in Lahore looking for thoughtful gifts, wedding favours, and Mother's Day–style experiential workshops.
- **Voice:** Slow, poetic, warm. Uses script type sparingly for emotional moments ("with love", "dreaming", "something together"). Never corporate.
- **Origin assets:** Hand-drawn monochrome logo (script "Famacrafts" inside a circle, a hand holding a small flower), and a Mother's Day Instagram campaign that established the visual language.

---

## 2. Visual identity

### 2.1 Color palette (cool pastels — no warm browns/oranges)

CSS custom properties, defined on `:root`:

```css
--bg:           #FBF7FA;   /* soft pinkish-white — page bg */
--bg-2:         #F2EBF1;   /* pale lavender mist — subtle alt */
--pink:         #F5D5E0;   /* pastel pink */
--pink-deep:    #E5A4BC;   /* rose pink — primary accent */
--rose:         #F8DCE3;   /* pale rose — section bg */
--mint:         #D6E8D6;   /* pastel mint — section bg */
--mint-deep:    #A6C7B0;   /* mint accent */
--blue:         #D5E3EE;   /* light blue (unused but reserved) */
--blue-deep:    #9ABDD3;
--lavender:     #E0D6EC;   /* pastel purple — section bg */
--lavender-deep:#B7A4D1;
--plum:         #5A4663;   /* deep dusty plum — strong accent */
--ink:          #2D2433;   /* cool dark plum — primary text */
--ink-soft:     #6A5E73;   /* secondary text */
--line:         rgba(45,36,51,0.12);  /* hairlines */
```

**Section background rotation (creates rhythm):**
1. Hero — gradient `var(--bg)` → `var(--rose)`
2. About — `var(--mint)`
3. Catalog — `var(--bg)` (neutral)
4. Workshops — `var(--rose)`
5. Custom orders — `var(--lavender)`
6. Footer — `var(--ink)` (dark)

**Never use:** orange, brown, terracotta, peach, gold, olive, warm cream. The previous palette had these — they're explicitly out.

### 2.2 Typography

Google Fonts loaded:
```
Cormorant Garamond  — display serif (400, 500, italic 400/500)
Italiana            — refined uppercase label
Inter               — body (300, 400, 500)
Dancing Script      — script accent (500, 600)
```

CSS vars:
```css
--serif:  'Cormorant Garamond', serif;
--label:  'Italiana', serif;
--script: 'Dancing Script', cursive;
--body:   'Inter', sans-serif;
```

**Type rules:**
- **Display headlines** — `var(--serif)` italic, weight 400, letter-spacing -0.5px, line-height 0.95–1.1, `text-wrap: balance`.
- **Script accent words** — `var(--script)` weight 500, slightly rotated (`transform: rotate(-2deg)`), 1.15–1.2× the serif size, color `var(--pink-deep)`. Used inside headlines as the emotional word ("love", "dreaming", "together").
- **Labels** — `var(--label)`, 10–12px, letter-spacing 4–8px, UPPERCASE, color `var(--plum)`.
- **Body** — `var(--body)`, weight 300, 14–16px, line-height 1.55–1.65, color `var(--ink-soft)`.
- **Brand wordmark in nav** — Dancing Script weight 600, 28px (32px on tablet+).

### 2.3 Texture

- A subtle paper grain overlays the entire page: an SVG turbulence noise pattern at opacity 0.10, `mix-blend-mode: multiply`, fixed position. This sits behind everything except hover states.
- Botanical line-art SVGs (stroke-only, no fills, weight ~1.3px) accent the hero corners and the About section. Stroke uses `currentColor` so they inherit pastel tints via the parent's `color`.

---

## 3. Layout system

### 3.1 Breakpoints

```css
/* Mobile-first base: 0–719px */
@media (min-width: 720px)  { /* tablet  */ }
@media (min-width: 1024px) { /* desktop */ }
@media (hover: hover)      { /* hover states (skipped on touch) */ }
```

### 3.2 Spacing

- Section vertical padding: 72px mobile → 110px tablet → 130px desktop.
- Section horizontal padding: 24px mobile → 40px tablet → 60px desktop.
- Card padding: 16px mobile → 32px tablet → 36px desktop.
- Inter-card gap: 18px mobile, 24–32px desktop.

### 3.3 Containers

```css
.container { max-width: 1080px; margin: 0 auto; }
```

### 3.4 Page structure (single-page, anchor-scrolled)

```
<header.nav>                       (sticky, translucent, h≈54)
<main>
  <section.hero>            #top
  <section.about>           #about
  <section.catalog>         #catalog
  <section.workshops>       #workshops
  <section.custom>          #custom
</main>
<footer>
<a.fab>                            (fixed WhatsApp FAB)
<div.nav-menu>                     (full-screen overlay, hidden by default)
```

---

## 4. Components

### 4.1 Sticky nav

- `position: sticky; top: 0; z-index: 100;` background `rgba(251,247,250,0.92)` with `backdrop-filter: blur(8px)`. 1px bottom border using `--line`.
- Left: brand wordmark (Dancing Script 28/32px) linking to `#top`.
- Right: pill **Menu** button — `background: var(--pink-deep)`, white text, `border-radius: 999px`, `font-family: var(--label)`.
- Tapping Menu sets `.open` on `.nav-menu`; an X button in the overlay removes it.

### 4.2 Full-screen nav menu

- `position: fixed; inset: 0;` — `background: var(--rose)` — transforms in from `translateY(-100%)` to `0` over 350ms ease.
- 4 large script links (Dancing Script 44px), divider hairline under each. On hover, color shifts to `var(--pink-deep)`.

### 4.3 Hero

- Centered, 50–110px vertical padding.
- Linear gradient bg: `var(--bg)` → `var(--rose)`.
- Logo (mix-blend `multiply` + `saturate(0)` + `contrast(1.15)` to drop the JPG's white background) — 200px mobile, 280px desktop.
- Italiana label "HANDMADE · SLOW · WITH LOVE" — `var(--plum)`, 11px, letter-spacing 5px.
- Headline: 3 lines, Cormorant Garamond italic 56–104px depending on viewport. Last word ("love") wrapped in `.script` span, pink, rotated -2°.
- Subhead: max-width 30–36ch, Inter 300, ink-soft.
- 4 botanical SVG decorations positioned in corners at low opacity (0.6–0.7).

### 4.4 Section head

```html
<div class="section-head" style="text-align:center;">
  <span class="label">Eyebrow</span>
  <h2>Two-line<br/><span class="script">headline</span>.</h2>
  <p>Optional subhead.</p>
</div>
```

- Label: Italiana 11px, letter-spacing 5px, color `var(--plum)`.
- H2: serif italic 42–72px, letter-spacing -0.5px, line-height 1.05.
- Script word: pink, rotated -2°.
- Subhead: 16–17px, max-width 38ch, centered.

### 4.5 About

- Background `var(--mint)`.
- Two small botanical SVGs in top-left and bottom-right at opacity 0.4.
- Centered quote: serif italic 30–40px, `text-wrap: balance`.
- Signature: Dancing Script 28–32px, `var(--plum)`.

### 4.6 Product card

```
┌──────────────────────────────┐
│  ┌──────┐  Title (serif italic)
│  │photo │  Tagline (small)
│  │ 1:1  │  Description (hidden, shown on expand)
│  └──────┘  [Order on WhatsApp]  [Read more]
└──────────────────────────────┘
```

- White card, `border-radius: 4px`, box-shadow `0 4px 18px rgba(45,36,51,0.06)`.
- Layout: `display: grid; grid-template-columns: 40% 1fr; gap: 16px; align-items: center;` (mobile). Tablet: 30/70 with 36px gap. Desktop: 26/74 with 48px gap.
- Image: 1:1 aspect ratio, fallback shows placeholder text in JetBrains Mono if image fails to load.
- Title: Cormorant Garamond italic, weight 500, 22–38px.
- Tagline: Inter 13–15px, ink-soft.
- Description: hidden by default, appears when card has `.expanded` class.
- **Actions:** Primary "Order on WhatsApp" pill button + ghost "Read more" button that toggles `.expanded`.
- **Hover (desktop only):** card lifts -3px, shadow deepens.

### 4.7 Buttons

```css
.btn {
  background: var(--pink-deep);
  color: white;
  padding: 10px 18px;
  font-family: var(--label);
  font-size: 10px;
  letter-spacing: 3px;
  text-transform: uppercase;
  border-radius: 999px;
  display: inline-flex; align-items: center; gap: 6px;
}
.btn:hover { background: var(--plum); transform: translateY(-1px); }
.btn.ghost {
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--ink);
}
```

### 4.8 Workshop card

- White card, `border-radius: 6px`, soft shadow.
- Decorative mint quarter-circle in top-left corner (`::before` pseudo-element, 70×70px, `border-radius: 0 0 100% 0`, opacity 0.6).
- Date label (Italiana, plum), large script-flavoured serif title, paragraph description.
- Meta row with clock and pin SVG icons (pink-tinted).
- Primary pink CTA button at bottom.

### 4.9 Custom-order form

- Background `var(--lavender)`.
- White inner frame with rounded corners and shadow.
- Form fields use:
  - Labels: Italiana 10px, letter-spacing 4px, plum.
  - Inputs: serif italic 17px, soft cream bg, 1px border, 4px radius. Focus state: `border-color: var(--pink-deep)`.
  - Textarea: min-height 80px.
  - Select: appearance none.
- Submit button: full-width primary pink pill.
- On submit, the form composes a multi-line message:

  ```
  Hi Famacrafts! I'd like to discuss a custom order.

  Name: {name}
  Occasion: {occasion}
  Quantity: {qty || 'TBD'}
  Details: {notes || 'Will share more on chat.'}
  ```

  And opens `https://wa.me/{number}?text={encoded}` in a new tab.

### 4.10 Footer

- Background `var(--ink)`, light text.
- Brand wordmark in Dancing Script 56–80px, color `var(--pink-deep)`.
- "MADE BY HAND · MADE WITH LOVE" label in pink.
- Vertical link stack on mobile, horizontal on tablet+: Instagram, WhatsApp, location.
- Thin top-bordered copyright line.

### 4.11 Floating WhatsApp FAB

- `position: fixed; right: 18px; bottom: 18px;`
- 60×60 circle, `var(--pink-deep)`, white WhatsApp glyph SVG.
- Soft pink-tinted shadow.
- Lifts -3px and deepens to plum on hover.
- href is rebuilt at runtime from `products.js`.

---

## 5. Behavior

- **Smooth scroll:** `html { scroll-behavior: smooth; }`.
- **Mobile menu:** open/close via `.open` class toggle; closing on link tap.
- **Product expand:** "Read more" toggles `.expanded` on the closest `.product` and flips its own label between "Read more" / "Less".
- **WhatsApp deeplinks:** computed via `waUrl(productName)` → `https://wa.me/{whatsapp}?text={encoded message}`. The message template is `whatsappTemplate` from products.js, with `{PRODUCT}` substituted.
- **Form submit:** `preventDefault`, build multi-line message, open `wa.me` URL via `window.open(..., '_blank')`.
- **No SPA routing** — single page with anchor links. Anchors map to section IDs.

---

## 6. Data layer — `products.js`

A single global config file, loaded with a plain `<script src="products.js"></script>` before the rendering script.

Schema:

```js
window.FAMACRAFTS = {
  whatsapp:    "923001234567",          // no '+' or spaces
  instagram:   "@famacrafts",
  instagramUrl:"https://instagram.com/famacrafts",
  email:       "hello@famacrafts.com",
  location:    "Krete · DHA Phase 6, Lahore",

  // {PRODUCT} placeholder is replaced with the product name
  whatsappTemplate: "Hi Famacrafts! I saw {PRODUCT} on your site and would love to know more.",

  products: [
    {
      id:          "diy-flower-box",     // kebab-case, unique
      name:        "DIY Flower Box",
      tagline:     "Build-your-own wooden box workshop kit",
      description: "Longer paragraph shown when user taps Read more.",
      image:       "assets/products/diy-flower-box.jpg",   // 1:1 ratio recommended
      category:    "Workshop Kits",
      tags:        ["Workshop", "DIY", "Gift"]
    }
    // add new objects here — order in array = order on page
  ],

  workshops: [
    {
      id:          "mothers-day-2026",
      title:       "Mother's Day — Bloom Together",
      date:        "Saturday, 9 May 2026",
      time:        "3:00 — 5:00 PM",
      location:    "Krete · DHA Phase 6",
      description: "Short paragraph.",
      cta:         "DM to reserve"        // button label
    }
  ]
};
```

**Editing rules:**
- To add a product → append an object to `products[]` and save its photo to `assets/products/{id}.jpg`. No code changes needed elsewhere.
- To remove a product → delete its object.
- To reorder → reorder the array.
- Pricing is not shown (intentionally, per business decision); add a `price` field later if it ever gets exposed.

---

## 7. Assets needed

```
assets/
  famacrafts-logo.jpg          (existing — hand-drawn circular logo)
  products/
    diy-flower-box.jpg         (1080×1080 recommended, 1:1)
    {future-product}.jpg
  workshops/                   (optional, if workshops grow images later)
```

The logo JPG has a solid white background — it's neutralised at render time via `mix-blend-mode: multiply` + `filter: contrast(1.15) saturate(0)` so it sits cleanly on any pastel paper background.

---

## 8. File structure

```
/
├── index.html                  (rename famacrafts-garden.html → index.html for deploy)
├── products.js                 (config + product/workshop data)
├── design.md                   (this document)
└── assets/
    ├── famacrafts-logo.jpg
    └── products/
        └── diy-flower-box.jpg
```

No build step. No bundler. Static HTML + one JS data file. Deploys to any static host (Netlify drop, Vercel, GitHub Pages, S3, even a single folder on a webserver).

Optional future: split CSS into a separate `styles.css` and the rendering script into `app.js`. Currently everything is inline in the HTML for zero-config deploy.

---

## 9. Accessibility

- Semantic HTML throughout (`<header>`, `<main>`, `<section>`, `<article>`, `<footer>`, `<nav>` if added).
- `alt` attributes on every image (`alt="{product name}"`).
- Buttons are real `<button>` and `<a>` elements (not `<div>`).
- Form fields have associated `<label>`.
- Color contrast: `--ink` (#2D2433) on `--bg` (#FBF7FA) clears AAA (>13:1). Body text on pastel section backgrounds clears AA.
- FAB has `aria-label="WhatsApp"`.
- The full-screen nav overlay should also receive focus management when opened (TODO: trap focus inside it, return focus to Menu button on close).
- Reduced motion: respect `@media (prefers-reduced-motion: reduce)` to disable the menu slide transform (TODO).

---

## 10. SEO + meta

- `<title>` — "Famacrafts — Handmade, with love"
- `<meta name="description">` — short brand-led summary.
- TODO: add Open Graph + Twitter card tags for share previews.
- TODO: add `<link rel="canonical">` once domain is set.
- TODO: structured data (`schema.org/LocalBusiness`) with name, location, phone, social.

---

## 11. Performance

- Self-hosted? Currently using Google Fonts CDN. For best LCP, preconnect tags are already in place; could be improved further by:
  - Subsetting fonts to Latin + only used weights.
  - Inlining critical CSS in `<head>` (already done since everything is one file).
  - Lazy-loading product images (`loading="lazy"` — TODO add to `<img>` tags created by JS).
- Paper-grain SVG is a tiny inline data URI — no extra request.

---

## 12. Known TODOs for the developer

1. Wire `loading="lazy"` onto product/workshop `<img>` elements in the render script.
2. Add focus-trap for the mobile nav overlay; return focus to Menu button on close.
3. Honour `prefers-reduced-motion`.
4. Add Open Graph + Twitter card meta.
5. Add `schema.org/LocalBusiness` JSON-LD.
6. Consider extracting CSS and JS into separate files once content stabilises.
7. Add an optional `price` field to product schema for future use, with conditional rendering.
8. Real `assets/products/*.jpg` photography (currently a graceful placeholder shows when an image fails to load).

---

## 13. Reference file

The complete working prototype is `famacrafts-garden.html` in this project. It's the source of truth — when this spec disagrees with the file, the file wins. Treat this document as the *intent* and the file as the *implementation*.
