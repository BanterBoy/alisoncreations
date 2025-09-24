import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
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

interface ScanProduct {
  handle: string;
  title: string;
  media: ScanProductMedia[];
}

interface ScanResult {
  products: ScanProduct[];
  marketing: Array<{ absolutePath: string; relativePath: string; type: 'image' | 'video' }>;
}

interface AssetRecord {
  absolutePath: string;
  relativePath: string;
  type: 'image' | 'video';
  altText?: string;
  hash: string;
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

const STAGED_UPLOADS_MUTATION = [
  'mutation StagedUploadsCreate(: [StagedUploadInput!]!) {',
  '  stagedUploadsCreate(input: ) {',
  '    stagedTargets {',
  '      url',
  '      resourceUrl',
  '      parameters { name value }',
  '      mimeType',
  '    }',
  '    userErrors { field message }',
  '  }',
  '}'
].join('\n');

const FILE_CREATE_MUTATION = [
  'mutation FileCreate(: [FileCreateInput!]!) {',
  '  fileCreate(files: ) {',
  '    files { id url __typename ... on MediaImage { image { url alt } } }',
  '    userErrors { field message }',
  '  }',
  '}'
].join('\n');

function guessMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg';
  }
  if (extension === '.png') {
    return 'image/png';
  }
  if (extension === '.webp') {
    return 'image/webp';
  }
  if (extension === '.mp4') {
    return 'video/mp4';
  }
  if (extension === '.mov') {
    return 'video/quicktime';
  }
  if (extension === '.webm') {
    return 'video/webm';
  }
  return 'application/octet-stream';
}

async function readScanResult(configuredPath: string): Promise<ScanResult> {
  const absolute = path.resolve(configuredPath);
  const fileContents = await fs.readFile(absolute, 'utf8');
  return JSON.parse(fileContents) as ScanResult;
}

async function loadManifest(logger: Logger, manifestPath: string): Promise<ManifestFile> {
  try {
    const absolute = path.resolve(manifestPath);
    const data = await fs.readFile(absolute, 'utf8');
    return JSON.parse(data) as ManifestFile;
  } catch (error) {
    await logger.log('Initialising new asset manifest at ' + manifestPath);
    return { assets: [] };
  }
}

async function saveManifest(logger: Logger, manifestPath: string, manifest: ManifestFile): Promise<void> {
  await logger.writeFile(path.basename(manifestPath), JSON.stringify(manifest, null, 2));
}

async function gatherAssets(scan: ScanResult): Promise<AssetRecord[]> {
  const seen = new Map<string, AssetRecord>();
  const candidates: AssetRecord[] = [];

  for (const product of scan.products) {
    for (const media of product.media) {
      const absolute = path.resolve(media.absolutePath);
      if (!seen.has(absolute)) {
        const hash = await fileSha256(absolute);
        const record: AssetRecord = {
          absolutePath: absolute,
          relativePath: media.relativePath,
          type: media.type,
          altText: media.altText,
          hash
        };
        seen.set(absolute, record);
        candidates.push(record);
      }
    }
  }

  for (const marketing of scan.marketing) {
    const absolute = path.resolve(marketing.absolutePath);
    if (!seen.has(absolute)) {
      const hash = await fileSha256(absolute);
      const record: AssetRecord = {
        absolutePath: absolute,
        relativePath: marketing.relativePath,
        type: marketing.type,
        hash
      };
      seen.set(absolute, record);
      candidates.push(record);
    }
  }

  return candidates;
}

async function createStagedUpload(
  client: ShopifyClient,
  assets: AssetRecord[],
  logger: Logger,
  dryRun: boolean
): Promise<Array<{ asset: AssetRecord; url: string; resourceUrl: string; parameters: Array<{ name: string; value: string }> }>> {
  if (assets.length === 0) {
    return [];
  }

  if (dryRun) {
    await logger.log('DRY-RUN skipping staged upload request for ' + assets.length + ' assets');
    return assets.map((asset) => ({ asset, url: '', resourceUrl: '', parameters: [] }));
  }

  const input = await Promise.all(
    assets.map(async (asset) => {
      const stats = await fs.stat(asset.absolutePath);
      return {
        filename: path.basename(asset.absolutePath),
        mimeType: guessMimeType(asset.absolutePath),
        resource: 'FILE',
        fileSize: stats.size.toString(),
        httpMethod: 'POST'
      };
    })
  );

  const response = await client.adminGraphql<{ stagedUploadsCreate: { stagedTargets: Array<{ url: string; resourceUrl: string; parameters: Array<{ name: string; value: string }>; mimeType: string }>; userErrors: Array<{ field: string[]; message: string }> } }>(
    {
      query: STAGED_UPLOADS_MUTATION,
      variables: { input }
    },
    'stagedUploadsCreate',
    true
  );

  if (!response) {
    return [];
  }

  const payload = response.stagedUploadsCreate;
  if (payload.userErrors && payload.userErrors.length > 0) {
    const message = payload.userErrors.map((error) => error.message).join('; ');
    throw new Error('Shopify stagedUploadsCreate errors: ' + message);
  }

  if (payload.stagedTargets.length !== assets.length) {
    throw new Error('Mismatch between requested staged uploads and response size');
  }

  return payload.stagedTargets.map((target, index) => ({
    asset: assets[index],
    url: target.url,
    resourceUrl: target.resourceUrl,
    parameters: target.parameters
  }));
}

async function uploadToStagedTarget(
  stage: { asset: AssetRecord; url: string; resourceUrl: string; parameters: Array<{ name: string; value: string }> },
  dryRun: boolean,
  logger: Logger
): Promise<string | undefined> {
  if (dryRun) {
    await logger.log('DRY-RUN skipping upload for ' + stage.asset.relativePath);
    return stage.resourceUrl;
  }

  const form = new FormData();
  for (const parameter of stage.parameters) {
    form.append(parameter.name, parameter.value);
  }
  form.append('file', createReadStream(stage.asset.absolutePath));

  const response = await fetch(stage.url, {
    method: 'POST',
    body: form
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error('Staged upload failed: ' + text);
  }

  return stage.resourceUrl;
}

async function commitFiles(
  client: ShopifyClient,
  completed: Array<{ asset: AssetRecord; resourceUrl?: string }>,
  dryRun: boolean,
  logger: Logger
): Promise<ManifestEntry[]> {
  const inputs = completed
    .filter((item) => !!item.resourceUrl)
    .map((item) => ({
      alt: item.asset.altText,
      contentType: item.asset.type === 'video' ? 'VIDEO' : 'IMAGE',
      originalSource: item.resourceUrl,
      filename: path.basename(item.asset.relativePath)
    }));

  if (inputs.length === 0) {
    return [];
  }

  if (dryRun) {
    await logger.log('DRY-RUN skipping fileCreate for ' + inputs.length + ' assets');
    return inputs.map((input) => ({
      hash: '',
      relativePath: input.filename,
      fileId: 'dry-run',
      url: input.originalSource ?? '',
      type: input.contentType === 'VIDEO' ? 'video' : 'image'
    }));
  }

  const response = await client.adminGraphql<{ fileCreate: { files: Array<{ id: string; url: string }>; userErrors: Array<{ field: string[]; message: string }> } }>(
    {
      query: FILE_CREATE_MUTATION,
      variables: { files: inputs }
    },
    'fileCreate',
    true
  );

  if (!response) {
    return [];
  }

  const payload = response.fileCreate;
  if (payload.userErrors && payload.userErrors.length > 0) {
    const message = payload.userErrors.map((error) => error.message).join('; ');
    throw new Error('Shopify fileCreate errors: ' + message);
  }

  return payload.files.map((file, index) => ({
    hash: completed[index].asset.hash,
    relativePath: completed[index].asset.relativePath,
    fileId: file.id,
    url: file.url,
    type: completed[index].asset.type
  }));
}

async function main(): Promise<void> {
  const options = parseCliFlags();
  const config = await loadConfig();
  const logger = new Logger(config, options.dryRun);
  await logger.prepare();

  const scanResult = await readScanResult(config.tracing.productsJson);
  const manifestPath = path.join(config.tracing.outputDir, 'assets-manifest.json');
  const manifest = await loadManifest(logger, manifestPath);
  const knownHashes = new Set(manifest.assets.map((entry) => entry.hash));

  const assets = await gatherAssets(scanResult);
  const newAssets = assets.filter((asset) => !knownHashes.has(asset.hash));

  await logger.log('Total assets discovered: ' + assets.length);
  await logger.log('Assets requiring upload: ' + newAssets.length);

  if (newAssets.length === 0) {
    await logger.log('All assets already uploaded; exiting');
    return;
  }

  const client = new ShopifyClient({ dryRun: options.dryRun, logger });
  const staged = await createStagedUpload(client, newAssets, logger, options.dryRun);
  const uploaded: Array<{ asset: AssetRecord; resourceUrl?: string }> = [];

  for (const stage of staged) {
    const resourceUrl = await uploadToStagedTarget(stage, options.dryRun, logger);
    uploaded.push({ asset: stage.asset, resourceUrl });
  }

  const committed = await commitFiles(client, uploaded, options.dryRun, logger);

  if (options.dryRun) {
    await logger.log('DRY-RUN complete; manifest not updated');
    return;
  }

  for (const entry of committed) {
    manifest.assets.push(entry);
  }

  await saveManifest(logger, manifestPath, manifest);
  await logger.log('Asset upload complete; manifest updated with ' + committed.length + ' entries');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
