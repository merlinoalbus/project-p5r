// ============================================================
// disponibilita — testo dei motivi per cui un articolo o un negozio non è (ancora) disponibile (fuori dai componenti per il fast refresh)
// ============================================================

import type { DisponibilitaDto } from '../types';

/** Requisiti non verdi, uno per riga: «testo — dettaglio». */
export function motiviDisponibilita(d: DisponibilitaDto): string {
  return d.requisiti.filter((r) => r.stato !== 'verde').map((r) => (r.dettaglio ? `${r.testo} — ${r.dettaglio}` : r.testo)).join(' · ');
}
