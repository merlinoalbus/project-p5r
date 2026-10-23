// ============================================================
// disponibilitaStrutturataService — la disponibilità dei Confidenti come dato strutturato (R9-01, migrazione 163, fonte G-036)
// ============================================================
//
// Legge la struttura (modo, giorni, fasce, eccezioni, dal, motivo senza luogo) e i luoghi per chiave (L5: `luogo.confidenti_json`), dice se il
// Confidente è disponibile adesso nella partita. Il testo libero della riga (`confidente_disponibilita.giorni_json`, `luogo`, note…) resta
// com'è e si modifica dall'editor informativo (`disponibilitaConfidentiService`). Le scritture sono in `disponibilitaStrutturataScritture`: questo
// modulo non dipende dal catalogo, così la scheda del Confidente e il Diario lo importano senza ciclo.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { meteoOra } from './meteoService.js';
import { strutturaDaColonne, valutaDisponibilita } from '../../shared/disponibilitaStrutturata.js';
import type { ContestoDisponibilita, DisponibilitaConfidenteDto, DisponibilitaStrutturata, EsitoDisponibilita, LuogoConfidente } from '../../shared/disponibilitaStrutturata.js';
import { registraCacheDiGioco } from './cacheDiGioco.js';

export const CHIAVE_SEED_DISPONIBILITA = (confidente: string) => `disponibilita-struttura-seed-v1:${confidente}`;
export interface RigaStruttura { modo: string; giorni_settimana_json: string; fasce_orarie_json: string; eccezioni_json: string; dal: string | null; motivo_senza_luogo: string; fonte: string | null }
const COLONNE = 'modo, giorni_settimana_json, fasce_orarie_json, eccezioni_json, dal, motivo_senza_luogo, fonte';

export function rigaStruttura(confidente: string): RigaStruttura {
  if (!prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(confidente)) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${confidente}' non esiste.`);
  const r = prepared(`SELECT ${COLONNE} FROM confidente_disponibilita WHERE confidente_chiave = ?`).get(confidente) as RigaStruttura | undefined;
  if (!r) throw httpErrors.notFound('disponibilita-non-trovata', `Il Confidente '${confidente}' non ha una riga di disponibilità.`);
  return r;
}

/** I luoghi del Confidente per chiave (non nascosti), col nome di adesso, in ordine di quartiere e luogo. */
export function luoghiDelConfidente(confidente: string): LuogoConfidente[] {
  const luoghi = prepared("SELECT chiave, nome, confidenti_json FROM luogo WHERE nascosto = 0 AND confidenti_json NOT IN ('[]', '') ORDER BY quartiere_chiave, ordine").all() as Array<{ chiave: string; nome: string; confidenti_json: string }>;
  return luoghi.filter((l) => { try { return (JSON.parse(l.confidenti_json) as unknown[]).includes(confidente); } catch { return false; } }).map((l) => ({ chiave: l.chiave, nome: l.nome }));
}

/** Il momento della partita per il valutatore: data, fascia, meteo, rango; il giorno dell'ultimo rango non è registrato nella partita (null). */
function contestoDellaPartita(partitaId: number, confidente: string): ContestoDisponibilita {
  const p = prepared('SELECT data_gioco, fascia_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null; fascia_gioco: string } | undefined;
  if (!p) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const fascia = p.fascia_gioco === 'sera' ? 'sera' : 'giorno';
  const meteo = p.data_gioco ? meteoOra(partitaId, p.data_gioco, fascia) : null;
  const rango = (prepared('SELECT rango FROM confidente_partita WHERE partita_id = ? AND confidente_chiave = ?').get(partitaId, confidente) as { rango: number } | undefined)?.rango ?? 0;
  const festivo = p.data_gioco ? eGiornoFestivo(p.data_gioco) : false;
  return { data: p.data_gioco, fascia: p.data_gioco ? fascia : null, festivo, piove: meteo ? meteo.meteo === 'pioggia' : null, rango, giorniDallUltimoRango: null };
}

/** La disponibilità del Confidente; con la partita, anche se è disponibile adesso. */
export function disponibilitaConfidente(confidente: string, partitaId?: number): DisponibilitaConfidenteDto {
  const struttura = strutturaDaColonne(rigaStruttura(confidente));
  const dto: DisponibilitaConfidenteDto = { confidente, struttura, luoghi: luoghiDelConfidente(confidente), modificata: !!prepared('SELECT 1 FROM dati_guida WHERE chiave = ?').get(CHIAVE_SEED_DISPONIBILITA(confidente)) };
  if (partitaId !== undefined) dto.oggi = valutaDisponibilita(struttura, contestoDellaPartita(partitaId, confidente));
  return dto;
}

/** Le strutture di tutti i Confidenti, lette una volta (sono 23 righe) e svuotate quando il DB di gioco cambia. */
let strutture: Map<string, DisponibilitaStrutturata> | null = null;
registraCacheDiGioco(() => { strutture = null; });
function tutteLeStrutture(): Map<string, DisponibilitaStrutturata> {
  if (!strutture) {
    strutture = new Map((prepared(`SELECT confidente_chiave AS chiave, ${COLONNE} FROM confidente_disponibilita`).all() as Array<RigaStruttura & { chiave: string }>)
      .map((r) => [r.chiave, strutturaDaColonne(r)]));
  }
  return strutture;
}

/** I giorni di festa o di vacanza del calendario di gioco («festivi» nelle disponibilità), letti una volta. */
let festivi: Set<string> | null = null;
registraCacheDiGioco(() => { festivi = null; });
export function eGiornoFestivo(data: string): boolean {
  if (!festivi) festivi = new Set((prepared("SELECT DISTINCT data FROM evento_calendario WHERE tipo IN ('festa', 'vacanza')").all() as Array<{ data: string }>).map((r) => r.data));
  return festivi.has(data);
}

/** Il verdetto per un Confidente in un momento dato, per chi non ha bisogno del resto (il Diario); null se il Confidente non ha una riga. */
export function verdettoDelConfidente(confidente: string, contesto: ContestoDisponibilita): EsitoDisponibilita | null {
  const s = tutteLeStrutture().get(confidente);
  return s ? valutaDisponibilita(s, contesto) : null;
}

