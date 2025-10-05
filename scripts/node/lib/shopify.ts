import { setTimeout as delay } from 'node:timers/promises';
import type { Logger } from './logger.js';
import { getEnv, requireEnv } from './env.js';

interface GraphqlRequestOptions {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

interface ShopifyClientOptions {
  dryRun: boolean;
  logger: Logger;
  maxRetries?: number;
}

interface GraphqlError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  extensions?: Record<string, unknown>;
}

interface GraphqlResponse<T> {
  data?: T;
  errors?: GraphqlError[];
}

export class ShopifyClient {
  private readonly adminToken: string;
  private readonly storefrontToken: string;
  private readonly storeDomain: string;
  private readonly apiVersion: string;
  private readonly dryRun: boolean;
  private readonly logger: Logger;
  private readonly maxRetries: number;

  constructor(options: ShopifyClientOptions) {
    this.adminToken = requireEnv('SHOPIFY_ADMIN_API_TOKEN');
    this.storefrontToken = requireEnv('SHOPIFY_STOREFRONT_API_TOKEN');
    this.storeDomain = requireEnv('SHOPIFY_STORE_DOMAIN');
    this.apiVersion = getEnv('SHOPIFY_API_VERSION', '2024-10') ?? '2024-10';
    this.dryRun = options.dryRun;
    this.logger = options.logger;
    this.maxRetries = options.maxRetries ?? 5;
  }

  private adminEndpoint(): string {
    return 'https://' + this.storeDomain + '/admin/api/' + this.apiVersion + '/graphql.json';
  }

  private storefrontEndpoint(): string {
    return 'https://' + this.storeDomain + '/api/' + this.apiVersion + '/graphql.json';
  }

  async adminGraphql<T>(
    options: GraphqlRequestOptions,
    description?: string,
    isMutation = false
  ): Promise<T | undefined> {
    if (this.dryRun && isMutation) {
      await this.logger.log('DRY-RUN skipping admin mutation: ' + (description ?? options.operationName ?? 'mutation'));
      return undefined;
    }
    return this.executeGraphql<T>(this.adminEndpoint(), options, this.adminToken, description);
  }

  async storefrontGraphql<T>(
    options: GraphqlRequestOptions,
    description?: string,
    isMutation = false
  ): Promise<T | undefined> {
    if (this.dryRun && isMutation) {
      await this.logger.log('DRY-RUN skipping storefront mutation: ' + (description ?? options.operationName ?? 'mutation'));
      return undefined;
    }
    return this.executeGraphql<T>(this.storefrontEndpoint(), options, this.storefrontToken, description);
  }

  private async executeGraphql<T>(
    endpoint: string,
    { query, variables, operationName }: GraphqlRequestOptions,
    token: string,
    description?: string
  ): Promise<T> {
    const body = JSON.stringify({ query, variables, operationName });
    let attempt = 0;
    while (true) {
      attempt += 1;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token
        },
        body
      });

      if (response.status === 429) {
        const waitTime = Math.min(2 ** attempt * 250, 10_000);
        await this.logger.log('Hit Shopify rate limit, backing off for ' + waitTime + 'ms (attempt ' + attempt + ')', 'warn');
        if (attempt >= this.maxRetries) {
          throw new Error('Exceeded retry attempts due to rate limiting for ' + (description ?? 'GraphQL operation'));
        }
        await delay(waitTime);
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error('Shopify GraphQL error ' + response.status + ': ' + text);
      }

      const json = (await response.json()) as GraphqlResponse<T>;
      if (json.errors && json.errors.length > 0) {
        const messages = json.errors.map((err) => err.message).join('; ');
        throw new Error('Shopify GraphQL responded with errors: ' + messages);
      }
      if (!json.data) {
        throw new Error('Shopify GraphQL returned no data for ' + (description ?? 'operation'));
      }
      return json.data;
    }
  }
}
