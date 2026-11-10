// ============================================================
// 371 — il vincolo del 1° giugno: «Furto consigliato del Palazzo di Madarame» (L6-10, scelta esplicita dell'utente)
// ============================================================
//
// Unica eccezione al validato, per scelta dell'utente. Il testo che l'utente chiama «voce del 1° giugno» non è una riga di `voce_giornata`: è l'unico
// elemento di `giorno.vincoli_json` del giorno `06-01` (ordine 53), che oggi vale `["Scadenza del Palazzo di Madarame in questo giorno"]`
// (`seed_json` del giorno è NULL). La migrazione lo porta a esattamente `["Furto consigliato del Palazzo di Madarame"]`, parola per parola.
//
// Guardia per identità: giorno `06-01` e `vincoli_json` esattamente uguale a quello atteso. Se è diverso non scrive e lo dichiara nel verbale; se è già
// il nuovo è un no-op. Il valore di prima va nel verbale `dati_guida.audit-l6-10-vincolo-primo-giugno` e nell'archivio (`archivio-frasi-l11`, colonna
// `giorno.vincoli_json`, chiave «06-01»). Non cambia nient'altro: né le altre colonne del giorno (nemmeno `updated_at`), né gli altri 345 giorni
// (compreso il vincolo analogo del 17/12, Shido, che non si tocca), né voci, effetti, spunte e partite (impronte prima e dopo).
// Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { ARCHIVIO_FRASI, esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, registraAudit } from './archivioL1.js';
import { diverseFuori, improntaPartite, righePerChiave } from './decisioniDati0111.js';

const GIORNO = '06-01';
const PRIMA = JSON.stringify(['Scadenza del Palazzo di Madarame in questo giorno']);
const DOPO = JSON.stringify(['Furto consigliato del Palazzo di Madarame']);
const AUDIT = 'audit-l6-10-vincolo-primo-giugno';
const COLONNA_ARCHIVIO = 'giorno.vincoli_json';

const errore = (motivo: string): never => { throw new Error(`371: ${motivo}; nessuna modifica applicata.`); };

export const migration371: Migration = {
  id: 371,
  name: 'vincolo_del_primo_giugno',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'giorno') || !haColonna(db, 'giorno', 'vincoli_json')) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');

    const attuale = db.prepare('SELECT vincoli_json FROM main.giorno WHERE data = ?').pluck().get(GIORNO) as string | undefined;
    // già fatta, o il giorno non c'è: niente da fare e niente da dichiarare
    if (attuale === undefined || attuale === DOPO) return;
    if (attuale !== PRIMA) {
      // il giorno non è com'era atteso (l'utente o un'altra migrazione l'hanno cambiato): non si scrive, si dichiara
      registraAudit(db, AUDIT, { migrazione: 'L6-10 · 371', esito: 'non applicata: vincoli_json diverso da quello atteso', giorno: GIORNO, trovato: attuale, atteso: PRIMA });
      logger.warn({ migrazione: 'L6-10-371', giorno: GIORNO, trovato: attuale }, 'vincolo del 1° giugno diverso da quello atteso: non scritto');
      return;
    }

    const altreColonne = improntaTabella(db, 'giorno', ['vincoli_json']);
    const altriGiorni = new Map((db.prepare('SELECT data, vincoli_json FROM main.giorno').all() as Array<{ data: string; vincoli_json: string }>).map((r) => [r.data, r.vincoli_json]));
    const intatte = ['voce_giornata', 'voce_effetto', 'voce_effetto_transizione'].filter((t) => esisteTabella(db, t));
    const intattePrima = new Map(intatte.map((t) => [t, improntaTabella(db, t)] as const));
    const datiGuidaPrima = righePerChiave(db, 'dati_guida', ['chiave']);
    const partitePrima = improntaPartite(db);
    const giorni = db.prepare('SELECT COUNT(*) FROM main.giorno').pluck().get() as number;

    archiviaSenzaSovrascrivere(db, 'L6-10 · 371', COLONNA_ARCHIVIO, { [GIORNO]: PRIMA });
    // guardia per identità anche nell'UPDATE (stesso giorno, stesso valore di prima): una sola riga, solo `vincoli_json`
    if (db.prepare('UPDATE main.giorno SET vincoli_json = ? WHERE data = ? AND vincoli_json = ?').run(DOPO, GIORNO, PRIMA).changes !== 1) errore(`il giorno ${GIORNO} non si scrive`);

    // i controlli: cambia solo ciò che è dichiarato
    if (db.prepare('SELECT COUNT(*) FROM main.giorno').pluck().get() !== giorni) errore('il numero dei giorni è cambiato');
    if (improntaTabella(db, 'giorno', ['vincoli_json']) !== altreColonne) errore('le altre colonne di giorno sono cambiate');
    for (const r of db.prepare('SELECT data, vincoli_json FROM main.giorno').all() as Array<{ data: string; vincoli_json: string }>) {
      const atteso = r.data === GIORNO ? DOPO : altriGiorni.get(r.data);
      if (r.vincoli_json !== atteso) errore(`i vincoli del ${r.data} sono cambiati in modo non dichiarato`);
    }
    for (const [t, h] of intattePrima) if (improntaTabella(db, t) !== h) errore(`la tabella ${t} è cambiata`);
    const altre = diverseFuori(datiGuidaPrima, righePerChiave(db, 'dati_guida', ['chiave']), new Set([ARCHIVIO_FRASI, AUDIT]));
    if (altre.length) errore(`altre righe di dati_guida sono cambiate: ${altre.join(', ')}`);
    if (improntaPartite(db) !== partitePrima) errore('le tabelle delle partite sono cambiate');

    registraAudit(db, AUDIT, { migrazione: 'L6-10 · 371', esito: 'applicata', giorno: GIORNO, prima: PRIMA, dopo: DOPO, giorniCambiati: 1, altriGiorniInvariati: giorni - 1 });
    logger.info({ migrazione: 'L6-10-371', giorno: GIORNO }, 'vincolo del 1° giugno riscritto');
  },
};
