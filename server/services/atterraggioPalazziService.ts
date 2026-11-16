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
// - **le regole d'atterraggio** (`dungeon_atterraggio`): un elenco ordinato; ognuna vale sempre, da un giorno in
//   poi, in un intervallo o in un giorno solo, e porta a una planimetria del Palazzo, centrata su un pin se indicato. Vale la
//   prima che copre il giorno; senza partita, o senza un giorno, vale la prima regola che vale sempre.
//
// Le planimetrie si scrivono con la chiave interna (stabile quando il percorso cambia) e si danno all'interfaccia con quella
// pubblica, come il resto delle mappe.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { finestreDungeon, invalidaDatiGuida, type FinestraDungeon } from './datiGuida.js';
import { palazzoDellaMappa } from './mappe/alberoMappe.js';
import { chiaveMappa, idMappa, nomePercorsoVisibile } from './mappe/percorsiMappe.js';
import { dataLeggibile, dataValida, ordineGioco } from '../../shared/condizioniSpillo.js';
import { erroreDatePalazzo, type DatePalazzo } from '../../shared/datePalazzo.js';
import { copreIlGiorno } from './condizioni/valutatore.js';
import type { AtterraggioPalazzoDto } from '../../shared/types.js';

/** Una riga di `dungeon_atterraggio`. */
interface RigaAtterraggio { id: number; dungeon_chiave: string; ordine: number; dal: string | null; al: string | null; mappa_chiave: string; spillo_id: number | null }

/** Una regola come arriva dall'interfaccia: planimetria con la chiave pubblica. */
export interface RegolaAtterraggio { dal: string | null; al: string | null; mappa: string; spillo: number | null }

/** 404 se il dungeon non esiste. */
function richiediDungeon(chiave: string): void {
  if (!prepared('SELECT 1 FROM dungeon WHERE chiave = ?').get(chiave)) throw httpErrors.notFound('dungeon-non-trovato', `Il dungeon '${chiave}' non esiste.`);
}

/**
 * Vero se il giorno (MM-GG) sta nella regola, nel calendario di gioco (aprile → marzo): senza date vale sempre, con il solo
 * inizio vale da lì in poi, con inizio e fine vale fra i due, estremi compresi.
 */
export function regolaCopre(r: { dal: string | null; al: string | null }, giorno: string): boolean {
  // L6: la regola come condizione di data, letta dal valutatore unico (`copreIlGiorno`)
  if (!r.dal) return true;
  return copreIlGiorno([r.al ? { tipo: 'intervallo', dal: r.dal, al: r.al } : { tipo: 'data', dal: r.dal }], giorno);
}

/** Le regole di un Palazzo, nell'ordine in cui si provano, come DTO (chiave pubblica e nomi di planimetria e pin). */
export function elencaAtterraggi(dungeon: string): AtterraggioPalazzoDto[] {
  const righe = prepared('SELECT * FROM dungeon_atterraggio WHERE dungeon_chiave = ? ORDER BY ordine, id').all(dungeon) as RigaAtterraggio[];
  return righe.map((r) => ({
    dal: r.dal, al: r.al, mappa: chiaveMappa(r.mappa_chiave), mappaNome: nomePercorsoVisibile(r.mappa_chiave), spillo: r.spillo_id,
    spilloNome: r.spillo_id === null ? null : (prepared('SELECT nome FROM spillo WHERE id = ?').get(r.spillo_id) as { nome: string } | undefined)?.nome ?? null,
  }));
}

/**
 * Dove si atterra per un giorno: la prima regola che lo copre. Senza giorno (nessuna partita, o partita senza data) vale la
 * prima regola senza date, l'accesso standard. Null se nessuna regola vale.
 */
export function atterraggioDelGiorno(dungeon: string, giorno: string | null): { mappa: string; spillo: number | null } | null {
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
  const pronte = regole.map((r, i) => {
    const posto = `regola ${i + 1}`;
    for (const [nome, d] of [['dal', r.dal], ['al', r.al]] as const) {
      if (d !== null && !dataValida(d)) throw httpErrors.badRequest('data-non-valida', `${posto}: «${d}» non è un giorno del calendario di gioco (${nome}).`);
    }
    if (r.al && !r.dal) throw httpErrors.badRequest('fine-senza-inizio', `${posto}: una fine senza inizio non dice da quando vale.`);
    if (r.dal && r.al && ordineGioco(r.al) < ordineGioco(r.dal)) throw httpErrors.badRequest('fine-prima-di-inizio', `${posto}: la fine (${dataLeggibile(r.al)}) viene prima dell'inizio (${dataLeggibile(r.dal)}).`);
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

/** Il furto consigliato e il termine della lettera di sfida di un Palazzo (MM-GG, null = la guida non li dà): con la finestra sono le
 *  date del Palazzo (L13 O6-3), tutte in colonne del dungeon e tutte scritte da `impostaFinestra`. */
export interface ConsigliPalazzo { furtoConsigliato: string | null; letteraEntro: string | null }

/** Le quattro date di un Palazzo (le colonne di `dungeon`). */
interface DateDelPalazzo { finestra_dal: string | null; finestra_al: string | null; lettera_entro: string | null; furto_consigliato_data: string | null }

/**
 * Cambia le date del Palazzo: la finestra sulla mappa di Tokyo e, con `consigli`, il furto consigliato e il termine della lettera. L6
 * (§4.4): nelle colonne `dungeon.finestra_dal`/`finestra_al`, il furto in `furto_consigliato_data` e la lettera in
 * `lettera_entro`. È l'unico scrittore di
 * queste colonne. `al` nullo = senza fine, solo dove il gioco non fissa una scadenza (i Memento e i Palazzi col boss dei Memento, Iweleth:
 * 400 `scadenza-necessaria` altrove). L'ordine dev'essere apertura ≤ furto ≤ lettera ≤ scadenza (400 `fine-prima-di-inizio` per la
 * finestra rovesciata, `date-rovesciate` per il resto); senza `consigli` restano quelli salvati, e valgono per l'ordine. Svuota la copia in
 * memoria delle finestre. Le date di prima non si conservano: non c'è un ritorno alle date della guida (decisione dell'utente del 10/11).
 */
export function impostaFinestra(dungeon: string, dal: string, al: string | null, consigli?: ConsigliPalazzo): FinestraDungeon {
  richiediDungeon(dungeon);
  // la regola delle date è una sola, condivisa col modulo «Correggi la scheda» (`shared/datePalazzo`)
  const controlla = (d: DatePalazzo, senzaFinePossibile: boolean) => {
    const e = erroreDatePalazzo(d, senzaFinePossibile);
    if (e) throw httpErrors.badRequest(e.codice, e.messaggio);
  };
  const r = prepared(`SELECT tipo, regola_boss, finestra_dal, finestra_al, lettera_entro,
    furto_consigliato_data FROM dungeon WHERE chiave = ?`).get(dungeon) as
    { tipo: string; regola_boss: string | null } & DateDelPalazzo;
  // senza `consigli` restano furto e lettera salvati, e valgono per l'ordine
  const lettera = consigli ? consigli.letteraEntro : r.lettera_entro, furto = consigli ? consigli.furtoConsigliato : r.furto_consigliato_data;
  controlla({ dal, al, furtoConsigliato: furto, letteraEntro: lettera }, r.tipo !== 'palazzo' || r.regola_boss === 'memento');
  getDb().transaction(() => {
    prepared('UPDATE dungeon SET finestra_dal = ?, finestra_al = ? WHERE chiave = ?').run(dal, al, dungeon);
    if (consigli) {
      prepared('UPDATE dungeon SET lettera_entro = ? WHERE chiave = ?').run(consigli.letteraEntro, dungeon);
      prepared('UPDATE dungeon SET furto_consigliato_data = ? WHERE chiave = ?').run(consigli.furtoConsigliato, dungeon);
    }
  })();
  invalidaDatiGuida();
  return finestreDungeon().get(dungeon)!;
}
