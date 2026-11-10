// ============================================================
// invitiScritture — gli editor degli inviti dei Confidenti: crea, modifica, elimina (L9 R9-07c/1-2)
// ============================================================
//
// Un invito (`confidente_invito`) è un dato del Confidente: la sua chiave è `<confidente>/<MM-GG>`, quindi la data non si cambia (un invito di un
// altro giorno è un altro invito). Gli inviti della guida portano la propria fotografia in `seed_json` (com'erano alla nascita): la modifica non la
// tocca e segna la riga `origine = 'utente'` (il segno «Modificato»); la fotografia dice anche che l'invito è della guida. Non c'è un ritorno ai
// valori della guida (decisione dell'utente del 10/11). Un invito creato qui non ha fotografia: si può togliere (finisce nel Cestino); uno della
// guida no (si modifica). Non si toglie un invito che una partita ha già
// registrato, né uno citato da un effetto di una voce del Diario o dalla condizione di un altro dato: prima si cambia quello.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { conCestino } from './cestinoService.js';
import { verificaCondizioni } from './mappe/mappeService.js';
import { invitiDelConfidente } from './inviti.js';
import { dataConArticolo, normalizzaCondizioniSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import type { InvitoDto } from '../../shared/types.js';

export type TipoPostoInvito = 'quartiere' | 'luogo' | 'area';
/** L13 (O7-4, migrazione 313): quando arriva il messaggio dell'invito; assente = invariato, null = nessuno. */
export type MessaggioInvito = { data: string; fascia: 'giorno' | 'sera' };
export interface CorpoInvito { apre: { tipo: TipoPostoInvito; chiave: string }; condizioni: RequisitoSpillo[]; nota: string; messaggio?: MessaggioInvito | null }
export interface CorpoNuovoInvito extends CorpoInvito { data: string }

interface RigaInvitoCompleta {
  chiave: string; confidente_chiave: string; data: string | null; apre_tipo: TipoPostoInvito; apre_chiave: string;
  condizioni_json: string | null; nota: string; fonte: string; origine: string; seed_json: string | null;
  messaggio_data?: string | null; messaggio_fascia?: 'giorno' | 'sera' | null;
}

/** Il giorno del messaggio deve esistere nel calendario di gioco (400). */
function verificaMessaggio(m: MessaggioInvito | null | undefined): void {
  if (m && !dataValida(m.data)) throw httpErrors.badRequest('data-non-valida', 'Il giorno del messaggio è nel formato MM-GG e deve esistere nel calendario del gioco.');
}

const DATA_GIOCO = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
/** 2016 è l'anno del gioco (bisestile: esiste il 29 febbraio). */
function dataValida(d: string): boolean {
  if (!DATA_GIOCO.test(d)) return false;
  const dt = new Date(Date.UTC(2016, Number(d.slice(0, 2)) - 1, Number(d.slice(3, 5))));
  return dt.getUTCMonth() === Number(d.slice(0, 2)) - 1 && dt.getUTCDate() === Number(d.slice(3, 5));
}

function esisteConfidente(chiave: string): { nome: string } {
  const c = prepared('SELECT nome FROM confidente WHERE chiave = ?').get(chiave) as { nome: string } | undefined;
  if (!c) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${chiave}' non esiste.`);
  return c;
}

/** Il posto che l'invito apre deve esistere (404 altrimenti). */
function verificaPosto(apre: CorpoInvito['apre']): void {
  const tabella: Record<TipoPostoInvito, string> = { quartiere: 'quartiere', luogo: 'luogo', area: 'area' };
  if (!prepared(`SELECT 1 FROM ${tabella[apre.tipo]} WHERE chiave = ?`).get(apre.chiave)) {
    throw httpErrors.notFound('posto-non-trovato', `Il posto '${apre.chiave}' (${apre.tipo}) che l’invito apre non esiste.`);
  }
}

function riga(chiave: string): RigaInvitoCompleta {
  const r = prepared('SELECT * FROM confidente_invito WHERE chiave = ?').get(chiave) as RigaInvitoCompleta | undefined;
  if (!r) throw httpErrors.notFound('invito-non-trovato', 'Invito non trovato.');
  return r;
}

/** La riga di un invito del Confidente indicato, per data: 404 se non c'è o è di un altro Confidente. */
function rigaDelConfidente(confidente: string, data: string): RigaInvitoCompleta {
  esisteConfidente(confidente);
  const r = riga(`${confidente}/${data}`);
  if (r.confidente_chiave !== confidente) throw httpErrors.notFound('invito-non-trovato', 'Invito non trovato.');
  return r;
}

/** Le chiavi degli inviti citati da una condizione, anche dentro `gruppo` e `non`. */
function invitiCitati(c: unknown, fuori = new Set<string>()): Set<string> {
  if (Array.isArray(c)) { for (const x of c) invitiCitati(x, fuori); return fuori; }
  if (!c || typeof c !== 'object') return fuori;
  const o = c as { tipo?: unknown; invito?: unknown; condizioni?: unknown; condizione?: unknown };
  if (o.tipo === 'invito' && typeof o.invito === 'string') fuori.add(o.invito);
  invitiCitati(o.condizioni, fuori);
  invitiCitati(o.condizione, fuori);
  return fuori;
}

/** Un invito citato deve esistere (404) e la catena delle citazioni non deve tornare a `chiave` (400 `condizione-circolare`). */
function verificaInvitiCitati(chiave: string, condizioni: RequisitoSpillo[]): void {
  const visitati = new Set<string>();
  const percorri = (citati: Set<string>): void => {
    for (const k of citati) {
      if (k === chiave) throw httpErrors.badRequest('condizione-circolare', 'La condizione di un invito non può citare l’invito stesso, nemmeno passando da altri inviti.');
      const r = prepared('SELECT condizioni_json FROM confidente_invito WHERE chiave = ?').get(k) as { condizioni_json: string | null } | undefined;
      if (!r) throw httpErrors.notFound('condizione-non-trovata', `L’invito '${k}' della condizione non esiste.`);
      if (visitati.has(k)) continue;
      visitati.add(k);
      let salvate: unknown = [];
      try { salvate = r.condizioni_json ? JSON.parse(r.condizioni_json) as unknown : []; } catch { /* illeggibile: nessuna citazione da seguire */ }
      percorri(invitiCitati(salvate));
    }
  };
  percorri(invitiCitati(condizioni));
}

function condizioniVerificate(chiave: string, condizioni: RequisitoSpillo[]): string {
  verificaCondizioni(condizioni);
  verificaInvitiCitati(chiave, condizioni);
  return JSON.stringify(normalizzaCondizioniSpillo(condizioni));
}

function dtoDi(chiave: string): InvitoDto {
  const confidente = chiave.slice(0, chiave.indexOf('/'));
  const dto = invitiDelConfidente(confidente).find((i) => i.chiave === chiave);
  if (!dto) throw httpErrors.notFound('invito-non-trovato', 'Invito non trovato.');
  return dto;
}

/** Crea un invito del Confidente: la chiave è `<confidente>/<data>`, 409 se quel giorno ne ha già uno. */
export function creaInvito(confidente: string, corpo: CorpoNuovoInvito): InvitoDto {
  esisteConfidente(confidente);
  if (!dataValida(corpo.data)) throw httpErrors.badRequest('data-non-valida', 'La data dell’invito non è un giorno del calendario del gioco.');
  const chiave = `${confidente}/${corpo.data}`;
  if (prepared('SELECT 1 FROM confidente_invito WHERE chiave = ?').get(chiave)) throw httpErrors.conflict('invito-esistente', `Il Confidente ha già un invito per ${dataConArticolo(corpo.data)}: modificalo.`);
  verificaPosto(corpo.apre);
  verificaMessaggio(corpo.messaggio);
  const condizioni = condizioniVerificate(chiave, corpo.condizioni);
  prepared(`INSERT INTO confidente_invito (chiave, confidente_chiave, data, apre_tipo, apre_chiave, condizioni_json, nota, messaggio_data, messaggio_fascia, fonte, origine, seed_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Aggiunto dall’utente', 'utente', NULL, ?)`).run(chiave, confidente, corpo.data, corpo.apre.tipo, corpo.apre.chiave, condizioni, corpo.nota,
    corpo.messaggio?.data ?? null, corpo.messaggio?.fascia ?? null, nowIso());
  invalidaCacheDiGioco();
  return dtoDi(chiave);
}

/** Cambia il posto aperto, le condizioni e la nota di un invito (la data è la chiave: non si cambia). La fotografia della guida resta com'è. */
export function modificaInvito(confidente: string, data: string, corpo: CorpoInvito): InvitoDto {
  const r = rigaDelConfidente(confidente, data);
  verificaPosto(corpo.apre);
  verificaMessaggio(corpo.messaggio);
  const condizioni = condizioniVerificate(r.chiave, corpo.condizioni);
  // il messaggio non mandato resta quello della riga
  const messaggio = corpo.messaggio === undefined ? { data: r.messaggio_data ?? null, fascia: r.messaggio_fascia ?? null } : { data: corpo.messaggio?.data ?? null, fascia: corpo.messaggio?.fascia ?? null };
  prepared("UPDATE confidente_invito SET apre_tipo = ?, apre_chiave = ?, condizioni_json = ?, nota = ?, messaggio_data = ?, messaggio_fascia = ?, origine = 'utente', updated_at = ? WHERE chiave = ?")
    .run(corpo.apre.tipo, corpo.apre.chiave, condizioni, corpo.nota, messaggio.data, messaggio.fascia, nowIso(), r.chiave);
  invalidaCacheDiGioco();
  return dtoDi(r.chiave);
}

/** Le tabelle con una colonna di condizioni che può citare un invito (le stesse dell'importazione delle condizioni). */
const TABELLE_CON_CONDIZIONI = ['quartiere', 'luogo', 'negozio', 'articolo', 'attivita', 'libro', 'film', 'spillo', 'copia_pezzo', 'confidente_invito'] as const;
/** La colonna delle condizioni: `condizioni_json` ovunque, tranne il negozio, le cui condizioni proprie stanno in `sblocco_json`. */
const COLONNA_CONDIZIONI = (t: (typeof TABELLE_CON_CONDIZIONI)[number]): string => (t === 'negozio' ? 'sblocco_json' : 'condizioni_json');

/** Elimina un invito creato dall'utente: finisce nel Cestino. 409 se è della guida, se una partita l'ha registrato o se qualcosa lo cita. */
export function eliminaInvito(confidente: string, data: string): { eliminato: true; chiave: string } {
  const r = rigaDelConfidente(confidente, data);
  if (r.seed_json !== null) throw httpErrors.conflict('invito-della-guida', 'Un invito della guida non si toglie: si modifica.');
  if (prepared('SELECT 1 FROM utente.invito_partita WHERE invito_chiave = ? LIMIT 1').get(r.chiave)) {
    throw httpErrors.conflict('invito-in-uso', 'Una partita ha già registrato questo invito: non si può togliere.');
  }
  if (prepared("SELECT 1 FROM voce_effetto WHERE json_extract(dati_json, '$.invito') = ? LIMIT 1").get(r.chiave)) {
    throw httpErrors.conflict('invito-in-uso', 'L’effetto di una voce del Diario cita questo invito: prima si cambia la voce.');
  }
  const cita = `%"invito":"${r.chiave.replace(/[\\%_"]/g, (c) => `\\${c}`)}"%`;
  for (const t of TABELLE_CON_CONDIZIONI) {
    if (prepared(`SELECT 1 FROM ${t} WHERE ${COLONNA_CONDIZIONI(t)} LIKE ? ESCAPE '\\' ${t === 'confidente_invito' ? 'AND chiave <> ?' : ''} LIMIT 1`).get(...(t === 'confidente_invito' ? [cita, r.chiave] : [cita]))) {
      throw httpErrors.conflict('invito-in-uso', `La condizione di un altro dato (${t}) cita questo invito: prima si cambia quella.`);
    }
  }
  const c = esisteConfidente(confidente);
  conCestino({ tipo: 'invito', chiave: r.chiave, nome: `Invito di ${c.nome} del ${r.data ?? data}`, contesto: c.nome }, () => {
    getDb().transaction(() => { prepared('DELETE FROM confidente_invito WHERE chiave = ?').run(r.chiave); })();
  });
  invalidaCacheDiGioco();
  return { eliminato: true, chiave: r.chiave };
}
