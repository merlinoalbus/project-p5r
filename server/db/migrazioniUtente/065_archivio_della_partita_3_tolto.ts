// ============================================================
// Utente 065 — le 15 righe d'archivio della partita 3, che non esiste più, tolte (decisione dell'utente del 01/11, «Toglile»)
// ============================================================
//
// L11-04 aveva trovato nell'archivio immutabile `acquisto_legacy_valutazione` della copia della produzione del 01/11 15 righe della partita 3,
// che non c'è più né fra le partite né nel Cestino: l'archivio non ha una chiave esterna verso la partita (le sue righe non si cancellano mai)
// e dalla utente 064 nessuna partita nuova può più prendere l'id 3, quindi non le vedeva nessuno. Risposta dell'utente: «Toglile».
//
// COSA (conservativa, idempotente): si tolgono SOLO le 15 righe dell'elenco (id e partita letti sulla copia), e solo se:
//   - la partita 3 non c'è fra le partite, né nel Cestino delle partite (riga con `partita_id` 3 o passo del registro sulla tabella `partita`
//     con id 3), né nel vecchio cestino del file di gioco (tipo «partita», chiave 3);
//   - le righe della partita 3 nell'archivio sono esattamente quelle dell'elenco, tutte «nuova-presenza» (nessuna è una prova iniziale del
//     marcatore di continuità) e nessuna associazione o raccordo le cita;
//   - l'archivio è coerente prima (`verificaArchivioLegacy`).
// Il blocco dell'archivio (innesco `acquisto_legacy_valutazione_no_delete`) si toglie per le sole righe dell'elenco e si rimette uguale
// subito dopo, nella stessa transazione; l'innesco degli aggiornamenti non si tocca. Dopo: l'archivio è ancora coerente, l'innesco è quello di
// prima, le altre righe dell'archivio e tutte le altre tabelle delle partite sono identiche. Il contatore degli id delle partite
// (`sqlite_sequence`, utente 064) non scende mai, quindi l'id 3 resta inutilizzabile. Conteggi prima e dopo nel log. Nessuna riga se le
// condizioni non valgono (un'altra istanza, o la partita 3 tornata dal Cestino): niente da fare.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { verificaArchivioLegacy } from '../acquistiLegacy.js';

const PARTITA = 3;
const TABELLA = 'acquisto_legacy_valutazione';
const INNESCO = `${TABELLA}_no_delete`;
/** Le 15 righe della partita 3 lette sulla copia della produzione del 01/11. */
const RIGHE: readonly string[] = [
  '0fadbf63b85dd69c101fd2d680ae4707', '1497452573964242a15e239e9f0bc7ae', '209d985e003f71e62207f2227b64c6ab', '30d6481a569521447191e652140c9c92',
  '347854f4b1754d71cf11c91a48e3c4da', '39398fc6f5ee91f69bffc748c1104c66', '39e15054ea5f58d043604a3cd6b7068e', '3aac2808a6f0af8473b889d4259e18ca',
  '4c7e1a20c5ccb713391760a823e69b84', '8d6b7e953c00a7e378aec1b2a2d77b17', 'ae0c817db70fd03679e985ab1b7c426f', 'b727de31483cf955c9fec72c8256daf7',
  'cda735904590484cd3f577f61fbe1940', 'd95fcdcec2c556000cee360762a38afb', 'ecfcc6e306a782d76153e058491790ff',
];

const tabella = (db: AppDatabase, schema: 'main' | 'utente', nome: string): boolean =>
  !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(nome);
const normalizza = (sql: string): string => sql.replace(/utente\./g, '').replace(/\s+/g, '');

/** L'impronta di tutte le tabelle delle partite (righe in ordine di rowid), senza l'archivio, e quella dell'archivio senza le righe dell'elenco. */
function impronte(db: AppDatabase): { altre: string; archivio: string } {
  const altre = createHash('sha256'), archivio = createHash('sha256');
  const tabelle = db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").pluck().all() as string[];
  for (const t of tabelle) {
    if (t === TABELLA) continue;
    altre.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}" ORDER BY rowid`).raw().iterate() as Iterable<unknown[]>) altre.update(JSON.stringify(r) + '\n');
  }
  const elenco = new Set(RIGHE);
  for (const r of db.prepare(`SELECT * FROM utente.${TABELLA} ORDER BY rowid`).iterate() as Iterable<{ id: string }>) if (!elenco.has(r.id)) archivio.update(JSON.stringify(r) + '\n');
  return { altre: altre.digest('hex'), archivio: archivio.digest('hex') };
}

/** Dove c'è ancora la partita 3 (null = in nessun posto: né fra le partite né in un Cestino). */
function partitaPresente(db: AppDatabase): string | null {
  if (db.prepare('SELECT 1 FROM utente.partita WHERE id = ?').get(PARTITA)) return 'la partita 3 c\'è fra le partite';
  if (tabella(db, 'utente', 'cestino_partite')) {
    const colonne = db.prepare("SELECT name FROM pragma_table_info('cestino_partite', 'utente')").pluck().all() as string[];
    if (colonne.includes('partita_id') && db.prepare('SELECT 1 FROM utente.cestino_partite WHERE partita_id = ?').get(PARTITA)) return 'la partita 3 è nel Cestino';
    const nelRegistro = db.prepare(`SELECT 1 FROM utente.cestino_partite c, json_each(c.registro_json) p
      WHERE json_valid(c.registro_json) AND json_extract(p.value, '$.tabella') = 'partita'
        AND CAST(COALESCE(json_extract(p.value, '$.prima.id'), json_extract(p.value, '$.dopo.id')) AS INTEGER) = ? LIMIT 1`).get(PARTITA);
    if (nelRegistro) return 'la partita 3 è in un registro del Cestino';
  }
  if (tabella(db, 'main', 'cestino') && db.prepare("SELECT 1 FROM main.cestino WHERE tipo = 'partita' AND CAST(chiave AS INTEGER) = ?").get(PARTITA)) return 'la partita 3 è nel vecchio cestino';
  return null;
}

export const utente065: Migration = {
  id: 65,
  name: 'archivio_della_partita_3_tolto',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 065: manca la transazione della migrazione; nessuna modifica applicata.');
    if (!tabella(db, 'utente', TABELLA) || !tabella(db, 'utente', 'partita')) return;
    const conta = (): { totale: number; partita3: number } => ({
      totale: db.prepare(`SELECT COUNT(*) FROM utente.${TABELLA}`).pluck().get() as number,
      partita3: db.prepare(`SELECT COUNT(*) FROM utente.${TABELLA} WHERE partita_id = ?`).pluck().get(PARTITA) as number,
    });
    const prima = conta();
    const salta = (motivo: string): void => { logger.info({ migrazione: 'utente 065', ...prima, motivo }, 'archivio della partita 3: niente da togliere'); };
    if (prima.partita3 === 0) return salta('nessuna riga della partita 3');
    const presente = partitaPresente(db);
    if (presente) return salta(presente);

    const righe = db.prepare(`SELECT id, origine FROM utente.${TABELLA} WHERE partita_id = ? ORDER BY id`).all(PARTITA) as Array<{ id: string; origine: string }>;
    if (righe.length !== RIGHE.length || righe.some((r, i) => r.id !== [...RIGHE].sort()[i])) return salta('le righe della partita 3 non sono quelle dell\'elenco');
    if (righe.some((r) => r.origine !== 'nuova-presenza')) return salta('una riga è una prova del marcatore di continuità');
    const citate = (['acquisto_legacy_associazione', 'acquisto_legacy_raccordo'] as const).filter((t) => tabella(db, 'utente', t)
      && db.prepare(`SELECT 1 FROM utente.${t} WHERE valutazione_id IN (${RIGHE.map(() => '?').join(', ')}) LIMIT 1`).get(...RIGHE));
    if (citate.length) return salta(`righe citate da ${citate.join(', ')}`);
    try { verificaArchivioLegacy(db); } catch (err) { return salta(`archivio non coerente già prima: ${err instanceof Error ? err.message : String(err)}`); }

    const innesco = db.prepare("SELECT sql FROM utente.sqlite_master WHERE type = 'trigger' AND name = ?").pluck().get(INNESCO) as string | undefined;
    const atteso = `CREATE TRIGGER ${INNESCO} BEFORE DELETE ON ${TABELLA} BEGIN SELECT RAISE(ABORT, 'Archivio acquisti immutabile'); END`;
    if (!innesco || normalizza(innesco) !== normalizza(atteso)) throw new Error('utente 065: il blocco dell\'archivio non è quello atteso; nessuna modifica applicata.');
    const improntePrima = impronte(db);

    // il blocco si toglie per le sole righe dell'elenco e si rimette uguale, nella stessa transazione
    db.exec(`DROP TRIGGER utente.${INNESCO}`);
    const tolte = db.prepare(`DELETE FROM utente.${TABELLA} WHERE partita_id = ? AND id IN (${RIGHE.map(() => '?').join(', ')})`).run(PARTITA, ...RIGHE).changes;
    db.exec(`CREATE TRIGGER utente.${INNESCO} BEFORE DELETE ON ${TABELLA} BEGIN SELECT RAISE(ABORT, 'Archivio acquisti immutabile'); END`);

    const dopo = conta();
    const innescoDopo = db.prepare("SELECT sql FROM utente.sqlite_master WHERE type = 'trigger' AND name = ?").pluck().get(INNESCO) as string | undefined;
    if (tolte !== RIGHE.length || dopo.partita3 !== 0 || dopo.totale !== prima.totale - RIGHE.length) throw new Error(`utente 065: tolte ${tolte} righe invece di ${RIGHE.length}; nessuna modifica applicata.`);
    if (!innescoDopo || normalizza(innescoDopo) !== normalizza(innesco)) throw new Error('utente 065: il blocco dell\'archivio non è stato rimesso uguale; nessuna modifica applicata.');
    const impronteDopo = impronte(db);
    if (impronteDopo.altre !== improntePrima.altre) throw new Error('utente 065: altre tabelle delle partite sono cambiate; nessuna modifica applicata.');
    if (impronteDopo.archivio !== improntePrima.archivio) throw new Error('utente 065: altre righe dell\'archivio sono cambiate; nessuna modifica applicata.');
    verificaArchivioLegacy(db);
    logger.info({ migrazione: 'utente 065', prima, dopo, tolte }, 'archivio della partita 3 tolto');
  },
};
