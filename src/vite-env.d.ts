/// <reference types="vite/client" />

/** Le variabili di build del frontend (si leggono con `import.meta.env`, sostituite da Vite al momento della build). */
interface ImportMetaEnv {
  /**
   * La modalità dell'istanza (L12): `preparazione` (predefinita se assente) o `rilascio`. Si fissa nella build (`ARG VITE_MODALITA`
   * del Dockerfile del frontend), mai a runtime. Il valore si valida in `src/utils/modalita.ts`.
   */
  readonly VITE_MODALITA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
