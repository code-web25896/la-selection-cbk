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

function renderHtml(html) {
  let rendered = html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i, sharedHeader.trim());
  if (/<footer\b[^>]*>[\s\S]*?<\/footer>/i.test(rendered)) {
    rendered = rendered.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/i, sharedFooter.trim());
  } else {
    rendered = rendered.replace(/<\/body>/i, `${sharedFooter.trim()}</body>`);
  }
  rendered = rendered.replace(/<\/head>/i, '<link rel="stylesheet" href="/shared-nav.css"></head>');
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
          response.writeHead(200, { ...headers, 'Content-Length': Buffer.byteLength(renderHtml(html)) });
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
        const enhanced = renderHtml(html);
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
