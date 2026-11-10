// ============================================================
// storicoDisponibilitaL7 — lo storico dell'editor delle informazioni del Confidente, per le migrazioni del lotto L7 (358, 361)
// ============================================================
//
// Lo storico (`dati_guida` `confidente-disponibilita-editor-v1:<chiave>`) è una catena che deve finire sulla riga di adesso: se una migrazione cambia la
// riga, aggiunge una revisione «migrazione» (identificativo `migrazione-<numero>-<chiave>`, impronta di `{ chiave, migrazione }`, come la 307) e non
// riscrive le precedenti. Uno storico che non finisce sulla riga è incoerente: la riga si salta e lo si dice nell'audit.
// Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';

const STORICO = 'confidente-disponibilita-editor-v1:';

/** Le otto colonne della fotografia, nell'ordine dello storico (le prime cinque non sono più nella tabella dopo la 358). */
export const CAMPI_FOTOGRAFIA = ['giorni_json', 'fasce_json', 'luogo', 'sblocco_data', 'sblocco_requisiti', 'note', 'note_generali', 'fonti_json'] as const;
export type Fotografia = Record<typeof CAMPI_FOTOGRAFIA[number], string>;

/** I valori vuoti dei campi storici: quelli della riga di adesso dopo la 358. */
export const STORICI_VUOTI = { giorni_json: '[]', fasce_json: '[]', luogo: '', sblocco_data: '', sblocco_requisiti: '' } as const;

/** Come l'impronta dello storico dell'editor (`disponibilitaConfidentiService`): JSON canonico, SHA-256. */
function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v !== null && typeof v === 'object') return `{${Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => `${JSON.stringify(k)}:${canonico(x)}`).join(',')}}`;
  return JSON.stringify(v);
}
const impronta = (v: unknown): string => createHash('sha256').update(canonico(v)).digest('hex');

export const fotografieUguali = (a: unknown, b: Fotografia): boolean => !!a && typeof a === 'object' && Object.keys(a).length === CAMPI_FOTOGRAFIA.length
  && CAMPI_FOTOGRAFIA.every((c) => (a as Record<string, unknown>)[c] === b[c]);

interface Revisione { id: number; azione: string; data: string; motivo: string; operazioneId: string; richiesta: string; prima: unknown; dopo: unknown }
export type Registro = Record<string, unknown> & { revisioni: Revisione[]; iniziale: unknown };
export type StatoStorico = { stato: 'assente' } | { stato: 'incoerente' } | { stato: 'coerente'; registro: Registro };

/** Lo storico della riga, se c'è, e se finisce sulla riga di adesso (`raw`). */
export function leggiStorico(db: AppDatabase, chiave: string, raw: Fotografia): StatoStorico {
  const testo = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(STORICO + chiave) as string | undefined;
  if (testo === undefined) return { stato: 'assente' };
  let v: unknown;
  try { v = JSON.parse(testo); } catch { return { stato: 'incoerente' }; }
  if (!v || typeof v !== 'object' || !Array.isArray((v as Registro).revisioni)) return { stato: 'incoerente' };
  const registro = v as Registro;
  const ultima = registro.revisioni.length ? registro.revisioni[registro.revisioni.length - 1]!.dopo : registro.iniziale;
  return fotografieUguali(ultima, raw) ? { stato: 'coerente', registro } : { stato: 'incoerente' };
}

/** Aggiunge in coda la revisione «migrazione» (la riga è appena passata da `prima` a `dopo`). Lancia se la revisione c'è già. */
export function aggiungiRevisione(db: AppDatabase, chiave: string, registro: Registro, migrazione: number, motivo: string, prima: Fotografia, dopo: Fotografia): number {
  const operazioneId = `migrazione-${migrazione}-${chiave}`;
  if (registro.revisioni.some((x) => x.operazioneId === operazioneId)) throw new Error(`${migrazione}: lo storico di ${chiave} ha già la revisione di questa migrazione; nessuna modifica applicata.`);
  const revisioni = [...registro.revisioni, { id: registro.revisioni.length + 1, azione: 'migrazione', data: new Date().toISOString(), motivo, operazioneId, richiesta: impronta({ chiave, migrazione }), prima, dopo }];
  if (db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ?').run(JSON.stringify({ ...registro, revisioni }), STORICO + chiave).changes !== 1) {
    throw new Error(`${migrazione}: lo storico di ${chiave} non si aggiorna; nessuna modifica applicata.`);
  }
  return revisioni.length;
}

/** La nota con una frase in più, senza ripeterla se c'è già. */
export function notaConFrase(nota: string, frase: string): string {
  if (nota.includes(frase)) return nota;
  const base = nota.trimEnd();
  return base === '' ? frase : `${base}${/[.!?]$/.test(base) ? '' : '.'} ${frase}`;
}
