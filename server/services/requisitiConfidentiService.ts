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
// L7-02 (migrazione 365): la frase di un requisito si genera dalla condizione (`descriviRequisitoSpillo`, una sola sede del dato); la colonna `testo` è
// la NOTA propria del requisito, vuota se non racconta altro. Solo l'`avviso` tiene lì la sua frase, perché è il dato.
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { haTabellaMain } from '../db/schemaMemo.js';
import { httpErrors } from '../utils/httpError.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { condizioneDelRequisito, notaDelRequisito } from './semaforiService.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { descriviRequisitoSpillo, type Condizione } from '../../shared/condizioniSpillo.js';
import type { RequisitiConfidenteDto } from '../../shared/types.js';
import { RANGO_MASSIMO_CONFIDENTE } from '../../shared/puntiConfidenti.js';

interface RigaRequisito { tipo: string; dati_json: string; testo: string }
interface RigaRequisitoRango extends RigaRequisito { rango: number; indice: number }

/** Il requisito di tipo «richiesta» (404 se non c'è, 400 se è di un altro tipo: gli altri non si correggono da qui). */
function requisitoDiRichiesta(confidente: string, rango: number, indice: number): RigaRequisito {
  const r = prepared('SELECT tipo, dati_json, testo FROM confidente_requisito WHERE confidente_chiave = ? AND rango = ? AND indice = ?').get(confidente, rango, indice) as RigaRequisito | undefined;
  if (!r) throw httpErrors.notFound('requisito-non-trovato', 'Requisito non trovato.');
  if (r.tipo !== 'richiesta') throw httpErrors.badRequest('requisito-non-di-richiesta', 'Da qui si corregge solo un requisito che cita una Richiesta.');
  return r;
}

/** Il requisito cita un'altra Richiesta, per chiave (stabile anche se la si rinomina): cambiano solo i dati, la nota resta e la frase si genera col nome nuovo. */
export function correggiRequisitoRichiesta(confidente: string, rango: number, indice: number, richiesta: string): void {
  const r = requisitoDiRichiesta(confidente, rango, indice);
  const nuova = prepared('SELECT chiave FROM richiesta WHERE chiave = ?').get(richiesta) as { chiave: string } | undefined;
  if (!nuova) throw httpErrors.notFound('richiesta-non-trovata', `La Richiesta '${richiesta}' non esiste.`);
  const dati = JSON.parse(r.dati_json) as Record<string, unknown>;
  prepared('UPDATE confidente_requisito SET dati_json = ? WHERE confidente_chiave = ? AND rango = ? AND indice = ?')
    .run(JSON.stringify({ ...dati, richiesta: nuova.chiave }), confidente, rango, indice);
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
  return haTabellaMain(getDb(), 'confidente_requisito_guida');
}

/** Le righe di un rango (o di tutti i ranghi) in una delle due tabelle, in ordine. */
function righe(tabella: 'confidente_requisito' | 'confidente_requisito_guida', confidente: string, rango?: number): RigaRequisitoRango[] {
  return (rango === undefined
    ? prepared(`SELECT rango, indice, tipo, dati_json, testo FROM ${tabella} WHERE confidente_chiave = ? ORDER BY rango, indice`).all(confidente)
    : prepared(`SELECT rango, indice, tipo, dati_json, testo FROM ${tabella} WHERE confidente_chiave = ? AND rango = ? ORDER BY indice`).all(confidente, rango)) as RigaRequisitoRango[];
}

/** La frase di un avviso, ovunque sia salvata (nei dati dall'editor, nella colonna dalla guida). */
function fraseAvviso(r: RigaRequisito): string {
  try { const t = (JSON.parse(r.dati_json) as { testo?: unknown }).testo; if (typeof t === 'string' && t.trim()) return t; } catch { /* dati illeggibili: vale la colonna */ }
  return r.testo;
}

/** La firma di un rango (tipo e dati di ogni riga, in ordine): due ranghi sono uguali se lo è la firma. La nota non conta (L7-02): la frase è generata dai
 *  dati, e nota o no il requisito è lo stesso; per un avviso conta la frase, che è il dato. */
const firma = (l: readonly RigaRequisitoRango[]): string => JSON.stringify(l.map((r) => (r.tipo === 'avviso' ? [r.tipo, fraseAvviso(r)] : [r.tipo, r.dati_json])));

/** I requisiti di un Confidente, rango per rango (da 1 a 10, anche quelli senza requisiti), con la descrizione generata, la nota propria e se il rango
 *  è diverso dalla guida. */
export function requisitiDelConfidente(confidente: string): RequisitiConfidenteDto {
  verificaConfidente(confidente);
  const nomi = nomiCondizioniMemo();
  const attuali = righe('confidente_requisito', confidente);
  const guida = conGuida() ? righe('confidente_requisito_guida', confidente) : null;
  const ranghi: RequisitiConfidenteDto['ranghi'] = [];
  for (let rango = 1; rango <= RANGO_MASSIMO_CONFIDENTE; rango++) {
    const qui = attuali.filter((r) => r.rango === rango);
    const requisiti = qui.flatMap((r) => {
      const c = condizioneDelRequisito(r as RigaRequisito & { tipo: Condizione['tipo'] });
      if (!c) return [];
      const descrizione = descriviRequisitoSpillo(c, nomi);
      return [{ indice: r.indice, condizione: c, descrizione, nota: notaDelRequisito(r, descrizione) }];
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

/** Una riga da salvare: la condizione e la sua nota (`testo` è il nome di prima della stessa nota, per la rotta di un rango solo). */
type RequisitoDaSalvare = { condizione: Condizione; nota?: string | null; testo?: string | null };

/** Sostituisce le righe di un rango (va chiamata dentro una transazione). La colonna `testo` è la nota data o vuota; un avviso tiene lì la sua frase. */
function scriviRango(confidente: string, rango: number, requisiti: readonly RequisitoDaSalvare[]): void {
  prepared('DELETE FROM confidente_requisito WHERE confidente_chiave = ? AND rango = ?').run(confidente, rango);
  const ins = prepared('INSERT INTO confidente_requisito (confidente_chiave, rango, indice, tipo, dati_json, testo) VALUES (?, ?, ?, ?, ?, ?)');
  requisiti.forEach((r, indice) => {
    const testo = r.condizione.tipo === 'avviso' ? r.condizione.testo : (r.nota ?? r.testo ?? '').trim();
    ins.run(confidente, rango, indice, r.condizione.tipo, datiDellaCondizione(r.condizione), testo);
  });
}

/**
 * I requisiti di un rango, al posto di quelli di adesso (vuoto = nessun requisito). Le conferme a mano delle partite sugli indici che spariscono se ne
 * vanno con loro.
 */
export function impostaRequisitiRango(confidente: string, rango: number, requisiti: readonly RequisitoDaSalvare[]): RequisitiConfidenteDto {
  return impostaRequisitiRanghi(confidente, [{ rango, requisiti }]);
}

/** L7-02: più ranghi in una sola transazione (il salvataggio unico dell'editor): o tutti o nessuno. I ranghi non indicati restano come sono. */
export function impostaRequisitiRanghi(confidente: string, ranghi: ReadonlyArray<{ rango: number; requisiti: readonly RequisitoDaSalvare[] }>): RequisitiConfidenteDto {
  verificaConfidente(confidente);
  if (new Set(ranghi.map((r) => r.rango)).size !== ranghi.length) throw httpErrors.badRequest('rango-doppio', 'Lo stesso rango compare due volte.');
  getDb().transaction(() => { for (const r of ranghi) scriviRango(confidente, r.rango, r.requisiti); })();
  // la disponibilità legge dai requisiti la pioggia e il «dal» del rango 1 (migrazione 306, R9-04/4) e li tiene in memoria
  invalidaCacheDiGioco();
  return requisitiDelConfidente(confidente);
}

/** La nota da usare al ripristino, per riga della copia della guida (`requisiti-nota-guida-v1`, migrazione 365); null su uno schema di prima. Una mappa illeggibile è un 409: la prosa di prima non torna da sola. */
function noteDellaGuida(): Record<string, string> | null {
  const r = prepared('SELECT json FROM dati_guida WHERE chiave = ?').get('requisiti-nota-guida-v1') as { json: string } | undefined;
  if (!r) return null;
  let valore: unknown;
  try { valore = JSON.parse(r.json); } catch { valore = null; }
  if (!valore || typeof valore !== 'object' || Array.isArray(valore)) throw httpErrors.conflict('note-guida-illeggibili', 'Le note della guida non sono leggibili: il rango resta com’è.');
  return valore as Record<string, string>;
}

/** Il rango torna come lo dà la guida (`confidente_requisito_guida`). 409 se la copia della guida non c'è. */
export function ripristinaRequisitiRango(confidente: string, rango: number): RequisitiConfidenteDto {
  verificaConfidente(confidente);
  if (!conGuida()) throw httpErrors.conflict('guida-non-disponibile', 'I requisiti della guida non ci sono in questo file di gioco.');
  const guida = righe('confidente_requisito_guida', confidente, rango);
  const note = noteDellaGuida();
  getDb().transaction(() => {
    prepared('DELETE FROM confidente_requisito WHERE confidente_chiave = ? AND rango = ?').run(confidente, rango);
    const ins = prepared('INSERT INTO confidente_requisito (confidente_chiave, rango, indice, tipo, dati_json, testo) VALUES (?, ?, ?, ?, ?, ?)');
    for (const r of guida) ins.run(confidente, rango, r.indice, r.tipo, r.dati_json, note?.[`${confidente}|${rango}|${r.indice}`] ?? r.testo);
  })();
  invalidaCacheDiGioco();
  return requisitiDelConfidente(confidente);
}
