// ============================================================
// descriviEffettiSpunta — la frase di ciò che la spunta di una voce ha fatto (Doti, letture, turni, incontro, Confidente, aperture)
// ============================================================
//
// Era in `src/utils/percorso.ts` (il chip degli effetti sulla voce spuntata). Dal 2026-10-26 la usa anche il server per le ricevute della
// spunta (`server/services/applicatoDallaSpunta.ts`: «mi serve sapere quando è stata applicata e cosa è stato applicato per annullare in
// caso di decheck della casella»): una sola scrittura delle stesse parole, sulla voce e nella finestra delle ricevute.
// ============================================================

import type { EffettiAzioneDto } from './types.js';
import { NESSUNA_NOTA, testoDoteInPunti } from './note.js';
import { nomePiazzamentoEsame } from './puntiConfidenti.js';
import { testoOrigineEsito } from './esitiAttivita.js';

/**
 * 2026-10-27 (revisione: «Grimaldello · creato · ricevuti Grimaldello ×3» ripeteva il nome): l'esito di un turno detto nel riepilogo. Per uno
 * strumento (`bonus` presente) con gli oggetti ricevuti accanto, che dicono già lo strumento, basta «con il bonus» o «senza bonus»; altrimenti
 * il nome dell'esito. Una sola regola per il chip della voce e per le ricevute del server. (revisione) Per uno strumento senza versione con il
 * bonus (`creazione`: la fabbricazione di Kawakami) con gli oggetti ricevuti accanto non c'è niente da aggiungere: null (la frase lo salta).
 */
export const nomeEsitoDelTurno = (esito: { nome: string; bonus?: boolean; creazione?: true }, conOggettiRicevuti: boolean): string | null =>
  !conOggettiRicevuti ? esito.nome : esito.creazione ? null : esito.bonus === undefined ? esito.nome : esito.bonus ? 'con il bonus' : 'senza bonus';

/** L13 (O10-2): la relazione romantica segnata dalla spunta, in parole («Relazione romantica con Tae Takemi iniziata»). Una sola frase per il
 *  chip della voce, le ricevute e lo storico. */
export const fraseRelazione = (r: NonNullable<EffettiAzioneDto['relazione']>): string => `Relazione romantica con ${r.nome} ${r.dopo ? 'iniziata' : 'tolta'}`;

/** Testo breve degli effetti della spunta (es. «Perizia ♪ · 2 punti · Zorro, il fuorilegge 1 → 2 · Fioraio Rafflesia: turno 1 (Gentilezza ♪♪ · 3 punti) · Ryuji Sakamoto +15 punti»).
 *  Le Doti sono ciò che il gioco dà (l'app non le tocca: si segnano a mano); `senzaDoti` le lascia fuori, per metterle nel
 *  promemoria «Da segnare nelle Doti» (`utils/dotiDaSegnare`). `senzaPaga` lascia fuori la paga dei turni: le ricevute della spunta
 *  dicono gli yen davvero mossi a parte, con l'importo reale (un movimento per causa), e la paga non si ripete. */
export function descriviEffetti(e: EffettiAzioneDto, opz: { senzaDoti?: boolean; turniConYen?: ReadonlySet<string>; senzaPaga?: boolean } = {}): string {
  /** Le Doti di un effetto («Coraggio ♪ · 2 punti, Fascino ♪♪ · 3 punti») racchiuse fra `prima` e `dopo`; stringa vuota se non ce ne sono o se `senzaDoti`. */
  const doti = (lista: Array<{ nome: string; delta: number; note?: number }>, prima: string, dopo: string) => (!opz.senzaDoti && lista.length ? `${prima}${lista.map((d) => testoDoteInPunti(d)).join(', ')}${dopo}` : '');
  // un solo valore, due modi di leggerlo: le note (♪) e i punti che valgono («Perizia ♪♪ · 3 punti», `testoDoteInPunti`); mai «+2» accanto a
  // «+3», che sembravano due scelte, né un «+N» nudo, che si legge come note
  // L13: una Dote a valori possibili con «nessuna nota» scelta alla spunta si dice tale (nessun punto da segnare)
  const parti = opz.senzaDoti ? [] : e.doti.map((d) => (d.scelta && d.note === 0 ? `${d.nome}: ${NESSUNA_NOTA}` : `${testoDoteInPunti(d)}${d.note && d.cinema ? ' + Anima da cineasta' : ''}`));
  for (const l of e.letture ?? []) parti.push(`${l.dopo > l.prima ? `${l.nome} ${l.prima} → ${l.dopo}` : `${l.nome} già a ${l.prima}`}${doti(l.doti ?? [], ' (', ')')}`);
  // R9-12/2: la paga del turno, «paga ¥X (fino a ¥Y)». L13 (decisione 18): la paga base entra da sola nel saldo con il turno (il chip degli yen
  // mossi della voce dice quanto); la paga più alta, se il gioco l'ha data, non entra da sola, e la frase lo dice SOLO per un turno che ha
  // davvero mosso la sua paga (`turniConYen`, «attività:ordine»): un turno di prima degli yen automatici ha la paga già nel saldo
  for (const t of e.turni ?? []) {
    const variabile = t.paga?.massima && t.paga.massima > t.paga.yen ? ` (fino a ¥${t.paga.massima.toLocaleString('it-IT')}${opz.turniConYen?.has(`${t.attivita}:${t.ordine}`) ? ': entra da sola la paga base, il di più no' : ''})` : '';
    // 2026-10-27: gli oggetti che il turno ha dato e usato (con la quantità e il bonus della voce), solo se ci sono
    const elenco = (o: ReadonlyArray<{ nome: string; quantita: number }> | undefined) => (o ?? []).map((x) => (x.quantita > 1 ? `${x.nome} ×${x.quantita}` : x.nome)).join(', ');
    const ricevuti = elenco(t.oggetti), usati = elenco(t.consumati);
    const nomeEsito = t.esito ? nomeEsitoDelTurno(t.esito, !!ricevuti) : null;
    // L13 (ondata 9, O9-2): nel modo automatico l'esito dice da dove viene («dal giorno» o «dalla voce», `testoOrigineEsito`)
    parti.push(`${t.nome}: turno ${t.ordine}${nomeEsito ? ` · ${nomeEsito}${t.esito ? testoOrigineEsito(t.esito) : ''}` : t.esito === null ? ' · senza punti' : ''}${doti(t.doti, ' (', ')')}${ricevuti ? ` · ricevuti ${ricevuti}` : ''}${usati ? ` · usati ${usati}` : ''}${t.paga && !opz.senzaPaga ? ` · paga ¥${t.paga.yen.toLocaleString('it-IT')}${variabile}` : ''}`);
  }
  if (e.incontro) {
    const rango = e.incontro.rango ? ` · rango ${e.incontro.rango.da} → ${e.incontro.rango.a}` : '';
    parti.push((e.incontro.giaContato ? `Incontro con ${e.incontro.nome} già contato` : `Incontro con ${e.incontro.nome}${doti(e.incontro.doti, ': ', '')}`) + rango);
  }
  if (e.confidente) parti.push(`${e.confidente.nome} +${e.confidente.punti} punti`);
  for (const a of e.apertureDedali ?? []) parti.push(a.nome);
  // L13 (ondata 7, O7-2): «Esame di metà semestre 1: Primi 10 (Fascino ♪♪♪ · 5 punti) · trofeo Un travestimento sapiente»
  for (const x of e.esami ?? []) parti.push(`${x.nome}: ${nomePiazzamentoEsame(x.piazzamento)}${doti(x.doti, ' (', ')')}${x.trofeo ? ` · trofeo ${x.trofeo.nome}` : ''}`);
  if (e.relazione) parti.push(fraseRelazione(e.relazione));
  return parti.join(' · ');
}
