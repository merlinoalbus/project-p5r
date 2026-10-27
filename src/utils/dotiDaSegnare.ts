// ============================================================
// dotiDaSegnare — il promemoria delle Doti che il gioco dà, perché l'utente le segni a mano
// ============================================================
//
// Scelta dell'utente (2026-09-30): «fai che i punti Doti Sociali li sposto solo io manualmente e non automaticamente»,
// con promemoria. Spunte, letture, turni, incontri, domande e cruciverba non toccano le Doti: dicono che cosa il gioco dà
// e un avviso lo ricorda («Da segnare nelle Doti: Gentilezza ♪♪ · 3 punti»); in negativo quando si disfa qualcosa che le dava.
// I numeri sono PUNTI (la regola unica `puntiDaNote` del server), con le note accanto quando vengono da una fonte sola: mai un «+3» nudo, che
// si legge come note (segnalazione dell'utente del 2026-10-26: «ho scelto +3 note e poi ora guardo e Perizia è a valore 3»).
// ============================================================

import { notifica } from '../stores/notificationStore';
import { testoDoteInPunti } from '../../shared/note';
import type { DoteDaSegnareDto, EffettiAzioneDto } from '../types';

/** Le Doti di una spunta, sommate per Dote: quelle dell'azione, delle letture, dei turni e dell'incontro (non già contato). Le note restano
 *  solo se la Dote viene da una fonte sola con le note conosciute (sommate non dicono più quante ne ha date il gioco). */
export function dotiDaSegnareDaEffetti(e: EffettiAzioneDto | null | undefined): DoteDaSegnareDto[] {
  if (!e) return [];
  const tutte: DoteDaSegnareDto[] = [
    ...e.doti.map((d) => ({ chiave: d.chiave, nome: d.nome, delta: d.delta, note: d.note })),
    ...(e.letture ?? []).flatMap((l) => (l.doti ?? []).map((d) => ({ chiave: d.chiave, nome: d.nome, delta: d.delta, note: d.note }))),
    ...(e.turni ?? []).flatMap((t) => t.doti.map((d) => ({ chiave: d.chiave, nome: d.nome, delta: d.delta, note: d.note }))),
    ...(e.incontro && !e.incontro.giaContato ? e.incontro.doti.map((d) => ({ chiave: d.chiave, nome: d.nome, delta: d.delta, note: d.note })) : []),
  ].filter((d) => d.delta !== 0);
  const somma = new Map<string, { dote: DoteDaSegnareDto; fonti: number }>();
  for (const d of tutte) {
    const s = somma.get(d.chiave);
    somma.set(d.chiave, s ? { dote: { chiave: d.chiave, nome: s.dote.nome, delta: s.dote.delta + d.delta }, fonti: s.fonti + 1 } : { dote: { chiave: d.chiave, nome: d.nome, delta: d.delta, ...(d.note ? { note: d.note } : {}) }, fonti: 1 });
  }
  return [...somma.values()].map((s) => s.dote).filter((d) => d.delta !== 0);
}

/** «Gentilezza ♪♪ · 3 punti, Conoscenza −2 punti» (`testoDoteInPunti`). */
export function testoDotiDaSegnare(lista: DoteDaSegnareDto[]): string {
  return lista.map((d) => testoDoteInPunti(d)).join(', ');
}

/** «Da segnare nelle Doti: Gentilezza ♪♪ · 3 punti», o null se non c'è niente da segnare. */
export function promemoriaDoti(lista: DoteDaSegnareDto[] | null | undefined): string | null {
  return lista && lista.length > 0 ? `Da segnare nelle Doti: ${testoDotiDaSegnare(lista)}` : null;
}

/** L'avviso del promemoria, se c'è qualcosa da segnare (dura di più: va letto e poi fatto). */
export function avvisaDotiDaSegnare(lista: DoteDaSegnareDto[] | null | undefined, premessa?: string): void {
  const testo = promemoriaDoti(lista);
  if (testo) notifica('info', premessa ? `${premessa} — ${testo}` : testo, 7000);
}
