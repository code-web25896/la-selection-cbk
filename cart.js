(() => {
  const storageKey = 'cbk-cart-v1';
  const whatsappNumber = '21626877474';
  const readCart = () => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(value) ? value.filter((item) => item && typeof item.name === 'string').map((item) => ({
        ...item,
        quantity: Math.max(1, Math.min(99, Number.parseInt(item.quantity, 10) || 1)),
      })) : [];
    } catch { return []; }
  };
  let cart = readCart();

  const style = document.createElement('style');
  style.textContent = `
    #cbk-cart-overlay{position:fixed;inset:0;z-index:90;background:rgba(14,25,40,.48);display:flex;justify-content:flex-end}
    #cbk-cart-overlay[hidden]{display:none!important}
    #cbk-cart-panel{width:min(490px,100%);height:100%;overflow-y:auto;background:#fff;padding:25px;box-shadow:-12px 0 34px rgba(0,0,0,.14);font:14px/1.5 Arial,sans-serif;color:#172335}
    #cbk-cart-panel *{box-sizing:border-box}#cbk-cart-head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e1e5eb;padding-bottom:16px}
    #cbk-cart-head h2{margin:0;font:30px Georgia,serif}#cbk-cart-close{border:0;background:transparent;font-size:28px;cursor:pointer;color:#172335}
    #cbk-cart-items{padding:0;margin:8px 0;list-style:none}#cbk-cart-items li{padding:16px 0;border-bottom:1px solid #ded8d0;display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:12px;align-items:center}
    .cbk-cart-image{display:block;width:72px;height:72px;object-fit:cover;background:#f6f3ed}
    .cbk-cart-title{font-weight:700}.cbk-cart-meta{font-size:12px;color:#697586;margin-top:3px}.cbk-cart-quantity{display:flex;align-items:center;gap:7px}
    .cbk-cart-quantity button,.cbk-cart-remove{border:1px solid #ccd4df;background:#fff;color:#173d75;border-radius:5px;min-width:30px;height:30px;cursor:pointer}
    .cbk-cart-remove{grid-column:1/-1;width:auto;padding:4px 9px;font-size:12px}
    #cbk-cart-panel .cbk-cart-note{background:#f5f6f8;border-left:3px solid #173d75;padding:11px 13px;color:#586577;font-size:12px;margin:18px 0}
    #cbk-cart-form{display:grid;gap:11px}#cbk-cart-form label{font-size:12px;font-weight:700;display:grid;gap:5px}
    #cbk-cart-form input:not([type=checkbox]){width:100%;border:1px solid #cdd4de;border-radius:6px;padding:11px;font:14px Arial,sans-serif}
    #cbk-cart-form .cbk-consent{display:flex;align-items:flex-start;gap:8px;font-weight:400;line-height:1.4}#cbk-cart-form .cbk-consent input{margin-top:3px}
    #cbk-cart-submit{border:0;border-radius:6px;background:#173d75;color:white;padding:13px;font-weight:700;cursor:pointer}#cbk-cart-submit:disabled{opacity:.55;cursor:not-allowed}
    #cbk-cart-message{min-height:22px;font-size:13px;font-weight:700;color:#173d75}#cbk-cart-message a{display:block;margin-top:8px}
    @media(max-width:560px){#cbk-cart-panel{padding:20px}}
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'cbk-cart-root';
  root.innerHTML = `
    <div id="cbk-cart-overlay" hidden>
      <section id="cbk-cart-panel" role="dialog" aria-modal="true" aria-labelledby="cbk-cart-title">
        <div id="cbk-cart-head"><h2 id="cbk-cart-title">Votre panier</h2><button id="cbk-cart-close" type="button" aria-label="Fermer">×</button></div>
        <p id="cbk-cart-empty">Votre panier est vide.</p>
        <ul id="cbk-cart-items"></ul>
        <p class="cbk-cart-note">CBK confirmera le prix, la disponibilité et le retrait en showroom avant de valider la commande et le paiement.</p>
        <form id="cbk-cart-form">
          <label>Nom et prénom<input name="name" autocomplete="name" required minlength="2" maxlength="120"></label>
          <label>Téléphone<input name="phone" type="tel" autocomplete="tel" required minlength="6" maxlength="40"></label>
          <label>E-mail (facultatif)<input name="email" type="email" autocomplete="email" maxlength="190"></label>
          <label class="cbk-consent"><input name="consent" type="checkbox" required><span>J’accepte que CBK utilise mes informations pour traiter cette demande de commande.</span></label>
          <button id="cbk-cart-submit" type="submit">Envoyer ma demande de commande</button>
          <div id="cbk-cart-message" role="status" aria-live="polite"></div>
        </form>
      </section>
    </div>`;
  document.body.appendChild(root);

  const overlay = document.getElementById('cbk-cart-overlay');
  const toggle = document.getElementById('cbk-cart-toggle');
  const form = document.getElementById('cbk-cart-form');
  const submitButton = document.getElementById('cbk-cart-submit');
  const message = document.getElementById('cbk-cart-message');

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(cart)); } catch {}
    render();
  }

  function render() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cbk-cart-count').textContent = String(count);
    document.getElementById('cbk-cart-empty').hidden = cart.length > 0;
    submitButton.disabled = cart.length === 0;
    const list = document.getElementById('cbk-cart-items');
    list.replaceChildren(...cart.map((item, index) => {
      const row = document.createElement('li');
      const image = document.createElement('img');
      image.className = 'cbk-cart-image'; image.alt = item.name;
      if (item.image) image.src = item.image;
      else { image.hidden = true; image.alt = ''; }
      const details = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'cbk-cart-title';
      title.textContent = item.name;
      const meta = document.createElement('div');
      meta.className = 'cbk-cart-meta';
      meta.textContent = [item.brand, item.universe, item.variant].filter(Boolean).join(' · ');
      details.append(title, meta);
      const quantity = document.createElement('div');
      quantity.className = 'cbk-cart-quantity';
      const minus = document.createElement('button');
      minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label', 'Réduire la quantité');
      minus.dataset.cartAction = 'minus'; minus.dataset.index = String(index);
      const amount = document.createElement('span'); amount.textContent = String(item.quantity);
      const plus = document.createElement('button');
      plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', 'Augmenter la quantité');
      plus.dataset.cartAction = 'plus'; plus.dataset.index = String(index);
      quantity.append(minus, amount, plus);
      const remove = document.createElement('button');
      remove.type = 'button'; remove.textContent = 'Retirer'; remove.className = 'cbk-cart-remove';
      remove.dataset.cartAction = 'remove'; remove.dataset.index = String(index);
      row.append(image, details, quantity, remove);
      return row;
    }));
  }

  function openCart() {
    overlay.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.getElementById('cbk-cart-close').focus();
  }
  function closeCart() {
    overlay.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }

  window.cbkAddToCart = (rawItem) => {
    const item = {
      name: String(rawItem.name || '').trim().slice(0, 120),
      brand: String(rawItem.brand || '').trim().slice(0, 80),
      universe: String(rawItem.universe || (location.pathname.includes('sanitaire') ? 'Sanitaire' : location.pathname.includes('robinetterie') ? 'Robinetterie' : 'Carrelage')).slice(0, 40),
      variant: String(rawItem.variant || '').trim().slice(0, 160),
      image: /^\/product-images\/[a-z0-9-]+\.(?:jpg|png|webp)$/i.test(String(rawItem.image || '')) ? String(rawItem.image) : '',
      quantity: Math.max(1, Math.min(99, Number.parseInt(rawItem.quantity, 10) || 1)),
    };
    if (!item.name || !item.brand) return;
    const existing = cart.find((entry) => entry.name === item.name && entry.brand === item.brand && entry.variant === item.variant);
    if (existing) existing.quantity = Math.min(99, existing.quantity + item.quantity);
    else cart.push(item);
    message.textContent = `${item.name} ajouté au panier.`;
    save();
    openCart();
  };

  toggle.addEventListener('click', openCart);
  document.getElementById('cbk-cart-close').addEventListener('click', closeCart);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) closeCart(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !overlay.hidden) closeCart(); });
  document.getElementById('cbk-cart-items').addEventListener('click', (event) => {
    const button = event.target.closest('[data-cart-action]');
    if (!button) return;
    const index = Number(button.dataset.index);
    if (!cart[index]) return;
    if (button.dataset.cartAction === 'remove') cart.splice(index, 1);
    if (button.dataset.cartAction === 'plus') cart[index].quantity = Math.min(99, cart[index].quantity + 1);
    if (button.dataset.cartAction === 'minus') {
      cart[index].quantity -= 1;
      if (cart[index].quantity < 1) cart.splice(index, 1);
    }
    message.textContent = '';
    save();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!cart.length) return;
    submitButton.disabled = true;
    message.textContent = 'Enregistrement de la demande…';
    try {
      const values = Object.fromEntries(new FormData(form).entries());
      const response = await fetch('/api/shop/orders', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: values, items: cart, consent: values.consent }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Impossible d’enregistrer la demande.');
      cart = [];
      save();
      form.reset();
      message.textContent = `Demande enregistrée. Référence ${result.orderRef}.`;
      const notice = document.createElement('a');
      notice.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Bonjour, je viens d’envoyer une demande de commande CBK. Référence : ${result.orderRef}.`)}`;
      notice.target = '_blank'; notice.rel = 'noopener'; notice.textContent = 'Envoyer aussi la référence à CBK sur WhatsApp';
      message.appendChild(notice);
    } catch (error) {
      message.textContent = error.message;
    } finally {
      submitButton.disabled = cart.length === 0;
    }
  });

  render();
})();
