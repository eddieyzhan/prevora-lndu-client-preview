// Browser-safe Storefront API client. No Admin API credentials or customer details.
(() => {
  'use strict';
  const variantFields = `id title sku availableForSale price { amount currencyCode }
    selectedOptions { name value } image { url altText }`;
  const productFields = `id handle title description vendor productType tags
    images(first: 20) { nodes { url altText } }
    variants(first: 100) { nodes { ${variantFields} } pageInfo { hasNextPage endCursor } }`;
  const cartFields = `id checkoutUrl totalQuantity attributes { key value }
    cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
    lines(first: 100) { nodes { id quantity cost { totalAmount { amount currencyCode } }
      merchandise { ... on ProductVariant { ${variantFields} product { id handle title vendor } } }
    } pageInfo { hasNextPage } }`;
  const payload = `cart { ${cartFields} } userErrors { field message code } warnings { code message }`;
  const brands = ['lndu', 'aviio', 'azdome'];
  class ShopifyClient {
    constructor(config, { fetch: fetcher = globalThis.fetch, storage = globalThis.localStorage } = {}) {
      if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(config.storeDomain || '')) throw new Error('Set the new Shopify store domain before connecting.');
      if (!config.publicToken || /^(shpat_|shpca_|shpss_)/.test(config.publicToken)) throw new Error('Use a public Storefront access token, never an Admin API or private token.');
      if (!/^20\d{2}-(01|04|07|10)$/.test(config.apiVersion)) throw new Error('Set a supported Shopify API version.');
      if (config.country !== 'AU' || config.currency !== 'AUD') throw new Error('This storefront requires the Australian market and AUD.');
      for (const brand of brands) if (!/^[a-z0-9-]+$/.test(config.collections?.[brand] || '')) throw new Error(`Set the ${brand} launch collection handle.`);
      if (new Set(Object.values(config.collections)).size !== 3) throw new Error('Each brand needs a separate launch collection.');
      this.config = config; this.fetcher = fetcher; this.storage = storage;
      this.products = []; this.cart = null; this.brand = null; this.warnings = [];
    }
    async request(query, variables = {}) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await this.fetcher(`https://${this.config.storeDomain}/api/${this.config.apiVersion}/graphql.json`, {
          method: 'POST', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': this.config.publicToken },
          body: JSON.stringify({ query, variables })
        });
        if (!response.ok) throw new Error(`Shopify is unavailable (${response.status}). Please try again.`);
        const body = await response.json();
        if (body.errors?.length) throw new Error(body.errors.map(e => e.message).join(' '));
        if (!body.data) throw new Error('Shopify returned an incomplete response.');
        return body.data;
      } catch (error) {
        if (error.name === 'AbortError') throw new Error('Shopify took too long to respond. Please refresh your bag before trying again.');
        throw error;
      } finally { clearTimeout(timeout); }
    }
    async loadCatalog() {
      const products = [];
      for (const brand of brands) {
        let after = null;
        do {
          const data = await this.request(`query Catalog($handle: String!, $after: String) @inContext(country: AU) {
            collection(handle: $handle) { products(first: 50, after: $after) {
              nodes { ${productFields} } pageInfo { hasNextPage endCursor }
            } }
          }`, { handle: this.config.collections[brand], after });
          if (!data.collection) throw new Error(`The ${brand.toUpperCase()} launch collection is missing or unpublished.`);
          const connection = data.collection.products;
          for (const product of connection.nodes) {
            if (product.vendor.toLowerCase() !== brand) throw new Error(`Product ${product.handle} has the wrong vendor in the ${brand} collection.`);
            while (product.variants.pageInfo.hasNextPage) {
              const more = await this.request(`query Variants($id: ID!, $after: String) @inContext(country: AU) {
                product(id: $id) { variants(first: 100, after: $after) { nodes { ${variantFields} } pageInfo { hasNextPage endCursor } } }
              }`, { id: product.id, after: product.variants.pageInfo.endCursor });
              product.variants.nodes.push(...more.product.variants.nodes);
              product.variants.pageInfo = more.product.variants.pageInfo;
            }
            if (product.variants.nodes.some(v => v.price.currencyCode !== 'AUD')) throw new Error('Shopify returned a currency other than AUD. Check the Australian market.');
            products.push({ ...product, brand, variants: product.variants.nodes, images: product.images.nodes });
          }
          after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
          if (connection.pageInfo.hasNextPage && !after) throw new Error('Shopify returned an incomplete catalogue page.');
        } while (after);
      }
      this.products = products;
      return products;
    }
    key() { return `prevora-shopify-cart:${this.config.storeDomain}:${this.brand}`; }
    remember(id) { try { if (id) this.storage?.setItem(this.key(), id); else this.storage?.removeItem(this.key()); } catch {} }
    acceptCart(cart) {
      if (!cart) { this.cart = null; this.remember(null); return null; }
      if (cart.lines.pageInfo.hasNextPage) throw new Error('This bag is too large to display. Please contact PREVORA.');
      if (!cart.attributes.some(a => a.key === 'prevora_brand' && a.value === this.brand)) throw new Error('This bag belongs to a different brand.');
      const allowed = new Set(this.products.filter(p => p.brand === this.brand).flatMap(p => p.variants.map(v => v.id)));
      if (cart.lines.nodes.some(line => !allowed.has(line.merchandise.id))) throw new Error('Your bag contains a product outside the current launch range. Clear the bag and choose again.');
      if (cart.cost.totalAmount.currencyCode !== 'AUD') throw new Error('Your bag is not priced in AUD.');
      this.cart = cart; this.remember(cart.id); return cart;
    }
    async useBrand(brand) {
      if (brand !== null && !brands.includes(brand)) throw new Error('Unknown brand.');
      this.brand = brand; this.cart = null; this.warnings = [];
      if (!brand) return null;
      let id; try { id = this.storage?.getItem(this.key()); } catch {}
      if (id) return this.refreshCart(id);
      return null;
    }
    async refreshCart(id = this.cart?.id) {
      if (!id) return null;
      const data = await this.request(`query Cart($id: ID!) @inContext(country: AU) { cart(id: $id) { ${cartFields} } }`, { id });
      return this.acceptCart(data.cart);
    }
    async mutate(query, variables, name) {
      const result = (await this.request(query, variables))[name];
      if (result.userErrors?.length) throw new Error(result.userErrors.map(e => e.message).join(' '));
      if (!result.cart) throw new Error('Shopify did not return your updated bag. Refresh before trying again.');
      this.warnings = (result.warnings || []).map(w => w.message);
      return this.acceptCart(result.cart);
    }
    async add(variantId, quantity) {
      const selected = this.products.filter(p => p.brand === this.brand).flatMap(p => p.variants).find(v => v.id === variantId);
      if (!selected?.availableForSale) throw new Error('Choose an available option from this brand.');
      this.quantity(quantity);
      const existing = this.cart?.lines.nodes.find(l => l.merchandise.id === variantId);
      if (existing) return this.update(existing.id, existing.quantity + quantity);
      if ((this.cart?.lines.nodes.length || 0) >= 99) throw new Error('Please request a quote for a larger order.');
      const lines = [{ merchandiseId: variantId, quantity }];
      if (!this.cart) return this.mutate(`mutation Create($input: CartInput!) @inContext(country: AU) { cartCreate(input: $input) { ${payload} } }`, {
        input: { lines, buyerIdentity: { countryCode: 'AU' }, attributes: [{ key: 'prevora_brand', value: this.brand }, { key: 'prevora_source', value: 'web' }] }
      }, 'cartCreate');
      return this.mutate(`mutation Add($id: ID!, $lines: [CartLineInput!]!) @inContext(country: AU) { cartLinesAdd(cartId: $id, lines: $lines) { ${payload} } }`, { id: this.cart.id, lines }, 'cartLinesAdd');
    }
    quantity(value) { if (!Number.isInteger(value) || value < 1 || value > 99) throw new Error('Choose a quantity from 1 to 99, or request a bulk quote.'); }
    async update(lineId, quantity) {
      if (!this.cart?.lines.nodes.some(l => l.id === lineId)) throw new Error('This item is no longer in your bag.');
      if (quantity === 0) return this.mutate(`mutation Remove($id: ID!, $lines: [ID!]!) @inContext(country: AU) { cartLinesRemove(cartId: $id, lineIds: $lines) { ${payload} } }`, { id: this.cart.id, lines: [lineId] }, 'cartLinesRemove');
      this.quantity(quantity);
      return this.mutate(`mutation Update($id: ID!, $lines: [CartLineUpdateInput!]!) @inContext(country: AU) { cartLinesUpdate(cartId: $id, lines: $lines) { ${payload} } }`, { id: this.cart.id, lines: [{ id: lineId, quantity }] }, 'cartLinesUpdate');
    }
    clear() { this.remember(null); this.cart = null; this.warnings = []; }
    async checkoutUrl() {
      await this.refreshCart();
      if (!this.cart?.totalQuantity) throw new Error('Your bag is empty or has expired.');
      if (this.cart.lines.nodes.some(l => !l.merchandise.availableForSale)) throw new Error('An item is no longer available. Please remove it before checkout.');
      const url = new URL(this.cart.checkoutUrl);
      const hosts = [this.config.storeDomain, 'checkout.shopify.com', ...(this.config.checkoutDomains || [])];
      if (url.protocol !== 'https:' || url.username || url.password || !hosts.includes(url.hostname)) throw new Error('The Shopify checkout domain needs to be confirmed before checkout.');
      return url.href;
    }
  }
  globalThis.PrevoraShopify = ShopifyClient;
})();
