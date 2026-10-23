// ============================================================
// calendarioService — calendario di gioco: giorni, meteo, eventi, scadenze prossime e consigli per settimana (Fase 6.3)
// ============================================================

import { prepared } from '../db/dbService.js';
import { partitaNonTrovata } from './verificaPartita.js';
import { indiceGiornoScolastico } from './domandeService.js';
import { allerteDiOgniGiorno, testoMeteo } from './meteoService.js';
import type { CalendarioDto, GiornoCalendarioDto, SettimanaGuidaDto } from '../../shared/types.js';
import { giornoDellaSettimana } from '../../shared/date.js';

interface RigaGiorno { data: string; ordine: number; meteo_giorno: string | null; meteo_sera: string | null; nota_meteo: string | null; tempo_libero_json: string | null; settimana: number | null }
interface RigaEvento { id: number; data: string; tipo: GiornoCalendarioDto['eventi'][number]['tipo']; titolo: string; dettaglio: string; fonte: string }
type VoceCollegata = GiornoCalendarioDto['eventi'][number]['voci'][number];

/** Le voci del Diario collegate a ciascun evento (tabella `evento_calendario_voce`, L9 R9-20): sola lettura, in ordine di giorno, fascia e posizione. */
function vociDegliEventi(): Map<number, VoceCollegata[]> {
  const righe = prepared(`SELECT l.evento_id, v.uid, v.data AS giorno, v.fascia, v.azione, l.certezza
    FROM evento_calendario_voce l JOIN voce_giornata v ON v.uid = l.voce_uid
    ORDER BY l.evento_id, v.data, v.fascia, v.ordine`).all() as Array<{ evento_id: number; uid: string; giorno: string; fascia: 'giorno' | 'sera'; azione: string; certezza: 'C' | 'D' }>;
  const perEvento = new Map<number, VoceCollegata[]>();
  for (const r of righe) {
    if (!perEvento.has(r.evento_id)) perEvento.set(r.evento_id, []);
    perEvento.get(r.evento_id)!.push({ uid: r.uid, giorno: r.giorno, fascia: r.fascia, azione: r.azione, certezza: r.certezza });
  }
  return perEvento;
}

/** Gli eventi del calendario che puntano a una voce del Diario (sola lettura). */
export function eventiDellaVoce(uid: string): Array<{ id: number; data: string; tipo: string; titolo: string; certezza: 'C' | 'D' }> {
  return prepared(`SELECT e.id, e.data, e.tipo, e.titolo, l.certezza FROM evento_calendario_voce l JOIN evento_calendario e ON e.id = l.evento_id
    WHERE l.voce_uid = ? ORDER BY e.data, e.ordine`).all(uid) as Array<{ id: number; data: string; tipo: string; titolo: string; certezza: 'C' | 'D' }>;
}

/** Un giorno del calendario come DTO: il giorno della settimana calcolato dalla data (R9-16), tempo libero dal JSON, gli eventi già raccolti per quella data e le sue allerte del gioco (2026-10-12). */
function giornoDto(g: RigaGiorno, eventi: RigaEvento[], allerte: GiornoCalendarioDto['allerte'], voci: Map<number, VoceCollegata[]>): GiornoCalendarioDto {
  return {
    data: g.data, giornoSettimana: giornoDellaSettimana(g.data) ?? '', meteo: testoMeteo(g), settimana: g.settimana,
    tempoLibero: g.tempo_libero_json ? (JSON.parse(g.tempo_libero_json) as { giorno: boolean; sera: boolean }) : null,
    eventi: eventi.map((e) => ({ id: e.id, tipo: e.tipo, titolo: e.titolo, dettaglio: e.dettaglio, fonte: e.fonte, voci: voci.get(e.id) ?? [] })),
    allerte,
  };
}

/** I riassunti delle settimane della guida, in ordine di numero. */
function settimaneGuida():SettimanaGuidaDto[] {
  return prepared('SELECT numero, titolo, periodo, url, riassunto, incertezze FROM settimana_guida ORDER BY numero').all() as SettimanaGuidaDto[];
}

/** Calendario completo (o di un mese «MM») con, se c'è la partita, il giorno corrente e le prossime scadenze. */
export function calendario(partitaId?: number, mese?: string): CalendarioDto {
  let dataGioco: string | null = null;
  if (partitaId !== undefined) {
    const p = prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null } | undefined;
    if (!p) throw partitaNonTrovata(partitaId);
    dataGioco = p.data_gioco;
  }
  const giorni = (mese
    ? prepared("SELECT * FROM giorno WHERE substr(data, 1, 2) = ? ORDER BY ordine").all(mese)
    : prepared('SELECT * FROM giorno ORDER BY ordine').all()) as RigaGiorno[];
  const eventiTutti = prepared('SELECT * FROM evento_calendario ORDER BY data, ordine').all() as RigaEvento[];
  const perData = new Map<string, RigaEvento[]>();
  for (const e of eventiTutti) {
    if (!perData.has(e.data)) perData.set(e.data, []);
    perData.get(e.data)!.push(e);
  }
  const allerte = allerteDiOgniGiorno();
  const voci = vociDegliEventi();
  const oggiIdx = dataGioco ? indiceGiornoScolastico(dataGioco) : null;
  const oggiRiga = dataGioco ? (prepared('SELECT * FROM giorno WHERE data = ?').get(dataGioco) as RigaGiorno | undefined) : undefined;
  // Giorni reali fra due date: differenza di `ordine` (i giorni del seed sono consecutivi), non l'indice di ordinamento mese×31+giorno.
  const ordineDi = new Map((prepared('SELECT data, ordine FROM giorno').all() as Array<{ data: string; ordine: number }>).map((r) => [r.data, r.ordine]));
  const oggiOrdine = dataGioco ? ordineDi.get(dataGioco) ?? null : null;
  const scadenze = oggiIdx === null || oggiOrdine === null ? [] : eventiTutti
    .filter((e) => (e.tipo === 'scadenza' || e.tipo === 'esame') && indiceGiornoScolastico(e.data) >= oggiIdx)
    .sort((x, y) => indiceGiornoScolastico(x.data) - indiceGiornoScolastico(y.data)) // l'ordine per stringa metterebbe gennaio prima di maggio
    .slice(0, 6)
    .map((e) => ({ data: e.data, tipo: e.tipo, titolo: e.titolo, dettaglio: e.dettaglio, giorniMancanti: (ordineDi.get(e.data) ?? oggiOrdine) - oggiOrdine }));
  return {
    giorni: giorni.map((g) => giornoDto(g, perData.get(g.data) ?? [], allerte.get(g.data) ?? [], voci)),
    settimane: settimaneGuida(),
    dataGioco,
    oggi: oggiRiga ? giornoDto(oggiRiga, perData.get(oggiRiga.data) ?? [], allerte.get(oggiRiga.data) ?? [], voci) : null,
    prossimeScadenze: scadenze,
    mesi: (prepared('SELECT DISTINCT substr(data, 1, 2) AS m FROM giorno ORDER BY ordine').all() as Array<{ m: string }>).map((r) => r.m),
  };
}
