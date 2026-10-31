// ============================================================
// disponibilitaStrutturataScritture — cambiare la disponibilità strutturata dei Confidenti e ripristinarla (R9-01)
// ============================================================
//
// La lettura sta in `disponibilitaStrutturataService` (che la scheda e il Diario usano e che non dipende dal catalogo). Qui le scritture:
// la struttura (modo, giorni, fasce, eccezioni, dal, motivo senza luogo) con la fotografia della fonte G-036 alla prima modifica, e i luoghi,
// che si cambiano passando dal luogo (`aggiornaElemento('luogo', …)`): una sola scrittura, con il suo «Ripristina».
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { aggiornaElemento } from './catalogoService.js';
import { CHIAVE_SEED_DISPONIBILITA, disponibilitaConfidente, luoghiDelConfidente, rigaStruttura, type RigaStruttura } from './disponibilitaStrutturataService.js';
import { MODI_DISPONIBILITA } from '../../shared/disponibilitaStrutturata.js';
import type { DisponibilitaConfidenteDto, DisponibilitaStrutturata, EccezioneDisponibilita } from '../../shared/disponibilitaStrutturata.js';
import { dataValida, ordineGioco } from '../../shared/condizioniSpillo.js';
import { richiediRomanzabile } from './relazioneRomanticaService.js';

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

/**
 * Le eccezioni da salvare: una per tipo dove il tipo vale per tutto il Confidente (giorni dopo un rango, giorni del calendario esclusi), una per rango
 * dove vale per un rango (fascia, giorni); i giorni del calendario esistono, senza doppioni e nell'ordine del calendario di gioco. 400 altrimenti.
 */
function normalizzaEccezioni(eccezioni: EccezioneDisponibilita[]): EccezioneDisponibilita[] {
  const viste = new Set<string>();
  return eccezioni.map((e) => {
    const chiave = e.tipo === 'fascia-rango' || e.tipo === 'giorni-rango' ? `${e.tipo}:${e.rango}` : e.tipo;
    if (viste.has(chiave)) throw httpErrors.badRequest('eccezione-doppia', e.tipo === 'fascia-rango' || e.tipo === 'giorni-rango' ? `Il rango ${e.rango} ha già un'eccezione di questo tipo.` : 'Questa eccezione c’è già.');
    viste.add(chiave);
    if (e.tipo !== 'date') return e;
    const sbagliata = e.date.find((d) => !dataValida(d));
    if (sbagliata) throw httpErrors.badRequest('data-non-valida', `«${sbagliata}» non è un giorno del calendario di gioco.`);
    return { ...e, date: [...new Set(e.date)].sort((a, b) => ordineGioco(a) - ordineGioco(b)) };
  });
}

/** Cambia la struttura (e, se indicati, i luoghi). Alla prima modifica conserva la fotografia della fonte G-036 per «Ripristina». */
export function salvaDisponibilita(confidente: string, mod: ModificaDisponibilita): DisponibilitaConfidenteDto {
  const prima = rigaStruttura(confidente);
  if (mod.modo !== undefined && !MODI_DISPONIBILITA.includes(mod.modo)) throw httpErrors.badRequest('modo-non-valido', `Il modo '${mod.modo}' non esiste.`);
  if (mod.dal !== undefined && mod.dal !== null && !/^\d{2}-\d{2}$/.test(mod.dal)) throw httpErrors.badRequest('data-non-valida', 'La data «dal» è nel formato MM-GG.');
  const eccezioni = mod.eccezioni ? normalizzaEccezioni(mod.eccezioni) : undefined;
  // L13 (O10-2): le fasce con la relazione romantica hanno senso solo per un Confidente romanzabile
  if (eccezioni?.some((e) => e.tipo === 'con-relazione')) richiediRomanzabile(confidente);
  const nuova: RigaStruttura = {
    modo: mod.modo ?? prima.modo,
    giorni_settimana_json: mod.giorni ? JSON.stringify(mod.giorni) : prima.giorni_settimana_json,
    fasce_orarie_json: mod.fasce ? JSON.stringify(mod.fasce) : prima.fasce_orarie_json,
    eccezioni_json: eccezioni ? JSON.stringify(eccezioni) : prima.eccezioni_json,
    dal: mod.dal === undefined ? prima.dal : mod.dal,
    motivo_senza_luogo: mod.motivoSenzaLuogo ?? prima.motivo_senza_luogo,
    fonte: prima.fonte,
  };
  const cambiata = JSON.stringify(nuova) !== JSON.stringify(prima);
  getDb().transaction(() => {
    if (cambiata) {
      prepared('INSERT OR IGNORE INTO dati_guida (chiave, json) VALUES (?, ?)').run(CHIAVE_SEED_DISPONIBILITA(confidente), JSON.stringify(prima));
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
        let corrente: string[] = [];
        try { const v = JSON.parse(l.confidenti_json) as unknown; if (Array.isArray(v)) corrente = v.filter((c): c is string => typeof c === 'string'); } catch { /* elenco vuoto o illeggibile: si riparte da vuoto */ }
        const elenco = corrente.filter((c) => c !== confidente);
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
  rigaStruttura(confidente);
  const s = prepared('SELECT json FROM dati_guida WHERE chiave = ?').get(CHIAVE_SEED_DISPONIBILITA(confidente)) as { json: string } | undefined;
  if (!s) throw httpErrors.conflict('disponibilita-della-guida', 'Questa disponibilità non è stata modificata: è già come la dà la guida.');
  let f: RigaStruttura;
  try { f = JSON.parse(s.json) as RigaStruttura; } catch { throw httpErrors.conflict('disponibilita-fotografia-illeggibile', 'La fotografia della guida non è leggibile: la disponibilità resta com’è.'); }
  if (typeof f.modo !== 'string' || typeof f.giorni_settimana_json !== 'string' || typeof f.fasce_orarie_json !== 'string' || typeof f.eccezioni_json !== 'string') {
    throw httpErrors.conflict('disponibilita-fotografia-illeggibile', 'La fotografia della guida non è leggibile: la disponibilità resta com’è.');
  }
  getDb().transaction(() => {
    prepared(`UPDATE confidente_disponibilita SET modo = ?, giorni_settimana_json = ?, fasce_orarie_json = ?, eccezioni_json = ?, dal = ?, motivo_senza_luogo = ? WHERE confidente_chiave = ?`)
      .run(f.modo, f.giorni_settimana_json, f.fasce_orarie_json, f.eccezioni_json, f.dal ?? null, f.motivo_senza_luogo ?? '', confidente);
    prepared('DELETE FROM dati_guida WHERE chiave = ?').run(CHIAVE_SEED_DISPONIBILITA(confidente));
  })();
  invalidaCacheDiGioco();
  return disponibilitaConfidente(confidente);
}
