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
import { verificaPartita } from './verificaPartita.js';
import { richiedeNonPioggia, strutturaDaColonne, valutaDisponibilita } from '../../shared/disponibilitaStrutturata.js';
import type { ContestoDisponibilita, DisponibilitaConfidenteDto, DisponibilitaStrutturata, EsitoDisponibilita, LuogoConfidente } from '../../shared/disponibilitaStrutturata.js';
import { normalizzaRequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { giorniDiGiocoFra } from '../../shared/date.js';
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

/**
 * Il giorno (MM-GG) dell'ultimo incontro che ha portato il Confidente al rango dato, dal registro della partita (`utente.incontro_confidente_partita`,
 * sola lettura), o null se non è registrato (rango segnato senza incontro, partita di prima del registro).
 */
export function giornoDellUltimoRango(partitaId: number, confidente: string, rango: number): string | null {
  if (rango < 1) return null;
  const r = prepared("SELECT data FROM incontro_confidente_partita WHERE partita_id = ? AND confidente_chiave = ? AND passaggio = 1 AND verso_rango = ? AND data <> '' ORDER BY id DESC LIMIT 1")
    .get(partitaId, confidente, rango) as { data: string } | undefined;
  return r?.data ?? null;
}

/** I giorni di gioco dal giorno dell'ultimo rango a `oggi`; null se uno dei due manca o se l'ultimo rango risulta dopo oggi (data della partita spostata indietro). */
export function giorniDalGiorno(giornoRango: string | null, oggi: string | null): number | null {
  const n = giorniDiGiocoFra(giornoRango, oggi);
  return n === null || n < 0 ? null : n;
}

/** Il momento della partita per il valutatore: data, fascia, meteo, rango, giorni dall'ultimo rango (dal registro degli incontri). */
function contestoDellaPartita(partitaId: number, confidente: string): ContestoDisponibilita {
  verificaPartita(partitaId); // solo le partite del proprietario della richiesta
  const p = prepared('SELECT data_gioco, fascia_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null; fascia_gioco: string } | undefined;
  if (!p) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const fascia = p.fascia_gioco === 'sera' ? 'sera' : 'giorno';
  const meteo = p.data_gioco ? meteoOra(partitaId, p.data_gioco, fascia) : null;
  const rango = (prepared('SELECT rango FROM confidente_partita WHERE partita_id = ? AND confidente_chiave = ?').get(partitaId, confidente) as { rango: number } | undefined)?.rango ?? 0;
  const festivo = p.data_gioco ? eGiornoFestivo(p.data_gioco) : false;
  return {
    data: p.data_gioco, fascia: p.data_gioco ? fascia : null, festivo, piove: meteo ? meteo.meteo === 'pioggia' : null, rango,
    giorniDallUltimoRango: giorniDalGiorno(giornoDellUltimoRango(partitaId, confidente, rango), p.data_gioco),
    nonConLaPioggia: nonConLaPioggia(confidente, rango),
  };
}

/** La disponibilità del Confidente; con la partita, anche se è disponibile adesso. */
export function disponibilitaConfidente(confidente: string, partitaId?: number): DisponibilitaConfidenteDto {
  const struttura = strutturaDaColonne(rigaStruttura(confidente));
  const dto: DisponibilitaConfidenteDto = {
    confidente, struttura, luoghi: luoghiDelConfidente(confidente), modificata: !!prepared('SELECT 1 FROM dati_guida WHERE chiave = ?').get(CHIAVE_SEED_DISPONIBILITA(confidente)),
    ranghiNonConLaPioggia: [...(ranghiSenzaPioggia().get(confidente) ?? [])].sort((a, b) => a - b),
  };
  // «oggi» sulla struttura effettiva (con il «dal» del requisito di rango 1 dove la struttura non ne ha uno), la stessa del Diario e dei semafori
  if (partitaId !== undefined) dto.oggi = verdettoDelConfidente(confidente, contestoDellaPartita(partitaId, confidente)) ?? valutaDisponibilita(struttura, contestoDellaPartita(partitaId, confidente));
  return dto;
}

/** Le strutture di tutti i Confidenti, lette una volta (sono 23 righe) e svuotate quando il DB di gioco cambia. */
let strutture: Map<string, DisponibilitaStrutturata> | null = null;
registraCacheDiGioco(() => { strutture = null; });
function tutteLeStrutture(): Map<string, DisponibilitaStrutturata> {
  if (!strutture) {
    // R9-04/4: il «dal» di un Confidente senza una data propria nella struttura è la data del suo requisito di rango 1 (tipo «data»): prima di quel giorno non c'è
    const dalRequisito = new Map((prepared("SELECT confidente_chiave, dati_json FROM confidente_requisito WHERE rango = 1 AND tipo = 'data' ORDER BY indice").all() as Array<{ confidente_chiave: string; dati_json: string }>)
      .flatMap((r) => { try { const d = (JSON.parse(r.dati_json) as { dal?: unknown }).dal; return typeof d === 'string' && /^\d{2}-\d{2}$/.test(d) ? [[r.confidente_chiave, d] as const] : []; } catch { return []; } }));
    strutture = new Map((prepared(`SELECT confidente_chiave AS chiave, ${COLONNE} FROM confidente_disponibilita`).all() as Array<RigaStruttura & { chiave: string }>)
      .map((r) => { const s = strutturaDaColonne(r); return [r.chiave, s.dal === null ? { ...s, dal: dalRequisito.get(r.chiave) ?? null } : s] as const; }));
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

/**
 * L13 (ondata 6, migrazione 306): i ranghi di ogni Confidente il cui incontro non si fa con la pioggia, dalla sola fonte della pioggia, i requisiti
 * di rango (`meteo non-piove`, anche in un gruppo «tutte»). Letti una volta e svuotati quando il DB di gioco cambia (anche le scritture dei
 * requisiti lo dicono, `requisitiConfidentiService`).
 */
let senzaPioggia: Map<string, Set<number>> | null = null;
registraCacheDiGioco(() => { senzaPioggia = null; });
function ranghiSenzaPioggia(): Map<string, Set<number>> {
  if (!senzaPioggia) {
    const m = new Map<string, Set<number>>();
    for (const r of prepared('SELECT confidente_chiave, rango, tipo, dati_json FROM confidente_requisito').all() as Array<{ confidente_chiave: string; rango: number; tipo: string; dati_json: string }>) {
      let dati: unknown;
      try { dati = JSON.parse(r.dati_json); } catch { continue; }
      const c = dati && typeof dati === 'object' ? normalizzaRequisitoSpillo({ ...(dati as Record<string, unknown>), tipo: r.tipo }) : null;
      if (!c || !richiedeNonPioggia(c)) continue;
      const l = m.get(r.confidente_chiave) ?? new Set<number>();
      l.add(Number(r.rango));
      m.set(r.confidente_chiave, l);
    }
    senzaPioggia = m;
  }
  return senzaPioggia;
}

/** Vero se l'incontro del rango successivo a `rango` (0 = il primo) non si fa con la pioggia, secondo i requisiti di rango. */
export function nonConLaPioggia(confidente: string, rango: number | null | undefined): boolean {
  return ranghiSenzaPioggia().get(confidente)?.has((rango ?? 0) + 1) ?? false;
}

/** Il verdetto per un Confidente in un momento dato, per chi non ha bisogno del resto (il Diario); null se il Confidente non ha una riga.
 *  Se il contesto non dice se l'incontro si fa con la pioggia, lo si legge qui dai requisiti del rango successivo: ogni chiamante usa la stessa fonte. */
export function verdettoDelConfidente(confidente: string, contesto: ContestoDisponibilita): EsitoDisponibilita | null {
  const s = tutteLeStrutture().get(confidente);
  if (!s) return null;
  return valutaDisponibilita(s, contesto.nonConLaPioggia === undefined ? { ...contesto, nonConLaPioggia: nonConLaPioggia(confidente, contesto.rango) } : contesto);
}

