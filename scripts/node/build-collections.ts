import path from 'node:path';
import { parseCliFlags } from './lib/cli.js';
import { loadConfig } from './lib/config.js';
import { Logger } from './lib/logger.js';
import { ShopifyClient } from './lib/shopify.js';
import { promises as fs } from 'node:fs';

interface ScanProduct {
  handle: string;
  tags: string[];
}

interface ScanResult {
  products: Array<{ handle: string; tags: string[] }>;
}

const COLLECTION_BY_HANDLE_QUERY = [
  'query CollectionByHandle(: String!) {',
  '  collectionByHandle(handle: ) {',
  '    id',
  '    handle',
  '    title',
  '    descriptionHtml',
  '    ruleSet { appliedDisjunctively rules { column relation condition } }',
  '    products(first: 250) { edges { node { id handle } } }',
  '    collectionType',
  '  }',
  '}'
].join('\n');

const COLLECTION_CREATE_MUTATION = [
  'mutation CollectionCreate(: CollectionInput!) {',
  '  collectionCreate(input: ) {',
  '    collection { id handle }',
  '    userErrors { field message }',
  '  }',
  '}'
].join('\n');

const COLLECTION_UPDATE_MUTATION = [
  'mutation CollectionUpdate(: CollectionInput!) {',
  '  collectionUpdate(input: ) {',
  '    collection { id handle }',
  '    userErrors { field message }',
  '  }',
  '}'
].join('\n');

const COLLECTION_ADD_PRODUCTS_MUTATION = [
  'mutation CollectionAddProducts(: ID!, : [ID!]!) {',
  '  collectionAddProducts(collectionId: , productIds: ) {',
  '    job { id }',
  '    userErrors { field message }',
  '  }',
  '}'
].join('\n');

const COLLECTION_REMOVE_PRODUCTS_MUTATION = [
  'mutation CollectionRemoveProducts(: ID!, : [ID!]!) {',
  '  collectionRemoveProducts(collectionId: , productIds: ) {',
  '    job { id }',
  '    userErrors { field message }',
  '  }',
  '}'
].join('\n');

const PRODUCT_HANDLE_QUERY = [
  'query ProductIdByHandle(: String!) {',
  '  productByHandle(handle: ) { id handle }',
  '}'
].join('\n');

async function readScanProducts(filePath: string): Promise<ScanProduct[]> {
  const absolute = path.resolve(filePath);
  const raw = await fs.readFile(absolute, 'utf8');
  const parsed = JSON.parse(raw) as ScanResult;
  return parsed.products.map((product) => ({ handle: product.handle, tags: product.tags }));
}

async function getCollection(client: ShopifyClient, handle: string) {
  const response = await client.adminGraphql<{ collectionByHandle: any }>(
    { query: COLLECTION_BY_HANDLE_QUERY, variables: { handle } },
    'collectionByHandle ' + handle
  );
  return response?.collectionByHandle ?? null;
}

async function upsertCollection(
  client: ShopifyClient,
  logger: Logger,
  input: any,
  dryRun: boolean,
  isCreate: boolean
): Promise<string | undefined> {
  if (dryRun) {
    await logger.log('DRY-RUN ' + (isCreate ? 'create' : 'update') + ' collection ' + input.handle);
    return undefined;
  }

  const response = await client.adminGraphql<any>(
    {
      query: isCreate ? COLLECTION_CREATE_MUTATION : COLLECTION_UPDATE_MUTATION,
      variables: { input }
    },
    (isCreate ? 'collectionCreate ' : 'collectionUpdate ') + input.handle,
    true
  );
  const payload = isCreate ? response?.collectionCreate : response?.collectionUpdate;
  if (!payload) {
    throw new Error('Collection response missing for ' + input.handle);
  }
  const errors = payload.userErrors as Array<{ message: string }>;
  if (errors && errors.length > 0) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
  return payload.collection.id as string;
}

async function getProductId(client: ShopifyClient, handle: string, cache: Map<string, string>): Promise<string | undefined> {
  if (cache.has(handle)) {
    return cache.get(handle);
  }
  const response = await client.adminGraphql<{ productByHandle: { id: string } | null }>(
    { query: PRODUCT_HANDLE_QUERY, variables: { handle } },
    'productByHandle for collection sync'
  );
  const id = response?.productByHandle?.id;
  if (id) {
    cache.set(handle, id);
  }
  return id;
}

async function syncManualCollection(
  client: ShopifyClient,
  logger: Logger,
  manualConfig: { handle: string; title: string; description?: string; tags?: string[] },
  scanProducts: ScanProduct[],
  dryRun: boolean
): Promise<void> {
  const collection = await getCollection(client, manualConfig.handle);
  const descriptionHtml = manualConfig.description ?? '';
  const input = {
    handle: manualConfig.handle,
    title: manualConfig.title,
    sortOrder: 'MANUAL',
    descriptionHtml,
    ruleSet: null
  };

  const created = !collection;
  const collectionId = await upsertCollection(client, logger, input, dryRun, created);

  const tags = (manualConfig.tags ?? []).map((tag) => tag.toLowerCase());
  const targetHandles = tags.length === 0
    ? []
    : scanProducts
        .filter((product) => product.tags.some((tag) => tags.includes(tag.toLowerCase())))
        .map((product) => product.handle);

  if (dryRun) {
    await logger.log('DRY-RUN manual collection ' + manualConfig.handle + ' would contain ' + targetHandles.length + ' products');
    return;
  }

  if (tags.length === 0) {
    return;
  }

  if (targetHandles.length === 0) {
    await logger.log('No products matched tags for collection ' + manualConfig.handle);
    return;
  }

  if (!collectionId) {
    await logger.log('Collection ID missing for ' + manualConfig.handle, 'warn');
    return;
  }

  const cache = new Map<string, string>();
  const desiredIds: string[] = [];
  for (const handle of targetHandles) {
    const productId = await getProductId(client, handle, cache);
    if (productId) {
      desiredIds.push(productId);
    }
  }

  const existingIds: string[] = (collection?.products?.edges ?? []).map((edge: any) => edge.node.id);
  const toAdd = desiredIds.filter((id) => !existingIds.includes(id));
  const toRemove = existingIds.filter((id) => !desiredIds.includes(id));

  if (toAdd.length === 0 && toRemove.length === 0) {
    await logger.log('Collection ' + manualConfig.handle + ' already up to date');
    return;
  }

  if (toAdd.length > 0) {
    await client.adminGraphql(
      {
        query: COLLECTION_ADD_PRODUCTS_MUTATION,
        variables: { collectionId, productIds: toAdd }
      },
      'collectionAddProducts ' + manualConfig.handle,
      true
    );
  }
  if (toRemove.length > 0) {
    await client.adminGraphql(
      {
        query: COLLECTION_REMOVE_PRODUCTS_MUTATION,
        variables: { collectionId, productIds: toRemove }
      },
      'collectionRemoveProducts ' + manualConfig.handle,
      true
    );
  }

  await logger.log('Collection ' + manualConfig.handle + ' synced (' + toAdd.length + ' added, ' + toRemove.length + ' removed)');
}

async function syncSmartCollection(
  client: ShopifyClient,
  logger: Logger,
  smartConfig: { handle: string; title: string; conditions: Array<{ column: string; relation: string; condition: string }>; disjunctive?: boolean; sortOrder?: string },
  dryRun: boolean
): Promise<void> {
  const collection = await getCollection(client, smartConfig.handle);
  const input = {
    handle: smartConfig.handle,
    title: smartConfig.title,
    ruleSet: {
      appliedDisjunctively: smartConfig.disjunctive ?? false,
      rules: smartConfig.conditions
    },
    collectionType: 'SMART',
    sortOrder: smartConfig.sortOrder ?? 'BEST_SELLING'
  };

  await upsertCollection(client, logger, input, dryRun, !collection);
}

async function main(): Promise<void> {
  const options = parseCliFlags();
  const config = await loadConfig();
  const logger = new Logger(config, options.dryRun);
  await logger.prepare();

  const scanProducts = await readScanProducts(config.tracing.productsJson);
  const client = new ShopifyClient({ dryRun: options.dryRun, logger });

  for (const manual of config.collections.manual) {
    try {
      await syncManualCollection(client, logger, manual, scanProducts, options.dryRun);
    } catch (error) {
      await logger.log('Error syncing manual collection ' + manual.handle + ': ' + (error as Error).message, 'error');
    }
  }

  for (const smart of config.collections.smart) {
    try {
      await syncSmartCollection(client, logger, smart, options.dryRun);
    } catch (error) {
      await logger.log('Error syncing smart collection ' + smart.handle + ': ' + (error as Error).message, 'error');
    }
  }

  await logger.log('Collection sync completed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
