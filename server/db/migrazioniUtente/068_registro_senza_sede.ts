// ============================================================
// Utente 068 — `registro_acquisti.sede_chiave` tolta: la scorta è dell'offerta (L2-10, lotto «Macchine e fine del listino condiviso»)
// ============================================================
//
// Ogni macchina è un punto vendita con le sue offerte: un acquisto vale per l'offerta che cita, e la colonna della sede non si legge né si scrive più.
// La colonna si toglie sempre, così lo schema converge e `FONTI_TOLTE` è vera. Il codice di prima scriveva qui, per gli acquisti dalla pagina del negozio, la sede
// principale: una riga può quindi avere un valore. Prima di toglierla, la riga comprata in una sede aggiuntiva (Central Street, Tornello) passa all'offerta della macchina
// che quella sede è diventata (`rimappaAcquisti`), così la scorta non cambia di macchina; il valore resta anche nella copia fatta prima delle migrazioni (`runBootBackup`). Il conteggio e i valori (id della riga → sede) vanno nel verbale `main.dati_guida.audit-utente-068-sede`
// quando il file di gioco è attaccato, come fanno le migrazioni utente 052, 053, 055, 056; il log dice quante righe avevano un valore.
// Il CHECK sta sulla colonna, e con la colonna se ne va. Dopo la rimappatura le altre colonne di ogni riga restano identiche (impronta prima e dopo del DROP). In `RIFERIMENTI_PARTITE` la colonna
// resta opzionale per i file vecchi. Idempotente: se la colonna non c'è non fa niente.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';

const COLONNA = 'sede_chiave';
const errore = (motivo: string): never => { throw new Error(`utente 068: ${motivo}; nessuna modifica applicata.`); };

const colonne = (db: AppDatabase): string[] => (db.prepare('PRAGMA utente.table_info(registro_acquisti)').all() as Array<{ name: string }>).map((c) => c.name);

/** Numero delle righe e SHA-256 delle colonne che restano. */
function impronta(db: AppDatabase): string {
  const tenute = colonne(db).filter((c) => c !== COLONNA).map((c) => `"${c}"`).join(', ');
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare(`SELECT ${tenute} FROM utente.registro_acquisti ORDER BY id`).iterate()) { h.update(JSON.stringify(r) + '\n'); n++; }
  return `${n}:${h.digest('hex')}`;
}

const AUDIT = 'audit-utente-068-sede';
const CENTRAL_STREET = 'shibuya/distributori-central-street';
const TORNELLO = 'shibuya/distributore-tornello-ginza';
/** Il listino d'origine, la sua sede aggiuntiva e la macchina che è diventata (migrazioni 348 e 350). */
const MACCHINE_DELLE_SEDI: ReadonlyArray<{ negozio: string; sede: string; macchina: string }> = [
  { negozio: 'distributore-shujin-edificio', sede: CENTRAL_STREET, macchina: 'distributore-shibuya-central-street-1' },
  { negozio: 'distributore-shujin-cancello-2', sede: CENTRAL_STREET, macchina: 'distributore-shibuya-central-street-2' },
  { negozio: 'distributore-yongen-tabaccaio', sede: CENTRAL_STREET, macchina: 'distributore-shibuya-central-street-3' },
  { negozio: 'distributore-shujin-edificio', sede: TORNELLO, macchina: 'distributore-shibuya-tornello-1' },
  { negozio: 'distributore-yongen-tabaccaio', sede: TORNELLO, macchina: 'distributore-shibuya-tornello-2' },
];

/**
 * Un acquisto fatto in una sede aggiuntiva è un acquisto di quella macchina: la riga passa all'offerta della macchina nuova, se esiste, e porta con sé il segno
 * «ottenuto» (`acquisto_partita`), che sull'offerta d'origine resta solo se un'altra riga lo porta ancora. Così le scorte non cambiano di macchina.
 */
function rimappaAcquisti(db: AppDatabase): Array<{ id: number; da: string; a: string }> {
  const fatte: Array<{ id: number; da: string; a: string }> = [];
  for (const m of MACCHINE_DELLE_SEDI) {
    const righe = db.prepare(`SELECT id, partita_id, articolo_chiave, ottenuto_qui FROM utente.registro_acquisti WHERE ${COLONNA} = ? AND articolo_chiave LIKE ? ORDER BY id`)
      .all(m.sede, `${m.negozio}/%`) as Array<{ id: number; partita_id: number; articolo_chiave: string; ottenuto_qui: number }>;
    for (const r of righe) {
      const nuova = `${m.macchina}/${r.articolo_chiave.slice(m.negozio.length + 1)}`;
      if (!db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ?').get(nuova)) continue;
      db.prepare('UPDATE utente.registro_acquisti SET articolo_chiave = ? WHERE id = ?').run(nuova, r.id);
      if (r.ottenuto_qui === 1) {
        db.prepare('INSERT OR IGNORE INTO utente.acquisto_partita (partita_id, articolo_chiave, updated_at) SELECT partita_id, ?, updated_at FROM utente.acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').run(nuova, r.partita_id, r.articolo_chiave);
        if (!db.prepare('SELECT 1 FROM utente.registro_acquisti WHERE partita_id = ? AND articolo_chiave = ? AND ottenuto_qui = 1').get(r.partita_id, r.articolo_chiave)) {
          db.prepare('DELETE FROM utente.acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').run(r.partita_id, r.articolo_chiave);
        }
      }
      fatte.push({ id: r.id, da: r.articolo_chiave, a: nuova });
    }
  }
  return fatte;
}

export const utente068: Migration = {
  id: 68,
  name: 'registro_senza_sede',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!colonne(db).includes(COLONNA)) return;
    const conValore = db.prepare(`SELECT COUNT(*) FROM utente.registro_acquisti WHERE ${COLONNA} IS NOT NULL`).pluck().get() as number;
    if (conValore > 0) logger.warn({ migrazione: 'utente-068', righeConSede: conValore }, 'registro_acquisti aveva righe con la sede: i valori restano nel verbale e nella copia di avvio');
    const conGioco = !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'dati_guida'").get();
    const valori = Object.fromEntries((db.prepare(`SELECT id, ${COLONNA} AS sede FROM utente.registro_acquisti WHERE ${COLONNA} IS NOT NULL ORDER BY id`).all() as Array<{ id: number; sede: string }>).map((r) => [String(r.id), r.sede]));
    const rimappate = conGioco ? rimappaAcquisti(db) : [];
    if (conGioco) {
      const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
      const esecuzioni = vecchio ? (JSON.parse(vecchio) as { esecuzioni?: unknown[] }).esecuzioni ?? [] : [];
      db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
        .run(AUDIT, JSON.stringify({ migrazione: 'utente-068', esecuzioni: [...esecuzioni, { il: new Date().toISOString(), righeConSede: conValore, valori, rimappate }] }));
    }
    const prima = impronta(db);
    db.exec(`ALTER TABLE utente.registro_acquisti DROP COLUMN ${COLONNA}`);
    if (colonne(db).includes(COLONNA)) errore('la colonna esiste ancora');
    if (impronta(db) !== prima) errore('le altre colonne del registro sono cambiate');
    logger.info({ migrazione: 'utente-068', righeConSede: conValore }, 'registro_acquisti.sede_chiave tolta');
  },
};
