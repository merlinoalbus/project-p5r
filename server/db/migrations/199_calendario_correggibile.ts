// ============================================================
// 199 — eventi propri del Calendario e allerte meteo correggibili, con «Ripristina» (L11 · R11-15/1)
// ============================================================
//
// Oggi il Calendario correggeva solo il giorno (`giorno`, R9-19). Gli eventi che nessun'altra tabella possiede (feste, trama, consigli, sblocchi
// con «rango massimo») e le allerte meteo del gioco non avevano scrittura. Per correggerli e rimetterli com'erano le due tabelle seguono la
// convenzione di `giorno`, `quartiere` e `trofeo` (migrazioni 168 e 178):
//   - `origine`: `seed` finché la riga vale quello della guida, `utente` dopo una correzione (torna `seed` rimettendo la guida);
//   - `seed_json`: la fotografia dei campi corretti, presa alla PRIMA correzione (i campi della guida di prima), e `updated_at`: quando.
// La migrazione aggiunge soltanto le tre colonne a `evento_calendario` e a `allerta_meteo`. Non fotografa niente: nessuna delle due tabelle
// aveva una colonna che distinguesse una riga corretta dall'utente, quindi ogni riga di oggi è, per definizione, quella della guida (`origine =
// 'seed'`, `seed_json` vuoto) e la prima correzione prenderà la fotografia. Nessun valore cambia, nessuna riga si perde o si sposta: gli id degli
// eventi sono il riferimento di `evento_calendario_voce` e restano gli stessi.
// Idempotente (ogni colonna si aggiunge solo se manca). Ogni anomalia lancia prima di cambiare qualcosa (il runner la esegue in una transazione e
// la copia di avvio è la via di ritorno); a lavoro fatto riconfronta le impronte delle due tabelle (senza le colonne nuove) e di ciò che non
// doveva cambiare. Solo `main`: non scrive in `utente`.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { colonneDi, conta, esisteTabella, improntaTabella } from './pulizieL11.js';

const TABELLE = ['evento_calendario', 'allerta_meteo'] as const;
const NUOVE = ['origine', 'seed_json', 'updated_at'] as const;
/** Le tabelle che questa migrazione non deve cambiare. */
const INTATTE = ['giorno', 'settimana_guida', 'voce_giornata', 'evento_calendario_voce', 'dungeon', 'confidente_invito', 'dati_guida', 'cestino'] as const;
const errore = (motivo: string): never => { throw new Error(`199: ${motivo}; nessuna modifica applicata.`); };

function aggiungiColonne(db: AppDatabase, tabella: string): void {
  if (!colonneDi(db, tabella).includes('origine')) db.exec(`ALTER TABLE main.${tabella} ADD COLUMN origine TEXT NOT NULL DEFAULT 'seed' CHECK (origine IN ('seed', 'utente'))`);
  if (!colonneDi(db, tabella).includes('seed_json')) db.exec(`ALTER TABLE main.${tabella} ADD COLUMN seed_json TEXT`);
  if (!colonneDi(db, tabella).includes('updated_at')) db.exec(`ALTER TABLE main.${tabella} ADD COLUMN updated_at TEXT`);
}

export const migration199: Migration = {
  id: 199, name: 'calendario_correggibile',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of TABELLE) if (!esisteTabella(db, t)) errore(`manca la tabella ${t}`);

    // impronte e conteggi prima (le sole colonne di prima)
    const prima = new Map<string, string>();
    for (const t of TABELLE) prima.set(t, improntaTabella(db, t, NUOVE));
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));
    const nEventi = conta(db, 'SELECT COUNT(*) FROM main.evento_calendario');
    const nAllerte = conta(db, 'SELECT COUNT(*) FROM main.allerta_meteo');

    for (const t of TABELLE) aggiungiColonne(db, t);

    // controlli: stesse righe e stessi valori, nessuna correzione inventata, nessuna fotografia prematura
    for (const t of TABELLE) {
      if (improntaTabella(db, t, NUOVE) !== prima.get(t)) errore(`la tabella ${t} è cambiata nelle colonne di prima`);
      for (const c of NUOVE) if (!colonneDi(db, t).includes(c)) errore(`${t}: manca la colonna ${c}`);
      if (conta(db, `SELECT COUNT(*) FROM main.${t} WHERE origine <> 'seed' OR seed_json IS NOT NULL OR updated_at IS NOT NULL`) !== 0) errore(`${t}: una riga risulta già corretta`);
    }
    for (const t of INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    if (conta(db, 'SELECT COUNT(*) FROM main.evento_calendario') !== nEventi) errore('il numero degli eventi è cambiato');
    if (conta(db, 'SELECT COUNT(*) FROM main.allerta_meteo') !== nAllerte) errore('il numero delle allerte è cambiato');
    logger.info({ migrazione: 'L11-R11-15-1-199', eventi: nEventi, allerte: nAllerte }, 'calendario: eventi e allerte correggibili (fotografia alla prima correzione)');
  },
};
