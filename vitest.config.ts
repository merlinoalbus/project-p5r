// ============================================================
// Vitest — runner unico (FE + BE + shared + script)
// ============================================================
//
// Ambiente di default `node` (server/, shared/, scripts/); i test React
// sotto src/ scelgono jsdom con il pragma di file:
//   // @vitest-environment jsdom
// ============================================================

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: [
      'server/**/*.test.ts',
      'shared/**/*.test.ts',
      'scripts/**/*.test.ts',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: ['server/**/*.ts', 'shared/**/*.ts', 'src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.d.ts',
        '**/dist/**',
        'test/**',
        'vitest.config.ts',
        'vite.config.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
