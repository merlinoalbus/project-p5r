// ============================================================
// effettiCatalogo — che cosa fa una lettura o un'attività, come elenco di effetti dichiarati
// ============================================================
//
// Libri, film e attività portavano l'effetto spezzato in colonne di forme diverse: `dote` + `note`,
// `note_successive`, `doti_json[].condizione` con la spiegazione in prosa, `effetto_json` singolo.
// Da qui in poi ogni riga ha `effetti_json`: un elenco di voci, ciascuna con un effetto dichiarato
// (`shared/effettiOggetto.ts`), se vale dalla seconda volta in poi e non alla prima (`ripetuto`, i
// film al cinema e i turni) e le condizioni sotto cui scatta (`condizioni`, per esempio «piove» per lo studio al
// Leblanc). I punti Dote di un conseguimento si calcolano da qui (`dotiDaEffetti`).
// ============================================================

import { descriviEffetto, normalizzaEffettoOggetto, type EffettoOggetto, type NomiEffetto } from './effettiOggetto.js';
import { descriviRequisitoSpillo, normalizzaCondizioniSpillo, type NomiCondizioni, type RequisitoSpillo } from './condizioniSpillo.js';

export interface VoceEffetto {
  effetto: EffettoOggetto;
  /** Vale dal secondo conseguimento in poi, e non al primo (le visioni ripetute di un film al cinema, i turni dopo il primo);
   *  una voce senza vale solo al primo (`dotiDaEffetti`). */
  ripetuto?: boolean;
  /** Scatta solo quando queste condizioni sono vere (vuoto = sempre). */
  condizioni?: RequisitoSpillo[];
}

/** Rende un valore qualunque un elenco di voci valide: le voci il cui effetto non è valido per la sua famiglia cadono
 *  (`normalizzaEffettoOggetto`: prima si guardava solo la famiglia, e un regalo senza `graditoA` faceva cadere le descrizioni). */
export function normalizzaVociEffetto(x: unknown): VoceEffetto[] {
  if (!Array.isArray(x)) return [];
  const out: VoceEffetto[] = [];
  for (const v of x) {
    if (!v || typeof v !== 'object') continue;
    const voce = v as Record<string, unknown>;
    const effetto = normalizzaEffettoOggetto(voce.effetto);
    if (!effetto) continue;
    // la Dote si scrive in minuscolo e vale almeno una nota intera
    const pulita: VoceEffetto = { effetto: effetto.famiglia === 'dote' ? { famiglia: 'dote', dote: effetto.dote.toLowerCase(), note: Math.max(1, Math.round(effetto.note)) } : effetto };
    if (voce.ripetuto === true) pulita.ripetuto = true;
    const condizioni = normalizzaCondizioniSpillo(voce.condizioni);
    if (condizioni.length > 0) pulita.condizioni = condizioni;
    out.push(pulita);
  }
  return out;
}

/** Le voci d'effetto da una colonna `effetti_json`, normalizzate; vuote se la colonna è vuota o il JSON non si legge. */
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

/** La frase di una voce: l'effetto, poi «dalla seconda volta in poi» se è `ripetuto`, e le condizioni. */
export function descriviVoceEffetto(v: VoceEffetto, nomi: NomiEffetto & { condizioni?: NomiCondizioni } = {}): string {
  let testo = descriviEffetto(v.effetto, nomi);
  // `dotiDaEffetti`: una voce «ripetuto» vale dalla seconda volta in poi, una senza solo alla prima
  if (v.ripetuto) testo += ', dalla seconda volta in poi';
  if (v.condizioni?.length) testo += ` (${v.condizioni.map((c) => descriviRequisitoSpillo(c, nomi.condizioni ?? {})).join('; ')})`;
  return testo;
}
