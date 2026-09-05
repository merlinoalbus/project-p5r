// ============================================================
// Registro dei tipi di spillo delle mappe (Fase 13): icona, colore, collezionabile per default, corrispondenze dai tipi esistenti
// ============================================================
//
// Condiviso fra server (migrazione dei marcatori, importazione) e frontend (visore, editor, legenda). L'icona è l'asset
// `ui/spillo-<tipo>` (prompt §18) con riserva SVG in codice (`IconaSpillo`).
// I tipi della città seguono le etichette che la mappa del gioco dà ai punti di interesse («Bevande», «Sigarette», «Cercalavoro»…);
// quelli dei Palazzi e dei Mementos seguono i punti della guida più i meccanismi, il rampino e le porte di Royal (15.24).
// ============================================================

/** Ordine di presentazione (palette dell'editor, legenda): spostamenti, città, persone, Palazzi e Mementos, nota. */
export const TIPI_SPILLO = [
  'passaggio', 'treno',
  'negozio', 'ristorante', 'distributore', 'sigarette', 'cercalavoro', 'lavoro', 'terme', 'lavanderia', 'cinema', 'biblioteca', 'culto', 'sala-giochi', 'casa', 'attivita',
  'confidente', 'dialogo',
  'forziere', 'tesoro', 'tesoro-palazzo', 'seme-bramosia', 'oggetto-chiave', 'timbro', 'boss', 'miniboss', 'nemico', 'punto-sensibile', 'meccanismo', 'rampino', 'porta', 'sicura', 'scorciatoia',
  'nota',
] as const;
export type TipoSpillo = (typeof TIPI_SPILLO)[number];

/** Gruppi della palette dell'editor, nello stesso ordine di `TIPI_SPILLO`: ogni tipo sta in un solo gruppo. */
export const GRUPPI_SPILLO: ReadonlyArray<{ nome: string; tipi: readonly TipoSpillo[] }> = [
  { nome: 'Spostamenti', tipi: ['passaggio', 'treno'] },
  { nome: 'Città', tipi: ['negozio', 'ristorante', 'distributore', 'sigarette', 'cercalavoro', 'lavoro', 'terme', 'lavanderia', 'cinema', 'biblioteca', 'culto', 'sala-giochi', 'casa', 'attivita'] },
  { nome: 'Persone', tipi: ['confidente', 'dialogo'] },
  { nome: 'Palazzi e Mementos', tipi: ['forziere', 'tesoro', 'tesoro-palazzo', 'seme-bramosia', 'oggetto-chiave', 'timbro', 'boss', 'miniboss', 'nemico', 'punto-sensibile', 'meccanismo', 'rampino', 'porta', 'sicura', 'scorciatoia'] },
  { nome: 'Altro', tipi: ['nota'] },
];

export const TIPI_RIFERIMENTO = ['mappa', 'negozio', 'punto', 'luogo', 'confidente', 'richiesta', 'attivita'] as const;
export type TipoRiferimento = (typeof TIPI_RIFERIMENTO)[number];

export interface DefinizioneSpillo {
  nome: string;
  colore: string;
  /** Sparisce quando raccolto (salvo «mostra anche i raccolti»). */
  collezionabile: boolean;
  /** Riferimento tipico dello spillo. */
  riferimento: TipoRiferimento | null;
}

export const DEFINIZIONI_SPILLO: Record<TipoSpillo, DefinizioneSpillo> = {
  // ---- Spostamenti ----
  passaggio: { nome: 'Passaggio', colore: '#3b82f6', collezionabile: false, riferimento: 'mappa' },
  treno: { nome: 'Stazione', colore: '#15803d', collezionabile: false, riferimento: 'mappa' },
  // ---- Città: negozi, servizi e luoghi con un'etichetta propria sulla mappa del gioco ----
  negozio: { nome: 'Negozio', colore: '#22c55e', collezionabile: false, riferimento: 'negozio' },
  ristorante: { nome: 'Ristorante', colore: '#a16207', collezionabile: false, riferimento: 'luogo' },
  /** Distributore automatico di bevande: etichetta «Bevande» sulla mappa del gioco (SP e cure a poco prezzo). */
  distributore: { nome: 'Bevande', colore: '#06b6d4', collezionabile: false, riferimento: 'luogo' },
  /** Distributore di sigarette o tabaccaio: etichetta «Sigarette» sulla mappa del gioco (punto di riferimento, non si compra nulla). */
  sigarette: { nome: 'Sigarette', colore: '#78716c', collezionabile: false, riferimento: 'luogo' },
  /** Espositore delle riviste di annunci di lavoro (Sottopasso di Shibuya, konbini): etichetta «Cercalavoro». */
  cercalavoro: { nome: 'Cercalavoro', colore: '#d97706', collezionabile: false, riferimento: 'luogo' },
  /** Posto dove si fa un lavoro part-time (fioraio, Ore no Beko, konbini, Bar Crossroads…). */
  lavoro: { nome: 'Lavoro part-time', colore: '#0d9488', collezionabile: false, riferimento: 'attivita' },
  terme: { nome: 'Bagno pubblico', colore: '#67e8f9', collezionabile: false, riferimento: 'luogo' },
  lavanderia: { nome: 'Lavanderia', colore: '#c4b5fd', collezionabile: false, riferimento: 'luogo' },
  cinema: { nome: 'Cinema', colore: '#1e3a8a', collezionabile: false, riferimento: 'luogo' },
  biblioteca: { nome: 'Biblioteca', colore: '#7c2d12', collezionabile: false, riferimento: 'luogo' },
  /** Chiesa di Kanda, tempio di Kichijoji, santuario di Meiji: luoghi di culto dove si incontrano Confidenti e si medita. */
  culto: { nome: 'Chiesa o tempio', colore: '#4c1d95', collezionabile: false, riferimento: 'luogo' },
  'sala-giochi': { nome: 'Sala giochi', colore: '#84cc16', collezionabile: false, riferimento: 'luogo' },
  /** Abitazione: casa di Sojiro, soffitta del Leblanc, case dei Confidenti. */
  casa: { nome: 'Casa', colore: '#fdba74', collezionabile: false, riferimento: 'luogo' },
  attivita: { nome: 'Attività', colore: '#facc15', collezionabile: false, riferimento: 'luogo' },
  // ---- Persone ----
  confidente: { nome: 'Confidente', colore: '#ec4899', collezionabile: false, riferimento: 'confidente' },
  /** Conversazione con un personaggio che non è un Confidente: si «raccoglie» una volta fatta; nessun riferimento tipico (il luogo si sceglie a mano se serve). */
  dialogo: { nome: 'Dialogo', colore: '#6366f1', collezionabile: true, riferimento: null },
  // ---- Palazzi e Mementos ----
  forziere: { nome: 'Forziere', colore: '#eab308', collezionabile: true, riferimento: 'punto' },
  tesoro: { nome: 'Tesoro', colore: '#a855f7', collezionabile: true, riferimento: 'punto' },
  'tesoro-palazzo': { nome: 'Tesoro del Palazzo', colore: '#d946ef', collezionabile: true, riferimento: 'punto' },
  'seme-bramosia': { nome: 'Seme della bramosia', colore: '#c85cff', collezionabile: true, riferimento: 'punto' },
  'oggetto-chiave': { nome: 'Oggetto chiave', colore: '#fbbf24', collezionabile: true, riferimento: 'punto' },
  /** Timbro dei Mementos (Royal): postazione fissa per piano, si «raccoglie» una volta timbrato. */
  timbro: { nome: 'Timbro dei Mementos', colore: '#f0abfc', collezionabile: true, riferimento: null },
  boss: { nome: 'Boss', colore: '#e5352b', collezionabile: true, riferimento: 'punto' },
  miniboss: { nome: 'Miniboss', colore: '#f97316', collezionabile: true, riferimento: 'punto' },
  nemico: { nome: 'Nemico', colore: '#b0b0c0', collezionabile: false, riferimento: 'punto' },
  'punto-sensibile': { nome: 'Punto sensibile', colore: '#7fd8c8', collezionabile: false, riferimento: 'punto' },
  /** Leva, interruttore, pannello o quadro di controllo da azionare. */
  meccanismo: { nome: 'Meccanismo', colore: '#64748b', collezionabile: false, riferimento: 'punto' },
  /** Punto di aggancio del rampino (Royal). */
  rampino: { nome: 'Punto del rampino', colore: '#a21caf', collezionabile: false, riferimento: null },
  /** Porta chiusa o serratura: si apre con una chiave, una tessera o dall'altro lato. */
  porta: { nome: 'Porta chiusa', colore: '#b91c1c', collezionabile: false, riferimento: 'punto' },
  sicura: { nome: 'Stanza sicura', colore: '#38bdf8', collezionabile: false, riferimento: 'punto' },
  scorciatoia: { nome: 'Scorciatoia', colore: '#9ca3af', collezionabile: false, riferimento: 'punto' },
  // ---- Altro ----
  nota: { nome: 'Nota', colore: '#ececf1', collezionabile: false, riferimento: null },
};

/** Tipo di spillo per un punto di interesse dei dungeon (tipi di `utils/dungeon.ts`). */
export function spilloPerPunto(tipoPunto: string): TipoSpillo {
  switch (tipoPunto) {
    case 'forziere': case 'forziere-chiuso': return 'forziere';
    case 'oggetto': return 'oggetto-chiave';
    case 'volonta': return 'seme-bramosia';
    case 'tesoro': return 'tesoro-palazzo';
    case 'puzzle': return 'punto-sensibile';
    case 'boss': return 'boss';
    case 'miniboss': return 'miniboss';
    case 'ombra-sciagura': return 'nemico';
    case 'sicura': return 'sicura';
    case 'scorciatoia': return 'scorciatoia';
    default: return 'nota';
  }
}

/** Tipo di spillo per un luogo della città (tipi di `LuogoDto`). */
export function spilloPerLuogo(tipoLuogo: string): TipoSpillo {
  switch (tipoLuogo) {
    case 'negozio': return 'negozio';
    case 'ristorante': return 'ristorante';
    case 'confidente': return 'confidente';
    case 'distributore': return 'distributore';
    case 'trasporto': return 'treno';
    case 'attivita': case 'servizio': case 'scuola': return 'attivita';
    default: return 'nota';
  }
}

export const TIPI_MAPPA = ['citta', 'quartiere', 'luogo', 'palazzo', 'area', 'dedalo', 'generica'] as const;
export type TipoMappa = (typeof TIPI_MAPPA)[number];
export const NOME_TIPO_MAPPA: Record<TipoMappa, string> = { citta: 'Città', quartiere: 'Quartiere', luogo: 'Luogo', palazzo: 'Palazzo', area: 'Area', dedalo: 'Dedalo', generica: 'Mappa' };

/**
 * Asset del repository proposto per l'immagine di base di una mappa (15.25): `mappe/<chiave>`, cioè il percorso in `public/asset/`
 * (senza estensione) che «Esporta questo luogo» dà all'immagine e che il seed della città usa per i quartieri. È solo un puntatore:
 * finché il file non è consegnato la mappa usa l'immagine dell'istanza o la griglia.
 */
export function assetPredefinitoMappa(chiave: string): string {
  return `mappe/${chiave}`;
}
