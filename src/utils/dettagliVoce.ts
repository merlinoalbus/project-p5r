// ============================================================
// dettagliVoce — i dettagli di una voce della guida fra il DTO e le righe dell'editor (2026-10-18)
// ============================================================
//
// **Una riga non toccata torna identica** (rilievo della revisione: correggendone una, le altre non devono cambiare forma): ogni
// riga porta il valore di partenza e il testo con cui è nata, e solo quella il cui testo è cambiato si riconverte. Una riga
// cambiata: un elenco si scrive separato da virgole e torna un elenco (di numeri, se lo era e i pezzi lo sono); un numero torna
// un numero se il testo lo è. Una tabella della guida (righe di campi) o un valore d'altra forma resta com'è e si può solo
// togliere. La `maschera` di una Persona non entra nelle righe: la decide la Persona del compendio.
// ============================================================

/** La chiave di un dettaglio resa leggibile: «livelloConsigliato» → «livello consigliato», «attacchi_pericolosi» → «attacchi pericolosi». */
export function etichettaDettaglio(chiave: string): string {
  return chiave.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase().trim();
}

/**
 * Una riga dell'editor: la chiave di partenza ('' se nuova), l'etichetta e il testo; la forma del valore di partenza, il valore
 * stesso e il testo con cui la riga è nata (per restituirlo identico se il testo non cambia).
 */
export interface RigaDettaglio {
  chiave: string; etichetta: string; testo: string; forma: 'testo' | 'numero' | 'elenco' | 'tabella' | 'altro';
  originale?: unknown; testoIniziale?: string;
}

/** I dettagli che una voce Persona collegata alla Persona del compendio non corregge qui: le affinità stanno sulla Persona (matita della sua scheda). */
export const AFFINITA_DELLA_PERSONA: readonly string[] = ['deboleA', 'resisteA', 'debolezze', 'resistenze'];

/** Le righe dell'editor dai dettagli di una voce, nell'ordine, senza la `maschera`. */
export function righeDaDettagli(d: Record<string, unknown>): RigaDettaglio[] {
  return Object.entries(d).filter(([k]) => k !== 'maschera').map(([k, v]): RigaDettaglio => {
    const base = { chiave: k, etichetta: etichettaDettaglio(k), originale: v };
    const riga = (forma: RigaDettaglio['forma'], testo: string): RigaDettaglio => ({ ...base, forma, testo, testoIniziale: testo });
    if (typeof v === 'number') return riga('numero', String(v));
    if (typeof v === 'string') return riga('testo', v);
    if (Array.isArray(v) && v.every((x) => typeof x === 'string' || typeof x === 'number')) return riga('elenco', v.map(String).join(', '));
    if (Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'object' && x !== null && !Array.isArray(x))) return riga('tabella', '');
    return riga('altro', '');
  });
}

/** Le etichette scritte più volte (una sovrascriverebbe l'altra): il salvataggio si ferma finché non si cambiano. */
export function etichetteRipetute(righe: RigaDettaglio[]): string[] {
  const viste = new Set<string>();
  const ripetute = new Set<string>();
  for (const r of righe) {
    const e = r.etichetta.trim().toLowerCase();
    if (!e) continue;
    if (viste.has(e)) ripetute.add(r.etichetta.trim());
    viste.add(e);
  }
  return [...ripetute];
}

/**
 * I dettagli da salvare. Una riga senza etichetta se ne va; una riga cambiata e rimasta senza testo anche. L'etichetta non
 * toccata tiene la chiave di partenza; cambiata, diventa lei la chiave. Una riga dal testo non toccato torna col valore di partenza.
 */
export function dettagliDaRighe(righe: RigaDettaglio[]): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  for (const r of righe) {
    const etichetta = r.etichetta.trim();
    if (!etichetta) continue;
    const chiave = r.chiave && etichettaDettaglio(r.chiave) === etichetta ? r.chiave : etichetta;
    if (r.forma === 'tabella' || r.forma === 'altro' || (r.chiave && r.testo === r.testoIniziale)) { d[chiave] = r.originale; continue; }
    const testo = r.testo.trim();
    if (!testo) continue;
    if (r.forma === 'elenco') {
      const pezzi = testo.split(',').map((x) => x.trim()).filter(Boolean);
      const diNumeri = Array.isArray(r.originale) && r.originale.length > 0 && r.originale.every((x) => typeof x === 'number');
      d[chiave] = diNumeri && pezzi.every((x) => /^-?\d+([.,]\d+)?$/.test(x)) ? pezzi.map((x) => Number(x.replace(',', '.'))) : pezzi;
    } else if (r.forma === 'numero' && /^-?\d+([.,]\d+)?$/.test(testo)) d[chiave] = Number(testo.replace(',', '.'));
    else d[chiave] = testo;
  }
  return d;
}
