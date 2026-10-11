// Lokale ontwikkelserver: bouwt eerst data/index.json en serveert daarna de repo-root.
// Poort via de omgevingsvariabele PORT (standaard 8080). Stoppen met Ctrl+C.
// Een webserver is nodig omdat fetch van JSON niet werkt via file://.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bouwIndex, schrijfIndex } from './build-index.mjs';
import { startServer } from './server.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT ?? 8080);

const { fouten, index } = bouwIndex({
  scriptsMap: join(root, 'data', 'scripts'),
  topicsBestand: join(root, 'data', 'topics.json')
});
if (fouten.length > 0) {
  for (const regel of fouten) console.error(regel);
  console.error(`Index niet gebouwd: ${fouten.length} fouten`);
  process.exit(1);
}
schrijfIndex(index, join(root, 'data', 'index.json'));

try {
  await startServer({ root, port });
  console.log(`Server draait op http://127.0.0.1:${port}/ (Ctrl+C om te stoppen)`);
} catch (e) {
  console.error(`FOUT  server starten op poort ${port} mislukt: ${e.message}`);
  process.exit(1);
}
