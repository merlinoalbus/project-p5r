// ============================================================
// meteoPartita — il meteo di un giorno nella partita: di giorno e di sera, scelto dall'utente o preso dalla guida
// ============================================================
//
// Il meteo del gioco non è sempre quello della guida (e per 58 giorni la guida non lo dice): l'utente lo segna in
// Partita → Oggi, e fino ad allora vale quello della guida. «Sereno/Pioggia» vuol dire sereno di giorno e pioggia di
// sera: le due fasce si leggono separate, e un requisito «non deve piovere» guarda la fascia corrente
// (scelta dell'utente, 2026-09-30).
// ============================================================

export const METEO_PARTITA = [
  { chiave: 'sereno', nome: 'Sereno' },
  { chiave: 'nuvoloso', nome: 'Nuvoloso' },
  { chiave: 'pioggia', nome: 'Pioggia' },
  { chiave: 'neve', nome: 'Neve' },
] as const;
export type MeteoPartita = (typeof METEO_PARTITA)[number]['chiave'];

/** Il nome leggibile di un meteo («Pioggia»); la chiave stessa se non è in elenco. */
export const nomeMeteo =(m: MeteoPartita): string => METEO_PARTITA.find((x) => x.chiave === m)?.nome ?? m;

/** Un segmento del testo della guida («Pioggia (acquazzone)», «Nuvoloso (ondata di gelo)») → il meteo; il modificatore fra parentesi non conta. */
export function meteoDelSegmento(segmento: string): MeteoPartita | null {
  const t = segmento.replace(/\(.*?\)/g, '');
  if (/piogg|acquazz|tempor|piov/i.test(t)) return 'pioggia';
  if (/nev/i.test(t)) return 'neve';
  if (/nuvol|copert/i.test(t)) return 'nuvoloso';
  if (/seren|sole/i.test(t)) return 'sereno';
  return null;
}

/** Il testo della guida diviso nelle due fasce: «A/B» = A di giorno e B di sera, un solo valore vale per entrambe. */
export function fasceDellaGuida(testo: string | null | undefined): { giorno: MeteoPartita | null; sera: MeteoPartita | null } {
  const parti = (testo ?? '').split('/').map((p) => p.trim()).filter(Boolean);
  if (parti.length === 0) return { giorno: null, sera: null };
  return { giorno: meteoDelSegmento(parti[0]), sera: meteoDelSegmento(parti[1] ?? parti[0]) };
}

// ---- Allerte meteo (pioggia torrenziale, polline, ondata di calore, notte torrida, stagione influenzale, ondata di gelo) ----
// Cadono in date fisse, che il catalogo (Trofei e finali → Meteo) scrive in prosa: «Date: 27/7, 29/7 (sera), 22/8-26/8».
// La migrazione 091 le legge una volta sola con `leggiDateAllerta` e le mette in `allerta_meteo` per giorno e fascia.

/** La pioggia torrenziale è pioggia: per i requisiti «non deve piovere» e «piove» vale come tale. */
export const ALLERTA_PIOGGIA = 'pioggia-torrenziale';

/** La chiave di un'allerta dal suo nome («Ondata di calore (di giorno)» → «ondata-di-calore»). */
export function chiaveAllerta(nome: string): string {
  return nome.replace(/\(.*?\)/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Giorno e mese scritti all'italiana («7», «8») come data «MM-GG» («08-07»), con gli zeri davanti. */
const mmgg = (g: string, m: string): string => `${m.padStart(2, '0')}-${g.padStart(2, '0')}`;

/** Le date di un'allerta dalla riga «Date…» dei suoi effetti: intervalli «MM-GG» con le fasce in cui vale.
 *  «Date (solo di giorno):» / «(solo di sera):» vale per tutte; «(giorno)», «(sera)», «(notte)» dopo una data solo per quella. */
export function leggiDateAllerta(effetti: readonly string[]): Array<{ dal: string; al: string; fasce: Array<'giorno' | 'sera'> }> {
  const riga = effetti.find((e) => /^\s*Date\b/i.test(e));
  if (!riga) return [];
  const intestazione = riga.slice(0, riga.indexOf(':') + 1);
  const predefinite: Array<'giorno' | 'sera'> = /solo di giorno/i.test(intestazione) ? ['giorno'] : /solo di sera/i.test(intestazione) ? ['sera'] : ['giorno', 'sera'];
  const out: Array<{ dal: string; al: string; fasce: Array<'giorno' | 'sera'> }> = [];
  for (const voce of riga.slice(riga.indexOf(':') + 1).split(',')) {
    const m = voce.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\s*-\s*(\d{1,2})\/(\d{1,2}))?\s*(?:\((giorno|sera|notte)\))?\.?$/i);
    if (!m) continue;
    const quando = m[5]?.toLowerCase();
    out.push({ dal: mmgg(m[1], m[2]), al: m[3] ? mmgg(m[3], m[4]) : mmgg(m[1], m[2]), fasce: quando ? [quando === 'giorno' ? 'giorno' : 'sera'] : predefinite });
  }
  return out;
}

/** Un evento all'aperto salta con la pioggia e con la neve (requisito «non deve piovere» dei Confidenti). */
export const guastaLAperto = (m: MeteoPartita): boolean => m === 'pioggia' || m === 'neve';
/** La condizione «piove» (lo studio al Leblanc nei giorni di pioggia): solo la pioggia. */
export const piove = (m: MeteoPartita): boolean => m === 'pioggia';
