(() => {
  const forms = document.getElementById('proForms');
  const account = document.getElementById('accountPanel');
  const status = document.getElementById('proStatus');
  const login = document.getElementById('loginForm');
  const catalogueRequestForm = document.getElementById('catalogueRequestForm');

  const showMessage = (target, message, isError = false) => {
    target.textContent = message;
    target.classList.toggle('error', isError);
  };
  const api = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'Le service est indisponible.');
      error.status = response.status;
      throw error;
    }
    return data;
  };
  const formData = (form) => Object.fromEntries(new FormData(form).entries());

  const renderCatalogueRequests = (requests) => {
    const list = document.getElementById('catalogueRequests');
    list.replaceChildren(...requests.map((request) => {
      const row = document.createElement('li');
      row.textContent = `${request.catalogue} · ${request.status === 'pending' ? 'En attente' : request.status === 'sent' ? 'Envoyé' : 'Clôturé'}`;
      return row;
    }));
  };

  const loadAccount = async () => {
    const { user } = await api('/api/pro/me');
    forms.hidden = true;
    account.classList.add('visible');
    document.getElementById('accountWelcome').textContent = `${user.name} · ${user.company}`;
    const [{ documents }, { requests }] = await Promise.all([
      api('/api/pro/documents'), api('/api/pro/catalogue-requests'),
    ]);
    const list = document.getElementById('documentsList');
    list.replaceChildren(...documents.map((document) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = document.url;
      link.textContent = document.name;
      link.setAttribute('download', '');
      item.append(link);
      return item;
    }));
    document.getElementById('noDocuments').hidden = documents.length > 0;
    renderCatalogueRequests(requests);
    showMessage(status, 'Vous êtes connecté.');
    if (window.location.hash === '#downloads') document.getElementById('downloads').scrollIntoView({ behavior: 'smooth' });
  };

  login.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = login.querySelector('button[type="submit"]');
    button.disabled = true;
    showMessage(status, 'Connexion…');
    try {
      const result = await api('/api/pro/login', { method: 'POST', body: JSON.stringify(formData(login)) });
      login.reset();
      if (result.role === 'admin') {
        window.location.href = '/admin-cbk.html';
        return;
      }
      await loadAccount();
    } catch (error) {
      showMessage(status, error.message, true);
    } finally { button.disabled = false; }
  });

  catalogueRequestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = catalogueRequestForm.querySelector('button[type="submit"]');
    button.disabled = true;
    showMessage(status, 'Envoi de votre demande…');
    try {
      const result = await api('/api/pro/catalogue-requests', { method: 'POST', body: JSON.stringify(formData(catalogueRequestForm)) });
      catalogueRequestForm.reset();
      const { requests } = await api('/api/pro/catalogue-requests');
      renderCatalogueRequests(requests);
      showMessage(status, `${result.message} Référence ${result.requestRef}.`);
    } catch (error) { showMessage(status, error.message, true); }
    finally { button.disabled = false; }
  });

  document.getElementById('logoutButton').addEventListener('click', async () => {
    try {
      await api('/api/pro/logout', { method: 'POST', body: '{}' });
      account.classList.remove('visible');
      forms.hidden = false;
      showMessage(status, 'Vous êtes déconnecté.');
    } catch (error) { showMessage(status, error.message, true); }
  });

  loadAccount().catch((error) => {
    if (error.status !== 401) showMessage(status, error.message, true);
    if (window.location.hash === '#downloads') {
      login.scrollIntoView({ behavior: 'smooth' });
      if (error.status === 401) showMessage(status, 'Connectez-vous pour consulter les catalogues et fiches techniques.');
    }
  });
})();
