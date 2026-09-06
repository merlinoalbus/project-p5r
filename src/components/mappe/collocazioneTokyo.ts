// ============================================================
// La mappa di Tokyo: dove sta ogni cosa e come corrono le linee
// ============================================================
//
// **Né le posizioni né i tracciati vengono dal gioco.** Va detto per primo, perché tutto il resto
// dell'atlante è estratto e dimostrato, e confondere una cosa scritta a mano con una provata è il
// modo in cui un dato falso sopravvive per mesi.
//
// I *disegni* sono originali: gli sprite `_lm` di `P5_MAPDATA.SPD`. Le *collocazioni* no. Nel
// foglio non ci sono: il campo `resa` di ogni sprite vale sempre metà larghezza e metà altezza,
// cioè è il perno con cui il gioco àncora l'immagine, non il punto in cui la mette.
//
// **E nemmeno le linee.** Si è provato a ricavarle da `metropolitana.json`, che ha 91 «tratte»:
// prendendo le coppie consecutive di ogni tratta vengono 61 archi fra 25 nodi, grado medio cinque
// — una rete di trasporto ne ha due o tre. Guardando una tratta si capisce perché: la prima è
// *Shibuya, Yongen-Jaya, Aoyama-Itchome, Shinjuku, Akihabara, Kanda, Ichigaya, Jinbocho, Santuario
// Meiji, Kichijoji*, cioè l'elenco di dove si può andare **da** Shibuya, non un percorso. Sono
// raggiungibilità, non binari, e disegnarle come binari sarebbe inventare.
//
// Le linee qui sotto sono quindi la rete vera di Tokyo, quella che il gioco riproduce: la Yamanote
// ad anello e le radiali che la attraversano. Servono a leggere il mondo — capire che Shibuya e
// Shinjuku sono due fermate della stessa corona, e che Odaiba sta dall'altra parte della baia —
// non a misurarlo. Nessuna distanza qui è in scala.
//
// Coordinate in percentuale della tela, `x` da sinistra e `y` dall'alto, riferite al **centro**.
// ============================================================

export interface Collocazione {
  x: number;
  y: number;
  /** Larghezza del disegno in percentuale della tela. */
  scala: number;
}

/** I quartieri che stanno sulla mappa di viaggio del gioco.
 *
 * Shujin Academy non c'è, e non è una dimenticanza: nel gioco non è una destinazione del treno —
 * a scuola ci si arriva da Aoyama-Itchōme — e infatti nel foglio degli sprite non ha un disegno.
 * Metterla lo stesso voleva dire ripiegare sulla fotografia del quartiere, che in mezzo alle
 * sagome in bianco e nero è una macchia. */
export const QUARTIERI_TOKYO: Record<string, Collocazione> = {
  // ---- la corona della Yamanote, in senso orario da nord ----
  ikebukuro: { x: 51, y: 11, scala: 5.5 },
  ueno: { x: 74, y: 23, scala: 5.5 },
  akihabara: { x: 79, y: 42, scala: 7.5 },
  kanda: { x: 75, y: 53, scala: 5.5 },
  ginza: { x: 68, y: 72, scala: 5.5 },
  shinagawa: { x: 41.5, y: 72, scala: 5.5 },
  shibuya: { x: 34, y: 50, scala: 7.5 },
  harajuku: { x: 33, y: 36, scala: 5.5 },
  shinjuku: { x: 38, y: 22, scala: 7.5 },
  // ---- la Chuo, che taglia da ovest a est sopra l'anello ----
  ogikubo: { x: 26, y: 5, scala: 5.5 },
  nakano: { x: 30, y: 15, scala: 5.5 },
  ichigaya: { x: 49, y: 30, scala: 5.5 },
  suidobashi: { x: 70, y: 36, scala: 5.5 },
  'kanda-jinbocho': { x: 67, y: 48.5, scala: 5.5 },
  // ---- ovest: la Inokashira ----
  kichijoji: { x: 13.5, y: 16.5, scala: 7 },
  'inokashira-park': { x: 17, y: 26, scala: 5.5 },
  // ---- sud-ovest ----
  'yongen-jaya': { x: 19, y: 51, scala: 7.5 },
  'meiji-shrine': { x: 27, y: 30, scala: 5.5 },
  // ---- il centro, dentro l'anello ----
  'aoyama-itchome': { x: 46.5, y: 51, scala: 7.5 },
  akasaka: { x: 58, y: 60, scala: 5.5 },
  nagatacho: { x: 57, y: 46, scala: 5.5 },
  roppongi: { x: 49, y: 68, scala: 5.5 },
  // ---- nord-est ----
  asakusa: { x: 87, y: 32, scala: 7 },
  // ---- la baia, a est ----
  tsukishima: { x: 71.5, y: 87.5, scala: 5.5 },
  odaiba: { x: 51, y: 92, scala: 7 },
  maihama: { x: 89, y: 70, scala: 6.5 },
  // ---- fuori città, a sud ----
  'yokohama-chinatown': { x: 10, y: 67, scala: 7 },
  'miura-kaigan': { x: 31, y: 86, scala: 6.5 },
};

export interface Linea {
  nome: string;
  colore: string;
  /** Le fermate in ordine. `anello: true` chiude il percorso sull'ultima con la prima. */
  fermate: string[];
  anello?: boolean;
}

/** Le linee, con i colori con cui Tokyo le segna davvero. */
export const LINEE_TOKYO: Linea[] = [
  { nome: 'Yamanote', colore: '#9acd32', anello: true,
    fermate: ['ikebukuro', 'ueno', 'akihabara', 'kanda', 'ginza', 'shinagawa', 'shibuya', 'harajuku', 'shinjuku'] },
  { nome: 'Chuo', colore: '#f97316',
    fermate: ['ogikubo', 'nakano', 'shinjuku', 'ichigaya', 'suidobashi', 'kanda-jinbocho', 'akihabara'] },
  { nome: 'Ginza', colore: '#f5c542',
    fermate: ['shibuya', 'aoyama-itchome', 'akasaka', 'nagatacho', 'ginza', 'ueno', 'asakusa'] },
  { nome: 'Inokashira', colore: '#ec4899',
    fermate: ['kichijoji', 'inokashira-park', 'shibuya'] },
  { nome: 'Den-en-toshi', colore: '#22c55e',
    fermate: ['shibuya', 'yongen-jaya'] },
  { nome: 'Rinkai', colore: '#38bdf8',
    fermate: ['shinagawa', 'tsukishima', 'odaiba', 'maihama'] },
  { nome: 'Minatomirai', colore: '#3b82f6',
    fermate: ['shibuya', 'shinagawa', 'yokohama-chinatown', 'miura-kaigan'] },
  { nome: 'Hibiya', colore: '#94a3b8',
    fermate: ['roppongi', 'ginza', 'tsukishima'] },
  { nome: 'Chiyoda', colore: '#14b8a6',
    fermate: ['meiji-shrine', 'harajuku', 'nagatacho'] },
];

/** I Palazzi, dove il mondo reale li colloca.
 *
 * Solo quattro hanno un posto dichiarato — Kamoshida a Shujin, Madarame e Kaneshiro a Shibuya,
 * Futaba a Yongen-Jaya — e stanno accanto a quel quartiere. Gli altri nel gioco si raggiungono
 * col Meta-Nav, che non parte da un luogo: stanno in fila lungo il bordo alto, staccati
 * dall'anello, dove si legge che ci sono senza affermare che stiano lì. */
export const RADICI_TOKYO: Record<string, Collocazione> = {
  'dungeon-kamoshida': { x: 44, y: 37, scala: 4.5 },
  'dungeon-madarame': { x: 22, y: 65, scala: 4.6 },
  'dungeon-kaneshiro': { x: 32, y: 66, scala: 4.6 },
  'dungeon-futaba': { x: 11, y: 74, scala: 4.6 },
  'dungeon-okumura': { x: 5, y: 6, scala: 4.2 },
  'dungeon-niijima': { x: 14, y: 6, scala: 4.2 },
  'dungeon-shido': { x: 23, y: 6, scala: 4.2 },
  'dungeon-maruki': { x: 32, y: 6, scala: 4.2 },
  'dungeon-iweleth': { x: 41, y: 6, scala: 4.2 },
  'dungeon-mementos': { x: 50, y: 6, scala: 4.2 },
};

/** Il Covo dei Ladri: la soffitta del Leblanc, a Yongen-Jaya. */
export const COVO_TOKYO: Collocazione = { x: 9, y: 65, scala: 4.6 };

/** I quartieri che stanno sulla mappa del gioco ma non sono una scheda dell'app.
 *
 * Ginza, Kanda, Nagatachō, Akasaka-Mitsuke, Aoyama-Itchōme e la spiaggia di Miura sono fermate
 * della rete e hanno il loro disegno nel foglio originale, ma nella guida non hanno una pagina:
 * non ci sono negozi, attività o Confidenti da elencare. Toglierli lascerebbe la mappa piena di
 * buchi e la Yamanote senza mezze fermate; metterli con un collegamento porterebbe a una pagina
 * vuota. Stanno lì, si leggono, e non si cliccano. */
export const SENZA_SCHEDA_TOKYO: Record<string, string> = {
  'aoyama-itchome': 'Aoyama-Itchōme',
  nagatacho: 'Nagatachō',
  akasaka: 'Akasaka-Mitsuke',
  ginza: 'Ginza',
  kanda: 'Kanda',
  'miura-kaigan': 'Spiaggia di Miura',
};
