// ============================================================
// Osservazioni della spunta (consumazioni Aojiru e visite di pesca di una voce del Diario)
// ============================================================
//
// 2026-10-28 (utente: «cos'è questa cosa? … Come si disattiva?» sulla finestra che chiedeva mese, giorno, fascia, ordine e succo di un
// Aojiru già scritto nella voce): alla spunta si chiede SOLO ciò che la voce lascia davvero aperto. Un solo meccanismo per ogni voce:
//   - momento: il giorno e la fascia della voce; l'ordine nella fascia è il primo libero;
//   - Aojiru: il succo è quello della voce o, se manca, il successivo della rotazione dopo l'ultimo consumo registrato prima di quel momento
//     (`prossimaVarianteAojiru`); il consumo è nuovo, salvo un consumo già registrato nello stesso momento con lo stesso succo e senza un'altra
//     voce del Diario (è lo stesso: un secondo consumo dello stesso giorno sarebbe il succo successivo); la Fortuna si legge dalla partita;
//     il vecchio segno «Acquistato» si chiede solo se nessun consumo lo rappresenta ancora;
//   - pesca: la visita è nuova, salvo l'unica visita già registrata in quel momento senza un'altra voce del Diario; il turno è nuovo se non ci
//     sono turni di pesca liberi né quote del vecchio conteggio, altrimenti si chiede; le osservazioni della visita restano ignote (si
//     rivedono dal registro della pesca).
// Ogni richiesta completa passa dall'anteprima del server, che dà il token (CAS) e il riepilogo: la spunta invia le richieste insieme,
// come prima. Se tutto è determinato la spunta registra senza finestra; altrimenti la finestra mostra solo le domande aperte.

import {
  ORDINE_AOJIRU, PREZZO_AOJIRU, prossimaVarianteAojiru,
  type NuovaRegistrazioneAcquisto, type RegistrazioneAcquistoDto, type RichiestaRegistraAcquisto, type StatoAcquistiDto,
} from '../../shared/acquisti';
import { eDote, nomeDote, type DoteChiave } from '../../shared/doti';
import type { EffettoVoceDto } from '../../shared/effettiVoce';
import type { FortunaPartitaDto } from '../../shared/fortuna';
import type { NuovaSessionePesca, RichiestaRegistraSessionePesca, SceltaTurnoPesca, SessionePescaDto, StatoPescaDto } from '../../shared/pesca';
import type { AzionePercorsoDto } from '../types';
import { anteprimaRegistrazioneAcquisto, getFortuna, leggiAcquistiRegistrati } from './api';
import { anteprimaPesca, leggiPesca } from './api/pesca';
import { fortunaDelConsumo } from '../utils/fortunaConsumo';
import { osservazionePescaIgnota } from '../utils/pesca';
import { dataGiocoTesto } from '../utils/dateGioco';
import { formattaYen } from '../utils/punti';

const nuovoId = () => crypto.randomUUID().replaceAll('-', '');
const messaggio = (e: unknown) => e instanceof Error ? e.message : 'Anteprima non riuscita.';
const fasciaInParole = (f: 'giorno' | 'sera') => f === 'sera' ? 'di sera' : 'di giorno';

/** Le risposte date nella finestra, per effetto della voce. Una chiave assente = domanda non ancora risposta. */
export interface RisposteOsservazione {
  /** Aojiru: il succo bevuto, quando la voce non lo dice e la rotazione non lo sa. */
  variante?: DoteChiave;
  /** Aojiru: 'nuovo' = un consumo nuovo, altrimenti l'id del consumo già registrato in quel momento. */
  consumo?: string;
  /** Aojiru: il rapporto con il vecchio segno «Acquistato» non ancora rappresentato. */
  rapporto?: 'rappresenta' | 'ulteriore';
  /** Pesca: 'nuova' = una visita nuova, altrimenti l'id della visita già registrata in quel momento. */
  visita?: string;
  /** Pesca: 'nuovo', 'storico' o `turno:<firma>` (come nel registro della pesca). */
  turno?: string;
}
export type RisposteOsservazioni = Record<string, RisposteOsservazione>;

export interface OpzioneDomanda { chiave: string; nome: string; dettaglio?: string }
/** Una domanda aperta: solo ciò che la voce e lo stato della partita non dicono. */
export interface DomandaOsservazione { campo: keyof RisposteOsservazione; etichetta: string; opzioni: OpzioneDomanda[] }

/** Un effetto della voce con le sue domande aperte e, se completo, la richiesta pronta per la spunta. */
export interface OsservazioneEffetto {
  effettoUid: string;
  tipo: 'acquisto' | 'pesca';
  /** Il nome breve dell'effetto (titolo del riquadro quando gli effetti aperti sono più di uno). */
  nome: string;
  domande: DomandaOsservazione[];
  /** Le richieste pronte (con il token dell'anteprima) e che cosa registrano, in una riga. */
  pronta: null | { acquisto?: RichiestaRegistraAcquisto; pesca?: RichiestaRegistraSessionePesca; descrizione: string };
  /** Perché la richiesta, pur completa, non si può preparare (anteprima rifiutata, regola della pesca non collegata…). */
  errore: string | null;
}
export interface OsservazioniVoce {
  effetti: OsservazioneEffetto[];
  /** Vero se ogni effetto è pronto: la spunta può registrare senza chiedere niente. */
  complete: boolean;
}

interface Contesto { acquisti: StatoAcquistiDto | null; fortuna: FortunaPartitaDto | null; pesca: StatoPescaDto | null; oggi: string | null }

/** L'ordine dell'anno scolastico (aprile → marzo), come il registro degli acquisti del server. */
const chiaveMomento = (giorno: string, fascia: 'giorno' | 'sera', ordine: number): string =>
  `${giorno < '04' ? 1 : 0}${giorno}${fascia === 'giorno' ? 0 : 1}${String(ordine).padStart(8, '0')}`;
const stessoMomento = (m: { giorno: string; fascia: 'giorno' | 'sera' }, a: AzionePercorsoDto) => m.giorno === a.giorno && m.fascia === a.fascia;

type EffettoAcquisto = EffettoVoceDto & { effetto: Extract<EffettoVoceDto['effetto'], { tipo: 'acquisto' }> };
type EffettoPesca = EffettoVoceDto & { effetto: Extract<EffettoVoceDto['effetto'], { tipo: 'pesca' }> };
const eAcquisto = (e: EffettoVoceDto): e is EffettoAcquisto => e.effetto.tipo === 'acquisto';
const ePesca = (e: EffettoVoceDto): e is EffettoPesca => e.effetto.tipo === 'pesca';

/** Gli effetti della voce che la spunta registra con un'osservazione (consumazioni e visite di pesca). */
export const effettiDaOsservare = (a: AzionePercorsoDto): EffettoVoceDto[] => a.effettiVoce?.effetti.filter((e) => eAcquisto(e) || ePesca(e)) ?? [];

/** Il consumo `r`, se lo ha già un'altra voce del Diario (diversa da questa). */
const diAltraVoce = (fonti: ReadonlyArray<{ fonte: { tipo: 'manuale' } | { tipo: 'diario'; voceUid: string } }>, voceUid: string) =>
  fonti.some((f) => f.fonte.tipo === 'diario' && f.fonte.voceUid !== voceUid);

/** L'Aojiru della voce: richiesta (se completa) e domande aperte. Puro: nessuna chiamata. */
function risolviAcquisto(c: Contesto, a: AzionePercorsoDto, e: EffettoAcquisto, risposte: RisposteOsservazione): { domande: DomandaOsservazione[]; richiesta: NuovaRegistrazioneAcquisto | null } {
  const stato = c.acquisti!;
  const registrazioni = stato.registrazioni.filter((r) => r.identita.articolo === e.effetto.articolo);
  const domande: DomandaOsservazione[] = [];
  // il succo: quello della voce; se manca, il successivo della rotazione dopo l'ultimo consumo confermato prima di questo momento
  const precedenti = registrazioni.filter((r) => r.attiva && chiaveMomento(r.momento.giorno, r.momento.fascia, r.momento.ordine) < chiaveMomento(a.giorno, a.fascia, 0))
    .sort((x, y) => chiaveMomento(x.momento.giorno, x.momento.fascia, x.momento.ordine).localeCompare(chiaveMomento(y.momento.giorno, y.momento.fascia, y.momento.ordine)));
  const ultimo = precedenti[precedenti.length - 1];
  const varianteNota: DoteChiave | null = e.effetto.variante ?? (ultimo ? prossimaVarianteAojiru(ultimo.consumo.variante) : null);
  if (!varianteNota) domande.push({ campo: 'variante', etichetta: 'Che succo hai bevuto', opzioni: ORDINE_AOJIRU.map((d) => ({ chiave: d, nome: nomeDote(d) })) });
  const variante = varianteNota ?? (eDote(risposte.variante) ? risposte.variante : null);
  // il consumo: solo uno già registrato nello stesso momento e con lo stesso succo può essere lo stesso (il server collega solo quelli)
  const nelMomento = registrazioni.filter((r) => stessoMomento(r.momento, a));
  const collegabili = nelMomento.filter((r) => variante === null || r.consumo.variante === variante);
  const liberi = collegabili.filter((r) => !diAltraVoce(r.provenienze, a.uid));
  let scelta: RegistrazioneAcquistoDto | null | undefined;
  if (!collegabili.length) scelta = null;
  else if (collegabili.length === 1 && liberi.length === 1) scelta = liberi[0]!;
  else {
    domande.push({ campo: 'consumo', etichetta: 'Il consumo di quel giorno', opzioni: [{ chiave: 'nuovo', nome: 'Un consumo nuovo' },
      ...collegabili.map((r) => ({ chiave: r.id, nome: `Quello già registrato: ${nomeDote(r.consumo.variante)}`, dettaglio: diAltraVoce(r.provenienze, a.uid) ? 'Già di un’altra voce' : undefined }))] });
    scelta = risposte.consumo === undefined ? undefined : risposte.consumo === 'nuovo' ? null : collegabili.find((r) => r.id === risposte.consumo);
  }
  // il vecchio segno «Acquistato»: si chiede solo se nessun consumo lo rappresenta ancora
  const presenza = stato.presenzeStoriche.find((p) => p.articolo === e.effetto.articolo) ?? null;
  let rapporto: 'rappresenta' | 'ulteriore' | undefined;
  if (presenza) {
    const rappresentaGia = scelta && presenza.valutazione && scelta.legacyFirma === presenza.firma && scelta.legacyValutazioneId === presenza.valutazione.id;
    if (rappresentaGia) rapporto = 'rappresenta';
    else if (presenza.rappresentataDa !== null || stato.registrazioni.some((r) => r.legacyFirma === presenza.firma)) rapporto = 'ulteriore';
    else {
      domande.push({ campo: 'rapporto', etichetta: 'Il vecchio segno «Acquistato»', opzioni: [{ chiave: 'rappresenta', nome: 'Questo consumo prende il suo posto' }, { chiave: 'ulteriore', nome: 'È un consumo in più' }] });
      rapporto = risposte.rapporto;
    }
  }
  if (!variante || scelta === undefined || (presenza && !rapporto)) return { domande, richiesta: null };
  const ordine = scelta ? scelta.momento.ordine : nelMomento.reduce((m, r) => Math.max(m, r.momento.ordine + 1), 0);
  return { domande, richiesta: {
    operazioneId: nuovoId(), articolo: e.effetto.articolo, momento: { giorno: a.giorno, fascia: a.fascia, ordine },
    variante, fortuna: scelta ? scelta.consumo.fortuna : fortunaDelConsumo(c.fortuna, a.giorno, variante, c.oggi),
    fonte: { tipo: 'diario', voceUid: a.uid, effettoUid: e.uid },
    scelta: scelta ? { tipo: 'collega', acquistoId: scelta.id } : { tipo: 'nuova' },
    rapportoLegacy: presenza && rapporto ? { tipo: rapporto, firma: presenza.firma, valutazione: presenza.valutazione } : null,
  } };
}

/** Il turno di una visita già registrata (null se revocato: il collegamento non ricrea il passato). */
const turnoDellaSessione = (s: SessionePescaDto): SceltaTurnoPesca | null => s.turno.revocato || !s.turno.firma ? null
  : s.turno.origine === 'quota-storica' ? { tipo: 'contatore-storico', firmaContatore: s.turno.firma } : { tipo: 'esistente', ordine: s.turno.ordine, firmaTurno: s.turno.firma };

/** La visita di pesca della voce: richiesta (se completa), domande aperte o il motivo per cui non si può registrare. Puro. */
function risolviPesca(c: Contesto, a: AzionePercorsoDto, e: EffettoPesca, risposte: RisposteOsservazione): { domande: DomandaOsservazione[]; richiesta: NuovaSessionePesca | null; blocco: string | null } {
  const st = c.pesca!;
  if (st.regola.stato !== 'collegata') return { domande: [], richiesta: null, blocco: `La regola della pesca non è collegata: ${st.regola.motivi.join(' ')}`.trim() };
  const domande: DomandaOsservazione[] = [];
  const nelMomento = st.sessioni.filter((s) => stessoMomento(s.momento, a) && turnoDellaSessione(s) !== null);
  let sessione: SessionePescaDto | null | undefined;
  if (!nelMomento.length) sessione = null;
  else if (nelMomento.length === 1 && !diAltraVoce(nelMomento[0]!.fonti, a.uid)) sessione = nelMomento[0]!;
  else {
    domande.push({ campo: 'visita', etichetta: 'La visita di quella fascia', opzioni: [{ chiave: 'nuova', nome: 'Una visita nuova' },
      ...nelMomento.map((s) => ({ chiave: s.id, nome: `Quella già registrata (visita ${s.momento.ordineVisita + 1})`, dettaglio: diAltraVoce(s.fonti, a.uid) ? 'Già di un’altra voce' : undefined }))] });
    sessione = risposte.visita === undefined ? undefined : risposte.visita === 'nuova' ? null : nelMomento.find((s) => s.id === risposte.visita);
  }
  if (sessione === undefined) return { domande, richiesta: null, blocco: null };
  const fonte = { tipo: 'diario' as const, voceUid: a.uid, effettoUid: e.uid };
  if (sessione) return { domande, blocco: null, richiesta: { operazioneId: nuovoId(), momento: { ...sessione.momento }, fonte,
    scelta: { tipo: 'collega', sessioneId: sessione.id }, turno: turnoDellaSessione(sessione)!, osservazione: structuredClone(sessione.osservazione.dati) } };
  // una visita nuova: il turno è nuovo, salvo turni di pesca liberi o quote del vecchio conteggio (allora lo dice chi gioca)
  const liberi = st.contatore.turni.filter((t) => t.raccordatoASessione === null);
  let turno: SceltaTurnoPesca | null;
  if (!liberi.length && st.contatore.quoteNonRappresentate < 1) turno = { tipo: 'nuovo' };
  else {
    domande.push({ campo: 'turno', etichetta: 'Il turno di pesca', opzioni: [{ chiave: 'nuovo', nome: 'Un turno nuovo' },
      ...liberi.map((t) => ({ chiave: `turno:${t.firma}`, nome: `Il turno già registrato ${t.ordine}`, dettaglio: 'Non ne aggiunge un altro' })),
      ...(st.contatore.quoteNonRappresentate > 0 ? [{ chiave: 'storico', nome: 'Uno del vecchio conteggio', dettaglio: 'Non ne aggiunge un altro' }] : [])] });
    const t = risposte.turno, libero = liberi.find((x) => `turno:${x.firma}` === t);
    turno = t === 'nuovo' ? { tipo: 'nuovo' } : t === 'storico' && st.contatore.quoteNonRappresentate > 0 ? { tipo: 'contatore-storico', firmaContatore: st.contatore.firma }
      : libero ? { tipo: 'esistente', ordine: libero.ordine, firmaTurno: libero.firma } : null;
  }
  if (!turno) return { domande, richiesta: null, blocco: null };
  const ordineVisita = st.sessioni.filter((s) => stessoMomento(s.momento, a)).reduce((m, s) => Math.max(m, s.momento.ordineVisita + 1), 0);
  return { domande, blocco: null, richiesta: { operazioneId: nuovoId(), momento: { giorno: a.giorno, fascia: a.fascia, ordineVisita }, fonte,
    scelta: { tipo: 'nuova' }, turno, osservazione: osservazionePescaIgnota(a.giorno) } };
}

/**
 * Le osservazioni della spunta di una voce: legge acquisti, Fortuna e pesca della partita (solo quelli che servono), risolve ogni effetto
 * con le `risposte` date e prepara con l'anteprima del server le richieste complete. Un'anteprima rifiutata resta sull'effetto (`errore`);
 * solo una lettura fallita dello stato fa fallire la chiamata.
 */
export async function preparaOsservazioniVoce(partitaId: number, a: AzionePercorsoDto, oggi: string | null, risposte: RisposteOsservazioni = {}): Promise<OsservazioniVoce> {
  const effetti = effettiDaOsservare(a);
  const conAcquisti = effetti.some(eAcquisto), conPesca = effetti.some(ePesca);
  const [acquisti, fortuna, pesca] = await Promise.all([
    conAcquisti ? leggiAcquistiRegistrati(partitaId) : Promise.resolve(null),
    conAcquisti ? getFortuna(partitaId) : Promise.resolve(null),
    conPesca ? leggiPesca(partitaId) : Promise.resolve(null),
  ]);
  const c: Contesto = { acquisti, fortuna, pesca, oggi };
  const esiti = await Promise.all(effetti.map(async (e): Promise<OsservazioneEffetto> => {
    const r = risposte[e.uid] ?? {};
    // decisione 18: gli yen di un effetto già nel saldo da prima che si muovessero da soli non si muovono: la riga non li dice
    const yenMossi = !a.yenGiaNelSaldo?.effetti.includes(e.uid);
    if (eAcquisto(e)) {
      const { domande, richiesta } = risolviAcquisto(c, a, e, r);
      const base = { effettoUid: e.uid, tipo: 'acquisto' as const, nome: 'Aojiru', domande };
      if (!richiesta) return { ...base, pronta: null, errore: null };
      try {
        const ant = await anteprimaRegistrazioneAcquisto(partitaId, richiesta);
        const punti = ant.effetto.puntiConfermati === null ? '2 punti certi' : `${ant.effetto.puntiConfermati} punti`;
        const descrizione = ant.esitoPrevisto === 'registrata'
          ? `${ant.identita.nome} ${nomeDote(ant.effetto.dote)} · ♪ · ${punti}${yenMossi ? ` · ${formattaYen(PREZZO_AOJIRU)}` : ''}`
          : `${ant.identita.nome} ${nomeDote(ant.effetto.dote)} · collegato al consumo già registrato`;
        return { ...base, nome: ant.identita.nome, pronta: { acquisto: { ...ant.nuovo, revisioneAcquistiAttesa: ant.revisioneAcquistiAttesa }, descrizione }, errore: null };
      } catch (err) { return { ...base, pronta: null, errore: messaggio(err) }; }
    }
    const { domande, richiesta, blocco } = risolviPesca(c, a, e as EffettoPesca, r);
    const base = { effettoUid: e.uid, tipo: 'pesca' as const, nome: 'Pesca', domande };
    if (!richiesta) return { ...base, pronta: null, errore: blocco };
    try {
      const ant = await anteprimaPesca(partitaId, { azione: 'registra-sessione', bersaglio: null, richiesta });
      const quota = pesca?.regola.dati?.quote[a.fascia];
      const descrizione = richiesta.scelta.tipo === 'nuova'
        ? `Visita di pesca ${dataGiocoTesto(a.giorno)}, ${fasciaInParole(a.fascia)}${quota !== undefined && yenMossi ? ` · ${formattaYen(quota)}` : ''}`
        : 'Visita di pesca · collegata a quella già registrata';
      return { ...base, pronta: { pesca: { ...richiesta, revisionePescaAttesa: ant.revisionePescaAttesa }, descrizione }, errore: null };
    } catch (err) { return { ...base, pronta: null, errore: messaggio(err) }; }
  }));
  return { effetti: esiti, complete: esiti.every((x) => x.pronta !== null) };
}

/** Le richieste pronte, nell'ordine degli effetti, per la spunta. */
export function richiesteOsservazioni(o: OsservazioniVoce): { acquisti: RichiestaRegistraAcquisto[]; pesche: RichiestaRegistraSessionePesca[]; descrizioni: string[] } {
  return {
    acquisti: o.effetti.flatMap((x) => x.pronta?.acquisto ? [x.pronta.acquisto] : []),
    pesche: o.effetti.flatMap((x) => x.pronta?.pesca ? [x.pronta.pesca] : []),
    descrizioni: o.effetti.flatMap((x) => x.pronta ? [x.pronta.descrizione] : []),
  };
}
