// ============================================================
// API aree — le Aree del mondo (L2) e dei Palazzi (L3): un quartiere (o Tokyo, per le aree a livello di città) o un Palazzo contiene
// Aree, un'Area contiene una o più Planimetrie (versioni). Le rotte hanno il contenitore come parametro (`citta/<quartiere>`,
// `dungeon/<palazzo>`). I nomi che coincidono con quelli delle infiltrazioni dei Palazzi (`creaArea`, `aggiornaArea`, `eliminaArea`
// in compendio.ts) hanno il suffisso «Mondo».
// ============================================================

import type { AreaDettaglioDto, AreaDungeonDto, AreaRiassuntoDto, ContenitoreAreaDto, MappaDaCollocareDto } from '../../types';
import { apiDelete, apiGet, apiPost, apiPut, inviaFile, queryString } from './_helpers';

/** Il contenitore di un'area: la chiave di un quartiere (o `tokyo`) come in L2, oppure il contenitore dell'area così come lo dà il
 *  server (`{ tipo, chiave }`): i Palazzi (L3) hanno il segmento `dungeon`, il mondo `citta`. */
export type RifContenitore = string | Pick<ContenitoreAreaDto, 'tipo' | 'chiave'>;
/** Il segmento del contenitore nelle rotte: `citta/<quartiere o tokyo>` o `dungeon/<palazzo>`. */
const segmento = (c: RifContenitore) => typeof c === 'string' ? `citta/${encodeURIComponent(c)}` : `${c.tipo === 'dungeon' ? 'dungeon' : 'citta'}/${encodeURIComponent(c.chiave)}`;

/** Il percorso di un'area: `/aree/citta/<quartiere o tokyo>/<slug>` o `/aree/dungeon/<palazzo>/<slug>`. */
const percorsoArea = (contenitore: RifContenitore, slug: string) => `/aree/${segmento(contenitore)}/${encodeURIComponent(slug)}`;

/** La pagina di un'area: planimetrie (versioni), luoghi sulle sue planimetrie, aree vicine. `contenitore` è la chiave del quartiere
 *  (o `tokyo` per le aree a livello di città) oppure il contenitore `{ tipo, chiave }` (i Palazzi). */
export const getArea = (contenitore: RifContenitore, slug: string, partita?: number): Promise<AreaDettaglioDto> =>
  apiGet(`${percorsoArea(contenitore, slug)}${queryString({ partita })}`);

/** Le aree agganciate alla città (Tokyo): quelle che nessuna fonte colloca in un quartiere, come lo staff (da verificare). */
export const getAreeCitta = (): Promise<AreaRiassuntoDto[]> => apiGet('/aree/citta/tokyo');

/** Le aree di un quartiere nel loro ordine; con la partita ognuna dice se è già nel mondo (`disponibile`, `bloccoMotivo`). */
export const getAreeDelQuartiere = (quartiere: string, partita?: number): Promise<AreaRiassuntoDto[]> =>
  apiGet(`/aree/citta/${encodeURIComponent(quartiere)}${queryString({ partita })}`);

/** La condizione propria di un'area (migrazione 303: il Covo dei Ladri dal 5 maggio), in AND con il quartiere e ereditata dai suoi
 *  luoghi; un elenco vuoto la toglie. Gli inviti dei Confidenti restano separati. */
export const aggiornaSbloccoAreaMondo = (contenitore: RifContenitore, slug: string, condizioni: unknown[]): Promise<AreaDettaglioDto> =>
  apiPut(`${percorsoArea(contenitore, slug)}/sblocco`, { condizioni });

/** I dati di una nuova area: nome, etichetta della prima planimetria, punto sull'illustrazione del quartiere (in coppia, 0–100) e,
 *  nei Palazzi (L3), le infiltrazioni da collegare. */
export interface DatiNuovaArea { nome: string; etichetta?: string; x?: number; y?: number; infiltrazioni?: string[] }

/** Crea un'area con la sua prima planimetria (l'immagine è il corpo della richiesta) e, se dato il punto, il pin di passaggio
 *  sull'illustrazione del quartiere; nei Palazzi i legami con le infiltrazioni. Tutto o niente: un errore non lascia nulla di scritto. */
export const creaAreaMondo = (contenitore: RifContenitore, immagine: File, dati: DatiNuovaArea): Promise<AreaDettaglioDto> =>
  inviaFile('POST', `/aree/${segmento(contenitore)}${queryString({ nome: dati.nome, etichetta: dati.etichetta || undefined, x: dati.x, y: dati.y, infiltrazioni: dati.infiltrazioni?.length ? dati.infiltrazioni.join(',') : undefined })}`, immagine);

/** Rinomina un'area (l'indirizzo non cambia), ne cambia la planimetria predefinita, o — per un'area da verificare — la tiene. */
export const aggiornaAreaMondo = (contenitore: RifContenitore, slug: string, dati: { nome?: string; predefinita?: string; daVerificare?: false }): Promise<AreaDettaglioDto> =>
  apiPut(percorsoArea(contenitore, slug), dati);

/** Riordina le aree di un quartiere (o di un Palazzo): tutti gli slug, nell'ordine nuovo. */
export const riordinaAree = (contenitore: RifContenitore, slug: string[]): Promise<void> =>
  apiPut(`/aree/${segmento(contenitore)}/ordine`, { slug });

/** Rimette i valori della guida su un'area corretta dall'utente. */
export const ripristinaAreaMondo = (contenitore: RifContenitore, slug: string): Promise<AreaDettaglioDto> =>
  apiPost(`${percorsoArea(contenitore, slug)}/ripristina`, {});

/** Elimina un'area (va nel cestino). Con contenuti, senza `conferma`, il server risponde 409 `area-con-contenuti` col riepilogo. */
export const eliminaAreaMondo = (contenitore: RifContenitore, slug: string, conferma = false): Promise<void> =>
  apiDelete(`${percorsoArea(contenitore, slug)}${queryString({ conferma: conferma ? '1' : undefined })}`);

/** Aggiunge una planimetria (versione) in coda all'area; l'immagine è il corpo della richiesta. */
export const aggiungiPlanimetriaArea = (contenitore: RifContenitore, slug: string, immagine: File, dati: { etichetta?: string; predefinita?: boolean }): Promise<AreaDettaglioDto> =>
  inviaFile('POST', `${percorsoArea(contenitore, slug)}/planimetrie${queryString({ etichetta: dati.etichetta || undefined, predefinita: dati.predefinita ? '1' : undefined })}`, immagine);

/** Ordine ed etichette delle planimetrie di un'area (chiavi pubbliche). */
export const aggiornaPlanimetrieArea = (contenitore: RifContenitore, slug: string, dati: { ordine?: string[]; etichette?: Record<string, string | null> }): Promise<AreaDettaglioDto> =>
  apiPut(`${percorsoArea(contenitore, slug)}/planimetrie`, dati);

/** L3 (R3-23, dall'area): le infiltrazioni che toccano un'Area di un Palazzo, l'insieme che sostituisce quello di prima. Non sposta
 *  voci né pin. */
export const impostaInfiltrazioniArea = (contenitore: RifContenitore, slug: string, infiltrazioni: string[]): Promise<AreaDettaglioDto> =>
  apiPut(`${percorsoArea(contenitore, slug)}/infiltrazioni`, { infiltrazioni });

/** L3 (R3-23, dall'infiltrazione): le Aree del Palazzo che un'infiltrazione tocca, in ordine (slug), con la versione da aprire per
 *  ciascuna. Lo stesso legame di `impostaInfiltrazioniArea`, visto dall'altro lato. */
export const impostaAreeInfiltrazione = (infiltrazione: string, aree: string[], planimetrieIniziali?: Record<string, string | null>, partita?: number): Promise<AreaDungeonDto> =>
  apiPut(`/compendio/aree/${encodeURIComponent(infiltrazione)}/aree-palazzo${queryString({ partita })}`, { aree, ...(planimetrieIniziali ? { planimetrieIniziali } : {}) });

/** Le planimetrie del mondo (e dei Palazzi) che non stanno in nessuna area. */
export const getDaCollocare = (): Promise<MappaDaCollocareDto[]> => apiGet('/aree/da-collocare');

/** Mette una planimetria in un'area esistente del quartiere o del Palazzo (in coda) o in una nuova: le sciolte del mondo (L2) e, nei
 *  Palazzi (L3), «Sposta la versione in un'altra area» / «Rendila un'area a sé». Se la versione è l'unica della sua Area, senza
 *  `conferma` il server risponde 409 `area-si-svuota` (col messaggio da mostrare); con `conferma` l'Area svuotata va nel cestino e i suoi
 *  legami passano all'area d'arrivo (L3 §3.6.1). */
export const collocaPlanimetria = (dati: { mappa: string; area?: string; nuova?: { nome: string }; etichetta?: string } & ({ quartiere: string } | { dungeon: string }), opz: { conferma?: boolean } = {}): Promise<AreaDettaglioDto> =>
  apiPut(`/aree/colloca${queryString({ conferma: opz.conferma ? '1' : undefined })}`, dati);
