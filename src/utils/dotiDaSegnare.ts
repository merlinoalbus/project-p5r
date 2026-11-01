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
import { aggiornaDote } from '../services/api';
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

/**
 * L'avviso del promemoria, se c'è qualcosa da segnare (dura di più: va letto e poi fatto). L8-12 (decisione dell'utente D7, «pulsante nella
 * notifica»): con la partita, l'avviso ha il pulsante «Applica», che segna nella scheda Doti i punti detti (anche in meno), Dote per Dote,
 * con lo stesso gesto della scheda (`aggiornaDote` con la differenza). Le Doti restano a mano: si applicano solo premendo, mai da sole, e
 * non nasce un promemoria persistente; chiusa la notifica senza premere, si segnano dalla scheda come prima.
 */
export function avvisaDotiDaSegnare(lista: DoteDaSegnareDto[] | null | undefined, premessa: string | undefined, partitaId: number | null): void {
  const testo = promemoriaDoti(lista);
  if (!testo || !lista) return;
  const messaggio = premessa ? `${premessa} — ${testo}` : testo;
  if (partitaId === null) { notifica('info', messaggio, 7000); return; }
  const doti = lista.filter((d) => d.delta !== 0);
  const applica = async () => {
    // Dote per Dote: se una non si segna, l'errore dice quali sono già segnate e quali no, così chi riprova dalla scheda non le conta due volte
    const segnate: DoteDaSegnareDto[] = [];
    for (const d of doti) {
      try { await aggiornaDote(partitaId, d.chiave, { delta: d.delta }); segnate.push(d); }
      catch (err) {
        const mancano = doti.filter((x) => !segnate.includes(x));
        const causa = err instanceof Error ? err.message : 'errore del server';
        notifica('error', `${segnate.length ? `Già segnato nelle Doti: ${testoDotiDaSegnare(segnate)}. ` : 'Nessuna Dote segnata. '}Non segnato: ${testoDotiDaSegnare(mancano)} (${causa}). Segna dalla scheda Doti solo quelle non segnate.`);
        return;
      }
    }
    notifica('success', `Segnato nelle Doti: ${testoDotiDaSegnare(doti)}.`);
  };
  notifica('info', messaggio, 15000, { azione: { etichetta: 'Applica', nomeAccessibile: `Applica nelle Doti: ${testoDotiDaSegnare(doti)}`, onClick: () => { void applica(); } } });
}
