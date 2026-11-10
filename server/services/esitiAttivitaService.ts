// ============================================================
// esitiAttivitaService — gli esiti dichiarati da un'attività: disponibilità, scelta alla spunta e al contatore (L13, ondata 2)
// ============================================================
//
// La fonte è una sola: `attivita.esiti_json` (`shared/esitiAttivita.ts`). Qui si leggono gli esiti con la loro disponibilità nella
// partita (condizioni proprie + condizioni dell'articolo che li fa tentare: il rango delle sfide della Big Bang Burger sta nel listino)
// e si risolve la scelta di chi gioca in Doti da registrare con il turno. Le regole:
//   - modo «scelta»: serve una scelta esplicita (la chiave dell'esito, o «senza punti»); senza, la spunta e il + del contatore si
//     fermano con 409 `esito-da-scegliere` (una decisione aperta non lascia passare: decisione A1 dell'utente, 2026-10-25);
//     un esito le cui condizioni sono rosse è rifiutato (409 `esito-non-disponibile`), come un libro non ancora disponibile;
//   - modo «automatico»: vale l'unico esito con le condizioni vere al giorno della voce (o della partita, per il contatore); se non ce
//     n'è uno solo, 409 `esito-automatico-incerto` con il motivo, mai un valore inventato. Se la voce DICHIARA l'esito (ondata 9, O9-2),
//     vale quello della voce, senza valutarne le condizioni (`dallaVoce`);
//   - una Dote a valori possibili (`possibili` dell'effetto `dote`, la fabbricazione) chiede le note fra quelle dichiarate, o «nessuna».
// La spunta porta le scelte (`OpzioniSpunta.scelteEsito`), la ricevuta le ricorda (`turni[].esito`, `doti[].scelta`), togliere la spunta
// toglie il turno con le sue Doti (`annullaEffettiAzione`). Nessuna Dote si applica da sola: restano le proposte «Applica».
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { condizioneConTesto, leggiCondizioniSalvate, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import {
  coppiaBonus, dotiEsitoConPunti, esitoLegatoAlTempo, gemelloPerIlTempo, leggiEsitiAttivita, nomeStrumento, soloStrumenti, strumentoDi, strumentoSenzaBonus, type DoteEsito, type EsitiAttivita,
  type EsitiAttivitaDto, type EsitoAttivita, type EsitoDisponibileDto, type SceltaEsitoSpunta, type SceltaEsitoVoceDto
} from '../../shared/esitiAttivita.js';
import { CHIAVI_DOTI, eDote, nomeDote, type DoteChiave } from '../../shared/doti.js';
import { YEN_MASSIMI_LAVORO } from '../../shared/esitiAttivita.js';
import { simboliPossibili } from '../../shared/note.js';
import type { EffettoVoceDto } from '../../shared/effettiVoce.js';
import { statoAlGiorno, statoDisponibilitaPartita, valutaRequisiti, type RequisitoDisponibilita, type StatoDisponibilita } from './disponibilitaService.js';
import { meteoOra } from './meteoService.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { catalogoOggettiDisponibile } from './catalogoOggettiLetture.js';
import { scelteAlternativeDellaVoce } from './alternativeAcquistiService.js';
import { sqlPrezzoPerFascia } from './prezziArticoli.js';
import { normalizzaPrezzoPerFascia, prezzoNellaFascia, type PrezzoPerFascia } from '../../shared/catalogo.js';
import { copieDellOggetto } from './copieOggetti.js';
import { promemoriaLibriPerAttivita } from './modificatoriLibri.js';
import { fortunaSu } from './fortunaService.js';
import { origineNoteDellaVoce, puntiDote } from './puntiDoti.js';
import { piazzamentoDellEsame, premiDellEsame, premioDelPiazzamento } from './piazzamentoEsamiService.js';
import { ePiazzamentoEsame, PIAZZAMENTI_ESAME, type PiazzamentoEsame } from '../../shared/puntiConfidenti.js';

/** La scelta già risolta per un effetto della voce: le Doti dell'esito del turno, o le note della Dote a valori possibili (0 = nessuna). */
export type SceltaRisolta =
  | { tipo: 'turno'; esito: { chiave: string; nome: string; automatico?: boolean; dallaVoce?: true; bonus?: boolean; creazione?: true } | null; doti: DoteEsito[] }
  | { tipo: 'dote'; note: 0 | 1 | 2 | 3 }
  /** L13 (ondata 7, O7-2): il piazzamento scelto ai risultati dell'esame. */
  | { tipo: 'esame'; piazzamento: PiazzamentoEsame }
  /** L13 (31/10): gli yen ricevuti e le Doti ottenute in un turno di lavoro senza esiti, detti alla spunta. */
  | { tipo: 'lavoro'; yen: number; doti: DoteEsito[] };

/** Il lavoro senza esiti il cui turno, alla spunta, chiede yen ricevuti e note ottenute (L13, 31/10): `tipo` «lavoro», nessun esito dichiarato
 *  (con gli esiti, come Ore no Beko, paga e note le dice l'esito), né Confidente né pesca. Null per ogni altra attività. */
export function lavoroAScelta(chiave: string): { nome: string; paga: { base: number; massima: number | null } | null; doti: DoteChiave[] } | null {
  const r = prepared('SELECT * FROM attivita WHERE chiave = ?').get(chiave) as {
    nome: string; tipo: string; paga_yen: number | null; paga_massima: number | null; effetti_json: string | null; esiti_json?: string | null;
    confidente_chiave?: string | null; pesca_regola_chiave?: string | null
  } | undefined;
  if (!r || r.tipo !== 'lavoro' || leggiEsitiAttivita(r.esiti_json ?? null) || r.confidente_chiave != null || r.pesca_regola_chiave != null) return null;
  const doti: DoteChiave[] = [];
  try {
    for (const v of JSON.parse(r.effetti_json ?? '[]') as Array<{ effetto?: { famiglia?: unknown; dote?: unknown } }>) {
      if (v.effetto?.famiglia === 'dote' && eDote(v.effetto.dote) && !doti.includes(v.effetto.dote)) doti.push(v.effetto.dote);
    }
  } catch { /* effetti illeggibili: nessuna Dote proposta, si sceglie a mano */ }
  return { nome: r.nome, paga: r.paga_yen != null && r.paga_yen > 0 ? { base: r.paga_yen, massima: r.paga_massima != null && r.paga_massima > r.paga_yen ? r.paga_massima : null } : null, doti };
}

/** Gli esiti dichiarati da un'attività (null se non ne dichiara o se la colonna non c'è ancora) e il suo nome. */
export function esitiDellAttivita(chiave: string): { nome: string; esiti: EsitiAttivita | null } | null {
  // `SELECT *`: su uno schema di prima della 233 la colonna non c'è e l'attività vale «senza esiti»
  const r = prepared('SELECT * FROM attivita WHERE chiave = ?').get(chiave) as { nome: string; esiti_json?: string | null } | undefined;
  return r ? { nome: r.nome, esiti: leggiEsitiAttivita(r.esiti_json) } : null;
}

interface ArticoloEsito { chiave: string; nome: string; prezzo: number | null; prezzoPerFascia: PrezzoPerFascia | null; condizioni: RequisitoSpillo[] }
/** L'articolo che fa tentare l'esito: il nome è quello del catalogo (la colonna `nome` dell'articolo può essere vuota), prezzo (con quello
 *  per fascia, Ondata 5 lotto E) e condizioni: lo sblocco del negozio (L6-09, migrazione 386: la data d'apertura di un negozio sta lì, non
 *  ripetuta sulle sue offerte) e poi quelle del listino. */
function articoloEsito(chiave: string): ArticoloEsito | null {
  const perFascia = sqlPrezzoPerFascia('a');
  const a = prepared(catalogoOggettiDisponibile()
    ? `SELECT a.chiave, COALESCE(c.nome, NULLIF(a.nome, ''), a.chiave) AS nome, a.prezzo, ${perFascia} AS prezzo_per_fascia_json, a.condizioni_json, n.sblocco_json FROM articolo a LEFT JOIN catalogo_oggetto c ON c.chiave = a.catalogo_chiave LEFT JOIN negozio n ON n.chiave = a.negozio_chiave WHERE a.chiave = ?`
    : `SELECT a.chiave, COALESCE(NULLIF(a.nome, ''), a.chiave) AS nome, a.prezzo, ${perFascia} AS prezzo_per_fascia_json, a.condizioni_json, n.sblocco_json FROM articolo a LEFT JOIN negozio n ON n.chiave = a.negozio_chiave WHERE a.chiave = ?`)
    .get(chiave) as { chiave: string; nome: string; prezzo: number | null; prezzo_per_fascia_json: string | null; condizioni_json: string | null; sblocco_json: string | null } | undefined;
  return a ? { chiave: a.chiave, nome: a.nome, prezzo: a.prezzo, prezzoPerFascia: normalizzaPrezzoPerFascia(a.prezzo_per_fascia_json),
    condizioni: [...leggiCondizioniSalvate(a.sblocco_json), ...leggiCondizioniSalvate(a.condizioni_json)] } : null;
}

/** Ondata 5 (lotto G): il trofeo dell'esito con il suo nome; un trofeo tolto dall'elenco si dice tale (registrando il turno non si segna). */
function trofeoEsito(chiave: string | undefined): EsitoDisponibileDto['trofeo'] {
  if (!chiave) return null;
  const r = prepared('SELECT nome FROM trofeo WHERE chiave = ?').get(chiave) as { nome: string } | undefined;
  return { chiave, nome: r?.nome ?? 'Trofeo non più nell’elenco' };
}

/** Ondata 5 (lotto G): gli oggetti dell'esito con il nome del catalogo; un oggetto che il catalogo non ha più si dice tale (registrando il
 *  turno non entra fra gli ottenuti). */
function oggettiEsito(oggetti: EsitoAttivita['oggetti']): EsitoDisponibileDto['oggetti'] {
  if (!oggetti?.length) return [];
  const nome = catalogoOggettiDisponibile() ? prepared('SELECT nome FROM catalogo_oggetto WHERE chiave = ?').pluck() : null;
  return oggetti.map((o) => ({ chiave: o.oggetto, nome: (nome?.get(o.oggetto) as string | undefined) ?? 'Oggetto non più nel catalogo', quantita: o.quantita }));
}

/** Ondata 5 (lotto F-bis): gli oggetti che l'esito consuma, con il nome del catalogo e, con una partita, le copie possedute adesso (la stessa
 *  lettura della finestra «Regala»: possedute − regalate − consumate). Le copie non sono una condizione: chi gioca può averle prese in un modo
 *  che l'app non conosce, e la scelta mostra il numero senza bloccare. */
function consumaEsito(consuma: EsitoAttivita['consuma'], partitaId: number | undefined): EsitoDisponibileDto['consuma'] {
  if (!consuma?.length) return [];
  const conCatalogo = catalogoOggettiDisponibile();
  const nome = conCatalogo ? prepared('SELECT nome FROM catalogo_oggetto WHERE chiave = ?').pluck() : null;
  return consuma.map((o) => ({ chiave: o.oggetto, nome: (nome?.get(o.oggetto) as string | undefined) ?? 'Oggetto non più nel catalogo', quantita: o.quantita,
    disponibili: partitaId !== undefined && conCatalogo ? copieDellOggetto(partitaId, o.oggetto).disponibili : null }));
}

/** Un esito come lo vede la scelta: le condizioni sono le sue più quelle dell'articolo, valutate sullo stato (senza stato: disponibile). */
function esitoDisponibile(e: EsitoAttivita, st: StatoDisponibilita | null): EsitoDisponibileDto {
  const articolo = e.articolo ? articoloEsito(e.articolo) : null;
  const nomi = nomiCondizioniMemo();
  const condizioni = [...(articolo?.condizioni ?? []), ...e.condizioni].map((c) => condizioneConTesto(c, nomi));
  const esito = st && condizioni.length ? valutaRequisiti(condizioni as RequisitoDisponibilita[], st) : null;
  const partitaId = st?.partitaId;
  return {
    // i punti che il turno darà davvero: con una partita anche la Fortuna accesa sulla Dote (la stessa lettura di `registraTurno`, `puntiDote`)
    chiave: e.chiave, nome: e.nome, gruppo: e.gruppo, premi: e.premi, doti: dotiEsitoConPunti(e.doti, partitaId !== undefined ? (dote) => fortunaSu(partitaId, dote) : undefined),
    // il prezzo che si scala è quello della fascia dello stato (la voce del Diario, o la partita per il contatore): la stessa regola di
    // `motoreDiario.yenDellEffetto` e di `registraTurno`, così la scelta dice l'importo che la spunta toglie davvero dal saldo
    articolo: articolo ? { chiave: articolo.chiave, nome: articolo.nome, prezzo: articolo.prezzo, prezzoPerFascia: articolo.prezzoPerFascia, prezzoNelMomento: prezzoNellaFascia(articolo.prezzo, articolo.prezzoPerFascia, st?.fasciaGioco) }
      : e.articolo ? { chiave: e.articolo, nome: 'Articolo non più nel listino', prezzo: null, prezzoPerFascia: null, prezzoNelMomento: null } : null,
    trofeo: trofeoEsito(e.trofeo),
    oggetti: oggettiEsito(e.oggetti),
    consuma: consumaEsito(e.consuma, st?.partitaId),
    bonusDi: e.bonusDi ?? null,
    // L13 (chiusure del 31/10): la paga dell'esito (il quiz di Ore no Beko), che registrando il turno entra al posto di quella base
    paga: e.paga ?? null,
    disponibile: esito ? esito.stato !== 'bloccato' : true,
    condizioniTesto: condizioni.length ? condizioni.map((c) => c.testo).join(' · ') : null,
  };
}

/** L'esito automatico: l'unico con le condizioni vere; null se nessuno o più d'uno. */
function automatico(esiti: EsitoDisponibileDto[]): EsitoDisponibileDto | null {
  const validi = esiti.filter((e) => e.disponibile);
  return validi.length === 1 ? validi[0]! : null;
}

/** Ondata 5 (lotto F-bis): gli effetti dei libri letti che riguardano l'attività, con una partita; vuoti senza. */
function promemoriaAttivita(attivita: string, st: StatoDisponibilita | null): string[] {
  if (!st) return [];
  const tipo = prepared('SELECT tipo FROM attivita WHERE chiave = ?').pluck().get(attivita) as string | undefined;
  return tipo === undefined ? [] : promemoriaLibriPerAttivita(st.letture, { chiave: attivita, tipo });
}

/** Gli esiti di un'attività per la scheda e per il contatore, con la disponibilità nello stato dato (null senza partita). */
export function esitiDto(esiti: EsitiAttivita, st: StatoDisponibilita | null, attivita?: string): EsitiAttivitaDto {
  const elenco = esiti.esiti.map((e) => esitoDisponibile(e, st));
  return { modo: esiti.modo, esiti: elenco, automatico: esiti.modo === 'automatico' && st ? automatico(elenco)?.chiave ?? null : null,
    promemoria: attivita ? promemoriaAttivita(attivita, st) : [] };
}

/** Lo stato della partita al momento di una voce: il giorno (e quindi il giorno della settimana), la fascia e il meteo della voce. 2026-11-04:
 *  anche il meteo è quello del giorno e della fascia della voce (segnato nella partita o della guida); prima restava quello del giorno corrente
 *  della partita, e la pioggia di oggi decideva gli esiti di una voce di un altro giorno. */
export function statoAlMomento(partitaId: number, momento: { data: string; fascia: 'giorno' | 'sera' } | null, base?: StatoDisponibilita): StatoDisponibilita {
  const st = base ?? statoDisponibilitaPartita(partitaId);
  return momento ? { ...statoAlGiorno(st, momento.data), fasciaGioco: momento.fascia, meteoOra: meteoOra(partitaId, momento.data, momento.fascia) } : st;
}

/**
 * Risolve l'esito di UN turno dell'attività che dichiara esiti. `scelta`: la chiave scelta, null = «senza punti», undefined = nessuna
 * scelta arrivata (nel modo «scelta» ferma il gesto). Nel modo automatico la scelta non serve e, se arriva diversa, è rifiutata.
 * `esitoDellaVoce` (L13, ondata 9, O9-2: «Per il momento vale quello che riporta il testo sul bagno. A meno di modifiche successive.»):
 * l'esito che la voce del Diario DICHIARA per un'attività nel modo automatico. Prevale sul calcolo del giorno: vale quello, senza valutarne
 * le condizioni e senza chiedere niente, ed è registrato come `dallaVoce`. Il contatore della Partita non ha voce e non lo passa.
 */
export function risolviEsitoTurno(attivita: string, esiti: EsitiAttivita, scelta: string | null | undefined, st: StatoDisponibilita, esitoDellaVoce?: string): Extract<SceltaRisolta, { tipo: 'turno' }> {
  const nomeAttivita = esitiDellAttivita(attivita)?.nome ?? attivita;
  if (esiti.modo === 'automatico' && esitoDellaVoce) {
    const e = esiti.esiti.find((x) => x.chiave === esitoDellaVoce);
    if (!e) throw httpErrors.badRequest('esito-sconosciuto', `«${nomeAttivita}» non dichiara l'esito indicato dalla voce: correggi la voce.`);
    if (scelta !== undefined && scelta !== e.chiave) throw httpErrors.conflict('esito-automatico', `«${nomeAttivita}»: l'esito lo dice la voce (${e.nome}) e non si sceglie.`);
    return { tipo: 'turno', esito: { chiave: e.chiave, nome: e.nome, dallaVoce: true }, doti: e.doti };
  }
  const elenco = esiti.esiti.map((e) => esitoDisponibile(e, st));
  if (esiti.modo === 'automatico') {
    const vale = automatico(elenco);
    if (!vale) throw httpErrors.conflict('esito-automatico-incerto', `«${nomeAttivita}»: l'esito si ricava dalle condizioni, ma in questo momento ${elenco.some((e) => e.disponibile) ? 'ne valgono più d’uno' : 'non ne vale nessuno'}. Correggi gli esiti dell'attività.`);
    if (scelta !== undefined && scelta !== vale.chiave) throw httpErrors.conflict('esito-automatico', `«${nomeAttivita}»: l'esito vale da solo (${vale.nome}) e non si sceglie.`);
    const e = esiti.esiti.find((x) => x.chiave === vale.chiave)!;
    return { tipo: 'turno', esito: { chiave: e.chiave, nome: e.nome, automatico: true }, doti: e.doti };
  }
  // «senza punti» si nomina solo se gli esiti danno Doti (la scelta lo offre solo allora: l'estrazione della lotteria è «Vinto» o «Non vinto»)
  if (scelta === undefined) throw httpErrors.conflict('esito-da-scegliere', `«${nomeAttivita}»: scegli l'esito ottenuto${esiti.esiti.some((x) => x.doti.length > 0) ? ' (o «senza punti»)' : ''} prima di registrare il turno.`);
  if (scelta === null) return { tipo: 'turno', esito: null, doti: [] };
  const e = esiti.esiti.find((x) => x.chiave === scelta);
  if (!e) throw httpErrors.badRequest('esito-sconosciuto', `«${nomeAttivita}» non dichiara questo esito: rileggi la voce.`);
  if (!elenco.find((x) => x.chiave === scelta)!.disponibile) throw httpErrors.conflict('esito-non-disponibile', `«${e.nome}» non è ancora possibile nella partita: ${elenco.find((x) => x.chiave === scelta)!.condizioniTesto ?? 'le condizioni non sono soddisfatte'}.`);
  // 2026-10-27 (revisione): per uno strumento (esito con la versione con il bonus) il turno ricorda se è la versione con il bonus, perché il
  // riepilogo dica «con il bonus» / «senza bonus» senza ripetere il nome dello strumento accanto agli oggetti ricevuti; uno strumento senza la
  // versione con il bonus (la fabbricazione di Kawakami) si dice solo con gli oggetti ricevuti (`creazione`)
  const strumento = strumentoDi(esiti, e.chiave);
  const segno = !strumento ? {} : strumento.bonus ? { bonus: strumento.bonus.chiave === e.chiave } : { creazione: true as const };
  return { tipo: 'turno', esito: { chiave: e.chiave, nome: e.nome, ...segno }, doti: e.doti };
}

/**
 * L'esito che la voce dichiara per un turno nel modo «scelta», nel momento della voce (`st`: giorno, fascia e meteo della voce; segnalazione
 * dell'utente del 2026-11-04: la spunta chiedeva di nuovo un esito che la voce aveva già). Vale lui, se è possibile. Se non lo è per il tempo,
 * vale il suo gemello per il tempo (`gemelloPerIlTempo`), se possibile: la voce dice «Studio con la Bistecca nostalgica» e quel giorno nella
 * partita piove, quindi vale «Studio con la Bistecca nostalgica e la pioggia». Con un esito legato al tempo e il meteo di quel giorno non
 * segnato l'app non sa quale valga. Null in questi casi: allora la spunta chiede l'esito.
 */
export function esitoDellaVoceNelMomento(esiti: EsitiAttivita, esitoVoce: string, st: StatoDisponibilita): string | null {
  const dichiarato = esiti.esiti.find((e) => e.chiave === esitoVoce);
  if (!dichiarato || (!st.meteoOra && esitoLegatoAlTempo(dichiarato))) return null;
  const possibile = (e: EsitoAttivita): boolean => esitoDisponibile(e, st).disponibile;
  if (possibile(dichiarato)) return esitoVoce;
  const gemello = gemelloPerIlTempo(esiti, esitoVoce);
  return gemello && possibile(gemello) ? gemello.chiave : null;
}

/** L'effetto chiede una scelta alla spunta? Un turno di un'attività con esiti nel modo «scelta», o una Dote a valori possibili. 2026-10-27
 *  (revisione): non il turno con uno strumento SENZA versione con il bonus (la fabbricazione di Kawakami): la voce dice già esito e
 *  quantità, e non c'è niente da chiedere (vale l'esito della voce, `risolviScelteSpunta`). */
function richiedeScelta(e: EffettoVoceDto['effetto']): boolean {
  if (e.tipo === 'dote') return !!e.possibili;
  // L13 (ondata 7, O7-2): i risultati di un esame chiedono sempre il piazzamento
  if (e.tipo === 'esame') return true;
  if (e.tipo !== 'turno') return false;
  const esiti = esitiDellAttivita(e.attivita)?.esiti;
  if (esiti) return esiti.modo === 'scelta' && !strumentoSenzaBonus(esiti, e.esito);
  // L13 (31/10): il turno di un lavoro senza esiti chiede gli yen ricevuti e le note ottenute
  return lavoroAScelta(e.attivita) !== null;
}

/** Le scelte che la spunta di una voce chiede, con gli esiti disponibili al giorno della voce (per il Diario). L13 (decisione 4): anche
 *  la scelta fra gli articoli in alternativa (Set A o Set B, o nessuno), al posto del primo effetto del gruppo: tutto nell'ordine degli effetti. */
export function scelteEsitoDellaVoce(partitaId: number, momento: { data: string; fascia: 'giorno' | 'sera' }, effetti: readonly EffettoVoceDto[],
  /** Il tipo e il collegamento della voce: dicono se le note di una Dote valgono come libro o come film (`origineNoteDellaVoce`). */
  voce: { tipo: string; riferimento: { tipo: string } | null }): SceltaEsitoVoceDto[] {
  const da = effetti.filter((e) => richiedeScelta(e.effetto));
  const articoli = effetti.filter((e) => e.effetto.tipo === 'articolo');
  if (!da.length && articoli.length < 2) return [];
  // lo stato si calcola una volta sola e solo se serve (una voce con più articoli senza alternative non lo chiede)
  let calcolato: StatoDisponibilita | undefined;
  const stato = (): StatoDisponibilita => (calcolato ??= statoAlMomento(partitaId, momento));
  /** La scelta che la spunta chiede per un effetto, o null se il dato c'è già e la spunta lo usa da sola (`risolviScelteSpunta`). */
  const sceltaDellEffetto = (uid: string, e: EffettoVoceDto['effetto']): { posizione: number; scelta: SceltaEsitoVoceDto } | null => {
    const st = stato();
    const posizione = effetti.findIndex((x) => x.uid === uid);
    // le note possibili con i punti che la spunta proporrà per ciascuna (la stessa conversione di `applicaEffettiAzione`)
    if (e.tipo === 'dote') {
      const origine = origineNoteDellaVoce(partitaId, voce);
      return { posizione, scelta: { effettoUid: uid, tipo: 'dote', dote: e.dote, doteNome: nomeDote(e.dote), possibili: e.possibili!, preselezionato: e.note,
        punti: e.possibili!.map((note) => ({ note, punti: puntiDote(partitaId, e.dote, note, origine) })) } };
    }
    if (e.tipo === 'esame') {
      // L13 (ondata 7, O7-2): tutti i piazzamenti con il loro premio (Doti con i punti che la spunta proporrà, e il trofeo del primo posto).
      // Il piazzamento già segnato da Partita per lo stesso esame non si chiede di nuovo (2026-11-04): la spunta usa quello
      if (piazzamentoDellEsame(partitaId, e.esame)) return null;
      const esame = premiDellEsame(e.esame);
      const origine = origineNoteDellaVoce(partitaId, voce);
      const nomeTrofeo = prepared('SELECT nome FROM trofeo WHERE chiave = ?').pluck();
      const opzioni = PIAZZAMENTI_ESAME.map(({ chiave, nome }) => {
        const premio = premioDelPiazzamento(esame?.premi ?? [], chiave);
        const trofeo = premio.trofeo ? { chiave: premio.trofeo, nome: (nomeTrofeo.get(premio.trofeo) as string | undefined) ?? 'Trofeo non più nell’elenco' } : null;
        return { piazzamento: chiave, nome, doti: premio.doti.map((d) => ({ dote: d.dote, nome: nomeDote(d.dote), note: d.note, punti: puntiDote(partitaId, d.dote, d.note, origine) })), trofeo };
      });
      return { posizione, scelta: { effettoUid: uid, tipo: 'esame', esame: e.esame, esameNome: esame?.nome ?? 'Esame non più nella guida', preselezionato: piazzamentoDellEsame(partitaId, e.esame), opzioni } };
    }
    const t = e as Extract<EffettoVoceDto['effetto'], { tipo: 'turno' }>;
    // L13 (31/10): il lavoro senza esiti: paga base e massima, e ogni Dote con i punti per ♪, ♪♪, ♪♪♪; per prime le Doti del turno della voce
    // (il Diario prevale) o quelle del lavoro
    const lavoro = lavoroAScelta(t.attivita);
    if (lavoro && !esitiDellAttivita(t.attivita)?.esiti) {
      const proposte = t.doti?.length ? [...new Set(t.doti.map((d) => d.dote))] : lavoro.doti;
      const doti = CHIAVI_DOTI.map((dote) => ({ dote, doteNome: nomeDote(dote), punti: ([1, 2, 3] as const).map((note) => ({ note, punti: puntiDote(partitaId, dote, note) })) }));
      return { posizione, scelta: { effettoUid: uid, tipo: 'lavoro', attivita: t.attivita, attivitaNome: lavoro.nome, paga: lavoro.paga, doti, proposte } };
    }
    const a = esitiDellAttivita(t.attivita)!;
    const dto = esitiDto(a.esiti!, st, t.attivita);
    const elenco = dto.esiti;
    // 2026-10-27: lo strumento della voce ha una versione con il bonus: la spunta chiede solo «Bonus» sì/no, e parte sempre da «no» (il bonus
    // arriva a caso: lo dice chi gioca, decisione 22). Senza lo strumento nella voce, si sceglie nell'editor della voce, non alla spunta
    const coppia = coppiaBonus(a.esiti, t.esito);
    // l'esito dichiarato dalla voce (o il suo gemello per il tempo) possibile nel momento non si chiede: vale quello (2026-11-04)
    if (!coppia && t.esito && esitoDellaVoceNelMomento(a.esiti!, t.esito, st) !== null) return null;
    const bonus = coppia ? { bonus: { base: coppia.base.chiave, conBonus: coppia.bonus.chiave, nome: nomeStrumento(coppia.base), quantita: t.quantita ?? 1 } } : {};
    // (revisione) solo se TUTTI gli esiti sono strumenti: con esiti misti la voce senza esito si spunta scegliendo l'esito, come prima
    const daScegliere = !t.esito && soloStrumenti(a.esiti) ? { strumentoDaScegliere: true as const } : {};
    const preselezionato = coppia ? coppia.base.chiave : t.esito && elenco.some((x) => x.chiave === t.esito) ? t.esito : null;
    return { posizione, scelta: { effettoUid: uid, tipo: 'turno', attivita: t.attivita, attivitaNome: a.nome, preselezionato, esiti: elenco,
      ...(dto.promemoria.length ? { promemoria: dto.promemoria } : {}), ...bonus, ...daScegliere } };
  };
  // 2026-11-04 (segnalazione dell'utente: «mi chiede di rimettere un dato che dovrebbe già avere»): un effetto il cui dato c'è già (l'esito
  // dichiarato dalla voce e possibile nel momento, il piazzamento già segnato nella partita) non si chiede
  const esiti = da.flatMap(({ uid, effetto: e }) => { const x = sceltaDellEffetto(uid, e); return x ? [x] : []; });
  return [...esiti, ...scelteAlternativeDellaVoce(effetti, stato)].sort((a, b) => a.posizione - b.posizione).map((x) => x.scelta);
}

/**
 * Le scelte della spunta di una voce, verificate e risolte (per uid dell'effetto). Ogni effetto che chiede una scelta deve averne una e una
 * sola; una scelta per un effetto che non la chiede, ripetuta o del tipo sbagliato è rifiutata (400). I turni nel modo automatico si
 * risolvono qui, senza scelta. `storico`: il raccordo di un effetto nuovo su una spunta già data (nessuno può scegliere): vale l'esito
 * atteso dichiarato dalla voce, altrimenti il raccordo si ferma (409) e la voce si rispunta per scegliere.
 */
export function risolviScelteSpunta(partitaId: number, momento: { data: string; fascia: 'giorno' | 'sera' } | null, effetti: readonly EffettoVoceDto[], scelte: readonly SceltaEsitoSpunta[] | undefined, opz: { storico?: boolean } = {}): Map<string, SceltaRisolta> {
  const per = new Map<string, SceltaEsitoSpunta>();
  for (const s of scelte ?? []) {
    const e = effetti.find((x) => x.uid === s.effettoUid);
    // L13 (31/10): la scelta «lavoro» appartiene a un effetto «turno»
    if (per.has(s.effettoUid) || !e || e.effetto.tipo !== (s.tipo === 'lavoro' ? 'turno' : s.tipo) || !richiedeScelta(e.effetto)) throw httpErrors.badRequest('scelta-esito-non-valida', 'Una scelta d’esito non appartiene a un effetto della voce che la chiede, oppure è ripetuta.');
    per.set(s.effettoUid, s);
  }
  const out = new Map<string, SceltaRisolta>();
  let st: StatoDisponibilita | null = null;
  const stato = () => (st ??= statoAlMomento(partitaId, momento));
  for (const { uid, effetto: e } of effetti) {
    if (e.tipo === 'dote' && e.possibili) {
      const s = per.get(uid);
      if (!s || s.tipo !== 'dote') {
        if (opz.storico) throw httpErrors.conflict('esito-da-scegliere', `${nomeDote(e.dote)}: le note si scelgono alla spunta. Togli e rimetti la spunta della voce per sceglierle.`);
        throw httpErrors.conflict('esito-da-scegliere', `${nomeDote(e.dote)}: scegli quante note hai ottenuto (o «nessuna») prima di spuntare.`);
      }
      if (s.note !== 0 && !e.possibili.includes(s.note)) throw httpErrors.badRequest('note-non-possibili', `${nomeDote(e.dote)}: le note possibili sono ${simboliPossibili(e.possibili)}.`);
      out.set(uid, { tipo: 'dote', note: s.note });
    } else if (e.tipo === 'esame') {
      // L13 (ondata 7, O7-2): senza il piazzamento la spunta non passa; nel raccordo di un effetto aggiunto a una voce già spuntata nessuno sceglie
      // 2026-11-04: senza scelta vale il piazzamento già segnato nella partita per lo stesso esame (la spunta non lo chiede di nuovo)
      const s = per.get(uid) ?? (() => { const gia = piazzamentoDellEsame(partitaId, e.esame); return gia ? { effettoUid: uid, tipo: 'esame' as const, piazzamento: gia } : undefined; })();
      if (!s || s.tipo !== 'esame') {
        if (opz.storico) throw httpErrors.conflict('piazzamento-da-scegliere', 'Il piazzamento all’esame si sceglie alla spunta. Togli e rimetti la spunta della voce per sceglierlo.');
        throw httpErrors.conflict('piazzamento-da-scegliere', 'Scegli il piazzamento ottenuto all’esame prima di spuntare.');
      }
      if (!ePiazzamentoEsame(s.piazzamento)) throw httpErrors.badRequest('scelta-esito-non-valida', 'Il piazzamento scelto non è fra quelli possibili.');
      out.set(uid, { tipo: 'esame', piazzamento: s.piazzamento });
    } else if (e.tipo === 'turno') {
      const a = esitiDellAttivita(e.attivita);
      if (!a?.esiti) {
        // L13 (31/10): il turno di un lavoro senza esiti si spunta con gli yen ricevuti e le note ottenute; nel raccordo di un effetto aggiunto a
        // una voce già spuntata nessuno sceglie: vale il turno come prima (Doti della voce o del lavoro, paga base)
        const lavoro = lavoroAScelta(e.attivita);
        if (!lavoro) continue;
        const s = per.get(uid);
        if (!s || s.tipo !== 'lavoro') {
          if (opz.storico) continue;
          throw httpErrors.conflict('lavoro-da-indicare', `«${lavoro.nome}»: indica gli yen ricevuti e le note ottenute prima di spuntare.`);
        }
        if (!Number.isInteger(s.yen) || s.yen < 0 || s.yen > YEN_MASSIMI_LAVORO) throw httpErrors.badRequest('yen-non-validi', `«${lavoro.nome}»: gli yen ricevuti vanno da 0 a ${YEN_MASSIMI_LAVORO.toLocaleString('it-IT')}.`);
        if (new Set(s.doti.map((d) => d.dote)).size !== s.doti.length || s.doti.some((d) => !eDote(d.dote) || ![1, 2, 3].includes(d.note))) throw httpErrors.badRequest('doti-non-valide', `«${lavoro.nome}»: ogni Dote una volta sola, con da una a tre note.`);
        out.set(uid, { tipo: 'lavoro', yen: s.yen, doti: s.doti.map((d) => ({ dote: d.dote, note: d.note })) });
        continue;
      }
      const s = per.get(uid);
      // 2026-10-27: lo strumento con la versione con il bonus lo dice la voce; alla spunta si sceglie solo se con il bonus o no (la versione
      // base o quella con il bonus dello STESSO strumento). Senza strumento nella voce la spunta si ferma: lo si sceglie nell'editor
      const coppia = coppiaBonus(a.esiti, e.esito);
      // 2026-11-04: senza scelta, nel modo «scelta», vale l'esito dichiarato dalla voce, o il suo gemello per il tempo, se possibile nel momento
      // (`esitoDellaVoceNelMomento`: la spunta non lo chiede di nuovo); nel raccordo storico, altrimenti, l'esito della voce com'è (il suo motivo,
      // se non è possibile, lo dice `risolviEsitoTurno`). Lo strumento con la versione con il bonus chiede sempre «Bonus» sì/no
      const dallaVoce = a.esiti.modo !== 'scelta' || !e.esito ? undefined
        : (!coppia ? esitoDellaVoceNelMomento(a.esiti, e.esito, stato()) : null) ?? (opz.storico ? e.esito : undefined);
      // (revisione) lo strumento senza versione con il bonus non chiede niente: vale l'esito della voce, con le sue condizioni
      const scelta = s?.tipo === 'turno' ? s.esito : strumentoSenzaBonus(a.esiti, e.esito) ? e.esito : dallaVoce;
      if (coppia && scelta !== undefined && scelta !== coppia.base.chiave && scelta !== coppia.bonus.chiave) throw httpErrors.badRequest('esito-fuori-strumento', `«${a.nome}»: la voce indica ${nomeStrumento(coppia.base)}; alla spunta si sceglie solo se con il bonus o no.`);
      if (!coppia && !e.esito && soloStrumenti(a.esiti) && !opz.storico) throw httpErrors.conflict('strumento-da-scegliere', `«${a.nome}»: la voce non dice che cosa si crea. Scegli strumento e quantità nell’editor della voce, poi spunta.`);
      if (opz.storico && a.esiti.modo === 'scelta' && scelta === undefined) throw httpErrors.conflict('esito-da-scegliere', `«${a.nome}»: l'esito si sceglie alla spunta. Togli e rimetti la spunta della voce per sceglierlo.`);
      // L13 (ondata 9, O9-2): nel modo automatico l'esito dichiarato dalla voce prevale sul calcolo del giorno (anche nel raccordo storico)
      out.set(uid, risolviEsitoTurno(e.attivita, a.esiti, scelta, stato(), a.esiti.modo === 'automatico' ? e.esito : undefined));
    }
  }
  return out;
}
