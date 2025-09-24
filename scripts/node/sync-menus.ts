import { parseCliFlags } from './lib/cli.js';
import { loadConfig } from './lib/config.js';
import { Logger } from './lib/logger.js';
import { ShopifyClient } from './lib/shopify.js';

interface MenuItemConfig {
  title: string;
  type: string;
  handle?: string;
  url?: string;
  items?: unknown;
}

interface MenuNode {
  id: string;
  title: string;
  type: string;
  url: string | null;
  items: MenuNode[];
}

const MENU_QUERY = [
  'query MenuQuery(: String!) {',
  '  menu(handle: ) {',
  '    id',
  '    handle',
  '    title',
  '    items {',
  '      id',
  '      title',
  '      type',
  '      url',
  '      items {',
  '        id',
  '        title',
  '        type',
  '        url',
  '      }',
  '    }',
  '  }',
  '}'
].join('\n');

const MENU_CREATE_MUTATION = [
  'mutation MenuCreate(: MenuInput!) {',
  '  menuCreate(menu: ) {',
  '    menu { id handle }',
  '    userErrors { field message }',
  '  }',
  '}'
].join('\n');

const MENU_UPDATE_MUTATION = [
  'mutation MenuUpdate(: MenuUpdateInput!) {',
  '  menuUpdate(menu: ) {',
  '    menu { id handle }',
  '    userErrors { field message }',
  '  }',
  '}'
].join('\n');

interface MenuInputItem {
  title: string;
  type: string;
  url?: string;
  items?: MenuInputItem[];
}

function normaliseUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (!path.startsWith('/')) {
    return '/' + path;
  }
  return path;
}

function buildMenuItems(
  items: MenuItemConfig[],
  config: Awaited<ReturnType<typeof loadConfig>>,
  level = 0
): MenuInputItem[] {
  const featuredMap = new Map<string, string>();
  for (const collection of config.collections.manual) {
    featuredMap.set(collection.handle, collection.title);
  }
  for (const collection of config.collections.smart) {
    featuredMap.set(collection.handle, collection.title);
  }

  return items.map((item) => {
    let url = item.url ?? '';
    if (!url) {
      switch (item.type) {
        case 'FRONT_PAGE':
          url = '/';
          break;
        case 'ALL':
          url = '/collections/all';
          break;
        case 'COLLECTION':
          url = '/collections/' + (item.handle ?? '');
          break;
        case 'PAGE':
          url = '/pages/' + (item.handle ?? '');
          break;
        default:
          url = '#';
          break;
      }
    }

    let children: MenuInputItem[] = [];
    if (item.type === 'COLLECTION_LIST' && item.items === 'auto') {
      children = (config.collections.menuFeatured ?? [])
        .map((handle) => ({
          title: featuredMap.get(handle) ?? handle,
          type: 'HTTP',
          url: normaliseUrl('/collections/' + handle)
        }));
    } else if (Array.isArray(item.items)) {
      children = buildMenuItems(item.items as MenuItemConfig[], config, level + 1);
    }

    return {
      title: item.title,
      type: 'HTTP',
      url: normaliseUrl(url),
      items: children.length > 0 ? children : undefined
    };
  });
}

function menuItemsEqual(desired: MenuInputItem[], existing: MenuNode[]): boolean {
  if (desired.length !== existing.length) {
    return false;
  }
  for (let i = 0; i < desired.length; i += 1) {
    const desiredItem = desired[i];
    const existingItem = existing[i];
    const desiredUrl = desiredItem.url ?? '';
    const existingUrl = existingItem.url ?? '';
    if (desiredItem.title !== existingItem.title || normaliseUrl(desiredUrl) !== normaliseUrl(existingUrl)) {
      return false;
    }
    const desiredChildren = desiredItem.items ?? [];
    const existingChildren = existingItem.items ?? [];
    if (!menuItemsEqual(desiredChildren, existingChildren)) {
      return false;
    }
  }
  return true;
}

async function syncMenu(
  client: ShopifyClient,
  logger: Logger,
  handle: string,
  title: string,
  items: MenuItemConfig[],
  config: Awaited<ReturnType<typeof loadConfig>>,
  dryRun: boolean
): Promise<void> {
  const desiredItems = buildMenuItems(items, config);
  const response = await client.adminGraphql<{ menu: { id: string; items: MenuNode[] } | null }>(
    { query: MENU_QUERY, variables: { handle } },
    'menu lookup ' + handle
  );
  const menu = response?.menu ?? null;

  if (menu && menuItemsEqual(desiredItems, menu.items)) {
    await logger.log('Menu ' + handle + ' already matches desired structure');
    return;
  }

  if (dryRun) {
    const currentCount = menu ? menu.items.length : 0;
    await logger.log('DRY-RUN menu ' + handle + ' would update from ' + currentCount + ' to ' + desiredItems.length + ' root items');
    return;
  }

  if (!menu) {
    const createInput = {
      handle,
      title,
      items: desiredItems
    };
    const createResponse = await client.adminGraphql<{ menuCreate: { menu: { id: string }; userErrors: Array<{ message: string }> } }>(
      { query: MENU_CREATE_MUTATION, variables: { menu: createInput } },
      'menuCreate ' + handle,
      true
    );
    const errors = createResponse?.menuCreate?.userErrors ?? [];
    if (errors.length > 0) {
      throw new Error(errors.map((error) => error.message).join('; '));
    }
    await logger.log('Created menu ' + handle);
    return;
  }

  const updateInput = {
    id: menu.id,
    handle,
    title,
    items: desiredItems
  };
  const updateResponse = await client.adminGraphql<{ menuUpdate: { userErrors: Array<{ message: string }> } }>(
    { query: MENU_UPDATE_MUTATION, variables: { menu: updateInput } },
    'menuUpdate ' + handle,
    true
  );
  const errors = updateResponse?.menuUpdate?.userErrors ?? [];
  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
  await logger.log('Updated menu ' + handle);
}

async function main(): Promise<void> {
  const options = parseCliFlags();
  const config = await loadConfig();
  const logger = new Logger(config, options.dryRun);
  await logger.prepare();

  const client = new ShopifyClient({ dryRun: options.dryRun, logger });

  await syncMenu(client, logger, 'main-menu', 'Main menu', config.menus.main, config, options.dryRun);
  await syncMenu(client, logger, 'footer', 'Footer menu', config.menus.footer, config, options.dryRun);

  await logger.log('Menu sync completed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
