// ============================================================
// planimetriaDiPalazzo — una planimetria di prova in un Palazzo, come la crea L3: dentro un'Area sua
// ============================================================
//
// Da L3 (migrazione 110, R3-26) nei Palazzi una planimetria non nasce sciolta: `POST /api/mappe` sotto `dungeon-<k>` è 409
// `usa-aggiungi-area`, e la strada è «Aggiungi area» / «Aggiungi planimetria» (`/api/aree/dungeon/…`, con l'immagine). I test che
// prima creavano una planimetria con `creaMappa` come preparazione (per legarle infiltrazioni, pin, pezzi, un atterraggio) la creano
// qui: la stessa riga di prima, poi un'Area tutta sua con la regola della 110 (`assegnaAreePalazzi`), come l'avrebbe avuta se fosse
// esistita prima di L3.
// ============================================================

import { getDb } from '../server/db/dbService.js';
import { creaMappa, dettaglioMappa, type DatiMappa } from '../server/services/mappe/mappeService.js';
import { assegnaAreePalazzi } from '../server/services/mappe/areeService.js';
import type { MappaDto } from '../shared/types.js';

/** Una planimetria nuova sotto `dungeon-<palazzo>` (tipo `area` se non detto), nella sua Area. Restituisce la mappa com'è dopo. */
export function planimetriaDiPalazzo(palazzo: string, dati: Omit<DatiMappa, 'genitore'> & { nome: string }): MappaDto {
  const m = creaMappa(undefined, { tipo: 'area', ...dati, genitore: `dungeon-${palazzo}` } as DatiMappa & { nome: string; tipo: 'area' }, { dallArea: true });
  assegnaAreePalazzi(getDb());
  return dettaglioMappa(m.chiave);
}
