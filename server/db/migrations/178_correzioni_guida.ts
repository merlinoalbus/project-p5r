// ============================================================
// 178 — correzioni ai dati della guida e nomi delle Doti sulla colonna (L11 · B11, R11-15/5, /6, /8, /9, /10, /11, /12)
// ============================================================
//
// 1. `correzione_dati_guida`: le correzioni dell'utente ai blocchi JSON di `dati_guida` (personaggi, sfide, completamento, oggetti, Jose). Il
//    blocco della guida non si riscrive mai: una correzione è una riga (blocco, indirizzo del valore) col valore nuovo e, per riferimento, il
//    valore che la guida aveva alla prima correzione (`guida_json`). Si applica in lettura (`datiGuidaCorretti`).
// 2. `origine`, `seed_json`, `updated_at` su `quartiere`, `trofeo`, `dote_sociale` e `trasformazione_oggetto`: la correzione è un UPDATE sul
//    posto e `seed_json` è la fotografia dei campi alla prima correzione (la stessa convenzione di luogo, libro, area, dungeon).
// 3. Doti sociali: i nomi della Dote e dei suoi ranghi si leggevano dalla tabella `traduzione` (ambiti `doteSociale` e `rangoDote`), con un
//    «Ripristina» che guardava il pacchetto del repository. Da qui la fonte è la colonna `nome` di `dote_sociale` e `dote_sociale_rango`: la
//    migrazione copia nelle colonne il testo della traduzione (se diverso), archivia le righe nel blocco `dati_guida.archivio-traduzioni-doti-l11`
//    e le toglie da `traduzione`. Si tolgono righe, non strutture: nessuna voce in `FONTI_TOLTE`.
// Idempotente. Nessuna scrittura in `utente`. Ogni anomalia lancia prima di cambiare qualcosa (il runner la esegue in una transazione, con la
// copia di avvio come via di ritorno) e, a lavoro fatto, la migrazione rilegge le impronte di ciò che non doveva cambiare.
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const ARCHIVIO = 'archivio-traduzioni-doti-l11';
const AMBITI_DOTI = "('doteSociale', 'rangoDote')";
const TABELLE_CORREGGIBILI = ['quartiere', 'trofeo', 'dote_sociale', 'trasformazione_oggetto'] as const;

/** Ciò che questa migrazione non deve cambiare: ogni riga, nell'ordine della chiave, prima e dopo (le tabelle con colonne nuove: le sole colonne di prima). */
const SENTINELLE: Record<string, string> = {
  quartiere: 'SELECT chiave, ordine, nome, sblocco, descrizione, fonte, sblocco_data, condizioni_json, fonte_condizioni_json, condizioni_guida_json, fonte_condizioni_guida_json FROM main.quartiere ORDER BY chiave',
  trofeo: 'SELECT chiave, ordine, nome, nome_en, tipo, descrizione, come, mancabile, quando, fonte, verificato FROM main.trofeo ORDER BY chiave',
  trasformazione_oggetto: 'SELECT dungeon_chiave, cristallo_chiave, anello_chiave, solo_ng_plus, fonte FROM main.trasformazione_oggetto ORDER BY dungeon_chiave',
  dote_sociale_ordine: 'SELECT chiave, ordine FROM main.dote_sociale ORDER BY chiave',
  dote_sociale_rango_soglie: 'SELECT dote_chiave, rango, soglia FROM main.dote_sociale_rango ORDER BY dote_chiave, rango',
  traduzione_altri_ambiti: `SELECT * FROM main.traduzione WHERE ambito NOT IN ${AMBITI_DOTI} ORDER BY ambito, chiave`,
  dati_guida: `SELECT * FROM main.dati_guida WHERE chiave <> '${ARCHIVIO}' ORDER BY chiave`,
  mappa: 'SELECT * FROM main.mappa ORDER BY chiave',
  mappa_percorso: 'SELECT * FROM main.mappa_percorso ORDER BY mappa_chiave',
  luogo: 'SELECT * FROM main.luogo ORDER BY chiave',
  spillo: 'SELECT * FROM main.spillo ORDER BY id',
  cestino: 'SELECT * FROM main.cestino ORDER BY id',
  catalogo_oggetto: 'SELECT * FROM main.catalogo_oggetto ORDER BY chiave',
  dungeon: 'SELECT * FROM main.dungeon ORDER BY chiave',
};

const errore = (motivo: string): never => { throw new Error(`178: ${motivo}; nessuna modifica applicata.`); };
const esiste = (db: AppDatabase, tabella: string): boolean => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(tabella);
const colonne = (db: AppDatabase, tabella: string): string[] => (db.prepare(`PRAGMA main.table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name);
function firma(db: AppDatabase, sql: string): string {
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare(sql).iterate()) { h.update(JSON.stringify(r) + '\n'); n++; }
  return `${n}:${h.digest('hex')}`;
}

export const migration178: Migration = {
  id: 178, name: 'correzioni_guida',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const sentinelle = Object.keys(SENTINELLE).filter((k) => {
      const tabella = k === 'dote_sociale_ordine' ? 'dote_sociale' : k === 'dote_sociale_rango_soglie' ? 'dote_sociale_rango' : k === 'traduzione_altri_ambiti' ? 'traduzione' : k;
      if (!esiste(db, tabella)) return false;
      try { db.prepare(SENTINELLE[k]!).all(); return true; } catch { return false; } // uno schema di prima di una colonna: la sentinella non si può leggere, non si usa
    });
    const prima = new Map(sentinelle.map((k) => [k, firma(db, SENTINELLE[k]!)]));

    // 1. la tabella delle correzioni ai blocchi
    db.exec(`CREATE TABLE IF NOT EXISTS main.correzione_dati_guida (
      blocco      TEXT NOT NULL,
      percorso    TEXT NOT NULL,
      valore_json TEXT NOT NULL,
      guida_json  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      PRIMARY KEY (blocco, percorso)
    ) WITHOUT ROWID`);
    db.exec('CREATE INDEX IF NOT EXISTS main.correzione_dati_guida_blocco ON correzione_dati_guida (blocco)');

    // 2. le colonne di correzione sulle tabelle a righe
    const aggiunte: string[] = [];
    for (const t of TABELLE_CORREGGIBILI) {
      if (!esiste(db, t)) continue;
      const col = colonne(db, t);
      if (!col.includes('origine')) { db.exec(`ALTER TABLE main.${t} ADD COLUMN origine TEXT NOT NULL DEFAULT 'seed' CHECK (origine IN ('seed','utente'))`); aggiunte.push(`${t}.origine`); }
      if (!col.includes('seed_json')) { db.exec(`ALTER TABLE main.${t} ADD COLUMN seed_json TEXT`); aggiunte.push(`${t}.seed_json`); }
      if (!col.includes('updated_at')) { db.exec(`ALTER TABLE main.${t} ADD COLUMN updated_at TEXT`); aggiunte.push(`${t}.updated_at`); }
    }

    // 3. i nomi delle Doti sulla colonna
    let righeArchiviate = 0;
    let nomiAllineati = 0;
    if (esiste(db, 'traduzione') && esiste(db, 'dote_sociale') && esiste(db, 'dote_sociale_rango')) {
      const righe = db.prepare(`SELECT * FROM main.traduzione WHERE ambito IN ${AMBITI_DOTI} ORDER BY ambito, chiave`).all() as Array<{ ambito: string; chiave: string; testo: string }>;
      if (righe.length > 0) {
        const dote = db.prepare('UPDATE main.dote_sociale SET nome = ? WHERE chiave = ? AND nome <> ?');
        const rango = db.prepare('UPDATE main.dote_sociale_rango SET nome = ? WHERE dote_chiave = ? AND rango = ? AND nome <> ?');
        for (const r of righe) {
          const testo = r.testo.trim();
          if (!testo) continue;
          if (r.ambito === 'doteSociale') nomiAllineati += dote.run(testo, r.chiave, testo).changes;
          else {
            const m = /^([^/]+)\/([1-5])$/.exec(r.chiave);
            if (m) nomiAllineati += rango.run(testo, m[1]!, Number(m[2]), testo).changes;
          }
        }
        const archivio = { versione: 1, migrazione: 'L11-B11', motivo: 'I nomi delle Doti e dei ranghi si leggono dalle colonne nome di dote_sociale e dote_sociale_rango; le righe di traduzione degli ambiti doteSociale e rangoDote si tolgono (vedi docs/coordinamento/lotti/L11/ondata1/B11-ripristino.md §4.7).', righe };
        db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(ARCHIVIO, JSON.stringify(archivio));
        const scritto = JSON.parse(String(db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(ARCHIVIO))) as { righe: unknown[] };
        if (scritto.righe.length !== righe.length) errore('archivio delle traduzioni delle Doti incompleto');
        const tolte = db.prepare(`DELETE FROM main.traduzione WHERE ambito IN ${AMBITI_DOTI}`).run().changes;
        if (tolte !== righe.length) errore(`righe tolte (${tolte}) diverse da quelle archiviate (${righe.length})`);
        righeArchiviate = tolte;
      }
    }

    // Verifiche: le colonne ci sono, le tabelle non toccate sono identiche (le sole `dote_sociale*` hanno i nomi, controllati sotto)
    for (const t of TABELLE_CORREGGIBILI) {
      if (!esiste(db, t)) continue;
      const col = colonne(db, t);
      for (const c of ['origine', 'seed_json', 'updated_at']) if (!col.includes(c)) errore(`manca la colonna ${t}.${c}`);
    }
    for (const k of sentinelle) if (firma(db, SENTINELLE[k]!) !== prima.get(k)) errore(`la tabella ${k} è cambiata`);
    if (esiste(db, 'traduzione') && (db.prepare(`SELECT COUNT(*) FROM main.traduzione WHERE ambito IN ${AMBITI_DOTI}`).pluck().get() as number) !== 0) errore('restano righe di traduzione delle Doti');
    logger.info({ migrazione: 'L11-B11', colonneAggiunte: aggiunte.length, nomiDelleDotiAllineatiAlleColonne: nomiAllineati, righeDiTraduzioneArchiviateETolte: righeArchiviate }, 'correzioni alla guida: tabella e colonne create, nomi delle Doti sulla colonna');
  },
};
