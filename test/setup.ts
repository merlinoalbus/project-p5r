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
