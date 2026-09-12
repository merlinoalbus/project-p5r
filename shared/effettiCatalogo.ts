// ============================================================
// effettiCatalogo — che cosa fa una lettura o un'attività, come elenco di effetti dichiarati
// ============================================================
//
// Libri, film e attività portavano l'effetto spezzato in colonne di forme diverse: `dote` + `note`,
// `note_successive`, `doti_json[].condizione` con la spiegazione in prosa, `effetto_json` singolo.
// Da qui in poi ogni riga ha `effetti_json`: un elenco di voci, ciascuna con un effetto dichiarato
// (`shared/effettiOggetto.ts`), se vale anche alle visioni successive (`ripetuto`, i film al
// cinema) e le condizioni sotto cui scatta (`condizioni`, per esempio «piove» per lo studio al
// Leblanc). I punti Dote di un conseguimento si calcolano da qui (`dotiDaEffetti`).
// ============================================================

import { FAMIGLIE_EFFETTO, descriviEffetto, type EffettoOggetto, type NomiEffetto } from './effettiOggetto.js';
import { descriviRequisitoSpillo, normalizzaCondizioniSpillo, type NomiCondizioni, type RequisitoSpillo } from './condizioniSpillo.js';

export interface VoceEffetto {
  effetto: EffettoOggetto;
  /** Vale anche ai conseguimenti successivi al primo (le visioni ripetute di un film al cinema). */
  ripetuto?: boolean;
  /** Scatta solo quando queste condizioni sono vere (vuoto = sempre). */
  condizioni?: RequisitoSpillo[];
}

const FAMIGLIE = new Set<string>(FAMIGLIE_EFFETTO.map((f) => f.chiave));

/** Rende un valore qualunque un elenco di voci valide: le voci senza una famiglia nota cadono. */
export function normalizzaVociEffetto(x: unknown): VoceEffetto[] {
  if (!Array.isArray(x)) return [];
  const out: VoceEffetto[] = [];
  for (const v of x) {
    if (!v || typeof v !== 'object') continue;
    const voce = v as Record<string, unknown>;
    const effetto = voce.effetto as Record<string, unknown> | undefined;
    if (!effetto || typeof effetto !== 'object' || typeof effetto.famiglia !== 'string' || !FAMIGLIE.has(effetto.famiglia)) continue;
    if (effetto.famiglia === 'dote' && (typeof effetto.dote !== 'string' || typeof effetto.note !== 'number')) continue;
    const pulita: VoceEffetto = { effetto: effetto as unknown as EffettoOggetto };
    if (effetto.famiglia === 'dote') pulita.effetto = { famiglia: 'dote', dote: String(effetto.dote).toLowerCase(), note: Math.max(1, Math.round(Number(effetto.note))) };
    if (voce.ripetuto === true) pulita.ripetuto = true;
    const condizioni = normalizzaCondizioniSpillo(voce.condizioni);
    if (condizioni.length > 0) pulita.condizioni = condizioni;
    out.push(pulita);
  }
  return out;
}

export function leggiVociEffetto(json: string | null | undefined): VoceEffetto[] {
  if (!json) return [];
  try { return normalizzaVociEffetto(JSON.parse(json)); } catch { return []; }
}

/** I punti Dote che un conseguimento dà: al primo (`successiva: false`) contano le voci non ripetute; ai successivi solo quelle `ripetuto`. */
export function dotiDaEffetti(voci: VoceEffetto[], opz: { successiva?: boolean } = {}): Array<{ dote: string; note: number; condizioni: RequisitoSpillo[] }> {
  return voci
    .filter((v) => v.effetto.famiglia === 'dote' && (opz.successiva ? v.ripetuto === true : v.ripetuto !== true))
    .map((v) => ({ dote: (v.effetto as { dote: string }).dote, note: (v.effetto as { note: number }).note, condizioni: v.condizioni ?? [] }));
}

/** La frase di una voce: l'effetto, poi «anche alle visioni successive» e le condizioni. */
export function descriviVoceEffetto(v: VoceEffetto, nomi: NomiEffetto & { condizioni?: NomiCondizioni } = {}): string {
  let testo = descriviEffetto(v.effetto, nomi);
  if (v.ripetuto) testo += ', anche alle volte successive';
  if (v.condizioni?.length) testo += ` (${v.condizioni.map((c) => descriviRequisitoSpillo(c, nomi.condizioni ?? {})).join('; ')})`;
  return testo;
}
