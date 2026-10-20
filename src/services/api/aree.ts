// ============================================================
// API aree — le Aree del mondo (L2): un quartiere (o Tokyo, per le aree a livello di città) contiene Aree, un'Area contiene
// una o più Planimetrie (versioni). Le rotte hanno il contenitore come parametro (`citta/<quartiere>`; L3 aggiungerà i Palazzi).
// I nomi che coincidono con quelli delle infiltrazioni dei Palazzi (`creaArea`, `aggiornaArea`, `eliminaArea` in compendio.ts)
// hanno il suffisso «Mondo».
// ============================================================

import type { AreaDettaglioDto, AreaRiassuntoDto, MappaDaCollocareDto } from '../../types';
import { apiDelete, apiGet, apiPost, apiPut, inviaFile, queryString } from './_helpers';

/** Il percorso di un'area: `/aree/citta/<quartiere o tokyo>/<slug>`. */
const percorsoArea = (contenitore: string, slug: string) => `/aree/citta/${encodeURIComponent(contenitore)}/${encodeURIComponent(slug)}`;

/** La pagina di un'area: planimetrie (versioni), luoghi sulle sue planimetrie, aree vicine. `contenitore` è la chiave del quartiere,
 *  o `tokyo` per le aree a livello di città. */
export const getArea = (contenitore: string, slug: string, partita?: number): Promise<AreaDettaglioDto> =>
  apiGet(`${percorsoArea(contenitore, slug)}${queryString({ partita })}`);

/** Le aree agganciate alla città (Tokyo): quelle che nessuna fonte colloca in un quartiere, come lo staff (da verificare). */
export const getAreeCitta = (): Promise<AreaRiassuntoDto[]> => apiGet('/aree/citta/tokyo');

/** I dati di una nuova area: nome, etichetta della prima planimetria, punto sull'illustrazione del quartiere (in coppia, 0–100). */
export interface DatiNuovaArea { nome: string; etichetta?: string; x?: number; y?: number }

/** Crea un'area con la sua prima planimetria (l'immagine è il corpo della richiesta) e, se dato il punto, il pin di passaggio
 *  sull'illustrazione del quartiere. Tutto o niente: un errore non lascia nulla di scritto. */
export const creaAreaMondo = (contenitore: string, immagine: File, dati: DatiNuovaArea): Promise<AreaDettaglioDto> =>
  inviaFile('POST', `/aree/citta/${encodeURIComponent(contenitore)}${queryString({ nome: dati.nome, etichetta: dati.etichetta || undefined, x: dati.x, y: dati.y })}`, immagine);

/** Rinomina un'area (l'indirizzo non cambia), ne cambia la planimetria predefinita, o — per un'area da verificare — la tiene. */
export const aggiornaAreaMondo = (contenitore: string, slug: string, dati: { nome?: string; predefinita?: string; daVerificare?: false }): Promise<AreaDettaglioDto> =>
  apiPut(percorsoArea(contenitore, slug), dati);

/** Riordina le aree di un quartiere: tutti gli slug, nell'ordine nuovo. */
export const riordinaAree = (contenitore: string, slug: string[]): Promise<void> =>
  apiPut(`/aree/citta/${encodeURIComponent(contenitore)}/ordine`, { slug });

/** Rimette i valori della guida su un'area corretta dall'utente. */
export const ripristinaAreaMondo = (contenitore: string, slug: string): Promise<AreaDettaglioDto> =>
  apiPost(`${percorsoArea(contenitore, slug)}/ripristina`, {});

/** Elimina un'area (va nel cestino). Con contenuti, senza `conferma`, il server risponde 409 `area-con-contenuti` col riepilogo. */
export const eliminaAreaMondo = (contenitore: string, slug: string, conferma = false): Promise<void> =>
  apiDelete(`${percorsoArea(contenitore, slug)}${queryString({ conferma: conferma ? '1' : undefined })}`);

/** Aggiunge una planimetria (versione) in coda all'area; l'immagine è il corpo della richiesta. */
export const aggiungiPlanimetriaArea = (contenitore: string, slug: string, immagine: File, dati: { etichetta?: string; predefinita?: boolean }): Promise<AreaDettaglioDto> =>
  inviaFile('POST', `${percorsoArea(contenitore, slug)}/planimetrie${queryString({ etichetta: dati.etichetta || undefined, predefinita: dati.predefinita ? '1' : undefined })}`, immagine);

/** Ordine ed etichette delle planimetrie di un'area (chiavi pubbliche). */
export const aggiornaPlanimetrieArea = (contenitore: string, slug: string, dati: { ordine?: string[]; etichette?: Record<string, string | null> }): Promise<AreaDettaglioDto> =>
  apiPut(`${percorsoArea(contenitore, slug)}/planimetrie`, dati);

/** Le planimetrie del mondo che non stanno in nessuna area. */
export const getDaCollocare = (): Promise<MappaDaCollocareDto[]> => apiGet('/aree/da-collocare');

/** Mette una planimetria sciolta in un'area esistente del quartiere (in coda) o in una nuova. */
export const collocaPlanimetria = (dati: { mappa: string; quartiere: string; area?: string; nuova?: { nome: string }; etichetta?: string }): Promise<AreaDettaglioDto> =>
  apiPut('/aree/colloca', dati);
