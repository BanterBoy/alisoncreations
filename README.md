# Arc Resin Creations Shopify Rollout

Everything in this repo now supports a scriptable Shopify storefront, automated catalog sync, and a local MCP harness—without adding paid apps.

## What’s inside
- `/theme` – Dawn-derived starter with muted video snippet, hero video section, featured collection tiles, contact + policy templates.
- `/scripts/node` – TypeScript automation (scan assets, mute videos, upload files, create products, build collections, sync menus, orchestrate sync-all).
- `/scripts/powershell` – Windows-friendly wrappers that capture transcripts in `out/`.
- `/config/shopify.content.json` – Opinionated defaults for folder mapping, naming heuristics, tag-driven collections, and menu intents.
- `/mcp` – Minimal Storefront MCP client (`mcp/dev-runner.ts`) plus helper class for product search/detail/cart/policy calls.
- Trace artefacts – `migration.log`, `out/products.json`, `out/variants.json`, `out/products.csv`, `out/videos.json`, `out/assets-manifest.json`.

## Prerequisites (detected locally)
| Tool | Status |
| --- | --- |
| Node.js | `v22.18.0` found at `C:\Program Files\nodejs\node.exe` (ensure `node` resolves in your shell) |
| npm | `10.9.3` |
| ffmpeg | **missing** → install [ffmpeg.org](https://ffmpeg.org/download.html) or `winget install Gyan.FFmpeg.Full` and ensure `ffmpeg` is on PATH |
| Shopify CLI | **missing** → install via `winget install Shopify.ShopifyCLI` (or follow [Shopify CLI docs](https://shopify.dev/docs/api/shopify-cli)) |

After installing new tools, restart your shell so PATH changes apply.

## Environment setup
1. Duplicate `.env.example` → `.env` and populate:
   - `SHOPIFY_STORE_DOMAIN` (e.g. `arc-resin-creations.myshopify.com`)
   - `SHOPIFY_ADMIN_API_TOKEN` (custom app with write_products, write_files, write_content, read/write channels)
   - `SHOPIFY_STOREFRONT_API_TOKEN` (Storefront token for published channel)
   - Optional `SHOPIFY_API_VERSION`, `MCP_STOREFRONT_URL`, `ARC_VERBOSE`
2. `npm install` (root) – generates `node_modules/` using the bundled `package-lock.json`.

## Sync pipeline (all scripts support `--dry-run`)
```
npm run scan -- --dry-run          # builds out/ products/variants summaries
npm run mute:videos -- --dry-run   # verifies ffmpeg availability, notes muted outputs
npm run sync:assets -- --dry-run   # hashes media, prepares staged uploads
npm run sync:products -- --dry-run # upserts products/variants/media
npm run sync:collections -- --dry-run
npm run sync:menus -- --dry-run
npm run sync:all -- --dry-run      # orchestrates the full chain
```
Outputs land in `out/`, while every run appends to `migration.log` for traceability. Remove `--dry-run` when ready to push live data.

### PowerShell wrappers
```
# all capture transcripts under out/
./scripts/powershell/Invoke-ArcScan.ps1 -DryRun
./scripts/powershell/Invoke-ArcMuteVideos.ps1 -DryRun
./scripts/powershell/Invoke-ArcSync.ps1 -DryRun
```
Each wrapper forwards any extra arguments to the underlying npm script (e.g. `-DryRun` + custom flags).

### Data assumptions
- Images live in `resources/images`, videos in `resources/videos` (override via `config/shopify.content.json`).
- Filenames steer variant parsing (colour/size vocab + ignored tokens configurable under `naming`).
- Default price (`productDefaults.defaultPrice`) = `£45.00` – adjust per merchandise rules.
- Asset uploads de-duplicate via SHA-256 manifest (`out/assets-manifest.json`).

## Theme notes
- Base Dawn structure with simplified sections:
  - `hero-video` pulls muted media (via `snippets/video-muted.liquid`) and never autoplays audio.
  - `featured-collections` auto-create tiles (replace blank collections in the editor).
  - `main-product` prefers WebP renditions and uses the muted video snippet for product media.
  - Contact + policy templates (`page.contact`, `page.shipping`, `page.returns`, `page.privacy`) are ready for custom copy.
- Dev locally once Shopify CLI is installed: `SHOPIFY_STORE_DOMAIN=... shopify theme dev` or `npm run dev:theme`.

## MCP dev harness
```
# requires .env + storefront token scopes
npx tsx mcp/dev-runner.ts tools          # list official tools exposed by the server
npx tsx mcp/dev-runner.ts search "teddy" # product search
npx tsx mcp/dev-runner.ts product peek-a-boo-teddy
npx tsx mcp/dev-runner.ts cart-demo peek-a-boo-teddy 1
```
The helper calls Shopify’s Storefront MCP server (default `https://<store>/apps/mcp/storefront`) using the Storefront API token through the `X-Shopify-Storefront-Access-Token` header. The `McpClient` class (in `mcp/client.ts`) maps to expected tool names (`products/search`, `products/list`, `products/get`, `cart/create`, `cart/addLines`, `shop/policies`). Adjust the base URL/tool names as Shopify expands the surface.

## Free sales channels setup
### Facebook & Instagram by Meta
1. In Shopify admin → **Settings → Apps and sales channels → Add sales channel** → choose “Facebook & Instagram by Meta”.
2. Complete the Meta account connection (ensure business manager, ad account, and Facebook page are verified).
3. Accept data-sharing level (Classical is sufficient for catalog sync).
4. Choose the product set you want to sync (automation tags from `config/shopify.content.json` can pre-filter).
5. Wait for Meta Commerce Manager approval (24–48h typical). Common blockers: missing refund policy, no contact email, or mismatched business address.
6. After approval, enable Instagram Shopping if required (Meta prompts inside Commerce Manager).

### TikTok (free connector)
1. Shopify admin → **Apps and sales channels → Add** → “TikTok”.
2. Sign in with the business TikTok account; create one if needed.
3. Connect the product catalog (Shopify auto-generates a data feed – ensure all required policies are published).
4. Configure shipping, return windows, and customer support contact in TikTok Seller Center.
5. Optional: enable TikTok Shop/Shopping Ads later—those features may incur separate spend, but the base connector is free.

**Cross-channel tips**
- Keep `SHOPIFY_STORE_DOMAIN` consistent; Meta/TikTok verification emails must match.
- Sync loops rely on published products – keep `status` “ACTIVE” or update via `productDefaults.status`.
- Both channels re-check policies and contact details; populate the new policy pages before submitting catalogs.

## Troubleshooting
- **ffmpeg missing** – install and re-run `npm run mute:videos -- --dry-run`; without ffmpeg the script marks videos so theme playback stays muted via attributes.
- **Shopify rate limits** – mutations auto back off exponentially. On repeated 429s, add `--force` to individual scripts only after confirming no other batch is running.
- **CSV review** – `out/products.csv` offers merchant-friendly validation. If Shopify bulk import tools reformat handles, re-run `npm run scan` to regenerate aligned data.
- **MCP schema drift** – enable `ARC_VERBOSE=true` to print request URLs and payloads when Shopify extends tool contracts.

## Suggested next moves
1. Fill `.env` and install the missing tooling (ffmpeg + Shopify CLI).
2. Run `npm run sync:all -- --dry-run`, review `out/` artefacts and `migration.log`.
3. Remove `--dry-run` once satisfied, then publish the theme or push via `shopify theme push`.
4. Connect Facebook/Instagram and TikTok channels, watching for policy approval emails.
5. Plug the MCP base URL + token into your preferred MCP-capable agent.
