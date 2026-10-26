// ============================================================
// Chiusura dell'ondata 5 — strumenti comuni delle migrazioni 254, 259, 269 e 284-287 (correzioni delle verifiche finali, decisione 21)
// ============================================================
//
// Decisione 21 dell'utente: «Non sono d'accordo nel rimandare attività a fasi successive»; con le raccomandazioni approvate («unioni delle
// identità doppie su elenco scritto con cestino reversibile», «in caso di discordanza fra pagine della guida vale il listino dei negozi con nota
// storica») e la regola di sempre: prevale il dato Royal della guida italiana, il dato superato resta in una nota storica. Qui: l'audit comune,
// la scrittura guardata di una colonna del catalogo (solo righe della guida mai corrette dall'utente, solo se il valore è quello atteso) e il
// riallineamento delle fotografie delle proposte di abbinamento ancora da approvare quando la fonte cambia per una copia tolta (altrimenti la
// proposta risulterebbe «fonte cambiata dopo la proposta»). Non importa niente da `server/services/`.
// ============================================================

import { isDeepStrictEqual } from 'node:util';
import type { AppDatabase } from '../dbService.js';
import { esisteTabella } from './pulizieL11.js';
export { improntaDiario } from './rifornimentoOndata5.js';

export const FONTE_ACCESSORI = 'https://www.allgamestaff.it/persona-5-royal/accessori/';
export const FONTE_OGGETTI = 'https://www.allgamestaff.it/persona-5-royal/oggetti/';
export const FONTE_NEGOZI_SPECIALI = 'https://www.allgamestaff.it/persona-5-royal/negozi-speciali/';
export const FONTE_ARMI_MISCHIA = 'https://www.allgamestaff.it/persona-5-royal/armi-da-mischia/';
export const FONTE_PROTEZIONI = 'https://www.allgamestaff.it/persona-5-royal/protezioni/';

/**
 * L'audit di una migrazione della chiusura, con le esecuzioni accodate. Un'esecuzione che non ha cambiato niente (`cambiate` = 0) si scrive
 * solo se l'audit non c'è ancora: rieseguita sugli stessi dati la migrazione non tocca nemmeno `dati_guida` (idempotenza piena).
 */
export function scriviAuditChiusura(db: AppDatabase, chiave: string, migrazione: number, esecuzione: Record<string, unknown>, cambiate: number): void {
  if (!esisteTabella(db, 'dati_guida')) return;
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(chiave) as string | undefined;
  if (vecchio !== undefined && cambiate === 0) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) {
    try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; }
  }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(chiave, JSON.stringify({ migrazione, lotto: 'ondata-5-chiusura', decisione: 'L13-21', esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }] }));
}

export type ColonnaCatalogo = 'nome' | 'categoria' | 'sottocategoria' | 'effetto' | 'descrizione' | 'statistiche_json' | 'nomi_altri_json' | 'nome_originale';
export interface EsitoColonna { chiave: string; colonna: ColonnaCatalogo; esito: string; prima?: string | null; dopo?: string | null }

/**
 * Scrive una colonna di una scheda del catalogo da `prima` (uno o più valori attesi) a `dopo`: solo se la scheda è della guida e mai corretta
 * dall'utente (`origine = 'seed'`, `seed_json` vuoto) e se il valore è ancora uno di quelli attesi. Altrimenti resta e l'esito lo dice (un dato
 * salvato non cambia in silenzio). Idempotente: con il valore già `dopo` non scrive.
 */
export function scriviColonnaCatalogo(db: AppDatabase, chiave: string, colonna: ColonnaCatalogo, prima: string | null | ReadonlyArray<string | null>, dopo: string | null): EsitoColonna {
  const r = db.prepare(`SELECT ${colonna} AS valore, origine, seed_json FROM main.catalogo_oggetto WHERE chiave = ?`).get(chiave) as { valore: string | null; origine: string; seed_json: string | null } | undefined;
  if (!r) return { chiave, colonna, esito: 'scheda assente: non toccata' };
  if (r.valore === dopo) return { chiave, colonna, esito: 'già conforme' };
  if (r.origine !== 'seed' || r.seed_json !== null) return { chiave, colonna, esito: 'scheda corretta dall’utente: non toccata', prima: r.valore };
  const attesi: ReadonlyArray<string | null> = Array.isArray(prima) ? prima : [prima as string | null];
  if (!attesi.includes(r.valore)) return { chiave, colonna, esito: 'valore diverso da quello atteso: non toccato', prima: r.valore };
  const n = db.prepare(`UPDATE main.catalogo_oggetto SET ${colonna} = ?, updated_at = ? WHERE chiave = ? AND ${colonna} IS ? AND origine = 'seed' AND seed_json IS NULL`)
    .run(dopo, new Date().toISOString(), chiave, r.valore).changes;
  if (n !== 1) throw new Error(`chiusura dell'ondata 5: ${colonna} della scheda ${chiave} non si aggiorna; nessuna modifica applicata.`);
  return { chiave, colonna, esito: 'scritto', prima: r.valore, dopo };
}

/**
 * Le proposte di abbinamento ancora da approvare della fonte `riga_tipo`/`riga_chiave` fotografano la fonte (`fonte_snapshot_json`, contratto di
 * `snapshotFonteProposta`): se una migrazione toglie una copia da quella fonte, la fotografia si riallinea al valore nuovo del campo, solo dove
 * diceva esattamente il valore tolto. Restituisce quante proposte ha riallineato.
 */
export function riallineaFotografieProposte(db: AppDatabase, rigaTipo: string, rigaChiave: string, campo: string, prima: unknown, dopo: unknown): number {
  if (!esisteTabella(db, 'proposta_abbinamento')) return 0;
  const righe = db.prepare("SELECT rowid AS id, fonte_snapshot_json FROM main.proposta_abbinamento WHERE riga_tipo = ? AND riga_chiave = ? AND stato = 'da-approvare' AND fonte_snapshot_json IS NOT NULL")
    .all(rigaTipo, rigaChiave) as Array<{ id: number; fonte_snapshot_json: string }>;
  let n = 0;
  for (const r of righe) {
    let s: unknown;
    try { s = JSON.parse(r.fonte_snapshot_json) as unknown; } catch { continue; }
    if (!s || typeof s !== 'object' || Array.isArray(s)) continue;
    const fonte = (s as { fonte?: unknown }).fonte;
    if (!fonte || typeof fonte !== 'object' || Array.isArray(fonte) || !isDeepStrictEqual((fonte as Record<string, unknown>)[campo] ?? null, prima ?? null)) continue;
    const nuova = JSON.stringify({ ...(s as Record<string, unknown>), fonte: { ...(fonte as Record<string, unknown>), [campo]: dopo ?? null } });
    n += db.prepare('UPDATE main.proposta_abbinamento SET fonte_snapshot_json = ? WHERE rowid = ? AND fonte_snapshot_json = ?').run(nuova, r.id, r.fonte_snapshot_json).changes;
  }
  return n;
}
