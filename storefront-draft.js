// Shared by the static page builder and the browser. No prices or stock are inferred.
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const brands = [
    {id:'lndu', name:'LNDU', image:'lndu-lndu-home-source-2.jpg', copy:'Smart entry for homes and businesses.', headline:'A smarter welcome home.'},
    {id:'aviio', name:'Aviio', image:'aviio-feeder-lifestyle.jpg', copy:'A closer look at your garden visitors.', headline:'Meet your garden visitors.'},
    {id:'azdome', name:'AZDOME', image:'azdome-home-m660-max.jpg', copy:'A clearer view of the road ahead.', headline:'Every journey in focus.'}
  ];
  const categories = {locks:'Smart locks', doorbells:'Video doorbells', dashcams:'Dash cameras', outdoor:'Bird cameras', accessories:'Accessories'};
  const sharedImageDimensions = {'lndu-lndu-home-source-1.jpg':{width:4001,height:1618},'lndu-lndu-home-source-2.jpg':{width:4001,height:1618},'azdome-home-m660-max.jpg':{width:2880,height:1000},'azdome-m660-max-product.png':{width:1000,height:1000},'aviio-feeder-lifestyle.jpg':{width:1910,height:1075}};
  // The supplied M660 MAX workbook image is a sensor badge, not a product photo.
  // Keep that source intact and lead with the existing official manufacturer photo.
  const productImages = p => p.id === 'azdome-m660-max' ? ['azdome-m660-max-product.png', ...p.images] : p.images;
  const imageAlt = (p, file) => file === 'azdome-m660-max-au-1.png' ? 'Sony STARVIS 2 sensor badge' : p.name;
  function view(catalog, state = {}) {
    const root = state.root || './';
    const imageRoot = state.assetBase || root + 'assets/';
    const brand = brands.find(b => b.id === state.brand);
    const link = path => state.themed ? '#/' + path.replace(/\/$/, '').replace(/^([a-z]+)\/products\//, 'store/$1/product/').replace(/^([a-z]+)\/enquiry$/, 'store/$1/business').replace(/^enquiry$/, 'business').replace(/^products$/, 'shop').replace(/^(lndu|aviio|azdome)$/, 'store/$1/') : root + path + 'index.html';
    const productLink = p => link(`${p.brand.toLowerCase()}/products/${p.slug}/`);
    const list = catalog.products.filter(p => !brand || p.brand.toLowerCase() === brand.id);
    const quoteLink = link(brand ? `${brand.id}/enquiry/` : 'enquiry/');
    const photo = (p, lazy = true) => `<img src="${esc(imageRoot + productImages(p)[0])}" alt="${esc(p.name)}" ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'}>`;
    const card = p => `<article class="draft-card" data-category="${p.category}" data-search="${esc((p.name + ' ' + p.features.join(' ')).toLowerCase())}"><a class="draft-product-image" href="${productLink(p)}">${photo(p)}</a><p class="draft-label">${esc(p.brand)} / ${categories[p.category]}</p><h3><a href="${productLink(p)}">${esc(p.model)}</a></h3><p>${esc(p.features[0] || 'Specifications to follow.')}</p><span class="draft-price">Price to confirm</span><a class="text-link" href="${productLink(p)}">View details</a></article>`;
    const grid = products => `<div class="draft-grid">${products.map(card).join('')}</div>`;
    const header = `<a class="skip-link" href="#main-content">Skip to content</a><div class="draft-notice">Australian range review. Prices and stock to confirm. No live orders.</div><header class="draft-header"><div class="container"><a class="draft-wordmark" href="${link(brand ? brand.id + '/' : '')}">${brand ? brand.name : 'prevora.'}</a><nav aria-label="Main navigation"><a href="${link(brand ? brand.id + '/' : 'products/')}">Products</a><a href="${quoteLink}">Request a quote</a><a href="${link('contact/')}">Contact</a>${brand ? `<a href="${link('')}">PREVORA</a>` : ''}</nav></div></header>`;
    const footer = `<footer class="draft-footer"><div class="container"><div><strong>PREVORA</strong><p>LNDU, Aviio and AZDOME for Australia.</p></div><nav aria-label="Footer navigation"><a href="${link('contact/')}">Contact</a><a href="${link('shipping/')}">Shipping and returns</a><a href="${link('privacy/')}">Privacy</a><a href="${link('terms/')}">Preview terms</a></nav><p class="draft-fine">Supplied product information for review. The final launch range and Australian supply terms need approval.</p></div></footer>`;
    let body, title = 'PREVORA Australia - Product range review', description = 'Explore the supplied Australian range from LNDU, Aviio and AZDOME and prepare a quote request.';
    if (state.page === 'product') {
      const p = list.find(p => p.slug === state.slug);
      if (!p) body = '<section class="container draft-section"><h1>Product not found.</h1><p>This older reference is not in the supplied Australian catalogue.</p><a href="' + link('products/') + '">Browse the draft range</a></section>';
      else {
        title = p.name + ' - Australian product draft'; description = p.name + '. ' + p.description + ' Australian price and availability to confirm.';
        const images = productImages(p);
        const size = p.imageDimensions?.[images[0]] || sharedImageDimensions[images[0]];
        const sourceWidth = Number(size?.width) || 472;
        const sourceHeight = Number(size?.height) || 400;
        const mediaWidth = Math.round(Math.min(520, Math.max(260, sourceWidth * Math.min(1, 400 / sourceHeight) + 48)));
        body = `<section class="container draft-section"><a class="text-link" href="${link(p.brand.toLowerCase() + '/')}">Back to ${esc(p.brand)}</a><div class="draft-detail" style="--media-column:${mediaWidth}px"><div class="draft-media"><a class="draft-detail-image" href="${esc(imageRoot + images[0])}" target="_blank" rel="noopener" aria-label="Open ${esc(p.name)} image at full size">${photo(p, false)}</a>${images.length > 1 ? `<div class="draft-gallery" aria-label="More product images">${images.slice(1).map((im,i) => `<a href="${esc(imageRoot + im)}" target="_blank" rel="noopener" aria-label="Open ${esc(imageAlt(p, im))} image ${i + 2} at full size"><img src="${esc(imageRoot + im)}" alt="${esc(imageAlt(p, im))}" loading="lazy"></a>`).join('')}</div>` : ''}<p class="draft-image-hint">${p.id === 'azdome-m660-max' ? 'Manufacturer model photo. Australian bundle to confirm. ' : ''}Select an image to view it in full.</p></div><div class="draft-product-copy"><p class="draft-label">${esc(p.brand)} / ${categories[p.category]}</p><h1>${esc(p.model)}</h1><p class="draft-price">Price and stock to confirm</p><p class="draft-intro">${esc(p.description)}</p><form data-draft-quote="${p.id}" action="${quoteLink}"><label class="field">Quantity for your enquiry<input name="quantity" type="number" value="1" min="1" max="100000" step="1" required></label><button type="submit" class="button">Request a quote</button></form><p class="draft-fine">Prepare an enquiry. Nothing is ordered or sent automatically.</p><div class="draft-callout">${esc(p.reviewNotes.filter(n => !n.startsWith('Brand assignment')).join(' '))}</div></div></div><div class="draft-specs"><h2>Supplied specifications</h2>${p.features.length ? `<ul>${p.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : '<p>Specifications have not been supplied for this model.</p>'}<p class="draft-fine">Source: PREVORA Australian product workbook, October 2026. Sheet ${esc(p.source.sheet)}, row ${p.source.row}. Local compatibility and bundle contents still need confirmation.</p></div></section>`;
      }
    } else if (state.page === 'enquiry') {
      title = 'Request a quote - PREVORA';
      body = `<section class="container draft-section"><h1>Tell us what you need.</h1><p>Prepare a product and quantity enquiry for PREVORA.</p><div id="draft-quote-mount"><p>Enable JavaScript to build a multi-product enquiry, or email <a href="mailto:${esc(catalog.company.email)}">${esc(catalog.company.email)}</a> with your model names and quantities.</p></div></section>`;
    } else if (state.page === 'contact') {
      title = 'Contact PREVORA';
      body = `<section class="container draft-section draft-text"><p class="draft-label">General enquiries</p><h1>Let's talk about your project.</h1><p>Ask about a model, installation needs or a larger order.</p><a class="button" href="${quoteLink}">Prepare a quote enquiry</a><h2>${esc(catalog.company.name)}</h2><p><a href="mailto:${esc(catalog.company.email)}">${esc(catalog.company.email)}</a></p><p>${esc(catalog.company.address)}</p><p class="draft-fine">Contact details supplied by PREVORA. Please arrange any visit first. This is not a confirmed pickup or returns address.</p></section>`;
    } else if (['shipping','privacy','terms'].includes(state.page)) {
      const policies = {
        shipping:['Shipping and returns', 'Delivery regions, rates, dispatch times, returns and warranty arrangements need approval before the store opens. This preview does not accept orders or offer confirmed delivery dates. Contact PREVORA for product and supply questions.'],
        privacy:['Privacy in this preview', 'Product browsing does not create an account. Enquiry details stay in page memory until you download them or open your email app. They are not stored in browser storage or sent automatically. A live store privacy policy must cover the business, checkout and selected service providers before launch.'],
        terms:['Preview terms', 'This is a review of the supplied Australian product range. It does not offer products for sale or establish a supply contract. Prices, stock, launch selection, variants, warranty and delivery terms are awaiting confirmation. The final business terms must be approved before launch.']
      };
      title = policies[state.page][0] + ' - PREVORA';
      body = `<section class="container draft-section draft-text"><p class="draft-label">Review copy</p><h1>${policies[state.page][0]}</h1><p>${policies[state.page][1]}</p><a class="text-link" href="${link('contact/')}">Contact PREVORA</a></section>`;
    } else if (!brand && state.page !== 'products') {
      body = `<section class="draft-hero"><img src="${esc(imageRoot + 'lndu-lndu-home-source-1.jpg')}" alt="Smart entry for an Australian home" fetchpriority="high"><div class="container"><p class="draft-label">PREVORA / Australia</p><h1>Everyday,<br>a little smarter.</h1><p>Connected products for your home,<br>your garden and the road ahead.</p><a class="button" href="${link('products/')}">Explore the draft range</a></div></section><section class="container draft-section"><div class="draft-section-heading"><h2>Find your brand.</h2><a class="text-link" href="${quoteLink}">Talk about your project</a></div><div class="draft-brands">${brands.map(b => `<a href="${link(b.id + '/')}" class="draft-brand"><img src="${esc(imageRoot + b.image)}" alt="${b.name}" loading="lazy"><div><h3>${b.name}</h3><p>${b.copy}</p><span>${catalog.products.filter(p => p.brand === b.name).length} product drafts</span></div></a>`).join('')}</div></section>`;
    } else {
      if (brand) { title = brand.name + ' Australia - Draft product range'; description = brand.copy + ' Explore the supplied product drafts and request a quote.'; }
      body = `${brand ? `<section class="draft-brand-hero"><img src="${esc(imageRoot + brand.image)}" alt="${brand.name}" fetchpriority="high"><div class="container"><p class="draft-label">${brand.name} / Australia</p><h1>${brand.headline}</h1><p>${brand.copy}</p></div></section>` : ''}<section class="container draft-section"><div class="draft-section-heading"><h${brand ? '2' : '1'}>${brand ? brand.name + ' product drafts' : 'Explore the draft range.'}</h${brand ? '2' : '1'}><span>${list.length} supplied entries</span></div><p class="draft-intro">These are review candidates. The final launch selection, prices and stock are still to be confirmed.</p><form id="draft-filter" class="draft-filter"><label class="field">Search products<input name="query" type="search" placeholder="Model or feature"></label><label class="field">Category<select name="category"><option value="">All categories</option>${Object.entries(categories).filter(([id]) => list.some(p => p.category === id)).map(([id,name]) => `<option value="${id}">${name}</option>`).join('')}</select></label><button class="button" type="submit">Filter</button><button class="text-link" type="reset">Reset</button></form><p id="draft-result-count" role="status">${list.length} products</p>${grid(list)}<p id="draft-no-results" hidden>No products match. Try another model or category.</p></section>`;
    }
    const dimensions = Object.assign({}, sharedImageDimensions, ...catalog.products.map(p => p.imageDimensions || {}));
    const markup = (header + `<main id="main-content">${body}</main>` + footer).replace(/<img src="([^"]+)"/g, (match, src) => {
      const size = dimensions[src.split('/').at(-1)];
      return size ? match + ` width="${size.width}" height="${size.height}"` : match;
    });
    return {html:markup, title, description};
  }
  function mount(app, catalog) {
    const initialState = {...(window.PREVORA_PAGE || {}), root:window.PREVORA_ROOT || './', assetBase:window.PREVORA_ASSET_BASE, themed:Boolean(window.PREVORA_THEME_MODE)};
    let state;
    function render() {
      state = {...initialState};
      const hash = location.hash.replace(/^#\/?/, '').split('/');
      if (location.hash.startsWith('#/') && hash[0]) {
        const parts = hash[0] === 'store' ? hash.slice(2) : hash;
        const oldBrand = hash[0] === 'store' ? hash[1] : state.brand;
        const page = {shop:'products', product:'product', contact:'contact', business:'enquiry', cart:'products', checkout:'products', brands:'home', about:'home'}[parts[0]] || parts[0] || 'products';
        state = {...state, page, brand:oldBrand, slug:parts[1]};
      }
      const result = view(catalog, state);
      app.innerHTML = result.html; document.title = result.title;
      document.body.dataset.store = state.brand || 'prevora';
      if (state.page === 'enquiry') {
        document.getElementById('draft-quote-mount').outerHTML = window.PrevoraQuote.render(catalog.products.filter(p => !state.brand || p.brand.toLowerCase() === state.brand), {email:window.PREVORA_CONFIG?.enquiryEmail || catalog.company.email, preview:true});
      }
    }
    function filter() {
      const form = document.getElementById('draft-filter'); if (!form) return;
      const data = new FormData(form), query = String(data.get('query')).trim().toLowerCase(), category = data.get('category');
      let count = 0;
      for (const card of app.querySelectorAll('.draft-card')) {
        card.hidden = Boolean((category && card.dataset.category !== category) || !card.dataset.search.includes(query));
        if (!card.hidden) count++;
      }
      document.getElementById('draft-result-count').textContent = `${count} products`;
      document.getElementById('draft-no-results').hidden = count !== 0;
    }
    app.addEventListener('submit', event => {
      if (event.target.id === 'draft-filter') { event.preventDefault(); filter(); }
      if (event.target.hasAttribute('data-draft-quote')) {
        event.preventDefault();
        const quantity = Number(new FormData(event.target).get('quantity'));
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) return;
        window.PrevoraQuote.add(event.target.dataset.draftQuote, quantity);
        // Keep the selection in memory instead of carrying personal data into a URL or storage.
        location.hash = state.themed && state.brand ? '#/store/' + state.brand + '/business' : '#/business';
        window.scrollTo(0, 0);
      }
    });
    app.addEventListener('input', event => { if (event.target.closest('#draft-filter')) filter(); });
    app.addEventListener('change', event => { if (event.target.closest('#draft-filter')) filter(); });
    app.addEventListener('reset', event => { if (event.target.id === 'draft-filter') setTimeout(filter, 0); });
    window.addEventListener('hashchange', () => { if (!location.hash || location.hash.startsWith('#/')) render(); });
    render();
  }
  globalThis.PrevoraDraft = {view, mount};
})();
