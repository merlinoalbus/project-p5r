// ============================================================
// 357 — via `voce_giornata.produce_json`, la copia storica degli effetti delle voci (L6-08, lotto L6 «Diario»)
// ============================================================
//
// Richiesta dell'utente (risposta Q12 = A): «prima il controllo, poi la rimozione con archivio». `produce_json` non si legge né si scrive più dal
// codice (gli effetti stanno solo in `voce_effetto`, un solo punto di modifica); per le voci che esistevano alla 136 il contenuto grezzo di allora è in
// `voce_effetto_transizione.raw_json` (che non si tocca), per tutte in archivio dopo questa migrazione. Su 1090 voci 198 hanno un valore diverso da «[]» (215 elementi, 26 voci nel validato).
//
// COSA, in quest'ordine:
//  (1) il CONTROLLO (`produceJsonL6.controllaProduce`, sola lettura): ogni elemento ha un equivalente strutturato? Il verbale
//      `dati_guida.audit-l6-08-produce-json` elenca per intero (uid, giorno, ordine, elemento, classe, motivo) quelli che non hanno l'effetto
//      identico nella stessa voce e dice quanti non hanno alcun equivalente («senzaEquivalente»): una perdita possibile fuori dal validato non si
//      ripara qui (non si aggiungono effetti), si porta all'utente; nulla si perde comunque perché tutto va in archivio.
//  (2) l'ARCHIVIO: ogni valore diverso da «[]» (uid → testo originale) in `dati_guida.archivio-frasi-l11`, colonna `voce_giornata.produce_json`,
//      senza sovrascrivere e riletto riga per riga contro il valore di partenza.
//  (3) la colonna si toglie con `ALTER TABLE … DROP COLUMN` — SOLO se la migrazione utente 015 è già passata (`utente.user_version >= 15`).
//      La 015 prepara SQL su `main.voce_giornata.produce_json` e non si modifica; il runner applica prima tutte le migrazioni di gioco e poi
//      quelle delle partite, quindi su un'istanza nuova (partite.db da zero) una DROP qui farebbe fallire l'avvio con «no such column». Se la 015
//      non è ancora passata la colonna resta (archiviata comunque) e la migrazione utente 69 la toglie dopo la 015, archiviando ciò che la 015
//      avesse portato dentro. Produzione e backup importati (partite già oltre la 15) tolgono la colonna qui.
//  (4) `server/db/fontiTolte.ts` ha la voce della colonna (il Cestino e i backup vecchi la tollerano, vedi `colonneCompatibili`).
//
// COSA NON CAMBIA (impronta di ogni riga prima e dopo): le altre colonne di `voce_giornata`, `voce_effetto`, `voce_effetto_transizione`
// (raw_json compreso), `giorno`, le altre righe di `dati_guida`, tutte le tabelle delle partite. Idempotente: senza la colonna non fa nulla.
// Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { ARCHIVIO_FRASI, esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { registraAudit } from './archivioL1.js';
import { archiviaProduce, controllaProduce } from './produceJsonL6.js';
import { diverseFuori, improntaPartite, righePerChiave } from './decisioniDati0111.js';

export const AUDIT_PRODUCE_JSON = 'audit-l6-08-produce-json';
/** La migrazione utente che prepara SQL su `main.voce_giornata.produce_json`. */
const UTENTE_CHE_LEGGE_LA_COLONNA = 15;

const errore = (motivo: string): never => { throw new Error(`357: ${motivo}; nessuna modifica applicata.`); };

/** La versione dello schema delle partite; null se il file delle partite non è attaccato (allora la 015 non può più girare). */
export function versioneUtente(db: AppDatabase): number | null {
  const schemi = db.prepare('PRAGMA database_list').all() as Array<{ name: string }>;
  return schemi.some((s) => s.name === 'utente') ? db.pragma('utente.user_version', { simple: true }) as number : null;
}

/** Vero se la migrazione utente 015 è già passata (o non può più passare): da qui nessun SQL vivo cita più `voce_giornata.produce_json`. */
export const lasciaTogliereLaColonna = (db: AppDatabase): boolean => {
  const v = versioneUtente(db);
  return v === null || v >= UTENTE_CHE_LEGGE_LA_COLONNA;
};

export const migration357: Migration = {
  id: 357,
  name: 'produce_json_tolta',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'voce_giornata') || !haColonna(db, 'voce_giornata', 'produce_json')) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');

    const tabelleIntatte = ['voce_effetto', 'voce_effetto_transizione', 'giorno'].filter((t) => esisteTabella(db, t));
    const voceSenza = improntaTabella(db, 'voce_giornata', ['produce_json']);
    const intattePrima = new Map(tabelleIntatte.map((t) => [t, improntaTabella(db, t)] as const));
    const datiGuidaPrima = righePerChiave(db, 'dati_guida', ['chiave']);
    const partitePrima = improntaPartite(db);
    const righe = db.prepare('SELECT COUNT(*) FROM main.voce_giornata').pluck().get() as number;

    // (1) il controllo, (2) l'archivio
    const controllo = controllaProduce(db);
    const archivio = archiviaProduce(db, 'L6-08 · 357');
    if (archivio.voci !== controllo.voci) errore('le voci archiviate non sono quelle controllate');

    // (3) la colonna, solo se nessun SQL vivo la cita più
    const tolta = lasciaTogliereLaColonna(db);
    if (tolta) {
      db.exec('ALTER TABLE main.voce_giornata DROP COLUMN "produce_json"');
      if (haColonna(db, 'voce_giornata', 'produce_json')) errore('la colonna voce_giornata.produce_json esiste ancora');
    }

    // i controlli: cambia solo ciò che è dichiarato
    if (db.prepare('SELECT COUNT(*) FROM main.voce_giornata').pluck().get() !== righe) errore('il numero delle voci è cambiato');
    if (improntaTabella(db, 'voce_giornata', ['produce_json']) !== voceSenza) errore('le altre colonne di voce_giornata sono cambiate');
    for (const [t, h] of intattePrima) if (improntaTabella(db, t) !== h) errore(`la tabella ${t} è cambiata`);
    const altre = diverseFuori(datiGuidaPrima, righePerChiave(db, 'dati_guida', ['chiave']), new Set([ARCHIVIO_FRASI, AUDIT_PRODUCE_JSON]));
    if (altre.length) errore(`altre righe di dati_guida sono cambiate: ${altre.join(', ')}`);
    if (improntaPartite(db) !== partitePrima) errore('le tabelle delle partite sono cambiate');

    registraAudit(db, AUDIT_PRODUCE_JSON, {
      migrazione: 'L6-08 · 357',
      colonnaTolta: tolta, versioneUtente: versioneUtente(db),
      motivoSeNonTolta: tolta ? null : 'la migrazione utente 015 non è ancora passata: la colonna resta e la toglie la migrazione utente 69',
      archivio, controllo,
    });
    if (controllo.senzaEquivalente > 0) logger.warn({ migrazione: 'L6-08-357', elementi: controllo.senzaEquivalente }, 'elementi di produce_json senza alcun equivalente strutturato: sono nell’archivio e nel verbale');
    logger.info({ migrazione: 'L6-08-357', tolta, voci: archivio.voci, elementi: controllo.elementi, perClasse: controllo.perClasse }, 'produce_json archiviata');
  },
};
