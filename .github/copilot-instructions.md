# ARC (Alison Resin Creations) - AI Coding Instructions

## Project Overview
This is a hybrid e-commerce system for handmade resin art products combining:
- **Shopify backend** for inventory/checkout via Storefront API
- **GitHub Pages frontend** as a static storefront with cart functionality
- **PowerShell automation** to convert product media into Shopify CSV imports

## Architecture & Data Flow

### Product Media → Shopify Pipeline
- `resources/ARCfiles.csv`: PowerShell export of all product images/videos
- **Color variant detection**: Files differing only by color words (pink/white/yellow/blue/gold/silver/black/green/red/purple/teal/grey) become variants of one product
- **Quote extraction**: Files containing `quote` have quoted text extracted for product descriptions
- **Image URLs**: Generated as raw GitHub URLs pointing to current branch for Shopify import
- Output: `shopify/products_import.csv` with proper Shopify format

### Site Structure (GitHub Pages)
```
/site/
  /assets/css/arc.css         # Light theme, gold/black accents
  /assets/js/shopify.js       # Storefront API client + cart
  /assets/js/ui.js            # Product rendering, gallery
  index.html                  # Hero with featured products
  gallery.html                # Tiled view with embedded videos
  shop.html                   # Product list with filters
  product.html?handle=...     # Detail page with variants
  about.html, faq.html, etc.
```

## Key Development Patterns

### Product Grouping Logic
When processing `ARCfiles.csv`:
- **Base product**: Remove file extension, "(2)" suffixes, extra spaces
- **Color variants**: Group files by base name + color detection
- **Separate products**: Different base names = different products
- **Title/Handle**: Title Case → kebab-case conversion

### Shopify Integration
- **Config via JSON script block**: No server env variables needed for GitHub Pages
- **Cart persistence**: Use `localStorage` for cart ID across sessions
- **Video embedding**: Match `.mp4` files to products by handle/title base name
- **Raw GitHub URLs**: Format `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/resources/images/<file>`

### PowerShell Conventions
- `tools/Build-ARC-ShopifyCsv.ps1`: Main CSV generation script
- Process only `PSIsContainer == False` rows from ARCfiles.csv
- Output structured summary: product count, variant count, images, videos

## Critical Files & Dependencies

- `Instructions.md`: Complete specification for Shopify CSV + site requirements
- `resources/WebsiteNotes.md`: Site structure requirements (gallery, shop, about, etc.)
- `resources/ARCfiles.csv`: Source data for all products (PowerShell Get-ChildItem export)
- `resources/images/ARC-Logo.png`: Brand logo to copy into site assets

## Development Workflow

### Branch Strategy
- **Main branch**: `prod` (not `main`)
- **Feature branches**: `feat/arc-initial-site` pattern
- **Non-destructive**: Never modify existing files outside new folders

### CSV Regeneration
```powershell
./tools/Build-ARC-ShopifyCsv.ps1
# Reads ARCfiles.csv → outputs shopify/products_import.csv
```

### Required Shopify CSV Columns
Title, Handle, Option1 Name/Value, Variant Price/Grams/Inventory Qty/Policy/Fulfillment Service/Requires Shipping/Taxable/Weight Unit, Published, Status, Image Src/Position/Alt Text

### Environment Setup
- `.env.example`: Template for Shopify credentials
- Config loaded via `<script type="application/json" id="arc-config">` for static hosting

## Project-Specific Conventions

- **Vendor**: Always "Alison Resin Creations (ARC)"
- **Type**: Always "Resin Art"  
- **Pricing defaults**: $0.00 (manual override), 0 inventory, deny policy
- **Tags**: Derived from title keywords + color variants
- **Meta descriptions**: "Hand-made resin creation: <Title>."
- **Quote metafields**: `product.metafields.custom.quote` for extracted quotes

## Integration Points

- **Shopify Admin**: Manual CSV import after generation
- **Storefront API**: Product fetching, cart operations, checkout redirect
- **GitHub Pages**: Static hosting with API integration via client-side JS
- **Media matching**: Cross-reference images/videos by filename patterns