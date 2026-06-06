/**
 * Famacrafts — Product & Workshop Data
 *
 * HOW TO ADD A PRODUCT:
 *   1. Add a new object to the products[] array below
 *   2. Upload the product photo to assets/products/{id}.jpg
 *      — OR — paste a Cloudinary URL as the image value
 *   3. Save this file. Refresh the browser. Done.
 *
 * HOW TO REORDER: drag the objects up/down in the array.
 * HOW TO REMOVE: delete the object entirely.
 *
 * IMAGE TIPS:
 *   - 1:1 square ratio recommended (1080×1080px ideal)
 *   - For Cloudinary URLs use this pattern for auto-optimisation:
 *     https://res.cloudinary.com/YOUR_CLOUD/image/upload/w_800,q_80,f_auto/YOUR_IMAGE_ID
 *   - Upload at cloudinary.com → Media Library → drag & drop
 */

window.FAMACRAFTS = {

  // ── Business config ──────────────────────────────────────────────────────
  whatsapp:     "923095569017",       // digits only — no + or spaces
  instagram:    "@famacrafts_",
  instagramUrl: "https://instagram.com/famacrafts_",
  email:        "hello@famacrafts.com",
  location:     "Lahore, Pakistan",

  // Message sent when a customer taps "Order on WhatsApp"
  // {PRODUCT} is replaced with the product name at runtime
  whatsappTemplate: "Hi Famacrafts! I saw *{PRODUCT}* on your site and would love to know more. Could you tell me about availability?",

  // ── Products ─────────────────────────────────────────────────────────────
  products: [

    {
      id:          "diy-flower-box",
      name:        "DIY Flower Box Kit",
      tagline:     "Build & arrange your own bloom box at home",
      description: "Everything you need to create a dreamy flower arrangement — a wooden box, floral foam, ribbon, and a curated mix of dried and faux blooms. Perfect for a rainy afternoon, a birthday gift, or simply because. No experience needed; step-by-step card included.",
      image:       "assets/products/placeholder.jpg",
      category:    "Workshop Kits",
      tags:        ["DIY", "Gift", "Workshop"]
    },

    {
      id:          "bloom-gift-basket",
      name:        "Bloom Gift Basket",
      tagline:     "A woven basket filled with handpicked florals",
      description: "A soft-woven pastel basket layered with dried pampas, preserved roses, and seasonal fillers. Arrives ribbon-tied and ready to gift. Available in small (25cm) and large (38cm) — mention your size preference on WhatsApp.",
      image:       "assets/products/placeholder.jpg",
      category:    "Baskets",
      tags:        ["Gift", "Basket", "Florals"]
    },

    {
      id:          "pressed-flower-card",
      name:        "Pressed Flower Greeting Card",
      tagline:     "Real pressed blooms on handmade paper",
      description: "Each card is pressed by hand using seasonal flowers from the studio garden. No two are alike. Comes with a kraft envelope. Tell us the occasion and we'll write a short note inside for you.",
      image:       "assets/products/placeholder.jpg",
      category:    "Cards",
      tags:        ["Card", "Gift", "Handmade"]
    },

    {
      id:          "custom-keepsake-box",
      name:        "Custom Keepsake Box",
      tagline:     "Made to order — your memories, beautifully kept",
      description: "A wooden keepsake box dressed with dried florals, ribbon, and a personalised tag. Popular for wedding favours, baby showers, and eid gifts. Share your occasion, colour palette, and quantity on WhatsApp and we'll send you a mood board within 24 hours.",
      image:       "assets/products/placeholder.jpg",
      category:    "Custom",
      tags:        ["Custom", "Wedding", "Gift", "Personalised"]
    },

    {
      id:          "mothers-day-bouquet",
      name:        "Mother's Day Bouquet Wrap",
      tagline:     "Soft pastels, dried florals, love-wrapped",
      description: "A loose, garden-gathered style bouquet of pampas grass, dried roses, and lisianthus — wrapped in tissue and twine. Available in blush, mint, and lavender palettes. Order at least 3 days before your gifting date.",
      image:       "assets/products/placeholder.jpg",
      category:    "Bouquets",
      tags:        ["Bouquet", "Mother's Day", "Gift", "Florals"]
    }

  ],

  // ── Workshops ─────────────────────────────────────────────────────────────
  workshops: [

    {
      id:          "bloom-together-june",
      title:       "Bloom Together",
      date:        "Saturday, 14 June 2026",
      time:        "3:00 — 5:30 PM",
      location:    "Lahore, Pakistan",
      description: "A slow, guided two-hour workshop where you'll arrange your own dried floral centrepiece to take home. Tea, good company, and all materials included. Limited to 12 seats.",
      cta:         "Reserve my seat"
    }

  ]

};
