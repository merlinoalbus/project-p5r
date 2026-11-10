// ============================================================
// traduzioniService — resa italiana delle chiavi canoniche (cache in memoria)
// ============================================================
//
// La tabella `traduzione` è piccola (≈1000 righe) e letta da ogni risposta
// del compendio: si tiene una cache per ambito, invalidata a ogni scrittura.
// `t(ambito, chiave)` restituisce la resa italiana o, se manca, la chiave
// stessa (mai `undefined` verso il frontend).
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import type { TraduzioneDto } from '../../shared/types.js';
import { registraCacheDiGioco } from './cacheDiGioco.js';
import { effettiDeiTrattiDellaGuida } from './trattiGuida.js';
import { filtroRicerca } from '../../shared/testo.js';

interface RigaTraduzione {
  ambito: string;
  chiave: string;
  testo: string;
  extra_json: string | null;
  fonte: 'seed' | 'utente';
  updated_at: string;
}

let cache: Map<string, Map<string, RigaTraduzione>> | null = null;

/** La cache delle traduzioni, ambito → (chiave → riga): se manca la costruisce leggendo l'intera tabella in una volta. */
function caricaCache(): Map<string, Map<string, RigaTraduzione>> {
  if (cache) return cache;
  cache = new Map();
  for (const r of prepared('SELECT ambito, chiave, testo, extra_json, fonte, updated_at FROM traduzione').all() as RigaTraduzione[]) {
    let m = cache.get(r.ambito);
    if (!m) {
      m = new Map();
      cache.set(r.ambito, m);
    }
    m.set(r.chiave, r);
  }
  return cache;
}

/** Svuota la cache (dopo scritture o reseed). */
export function invalidaCacheTraduzioni(): void {
  cache = null;
}
registraCacheDiGioco(invalidaCacheTraduzioni);

/** Resa italiana di una chiave; se assente restituisce la chiave stessa. */
export function t(ambito: string, chiave: string): string {
  return caricaCache().get(ambito)?.get(chiave)?.testo ?? chiave;
}

/** Resa italiana o null se la chiave è null/assente. */
export function tOpz(ambito: string, chiave: string | null | undefined): string | null {
  if (chiave === null || chiave === undefined) return null;
  return caricaCache().get(ambito)?.get(chiave)?.testo ?? null;
}

/** Campo extra (es. sigla) di una traduzione. */
export function extra<T = Record<string, unknown>>(ambito: string, chiave: string): T | null {
  const r = caricaCache().get(ambito)?.get(chiave);
  return r?.extra_json ? (JSON.parse(r.extra_json) as T) : null;
}

/** Tutte le voci di un ambito come mappa chiave → testo. */
export function mappaAmbito(ambito: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, r] of caricaCache().get(ambito) ?? []) out[k] = r.testo;
  return out;
}

/** Voci di un ambito con extra, nell'ordine di inserimento del seed. */
export function vociAmbito(ambito: string): Array<{ chiave: string; testo: string; extra: Record<string, unknown> | null }> {
  return [...(caricaCache().get(ambito) ?? []).values()].map((r) => ({ chiave: r.chiave, testo: r.testo, extra: r.extra_json ? JSON.parse(r.extra_json) : null }));
}

/** Una riga di `traduzione` come DTO, con l'extra letto dal JSON (null se assente). */
function versoDto(r: RigaTraduzione): TraduzioneDto {
  return { ambito: r.ambito, chiave: r.chiave, testo: r.testo, extra: r.extra_json ? JSON.parse(r.extra_json) : null, fonte: r.fonte, updatedAt: r.updated_at };
}

/** Elenco delle traduzioni, filtrabile per ambito e testo (chiave o resa). */
export function elencaTraduzioni(filtro: { ambito?: string; q?: string; soloUtente?: boolean }): TraduzioneDto[] {
  const condizioni: string[] = [];
  const parametri: unknown[] = [];
  if (filtro.ambito) {
    condizioni.push('ambito = ?');
    parametri.push(filtro.ambito);
  }
  // il testo cercato si filtra dopo, con la ricerca comune dell'app (parola per parola nella chiave o nel testo, `shared/testo.ts`)
  const trova = filtroRicerca(filtro.q);
  if (filtro.soloUtente) condizioni.push("fonte = 'utente'");
  // le rese degli effetti dei tratti della guida non si leggono più (`trattiGuida`): non compaiono, così non c'è un secondo testo da correggere
  condizioni.push("NOT (ambito = 'effettoSkill' AND chiave IN (SELECT value FROM json_each(?)))");
  parametri.push(JSON.stringify([...effettiDeiTrattiDellaGuida()]));
  const where = `WHERE ${condizioni.join(' AND ')}`;
  return (getDb().prepare(`SELECT ambito, chiave, testo, extra_json, fonte, updated_at FROM traduzione ${where} ORDER BY ambito, chiave`).all(...parametri) as RigaTraduzione[])
    .filter((r) => trova(r.chiave, r.testo)).map(versoDto);
}

/** Ambiti presenti con il numero di voci (senza le rese degli effetti dei tratti della guida, che non si mostrano). */
export function elencaAmbiti(): Array<{ ambito: string; voci: number; modificate: number }> {
  return prepared(`SELECT ambito, COUNT(*) AS voci, SUM(CASE WHEN fonte = 'utente' THEN 1 ELSE 0 END) AS modificate FROM traduzione
    WHERE NOT (ambito = 'effettoSkill' AND chiave IN (SELECT value FROM json_each(?))) GROUP BY ambito ORDER BY ambito`).all(JSON.stringify([...effettiDeiTrattiDellaGuida()])) as Array<{ ambito: string; voci: number; modificate: number }>;
}

/** 409 se la voce è la resa dell'effetto di un tratto della guida: l'effetto di un tratto si corregge solo dalla sua riga nelle Sfide. */
function rifiutaEffettoDiTratto(ambito: string, chiave: string): void {
  if (ambito === 'effettoSkill' && effettiDeiTrattiDellaGuida().has(chiave)) {
    throw httpErrors.conflict('effetto-di-un-tratto', 'L’effetto di un tratto è la descrizione della guida: si corregge dalla scheda «Tratti» delle Sfide.');
  }
}

/**
 * Gli ambiti in cui si può scrivere la resa di un testo che non ha ancora una riga, con il controllo che la chiave sia un testo che esiste nei dati.
 * `effettoSkill`: la chiave è il testo (inglese) dell'effetto di almeno una skill, quindi una resa non si scrive per un testo qualsiasi.
 */
const AMBITI_CREABILI: Record<string, (chiave: string) => boolean> = {
  effettoSkill: (chiave) => !!prepared('SELECT 1 FROM skill WHERE effetto = ?').get(chiave),
};
/** Imposta la resa italiana di una voce (diventa fonte='utente'); negli ambiti creabili la scrive anche se la riga non c'è ancora (upsert). Non c'è un
 *  ritorno alla resa della guida (decisione dell'utente del 10/11). */
export function aggiornaTraduzione(ambito: string, chiave: string, testo: string): TraduzioneDto {
  rifiutaEffettoDiTratto(ambito, chiave);
  const esiste = prepared('SELECT 1 FROM traduzione WHERE ambito = ? AND chiave = ?').get(ambito, chiave);
  if (!esiste) {
    const valida = AMBITI_CREABILI[ambito];
    if (!valida) throw httpErrors.notFound('traduzione-non-trovata', `Nessuna voce per ${ambito}/${chiave}.`);
    if (!valida(chiave)) throw httpErrors.notFound('traduzione-non-trovata', `${ambito}: il testo «${chiave}» non esiste nei dati, quindi non si può scrivere una resa.`);
  }
  prepared("INSERT INTO traduzione (ambito, chiave, testo, extra_json, fonte, updated_at) VALUES (?, ?, ?, NULL, 'utente', ?) ON CONFLICT(ambito, chiave) DO UPDATE SET testo = excluded.testo, fonte = 'utente', updated_at = excluded.updated_at")
    .run(ambito, chiave, testo, nowIso());
  invalidaCacheTraduzioni();
  return versoDto(prepared('SELECT ambito, chiave, testo, extra_json, fonte, updated_at FROM traduzione WHERE ambito = ? AND chiave = ?').get(ambito, chiave) as RigaTraduzione);
}
