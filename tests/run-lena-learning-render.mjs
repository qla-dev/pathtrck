import fs from 'node:fs';
import { createServer } from 'vite';

const catalogPath = process.argv[2];
if (!catalogPath) throw new Error('Provide the path to the backend Lena catalog JSON.');
// Maps are unrelated to learning and require a browser. Stub only those cards for this SSR check.
const names = ['LenaBookingCard', 'LenaLoadDetailsCard', 'LenaLoadMapCard', 'LenaLoadStatusCard', 'LenaLocationCard', 'LenaLocationChoiceCard'];
const server = await createServer({
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [{
    name: 'learning-check-map-stubs', enforce: 'pre',
    resolveId(id) { if (id === './LenaEmbeddedCards') return '\0learning-check-cards'; },
    load(id) { if (id === '\0learning-check-cards') return names.map(name => `export const ${name} = () => null;`).join('\n'); },
  }],
  server: { middlewareMode: true }, appType: 'custom',
});
try {
  const suite = await server.ssrLoadModule('/tests/lena-learning-render.tsx');
  console.log(await suite.run(JSON.parse(fs.readFileSync(catalogPath, 'utf8'))));
} finally {
  await server.close();
}
