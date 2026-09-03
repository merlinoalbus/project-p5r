// ============================================================
// Setup globale test — eseguito una volta per file di test
// ============================================================
//
// Estende expect() con i matcher di @testing-library/jest-dom usati nei
// test jsdom sotto src/. Per i test Node l'import è inerte.
// ============================================================

import '@testing-library/jest-dom/vitest';
