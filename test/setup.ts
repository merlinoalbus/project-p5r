// ============================================================
// Setup globale test — eseguito una volta per file di test
// ============================================================
//
// - Silenzia il logger pino (letto da env all'import) così l'output dei
//   test resta leggibile.
// - Estende expect() con i matcher di @testing-library/jest-dom usati nei
//   test jsdom sotto src/. Per i test Node l'import è inerte.
// ============================================================

process.env.LOG_LEVEL = 'silent';

import '@testing-library/jest-dom/vitest';
import { moduloApi, moduloNotifiche } from './mockModuli';

// I costruttori dei moduli finti (test/mockModuli.ts) sono globali: le factory di `vi.mock` stanno in cima al file, prima
// degli import, e non possono usare quel che il file importa.
declare global {
  var moduloApi: typeof import('./mockModuli').moduloApi;
  var moduloNotifiche: typeof import('./mockModuli').moduloNotifiche;
}
globalThis.moduloApi = moduloApi;
globalThis.moduloNotifiche = moduloNotifiche;

// I server dei test di rotta (`test/supertest.ts`, uno per app) si chiudono alla fine di ogni file di test. Il registro sta su
// globalThis, così qui non si importa supertest anche nei test del frontend.
afterAll(async () => {
  const aperti = (globalThis as Record<string, unknown>).__serverSupertestCondivisi as Set<import('node:http').Server | import('node:http').Agent> | undefined;
  if (!aperti) return;
  await Promise.all([...aperti].map((x) => new Promise<void>((ok) => {
    if ('destroy' in x && !('listen' in x)) { x.destroy(); ok(); return; }
    const server = x as import('node:http').Server;
    server.closeAllConnections();
    server.close(() => ok());
  })));
  aperti.clear();
});
