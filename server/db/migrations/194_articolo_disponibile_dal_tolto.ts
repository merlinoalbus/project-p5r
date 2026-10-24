// ============================================================
// 194 — `articolo.disponibile_dal` tolto dal modello: la data si ricava sempre dalla condizione (L11 · R11-02/10, decisione dell'utente del 24/10)
// ============================================================
//
// «Disponibile dal» di un'offerta (288 righe con un testo: «dal 18 aprile», «a partire dall'arco del Palazzo di Madarame», «solo in primavera»…) era una
// copia in prosa delle condizioni strutturate (`articolo.condizioni_json`: data, intervallo, stagione, arco, quartiere). Decisione dell'utente: la data si
// ricava sempre dalla condizione; le offerte cambiano il testo mostrato (ora generato dalle condizioni) ed è accettato. Si archiviano TUTTE le righe con un
// valore in `dati_guida.archivio-frasi-l11` (colonna `articolo.disponibile_dal`, chiave dell'offerta → testo di prima) e si toglie la colonna. Il registro
// `FONTI_TOLTE` riceve la voce. Idempotente (la colonna si toglie solo se c'è), senza modifiche parziali: impronte delle altre colonne di `articolo` e delle
// tabelle vicine. Scrive solo in `main`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { archiviaFrasi, archiviate, esisteTabella, haColonna, improntaTabella, righeConValore } from './pulizieL11.js';

/** Le tabelle che questa migrazione non deve cambiare. */
const INTATTE = ['negozio', 'luogo', 'quartiere', 'attivita', 'libro', 'film', 'spillo', 'cestino', 'voce_giornata', 'catalogo_oggetto'] as const;
const errore = (motivo: string): never => { throw new Error(`194: ${motivo}; nessuna modifica applicata.`); };

export const migration194: Migration = {
  id: 194, name: 'articolo_disponibile_dal_tolto',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'articolo') || !haColonna(db, 'articolo', 'disponibile_dal')) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');

    const prima = new Map<string, string>([['articolo', improntaTabella(db, 'articolo', ['disponibile_dal'])]]);
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));

    const testi = righeConValore(db, 'articolo', 'disponibile_dal');
    const attese = Object.keys(testi).length;
    const senzaCondizione = haColonna(db, 'articolo', 'condizioni_json')
      ? (db.prepare("SELECT COUNT(*) FROM main.articolo WHERE disponibile_dal IS NOT NULL AND disponibile_dal <> '' AND (condizioni_json IS NULL OR condizioni_json IN ('', '[]'))").pluck().get() as number)
      : null;
    archiviaFrasi(db, 'L11-B12 · 194', { 'articolo.disponibile_dal': testi }, { 'articolo.disponibile_dal': { righe: attese, senzaCondizioneStrutturata: senzaCondizione } });

    db.exec('ALTER TABLE main.articolo DROP COLUMN "disponibile_dal"');

    if (archiviate(db, 'articolo.disponibile_dal') !== attese) errore(`l'archivio di articolo.disponibile_dal non ha ${attese} righe`);
    if (haColonna(db, 'articolo', 'disponibile_dal')) errore('la colonna articolo.disponibile_dal esiste ancora');
    if (improntaTabella(db, 'articolo') !== prima.get('articolo')) errore('le colonne rimaste di articolo sono cambiate');
    for (const t of INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L11-B12-194', tolta: 'articolo.disponibile_dal', archiviate: attese, senzaCondizioneStrutturata: senzaCondizione }, 'articolo.disponibile_dal tolto dal modello');
  },
};
