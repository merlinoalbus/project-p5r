// ============================================================
// requisitiConfidentiService — correggere un requisito di un Confidente che cita una Richiesta (2026-10-11)
// ============================================================
//
// Eliminata una Richiesta, i requisiti dei Confidenti che la citavano restano «da correggere» (scelta dell'utente: «Si elimina
// e si avvisa»). Il validatore ha rilevato che nell'app non c'era un modo di correggerli, e il rango restava bloccato per sempre;
// alla domanda l'utente ha scelto «Requisito correggibile»: dalla scheda del Confidente si sceglie un'altra Richiesta al suo
// posto, oppure lo si toglie. I requisiti sono dati di gioco (`gioco.db`): valgono per tutte le partite e vanno nel pacchetto.
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';

interface RigaRequisito { tipo: string; dati_json: string; testo: string }

/** Il requisito di tipo «richiesta» (404 se non c'è, 400 se è di un altro tipo: gli altri non si correggono da qui). */
function requisitoDiRichiesta(confidente: string, rango: number, indice: number): RigaRequisito {
  const r = prepared('SELECT tipo, dati_json, testo FROM confidente_requisito WHERE confidente_chiave = ? AND rango = ? AND indice = ?').get(confidente, rango, indice) as RigaRequisito | undefined;
  if (!r) throw httpErrors.notFound('requisito-non-trovato', 'Requisito non trovato.');
  if (r.tipo !== 'richiesta') throw httpErrors.badRequest('requisito-non-di-richiesta', 'Da qui si corregge solo un requisito che cita una Richiesta.');
  return r;
}

/**
 * Il requisito cita un'altra Richiesta, per chiave (stabile anche se la si rinomina). Il testo cambia il nome citato: quello di
 * prima se c'è nel testo, altrimenti il testo diventa la frase standard col nome nuovo.
 */
export function correggiRequisitoRichiesta(confidente: string, rango: number, indice: number, richiesta: string): void {
  const r = requisitoDiRichiesta(confidente, rango, indice);
  const nuova = prepared('SELECT chiave, nome FROM richiesta WHERE chiave = ?').get(richiesta) as { chiave: string; nome: string } | undefined;
  if (!nuova) throw httpErrors.notFound('richiesta-non-trovata', `La Richiesta '${richiesta}' non esiste.`);
  const dati = JSON.parse(r.dati_json) as Record<string, unknown>;
  const citata = typeof dati.richiesta === 'string' ? dati.richiesta : '';
  const testo = citata && r.testo.includes(citata) ? r.testo.split(citata).join(nuova.nome) : `Completare la richiesta dei Mementos "${nuova.nome}"`;
  prepared('UPDATE confidente_requisito SET dati_json = ?, testo = ? WHERE confidente_chiave = ? AND rango = ? AND indice = ?')
    .run(JSON.stringify({ ...dati, richiesta: nuova.chiave }), testo, confidente, rango, indice);
}

/** Toglie il requisito per tutte le partite, con le conferme a mano che le partite ne avevano (gli altri indici restano). */
export function togliRequisitoRichiesta(confidente: string, rango: number, indice: number): void {
  requisitoDiRichiesta(confidente, rango, indice);
  getDb().transaction(() => {
    prepared('DELETE FROM requisito_partita WHERE confidente_chiave = ? AND rango = ? AND indice = ?').run(confidente, rango, indice);
    prepared('DELETE FROM confidente_requisito WHERE confidente_chiave = ? AND rango = ? AND indice = ?').run(confidente, rango, indice);
  })();
}
