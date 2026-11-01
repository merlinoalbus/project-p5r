// ============================================================
// Elementi, affinità e statistiche — colori e ordinamenti per l'interfaccia
// ============================================================

import type { ChiaveStatistica } from '../../shared/statistiche';
import { NOME_ESITO_AFFINITA } from '../../shared/elementi';

/** Chiave elemento → nome del token colore in tailwind.css (`--color-el-*`). */
const TOKEN_ELEMENTO: Record<string, string> = {
  phys: 'fisico',
  gun: 'arma',
  fire: 'fuoco',
  ice: 'ghiaccio',
  electric: 'elettricita',
  wind: 'vento',
  psy: 'psicocinesi',
  nuclear: 'nucleare',
  bless: 'sacro',
  curse: 'maledizione',
  almighty: 'divino',
  healing: 'recupero',
  ailment: 'alterazione',
  support: 'supporto',
  passive: 'passiva',
  trait: 'tratto',
};

/** Colore CSS di un elemento (variabile del tema). */
export function coloreElemento(elemento: string): string {
  const token = TOKEN_ELEMENTO[elemento] ?? 'passiva';
  return `var(--color-el-${token})`;
}

/** Elementi il cui colore pieno, come testo, non arriva a 4,5:1 sui veli dell'interfaccia (chip e codici di affinità, su ogni fondo): hanno un token `--color-el-*-testo` schiarito (misure in `tailwind.css`). */
const TOKEN_ELEMENTO_CON_TESTO = new Set(['fisico', 'arma', 'fuoco', 'psicocinesi', 'maledizione', 'alterazione', 'supporto', 'passiva']);

/** Colore del TESTO di un elemento (WCAG 1.4.3, almeno 4,5:1 anche sopra i veli delle affinità): come `coloreElemento`, ma schiarito dove il colore pieno non leggeva. Bordi, fondi e icone usano `coloreElemento`. */
export function coloreTestoElemento(elemento: string): string {
  const token = TOKEN_ELEMENTO[elemento] ?? 'passiva';
  return TOKEN_ELEMENTO_CON_TESTO.has(token) ? `var(--color-el-${token}-testo)` : `var(--color-el-${token})`;
}

/** Ordine di presentazione degli elementi delle skill. */
export const ORDINE_ELEMENTI_SKILL = [
  'phys', 'gun', 'fire', 'ice', 'electric', 'wind', 'psy', 'nuclear', 'bless', 'curse', 'almighty', 'ailment', 'healing', 'support', 'passive', 'trait',
];

/** Stile visivo dei codici di affinità. */
export const STILE_AFFINITA: Record<string, { classe: string; titolo: string }> = {
  '-': { classe: 'bg-bg-tertiary text-text-muted', titolo: NOME_ESITO_AFFINITA['-'] },
  wk: { classe: 'bg-error/25 text-error-testo font-bold', titolo: NOME_ESITO_AFFINITA.wk },
  rs: { classe: 'bg-info/20 text-info-testo', titolo: NOME_ESITO_AFFINITA.rs },
  nu: { classe: 'bg-text-secondary/20 text-text', titolo: NOME_ESITO_AFFINITA.nu },
  rp: { classe: 'bg-warning/25 text-warning-testo font-bold', titolo: NOME_ESITO_AFFINITA.rp },
  ab: { classe: 'bg-success/25 text-success-testo font-bold', titolo: NOME_ESITO_AFFINITA.ab },
};

/** Sigla mostrata quando il glossario non è disponibile (le chiavi e l'ordine sono `CHIAVI_STATISTICHE` di `shared/statistiche`). */
export const SIGLA_STATISTICA: Record<ChiaveStatistica, string> = {
  forza: 'FR',
  magia: 'MA',
  resistenza: 'RS',
  agilita: 'AG',
  fortuna: 'FO',
};
