// ============================================================
// giornataService — la giornata della guida come canone: voci ordinate, modificabili, spuntabili per uid
// ============================================================
//
// Richiesta dell'utente (2026-09-30): le voci aggiunte finivano sempre in fondo; ora si sceglie il punto esatto e si
// spostano su e giù tutte le voci, azioni della guida comprese; e «le modifiche diventano nuovo canone a tutti gli
// effetti quindi non sono mai singola partita... ma tutte devono alterare i dati iniziali». Le voci stanno nel file di
// gioco (`voce_giornata`, migrazione 092): chi esporta il pacchetto le porta con sé. Azione della guida, cosa da fare ed
// evento sono la stessa cosa: tipo, collegamento verificato, rango atteso, effetti della spunta; eventi, scadenze e
// promemoria si mostrano ma non si spuntano. L'ordine è `ordine` 0, 1, 2… dentro la fascia, senza buchi.
// Le spunte stanno nel file delle partite (`spunta_voce_partita`) e si agganciano all'uid, che non cambia spostando,
// correggendo o cambiando fascia. Eliminare una voce passa dal cestino e annulla le sue fonti attraverso il motore unico.
// ============================================================

import { randomBytes } from 'node:crypto';
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { HttpError, httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { conVoceDellaSpunta, registraEvento, revocaEventiDellaVoce, revocaEventiDellaVoceInOgniPartita } from './storicoService.js';
import { confidenti } from './partiteService.js';
import { eGiornoFestivo, verdettoDelConfidente } from './disponibilitaStrutturataService.js';
import { applicaEffettiAzione, annullaEffettiAzione, descriviEffettiApplicati, type OpzioniSpunta } from './effettiAzioneService.js';
import { articoloConNome, mappaAzione, nomeRiferimento, nomiEffetti, nomiFraseEffetto, statoAzione, testoEffetti, verificaEffetti } from './azioniStrutturateService.js';
import { statoGiaVero, statoSegnatoDallaVoce } from './effettiDiStatoService.js';
import { voceConInvitoDi } from './inviti.js';
import { atterraggioDelPalazzo, palazziConclusi } from './palazziService.js';
import { TIPI_AZIONE, TIPI_RIFERIMENTO_AZIONE, type EffettoAzione, type NomiEffettiAzione } from '../../shared/effettiAzione.js';
import type { AzionePercorsoDto, ConfidentePartitaDto, DatiVoceGiornata, DialogoVoceDto, EffettiAzioneDto, FasciaGioco, GenereVoce, QuizVoceDto, RiferimentoAzioneDto } from '../../shared/types.js';
import { attivitaConQuiz, quizVoceDto, type AttivitaConQuiz } from './attivitaService.js';
import { conLegami } from './mappe/legamiInfiltrazioni.js';
import { puntoDescrittivo } from '../../shared/spilli.js';
import type { EsitoRevisioneVoce } from '../../shared/types.js';
import { riferimentiOggettiPerFonti } from './catalogoOggettiLetture.js';
import { leggiEffettiVoce, leggiEffettiVocePerMostrare, salvaEffettiVoce, inizializzaEffettiVoce, preparaRimozioneEffettiVoce, applicaEffettiVoce, annullaEffettiVoce, leggiRicevuteEffettiVoce, applicaEffettoStorico, verificaYenVoce } from './motoreDiario.js';
import { eEffettoConNomi, eEffettoDiStato, fraseEffettoConNomi, normalizzaEffettiVoce, type EffettoLegacyVoce, type EffettoVoce, type NomiFraseEffetto, type StatoEffettiVoceDto } from '../../shared/effettiVoce.js';
import { nomeEffettoConYen, riepilogoEffettiVoce, type CruciverbaRiepilogoEffetti, type GruppoRiepilogoEffettiDto, type NomiRiepilogoEffetti, type QuesitoRiepilogoEffetti } from '../../shared/riepilogoEffetti.js';
import { nomeDote } from '../../shared/doti.js';
import { leggiScelteDialogo } from '../../shared/confidentiScritture.js';
import { conCestino, type ViciniCestino } from './cestinoService.js';
import { leggiRicevutaEffettiAzione } from './effettiAzioneService.js';
import { confidentiAnnullatiAlVecchioModo, nuovaGenerazione, riallineaVoceNelRegistro, senzaEventiGestiti, togliEventiDellaVoce } from './puntiCronologici.js';
import { disponibilitaAcquistoCorrente } from './negoziService.js';
import type { NuovaRegistrazioneAcquisto } from '../../shared/acquisti.js';
import type { PropostaPartitaDto } from '../../shared/propostePartita.js';
import { esitiDellAttivita, lavoroAScelta, scelteEsitoDellaVoce } from './esitiAttivitaService.js';
import { alternativeDellaVoceFatta, contenutoArticoli, effettiInAlternativa, incompatibiliDi } from './alternativeAcquistiService.js';
import { effettiConYenGiaNelSaldo, yenAutomaticiDellaVoce, type EffettoPerYen } from './yenAutomaticiService.js';
import { applicatoDallaSpunta } from './applicatoDallaSpunta.js';
import { yenDelDato } from './yenDeiDati.js';
import { fasciaDellaVoce } from './prezziArticoli.js';
import type { FasciaPrezzo } from '../../shared/catalogo.js';

export interface RigaVoce {
  uid: string; data: string; fascia: string; ordine: number; genere: string; azione: string; note: string | null; tipo: string;
  riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null; rango_atteso: number | null;
  produce_json: string; indice_guida: number | null; created_at: string; updated_at: string;
  /** L3 §1.4 (migrazione 110; assenti su uno schema di prima): voce aggiunta, corretta o segnalata dal team, da rivedere con l'utente. */
  da_rivedere?: number; aggiunta_da?: string | null; testo_precedente_json?: string | null; motivo_revisione?: string | null;
}

const TIPI = new Set<string>(TIPI_AZIONE.map((t) => t.chiave));
const TIPI_RIF = new Set<string>(TIPI_RIFERIMENTO_AZIONE.map((t) => t.chiave));

/** La fascia della voce: «sera» se lo è, altrimenti «giorno». */
export const fasciaDi = (r: Pick<RigaVoce, 'fascia'>): FasciaGioco => (r.fascia === 'sera' ? 'sera' : 'giorno');
/** Il genere della voce: «azione» (si spunta) o «promemoria». Un valore di prima dei due generi (evento, scadenza: il vincolo del
 *  DB li ammette ancora, nessuna voce li usa) si legge come promemoria, che non si spunta; un valore ignoto resta «azione». */
const genereDi = (r: RigaVoce): GenereVoce => (r.genere === 'promemoria' || r.genere === 'evento' || r.genere === 'scadenza' ? 'promemoria' : 'azione');
/** Il tipo d'azione della voce, ricondotto ad «altro» se il valore salvato non è fra i tipi noti (anche il filtro della ricerca nel Diario). */
export function tipoDi(r: Pick<RigaVoce, 'tipo'>): AzionePercorsoDto['tipo'] {
  return (TIPI.has(r.tipo) ? r.tipo : 'altro') as AzionePercorsoDto['tipo'];
}
/** Il collegamento, se è di un tipo che la giornata conosce (un evento scritto prima del 2026-09-30 può averne un altro). */
function riferimentoDi(r: RigaVoce): RiferimentoAzioneDto | null {
  return r.riferimento_tipo && r.riferimento_chiave && TIPI_RIF.has(r.riferimento_tipo) ? { tipo: r.riferimento_tipo as RiferimentoAzioneDto['tipo'], chiave: r.riferimento_chiave } : null;
}
/** Proiezione di compatibilità dei soli tre tipi legacy (dote, lettura, turno) della fonte unica `voce_effetto`: la fonte completa resta
 *  nel DTO (`effettiVoce`). `produce_json` non si legge più (un solo punto di modifica: l'editor degli effetti). */
function produceDi(fonte: StatoEffettiVoceDto): EffettoAzione[] {
  return fonte.effetti.flatMap(e => e.effetto.tipo === 'acquisto'||e.effetto.tipo==='pesca'||e.effetto.tipo==='fortuna'||e.effetto.tipo==='yen'||eEffettoDiStato(e.effetto) ? [] : [e.effetto]);
}
/** La paga di un turno dell'attività, se ne ha una: mai una proposta (R10-06). L13 (decisione 18): la paga base entra da sola nel saldo quando
 *  il turno si registra (`attivitaService.registraTurno`); qui resta il dato da mostrare. */
function pagaDelTurno(attivita: string, esito?: string): { yen: number; massima: number | null; allaSpunta?: true } | undefined {
  // L13 (31/10): il lavoro senza esiti: gli yen ricevuti si dicono alla spunta (base e massima restano come indicazione)
  const lavoro = lavoroAScelta(attivita);
  if (lavoro?.paga) return { yen: lavoro.paga.base, massima: lavoro.paga.massima, allaSpunta: true };
  const paga = prepared('SELECT paga_yen, paga_massima FROM attivita WHERE chiave = ?').get(attivita) as { paga_yen: number | null; paga_massima: number | null } | undefined;
  // L13 (chiusure del 31/10): con gli esiti a paga propria (il quiz di Ore no Beko) la paga la dice l'esito, e il di più entra con lui: niente
  // «fino a … il di più no». L'esito della voce dà la sua paga (o la base); senza esito nella voce la paga si sceglie alla spunta
  const esiti = esitiDellAttivita(attivita)?.esiti?.esiti;
  if (esiti?.some((e) => e.paga)) {
    const propria = esito ? esiti.find((e) => e.chiave === esito)?.paga : undefined;
    return propria ? { yen: propria, massima: null } : paga?.paga_yen ? { yen: paga.paga_yen, massima: null } : undefined;
  }
  return paga?.paga_yen ? { yen: paga.paga_yen, massima: paga.paga_massima } : undefined;
}
/** Il nome di un negozio dalla sua chiave (anche nascosto: la voce che lo cita ne tiene il nome). */
const nomeNegozio = (chiave: string): string | undefined => (prepared('SELECT nome FROM negozio WHERE chiave = ?').pluck().get(chiave) as string | undefined) ?? undefined;

/**
 * Che cosa dà la voce, da UN punto con gli stessi nomi: la frase di ogni effetto, nell'ordine degli effetti (`produceTesto[i]` è l'effetto
 * `i`), e il riepilogo per gruppi che la pagina mostra («Il gioco dà», richiesta dell'utente del 2026-10-25: «formattarlo in modo adeguato,
 * per tutti gli acquisti»). Il totale degli articoli sta nel riepilogo (gruppo «Acquisti · negozio»), non più in una riga «In tutto» in coda.
 */
function cosaDaLaFonte(fonte: StatoEffettiVoceDto, nomi: NomiEffettiAzione, yenGiaNelSaldo: ReadonlySet<string> = new Set(), fatta?: { comprati: ReadonlySet<string>; daScegliere: ReadonlySet<string> }, fascia?: FasciaPrezzo | null): { testo: string[]; riepilogo: GruppoRiepilogoEffettiDto[] } {
  // L13 (decisione 4): gli articoli in alternativa (Set A o Set B) e che cosa contengono; a voce fatta (`fatta.comprati`, gli articoli che la
  // spunta ha segnato) fra le alternative resta solo quella comprata, salvo quelle aggiunte dopo la spunta (`fatta.daScegliere`), da scegliere
  const contenuti = contenutoArticoli(fonte.effetti.flatMap(({ effetto: e }) => (e.tipo === 'articolo' ? [e.articolo] : [])));
  // Ondata 5 (lotto E, decisione 5): il prezzo di un articolo è quello della fascia della voce, lo stesso che la spunta scala
  // (`motoreDiario.yenDellEffetto`): di sera le sfide della Big Bang Burger costano 500 ¥
  const nomiRiepilogo: NomiRiepilogoEffetti = { ...nomiDelRiepilogo(nomi, fascia), incompatibili: incompatibiliDi, contenuto: (k) => contenuti.get(k) };
  // L13 (decisione 18): gli effetti i cui yen erano già nel saldo da prima (per posizione, come gli effetti del riepilogo)
  const vecchi = new Set(fonte.effetti.flatMap((x, i) => (yenGiaNelSaldo.has(x.uid) ? [i] : [])));
  return {
    testo: testoEffettiDellaFonte(fonte, nomi, nomiRiepilogo.frase, yenGiaNelSaldo),
    riepilogo: riepilogoEffettiVoce(fonte.effetti.map((x) => x.effetto), nomiRiepilogo, { yenGiaNelSaldo: vecchi, ...(fatta ? { comprati: fatta.comprati, daScegliere: fatta.daScegliere } : {}) }),
  };
}
/**
 * La domanda del gioco dal suo id per «Il gioco dà» (2026-10-26: «devono essere visualizzate le domande ma anche le risposte»): il testo,
 * il tipo e le risposte giuste in ordine, dalla riga della tabella `domanda` (la stessa fonte della pagina «Domande in classe, esami e quiz
 * in TV» e di «Scuola oggi»). Un JSON delle risposte che non si legge dà la domanda senza risposte, mai un errore della giornata.
 */
function quesitoDellaDomanda(id: number): QuesitoRiepilogoEffetti | undefined {
  const r = prepared('SELECT domanda, tipo, risposte_json FROM domanda WHERE id = ?').get(id) as { domanda: string; tipo: string; risposte_json: string } | undefined;
  if (!r) return undefined;
  let grezze: unknown;
  try { grezze = JSON.parse(r.risposte_json); } catch { grezze = []; }
  const risposte = (Array.isArray(grezze) ? grezze : []).flatMap((x): QuesitoRiepilogoEffetti['risposte'] => {
    if (!x || typeof x !== 'object') return [];
    const { testo, domanda } = x as { testo?: unknown; domanda?: unknown };
    if (typeof testo !== 'string') return [];
    return [typeof domanda === 'string' && domanda.trim() ? { testo, domanda } : { testo }];
  });
  return { domanda: r.domanda, tipo: r.tipo, risposte };
}
/**
 * Il cruciverba del gioco dalla sua data per «Il gioco dà» (2026-10-27: «Aggiungere la visualizzazione della risposta anche per i
 * cruciverba»): l'indizio e la soluzione, dalla riga della tabella `cruciverba` (la stessa fonte della pagina dei cruciverba).
 */
function cruciverbaDellaData(data: string): CruciverbaRiepilogoEffetti | undefined {
  return prepared('SELECT indizio, risposta FROM cruciverba WHERE data = ?').get(data) as CruciverbaRiepilogoEffetti | undefined;
}
/** I nomi del riepilogo e dei testi degli yen già nel saldo (`nomeEffettoConYen`): gli stessi per la nota del gruppo e per la voce. */
function nomiDelRiepilogo(nomi: NomiEffettiAzione, fascia?: FasciaPrezzo | null): NomiRiepilogoEffetti {
  return { frase: nomiFraseEffetto(fascia), azione: nomi, negozio: nomeNegozio, pagaTurno: pagaDelTurno, quesito: quesitoDellaDomanda, cruciverba: cruciverbaDellaData };
}
/**
 * L13 (decisione 18): vero se l'effetto porta yen che la spunta muoverebbe (un articolo con il prezzo, la consumazione, la pesca, gli yen, il
 * turno di un'attività con paga, costo o sfida, la visione di un film con il biglietto, una Richiesta con la ricompensa): per i testi che dicono
 * che i suoi yen erano già nel saldo, che compaiono solo dove c'è qualcosa da dire.
 */
function effettoConYen(e: EffettoVoce): boolean {
  if (e.tipo === 'yen' || e.tipo === 'acquisto' || e.tipo === 'pesca') return true;
  if (e.tipo === 'articolo') return (articoloConNome(e.articolo)?.prezzo ?? 0) > 0;
  if (e.tipo === 'turno') return (yenDelDato('attivita', e.attivita) ?? 0) > 0;
  if (e.tipo === 'lettura' && e.categoria === 'film') return (yenDelDato('film', e.chiave) ?? 0) > 0;
  if (e.tipo === 'richiesta') return (yenDelDato('richiesta', e.richiesta) ?? 0) > 0;
  // 2026-10-28: l'oggetto venduto con il ricavo indicato
  if (e.tipo === 'uscitaOggetto') return e.modo === 'venduto' && !!e.prezzo;
  return false;
}
/** L'effetto come lo legge la nozione degli yen già nel saldo: l'attività del turno e la Richiesta sono le cause vere dei loro yen. */
function effettoPerYen(uid: string, e: EffettoVoce): EffettoPerYen {
  return { uid, tipo: e.tipo, chiave: e.tipo === 'turno' ? e.attivita : e.tipo === 'richiesta' ? e.richiesta : null };
}
/** Il campo `yenGiaNelSaldo` della voce: gli effetti con yen già nel saldo da prima, nell'ordine degli effetti, con i loro nomi (le frasi «in
 *  parte» li nominano) e se sono tutti quelli con yen. */
function datiYenGiaNelSaldo(conYen: ReadonlyArray<{ uid: string; effetto: EffettoVoce }>, gia: ReadonlySet<string>, nomi: NomiEffettiAzione): NonNullable<AzionePercorsoDto['yenGiaNelSaldo']> {
  const n = nomiDelRiepilogo(nomi), vecchi = conYen.filter((x) => gia.has(x.uid));
  return { effetti: vecchi.map((x) => x.uid), nomi: vecchi.map((x) => nomeEffettoConYen(x.effetto, n)), tutti: vecchi.length === conYen.length };
}
/** La frase di ogni effetto della fonte unica, anche acquisto e pesca, con i nomi degli elementi. */
function testoEffettiDellaFonte(fonte: StatoEffettiVoceDto, nomi: NomiEffettiAzione, nomiFrase: NomiFraseEffetto, yenGiaNelSaldo: ReadonlySet<string>): string[] {
  return fonte.effetti.map(({ uid, effetto: e }) => {
    if (e.tipo === 'articolo') {
      // l'articolo comprato e il suo prezzo (decisione 18: spuntando la voce si scala da solo dal saldo, `motoreDiario.yenDellEffetto`)
      // il nome è quello del catalogo; la colonna `nome` dell'articolo può essere vuota (il catalogo unico è il nome vero), e allora la riga non resta senza nome
      const a = nomiFrase.articolo(e.articolo), q = e.quantita ?? 1;
      return a ? `Acquisto: ${a.nome}${q > 1 ? ` ×${q}` : ''}${a.prezzo ? ` · ¥${(a.prezzo * q).toLocaleString('it-IT')}` : ''}` : fraseEffettoConNomi(e, nomiFrase);
    }
    // R12-01/1: tutti gli altri effetti che citano un oggetto per chiave (evento di storia, Persona, domanda, cruciverba, invito, Richiesta), pesca e Fortuna: la frase con i nomi, la stessa dell'editor
    if (eEffettoConNomi(e)) return fraseEffettoConNomi(e, nomiFrase);
    if (e.tipo === 'acquisto') {
      const nome = articoloConNome(e.articolo)?.nome ?? e.articolo;
      return `Acquisto: ${nome}${e.variante ? ` · ${nomeDote(e.variante)}` : ' · variante da osservare alla spunta'}`;
    }
    const testo = testoEffetti([e], nomi)[0]!;
    // R10-06: la paga del turno non è mai una proposta (decisione 18: entra da sola nel saldo registrando il turno). Il di più di una paga
    // variabile non entra da solo, e la frase lo dice; non per un turno di prima, la cui paga era già nel saldo (lo dice la nota del riepilogo)
    if (e.tipo === 'turno') {
      const paga = pagaDelTurno(e.attivita, e.esito);
      // L13 (31/10): il lavoro senza esiti: la paga è un'indicazione, gli yen ricevuti si dicono alla spunta (entrano tutti da soli)
      if (paga?.allaSpunta) return `${testo} · paga ¥${paga.yen.toLocaleString('it-IT')}${paga.massima ? ` (fino a ¥${paga.massima.toLocaleString('it-IT')})` : ''}${yenGiaNelSaldo.has(uid) ? '' : ': gli yen ricevuti li dici alla spunta'}`;
      if (paga) return `${testo} · paga ¥${paga.yen.toLocaleString('it-IT')}${paga.massima && paga.massima > paga.yen ? ` (fino a ¥${paga.massima.toLocaleString('it-IT')}${yenGiaNelSaldo.has(uid) ? '' : ': entra da sola la paga base, il di più no'})` : ''}`;
    }
    return testo;
  });
}
/** I due campi del DTO da `cosaDaLaFonte`: le frasi e il riepilogo (vuoti per un promemoria, che non si spunta). */
function campiCosaDa(c: { testo: string[]; riepilogo: GruppoRiepilogoEffettiDto[] } | null): { produceTesto: string[]; produceRiepilogo: GruppoRiepilogoEffettiDto[] } {
  return { produceTesto: c?.testo ?? [], produceRiepilogo: c?.riepilogo ?? [] };
}
/** Il nome del collegamento: quello salvato (la guida lo scrive a modo suo), altrimenti quello dell'elemento. */
function nomeDi(r: RigaVoce, rif: RiferimentoAzioneDto | null): string | null {
  if (!rif) return null;
  if (r.riferimento_testo) return r.riferimento_testo;
  // un elemento nascosto dal catalogo non si collega di nuovo, ma la voce che lo ha già ne tiene il nome
  try { return nomeRiferimento(rif, { ancheNascosti: true }); } catch { return null; }
}

/** Una voce con i campi della guida, senza lo stato nella partita (fatta, effetti, semaforo). */
export interface VoceBase { uid: string; giorno: string; fascia: FasciaGioco; genere: GenereVoce; azione: string; tipo: AzionePercorsoDto['tipo']; riferimento: RiferimentoAzioneDto | null; riferimentoTesto: string | null; rangoAtteso: number | null; note: string | null; produce: EffettoAzione[] }

/** La voce con i soli campi della guida, con i valori fuori catalogo ricondotti a quelli predefiniti; gli effetti li ha
 *  solo un'azione (eventi, scadenze e promemoria non si spuntano). */
export function voceBase(r: RigaVoce, fonte: StatoEffettiVoceDto = leggiEffettiVocePerMostrare(r.uid)): VoceBase {
  const riferimento = riferimentoDi(r);
  return {
    uid: r.uid, giorno: r.data, fascia: fasciaDi(r), genere: genereDi(r), azione: r.azione, tipo: tipoDi(r), riferimento, riferimentoTesto: nomeDi(r, riferimento),
    rangoAtteso: r.rango_atteso, note: r.note, produce: genereDi(r) === 'azione' ? produceDi(fonte) : [],
  };
}

interface Contesto { fatte: Map<string, EffettiAzioneDto | null>;
  /** Le voci spuntate con la ricevuta illeggibile, col motivo (F3-1): risultano «da correggere». */
  illeggibili: Map<string, string>; conf: Map<string, ConfidentePartitaDto> | null; nomi: NomiEffettiAzione; quiz: Map<string, AttivitaConQuiz>;
  oggetti: ReturnType<typeof riferimentiOggettiPerFonti>;
  /** La partita (L3: per l'infiltrazione che «Entra» apre). */
  partita?: number }

/** La guida del quiz delle attività di cui la voce registra un turno o a cui è collegata (richiesta dell'utente, 2026-10-17:
 *  «quando è previsto lavoro al Convenience Store deve essere consultabile la guida»), una volta sola per attività, con
 *  `oggi` vero se il giorno della voce è uno dei giorni del quiz. */
function quizDellaVoce(v: VoceBase, quiz: Contesto['quiz'], fonte: StatoEffettiVoceDto): QuizVoceDto[] {
  // le attività dei turni (e della pesca) dalla fonte unica degli effetti
  const chiavi = [...fonte.effetti.flatMap(({ effetto: e }) => (e.tipo === 'turno' || e.tipo === 'pesca' ? [e.attivita] : [])), ...(v.riferimento?.tipo === 'attivita' ? [v.riferimento.chiave] : [])];
  return [...new Set(chiavi)].flatMap((c) => {
    const q = quiz.get(c);
    return q ? [quizVoceDto(c, q, v.giorno)] : [];
  });
}

/**
 * R9-03: l'avviso di disponibilità di una voce d'incontro. Il Confidente è valutato al giorno e alla fascia della voce, con il rango che la voce
 * porta (`rango_atteso`); il meteo non c'è (la voce non è un momento della partita), quindi la pioggia non produce avvisi. Solo un avviso,
 * mai un blocco; le voci non si spostano né si riscrivono.
 */
export function avvisiDisponibilitaDellaVoce(r: Pick<RigaVoce, 'genere' | 'riferimento_tipo' | 'riferimento_chiave' | 'data' | 'fascia' | 'rango_atteso'>): Pick<AzionePercorsoDto, 'avvisiDisponibilita'> {
  if (r.genere !== 'azione' || r.riferimento_tipo !== 'confidente' || !r.riferimento_chiave) return {};
  // la pioggia dei requisiti del rango la legge il verdetto (fonte unica, migrazione 306), ma senza meteo non produce avvisi; un giorno del
  // calendario escluso (`date`) è un avviso di giorno come quello della settimana
  const esito = verdettoDelConfidente(r.riferimento_chiave, { data: r.data, fascia: fasciaDi(r), festivo: eGiornoFestivo(r.data), piove: false, rango: r.rango_atteso !== null ? r.rango_atteso - 1 : null });
  if (!esito || esito.stato !== 'non-disponibile' || (esito.causa !== 'giorno' && esito.causa !== 'date' && esito.causa !== 'fascia' && esito.causa !== 'dal')) return {};
  return { avvisiDisponibilita: [{ tipo: esito.causa === 'fascia' ? 'fuori-fascia' : 'fuori-giorno', testo: esito.motivo }] };
}

/**
 * R9-06: il nome dal vivo. Il testo salvato nella voce (`riferimentoTesto`) è come la guida chiamava il Confidente («Yoshida - Sole», «Palazzo di Sae Niijima»); se è
 * diverso dal nome di adesso («Toranosuke Yoshida - Sole») la voce porta anche il nome attuale, da mostrare accanto al testo. Il servizio non riscrive mai il
 * testo; l'unica eccezione è una correzione di dati con migrazione (la 232 ha messo gli accenti mancanti in tre testi), e il confronto è comunque senza accenti.
 */
function nomeAttualeDelRiferimento(r: RigaVoce, rif: RiferimentoAzioneDto | null): Pick<AzionePercorsoDto, 'riferimentoNomeAttuale'> {
  if (!rif || rif.tipo !== 'confidente' || !r.riferimento_testo) return {};
  let attuale: string;
  try { attuale = nomeRiferimento(rif, { ancheNascosti: true }); } catch { return {}; }
  // l'articolo dell'arcano non è una differenza di nome («Igor - Il Matto» e «Igor - Matto» sono lo stesso nome)
  const piatto = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\b(il|lo|la|l|i|gli|le)\b/g, ' ').replace(/\s+/g, ' ').trim();
  return piatto(attuale) === piatto(r.riferimento_testo) ? {} : { riferimentoNomeAttuale: attuale };
}

/** La voce per l'interfaccia: i campi della guida più la frase degli effetti, la spunta e i suoi effetti nella partita,
 *  il semaforo (solo per le azioni, e solo se ci sono i Confidenti della partita), la mappa collegata e la guida del quiz. */
/**
 * Le decisioni ancora aperte di una voce nella partita: le proposte di punti (`utente.da_applicare` aperte) della voce e quelle del consumo che la
 * voce ha confermato (ramo `acquisto_provenienza`). È il conteggio del pulsante «Applica» sulla voce (BON-01) e, per lo stesso numero,
 * la condizione dell'avanzamento automatico di fascia e di giorno (`avanzaSeFasciaCompleta`, decisione A1 del 2026-10-25).
 */
export function decisioniApertePerVoce(partitaId: number, voceUid: string): number {
  return prepared(`SELECT COUNT(*) FROM utente.da_applicare WHERE partita_id=? AND stato='aperta' AND (voce_uid=? OR (causa_tipo='acquisto' AND causa_chiave IN (SELECT acquisto_id FROM utente.acquisto_provenienza WHERE partita_id=? AND voce_uid=?)))`).pluck().get(partitaId, voceUid, partitaId, voceUid) as number;
}

/**
 * L13 (decisione 19): gli effetti di stato della voce spuntata che NON valgono nella partita, letti dai loro due punti (nessuna copia): senza la
 * riga del «prima» (`effetto_stato_voce`, scritta dalla spunta, dal salvataggio o dall'approvazione), «da approvare» se c'è la proposta aperta
 * dell'elenco della partita, altrimenti «non applicato» se lo stato non c'è (la stessa lettura della spunta). Non ci sono: quelli con la riga
 * (segnati: la finestra li mostra in «Applicato dalla spunta» se togliendo la spunta si annullano; o già veri), quelli già veri senza riga
 * («le etichette di testo devono essere visibili solo se hanno senso»: non informano), e gli articoli in alternativa (decisione 4,
 * `effettiInAlternativa`: senza riga non sono stati scelti, e il riepilogo della voce li dice comprati o da scegliere).
 */
function statiNonApplicatiDellaVoce(p: number, fonte: StatoEffettiVoceDto): NonNullable<AzionePercorsoDto['statiNonApplicati']> {
  // Ondata 5 (lotto E): il prezzo dell'articolo nella frase è quello della fascia della voce, lo stesso che la spunta scala
  const nomi = nomiFraseEffetto(fasciaDellaVoce(fonte.voceUid));
  const inAlternativa = effettiInAlternativa(fonte.effetti);
  return fonte.effetti.flatMap(({ uid, effetto: e }): NonNullable<AzionePercorsoDto['statiNonApplicati']> => {
    if (!eEffettoDiStato(e) || inAlternativa.has(uid)) return [];
    // la Persona «anche nella scorta» con il solo compendio segnato manca ancora della scorta (`statoSegnatoDallaVoce`)
    if (statoSegnatoDallaVoce(p, fonte.voceUid, uid, e)) return [];
    const testo = fraseEffettoConNomi(e, nomi);
    if (prepared("SELECT 1 FROM utente.da_applicare WHERE partita_id = ? AND causa_tipo = 'voce' AND causa_chiave = ? AND tipo = 'effetto-voce' AND stato = 'aperta'").get(p, `${fonte.voceUid}:${uid}`)) return [{ effettoUid: uid, esito: 'da-approvare' as const, testo }];
    // l'oggetto ricevuto somma, non è uno stato sì/no: senza la sua riga manca sempre (la stessa regola del censimento)
    return e.tipo !== 'oggetto' && statoGiaVero(p, e) ? [] : [{ effettoUid: uid, esito: 'non-applicato' as const, testo }];
  });
}

function voceDto(r: RigaVoce, ctx: Contesto): AzionePercorsoDto {
  // la fonte unica degli effetti, letta una volta: frase, quiz, oggetti citati e DTO la condividono. F3: una voce con la fonte o le
  // ricevute incoerenti risulta «da correggere» col motivo, da sola: le altre voci del giorno si vedono e funzionano
  let fonte = leggiEffettiVocePerMostrare(r.uid);
  let ricevuteEffetti: ReturnType<typeof leggiRicevuteEffettiVoce> = [];
  if (ctx.partita !== undefined) {
    try { ricevuteEffetti = leggiRicevuteEffettiVoce(ctx.partita, r.uid); }
    catch (e) {
      if (!(e instanceof HttpError) || e.status !== 409) throw e;
      fonte = { ...fonte, stato: 'legacy-da-correggere', effetti: [], motivo: e.message };
    }
  }
  // F3-1: la ricevuta storica della spunta illeggibile isola la voce, non la giornata
  const ricevutaRotta = ctx.illeggibili.get(r.uid);
  if (ricevutaRotta !== undefined) fonte = { ...fonte, stato: 'legacy-da-correggere', effetti: [], motivo: ricevutaRotta };
  const v = voceBase(r, fonte);
  const spuntabile = v.genere === 'azione';
  const fonteOggetto = v.riferimento?.tipo === 'attivita' ? 'videogioco' : v.riferimento?.tipo;
  const oggettoRiferimento = fonteOggetto && v.riferimento ? ctx.oggetti.get(`${fonteOggetto}/${v.riferimento.chiave}`) ?? null : null;
  const oggettiCitati = new Map(oggettoRiferimento ? [[oggettoRiferimento.chiave, oggettoRiferimento]] : []);
  for (const { effetto: e } of fonte.effetti) if (e.tipo === 'lettura') {
    const o = ctx.oggetti.get(`${e.categoria}/${e.chiave}`); if (o) oggettiCitati.set(o.chiave, o);
  }
  // BON-01: le proposte di punti ancora aperte di questa voce (quelle della voce e quelle del consumo che la voce ha confermato)
  const daApplicare = ctx.partita === undefined ? 0 : decisioniApertePerVoce(ctx.partita, r.uid);
  // L13 (decisione 18): gli yen che la spunta di questa voce ha mosso da soli nella partita (spese scalate, guadagni entrati), da mostrare sulla voce
  const yenAutomatici = ctx.partita === undefined || !ctx.fatte.has(r.uid) ? [] : yenAutomaticiDellaVoce(ctx.partita, r.uid);
  // 2026-10-26: ciò che la spunta ha applicato ed è ancora in vigore (quello che togliendola si annulla), per la finestra delle ricevute; le
  // ricevute annullate e quelle tecniche restano nel database e in `ricevuteEffetti`, non qui
  const applicato = ctx.partita === undefined || !spuntabile || !ctx.fatte.has(r.uid) ? [] : applicatoDallaSpunta(ctx.partita, r.uid, fonte, ricevuteEffetti, yenAutomatici);
  // gli effetti con yen il cui denaro era già nel saldo da prima che gli yen si muovessero da soli (la nozione unica,
  // `yenAutomaticiService.effettiConYenGiaNelSaldo`: applicati da una spunta di prima senza movimento per la loro causa, o segnati togliendola):
  // la spunta non li muove. Le frasi e le note della voce lo dicono effetto per effetto, invece di promettere un movimento che non c'è
  const conYen = ctx.partita === undefined || !spuntabile ? [] : fonte.effetti.filter((x) => effettoConYen(x.effetto));
  const yenGiaNelSaldo = ctx.partita === undefined || !conYen.length ? new Set<string>() : effettiConYenGiaNelSaldo(ctx.partita, r.uid, conYen.map((x) => effettoPerYen(x.uid, x.effetto)));
  // L13: le scelte che la spunta chiederà (esito del turno, note di una Dote a valori possibili), al giorno della voce; gli effetti rivendicati
  // da un acquisto o da una pesca non si applicano come legacy e quindi non chiedono niente (stessa regola di `applicaEffettiVoce`)
  const sostituiti = new Set(fonte.effetti.flatMap(({ effetto: e }) => e.tipo === 'acquisto' ? e.sostituisceDoti : e.tipo === 'pesca' ? [...e.sostituisceDoti, ...e.sostituisceTurni] : []));
  const scelteEsito = ctx.partita !== undefined && spuntabile && !ctx.fatte.has(r.uid) && fonte.stato === 'convertita'
    ? scelteEsitoDellaVoce(ctx.partita, { data: r.data, fascia: fasciaDi(r) }, fonte.effetti.filter((e) => !sostituiti.has(e.uid)), v) : [];
  // L13 (decisione 19): gli effetti di stato che nella partita non valgono (da approvare nell'elenco, o non applicati), a parte da ciò che la
  // spunta ha applicato: «era già vero» non si dice (non informa)
  const statiNonApplicati = ctx.partita === undefined || !spuntabile || !ctx.fatte.has(r.uid) ? [] : statiNonApplicatiDellaVoce(ctx.partita, fonte);
  return {
    ...v, effettiVoce: fonte, ricevuteEffetti, ...(applicato.length ? { applicatoDallaSpunta: applicato } : {}), ...(statiNonApplicati.length ? { statiNonApplicati } : {}), ...(daApplicare > 0 ? { daApplicare } : {}),
    // decisione 18: la scelta dell'esito di un turno di prima dice che il prezzo della sfida era già nel saldo (la spunta non lo scala)
    ...(scelteEsito.length ? { scelteEsito: scelteEsito.map((s) => ((s.tipo === 'turno' || s.tipo === 'lavoro') && yenGiaNelSaldo.has(s.effettoUid) ? { ...s, yenGiaNelSaldo: true as const } : s)) } : {}), ...(yenAutomatici.length ? { yenAutomatici } : {}), ...(yenGiaNelSaldo.size ? { yenGiaNelSaldo: datiYenGiaNelSaldo(conYen, yenGiaNelSaldo, ctx.nomi) } : {}),
    ...avvisiDisponibilitaDellaVoce(r), ...nomeAttualeDelRiferimento(r, v.riferimento), oggettoRiferimento, oggettiCitati: [...oggettiCitati.values()],
    // L13 (decisione 4): a voce fatta, gli articoli segnati e quelli in alternativa aggiunti dopo la spunta (il riepilogo non nega un acquisto mai chiesto)
    ...campiCosaDa(spuntabile ? cosaDaLaFonte(fonte, ctx.nomi, yenGiaNelSaldo, ctx.partita !== undefined && ctx.fatte.has(r.uid) ? alternativeDellaVoceFatta(ctx.partita, r.uid, fonte.effetti) : undefined, fasciaDi(r)) : null),
    fatta: spuntabile && ctx.fatte.has(r.uid), effetti: ctx.fatte.get(r.uid) ?? null,
    stato: ctx.conf && spuntabile ? statoAzione(v, ctx.conf, ctx.partita) : null, mappa: mappaAzione(v),
    // il Palazzo collegato: dove si atterra il giorno della voce (scelta dell'utente, 2026-10-04). L6 (R6-17): la destinazione unica, la stessa
    // della metro e del campo `mappa` (la regola d'atterraggio del giorno, o l'ingresso del Palazzo). 2026-10-30 («il click su Memento non
    // deve visualizzare la mappa ma aprire come per il palazzo la sezione apposita»): solo per un dungeon di tipo Palazzo (`ePalazzo`, la
    // stessa regola del campo «Infiltrazioni»); i Memento non si visitano per planimetrie, il cartellino apre la loro scheda. Il chip
    // «Sulla mappa» (`mappa`) resta com'è
    atterraggio: v.riferimento?.tipo === 'dungeon' && ePalazzo(v.riferimento.chiave) ? atterraggioDelPalazzo(v.riferimento.chiave, v.giorno) : null,
    quiz: quizDellaVoce(v, ctx.quiz, fonte),
    // L3: il campo «Infiltrazioni» (solo per le voci di un Palazzo) e lo stato «da rivedere» (solo se c'è)
    ...campiInfiltrazioni(r, ctx.partita),
    ...campiRevisione(r),
    ...campoDialogo(v, ctx.conf),
  };
}

/** R10-11k: la voce ha l'effetto «invito avvenuto» del Confidente a cui è collegata (la chiave dell'invito comincia con «confidente/»): ×1,2 ai punti. */
function haInvitoDelConfidente(voceUid: string, riferimento: RiferimentoAzioneDto | null): boolean {
  if (riferimento?.tipo !== 'confidente') return false;
  return voceConInvitoDi(voceUid, riferimento.chiave);
}

/**
 * R10-11/C: il dialogo del passaggio di rango di una voce di Confidente (`rangoAtteso`), dalle scelte di `confidente_dialogo` (L9). Sola
 * lettura: la voce lo mostra fra le sue note (risposte migliori) e la spunta lo propone accanto alle note; i punti li dà solo la scelta
 * dell'utente. Senza riga di dialogo, nessun campo. Con la partita, anche `rangoPartita` e `dialogoPartita` (il prossimo evento vero).
 */
function campoDialogo(v: VoceBase, conf: Map<string, ConfidentePartitaDto> | null): { dialogo?: DialogoVoceDto; rangoPartita?: number; dialogoPartita?: DialogoVoceDto } {
  // senza rango atteso la voce non prevede una salita di rango: nessun dialogo da proporre (scelta dell'utente, 2026-10-24)
  if (v.tipo !== 'confidente' || v.riferimento?.tipo !== 'confidente' || v.rangoAtteso === null) return {};
  const chiave = v.riferimento.chiave;
  const dialogo = dialogoDelRango(chiave, v.rangoAtteso);
  // 2026-10-24 (progetto dei Confidenti approvato dall'utente): con una partita, anche il rango del Confidente nella partita e, se il
  // prossimo evento non è quello del rango atteso della voce, il suo dialogo: la voce mostra le risposte di ciò che si gioca davvero
  const c = conf?.get(chiave);
  const prossimo = c && c.rango < 10 ? c.rango + 1 : null;
  // già al rango atteso (per esempio salito dal cassetto del Confidente): l'evento appena giocato è quello della voce, non il successivo
  const dialogoPartita = c && prossimo !== null && prossimo !== v.rangoAtteso && c.rango !== v.rangoAtteso ? dialogoDelRango(chiave, prossimo) : null;
  return { ...(dialogo ? { dialogo } : {}), ...(c ? { rangoPartita: c.rango } : {}), ...(dialogoPartita ? { dialogoPartita } : {}) };
}

/** Il dialogo dell'evento di un rango del Confidente (scelte di `confidente_dialogo`, L9), o null se manca o è illeggibile. */
function dialogoDelRango(chiave: string, rango: number): DialogoVoceDto | null {
  const r = prepared('SELECT note, scelte_json FROM confidente_dialogo WHERE confidente_chiave = ? AND rango = ?').get(chiave, rango) as { note: string; scelte_json: string } | undefined;
  if (!r) return null;
  // migrazione 309: le stesse scelte della scheda del Confidente, dall'unico lettore (punti solo numerici, con il ramo amore)
  const scelte = leggiScelteDialogo(r.scelte_json);
  if (scelte.length === 0) return null;
  return { confidente: chiave, rango, note: r.note, scelte: scelte.map((s) => ({ ...s, puntiAmore: s.puntiAmore ?? null })) };
}

// ---- L3: il campo «Infiltrazioni» delle voci di Palazzo (lotti/L3/modifiche.md §2.1.6, §3.4, §4.4) ----
//
// Una voce può descrivere più infiltrazioni: il legame è un insieme **ordinato** (`voce_infiltrazione`, la chiave è la posizione), che
// solo l'utente scrive (nessuna migrazione lo fa) e che non tocca testo, ordine, giorno, fascia, uid né spunte della voce. La stessa
// infiltrazione può tornare, mai in due posizioni di seguito. Accanto, una **proposta**: le righe di G-022 dell'Esperto della guida
// (`proposta_infiltrazione_voce`, 110), oppure, per le voci scritte dopo, le due regole certe calcolate a richiesta.

/** Le infiltrazioni di un Palazzo, in ordine. */
function infiltrazioniDelPalazzo(palazzo: string): Array<{ chiave: string; nome: string; ordine: number }> {
  return prepared('SELECT chiave, nome, ordine FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine, chiave').all(palazzo) as Array<{ chiave: string; nome: string; ordine: number }>;
}

/** L'insieme scelto per la voce, nell'ordine (con il Palazzo di ogni infiltrazione). */
function insiemeDellaVoce(uid: string): Array<{ chiave: string; nome: string; dungeon: string }> {
  return prepared(`SELECT i.chiave, i.nome, i.dungeon_chiave AS dungeon FROM voce_infiltrazione v JOIN dungeon_area i ON i.chiave = v.infiltrazione_chiave
    WHERE v.voce_uid = ? ORDER BY v.ordine`).all(uid) as Array<{ chiave: string; nome: string; dungeon: string }>;
}

/** Le righe della proposta di G-022 per la voce, in ordine (con il Palazzo di ogni infiltrazione). */
function propostaSalvata(uid: string): Array<{ chiave: string; nome: string; dungeon: string; motivo: string; certezza: 'certa' | 'multipla' | 'probabile' }> {
  return prepared(`SELECT i.chiave, i.nome, i.dungeon_chiave AS dungeon, p.motivo, p.certezza FROM proposta_infiltrazione_voce p JOIN dungeon_area i ON i.chiave = p.infiltrazione_chiave
    WHERE p.voce_uid = ? ORDER BY p.ordine`).all(uid) as Array<{ chiave: string; nome: string; dungeon: string; motivo: string; certezza: 'certa' | 'multipla' | 'probabile' }>;
}

/** Vero se il dungeon è un Palazzo (i Memento non hanno il campo: R3-12). */
function ePalazzo(dungeon: string): boolean {
  return !!prepared("SELECT 1 FROM dungeon WHERE chiave = ? AND tipo = 'palazzo'").get(dungeon);
}

/**
 * Il Palazzo della voce, che decide se il campo c'è e quali infiltrazioni ammette (§2.1.6, regola unica): quello del riferimento
 * `dungeon:<k>`; altrimenti quello delle infiltrazioni già nell'insieme; altrimenti quello della sua proposta; altrimenti nessuno.
 */
export function palazzoDellaVoce(r: Pick<RigaVoce, 'uid' | 'riferimento_tipo' | 'riferimento_chiave'>): string | null {
  if (!conLegami()) return null;
  if (r.riferimento_tipo === 'dungeon' && r.riferimento_chiave && ePalazzo(r.riferimento_chiave)) return r.riferimento_chiave;
  const insieme = insiemeDellaVoce(r.uid);
  if (insieme.length > 0) return insieme[0].dungeon;
  const proposta = propostaSalvata(r.uid);
  return proposta.length > 0 ? proposta[0].dungeon : null;
}

/** Il testo confrontabile: minuscolo, senza accenti né punteggiatura, parole separate da uno spazio. */
function normalizzato(testo: string): string {
  return ` ${testo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

/**
 * La proposta per la voce, solo con l'insieme vuoto: le righe di G-022, oppure le regole certe a richiesta — (a) il nome di **una sola**
 * infiltrazione del Palazzo compare nel testo della voce (senza maiuscole, accenti e punteggiatura); (b) la data della voce (`gg/mm`)
 * compare nel nome di **una sola** infiltrazione. Più candidati, o nessuno: nessuna proposta.
 */
export function propostaInfiltrazioni(r: Pick<RigaVoce, 'uid' | 'data' | 'azione' | 'note'>, palazzo: string): AzionePercorsoDto['propostaInfiltrazioni'] {
  const salvata = propostaSalvata(r.uid).filter((p) => p.dungeon === palazzo);
  if (salvata.length > 0) return { infiltrazioni: salvata.map(({ chiave, nome }) => ({ chiave, nome })), motivo: salvata[0].motivo, certezza: salvata[0].certezza };
  const elenco = infiltrazioniDelPalazzo(palazzo);
  const testo = normalizzato(`${r.azione} ${r.note ?? ''}`);
  const perNome = elenco.filter((i) => normalizzato(i.nome).trim() && testo.includes(normalizzato(i.nome)));
  if (perNome.length === 1) return { infiltrazioni: [{ chiave: perNome[0].chiave, nome: perNome[0].nome }], motivo: 'Il nome dell’infiltrazione è nel testo della voce.', certezza: 'certa' };
  const [mm, gg] = r.data.split('-');
  const perData = elenco.filter((i) => new RegExp(`(^|[^0-9])${gg}/${mm}([^0-9]|$)`).test(i.nome));
  if (perData.length === 1) return { infiltrazioni: [{ chiave: perData[0].chiave, nome: perData[0].nome }], motivo: 'La data della voce è nel nome dell’infiltrazione.', certezza: 'certa' };
  return null;
}

/** Le infiltrazioni completate nella partita: almeno una voce da segnare, e tutte segnate (la regola di `completamentoAree.ts`). */
function infiltrazioniCompletate(chiavi: readonly string[], partitaId: number): Set<string> {
  const out = new Set<string>();
  for (const k of new Set(chiavi)) {
    const voci = prepared('SELECT chiave, tipo, area_dedalo_chiave FROM punto_interesse WHERE area_chiave = ?').all(k) as Array<{ chiave: string; tipo: string; area_dedalo_chiave: string | null }>;
    const daSegnare = voci.filter((v) => !puntoDescrittivo(v.tipo, v.area_dedalo_chiave));
    if (daSegnare.length > 0 && daSegnare.every((v) => prepared('SELECT 1 FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partitaId, v.chiave))) out.add(k);
  }
  return out;
}

/**
 * I campi del §3.1 per una voce con un Palazzo; nessuno per le altre (assenti, non vuoti). `infiltrazioneDaAprire` («Entra», §4.4, UX3-1
 * con la decisione del PM): con l'insieme valorizzato la prima non completata, oppure l'ultima; con l'insieme vuoto e una proposta la
 * **prima della proposta**, qualunque sia la certezza; senza insieme né proposta il campo è assente (l'interfaccia apre «in corso»).
 */
function campiInfiltrazioni(r: RigaVoce, partitaId?: number): Partial<AzionePercorsoDto> {
  const palazzo = palazzoDellaVoce(r);
  if (!palazzo) return {};
  const insieme = insiemeDellaVoce(r.uid).map(({ chiave, nome }) => ({ chiave, nome }));
  const proposta = insieme.length === 0 ? propostaInfiltrazioni(r, palazzo) : null;
  let daAprire: string | undefined;
  if (insieme.length > 0) {
    const completate = partitaId === undefined ? new Set<string>() : infiltrazioniCompletate(insieme.map((i) => i.chiave), partitaId);
    daAprire = insieme.find((i) => !completate.has(i.chiave))?.chiave ?? insieme[insieme.length - 1].chiave;
  } else if (proposta && proposta.infiltrazioni.length > 0) daAprire = proposta.infiltrazioni[0].chiave;
  return {
    infiltrazioni: insieme, infiltrazioniDelPalazzo: infiltrazioniDelPalazzo(palazzo),
    propostaInfiltrazioni: proposta,
    ...(daAprire !== undefined ? { infiltrazioneDaAprire: daAprire } : {}),
  };
}

/** Ciò che la ricerca nel Diario mostra di una voce trovata, oltre al testo e alle note della riga. */
export interface VocePerRicerca { riferimentoTesto: string | null; spuntando: string[]; fatta: boolean | null }

/**
 * La ricerca nel Diario (Guida › Giorno per giorno, 2026-10-29): per le voci trovate, il nome del collegamento, le frasi di «Spuntando succede»
 * e, con la partita, la spunta, con le STESSE regole della voce del giorno (`voceDto`): la fonte unica degli effetti, isolata «da correggere»
 * (senza frasi) se la ricevuta della spunta o le ricevute degli effetti non si leggono, i nomi degli effetti, gli yen già nel saldo e, a voce
 * fatta, le alternative comprate; un promemoria non ha frasi. Le spunte della partita si leggono una volta sola per tutte le voci.
 */
export function vociPerRicerca(righe: readonly RigaVoce[], partitaId?: number): Map<string, VocePerRicerca> {
  const spunte = leggiSpunte(partitaId);
  const nomi = nomiEffetti();
  const out = new Map<string, VocePerRicerca>();
  for (const r of righe) {
    let fonte = leggiEffettiVocePerMostrare(r.uid);
    if (partitaId !== undefined) {
      try { leggiRicevuteEffettiVoce(partitaId, r.uid); }
      catch (e) {
        if (!(e instanceof HttpError) || e.status !== 409) throw e;
        fonte = { ...fonte, stato: 'legacy-da-correggere', effetti: [], motivo: e.message };
      }
    }
    const ricevutaRotta = spunte.illeggibili.get(r.uid);
    if (ricevutaRotta !== undefined) fonte = { ...fonte, stato: 'legacy-da-correggere', effetti: [], motivo: ricevutaRotta };
    const v = voceBase(r, fonte);
    const spuntabile = v.genere === 'azione';
    const fatta = spunte.fatte.has(r.uid);
    const conYen = partitaId === undefined || !spuntabile ? [] : fonte.effetti.filter((x) => effettoConYen(x.effetto));
    const yenGiaNelSaldo = partitaId === undefined || !conYen.length ? new Set<string>() : effettiConYenGiaNelSaldo(partitaId, r.uid, conYen.map((x) => effettoPerYen(x.uid, x.effetto)));
    const spuntando = spuntabile ? cosaDaLaFonte(fonte, nomi, yenGiaNelSaldo, partitaId !== undefined && fatta ? alternativeDellaVoceFatta(partitaId, r.uid, fonte.effetti) : undefined, fasciaDi(r)).testo : [];
    out.set(r.uid, { riferimentoTesto: v.riferimentoTesto, spuntando, fatta: partitaId === undefined ? null : spuntabile && fatta });
  }
  return out;
}

/** Una voce della giornata per uid, com'è nel suo giorno (con la partita, il suo stato): la scheda del Palazzo aperta da una voce
 *  (`?daVoce=`, UX3-1) la legge per dire da quale proposta viene. 404 `voce-non-trovata`. */
export function vocePercorso(uid: string, partitaId?: number): AzionePercorsoDto {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const r = rigaVoce(uid);
  return vociDelGiorno(r.data, partitaId).find((v) => v.uid === uid)!;
}

/** Lo stato «da rivedere» (§1.4) della voce, solo quando c'è qualcosa da dire (assente vale «non da rivedere»). */
function campiRevisione(r: RigaVoce): Partial<AzionePercorsoDto> {
  if (!r.da_rivedere && !r.aggiunta_da && !r.testo_precedente_json && !r.motivo_revisione) return {};
  let testoPrecedente: AzionePercorsoDto['testoPrecedente'] = null;
  if (r.testo_precedente_json) {
    const p = JSON.parse(r.testo_precedente_json) as { azione: string; note: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null };
    const riferimento = riferimentoDi({ ...r, riferimento_tipo: p.riferimento_tipo, riferimento_chiave: p.riferimento_chiave });
    testoPrecedente = { azione: p.azione, note: p.note, riferimento, riferimentoTesto: p.riferimento_testo };
  }
  return { daRivedere: r.da_rivedere === 1, aggiuntaDa: r.aggiunta_da === 'team' ? 'team' : null, motivoRevisione: r.motivo_revisione ?? null, testoPrecedente };
}

/**
 * L'insieme ordinato delle infiltrazioni di una voce (R3-37), anche vuoto («nessuna»): sostituisce quello di prima in una transazione e
 * scrive **solo** `voce_infiltrazione` (testo, ordine, giorno, fascia, uid e spunte della voce restano). Solo infiltrazioni del Palazzo
 * della voce (400 `infiltrazione-di-un-altro-palazzo`), che esistono (400 `infiltrazione-inesistente`); la stessa può tornare, ma non
 * in due posizioni di seguito (400 `infiltrazione-ripetuta-di-seguito`). Una voce senza Palazzo non ha il campo (400 `voce-senza-palazzo`).
 */
export function impostaInfiltrazioniVoce(uid: string, chiavi: readonly string[], partitaId?: number): AzionePercorsoDto {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const r = rigaVoce(uid);
  const palazzo = palazzoDellaVoce(r);
  if (!palazzo) throw httpErrors.badRequest('voce-senza-palazzo', 'Questa voce non riguarda un Palazzo: non ha il campo «Infiltrazioni».');
  for (const k of new Set(chiavi)) {
    const i = prepared('SELECT nome, dungeon_chiave FROM dungeon_area WHERE chiave = ?').get(k) as { nome: string; dungeon_chiave: string } | undefined;
    if (!i) throw httpErrors.badRequest('infiltrazione-inesistente', `L’infiltrazione '${k}' non esiste.`);
    if (i.dungeon_chiave !== palazzo) throw httpErrors.badRequest('infiltrazione-di-un-altro-palazzo', `«${i.nome}» è di un altro Palazzo: la voce si lega alle infiltrazioni del suo.`);
  }
  if (chiavi.some((k, i) => i > 0 && k === chiavi[i - 1])) throw httpErrors.badRequest('infiltrazione-ripetuta-di-seguito', 'La stessa infiltrazione non può stare due volte di seguito: un percorso ci torna dopo un’altra.');
  getDb().transaction(() => {
    prepared('DELETE FROM voce_infiltrazione WHERE voce_uid = ?').run(uid);
    chiavi.forEach((k, i) => prepared('INSERT INTO voce_infiltrazione (voce_uid, ordine, infiltrazione_chiave) VALUES (?, ?, ?)').run(uid, i, k));
  })();
  return vociDelGiorno(r.data, partitaId).find((v) => v.uid === uid)!;
}

/**
 * «Da rivedere» (§1.4, il meccanismo unico con L10): «Tieni il nuovo» (`tieni`) e «Fatto» (`fatto`) tolgono il segno; «Rimetti il
 * precedente» (`rimetti`) rimette i campi com'erano prima della correzione del team (il testo precedente resta) e toglie il segno — solo
 * con un testo precedente (400 `senza-testo-precedente`). Una voce non da rivedere: 409 `voce-non-da-rivedere`.
 */
export function rivediVoce(uid: string, esito: EsitoRevisioneVoce, partitaId?: number): AzionePercorsoDto {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const r = rigaVoce(uid);
  if (r.da_rivedere !== 1) throw httpErrors.conflict('voce-non-da-rivedere', 'Questa voce non è da rivedere.');
  if (esito === 'rimetti') {
    if (!r.testo_precedente_json) throw httpErrors.badRequest('senza-testo-precedente', 'Questa voce non ha un testo precedente da rimettere.');
    const p = JSON.parse(r.testo_precedente_json) as { azione: string; note: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null };
    prepared(`UPDATE voce_giornata SET azione = ?, note = ?, riferimento_tipo = ?, riferimento_chiave = ?, riferimento_testo = ?, da_rivedere = 0, updated_at = ? WHERE uid = ?`)
      .run(p.azione, p.note, p.riferimento_tipo, p.riferimento_chiave, p.riferimento_testo, nowIso(), uid);
  } else {
    prepared('UPDATE voce_giornata SET da_rivedere = 0 WHERE uid = ?').run(uid);
  }
  return vociDelGiorno(r.data, partitaId).find((v) => v.uid === uid)!;
}

/** 404 se la data non è un giorno del percorso. */
function giornoEsiste(data: string): void {
  if (!prepared('SELECT 1 FROM giorno WHERE data = ?').get(data)) throw httpErrors.notFound('giorno-non-trovato', `Nessun giorno del percorso il ${data}.`);
}

/** Le voci di un giorno nel loro ordine: prima di giorno, poi di sera. */
export function righeDelGiorno(data: string): RigaVoce[] {
  return prepared("SELECT * FROM voce_giornata WHERE data = ? ORDER BY CASE fascia WHEN 'giorno' THEN 0 ELSE 1 END, ordine, uid").all(data) as RigaVoce[];
}

/** Le spunte della partita sulle voci di un giorno (o di tutti i giorni), con gli effetti che hanno applicato. */
export function spuntePartita(partitaId: number | undefined, data?: string): Map<string, EffettiAzioneDto | null> {
  return leggiSpunte(partitaId, data).fatte;
}

/**
 * Le spunte con la ricevuta degli effetti. F3: una ricevuta illeggibile (409 di `leggiRicevutaEffettiAzione`) non fa saltare la giornata:
 * la spunta resta (la voce è fatta), senza effetti, e il motivo va in `illeggibili`, così quella voce risulta «da correggere» e le altre si
 * vedono e funzionano. Non si tocca niente: i dati restano com'erano. Le scritture (spunta, annulla) continuano a leggere in modo rigido.
 */
function leggiSpunte(partitaId: number | undefined, data?: string): { fatte: Map<string, EffettiAzioneDto | null>; illeggibili: Map<string, string> } {
  const fatte = new Map<string, EffettiAzioneDto | null>();
  const illeggibili = new Map<string, string>();
  if (partitaId === undefined) return { fatte, illeggibili };
  const righe = (data === undefined
    ? prepared('SELECT voce_uid, effetti_json FROM spunta_voce_partita WHERE partita_id = ?').all(partitaId)
    : prepared('SELECT s.voce_uid, s.effetti_json FROM spunta_voce_partita s JOIN voce_giornata v ON v.uid = s.voce_uid WHERE s.partita_id = ? AND v.data = ?').all(partitaId, data)) as Array<{ voce_uid: string; effetti_json: string | null }>;
  for (const r of righe) {
    try { fatte.set(r.voce_uid, leggiRicevutaEffettiAzione(r.effetti_json)); }
    catch (e) {
      if (!(e instanceof HttpError) || e.status !== 409) throw e;
      fatte.set(r.voce_uid, null);
      illeggibili.set(r.voce_uid, e.message);
    }
  }
  return { fatte, illeggibili };
}

/** Ultimo giorno del diario validato (R10-29): le sue voci non cambiano mai per nessun filtro. */
export const ULTIMO_GIORNO_VALIDATO = '06-01';

/** Vero se il giorno è nel diario validato (dal primo giorno a `ULTIMO_GIORNO_VALIDATO` compreso), per l'ordine del calendario di gioco
 *  (`giorno.ordine`: le date `MM-GG` attraversano l'anno, il confronto fra stringhe sbaglierebbe). Un giorno che non c'è: falso. */
export function eGiornoDelDiarioValidato(data: string): boolean {
  return !!prepared('SELECT 1 FROM giorno g WHERE g.data = ? AND g.ordine <= (SELECT ordine FROM giorno WHERE data = ?)').get(data, ULTIMO_GIORNO_VALIDATO);
}

/**
 * R10-28c/2: dopo il «concluso» di un Palazzo (Tesoro e boss finale, `palazziConclusi`) la voce che porta al suo ingresso non si propone più
 * nei giorni successivi. Sono nascoste SOLO le voci d'ingresso o d'infiltrazione: quelle di azione col riferimento a quel Palazzo e con
 * almeno un'infiltrazione o una proposta d'infiltrazione collegata (cioè le voci da cui si «Entra»); NON ancora spuntate nella partita, dei
 * giorni dopo il giorno corrente (la conclusione è già avvenuta); mai quelle del diario validato (04-01..06-01) e mai una voce spuntata.
 * Le altre voci del Palazzo (per esempio la lettera di sfida di Kaneshiro, senza infiltrazioni) restano.
 * Lettura soltanto: nessun dato cambia. Senza giorno corrente, senza Palazzi conclusi o senza le tabelle delle infiltrazioni (L3), nessuna
 * voce è nascosta.
 */
export function ingressiConclusiNascosti(partitaId: number): Array<{ uid: string; data: string }> {
  const giorno = (prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null } | undefined)?.data_gioco;
  if (!giorno) return [];
  const conclusi = palazziConclusi(partitaId);
  if (conclusi.size === 0 || !conLegami()) return [];
  const righe = prepared(`SELECT v.uid AS uid, v.data AS data, v.riferimento_chiave AS palazzo FROM voce_giornata v
    JOIN giorno g ON g.data = v.data
    LEFT JOIN spunta_voce_partita s ON s.voce_uid = v.uid AND s.partita_id = ?
    WHERE v.genere = 'azione' AND v.riferimento_tipo = 'dungeon' AND s.voce_uid IS NULL
      AND g.ordine > (SELECT ordine FROM giorno WHERE data = ?) AND g.ordine > (SELECT ordine FROM giorno WHERE data = ?)
      AND (EXISTS (SELECT 1 FROM voce_infiltrazione i WHERE i.voce_uid = v.uid) OR EXISTS (SELECT 1 FROM proposta_infiltrazione_voce p WHERE p.voce_uid = v.uid))`)
    .all(partitaId, giorno, ULTIMO_GIORNO_VALIDATO) as Array<{ uid: string; data: string; palazzo: string }>;
  return righe.filter((r) => conclusi.has(r.palazzo)).map(({ uid, data }) => ({ uid, data }));
}

/**
 * Le voci di un giorno per l'interfaccia, con lo stato nella partita se indicata. `conf`: i Confidenti, se chi chiama li ha già.
 * `nascondiIngressiConclusi` (R10-28c/2): solo per l'elenco mostrato; chi cerca una voce per uid (spunta, modifica) non lo usa.
 */
export function vociDelGiorno(data: string, partitaId?: number, conf?: Map<string, ConfidentePartitaDto> | null, nascondiIngressiConclusi = false): AzionePercorsoDto[] {
  if (partitaId !== undefined) verificaPartita(partitaId);
  if (nascondiIngressiConclusi && partitaId !== undefined) {
    const nascoste = new Set(ingressiConclusiNascosti(partitaId).map((v) => v.uid));
    if (nascoste.size > 0) return vociDelGiorno(data, partitaId, conf).filter((v) => !nascoste.has(v.uid));
  }
  const spunte = leggiSpunte(partitaId, data);
  const ctx: Contesto = {
    fatte: spunte.fatte, illeggibili: spunte.illeggibili,
    conf: conf ?? (partitaId !== undefined ? new Map(confidenti(partitaId).map((c) => [c.chiave, c])) : null),
    nomi: nomiEffetti(), quiz: attivitaConQuiz(), partita: partitaId,
    oggetti: riferimentiOggettiPerFonti(['libro', 'film', 'videogioco']),
  };
  return righeDelGiorno(data).map((r) => voceDto(r, ctx));
}

/** Per l'indice dei giorni: quante azioni (le voci che si spuntano) ha ogni giorno e quante sono fatte nella partita. */
export function conteggiGiornate(partitaId?: number): Map<string, { azioni: number; fatte: number }> {
  const righe = (partitaId === undefined
    ? prepared("SELECT data, COUNT(*) AS azioni, 0 AS fatte FROM voce_giornata WHERE genere = 'azione' GROUP BY data").all()
    : prepared(`SELECT v.data AS data, COUNT(*) AS azioni, COUNT(s.voce_uid) AS fatte FROM voce_giornata v
        LEFT JOIN spunta_voce_partita s ON s.voce_uid = v.uid AND s.partita_id = ? WHERE v.genere = 'azione' GROUP BY v.data`).all(partitaId)) as Array<{ data: string; azioni: number; fatte: number }>;
  const conteggi = new Map(righe.map((r) => [r.data, { azioni: r.azioni, fatte: r.fatte }]));
  // R10-28c/2: le voci d'ingresso nascoste dall'elenco non contano fra le azioni del giorno (non sono mai fatte)
  if (partitaId !== undefined) for (const v of ingressiConclusiNascosti(partitaId)) { const c = conteggi.get(v.data); if (c && c.azioni > 0) c.azioni -= 1; }
  return conteggi;
}

/** La riga della voce con quell'uid; 404 se non esiste. */
export function rigaVoce(uid: string): RigaVoce {
  const r = prepared('SELECT * FROM voce_giornata WHERE uid = ?').get(uid) as RigaVoce | undefined;
  if (!r) throw httpErrors.notFound('voce-non-trovata', 'Questa voce della giornata non esiste (più).');
  return r;
}

/** Mette la voce al posto `posizione` della fascia (0 = in cima; oltre l'ultimo o omesso = in fondo) e rinumera la fascia. */
function posiziona(data: string, fascia: FasciaGioco, uid: string, posizione?: number): void {
  const altre = (prepared('SELECT uid FROM voce_giornata WHERE data = ? AND fascia = ? AND uid <> ? ORDER BY ordine, uid').all(data, fascia, uid) as Array<{ uid: string }>).map((r) => r.uid);
  const dove = posizione === undefined ? altre.length : Math.max(0, Math.min(Math.trunc(posizione), altre.length));
  altre.splice(dove, 0, uid);
  const scrivi = prepared('UPDATE voce_giornata SET ordine = ? WHERE uid = ?');
  altre.forEach((u, i) => scrivi.run(i, u));
}

/** Rinumera una fascia 0, 1, 2… (dopo che una voce se n'è andata). */
export function compatta(data: string, fascia: string): void {
  const scrivi = prepared('UPDATE voce_giornata SET ordine = ? WHERE uid = ?');
  (prepared('SELECT uid FROM voce_giornata WHERE data = ? AND fascia = ? ORDER BY ordine, uid').all(data, fascia) as Array<{ uid: string }>).forEach((r, i) => scrivi.run(i, r.uid));
}

/**
 * Mette le voci `uid` (già nel giorno e nella fascia) nella fascia, nell'ordine dato: subito dopo la voce `dopoUid`, o in fondo se è
 * null (o se non è in quella fascia), e rinumera la fascia 0, 1, 2… Lo stesso writer dell'ordine di `posiziona`, per più voci insieme
 * (appunti del Diario e «Copia in…» / «Sposta in…»).
 */
export function collocaInFascia(data: string, fascia: FasciaGioco, uid: readonly string[], dopoUid: string | null): void {
  const nuove = new Set(uid);
  const altre = (prepared('SELECT uid FROM voce_giornata WHERE data = ? AND fascia = ? ORDER BY ordine, uid').all(data, fascia) as Array<{ uid: string }>).map((r) => r.uid).filter((u) => !nuove.has(u));
  const ancora = dopoUid === null ? -1 : altre.indexOf(dopoUid);
  altre.splice(ancora >= 0 ? ancora + 1 : altre.length, 0, ...uid);
  const scrivi = prepared('UPDATE voce_giornata SET ordine = ? WHERE uid = ?');
  altre.forEach((u, i) => scrivi.run(i, u));
}

/** Collegamento ed effetti da salvare: quelli nuovi si verificano (devono puntare a elementi che esistono), quelli che la voce ha
 *  già passano come sono (correggere una nota non fallisce se il catalogo ha nascosto il libro collegato). */
function struttura(d: DatiVoceGiornata, r?: RigaVoce): { riferimento?: { tipo: string; chiave: string; testo: string | null } | null; produce?: EffettoAzione[] } {
  if (d.produce !== undefined && d.effettiVoce !== undefined) throw httpErrors.badRequest('fonti-effetti-concorrenti', 'Invia una sola fonte degli effetti.');
  const out: { riferimento?: { tipo: string; chiave: string; testo: string | null } | null; produce?: EffettoAzione[] } = {};
  if (d.riferimento !== undefined) {
    if (d.riferimento === null) {
      // «nessun collegamento» a una voce che non ne ha già: invariata (la guida ha voci col solo nome, senza collegamento)
      if (!r || r.riferimento_tipo !== null || r.riferimento_chiave !== null) out.riferimento = null;
    } else {
      // un collegamento nuovo si verifica (400 se punta al nulla) e il suo nome si legge ogni volta dall'elemento, così segue le
      // rinomine del pacchetto; quello che la voce ha già tiene il nome che aveva (la guida lo scrive a modo suo)
      const stesso = r && r.riferimento_tipo === d.riferimento.tipo && r.riferimento_chiave === d.riferimento.chiave;
      if (!stesso) nomeRiferimento(d.riferimento);
      out.riferimento = { tipo: d.riferimento.tipo, chiave: d.riferimento.chiave, testo: stesso ? r!.riferimento_testo : null };
    }
  }
  if (d.produce !== undefined) {
    const completa = normalizzaEffettiVoce(d.produce);
    if (!completa || completa.some(e => e.tipo === 'acquisto')) throw httpErrors.badRequest('effetti-voce-non-validi', 'Gli effetti non sono una lista legacy completa e riconoscibile. Usa l’editor degli effetti.');
    if (r) {
      const fonte = leggiEffettiVoce(r.uid);
      if (fonte.stato !== 'convertita') throw httpErrors.conflict('effetti-legacy-da-correggere', 'La fonte storica non è convertibile: correggila esplicitamente nell’editor completo degli effetti.');
      if (JSON.stringify(completa) === JSON.stringify(produceDi(fonte))) return out;
      throw httpErrors.conflict('effetti-completi-richiesti', 'Per modificare gli effetti di una voce esistente invia la lista canonica completa con UID e revisione: la posizione non identifica un effetto.');
    }
    out.produce = verificaEffetti(d.produce);
  }
  return out;
}

/** Il testo senza spazi ai bordi; undefined se non è stato inviato, 400 se resta vuoto. */
function testoValido(x: string | undefined): string | undefined {
  if (x === undefined) return undefined;
  const t = x.trim();
  if (!t) throw httpErrors.badRequest('voce-vuota', 'Il testo della voce non può essere vuoto.');
  return t;
}
/** Le note senza spazi ai bordi: undefined se non inviate (restano com'erano), null se nulle o vuote. */
const noteValide = (n: string | null | undefined) => (n === undefined ? undefined : n === null || n.trim() === '' ? null : n.trim());

/** Aggiunge una voce alla giornata (canone, per tutte le partite), al posto indicato della fascia (in fondo se omesso). */
export function creaVoce(data: string, d: DatiVoceGiornata, partitaId?: number): AzionePercorsoDto {
  // la partita (per rispondere con lo stato) si controlla prima di scrivere: un 404 dopo aver cambiato la guida mentirebbe
  if (partitaId !== undefined) verificaPartita(partitaId);
  giornoEsiste(data);
  const azione = testoValido(d.azione);
  if (!azione) throw httpErrors.badRequest('voce-vuota', 'Scrivi che cosa c\'è da fare o che cosa succede.');
  const genere: GenereVoce = d.genere ?? 'azione';
  const fascia: FasciaGioco = d.fascia ?? 'giorno';
  const { riferimento, produce } = struttura(d);
  const uid = randomBytes(16).toString('hex');
  const adesso = nowIso();
  getDb().transaction(() => {
    if (d.effettiVoce && (d.effettiVoce.revisioneEffettiAttesa !== undefined || d.effettiVoce.effetti.some(e => e.uid !== null))) {
      throw httpErrors.badRequest('fonte-nuova-non-valida', 'Una nuova voce non può reclamare token o UID di effetti preesistenti.');
    }
    if (genere !== 'azione' && d.effettiVoce?.effetti.length) throw httpErrors.badRequest('effetti-solo-azione', 'Solo un’azione può avere effetti della spunta.');
    // gli effetti vanno solo in `voce_effetto` (`inizializzaEffettiVoce`): `produce_json` resta col suo valore predefinito, non si scrive più
    prepared(`INSERT INTO voce_giornata (uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo, rango_atteso, indice_guida, created_at, updated_at)
      VALUES (?, ?, ?, 1000000, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`).run(uid, data, fascia, genere, azione, noteValide(d.note) ?? null, genere === 'azione' ? d.tipo ?? 'altro' : 'altro',
      riferimento?.tipo ?? null, riferimento?.chiave ?? null, riferimento?.testo ?? null, d.rangoAtteso ?? null, adesso, adesso);
    inizializzaEffettiVoce(uid, genere === 'azione' ? d.effettiVoce?.effetti.map(e => e.effetto) ?? produce ?? [] : [], 'utente');
    posiziona(data, fascia, uid, d.posizione);
  })();
  return vociDelGiorno(data, partitaId).find((v) => v.uid === uid)!;
}

/** Modifica una voce: testo, note, genere, tipo, collegamento, rango, effetti, fascia e posto nella fascia. */
export function aggiornaVoce(uid: string, d: DatiVoceGiornata, partitaId?: number): AzionePercorsoDto {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const r = rigaVoce(uid);
  const azione = testoValido(d.azione);
  const genere: GenereVoce = d.genere ?? genereDi(r);
  const fascia: FasciaGioco = d.fascia ?? fasciaDi(r);
  const { riferimento } = struttura(d, r);
  // L13 (decisione 19): che cosa hanno fatto gli effetti di stato cambiati nelle partite che hanno già spuntato la voce, per la risposta
  const applicazioniEffetti = getDb().transaction((): AzionePercorsoDto['applicazioniEffetti'] => {
    let applicazioni: AzionePercorsoDto['applicazioniEffetti'] = undefined;
    if (d.effettiVoce) {
      if (!d.effettiVoce.revisioneEffettiAttesa) throw httpErrors.conflict('revisione-effetti-richiesta', 'Ricarica la fonte prima di modificare gli effetti.');
      if (genere !== 'azione' && d.effettiVoce.effetti.length) throw httpErrors.badRequest('effetti-solo-azione', 'Solo un’azione può avere effetti della spunta.');
      applicazioni = salvaEffettiVoce(uid, { effetti: d.effettiVoce.effetti, revisioneEffettiAttesa: d.effettiVoce.revisioneEffettiAttesa }).applicazioni;
    }
    if (genere !== 'azione' && genereDi(r) === 'azione') {
      // un'azione diventa evento: non si spunta più. Con effetti applicati in una partita no (andrebbero persi senza poterli
      // disfare); senza effetti le sue spunte non servono più e se ne vanno
      const conEffetti = partiteConEffetti(uid);
      if (conEffetti.length) throw httpErrors.conflict('voce-con-effetti', `Questa azione è spuntata con effetti in ${conEffetti.map((n) => `«${n}»`).join(', ')}: togli prima la spunta, poi cambiala in evento.`);
      prepared('DELETE FROM spunta_voce_partita WHERE voce_uid = ?').run(uid);
      const fonte = leggiEffettiVoce(uid);
      if (fonte.stato !== 'convertita' || fonte.effetti.length) throw httpErrors.conflict('voce-con-effetti-configurati', 'Rimuovi esplicitamente gli effetti dall’editor prima di trasformare l’azione in evento.');
    }
    // `produce_json` non si scrive più: gli effetti li salva `salvaEffettiVoce` in `voce_effetto`
    prepared(`UPDATE voce_giornata SET azione = ?, note = ?, genere = ?, fascia = ?, tipo = ?, riferimento_tipo = ?, riferimento_chiave = ?, riferimento_testo = ?, rango_atteso = ?, updated_at = ? WHERE uid = ?`).run(
      azione ?? r.azione, d.note === undefined ? r.note : noteValide(d.note), genere, fascia, genere === 'azione' ? d.tipo ?? r.tipo : 'altro',
      riferimento === undefined ? r.riferimento_tipo : riferimento?.tipo ?? null, riferimento === undefined ? r.riferimento_chiave : riferimento?.chiave ?? null,
      riferimento === undefined ? r.riferimento_testo : riferimento?.testo ?? null, d.rangoAtteso === undefined ? r.rango_atteso : d.rangoAtteso,
      nowIso(), uid);
    // L13 (decisione 2): con il collegamento ormai scritto, un effetto «yen» non sta accanto a un film, un'attività o una Richiesta che porta già i suoi yen
    if (riferimento !== undefined) verificaYenVoce(uid);
    if (fascia !== fasciaDi(r)) {
      // cambia fascia: al posto chiesto, altrimenti in fondo alla fascia nuova; la vecchia si ricompatta
      prepared('UPDATE voce_giornata SET ordine = 1000000 WHERE uid = ?').run(uid);
      posiziona(r.data, fascia, uid, d.posizione);
      compatta(r.data, r.fascia);
    } else if (d.posizione !== undefined) {
      posiziona(r.data, fascia, uid, d.posizione);
    }
    // R10-11f: se la voce cambia fascia o posto, l'ordine dei suoi eventi nel registro dei punti cambia e i Confidenti toccati si ricalcolano
    riallineaVoceNelRegistro(uid);
    return applicazioni;
  })();
  const dto = vociDelGiorno(r.data, partitaId).find((v) => v.uid === uid)!;
  return applicazioniEffetti?.length ? { ...dto, applicazioniEffetti } : dto;
}

/** Sposta una voce di un passo dentro la sua fascia (-1 su, +1 giù); ai bordi non cambia nulla. */
export function spostaVoce(uid: string, verso: -1 | 1, partitaId?: number): AzionePercorsoDto[] {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const r = rigaVoce(uid);
  getDb().transaction(() => {
    compatta(r.data, r.fascia);
    const ora = (prepared('SELECT ordine FROM voce_giornata WHERE uid = ?').get(uid) as { ordine: number }).ordine;
    posiziona(r.data, fasciaDi(r), uid, ora + verso);
    riallineaVoceNelRegistro(uid); // R10-11f: il nuovo posto cambia l'ordine dei suoi eventi nel registro dei punti
  })();
  return vociDelGiorno(r.data, partitaId);
}

// Copia o sposta una o più voci in un altro giorno e fascia (2026-10-12, «Copia in…» / «Sposta in…»). Dal 2026-10-26 la copia e lo spostamento delle voci hanno un solo percorso di scrittura, quello degli appunti del Diario
// (`appuntiDiarioService`): la finestra «Copia in…» / «Sposta in…» lo usa con la fascia scelta, la copia porta anche le infiltrazioni
// e ogni gesto si registra in `operazione_voci_diario` (annullabile). Qui resta il nome, per chi lo importa da sempre.
export { trasferisciVoci } from './appuntiDiarioService.js';

/** Storia attiva che impedisce di togliere la spuntabilità senza il proprio gesto di annullo. L13 (decisione 18): anche gli yen che gli effetti
 *  della voce hanno mosso da soli e che non sono tornati (cancellando la spunta non tornerebbero più): si tolgono togliendo la spunta. I
 *  movimenti dei turni e delle Richieste seguono il loro dato, che resta anche quando la voce diventa un evento. */
function partiteConEffetti(uid: string): string[] {
  return (prepared(`SELECT p.nome FROM utente.partita p WHERE
    EXISTS(SELECT 1 FROM utente.spunta_voce_partita s WHERE s.partita_id=p.id AND s.voce_uid=? AND s.effetti_json IS NOT NULL)
    OR EXISTS(SELECT 1 FROM utente.effetto_applicato e WHERE e.partita_id=p.id AND e.voce_uid=? AND e.annullato_il IS NULL)
    OR EXISTS(SELECT 1 FROM utente.acquisto_provenienza a WHERE a.partita_id=p.id AND a.voce_uid=?)
    OR EXISTS(SELECT 1 FROM utente.yen_automatico y WHERE y.partita_id=p.id AND y.causa_tipo='voce' AND y.causa_chiave LIKE ? AND y.annullato_il IS NULL) ORDER BY p.nome`)
    .all(uid, uid, uid, `${uid}:%`) as Array<{ nome: string }>).map((r) => r.nome);
}

/** Mette la voce nel cestino comune, conservando tutte le fotografie; il motore annulla una sola volta ciascuna fonte. Restituisce gli avvisi
 *  dell'annullo nelle partite (un esemplare in scorta modificato dopo la spunta, che resta). */
export function eliminaVoce(uid: string): string[] {
  const r = rigaVoce(uid);
  const sorelle = righeDelGiorno(r.data).filter(v => v.fascia === r.fascia).map(v => v.uid), posto = sorelle.indexOf(uid);
  const vicini = { prima: sorelle[posto - 1] ?? null, dopo: sorelle[posto + 1] ?? null };
  return conCestino({ tipo: 'voce-diario', chiave: uid, nome: r.azione, contesto: `${r.data} · ${r.fascia}`, vicini }, () => {
    const avvisi = preparaRimozioneEffettiVoce(uid, { annullaLegacy: annullaEffettiAzione });
    prepared('DELETE FROM voce_giornata WHERE uid = ?').run(uid);
    prepared('DELETE FROM spunta_voce_partita WHERE voce_uid = ?').run(uid);
    revocaEventiDellaVoceInOgniPartita(uid); // R10-22 (N5): come togliendo la spunta, gli eventi legati alla voce non restano nello Storico
    // L3: l'insieme d'infiltrazioni e la proposta della voce se ne vanno con lei (la chiave è l'uid, senza vincolo)
    if (conLegami()) {
      prepared('DELETE FROM voce_infiltrazione WHERE voce_uid = ?').run(uid);
      prepared('DELETE FROM proposta_infiltrazione_voce WHERE voce_uid = ?').run(uid);
    }
    compatta(r.data, r.fascia);
    return avvisi;
  });
}

/** Rientro relativo ai vicini superstiti, attraverso lo stesso writer dell'ordine ordinario. */
export function ripristinaOrdineVoce(uid: string, vicini: ViciniCestino | null): void {
  const r = rigaVoce(uid);
  const altre = righeDelGiorno(r.data).filter(v => v.uid !== uid && v.fascia === r.fascia).map(v => v.uid);
  const dopo = vicini?.dopo == null ? -1 : altre.indexOf(vicini.dopo), prima = vicini?.prima == null ? -1 : altre.indexOf(vicini.prima);
  posiziona(r.data, fasciaDi(r), uid, dopo >= 0 ? dopo : prima >= 0 ? prima + 1 : Math.min(r.ordine, altre.length));
}

/**
 * Spunta o toglie un'azione nella partita. Alla spunta applica ciò che l'azione produce (`produce`: letture, turni; note del
 * Confidente se `noteRisposta` è indicato, col bonus dell'arcano) e lo registra; togliendo la spunta lo annulla (le letture
 * restano: si disfano dalla loro pagina). Eventi, scadenze e promemoria non si spuntano.
 */
export function spuntaVoce(partitaId: number, uid: string, fatta: boolean, opz: OpzioniSpunta = {}): AzionePercorsoDto {
  verificaPartita(partitaId);
  const r = rigaVoce(uid);
  const v = voceBase(r);
  const adesso = nowIso();
  // 2026-10-26: ciò che chi spunta (o toglie la spunta) deve sapere: la Persona aggiunta alla scorta oltre la capienza, l'esemplare in scorta che
  // resta perché modificato dopo la spunta
  let avvisiSpunta: string[] = [];
  getDb().transaction(() => {
    const precedente = prepared('SELECT effetti_json FROM spunta_voce_partita WHERE partita_id = ? AND voce_uid = ?').get(partitaId, uid) as { effetti_json: string | null } | undefined;
    // Una voce storica riclassificata (non più un'azione) conserva l'accesso alla rimozione della propria spunta.
    if (v.genere !== 'azione' && !precedente) throw httpErrors.badRequest('voce-non-spuntabile', 'Un evento, una scadenza o un promemoria non si spuntano.');
    if (fatta) {
      if (precedente) {
        if (opz.acquisti?.length||opz.pesche?.length||opz.scelteEsito?.length) throw httpErrors.conflict('spunta-gia-presente', 'La spunta esiste già: collega il fatto attraverso la proposta storica, senza rieseguire la voce (per cambiare l’esito togli e rimetti la spunta).');
        return; // idempotente: non riapplica punti, letture o turni (dalla 305 la visita ai Memento non dichiara più aperture)
      }
      // R10-22: gli eventi che i setter scrivono mentre la spunta applica i suoi effetti portano il legame con la voce e si revocano togliendola
      const { effettiLegacy: effetti, avvisi } = conVoceDellaSpunta(uid, () => applicaEffettiVoce(partitaId, uid, {
        applicaLegacy: (id, produce: EffettoLegacyVoce[], scelte) => applicaEffettiAzione(id, { ...v, produce, scelte, invito: haInvitoDelConfidente(uid, v.riferimento), voceUid: uid, ordineVoce: r.ordine, momento: { data: r.data, fascia: v.fascia, origine: 'azione' } }, opz),
        annullaLegacy: annullaEffettiAzione,
      }, { acquisti: opz.acquisti, pesche:opz.pesche, porteAcquisti: { valutaCorrente: disponibilitaAcquistoCorrente }, spuntaFattaIl: adesso, scelteEsito: opz.scelteEsito }));
      avvisiSpunta = avvisi;
      prepared('INSERT INTO spunta_voce_partita (partita_id, voce_uid, fatta_at, effetti_json) VALUES (?, ?, ?, ?)').run(partitaId, uid, adesso, effetti ? JSON.stringify(effetti) : null);
      const dett = [`${v.fascia === 'sera' ? 'Sera' : 'Giorno'} · ${v.tipo}${v.riferimentoTesto ? ` · ${v.riferimentoTesto}` : ''}`];
      if (effetti) dett.push(descriviEffettiApplicati(effetti));
      registraEvento(partitaId, 'percorso', `Percorso ${r.data}: ${v.azione.slice(0, 80)}${v.azione.length > 80 ? '…' : ''}`, `${dett.join(' · ')}.`, { data: r.data, voce: uid, tipo: v.tipo, riferimento: v.riferimento, effetti }, null, uid);
    } else {
      // R10-11f: punti e rank up della voce stanno nel registro cronologico: si tolgono da lì e si ricalcola dalla base (i rank up non più raggiunti
      // tornano indietro, i punti dopo si riassegnano); l'annullo vecchio, dalla ricevuta, resta per le spunte che non sono nel registro corrente
      const ricevutaDellaSpunta = leggiRicevutaEffettiAzione(precedente?.effetti_json ?? null);
      const eventiTolti = togliEventiDellaVoce(partitaId, uid);
      avvisiSpunta = annullaEffettiVoce(partitaId, uid, senzaEventiGestiti(ricevutaDellaSpunta, eventiTolti), { applicaLegacy: () => null, annullaLegacy: annullaEffettiAzione });
      // chi è stato disfatto col vecchio annullo ha cambiato i valori fuori dal registro: la sua base riparte da qui
      for (const chiave of confidentiAnnullatiAlVecchioModo(ricevutaDellaSpunta, eventiTolti)) nuovaGenerazione(partitaId, chiave);
      prepared('DELETE FROM spunta_voce_partita WHERE partita_id = ? AND voce_uid = ?').run(partitaId, uid);
      // L13 (decisione 19, revisione B1): il registro del censimento è della spunta: tolta lei, la spunta rifatta si rivaluta da capo (un «già vero»
      // di allora non deve nascondere uno stato che nel frattempo l'utente ha tolto)
      prepared('DELETE FROM utente.censimento_stato_voce WHERE partita_id = ? AND voce_uid = ?').run(partitaId, uid);
      revocaEventiDellaVoce(partitaId, uid); // R10-22: solo gli eventi col legame esplicito alla voce; gli eventi storici (voce_uid nullo) restano
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  const aggiornata = vociDelGiorno(r.data, partitaId).find((x) => x.uid === uid)!;
  return avvisiSpunta.length ? { ...aggiornata, avvisiSpunta } : aggiornata;
}

/** Il raccordo successivo a una spunta non riapplica gli incontri o gli altri effetti legacy. */
export function applicaEffettoStoricoDiario(partitaId: number, proposta: PropostaPartitaDto, acquisto?: NuovaRegistrazioneAcquisto, tokenAcquisti?: string,pesca?:import('../../shared/pesca.js').NuovaSessionePesca,tokenPesca?:string): void {
  // il tipo e il collegamento della voce vera (non «altro» senza collegamento): le note di una Dote raccordata valgono come quelle della spunta,
  // da libro (quarto scalino) o da film con «Anima da cineasta» (`origineNoteDellaVoce`). L'incontro con un Confidente non si riapplica: senza
  // `momento` né note di risposta `applicaEffettiAzione` non registra incontri né punti del Confidente
  const riga = proposta.causa.tipo === 'voce' ? prepared('SELECT * FROM voce_giornata WHERE uid = ?').get(proposta.causa.chiave.split(':')[0]) as RigaVoce | undefined : undefined;
  const voce = riga ? { tipo: tipoDi(riga), riferimento: riferimentoDi(riga) } : { tipo: 'altro', riferimento: null };
  applicaEffettoStorico(partitaId, proposta, acquisto, tokenAcquisti, {
    // Solo gli effetti selezionati dal motore: niente contesto Confidente o
    // riesecuzione dell'intera voce già spuntata.
    applicaLegacy: (id, produce, scelte) => applicaEffettiAzione(id, { ...voce, produce, scelte }),
    annullaLegacy: annullaEffettiAzione,
  }, { valutaCorrente: disponibilitaAcquistoCorrente },pesca,tokenPesca);
}
