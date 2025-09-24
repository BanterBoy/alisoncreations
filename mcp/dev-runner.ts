import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { McpClient } from './client.js';

const rootEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
loadEnv({ path: rootEnvPath });
loadEnv();

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error('Missing environment variable: ' + key);
  }
  return value;
}

async function main(): Promise<void> {
  const storeDomain = getEnv('SHOPIFY_STORE_DOMAIN');
  const storefrontToken = getEnv('SHOPIFY_STOREFRONT_API_TOKEN');
  const baseUrl = (process.env.MCP_STOREFRONT_URL ?? 'https://' + storeDomain + '/apps/mcp/storefront').replace(/\/$/, '');

  const client = new McpClient({ baseUrl, storefrontToken });
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'tools': {
      const tools = await client.listTools();
      console.log('Available MCP tools:', JSON.stringify(tools, null, 2));
      break;
    }
    case 'search': {
      const query = args.join(' ') || 'resin';
      const results = await client.searchProducts(query);
      console.log('Search results for "' + query + '":');
      console.dir(results, { depth: null });
      break;
    }
    case 'product': {
      const handle = args[0];
      if (!handle) {
        throw new Error('Usage: npm run mcp -- product <handle>');
      }
      const product = await client.getProduct({ handle });
      console.dir(product, { depth: null });
      break;
    }
    case 'policies': {
      const policies = await client.fetchPolicies();
      console.dir(policies, { depth: null });
      break;
    }
    case 'cart-demo': {
      const handle = args[0];
      const quantity = Number(args[1] ?? '1');
      if (!handle) {
        throw new Error('Usage: npm run mcp -- cart-demo <handle> [quantity]');
      }
      const product = await client.getProduct({ handle });
      const variantId = product?.data?.variants?.[0]?.id ?? product?.variants?.[0]?.id;
      if (!variantId) {
        throw new Error('Unable to determine a variant ID from product response.');
      }
      const cart = await client.createCart([{ merchandiseId: variantId, quantity }]);
      console.log('Created cart:');
      console.dir(cart, { depth: null });
      break;
    }
    default: {
      console.log('Arc MCP dev runner');
      console.log('Usage:');
      console.log('  tsx mcp/dev-runner.ts tools');
      console.log('  tsx mcp/dev-runner.ts search "teddy"');
      console.log('  tsx mcp/dev-runner.ts product <handle>');
      console.log('  tsx mcp/dev-runner.ts policies');
      console.log('  tsx mcp/dev-runner.ts cart-demo <handle> [quantity]');
      console.log('\nExample search followed by cart creation using the first result:');
      const query = 'featured';
      const results = await client.searchProducts(query);
      console.dir(results, { depth: 2 });
      break;
    }
  }
}

main().catch((error) => {
  console.error('[MCP error]', error);
  process.exitCode = 1;
});
