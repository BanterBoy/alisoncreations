import path from 'node:path';
import { promises as fs } from 'node:fs';
import { parseCliFlags } from './lib/cli.js';
import { loadConfig } from './lib/config.js';
import { Logger } from './lib/logger.js';
import { ShopifyClient } from './lib/shopify.js';
import { fileSha256 } from './lib/file-hash.js';

interface ScanProductMedia {
  absolutePath: string;
  relativePath: string;
  type: 'image' | 'video';
  altText: string;
}

interface ScanVariant {
  key: string;
  title: string;
  options: Array<{ name: string; value: string }>;
  sku: string;
  price: string;
}

interface ScanProduct {
  title: string;
  handle: string;
  tags: string[];
  status: string;
  vendor: string;
  productType: string;
  options: Array<{ name: string; values: string[] }>;
  variants: ScanVariant[];
  media: ScanProductMedia[];
}

interface ScanResult {
  products: ScanProduct[];
  marketing: Array<{ absolutePath: string; relativePath: string; type: 'image' | 'video' }>;
}

interface ManifestEntry {
  hash: string;
  relativePath: string;
  fileId: string;
  url: string;
  type: 'image' | 'video';
}

interface ManifestFile {
  assets: ManifestEntry[];
}

interface ProductLookupResult {
  id: string;
  status: string;
  tags: string[];
  productType: string;
  vendor: string;
  variants: {
    edges: Array<{
      node: {
        id: string;
        sku: string;
        position: number;
        selectedOptions: Array<{ name: string; value: string }>;
      };
    }>;
  };
  media: {
    edges: Array<{
      node: {
        id: string;
        alt: string;
        mediaContentType: string;
        previewImage?: { url: string };
        image?: { url: string };
        sources?: Array<{ url: string }>;
        originUrl?: string;
      };
    }>;
  };
}

const PRODUCT_BY_HANDLE_QUERY = [
  'query ProductByHandle(: String!) {',
  '  productByHandle(handle: ) {',
  '    id',
  '    status',
  '    tags',
  '    productType',
  '    vendor',
  '    variants(first: 100) {',
  '      edges {',
  '        node {',
  '          id',
  '          sku',
  '          position',
  '          selectedOptions { name value }',
  '        }',
  '      }',
  '    }',
  '    media(first: 50) {',
  '      edges {',
  '        node {',
  '          id',
  '          mediaContentType',
  '          alt',
  '          previewImage { url }',
  '          ... on Video { sources { url } }',
  '          ... on ExternalVideo { originUrl }',
  '          ... on MediaImage { image { url } }',
  '        }',
  '      }',
  '    }',
  '  }',
  '}'
].join('\n');

const PRODUCT_CREATE_MUTATION = [
  'mutation ProductCreate(: ProductInput!) {',
  '  productCreate(input: ) {',
  '    product { id handle }',
  '    userErrors { field message }',
  '  }',
  '}'
].join('\n');

const PRODUCT_UPDATE_MUTATION = [
  'mutation ProductUpdate(: ProductInput!) {',
  '  productUpdate(input: ) {',
  '    product { id handle }',
  '    userErrors { field message }',
  '  }',
  '}'
].join('\n');

const VARIANT_UPDATE_MUTATION = [
  'mutation ProductVariantUpdate(: ProductVariantInput!) {',
  '  productVariantUpdate(input: ) {',
  '    productVariant { id sku }',
  '    userErrors { field message }',
  '  }',
  '}'
].join('\n');

const VARIANT_CREATE_MUTATION = [
  'mutation ProductVariantCreate(: ProductVariantInput!) {',
  '  productVariantCreate(input: ) {',
  '    product { id }',
  '    productVariant { id sku }',
  '    userErrors { field message }',
  '  }',
  '}'
].join('\n');

const PRODUCT_MEDIA_CREATE_MUTATION = [
  'mutation ProductCreateMedia(: ID!, : [CreateMediaInput!]!) {',
  '  productCreateMedia(productId: , media: ) {',
  '    media { id mediaContentType }',
  '    mediaUserErrors { code message }',
  '  }',
  '}'
].join('\n');

function readJsonFile<T>(filePath: string): Promise<T> {
  const absolute = path.resolve(filePath);
  return fs.readFile(absolute, 'utf8').then((content) => JSON.parse(content) as T);
}

async function loadManifest(pathOrDefault: string): Promise<ManifestFile> {
  try {
    return await readJsonFile<ManifestFile>(pathOrDefault);
  } catch (error) {
    return { assets: [] };
  }
}

function buildProductInput(product: ScanProduct, bodyHtml: string, seoDescription: string) {
  return {
    title: product.title,
    handle: product.handle,
    status: product.status,
    productType: product.productType,
    vendor: product.vendor,
    tags: product.tags,
    seo: {
      title: product.title,
      description: seoDescription
    },
    options: product.options.map((option) => option.name),
    bodyHtml,
    variants: product.variants.map((variant) => ({
      sku: variant.sku,
      price: variant.price,
      options: variant.options.map((option) => option.value)
    }))
  };
}

function buildVariantInput(variant: ScanVariant, productId: string, existingId?: string) {
  return {
    id: existingId,
    productId,
    sku: variant.sku,
    price: variant.price,
    options: variant.options.map((option) => option.value)
  };
}

function describeProduct(product: ScanProduct): string {
  const optionNames = product.options.map((option) => option.name).filter((name) => name !== 'Style' || product.options.length > 1);
  const variants = product.variants.length;
  const sentence = variants > 1
    ? 'Available in ' + variants + ' variants featuring ' + optionNames.join(', ') + '.'
    : 'One-of-a-kind resin art piece.';
  return '<p>' + product.title + ' handcrafted by ' + product.vendor + '. ' + sentence + '</p>';
}

function buildSeoDescription(product: ScanProduct): string {
  const fragment = product.variants[0]?.title ?? product.title;
  return product.title + ' – ' + fragment + '. Artisan resin decor by ' + product.vendor + '.';
}

async function ensureProduct(
  client: ShopifyClient,
  logger: Logger,
  product: ScanProduct,
  manifest: ManifestFile,
  dryRun: boolean
): Promise<{ id?: string; created: boolean }> {
  const lookup = await client.adminGraphql<{ productByHandle: ProductLookupResult | null }>(
    {
      query: PRODUCT_BY_HANDLE_QUERY,
      variables: { handle: product.handle }
    },
    'productByHandle lookup'
  );

  const existing = lookup?.productByHandle ?? null;
  const bodyHtml = describeProduct(product);
  const seoDescription = buildSeoDescription(product);

  if (!existing) {
    if (dryRun) {
      await logger.log('DRY-RUN create product ' + product.handle);
      return { created: true };
    }

    const createInput = buildProductInput(product, bodyHtml, seoDescription);
    const response = await client.adminGraphql<{ productCreate: { product: { id: string }; userErrors: Array<{ field: string[]; message: string }> } }>(
      {
        query: PRODUCT_CREATE_MUTATION,
        variables: { input: createInput }
      },
      'productCreate ' + product.handle,
      true
    );

    if (!response) {
      throw new Error('Product creation response missing for ' + product.handle);
    }

    const errors = response.productCreate.userErrors;
    if (errors && errors.length > 0) {
      const message = errors.map((error) => error.message).join('; ');
      throw new Error('Failed to create product ' + product.handle + ': ' + message);
    }

    const productId = response.productCreate.product.id;
    await syncMedia(client, logger, product, productId, manifest, dryRun);
    return { id: productId, created: true };
  }

  const productId = existing.id;
  if (dryRun) {
    await logger.log('DRY-RUN update product ' + product.handle);
    return { id: productId, created: false };
  }

  const updateInput = buildProductInput(product, bodyHtml, seoDescription);
  (updateInput as Record<string, unknown>).id = productId;
  delete (updateInput as Record<string, unknown>).variants;
  const updateResponse = await client.adminGraphql<{ productUpdate: { product: { id: string }; userErrors: Array<{ field: string[]; message: string }> } }>(
    {
      query: PRODUCT_UPDATE_MUTATION,
      variables: { input: updateInput }
    },
    'productUpdate ' + product.handle,
    true
  );

  if (!updateResponse) {
    throw new Error('Product update response missing for ' + product.handle);
  }

  const updateErrors = updateResponse.productUpdate.userErrors;
  if (updateErrors && updateErrors.length > 0) {
    const message = updateErrors.map((error) => error.message).join('; ');
    throw new Error('Failed to update product ' + product.handle + ': ' + message);
  }

  const existingVariants = existing.variants.edges.map((edge) => ({
    id: edge.node.id,
    sku: edge.node.sku
  }));
  const existingMediaUrls = existing.media.edges
    .map((edge) => edge.node.previewImage?.url ?? edge.node.image?.url ?? edge.node.sources?.[0]?.url ?? edge.node.originUrl ?? '')
    .filter((url) => url.length > 0);

  await syncVariants(client, logger, product, productId, existingVariants, dryRun);
  await syncMedia(client, logger, product, productId, manifest, dryRun, existingMediaUrls as string[]);
  return { id: productId, created: false };
}

async function syncVariants(
  client: ShopifyClient,
  logger: Logger,
  product: ScanProduct,
  productId: string,
  existingVariants: Array<{ id: string; sku: string }> = [],
  dryRun: boolean
): Promise<void> {
  const existingMap = new Map(existingVariants.map((variant) => [variant.sku, variant.id]));
  for (const variant of product.variants) {
    const existingId = existingMap.get(variant.sku);
    if (existingId) {
      if (dryRun) {
        await logger.log('DRY-RUN variant update ' + variant.sku);
        continue;
      }
      const input = buildVariantInput(variant, productId, existingId);
      const response = await client.adminGraphql<{ productVariantUpdate: { productVariant: { id: string }; userErrors: Array<{ field: string[]; message: string }> } }>(
        {
          query: VARIANT_UPDATE_MUTATION,
          variables: { input }
        },
        'productVariantUpdate ' + variant.sku,
        true
      );
      if (!response) {
        throw new Error('Variant update response missing for ' + variant.sku);
      }
      const errors = response.productVariantUpdate.userErrors;
      if (errors && errors.length > 0) {
        const message = errors.map((error) => error.message).join('; ');
        throw new Error('Failed to update variant ' + variant.sku + ': ' + message);
      }
    } else {
      if (dryRun) {
        await logger.log('DRY-RUN variant create ' + variant.sku);
        continue;
      }
      const input = buildVariantInput(variant, productId);
      const response = await client.adminGraphql<{ productVariantCreate: { productVariant: { id: string }; userErrors: Array<{ field: string[]; message: string }> } }>(
        {
          query: VARIANT_CREATE_MUTATION,
          variables: { input }
        },
        'productVariantCreate ' + variant.sku,
        true
      );
      if (!response) {
        throw new Error('Variant create response missing for ' + variant.sku);
      }
      const errors = response.productVariantCreate.userErrors;
      if (errors && errors.length > 0) {
        const message = errors.map((error) => error.message).join('; ');
        throw new Error('Failed to create variant ' + variant.sku + ': ' + message);
      }
    }
  }
}

async function syncMedia(
  client: ShopifyClient,
  logger: Logger,
  product: ScanProduct,
  productId: string,
  manifest: ManifestFile,
  dryRun: boolean,
  existingUrls: string[] = []
): Promise<void> {
  const desiredMedia = await Promise.all(
    product.media.map(async (media) => {
      const hash = await fileSha256(media.absolutePath);
      const match = manifest.assets.find((entry) => entry.hash === hash);
      return { media, manifest: match };
    })
  );

  const missingManifest = desiredMedia.filter((item) => !item.manifest);
  if (missingManifest.length > 0) {
    await logger.log('Missing manifest entries for ' + missingManifest.length + ' media assets on ' + product.handle, 'warn');
  }

  const payload = desiredMedia
    .filter((item) => !!item.manifest)
    .filter((item) => !existingUrls.includes(item.manifest!.url))
    .map((item) => ({
      originalSource: item.manifest!.url,
      mediaContentType: item.media.type === 'video' ? 'VIDEO' : 'IMAGE',
      alt: item.media.altText
    }));

  if (payload.length === 0) {
    await logger.log('No media to attach for ' + product.handle);
    return;
  }

  if (dryRun) {
    await logger.log('DRY-RUN media sync ' + payload.length + ' assets for ' + product.handle);
    return;
  }

  const response = await client.adminGraphql<{ productCreateMedia: { mediaUserErrors: Array<{ code: string; message: string }> } }>(
    {
      query: PRODUCT_MEDIA_CREATE_MUTATION,
      variables: { productId, media: payload }
    },
    'productCreateMedia ' + product.handle,
    true
  );

  if (!response) {
    throw new Error('Media sync response missing for ' + product.handle);
  }

  const errors = response.productCreateMedia.mediaUserErrors;
  if (errors && errors.length > 0) {
    const message = errors.map((error) => error.message).join('; ');
    throw new Error('Failed to attach media for ' + product.handle + ': ' + message);
  }
}

async function main(): Promise<void> {
  const options = parseCliFlags();
  const config = await loadConfig();
  const logger = new Logger(config, options.dryRun);
  await logger.prepare();

  const scanResult = await readJsonFile<ScanResult>(config.tracing.productsJson);
  const manifestPath = path.join(config.tracing.outputDir, 'assets-manifest.json');
  const manifest = await loadManifest(manifestPath);

  const client = new ShopifyClient({ dryRun: options.dryRun, logger });

  for (const product of scanResult.products) {
    try {
      await ensureProduct(client, logger, product, manifest, options.dryRun);
    } catch (error) {
      await logger.log('Error processing product ' + product.handle + ': ' + (error as Error).message, 'error');
    }
  }

  await logger.log('Product sync completed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
