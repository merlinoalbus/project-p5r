// ============================================================
// Router di area — i prefissi `/api/<area>` e i router che li servono, nell'ordine di montaggio
// ============================================================
//
// Un elenco solo, letto da due parti: `bootstrap` monta i router, la documentazione OpenAPI
// (`server/openapi/rotte.ts`) ne legge le rotte con lo stesso prefisso. Sta in un modulo a sé perché
// la documentazione è servita da `bootstrap`: se l'elenco stesse lì, i due moduli si importerebbero
// a vicenda.
// ============================================================

import type { Router } from 'express';
import compendioRouter from './compendio.js';
import disponibilitaStrutturataRouter from './disponibilitaStrutturata.js';
import traduzioniRouter from './traduzioni.js';
import partiteRouter from './partite.js';
import immaginiRouter from './immagini.js';
import fusioneRouter from './fusione.js';
import mappeRouter from './mappe.js';
import fontRouter from './font.js';
import impostazioniRouter from './impostazioni.js';
import catalogoRouter from './catalogo.js';
import catalogoOggettiRouter from './catalogoOggetti.js';
import condizioniRouter from './condizioni.js';
import areeRouter from './aree.js';
import luoghiRouter from './luoghi.js';
import ricercaRouter from './ricerca.js';
import regolePescaRouter from './regolePesca.js';
import pescaRouter from './pesca.js';

/** I router di area con il loro prefisso, nell'ordine di montaggio. */
export const ROUTER_DI_AREA: ReadonlyArray<readonly [string, Router]> = [
  ['/api/compendio', compendioRouter],
  ['/api/compendio', disponibilitaStrutturataRouter],
  ['/api/traduzioni', traduzioniRouter],
  ['/api/partite', partiteRouter],
  ['/api/immagini', immaginiRouter],
  ['/api/fusione', fusioneRouter],
  ['/api/mappe', mappeRouter],
  ['/api/font', fontRouter],
  ['/api/impostazioni', impostazioniRouter],
  ['/api/catalogo', catalogoRouter],
  ['/api/catalogo-oggetti', catalogoOggettiRouter],
  ['/api/condizioni', condizioniRouter],
  ['/api/aree', areeRouter],
  ['/api/luoghi', luoghiRouter],
  ['/api/ricerca', ricercaRouter],
  ['/api/pesca', regolePescaRouter],
  ['/api/partite/:id/pesca', pescaRouter],
];
