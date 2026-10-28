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
// Revisione (rilievo 1): se il server rifiuta il giorno della voce per l'Aojiru (`momento-non-compatibile`, per esempio una voce spostata
// su un giorno in cui il chiosco non lo vende), il giorno diventa una domanda aperta (mese e giorno, la fascia resta quella della voce);
// un rifiuto che nessuna domanda risolve resta sull'effetto e la finestra offre di modificare la voce.
// Revisione (rilievo yen): la riga dopo la spunta dice gli yen DAVVERO mossi, dalla risposta del server (`yenAutomatici` della voce, causa
// `voce:effetto`), con la frase degli yen automatici («scalati ¥1200 dal saldo: la spesa era ¥5000, il saldo non bastava»); prima della
// spunta la finestra dice soltanto il prezzo o la quota («prezzo ¥5000»), perché il saldo può cambiare fino al gesto.

import {
  ORDINE_AOJIRU, PREZZO_AOJIRU, prossimaVarianteAojiru,
  type NuovaRegistrazioneAcquisto, type RegistrazioneAcquistoDto, type RichiestaRegistraAcquisto, type StatoAcquistiDto,
} from '../../shared/acquisti';
import { dataValida, GIORNI_NEL_MESE, MESI_GIOCO } from '../../shared/condizioniSpillo';
import { giornoDellaSettimana } from '../../shared/date';
import { eDote, nomeDote, type DoteChiave } from '../../shared/doti';
import type { EffettoVoceDto } from '../../shared/effettiVoce';
import type { FortunaPartitaDto } from '../../shared/fortuna';
import type { NuovaSessionePesca, RichiestaRegistraSessionePesca, SceltaTurnoPesca, SessionePescaDto, StatoPescaDto } from '../../shared/pesca';
import type { AzionePercorsoDto } from '../types';
import { anteprimaRegistrazioneAcquisto, getFortuna, isApiError, leggiAcquistiRegistrati } from './api';
import { anteprimaPesca, leggiPesca } from './api/pesca';
import { fortunaDelConsumo } from '../utils/fortunaConsumo';
import { osservazionePescaIgnota } from '../utils/pesca';
import { dataGiocoTesto } from '../utils/dateGioco';
import { fraseMovimentoYen, testoYen, type MovimentoYenAutomaticoDto } from '../../shared/yenAutomatici';

const nuovoId = () => crypto.randomUUID().replaceAll('-', '');
const messaggio = (e: unknown) => e instanceof Error ? e.message : 'Anteprima non riuscita.';
const fasciaInParole = (f: 'giorno' | 'sera') => f === 'sera' ? 'di sera' : 'di giorno';

/** Le risposte date nella finestra, per effetto della voce. Una chiave assente = domanda non ancora risposta. */
export interface RisposteOsservazione {
  /** Aojiru: mese («MM») e giorno («GG») del consumo, chiesti solo se il server rifiuta il giorno della voce. */
  mese?: string;
  giorno?: string;
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
  /** Le richieste pronte (con il token dell'anteprima) e che cosa registrano: `descrizione` (senza yen), `spesa` (il prezzo o la quota che la
   *  spunta scala da sola, «prezzo ¥5000»; null se non muove yen, decisione 18) e `nota` (in coda alla riga). */
  pronta: null | { acquisto?: RichiestaRegistraAcquisto; pesca?: RichiestaRegistraSessionePesca; descrizione: string; spesa: string | null; nota: string | null };
  /** Perché la richiesta, pur completa, non si può preparare (anteprima rifiutata, regola della pesca non collegata…). */
  errore: string | null;
  /** Vero se nessuna domanda della finestra risolve `errore`: l'unica via è correggere la voce. */
  daCorreggereNellaVoce: boolean;
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
interface Momento { giorno: string; fascia: 'giorno' | 'sera' }
const stessoMomento = (m: Momento, a: Momento) => m.giorno === a.giorno && m.fascia === a.fascia;

/** Le domande sul giorno del consumo (mese, poi giorno con il giorno della settimana accanto): la fascia resta quella della voce. */
function domandeGiorno(r: RisposteOsservazione): DomandaOsservazione[] {
  const giorni = r.mese ? GIORNI_NEL_MESE[r.mese] ?? 0 : 0;
  return [
    { campo: 'mese', etichetta: 'Mese', opzioni: MESI_GIOCO.map((m) => ({ chiave: m.numero, nome: m.nome })) },
    ...(r.mese ? [{ campo: 'giorno' as const, etichetta: 'Giorno', opzioni: Array.from({ length: giorni }, (_, i) => {
      const gg = String(i + 1).padStart(2, '0');
      return { chiave: gg, nome: String(i + 1), dettaglio: giornoDellaSettimana(`${r.mese}-${gg}`) ?? undefined };
    }) }] : []),
  ];
}

type EffettoAcquisto = EffettoVoceDto & { effetto: Extract<EffettoVoceDto['effetto'], { tipo: 'acquisto' }> };
type EffettoPesca = EffettoVoceDto & { effetto: Extract<EffettoVoceDto['effetto'], { tipo: 'pesca' }> };
const eAcquisto = (e: EffettoVoceDto): e is EffettoAcquisto => e.effetto.tipo === 'acquisto';
const ePesca = (e: EffettoVoceDto): e is EffettoPesca => e.effetto.tipo === 'pesca';

/** Gli effetti della voce che la spunta registra con un'osservazione (consumazioni e visite di pesca). */
export const effettiDaOsservare = (a: AzionePercorsoDto): EffettoVoceDto[] => a.effettiVoce?.effetti.filter((e) => eAcquisto(e) || ePesca(e)) ?? [];

/** Il consumo `r`, se lo ha già un'altra voce del Diario (diversa da questa). */
const diAltraVoce = (fonti: ReadonlyArray<{ fonte: { tipo: 'manuale' } | { tipo: 'diario'; voceUid: string } }>, voceUid: string) =>
  fonti.some((f) => f.fonte.tipo === 'diario' && f.fonte.voceUid !== voceUid);

/** L'Aojiru della voce nel momento `m` (quello della voce o il giorno indicato nella finestra): richiesta (se completa) e domande aperte.
 *  Puro: nessuna chiamata. */
function risolviAcquisto(c: Contesto, a: AzionePercorsoDto, m: Momento, e: EffettoAcquisto, risposte: RisposteOsservazione): { domande: DomandaOsservazione[]; richiesta: NuovaRegistrazioneAcquisto | null } {
  const stato = c.acquisti!;
  const registrazioni = stato.registrazioni.filter((r) => r.identita.articolo === e.effetto.articolo);
  const domande: DomandaOsservazione[] = [];
  // il succo: quello della voce; se manca, il successivo della rotazione dopo l'ultimo consumo confermato prima di questo momento
  const precedenti = registrazioni.filter((r) => r.attiva && chiaveMomento(r.momento.giorno, r.momento.fascia, r.momento.ordine) < chiaveMomento(m.giorno, m.fascia, 0))
    .sort((x, y) => chiaveMomento(x.momento.giorno, x.momento.fascia, x.momento.ordine).localeCompare(chiaveMomento(y.momento.giorno, y.momento.fascia, y.momento.ordine)));
  const ultimo = precedenti[precedenti.length - 1];
  const varianteNota: DoteChiave | null = e.effetto.variante ?? (ultimo ? prossimaVarianteAojiru(ultimo.consumo.variante) : null);
  if (!varianteNota) domande.push({ campo: 'variante', etichetta: 'Che succo hai bevuto', opzioni: ORDINE_AOJIRU.map((d) => ({ chiave: d, nome: nomeDote(d) })) });
  const variante = varianteNota ?? (eDote(risposte.variante) ? risposte.variante : null);
  // il consumo: solo uno già registrato nello stesso momento e con lo stesso succo può essere lo stesso (il server collega solo quelli)
  const nelMomento = registrazioni.filter((r) => stessoMomento(r.momento, m));
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
      // la partita ha già il segno «Acquistato» senza un consumo dietro: è questo consumo o un altro?
      domande.push({ campo: 'rapporto', etichetta: 'L’Aojiru era già segnato «Acquistato»: è questo consumo?', opzioni: [{ chiave: 'rappresenta', nome: 'Sì, è questo' }, { chiave: 'ulteriore', nome: 'No, è un consumo in più' }] });
      rapporto = risposte.rapporto;
    }
  }
  if (!variante || scelta === undefined || (presenza && !rapporto)) return { domande, richiesta: null };
  const ordine = scelta ? scelta.momento.ordine : nelMomento.reduce((m, r) => Math.max(m, r.momento.ordine + 1), 0);
  return { domande, richiesta: {
    operazioneId: nuovoId(), articolo: e.effetto.articolo, momento: { giorno: m.giorno, fascia: m.fascia, ordine },
    variante, fortuna: scelta ? scelta.consumo.fortuna : fortunaDelConsumo(c.fortuna, m.giorno, variante, c.oggi),
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
      // il giorno: quello della voce, salvo che chi gioca ne abbia indicato un altro dopo il rifiuto del server (rilievo 1)
      const chiedeGiorno = r.mese !== undefined || r.giorno !== undefined;
      const indicato = r.mese && r.giorno ? `${r.mese}-${r.giorno}` : null;
      const domandeMomento = chiedeGiorno ? domandeGiorno(r) : [];
      const base = { effettoUid: e.uid, tipo: 'acquisto' as const, nome: 'Aojiru', daCorreggereNellaVoce: false };
      if (chiedeGiorno && !(indicato && dataValida(indicato))) return { ...base, domande: domandeMomento, pronta: null, errore: null };
      const m: Momento = { giorno: chiedeGiorno ? indicato! : a.giorno, fascia: a.fascia };
      const { domande, richiesta } = risolviAcquisto(c, a, m, e, r);
      if (!richiesta) return { ...base, domande: [...domandeMomento, ...domande], pronta: null, errore: null };
      try {
        const ant = await anteprimaRegistrazioneAcquisto(partitaId, richiesta);
        // rilievo 3: con la Fortuna ignota i punti sono 2, o 3 se quel giorno la Fortuna era accesa su quella Dote
        const punti = ant.effetto.puntiConfermati === null ? '2 punti, 3 con la Fortuna' : `${ant.effetto.puntiConfermati} punti`;
        const quando = m.giorno !== a.giorno ? ` · ${dataGiocoTesto(m.giorno)}` : '';
        const nuovo = ant.esitoPrevisto === 'registrata';
        const descrizione = nuovo
          ? `${ant.identita.nome} ${nomeDote(ant.effetto.dote)}${quando} · ♪ · ${punti}`
          : `${ant.identita.nome} ${nomeDote(ant.effetto.dote)}${quando} · collegato al consumo già registrato`;
        // solo il consumo nuovo scala il prezzo (il server lo muove per la consumazione creata)
        const spesa = nuovo && yenMossi ? `prezzo ${testoYen(PREZZO_AOJIRU)}` : null;
        return { ...base, domande: [...domandeMomento, ...domande], nome: ant.identita.nome, pronta: { acquisto: { ...ant.nuovo, revisioneAcquistiAttesa: ant.revisioneAcquistiAttesa }, descrizione, spesa, nota: null }, errore: null };
      } catch (err) {
        // il server rifiuta il giorno: diventa la domanda aperta (le altre dipendono dal giorno e si rifanno dopo la risposta)
        if (isApiError(err, 'momento-non-compatibile')) {
          return { ...base, domande: chiedeGiorno ? [...domandeMomento, ...domande] : domandeGiorno(r), pronta: null,
            errore: chiedeGiorno ? `${dataGiocoTesto(m.giorno)}: ${err.message}` : `${dataGiocoTesto(a.giorno)}, il giorno della voce: ${err.message}` };
        }
        return { ...base, domande: [...domandeMomento, ...domande], pronta: null, errore: messaggio(err), daCorreggereNellaVoce: domandeMomento.length + domande.length === 0 };
      }
    }
    // la pesca di una voce è sempre nel giorno e nella fascia della voce (il server non accetta altro): un rifiuto si risolve dalla voce
    const { domande, richiesta, blocco } = risolviPesca(c, a, e as EffettoPesca, r);
    const base = { effettoUid: e.uid, tipo: 'pesca' as const, nome: 'Pesca', domande };
    if (!richiesta) return { ...base, pronta: null, errore: blocco, daCorreggereNellaVoce: false };
    try {
      const ant = await anteprimaPesca(partitaId, { azione: 'registra-sessione', bersaglio: null, richiesta });
      const quota = pesca?.regola.dati?.quote[a.fascia];
      // rilievo 2: la visita nuova si registra con catture e Perizia ignote; si aggiungono dalla scheda Pesca di Progressi
      const nuova = richiesta.scelta.tipo === 'nuova';
      const descrizione = nuova ? `Visita di pesca ${dataGiocoTesto(a.giorno)}, ${fasciaInParole(a.fascia)}` : 'Visita di pesca · collegata a quella già registrata';
      const spesa = nuova && yenMossi && quota !== undefined && quota > 0 ? `quota ${testoYen(quota)}` : null;
      return { ...base, pronta: { pesca: { ...richiesta, revisionePescaAttesa: ant.revisionePescaAttesa }, descrizione, spesa, nota: nuova ? 'catture da segnare in Progressi › Pesca' : null }, errore: null, daCorreggereNellaVoce: false };
    } catch (err) { return { ...base, pronta: null, errore: messaggio(err), daCorreggereNellaVoce: domande.length === 0 }; }
  }));
  return { effetti: esiti, complete: esiti.every((x) => x.pronta !== null) };
}

/** Che cosa la spunta registra per un effetto, da completare dopo la spunta con gli yen davvero mossi (`descriviOsservate`). */
export interface OsservataSpunta { effettoUid: string; descrizione: string; nota: string | null }

/** La riga di un effetto pronto prima della spunta: che cosa registra, il prezzo o la quota (non ancora scalati) e la nota. */
export const rigaAnteprima = (p: NonNullable<OsservazioneEffetto['pronta']>): string => [p.descrizione, p.spesa, p.nota].filter(Boolean).join(' · ');

/** Le richieste pronte, nell'ordine degli effetti, per la spunta. */
export function richiesteOsservazioni(o: OsservazioniVoce): { acquisti: RichiestaRegistraAcquisto[]; pesche: RichiestaRegistraSessionePesca[]; osservate: OsservataSpunta[] } {
  return {
    acquisti: o.effetti.flatMap((x) => x.pronta?.acquisto ? [x.pronta.acquisto] : []),
    pesche: o.effetti.flatMap((x) => x.pronta?.pesca ? [x.pronta.pesca] : []),
    osservate: o.effetti.flatMap((x) => x.pronta ? [{ effettoUid: x.effettoUid, descrizione: x.pronta.descrizione, nota: x.pronta.nota }] : []),
  };
}

/**
 * Le righe di ciò che la spunta ha registrato, con gli yen DAVVERO mossi per ciascun effetto: il movimento in vigore della causa
 * `voce:effetto` nella risposta della spunta (`AzionePercorsoDto.yenAutomatici`), detto con la frase degli yen automatici («scalati ¥5000
 * dal saldo», «nessuno yen scalato: la spesa era ¥5000, il saldo era a zero»). Nessun movimento (consumo collegato, yen già nel saldo,
 * decisione 18) ⇒ la riga non parla di yen.
 */
export function descriviOsservate(osservate: OsservataSpunta[], voceUid: string, movimenti: MovimentoYenAutomaticoDto[] | undefined): string[] {
  return osservate.map((o) => {
    const m = movimenti?.find((x) => x.causa === 'voce' && x.chiave === `${voceUid}:${o.effettoUid}`);
    const frase = m ? fraseMovimentoYen(m) : null;
    return [o.descrizione, frase ? frase.charAt(0).toLowerCase() + frase.slice(1) : null, o.nota].filter(Boolean).join(' · ');
  });
}
