import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// ESLint 9 flat config: blocco FE (globals browser) + blocco BE (globals node).

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'coverage', 'data']),

  // Frontend (React, runtime browser)
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      // Un solo elenco chiuso in tutta l'app: il Selettore (ricerca da dieci voci in su, 44 px,
      // tastiera). La tendina nativa non si cerca e sul telefono è minuscola: vietata.
      'no-restricted-syntax': ['error', {
        selector: "JSXOpeningElement[name.name='select']",
        message: 'Nessuna <select> nativa: usa <Selettore> (src/components/shared/Selettore.tsx).',
      }],
    },
  },

  // Backend, shared e script (runtime Node, niente React)
  {
    files: ['server/**/*.ts', 'shared/**/*.ts', 'scripts/**/*.ts', 'vite/**/*.ts', 'vite.config.ts', 'vitest.config.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.node,
    },
    rules: {
      // Gli identificatori con underscore iniziale segnalano binding volutamente inutilizzati.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
    },
  },
])
