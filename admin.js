(() => {
  const loginPanel = document.getElementById('adminLogin');
  const loginForm = document.getElementById('adminLoginForm');
  const adminApp = document.getElementById('adminApp');
  const loginStatus = document.getElementById('loginStatus');
  let entries = [];
  let brandRecords = [];

  const api = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'Le service est indisponible.'); error.status = response.status; throw error;
    }
    return data;
  };
  const showStatus = (element, message, error = false) => { element.textContent = message; element.classList.toggle('error', error); };
  const formValues = (form) => Object.fromEntries(new FormData(form).entries());
  const jsonPost = (data) => ({ method: 'POST', body: JSON.stringify(data) });

  const showApp = () => { loginPanel.hidden = true; adminApp.hidden = false; loadEntries(); loadBrands(); loadOrders(); loadDocuments(); loadUsers(); loadContacts(); loadRequests(); };
  const escapeText = (value) => String(value || '');

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector('button[type="submit"]'); button.disabled = true;
    showStatus(loginStatus, 'Vérification…');
    try {
      await api('/api/admin/login', jsonPost(formValues(loginForm)));
      loginForm.reset(); showApp();
    } catch (error) { showStatus(loginStatus, error.message, true); }
    finally { button.disabled = false; }
  });

  document.getElementById('adminLogout').addEventListener('click', async () => {
    try { await api('/api/admin/logout', jsonPost({})); } catch {}
    adminApp.hidden = true; loginPanel.hidden = false;
  });

  document.querySelectorAll('.tabs [data-tab]').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.tabs [data-tab]').forEach((tab) => tab.classList.toggle('active', tab === button));
    document.querySelectorAll('.tab-panel').forEach((panel) => { panel.hidden = panel.id !== `tab-${button.dataset.tab}`; });
  }));

  const entryForm = document.getElementById('entryForm');
  const entryStatus = document.getElementById('entryStatus');
  const renderEntries = () => {
    const list = document.getElementById('entryList');
    list.replaceChildren(...entries.map((entry) => {
      const row = document.createElement('article'); row.className = 'entry-card';
      if (entry.image) { const image = document.createElement('img'); image.src = entry.image; image.alt = entry.name; row.appendChild(image); }
      const detail = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = entry.name;
      const collection = entry.collectionSlug ? entries.find((item) => item.kind === 'collection' && item.slug === entry.collectionSlug)?.name : '';
      const meta = document.createElement('small'); meta.textContent = `${entry.kind === 'product' ? 'Produit' : 'Collection'} · ${entry.universe} · ${entry.brand || 'Sans marque'}${collection ? ` · Collection ${collection}` : ''}${entry.price != null ? ` · ${entry.price} TND` : ''}${entry.stock != null ? ` · Stock ${entry.stock}` : ''}${entry.active ? '' : ' · Masqué'}`;
      detail.append(title, meta);
      const actions = document.createElement('div'); actions.className = 'entry-actions';
      if (entry.kind === 'product') {
        const sheet = document.createElement('a'); sheet.className = 'button'; sheet.href = entry.link || `/produit.html?slug=${encodeURIComponent(entry.slug)}`; sheet.textContent = 'Fiche'; sheet.target = '_blank'; sheet.rel = 'noopener'; actions.appendChild(sheet);
      }
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'secondary'; edit.textContent = 'Modifier'; edit.addEventListener('click', () => editEntry(entry));
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger'; remove.textContent = 'Supprimer'; remove.addEventListener('click', async () => {
        if (!window.confirm(`Supprimer « ${entry.name} » ?`)) return;
        try { await api('/api/admin/catalogue/entries', jsonPost({ action: 'delete', slug: entry.slug })); await loadEntries(); }
        catch (error) { showStatus(entryStatus, error.message, true); }
      });
      actions.append(edit, remove); row.append(detail, actions); return row;
    }));
  };
  const loadEntries = async () => {
    try {
      ({ entries } = await api('/api/admin/catalogue/entries'));
      const select = entryForm.elements.collectionSlug;
      const selected = select.value;
      select.replaceChildren(new Option('Choisir une collection', ''));
      entries.filter((entry) => entry.kind === 'collection').forEach((entry) => select.add(new Option(`${entry.name} · ${entry.universe}`, entry.slug)));
      select.value = selected;
      renderEntries();
      updateCollectionField();
    }
    catch (error) { if (error.status === 401) showLogin(); else showStatus(entryStatus, error.message, true); }
  };
  const updateCollectionField = () => {
    const isProduct = entryForm.elements.kind.value === 'product';
    document.getElementById('entryCollectionField').hidden = !isProduct;
    entryForm.elements.brand.required = isProduct;
    entryForm.elements.collectionSlug.required = isProduct;
  };
  entryForm.elements.kind.addEventListener('change', updateCollectionField);
  updateCollectionField();
  const editEntry = (entry) => {
    Object.entries(entry).forEach(([key, value]) => {
      const input = entryForm.elements[key];
      if (!input) return;
      if (input.type === 'checkbox') input.checked = Boolean(value);
      else input.value = value ?? '';
    });
    document.getElementById('entryFormTitle').textContent = `Modifier · ${entry.name}`;
    const preview = document.getElementById('entryPreview'); preview.hidden = !entry.image; preview.replaceChildren();
    if (entry.image) { const img = document.createElement('img'); img.src = entry.image; img.alt = entry.name; preview.appendChild(img); }
    entryForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  document.getElementById('entryReset').addEventListener('click', () => {
    entryForm.reset(); entryForm.elements.slug.value = ''; entryForm.elements.image.value = '';
    document.getElementById('entryFormTitle').textContent = 'Ajouter un contenu';
    document.getElementById('entryPreview').hidden = true; showStatus(entryStatus, '');
  });

  document.getElementById('entryImageFile').addEventListener('change', async (event) => {
    const file = event.target.files[0]; if (!file) return;
    showStatus(entryStatus, 'Téléversement de l’image…');
    try {
      const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      const result = await api('/api/admin/assets', jsonPost({ mime: file.type, data: String(dataUrl).split(',')[1] }));
      entryForm.elements.image.value = result.asset.url;
      const preview = document.getElementById('entryPreview'); preview.hidden = false; preview.replaceChildren();
      const img = document.createElement('img'); img.src = result.asset.url; img.alt = 'Aperçu'; preview.appendChild(img);
      showStatus(entryStatus, 'Image prête. Enregistrez le contenu pour publier la modification.');
    } catch (error) { showStatus(entryStatus, error.message, true); }
  });

  entryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = entryForm.querySelector('button[type="submit"]'); button.disabled = true;
    showStatus(entryStatus, 'Enregistrement…');
    try {
      await api('/api/admin/catalogue/entries', jsonPost(formValues(entryForm)));
      showStatus(entryStatus, 'Contenu enregistré et publié.'); await loadEntries();
    } catch (error) { showStatus(entryStatus, error.message, true); }
    finally { button.disabled = false; }
  });

  const orderStatusLabel = (status) => ({ pending: 'À confirmer', processing: 'Confirmée', completed: 'Terminée', cancelled: 'Refusée' }[status] || status);
  const loadOrders = async () => {
    const target = document.getElementById('orderList');
    try {
      const { orders } = await api('/api/admin/shop/orders');
      document.getElementById('ordersStatus').textContent = orders.length ? `${orders.length} commande(s) reçue(s).` : 'Aucune commande reçue pour le moment.';
      target.replaceChildren(...orders.map((order) => {
        const row = document.createElement('article'); row.className = 'admin-row';
        const customer = order.customer || { name: order.name, phone: order.phone, email: order.email };
        const title = document.createElement('h3'); title.textContent = `${order.orderRef} · ${customer.name || 'Client'}`;
        const meta = document.createElement('p'); meta.textContent = `${customer.phone || ''}${customer.email ? ` · ${customer.email}` : ''} · ${new Date(order.createdAt).toLocaleString('fr-FR')} · ${orderStatusLabel(order.status)}`;
        const items = document.createElement('p'); items.textContent = (order.items || []).map((item) => `${item.quantity} × ${item.brand ? `${item.brand} ` : ''}${item.name}${item.variant ? ` · ${item.variant}` : ''}`).join(' | ');
        row.append(title, meta, items);
        if (order.status === 'pending') {
          const actions = document.createElement('div'); actions.className = 'actions';
          [['processing', 'Confirmer', 'secondary'], ['cancelled', 'Refuser', 'danger']].forEach(([nextStatus, label, className]) => {
            const button = document.createElement('button'); button.type = 'button'; button.className = className; button.textContent = label;
            button.addEventListener('click', async () => {
              button.disabled = true;
              try { await api(`/api/admin/shop/orders/${encodeURIComponent(order.orderRef)}`, jsonPost({ status: nextStatus })); await loadOrders(); }
              catch (error) { showStatus(document.getElementById('ordersStatus'), error.message, true); button.disabled = false; }
            });
            actions.appendChild(button);
          });
          row.appendChild(actions);
        }
        return row;
      }));
    } catch (error) {
      if (error.status === 401) showLogin();
      else showStatus(document.getElementById('ordersStatus'), error.message, true);
    }
  };

  const brandForm = document.getElementById('brandForm');
  const brandStatus = document.getElementById('brandStatus');
  const renderBrands = () => {
    const list = document.getElementById('brandList');
    const brandSelect = entryForm.elements.brand;
    const current = brandSelect.value;
    brandSelect.replaceChildren(new Option('Choisir une marque', ''));
    brandRecords.filter((brand) => brand.active !== false).forEach((brand) => brandSelect.add(new Option(brand.name, brand.name)));
    brandSelect.value = current;
    list.replaceChildren(...brandRecords.map((brand) => {
      const row=document.createElement('article');row.className='entry-card';
      if(brand.image){const image=document.createElement('img');image.src=brand.image;image.alt=brand.name;row.appendChild(image)}
      const detail=document.createElement('div');const title=document.createElement('strong');title.textContent=brand.name;
      const description=document.createElement('small');description.textContent=`${brand.description||'Marque CBK'}${brand.active===false?' · Masquée':''}`;detail.append(title,description);
      const actions=document.createElement('div');actions.className='entry-actions';
      const edit=document.createElement('button');edit.type='button';edit.className='secondary';edit.textContent='Modifier';edit.addEventListener('click',()=>editBrand(brand));
      const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.textContent='Supprimer';remove.addEventListener('click',async()=>{
        if(!window.confirm(`Supprimer la marque « ${brand.name} » ?`))return;
        try{await api('/api/admin/catalogue/brands',jsonPost({action:'delete',slug:brand.slug}));await loadBrands();await loadEntries()}
        catch(error){showStatus(brandStatus,error.message,true)}
      });
      actions.append(edit,remove);row.append(detail,actions);return row;
    }));
  };
  const loadBrands = async () => {
    try { ({ brands: brandRecords } = await api('/api/admin/catalogue/brands')); renderBrands(); }
    catch (error) { if (error.status === 401) showLogin(); else showStatus(brandStatus, error.message, true); }
  };
  const editBrand = (brand) => {
    Object.entries(brand).forEach(([key,value])=>{const field=brandForm.elements[key];if(!field)return;if(field.type==='checkbox')field.checked=Boolean(value);else field.value=value??''});
    document.getElementById('brandFormTitle').textContent=`Modifier · ${brand.name}`;
    const preview=document.getElementById('brandPreview');preview.hidden=!brand.image;preview.replaceChildren();
    if(brand.image){const image=document.createElement('img');image.src=brand.image;image.alt=brand.name;preview.appendChild(image)}
    brandForm.scrollIntoView({behavior:'smooth',block:'start'});
  };
  document.getElementById('brandReset').addEventListener('click',()=>{
    brandForm.reset();brandForm.elements.slug.value='';brandForm.elements.image.value='';
    document.getElementById('brandFormTitle').textContent='Ajouter une marque';document.getElementById('brandPreview').hidden=true;showStatus(brandStatus,'');
  });
  document.getElementById('brandImageFile').addEventListener('change',async(event)=>{
    const file=event.target.files[0];if(!file)return;showStatus(brandStatus,'Téléversement du logo…');
    try{
      const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
      const result=await api('/api/admin/assets',jsonPost({mime:file.type,data:String(dataUrl).split(',')[1]}));
      brandForm.elements.image.value=result.asset.url;const preview=document.getElementById('brandPreview');preview.hidden=false;preview.replaceChildren();
      const image=document.createElement('img');image.src=result.asset.url;image.alt='Aperçu';preview.appendChild(image);showStatus(brandStatus,'Logo prêt. Enregistrez la marque pour publier.');
    }catch(error){showStatus(brandStatus,error.message,true)}
  });
  brandForm.addEventListener('submit',async(event)=>{
    event.preventDefault();const button=brandForm.querySelector('button[type="submit"]');button.disabled=true;showStatus(brandStatus,'Enregistrement…');
    try{await api('/api/admin/catalogue/brands',jsonPost(formValues(brandForm)));showStatus(brandStatus,'Marque enregistrée et publiée.');await loadBrands();await loadEntries()}
    catch(error){showStatus(brandStatus,error.message,true)}finally{button.disabled=false}
  });

  const renderDocuments = (documents) => {
    const list = document.getElementById('pdfList');
    list.replaceChildren(...documents.map((name) => {
      const item = document.createElement('li'); item.className = 'document-admin-row';
      const label = document.createElement('span'); label.textContent = name;
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger'; remove.textContent = 'Supprimer';
      remove.addEventListener('click', async () => {
        if (!window.confirm(`Supprimer le PDF « ${name} » ?`)) return;
        try { await api('/api/admin/assets', jsonPost({ action: 'delete', name })); await loadDocuments(); }
        catch (error) { showStatus(document.getElementById('pdfStatus'), error.message, true); }
      });
      item.append(label, remove); return item;
    }));
  };
  const loadDocuments = async () => {
    try { const { documents } = await api('/api/admin/assets'); renderDocuments(documents); }
    catch (error) { showStatus(document.getElementById('pdfStatus'), error.message, true); }
  };
  document.getElementById('pdfUploadForm').addEventListener('submit', async (event) => {
    event.preventDefault(); const form = event.currentTarget; const file = document.getElementById('pdfFile').files[0]; if (!file) return;
    const button = form.querySelector('button[type="submit"]'); button.disabled = true;
    const target = document.getElementById('pdfStatus'); showStatus(target, 'Téléversement du PDF…');
    try {
      const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      const result = await api('/api/admin/assets', jsonPost({ mime: file.type, data: String(dataUrl).split(',')[1] }));
      form.reset(); showStatus(target, `${result.asset.name} ajouté aux documents Pro.`); await loadDocuments();
    } catch (error) { showStatus(target, error.message, true); }
    finally { button.disabled = false; }
  });

  const renderUsers = (users) => {
    const list = document.getElementById('userList');
    list.replaceChildren(...users.map((user) => {
      const row = document.createElement('article'); row.className = 'admin-row';
      const title = document.createElement('h3'); title.textContent = user.name;
      const meta = document.createElement('p'); meta.textContent = `${user.company} · ${user.email} · ${user.phone}`;
      const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = user.status;
      const actions = document.createElement('div'); actions.className = 'actions';
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'secondary'; toggle.textContent = user.status === 'active' ? 'Désactiver' : 'Activer';
      toggle.addEventListener('click', async () => { try { await api('/api/admin/pro/account', jsonPost({ email: user.email, action: user.status === 'active' ? 'reject' : 'approve' })); await loadUsers(); } catch (error) { window.alert(error.message); } });
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger'; remove.textContent = 'Supprimer';
      remove.addEventListener('click', async () => { if (!window.confirm(`Supprimer le compte de ${user.email} ?`)) return; try { await api('/api/admin/pro/account', jsonPost({ email: user.email, action: 'delete' })); await loadUsers(); } catch (error) { window.alert(error.message); } });
      actions.append(toggle, remove); row.append(title, meta, badge, actions); return row;
    }));
  };
  const loadUsers = async () => { try { const { users } = await api('/api/admin/pro/users'); renderUsers(users); } catch (error) { if (error.status === 401) showLogin(); } };
  document.getElementById('adminAccountForm').addEventListener('submit', async (event) => {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button[type="submit"]'); button.disabled = true;
    const target = document.getElementById('accountStatus'); showStatus(target, 'Création du compte…');
    try { const values = formValues(form); values.action = 'create'; const result = await api('/api/admin/pro/account', jsonPost(values)); form.reset(); showStatus(target, result.message); await loadUsers(); }
    catch (error) { showStatus(target, error.message, true); }
    finally { button.disabled = false; }
  });

  const loadContacts = async () => {
    try {
      const { messages } = await api('/api/admin/contact/messages'); const list = document.getElementById('contactList');
      list.replaceChildren(...messages.map((message) => {
        const row = document.createElement('article'); row.className = 'admin-row';
        const title = document.createElement('h3'); title.textContent = `${message.subject} · ${message.name}`;
        const meta = document.createElement('p'); meta.textContent = `${message.email}${message.phone ? ` · ${message.phone}` : ''} · ${new Date(message.createdAt).toLocaleString('fr-FR')} · ${message.status || 'new'}`;
        const body = document.createElement('p'); body.textContent = message.message;
        const actions = document.createElement('div'); actions.className = 'actions';
        [['read','Marquer lu','secondary'],['archive','Archiver','secondary'],['delete','Supprimer','danger']].forEach(([action,label,cls]) => {
          const button = document.createElement('button'); button.type='button'; button.textContent=label; button.className=cls;
          button.addEventListener('click', async () => { try { await api('/api/admin/contact/messages', jsonPost({ messageRef: message.messageRef, action })); await loadContacts(); } catch (error) { window.alert(error.message); } }); actions.appendChild(button);
        });
        row.append(title, meta, body, actions); return row;
      }));
    } catch (error) { if (error.status === 401) showLogin(); }
  };
  const loadRequests = async () => {
    try {
      const { requests } = await api('/api/admin/pro/catalogue-requests'); const list = document.getElementById('catalogueRequestList');
      list.replaceChildren(...requests.map((request) => { const row=document.createElement('article');row.className='admin-row';const title=document.createElement('h3');title.textContent=`${request.catalogue} · ${request.company} · ${request.name}`;const detail=document.createElement('p');detail.textContent=`${request.email}${request.note?` · ${request.note}`:''} · ${request.status}`;row.append(title,detail);return row;}));
    } catch (error) { if (error.status === 401) showLogin(); }
  };
  const showLogin = () => { adminApp.hidden = true; loginPanel.hidden = false; };
  api('/api/admin/me').then(showApp).catch(showLogin);
})();
