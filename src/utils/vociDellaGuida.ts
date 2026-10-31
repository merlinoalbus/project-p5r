// ============================================================
// vociDellaGuida — le regole pure delle voci della guida comuni alla scheda del Palazzo (`GuidaDellArea`) e alla guida del visore
// (`GuidaNelVisore`): descrittiva, conteggi delle segnate e delle da segnare, voce segnata in vista
// ============================================================

import { puntoDescrittivo } from '../../shared/spilli';
import type { PuntoInteresseDto } from '../types';

/** Una voce descrittiva si legge e basta (niente stato, niente pin): la regola unica del server (`puntoDescrittivo`), con il carattere
 *  (un «Altro» permanente o rigenerabile si segna, 2026-10-31) e senza descrittive nelle aree dei dedali (099). */
export const voceDescrittiva = (p: Pick<PuntoInteresseDto, 'tipo' | 'areaDedalo' | 'carattere'>): boolean => puntoDescrittivo(p.tipo, p.areaDedalo, p.carattere);

/** Quante voci sono segnate, senza le descrittive. */
export const quanteSegnate = (voci: readonly PuntoInteresseDto[]): number => voci.filter((p) => p.stato && !voceDescrittiva(p)).length;

/** Quante voci sono ancora da segnare, senza le descrittive. */
export const quanteDaSegnare = (voci: readonly PuntoInteresseDto[]): number => voci.filter((p) => !p.stato && !voceDescrittiva(p)).length;

/**
 * Una voce segnata resta nascosta salvo che si mostrino anche le segnate («Anche le segnate» nella scheda, «Anche le fatte» nel visore), che
 * sia quella aperta o (nel visore) che sia di un pin selezionato sulla mappa. Una voce non segnata si vede sempre.
 */
export const segnataInVista = (p: Pick<PuntoInteresseDto, 'chiave' | 'stato'>, o: { anche: boolean; aperta: string | null; evidenziata?: boolean }): boolean =>
  o.anche || !p.stato || p.chiave === o.aperta || !!o.evidenziata;
