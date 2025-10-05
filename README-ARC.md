# Alison Resin Creations - Shopify + GitHub Pages Launch Kit

This workspace pairs a Shopify product import with a static storefront suitable for GitHub Pages. It includes:

- `shopify/products_import.csv` - products, variants, image links, and quote metafields ready for Shopify Admin import.
- `tools/Build-ARC-ShopifyCsv.ps1` - PowerShell helper to regenerate the CSV from `resources/ARCfiles.csv`.
- `site/` - static storefront consuming the Shopify Storefront API with cart support.

## 1. Shopify Setup

1. In Shopify Admin go to **Products -> Import** and upload `shopify/products_import.csv`.
2. Leave price and inventory values at `0.00` / `0` for now. Update pricing, set inventory policies, and publish selected products once you are ready.
3. Confirm the metafield definition `custom.quote` is created automatically (via the CSV). This powers the quote callout on the product page.
4. Generate a **Storefront API access token** (Sales Channels -> Shopify API -> Storefront API).

## 2. Configure Storefront Credentials

1. Duplicate `.env.example` to `.env` and fill in:
   ```bash
   SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
   SHOPIFY_STOREFRONT_TOKEN=shpat_xxx
   SHOPIFY_API_VERSION=2024-07
   ```
2. Copy the same values into every HTML page's config block (look for `id="arc-config"`). Replace the placeholders with the actual domain/token/version.
3. Optional: update social links, phone number, and contact email in the HTML footer/contact sections.

## 3. Regenerate the Shopify CSV

If you add or rename files inside `resources/images` or `resources/videos`, rerun:

```powershell
pwsh ./tools/Build-ARC-ShopifyCsv.ps1
```

The script outputs product, variant, image, and video counts plus writes the CSV to `shopify/products_import.csv`. The CSV links to raw GitHub image URLs on the current branch. Commit those media assets alongside the CSV so Shopify can access them during import.

## 4. GitHub Pages Deployment

1. Push the `site/` folder to the default branch.
2. In the repository settings enable GitHub Pages and choose the `/site` directory as the publish source.
3. Once published, the storefront loads live data using the Storefront API token you supplied.
4. Rebuild the CSV or media JSON whenever new products or videos are added, then redeploy the `site/` directory.

## 5. Testing Checklist

- Run `pwsh ./tools/Build-ARC-ShopifyCsv.ps1` - confirm the counts and CSV output.
- Import the CSV into a Shopify dev store and verify images/metafields.
- Update the config block with a Storefront token and open `site/index.html` locally (via `npx serve site`) to ensure products load.
- Exercise add-to-cart and checkout flow (ensures cart mutations succeed and checkout URL opens).

Happy pouring and shipping!
