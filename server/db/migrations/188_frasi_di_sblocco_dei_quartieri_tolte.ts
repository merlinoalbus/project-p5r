// ============================================================
// 188 — frasi di sblocco dei quartieri tolte dal modello (L11 · B12, R11-02b/3)
// ============================================================
//
// Esce `quartiere.sblocco` (la frase della guida, 20 righe). Lo sblocco di un quartiere è la sua condizione strutturata
// (`quartiere.condizioni_json`, L6) con gli inviti dei Confidenti: nessuna pagina mostra la frase (`QuartierePage` mostra la condizione e la sua
// fonte), nessun servizio la legge (solo il DTO la ripeteva: ora non la porta più).
// Si archiviano TUTTE le righe con un valore in `dati_guida.archivio-frasi-l11` (colonna `quartiere.sblocco`): solo 5 frasi su 20 sono copie
// esatte della condizione e due date nelle frasi divergono da essa (Suidobashi: «10/6» contro 06-09; Roppongi: «circa 19 settembre» contro 09-15),
// quindi la frase originale non si butta. Il blocco `dati_guida.sblocco-quartieri` (la tabella di conversione «prosa → regola» della 118/120, senza
// lettori) NON si tocca: resta come archivio.
// NON esce `quartiere.sblocco_data` (7 righe): la legge ancora la conversione delle frasi in condizioni (`contestoConversione.quartiereDatato`,
// usata da `catalogoService` quando si salva una frase di sblocco) e il ripiego del valutatore; il ripiego è morto sui dati (i 23 quartieri veri
// hanno tutti una condizione salvata), ma `quartiereDatato` no: farla derivare dalla condizione darebbe un insieme diverso di quartieri (le 7 date
// non sono le 7 condizioni con una data), quindi l'equivalenza non è provabile e la colonna resta alla decisione dell'utente.
// Il registro `FONTI_TOLTE` (server/db/fontiTolte.ts) riceve la voce della colonna. Idempotente (la colonna si toglie solo se c'è), senza modifiche
// parziali: le impronte delle colonne rimaste e delle tabelle intatte si controllano dopo.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { archiviaFrasi, archiviate, esisteTabella, haColonna, improntaTabella, righeConValore, type RigheArchiviate } from './pulizieL11.js';

/** Le tabelle che questa migrazione non deve cambiare. */
const INTATTE = ['luogo', 'negozio', 'articolo', 'attivita', 'spillo', 'cestino', 'voce_giornata', 'confidente_disponibilita'] as const;
const errore = (motivo: string): never => { throw new Error(`188: ${motivo}; nessuna modifica applicata.`); };

export const migration188: Migration = {
  id: 188, name: 'frasi_di_sblocco_dei_quartieri_tolte',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'quartiere') || !haColonna(db, 'quartiere', 'sblocco')) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');

    const prima = new Map<string, string>([['quartiere', improntaTabella(db, 'quartiere', ['sblocco'])]]);
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));

    const colonne: Record<string, RigheArchiviate> = { 'quartiere.sblocco': righeConValore(db, 'quartiere', 'sblocco') };
    const attesi = { 'quartiere.sblocco': Object.keys(colonne['quartiere.sblocco']!).length };
    archiviaFrasi(db, 'L11-B12 · 188', colonne, {});

    db.exec('ALTER TABLE main.quartiere DROP COLUMN "sblocco"');

    if (archiviate(db, 'quartiere.sblocco') !== attesi['quartiere.sblocco']) errore(`l'archivio di quartiere.sblocco non ha ${attesi['quartiere.sblocco']} righe`);
    if (haColonna(db, 'quartiere', 'sblocco')) errore('la colonna quartiere.sblocco esiste ancora');
    if (improntaTabella(db, 'quartiere') !== prima.get('quartiere')) errore('le colonne rimaste di quartiere sono cambiate');
    for (const t of INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L11-B12-188', tolta: 'quartiere.sblocco', archiviate: attesi }, 'frasi di sblocco dei quartieri tolte dal modello');
  },
};
