// ============================================================
// invitiScritture — gli editor degli inviti dei Confidenti: crea, modifica, «Ripristina», elimina (L9 R9-07c/1-2)
// ============================================================
//
// Un invito (`confidente_invito`) è un dato del Confidente: la sua chiave è `<confidente>/<MM-GG>`, quindi la data non si cambia (un invito di un
// altro giorno è un altro invito). Gli inviti della guida portano la propria fotografia in `seed_json` (com'erano alla nascita): la modifica non la
// tocca e segna la riga `origine = 'utente'`; «Ripristina» riscrive i campi dalla fotografia e rimette `origine = 'seed'`. Un invito creato qui non ha
// fotografia: si può togliere (finisce nel Cestino); uno della guida no (si modifica o si ripristina). Non si toglie un invito che una partita ha già
// registrato, né uno citato da un effetto di una voce del Diario o dalla condizione di un altro dato: prima si cambia quello.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { conCestino } from './cestinoService.js';
import { verificaCondizioni } from './mappe/mappeService.js';
import { invitiDelConfidente } from './inviti.js';
import { normalizzaCondizioniSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import type { InvitoDto } from '../../shared/types.js';

export type TipoPostoInvito = 'quartiere' | 'luogo' | 'area';
export interface CorpoInvito { apre: { tipo: TipoPostoInvito; chiave: string }; condizioni: RequisitoSpillo[]; nota: string }
export interface CorpoNuovoInvito extends CorpoInvito { data: string }

interface RigaInvitoCompleta {
  chiave: string; confidente_chiave: string; data: string | null; apre_tipo: TipoPostoInvito; apre_chiave: string;
  condizioni_json: string | null; nota: string; fonte: string; origine: string; seed_json: string | null;
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
  if (!dataValida(corpo.data)) throw httpErrors.badRequest('data-non-valida', 'La data dell’invito è nel formato MM-GG e deve esistere nel calendario del gioco.');
  const chiave = `${confidente}/${corpo.data}`;
  if (prepared('SELECT 1 FROM confidente_invito WHERE chiave = ?').get(chiave)) throw httpErrors.conflict('invito-esistente', `Il Confidente ha già un invito per il ${corpo.data}: modificalo.`);
  verificaPosto(corpo.apre);
  const condizioni = condizioniVerificate(chiave, corpo.condizioni);
  prepared(`INSERT INTO confidente_invito (chiave, confidente_chiave, data, apre_tipo, apre_chiave, condizioni_json, nota, fonte, origine, seed_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Aggiunto dall’utente', 'utente', NULL, ?)`).run(chiave, confidente, corpo.data, corpo.apre.tipo, corpo.apre.chiave, condizioni, corpo.nota, nowIso());
  invalidaCacheDiGioco();
  return dtoDi(chiave);
}

/** Cambia il posto aperto, le condizioni e la nota di un invito (la data è la chiave: non si cambia). La fotografia della guida resta com'è. */
export function modificaInvito(confidente: string, data: string, corpo: CorpoInvito): InvitoDto {
  const r = rigaDelConfidente(confidente, data);
  verificaPosto(corpo.apre);
  const condizioni = condizioniVerificate(r.chiave, corpo.condizioni);
  prepared("UPDATE confidente_invito SET apre_tipo = ?, apre_chiave = ?, condizioni_json = ?, nota = ?, origine = 'utente', updated_at = ? WHERE chiave = ?")
    .run(corpo.apre.tipo, corpo.apre.chiave, condizioni, corpo.nota, nowIso(), r.chiave);
  invalidaCacheDiGioco();
  return dtoDi(r.chiave);
}

interface FotografiaInvito { apre_tipo?: unknown; apre_chiave?: unknown; condizioni?: unknown; nota?: unknown }

/** «Ripristina»: rimette posto, condizioni e nota com'erano nella guida. 409 se l'invito non è della guida o non è stato modificato. */
export function ripristinaInvito(confidente: string, data: string): InvitoDto {
  const r = rigaDelConfidente(confidente, data);
  if (r.seed_json === null) throw httpErrors.conflict('invito-creato-dall-utente', 'Questo invito non viene dalla guida: non c’è niente da ripristinare.');
  if (r.origine !== 'utente') throw httpErrors.conflict('invito-della-guida', 'Questo invito non è stato modificato: è già come lo dà la guida.');
  let f: FotografiaInvito;
  try { f = JSON.parse(r.seed_json) as FotografiaInvito; }
  catch { throw httpErrors.conflict('invito-fotografia-illeggibile', 'La fotografia della guida di questo invito non è leggibile: l’invito resta com’è.'); }
  const tipi: readonly unknown[] = ['quartiere', 'luogo', 'area'];
  if (!tipi.includes(f.apre_tipo) || typeof f.apre_chiave !== 'string' || !Array.isArray(f.condizioni) || typeof f.nota !== 'string') {
    throw httpErrors.conflict('invito-fotografia-incompleta', 'La fotografia della guida di questo invito è incompleta: l’invito resta com’è.');
  }
  verificaPosto({ tipo: f.apre_tipo as TipoPostoInvito, chiave: f.apre_chiave });
  const condizioni = condizioniVerificate(r.chiave, f.condizioni as RequisitoSpillo[]);
  prepared("UPDATE confidente_invito SET apre_tipo = ?, apre_chiave = ?, condizioni_json = ?, nota = ?, origine = 'seed', updated_at = ? WHERE chiave = ?")
    .run(f.apre_tipo, f.apre_chiave, condizioni, f.nota, nowIso(), r.chiave);
  invalidaCacheDiGioco();
  return dtoDi(r.chiave);
}

/** Le tabelle con una colonna `condizioni_json` che può citare un invito (le stesse dell'importazione delle condizioni). */
const TABELLE_CON_CONDIZIONI = ['quartiere', 'luogo', 'negozio', 'articolo', 'attivita', 'libro', 'film', 'spillo', 'copia_pezzo', 'confidente_invito'] as const;

/** Elimina un invito creato dall'utente: finisce nel Cestino. 409 se è della guida, se una partita l'ha registrato o se qualcosa lo cita. */
export function eliminaInvito(confidente: string, data: string): { eliminato: true; chiave: string } {
  const r = rigaDelConfidente(confidente, data);
  if (r.seed_json !== null) throw httpErrors.conflict('invito-della-guida', 'Un invito della guida non si toglie: si modifica o si ripristina.');
  if (prepared('SELECT 1 FROM utente.invito_partita WHERE invito_chiave = ? LIMIT 1').get(r.chiave)) {
    throw httpErrors.conflict('invito-in-uso', 'Una partita ha già registrato questo invito: non si può togliere.');
  }
  if (prepared("SELECT 1 FROM voce_effetto WHERE json_extract(dati_json, '$.invito') = ? LIMIT 1").get(r.chiave)) {
    throw httpErrors.conflict('invito-in-uso', 'L’effetto di una voce del Diario cita questo invito: prima si cambia la voce.');
  }
  const cita = `%"invito":"${r.chiave.replace(/[\\%_"]/g, (c) => `\\${c}`)}"%`;
  for (const t of TABELLE_CON_CONDIZIONI) {
    if (prepared(`SELECT 1 FROM ${t} WHERE condizioni_json LIKE ? ESCAPE '\\' ${t === 'confidente_invito' ? 'AND chiave <> ?' : ''} LIMIT 1`).get(...(t === 'confidente_invito' ? [cita, r.chiave] : [cita]))) {
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
