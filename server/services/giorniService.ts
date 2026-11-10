// ============================================================
// giorniService — l'editor del giorno di gioco (R9-19): meteo nelle due fasce, nota, trama, vincoli e avvisi
// ============================================================
//
// Il giorno è la riga di `giorno` (R9-15): modificarla la segna «utente» (`origine`), e non c'è un ritorno al giorno della guida
// (decisione dell'utente del 10/11: la fotografia `seed_json` è tolta dalla migrazione 388). Il giorno della settimana non si salva (R9-16).
// L8-02: anche gli avvisi del giorno (`avvisi_json`) si modificano da qui, l'unico punto di modifica (la scheda del giorno li legge da
// `percorsoService`).
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import type { GiornoModificabileDto, MeteoGiorno, ModificaGiorno } from '../../shared/giorno.js';
import { dataConArticolo } from '../../shared/condizioniSpillo.js';

const maiuscola = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

interface RigaGiorno {
  data: string; meteo_giorno: string | null; meteo_sera: string | null; nota_meteo: string | null; meteo_da_verificare: number;
  trama: string; vincoli_json: string; avvisi_json: string;
}
/** I campi che l'editor cambia, come stanno in `giorno`. */
interface CampiGiorno { meteo_giorno: string | null; meteo_sera: string | null; nota_meteo: string | null; meteo_da_verificare: number; trama: string; vincoli_json: string; avvisi_json: string }

const riga = (data: string): RigaGiorno => {
  const r = prepared('SELECT data, meteo_giorno, meteo_sera, nota_meteo, meteo_da_verificare, trama, vincoli_json, avvisi_json FROM giorno WHERE data = ?').get(data) as RigaGiorno | undefined;
  if (!r) throw httpErrors.notFound('giorno-non-trovato', `${maiuscola(dataConArticolo(data))} non è un giorno del calendario di gioco.`);
  return r;
};

/** Un elenco di testi salvato come JSON; illeggibile o non un elenco: nessuno. */
function elencoTesti(json: string): string[] {
  try { const v = JSON.parse(json) as unknown; return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; } catch { return []; }
}
/** Un elenco del modulo come lo si salva: righe ripulite, le vuote tolte. */
const elencoDaSalvare = (righe: readonly string[]): string => JSON.stringify(righe.map((v) => v.trim()).filter((v) => v !== ''));

function dto(r: RigaGiorno): GiornoModificabileDto {
  return { data: r.data, meteoGiorno: r.meteo_giorno as MeteoGiorno | null, meteoSera: r.meteo_sera as MeteoGiorno | null, notaMeteo: r.nota_meteo,
    meteoDaVerificare: r.meteo_da_verificare === 1, trama: r.trama, vincoli: elencoTesti(r.vincoli_json), avvisi: elencoTesti(r.avvisi_json) };
}

/** Il giorno come lo vede l'editor. */
export function leggiGiorno(data: string): GiornoModificabileDto {
  return dto(riga(data));
}

/** Cambia i campi indicati. Un campo omesso resta com'è. */
export function aggiornaGiorno(data: string, mod: ModificaGiorno): GiornoModificabileDto {
  const r = riga(data);
  const nuovo: CampiGiorno = {
    meteo_giorno: mod.meteoGiorno === undefined ? r.meteo_giorno : mod.meteoGiorno,
    meteo_sera: mod.meteoSera === undefined ? r.meteo_sera : mod.meteoSera,
    nota_meteo: mod.notaMeteo === undefined ? r.nota_meteo : (mod.notaMeteo?.trim() || null),
    meteo_da_verificare: mod.meteoDaVerificare === undefined ? r.meteo_da_verificare : mod.meteoDaVerificare ? 1 : 0,
    trama: mod.trama === undefined ? r.trama : mod.trama,
    vincoli_json: mod.vincoli === undefined ? r.vincoli_json : elencoDaSalvare(mod.vincoli),
    avvisi_json: mod.avvisi === undefined ? r.avvisi_json : elencoDaSalvare(mod.avvisi),
  };
  const prima: CampiGiorno = { meteo_giorno: r.meteo_giorno, meteo_sera: r.meteo_sera, nota_meteo: r.nota_meteo, meteo_da_verificare: r.meteo_da_verificare, trama: r.trama, vincoli_json: r.vincoli_json, avvisi_json: r.avvisi_json };
  if (JSON.stringify(nuovo) === JSON.stringify(prima)) return dto(r);
  getDb().transaction(() => {
    prepared(`UPDATE giorno SET meteo_giorno = ?, meteo_sera = ?, nota_meteo = ?, meteo_da_verificare = ?, trama = ?, vincoli_json = ?, avvisi_json = ?,
      origine = 'utente', updated_at = ? WHERE data = ?`)
      .run(nuovo.meteo_giorno, nuovo.meteo_sera, nuovo.nota_meteo, nuovo.meteo_da_verificare, nuovo.trama, nuovo.vincoli_json, nuovo.avvisi_json, nowIso(), data);
  })();
  invalidaCacheDiGioco();
  return leggiGiorno(data);
}
