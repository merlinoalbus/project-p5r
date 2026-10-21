// ============================================================
// richiesteService — Richieste dei Mementos con stato per partita e dati di Jose (Fase 7.2)
// ============================================================
//
// Dalla voce 5 del piano (2026-09-12) le richieste sono ordinate per **dedalo** (l'area dei
// Memento in cui si svolgono, `dungeon_area`) e poi per ordine della guida, e l'elenco porta i
// dedali con i loro conteggi: è il filtro della pagina, nell'ordine di percorrenza.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { datiGuida, type Congelato } from './datiGuida.js';
import { registraEvento } from './storicoService.js';
import { conCestino } from './cestinoService.js';
import type { CitazioniRichiestaDto, JoseDto, RicompensaOggettoDto, RichiestaDto, RichiesteDto, StatoRichiesta } from '../../shared/types.js';
import { slug } from '../../shared/slug.js';
import { catalogoOggettiDisponibile, ricompensePerFonte } from './catalogoOggettiLetture.js';
import { dettaglioNegozio } from './negoziService.js';

interface RigaRichiesta { chiave: string; ordine: number; nome: string; committente: string; disponibile_dal: string; scadenza: string; area: string; area_chiave: string | null; area_nome: string | null; area_ordine: number | null; piano: string; bersaglio_json: string; ricompense_json: string; confidente_chiave: string | null; confidente_rango: number | null; note: string; fonte: string; confidente_nome: string | null; area_dedalo_chiave: string | null; area_dedalo_nome: string | null }

const SQL = 'SELECT r.*, c.nome AS confidente_nome, a.nome AS area_nome, a.ordine AS area_ordine, ad.nome AS area_dedalo_nome FROM richiesta r LEFT JOIN confidente c ON c.chiave = r.confidente_chiave LEFT JOIN dungeon_area a ON a.chiave = r.area_chiave LEFT JOIN area_dedalo ad ON ad.chiave = r.area_dedalo_chiave';

/** Una Richiesta come DTO: bersaglio e ricompense dai JSON, Confidente collegato (con il nome, o la chiave se manca),
 *  dedalo e stato nella partita (null se non è segnata). */
function dto(r: RigaRichiesta, stati: Map<string, StatoRichiesta>, premi = ricompensePerFonte('richiesta', [r.chiave])): RichiestaDto {
  return {
    chiave: r.chiave, nome: r.nome, committente: r.committente, disponibileDal: r.disponibile_dal, scadenza: r.scadenza, area: r.area, areaChiave: r.area_chiave, piano: r.piano,
    bersaglio: JSON.parse(r.bersaglio_json) as RichiestaDto['bersaglio'], ricompense: JSON.parse(r.ricompense_json) as string[],
    oggettiRicompensa: premi.get(r.chiave) ?? [],
    confidente: r.confidente_chiave ? { chiave: r.confidente_chiave, nome: r.confidente_nome ?? r.confidente_chiave, rango: r.confidente_rango } : null,
    areaNome: r.area_nome, areaOrdine: r.area_ordine, areaDedalo: r.area_dedalo_chiave, areaDedaloNome: r.area_dedalo_nome,
    note: r.note, fonte: r.fonte, stato: stati.get(r.chiave) ?? null,
  };
}

/** Lo stato di ogni Richiesta segnata nella partita; mappa vuota senza partita (con partita ne verifica l'esistenza). */
function statiPartita(partitaId: number | undefined): Map<string, StatoRichiesta> {
  if (partitaId === undefined) return new Map();
  verificaPartita(partitaId);
  return new Map((prepared('SELECT richiesta_chiave, stato FROM richiesta_partita WHERE partita_id = ?').all(partitaId) as Array<{ richiesta_chiave: string; stato: StatoRichiesta }>).map((r) => [r.richiesta_chiave, r.stato]));
}

/** Tutte le Richieste, con lo stato nella partita se indicata, i dati di Jose e l'elenco dei dedali nell'ordine di
 *  percorrenza con quante Richieste hanno e quante sono completate (le Richieste senza dedalo non ne formano uno). */
export function richieste(partitaId?: number): Congelato<RichiesteDto> {
  const stati = statiPartita(partitaId);
  // prima per dedalo (le richieste senza dedalo in coda), poi per area del dedalo (le da collocare in coda) e per ordine della guida
  const righe = prepared(`${SQL} ORDER BY (a.ordine IS NULL), a.ordine, (ad.ordine IS NULL), ad.ordine, r.ordine`).all() as RigaRichiesta[];
  const premi: Map<string, RicompensaOggettoDto[]> = ricompensePerFonte('richiesta', righe.map((r) => r.chiave));
  const lista = righe.map((r) => dto(r, stati, premi));
  const dedali: RichiesteDto['dedali'] = [];
  for (const r of lista) {
    if (!r.areaChiave || !r.areaNome || r.areaOrdine === null) continue;
    let d = dedali.find((x) => x.chiave === r.areaChiave);
    if (!d) { d = { chiave: r.areaChiave, nome: r.areaNome, ordine: r.areaOrdine, totale: 0, completate: 0 }; dedali.push(d); }
    d.totale += 1;
    if (r.stato === 'completata') d.completate += 1;
  }
  const fonteJose = datiGuida<JoseDto>('jose');
  const jose = fonteJose && catalogoOggettiDisponibile() ? { ...fonteJose, scambi: [],
    listino: prepared("SELECT 1 FROM negozio WHERE chiave = 'jose' AND nascosto = 0").get() ? dettaglioNegozio('jose', partitaId) : null } : fonteJose;
  return { richieste: lista, jose, dedali, completate: lista.filter((r) => r.stato === 'completata').length, totale: lista.length, collocazioni: collocazioni() };
}

/** Tutti i dedali dei Memento, nell'ordine di percorrenza, con le loro aree (099): dove il modulo può mettere una Richiesta. */
function collocazioni(): RichiesteDto['collocazioni'] {
  const dedali = (prepared("SELECT a.chiave, a.nome FROM dungeon_area a JOIN dungeon d ON d.chiave = a.dungeon_chiave WHERE d.tipo = 'mementos' ORDER BY a.ordine").all() as Array<{ chiave: string; nome: string }>)
    .map((d) => ({ ...d, aree: [] as Array<{ chiave: string; nome: string }> }));
  for (const a of prepared('SELECT chiave, nome, dedalo_chiave FROM area_dedalo ORDER BY ordine, chiave').all() as Array<{ chiave: string; nome: string; dedalo_chiave: string }>) {
    dedali.find((d) => d.chiave === a.dedalo_chiave)?.aree.push({ chiave: a.chiave, nome: a.nome });
  }
  return dedali;
}

/** Stato di una Richiesta nella partita ('accettata', 'completata' o null per azzerare); evento al completamento. */
export function impostaStatoRichiesta(partitaId: number, chiave: string, stato: StatoRichiesta | null): RichiestaDto {
  verificaPartita(partitaId);
  const r = prepared(`${SQL} WHERE r.chiave = ?`).get(chiave) as RigaRichiesta | undefined;
  if (!r) throw httpErrors.notFound('richiesta-non-trovata', `La Richiesta '${chiave}' non esiste.`);
  const adesso = nowIso();
  getDb().transaction(() => {
    const prima = (prepared('SELECT stato FROM richiesta_partita WHERE partita_id = ? AND richiesta_chiave = ?').get(partitaId, chiave) as { stato: StatoRichiesta } | undefined)?.stato ?? null;
    if (stato === null) prepared('DELETE FROM richiesta_partita WHERE partita_id = ? AND richiesta_chiave = ?').run(partitaId, chiave);
    else prepared('INSERT INTO richiesta_partita (partita_id, richiesta_chiave, stato, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, richiesta_chiave) DO UPDATE SET stato = excluded.stato, updated_at = excluded.updated_at').run(partitaId, chiave, stato, adesso);
    if (stato === 'completata' && prima !== 'completata') {
      const b = JSON.parse(r.bersaglio_json) as { nome: string };
      registraEvento(partitaId, 'richiesta-completata', `Richiesta completata: ${r.nome}`, `${r.area}${r.piano ? ` (${r.piano})` : ''} · bersaglio ${b.nome}${r.confidente_nome ? ` · Confidente ${r.confidente_nome}` : ''}.`, { richiesta: chiave });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return dto(r, new Map(stato === null ? [] : [[chiave, stato]]));
}

/**
 * Colloca una Richiesta in un'area di un dedalo dei Memento (099: le Richieste sono elementi delle aree, scelta dell'utente del
 * 2026-10-11), o la toglie dall'area (null: resta nel suo dedalo, da collocare). Collocandola, il dedalo della Richiesta diventa
 * quello dell'area (`area_chiave`); se cambia dedalo, il suo nome va in `area` (che altrimenti tiene la prosa della guida) e la
 * Richiesta va in fondo all'elenco. Dato di gioco, per tutte le partite.
 */
export function collocaRichiesta(chiave: string, areaDedalo: string | null): RichiestaDto {
  const r = prepared(`${SQL} WHERE r.chiave = ?`).get(chiave) as RigaRichiesta | undefined;
  if (!r) throw httpErrors.notFound('richiesta-non-trovata', `La Richiesta '${chiave}' non esiste.`);
  if (areaDedalo === null) {
    prepared('UPDATE richiesta SET area_dedalo_chiave = NULL WHERE chiave = ?').run(chiave);
  } else {
    const a = prepared('SELECT ad.dedalo_chiave, d.nome AS dedalo_nome FROM area_dedalo ad JOIN dungeon_area d ON d.chiave = ad.dedalo_chiave WHERE ad.chiave = ?').get(areaDedalo) as { dedalo_chiave: string; dedalo_nome: string } | undefined;
    if (!a) throw httpErrors.notFound('area-dedalo-non-trovata', `L'area del dedalo '${areaDedalo}' non esiste.`);
    const ordine = a.dedalo_chiave === r.area_chiave ? r.ordine : (prepared('SELECT COALESCE(MAX(ordine), -1) AS n FROM richiesta').get() as { n: number }).n + 1;
    prepared('UPDATE richiesta SET area_dedalo_chiave = ?, area_chiave = ?, area = ?, ordine = ? WHERE chiave = ?').run(areaDedalo, a.dedalo_chiave, a.dedalo_chiave === r.area_chiave ? r.area : a.dedalo_nome, ordine, chiave);
  }
  return dto(prepared(`${SQL} WHERE r.chiave = ?`).get(chiave) as RigaRichiesta, new Map());
}

// ---- Le Richieste modificabili, aggiungibili ed eliminabili (scelta dell'utente, 2026-10-11) ----
//
// «come faccio a modificare i dettagli relativi alle richieste? non ho un pulsante modifica.» Scelte: «Modifica, aggiungi,
// elimina», «In entrambi i posti» (pagina delle Richieste e colonna del dedalo), «Si elimina e si avvisa». Le Richieste sono
// dati di gioco (`gioco.db`): valgono per tutte le partite e vanno nel pacchetto. La chiave non cambia mai, nemmeno col nome:
// stati delle partite, condizioni e pin la citano per chiave.

/** I campi di una Richiesta che il modulo scrive. `dedalo` e `areaDedalo`: dove sta (null = in nessun dedalo / da collocare). */
export interface DatiRichiesta {
  nome?: string; committente?: string; disponibileDal?: string; scadenza?: string;
  dedalo?: string | null; areaDedalo?: string | null; piano?: string;
  bersaglio?: RichiestaDto['bersaglio'];
  ricompense?: string[]; confidente?: string | null; confidenteRango?: number | null; note?: string;
}

/** La riga di una Richiesta (404 se non c'è). */
function rigaRichiesta(chiave: string): RigaRichiesta {
  const r = prepared(`${SQL} WHERE r.chiave = ?`).get(chiave) as RigaRichiesta | undefined;
  if (!r) throw httpErrors.notFound('richiesta-non-trovata', `La Richiesta '${chiave}' non esiste.`);
  return r;
}

/**
 * Dove sta la Richiesta: dedalo (una `dungeon_area` dei Memento), sua area (`area_dedalo`) e il nome del dedalo (colonna `area`).
 * Un'area porta con sé il suo dedalo (e deve essere di quello dato, se c'è); cambiando dedalo senza dire l'area, la Richiesta
 * resta da collocare nel dedalo nuovo.
 */
function collocazione(dati: DatiRichiesta, prima: { dedalo: string | null; area: string | null }): { dedalo: string | null; area: string | null; nomeDedalo: string } {
  let dedalo = dati.dedalo === undefined ? prima.dedalo : dati.dedalo;
  let area = dati.areaDedalo === undefined ? (dedalo === prima.dedalo ? prima.area : null) : dati.areaDedalo;
  if (area !== null) {
    const a = prepared('SELECT dedalo_chiave, nome FROM area_dedalo WHERE chiave = ?').get(area) as { dedalo_chiave: string; nome: string } | undefined;
    if (!a) throw httpErrors.notFound('area-dedalo-non-trovata', `L'area del dedalo '${area}' non esiste.`);
    if (dati.dedalo !== undefined && dati.dedalo !== null && dati.dedalo !== a.dedalo_chiave) throw httpErrors.badRequest('area-di-altro-dedalo', `«${a.nome}» è un'area di un altro dedalo.`);
    dedalo = a.dedalo_chiave;
  }
  if (dedalo === null) { area = null; return { dedalo, area, nomeDedalo: '' }; }
  const d = prepared("SELECT a.nome FROM dungeon_area a JOIN dungeon g ON g.chiave = a.dungeon_chiave WHERE a.chiave = ? AND g.tipo = 'mementos'").get(dedalo) as { nome: string } | undefined;
  if (!d) {
    if (prepared('SELECT 1 FROM dungeon_area WHERE chiave = ?').get(dedalo)) throw httpErrors.badRequest('non-un-dedalo', `'${dedalo}' non è un dedalo dei Memento.`);
    throw httpErrors.notFound('area-non-trovata', `Il dedalo '${dedalo}' non esiste.`);
  }
  return { dedalo, area, nomeDedalo: d.nome };
}

/** Il Confidente collegato deve esistere. */
function verificaConfidente(chiave: string | null | undefined): void {
  if (chiave && !prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(chiave)) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${chiave}' non esiste.`);
}

/**
 * Il nome di una Richiesta è unico (senza badare alle maiuscole): i requisiti dei Confidenti della guida le citano per nome, e due
 * Richieste con lo stesso nome renderebbero ambiguo quale è completata (rilievo del validatore, 2026-10-11). 409 se è già usato.
 */
function verificaNomeLibero(nome: string, tranne: string | null): void {
  // in JS, con la regola dei semafori: `lower()` di SQLite tocca solo l'ASCII e lascerebbe passare «è una figlia…» accanto a «È una figlia…»
  const cercato = nome.trim().toLowerCase();
  const altra = (prepared('SELECT chiave, nome FROM richiesta WHERE chiave IS NOT ?').all(tranne) as { chiave: string; nome: string }[])
    .find((r) => r.nome.toLowerCase() === cercato);
  if (altra) throw httpErrors.conflict('nome-gia-usato', `C'è già una Richiesta che si chiama «${nome.trim()}»: i requisiti dei Confidenti le citano per nome, scegline un altro.`);
}

/** L'ordine dopo l'ultima Richiesta: una nuova, o una che cambia dedalo, va in fondo. */
const ordineInFondo = (): number => (prepared('SELECT COALESCE(MAX(ordine), -1) AS n FROM richiesta').get() as { n: number }).n + 1;

/** Una Richiesta nuova (nome e bersaglio obbligatori), in fondo all'elenco della guida; la chiave nasce dal nome. */
export function creaRichiesta(dati: DatiRichiesta & { nome: string; bersaglio: RichiestaDto['bersaglio'] }): RichiestaDto {
  verificaNomeLibero(dati.nome, null);
  const dove = collocazione(dati, { dedalo: null, area: null });
  verificaConfidente(dati.confidente);
  const base = (slug(dati.nome) || 'richiesta').slice(0, 190).replace(/-+$/, '') || 'richiesta';
  let chiave = base;
  for (let i = 2; prepared('SELECT 1 FROM richiesta WHERE chiave = ?').get(chiave); i++) chiave = `${base}-${i}`;
  prepared(`INSERT INTO richiesta (chiave, ordine, nome, committente, disponibile_dal, scadenza, area, area_chiave, area_dedalo_chiave, piano, bersaglio_json, ricompense_json, confidente_chiave, confidente_rango, note, fonte)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'utente')`).run(
    chiave, ordineInFondo(), dati.nome.trim(), dati.committente ?? '', dati.disponibileDal ?? '', dati.scadenza ?? '', dove.nomeDedalo, dove.dedalo, dove.area, dati.piano ?? '',
    JSON.stringify(dati.bersaglio), JSON.stringify(dati.ricompense ?? []), dati.confidente ?? null, dati.confidente ? dati.confidenteRango ?? null : null, dati.note ?? '');
  return dto(rigaRichiesta(chiave), new Map());
}

/**
 * Corregge una Richiesta: si cambiano solo i campi inviati. Cambiando dedalo va in fondo all'elenco e `area` prende il nome del
 * dedalo nuovo (altrimenti tiene la prosa della guida, «Dedalo di Aiyatsbus (Area 7) / …»). Cambiando nome, i requisiti
 * dei Confidenti che la citavano per nome (i dati della guida lo fanno così) passano a citarla per chiave, e il loro testo dice il
 * nome nuovo: altrimenti smetterebbero in silenzio di riconoscerla.
 */
export function aggiornaRichiesta(chiave: string, dati: DatiRichiesta): RichiestaDto {
  const r = rigaRichiesta(chiave);
  const dove = collocazione(dati, { dedalo: r.area_chiave, area: r.area_dedalo_chiave });
  if (dati.confidente !== undefined) verificaConfidente(dati.confidente);
  const confidente = dati.confidente === undefined ? r.confidente_chiave : dati.confidente;
  const rango = confidente === null ? null : dati.confidenteRango === undefined ? r.confidente_rango : dati.confidenteRango;
  const nome = dati.nome?.trim() || r.nome;
  if (nome.toLowerCase() !== r.nome.toLowerCase()) verificaNomeLibero(nome, chiave);
  const ordine = dove.dedalo !== r.area_chiave ? ordineInFondo() : r.ordine;
  getDb().transaction(() => {
    prepared(`UPDATE richiesta SET nome = ?, committente = ?, disponibile_dal = ?, scadenza = ?, area = ?, area_chiave = ?, area_dedalo_chiave = ?, piano = ?, bersaglio_json = ?,
      ricompense_json = ?, confidente_chiave = ?, confidente_rango = ?, note = ?, ordine = ? WHERE chiave = ?`).run(
      nome, dati.committente ?? r.committente, dati.disponibileDal ?? r.disponibile_dal, dati.scadenza ?? r.scadenza, dove.dedalo === r.area_chiave ? r.area : dove.nomeDedalo, dove.dedalo, dove.area, dati.piano ?? r.piano,
      dati.bersaglio ? JSON.stringify(dati.bersaglio) : r.bersaglio_json, dati.ricompense ? JSON.stringify(dati.ricompense) : r.ricompense_json, confidente, rango, dati.note ?? r.note, ordine, chiave);
    if (nome !== r.nome) {
      // le voci della giornata che la indicano mostrano il nome salvato in `riferimento_testo` (`giornataService`): il nome nuovo.
      // L6 (R6-04): condizioni e requisiti la citano per chiave, e il testo che mostrano si genera dal nome: rinominarla non li tocca
      prepared("UPDATE voce_giornata SET riferimento_testo = ? WHERE riferimento_tipo = 'richiesta' AND riferimento_chiave = ? AND riferimento_testo IS NOT NULL").run(nome, chiave);
    }
  })();
  return dto(rigaRichiesta(chiave), new Map());
}

/** Vero se il nome o la chiave citati sono quelli della Richiesta (i nomi senza badare alle maiuscole, come i semafori). */
const citaLaRichiesta = (citata: unknown, chiave: string, nome: string): boolean => typeof citata === 'string' && (citata === chiave || citata.toLowerCase() === nome.toLowerCase());

/** I requisiti dei Confidenti che citano la Richiesta (per chiave o per nome). */
function requisitiCheCitano(chiave: string, nome: string): Array<{ confidente_chiave: string; rango: number; indice: number; testo: string; dati: Record<string, unknown> }> {
  return (prepared("SELECT confidente_chiave, rango, indice, dati_json, testo FROM confidente_requisito WHERE tipo = 'richiesta'").all() as Array<{ confidente_chiave: string; rango: number; indice: number; dati_json: string; testo: string }>)
    .map((q) => ({ ...q, dati: JSON.parse(q.dati_json) as Record<string, unknown> }))
    .filter((q) => citaLaRichiesta(q.dati.richiesta, chiave, nome));
}

/** Vero se un albero di condizioni (gruppi compresi) ne contiene una sulla Richiesta. */
function condizioneCita(nodo: unknown, chiave: string, nome: string): boolean {
  if (Array.isArray(nodo)) return nodo.some((x) => condizioneCita(x, chiave, nome));
  if (!nodo || typeof nodo !== 'object') return false;
  const o = nodo as Record<string, unknown>;
  if (o.tipo === 'richiesta' && citaLaRichiesta(o.richiesta, chiave, nome)) return true;
  return Object.values(o).some((v) => typeof v === 'object' && condizioneCita(v, chiave, nome));
}

/** Le tabelle del file di gioco che hanno condizioni (`condizioni_json`), con che cosa sono. */
const TABELLE_CON_CONDIZIONI: ReadonlyArray<{ tabella: string; cosa: string }> = [
  { tabella: 'spillo', cosa: 'Pin' }, { tabella: 'negozio', cosa: 'Negozio' }, { tabella: 'articolo', cosa: 'Articolo' }, { tabella: 'libro', cosa: 'Libro' },
  { tabella: 'film', cosa: 'Film' }, { tabella: 'attivita', cosa: 'Attività' }, { tabella: 'luogo', cosa: 'Luogo' },
];

// Le azioni della giornata sono le righe di `voce_giornata` (migrazione 092): `giorno_percorso.azioni_json` è rimasta come copia
// storica della guida d'origine e nessuno la legge più, quindi non si conta e non si tocca (rilievo del validatore, 2026-10-11:
// contarla diceva «2 azioni» per una sola).

/** Chi cita la Richiesta, per l'avviso prima di eliminarla: partite con uno stato, pin, condizioni, requisiti, azioni della giornata. */
export function citazioniRichiesta(chiave: string): CitazioniRichiestaDto {
  const r = rigaRichiesta(chiave);
  const condizioni: string[] = [];
  for (const t of TABELLE_CON_CONDIZIONI) {
    for (const riga of prepared(`SELECT nome, condizioni_json FROM ${t.tabella} WHERE condizioni_json LIKE '%richiesta%'`).all() as Array<{ nome: string; condizioni_json: string }>) {
      if (condizioneCita(JSON.parse(riga.condizioni_json), chiave, r.nome)) condizioni.push(`${t.cosa}: ${riga.nome}`);
    }
  }
  const requisiti = requisitiCheCitano(chiave, r.nome).map((q) => {
    const c = prepared('SELECT nome FROM confidente WHERE chiave = ?').get(q.confidente_chiave) as { nome: string } | undefined;
    return `${c?.nome ?? q.confidente_chiave}, rango ${q.rango}`;
  });
  const voci = (prepared("SELECT COUNT(*) AS n FROM voce_giornata WHERE riferimento_tipo = 'richiesta' AND riferimento_chiave = ?").get(chiave) as { n: number }).n;
  return {
    partite: (prepared('SELECT COUNT(DISTINCT partita_id) AS n FROM richiesta_partita WHERE richiesta_chiave = ?').get(chiave) as { n: number }).n,
    pin: (prepared("SELECT nome FROM spillo WHERE riferimento_tipo = 'richiesta' AND riferimento_chiave = ? ORDER BY nome").all(chiave) as Array<{ nome: string }>).map((p) => p.nome),
    condizioni, requisiti,
    azioni: voci,
  };
}

/**
 * Elimina una Richiesta per tutte le partite (scelta dell'utente, 2026-10-11: «Si elimina e si avvisa»). L6 (R6-04): va nel cestino
 * (Impostazioni → Cestino), da dove torna com'era; se ne vanno i suoi stati nelle partite e i pin e le azioni della giornata che la
 * indicavano perdono il collegamento (tornano col ripristino). Le condizioni e i requisiti che la citano **restano per chiave**, senza
 * riscritture, e danno «Richiesta eliminata» (grigio) finché non torna.
 */
export function eliminaRichiesta(chiave: string): void {
  const r = rigaRichiesta(chiave);
  conCestino({ tipo: 'richiesta', chiave, nome: r.nome, contesto: r.area }, () => {
    prepared('DELETE FROM richiesta_partita WHERE richiesta_chiave = ?').run(chiave);
    prepared("UPDATE spillo SET riferimento_tipo = NULL, riferimento_chiave = NULL WHERE riferimento_tipo = 'richiesta' AND riferimento_chiave = ?").run(chiave);
    prepared("UPDATE voce_giornata SET riferimento_tipo = NULL, riferimento_chiave = NULL WHERE riferimento_tipo = 'richiesta' AND riferimento_chiave = ?").run(chiave);
    prepared('DELETE FROM richiesta WHERE chiave = ?').run(chiave);
  });
}
