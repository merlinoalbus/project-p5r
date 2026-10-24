// ============================================================
// giorniService — l'editor del giorno di gioco (R9-19): meteo nelle due fasce, nota, trama e vincoli, con «Ripristina»
// ============================================================
//
// Il giorno è la riga di `giorno` (R9-15). Modificarlo non cambia la guida originale: alla prima modifica la riga conserva com'era
// (`seed_json`) i campi che l'editor cambia, e «Ripristina» li rimette e toglie la fotografia. Il giorno della settimana non si salva (R9-16).
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import type { GiornoModificabileDto, MeteoGiorno, ModificaGiorno } from '../../shared/giorno.js';

interface RigaGiorno {
  data: string; meteo_giorno: string | null; meteo_sera: string | null; nota_meteo: string | null; meteo_da_verificare: number;
  trama: string; vincoli_json: string; seed_json: string | null;
}
/** I campi che l'editor cambia, come stanno in `giorno`. */
interface Fotografia { meteo_giorno: string | null; meteo_sera: string | null; nota_meteo: string | null; meteo_da_verificare: number; trama: string; vincoli_json: string }

const riga = (data: string): RigaGiorno => {
  const r = prepared('SELECT data, meteo_giorno, meteo_sera, nota_meteo, meteo_da_verificare, trama, vincoli_json, seed_json FROM giorno WHERE data = ?').get(data) as RigaGiorno | undefined;
  if (!r) throw httpErrors.notFound('giorno-non-trovato', `Il ${data} non è un giorno del calendario di gioco.`);
  return r;
};

function dto(r: RigaGiorno): GiornoModificabileDto {
  let vincoli: string[] = [];
  try { const v = JSON.parse(r.vincoli_json) as unknown; if (Array.isArray(v)) vincoli = v.filter((x): x is string => typeof x === 'string'); } catch { /* vincoli illeggibili: nessuno */ }
  return { data: r.data, meteoGiorno: r.meteo_giorno as MeteoGiorno | null, meteoSera: r.meteo_sera as MeteoGiorno | null, notaMeteo: r.nota_meteo,
    meteoDaVerificare: r.meteo_da_verificare === 1, trama: r.trama, vincoli, modificato: r.seed_json !== null };
}

/** Il giorno come lo vede l'editor. */
export function leggiGiorno(data: string): GiornoModificabileDto {
  return dto(riga(data));
}

/** Cambia i campi indicati; alla prima modifica conserva la fotografia della guida. Un campo omesso resta com'è. */
export function aggiornaGiorno(data: string, mod: ModificaGiorno): GiornoModificabileDto {
  const r = riga(data);
  const nuovo: Fotografia = {
    meteo_giorno: mod.meteoGiorno === undefined ? r.meteo_giorno : mod.meteoGiorno,
    meteo_sera: mod.meteoSera === undefined ? r.meteo_sera : mod.meteoSera,
    nota_meteo: mod.notaMeteo === undefined ? r.nota_meteo : (mod.notaMeteo?.trim() || null),
    meteo_da_verificare: mod.meteoDaVerificare === undefined ? r.meteo_da_verificare : mod.meteoDaVerificare ? 1 : 0,
    trama: mod.trama === undefined ? r.trama : mod.trama,
    vincoli_json: mod.vincoli === undefined ? r.vincoli_json : JSON.stringify(mod.vincoli.map((v) => v.trim()).filter((v) => v !== '')),
  };
  const prima: Fotografia = { meteo_giorno: r.meteo_giorno, meteo_sera: r.meteo_sera, nota_meteo: r.nota_meteo, meteo_da_verificare: r.meteo_da_verificare, trama: r.trama, vincoli_json: r.vincoli_json };
  if (JSON.stringify(nuovo) === JSON.stringify(prima)) return dto(r);
  getDb().transaction(() => {
    prepared(`UPDATE giorno SET meteo_giorno = ?, meteo_sera = ?, nota_meteo = ?, meteo_da_verificare = ?, trama = ?, vincoli_json = ?,
      seed_json = COALESCE(seed_json, ?), origine = 'utente', updated_at = ? WHERE data = ?`)
      .run(nuovo.meteo_giorno, nuovo.meteo_sera, nuovo.nota_meteo, nuovo.meteo_da_verificare, nuovo.trama, nuovo.vincoli_json, JSON.stringify(prima), nowIso(), data);
  })();
  invalidaCacheDiGioco();
  return leggiGiorno(data);
}

/** «Ripristina»: il giorno torna com'è nella guida e la fotografia si toglie. 409 se non è stato cambiato. */
export function ripristinaGiorno(data: string): GiornoModificabileDto {
  const r = riga(data);
  if (r.seed_json === null) throw httpErrors.conflict('giorno-della-guida', 'Questo giorno non è stato modificato: è già come lo dà la guida.');
  let f: Fotografia;
  try { f = JSON.parse(r.seed_json) as Fotografia; } catch { throw httpErrors.conflict('giorno-fotografia-illeggibile', 'La fotografia della guida di questo giorno non è leggibile: il giorno resta com’è.'); }
  if (typeof f.trama !== 'string' || typeof f.vincoli_json !== 'string' || (f.meteo_da_verificare !== 0 && f.meteo_da_verificare !== 1)) {
    throw httpErrors.conflict('giorno-fotografia-illeggibile', 'La fotografia della guida di questo giorno non è leggibile: il giorno resta com’è.');
  }
  getDb().transaction(() => {
    prepared(`UPDATE giorno SET meteo_giorno = ?, meteo_sera = ?, nota_meteo = ?, meteo_da_verificare = ?, trama = ?, vincoli_json = ?, seed_json = NULL, origine = 'seed', updated_at = ? WHERE data = ?`)
      .run(f.meteo_giorno ?? null, f.meteo_sera ?? null, f.nota_meteo ?? null, f.meteo_da_verificare, f.trama, f.vincoli_json, nowIso(), data);
  })();
  invalidaCacheDiGioco();
  return leggiGiorno(data);
}
