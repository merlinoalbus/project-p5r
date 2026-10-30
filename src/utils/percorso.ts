// ============================================================
// percorso — etichette dei tipi di azione e collegamenti alle schede dell'app (Fase 7.5b)
// ============================================================

import type { AzionePercorsoDto, EffettiAzioneDto, GenereVoce } from '../types';
import { TIPI_AZIONE, type EffettoAzione } from '../../shared/effettiAzione';
import { nomeDote } from '../../shared/doti';
import { simboliNote } from '../../shared/note';
import type { GruppoRiepilogoEffettiDto } from '../../shared/riepilogoEffetti';
import { descriviEffetti } from '../../shared/descriviEffettiSpunta';
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
        // voce di Palazzo la prima infiltrazione non completata del Palazzo (`in-corso`). I Memento (campi assenti, atterraggio compreso:
        // il server lo dà solo ai dungeon di tipo Palazzo, 2026-10-30) aprono la loro scheda, come la sezione di un Palazzo.
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

/** Il nome senza maiuscole, spazi in più e accenti (anche per il titolo dei gruppi di «Il gioco dà», `RiepilogoEffettiVoce`). */
export const normaNome =(s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Due nomi dicono lo stesso posto? Senza maiuscole, spazi in più e accenti (il collegamento e il pin della mappa possono scriverlo un po' diverso). */
export function stessoNomeDiPosto(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && normaNome(a) === normaNome(b);
}

/** Le radici delle parole del nome di un tipo, senza la vocale finale né la «s» del plurale («Palazzo / Mementos» → palazz, mement;
 *  «Domanda / esame» → domand, esam), così si ritrovano in un nome scritto altrimenti («Richieste dei Mementos», «Domande ed esami»). */
const radiciDelTipo = (nome: string): string[] =>
  normaNome(nome).split(/[^a-z0-9]+/).filter((p) => p.length >= 3).map((p) => p.replace(/[aeiou]s?$/, '')).filter((r) => r.length >= 3);

/**
 * Il cartellino del tipo della voce («Palazzo / Mementos», «Confidente», «Richiesta»…) ripeterebbe ciò che la riga dice già? 2026-10-25,
 * sullo screenshot della voce di Kamoshida: «le etichette di testo devono essere visibili solo se hanno senso». Lo dice già:
 * - una voce di Palazzo legata al suo Palazzo (l'emblema accanto e il collegamento «Palazzo di Kamoshida» / «Mementos»);
 * - una voce di Confidente legata al suo Confidente (il ritratto accanto e il nome nel collegamento);
 * - un collegamento o un riferimento il cui nome contiene il tipo («Richieste dei Mementos» per una Richiesta, «Domande in classe ed
 *   esami» per una domanda, «Lavori» per un lavoro);
 * - il tipo «Altro», che non dice niente di più della voce stessa.
 * Negli altri casi il cartellino resta: un libro, un film, un negozio o un'attività col solo titolo non dicono che cosa sono, e sul tocco
 * l'icona della categoria accanto non ha un nome scritto.
 */
export function tipoGiaDetto(a: Pick<AzionePercorsoDto, 'tipo' | 'riferimento'>, testo: string | null | undefined): boolean {
  if (a.tipo === 'altro') return true;
  if (a.tipo === 'palazzo' && a.riferimento?.tipo === 'dungeon') return true;
  if (a.tipo === 'confidente' && a.riferimento?.tipo === 'confidente') return true;
  const nome = NOME_TIPO_AZIONE[a.tipo];
  if (!nome || !testo) return false;
  const parole = normaNome(testo).split(/[^a-z0-9]+/);
  return radiciDelTipo(nome).some((r) => parole.some((p) => p.startsWith(r)));
}

/** Il testo senza spazi né maiuscole, per confrontare «Perizia +2» con «perizia+2». */
const compatto = (s: string): string => s.toLowerCase().replace(/\s+/g, '');

/**
 * Il testo `note` della guida («Perizia +2») dice la stessa cosa di un effetto Dote della voce («Perizia», 2 note)? Allora la riga lo mostra una volta sola
 * (nell'effetto: «Perizia ♪♪ · 3 punti»), perché «+2» (note) accanto a «+3» (punti) sembrava un secondo valore fra cui scegliere. Altrimenti il testo
 * resta, senza etichetta (2026-10-26: «non serve "Guida:" prima del testo contenuto dentro Note»).
 */
export function noteDellaGuidaCoincideConEffetto(note: string, produce: ReadonlyArray<EffettoAzione>): boolean {
  const n = compatto(note);
  return produce.some((e) => e.tipo === 'dote' && (n === compatto(`${nomeDote(e.dote)} +${e.note}`) || n === compatto(`${nomeDote(e.dote)} ${simboliNote(e.note)}`)));
}

/** Il testo ridotto alle sole parole (senza accenti, maiuscole, virgolette e punteggiatura), per riconoscere una risposta scritta altrimenti. */
const soloParole = (s: string): string => normaNome(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
/** Le etichette con cui una nota introduce la risposta o la domanda («Risposta:», «Soluzione:», «DOMANDA:»), già ridotte da `soloParole`. */
const ETICHETTA_NOTA = /^(?:rispost[ae] (?:giust[ae]|corrett[ae]|esatt[ae])|rispost[ae]|soluzion[ei]|domand[ae]|indizio|definizione)(?: |$)/;

/**
 * La nota della voce ripete soltanto la risposta che il riquadro «Il gioco dà» mostra già? 2026-10-27, sullo screenshot della voce
 * «Rispondere alla domanda in classe» (nota «Risposta: "Sono uguali"» accanto al riquadro con «Sono uguali»): «come già per le domande in
 * classe...» e «le etichette di testo devono essere visibili solo se hanno senso». Vale per ogni domanda, quiz, esame e cruciverba che il
 * riepilogo mostra con le risposte (`RigaRiepilogoEffettiDto.risposte`). La nota si legge a pezzi (righe, «;», «/», «·»): ogni pezzo, senza
 * l'etichetta («Risposta:», «Soluzione:», «Domanda:») e la numerazione, deve essere una risposta giusta (o una sua parte) o la domanda del
 * riquadro, e almeno uno una risposta. Se la nota dice anche altro («Conoscenza +1», un consiglio), resta. Senza risposte nel riepilogo, resta.
 */
export function notaRipeteRisposte(note: string, gruppi: readonly GruppoRiepilogoEffettiDto[]): boolean {
  const righe = gruppi.flatMap((g) => g.righe).filter((r) => r.risposte?.length);
  if (!righe.length) return false;
  const risposte = righe.flatMap((r) => (r.risposte ?? []).map((x) => soloParole(x.testo))).filter(Boolean);
  const domande = righe.flatMap((r) => [r.nome, ...(r.risposte ?? []).map((x) => x.domanda ?? '')]).map(soloParole).filter(Boolean);
  // un pezzo vale se sta dentro una risposta (o una domanda) a parole intere: «John Silver» in «John Silver (personaggio letterario…)»
  const dentro = (testo: string, pezzo: string): boolean => ` ${testo} `.includes(` ${pezzo} `);
  let haRisposta = false;
  for (const grezzo of note.split(/[\n;/·•|]+/)) {
    let pezzo = soloParole(grezzo);
    // la numerazione e le etichette davanti, anche insieme («1. Risposta: …»)
    for (let prima = ''; prima !== pezzo;) { prima = pezzo; pezzo = pezzo.replace(/^\d+ /, '').replace(ETICHETTA_NOTA, '').trim(); }
    if (!pezzo) continue;
    if (risposte.some((r) => dentro(r, pezzo))) { haRisposta = true; continue; }
    if (domande.some((d) => dentro(d, pezzo))) continue;
    return false;
  }
  return haRisposta;
}

/** Testo breve degli effetti della spunta: vive in `shared/descriviEffettiSpunta.ts` (2026-10-26), perché lo usa anche il server per le
 *  ricevute della spunta; qui resta riesportato per il chip della voce e per `avvisoSpunta`. */
export { descriviEffetti };

/** L'avviso dopo una spunta: che cosa è successo e, a parte, le Doti da segnare a mano. */
export function avvisoSpunta(e: EffettiAzioneDto): string {
  const altro = descriviEffetti(e, { senzaDoti: true });
  const promemoria = promemoriaDoti(dotiDaSegnareDaEffetti(e));
  return [altro, promemoria].filter(Boolean).join(' · ') || 'Segnata come fatta.';
}
