// ============================================================
// descriviEffettiSpunta — la frase di ciò che la spunta di una voce ha fatto (Doti, letture, turni, incontro, Confidente, aperture)
// ============================================================
//
// Era in `src/utils/percorso.ts` (il chip degli effetti sulla voce spuntata). Dal 2026-10-26 la usa anche il server per le ricevute della
// spunta (`server/services/applicatoDallaSpunta.ts`: «mi serve sapere quando è stata applicata e cosa è stato applicato per annullare in
// caso di decheck della casella»): una sola scrittura delle stesse parole, sulla voce e nella finestra delle ricevute.
// ============================================================

import type { EffettiAzioneDto } from './types.js';

/** Testo breve degli effetti della spunta (es. «Perizia +2 · Zorro, il fuorilegge 1 → 2 · Fioraio Rafflesia: turno 1 (Gentilezza +3) · Ryuji Sakamoto +15 punti»).
 *  Le Doti sono ciò che il gioco dà (l'app non le tocca: si segnano a mano); `senzaDoti` le lascia fuori, per metterle nel
 *  promemoria «Da segnare nelle Doti» (`utils/dotiDaSegnare`). `senzaPaga` lascia fuori la paga dei turni: le ricevute della spunta
 *  dicono gli yen davvero mossi a parte, con l'importo reale (un movimento per causa), e la paga non si ripete. */
export function descriviEffetti(e: EffettiAzioneDto, opz: { senzaDoti?: boolean; turniConYen?: ReadonlySet<string>; senzaPaga?: boolean } = {}): string {
  /** Le Doti di un effetto («Coraggio +1, Fascino +2») racchiuse fra `prima` e `dopo`; stringa vuota se non ce ne sono o se `senzaDoti`. */
  const doti = (lista: Array<{ nome: string; delta: number }>, prima: string, dopo: string) => (!opz.senzaDoti && lista.length ? `${prima}${lista.map((d) => `${d.nome} +${d.delta}`).join(', ')}${dopo}` : '');
  // un solo valore, due modi di leggerlo: le note (♪) e i punti che valgono («Perizia ♪♪ · 3 punti»); mai «+2» accanto a «+3», che sembravano due scelte
  // L13: una Dote a valori possibili con «nessuna nota» scelta alla spunta si dice tale (nessun punto da segnare)
  const parti = opz.senzaDoti ? [] : e.doti.map((d) => (d.scelta && d.note === 0 ? `${d.nome}: nessuna nota` : d.note ? `${d.nome} ${'♪'.repeat(d.note)} · ${d.delta} punti${d.cinema ? ' + Anima da cineasta' : ''}` : `${d.nome} +${d.delta}`));
  for (const l of e.letture ?? []) parti.push(`${l.dopo > l.prima ? `${l.nome} ${l.prima} → ${l.dopo}` : `${l.nome} già a ${l.prima}`}${doti(l.doti ?? [], ' (', ')')}`);
  // R9-12/2: la paga del turno, «paga ¥X (fino a ¥Y)». L13 (decisione 18): la paga base entra da sola nel saldo con il turno (il chip degli yen
  // mossi della voce dice quanto); la paga più alta, se il gioco l'ha data, non entra da sola, e la frase lo dice SOLO per un turno che ha
  // davvero mosso la sua paga (`turniConYen`, «attività:ordine»): un turno di prima degli yen automatici ha la paga già nel saldo
  for (const t of e.turni ?? []) {
    const variabile = t.paga?.massima && t.paga.massima > t.paga.yen ? ` (fino a ¥${t.paga.massima.toLocaleString('it-IT')}${opz.turniConYen?.has(`${t.attivita}:${t.ordine}`) ? ': entra da sola la paga base, il di più no' : ''})` : '';
    parti.push(`${t.nome}: turno ${t.ordine}${t.esito ? ` · ${t.esito.nome}` : t.esito === null ? ' · senza punti' : ''}${doti(t.doti, ' (', ')')}${t.paga && !opz.senzaPaga ? ` · paga ¥${t.paga.yen.toLocaleString('it-IT')}${variabile}` : ''}`);
  }
  if (e.incontro) {
    const rango = e.incontro.rango ? ` · rango ${e.incontro.rango.da} → ${e.incontro.rango.a}` : '';
    parti.push((e.incontro.giaContato ? `Incontro con ${e.incontro.nome} già contato` : `Incontro con ${e.incontro.nome}${doti(e.incontro.doti, ': ', '')}`) + rango);
  }
  if (e.confidente) parti.push(`${e.confidente.nome} +${e.confidente.punti} punti`);
  for (const a of e.apertureDedali ?? []) parti.push(a.nome);
  return parti.join(' · ');
}
