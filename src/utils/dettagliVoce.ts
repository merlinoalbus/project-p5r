// ============================================================
// dettagliVoce — i dettagli di una voce della guida fra il DTO e le righe dell'editor (2026-10-18)
// ============================================================
//
// Un elenco si scrive separato da virgole e torna un elenco; un numero torna un numero; una tabella della guida (righe di campi)
// resta com'è. La `maschera` di una Persona non entra nelle righe: la decide la Persona del compendio.
// ============================================================

/** La chiave di un dettaglio resa leggibile: «livelloConsigliato» → «livello consigliato», «attacchi_pericolosi» → «attacchi pericolosi». */
export function etichettaDettaglio(chiave: string): string {
  return chiave.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase().trim();
}

/** Una riga dell'editor: la chiave di partenza ('' se nuova), l'etichetta e il testo, e la forma del valore di partenza. */
export interface RigaDettaglio { chiave: string; etichetta: string; testo: string; forma: 'testo' | 'numero' | 'elenco' | 'tabella'; tabella?: unknown }

/** Le righe dell'editor dai dettagli di una voce, nell'ordine, senza la `maschera`. */
export function righeDaDettagli(d: Record<string, unknown>): RigaDettaglio[] {
  return Object.entries(d).filter(([k]) => k !== 'maschera').map(([k, v]): RigaDettaglio => {
    const etichetta = etichettaDettaglio(k);
    if (typeof v === 'number') return { chiave: k, etichetta, testo: String(v), forma: 'numero' };
    if (Array.isArray(v) && v.some((x) => typeof x === 'object' && x !== null)) return { chiave: k, etichetta, testo: '', forma: 'tabella', tabella: v };
    if (Array.isArray(v)) return { chiave: k, etichetta, testo: v.map(String).join(', '), forma: 'elenco' };
    return { chiave: k, etichetta, testo: v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v), forma: 'testo' };
  });
}

/**
 * I dettagli da salvare: una riga senza etichetta o senza testo se ne va (le tabelle restano finché non si tolgono). L'etichetta
 * non toccata tiene la chiave di partenza; cambiata, diventa lei la chiave.
 */
export function dettagliDaRighe(righe: RigaDettaglio[]): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  for (const r of righe) {
    const etichetta = r.etichetta.trim();
    if (!etichetta) continue;
    const chiave = r.chiave && etichettaDettaglio(r.chiave) === etichetta ? r.chiave : etichetta;
    if (r.forma === 'tabella') { d[chiave] = r.tabella; continue; }
    const testo = r.testo.trim();
    if (!testo) continue;
    if (r.forma === 'elenco') d[chiave] = testo.split(',').map((x) => x.trim()).filter(Boolean);
    else if (r.forma === 'numero' && /^-?\d+([.,]\d+)?$/.test(testo)) d[chiave] = Number(testo.replace(',', '.'));
    else d[chiave] = testo;
  }
  return d;
}
