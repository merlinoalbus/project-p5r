// ============================================================
// Migrazione 282 — la vincita di Sojiro del 23 giugno: la nota che ripeteva gli yen (Ondata 5, Lotto G; decisione 21)
// ============================================================
//
// La voce del 23 giugno sera «Sojiro vince alla lotteria» (`fca4cfe9`, fuori dal periodo validato) ha già l'effetto «Yen ricevuti +5.000»
// (proposta L13-4b approvata, decisione 18: entrano da soli alla spunta) ed è giusta per la guida (settimana 11: Sojiro regala 5.000 ¥).
// La sua nota diceva soltanto «+5.000 yen»: una seconda copia dell'importo, che l'effetto mostra già. Regole dell'utente: un dato in un
// solo punto; «le etichette di testo devono essere visibili solo se hanno senso». La nota si toglie, con il testo di prima conservato
// (`testo_precedente_json`, che la finestra della voce mostra e permette di rimettere) e il motivo. Nient'altro cambia: azione, tipo,
// effetti e partite restano com'erano (la spunta e i suoi 5.000 ¥ compresi).
// Conservativa: solo se la voce è ancora esattamente com'era (nota «+5.000 yen», nessun testo precedente, non aggiunta a mano) e ha
// l'effetto yen +5.000. Idempotente. Audit in `dati_guida.audit-282-vincita-sojiro`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { scriviAuditLotteria } from './lotteriaOndata5.js';

const AUDIT = 'audit-282-vincita-sojiro';
const errore = (motivo: string): never => { throw new Error(`282: ${motivo}; nessuna modifica applicata.`); };

const VOCE = 'fca4cfe9612d47257dc15df1e26865ee';
const NOTA = '+5.000 yen';
const MOTIVO = 'Ondata 5, lotto G: la nota «+5.000 yen» ripeteva l’importo dell’effetto «Yen ricevuti» della voce (entrano da soli alla spunta): tolta, il dato resta nell’effetto.';

interface Voce { data: string; azione: string; note: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null; aggiunta_da: string | null; testo_precedente_json: string | null }

export const migration282: Migration = {
  id: 282,
  name: 'vincita_di_sojiro',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'voce_giornata') || !esisteTabella(db, 'voce_effetto') || !haColonna(db, 'voce_giornata', 'testo_precedente_json') || !haColonna(db, 'voce_giornata', 'motivo_revisione')) return;
    const v = db.prepare('SELECT data, azione, note, riferimento_tipo, riferimento_chiave, riferimento_testo, aggiunta_da, testo_precedente_json FROM main.voce_giornata WHERE uid = ?').get(VOCE) as Voce | undefined;
    let esito: string;
    if (!v) esito = 'voce assente';
    else if (v.note === null && v.testo_precedente_json !== null) esito = 'nota già tolta';
    else if (v.data !== '06-23' || v.note !== NOTA || v.testo_precedente_json !== null || v.aggiunta_da !== null) esito = 'voce diversa da quella attesa o modificata dall’utente: non toccata';
    else if (!(db.prepare("SELECT dati_json FROM main.voce_effetto WHERE voce_uid = ? AND tipo = 'yen'").pluck().all(VOCE) as string[]).some((j) => { try { const e = JSON.parse(j) as { importo?: unknown }; return e.importo === 5000; } catch { return false; } })) {
      esito = 'senza l’effetto yen +5.000: nota lasciata (sarebbe l’unico punto dell’importo)';
    } else {
      const precedente = JSON.stringify({ azione: v.azione, note: v.note, riferimento_tipo: v.riferimento_tipo, riferimento_chiave: v.riferimento_chiave, riferimento_testo: v.riferimento_testo });
      if (db.prepare('UPDATE main.voce_giornata SET note = NULL, testo_precedente_json = ?, motivo_revisione = ?, updated_at = ? WHERE uid = ? AND note = ? AND testo_precedente_json IS NULL')
        .run(precedente, MOTIVO, new Date().toISOString(), VOCE, NOTA).changes !== 1) errore('la nota della voce non si toglie');
      esito = 'nota «+5.000 yen» tolta (testo di prima conservato)';
    }
    scriviAuditLotteria(db, AUDIT, 282, { voce: VOCE, esito });
    logger.info({ migrazione: 282, esito }, 'Lotteria: la vincita di Sojiro senza la nota che ripeteva gli yen');
  },
};
