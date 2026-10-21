// Il vecchio campo «contenuto» contiene anche istruzioni, statistiche e soluzioni: non sono oggetti.
// Regola congelata di M7, non usata per interpretare o riscrivere i testi a runtime.
interface Voce { tipo: string; nome: string; dettagli_json: unknown }

// La guida di Niijima nomina punti saccheggiabili, non il bottino ottenuto da essi.
// Non è una corrispondenza con Tavola Ouija o con un tesoro scelto per somiglianza.
const nominativi = (testo: string): string[] => separaNomi121([testo]).map((p) => p.trim())
  .filter((p) => p && !/^(?:ornamenti?|tavola dei semi)$/i.test(p));

/** Le virgole nelle annotazioni non separano oggetti diversi. La stessa regola serve a tutta M7. */
export function separaNomi121(testi: readonly string[]): string[] {
  const parti: string[] = [];
  for (const testo of testi) {
    let livello = 0; let corrente = '';
    for (const c of testo) {
      if (c === '(') livello++;
      if (c === ')') livello = Math.max(0, livello - 1);
      if ((c === ',' || c === ';' || c === '\n') && livello === 0) { parti.push(corrente); corrente = ''; }
      else corrente += c;
    }
    parti.push(corrente);
  }
  return parti;
}

export function contenutoNominativo121(voce: Voce): string[] {
  if (voce.tipo === 'volonta' && voce.nome.trim()) return [voce.nome.trim()];
  let dati: unknown;
  try { dati = typeof voce.dettagli_json === 'string' ? JSON.parse(voce.dettagli_json) as unknown : null; } catch { return []; }
  if (!dati || typeof dati !== 'object' || Array.isArray(dati)) return [];
  const contenuto = (dati as Record<string, unknown>).contenuto;
  if (typeof contenuto !== 'string' || !contenuto.trim()) return [];
  const testo = contenuto.trim();
  if (['forziere', 'forziere-chiuso', 'volonta'].includes(voce.tipo)) return nominativi(testo);

  if (voce.tipo === 'oggetto') {
    if (/^(?:oggetti?\s+vari\s*\/\s*denaro|vari materiali|oggetti\s*\/\s*materiali generici|materiali\s*\/\s*oggetti generici|[\d.,\s]+monete)\b/i.test(testo)) return [];
    if (/^oggetto chiave\b/i.test(testo)) return [`${voce.nome} (oggetto chiave)`];
    if (/^chiavi\s*\/\s*tessere di progressione\b/i.test(testo)) return voce.nome.split(/\s+\/\s+/).map((nome) => `${nome} (oggetto chiave)`);
    if (/^accessorio\s*:/i.test(testo)) return [`${voce.nome} (accessorio)`];
    // Restano nel testo i contenitori saccheggiabili; il loro eventuale bottino richiede un nome attestato.
    return nominativi(testo);
  }

  if (voce.tipo === 'puzzle') {
    const premio = /\bricompensa\s*:\s*(.+)$/i.exec(testo)?.[1];
    if (!premio) return [];
    // La vittoria può aprire un forziere: non equivale ad averne raccolto il contenuto.
    const diretto = premio.split(/\s*\+\s*forziere\b/i)[0].trim();
    return diretto && !/^forziere\b/i.test(diretto) ? [diretto] : [];
  }

  if (voce.tipo === 'boss' || voce.tipo === 'miniboss') {
    if (/^(?:(?:prima|seconda|terza|quarta|quinta(?: e ultima)?) lettera di raccomandazione|tesserino\b|planimetria\b)/i.test(testo)) return [`${testo} (oggetto chiave)`];
    if (/^seme\b/i.test(testo)) return [`${testo.split(/\s+[—–]\s+/)[0]} (oggetto chiave)`];
    // HP, mosse, strategie, ranghi e forzieri sbloccati indirettamente restano descrizione della voce.
    return [];
  }
  return [];
}
