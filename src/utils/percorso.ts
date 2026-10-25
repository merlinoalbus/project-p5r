// ============================================================
// percorso — etichette dei tipi di azione e collegamenti alle schede dell'app (Fase 7.5b)
// ============================================================

import type { AzionePercorsoDto, EffettiAzioneDto, GenereVoce } from '../types';
import { TIPI_AZIONE, type EffettoAzione } from '../../shared/effettiAzione';
import { nomeDote } from '../../shared/doti';
import type { GruppoRiepilogoEffettiDto } from '../../shared/riepilogoEffetti';
import { dotiDaSegnareDaEffetti, promemoriaDoti } from './dotiDaSegnare';
import { urlMappa } from './navigazioneMappa';
import { indirizzoElemento } from './pannelloScheda';

/** I generi di una voce della giornata: una cosa da fare si spunta, un promemoria si legge soltanto. */
export const NOME_GENERE: Record<GenereVoce, string> = { azione: 'Cosa da fare', promemoria: 'Promemoria' };

/** Etichette dei generi che si mostrano e non si spuntano (il cartellino della voce). */
export const NOME_TIPO_EVENTO: Record<Exclude<GenereVoce, 'azione'>, string> = { promemoria: NOME_GENERE.promemoria };

/** Etichette dei tipi di azione: un elenco solo, quello condiviso con il server (`TIPI_AZIONE`). */
export const NOME_TIPO_AZIONE: Record<string, string> = Object.fromEntries(TIPI_AZIONE.map((t) => [t.chiave, t.nome]));

export interface CollegamentoAzione {
  href: string;
  /** Testo del collegamento: il riferimento della soluzione se presente, altrimenti il nome della scheda. */
  etichetta: string;
  /** Il collegamento porta alla planimetria d'atterraggio di un Palazzo (non alla sua scheda): chi mostra la mappa accanto la può aprire lì. */
  atterraggio?: { chiave: string; spilloId: number | null };
  /** R10-27: dove il diario con il pannello apre la scheda dell'oggetto, se diverso da `href`. Libri, film, attività e Richieste non hanno una
   *  pagina per singolo elemento: l'elenco (`href`) resta il collegamento di sempre, il pannello mostra quell'elemento nell'elenco filtrato. */
  scheda?: string;
}

/** Scheda collegata a un'azione (Confidente con le risposte, dungeon, Richieste, libri…), se ricavabile. Per un Palazzo, se c'è
 *  una regola d'atterraggio per il giorno della voce, la sua planimetria (centrata sul pin d'arrivo), come l'icona della mappa
 *  di Tokyo (scelta dell'utente, 2026-10-04). */
export function collegamentoAzione(a: Pick<AzionePercorsoDto, 'tipo' | 'riferimento' | 'riferimentoTesto' | 'atterraggio'> & Partial<Pick<AzionePercorsoDto, 'uid' | 'infiltrazioni' | 'infiltrazioneDaAprire' | 'infiltrazioniDelPalazzo' | 'propostaInfiltrazioni' | 'oggettoRiferimento' | 'oggettiCitati'>>): CollegamentoAzione | null {
  const r = a.riferimento;
  const testo = a.riferimentoTesto;
  if (a.oggettoRiferimento) return { href: a.oggettoRiferimento.casa, etichetta: a.oggettoRiferimento.nome };
  if (!r && ['libro', 'dvd'].includes(a.tipo) && a.oggettiCitati?.length === 1) return { href: a.oggettiCitati[0].casa, etichetta: a.oggettiCitati[0].nome };
  if (r) {
    switch (r.tipo) {
      case 'confidente': return { href: `/confidenti/${r.chiave}`, etichetta: testo ?? 'Scheda Confidente' };
      case 'dungeon': {
        // L3 (§4.4, «Entra»): con le infiltrazioni della voce scelte, la prima non completata dell'insieme (la calcola il server per la
        // partita, `infiltrazioneDaAprire`; tutte completate = l'ultima); senza, la regola d'atterraggio se c'è, altrimenti per una
        // voce di Palazzo la prima infiltrazione non completata del Palazzo (`in-corso`). I Memento (campi assenti) restano com'erano.
        const scelte = a.infiltrazioni ?? [];
        if (scelte.length) {
          const daAprire = a.infiltrazioneDaAprire ?? scelte[scelte.length - 1].chiave;
          return { href: `/guida/dungeon/${r.chiave}?infiltrazione=${encodeURIComponent(daAprire)}`, etichetta: testo ?? 'Palazzo' };
        }
        if (a.atterraggio) return { href: urlMappa(a.atterraggio.mappa, a.atterraggio.spillo !== null ? { spillo: a.atterraggio.spillo } : undefined), etichetta: testo ?? 'Palazzo', atterraggio: { chiave: a.atterraggio.mappa, spilloId: a.atterraggio.spillo } };
        // insieme vuoto con una proposta (UX3-1, decisione del PM del 2026-10-20): la prima infiltrazione della proposta, qualunque sia la
        // certezza (il server la mette in `infiltrazioneDaAprire`; senza, la prima della proposta), con `daVoce` perché la scheda possa dire
        // da dove è venuta e farla confermare
        const proposta = a.propostaInfiltrazioni?.infiltrazioni ?? [];
        if (proposta.length) {
          const daAprire = a.infiltrazioneDaAprire ?? proposta[0].chiave;
          return { href: `/guida/dungeon/${r.chiave}?infiltrazione=${encodeURIComponent(daAprire)}${a.uid ? `&daVoce=${encodeURIComponent(a.uid)}` : ''}`, etichetta: testo ?? 'Palazzo' };
        }
        return { href: `/guida/dungeon/${r.chiave}${a.infiltrazioniDelPalazzo ? '?infiltrazione=in-corso' : ''}`, etichetta: testo ?? 'Palazzo' };
      }
      case 'richiesta': return { href: '/guida/richieste', etichetta: testo ?? 'Richieste dei Mementos', scheda: indirizzoElemento('/guida/richieste', r.chiave) };
      case 'libro': return { href: '/guida/libri', etichetta: testo ?? 'Libri', scheda: indirizzoElemento('/guida/libri', r.chiave) };
      case 'film': return { href: '/guida/film', etichetta: testo ?? 'Film e DVD', scheda: indirizzoElemento('/guida/film', r.chiave) };
      case 'attivita': return { href: '/guida/attivita', etichetta: testo ?? 'Attività', scheda: indirizzoElemento('/guida/attivita', r.chiave) };
      case 'negozio': return { href: `/guida/negozi/${r.chiave}`, etichetta: testo ?? 'Negozio' };
      case 'dote': return { href: '/guida/attivita', etichetta: testo ?? 'Doti sociali' };
      default: return null;
    }
  }
  switch (a.tipo) {
    case 'esame': return { href: '/guida/domande', etichetta: testo ?? 'Domande in classe ed esami' };
    case 'acquisto': return { href: '/guida/negozi', etichetta: testo ?? 'Negozi e inventario' };
    case 'libro': return { href: '/guida/libri', etichetta: testo ?? 'Libri' };
    case 'dvd': return { href: '/guida/film', etichetta: testo ?? 'Film e DVD' };
    case 'lavoro': return { href: '/guida/attivita?scheda=lavori', etichetta: testo ?? 'Lavori' };
    case 'attivita': case 'dote': return { href: '/guida/attivita', etichetta: testo ?? 'Attività e Doti sociali' };
    case 'velluto': return { href: '/fusione', etichetta: testo ?? 'Fusione' };
    case 'richiesta': return { href: '/guida/richieste', etichetta: testo ?? 'Richieste dei Mementos' };
    default: return null;
  }
}

/**
 * I gruppi di «Il gioco dà» di una voce (`RiepilogoEffettiVoce`): quelli del server (`produceRiepilogo`); per una voce che non li porta
 * (una risposta di prima) le frasi di `produceTesto` in un gruppo solo, così nessuna voce perde che cosa dà. Quel gruppo non ha titolo:
 * «Effetti» sotto «Il gioco dà» ripeteva il riquadro (2026-10-25, «le etichette di testo devono essere visibili solo se hanno senso»).
 */
export function gruppiDellaVoce(a: { produceTesto?: string[]; produceRiepilogo?: GruppoRiepilogoEffettiDto[] }): GruppoRiepilogoEffettiDto[] {
  if (a.produceRiepilogo) return a.produceRiepilogo;
  const frasi = a.produceTesto ?? [];
  return frasi.length ? [{ chiave: 'effetti', titolo: '', righe: frasi.map((nome) => ({ nome })) }] : [];
}

/** Due nomi dicono lo stesso posto? Senza maiuscole, spazi in più e accenti (il collegamento e il pin della mappa possono scriverlo un po' diverso). */
export function stessoNomeDiPosto(a: string | null | undefined, b: string | null | undefined): boolean {
  const norma = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
  return !!a && !!b && norma(a) === norma(b);
}

/** Il testo senza spazi né maiuscole, per confrontare «Perizia +2» con «perizia+2». */
const compatto = (s: string): string => s.toLowerCase().replace(/\s+/g, '');

/**
 * Il testo `note` della guida («Perizia +2») dice la stessa cosa di un effetto Dote della voce («Perizia», 2 note)? Allora la riga lo mostra una volta sola
 * (nell'effetto: «Perizia ♪♪ · 3 punti»), perché «+2» (note) accanto a «+3» (punti) sembrava un secondo valore fra cui scegliere. Altrimenti il testo
 * resta, etichettato «Guida:».
 */
export function noteDellaGuidaCoincideConEffetto(note: string, produce: ReadonlyArray<EffettoAzione>): boolean {
  const n = compatto(note);
  return produce.some((e) => e.tipo === 'dote' && (n === compatto(`${nomeDote(e.dote)} +${e.note}`) || n === compatto(`${nomeDote(e.dote)} ${'♪'.repeat(e.note)}`)));
}

/** Testo breve degli effetti della spunta (es. «Perizia +2 · Zorro, il fuorilegge 1 → 2 · Fioraio Rafflesia: turno 1 (Gentilezza +3) · Ryuji Sakamoto +15 punti»).
 *  Le Doti sono ciò che il gioco dà (l'app non le tocca: si segnano a mano); `senzaDoti` le lascia fuori, per metterle nel
 *  promemoria «Da segnare nelle Doti» (`utils/dotiDaSegnare`). */
export function descriviEffetti(e: EffettiAzioneDto, opz: { senzaDoti?: boolean } = {}): string {
  /** Le Doti di un effetto («Coraggio +1, Fascino +2») racchiuse fra `prima` e `dopo`; stringa vuota se non ce ne sono o se `senzaDoti`. */
  const doti = (lista: Array<{ nome: string; delta: number }>, prima: string, dopo: string) => (!opz.senzaDoti && lista.length ? `${prima}${lista.map((d) => `${d.nome} +${d.delta}`).join(', ')}${dopo}` : '');
  // un solo valore, due modi di leggerlo: le note (♪) e i punti che valgono («Perizia ♪♪ · 3 punti»); mai «+2» accanto a «+3», che sembravano due scelte
  // L13: una Dote a valori possibili con «nessuna nota» scelta alla spunta si dice tale (nessun punto da segnare)
  const parti = opz.senzaDoti ? [] : e.doti.map((d) => (d.scelta && d.note === 0 ? `${d.nome}: nessuna nota` : d.note ? `${d.nome} ${'♪'.repeat(d.note)} · ${d.delta} punti${d.cinema ? ' + Anima da cineasta' : ''}` : `${d.nome} +${d.delta}`));
  for (const l of e.letture ?? []) parti.push(`${l.dopo > l.prima ? `${l.nome} ${l.prima} → ${l.dopo}` : `${l.nome} già a ${l.prima}`}${doti(l.doti ?? [], ' (', ')')}`);
  // R9-12/2: la paga del turno è un promemoria (gli yen non si muovono da qui): «paga ¥X (fino a ¥Y)»
  for (const t of e.turni ?? []) parti.push(`${t.nome}: turno ${t.ordine}${t.esito ? ` · ${t.esito.nome}` : t.esito === null ? ' · senza punti' : ''}${doti(t.doti, ' (', ')')}${t.paga ? ` · paga ¥${t.paga.yen.toLocaleString('it-IT')}${t.paga.massima ? ` (fino a ¥${t.paga.massima.toLocaleString('it-IT')})` : ''}, da segnare tu` : ''}`);
  if (e.incontro) {
    const rango = e.incontro.rango ? ` · rango ${e.incontro.rango.da} → ${e.incontro.rango.a}` : '';
    parti.push((e.incontro.giaContato ? `Incontro con ${e.incontro.nome} già contato` : `Incontro con ${e.incontro.nome}${doti(e.incontro.doti, ': ', '')}`) + rango);
  }
  if (e.confidente) parti.push(`${e.confidente.nome} +${e.confidente.punti} punti`);
  for (const a of e.apertureDedali ?? []) parti.push(a.nome);
  return parti.join(' · ');
}

/** L'avviso dopo una spunta: che cosa è successo e, a parte, le Doti da segnare a mano. */
export function avvisoSpunta(e: EffettiAzioneDto): string {
  const altro = descriviEffetti(e, { senzaDoti: true });
  const promemoria = promemoriaDoti(dotiDaSegnareDaEffetti(e));
  return [altro, promemoria].filter(Boolean).join(' · ') || 'Segnata come fatta.';
}
