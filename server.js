const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { handleApi } = require('./pro-backend');

const root = __dirname;
const port = Number(process.env.PORT) || 3000;
if (process.env.NODE_ENV !== 'production') {
  process.env.ADMIN_EMAIL ||= 'admin@cbk.local';
  const localAdminPasswordPath = path.join(root, '.local-data', 'admin-password');
  fs.mkdirSync(path.dirname(localAdminPasswordPath), { recursive: true, mode: 0o700 });
  if (!fs.existsSync(localAdminPasswordPath)) {
    fs.writeFileSync(localAdminPasswordPath, `${crypto.randomBytes(24).toString('base64url')}\n`, { mode: 0o600 });
  }
  process.env.ADMIN_PASSWORD = fs.readFileSync(localAdminPasswordPath, 'utf8').trim();
}
const homePage = 'CBK_homepage_V4_logo_footer.html';
const enhancementScript = '<script src="/site.js" defer></script><script src="/cart.js" defer></script>';
const sharedHeader = fs.readFileSync(path.join(__dirname, 'shared-header.html'), 'utf8');
const sharedFooter = fs.readFileSync(path.join(__dirname, 'shared-footer.html'), 'utf8');
const publicFiles = new Set([
  'CBK_fiche_produit_Aura_V2_logo_footer.html',
  'CBK_homepage_V4_logo_footer.html',
  'admin.js',
  'cart.js',
  'bonnes-affaires.html',
  'admin-cbk.html',
  'catalogue-carrelage.html',
  'catalogue-robinetterie.html',
  'catalogue-sanitaire.html',
  'collection.html',
  'collection-aura.html',
  'cbk-logo.png',
  'favicon.png',
  'logo-partage.png',
  'contact.html',
  'espace-pro.html',
  'marques.html',
  'shared-nav.css',
  'site.js',
  'pro.js',
  'produit.html',
  ...fs.readdirSync(path.join(root, 'product-images')).filter((name) => /^[a-z0-9-]+\.(?:jpg|png|webp)$/i.test(name)),
]);
const aliases = {
  '/fiche-produit-aura.html': '/CBK_fiche_produit_Aura_V2_logo_footer.html',
  '/univers.html': '/index.html#univers',
  '/collections.html': '/index.html#collections',
  '/inspirations.html': '/index.html#inspiration',
  '/projets.html': '/index.html#projects',
  '/showrooms.html': '/index.html#showrooms',
};

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function escapeAttribute(value) {
  return String(value).replace(/[&"<>]/g, (character) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[character]);
}

function renderHtml(html, request) {
  let rendered = html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i, sharedHeader.trim());
  if (/<footer\b[^>]*>[\s\S]*?<\/footer>/i.test(rendered)) {
    rendered = rendered.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/i, sharedFooter.trim());
  } else {
    rendered = rendered.replace(/<\/body>/i, `${sharedFooter.trim()}</body>`);
  }
  const configuredOrigin = process.env.SITE_URL ? process.env.SITE_URL.replace(/\/+$/, '') : '';
  const forwardedProto = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  const scheme = ['http', 'https'].includes(forwardedProto) ? forwardedProto : 'https';
  const forwardedHost = String(request.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const requestHost = forwardedHost || String(request.headers.host || 'localhost').trim();
  const safeHost = /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(requestHost) ? requestHost : 'localhost';
  const origin = configuredOrigin || `${scheme}://${safeHost}`;
  const currentUrl = new URL(request.url, origin).href;
  const metadata = [
    '<link rel="icon" type="image/png" sizes="256x256" href="/favicon.png">',
    '<link rel="apple-touch-icon" href="/favicon.png">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="La Sélection CBK">',
    '<meta property="og:title" content="La Sélection CBK — Site officiel">',
    '<meta property="og:description" content="Carrelage, sanitaire et robinetterie. Découvrez les collections et produits sélectionnés par CBK.">',
    `<meta property="og:url" content="${escapeAttribute(currentUrl)}">`,
    `<meta property="og:image" content="${escapeAttribute(`${origin}/logo-partage.png`)}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="La Sélection CBK">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="La Sélection CBK — Site officiel">',
    '<meta name="twitter:description" content="Carrelage, sanitaire et robinetterie. Découvrez les collections et produits sélectionnés par CBK.">',
    `<meta name="twitter:image" content="${escapeAttribute(`${origin}/logo-partage.png`)}">`,
    '<link rel="stylesheet" href="/shared-nav.css">',
  ].join('');
  rendered = rendered.replace(/<\/head>/i, `${metadata}</head>`);
  return rendered.replace(/<\/body>/i, `${enhancementScript}</body>`);
}

const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400);
    return response.end('Bad request');
  }

  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (pathname.startsWith('/api/')) {
    return void handleApi(request, response, pathname);
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    return response.end('Method not allowed');
  }

  if (pathname === '/' || pathname === '/index.html') {
    pathname = `/${homePage}`;
  }

  if (aliases[pathname]) {
    response.writeHead(302, { Location: aliases[pathname] });
    return response.end();
  }

  const isProductImage = /^\/product-images\/[a-z0-9-]+\.(?:jpg|png|webp)$/i.test(pathname);
  if (!publicFiles.has(path.basename(pathname)) && !isProductImage) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return response.end('Page introuvable');
  }

  const filePath = path.resolve(root, `.${pathname}`);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    return response.end('Forbidden');
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return response.end('Page introuvable');
    }

    const headers = {
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    };

    if (request.method === 'HEAD') {
      if (path.extname(filePath).toLowerCase() === '.html') {
        return fs.readFile(filePath, 'utf8', (readError, html) => {
          if (readError) {
            response.writeHead(500);
            return response.end();
          }
          response.writeHead(200, { ...headers, 'Content-Length': Buffer.byteLength(renderHtml(html, request)) });
          response.end();
        });
      }
      response.writeHead(200, { ...headers, 'Content-Length': stats.size });
      return response.end();
    }

    if (path.extname(filePath).toLowerCase() === '.html') {
      return fs.readFile(filePath, 'utf8', (readError, html) => {
        if (readError) {
          response.writeHead(500);
          return response.end('Erreur de lecture');
        }
        const enhanced = renderHtml(html, request);
        response.writeHead(200, headers);
        response.end(enhanced);
      });
    }

    response.writeHead(200, { ...headers, 'Content-Length': stats.size });
    fs.createReadStream(filePath).pipe(response);
  });
});

const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
server.listen(port, host, () => {
  console.log(`Site CBK disponible sur http://${host}:${port}`);
});
