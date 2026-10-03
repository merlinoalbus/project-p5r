// ============================================================
// meteoService — il meteo di un giorno nella partita: scelto dall'utente per fascia, o quello della guida
// ============================================================
//
// La guida dà il meteo del giorno come testo («Sereno/Pioggia» = sereno di giorno, pioggia di sera) e per 58 giorni
// non lo dà affatto. Nella partita l'utente lo segna per fascia (`meteo_partita`, Partita → Oggi); una fascia non
// segnata prende quello della guida. Chi valuta le condizioni (semafori dei Confidenti, «piove» di spilli e azioni)
// legge `meteoOra`: la fascia **corrente** del giorno corrente (scelta dell'utente, 2026-09-30).
// Le allerte del gioco (date fisse, `allerta_meteo`) le aggiunge l'app per fascia; la pioggia torrenziale conta come pioggia
// quando l'utente non ha segnato altro.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { ALLERTA_PIOGGIA, fasceDellaGuida, type MeteoPartita } from '../../shared/meteoPartita.js';
import type { FasciaGioco, MeteoFasciaDto, MeteoGiornoDto } from '../../shared/types.js';

/** Il testo del meteo della guida per il giorno: il calendario, e il percorso dove il calendario tace. */
export function testoMeteoGuida(data: string): string | null {
  const r = prepared(`SELECT COALESCE(c.meteo, p.meteo) AS meteo FROM (SELECT ? AS data) d
    LEFT JOIN giorno_calendario c ON c.data = d.data LEFT JOIN giorno_percorso p ON p.data = d.data`).get(data) as { meteo: string | null } | undefined;
  return r?.meteo ?? null;
}

function scelto(partitaId: number, data: string): { giorno: MeteoPartita | null; sera: MeteoPartita | null } {
  const r = prepared('SELECT giorno, sera FROM meteo_partita WHERE partita_id = ? AND data = ?').get(partitaId, data) as { giorno: MeteoPartita | null; sera: MeteoPartita | null } | undefined;
  return { giorno: r?.giorno ?? null, sera: r?.sera ?? null };
}

type Allerte = MeteoFasciaDto['allerte'];

/** Le allerte del giorno per fascia (migrazione 091), in ordine di nome. */
function allerte(data: string): { giorno: Allerte; sera: Allerte } {
  const righe = prepared('SELECT fascia, chiave, nome, effetti_json FROM allerta_meteo WHERE data = ? ORDER BY nome').all(data) as Array<{ fascia: FasciaGioco; chiave: string; nome: string; effetti_json: string }>;
  const di = (f: FasciaGioco): Allerte => righe.filter((x) => x.fascia === f).map((r) => ({ chiave: r.chiave, nome: r.nome, effetti: JSON.parse(r.effetti_json) as string[] }));
  return { giorno: di('giorno'), sera: di('sera') };
}

/** Il meteo di una fascia: quello scelto nella partita; se no, la pioggia torrenziale del gioco è pioggia; se no, la guida. */
function fascia(partita: MeteoPartita | null, guida: MeteoPartita | null, allerteFascia: Allerte): MeteoFasciaDto {
  const daGuida = allerteFascia.some((a) => a.chiave === ALLERTA_PIOGGIA) ? 'pioggia' : guida;
  return { meteo: partita ?? daGuida, origine: partita ? 'partita' : daGuida ? 'guida' : null, guida: daGuida, allerte: allerteFascia };
}

/** Il meteo del giorno nella partita, fascia per fascia. */
export function meteoDelGiorno(partitaId: number, data: string): MeteoGiornoDto {
  const testoGuida = testoMeteoGuida(data);
  const guida = fasceDellaGuida(testoGuida);
  const partita = scelto(partitaId, data);
  const a = allerte(data);
  return { dataGioco: data, giorno: fascia(partita.giorno, guida.giorno, a.giorno), sera: fascia(partita.sera, guida.sera, a.sera), testoGuida };
}

/** Il meteo che vale adesso: il giorno e la fascia correnti della partita. */
export function meteoOra(partitaId: number, data: string | null, momento: FasciaGioco | null): { meteo: MeteoPartita; origine: 'partita' | 'guida' } | null {
  if (!data) return null;
  const f = meteoDelGiorno(partitaId, data)[momento === 'sera' ? 'sera' : 'giorno'];
  return f.meteo && f.origine ? { meteo: f.meteo, origine: f.origine } : null;
}

/** Segna il meteo di un giorno: per ogni fascia indicata un meteo, o `null` per tornare a quello della guida. */
export function impostaMeteo(partitaId: number, data: string, mod: { giorno?: MeteoPartita | null; sera?: MeteoPartita | null }): MeteoGiornoDto {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  if (!prepared('SELECT 1 FROM giorno_calendario WHERE data = ?').get(data)) throw httpErrors.notFound('giorno-non-trovato', `Il ${data} non è un giorno del calendario di gioco.`);
  const prima = scelto(partitaId, data);
  const giorno = mod.giorno === undefined ? prima.giorno : mod.giorno;
  const sera = mod.sera === undefined ? prima.sera : mod.sera;
  const adesso = nowIso();
  // il meteo e la data di modifica della partita cambiano insieme
  getDb().transaction(() => {
    if (giorno === null && sera === null) prepared('DELETE FROM meteo_partita WHERE partita_id = ? AND data = ?').run(partitaId, data);
    else prepared(`INSERT INTO meteo_partita (partita_id, data, giorno, sera, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(partita_id, data) DO UPDATE SET giorno = excluded.giorno, sera = excluded.sera, updated_at = excluded.updated_at`).run(partitaId, data, giorno, sera, adesso);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return meteoDelGiorno(partitaId, data);
}
