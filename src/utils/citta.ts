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


/** L'ancora di un luogo nella pagina del quartiere (`#luogo-shibuya-untouchable`): la scheda del negozio ci arriva dalla sede. */
export function ancoraLuogo(chiave: string): string {
  return `luogo-${chiave.replace(/[^a-zA-Z0-9]+/g, '-')}`;
}
