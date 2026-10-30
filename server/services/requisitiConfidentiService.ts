// ============================================================
// requisitiConfidentiService — i requisiti dei Confidenti, da leggere e da modificare (2026-10-11; L6 §6.1)
// ============================================================
//
// Eliminata una Richiesta, i requisiti dei Confidenti che la citavano restano «da correggere» (scelta dell'utente: «Si elimina
// e si avvisa»). Il validatore ha rilevato che nell'app non c'era un modo di correggerli, e il rango restava bloccato per sempre;
// alla domanda l'utente ha scelto «Requisito correggibile»: dalla scheda del Confidente si sceglie un'altra Richiesta al suo
// posto, oppure lo si toglie. I requisiti sono dati di gioco (`gioco.db`): valgono per tutte le partite.
// L6 (§6.1, R6-07): un requisito è una condizione del vocabolario unico; dalla pagina del Confidente si modifica un rango alla volta
// («Modifica requisiti») e si torna al valore della guida («Ripristina», dalla copia `confidente_requisito_guida`, migrazione 119).
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { condizioneDelRequisito } from './semaforiService.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { descriviRequisitoSpillo, type Condizione } from '../../shared/condizioniSpillo.js';
import type { RequisitiConfidenteDto } from '../../shared/types.js';

interface RigaRequisito { tipo: string; dati_json: string; testo: string }
interface RigaRequisitoRango extends RigaRequisito { rango: number; indice: number }

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
    prepared('DELETE FROM confidente_requisito WHERE confidente_chiave = ? AND rango = ? AND indice = ?').run(confidente, rango, indice);
  })();
}

// ---- L6: l'editor dei requisiti (un rango per riga) ----

/** Il Confidente esiste, o 404. */
function verificaConfidente(chiave: string): void {
  if (!prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(chiave)) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${chiave}' non esiste.`);
}

/** Vero se la copia della guida c'è (uno schema di prima della 119 non ce l'ha). */
function conGuida(): boolean {
  return !!prepared("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'confidente_requisito_guida'").get();
}

/** Le righe di un rango (o di tutti i ranghi) in una delle due tabelle, in ordine. */
function righe(tabella: 'confidente_requisito' | 'confidente_requisito_guida', confidente: string, rango?: number): RigaRequisitoRango[] {
  return (rango === undefined
    ? prepared(`SELECT rango, indice, tipo, dati_json, testo FROM ${tabella} WHERE confidente_chiave = ? ORDER BY rango, indice`).all(confidente)
    : prepared(`SELECT rango, indice, tipo, dati_json, testo FROM ${tabella} WHERE confidente_chiave = ? AND rango = ? ORDER BY indice`).all(confidente, rango)) as RigaRequisitoRango[];
}

/** La firma di un rango (tipo, dati e frase di ogni riga, in ordine): due ranghi sono uguali se lo è la firma. */
const firma = (l: readonly RigaRequisitoRango[]): string => JSON.stringify(l.map((r) => [r.tipo, r.dati_json, r.testo]));

/** I requisiti di un Confidente, rango per rango (da 1 a 10, anche quelli senza requisiti), con la descrizione generata e se il rango è
 *  diverso dalla guida. */
export function requisitiDelConfidente(confidente: string): RequisitiConfidenteDto {
  verificaConfidente(confidente);
  const nomi = nomiCondizioniMemo();
  const attuali = righe('confidente_requisito', confidente);
  const guida = conGuida() ? righe('confidente_requisito_guida', confidente) : null;
  const ranghi: RequisitiConfidenteDto['ranghi'] = [];
  for (let rango = 1; rango <= 10; rango++) {
    const qui = attuali.filter((r) => r.rango === rango);
    const requisiti = qui.flatMap((r) => {
      const c = condizioneDelRequisito(r as RigaRequisito & { tipo: Condizione['tipo'] });
      return c ? [{ indice: r.indice, condizione: c, testo: r.testo, descrizione: descriviRequisitoSpillo(c, nomi) }] : [];
    });
    ranghi.push({ rango, requisiti, modificato: guida !== null && firma(qui) !== firma(guida.filter((r) => r.rango === rango)) });
  }
  return { confidente, ranghi };
}

/** I dati salvati di una condizione: i suoi campi senza il tipo (un avviso tiene il suo testo). */
function datiDellaCondizione(c: Condizione): string {
  const { tipo: _tipo, ...dati } = c as Condizione & Record<string, unknown>;
  return JSON.stringify(dati);
}

/**
 * I requisiti di un rango, al posto di quelli di adesso (vuoto = nessun requisito). La frase di ogni requisito è quella data o, senza,
 * la descrizione generata. Le conferme a mano delle partite sugli indici che spariscono se ne vanno con loro.
 */
export function impostaRequisitiRango(confidente: string, rango: number, requisiti: ReadonlyArray<{ condizione: Condizione; testo?: string | null }>): RequisitiConfidenteDto {
  verificaConfidente(confidente);
  const nomi = nomiCondizioniMemo();
  getDb().transaction(() => {
    prepared('DELETE FROM confidente_requisito WHERE confidente_chiave = ? AND rango = ?').run(confidente, rango);
    const ins = prepared('INSERT INTO confidente_requisito (confidente_chiave, rango, indice, tipo, dati_json, testo) VALUES (?, ?, ?, ?, ?, ?)');
    requisiti.forEach((r, indice) => {
      const testo = r.testo?.trim() || (r.condizione.tipo === 'avviso' ? r.condizione.testo : descriviRequisitoSpillo(r.condizione, nomi));
      ins.run(confidente, rango, indice, r.condizione.tipo, datiDellaCondizione(r.condizione), testo);
    });
  })();
  // la disponibilità legge dai requisiti la pioggia e il «dal» del rango 1 (migrazione 306, R9-04/4) e li tiene in memoria
  invalidaCacheDiGioco();
  return requisitiDelConfidente(confidente);
}

/** Il rango torna come lo dà la guida (`confidente_requisito_guida`). 409 se la copia della guida non c'è. */
export function ripristinaRequisitiRango(confidente: string, rango: number): RequisitiConfidenteDto {
  verificaConfidente(confidente);
  if (!conGuida()) throw httpErrors.conflict('guida-non-disponibile', 'I requisiti della guida non ci sono in questo file di gioco.');
  const guida = righe('confidente_requisito_guida', confidente, rango);
  getDb().transaction(() => {
    prepared('DELETE FROM confidente_requisito WHERE confidente_chiave = ? AND rango = ?').run(confidente, rango);
    const ins = prepared('INSERT INTO confidente_requisito (confidente_chiave, rango, indice, tipo, dati_json, testo) VALUES (?, ?, ?, ?, ?, ?)');
    for (const r of guida) ins.run(confidente, rango, r.indice, r.tipo, r.dati_json, r.testo);
  })();
  invalidaCacheDiGioco();
  return requisitiDelConfidente(confidente);
}
