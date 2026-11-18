const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const mysql = require('mysql2/promise');

const scrypt = promisify(crypto.scrypt);
const documentRoot = path.join(__dirname, 'documents', 'pro');
const localStorePath = path.join(__dirname, '.local-data', 'pro-users.json');
const localOrdersPath = path.join(__dirname, '.local-data', 'shop-orders.json');
const localMessagesPath = path.join(__dirname, '.local-data', 'contact-messages.json');
const localFavoritesPath = path.join(__dirname, '.local-data', 'shop-favorites.json');
const localProRequestsPath = path.join(__dirname, '.local-data', 'pro-catalogue-requests.json');
const localCataloguePath = path.join(__dirname, '.local-data', 'catalogue-entries.json');
const localBrandsPath = path.join(__dirname, '.local-data', 'catalogue-brands.json');
const catalogueSeedPath = path.join(__dirname, 'catalogue-content.json');
const productImageRoot = path.join(__dirname, 'product-images');
const sessionCookie = 'cbk_pro_session';
const adminSessionCookie = 'cbk_admin_session';
const maxBodyBytes = 12 * 1024;
const limits = new Map();
let pool;
let schemaPromise;
let localUsers;
let localOrders;
let localMessages;
let localFavorites;
let localProRequests;
let localCatalogue;
let localBrands;
const localSessions = new Map();
const adminSessions = new Map();

const orderCatalog = new Map([
  ['ab|aura', 'Carrelage'], ['ab|tessino', 'Carrelage'],
  ['rocersa|omega', 'Carrelage'], ['rocersa|bosland', 'Carrelage'], ['rocersa|stonehenge', 'Carrelage'],
  ['kale|silver river', 'Carrelage'], ['kale|onyx gold', 'Carrelage'],
  ['lafaenza|aesthetica', 'Carrelage'], ['ecoceramic|southwell vein', 'Carrelage'],
  ['ecoceramic|vivalto', 'Carrelage'], ['marazzi|mystone travertino', 'Carrelage'], ['marazzi|book match', 'Carrelage'],
  ['jaquar|cuvettes suspendues rimless', 'Sanitaire'], ['jaquar|vasques à poser', 'Sanitaire'],
  ['artize|vasques à poser artize', 'Sanitaire'], ['jaquar|shower panels', 'Robinetterie'],
  ['jaquar|douches de tête', 'Robinetterie'], ['jaquar|chasses encastrées & plaques', 'Sanitaire'],
]);

function isLocalMode() {
  return process.env.NODE_ENV !== 'production' &&
    !process.env.DB_HOST && !process.env.DB_USER && !process.env.DB_PASSWORD && !process.env.DB_NAME;
}

async function readLocalUsers() {
  if (localUsers) return localUsers;
  try {
    localUsers = JSON.parse(await fs.promises.readFile(localStorePath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    localUsers = [];
  }
  return localUsers;
}

async function saveLocalUsers() {
  const directory = path.dirname(localStorePath);
  await fs.promises.mkdir(directory, { recursive: true, mode: 0o700 });
  const temporaryPath = `${localStorePath}.tmp`;
  await fs.promises.writeFile(temporaryPath, JSON.stringify(localUsers, null, 2), { mode: 0o600 });
  await fs.promises.rename(temporaryPath, localStorePath);
}

async function readLocalOrders() {
  if (localOrders) return localOrders;
  try { localOrders = JSON.parse(await fs.promises.readFile(localOrdersPath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    localOrders = [];
  }
  return localOrders;
}

async function saveLocalOrders() {
  const directory = path.dirname(localOrdersPath);
  await fs.promises.mkdir(directory, { recursive: true, mode: 0o700 });
  const temporaryPath = `${localOrdersPath}.tmp`;
  await fs.promises.writeFile(temporaryPath, JSON.stringify(localOrders, null, 2), { mode: 0o600 });
  await fs.promises.rename(temporaryPath, localOrdersPath);
}

async function readLocalMessages() {
  if (localMessages) return localMessages;
  try { localMessages = JSON.parse(await fs.promises.readFile(localMessagesPath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    localMessages = [];
  }
  return localMessages;
}

async function saveLocalMessages() {
  const directory = path.dirname(localMessagesPath);
  await fs.promises.mkdir(directory, { recursive: true, mode: 0o700 });
  const temporaryPath = `${localMessagesPath}.tmp`;
  await fs.promises.writeFile(temporaryPath, JSON.stringify(localMessages, null, 2), { mode: 0o600 });
  await fs.promises.rename(temporaryPath, localMessagesPath);
}

async function readLocalFavorites() {
  if (localFavorites) return localFavorites;
  try { localFavorites = JSON.parse(await fs.promises.readFile(localFavoritesPath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    localFavorites = {};
  }
  return localFavorites;
}

async function saveLocalFavorites() {
  const directory = path.dirname(localFavoritesPath);
  await fs.promises.mkdir(directory, { recursive: true, mode: 0o700 });
  const temporaryPath = `${localFavoritesPath}.tmp`;
  await fs.promises.writeFile(temporaryPath, JSON.stringify(localFavorites, null, 2), { mode: 0o600 });
  await fs.promises.rename(temporaryPath, localFavoritesPath);
}

async function readLocalProRequests() {
  if (localProRequests) return localProRequests;
  try { localProRequests = JSON.parse(await fs.promises.readFile(localProRequestsPath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; localProRequests = []; }
  return localProRequests;
}

async function saveLocalProRequests() {
  const directory = path.dirname(localProRequestsPath);
  await fs.promises.mkdir(directory, { recursive: true, mode: 0o700 });
  const temporaryPath = `${localProRequestsPath}.tmp`;
  await fs.promises.writeFile(temporaryPath, JSON.stringify(localProRequests, null, 2), { mode: 0o600 });
  await fs.promises.rename(temporaryPath, localProRequestsPath);
}

async function readLocalCatalogue() {
  if (localCatalogue) return localCatalogue;
  try { localCatalogue = JSON.parse(await fs.promises.readFile(localCataloguePath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    localCatalogue = JSON.parse(await fs.promises.readFile(catalogueSeedPath, 'utf8'));
  }
  localCatalogue.filter((entry) => entry.kind === 'product' && entry.active !== false).forEach((entry) => {
    orderCatalog.set(`${entry.brand.toLowerCase()}|${entry.name.toLowerCase()}`, entry.universe);
  });
  return localCatalogue;
}

async function saveLocalCatalogue() {
  const directory = path.dirname(localCataloguePath);
  await fs.promises.mkdir(directory, { recursive: true, mode: 0o700 });
  const temporaryPath = `${localCataloguePath}.tmp`;
  await fs.promises.writeFile(temporaryPath, JSON.stringify(localCatalogue, null, 2), { mode: 0o600 });
  await fs.promises.rename(temporaryPath, localCataloguePath);
}

async function readLocalBrands() {
  if (localBrands) return localBrands;
  try { localBrands = JSON.parse(await fs.promises.readFile(localBrandsPath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const catalogue = await readLocalCatalogue();
    const brands = new Map();
    catalogue.filter((entry) => entry.kind === 'product' && entry.brand).forEach((entry) => {
      const slug = slugify(entry.brand);
      if (!brands.has(slug)) brands.set(slug, { slug, name: entry.brand, description: '', image: '', active: true });
    });
    localBrands = [...brands.values()];
  }
  return localBrands;
}

async function saveLocalBrands() {
  const directory = path.dirname(localBrandsPath);
  await fs.promises.mkdir(directory, { recursive: true, mode: 0o700 });
  const temporaryPath = `${localBrandsPath}.tmp`;
  await fs.promises.writeFile(temporaryPath, JSON.stringify(localBrands, null, 2), { mode: 0o600 });
  await fs.promises.rename(temporaryPath, localBrandsPath);
}

function slugify(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180);
}

function validateCatalogueEntry(body) {
  const kind = ['product', 'collection'].includes(body.kind) ? body.kind : '';
  const universe = ['Carrelage', 'Sanitaire', 'Robinetterie'].includes(body.universe) ? body.universe : '';
  const name = String(body.name || '').trim();
  const brand = String(body.brand || '').trim().slice(0, 100);
  const description = String(body.description || '').trim().slice(0, 3000);
  const format = String(body.format || '').trim().slice(0, 160);
  const effect = String(body.effect || '').trim().slice(0, 100);
  const finish = String(body.finish || '').trim().slice(0, 160);
  const category = String(body.category || '').trim().slice(0, 100);
  const image = String(body.image || '').trim();
  const slug = slugify(String(body.slug || `${kind}-${universe}-${name}`));
  const collectionSlug = kind === 'product' ? slugify(String(body.collectionSlug || '')) : '';
  const price = body.price === '' || body.price == null ? null : Number(body.price);
  const stock = body.stock == null || body.stock === '' ? null : Number.parseInt(body.stock, 10);
  const link = (String(body.link || '').trim() || (kind === 'collection' ? `/collection.html?slug=${encodeURIComponent(slug)}` : '')).slice(0, 255);
  const productSheet = kind === 'product' && !link ? `/produit.html?slug=${encodeURIComponent(slug)}` : link;
  if (!kind || !universe || name.length < 2 || name.length > 180 || !slug ||
      (image && !/^\/product-images\/[a-z0-9-]+\.(?:jpg|png|webp)$/i.test(image)) ||
      (link && !/^\/(?!\/)[A-Za-z0-9._/?#=&%-]*$/.test(link)) ||
      (price != null && (!Number.isFinite(price) || price < 0 || price > 10000000)) ||
      (stock != null && (!Number.isInteger(stock) || stock < 0 || stock > 10000000))) {
    const error = new Error('Vérifiez le type, univers, nom, image, prix et stock.'); error.status = 400; throw error;
  }
  return { slug, kind, universe, name, brand, description, format, effect, finish, category, image, link: productSheet, collectionSlug, price, stock,
    active: body.active !== false && body.active !== 'false', featured: body.featured === true || body.featured === 'on' || body.featured === 'true' };
}

function validateCatalogueBrand(body) {
  const name = String(body.name || '').trim().slice(0, 100);
  const slug = slugify(String(body.slug || name));
  const description = String(body.description || '').trim().slice(0, 1000);
  const image = String(body.image || '').trim();
  if (name.length < 2 || !slug || (image && !/^\/product-images\/[a-z0-9-]+\.(?:jpg|png|webp)$/i.test(image))) {
    const error = new Error('Vérifiez le nom et le logo de la marque.'); error.status = 400; throw error;
  }
  return { slug, name, description, image, active: body.active !== false && body.active !== 'false' };
}

async function storeAdminAsset(body) {
  const mime = String(body.mime || '');
  const data = String(body.data || '');
  const allowed = { 'image/jpeg': ['jpg', productImageRoot], 'image/png': ['png', productImageRoot], 'image/webp': ['webp', productImageRoot], 'application/pdf': ['pdf', documentRoot] };
  if (!allowed[mime] || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
    const error = new Error('Format de fichier non pris en charge.'); error.status = 400; throw error;
  }
  const bytes = Buffer.from(data, 'base64');
  const maxBytes = mime === 'application/pdf' ? 12 * 1024 * 1024 : 4 * 1024 * 1024;
  if (!bytes.length || bytes.length > maxBytes) {
    const error = new Error('Le fichier dépasse la taille autorisée.'); error.status = 413; throw error;
  }
  if (mime === 'image/jpeg' && !bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ||
      mime === 'image/png' && !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ||
      mime === 'image/webp' && (bytes.subarray(0, 4).toString() !== 'RIFF' || bytes.subarray(8, 12).toString() !== 'WEBP') ||
      mime === 'application/pdf' && bytes.subarray(0, 5).toString() !== '%PDF-') {
    const error = new Error('Le contenu ne correspond pas au type de fichier annoncé.'); error.status = 400; throw error;
  }
  const [extension, directory] = allowed[mime];
  await fs.promises.mkdir(directory, { recursive: true, mode: 0o755 });
  const fileName = `${crypto.randomUUID()}.${extension}`;
  await fs.promises.writeFile(path.join(directory, fileName), bytes, { flag: 'wx', mode: 0o644 });
  return mime === 'application/pdf' ? { name: fileName, url: `/api/pro/documents/${encodeURIComponent(fileName)}` } : { name: fileName, url: `/product-images/${fileName}` };
}

function validateProAccount(body) {
  const name = String(body.name || '').trim();
  const company = String(body.company || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').trim();
  const password = String(body.password || '');
  if (name.length < 2 || name.length > 120 || company.length < 2 || company.length > 160 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190 ||
      phone.length < 6 || phone.length > 40 || password.length < 12 || password.length > 200 || body.consent !== 'on') {
    const error = new Error('Vérifiez les coordonnées, le mot de passe (12 caractères minimum) et la confirmation de consentement.'); error.status = 400; throw error;
  }
  return { name, company, email, phone, password };
}

function validateCatalogueRequest(body) {
  const catalogue = String(body.catalogue || '').trim();
  const note = String(body.note || '').trim();
  if (!['Carrelage', 'Sanitaire', 'Robinetterie', 'Catalogue général'].includes(catalogue) || note.length > 1000) {
    const error = new Error('Choisissez un catalogue et vérifiez votre message.'); error.status = 400; throw error;
  }
  return { catalogue, note };
}

function authorizedAdmin(request) {
  const sessionToken = cookieValue(request, adminSessionCookie);
  const session = /^[a-f0-9]{64}$/.test(sessionToken) ? adminSessions.get(crypto.createHash('sha256').update(sessionToken).digest('hex')) : null;
  if (session && session.expiresAt > Date.now()) return true;
  if (session) adminSessions.delete(crypto.createHash('sha256').update(sessionToken).digest('hex'));
  return false;
}

function setAdminSessionCookie(response, token, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${adminSessionCookie}=${encodeURIComponent(token)}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`);
}

function validateFavoritePayload(body) {
  const visitorId = String(body?.visitorId || '');
  if (!/^[a-f0-9-]{36}$/i.test(visitorId)) {
    const error = new Error('Identifiant de favoris invalide.'); error.status = 400; throw error;
  }
  if (!Array.isArray(body.favorites) || body.favorites.length > 100 || body.favorites.some((item) => {
    const favorite = typeof item === 'string' ? { name: item } : item;
    return !favorite || typeof favorite !== 'object' || typeof favorite.name !== 'string' || !favorite.name.trim() || favorite.name.length > 180 ||
      (favorite.brand != null && (typeof favorite.brand !== 'string' || favorite.brand.length > 80)) ||
      (favorite.universe != null && (typeof favorite.universe !== 'string' || favorite.universe.length > 40)) ||
      (favorite.variant != null && (typeof favorite.variant !== 'string' || favorite.variant.length > 240)) ||
      (favorite.image != null && (typeof favorite.image !== 'string' || (favorite.image && !/^\/product-images\/[a-z0-9-]+\.(?:jpg|png|webp)$/i.test(favorite.image))));
  })) {
    const error = new Error('Liste de favoris invalide.'); error.status = 400; throw error;
  }
  const unique = new Map();
  body.favorites.forEach((raw) => {
    const item = typeof raw === 'string' ? { name: raw.trim() } : raw;
    unique.set(item.name.trim(), {
      name: item.name.trim(), brand: String(item.brand || '').trim().slice(0, 80),
      universe: String(item.universe || '').trim().slice(0, 40), variant: String(item.variant || '').trim().slice(0, 240),
      image: String(item.image || ''),
    });
  });
  return { visitorId, favorites: [...unique.values()] };
}

function validateContact(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const error = new Error('Contenu du message invalide.'); error.status = 400; throw error;
  }
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').trim();
  const subject = String(body.subject || '').trim();
  const message = String(body.message || '').trim();
  const subjects = ['Carrelage', 'Sanitaire', 'Robinetterie', 'Mon projet', 'Autre demande'];
  if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190 ||
      (phone && (phone.length < 6 || phone.length > 40)) || !subjects.includes(subject) ||
      message.length < 10 || message.length > 4000 || body.consent !== 'on') {
    const error = new Error('Vérifiez vos coordonnées, le sujet, le message et votre consentement.'); error.status = 400; throw error;
  }
  return { name, email, phone, subject, message };
}

function newMessageRef() {
  return `CBK-MSG-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

function validateOrder(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const error = new Error('Contenu de commande invalide.');
    error.status = 400;
    throw error;
  }
  const customer = body.customer || {};
  const name = String(customer.name || '').trim();
  const phone = String(customer.phone || '').trim();
  const email = String(customer.email || '').trim().toLowerCase();
  if (name.length < 2 || name.length > 120 || phone.length < 6 || phone.length > 40 ||
      (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190)) || body.consent !== 'on') {
    const error = new Error('Vérifiez vos coordonnées et acceptez l’information sur le traitement des données.');
    error.status = 400;
    throw error;
  }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) {
    const error = new Error('Le panier doit contenir de 1 à 20 produits.');
    error.status = 400;
    throw error;
  }
  const items = body.items.map((raw) => {
    raw = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const brand = String(raw.brand || '').trim().slice(0, 80);
    const productName = String(raw.name || '').trim().slice(0, 120);
    const universe = orderCatalog.get(`${brand.toLowerCase()}|${productName.toLowerCase()}`);
    const quantity = Number(raw.quantity);
    if (!universe || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      const error = new Error('Un produit ou une quantité du panier est invalide.');
      error.status = 400;
      throw error;
    }
    return { name: productName, brand, universe, variant: String(raw.variant || '').trim().slice(0, 160), quantity };
  });
  return { customer: { name, phone, email }, items };
}

function newOrderRef() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `CBK-${date}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function authenticatedLocalUser(request) {
  const token = cookieValue(request, sessionCookie);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const session = localSessions.get(tokenHash);
  if (!session || session.expiresAt <= Date.now()) {
    localSessions.delete(tokenHash);
    return null;
  }
  const users = await readLocalUsers();
  return users.find((user) => user.id === session.userId && user.status === 'active') || null;
}

function getPool() {
  if (pool) return pool;
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    const error = new Error('Le service Espace Pro attend sa configuration MySQL dans Hostinger.');
    error.status = 503;
    throw error;
  }
  pool = mysql.createPool({
    host: DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    charset: 'utf8mb4',
    timezone: 'Z',
    enableKeepAlive: true,
  });
  return pool;
}

async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const db = getPool();
      await db.execute(`CREATE TABLE IF NOT EXISTS pro_users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        company VARCHAR(160) NOT NULL,
        email VARCHAR(190) NOT NULL UNIQUE,
        phone VARCHAR(40) NOT NULL,
        password_hash VARBINARY(64) NOT NULL,
        password_salt BINARY(16) NOT NULL,
        privacy_consent_at TIMESTAMP NOT NULL,
        privacy_notice_version VARCHAR(40) NOT NULL,
        status ENUM('pending','active','rejected') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX pro_users_status_idx (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await db.execute(`CREATE TABLE IF NOT EXISTS pro_sessions (
        token_hash BINARY(32) NOT NULL PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX pro_sessions_expiry_idx (expires_at),
        CONSTRAINT pro_sessions_user_fk FOREIGN KEY (user_id) REFERENCES pro_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await db.execute(`CREATE TABLE IF NOT EXISTS pro_catalogue_requests (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        catalogue VARCHAR(40) NOT NULL,
        note VARCHAR(1000) NOT NULL DEFAULT '',
        status ENUM('pending','sent','closed') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX pro_catalogue_requests_created_idx (created_at),
        CONSTRAINT pro_catalogue_requests_user_fk FOREIGN KEY (user_id) REFERENCES pro_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await db.execute(`CREATE TABLE IF NOT EXISTS shop_orders (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        order_ref VARCHAR(24) NOT NULL UNIQUE,
        customer_name VARCHAR(120) NOT NULL,
        customer_phone VARCHAR(40) NOT NULL,
        customer_email VARCHAR(190) NULL,
        items_json JSON NOT NULL,
        status ENUM('pending','processing','completed','cancelled') NOT NULL DEFAULT 'pending',
        privacy_consent_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX shop_orders_status_idx (status),
        INDEX shop_orders_created_idx (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await db.execute(`CREATE TABLE IF NOT EXISTS contact_messages (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        message_ref VARCHAR(32) NOT NULL UNIQUE,
        customer_name VARCHAR(120) NOT NULL,
        customer_email VARCHAR(190) NOT NULL,
        customer_phone VARCHAR(40) NULL,
        subject VARCHAR(40) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('new','read','archived') NOT NULL DEFAULT 'new',
        privacy_consent_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX contact_messages_created_idx (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      const [contactStatusColumn] = await db.execute("SHOW COLUMNS FROM contact_messages LIKE 'status'");
      if (!contactStatusColumn.length) await db.execute("ALTER TABLE contact_messages ADD COLUMN status ENUM('new','read','archived') NOT NULL DEFAULT 'new'");
      await db.execute(`CREATE TABLE IF NOT EXISTS shop_favorites (
        visitor_id CHAR(36) NOT NULL PRIMARY KEY,
        favorites_json JSON NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await db.execute(`CREATE TABLE IF NOT EXISTS catalogue_entries (
        slug VARCHAR(180) NOT NULL PRIMARY KEY,
        kind ENUM('product','collection') NOT NULL,
        universe VARCHAR(40) NOT NULL,
        name VARCHAR(180) NOT NULL,
        brand VARCHAR(100) NOT NULL DEFAULT '',
        description TEXT NOT NULL,
        format VARCHAR(160) NOT NULL DEFAULT '',
        effect VARCHAR(100) NOT NULL DEFAULT '',
        finish VARCHAR(160) NOT NULL DEFAULT '',
        category VARCHAR(100) NOT NULL DEFAULT '',
        image VARCHAR(255) NOT NULL DEFAULT '',
        link VARCHAR(255) NOT NULL DEFAULT '',
        collection_slug VARCHAR(180) NULL,
        price DECIMAL(12,2) NULL,
        stock INT UNSIGNED NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        featured TINYINT(1) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX catalogue_public_idx (kind, universe, active, featured)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await db.execute(`CREATE TABLE IF NOT EXISTS catalogue_brands (
        slug VARCHAR(180) NOT NULL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(1000) NOT NULL DEFAULT '',
        image VARCHAR(255) NOT NULL DEFAULT '',
        active TINYINT(1) NOT NULL DEFAULT 1,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      const [entryLinkColumn] = await db.execute("SHOW COLUMNS FROM catalogue_entries LIKE 'link'");
      if (!entryLinkColumn.length) await db.execute("ALTER TABLE catalogue_entries ADD COLUMN link VARCHAR(255) NOT NULL DEFAULT '' AFTER image");
      const [entryCollectionColumn] = await db.execute("SHOW COLUMNS FROM catalogue_entries LIKE 'collection_slug'");
      if (!entryCollectionColumn.length) {
        await db.execute('ALTER TABLE catalogue_entries ADD COLUMN collection_slug VARCHAR(180) NULL AFTER link');
        await db.execute("UPDATE catalogue_entries SET collection_slug = 'collection-carrelage-aura' WHERE slug = 'product-carrelage-aura'");
      }
      await db.execute("UPDATE catalogue_entries p JOIN catalogue_entries c ON c.kind = 'collection' AND LOWER(c.name) = LOWER(p.name) AND c.brand = p.brand SET p.collection_slug = c.slug WHERE p.kind = 'product' AND p.collection_slug IS NULL");
      await db.execute("UPDATE catalogue_entries SET link = CONCAT('/produit.html?slug=', slug) WHERE kind = 'product' AND (link = '' OR link = '#') AND slug <> 'product-carrelage-aura'");
      const [entryStockColumn] = await db.execute("SHOW COLUMNS FROM catalogue_entries LIKE 'stock'");
      if (entryStockColumn[0] && entryStockColumn[0].Null !== 'YES') await db.execute('ALTER TABLE catalogue_entries MODIFY stock INT UNSIGNED NULL');
      const seedEntries = JSON.parse(await fs.promises.readFile(catalogueSeedPath, 'utf8'));
      const seedBrands = new Map();
      seedEntries.filter((entry) => entry.kind === 'product' && entry.brand).forEach((entry) => {
        const slug = slugify(entry.brand);
        if (slug && !seedBrands.has(slug)) seedBrands.set(slug, entry.brand);
      });
      for (const [slug, name] of seedBrands) await db.execute('INSERT IGNORE INTO catalogue_brands (slug, name) VALUES (?, ?)', [slug, name]);
      for (const entry of seedEntries) {
        await db.execute(
          'INSERT IGNORE INTO catalogue_entries (slug, kind, universe, name, brand, description, format, effect, finish, category, image, link, collection_slug, price, stock, active, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [entry.slug, entry.kind, entry.universe, entry.name, entry.brand || '', entry.description || '', entry.format || '', entry.effect || '', entry.finish || '', entry.category || '', entry.image || '', entry.link || '', entry.collectionSlug || null, entry.price ?? null, entry.stock ?? null, entry.active === false ? 0 : 1, entry.featured ? 1 : 0],
        );
      }
      for (const entry of seedEntries) {
        if (entry.kind === 'product' && entry.collectionSlug) await db.execute('UPDATE catalogue_entries SET collection_slug = ? WHERE slug = ?', [entry.collectionSlug, entry.slug]);
      }
      await db.execute("UPDATE catalogue_entries p JOIN catalogue_entries c ON c.kind = 'collection' AND LOWER(c.name) = LOWER(p.name) AND c.brand = p.brand SET p.collection_slug = c.slug WHERE p.kind = 'product' AND p.collection_slug IS NULL");
      await db.execute("UPDATE catalogue_entries SET link = CONCAT('/produit.html?slug=', slug) WHERE kind = 'product' AND (link = '' OR link = '#') AND slug <> 'product-carrelage-aura'");
      const [catalogueRows] = await db.execute('SELECT brand, name, universe FROM catalogue_entries WHERE kind = \'product\' AND active = 1');
      catalogueRows.forEach((entry) => orderCatalog.set(`${entry.brand.toLowerCase()}|${entry.name.toLowerCase()}`, entry.universe));
    })().catch((error) => {
      schemaPromise = undefined;
      throw error;
    });
  }
  return schemaPromise;
}

function json(response, status, value, extraHeaders = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  response.end(JSON.stringify(value));
}

async function readJson(request, maxBytes = maxBodyBytes) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBytes) {
      const error = new Error('Requête trop volumineuse.');
      error.status = 413;
      throw error;
    }
  }
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    const error = new Error('Format de requête invalide.');
    error.status = 400;
    throw error;
  }
}

function rateLimit(request, response, key, max = 8, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const ip = request.socket.remoteAddress || 'unknown';
  const bucketKey = `${key}:${ip}`;
  const bucket = limits.get(bucketKey);
  if (!bucket || bucket.until <= now) {
    limits.set(bucketKey, { count: 1, until: now + windowMs });
    return false;
  }
  bucket.count += 1;
  if (bucket.count <= max) return false;
  json(response, 429, { error: 'Trop de tentatives. Réessayez plus tard.' }, {
    'Retry-After': String(Math.max(1, Math.ceil((bucket.until - now) / 1000))),
  });
  return true;
}

function cookieValue(request, name) {
  const prefix = `${name}=`;
  const entry = (request.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : '';
}

function setSessionCookie(response, token, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${sessionCookie}=${encodeURIComponent(token)}; Path=/api/pro; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`);
}

function equalSecret(left, right) {
  const a = Buffer.from(left || '');
  const b = Buffer.from(right || '');
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function matchesAdminCredentials(email, password) {
  const expectedEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const expectedPassword = String(process.env.ADMIN_PASSWORD || '');
  return Boolean(expectedEmail && expectedPassword && equalSecret(String(email || '').trim().toLowerCase(), expectedEmail) && equalSecret(String(password || ''), expectedPassword));
}

function createAdminSession(response) {
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(crypto.createHash('sha256').update(token).digest('hex'), { expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
  setAdminSessionCookie(response, token, 8 * 60 * 60);
}

function requireSameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return;
  const expectedHost = request.headers.host;
  let originHost;
  try { originHost = new URL(origin).host; } catch {}
  if (!expectedHost || originHost !== expectedHost) {
    const error = new Error('Origine de requête refusée.');
    error.status = 403;
    throw error;
  }
}

async function authenticatedUser(request) {
  const token = cookieValue(request, sessionCookie);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  await ensureSchema();
  const hash = crypto.createHash('sha256').update(token).digest();
  const [rows] = await getPool().execute(
    `SELECT u.id, u.name, u.company, u.email, u.phone, u.status
     FROM pro_sessions s JOIN pro_users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()`,
    [hash],
  );
  return rows[0] || null;
}

async function handleDocument(request, response, pathname, authenticate = authenticatedUser) {
  const user = await authenticate(request);
  if (!user || user.status !== 'active') return json(response, 401, { error: 'Connexion professionnelle requise.' });

  let name;
  try { name = decodeURIComponent(pathname.slice('/api/pro/documents/'.length)); } catch {
    return json(response, 400, { error: 'Nom de fichier invalide.' });
  }
  if (!name || path.basename(name) !== name || !/^[\p{L}\p{N}._ -]+\.pdf$/iu.test(name)) {
    return json(response, 400, { error: 'Nom de fichier invalide.' });
  }
  const filePath = path.resolve(documentRoot, name);
  if (!filePath.startsWith(`${documentRoot}${path.sep}`)) return json(response, 403, { error: 'Accès refusé.' });
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) return json(response, 404, { error: 'Document introuvable.' });
    response.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': stats.size,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.method === 'HEAD') return response.end();
    fs.createReadStream(filePath).pipe(response);
  });
}

async function handleLocalApi(request, response, pathname) {
  try {
    if (pathname === '/api/catalogue/brands') {
      if (request.method !== 'GET') return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'GET' });
      const [brands, catalogue] = await Promise.all([readLocalBrands(), readLocalCatalogue()]);
      const publicBrands = brands.filter((brand) => brand.active !== false).map((brand) => ({
        ...brand,
        universes: [...new Set(catalogue.filter((entry) => entry.kind === 'product' && entry.brand === brand.name && entry.active !== false).map((entry) => entry.universe))],
      }));
      return json(response, 200, { brands: publicBrands });
    }
    if (pathname === '/api/admin/catalogue/brands') {
      if (!['GET', 'POST'].includes(request.method)) return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'GET, POST' });
      if (!authorizedAdmin(request)) return json(response, 401, { error: 'Accès administrateur refusé.' });
      const brands = await readLocalBrands();
      if (request.method === 'GET') return json(response, 200, { brands });
      requireSameOrigin(request);
      const body = await readJson(request);
      if (body.action === 'delete') {
        const index = brands.findIndex((brand) => brand.slug === body.slug);
        if (index < 0) return json(response, 404, { error: 'Marque introuvable.' });
        const catalogue = await readLocalCatalogue();
        if (catalogue.some((entry) => entry.kind === 'product' && entry.brand === brands[index].name)) return json(response, 409, { error: 'Cette marque est encore associée à un produit.' });
        brands.splice(index, 1); await saveLocalBrands();
        return json(response, 200, { message: 'Marque supprimée.' });
      }
      const brand = validateCatalogueBrand(body);
      const index = brands.findIndex((item) => item.slug === brand.slug);
      const oldName = index >= 0 ? brands[index].name : '';
      if (index < 0) brands.unshift(brand); else brands[index] = brand;
      if (oldName && oldName !== brand.name) {
        const catalogue = await readLocalCatalogue();
        catalogue.forEach((entry) => {
          if (entry.kind !== 'product' || entry.brand !== oldName) return;
          orderCatalog.delete(`${oldName.toLowerCase()}|${entry.name.toLowerCase()}`);
          entry.brand = brand.name;
          orderCatalog.set(`${brand.name.toLowerCase()}|${entry.name.toLowerCase()}`, entry.universe);
        });
        await saveLocalCatalogue();
      }
      await saveLocalBrands();
      return json(response, 200, { brand, message: 'Marque enregistrée.' });
    }
    if (pathname === '/api/catalogue/entries') {
      if (request.method !== 'GET') return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'GET' });
      const query = new URL(request.url, 'http://localhost').searchParams;
      let entries = (await readLocalCatalogue()).filter((entry) => entry.active !== false);
      if (query.has('slug')) entries = entries.filter((entry) => entry.slug === query.get('slug'));
      if (query.has('kind')) entries = entries.filter((entry) => entry.kind === query.get('kind'));
      if (query.has('universe')) entries = entries.filter((entry) => entry.universe === query.get('universe'));
      if (query.has('collectionSlug')) entries = entries.filter((entry) => entry.collectionSlug === query.get('collectionSlug'));
      if (query.get('featured') === 'true') entries = entries.filter((entry) => entry.featured);
      return json(response, 200, { entries: entries.map((entry) => ({ ...entry, image: entry.image || '', img: entry.image || '', fmt: entry.format || '', page: entry.link || '#' })) });
    }
    if (pathname === '/api/admin/catalogue/entries') {
      if (!['GET', 'POST'].includes(request.method)) return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'GET, POST' });
      if (!authorizedAdmin(request)) return json(response, 401, { error: 'Accès administrateur refusé.' });
      const entries = await readLocalCatalogue();
      if (request.method === 'GET') return json(response, 200, { entries });
      requireSameOrigin(request);
      const body = await readJson(request);
      if (body.action === 'delete') {
        const index = entries.findIndex((entry) => entry.slug === body.slug);
        if (index < 0) return json(response, 404, { error: 'Entrée introuvable.' });
        if (entries[index].kind === 'product') orderCatalog.delete(`${entries[index].brand.toLowerCase()}|${entries[index].name.toLowerCase()}`);
        if (entries[index].kind === 'collection' && entries.some((entry) => entry.kind === 'product' && entry.collectionSlug === entries[index].slug)) return json(response, 409, { error: 'Cette collection contient des produits. Réaffectez-les avant de la supprimer.' });
        entries.splice(index, 1); await saveLocalCatalogue();
        return json(response, 200, { message: 'Entrée supprimée.' });
      }
      const entry = validateCatalogueEntry(body);
      const index = entries.findIndex((item) => item.slug === entry.slug);
      if (entry.kind === 'product' && !(await readLocalBrands()).some((brand) => brand.name === entry.brand && brand.active !== false)) return json(response, 400, { error: 'Choisissez une marque existante dans l’onglet Marques.' });
      if (entry.kind === 'product' && !entry.collectionSlug) return json(response, 400, { error: 'Associez ce produit à une collection.' });
      if (entry.kind === 'product' && entry.collectionSlug && !entries.some((item) => item.kind === 'collection' && item.slug === entry.collectionSlug)) return json(response, 400, { error: 'Choisissez une collection existante.' });
      if (index < 0) entries.unshift(entry); else entries[index] = entry;
      if (entry.kind === 'product' && entry.active) orderCatalog.set(`${entry.brand.toLowerCase()}|${entry.name.toLowerCase()}`, entry.universe);
      else if (entry.kind === 'product') orderCatalog.delete(`${entry.brand.toLowerCase()}|${entry.name.toLowerCase()}`);
      await saveLocalCatalogue();
      return json(response, 200, { entry, message: 'Contenu enregistré.' });
    }
    if (pathname === '/api/admin/assets') {
      if (!authorizedAdmin(request)) return json(response, 401, { error: 'Accès administrateur refusé.' });
      if (request.method === 'GET') {
        let names = [];
        try { names = (await fs.promises.readdir(documentRoot)).filter((name) => name.toLowerCase().endsWith('.pdf')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        return json(response, 200, { documents: names });
      }
      if (request.method !== 'POST') return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'GET, POST' });
      requireSameOrigin(request);
      const body = await readJson(request, 18 * 1024 * 1024);
      if (body.action === 'delete') {
        const name = String(body.name || '');
        if (path.basename(name) !== name || !/^[\p{L}\p{N}._ -]+\.pdf$/iu.test(name)) return json(response, 400, { error: 'Nom de PDF invalide.' });
        try { await fs.promises.unlink(path.join(documentRoot, name)); }
        catch (error) { if (error.code === 'ENOENT') return json(response, 404, { error: 'PDF introuvable.' }); throw error; }
        return json(response, 200, { message: 'PDF supprimé.' });
      }
      const asset = await storeAdminAsset(body);
      return json(response, 201, { asset });
    }
    if (pathname === '/api/admin/pro/users') {
      if (request.method !== 'GET') return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'GET' });
      if (!authorizedAdmin(request)) return json(response, 401, { error: 'Accès administrateur refusé.' });
      return json(response, 200, { users: (await readLocalUsers()).map(({ id, name, company, email, phone, status }) => ({ id, name, company, email, phone, status })) });
    }
    if (pathname === '/api/admin/contact/messages') {
      if (!['GET', 'POST'].includes(request.method)) return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'GET, POST' });
      if (!authorizedAdmin(request)) return json(response, 401, { error: 'Accès administrateur refusé.' });
      const messages = await readLocalMessages();
      if (request.method === 'GET') return json(response, 200, { messages: messages.slice(0, 200) });
      requireSameOrigin(request);
      const body = await readJson(request);
      const message = messages.find((item) => item.messageRef === body.messageRef);
      if (!message) return json(response, 404, { error: 'Message introuvable.' });
      if (body.action === 'delete') messages.splice(messages.indexOf(message), 1);
      else if (body.action === 'read' || body.action === 'archive') message.status = body.action === 'read' ? 'read' : 'archived';
      else return json(response, 400, { error: 'Action invalide.' });
      await saveLocalMessages();
      return json(response, 200, { message: 'Message mis à jour.' });
    }
    if (pathname === '/api/admin/pro/account') {
      if (request.method !== 'POST') return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'POST' });
      requireSameOrigin(request);
      if (rateLimit(request, response, 'local-admin-pro-account', 10)) return;
      if (!authorizedAdmin(request)) return json(response, 401, { error: 'Accès administrateur refusé.' });
      const body = await readJson(request);
      const users = await readLocalUsers();
      if (body.action === 'create') {
        const account = validateProAccount(body);
        if (users.some((user) => user.email === account.email)) return json(response, 409, { error: 'Cette adresse e-mail possède déjà un compte.' });
        const salt = crypto.randomBytes(16);
        const passwordHash = await scrypt(account.password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
        users.push({ id: crypto.randomUUID(), name: account.name, company: account.company, email: account.email, phone: account.phone,
          passwordHash: passwordHash.toString('hex'), salt: salt.toString('hex'), status: 'active', consentAt: new Date().toISOString() });
        await saveLocalUsers();
        return json(response, 201, { message: 'Compte professionnel créé et activé.' });
      }
      if (body.action === 'delete') {
        const email = String(body.email || '').trim().toLowerCase();
        const index = users.findIndex((entry) => entry.email === email);
        if (index < 0) return json(response, 404, { error: 'Compte introuvable.' });
        const deletedUserId = users[index].id;
        users.splice(index, 1); await saveLocalUsers();
        for (const [hash, session] of localSessions) if (session.userId === deletedUserId) localSessions.delete(hash);
        return json(response, 200, { message: 'Compte supprimé.' });
      }
      const status = body.action === 'approve' ? 'active' : body.action === 'reject' ? 'rejected' : '';
      const email = String(body.email || '').trim().toLowerCase();
      const user = users.find((entry) => entry.email === email);
      if (!status || !user) return json(response, 404, { error: 'Compte introuvable ou action invalide.' });
      user.status = status;
      await saveLocalUsers();
      return json(response, 200, { message: status === 'active' ? 'Compte activé.' : 'Compte désactivé.' });
    }
    if (pathname === '/api/admin/pro/catalogue-requests') {
      if (request.method !== 'GET') return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'GET' });
      if (rateLimit(request, response, 'local-admin-pro-requests', 20)) return;
      if (!authorizedAdmin(request)) return json(response, 401, { error: 'Accès administrateur refusé.' });
      return json(response, 200, { requests: (await readLocalProRequests()).slice(0, 200) });
    }
    if (pathname === '/api/pro/catalogue-requests') {
      if (!['GET', 'POST'].includes(request.method)) return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'GET, POST' });
      if (request.method === 'POST') requireSameOrigin(request);
      const user = await authenticatedLocalUser(request);
      if (!user) return json(response, 401, { error: 'Connexion professionnelle requise.' });
      const requests = await readLocalProRequests();
      if (request.method === 'GET') return json(response, 200, { requests: requests.filter((item) => item.userEmail === user.email) });
      if (rateLimit(request, response, 'local-pro-catalogue-request', 5)) return;
      const { catalogue, note } = validateCatalogueRequest(await readJson(request));
      const requestRef = `CBK-CAT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const entry = { requestRef, userId: user.id, userEmail: user.email, name: user.name, company: user.company, catalogue, note, status: 'pending', createdAt: new Date().toISOString() };
      requests.unshift(entry); await saveLocalProRequests();
      return json(response, 201, { requestRef, message: 'Votre demande de catalogue a été envoyée à CBK.' });
    }
    if (pathname === '/api/shop/favorites') {
      const visitorId = new URL(request.url, 'http://localhost').searchParams.get('visitor') || '';
      if (!/^[a-f0-9-]{36}$/i.test(visitorId)) return json(response, 400, { error: 'Identifiant de favoris invalide.' });
      if (request.method === 'GET') {
        const favorites = await readLocalFavorites();
        return json(response, 200, { favorites: favorites[visitorId] || [] });
      }
      if (request.method !== 'PUT') return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'GET, PUT' });
      requireSameOrigin(request);
      if (rateLimit(request, response, 'local-favorites', 30)) return;
      const payload = validateFavoritePayload(await readJson(request));
      const favorites = await readLocalFavorites();
      favorites[payload.visitorId] = payload.favorites;
      await saveLocalFavorites();
      return json(response, 200, { favorites: payload.favorites });
    }
    if (pathname === '/api/contact') {
      if (request.method !== 'POST') return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'POST' });
      requireSameOrigin(request);
      if (rateLimit(request, response, 'local-contact', 5)) return;
      const contact = validateContact(await readJson(request));
      const messages = await readLocalMessages();
      const now = new Date().toISOString();
      const messageRef = newMessageRef();
      messages.unshift({ messageRef, ...contact, privacyConsentAt: now, createdAt: now });
      await saveLocalMessages();
      return json(response, 201, { messageRef, message: 'Message enregistré. CBK vous répondra prochainement.' });
    }
    if (pathname === '/api/pro/config') {
      if (request.method !== 'GET') return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'GET' });
      return json(response, 200, { mode: 'local' });
    }
    if (pathname === '/api/shop/orders') {
      if (request.method !== 'POST') return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'POST' });
      requireSameOrigin(request);
      if (rateLimit(request, response, 'local-order', 10)) return;
      const { customer, items } = validateOrder(await readJson(request));
      const orders = await readLocalOrders();
      const now = new Date().toISOString();
      const order = { orderRef: newOrderRef(), customer, items, status: 'pending', privacyConsentAt: now, createdAt: now };
      orders.unshift(order);
      await saveLocalOrders();
      return json(response, 201, { orderRef: order.orderRef, message: 'Demande de commande enregistrée. CBK confirmera le prix et la disponibilité.' });
    }
    if (pathname === '/api/admin/shop/orders') {
      if (request.method !== 'GET') return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'GET' });
      if (rateLimit(request, response, 'local-admin-orders', 20)) return;
      if (!authorizedAdmin(request)) return json(response, 401, { error: 'Accès administrateur refusé.' });
      return json(response, 200, { orders: await readLocalOrders() });
    }
    const localAdminOrder = pathname.match(/^\/api\/admin\/shop\/orders\/(CBK-[A-F0-9-]+)$/);
    if (localAdminOrder) {
      if (request.method !== 'POST') return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'POST' });
      requireSameOrigin(request);
      if (rateLimit(request, response, 'local-admin-order-update', 10)) return;
      if (!authorizedAdmin(request)) return json(response, 401, { error: 'Accès administrateur refusé.' });
      const body = await readJson(request);
      const status = ['pending', 'processing', 'completed', 'cancelled'].includes(body.status) ? body.status : '';
      if (!status) return json(response, 400, { error: 'Statut de commande invalide.' });
      const orders = await readLocalOrders();
      const order = orders.find((entry) => entry.orderRef === localAdminOrder[1]);
      if (!order) return json(response, 404, { error: 'Commande introuvable.' });
      order.status = status;
      await saveLocalOrders();
      return json(response, 200, { message: 'Statut de commande mis à jour.' });
    }
    if (pathname.startsWith('/api/pro/documents/')) {
      if (!['GET', 'HEAD'].includes(request.method)) return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'GET, HEAD' });
      return await handleDocument(request, response, pathname, authenticatedLocalUser);
    }
    const allowed = {
      '/api/shop/favorites': ['GET', 'PUT'],
      '/api/contact': ['POST'],
      '/api/pro/login': ['POST'],
      '/api/pro/logout': ['POST'],
      '/api/pro/me': ['GET'],
      '/api/pro/documents': ['GET'],
    };
    if (!allowed[pathname]) return json(response, 404, { error: 'Service introuvable.' });
    if (!allowed[pathname].includes(request.method)) return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: allowed[pathname].join(', ') });
    if (request.method !== 'GET') requireSameOrigin(request);
    const users = await readLocalUsers();

    if (pathname === '/api/pro/login') {
      if (rateLimit(request, response, 'local-login', 8, 15 * 60 * 1000)) return;
      const body = await readJson(request);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (password.length > 200) return json(response, 400, { error: 'Identifiants invalides.' });
      if (matchesAdminCredentials(email, password)) {
        createAdminSession(response);
        return json(response, 200, { message: 'Connexion administrateur réussie.', role: 'admin' });
      }
      const user = users.find((item) => item.email === email);
      const salt = user ? Buffer.from(user.salt, 'hex') : crypto.randomBytes(16);
      const expected = user ? Buffer.from(user.passwordHash, 'hex') : Buffer.alloc(64);
      const actual = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
      if (!user || !crypto.timingSafeEqual(expected, actual)) return json(response, 401, { error: 'Adresse e-mail ou mot de passe incorrect.' });
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      localSessions.set(tokenHash, { userId: user.id, expiresAt: Date.now() + 12 * 60 * 60 * 1000 });
      setSessionCookie(response, token, 12 * 60 * 60);
      return json(response, 200, { message: 'Connexion réussie.' });
    }

    if (pathname === '/api/pro/logout') {
      const token = cookieValue(request, sessionCookie);
      if (/^[a-f0-9]{64}$/.test(token)) localSessions.delete(crypto.createHash('sha256').update(token).digest('hex'));
      setSessionCookie(response, '', 0);
      return json(response, 200, { message: 'Vous êtes déconnecté.' });
    }

    const user = await authenticatedLocalUser(request);
    if (!user) return json(response, 401, { error: 'Connexion professionnelle requise.' });
    if (pathname === '/api/pro/me') {
      return json(response, 200, { user: { name: user.name, company: user.company, email: user.email, phone: user.phone } });
    }
    if (pathname === '/api/pro/documents') {
      let files = [];
      try {
        files = (await fs.promises.readdir(documentRoot, { withFileTypes: true }))
          .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
          .map((entry) => ({ name: entry.name, url: `/api/pro/documents/${encodeURIComponent(entry.name)}` }));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      return json(response, 200, { documents: files });
    }
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('Erreur API Espace Pro locale:', error.message);
    return json(response, status, status >= 500 ? { error: 'Le service local est temporairement indisponible.' } : { error: error.message });
  }
}

async function handleApi(request, response, pathname) {
  if (pathname === '/api/pro/config' && request.method === 'GET') {
    return json(response, 200, { mode: isLocalMode() ? 'local' : 'production' });
  }
  if (pathname === '/api/admin/login') {
    if (request.method !== 'POST') return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'POST' });
    try {
      requireSameOrigin(request);
      if (rateLimit(request, response, 'admin-login', 5, 15 * 60 * 1000)) return;
      const body = await readJson(request);
      if (!matchesAdminCredentials(body.email, body.password)) return json(response, 401, { error: 'Adresse e-mail ou mot de passe administrateur incorrect.' });
      createAdminSession(response);
      return json(response, 200, { message: 'Connexion administrateur réussie.' });
    } catch (error) {
      return json(response, error.status || 500, { error: error.status ? error.message : 'Connexion impossible.' });
    }
  }
  if (pathname === '/api/admin/logout') {
    if (request.method !== 'POST') return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'POST' });
    requireSameOrigin(request);
    const token = cookieValue(request, adminSessionCookie);
    if (/^[a-f0-9]{64}$/.test(token)) adminSessions.delete(crypto.createHash('sha256').update(token).digest('hex'));
    setAdminSessionCookie(response, '', 0);
    return json(response, 200, { message: 'Vous êtes déconnecté.' });
  }
  if (pathname === '/api/admin/me') {
    if (request.method !== 'GET') return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'GET' });
    return authorizedAdmin(request) ? json(response, 200, { authenticated: true }) : json(response, 401, { error: 'Connexion administrateur requise.' });
  }
  if (isLocalMode()) return handleLocalApi(request, response, pathname);
  try {
    if (pathname.startsWith('/api/pro/documents/')) {
      if (!['GET', 'HEAD'].includes(request.method)) return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: 'GET, HEAD' });
      return await handleDocument(request, response, pathname);
    }

    const allowed = {
      '/api/catalogue/brands': ['GET'],
      '/api/catalogue/entries': ['GET'],
      '/api/admin/catalogue/brands': ['GET', 'POST'],
      '/api/admin/catalogue/entries': ['GET', 'POST'],
      '/api/admin/assets': ['GET', 'POST'],
      '/api/admin/pro/users': ['GET'],
      '/api/admin/contact/messages': ['GET', 'POST'],
      '/api/pro/login': ['POST'],
      '/api/pro/logout': ['POST'],
      '/api/pro/me': ['GET'],
      '/api/pro/documents': ['GET'],
      '/api/pro/catalogue-requests': ['GET', 'POST'],
      '/api/shop/orders': ['POST'],
      '/api/admin/shop/orders': ['GET'],
      '/api/admin/pro/account': ['POST'],
      '/api/admin/pro/catalogue-requests': ['GET'],
    };
    const adminOrderMatch = pathname.match(/^\/api\/admin\/shop\/orders\/(CBK-[A-F0-9-]+)$/);
    if (!allowed[pathname] && !adminOrderMatch) return json(response, 404, { error: 'Service introuvable.' });
    const methods = allowed[pathname] || (adminOrderMatch ? ['POST'] : []);
    if (!methods.includes(request.method)) return json(response, 405, { error: 'Méthode non autorisée.' }, { Allow: methods.join(', ') });
    if (request.method !== 'GET') requireSameOrigin(request);

    if (pathname.startsWith('/api/admin/')) {
      if (rateLimit(request, response, 'admin-account', 10, 15 * 60 * 1000)) return;
      if (!authorizedAdmin(request)) return json(response, 401, { error: 'Accès administrateur refusé.' });
    }

    await ensureSchema();
    const db = getPool();

    if (pathname === '/api/catalogue/brands') {
      const [rows] = await db.execute('SELECT b.slug, b.name, b.description, b.image, b.active, GROUP_CONCAT(DISTINCT e.universe ORDER BY e.universe SEPARATOR \'|\') AS universes FROM catalogue_brands b LEFT JOIN catalogue_entries e ON e.kind = \'product\' AND e.brand = b.name AND e.active = 1 WHERE b.active = 1 GROUP BY b.slug, b.name, b.description, b.image, b.active ORDER BY b.name');
      return json(response, 200, { brands: rows.map((brand) => ({ ...brand, active: Boolean(brand.active), universes: brand.universes ? brand.universes.split('|') : [] })) });
    }

    if (pathname === '/api/admin/catalogue/brands') {
      if (request.method === 'GET') {
        const [rows] = await db.execute('SELECT slug, name, description, image, active FROM catalogue_brands ORDER BY name');
        return json(response, 200, { brands: rows.map((brand) => ({ ...brand, active: Boolean(brand.active) })) });
      }
      const body = await readJson(request);
      if (body.action === 'delete') {
        const slug = String(body.slug || '').trim();
        const [brands] = await db.execute('SELECT name FROM catalogue_brands WHERE slug = ?', [slug]);
        if (!brands.length) return json(response, 404, { error: 'Marque introuvable.' });
        const [products] = await db.execute('SELECT COUNT(*) AS count FROM catalogue_entries WHERE kind = \'product\' AND brand = ?', [brands[0].name]);
        if (Number(products[0].count)) return json(response, 409, { error: 'Cette marque est encore associée à un produit.' });
        await db.execute('DELETE FROM catalogue_brands WHERE slug = ?', [slug]);
        return json(response, 200, { message: 'Marque supprimée.' });
      }
      const brand = validateCatalogueBrand(body);
      const [oldRows] = await db.execute('SELECT name FROM catalogue_brands WHERE slug = ?', [brand.slug]);
      await db.execute('INSERT INTO catalogue_brands (slug, name, description, image, active) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), image=VALUES(image), active=VALUES(active)', [brand.slug, brand.name, brand.description, brand.image, brand.active ? 1 : 0]);
      if (oldRows[0]?.name && oldRows[0].name !== brand.name) {
        const [products] = await db.execute('SELECT name, universe FROM catalogue_entries WHERE kind = \'product\' AND brand = ?', [oldRows[0].name]);
        await db.execute('UPDATE catalogue_entries SET brand = ? WHERE kind = \'product\' AND brand = ?', [brand.name, oldRows[0].name]);
        products.forEach((product) => {
          orderCatalog.delete(`${oldRows[0].name.toLowerCase()}|${product.name.toLowerCase()}`);
          orderCatalog.set(`${brand.name.toLowerCase()}|${product.name.toLowerCase()}`, product.universe);
        });
      }
      return json(response, 200, { brand, message: 'Marque enregistrée.' });
    }

    if (pathname === '/api/catalogue/entries') {
      const query = new URL(request.url, 'http://localhost').searchParams;
      const where = ['active = 1']; const values = [];
      if (query.has('slug')) { where.push('slug = ?'); values.push(query.get('slug')); }
      if (query.has('kind')) { where.push('kind = ?'); values.push(query.get('kind')); }
      if (query.has('universe')) { where.push('universe = ?'); values.push(query.get('universe')); }
      if (query.has('collectionSlug')) { where.push('collection_slug = ?'); values.push(query.get('collectionSlug')); }
      if (query.get('featured') === 'true') where.push('featured = 1');
      const [rows] = await db.execute(`SELECT slug, kind, universe, name, brand, description, format, effect, finish, category, image, link, collection_slug AS collectionSlug, price, stock, active, featured FROM catalogue_entries WHERE ${where.join(' AND ')} ORDER BY featured DESC, name`, values);
      return json(response, 200, { entries: rows.map((entry) => ({ ...entry, price: entry.price == null ? null : Number(entry.price), stock: Number(entry.stock), active: Boolean(entry.active), featured: Boolean(entry.featured), img: entry.image, fmt: entry.format })) });
    }

    if (pathname === '/api/admin/catalogue/entries') {
      const body = request.method === 'POST' ? await readJson(request) : null;
      if (request.method === 'GET') {
        const [rows] = await db.execute('SELECT slug, kind, universe, name, brand, description, format, effect, finish, category, image, link, collection_slug AS collectionSlug, price, stock, active, featured FROM catalogue_entries ORDER BY kind, universe, name');
        return json(response, 200, { entries: rows.map((entry) => ({ ...entry, price: entry.price == null ? null : Number(entry.price), stock: Number(entry.stock), active: Boolean(entry.active), featured: Boolean(entry.featured) })) });
      }
      if (body.action === 'delete') {
        const slug = String(body.slug || '').trim();
        const [existing] = await db.execute('SELECT brand, name, kind FROM catalogue_entries WHERE slug = ?', [slug]);
        if (existing[0]?.kind === 'collection') {
          const [related] = await db.execute('SELECT COUNT(*) AS count FROM catalogue_entries WHERE kind = \'product\' AND collection_slug = ?', [slug]);
          if (Number(related[0].count)) return json(response, 409, { error: 'Cette collection contient des produits. Réaffectez-les avant de la supprimer.' });
        }
        const [result] = await db.execute('DELETE FROM catalogue_entries WHERE slug = ?', [slug]);
        if (existing[0]?.kind === 'product') orderCatalog.delete(`${existing[0].brand.toLowerCase()}|${existing[0].name.toLowerCase()}`);
        return result.affectedRows ? json(response, 200, { message: 'Entrée supprimée.' }) : json(response, 404, { error: 'Entrée introuvable.' });
      }
      const entry = validateCatalogueEntry(body);
      if (entry.kind === 'product') {
        const [brands] = await db.execute('SELECT name FROM catalogue_brands WHERE name = ? AND active = 1 LIMIT 1', [entry.brand]);
        if (!entry.brand || !brands.length) return json(response, 400, { error: 'Choisissez une marque existante dans l’onglet Marques.' });
        if (!entry.collectionSlug) return json(response, 400, { error: 'Associez ce produit à une collection.' });
      }
      if (entry.kind === 'product' && entry.collectionSlug) {
        const [collections] = await db.execute('SELECT slug FROM catalogue_entries WHERE slug = ? AND kind = \'collection\' LIMIT 1', [entry.collectionSlug]);
        if (!collections.length) return json(response, 400, { error: 'Choisissez une collection existante.' });
      }
      await db.execute(
        'INSERT INTO catalogue_entries (slug, kind, universe, name, brand, description, format, effect, finish, category, image, link, collection_slug, price, stock, active, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE kind=VALUES(kind), universe=VALUES(universe), name=VALUES(name), brand=VALUES(brand), description=VALUES(description), format=VALUES(format), effect=VALUES(effect), finish=VALUES(finish), category=VALUES(category), image=VALUES(image), link=VALUES(link), collection_slug=VALUES(collection_slug), price=VALUES(price), stock=VALUES(stock), active=VALUES(active), featured=VALUES(featured)',
        [entry.slug, entry.kind, entry.universe, entry.name, entry.brand, entry.description, entry.format, entry.effect, entry.finish, entry.category, entry.image, entry.link, entry.collectionSlug || null, entry.price, entry.stock, entry.active ? 1 : 0, entry.featured ? 1 : 0],
      );
      if (entry.kind === 'product' && entry.active) orderCatalog.set(`${entry.brand.toLowerCase()}|${entry.name.toLowerCase()}`, entry.universe);
      else if (entry.kind === 'product') orderCatalog.delete(`${entry.brand.toLowerCase()}|${entry.name.toLowerCase()}`);
      return json(response, 200, { entry, message: 'Contenu enregistré.' });
    }

    if (pathname === '/api/admin/assets') {
      if (request.method === 'GET') {
        let names = [];
        try { names = (await fs.promises.readdir(documentRoot)).filter((name) => name.toLowerCase().endsWith('.pdf')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        return json(response, 200, { documents: names });
      }
      if (rateLimit(request, response, 'admin-assets', 30)) return;
      const body = await readJson(request, 18 * 1024 * 1024);
      if (body.action === 'delete') {
        const name = String(body.name || '');
        if (path.basename(name) !== name || !/^[\p{L}\p{N}._ -]+\.pdf$/iu.test(name)) return json(response, 400, { error: 'Nom de PDF invalide.' });
        try { await fs.promises.unlink(path.join(documentRoot, name)); }
        catch (error) { if (error.code === 'ENOENT') return json(response, 404, { error: 'PDF introuvable.' }); throw error; }
        return json(response, 200, { message: 'PDF supprimé.' });
      }
      const asset = await storeAdminAsset(body);
      return json(response, 201, { asset });
    }

    if (pathname === '/api/admin/pro/users') {
      const [rows] = await db.execute('SELECT id, name, company, email, phone, status, created_at AS createdAt FROM pro_users ORDER BY created_at DESC LIMIT 500');
      return json(response, 200, { users: rows });
    }

    if (pathname === '/api/admin/contact/messages') {
      if (request.method === 'GET') {
        const [rows] = await db.execute('SELECT message_ref AS messageRef, customer_name AS name, customer_email AS email, customer_phone AS phone, subject, message, status, created_at AS createdAt FROM contact_messages ORDER BY created_at DESC LIMIT 200');
        return json(response, 200, { messages: rows });
      }
      const body = await readJson(request);
      const ref = String(body.messageRef || '').trim();
      if (body.action === 'delete') {
        const [result] = await db.execute('DELETE FROM contact_messages WHERE message_ref = ?', [ref]);
        return result.affectedRows ? json(response, 200, { message: 'Message supprimé.' }) : json(response, 404, { error: 'Message introuvable.' });
      }
      const status = body.action === 'read' ? 'read' : body.action === 'archive' ? 'archived' : '';
      if (!status) return json(response, 400, { error: 'Action invalide.' });
      const [result] = await db.execute('UPDATE contact_messages SET status = ? WHERE message_ref = ?', [status, ref]);
      return result.affectedRows ? json(response, 200, { message: 'Message mis à jour.' }) : json(response, 404, { error: 'Message introuvable.' });
    }

    if (pathname === '/api/pro/catalogue-requests') {
      const user = await authenticatedUser(request);
      if (!user || user.status !== 'active') return json(response, 401, { error: 'Connexion professionnelle requise.' });
      if (request.method === 'GET') {
        const [rows] = await db.execute('SELECT id, catalogue, note, status, created_at AS createdAt FROM pro_catalogue_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [user.id]);
        return json(response, 200, { requests: rows });
      }
      if (rateLimit(request, response, 'pro-catalogue-request', 5)) return;
      const { catalogue, note } = validateCatalogueRequest(await readJson(request));
      const [result] = await db.execute('INSERT INTO pro_catalogue_requests (user_id, catalogue, note) VALUES (?, ?, ?)', [user.id, catalogue, note]);
      return json(response, 201, { requestRef: `CBK-CAT-${String(result.insertId).padStart(6, '0')}`, message: 'Votre demande de catalogue a été envoyée à CBK.' });
    }

    if (pathname === '/api/admin/pro/catalogue-requests') {
      const [rows] = await db.execute('SELECT r.id, u.name, u.company, u.email, u.phone, r.catalogue, r.note, r.status, r.created_at AS createdAt FROM pro_catalogue_requests r JOIN pro_users u ON u.id = r.user_id ORDER BY r.created_at DESC LIMIT 200');
      return json(response, 200, { requests: rows });
    }

    if (pathname === '/api/shop/favorites') {
      const visitorId = new URL(request.url, 'http://localhost').searchParams.get('visitor') || '';
      if (!/^[a-f0-9-]{36}$/i.test(visitorId)) return json(response, 400, { error: 'Identifiant de favoris invalide.' });
      if (request.method === 'GET') {
        const [rows] = await db.execute('SELECT favorites_json AS favorites FROM shop_favorites WHERE visitor_id = ?', [visitorId]);
        const favorites = rows[0]?.favorites || [];
        return json(response, 200, { favorites: typeof favorites === 'string' ? JSON.parse(favorites) : favorites });
      }
      if (rateLimit(request, response, 'favorites', 30)) return;
      const payload = validateFavoritePayload(await readJson(request));
      await db.execute(
        'INSERT INTO shop_favorites (visitor_id, favorites_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE favorites_json = VALUES(favorites_json)',
        [payload.visitorId, JSON.stringify(payload.favorites)],
      );
      return json(response, 200, { favorites: payload.favorites });
    }

    if (pathname === '/api/contact') {
      if (rateLimit(request, response, 'contact', 5)) return;
      const contact = validateContact(await readJson(request));
      const messageRef = newMessageRef();
      await db.execute(
        'INSERT INTO contact_messages (message_ref, customer_name, customer_email, customer_phone, subject, message, privacy_consent_at) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())',
        [messageRef, contact.name, contact.email, contact.phone || null, contact.subject, contact.message],
      );
      return json(response, 201, { messageRef, message: 'Message enregistré. CBK vous répondra prochainement.' });
    }

    if (pathname === '/api/shop/orders') {
      if (rateLimit(request, response, 'shop-order', 10)) return;
      const { customer, items } = validateOrder(await readJson(request));
      const orderRef = newOrderRef();
      await db.execute(
        'INSERT INTO shop_orders (order_ref, customer_name, customer_phone, customer_email, items_json, status, privacy_consent_at) VALUES (?, ?, ?, ?, ?, \'pending\', UTC_TIMESTAMP())',
        [orderRef, customer.name, customer.phone, customer.email || null, JSON.stringify(items)],
      );
      return json(response, 201, { orderRef, message: 'Demande de commande enregistrée. CBK confirmera le prix et la disponibilité.' });
    }

    if (pathname === '/api/admin/shop/orders') {
      const [rows] = await db.execute('SELECT order_ref AS orderRef, customer_name AS name, customer_phone AS phone, customer_email AS email, items_json AS items, status, created_at AS createdAt FROM shop_orders ORDER BY created_at DESC LIMIT 200');
      return json(response, 200, { orders: rows.map((order) => ({ ...order, items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items })) });
    }

    if (adminOrderMatch) {
      const body = await readJson(request);
      const status = ['pending', 'processing', 'completed', 'cancelled'].includes(body.status) ? body.status : '';
      if (!status) return json(response, 400, { error: 'Statut de commande invalide.' });
      const [result] = await db.execute('UPDATE shop_orders SET status = ? WHERE order_ref = ?', [status, adminOrderMatch[1]]);
      if (!result.affectedRows) return json(response, 404, { error: 'Commande introuvable.' });
      return json(response, 200, { message: 'Statut de commande mis à jour.' });
    }

    if (pathname === '/api/pro/login') {
      if (rateLimit(request, response, 'login', 8, 15 * 60 * 1000)) return;
      const body = await readJson(request);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (password.length > 200) return json(response, 400, { error: 'Identifiants invalides.' });
      if (matchesAdminCredentials(email, password)) {
        createAdminSession(response);
        return json(response, 200, { message: 'Connexion administrateur réussie.', role: 'admin' });
      }
      const [rows] = await db.execute('SELECT id, password_hash, password_salt, status FROM pro_users WHERE email = ? LIMIT 1', [email]);
      const account = rows[0];
      const salt = account ? account.password_salt : crypto.randomBytes(16);
      const expected = account ? account.password_hash : Buffer.alloc(64);
      const actual = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
      if (!account || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
        return json(response, 401, { error: 'Adresse e-mail ou mot de passe incorrect.' });
      }
      if (account.status === 'pending') return json(response, 403, { error: 'Votre demande attend la validation de CBK.' });
      if (account.status !== 'active') return json(response, 403, { error: 'Ce compte n’est pas actif. Contactez CBK.' });
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest();
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
      await db.execute('INSERT INTO pro_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', [tokenHash, account.id, expiresAt]);
      setSessionCookie(response, token, 12 * 60 * 60);
      return json(response, 200, { message: 'Connexion réussie.' });
    }

    if (pathname === '/api/pro/logout') {
      const token = cookieValue(request, sessionCookie);
      if (/^[a-f0-9]{64}$/.test(token)) {
        await db.execute('DELETE FROM pro_sessions WHERE token_hash = ?', [crypto.createHash('sha256').update(token).digest()]);
      }
      setSessionCookie(response, '', 0);
      return json(response, 200, { message: 'Vous êtes déconnecté.' });
    }

    if (pathname === '/api/pro/me') {
      const user = await authenticatedUser(request);
      if (!user || user.status !== 'active') return json(response, 401, { error: 'Connexion professionnelle requise.' });
      return json(response, 200, { user: { name: user.name, company: user.company, email: user.email, phone: user.phone } });
    }

    if (pathname === '/api/pro/documents') {
      const user = await authenticatedUser(request);
      if (!user || user.status !== 'active') return json(response, 401, { error: 'Connexion professionnelle requise.' });
      let files = [];
      try {
        files = (await fs.promises.readdir(documentRoot, { withFileTypes: true }))
          .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
          .map((entry) => ({ name: entry.name, url: `/api/pro/documents/${encodeURIComponent(entry.name)}` }));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      return json(response, 200, { documents: files });
    }

    if (pathname === '/api/admin/pro/account') {
      const body = await readJson(request);
      if (body.action === 'create') {
        const account = validateProAccount(body);
        const salt = crypto.randomBytes(16);
        const passwordHash = await scrypt(account.password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
        try {
          await db.execute(
            'INSERT INTO pro_users (name, company, email, phone, password_hash, password_salt, privacy_consent_at, privacy_notice_version, status) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), \'admin-created-v1\', \'active\')',
            [account.name, account.company, account.email, account.phone, passwordHash, salt],
          );
        } catch (error) {
          if (error.code === 'ER_DUP_ENTRY') return json(response, 409, { error: 'Cette adresse e-mail possède déjà un compte.' });
          throw error;
        }
        return json(response, 201, { message: 'Compte professionnel créé et activé.' });
      }
      const email = String(body.email || '').trim().toLowerCase();
      if (body.action === 'delete') {
        const [result] = await db.execute('DELETE FROM pro_users WHERE email = ?', [email]);
        return result.affectedRows ? json(response, 200, { message: 'Compte supprimé.' }) : json(response, 404, { error: 'Compte introuvable.' });
      }
      const status = body.action === 'approve' ? 'active' : body.action === 'reject' ? 'rejected' : '';
      if (!status || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(response, 400, { error: 'Fournissez un e-mail et une action approve ou reject.' });
      const [result] = await db.execute('UPDATE pro_users SET status = ? WHERE email = ?', [status, email]);
      if (!result.affectedRows) return json(response, 404, { error: 'Compte introuvable.' });
      if (status !== 'active') await db.execute('DELETE s FROM pro_sessions s JOIN pro_users u ON u.id = s.user_id WHERE u.email = ?', [email]);
      return json(response, 200, { message: status === 'active' ? 'Compte approuvé.' : 'Compte refusé.' });
    }
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('Erreur API Espace Pro:', error.message);
    return json(response, status, { error: status === 503 ? error.message : status >= 500 ? 'Le service est temporairement indisponible.' : error.message });
  }
}

module.exports = { handleApi };
