import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// ESLint 10 flat config: blocco FE (globals browser) + blocco BE (globals node).

export default defineConfig([
  // `.claude`: le copie di lavoro (worktree) degli agenti, con i loro sorgenti e tsconfig, non sono questo progetto
  globalIgnores(['dist', 'node_modules', 'coverage', 'data', '.claude']),

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
      }, {
        // Lotto B (2026-10-25): le dimensioni del testo vengono dalla scala in rem (`testo-12`…`testo-40`, src/tailwind.css),
        // che segue la dimensione del testo scelta dall'utente; una misura in px scritta a mano la scavalca
        selector: 'Literal[value=/(^|[\\s:])text-\\[[0-9.]+px\\]/]',
        message: 'Niente dimensioni del testo in px: usa la scala `testo-N` (src/tailwind.css, @theme --testo-*).',
      }, {
        selector: 'TemplateElement[value.raw=/(^|[\\s:])text-\\[[0-9.]+px\\]/]',
        message: 'Niente dimensioni del testo in px: usa la scala `testo-N` (src/tailwind.css, @theme --testo-*).',
      }],
    },
  },

  // Backend, shared e script (runtime Node, niente React)
  {
    // `test/` (aiuti condivisi dai test: server di prova, selettore, setup) era fuori da ogni blocco, quindi mai controllato (K6‴)
    files: ['server/**/*.ts', 'shared/**/*.ts', 'scripts/**/*.ts', 'test/**/*.ts', 'vite/**/*.ts', 'vite.config.ts', 'vitest.config.ts'],
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
