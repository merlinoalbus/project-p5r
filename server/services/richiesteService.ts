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
import type { JoseDto, RichiestaDto, RichiesteDto, StatoRichiesta } from '../../shared/types.js';

interface RigaRichiesta { chiave: string; ordine: number; nome: string; committente: string; disponibile_dal: string; scadenza: string; area: string; area_chiave: string | null; area_nome: string | null; area_ordine: number | null; piano: string; bersaglio_json: string; ricompense_json: string; confidente_chiave: string | null; confidente_rango: number | null; note: string; fonte: string; confidente_nome: string | null; area_dedalo_chiave: string | null; area_dedalo_nome: string | null }

const SQL = 'SELECT r.*, c.nome AS confidente_nome, a.nome AS area_nome, a.ordine AS area_ordine, ad.nome AS area_dedalo_nome FROM richiesta r LEFT JOIN confidente c ON c.chiave = r.confidente_chiave LEFT JOIN dungeon_area a ON a.chiave = r.area_chiave LEFT JOIN area_dedalo ad ON ad.chiave = r.area_dedalo_chiave';

/** Una Richiesta come DTO: bersaglio e ricompense dai JSON, Confidente collegato (con il nome, o la chiave se manca),
 *  dedalo e stato nella partita (null se non è segnata). */
function dto(r: RigaRichiesta, stati: Map<string, StatoRichiesta>): RichiestaDto {
  return {
    chiave: r.chiave, nome: r.nome, committente: r.committente, disponibileDal: r.disponibile_dal, scadenza: r.scadenza, area: r.area, areaChiave: r.area_chiave, piano: r.piano,
    bersaglio: JSON.parse(r.bersaglio_json) as RichiestaDto['bersaglio'], ricompense: JSON.parse(r.ricompense_json) as string[],
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
  const lista = (prepared(`${SQL} ORDER BY (a.ordine IS NULL), a.ordine, (ad.ordine IS NULL), ad.ordine, r.ordine`).all() as RigaRichiesta[]).map((r) => dto(r, stati));
  const dedali: RichiesteDto['dedali'] = [];
  for (const r of lista) {
    if (!r.areaChiave || !r.areaNome || r.areaOrdine === null) continue;
    let d = dedali.find((x) => x.chiave === r.areaChiave);
    if (!d) { d = { chiave: r.areaChiave, nome: r.areaNome, ordine: r.areaOrdine, totale: 0, completate: 0 }; dedali.push(d); }
    d.totale += 1;
    if (r.stato === 'completata') d.completate += 1;
  }
  return { richieste: lista, jose: datiGuida<JoseDto>('jose'), dedali, completate: lista.filter((r) => r.stato === 'completata').length, totale: lista.length };
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
 * quello dell'area (`area_chiave`, e il nome in `area`); va in fondo alle Richieste del dedalo. Dato di gioco, per tutte le partite.
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
    prepared('UPDATE richiesta SET area_dedalo_chiave = ?, area_chiave = ?, area = ?, ordine = ? WHERE chiave = ?').run(areaDedalo, a.dedalo_chiave, a.dedalo_nome, ordine, chiave);
  }
  return dto(prepared(`${SQL} WHERE r.chiave = ?`).get(chiave) as RigaRichiesta, new Map());
}
