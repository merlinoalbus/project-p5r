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

/** I quartieri sulla mappa di viaggio.
 *
 * Shujin Academy è l'unica la cui sagoma **non viene dal gioco**: nel foglio degli sprite non c'è,
 * perché nel gioco la scuola non è una destinazione del treno — ci si arriva da Aoyama-Itchōme. È
 * stata disegnata apposta nello stesso stile (`docs/grafica/fabbisogno.md`, voce 1) perché senza
 * di lei mancava dalla mappa il luogo dove si passa metà della partita. */
export const QUARTIERI_TOKYO: Record<string, Collocazione> = {
  // ---- la corona della Yamanote, in senso orario da nord ----
  ikebukuro: { x: 51, y: 11, scala: 5.5 },
  ueno: { x: 74, y: 23, scala: 5.5 },
  akihabara: { x: 80.2, y: 42, scala: 7.5 },
  kanda: { x: 75, y: 53, scala: 5.5 },
  ginza: { x: 68, y: 72, scala: 5.5 },
  shinagawa: { x: 39.9, y: 74.7, scala: 5.5 },
  shibuya: { x: 33.4, y: 51.8, scala: 7.5 },
  harajuku: { x: 30.5, y: 39.8, scala: 5.5 },
  // l'unica sagoma non originale: vedi la nota qui sopra
  'shujin-academy': { x: 41.7, y: 38.4, scala: 5.5 },
  shinjuku: { x: 38.8, y: 22, scala: 7.5 },
  // ---- la Chuo, che taglia da ovest a est sopra l'anello ----
  ogikubo: { x: 26, y: 5, scala: 5.5 },
  nakano: { x: 29.5, y: 15.5, scala: 5.5 },
  ichigaya: { x: 49, y: 26.8, scala: 5.5 },
  suidobashi: { x: 68.8, y: 36, scala: 5.5 },
  'kanda-jinbocho': { x: 67, y: 48.5, scala: 5.5 },
  // ---- ovest: la Inokashira ----
  kichijoji: { x: 13.5, y: 15.3, scala: 7 },
  'inokashira-park': { x: 15.6, y: 27.2, scala: 5.5 },
  // ---- sud-ovest ----
  'yongen-jaya': { x: 19.3, y: 50.1, scala: 7.5 },
  'meiji-shrine': { x: 28, y: 27.8, scala: 5.5 },
  // ---- il centro, dentro l'anello ----
  'aoyama-itchome': { x: 46.5, y: 51, scala: 7.5 },
  akasaka: { x: 58, y: 60, scala: 5.5 },
  nagatacho: { x: 57, y: 46, scala: 5.5 },
  roppongi: { x: 50.6, y: 68, scala: 5.5 },
  // ---- nord-est ----
  asakusa: { x: 87, y: 32, scala: 7 },
  // ---- la baia, a est ----
  tsukishima: { x: 71.5, y: 87.5, scala: 5.5 },
  odaiba: { x: 51, y: 92, scala: 7 },
  maihama: { x: 89, y: 70, scala: 6.5 },
  // ---- fuori città, a sud ----
  'yokohama-chinatown': { x: 10, y: 67.5, scala: 7 },
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
  { nome: 'Aoyama–Shujin', colore: '#64748b',
    fermate: ['aoyama-itchome', 'shujin-academy'] },
  { nome: 'Chiyoda', colore: '#14b8a6',
    fermate: ['meiji-shrine', 'harajuku', 'nagatacho'] },
];

/** I Palazzi, dove il mondo reale li colloca.
 *
 * Solo quattro hanno un posto dichiarato — Kamoshida a Shujin, Madarame e Kaneshiro a Shibuya,
 * Futaba a Yongen-Jaya — e stanno accanto a quel quartiere. Gli altri nel gioco si raggiungono
 * col Meta-Nav, che non parte da un luogo: stanno lungo il bordo di nord-est, staccati
 * dall'anello, dove si legge che ci sono senza affermare che stiano lì.
 *
 * **Le posizioni non si sfiorano, e non è un caso.** Sono state calcolate: si misurano i riquadri
 * di figura e targa nel browser e si separano finché non resta una sovrapposizione, poi si
 * riverifica alle tre larghezze. Prima erano in fila lungo il bordo alto ed erano il grosso delle
 * 38 sovrapposizioni contate all'inizio — targhe l'una sull'altra e sopra i quartieri. La prova si
 * rifà con lo script in `docs/MAPPE.md`.
 *
 * `dungeon-mementos` non c'è più: i Memento sono fuori dall'atlante e non hanno un ingresso sulla
 * mappa di viaggio. */
export const RADICI_TOKYO: Record<string, Collocazione> = {
  // i quattro con un posto dichiarato, accanto al loro quartiere
  'dungeon-kamoshida': { x: 53.5, y: 43, scala: 4.5 },
  'dungeon-madarame': { x: 26.7, y: 64.2, scala: 4.6 },
  'dungeon-kaneshiro': { x: 38.9, y: 63.6, scala: 4.6 },
  'dungeon-futaba': { x: 8.7, y: 56.6, scala: 4.6 },
  // i cinque del Meta-Nav, sul bordo di nord-est, dove non c'è rete da attraversare
  'dungeon-okumura': { x: 64, y: 5, scala: 4.2 },
  'dungeon-niijima': { x: 74, y: 5, scala: 4.2 },
  'dungeon-shido': { x: 84, y: 5, scala: 4.2 },
  'dungeon-maruki': { x: 93, y: 5, scala: 4.2 },
  'dungeon-iweleth': { x: 93, y: 17, scala: 4.2 },
};

/** Il Covo dei Ladri: la soffitta del Leblanc, a Yongen-Jaya.
 *
 * Sta nell'angolo libero in basso a sinistra e non addosso a Yongen-Jaya, dove copriva Chinatown:
 * è un rifugio, non una fermata, e l'utente ha detto che può stare in un'area sgombra. */
export const COVO_TOKYO: Collocazione = { x: 13, y: 92, scala: 4.6 };

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
