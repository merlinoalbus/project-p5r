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
  'passaggio', 'scala', 'uscita', 'treno',
  'negozio', 'ristorante', 'distributore', 'sigarette', 'cercalavoro', 'lavoro', 'terme', 'lavanderia', 'cinema', 'biblioteca', 'culto', 'sala-giochi', 'casa', 'attivita',
  'confidente', 'dialogo',
  'forziere', 'forziere-raro', 'tesoro', 'tesoro-palazzo', 'seme-bramosia', 'oggetto-chiave', 'timbro', 'boss', 'miniboss', 'nemico', 'punto-sensibile', 'meccanismo', 'rampino', 'porta', 'sicura', 'scorciatoia',
  // I due ingressi che non sono né un negozio né una stanza di un Palazzo, e che finora non
  // avevano un segno proprio. L'**ingresso ai Memento** portava lo spillo della stazione
  // ferroviaria, perché il suo luogo è classificato `trasporto`: sulla mappa di Shibuya la porta
  // dei Dedali era indistinguibile da una banchina della metropolitana. La **Stanza di Velluto**
  // non aveva niente del tutto, pur avendo la sua figura consegnata da tempo.
  'velluto', 'mementos',
  // L'ingresso a un Palazzo dal mondo reale: mancava (richiesta dell'utente, 2026-09-11).
  'ingresso-palazzo',
  'nota',
] as const;
export type TipoSpillo = (typeof TIPI_SPILLO)[number];

// ============================================================
// Le quattro categorie di spillo (richiesta dell'utente, 2026-09-11)
// ============================================================
//
// Uno spillo chiede sempre nome, tipo e descrizione; **il resto lo decide la categoria** del tipo:
//
// - **spostamento** — porta a un'altra mappa e, se indicato, a uno spillo di quella mappa. Non è
//   consumabile. È condizionato (visibile solo in certi momenti).
// - **città** — un negozio o un punto chiave della città. Non è consumabile e non porta altrove:
//   toccato, mostra quello che il negozio (o l'attività) offre in quel momento. Non è condizionato:
//   la disponibilità è del negozio, non del segnalino.
// - **consumabile** — si segna come fatto (dialogo, forziere, boss…). Non collega a niente.
//   Condizionato.
// - **informativo** — tutto il resto: né consumabile, né collegabile. Condizionato.
export const CATEGORIE_SPILLO = ['spostamento', 'citta', 'consumabile', 'informativo'] as const;
export type CategoriaSpillo = (typeof CATEGORIE_SPILLO)[number];
export const DEFINIZIONI_CATEGORIA: Record<CategoriaSpillo, { nome: string; descrizione: string }> = {
  spostamento: { nome: 'Spostamento', descrizione: 'Porta a un’altra mappa, e se vuoi a uno spillo preciso di quella mappa.' },
  citta: { nome: 'Città', descrizione: 'Un negozio o un punto della città: toccato mostra che cosa offre adesso.' },
  consumabile: { nome: 'Consumabile', descrizione: 'Si segna come fatto una volta preso, sconfitto o parlato.' },
  informativo: { nome: 'Informativo', descrizione: 'Un segno sulla mappa con nome e descrizione, e basta.' },
};
const CATEGORIA_PER_TIPO: Record<TipoSpillo, CategoriaSpillo> = {
  passaggio: 'spostamento', scala: 'spostamento', uscita: 'spostamento', treno: 'spostamento', velluto: 'spostamento', mementos: 'spostamento', 'ingresso-palazzo': 'spostamento', scorciatoia: 'spostamento', rampino: 'spostamento',
  negozio: 'citta', ristorante: 'citta', distributore: 'citta', sigarette: 'citta', cercalavoro: 'citta', lavoro: 'citta', terme: 'citta', lavanderia: 'citta', cinema: 'citta', biblioteca: 'citta', culto: 'citta', 'sala-giochi': 'citta', casa: 'citta', attivita: 'citta', confidente: 'citta',
  dialogo: 'consumabile', forziere: 'consumabile', 'forziere-raro': 'consumabile', tesoro: 'consumabile', 'tesoro-palazzo': 'consumabile', 'seme-bramosia': 'consumabile', 'oggetto-chiave': 'consumabile', timbro: 'consumabile', boss: 'consumabile', miniboss: 'consumabile', nemico: 'consumabile',
  'punto-sensibile': 'informativo', meccanismo: 'informativo', porta: 'informativo', sicura: 'informativo', nota: 'informativo',
};
export function categoriaSpillo(tipo: string): CategoriaSpillo {
  return CATEGORIA_PER_TIPO[tipo as TipoSpillo] ?? 'informativo';
}
/** I tipi di ogni categoria, nell'ordine di `TIPI_SPILLO`. */
export function tipiDellaCategoria(categoria: CategoriaSpillo): TipoSpillo[] {
  return TIPI_SPILLO.filter((t) => CATEGORIA_PER_TIPO[t] === categoria);
}
/** A che cosa può collegarsi uno spillo di quella categoria (`null` è sempre ammesso).
 *
 * Uno spostamento **porta** a una mappa (la destinazione), ma può anche **essere** un luogo o un
 * punto della Guida — la stazione è un luogo di tipo `trasporto`, la scorciatoia un punto — ed è
 * con quel riferimento che il seed lo riconosce al ricaricamento. Toglierlo vorrebbe dire
 * reinserirlo in copia a ogni reseed. */
export const RIFERIMENTI_PER_CATEGORIA: Record<CategoriaSpillo, readonly TipoRiferimento[]> = {
  spostamento: ['mappa', 'luogo', 'punto'],
  citta: ['negozio', 'attivita', 'luogo', 'confidente'],
  consumabile: ['punto'],
  informativo: ['punto'],
};

/** Gli elementi fissi del mondo: ci sono sempre, e nessuna condizione li fa sparire.
 *
 * Sono l'arredo del mondo — una porta, una scala, un forziere, un passaggio, una stanza sicura —
 * e restano visibili anche quando sono chiusi, vuoti o non ancora raggiunti: una porta chiusa si
 * vede, e nasconderla finché non hai la chiave vorrebbe dire mostrarla solo quando non serve più.
 *
 * Tutto il resto **può mancare**: un negozio chiude, un'attività è solo di sera, una persona esce
 * solo quando piove. Quelli il pin ce l'hanno solo quando la cosa c'è, altrimenti chi ci va non
 * la trova.
 *
 * La distinzione è per tipo di segnalino e va usata insieme alla provenienza: un `passaggio` che
 * viene dall'atlante nativo è una porta di un Palazzo e c'è sempre, mentre il `passaggio` che
 * dalla mappa di Tokyo porta a un quartiere che apre a giugno, in aprile, davvero non c'è.
 */
export const TIPI_STRUTTURALI: readonly TipoSpillo[] = [
  'passaggio', 'scala', 'uscita', 'scorciatoia', 'rampino', 'porta', 'meccanismo', 'sicura',
  'forziere', 'forziere-raro', 'tesoro', 'tesoro-palazzo', 'seme-bramosia', 'oggetto-chiave',
  'timbro', 'punto-sensibile', 'boss', 'miniboss', 'nemico', 'nota',
];

export function eStrutturale(tipo: string): boolean {
  return (TIPI_STRUTTURALI as readonly string[]).includes(tipo);
}


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
  /** Scala, scaletta o ascensore fra due livelli dello stesso luogo: la mappa del gioco le distingue dai passaggi piani. */
  scala: { nome: 'Scala', colore: '#2dd4bf', collezionabile: false, riferimento: 'mappa' },
  /** Punto da cui si lascia un Palazzo o un Dedalo e si torna in città. */
  uscita: { nome: 'Uscita', colore: '#ef4444', collezionabile: false, riferimento: 'mappa' },
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
  // Il gioco disegna il forziere raro con la stessa icona di quello normale sulla mappa
  // d'insieme, ma non sono la stessa cosa: le procedure che li accendono si chiamano `N_TBOX`
  // (normal) e `R_TBOX`/`RARE_TBOX`, e convivono su 21 planimetrie. Renderli entrambi
  // «Forziere» cancellava una distinzione che il gioco fa.
  'forziere-raro': { nome: 'Forziere raro', colore: '#fde047', collezionabile: true, riferimento: 'punto' },
  tesoro: { nome: 'Tesoro', colore: '#a855f7', collezionabile: true, riferimento: 'punto' },
  'tesoro-palazzo': { nome: 'Tesoro del Palazzo', colore: '#d946ef', collezionabile: true, riferimento: 'punto' },
  'seme-bramosia': { nome: 'Seme della bramosia', colore: '#c85cff', collezionabile: true, riferimento: 'punto' },
  'oggetto-chiave': { nome: 'Oggetto chiave', colore: '#fbbf24', collezionabile: true, riferimento: 'punto' },
  /** Timbro dei Mementos (Royal): postazione fissa per piano, si «raccoglie» una volta timbrato. */
  timbro: { nome: 'Timbro dei Mementos', colore: '#f0abfc', collezionabile: true, riferimento: null },
  boss: { nome: 'Boss', colore: '#e5352b', collezionabile: true, riferimento: 'punto' },
  miniboss: { nome: 'Miniboss', colore: '#f97316', collezionabile: true, riferimento: 'punto' },
  nemico: { nome: 'Nemico', colore: '#b0b0c0', collezionabile: true, riferimento: 'punto' },
  'punto-sensibile': { nome: 'Punto sensibile', colore: '#7fd8c8', collezionabile: false, riferimento: 'punto' },
  /** Leva, interruttore, pannello o quadro di controllo da azionare. */
  meccanismo: { nome: 'Meccanismo', colore: '#64748b', collezionabile: false, riferimento: 'punto' },
  /** Punto di aggancio del rampino (Royal). */
  rampino: { nome: 'Punto del rampino', colore: '#a21caf', collezionabile: false, riferimento: null },
  /** Porta chiusa o serratura: si apre con una chiave, una tessera o dall'altro lato. */
  porta: { nome: 'Porta chiusa', colore: '#b91c1c', collezionabile: false, riferimento: 'punto' },
  sicura: { nome: 'Stanza sicura', colore: '#38bdf8', collezionabile: false, riferimento: 'punto' },
  scorciatoia: { nome: 'Scorciatoia', colore: '#9ca3af', collezionabile: false, riferimento: 'punto' },
  // ---- I due ingressi ----
  /** La porta blu della Stanza di Velluto. **Nessun riferimento tipico**: segna dove si entra, e
   *  quel che c'è dietro non è una mappa di questo mondo. Chi vuole collegarci qualcosa lo sceglie
   *  a mano, come per un dialogo o un punto del rampino. */
  velluto: { nome: 'Stanza di Velluto', colore: '#3730a3', collezionabile: false, riferimento: null },
  /** L'ingresso ai Memento, nella stazione di Shibuya. Non è una banchina: è la soglia dei Dedali. */
  mementos: { nome: 'Ingresso ai Memento', colore: '#7f1d1d', collezionabile: false, riferimento: 'mappa' },
  /** L'ingresso a un Palazzo dal mondo reale (Shujin per Kamoshida, l'atelier per Madarame…): porta alla mappa del Palazzo. */
  'ingresso-palazzo': { nome: 'Ingresso al Palazzo', colore: '#dc2626', collezionabile: false, riferimento: 'mappa' },
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
    case 'velluto': return 'velluto';
    case 'mementos': return 'mementos';
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
