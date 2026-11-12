// The connected storefront uses Shopify prices, variants, availability and hosted checkout.
// The existing demonstration remains separate and cannot become a fallback after an API failure.
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const money = value => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(value));
  const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? esc(url.href) : ''; } catch { return ''; } };
  const brands = [
    { id: 'lndu', name: 'LNDU', logo: 'lndu-logo.svg', image: 'lndu-lndu-home-source-2.jpg', copy: 'Smart entry and connected living.' },
    { id: 'aviio', name: 'Aviio', logo: 'aviio-logo-green.png', image: 'aviio-feeder-lifestyle.jpg', copy: 'A closer connection to the birds around you.' },
    { id: 'azdome', name: 'AZDOME', logo: 'azdome-logo.png', image: 'azdome-home-m660-max.jpg', copy: 'A clearer view of the road ahead.' }
  ];
  async function mount(app, config) {
    let client, brand = null, page = '', slug = '', message = '', busy = false, pendingRoute = false, catalogReady = false;
    let search = '', sort = 'featured', category = '', chosenVariant = '';
    const assets = window.PREVORA_ASSET_BASE || './assets/';
    const root = window.PREVORA_ROOT || './';
    const themed = Boolean(window.PREVORA_THEME_MODE);
    const href = path => themed && brand ? `#/store/${brand.id}/${path}` : `#/${path}`;
    const brandHref = id => themed ? `#/store/${id}/` : `${root}${id}/index.html`;
    const corporateHref = themed ? '#/' : root + 'index.html';
    const products = () => (client?.products || []).filter(p => !brand || p.brand === brand.id);
    const firstVariant = p => p.variants.find(v => v.availableForSale) || p.variants[0];
    const imageTag = (im, title, lazy = true) => {
      const dimensions = Number.isInteger(im.width) && Number.isInteger(im.height) && im.width > 0 && im.height > 0 ? ` width="${im.width}" height="${im.height}"` : '';
      return `<img src="${safeUrl(im.url)}" alt="${esc(im.altText?.trim() || title)}"${dimensions} ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'}>`;
    };
    const picture = p => p.images?.[0] ? imageTag(p.images[0], p.title) : '<span class="image-pending">Product image to follow</span>';
    const productHref = p => brand ? href('product/' + p.handle) : `${brandHref(p.brand)}${themed ? 'product/' : '#/product/'}${p.handle}`;
    function header() {
      return `<a class="skip-link" href="#main-content">Skip to content</a><div class="preview-bar">Connected store test - launch review pending</div><header class="site-header"><div class="container header-inner"><a class="${brand ? 'store-home-link' : 'wordmark'}" href="${href('')}">${brand ? `<img class="store-logo" src="${assets + brand.logo}" alt="${brand.name}">` : 'prevora.'}</a><nav class="live-nav" aria-label="Main navigation"><a href="${href('shop')}">Products</a><a href="${href('business')}">Request a quote</a><a href="${href('support')}">Support</a>${brand ? `<a href="${href('cart')}">Bag (${client?.cart?.totalQuantity || 0})</a><a href="${corporateHref}">PREVORA</a>` : ''}</nav></div></header>`;
    }
    function footer() {
      return `<footer class="footer"><div class="container footer-bottom"><p>PREVORA / ${brand?.name || 'LNDU, Aviio and AZDOME'} / Australia</p><nav class="live-nav" aria-label="Footer navigation"><a href="${href('business')}">Business enquiries</a><a href="${href('shipping')}">Shipping and returns</a><a href="${href('privacy')}">Privacy</a><a href="${href('terms')}">Terms</a></nav></div></footer>`;
    }
    function cards(list) {
      return list.map(p => { const v = firstVariant(p); return `<article class="product-card"><a class="product-media" href="${productHref(p)}">${picture(p)}</a><p class="product-brand">${esc(p.vendor)}</p><h3><a href="${productHref(p)}">${esc(p.title)}</a></h3><p>${v ? money(v.price.amount) + ' AUD' : 'Options unavailable'}${p.variants.length > 1 ? ' / Choose an option' : ''}</p><a class="text-link" href="${productHref(p)}">${p.variants.some(v => v.availableForSale) ? 'View product' : 'View unavailable product'}</a></article>`; }).join('');
    }
    function home() {
      if (!brand) return `<section class="hero"><img class="hero-photo" src="${assets}lndu-lndu-home-source-1.jpg" alt="Smart entry at home"><div class="container"><div class="hero-content"><h1>Everyday,<br>a little smarter.</h1><p>Meet PREVORA's brands for connected homes, outdoor spaces and the road ahead.</p><a class="button" href="${href('business')}">Talk about your project</a></div></div></section><section class="section container"><h2>Explore our brands.</h2><div class="brand-grid">${brands.map(b => `<a class="brand-card" href="${brandHref(b.id)}"><div class="brand-card-media"><img src="${assets + b.image}" alt="${b.name}"></div><div class="brand-card-caption"><div><h3>${b.name}</h3><p>${b.copy}</p></div></div></a>`).join('')}</div></section>`;
      return `<section class="live-brand-hero"><img src="${assets + brand.image}" alt="${brand.name} brand image"><div class="container"><h1>${brand.name} Australia.</h1><p>${brand.copy}</p><a class="button" href="${href('shop')}">Explore the range</a></div></section><section class="section container"><h2>Find your fit.</h2>${products().length ? `<div class="product-grid">${cards(products().slice(0, 8))}</div>` : '<p>The Australian range is coming soon.</p>'}</section>`;
    }
    function shop() {
      let list = products().filter(p => (!category || p.productType === category) && [p.title, p.description, p.vendor, ...p.variants.map(v => v.sku)].join(' ').toLowerCase().includes(search.toLowerCase()));
      if (sort !== 'featured') list.sort((a, b) => (Number(firstVariant(a)?.price.amount || 0) - Number(firstVariant(b)?.price.amount || 0)) * (sort === 'low' ? 1 : -1));
      return `<section class="container section"><div class="page-head"><h1>${brand?.name || 'Our'} products.</h1></div><form id="live-filter" class="field-grid live-filters"><label class="field">Search<input name="search" value="${esc(search)}" placeholder="Model, product or SKU"></label><label class="field">Category<select name="category"><option value="">All categories</option>${[...new Set(products().map(p => p.productType).filter(Boolean))].map(c => `<option ${c === category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label><label class="field">Sort<select name="sort"><option value="featured">Featured</option><option value="low" ${sort === 'low' ? 'selected' : ''}>Price: low to high</option><option value="high" ${sort === 'high' ? 'selected' : ''}>Price: high to low</option></select></label><button class="button" type="submit">Apply</button></form><p>${list.length} products</p><div class="product-grid">${cards(list)}</div>${!list.length ? '<p>No products match. Try another search or request a quote.</p>' : ''}</section>`;
    }
    function detail() {
      const p = products().find(p => p.handle === slug);
      if (!p || !brand) return missing();
      const v = p.variants.find(v => v.id === chosenVariant) || firstVariant(p);
      chosenVariant = v?.id || '';
      const primary = p.images?.[0];
      const mediaWidth = Math.round(Math.min(520, Math.max(260, (primary?.width || 472) * Math.min(1, 400 / (primary?.height || 400)) + 48)));
      const mainImage = primary ? `<a class="gallery-main" href="${safeUrl(primary.url)}" target="_blank" rel="noopener" aria-label="Open ${esc(p.title)} image at full size">${imageTag(primary, p.title, false)}</a>` : '<div class="gallery-main"><span class="image-pending">Product image to follow</span></div>';
      return `<section class="container section"><a class="text-link" href="${href('shop')}">Back to products</a><div class="product-layout" style="--live-media-column:${mediaWidth}px"><div class="product-gallery">${mainImage}<div class="live-gallery">${p.images.slice(1).map((im, i) => `<a href="${safeUrl(im.url)}" target="_blank" rel="noopener" aria-label="Open ${esc(p.title)} image ${i + 2} at full size">${imageTag(im, p.title)}</a>`).join('')}</div>${primary ? '<p class="live-image-hint">Select an image to view it in full.</p>' : ''}</div><div class="product-details"><p class="product-brand">${esc(p.vendor)}</p><h1>${esc(p.title)}</h1><p class="product-price">${v ? money(v.price.amount) + ' AUD' : 'No options available'}</p><p class="live-description">${esc(p.description)}</p><form id="live-add"><label class="field">Option<select name="variant" id="live-variant">${p.variants.map(option => `<option value="${esc(option.id)}" ${option.id === v?.id ? 'selected' : ''}>${esc(option.title === 'Default Title' ? 'Standard' : option.title)}${option.availableForSale ? '' : ' - Unavailable'}</option>`).join('')}</select></label><p>${v?.sku ? 'SKU: ' + esc(v.sku) : ''}</p><label class="field">Quantity<input name="quantity" type="number" min="1" max="99" step="1" value="1" required></label><button class="button" type="submit" ${v?.availableForSale ? '' : 'disabled'}>${v?.availableForSale ? 'Add to bag' : 'Currently unavailable'}</button></form><button class="text-link quote-product-button" data-live-quote="${esc(p.id)}">Request a quote for this product</button></div></div></section>`;
    }
    function bag() {
      if (!brand) return `<section class="container section"><h1>Choose a brand to shop.</h1>${brands.map(b => `<p><a href="${brandHref(b.id)}">${b.name}</a></p>`).join('')}</section>`;
      const cart = client.cart;
      if (!cart?.totalQuantity) return `<section class="container empty-state"><h1>Your bag is empty.</h1><a class="button" href="${href('shop')}">Explore ${brand.name}</a></section>`;
      return `<section class="container section"><div class="page-head"><h1>Your ${brand.name} bag.</h1></div><div class="cart-layout"><div>${cart.lines.nodes.map(line => `<div class="live-cart-row"><div><h3>${esc(line.merchandise.product.title)}</h3><p>${esc(line.merchandise.title === 'Default Title' ? 'Standard' : line.merchandise.title)}</p><p>${money(line.cost.totalAmount.amount)} AUD</p></div><label class="field">Quantity<input aria-label="Quantity for ${esc(line.merchandise.product.title)}" type="number" min="1" max="99" step="1" value="${line.quantity}" data-live-line="${esc(line.id)}"></label><button class="text-link" data-live-remove="${esc(line.id)}">Remove</button></div>`).join('')}</div><aside class="cart-summary"><h2>Order summary</h2><div class="summary-line"><span>Subtotal</span><strong>${money(cart.cost.subtotalAmount.amount)} AUD</strong></div><p>Shipping, taxes and any discounts are confirmed at Shopify checkout.</p><button class="button" data-live-checkout>Continue to Shopify checkout</button><button class="text-link" data-live-refresh>Refresh bag</button><button class="text-link" data-live-clear>Clear bag</button></aside></div></section>`;
    }
    function support() {
      return `<section class="container section legal-content"><h1>How can we help?</h1><p>For product suitability, installation needs or a business order, prepare an enquiry with the models and quantities you need.</p><a class="button" href="${href('business')}">Prepare an enquiry</a>${config.enquiryEmail ? `<p>Contact: ${esc(config.enquiryEmail)}</p>` : '<p>The Australian contact channel is awaiting confirmation.</p>'}<h2>Orders and delivery</h2><p>Your order is placed through Shopify checkout. Refer to the approved store policies for delivery and returns.</p><a class="text-link" href="${href('shipping')}">Shipping and returns</a></section>`;
    }
    function policy() {
      const names = page === 'shipping' ? ['shipping', 'returns'] : [page];
      return `<section class="container section legal-content"><h1>${page === 'shipping' ? 'Shipping and returns' : page === 'privacy' ? 'Privacy' : 'Terms'}</h1>${names.map(name => safeUrl(config.policies?.[name]) ? `<p><a class="text-link" href="${safeUrl(config.policies[name])}">Read the ${name} policy</a></p>` : `<p>The approved ${name} policy has not been provided. This must be completed before launch.</p>`).join('')}</section>`;
    }
    function missing() { return `<section class="container empty-state"><h1>Page not found.</h1><a class="button" href="${href('')}">Back to ${brand?.name || 'PREVORA'}</a></section>`; }
    function render() {
      document.body.dataset.store = brand?.id || 'prevora'; document.body.dataset.page = page || 'home';
      let content;
      if (!catalogReady) content = '<section class="container empty-state"><h1>Connecting to the store.</h1><p>Prices and availability must load from Shopify before you can shop.</p></section>';
      else if (!page) content = home();
      else if (page === 'shop' || page === 'search') content = shop();
      else if (page === 'product') content = detail();
      else if (page === 'cart' || page === 'checkout') content = bag();
      else if (page === 'business' || page === 'contact') content = window.PrevoraQuote.render(products(), { email: config.enquiryEmail });
      else if (page === 'support' || page === 'about') content = support();
      else if (['shipping', 'privacy', 'terms'].includes(page)) content = policy();
      else content = missing();
      app.innerHTML = header() + `<main id="main-content" tabindex="-1"><div id="live-message" class="container" role="status" tabindex="-1">${message ? `<div class="demo-callout">${esc(message)} <button class="text-link" data-live-refresh>Retry / refresh</button><button class="text-link" data-live-clear>Clear bag</button></div>` : ''}</div>${content}</main>` + footer();
      document.title = `${brand?.name || 'PREVORA'} Australia - ${page || 'Home'}`;
    }
    function notice(text) {
      message = text;
      const el = document.getElementById('live-message');
      if (el) { el.innerHTML = `<div class="demo-callout">${esc(text)} <button class="text-link" data-live-refresh>Retry / refresh</button></div>`; el.focus(); }
    }
    async function action(work) {
      if (busy) return;
      busy = true; app.setAttribute('aria-busy', 'true');
      app.querySelectorAll('button,input[data-live-line],#live-variant').forEach(control => { control.dataset.wasDisabled = String(control.disabled); control.disabled = true; });
      try { await work(); }
      catch (error) {
        message = error.message || 'Unable to connect. Please try again.';
        if (catalogReady) render();
        notice(message);
      }
      finally {
        busy = false; app.removeAttribute('aria-busy');
        app.querySelectorAll('[data-was-disabled]').forEach(control => { control.disabled = control.dataset.wasDisabled === 'true'; delete control.dataset.wasDisabled; });
        if (pendingRoute) { pendingRoute = false; await navigate(); }
      }
    }
    async function navigate() {
      if (busy) { pendingRoute = true; return; }
      const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
      let id = window.PREVORA_BRAND || null;
      if (parts[0] === 'store') { parts.shift(); id = parts.shift(); }
      const next = brands.find(b => b.id === id) || null;
      [page = '', slug = ''] = parts; chosenVariant = ''; message = '';
      await action(async () => {
        if (next?.id !== brand?.id || !catalogReady) { brand = next; search = ''; category = ''; sort = 'featured'; await client.useBrand(brand?.id || null); }
        render(); window.scrollTo(0, 0); document.getElementById('main-content')?.focus({ preventScroll: true });
      });
    }
    app.addEventListener('submit', event => {
      if (event.target.id === 'live-filter') { event.preventDefault(); const fields = new FormData(event.target); search = fields.get('search'); category = fields.get('category'); sort = fields.get('sort'); render(); }
      if (event.target.id === 'live-add') { event.preventDefault(); const fields = new FormData(event.target); action(async () => { await client.add(fields.get('variant'), Number(fields.get('quantity'))); message = client.warnings.join(' ') || 'Added to your bag.'; render(); }); }
    });
    app.addEventListener('change', event => {
      if (event.target.id === 'live-variant') { chosenVariant = event.target.value; render(); document.getElementById('live-variant')?.focus(); }
      if (event.target.hasAttribute('data-live-line')) { const line = event.target.dataset.liveLine; const qty = Number(event.target.value); action(async () => { await client.update(line, qty); message = client.warnings.join(' '); render(); app.querySelector(`[data-live-line="${CSS.escape(line)}"]`)?.focus(); }); }
    });
    app.addEventListener('click', event => {
      const el = event.target.closest('button'); if (!el) return;
      if (el.hasAttribute('data-live-quote')) { window.PrevoraQuote.add(el.dataset.liveQuote); location.hash = href('business'); }
      if (el.hasAttribute('data-live-remove')) action(async () => { await client.update(el.dataset.liveRemove, 0); message = client.warnings.join(' '); render(); });
      if (el.hasAttribute('data-live-clear')) { client?.clear(); message = ''; render(); }
      if (el.hasAttribute('data-live-refresh')) action(async () => { if (!client) client = new window.PrevoraShopify(config); if (!catalogReady) { await client.loadCatalog(); catalogReady = true; pendingRoute = true; } else await client.refreshCart(); message = ''; render(); });
      if (el.hasAttribute('data-live-checkout')) action(async () => { const url = await client.checkoutUrl(); location.assign(url); });
    });
    window.addEventListener('hashchange', navigate);
    render();
    try { client = new window.PrevoraShopify(config); await client.loadCatalog(); catalogReady = true; await navigate(); }
    catch (error) { message = error.message; render(); }
  }
  globalThis.PrevoraLive = { mount };
})();
