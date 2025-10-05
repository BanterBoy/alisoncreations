You are operating inside a Git repo that contains:

* `resources/WebsiteNotes.md` (site sections/requirements)
* `resources/images/` and `resources/videos/` (product media)
* `resources/ARCfiles.csv` (PowerShell export of those files)
* `resources/images/ARC-Logo.png` (logo to use on site)

### Goal

1. Generate a **Shopify product import CSV** from `ARCfiles.csv` (images/videos are named descriptively).
2. Scaffold a **GitHub Pages site** (static front-end) themed to ARC, fetching products from **Shopify Storefront API** with a working **shopping cart**.
3. Make all changes on a new branch and open a **pull request**.

### Non-destructive rules

* Do **not** modify or delete existing files outside new folders.
* Create branch `feat/arc-initial-site`.
* Commit logically. Open a PR to `main` with a clear summary.

---

## Part A — Build the Shopify CSV

**Inputs:** `ARCfiles.csv` rows where `PSIsContainer == False`.
**Grouping logic (product detection):**

* Base product = filename without extension and without trailing “(2)”, extra spaces, or duplicate markers.
* If filenames differ only by a color word (e.g., pink/white/yellow/blue/gold/silver/black/green/red/purple/teal/grey), treat as **variants** of one product with **Option1 Name = Color** and **Option1 Value = <color>**.
* Otherwise, make separate products.

**Title & handle:**

* Title = cleaned base name in Title Case (e.g., “Balloon Teddy Set”).
* Handle = kebab-case of Title (ascii, lowercase, hyphens).

**Description (Body HTML):**

* Minimal, derived from Title: a one-sentence description like “Hand-made resin creation: <Title>.”
* If the filename contains the word `quote`, extract quoted text in the filename (if present) and append inside `<blockquote>`; also include as a product metafield column (see below).

**Pricing/Inventory defaults (editable later):**

* `Variant Price` = `0.00` (placeholder).
* `Variant Inventory Qty` = `0`.
* `Variant Inventory Policy` = `deny`.
* `Variant Fulfillment Service` = `manual`.
* `Variant Requires Shipping` = `TRUE`.
* `Variant Taxable` = `TRUE`.
* `Variant Weight Unit` = `g`, `Variant Grams` = `0`.

**Vendor/Type/Tags:**

* `Vendor` = “Alison Resin Creations (ARC)”.
* `Type` = “Resin Art”.
* `Tags` = comma-separated keywords from the title (e.g., `Balloon, Teddy, Set`), plus color tag for each variant.

**Images:**

* For each product, attach all matching images.
* Compute `Image Src` as a **raw Git URL** for the current branch so Shopify can download:

  * Determine repo origin: `git remote get-url origin`.
  * Determine branch you are committing to (`feat/arc-initial-site`).
  * Raw URL format (GitHub): `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/resources/images/<encoded-file>`
* Set `Image Position` starting at 1.
* `Image Alt Text` = Title plus color (if variant).
* If videos exist for the product, **do not** try to import them via CSV (Shopify CSV supports images). They’ll be embedded on the site (Part B).

**Metafields (optional via CSV):**

* Add column `product.metafields.custom.quote` and populate with extracted quote text when present; otherwise leave blank.

**Output file:**

* Create `shopify/products_import.csv` with Shopify’s header order.
* Include required columns noted by Shopify (Title/Handle, Option1 Name/Value, Variant fields, Published, Included/Primary/International, Status).
* Set `Published` = `TRUE`, `Included / [Primary]` = `TRUE`, `Included / International` = `TRUE`, `Status` = `active`.

**Validation:**

* Print a summary to console: products count, variants count, images linked, videos detected (for site only).
* Do a CSV sanity check: ensure at least `Title`, `Handle`, `Option1 Name`, `Option1 Value`, `Variant Price`, `Variant Grams`, `Variant Inventory Qty`, `Variant Inventory Policy`, `Variant Fulfillment Service`, `Variant Requires Shipping`, `Variant Taxable`, `Variant Weight Unit`, `Published`, `Included / [Primary]`, `Included / International`, `Status`.

---

## Part B — Scaffold the GitHub Pages site (Storefront API + Cart)

**Tech choice:** Plain HTML + JS (no build step) or a lightweight static framework. Keep it static for GitHub Pages. Create folder `site/`.

**Config:**

* Read from `.env.example` (create it) the following variables:

  * `SHOPIFY_STORE_DOMAIN` (e.g., `yourstore.myshopify.com`)
  * `SHOPIFY_STOREFRONT_TOKEN`
  * `SHOPIFY_API_VERSION` (default to a current stable version)
* In JS, load config via a simple `<script type="application/json" id="arc-config">` block so it still works on Pages without server env.

**Data source:**

* After import, the site fetches products with the **Storefront API**:

  * List products (title, handle, description, images, variants with price & selectedOptions).
  * Implement a **cart** (Storefront Cart API) with add/remove/update quantity and persistent cart ID in `localStorage`.

**Pages per `resources/WebsiteNotes.md`:**

* `index.html` – hero with ARC logo (autodetect logo in `resources/images/`), featured grid.
* `gallery.html` – tiled gallery of all products (images + optional embedded videos from `resources/videos/<file>` when present; do not block page if video missing).
* `shop.html` – product list with search, filters (by tag/type/color), product cards with “Add to Cart.”
* `product.html?handle=...` – product detail page with image gallery, optional embedded video(s), quote callout (if metafield present), price selector by variant, Add to Cart.
* `about.html`, `faq.html` (“How we sell”), `terms.html`, `privacy.html`, `contact.html`.
* Add SEO tags (title, meta description, open graph), sitemap, and robots.txt.
* Header/footer with social links placeholders (Facebook/TikTok/Instagram).
* Light theme (white), tasteful gold/black accents from the ARC logo.

**UI/UX:**

* Responsive CSS (flex/grid), accessible labels, alt text from product/image data.
* Cart drawer or dedicated `cart.html` showing line items, totals, and a **Checkout** button that redirects to Shopify checkout URL.

**Video embedding:**

* If a product has a matching `.mp4` in `resources/videos/` (filename base matches handle or title), embed a `<video controls>` element on `product.html` and `gallery.html` (muted autoplay in gallery optional).

**Repo structure to create:**

```
/site
  /assets/css/arc.css
  /assets/js/shopify.js     (Storefront client, cart helpers)
  /assets/js/ui.js          (gallery, product rendering)
  /images/logo.(png|svg)    (copy ARC logo here)
  index.html
  gallery.html
  shop.html
  product.html
  about.html
  faq.html
  terms.html
  privacy.html
  contact.html
/.env.example
/shopify/products_import.csv
/tools/Build-ARC-ShopifyCsv.ps1   (script to regenerate CSV from ARCfiles.csv)
```

**PowerShell helper (outline):**

* `tools/Build-ARC-ShopifyCsv.ps1` reads `ARCfiles.csv`, applies the grouping/color variant rules above, emits `shopify/products_import.csv`.
* Write objects to CSV with the exact Shopify header order.
* Emit a summary object to the console (Counts of Products/Variants/Images/Videos).

**Readme updates:**

* Add `README-ARC.md` describing:

  * How to set Storefront API credentials.
  * How to import `shopify/products_import.csv` in Shopify Admin.
  * How to re-run the CSV builder script.
  * How to deploy via GitHub Pages (branch or `/docs`).

---

## Part C — Branch, commit, PR

1. Create branch `feat/arc-initial-site`.
2. Add generated files.
3. Commit with message: `feat: ARC initial Shopify CSV + GitHub Pages storefront (cart enabled)`.
4. Open a PR to `main` with:

   * Product/media counts.
   * Sample product rows from the CSV.
   * Instructions to:
     a) Import the CSV in Shopify.
     b) Add Storefront API token & domain to `index.html` config block.
     c) Test add-to-cart and checkout flow.

**Finally:** Print to console:

* Path to `shopify/products_import.csv`.
* Number of products, variants, images, videos detected.
* PR URL (after creation).

**Proceed now.**
