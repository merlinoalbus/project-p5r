// ============================================================
// rotteGiocatore — l'elenco esplicito delle rotte che l'istanza di rilascio monta (L12, passo 5; progetto §3)
// ============================================================
//
// Nel rilascio si nega tutto salvo ciò che sta qui, per metodo e percorso. Non è un filtro che guarda l'URL della richiesta (un
// `GET /api/mappe/esporta` assomiglia a `GET /api/mappe/:chiave` e passerebbe): è un montaggio selettivo. Da ogni router di area
// (`ROUTER_DI_AREA`) si costruisce un router nuovo con le sole rotte dell'elenco, con gli stessi gestori e nello stesso ordine; le altre
// non esistono, e la richiesta cade nel 404 JSON di `/api/*`. I router originali restano intatti (la preparazione e i test li
// montano per intero).
//
// L'elenco è stato ricavato da ciò che l'interfaccia del giocatore chiama davvero (`src/services/api/*` e i componenti che le usano):
//   - tutto `/api/partite/:id/*` (l'avanzamento è l'unica cosa che il giocatore scrive), tranne `acquisti/legacy`;
//   - le LETTURE di guida, mappe, aree, compendio, catalogo, fusione, ricerca, traduzioni, regole di pesca, immagini, caratteri;
//   - da `condizioni`: valuta, progressi, eventi, attività, punti-negozio (il tracciamento della partita);
//   - `health` e `config` stanno in `bootstrap` e ci sono sempre.
// Restano solo preparazione: ogni scrittura dei contenuti (comprese le voci del diario), le letture diagnostiche e di servizio degli
// editor (elenchi per i selettori, esportazione, verifiche, censimenti), luoghi, correzioni, impostazioni, deposito, importazione e
// esportazione, upload di immagini e caratteri, documentazione delle API, le decisioni sulle proposte di effetto del diario.
//
// Due difese contro la deriva, entrambe all'avvio (`createApp` le chiama: una voce che non va fa fallire l'avvio, non un 404 a caso
// in esercizio): (1) ogni voce dell'elenco deve corrispondere a una rotta davvero montata (un percorso rinominato o tolto non lascia
// una voce morta che pare protegga qualcosa); (2) le sole scritture ammesse sono quelle dell'avanzamento (`/api/partite`,
// `/api/condizioni/partite/…`, `/api/condizioni/valuta`): un refuso in questo file non può aprire la scrittura dei contenuti.
// ============================================================

import { Router, type RequestHandler } from 'express';
import { METODI, rotteDellaPila, type LayerRotta } from '../openapi/rotte.js';
import { ROUTER_DI_AREA } from '../routes/index.js';

/** Le rotte ammesse una per una, nella forma «METODO /percorso» con la sintassi di Express (come `chiaveRotta`). */
export const ROTTE_DEL_GIOCATORE: readonly string[] = [
  // ---- compendio: le letture (guida, schede, diario, mondo, calendario) ----
  'GET /api/compendio/glossario',
  'GET /api/compendio/termini',
  'GET /api/compendio/fusione/regole',
  'GET /api/compendio/persona',
  'GET /api/compendio/persona/:id',
  'GET /api/compendio/skill',
  'GET /api/compendio/skill/:id',
  'GET /api/compendio/oggetti',
  'GET /api/compendio/oggetti-guida',
  'GET /api/compendio/personaggi',
  'GET /api/compendio/sfide',
  'GET /api/compendio/completamento',
  'GET /api/compendio/percorso',
  'GET /api/compendio/percorso/:data',
  'GET /api/compendio/percorso/voci/:uid',
  'GET /api/compendio/negozi',
  'GET /api/compendio/negozi/:chiave',
  'GET /api/compendio/articoli',
  'GET /api/compendio/luoghi/:quartiere/:luogo',
  'GET /api/compendio/inviti',
  'GET /api/compendio/cruciverba',
  'GET /api/compendio/citta',
  'GET /api/compendio/citta/:chiave',
  'GET /api/compendio/attivita',
  'GET /api/compendio/libri',
  'GET /api/compendio/film',
  'GET /api/compendio/videogiochi',
  'GET /api/compendio/battaglia',
  'GET /api/compendio/ombre',
  'GET /api/compendio/ombre/:chiave',
  'GET /api/compendio/negoziazione',
  'GET /api/compendio/richieste',
  'GET /api/compendio/dungeon',
  'GET /api/compendio/dungeon/:chiave',
  'GET /api/compendio/calendario',
  'GET /api/compendio/calendario/voci/:uid',
  'GET /api/compendio/domande',
  'GET /api/compendio/confidenti',
  'GET /api/compendio/confidenti/:chiave',
  'GET /api/compendio/confidenti/:chiave/requisiti',
  'GET /api/compendio/confidenti/:chiave/disponibilita-strutturata',
  'GET /api/compendio/confidenti/:chiave/ranghi',

  // ---- traduzioni, immagini, caratteri: solo letture ----
  'GET /api/traduzioni',
  'GET /api/immagini',
  'GET /api/immagini/manifest',
  'GET /api/immagini/:ambito/:chiave/file',
  'GET /api/font',
  'GET /api/font/:ruolo/file',

  // ---- fusione: tutte le letture ----
  'GET /api/fusione/fondi',
  'GET /api/fusione/ricette/:personaId',
  'GET /api/fusione/con/:personaId',
  'GET /api/fusione/piani/:personaId',
  'GET /api/fusione/eredita',
  'GET /api/fusione/cerca-skill',
  'GET /api/fusione/cicli/:personaId',
  'GET /api/fusione/velluto',

  // ---- mappe e aree: le letture di chi consulta ----
  'GET /api/mappe/risolvi/:chiave',
  'GET /api/mappe/contenuti/:chiave',
  'GET /api/mappe/accesso/:tipo/:chiave',
  'GET /api/mappe/albero',
  'GET /api/mappe/gerarchia',
  'GET /api/mappe/:chiave',
  'GET /api/mappe/:chiave/guida',
  'GET /api/aree/:contenitore/:chiave',
  'GET /api/aree/:contenitore/:chiave/:slug',

  // ---- catalogo e oggetti: letture ----
  'GET /api/catalogo',
  'GET /api/catalogo/oggetti',
  'GET /api/catalogo/:tipo',
  'GET /api/catalogo/:tipo/:chiave',
  'GET /api/catalogo-oggetti',
  'GET /api/catalogo-oggetti/:categoria/:slug',

  // ---- ricerca e regole di pesca: letture ----
  'GET /api/ricerca',
  'GET /api/pesca/regola/:chiave',

  // ---- condizioni: la valutazione e il tracciamento dell'avanzamento (le scritture finiscono in `utente`) ----
  'POST /api/condizioni/valuta',
  'GET /api/condizioni/partite/:partita/progressi',
  'PUT /api/condizioni/partite/:partita/eventi/:chiave',
  'PUT /api/condizioni/partite/:partita/attivita/:chiave',
  'PUT /api/condizioni/partite/:partita/punti-negozio/:chiave',
];

/** Le rotte della partita: tutto `/api/partite…` (comprese `/api/partite/:id/pesca` e, con il passo 3, `/api/partite/:id/cestino`)
 *  salvo gli acquisti legacy, che toccano il vecchio schema. Una famiglia e non un elenco: le scrive la partita, mai i contenuti. */
function eDellaPartita(percorso: string): boolean {
  if (percorso !== '/api/partite' && !percorso.startsWith('/api/partite/')) return false;
  return !percorso.startsWith('/api/partite/:id/acquisti/legacy');
}

/** Le sole scritture che l'istanza di rilascio può avere: l'avanzamento della partita (e la valutazione, che è un POST di lettura). */
const SCRITTURE_AMMESSE = /^\/api\/(partite(\/|$)|condizioni\/(valuta$|partite\/))/;

/** Vero se la rotta (metodo minuscolo, percorso completo con il prefisso) è fra quelle del giocatore. */
export function eRottaDelGiocatore(metodo: string, percorso: string): boolean {
  return ELENCO.has(`${metodo.toUpperCase()} ${percorso}`) || eDellaPartita(percorso);
}

const ELENCO: ReadonlySet<string> = new Set(ROTTE_DEL_GIOCATORE);

/** Tutte le rotte dei router di area, come metodo e percorso completo (la base su cui l'elenco si confronta). */
function rotteDiArea(area: ReadonlyArray<readonly [string, Router]>): Array<{ metodo: string; percorso: string }> {
  return area.flatMap(([prefisso, router]) => rotteDellaPila((router as Router & { stack: LayerRotta[] }).stack, prefisso, prefisso));
}

/**
 * Le due difese contro la deriva (vedi l'intestazione). Lancia con l'elenco di tutto ciò che non torna, così un solo avvio dice
 * ogni problema. Chiamata da `createApp` in modalità rilascio, prima di montare i router.
 */
export function verificaElencoGiocatore(area: ReadonlyArray<readonly [string, Router]> = ROUTER_DI_AREA): void {
  const montate = rotteDiArea(area);
  const chiavi = new Set(montate.map((r) => `${r.metodo.toUpperCase()} ${r.percorso}`));
  const problemi: string[] = [];
  for (const voce of ROTTE_DEL_GIOCATORE) if (!chiavi.has(voce)) problemi.push(`voce senza rotta montata: ${voce}`);
  if (ELENCO.size !== ROTTE_DEL_GIOCATORE.length) problemi.push('voci ripetute nell\'elenco delle rotte del giocatore');
  if (!montate.some((r) => eDellaPartita(r.percorso))) problemi.push('nessuna rotta della partita montata');
  for (const r of montate) {
    if (r.metodo === 'get' || !eRottaDelGiocatore(r.metodo, r.percorso)) continue;
    if (!SCRITTURE_AMMESSE.test(r.percorso)) problemi.push(`scrittura ammessa fuori dall'avanzamento: ${r.metodo.toUpperCase()} ${r.percorso}`);
  }
  if (problemi.length > 0) throw new Error(`elenco delle rotte del giocatore incoerente con le rotte montate: ${problemi.join('; ')}`);
}

/** Il risultato del montaggio selettivo: i router da montare e quante rotte sono entrate e quante no (per il log di avvio). */
export interface RouterDelGiocatore {
  router: Array<readonly [string, Router]>;
  ammesse: number;
  escluse: number;
}

/**
 * Da ogni router di area ne costruisce uno con le sole rotte del giocatore. I layer senza rotta (i `router.use`, come il
 * `no-store` della pesca) si portano dietro nella loro posizione; le opzioni del router (`mergeParams`, `strict`,
 * `caseSensitive`) si ricopiano, altrimenti `/api/partite/:id/pesca` perderebbe l'`:id` del prefisso.
 */
export function routerDelGiocatore(area: ReadonlyArray<readonly [string, Router]> = ROUTER_DI_AREA): RouterDelGiocatore {
  let ammesse = 0;
  let escluse = 0;
  const router: Array<readonly [string, Router]> = [];
  for (const [prefisso, originale] of area) {
    const opzioni = originale as unknown as { mergeParams?: boolean; strict?: boolean; caseSensitive?: boolean };
    const nuovo = Router({ mergeParams: opzioni.mergeParams, strict: opzioni.strict, caseSensitive: opzioni.caseSensitive });
    const pilaNuovo = (nuovo as unknown as { stack: unknown[] }).stack;
    for (const layer of (originale as Router & { stack: LayerRotta[] }).stack) {
      if (!layer.route) { pilaNuovo.push(layer); continue; }
      const completo = prefisso + (layer.route.path === '/' && prefisso ? '' : layer.route.path);
      const rotta = nuovo.route(layer.route.path);
      let tenuta = false;
      for (const metodo of METODI) {
        if (!layer.route.methods[metodo]) continue;
        if (!eRottaDelGiocatore(metodo, completo)) { escluse++; continue; }
        // i gestori di una rotta con più metodi si distinguono per `method`; senza, valgono per tutti (come in `rotteDellaPila`)
        const gestori = layer.route.stack.filter((s) => !s.method || s.method === metodo).map((s) => s.handle) as unknown as RequestHandler[];
        rotta[metodo](...gestori);
        ammesse++;
        tenuta = true;
      }
      // una rotta senza alcun metodo ammesso non deve restare nella pila: un `route` vuoto non risponde, ma sporca il percorso
      if (!tenuta) pilaNuovo.pop();
    }
    router.push([prefisso, nuovo]);
  }
  return { router, ammesse, escluse };
}
