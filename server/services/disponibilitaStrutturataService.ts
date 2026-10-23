// ============================================================
// disponibilitaStrutturataService — la disponibilità dei Confidenti come dato strutturato (R9-01, migrazione 163, fonte G-036)
// ============================================================
//
// Legge la struttura (modo, giorni, fasce, eccezioni, dal, motivo senza luogo) e i luoghi per chiave (L5: `luogo.confidenti_json`), dice se il
// Confidente è disponibile adesso nella partita, e permette di cambiare la struttura con «Ripristina». Il testo libero della riga
// (`confidente_disponibilita.giorni_json`, `luogo`, note…) resta com'è e si modifica dall'editor informativo (`disponibilitaConfidentiService`).
// I luoghi si cambiano dal luogo stesso (`aggiornaElemento('luogo', …)`): una sola scrittura, con il suo «Ripristina».
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { aggiornaElemento } from './catalogoService.js';
import { meteoOra } from './meteoService.js';
import { MODI_DISPONIBILITA, strutturaDaColonne, valutaDisponibilita } from '../../shared/disponibilitaStrutturata.js';
import type { ContestoDisponibilita, DisponibilitaConfidenteDto, DisponibilitaStrutturata, EsitoDisponibilita, LuogoConfidente } from '../../shared/disponibilitaStrutturata.js';
import { registraCacheDiGioco } from './cacheDiGioco.js';

const CHIAVE_SEED = (confidente: string) => `disponibilita-struttura-seed-v1:${confidente}`;
interface RigaStruttura { modo: string; giorni_settimana_json: string; fasce_orarie_json: string; eccezioni_json: string; dal: string | null; motivo_senza_luogo: string; fonte: string | null }
const COLONNE = 'modo, giorni_settimana_json, fasce_orarie_json, eccezioni_json, dal, motivo_senza_luogo, fonte';

function riga(confidente: string): RigaStruttura {
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
  const struttura = strutturaDaColonne(riga(confidente));
  const dto: DisponibilitaConfidenteDto = { confidente, struttura, luoghi: luoghiDelConfidente(confidente), modificata: !!prepared('SELECT 1 FROM dati_guida WHERE chiave = ?').get(CHIAVE_SEED(confidente)) };
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

export interface ModificaDisponibilita {
  modo?: DisponibilitaStrutturata['modo'];
  giorni?: DisponibilitaStrutturata['giorni'];
  fasce?: DisponibilitaStrutturata['fasce'];
  eccezioni?: DisponibilitaStrutturata['eccezioni'];
  dal?: string | null;
  motivoSenzaLuogo?: string;
  /** Le chiavi dei luoghi del Confidente (L5): quelle in più lo aggiungono al luogo, quelle in meno lo tolgono. */
  luoghi?: string[];
}

/** Cambia la struttura (e, se indicati, i luoghi). Alla prima modifica conserva la fotografia della fonte G-036 per «Ripristina». */
export function salvaDisponibilita(confidente: string, mod: ModificaDisponibilita): DisponibilitaConfidenteDto {
  const prima = riga(confidente);
  if (mod.modo !== undefined && !MODI_DISPONIBILITA.includes(mod.modo)) throw httpErrors.badRequest('modo-non-valido', `Il modo '${mod.modo}' non esiste.`);
  if (mod.dal !== undefined && mod.dal !== null && !/^\d{2}-\d{2}$/.test(mod.dal)) throw httpErrors.badRequest('data-non-valida', 'La data «dal» è nel formato MM-GG.');
  const nuova: RigaStruttura = {
    modo: mod.modo ?? prima.modo,
    giorni_settimana_json: mod.giorni ? JSON.stringify(mod.giorni) : prima.giorni_settimana_json,
    fasce_orarie_json: mod.fasce ? JSON.stringify(mod.fasce) : prima.fasce_orarie_json,
    eccezioni_json: mod.eccezioni ? JSON.stringify(mod.eccezioni) : prima.eccezioni_json,
    dal: mod.dal === undefined ? prima.dal : mod.dal,
    motivo_senza_luogo: mod.motivoSenzaLuogo ?? prima.motivo_senza_luogo,
    fonte: prima.fonte,
  };
  const cambiata = JSON.stringify(nuova) !== JSON.stringify(prima);
  getDb().transaction(() => {
    if (cambiata) {
      prepared('INSERT OR IGNORE INTO dati_guida (chiave, json) VALUES (?, ?)').run(CHIAVE_SEED(confidente), JSON.stringify(prima));
      prepared(`UPDATE confidente_disponibilita SET modo = ?, giorni_settimana_json = ?, fasce_orarie_json = ?, eccezioni_json = ?, dal = ?, motivo_senza_luogo = ? WHERE confidente_chiave = ?`)
        .run(nuova.modo, nuova.giorni_settimana_json, nuova.fasce_orarie_json, nuova.eccezioni_json, nuova.dal, nuova.motivo_senza_luogo, confidente);
    }
    if (mod.luoghi) {
      const attuali = new Set(luoghiDelConfidente(confidente).map((l) => l.chiave));
      const volute = new Set(mod.luoghi);
      for (const k of new Set([...attuali, ...volute])) {
        if (attuali.has(k) === volute.has(k)) continue;
        const l = prepared('SELECT confidenti_json FROM luogo WHERE chiave = ?').get(k) as { confidenti_json: string } | undefined;
        if (!l) throw httpErrors.badRequest('luogo-non-trovato', `Il luogo '${k}' non esiste.`);
        const elenco = (JSON.parse(l.confidenti_json) as string[]).filter((c) => c !== confidente);
        if (volute.has(k)) elenco.push(confidente);
        aggiornaElemento('luogo', k, { confidenti_json: JSON.stringify(elenco) });
      }
    }
  })();
  invalidaCacheDiGioco();
  return disponibilitaConfidente(confidente);
}

/** «Ripristina»: la struttura torna come la dà la fonte G-036 (i luoghi si ripristinano dal luogo, con il suo «Ripristina»). */
export function ripristinaDisponibilita(confidente: string): DisponibilitaConfidenteDto {
  riga(confidente);
  const s = prepared('SELECT json FROM dati_guida WHERE chiave = ?').get(CHIAVE_SEED(confidente)) as { json: string } | undefined;
  if (!s) throw httpErrors.conflict('disponibilita-della-guida', 'Questa disponibilità non è stata modificata: è già come la dà la guida.');
  let f: RigaStruttura;
  try { f = JSON.parse(s.json) as RigaStruttura; } catch { throw httpErrors.conflict('disponibilita-fotografia-illeggibile', 'La fotografia della guida non è leggibile: la disponibilità resta com’è.'); }
  if (typeof f.modo !== 'string' || typeof f.giorni_settimana_json !== 'string' || typeof f.fasce_orarie_json !== 'string' || typeof f.eccezioni_json !== 'string') {
    throw httpErrors.conflict('disponibilita-fotografia-illeggibile', 'La fotografia della guida non è leggibile: la disponibilità resta com’è.');
  }
  getDb().transaction(() => {
    prepared(`UPDATE confidente_disponibilita SET modo = ?, giorni_settimana_json = ?, fasce_orarie_json = ?, eccezioni_json = ?, dal = ?, motivo_senza_luogo = ? WHERE confidente_chiave = ?`)
      .run(f.modo, f.giorni_settimana_json, f.fasce_orarie_json, f.eccezioni_json, f.dal ?? null, f.motivo_senza_luogo ?? '', confidente);
    prepared('DELETE FROM dati_guida WHERE chiave = ?').run(CHIAVE_SEED(confidente));
  })();
  invalidaCacheDiGioco();
  return disponibilitaConfidente(confidente);
}
