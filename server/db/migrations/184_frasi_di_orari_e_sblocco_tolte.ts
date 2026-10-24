// ============================================================
// 184 — frasi di orari e di sblocco tolte dal modello (L11 · B12, R11-02/9 e R11-02b/5)
// ============================================================
//
// Escono `luogo.giorni` e `luogo.giorni_json` (i giorni del luogo: gli orari del luogo, `orari_json`, e la disponibilità dei Confidenti L9 sono la
// fonte, e nessun lettore vivo le usa: il ramo «schema di prima» di `luoghiService` era già morto), `negozio.orari` (la frase da cui la 069 ha
// ricavato `orari_json`) e `negozio.sblocco` (frase senza lettori: lo sblocco di un negozio sta in `sblocco_json`, `condizioni_json` e nella sede).
// NON esce `luogo.quando`: un lettore vivo la legge ancora (il sottotitolo del collegamento del pin di un luogo, `mappeService` → `VisoreMappa`) e
// 14 luoghi su 109 hanno un valore diverso da quello che darebbero gli orari: portarlo non sarebbe un'equivalenza. Si lascia alla decisione dell'utente.
// NON esce `negozio.orari_json`: non è una copia (8 negozi con sede hanno un orario proprio, mai promosso né scartato da L5; vedi la scheda B12 §3.5).
//   - `negozio.orari`: si archiviano SOLO le frasi che il dizionario della 069 non rende con lo stesso `orari_json` della riga (sulla copia reale:
//     59 frasi su 59 coincidono, quindi 0 da archiviare: la colonna era una copia esatta);
//   - `luogo.giorni`, `luogo.giorni_json`, `negozio.sblocco`: si archiviano TUTTE le righe con un valore (nessuna prova di copia esatta, nessun
//     lettore: restano come storia, convenzione di 176 e 177).
// Il registro `FONTI_TOLTE` (server/db/fontiTolte.ts) riceve una voce per ogni colonna tolta. Idempotente (ogni colonna si toglie solo se c'è) e
// senza modifiche parziali: le impronte di ogni riga delle tabelle toccate (colonne rimaste) e di quelle che non deve toccare si controllano dopo.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { ORARI_DALLA_PROSA } from './069_orari_strutturati.js';
import { archiviaFrasi, archiviate, esisteTabella, haColonna, improntaTabella, righeConValore, type RigheArchiviate } from './pulizieL11.js';

const COLONNE = [['luogo', 'giorni'], ['luogo', 'giorni_json'], ['negozio', 'orari'], ['negozio', 'sblocco']] as const;
const TOCCATE = ['luogo', 'negozio'] as const;
/** Le tabelle che questa migrazione non deve cambiare. */
const INTATTE = ['articolo', 'quartiere', 'attivita', 'spillo', 'cestino', 'voce_giornata', 'confidente_disponibilita'] as const;
const errore = (motivo: string): never => { throw new Error(`184: ${motivo}; nessuna modifica applicata.`); };

/** Le frasi di `negozio.orari` che il dizionario della 069 non rende con lo stesso `orari_json` della riga. */
function frasiOrariNonCoperte(db: AppDatabase): { totale: number; coperte: number; nonCoperte: RigheArchiviate } {
  const conOrariJson = haColonna(db, 'negozio', 'orari_json');
  const righe = db.prepare(`SELECT chiave, orari, ${conOrariJson ? 'orari_json' : 'NULL AS orari_json'} FROM main.negozio WHERE orari IS NOT NULL AND orari <> '' ORDER BY rowid`)
    .all() as Array<{ chiave: string; orari: string; orari_json: string | null }>;
  const nonCoperte: RigheArchiviate = {};
  let coperte = 0;
  for (const r of righe) {
    const atteso = ORARI_DALLA_PROSA[r.orari.replace(/\s+/g, ' ').trim()];
    let attuale: unknown;
    try { attuale = r.orari_json === null ? null : JSON.parse(r.orari_json); } catch { attuale = undefined; }
    if (atteso && JSON.stringify(atteso) === JSON.stringify(attuale)) coperte += 1;
    else nonCoperte[r.chiave] = r.orari;
  }
  return { totale: righe.length, coperte, nonCoperte };
}

export const migration184: Migration = {
  id: 184, name: 'frasi_di_orari_e_sblocco_tolte',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const daTogliere = COLONNE.filter(([t, c]) => esisteTabella(db, t) && haColonna(db, t, c));
    if (daTogliere.length === 0) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');
    const togliendo = (t: string) => daTogliere.filter(([tt]) => tt === t).map(([, c]) => c as string);

    // 1. impronte prima: colonne che restano delle tabelle toccate, e tabelle intatte
    const prima = new Map<string, string>();
    for (const t of TOCCATE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t, togliendo(t)));
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));

    // 2. ciò che si archivia
    const colonne: Record<string, RigheArchiviate> = {};
    const prove: Record<string, unknown> = {};
    const attesi: Record<string, number> = {};
    if (haColonna(db, 'luogo', 'giorni')) colonne['luogo.giorni'] = righeConValore(db, 'luogo', 'giorni');
    if (haColonna(db, 'luogo', 'giorni_json')) colonne['luogo.giorni_json'] = righeConValore(db, 'luogo', 'giorni_json', ['', '[]']);
    if (haColonna(db, 'negozio', 'sblocco')) colonne['negozio.sblocco'] = righeConValore(db, 'negozio', 'sblocco');
    if (haColonna(db, 'negozio', 'orari')) {
      const o = frasiOrariNonCoperte(db);
      colonne['negozio.orari'] = o.nonCoperte;
      prove['negozio.orari'] = { frasi: o.totale, copieEsatteDelDizionario069: o.coperte, archiviate: Object.keys(o.nonCoperte).length };
    }
    for (const [k, v] of Object.entries(colonne)) attesi[k] = Object.keys(v).length;
    archiviaFrasi(db, 'L11-B12 · 184', colonne, prove);

    // 3. togliere le colonne
    for (const [t, c] of daTogliere) db.exec(`ALTER TABLE main.${t} DROP COLUMN "${c}"`);

    // 4. verifiche dopo: archivio completo, colonne sparite, il resto identico
    for (const [k, n] of Object.entries(attesi)) if (archiviate(db, k) !== n) errore(`l'archivio di ${k} non ha ${n} righe`);
    for (const [t, c] of daTogliere) if (haColonna(db, t, c)) errore(`la colonna ${t}.${c} esiste ancora`);
    for (const t of TOCCATE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`le colonne rimaste di ${t} sono cambiate`);
    for (const t of INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L11-B12-184', tolte: daTogliere.map(([t, c]) => `${t}.${c}`), archiviate: attesi, prove }, 'frasi di orari e di sblocco tolte dal modello');
  },
};
