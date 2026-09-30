// ============================================================
// dotiDaSegnare — il promemoria delle Doti che il gioco dà, perché l'utente le segni a mano
// ============================================================
//
// Scelta dell'utente (2026-09-30): «fai che i punti Doti Sociali li sposto solo io manualmente e non automaticamente»,
// con promemoria. Spunte, letture, turni, incontri, domande e cruciverba non toccano le Doti: dicono che cosa il gioco dà
// e un avviso lo ricorda («Da segnare nelle Doti: Gentilezza +3»); in negativo quando si disfa qualcosa che le dava.
// ============================================================

import { notifica } from '../stores/notificationStore';
import type { DoteDaSegnareDto, EffettiAzioneDto } from '../types';

/** Le Doti di una spunta, sommate per Dote: quelle dell'azione, delle letture, dei turni e dell'incontro (non già contato). */
export function dotiDaSegnareDaEffetti(e: EffettiAzioneDto | null | undefined): DoteDaSegnareDto[] {
  if (!e) return [];
  const tutte: DoteDaSegnareDto[] = [
    ...e.doti.map((d) => ({ chiave: d.chiave, nome: d.nome, delta: d.delta })),
    ...(e.letture ?? []).flatMap((l) => l.doti ?? []),
    ...(e.turni ?? []).flatMap((t) => t.doti.map((d) => ({ chiave: d.chiave, nome: d.nome, delta: d.delta }))),
    ...(e.incontro && !e.incontro.giaContato ? e.incontro.doti.map((d) => ({ chiave: d.chiave, nome: d.nome, delta: d.delta })) : []),
  ];
  const somma = new Map<string, DoteDaSegnareDto>();
  for (const d of tutte) {
    const s = somma.get(d.chiave);
    if (s) s.delta += d.delta; else somma.set(d.chiave, { chiave: d.chiave, nome: d.nome, delta: d.delta });
  }
  return [...somma.values()].filter((d) => d.delta !== 0);
}

/** «Gentilezza +3, Conoscenza −2». */
export function testoDotiDaSegnare(lista: DoteDaSegnareDto[]): string {
  return lista.map((d) => `${d.nome} ${d.delta > 0 ? '+' : '−'}${Math.abs(d.delta)}`).join(', ');
}

/** «Da segnare nelle Doti: Gentilezza +3», o null se non c'è niente da segnare. */
export function promemoriaDoti(lista: DoteDaSegnareDto[] | null | undefined): string | null {
  return lista && lista.length > 0 ? `Da segnare nelle Doti: ${testoDotiDaSegnare(lista)}` : null;
}

/** L'avviso del promemoria, se c'è qualcosa da segnare (dura di più: va letto e poi fatto). */
export function avvisaDotiDaSegnare(lista: DoteDaSegnareDto[] | null | undefined, premessa?: string): void {
  const testo = promemoriaDoti(lista);
  if (testo) notifica('info', premessa ? `${premessa} — ${testo}` : testo, 7000);
}
