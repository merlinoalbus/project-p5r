// ============================================================
// calendarioService — calendario di gioco: giorni, meteo, eventi, scadenze prossime e consigli per settimana (Fase 6.3)
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { indiceGiornoScolastico } from './domandeService.js';
import type { CalendarioDto, GiornoCalendarioDto, SettimanaGuidaDto } from '../../shared/types.js';

interface RigaGiorno { data: string; ordine: number; giorno_settimana: string; meteo: string | null; tempo_libero_json: string | null; settimana: number | null }
interface RigaEvento { id: number; data: string; tipo: GiornoCalendarioDto['eventi'][number]['tipo']; titolo: string; dettaglio: string; fonte: string }

const GIORNI: Record<string, string> = { Lunedi: 'Lunedì', Martedi: 'Martedì', Mercoledi: 'Mercoledì', Giovedi: 'Giovedì', Venerdi: 'Venerdì', Sabato: 'Sabato', Domenica: 'Domenica' };

function giornoDto(g: RigaGiorno, eventi: RigaEvento[]): GiornoCalendarioDto {
  return {
    data: g.data, giornoSettimana: GIORNI[g.giorno_settimana] ?? g.giorno_settimana, meteo: g.meteo, settimana: g.settimana,
    tempoLibero: g.tempo_libero_json ? (JSON.parse(g.tempo_libero_json) as { giorno: boolean; sera: boolean }) : null,
    eventi: eventi.map((e) => ({ id: e.id, tipo: e.tipo, titolo: e.titolo, dettaglio: e.dettaglio, fonte: e.fonte })),
  };
}

export function settimaneGuida(): SettimanaGuidaDto[] {
  return prepared('SELECT numero, titolo, periodo, url, riassunto, incertezze FROM settimana_guida ORDER BY numero').all() as SettimanaGuidaDto[];
}

/** Calendario completo (o di un mese «MM») con, se c'è la partita, il giorno corrente e le prossime scadenze. */
export function calendario(partitaId?: number, mese?: string): CalendarioDto {
  let dataGioco: string | null = null;
  if (partitaId !== undefined) {
    const p = prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null } | undefined;
    if (!p) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
    dataGioco = p.data_gioco;
  }
  const giorni = (mese
    ? prepared("SELECT * FROM giorno_calendario WHERE substr(data, 1, 2) = ? ORDER BY ordine").all(mese)
    : prepared('SELECT * FROM giorno_calendario ORDER BY ordine').all()) as RigaGiorno[];
  const eventiTutti = prepared('SELECT * FROM evento_calendario ORDER BY data, ordine').all() as RigaEvento[];
  const perData = new Map<string, RigaEvento[]>();
  for (const e of eventiTutti) {
    if (!perData.has(e.data)) perData.set(e.data, []);
    perData.get(e.data)!.push(e);
  }
  const oggiIdx = dataGioco ? indiceGiornoScolastico(dataGioco) : null;
  const oggiRiga = dataGioco ? (prepared('SELECT * FROM giorno_calendario WHERE data = ?').get(dataGioco) as RigaGiorno | undefined) : undefined;
  // Giorni reali fra due date: differenza di `ordine` (i giorni del seed sono consecutivi), non l'indice di ordinamento mese×31+giorno.
  const ordineDi = new Map((prepared('SELECT data, ordine FROM giorno_calendario').all() as Array<{ data: string; ordine: number }>).map((r) => [r.data, r.ordine]));
  const oggiOrdine = dataGioco ? ordineDi.get(dataGioco) ?? null : null;
  const scadenze = oggiIdx === null || oggiOrdine === null ? [] : eventiTutti
    .filter((e) => (e.tipo === 'scadenza' || e.tipo === 'esame') && indiceGiornoScolastico(e.data) >= oggiIdx)
    .sort((x, y) => indiceGiornoScolastico(x.data) - indiceGiornoScolastico(y.data)) // l'ordine per stringa metterebbe gennaio prima di maggio
    .slice(0, 6)
    .map((e) => ({ data: e.data, tipo: e.tipo, titolo: e.titolo, dettaglio: e.dettaglio, giorniMancanti: (ordineDi.get(e.data) ?? oggiOrdine) - oggiOrdine }));
  return {
    giorni: giorni.map((g) => giornoDto(g, perData.get(g.data) ?? [])),
    settimane: settimaneGuida(),
    dataGioco,
    oggi: oggiRiga ? giornoDto(oggiRiga, perData.get(oggiRiga.data) ?? []) : null,
    prossimeScadenze: scadenze,
    mesi: (prepared('SELECT DISTINCT substr(data, 1, 2) AS m FROM giorno_calendario ORDER BY ordine').all() as Array<{ m: string }>).map((r) => r.m),
  };
}
