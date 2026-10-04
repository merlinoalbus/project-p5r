// ============================================================
// atterraggioPalazziService — quando un Palazzo compare sulla mappa di Tokyo e dove si atterra toccandolo
// ============================================================
//
// Richiesta dell'utente (2026-10-04): «devi visualizzare l'icona e permettermi di valorizzare per fasce temporali o giorni
// specifici il punto di atterraggio dell'icona della mappa rispetto al mappamondo delle planimetrie». Due cose, tutte e due
// dati di gioco modificabili dalla pagina del Palazzo:
//
// - **la finestra**: la voce di `finestre-dungeon` in `dati_guida` (dal–al, o senza fine) che decide se il Palazzo compare sulla
//   mappa di Tokyo per il giorno della partita. È la stessa che dice l'arco corrente alle condizioni: si scrive qui, una sola;
// - **le regole d'atterraggio** (`dungeon_atterraggio`, migrazione 097): un elenco ordinato; ognuna vale sempre, da un giorno in
//   poi, in un intervallo o in un giorno solo, e porta a una planimetria del Palazzo, centrata su un pin se indicato. Vale la
//   prima che copre il giorno; senza partita, o senza un giorno, vale la prima regola che vale sempre.
//
// Le planimetrie si scrivono con la chiave interna (stabile quando il percorso cambia) e si danno all'interfaccia con quella
// pubblica, come il resto delle mappe.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { datiGuida, finestreDungeon, invalidaDatiGuida, type FinestraDungeon } from './datiGuida.js';
import { palazzoDellaMappa } from './mappe/alberoMappe.js';
import { chiaveMappa, idMappa, nomePercorso } from './mappe/percorsiMappe.js';
import { dataValida, ordineGioco } from '../../shared/condizioniSpillo.js';
import type { AtterraggioPalazzoDto } from '../../shared/types.js';

/** Una riga di `dungeon_atterraggio`. */
interface RigaAtterraggio { id: number; dungeon_chiave: string; ordine: number; dal: string | null; al: string | null; mappa_chiave: string; spillo_id: number | null }

/** Una regola come arriva dall'interfaccia: planimetria con la chiave pubblica. */
export interface RegolaAtterraggio { dal: string | null; al: string | null; mappa: string; spillo: number | null }

/** Vero se la tabella delle regole c'è (un database con lo schema ancora indietro non ne ha). */
const conAtterraggi = (): boolean => !!prepared("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'dungeon_atterraggio'").get();

/** 404 se il dungeon non esiste. */
function richiediDungeon(chiave: string): void {
  if (!prepared('SELECT 1 FROM dungeon WHERE chiave = ?').get(chiave)) throw httpErrors.notFound('dungeon-non-trovato', `Il dungeon '${chiave}' non esiste.`);
}

/**
 * Vero se il giorno (MM-GG) sta nella regola, nel calendario di gioco (aprile → marzo): senza date vale sempre, con il solo
 * inizio vale da lì in poi, con inizio e fine vale fra i due, estremi compresi.
 */
export function regolaCopre(r: { dal: string | null; al: string | null }, giorno: string): boolean {
  if (!r.dal) return true;
  const g = ordineGioco(giorno);
  return g >= ordineGioco(r.dal) && (!r.al || g <= ordineGioco(r.al));
}

/** Le regole di un Palazzo, nell'ordine in cui si provano, come DTO (chiave pubblica e nomi di planimetria e pin). */
export function elencaAtterraggi(dungeon: string): AtterraggioPalazzoDto[] {
  if (!conAtterraggi()) return [];
  const righe = prepared('SELECT * FROM dungeon_atterraggio WHERE dungeon_chiave = ? ORDER BY ordine, id').all(dungeon) as RigaAtterraggio[];
  return righe.map((r) => ({
    dal: r.dal, al: r.al, mappa: chiaveMappa(r.mappa_chiave), mappaNome: nomePercorso(r.mappa_chiave), spillo: r.spillo_id,
    spilloNome: r.spillo_id === null ? null : (prepared('SELECT nome FROM spillo WHERE id = ?').get(r.spillo_id) as { nome: string } | undefined)?.nome ?? null,
  }));
}

/**
 * Dove si atterra per un giorno: la prima regola che lo copre. Senza giorno (nessuna partita, o partita senza data) vale la
 * prima regola senza date, l'accesso standard. Null se nessuna regola vale.
 */
export function atterraggioDelGiorno(dungeon: string, giorno: string | null): { mappa: string; spillo: number | null } | null {
  if (!conAtterraggi()) return null;
  const righe = prepared('SELECT dal, al, mappa_chiave, spillo_id FROM dungeon_atterraggio WHERE dungeon_chiave = ? ORDER BY ordine, id').all(dungeon) as Array<Pick<RigaAtterraggio, 'dal' | 'al' | 'mappa_chiave' | 'spillo_id'>>;
  const r = righe.find((x) => (giorno ? regolaCopre(x, giorno) : !x.dal));
  return r ? { mappa: chiaveMappa(r.mappa_chiave), spillo: r.spillo_id } : null;
}

/**
 * Sostituisce le regole di un Palazzo con l'elenco dato, nel suo ordine. Prima controlla tutto: date esistenti nel calendario
 * di gioco, `al` mai senza `dal` né prima di `dal`, una planimetria di questo Palazzo (non la mappa d'insieme), il pin (se c'è)
 * su quella planimetria. Poi scrive in una transazione e restituisce l'elenco salvato.
 */
export function impostaAtterraggi(dungeon: string, regole: readonly RegolaAtterraggio[]): AtterraggioPalazzoDto[] {
  richiediDungeon(dungeon);
  if (!conAtterraggi()) throw httpErrors.conflict('schema-non-aggiornato', 'Le regole di atterraggio arrivano con la migrazione 097: riavvia il server.');
  const pronte = regole.map((r, i) => {
    const posto = `regola ${i + 1}`;
    for (const [nome, d] of [['dal', r.dal], ['al', r.al]] as const) {
      if (d !== null && !dataValida(d)) throw httpErrors.badRequest('data-non-valida', `${posto}: «${d}» non è un giorno del calendario di gioco (${nome}).`);
    }
    if (r.al && !r.dal) throw httpErrors.badRequest('fine-senza-inizio', `${posto}: una fine senza inizio non dice da quando vale.`);
    if (r.dal && r.al && ordineGioco(r.al) < ordineGioco(r.dal)) throw httpErrors.badRequest('fine-prima-di-inizio', `${posto}: la fine (${r.al}) viene prima dell'inizio (${r.dal}).`);
    const interna = idMappa(r.mappa);
    const m = prepared('SELECT chiave, genitore_chiave FROM mappa WHERE chiave = ?').get(interna) as { chiave: string; genitore_chiave: string | null } | undefined;
    if (!m) throw httpErrors.notFound('mappa-non-trovata', `${posto}: la mappa '${r.mappa}' non esiste.`);
    if (!m.genitore_chiave || palazzoDellaMappa(m.chiave) !== dungeon) throw httpErrors.badRequest('mappa-fuori-palazzo', `${posto}: si atterra su una planimetria di questo Palazzo.`);
    if (r.spillo !== null && !prepared('SELECT 1 FROM spillo WHERE id = ? AND mappa_chiave = ?').get(r.spillo, interna)) {
      throw httpErrors.badRequest('spillo-fuori-mappa', `${posto}: il pin d'arrivo non sta su quella planimetria.`);
    }
    return { dal: r.dal, al: r.al, mappa: interna, spillo: r.spillo };
  });
  const adesso = nowIso();
  getDb().transaction(() => {
    prepared('DELETE FROM dungeon_atterraggio WHERE dungeon_chiave = ?').run(dungeon);
    const ins = prepared('INSERT INTO dungeon_atterraggio (dungeon_chiave, ordine, dal, al, mappa_chiave, spillo_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    pronte.forEach((r, i) => ins.run(dungeon, i, r.dal, r.al, r.mappa, r.spillo, adesso));
  })();
  return elencaAtterraggi(dungeon);
}

/**
 * Cambia la finestra del Palazzo sulla mappa di Tokyo: la sua voce in `finestre-dungeon` (creata se manca). `al` nullo = senza
 * fine. Le altre voci e i campi descrittivi del blocco restano come sono. Svuota la copia in memoria dei dati della guida.
 */
export function impostaFinestra(dungeon: string, dal: string, al: string | null): FinestraDungeon {
  richiediDungeon(dungeon);
  if (!dataValida(dal) || (al !== null && !dataValida(al))) throw httpErrors.badRequest('data-non-valida', 'Le date sono giorni del calendario di gioco, MM-GG.');
  if (al !== null && ordineGioco(al) < ordineGioco(dal)) throw httpErrors.badRequest('fine-prima-di-inizio', `La fine (${al}) viene prima dell'inizio (${dal}).`);
  // il blocco in memoria è congelato: si lavora su una copia
  const attuale = datiGuida<{ finestre?: Array<{ dungeon: string; dal: string; al?: string }> } & Record<string, unknown>>('finestre-dungeon');
  const dati = attuale ? (JSON.parse(JSON.stringify(attuale)) as { finestre?: Array<{ dungeon: string; dal: string; al?: string }> } & Record<string, unknown>) : { finestre: [] };
  const finestre = dati.finestre ?? (dati.finestre = []);
  const voce = finestre.find((f) => f.dungeon === dungeon);
  const nuova = { dungeon, dal, ...(al ? { al } : {}) };
  if (voce) { voce.dal = dal; if (al) voce.al = al; else delete voce.al; } else finestre.push(nuova);
  if (attuale) prepared("UPDATE dati_guida SET json = ? WHERE chiave = 'finestre-dungeon'").run(JSON.stringify(dati));
  else prepared("INSERT INTO dati_guida (chiave, json) VALUES ('finestre-dungeon', ?)").run(JSON.stringify(dati));
  invalidaDatiGuida();
  return finestreDungeon().get(dungeon)!;
}
