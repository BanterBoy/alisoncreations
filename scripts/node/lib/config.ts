import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cwd } from 'node:process';
import { z } from 'zod';

const smartCollectionConditionSchema = z.object({
  column: z.string(),
  relation: z.string(),
  condition: z.string()
});

const smartCollectionSchema = z.object({
  title: z.string(),
  handle: z.string(),
  conditions: z.array(smartCollectionConditionSchema),
  disjunctive: z.boolean().default(false),
  sortOrder: z.string().default('BEST_SELLING')
});

const manualCollectionSchema = z.object({
  handle: z.string(),
  title: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([])
});

const menuItemSchema = z.object({
  title: z.string(),
  type: z.enum(['FRONT_PAGE', 'ALL', 'COLLECTION', 'COLLECTION_LIST', 'PAGE', 'URL']).default('URL'),
  handle: z.string().optional(),
  url: z.string().optional(),
  items: z.union([z.array(z.any()), z.literal('auto')]).optional()
});

const configSchema = z.object({
  mediaRoots: z.object({
    products: z.string(),
    videos: z.string().optional(),
    marketing: z.string().optional(),
    mutedOutput: z.string().default('build/videos-muted')
  }),
  tracing: z.object({
    migrationLog: z.string(),
    outputDir: z.string(),
    productsJson: z.string(),
    variantsJson: z.string(),
    productsCsv: z.string()
  }),
  productDefaults: z.object({
    vendor: z.string(),
    status: z.string(),
    productType: z.string(),
    tags: z.array(z.string()),
    options: z.array(z.string()),
    templateSuffix: z.string().optional(),
    seoSuffix: z.string().optional(),
    defaultPrice: z.string().default('0.00')
  }),
  naming: z.object({
    splitDelimiters: z.array(z.string()).default(['-']),
    ignoredTokens: z.array(z.string()).default([]),
    colorVocabulary: z.array(z.string()).default([]),
    sizeVocabulary: z.array(z.string()).default([]),
    titleCase: z.boolean().default(true)
  }),
  collections: z.object({
    manual: z.array(manualCollectionSchema).default([]),
    smart: z.array(smartCollectionSchema).default([]),
    menuFeatured: z.array(z.string()).default([])
  }),
  menus: z.object({
    main: z.array(menuItemSchema),
    footer: z.array(menuItemSchema)
  })
});

export type ArcConfig = z.infer<typeof configSchema>;

let cachedConfig: ArcConfig | undefined;

export async function loadConfig(configPath = 'config/shopify.content.json'): Promise<ArcConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  const filePath = path.isAbsolute(configPath) ? configPath : path.join(cwd(), configPath);
  const raw = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  cachedConfig = configSchema.parse(parsed);
  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = undefined;
}
