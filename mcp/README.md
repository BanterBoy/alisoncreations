# Shopify Storefront MCP Client

This folder contains a lightweight Model Context Protocol (MCP) client for Shopify Storefront. It helps connect local automations and AI agents to Shopify's official Storefront MCP server without relying on paid apps.

## Environment variables

The runner loads the root `.env` file and expects:

- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_STOREFRONT_API_TOKEN`
- Optional `MCP_STOREFRONT_URL` (defaults to `https://<store>/apps/mcp/storefront`).

## Development commands

```
npm install   # at repo root
npx tsx mcp/dev-runner.ts tools
npx tsx mcp/dev-runner.ts search "resin"
npx tsx mcp/dev-runner.ts product peek-a-boo-teddy
npx tsx mcp/dev-runner.ts cart-demo peek-a-boo-teddy 1
```

These commands respectively list available MCP tools, search for products, fetch product detail by handle, and walk through a cart creation demo using the first variant returned by the MCP server.

## Wiring other MCP-compatible clients

Point your agent/client to the same MCP base URL (`MCP_STOREFRONT_URL`) and forward the Storefront API token via the `X-Shopify-Storefront-Access-Token` header. The following tool names are expected by this helper:

- `products/search`
- `products/list`
- `products/get`
- `cart/create`
- `cart/addLines`
- `shop/policies`

Refer to Shopify's official Storefront MCP documentation for the exact schema and available tools as it evolves.
