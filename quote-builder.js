(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  let selection = [], products = [], recipient = '', draft = '';
  const name = p => p.name || p.title;
  const key = p => p.id;
  const validEmail = value => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
  function lines() {
    return selection.map((line, i) => `<div class="quote-line">
      <label class="field">Product<select data-quote-model="${i}" required><option value="">Select a product</option>${products.map(p => `<option value="${esc(key(p))}" ${key(p) === line.id ? 'selected' : ''}>${esc(name(p))}</option>`).join('')}<option value="other" ${line.id === 'other' ? 'selected' : ''}>Another model / help me choose</option></select></label>
      <label class="field">Quantity<input type="number" min="1" max="100000" step="1" value="${line.quantity}" data-quote-quantity="${i}" required></label>
      <button type="button" class="text-link" data-quote-remove="${i}" aria-label="Remove product ${i + 1}">Remove</button>
    </div>`).join('');
  }
  function render(catalog, options = {}) {
    products = catalog; recipient = validEmail(options.email || '') ? options.email : ''; draft = '';
    selection = selection.filter(line => line.id === 'other' || products.some(p => key(p) === line.id));
    if (!selection.length) selection = [{ id: '', quantity: 1 }];
    return `<section class="container quote-builder"><div class="page-head"><p class="eyebrow">PREVORA / Business enquiries</p><h1>Tell us what you need.</h1><p>Choose products and quantities, add your project details, then review your enquiry.</p></div><div class="contact-layout"><div class="contact-copy"><h2>Start with your project.</h2><p>Request a quote for a property, workplace, resale range or larger order. Prices, supply and trade terms are agreed in the quote.</p><p>For a model that is not listed, choose "Another model / help me choose" and describe it in your message.</p><div class="demo-callout">${options.preview ? 'The listed models come from the supplied Australian product workbook. The launch selection is awaiting approval. ' : ''}${recipient ? 'Review your draft, then open your email app to send it.' : 'The enquiry inbox is being set up. You can prepare and download your draft now.'} Nothing is sent automatically.</div></div><div>
      <form id="quote-form"><div class="field-grid">
        <label class="field">Your name<input name="name" maxlength="160" autocomplete="name" required></label>
        <label class="field">Email<input type="email" name="email" maxlength="254" autocomplete="email" required></label>
        <label class="field field-wide">Company / project<input name="company" maxlength="160" required></label>
        <label class="field">Phone (optional)<input name="phone" type="tel" maxlength="50"></label>
        <label class="field">Delivery postcode (optional)<input name="postcode" inputmode="numeric" pattern="[0-9]{4}" maxlength="4"></label>
      </div><h2 class="quote-products-heading">Products and quantities</h2><div id="quote-lines">${lines()}</div><button type="button" class="text-link" data-quote-add>Add another product +</button>
      <label class="field quote-message">Project details / other models<textarea name="message" maxlength="4000" placeholder="Installation needs, preferred models, quantities and timing" required></textarea></label>
      <p class="demo-note">Your contact details stay in this page until you download the draft or open your email app. They are not saved in browser storage.</p><button class="button" type="submit">Review enquiry</button></form>
      <section id="quote-review" hidden tabindex="-1"><h2>Review your enquiry.</h2><textarea id="quote-draft" readonly rows="16" aria-label="Enquiry draft"></textarea><div class="quote-actions"><button class="button" type="button" data-quote-download>Download draft</button>${recipient ? '<a class="button button-outline" id="quote-email">Open email draft</a>' : ''}<button class="text-link" type="button" data-quote-edit>Edit details</button></div><p id="quote-delivery-note" role="status">Your enquiry has not been sent. ${recipient ? 'Review and send it in your email app.' : 'Share the downloaded draft once your PREVORA contact is confirmed.'}</p></section>
    </div></div></section>`;
  }
  function add(id, quantity = 1) {
    const found = selection.find(line => line.id === id);
    if (found) found.quantity += quantity; else selection.push({ id, quantity });
  }
  document.addEventListener('change', event => {
    const el = event.target;
    if (el.matches('[data-quote-model]')) selection[Number(el.dataset.quoteModel)].id = el.value;
    if (el.matches('[data-quote-quantity]')) selection[Number(el.dataset.quoteQuantity)].quantity = Number(el.value);
  });
  document.addEventListener('click', event => {
    const el = event.target.closest('button,a'); if (!el) return;
    if (el.hasAttribute('data-quote-add')) { selection.push({ id: '', quantity: 1 }); document.getElementById('quote-lines').innerHTML = lines(); }
    if (el.hasAttribute('data-quote-remove')) { selection.splice(Number(el.dataset.quoteRemove), 1); if (!selection.length) selection.push({ id: '', quantity: 1 }); document.getElementById('quote-lines').innerHTML = lines(); }
    if (el.hasAttribute('data-quote-edit')) { document.getElementById('quote-review').hidden = true; document.getElementById('quote-form').hidden = false; document.querySelector('#quote-form input').focus(); }
    if (el.hasAttribute('data-quote-download')) {
      const url = URL.createObjectURL(new Blob([draft], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'prevora-quote-enquiry.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  document.addEventListener('submit', event => {
    if (event.target.id !== 'quote-form') return;
    event.preventDefault();
    if (!event.target.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(event.target));
    if (!selection.length || selection.some(line => !line.id || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 100000)) return;
    draft = ['PREVORA - quote enquiry', '', `Name: ${fields.name}`, `Email: ${fields.email}`, `Company / project: ${fields.company}`, `Phone: ${fields.phone || 'Not supplied'}`, `Delivery postcode: ${fields.postcode || 'Not supplied'}`, '', 'Products requested:', ...selection.map(line => {
      const product = products.find(p => key(p) === line.id);
      return `- ${product ? name(product) : 'Other model / advice requested'} | Quantity: ${line.quantity}`;
    }), '', 'Project details:', fields.message, '', 'This is a quote request, not an order. Prices, stock, shipping and trade terms require confirmation.'].join('\n');
    document.getElementById('quote-draft').value = draft;
    const email = document.getElementById('quote-email');
    if (email) {
      const href = `mailto:${recipient}?subject=${encodeURIComponent('PREVORA quote enquiry - ' + fields.company)}&body=${encodeURIComponent(draft)}`;
      email.hidden = href.length > 1900;
      if (!email.hidden) email.href = href;
      else document.getElementById('quote-delivery-note').textContent = 'Your draft is too long for an email link. Download it and attach it to your email. Nothing has been sent.';
    }
    event.target.hidden = true; const review = document.getElementById('quote-review'); review.hidden = false; review.focus();
  });
  globalThis.PrevoraQuote = { render, add };
})();
