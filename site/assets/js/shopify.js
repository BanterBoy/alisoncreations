
(function () {
  const CONFIG_SCRIPT_ID = 'arc-config';
  const CART_STORAGE_KEY = 'arc-cart-id';

  function readConfig() {
    const slot = document.getElementById(CONFIG_SCRIPT_ID);
    if (!slot) {
      console.warn('ARC config script tag not found');
      return null;
    }
    try {
      return JSON.parse(slot.textContent.trim());
    } catch (err) {
      console.error('Unable to parse ARC config JSON', err);
      return null;
    }
  }

  const config = readConfig() || {};

  function requireConfig() {
    const domain = config.domain;
    const token = config.storefrontToken;
    const version = config.apiVersion || '2024-07';
    if (!domain || !token) {
      throw new Error('Shopify credentials are missing. Please set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN.');
    }
    return { domain, token, version };
  }

  async function graphql(query, variables) {
    if (variables === undefined) variables = {};
    const cfg = requireConfig();
    const endpoint = 'https://' + cfg.domain + '/api/' + cfg.version + '/graphql.json';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': cfg.token
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error('Shopify API request failed: ' + response.status + ' ' + text);
    }

    const payload = await response.json();
    if (payload.errors) {
      throw new Error(payload.errors.map(function (e) { return e.message; }).join(', '));
    }
    return payload.data;
  }

  async function fetchAllProducts() {
    const query = [
      'query listProducts($cursor: String) {',
      '  products(first: 100, after: $cursor) {',
      '    edges {',
      '      cursor',
      '      node {',
      '        id',
      '        title',
      '        handle',
      '        description',
      '        descriptionHtml',
      '        productType',
      '        vendor',
      '        tags',
      '        featuredImage { url altText }',
      '        images(first: 20) { edges { node { id url altText } } }',
      '        variants(first: 50) { edges { node {',
      '          id',
      '          title',
      '          availableForSale',
      '          selectedOptions { name value }',
      '          price { amount currencyCode }',
      '          compareAtPrice { amount currencyCode }',
      '        } } }',
      '        metafield(namespace: "custom", key: "quote") { value }',
      '      }',
      '    }',
      '    pageInfo { hasNextPage }',
      '  }',
      '}'
    ].join('
');

    var cursor = null;
    var more = true;
    var products = [];

    while (more) {
      const data = await graphql(query, { cursor: cursor });
      const edges = data.products.edges;
      edges.forEach(function (edge) {
        var product = edge.node;
        product.images = edge.node.images.edges.map(function (imgEdge) { return imgEdge.node; });
        product.variants = edge.node.variants.edges.map(function (varEdge) { return varEdge.node; });
        products.push(product);
        cursor = edge.cursor;
      });
      more = data.products.pageInfo.hasNextPage;
    }

    return products;
  }

  async function fetchProductByHandle(handle) {
    const query = [
      'query productByHandle($handle: String!) {',
      '  product(handle: $handle) {',
      '    id',
      '    title',
      '    handle',
      '    description',
      '    descriptionHtml',
      '    vendor',
      '    productType',
      '    tags',
      '    images(first: 30) { edges { node { id url altText } } }',
      '    variants(first: 50) { edges { node {',
      '      id',
      '      title',
      '      availableForSale',
      '      selectedOptions { name value }',
      '      price { amount currencyCode }',
      '      compareAtPrice { amount currencyCode }',
      '    } } }',
      '    metafield(namespace: "custom", key: "quote") { value }',
      '  }',
      '}'
    ].join('
');

    const data = await graphql(query, { handle: handle });
    const product = data.product;
    if (!product) {
      return null;
    }
    product.images = product.images.edges.map(function (edge) { return edge.node; });
    product.variants = product.variants.edges.map(function (edge) { return edge.node; });
    return product;
  }

  function getStoredCartId() {
    try {
      return localStorage.getItem(CART_STORAGE_KEY);
    } catch (err) {
      console.warn('Unable to read cart ID from storage', err);
      return null;
    }
  }

  function storeCartId(id) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, id);
    } catch (err) {
      console.warn('Unable to persist cart ID', err);
    }
  }

  async function retrieveCart(cartId) {
    const query = [
      'query getCart($id: ID!) {',
      '  cart(id: $id) {',
      '    id',
      '    checkoutUrl',
      '    cost {',
      '      subtotalAmount { amount currencyCode }',
      '      totalAmount { amount currencyCode }',
      '    }',
      '    lines(first: 100) { edges { node {',
      '      id',
      '      quantity',
      '      cost {',
      '        amountPerQuantity { amount currencyCode }',
      '        totalAmount { amount currencyCode }',
      '      }',
      '      merchandise { ... on ProductVariant {',
      '        id',
      '        title',
      '        product { handle title }',
      '        image { url altText }',
      '        price { amount currencyCode }',
      '        selectedOptions { name value }',
      '      } }',
      '    } } }',
      '  }',
      '}'
    ].join('
');
    const data = await graphql(query, { id: cartId });
    return data.cart;
  }

  async function ensureCart() {
    const existing = getStoredCartId();
    if (existing) {
      try {
        const cart = await retrieveCart(existing);
        if (cart) {
          return cart;
        }
      } catch (err) {
        console.warn('Stored cart invalid, creating a new cart', err);
      }
    }

    const mutation = [
      'mutation createCart {',
      '  cartCreate(input: {}) {',
      '    cart {',
      '      id',
      '      checkoutUrl',
      '      cost { subtotalAmount { amount currencyCode } }',
      '      lines(first: 1) { edges { node { id } } }',
      '    }',
      '    userErrors { field message }',
      '  }',
      '}'
    ].join('
');
    const data = await graphql(mutation, {});
    const result = data.cartCreate;
    if (result.userErrors && result.userErrors.length) {
      throw new Error(result.userErrors.map(function (e) { return e.message; }).join(', '));
    }
    const cart = result.cart;
    storeCartId(cart.id);
    return cart;
  }

  async function addLines(variantId, quantity) {
    if (quantity === undefined) quantity = 1;
    const cart = await ensureCart();
    const mutation = [
      'mutation addToCart($cartId: ID!, $lines: [CartLineInput!]!) {',
      '  cartLinesAdd(cartId: $cartId, lines: $lines) {',
      '    cart {',
      '      id',
      '      checkoutUrl',
      '      cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }',
      '      lines(first: 100) { edges { node {',
      '        id',
      '        quantity',
      '        cost {',
      '          amountPerQuantity { amount currencyCode }',
      '          totalAmount { amount currencyCode }',
      '        }',
      '        merchandise { ... on ProductVariant {',
      '          id',
      '          title',
      '          product { handle title }',
      '          image { url altText }',
      '          price { amount currencyCode }',
      '          selectedOptions { name value }',
      '        } }',
      '      } } }',
      '    }',
      '    userErrors { field message }',
      '  }',
      '}'
    ].join('
');
    const data = await graphql(mutation, {
      cartId: cart.id,
      lines: [{ merchandiseId: variantId, quantity: quantity }]
    });
    const result = data.cartLinesAdd;
    if (result.userErrors && result.userErrors.length) {
      throw new Error(result.userErrors.map(function (e) { return e.message; }).join(', '));
    }
    return result.cart;
  }

  async function updateLine(lineId, quantity) {
    if (quantity <= 0) {
      return removeLines([lineId]);
    }
    const cartId = getStoredCartId();
    if (!cartId) {
      throw new Error('No cart to update.');
    }
    const mutation = [
      'mutation updateLine($cartId: ID!, $lines: [CartLineUpdateInput!]!) {',
      '  cartLinesUpdate(cartId: $cartId, lines: $lines) {',
      '    cart {',
      '      id',
      '      checkoutUrl',
      '      cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }',
      '      lines(first: 100) { edges { node {',
      '        id',
      '        quantity',
      '        cost {',
      '          amountPerQuantity { amount currencyCode }',
      '          totalAmount { amount currencyCode }',
      '        }',
      '        merchandise { ... on ProductVariant {',
      '          id',
      '          title',
      '          product { handle title }',
      '          image { url altText }',
      '          price { amount currencyCode }',
      '          selectedOptions { name value }',
      '        } }',
      '      } } }',
      '    }',
      '    userErrors { field message }',
      '  }',
      '}'
    ].join('
');
    const data = await graphql(mutation, {
      cartId: cartId,
      lines: [{ id: lineId, quantity: quantity }]
    });
    const result = data.cartLinesUpdate;
    if (result.userErrors && result.userErrors.length) {
      throw new Error(result.userErrors.map(function (e) { return e.message; }).join(', '));
    }
    return result.cart;
  }

  async function removeLines(lineIds) {
    const cartId = getStoredCartId();
    if (!cartId) {
      throw new Error('No cart to update.');
    }
    const mutation = [
      'mutation removeLines($cartId: ID!, $lineIds: [ID!]!) {',
      '  cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {',
      '    cart {',
      '      id',
      '      checkoutUrl',
      '      cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }',
      '      lines(first: 100) { edges { node {',
      '        id',
      '        quantity',
      '        cost {',
      '          amountPerQuantity { amount currencyCode }',
      '          totalAmount { amount currencyCode }',
      '        }',
      '        merchandise { ... on ProductVariant {',
      '          id',
      '          title',
      '          product { handle title }',
      '          image { url altText }',
      '          price { amount currencyCode }',
      '          selectedOptions { name value }',
      '        } }',
      '      } } }',
      '    }',
      '    userErrors { field message }',
      '  }',
      '}'
    ].join('
');
    const data = await graphql(mutation, { cartId: cartId, lineIds: lineIds });
    const result = data.cartLinesRemove;
    if (result.userErrors && result.userErrors.length) {
      throw new Error(result.userErrors.map(function (e) { return e.message; }).join(', '));
    }
    return result.cart;
  }

  function formatMoney(amount, currency) {
    if (currency === undefined) currency = 'USD';
    const value = Number(amount);
    if (Number.isNaN(value)) {
      return amount;
    }
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency }).format(value);
    } catch (err) {
      return currency + ' ' + value.toFixed(2);
    }
  }

  window.ArcShopify = {
    config: config,
    graphql: graphql,
    fetchAllProducts: fetchAllProducts,
    fetchProductByHandle: fetchProductByHandle,
    ensureCart: ensureCart,
    retrieveCart: retrieveCart,
    addLines: addLines,
    updateLine: updateLine,
    removeLines: removeLines,
    formatMoney: formatMoney
  };
})();
