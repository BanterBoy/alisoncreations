import { request } from 'undici';

export interface McpClientOptions {
  baseUrl: string;
  storefrontToken: string;
}

export class McpClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(options: McpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.token = options.storefrontToken;
  }

  async listTools() {
    return this.get('/tools');
  }

  async searchProducts(query: string) {
    return this.callTool('products/search', { query });
  }

  async getProduct(identifier: { handle?: string; id?: string }) {
    return this.callTool('products/get', identifier);
  }

  async listFeaturedProducts(limit = 10) {
    return this.callTool('products/list', { limit });
  }

  async fetchPolicies() {
    return this.callTool('shop/policies', {});
  }

  async createCart(lines: Array<{ merchandiseId: string; quantity: number }>) {
    return this.callTool('cart/create', { lines });
  }

  async addLines(cartId: string, lines: Array<{ merchandiseId: string; quantity: number }>) {
    return this.callTool('cart/addLines', { cartId, lines });
  }

  private async get(path: string) {
    const url = this.baseUrl + path;
    const { body, statusCode } = await request(url, {
      method: 'GET',
      headers: this.authHeaders()
    });
    const payload = await body.text();
    if (statusCode >= 400) {
      throw new Error('MCP request failed (' + statusCode + '): ' + payload);
    }
    return JSON.parse(payload);
  }

  private async callTool(tool: string, input: Record<string, unknown>) {
    const url = this.baseUrl + '/tools/' + tool;
    const { body, statusCode } = await request(url, {
      method: 'POST',
      body: JSON.stringify({ input }),
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders()
      }
    });
    const payload = await body.text();
    if (statusCode >= 400) {
      throw new Error('MCP tool call failed (' + statusCode + '): ' + payload);
    }
    return JSON.parse(payload);
  }

  private authHeaders() {
    return {
      'X-Shopify-Storefront-Access-Token': this.token
    } as Record<string, string>;
  }
}
