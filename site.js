(() => {
  const whatsappNumber = '21626877474';
  const whatsapp = (message) => `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  const routeForLabel = (label) => {
    const text = label.trim().toLowerCase();
    if (text.includes('carrelage')) return '/catalogue-carrelage.html';
    if (text.includes('sanitaire')) return '/catalogue-sanitaire.html';
    if (text.includes('robinetterie')) return '/catalogue-robinetterie.html';
    if (text.includes('marque')) return '/marques.html';
    if (text.includes('inspiration')) return '/inspirations.html';
    if (text.includes('projet')) return '/projets.html';
    if (text.includes('showroom')) return '/showrooms.html';
    if (text.includes('collection')) return '/collections.html';
    if (text.includes('produit')) return '/univers.html';
    if (text.includes('conseiller') || text.includes('contact')) return '/contact.html';
    return null;
  };

  document.querySelectorAll('a:not([href])').forEach((link) => {
    const label = link.textContent.replace(/\s+/g, ' ').trim();
    const route = routeForLabel(label);
    if (route) link.href = route;
    else if (link.classList.contains('text-link')) {
      let context = link.parentElement;
      let destination = '/catalogue-carrelage.html';
      for (let depth = 0; context && depth < 4; depth += 1, context = context.parentElement) {
        const text = context.textContent.toLowerCase();
        if (text.includes('robinetterie')) {
          destination = '/catalogue-robinetterie.html';
          break;
        }
        if (text.includes('sanitaire') || text.includes('vasque') || text.includes('wc')) {
          destination = '/catalogue-sanitaire.html';
          break;
        }
        if (text.includes('carrelage') || text.includes('marbre') || text.includes('pierre')) break;
      }
      link.href = destination;
    }
    else if (link.classList.contains('stylepill')) {
      const effect = label.replace(/^Effet\s+/i, '');
      link.href = effect === 'Outdoor'
        ? '/catalogue-carrelage.html?q=Outdoor'
        : `/catalogue-carrelage.html?effect=${encodeURIComponent(effect)}`;
    } else if (link.classList.contains('tile') || link.classList.contains('project')) {
      link.href = '/index.html#projects';
    }
  });

  document.querySelectorAll('a[href="#"]').forEach((link) => {
    const label = link.textContent.replace(/\s+/g, ' ').trim();
    const route = routeForLabel(label);
    if (route) link.href = route;
    else if (link.querySelector('img[alt*="CBK"], img[alt*="Aura"]')) link.href = '/index.html';
  });

  const navToggle = document.querySelector('.menu-btn');
  const nav = document.querySelector('.mainnav');
  const mobileNavStyles = document.createElement('style');
  mobileNavStyles.textContent = '.finder .selectish{cursor:pointer}.finder select{width:100%;border:0;padding:0;background:transparent;color:inherit;font:700 13px Arial,sans-serif;cursor:pointer;outline-offset:3px}.finder select:disabled{opacity:.55;cursor:not-allowed}@media(max-width:1050px){.mainnav.is-open{display:flex;position:absolute;top:100%;left:0;right:0;z-index:30;background:#fff;padding:12px 24px;flex-direction:column;gap:0;box-shadow:0 12px 24px rgba(0,0,0,.12)}.mainnav.is-open a{padding:12px 0}}';
  document.head.appendChild(mobileNavStyles);
  if (navToggle && nav) {
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  const finder = document.querySelector('.finder');
  if (finder) {
    const universe = document.getElementById('finderUniverse');
    const style = document.getElementById('finderStyle');
    const format = document.getElementById('finderFormat');
    const search = finder.querySelector('button');
    const configurations = {
      carrelage: {
        route: '/catalogue-carrelage.html',
        styles: [['', 'Tous les styles'], ['Marbre', 'Effet marbre'], ['Pierre', 'Effet pierre'], ['Bois', 'Effet bois'], ['Onyx', 'Effet onyx']],
        formats: [['', 'Tous les formats'], ['60 × 120', '60 × 120'], ['80 × 160', '80 × 160'], ['120 × 278', '120 × 278'], ['Grand format', 'Grand format']],
      },
      sanitaire: {
        route: '/catalogue-sanitaire.html',
        styles: [['', 'Toutes les catégories'], ['WC suspendu', 'WC suspendu'], ['WC', 'WC'], ['Vasque', 'Vasque'], ['Douche', 'Douche']],
        formats: [['', 'Tous les formats']],
      },
      robinetterie: {
        route: '/catalogue-robinetterie.html',
        styles: [['', 'Toutes les catégories'], ['Douche', 'Douche']],
        formats: [['', 'Tous les formats']],
      },
    };
    const setOptions = (select, options, selected = '') => {
      select.replaceChildren(...options.map(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.selected = value === selected;
        return option;
      }));
    };
    const updateFinder = () => {
      const config = configurations[universe.value] || configurations.carrelage;
      setOptions(style, config.styles);
      setOptions(format, config.formats);
      format.disabled = universe.value !== 'carrelage';
    };
    universe.addEventListener('change', updateFinder);
    search.addEventListener('click', () => {
      const config = configurations[universe.value] || configurations.carrelage;
      const params = new URLSearchParams();
      if (universe.value === 'carrelage') {
        if (style.value) params.set('effect', style.value);
        if (format.value) params.set('format', format.value);
      } else if (style.value) {
        params.set(universe.value === 'sanitaire' ? 'category' : 'style', style.value);
      }
      window.location.href = `${config.route}${params.size ? `?${params}` : ''}`;
    });
  }

  const favoritePrefix = 'cbk-favorite:';
  let visitorId;
  try {
    visitorId = localStorage.getItem('cbk-visitor-id');
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem('cbk-visitor-id', visitorId);
    }
  } catch { visitorId = crypto.randomUUID(); }

  const readFavoriteNames = () => {
    try {
      return Object.keys(localStorage).filter((key) => key.startsWith(favoritePrefix) && localStorage.getItem(key) === 'true')
        .map((key) => key.slice(favoritePrefix.length));
    } catch { return []; }
  };
  const readFavoriteRecords = () => {
    let records = {};
    try { records = JSON.parse(localStorage.getItem('cbk-favorite-records-v1') || '{}'); } catch {}
    return readFavoriteNames().map((name) => records[name] || { name, brand: '', universe: '', variant: '', image: '' });
  };
  const updateFavoriteCount = () => {
    const badge = document.getElementById('cbk-favorite-count');
    if (badge) badge.textContent = String(readFavoriteNames().length);
  };
  const saveFavoriteNames = async () => {
    try {
      await fetch('/api/shop/favorites', {
        method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, favorites: readFavoriteRecords() }),
      });
    } catch {}
  };
  const applyFavorites = (items) => {
    const records = {};
    const names = items.map((item) => typeof item === 'string' ? item : item?.name).filter(Boolean);
    items.forEach((item) => { if (item && typeof item === 'object' && item.name) records[item.name] = item; });
    try {
      const oldRecords = JSON.parse(localStorage.getItem('cbk-favorite-records-v1') || '{}');
      localStorage.setItem('cbk-favorite-records-v1', JSON.stringify({ ...oldRecords, ...records }));
    } catch {}
    const selected = new Set(names);
    document.querySelectorAll('.heart, .fav').forEach((button) => {
      const name = button.closest('.card')?.querySelector('h3')?.textContent.trim() || 'homepage-item';
      const key = `${favoritePrefix}${name}`;
      try { localStorage.setItem(key, String(selected.has(name))); } catch {}
      button.textContent = selected.has(name) ? '♥' : '♡';
      button.setAttribute('aria-pressed', String(selected.has(name)));
    });
    updateFavoriteCount();
  };
  const favoriteDialog = document.createElement('div');
  favoriteDialog.className = 'cbk-action-overlay';
  favoriteDialog.hidden = true;
  favoriteDialog.innerHTML = '<section class="cbk-action-panel" role="dialog" aria-modal="true" aria-labelledby="cbk-favorites-title"><div class="cbk-action-head"><h2 id="cbk-favorites-title">Mes favoris</h2><button type="button" class="cbk-action-close" aria-label="Fermer">×</button></div><div class="cbk-action-content" id="cbk-favorites-list"></div></section>';
  document.body.appendChild(favoriteDialog);
  const favoriteList = favoriteDialog.querySelector('#cbk-favorites-list');
  const renderFavorites = () => {
    const items = readFavoriteRecords();
    if (!items.length) { favoriteList.textContent = 'Vous n’avez pas encore de favoris.'; return; }
    const list = document.createElement('div'); list.className = 'cbk-item-list';
    items.forEach((item) => {
      const row = document.createElement('article'); row.className = 'cbk-item-row';
      if (item.image) { const image = document.createElement('img'); image.src = item.image; image.alt = item.name; row.appendChild(image); }
      const detail = document.createElement('div'); detail.className = 'cbk-item-detail';
      const label = document.createElement('strong'); label.textContent = item.name;
      const meta = document.createElement('span'); meta.textContent = [item.brand, item.universe, item.variant].filter(Boolean).join(' · ');
      detail.append(label, meta);
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Retirer';
      remove.addEventListener('click', async () => {
        try {
          localStorage.removeItem(`${favoritePrefix}${item.name}`);
          const records = JSON.parse(localStorage.getItem('cbk-favorite-records-v1') || '{}');
          delete records[item.name]; localStorage.setItem('cbk-favorite-records-v1', JSON.stringify(records));
        } catch {}
        document.querySelectorAll('.heart, .fav').forEach((button) => {
          if ((button.closest('.card')?.querySelector('h3')?.textContent.trim() || 'homepage-item') === item.name) {
            button.textContent = '♡'; button.setAttribute('aria-pressed', 'false');
          }
        });
        await saveFavoriteNames(); renderFavorites();
        updateFavoriteCount();
      });
      row.append(detail, remove); list.appendChild(row);
    });
    favoriteList.replaceChildren(list);
  };
  const bindFavoriteButtons = (root = document) => root.querySelectorAll('.heart, .fav').forEach((button) => {
    const name = button.closest('.card')?.querySelector('h3')?.textContent.trim() || 'homepage-item';
    const key = `${favoritePrefix}${name}`;
    try { if (localStorage.getItem(key) === 'true') button.textContent = '♥'; } catch {}
    button.setAttribute('aria-pressed', String(button.textContent.trim() === '♥'));
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const active = button.textContent.trim() !== '♥';
      const card = button.closest('.card');
      const name = card?.querySelector('h3')?.textContent.trim() || 'homepage-item';
      button.textContent = active ? '♥' : '♡';
      button.setAttribute('aria-pressed', String(active));
      try { localStorage.setItem(key, String(active)); } catch {}
      try {
        const records = JSON.parse(localStorage.getItem('cbk-favorite-records-v1') || '{}');
        if (active) records[name] = {
          name,
          brand: card?.querySelector('.brand, .card-brand')?.textContent.trim() || '',
          universe: location.pathname.includes('sanitaire') ? 'Sanitaire' : location.pathname.includes('robinetterie') ? 'Robinetterie' : 'Carrelage',
          variant: [...(card?.querySelectorAll('.spec') || [])].map((spec) => spec.textContent.trim()).join(' · '),
          image: /^\/product-images\/[a-z0-9-]+\.(?:jpg|png|webp)$/i.test(card?.querySelector('img')?.getAttribute('src') || '') ? card.querySelector('img').getAttribute('src') : '',
        };
        else delete records[name];
        localStorage.setItem('cbk-favorite-records-v1', JSON.stringify(records));
      } catch {}
      updateFavoriteCount();
      await saveFavoriteNames();
    }, true);
  });
  bindFavoriteButtons();
  updateFavoriteCount();
  fetch(`/api/shop/favorites?visitor=${encodeURIComponent(visitorId)}`, { credentials: 'same-origin' })
    .then((response) => response.ok ? response.json() : null)
    .then((result) => {
      if (result && Array.isArray(result.favorites)) {
        const localRecords = readFavoriteRecords();
        const merged = new Map([...localRecords, ...result.favorites].map((item) => [typeof item === 'string' ? item : item.name, item]));
        applyFavorites([...merged.values()]);
        saveFavoriteNames();
      }
    })
    .catch(() => {});

  const searchButton = document.querySelector('[aria-label="Recherche"]');
  const favoritesButton = document.querySelector('[aria-label="Favoris"]');
  const actionStyles = document.createElement('style');
  actionStyles.textContent = `
    .cbk-action-overlay{position:fixed;inset:0;z-index:95;background:rgba(14,25,40,.48);display:flex;justify-content:flex-end}
    .cbk-action-overlay[hidden]{display:none!important}.cbk-action-panel{width:min(490px,100%);height:100%;overflow:auto;background:#fff;padding:25px;color:#171717;font:14px/1.5 Arial,sans-serif;box-shadow:-12px 0 34px rgba(0,0,0,.14)}
    .cbk-action-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;border-bottom:1px solid #ded8d0}.cbk-action-head h2{margin:0;font:30px Georgia,serif}.cbk-action-close{border:0;background:none;font-size:28px;cursor:pointer;color:#171717}
    .cbk-item-list{display:grid}.cbk-item-row{display:grid;grid-template-columns:76px minmax(0,1fr) auto;gap:13px;align-items:center;padding:16px 0;border-bottom:1px solid #ded8d0}
    .cbk-item-row>img{width:76px;height:76px;object-fit:cover;background:#f6f3ed}.cbk-item-detail{display:grid;gap:4px}.cbk-item-detail strong{font-size:14px}.cbk-item-detail span{font-size:11px;color:#6b6862}
    .cbk-item-row button{border:1px solid #ded8d0;background:#fff;padding:7px 11px;color:#173d75;cursor:pointer}
    .cbk-search-form{display:grid;gap:13px;padding-top:20px}.cbk-search-form input,.cbk-search-form select{min-height:48px;border:1px solid #ded8d0;background:#fff;padding:0 13px;font:14px Arial,sans-serif}
    .cbk-search-form button{min-height:48px;border:0;background:#173d75;color:#fff;font-weight:700;cursor:pointer}
    @media(max-width:560px){.cbk-action-panel{padding:20px}}
  `;
  document.head.appendChild(actionStyles);

  const searchDialog = document.createElement('div');
  searchDialog.className = 'cbk-action-overlay'; searchDialog.hidden = true;
  searchDialog.innerHTML = '<section class="cbk-action-panel" role="dialog" aria-modal="true" aria-labelledby="cbk-search-title"><div class="cbk-action-head"><h2 id="cbk-search-title">Rechercher</h2><button type="button" class="cbk-action-close" aria-label="Fermer">×</button></div><form class="cbk-search-form"><input name="q" type="search" placeholder="Produit, marque ou référence" required maxlength="100" aria-label="Recherche"><select name="universe" aria-label="Univers"><option value="carrelage">Tous les univers</option><option value="sanitaire">Sanitaire</option><option value="robinetterie">Robinetterie</option></select><button type="submit">Rechercher →</button></form></section>';
  document.body.appendChild(searchDialog);

  const closeAction = (overlay) => { overlay.hidden = true; };
  [favoriteDialog, searchDialog].forEach((overlay) => {
    overlay.querySelector('.cbk-action-close').addEventListener('click', () => closeAction(overlay));
    overlay.addEventListener('click', (event) => { if (event.target === overlay) closeAction(overlay); });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { closeAction(favoriteDialog); closeAction(searchDialog); }
  });
  searchButton?.addEventListener('click', () => { searchDialog.hidden = false; searchDialog.querySelector('input').focus(); });
  favoritesButton?.addEventListener('click', () => { renderFavorites(); favoriteDialog.hidden = false; favoriteDialog.querySelector('.cbk-action-close').focus(); });
  searchDialog.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const term = String(values.get('q') || '').trim();
    const universe = String(values.get('universe') || 'carrelage');
    const route = universe === 'sanitaire' ? '/catalogue-sanitaire.html' : universe === 'robinetterie' ? '/catalogue-robinetterie.html' : '/catalogue-carrelage.html';
    window.location.href = `${route}?q=${encodeURIComponent(term)}`;
  });

  const pageParams = new URLSearchParams(window.location.search);
  const initialSearch = pageParams.get('q') || '';
  const catalogueSearch = document.getElementById('q');
  if (catalogueSearch && initialSearch) {
    catalogueSearch.value = initialSearch;
    catalogueSearch.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (initialSearch && window.location.pathname.includes('robinetterie')) {
    const term = initialSearch.toLocaleLowerCase('fr');
    document.querySelectorAll('.card').forEach((card) => {
      card.hidden = !card.textContent.toLocaleLowerCase('fr').includes(term);
    });
  }
  const requestedBrand = pageParams.get('brand');
  const brandFilter = document.getElementById('brand');
  if (requestedBrand && brandFilter) {
    brandFilter.value = [...brandFilter.options].find((option) => option.value.toLocaleLowerCase('fr') === requestedBrand.toLocaleLowerCase('fr'))?.value || '';
    brandFilter.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const requestedCategory = pageParams.get('category');
  const categoryFilter = document.getElementById('category');
  if (requestedCategory && categoryFilter) {
    categoryFilter.value = [...categoryFilter.options].find((option) => option.value.toLocaleLowerCase('fr') === requestedCategory.toLocaleLowerCase('fr'))?.value || '';
    categoryFilter.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const escapeText = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  if (/^\/catalogue-(carrelage|sanitaire)\.html$/.test(location.pathname)) {
    const universe = location.pathname.includes('sanitaire') ? 'Sanitaire' : 'Carrelage';
    fetch(`/api/catalogue/entries?kind=product&universe=${encodeURIComponent(universe)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.entries?.length) window.cbkReplaceCatalogProducts?.(data.entries);
        const brand = pageParams.get('brand'); const brandSelect = document.getElementById('brand');
        if (brand && brandSelect) {
          brandSelect.value = [...brandSelect.options].find((option) => option.value.toLocaleLowerCase('fr') === brand.toLocaleLowerCase('fr'))?.value || '';
          brandSelect.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const category = pageParams.get('category'); const categorySelect = document.getElementById('category');
        if (category && categorySelect) {
          categorySelect.value = [...categorySelect.options].find((option) => option.value.toLocaleLowerCase('fr') === category.toLocaleLowerCase('fr'))?.value || '';
          categorySelect.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })
      .catch(() => {});
  }
  if (location.pathname.endsWith('catalogue-robinetterie.html')) {
    fetch('/api/catalogue/entries?kind=product&universe=Robinetterie')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const grid = document.querySelector('.grid');
        if (!grid || !data?.entries?.length) return;
        grid.replaceChildren(...data.entries.map((entry) => {
          const card = document.createElement('article'); card.className = 'card';
          const brand = document.createElement('div'); brand.className = 'brand'; brand.textContent = entry.brand;
          const name = document.createElement('h2'); name.textContent = entry.name;
          const description = document.createElement('p'); description.textContent = entry.description || entry.category || '';
          const image = document.createElement('img'); image.src = entry.image; image.alt = entry.name;
          image.style.cssText = 'width:100%;height:230px;object-fit:cover;margin-bottom:16px';
          const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = [entry.format, entry.finish].filter(Boolean).join(' · ');
          const productLink = document.createElement('a'); productLink.className = 'button';
          productLink.href = entry.link || `/catalogue-sanitaire.html?q=${encodeURIComponent(entry.name)}`;
          productLink.textContent = 'Voir les produits';
          const add = document.createElement('button'); add.className = 'button reserve'; add.type = 'button'; add.textContent = '＋ Ajouter au panier';
          add.dataset.productName = entry.name; add.dataset.productBrand = entry.brand; add.dataset.productVariant = [entry.format, entry.finish].filter(Boolean).join(' · '); add.dataset.productImage = entry.image;
          card.append(image, brand, name, description, tag, document.createElement('br'), productLink, add);
          return card;
        }));
      }).catch(() => {});
  }
  if (location.pathname === '/' || location.pathname === '/index.html' || location.pathname.endsWith('CBK_homepage_V4_logo_footer.html')) {
    fetch('/api/catalogue/entries?kind=collection&universe=Carrelage&featured=true')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const grid = document.querySelector('#collections .collections');
        if (!grid || !data?.entries?.length) return;
        grid.replaceChildren(...data.entries.map((entry) => {
          const card = document.createElement('article'); card.className = 'card';
          const photo = document.createElement('div'); photo.className = 'card-photo';
          const image = document.createElement('img'); image.src = entry.image; image.alt = entry.name; photo.appendChild(image);
          const body = document.createElement('div'); body.className = 'card-body';
          const brand = document.createElement('div'); brand.className = 'card-brand'; brand.textContent = entry.brand;
          const name = document.createElement('h3'); name.textContent = entry.name;
          const description = document.createElement('div'); description.className = 'muted'; description.style.fontSize = '12px'; description.textContent = entry.description;
          const specs = document.createElement('div'); specs.className = 'specs';
          [entry.format, entry.finish].filter(Boolean).forEach((value) => { const spec = document.createElement('span'); spec.className = 'spec'; spec.textContent = value; specs.appendChild(spec); });
          const actions = document.createElement('div'); actions.className = 'card-actions';
          const link = document.createElement('a'); link.className = 'text-link'; link.href = entry.link || `/catalogue-carrelage.html?q=${encodeURIComponent(entry.name)}`; link.textContent = 'Voir la collection';
          const heart = document.createElement('button'); heart.type = 'button'; heart.className = 'heart'; heart.textContent = '♡';
          actions.append(link, heart); body.append(brand, name, description, specs, actions); card.append(photo, body); return card;
        }));
        bindFavoriteButtons(grid);
      }).catch(() => {});
  }
  if (location.pathname.endsWith('marques.html')) {
    fetch('/api/catalogue/brands')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const grid = document.querySelector('.grid[aria-label="Marques disponibles"]');
        if (!grid || !data?.brands?.length) return;
        grid.replaceChildren(...data.brands.map((brand) => {
          const card = document.createElement('article'); card.className = 'card';
          if (brand.image) { const image=document.createElement('img');image.src=brand.image;image.alt=brand.name;image.style.cssText='width:100%;height:115px;object-fit:contain;margin-bottom:16px';card.appendChild(image); }
          const title = document.createElement('h2'); title.textContent = brand.name;
          const summary = document.createElement('p'); summary.textContent = brand.description || (brand.universes || []).join(' · ') || 'Marque CBK';
          const universe = (brand.universes || [])[0] || 'Carrelage';
          const link = document.createElement('a'); link.className = 'button'; link.href = `/catalogue-${universe.toLowerCase()}.html?brand=${encodeURIComponent(brand.name)}`;
          link.textContent = 'Voir les produits'; card.append(title, summary, link); return card;
        }));
      }).catch(() => {});
  }
  if (location.pathname.endsWith('/produit.html')) {
    const slug = pageParams.get('slug');
    if (slug) fetch(`/api/catalogue/entries?kind=product&slug=${encodeURIComponent(slug)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const entry = data?.entries?.[0];
        const sheet = document.getElementById('productSheet');
        if (!entry || !sheet) { document.getElementById('productMissing').hidden = false; return; }
        document.title = `${entry.name} · ${entry.brand} | La Sélection CBK`;
        document.getElementById('productCrumb').textContent = entry.name;
        document.getElementById('productBrand').textContent = entry.brand;
        document.getElementById('productName').textContent = entry.name;
        document.getElementById('productSubtitle').textContent = [entry.effect, entry.format, entry.finish].filter(Boolean).join(' · ');
        document.getElementById('productDescription').textContent = entry.description || `Découvrez ${entry.name}, sélectionné par CBK pour vos projets.`;
        const image = document.getElementById('productImage'); image.src = entry.image || ''; image.alt = `${entry.name} · ${entry.brand}`; image.hidden = !entry.image;
        document.getElementById('productSpecs').replaceChildren(...[entry.format, entry.finish, entry.category].filter(Boolean).map((value) => { const chip=document.createElement('span');chip.className='spec';chip.textContent=value;return chip; }));
        const commerce = document.getElementById('productCommerce');
        if (entry.price != null || entry.stock != null) { commerce.hidden=false;commerce.textContent=`${entry.price != null ? `${entry.price} TND` : ''}${entry.price != null && entry.stock != null ? ' · ' : ''}${entry.stock != null ? `Stock : ${entry.stock}` : ''}`; }
        const add = document.getElementById('addProduct'); add.dataset.productName=entry.name;add.dataset.productBrand=entry.brand;add.dataset.productVariant=[entry.format,entry.finish].filter(Boolean).join(' · ');add.dataset.productImage=entry.image || '';
        sheet.hidden=false;
        if (entry.collectionSlug) fetch(`/api/catalogue/entries?kind=collection&slug=${encodeURIComponent(entry.collectionSlug)}`).then((response)=>response.ok?response.json():null).then((collectionData)=>{
          const collection=collectionData?.entries?.[0];if(!collection)return;
          const back=document.getElementById('collectionBack');back.href=collection.link || `/collection.html?slug=${encodeURIComponent(collection.slug)}`;back.textContent=`← Retour à la collection ${collection.name}`;
        }).catch(()=>{});
      }).catch(() => { document.getElementById('productMissing').hidden = false; });
  }
  if (location.pathname.endsWith('collection-aura.html')) {
    Promise.all([
      fetch('/api/catalogue/entries?kind=collection&universe=Carrelage').then((response) => response.ok ? response.json() : null),
      fetch('/api/catalogue/entries?kind=product&collectionSlug=collection-carrelage-aura').then((response) => response.ok ? response.json() : null),
    ]).then(([data, products]) => {
        const entry = data?.entries?.find((item) => item.slug === 'collection-carrelage-aura' || item.name.toLowerCase() === 'aura'); if (!entry) return;
        const name = document.getElementById('collectionTitle'); if (name) name.textContent = entry.name;
        const brand = document.querySelector('.collection .brand'); if (brand) brand.textContent = entry.brand;
        const subtitle = document.querySelector('.collection .subtitle'); if (subtitle) subtitle.textContent = entry.description;
        const visual = document.querySelector('.collection .visual'); if (visual && entry.image) visual.style.backgroundImage = `url("${entry.image}")`;
        const specs = document.querySelector('.collection .specs');
        if (specs) specs.replaceChildren(...[entry.format, entry.finish].filter(Boolean).flatMap((text) => text.split(' · ')).map((value) => { const span=document.createElement('span');span.className='spec';span.textContent=value;return span; }));
        const grid = document.querySelector('.sheets .grid');
        if (grid && products?.entries?.length) grid.replaceChildren(...products.entries.map((product) => {
          const card=document.createElement('a');card.className='sheet';card.href=product.link || `/catalogue-carrelage.html?q=${encodeURIComponent(product.name)}`;
          const brandLine=document.createElement('small');brandLine.textContent=`${product.brand || entry.brand} · ${entry.name}`;
          const title=document.createElement('h3');title.textContent=product.name;
          const description=document.createElement('p');description.textContent=[product.description,product.format,product.finish].filter(Boolean).join(' · ') || 'Voir la fiche produit et les options de réservation.';
          const open=document.createElement('span');open.textContent='Ouvrir la fiche →';card.append(brandLine,title,description,open);return card;
        }));
      }).catch(() => {});
  }
  if (location.pathname.endsWith('CBK_fiche_produit_Aura_V2_logo_footer.html')) {
    fetch('/api/catalogue/entries?kind=product&universe=Carrelage')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const entry = data?.entries?.find((item) => item.name.toLowerCase() === 'aura'); if (!entry) return;
        const name = document.querySelector('.product h1'); if (name) name.textContent = entry.name;
        const brand = document.querySelector('.product .brand'); if (brand) brand.textContent = `${entry.brand} · Collection`;
        const image = document.querySelector('.gallery img'); if (image && entry.image) { image.src = entry.image; image.alt = `${entry.name} · ${entry.brand}`; }
        const specs = document.querySelector('.product .badges');
        if (specs) specs.replaceChildren(...[entry.format, entry.finish].filter(Boolean).flatMap((text) => text.split(' · ')).map((value) => { const span=document.createElement('span');span.className='badge';span.textContent=value;return span; }));
        const sub = document.querySelector('.product .sub'); if (sub) sub.textContent = entry.description || [entry.effect, entry.finish].filter(Boolean).join(' · ');
      }).catch(() => {});
  }

  document.addEventListener('click', (event) => {
    const showroomButton = event.target.closest('button');
    if (showroomButton && /trouver un showroom/i.test(showroomButton.textContent)) {
      event.preventDefault();
      window.location.href = '/index.html#showrooms';
      return;
    }

    const reserve = event.target.closest('.reserve');
    if (reserve) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const card = reserve.closest('.card');
      const name = reserve.dataset.productName || card?.querySelector('h3')?.textContent.trim() || 'Aura';
      const brand = reserve.dataset.productBrand || card?.querySelector('.brand')?.textContent.trim() || 'AB';
      const variant = [...(card?.querySelectorAll('.spec') || [])].map((item) => item.textContent.trim()).join(' · ');
      const image = reserve.dataset.productImage || card?.querySelector('img')?.getAttribute('src') || '';
      window.cbkAddToCart?.({ name, brand, variant: reserve.dataset.productVariant || variant, image, quantity: 1 });
      return;
    }

    const preview = event.target.closest('.view[href="#"]');
    if (preview) {
      const product = preview.closest('.card')?.querySelector('h3')?.textContent.trim() || 'un produit CBK';
      event.preventDefault();
      event.stopImmediatePropagation();
      window.open(whatsapp(`Bonjour, je souhaite des informations sur ${product}.`), '_blank', 'noopener');
    }
  }, true);

  document.querySelectorAll('.news-form').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const email = form.querySelector('input[type="email"]')?.value.trim();
      if (!email) return;
      window.open(whatsapp(`Bonjour, je souhaite demander mon inscription à la newsletter CBK. Mon adresse e-mail : ${email}`), '_blank', 'noopener');
      const submit = form.querySelector('button[type="submit"]');
      if (submit) submit.textContent = 'Demande envoyée ✓';
    }, true);
  });

  const productReserve = document.getElementById('confirmBtn');
  if (productReserve) {
    productReserve.addEventListener('click', (event) => {
      const values = [...document.querySelectorAll('#modal input')].map((input) => input.value.trim()).filter(Boolean);
      const selected = [...document.querySelectorAll('#modal .option.active')].map((option) => option.textContent.trim());
      const message = `Bonjour, je souhaite réserver la collection Aura. ${selected.join(' / ')}. ${values.join(' / ')}`;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.open(whatsapp(message), '_blank', 'noopener');
      const success = document.getElementById('success');
      if (success) success.style.display = 'block';
    }, true);
  }

  const buyButton = document.getElementById('buyBtn');
  if (buyButton) {
    buyButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const quantity = document.getElementById('qty')?.value || '1';
      const variants = [...document.querySelectorAll('.options .option.active')].map((option) => option.textContent.trim());
      window.cbkAddToCart?.({ name: 'Aura', brand: 'AB', variant: variants.join(' · '), image: document.querySelector('.gallery img')?.getAttribute('src') || '', quantity: Number(quantity) });
    }, true);
  }

  const params = new URLSearchParams(window.location.search);
  for (const name of ['brand', 'effect', 'format', 'finish', 'category']) {
    const value = params.get(name);
    const control = document.getElementById(name);
    if (!value || !control) continue;
    if (control.tagName === 'SELECT') {
      const option = [...control.options].find((item) =>
        item.value.toLowerCase() === value.toLowerCase() || item.text.toLowerCase().includes(value.toLowerCase()),
      );
      if (option) control.value = option.value;
    } else control.value = value;
    control.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const query = params.get('q');
  const searchInput = document.getElementById('q');
  if (query && searchInput) {
    searchInput.value = query;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
})();
