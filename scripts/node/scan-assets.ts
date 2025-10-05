import { stat } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { parseCliFlags } from './lib/cli.js';
import { loadConfig, ArcConfig } from './lib/config.js';
import { Logger } from './lib/logger.js';
import { parseName } from './lib/naming.js';

interface ProductMedia {
  absolutePath: string;
  relativePath: string;
  type: 'image' | 'video';
  altText: string;
  sourceMuting?: 'required' | 'muted';
}

interface VariantRecord {
  key: string;
  title: string;
  options: Array<{ name: string; value: string }>;
  assets: ProductMedia[];
  sku: string;
  price: string;
}

interface ProductRecord {
  title: string;
  handle: string;
  tags: string[];
  status: string;
  vendor: string;
  productType: string;
  options: Array<{ name: string; values: string[] }>;
  variants: VariantRecord[];
  media: ProductMedia[];
}

interface MarketingAsset {
  absolutePath: string;
  relativePath: string;
  type: 'image' | 'video';
}

interface ScanResult {
  products: ProductRecord[];
  marketing: MarketingAsset[];
}

function buildAltText(product: ProductRecord, variant: VariantRecord, defaults: ArcConfig['productDefaults']): string {
  const fragments: string[] = [product.title];
  const optionText = variant.options.map((option) => option.value).filter((value) => value !== 'Standard');
  if (optionText.length > 0) {
    fragments.push(optionText.join(' '));
  }
  fragments.push('by ' + defaults.vendor);
  return fragments.join(' ');
}

function uniqueAppend(collection: string[], value: string): void {
  if (!collection.includes(value)) {
    collection.push(value);
  }
}

async function collectFiles(root: string, pattern: string[]): Promise<string[]> {
  const absoluteRoot = path.resolve(root);
  const entries = await fg(pattern, { cwd: absoluteRoot, caseSensitiveMatch: false });
  return entries.map((relative) => path.join(absoluteRoot, relative));
}

function determineOptionValue(value: string | undefined, fallback: string): string {
  if (!value || value.trim().length === 0) {
    return fallback;
  }
  return value;
}

function buildVariantKey(style: string, color: string, size: string): string {
  return [style, color, size].join('::').toLowerCase();
}

function createVariantTitle(productTitle: string, options: Array<{ name: string; value: string }>): string {
  const details = options
    .filter((option) => option.value !== 'Standard')
    .map((option) => option.value)
    .join(' ');
  return details.length > 0 ? productTitle + ' - ' + details : productTitle + ' - Standard';
}

function normaliseTag(value: string): string {
  return value.trim().toLowerCase();
}

async function scanAssets(config: ArcConfig): Promise<ScanResult> {
  const defaultOptions = config.productDefaults.options;
  const styleName = defaultOptions[0] ?? 'Style';
  const colorName = defaultOptions[1] ?? 'Color';
  const sizeName = defaultOptions[2] ?? 'Size';

  const productsMap = new Map<string, ProductRecord>();

  const productImages = await collectFiles(config.mediaRoots.products, ['**/*.{jpg,jpeg,png,webp}']);
  const productVideos = config.mediaRoots.videos
    ? await collectFiles(config.mediaRoots.videos, ['**/*.{mp4,mov,webm}'])
    : [];

  for (const filePath of productImages) {
    const parsed = parseName(filePath, config);
    const handle = parsed.handle;
    const existing = productsMap.get(handle);
    const product: ProductRecord = existing ?? {
      title: parsed.title,
      handle,
      tags: [...config.productDefaults.tags],
      status: config.productDefaults.status,
      vendor: config.productDefaults.vendor,
      productType: config.productDefaults.productType,
      options: [
        { name: styleName, values: [] },
        { name: colorName, values: [] },
        { name: sizeName, values: [] }
      ],
      variants: [],
      media: []
    };

    const styleValue = determineOptionValue(parsed.style, 'Standard');
    const colorValue = determineOptionValue(parsed.color, 'Standard');
    const sizeValue = determineOptionValue(parsed.size, 'Standard');
    const variantKey = buildVariantKey(styleValue, colorValue, sizeValue);
    let variant = product.variants.find((item) => item.key === variantKey);
    if (!variant) {
      const options = [
        { name: styleName, value: styleValue },
        { name: colorName, value: colorValue },
        { name: sizeName, value: sizeValue }
      ];
      const title = createVariantTitle(product.title, options);
      variant = {
        key: variantKey,
        title,
        options,
        assets: [],
        sku: product.handle.toUpperCase() + '-' + product.variants.length.toString().padStart(3, '0'),
        price: config.productDefaults.defaultPrice
      };
      product.variants.push(variant);
      uniqueAppend(product.options[0].values, styleValue);
      uniqueAppend(product.options[1].values, colorValue);
      uniqueAppend(product.options[2].values, sizeValue);
      if (styleValue !== 'Standard') {
        uniqueAppend(product.tags, normaliseTag(styleValue));
      }
      if (colorValue !== 'Standard') {
        uniqueAppend(product.tags, normaliseTag(colorValue));
      }
      if (sizeValue !== 'Standard') {
        uniqueAppend(product.tags, normaliseTag(sizeValue));
      }
    }

    const relativePath = path.relative(process.cwd(), filePath);
    const media: ProductMedia = {
      absolutePath: filePath,
      relativePath,
      type: 'image',
      altText: ''
    };
    product.media.push(media);
    variant.assets.push(media);

    productsMap.set(handle, product);
  }

  for (const filePath of productVideos) {
    const parsed = parseName(filePath, config);
    const product = productsMap.get(parsed.handle);
    if (!product) {
      continue;
    }
    const styleValue = determineOptionValue(parsed.style, 'Standard');
    const colorValue = determineOptionValue(parsed.color, 'Standard');
    const sizeValue = determineOptionValue(parsed.size, 'Standard');
    const variantKey = buildVariantKey(styleValue, colorValue, sizeValue);
    const variant = product.variants.find((item) => item.key === variantKey) ?? product.variants[0];
    const relativePath = path.relative(process.cwd(), filePath);
    const media: ProductMedia = {
      absolutePath: filePath,
      relativePath,
      type: 'video',
      altText: ''
    };
    product.media.push(media);
    variant.assets.push(media);
  }

  const products: ProductRecord[] = [];
  for (const product of productsMap.values()) {
    const variantDefaults = product.variants[0];
    for (const variant of product.variants) {
      variant.title = createVariantTitle(product.title, variant.options);
      const altText = buildAltText(product, variant, config.productDefaults);
      for (const media of variant.assets) {
        if (!media.altText || media.altText.length === 0) {
          media.altText = altText;
        }
      }
      if (!variant.price || variant.price.trim().length === 0) {
        variant.price = config.productDefaults.defaultPrice;
      }
      if (!variant.sku || variant.sku.length === 0) {
        variant.sku = product.handle.toUpperCase() + '-' + variant.key.replace(/[^a-z0-9]+/g, '-').toUpperCase();
      }
    }
    if (product.options[0].values.length === 1 && product.options[0].values[0] === 'Standard') {
      product.options.shift();
    }
    if (product.options.length > 1 && product.options[0].values.length === 0) {
      product.options[0].values.push(determineOptionValue(variantDefaults.options[0]?.value, 'Standard'));
    }
    products.push(product);
  }

  const marketingAssets: MarketingAsset[] = [];
  if (config.mediaRoots.marketing) {
    const marketingFiles = await collectFiles(config.mediaRoots.marketing, ['marketing/**/*.{jpg,jpeg,png,webp,mp4,webm,mov}']);
    for (const filePath of marketingFiles) {
      const stats = await stat(filePath).catch(() => undefined);
      if (!stats) {
        continue;
      }
      const relativePath = path.relative(process.cwd(), filePath);
      const extension = path.extname(filePath).toLowerCase();
      const type = extension === '.mp4' || extension === '.mov' || extension === '.webm' ? 'video' : 'image';
      marketingAssets.push({
        absolutePath: filePath,
        relativePath,
        type
      });
    }
  }

  return { products, marketing: marketingAssets };
}

function buildCsv(result: ScanResult): string {
  const headers = ['Handle', 'Title', 'Tags', 'Variant Title', 'Variant SKU', 'Variant Price', 'Options'];
  const rows = [headers.join(',')];
  for (const product of result.products) {
    for (const variant of product.variants) {
      const options = variant.options.map((option) => option.name + ':' + option.value).join('|');
      const row = [
        product.handle,
        '"' + product.title.replace(/"/g, '""') + '"',
        '"' + product.tags.join('; ').replace(/"/g, '""') + '"',
        '"' + variant.title.replace(/"/g, '""') + '"',
        variant.sku,
        variant.price,
        '"' + options.replace(/"/g, '""') + '"'
      ];
      rows.push(row.join(','));
    }
  }
  return rows.join('\n');
}

async function main(): Promise<void> {
  const options = parseCliFlags();
  const config = await loadConfig();
  const logger = new Logger(config, options.dryRun);
  await logger.prepare();

  const result = await scanAssets(config);
  await logger.log('Discovered ' + result.products.length + ' candidate products');
  const variantCount = result.products.reduce((count, product) => count + product.variants.length, 0);
  await logger.log('Discovered ' + variantCount + ' variants across all products');

  const json = JSON.stringify(result, null, 2);
  await logger.writeFile(path.basename(config.tracing.productsJson), json);

  const variantsPayload = result.products.map((product) => ({
    handle: product.handle,
    variants: product.variants.map((variant) => ({
      key: variant.key,
      sku: variant.sku,
      price: variant.price,
      options: variant.options
    }))
  }));
  await logger.writeFile(path.basename(config.tracing.variantsJson), JSON.stringify(variantsPayload, null, 2));
  await logger.writeFile(path.basename(config.tracing.productsCsv), buildCsv(result));

  await logger.log('Wrote asset discovery outputs to ' + config.tracing.outputDir);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
