// ============================================================
// gestiGuida — i gesti sulle voci della guida nella partita, comuni alla scheda del Palazzo e dei Memento (`DungeonDettaglioPage`), alla
// guida del visore (`GuidaNelVisore`) e alle viste con le piastrelle di cattura (`useCatturaPersona`)
// ============================================================

import { aggiornaCompendio, impostaStatoPunto } from './api';
import { notifica } from '../stores/notificationStore';
import { testoVociDelGesto } from '../utils/gestiVoce';
import type { CompendioPartitaDto, PuntoInteresseDto, StatoPunto } from '../types';

/**
 * Salva lo stato di una voce nella partita (`PUT /api/partite/:id/punti`; null = riapri) e dice a parole le altre voci che il gesto ha
 * toccato (L4 §8.11: il gesto sulla voce tocca tutti i suoi pin, e con loro le altre voci che li condividono; il server dice quali), con
 * l'infiltrazione di ognuna se `infiltrazioni` le ha. `conferma`, se c'è, è notificata prima di loro. Risponde con la voce aggiornata;
 * l'errore resta a chi chiama.
 */
export async function salvaStatoVoce(partitaId: number, voce: string, stato: StatoPunto | null,
  infiltrazioni: ReadonlyArray<{ chiave: string; ordine: number }> | undefined, conferma?: string): Promise<PuntoInteresseDto> {
  const nuovo = await impostaStatoPunto(partitaId, voce, stato);
  if (conferma) notifica('success', conferma);
  if (nuovo.effetti?.segnate.length) notifica('info', `Segnate anche: ${testoVociDelGesto(nuovo.effetti.segnate, infiltrazioni)}.`);
  if (nuovo.effetti?.riaperte.length) notifica('info', `Riaperte anche: ${testoVociDelGesto(nuovo.effetti.riaperte, infiltrazioni)}.`);
  return nuovo;
}

/**
 * La cattura di una Persona o il suo annullo (L8, R8-13): la registra o la toglie dal compendio della partita
 * (`PUT /api/partite/:id/compendio/:persona`), con la chiave dell'Ombra dell'incontro se catturata, perché il server ne controlli la
 * catturabilità. Risponde col compendio della partita; l'errore resta a chi chiama.
 */
export function catturaNelCompendio(partitaId: number, personaId: number, catturata: boolean, ombra?: string): Promise<CompendioPartitaDto[]> {
  return aggiornaCompendio(partitaId, personaId, { registrata: catturata, ...(catturata && ombra ? { ombra } : {}) });
}
