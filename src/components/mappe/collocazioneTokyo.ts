// ============================================================
// Dove sta ogni cosa sulla mappa di Tokyo — collocazione autorata
// ============================================================
//
// **Queste posizioni non vengono dal gioco.** Vanno dette per prime, perché tutto il resto
// dell'atlante è estratto e dimostrato, e confondere una cosa scritta a mano con una cosa provata
// è il modo in cui un dato falso sopravvive per mesi.
//
// I *disegni* sono originali: sono gli sprite `_lm` di `P5_MAPDATA.SPD`, il 105 di Shibuya, il
// Kabukichō di Shinjuku, la ruota di Odaiba, il Kaminarimon di Asakusa. Le *collocazioni* no: il
// campo `resa` di ogni sprite vale sempre metà larghezza e metà altezza — è il perno con cui il
// gioco àncora l'immagine, non il posto dove la mette — e nel foglio non c'è nient'altro. Le
// posizioni della schermata di viaggio stanno probabilmente in `LMAP.BF`, che non è ancora
// decifrato.
//
// Nel frattempo queste sono disposte secondo la geografia vera di Tokyo, che è anche quella che il
// gioco segue: la linea Yamanote a corona, Shinjuku e Shibuya a ovest, Akihabara e Ueno a
// nord-est, la baia in basso a destra con Odaiba e Maihama, Yokohama fuori a sud. Servono a
// leggere il mondo, non a misurarlo: nessuna distanza qui è in scala, e non va usata per dedurre
// niente.
//
// Coordinate in percentuale della tela, `x` da sinistra e `y` dall'alto, riferite al **centro**
// del disegno.
// ============================================================

export interface Collocazione {
  x: number;
  y: number;
  /** Larghezza del disegno in percentuale della tela: i quartieri grandi si vedono più grandi. */
  scala: number;
}

/** I quartieri, alla loro posizione approssimativa nella Tokyo vera. */
export const QUARTIERI_TOKYO: Record<string, Collocazione> = {
  // ovest
  ogikubo: { x: 9, y: 40, scala: 8 },
  kichijoji: { x: 5, y: 50, scala: 10 },
  'inokashira-park': { x: 9, y: 60, scala: 9 },
  nakano: { x: 18, y: 41, scala: 8 },
  // corona della Yamanote, lato ovest
  ikebukuro: { x: 30, y: 22, scala: 8 },
  shinjuku: { x: 28, y: 37, scala: 12 },
  harajuku: { x: 30, y: 52, scala: 9 },
  'meiji-shrine': { x: 24, y: 48, scala: 8 },
  shibuya: { x: 31, y: 60, scala: 13 },
  'yongen-jaya': { x: 24, y: 70, scala: 12 },
  // centro
  ichigaya: { x: 41, y: 34, scala: 8 },
  'aoyama-itchome': { x: 39, y: 53, scala: 12 },
  'shujin-academy': { x: 44, y: 58, scala: 8 },
  nagatacho: { x: 45, y: 46, scala: 9 },
  akasaka: { x: 43, y: 50, scala: 8 },
  roppongi: { x: 40, y: 60, scala: 9 },
  // nord ed est
  suidobashi: { x: 51, y: 30, scala: 8 },
  'kanda-jinbocho': { x: 55, y: 33, scala: 8 },
  kanda: { x: 59, y: 33, scala: 7 },
  akihabara: { x: 62, y: 30, scala: 12 },
  ueno: { x: 66, y: 22, scala: 8 },
  asakusa: { x: 73, y: 18, scala: 11 },
  // baia
  ginza: { x: 60, y: 47, scala: 8 },
  tsukishima: { x: 65, y: 55, scala: 9 },
  odaiba: { x: 74, y: 63, scala: 13 },
  maihama: { x: 85, y: 50, scala: 11 },
  // sud
  shinagawa: { x: 48, y: 72, scala: 8 },
  'yokohama-chinatown': { x: 40, y: 87, scala: 12 },
  'miura-kaigan': { x: 28, y: 93, scala: 11 },
};

/** I Palazzi e le altre radici, dove il mondo reale li colloca.
 *
 * Solo quattro hanno un posto dichiarato — Kamoshida a Shujin, Madarame e Kaneshiro a Shibuya,
 * Futaba a Yongen-Jaya. Gli altri nel gioco si raggiungono col Meta-Nav, che non parte da un
 * luogo: si mettono lungo il bordo inferiore, dove si legge che ci sono senza affermare che
 * stiano lì. */
export const RADICI_TOKYO: Record<string, Collocazione> = {
  'dungeon-kamoshida': { x: 44, y: 64, scala: 7 },
  'dungeon-madarame': { x: 35, y: 64, scala: 7 },
  'dungeon-kaneshiro': { x: 28, y: 64, scala: 7 },
  'dungeon-futaba': { x: 20, y: 76, scala: 7 },
  // senza un punto del mondo reale dichiarato: in fila, staccati dai quartieri
  'dungeon-okumura': { x: 12, y: 12, scala: 6 },
  'dungeon-niijima': { x: 20, y: 12, scala: 6 },
  'dungeon-shido': { x: 28, y: 12, scala: 6 },
  'dungeon-maruki': { x: 36, y: 12, scala: 6 },
  'dungeon-iweleth': { x: 44, y: 12, scala: 6 },
  'dungeon-mementos': { x: 52, y: 12, scala: 6 },
};

/** Il Covo dei Ladri: la soffitta del Leblanc, che sta a Yongen-Jaya. */
export const COVO_TOKYO: Collocazione = { x: 16, y: 66, scala: 6 };
