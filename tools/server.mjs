// Kleine statische webserver zonder extra pakketten, gebruikt door dev-server.mjs, smoke.mjs en de tests.
// Luistert alleen op 127.0.0.1 en beantwoordt alleen GET en HEAD.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const MIMETYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ps1': 'text/plain; charset=utf-8'
};

function antwoord(res, status, tekst, extra = {}) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...extra });
  res.end(tekst);
}

// Zet een URL-pad om naar een bestandspad binnen root, of null als het pad daarbuiten valt.
function bestandsPad(root, urlPad) {
  let pad;
  try {
    pad = decodeURIComponent(urlPad); // %2e%2e wordt hier "..", daarna controleren we het eindresultaat
  } catch {
    return null;
  }
  if (pad.includes('\0')) return null;
  const volledig = resolve(root, '.' + (pad.startsWith('/') ? pad : '/' + pad));
  return volledig === root || volledig.startsWith(root + sep) ? volledig : null;
}

// Start de server en geeft een belofte terug met het luisterende server-object.
// Poort 0 kiest een vrije poort; die staat dan in server.address().port.
export function startServer({ root, port }) {
  const rootPad = resolve(root);

  const server = createServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return antwoord(res, 405, 'Methode niet toegestaan', { Allow: 'GET, HEAD' });
    }
    const url = new URL(req.url, 'http://127.0.0.1');
    let bestand = bestandsPad(rootPad, url.pathname);
    if (bestand === null) return antwoord(res, 404, 'Niet gevonden');

    try {
      let info = await stat(bestand);
      if (info.isDirectory()) {
        // Zoals GitHub Pages: een map zonder slotslash wordt doorgestuurd, zodat relatieve links kloppen.
        if (!url.pathname.endsWith('/')) {
          return antwoord(res, 301, '', { Location: url.pathname + '/' + url.search });
        }
        bestand = resolve(bestand, 'index.html');
        info = await stat(bestand);
      }
      if (!info.isFile()) return antwoord(res, 404, 'Niet gevonden');

      res.writeHead(200, {
        'Content-Type': MIMETYPES[extname(bestand).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': info.size,
        'Cache-Control': 'no-store'
      });
      if (req.method === 'HEAD') return res.end();
      createReadStream(bestand).pipe(res);
    } catch {
      antwoord(res, 404, 'Niet gevonden');
    }
  });

  return new Promise((oplossen, afwijzen) => {
    server.once('error', afwijzen);
    server.listen(port, '127.0.0.1', () => oplossen(server));
  });
}
