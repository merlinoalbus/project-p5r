// ============================================================
// citta — etichette dei tipi di luogo, attività e Doti (Fase 8.1)
// ============================================================

import { TIPI_LUOGO } from '../../shared/tipiLuogo';
import { NOMI_DOTI } from '../../shared/doti';

/** Etichette dei tipi di luogo: derivate dal catalogo condiviso (shared/tipiLuogo). */
export const NOME_TIPO_LUOGO: Record<string, string> = Object.fromEntries(TIPI_LUOGO.map((t) => [t.chiave, t.nome]));

/** I nomi delle Doti, nell'ordine della scheda «Doti sociali»: la fonte unica è `shared/doti.ts`. */
export const NOME_DOTE: Record<string, string> = NOMI_DOTI;

/** Colori degli spilli dei luoghi sulla mappa del quartiere: dal catalogo condiviso. */
export const COLORE_TIPO_LUOGO: Record<string, string> = Object.fromEntries(TIPI_LUOGO.map((t) => [t.chiave, t.colore]));


/** L5: la pagina di un luogo (`chiave` = «quartiere/luogo»), con l'ancora di un suo negozio (`#negozio-<chiave>`) se data. */
export function urlLuogo(chiave: string, negozio?: string): string {
  return `/guida/luogo/${chiave.split('/').map(encodeURIComponent).join('/')}${negozio ? `#${ancoraNegozio(negozio)}` : ''}`;
}

/** L'ancora di un negozio nella pagina del suo luogo (`#negozio-untouchable`). */
export function ancoraNegozio(chiave: string): string {
  return `negozio-${chiave.replace(/[^a-zA-Z0-9]+/g, '-')}`;
}

/** L'ancora di un luogo nella pagina del quartiere (`#luogo-shibuya-untouchable`): la scheda del negozio ci arriva dalla sede. */
export function ancoraLuogo(chiave: string): string {
  return `luogo-${chiave.replace(/[^a-zA-Z0-9]+/g, '-')}`;
}
