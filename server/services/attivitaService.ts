// ============================================================
// attivitaService — attività del tempo libero, lavori, libri e film con effetti sulle Doti e letture per partita (Fase 8.1)
// ============================================================
//
// Dalla voce 5 del piano «struttura, non frasi» (2026-09-12) che cosa dà una lettura o
// un'attività lo dicono gli **effetti dichiarati** (`effetti_json`, migrazione 074): i punti Dote
// di un conseguimento vengono da lì (`dotiDaEffetti`), con le condizioni della voce valutate sulla
// partita («piove» per lo studio). Le righe nascoste dal catalogo non compaiono; una lettura non
// disponibile non si può avanzare (409); un libro sa dove si compra (articoli collegati, 073) e
// un'attività dove si svolge (sede, 072).
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { datiGuidaCorretti } from './datiGuida.js';
import { registraEvento } from './storicoService.js';
import type { AttivitaDto, AttivitaTutteDto, CatalogoOggettoDto, CondizioneSpilloDto, DisponibilitaDto, DoteDaSegnareDto, FilmDto, FilmDvdDto, LibroDto, LibriDto, QuizVoceDto, TipoLettura, VideogiocoDto, VideogiochiDto, VoceEffettoDto } from '../../shared/types.js';
import { statoDisponibilitaPartita, valutaRequisiti, type RequisitoDisponibilita, type StatoDisponibilita } from './disponibilitaService.js';
import { nomeDote } from './partiteService.js';
import { haAnimaDaCineasta, puntiDote } from './puntiDoti.js';
import { condizioneConTesto, leggiCondizioniSalvate, normalizzaCondizioniSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { libriCheSbloccano } from '../../shared/dipendenzeCondizioni.js';
import { effettiVisibiliDelLibro } from '../../shared/effettiLibro.js';
import { conGliInviti, invitiCheAprono, tuttiGliInviti } from './condizioni/condizioneEffettiva.js';
import { casaDelLuogo } from './luoghiService.js';
import { descriviVoceEffetto, dotiDaEffetti, leggiVociEffetto, type VoceEffetto } from '../../shared/effettiCatalogo.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { eTracciamentoAttivita, tracciamentoPerTipo } from '../../shared/attivita.js';
import { eGiornoDelQuiz, leggiQuiz, type QuizAttivita } from '../../shared/quizAttivita.js';
import { catalogoOggettiDisponibile, negoziPerFonte, oggettiPerFonte } from './catalogoOggettiLetture.js';
import { avanzamentoCompleto, lettureCompletate } from './lettureCompletate.js';
import { sessioniVideogioco } from './sessioniVideogioco.js';
import { disponibilitaAttivita, sediAttivita, type SediAttivita } from './disponibilitaAttivita.js';
import { fonteConfidenteAttivita } from './fonteConfidenteAttivitaService.js';
import { fraseDelleCondizioni } from './condizioni/fraseCondizioni.js';
import { leggiRegolaPesca } from './regolePescaService.js';
import { esitiDellAttivita, esitiDto, risolviEsitoTurno } from './esitiAttivitaService.js';
import { muoviYenAutomatico, restituisciYenAutomatico } from './yenAutomaticiService.js';
import { leggiEsitiAttivita } from '../../shared/esitiAttivita.js';
import { testoDoteInPunti } from '../../shared/note.js';
import type { FasciaPrezzo } from '../../shared/catalogo.js';
import { fasciaDellaPartita, prezzoDellArticolo } from './prezziArticoli.js';
import { segnaTrofeoDelTurno, togliTrofeoDelTurno } from './trofeiDegliEsitiService.js';
import { segnaOggettiDelTurno, togliOggettiDelTurno } from './oggettiDegliEsitiService.js';
import { segnaConsumiDelTurno, togliConsumiDelTurno } from './consumiOggettiService.js';
import { promemoriaLibriPerAttivita, promemoriaLibriPerFilm, promemoriaLibriPerVideogiochi, promemoriaLibriSenzaAttivita } from './modificatoriLibri.js';

interface RigaAttivita { confidente_chiave: string | null; pesca_regola_chiave?: string | null; pesca_ruolo?: 'visita'|'obiettivi'|null }

type CatalogoLetture = Map<string, CatalogoOggettoDto>;
/** I prezzi copiati dalla guida non sono offerte. Gli avanzamenti non dipendono da questi campi. */
function datiCatalogoLettura(oggetto: CatalogoOggettoDto | undefined, prezzoGuida: number | null, cinema = false) {
  return { catalogo: oggetto ? { chiave: oggetto.chiave, nome: oggetto.nome, casa: oggetto.casa } : null,
    nomiAltri: oggetto ? [...new Set([...oggetto.nomiAltri, ...(oggetto.nomeOriginale ? [oggetto.nomeOriginale] : [])])] : [],
    prezzo: oggetto ? oggetto.prezzoMinimo : prezzoGuida,
    notaPrezzo: oggetto && oggetto.prezzoMinimo === null && prezzoGuida !== null
      ? `${cinema ? 'Costo della visione indicato nella guida' : 'Prezzo indicato nella guida'}: ${prezzoGuida.toLocaleString('it-IT')} ¥. Non è un prezzo di vendita ricavato dai listini.` : null };
}

interface RigaAttivita { chiave: string; ordine: number; nome: string; tipo: string; luogo: string; luogo_chiave: string | null; sede_chiave: string | null; fascia: string | null; costo: number | null; sessioni: number | null; doti_json: string; paga_yen: number | null; paga_massima: number | null; dettagli: string | null; effetti_json: string | null; tracciamento: string; quiz_json: string | null; fonte: string; verificato: number; condizioni_json: string | null;
  /** L13 (migrazione 233): gli esiti dichiarati; assente su uno schema di prima. */
  esiti_json?: string | null }
interface RigaLibro { effetti_json: string | null; chiave: string; ordine: number; nome: string; dove: string; prezzo: number | null; disponibile_dal: string | null; dote: string | null; note: number | null; sblocca: string | null; sessioni: number | null; dettagli: string | null; fonte: string; verificato: number; condizioni_json: string | null }
interface RigaFilm { effetti_json: string | null; chiave: string; ordine: number; nome: string; dove: 'cinema' | 'dvd'; periodo: string; dote: string | null; note: number | null; note_successive: number | null; prezzo: number | null; sessioni: number; dettagli: string | null; fonte: string; verificato: number; condizioni_json: string | null }

/** La disponibilità di una riga, dalle condizioni strutturate. La condizione non nasconde niente:
 *  dice «non ancora», che in una guida è un'informazione, non un ostacolo. */
function conDisponibilita(condizioniJson: string | null, st: StatoDisponibilita | null): { condizioni: CondizioneSpilloDto[] | null; disponibilita: DisponibilitaDto | null } {
  let grezze: RequisitoSpillo[];
  try { grezze = normalizzaCondizioniSpillo(condizioniJson ? (JSON.parse(condizioniJson) as unknown) : []); } catch { grezze = []; }
  if (grezze.length === 0) return { condizioni: null, disponibilita: null };
  const nomi = nomiCondizioniMemo();
  const condizioni = grezze.map((c) => condizioneConTesto(c, nomi));
  return { condizioni, disponibilita: st ? valutaRequisiti(condizioni as RequisitoDisponibilita[], st) : null };
}

/** Gli effetti dichiarati con la loro frase, i nomi di quartieri e attività risolti dal database. */
function effettiDto(json: string | null, libro = false): { effetti: VoceEffettoDto[]; effettiTesto: string[] } {
  const lette = leggiVociEffetto(json);
  const voci = libro ? effettiVisibiliDelLibro(lette) : lette;
  const nomi = nomiCondizioniMemo();
  const effetti = voci.map((v) => ({ ...v, testo: descriviVoceEffetto(v, { luoghi: nomi.quartieri, attivita: nomi.attivita, condizioni: nomi }) }));
  return { effetti, effettiTesto: effetti.map((e) => e.testo) };
}

interface RigaPosizioneLibro { libro_chiave: string; tipo: LibroDto['posizioni'][number]['tipo']; chiave: string; etichetta: string }
interface RigaPosizioneFilm { film_chiave: string; tipo: FilmDto['posizioni'][number]['tipo']; chiave: string; etichetta: string; ruolo: FilmDto['posizioni'][number]['ruolo'] }

/** Gli articoli collegati a libri e videogiochi (migrazione 073): dove si compra ciascuno. */
function articoliCollegati(fonte: 'libri' | 'videogiochi'): Map<string, LibroDto['negozi']> {
  if (catalogoOggettiDisponibile()) return negoziPerFonte(fonte === 'libri' ? 'libro' : 'videogioco');
  const out = new Map<string, LibroDto['negozi']>();
  for (const a of prepared('SELECT a.chiave, a.oggetto_chiave, a.prezzo, n.chiave AS negozio, n.nome AS negozio_nome FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave WHERE a.oggetto_fonte = ? AND a.nascosto = 0 AND n.nascosto = 0 ORDER BY n.ordine, a.ordine').all(fonte) as Array<{ chiave: string; oggetto_chiave: string; prezzo: number | null; negozio: string; negozio_nome: string }>) {
    const elenco = out.get(a.oggetto_chiave) ?? [];
    elenco.push({ articolo: a.chiave, negozio: a.negozio, negozioNome: a.negozio_nome, prezzo: a.prezzo });
    out.set(a.oggetto_chiave, elenco);
  }
  return out;
}

/** Una riga di `attivita` come DTO: Doti dal JSON, effetti dichiarati con le loro frasi, nome della sede risolto da `sedi`,
 *  tracciamento ricondotto a quello del tipo quando il valore è fuori catalogo, la guida del quiz (105, null se manca o è
 *  illeggibile) e la disponibilità valutata se c'è lo stato della partita. */
const attivitaDto = (r: RigaAttivita, sedi: SediAttivita, st: StatoDisponibilita | null = null, catalogo: CatalogoLetture = new Map()): AttivitaDto => {
  const oggetto = r.tipo === 'videogioco' ? catalogo.get(r.chiave) : undefined;
  const { prezzo, ...identita } = datiCatalogoLettura(oggetto, r.costo);
  const fonteConfidente = fonteConfidenteAttivita({ ...r }, st);
  const tracciamento = eTracciamentoAttivita(r.tracciamento) ? r.tracciamento : tracciamentoPerTipo(r.tipo);
  // L13: gli esiti dichiarati (un solo punto: `esiti_json`), con la disponibilità nella partita; mai per le fonti Confidente o pesca
  const esiti = !fonteConfidente && !r.pesca_regola_chiave ? leggiEsitiAttivita(r.esiti_json) : null;
  const dto = {
    esiti: esiti ? esitiDto(esiti, st, r.chiave) : null,
    // Ondata 5 (lotto F-bis): con una partita, gli effetti dei libri letti che riguardano l'attività, anche senza esiti (biliardo, freccette,
    // Fioraio Rafflesia, pesca); mai per una fonte Confidente, che rimanda alla sua scheda
    promemoria: st && !fonteConfidente ? promemoriaLibriPerAttivita(st.letture, { chiave: r.chiave, tipo: r.tipo }) : [],
    // R10-27/3: lo stato della partita nella scheda, come nelle schede di Confidente e Palazzo (volte svolte, dal contatore unico)
    ...(st && !fonteConfidente && tracciamento === 'svolta' ? { volteSvolte: st.attivitaSvolte.get(r.chiave) ?? 0 } : {}),
    pesca: r.pesca_regola_chiave && r.pesca_ruolo ? { regola: leggiRegolaPesca(r.pesca_regola_chiave), ruolo: r.pesca_ruolo } : null,
    confidenteChiave: r.confidente_chiave ?? null, fonteConfidente,
    chiave: r.chiave, nome: oggetto?.nome ?? r.nome, ...identita, tipo: r.tipo as AttivitaDto['tipo'], luogo: r.luogo, luogoChiave: r.luogo_chiave, fascia: r.fascia as AttivitaDto['fascia'], costo: prezzo, sblocco: null, sessioni: r.sessioni,
    doti: fonteConfidente ? [] : JSON.parse(r.doti_json) as AttivitaDto['doti'],
    pagaYen: r.paga_yen, pagaMassima: r.paga_massima, dettagli: r.dettagli, ...effettiDto(fonteConfidente ? null : r.effetti_json),
    tracciamento, quiz: leggiQuiz(r.quiz_json),
    sedeChiave: r.sede_chiave, sedeNome: r.sede_chiave ? (sedi.luoghi.get(r.sede_chiave)?.nome ?? null) : null,
    verificato: r.verificato === 1,
    ...(fonteConfidente ? { fascia: null, sblocco: null, doti: [], effetti: [], effettiTesto: [], tracciamento: 'nessuno' as const,
      quiz: null, condizioni: null, disponibilita: null } : disponibilitaAttivita(r, st, sedi)),
  };
  return { ...dto, sblocco: fraseDelleCondizioni(dto.condizioni) };
};
interface StatoLetture { fatti: Set<string>; progressiLibri: Map<string, number>; progressiFilm: Map<string, number>; progressiVideogiochi: Map<string, number>; sessioniVideogioco: ReturnType<typeof sessioniVideogioco> }
/** Il libro che cambia le regole di tutti gli altri, **da lì in avanti**: «Lettura rapida» raddoppia
 *  quanto rende un pomeriggio, non è retroattivo (le sessioni già lette restano quelle). */
const CHIAVE_LETTURA_RAPIDA = 'lettura-rapida';
/** Vero se nella partita «Lettura rapida» risulta letto. */
const haLetturaRapida = (stato: StatoLetture) => stato.fatti.has(`libro/${CHIAVE_LETTURA_RAPIDA}`);
/** Le sessioni che servono a finire un libro: quelle del catalogo, almeno una (null o zero valgono uno). */
const totaleLibro = (r: RigaLibro) => Math.max(r.sessioni ?? 1, 1);

/**
 * L6 (R6-11): i posti che ogni libro apre, **calcolati** dalle condizioni dei luoghi e dei quartieri che citano `lettura{libro}` (a
 * qualunque profondità: «il libro oppure Ann al rango 10» apre lo stesso). Non dalla frase `libro.sblocca` (nota) né dall'effetto
 * «sblocca-luogo»: così un libro apre davvero quel che dice la sua scheda.
 */
function postiApertiDaiLibri(): Map<string, NonNullable<LibroDto['apre']>> {
  const out = new Map<string, NonNullable<LibroDto['apre']>>();
  const inviti = tuttiGliInviti();
  /** Aggiunge il posto ai libri citati dalle sue condizioni. */
  const aggiungi = (json: string | null, posto: NonNullable<LibroDto['apre']>[number]) => {
    const effettive = conGliInviti(leggiCondizioniSalvate(json), invitiCheAprono(posto.tipo, posto.chiave, inviti));
    const libri = libriCheSbloccano(effettive);
    for (const l of libri) { const v = out.get(l) ?? []; v.push(posto); out.set(l, v); }
  };
  const conQuartieri = (prepared("SELECT name FROM pragma_table_info('quartiere')").all() as Array<{ name: string }>).some((c) => c.name === 'condizioni_json');
  if (conQuartieri) {
    for (const q of prepared('SELECT chiave, nome, condizioni_json FROM quartiere WHERE condizioni_json IS NOT NULL ORDER BY ordine').all() as Array<{ chiave: string; nome: string; condizioni_json: string }>) {
      aggiungi(q.condizioni_json, { tipo: 'quartiere', chiave: q.chiave, nome: q.nome, casa: `/guida/citta/${encodeURIComponent(q.chiave)}` });
    }
  }
  for (const l of prepared("SELECT chiave, nome, condizioni_json FROM luogo WHERE nascosto = 0 AND condizioni_json LIKE '%lettura%' ORDER BY quartiere_chiave, ordine").all() as Array<{ chiave: string; nome: string; condizioni_json: string }>) {
    aggiungi(l.condizioni_json, { tipo: 'luogo', chiave: l.chiave, nome: l.nome, casa: casaDelLuogo(l.chiave) });
  }
  return out;
}

/** Un libro come DTO con il suo stato nella partita: sessioni totali, avanzamento limitato fra 0 e il totale (pieno se il
 *  libro risulta letto), quartiere che apre, negozi che lo vendono, posizioni e disponibilità. */
const libroDto = (r: RigaLibro, stato: StatoLetture, posizioni: Map<string, LibroDto['posizioni']>, negozi: Map<string, LibroDto['negozi']>, st: StatoDisponibilita | null = null, apre: Map<string, NonNullable<LibroDto['apre']>> = new Map(), catalogo: CatalogoLetture = new Map()): LibroDto => {
  const oggetto = catalogo.get(r.chiave);
  const totaleSessioni = totaleLibro(r);
  const grezzo = stato.progressiLibri.get(r.chiave) ?? 0;
  // «Finito» resta un fatto registrato, non dedotto dal conteggio: se una correzione dei dati
  // abbassa le sessioni, il libro non diventa letto da solo. L'unica soglia che vale da sola è
  // «Lettura rapida», che è un fatto della partita, riallineato esplicitamente in `impostaLettura`.
  const fatto = stato.fatti.has(`libro/${r.chiave}`);
  const posti = apre.get(r.chiave) ?? [];
  // Compatibilità dei vecchi campi API: stessa fonte calcolata, mai l'effetto storico.
  const quartiere = posti.find((p) => p.tipo === 'quartiere');
  return {
    chiave: r.chiave, nome: oggetto?.nome ?? r.nome, dove: r.dove, ...datiCatalogoLettura(oggetto, r.prezzo), disponibileDal: r.disponibile_dal, dote: r.dote as LibroDto['dote'], note: r.note, sblocca: r.sblocca, sbloccaLuogo: quartiere?.chiave ?? null, sbloccaLuogoNome: quartiere?.nome ?? null, apre: posti, sessioni: r.sessioni, dettagli: r.dettagli,
    ...effettiDto(r.effetti_json, true), negozi: negozi.get(r.chiave) ?? [],
    verificato: r.verificato === 1,
    posizioni: posizioni.get(r.chiave) ?? [], totaleSessioni, progresso: fatto ? totaleSessioni : Math.min(Math.max(grezzo, 0), totaleSessioni), fatto,
    ...conDisponibilita(r.condizioni_json, st),
  };
};
/** Un film come DTO con il suo stato nella partita. Il DVD ha un tetto (le sessioni) ed è finito quando lo raggiunge; al
 *  cinema le visioni non hanno tetto e il film conta come visto dalla prima. */
const filmDto = (r: RigaFilm, stato: StatoLetture, posizioni: Map<string, FilmDto['posizioni']>, st: StatoDisponibilita | null = null, catalogo: CatalogoLetture = new Map(), negozi: Map<string, LibroDto['negozi']> = new Map()): FilmDto => {
  const oggetto = catalogo.get(r.chiave);
  const totaleSessioni = Math.max(r.sessioni, 1);
  const grezzo = Math.max(stato.progressiFilm.get(r.chiave) ?? 0, 0);
  const progresso = r.dove === 'dvd' ? Math.min(grezzo, totaleSessioni) : grezzo;
  const iniziato = progresso > 0;
  return {
    chiave: r.chiave, nome: oggetto?.nome ?? r.nome, ...datiCatalogoLettura(oggetto, r.prezzo, r.dove === 'cinema'), negozi: negozi.get(r.chiave) ?? [], dove: r.dove, dote: r.dote as FilmDto['dote'], note: r.note, noteSuccessive: r.note_successive, dettagli: r.dettagli,
    ...effettiDto(r.effetti_json), verificato: r.verificato === 1,
    posizioni: posizioni.get(r.chiave) ?? [], totaleSessioni, progresso, iniziato, fatto: r.dove === 'cinema' ? iniziato : progresso >= totaleSessioni,
    ...conDisponibilita(r.condizioni_json, st),
  };
};

/** Lo stato delle letture di una partita: fruizioni completate (`tipo/chiave`) e avanzamenti di libri, film e videogiochi.
 *  Senza partita restituisce uno stato vuoto; con partita ne verifica prima l'esistenza. */
function letturePartita(partitaId: number | undefined): StatoLetture {
  if (partitaId === undefined) return { fatti: new Set(), progressiLibri: new Map(), progressiFilm: new Map(), progressiVideogiochi: new Map(), sessioniVideogioco: sessioniVideogioco() };
  verificaPartita(partitaId);
  // R10-20: «letto» si calcola dall'avanzamento (una sola definizione), non dalla tabella `lettura_partita`
  const fatti = lettureCompletate(partitaId);
  const progressiLibri = new Map((prepared('SELECT libro_chiave, avanzamento FROM progresso_libro_partita WHERE partita_id = ?').all(partitaId) as Array<{ libro_chiave: string; avanzamento: number }>).map((r) => [r.libro_chiave, r.avanzamento]));
  const progressiFilm = new Map((prepared('SELECT film_chiave, avanzamento FROM progresso_film_partita WHERE partita_id = ?').all(partitaId) as Array<{ film_chiave: string; avanzamento: number }>).map((r) => [r.film_chiave, r.avanzamento]));
  const progressiVideogiochi = new Map((prepared('SELECT videogioco_chiave, avanzamento FROM progresso_videogioco_partita WHERE partita_id = ?').all(partitaId) as Array<{ videogioco_chiave: string; avanzamento: number }>).map((r) => [r.videogioco_chiave, r.avanzamento]));
  return { fatti, progressiLibri, progressiFilm, progressiVideogiochi, sessioniVideogioco: sessioniVideogioco(partitaId) };
}

/** Un videogioco come DTO: avanzamento limitato ai round del titolo, iniziato da una sessione dichiarata o da un round,
 * completato soltanto al raggiungimento del totale. La dichiarazione non aggiunge round. */
const videogiocoDto = (r: RigaAttivita, stato: StatoLetture, sedi: SediAttivita, negozi: Map<string, LibroDto['negozi']>, st: StatoDisponibilita | null = null, catalogo: CatalogoLetture = new Map()): VideogiocoDto => {
  const totaleRound = Math.max(r.sessioni ?? 1, 1);
  const progresso = Math.min(Math.max(stato.progressiVideogiochi.get(r.chiave) ?? 0, 0), totaleRound);
  return { ...attivitaDto(r, sedi, st, catalogo), tipo: 'videogioco', negozi: negozi.get(r.chiave) ?? [], totaleRound, progresso,
    iniziato: stato.sessioniVideogioco.giocate.has(r.chiave), sessioneDichiarata: stato.sessioniVideogioco.dichiarate.has(r.chiave), fatto: progresso >= totaleRound };
};

/** Registra soltanto che si è giocata una sessione, anche senza vincere un round. Togliere la dichiarazione è sempre possibile. */
export function impostaSessioneVideogioco(partitaId: number, chiave: string, dichiarata: boolean): VideogiocoDto {
  verificaPartita(partitaId);
  const r = prepared(`SELECT * FROM attivita WHERE chiave = ? AND tipo = 'videogioco'${dichiarata ? ' AND nascosto = 0' : ''}`).get(chiave) as RigaAttivita | undefined;
  if (!r) throw httpErrors.notFound('lettura-non-trovata', `Il videogioco '${chiave}' non esiste.`);
  const presente = !!prepared('SELECT 1 FROM sessione_videogioco_partita WHERE partita_id = ? AND videogioco_chiave = ?').get(partitaId, chiave);
  if (r.confidente_chiave && dichiarata && !presente) throw httpErrors.conflict('attivita-fonte-confidente', 'Questa attività rimanda al Confidente: registra l’incontro nella sua scheda.');
  if(r.pesca_regola_chiave&&dichiarata&&!presente)throw httpErrors.conflict('attivita-fonte-pesca','Questa attività usa la sessione di pesca, senza una dichiarazione di videogioco.');
  const st = statoDisponibilitaPartita(partitaId);
  if (dichiarata && !presente && disponibilitaAttivita(r, st).disponibilita?.stato === 'bloccato') {
    throw httpErrors.conflict('lettura-non-disponibile', 'Il videogioco non è ancora disponibile nella partita.');
  }
  if (presente !== dichiarata) getDb().transaction(() => {
    const adesso = nowIso();
    if (dichiarata) prepared('INSERT INTO sessione_videogioco_partita (partita_id, videogioco_chiave, updated_at) VALUES (?, ?, ?) ON CONFLICT(partita_id, videogioco_chiave) DO NOTHING').run(partitaId, chiave, adesso);
    else prepared('DELETE FROM sessione_videogioco_partita WHERE partita_id = ? AND videogioco_chiave = ?').run(partitaId, chiave);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return videogiocoDto(r, letturePartita(partitaId), sediAttivita(), articoliCollegati('videogiochi'), statoDisponibilitaPartita(partitaId), oggettiPerFonte('videogioco'));
}

/** I videogiochi non nascosti, con il loro stato nella partita (se c'è) e i totali: iniziati, completati, round fatti e round da fare. */
export function videogiochiTutti(partitaId?: number): VideogiochiDto {
  const stato = letturePartita(partitaId);
  const st = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId);
  const sedi = sediAttivita(); const negozi = articoliCollegati('videogiochi');
  const catalogo = oggettiPerFonte('videogioco');
  const videogiochi = (prepared("SELECT * FROM attivita WHERE tipo='videogioco' AND nascosto = 0 ORDER BY ordine").all() as RigaAttivita[]).map((r) => videogiocoDto(r, stato, sedi, negozi, st, catalogo));
  return { videogiochi, iniziati: videogiochi.filter((v) => v.iniziato).length, completati: videogiochi.filter((v) => v.fatto).length, roundFatti: videogiochi.reduce((n, v) => n + v.progresso, 0), roundObiettivo: videogiochi.reduce((n, v) => n + v.totaleRound, 0), noteCategorie: noteCategorieAttivita(),
    // Ondata 5 (lotto F-bis): con una partita, gli effetti dei libri letti che riguardano i videogiochi («Segreti di gioco»)
    promemoria: partitaId === undefined ? [] : promemoriaLibriPerVideogiochi(stato.fatti) };
}

/** Le posizioni di ogni film (`film_posizione`), raggruppate per film nell'ordine dichiarato. */
function posizioniFilm(): Map<string, FilmDto['posizioni']> {
  const esito = new Map<string, FilmDto['posizioni']>();
  for (const r of prepared('SELECT film_chiave, tipo, chiave, etichetta, ruolo FROM film_posizione ORDER BY film_chiave, ordine').all() as RigaPosizioneFilm[]) {
    const elenco = esito.get(r.film_chiave) ?? [];
    elenco.push({ tipo: r.tipo, chiave: r.chiave, etichetta: r.etichetta, ruolo: r.ruolo });
    esito.set(r.film_chiave, elenco);
  }
  return esito;
}

/** Le posizioni di ogni libro (`libro_posizione`), raggruppate per libro nell'ordine dichiarato. */
function posizioniLibri(): Map<string, LibroDto['posizioni']> {
  const esito = new Map<string, LibroDto['posizioni']>();
  for (const r of prepared('SELECT libro_chiave, tipo, chiave, etichetta FROM libro_posizione ORDER BY libro_chiave, ordine').all() as RigaPosizioneLibro[]) {
    const elenco = esito.get(r.libro_chiave) ?? [];
    elenco.push({ tipo: r.tipo, chiave: r.chiave, etichetta: r.etichetta });
    esito.set(r.libro_chiave, elenco);
  }
  return esito;
}

/**
 * I libri come DTO. Letture e stato della disponibilità si passano quando il chiamante li ha già (rilievo P5': `attivitaTutte` e
 * `libriTutti` li calcolavano due volte); senza, si leggono qui.
 */
function elencoLibri(partitaId: number | undefined, stato: StatoLetture = letturePartita(partitaId),
  st: StatoDisponibilita | null = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId)): LibroDto[] {
  const posizioni = posizioniLibri();
  const negozi = articoliCollegati('libri');
  const apre = postiApertiDaiLibri();
  const catalogo = oggettiPerFonte('libro');
  return (prepared('SELECT * FROM libro WHERE nascosto = 0 ORDER BY ordine').all() as RigaLibro[]).map((r) => libroDto(r, stato, posizioni, negozi, st, apre, catalogo));
}

/** I libri non nascosti con i totali della partita: libri finiti, sessioni lette e da leggere, e se vale «Lettura rapida». */
export function libriTutti(partitaId?: number): LibriDto {
  const stato = letturePartita(partitaId);
  const libri = elencoLibri(partitaId, stato);
  return {
    libri, completati: libri.filter((l) => l.fatto).length,
    sessioniFatte: libri.reduce((n, l) => n + l.progresso, 0),
    sessioniTotali: libri.reduce((n, l) => n + l.totaleSessioni, 0),
    letturaRapida: haLetturaRapida(stato),
    // Ondata 5 (lotto F-bis): con una partita, gli effetti dei libri letti senza un'attività dell'app (Lettura rapida la dice `letturaRapida`)
    promemoria: partitaId === undefined ? [] : promemoriaLibriSenzaAttivita(stato.fatti),
  };
}

/** Film e DVD non nascosti con i totali della partita. Le sessioni di completamento contano ogni film fino al suo totale
 *  (le visioni al cinema oltre il totale non gonfiano il conto); `visioniRegistrate` le conta tutte. */
export function filmDvdTutti(partitaId?: number): FilmDvdDto {
  const stato = letturePartita(partitaId);
  const posizioni = posizioniFilm();
  const st = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId);
  const catalogo = oggettiPerFonte('film'); const negozi = negoziPerFonte('film');
  const film = (prepared('SELECT * FROM film WHERE nascosto = 0 ORDER BY ordine').all() as RigaFilm[]).map((r) => filmDto(r, stato, posizioni, st, catalogo, negozi));
  return {
    film,
    iniziati: film.filter((f) => f.iniziato).length,
    completati: film.filter((f) => f.fatto).length,
    sessioniCompletamentoFatte: film.reduce((n, f) => n + Math.min(f.progresso, f.totaleSessioni), 0),
    sessioniObiettivo: film.reduce((n, f) => n + f.totaleSessioni, 0),
    visioniRegistrate: film.reduce((n, f) => n + f.progresso, 0),
    // Ondata 5 (lotto F-bis): con una partita, gli effetti dei libri letti che riguardano le visioni («Anima da cineasta»), come promemoria
    promemoria: st ? promemoriaLibriPerFilm(st.letture) : [],
  };
}

/** Un'attività con la guida del quiz (migrazione 105): nome, sede e quiz. */
export interface AttivitaConQuiz { nome: string; sede: string | null; quiz: QuizAttivita }

/** Le attività visibili che hanno una guida del quiz, per chiave: una lettura per richiesta. Le usano la giornata (le voci
 *  che registrano un turno) e la pagina del negozio (le attività che si svolgono nella sua sede). */
export function attivitaConQuiz(): Map<string, AttivitaConQuiz> {
  const out = new Map<string, AttivitaConQuiz>();
  for (const r of prepared('SELECT chiave, nome, sede_chiave, quiz_json FROM attivita WHERE quiz_json IS NOT NULL AND nascosto = 0 ORDER BY ordine').all() as Array<{ chiave: string; nome: string; sede_chiave: string | null; quiz_json: string }>) {
    const quiz = leggiQuiz(r.quiz_json);
    if (quiz) out.set(r.chiave, { nome: r.nome, sede: r.sede_chiave, quiz });
  }
  return out;
}

/** La guida del quiz di un'attività come la portano le voci e i negozi: `oggi` vero se `giorno` ('MM-GG') è uno dei giorni del quiz. */
export function quizVoceDto(chiave: string, a: AttivitaConQuiz, giorno: string | null): QuizVoceDto {
  return { attivita: chiave, nome: a.nome, quiz: a.quiz, oggi: giorno !== null && eGiornoDelQuiz(a.quiz, giorno) };
}

/** Attività, lavori, libri e film; con partita, libri letti e film visti. Le righe nascoste non compaiono. */
/** Le attività (lavori compresi) che si svolgono in un luogo (`sede_chiave`), non nascoste, nell'ordine; con la partita la disponibilità (L5, pagina del luogo). */
export function attivitaDellaSede(sede: string, partitaId?: number): AttivitaDto[] {
  const st = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId);
  const sedi = sediAttivita();
  const catalogo = oggettiPerFonte('videogioco');
  return (prepared('SELECT * FROM attivita WHERE nascosto = 0 AND sede_chiave = ? ORDER BY ordine').all(sede) as RigaAttivita[]).map((r) => attivitaDto(r, sedi, st, catalogo));
}

export function attivitaTutte(partitaId?: number): AttivitaTutteDto {
  const stato = letturePartita(partitaId);
  const st = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId);
  const sedi = sediAttivita();
  const catalogoGiochi = oggettiPerFonte('videogioco');
  const attivita = (prepared('SELECT * FROM attivita WHERE nascosto = 0 ORDER BY ordine').all() as RigaAttivita[]).map((r) => attivitaDto(r, sedi, st, catalogoGiochi));
  const libri = elencoLibri(partitaId, stato, st);
  const posizioni = posizioniFilm();
  const catalogoFilm = oggettiPerFonte('film'); const negoziFilm = negoziPerFonte('film');
  const film = (prepared('SELECT * FROM film WHERE nascosto = 0 ORDER BY ordine').all() as RigaFilm[]).map((r) => filmDto(r, stato, posizioni, st, catalogoFilm, negoziFilm));
  return { attivita: attivita.filter((a) => a.tipo !== 'lavoro'), lavori: attivita.filter((a) => a.tipo === 'lavoro'), libri, film, libriLetti: libri.filter((l) => l.fatto).length, filmVisti: film.filter((f) => f.iniziato).length, noteCategorie: noteCategorieAttivita() };
}

/** Le note comuni a una categoria di attività (R9-14/1: la frase dei videogiochi sta qui una volta sola), per chiave di categoria. */
function noteCategorieAttivita(): Record<string, string> {
  // il blocco con le correzioni dell'utente sopra (R11-17/1: la frase si corregge e si ripristina dal registro dei ripristini)
  const v = datiGuidaCorretti<Record<string, unknown>>('note-categorie-attivita');
  if (v === null || typeof v !== 'object') return {};
  return Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string' && e[1].trim() !== ''));
}

/** Vero se la partita ha letto «Anima da cineasta» (Royal): i punti di film e DVD salgono di uno scalino. Vive con la conversione delle note
 *  (`puntiDoti.ts`); qui resta riesportata per chi la importava da questo modulo. */
export { haAnimaDaCineasta };

/** Le note che un conseguimento dà, Dote per Dote, dagli effetti dichiarati.
 *
 * `successiva` è vero dalla seconda volta in poi e riguarda i film al cinema e i turni delle attività
 * contate per volte: contano le voci `ripetuto`, e dove la guida non dichiara niente ripetere non dà niente. Una voce con condizioni
 * («piove») conta solo se la partita le soddisfa in quel momento. */
function noteDelConseguimento(riga: RigaLibro | RigaFilm | RigaAttivita, successiva: boolean, st: StatoDisponibilita): Array<{ dote: string; note: 1 | 2 | 3 }> {
  if ('confidente_chiave' in riga && riga.confidente_chiave != null) return [];
  if('pesca_regola_chiave'in riga&&riga.pesca_regola_chiave!=null)return [];
  const voci: VoceEffetto[] = leggiVociEffetto(riga.effetti_json);
  const nomi = nomiCondizioniMemo();
  return dotiDaEffetti(voci, { successiva })
    .filter((d) => d.condizioni.length === 0 || valutaRequisiti(d.condizioni.map((c) => condizioneConTesto(c, nomi)) as RequisitoDisponibilita[], st).stato === 'disponibile')
    .map((d) => ({ dote: d.dote, note: Math.min(3, Math.max(1, d.note)) as 1 | 2 | 3 }));
}

/** Registra le note di un conseguimento: **che cosa il gioco dà** (tre note lette in un libro valgono il quarto scalino:
 *  `puntiDaNote` lo sa già). Le Doti non si toccano — si segnano a mano (`aggiornaDote`, scelta dell'utente 2026-09-30) —:
 *  il registro dice che cosa ricordare e, al cinema, quale visione è la prima. */
/** Che cosa dà le note di una lettura: un libro (quarto scalino) o un film (con «Anima da cineasta» letto, uno scalino in più). */
const origineLettura = (partitaId: number, tipo: TipoLettura) => ({ libro: tipo === 'libro', cinema: tipo === 'film' && haAnimaDaCineasta(partitaId) });

function applicaEffettiLettura(partitaId: number, tipo: TipoLettura, chiave: string, riga: RigaLibro | RigaFilm | RigaAttivita, successiva: boolean, adesso: string, st: StatoDisponibilita): void {
  const doti = noteDelConseguimento(riga, successiva, st);
  if (doti.length === 0) return;
  const ordine = ((prepared('SELECT MAX(ordine) AS m FROM effetto_lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ?').get(partitaId, tipo, chiave) as { m: number | null }).m ?? 0) + 1;
  const origine = origineLettura(partitaId, tipo);
  for (const n of doti) {
    const punti = puntiDote(partitaId, n.dote, n.note, origine);
    prepared('INSERT INTO effetto_lettura_partita (partita_id, tipo, chiave, ordine, dote_chiave, punti, note, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(partitaId, tipo, chiave, ordine, n.dote, punti, n.note, adesso);
  }
}

/** Toglie dal registro l'**ultimo** conseguimento: al cinema la prima visione vale più delle altre. Le Doti restano come sono. */
function annullaUltimoEffettoLettura(partitaId: number, tipo: TipoLettura, chiave: string): void {
  const ultimo = prepared('SELECT ordine FROM effetto_lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ? ORDER BY ordine DESC LIMIT 1').get(partitaId, tipo, chiave) as { ordine: number } | undefined;
  if (!ultimo) return;
  prepared('DELETE FROM effetto_lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ? AND ordine = ?').run(partitaId, tipo, chiave, ultimo.ordine);
}

/** Toglie dal registro tutto quello che un elemento dava: si usa quando si disfa un completamento. Le Doti restano come sono. */
function annullaEffettiLettura(partitaId: number, tipo: TipoLettura, chiave: string): void {
  prepared('DELETE FROM effetto_lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ?').run(partitaId, tipo, chiave);
}

/** I punti che il registro dei conseguimenti attribuisce a un elemento, Dote per Dote. */
function puntiRegistrati(partitaId: number, tipo: string, chiave: string): Map<string, { punti: number; note: number }> {
  return new Map((prepared('SELECT dote_chiave, SUM(punti) AS punti, SUM(note) AS note FROM effetto_lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ? GROUP BY dote_chiave').all(partitaId, tipo, chiave) as Array<{ dote_chiave: string; punti: number; note: number | null }>)
    .map((r) => [r.dote_chiave, { punti: r.punti, note: r.note ?? 0 }]));
}

/** Che cosa cambia fra due letture del registro: le Doti da segnare a mano (in più o in meno), in punti. Le note si dicono accanto ai punti
 *  quando il cambio è di un solo conseguimento (da 1 a 3 note, nello stesso verso dei punti): «Perizia ♪♪♪ · 5 punti». */
function daSegnareFra(prima: Map<string, { punti: number; note: number }>, dopo: Map<string, { punti: number; note: number }>): DoteDaSegnareDto[] {
  const chiavi = [...new Set([...prima.keys(), ...dopo.keys()])];
  return chiavi.flatMap((c) => {
    const delta = (dopo.get(c)?.punti ?? 0) - (prima.get(c)?.punti ?? 0);
    if (delta === 0) return [];
    const note = (dopo.get(c)?.note ?? 0) - (prima.get(c)?.note ?? 0);
    const unaFonte = Math.sign(note) === Math.sign(delta) && Math.abs(note) >= 1 && Math.abs(note) <= 3;
    return [{ chiave: c, nome: nomeDote(c), delta, ...(unaFonte ? { note: Math.abs(note) } : {}) }];
  });
}

/**
 * Registra una lettura/visione. L'unico contatore è l'avanzamento; «letto» si calcola da lì (`lettureCompletate`): libri,
 * film e DVD risultano completi quando l'avanzamento raggiunge il rispettivo totale (la tabella `lettura_partita` non si scrive più
 * e nessuno la legge: resta com'era nei dati di prima). Una riga non ancora
 * disponibile nella partita non si può avanzare (409): la guida dice «non ancora», e segnare una
 * lettura che il gioco non permette falserebbe i progressi.
 */
export function impostaLettura(partitaId: number, tipo: TipoLettura, chiave: string, modifica: { fatto: boolean } | { avanzamento: number }): LibroDto | FilmDto | VideogiocoDto {
  verificaPartita(partitaId);
  const riga = (tipo === 'libro' ? prepared('SELECT * FROM libro WHERE chiave = ? AND nascosto = 0').get(chiave) : tipo === 'film' ? prepared('SELECT * FROM film WHERE chiave = ? AND nascosto = 0').get(chiave) : prepared("SELECT * FROM attivita WHERE chiave = ? AND tipo='videogioco' AND nascosto = 0").get(chiave)) as RigaLibro | RigaFilm | RigaAttivita | undefined;
  if (!riga) throw httpErrors.notFound('lettura-non-trovata', `${tipo === 'libro' ? 'Il libro' : tipo === 'film' ? 'Il film' : 'Il videogioco'} '${chiave}' non esiste.`);
  const catalogo = oggettiPerFonte(tipo);
  const nomeCorrente = catalogo.get(chiave)?.nome ?? riga.nome;
  const adesso = nowIso();
  const totale = tipo === 'libro' ? totaleLibro(riga as RigaLibro) : Math.max((riga as RigaFilm | RigaAttivita).sessioni ?? 1, 1);
  const richiesto = 'avanzamento' in modifica ? modifica.avanzamento : modifica.fatto ? totale : 0;
  const senzaMassimo = tipo === 'film' && (riga as RigaFilm).dove === 'cinema';
  if (!Number.isInteger(richiesto) || richiesto < 0 || (!senzaMassimo && richiesto > totale)) {
    throw httpErrors.badRequest('avanzamento-non-valido', senzaMassimo ? "L'avanzamento deve essere un intero non negativo." : `L'avanzamento deve essere un intero fra 0 e ${totale}.`);
  }
  const st = statoDisponibilitaPartita(partitaId);
  const precedente = avanzamentoLettura(partitaId, tipo, chiave).avanzamento;
  if (tipo === 'videogioco' && (riga as RigaAttivita).confidente_chiave && richiesto > precedente) throw httpErrors.conflict('attivita-fonte-confidente', 'Questa attività rimanda al Confidente: non si avanza per sessioni.');
  if(tipo==='videogioco'&&(riga as RigaAttivita).pesca_regola_chiave&&richiesto>precedente)throw httpErrors.conflict('attivita-fonte-pesca','Questa attività usa il registro della pesca; nessun avanzamento generico viene aggiunto.');
  const disponibilita = tipo === 'videogioco' ? disponibilitaAttivita(riga as RigaAttivita, st) : conDisponibilita(riga.condizioni_json, st);
  if (richiesto > precedente && disponibilita.disponibilita?.stato === 'bloccato') {
    throw httpErrors.conflict('lettura-non-disponibile', `'${nomeCorrente}' non è ancora disponibile nella partita: la condizione di sblocco non è soddisfatta.`);
  }
  const registroPrima = puntiRegistrati(partitaId, tipo, chiave);
  getDb().transaction(() => {
    // Quante visioni/sessioni c'erano **prima** di questa scrittura: al cinema serve a sapere
    // quante se ne aggiungono o se ne tolgono, perché ognuna è un conseguimento a sé.
    const confermatoPrima = tipo === 'film'
      ? ((prepared('SELECT avanzamento FROM progresso_film_partita WHERE partita_id = ? AND film_chiave = ?').get(partitaId, chiave) as { avanzamento: number } | undefined)?.avanzamento ?? 0)
      : 0;
    // «Era già completa» si calcola dall'avanzamento di prima, per tutti e tre i tipi (R10-20: una sola definizione)
    const avanzamentoPrima = tipo === 'libro'
      ? ((prepared('SELECT avanzamento FROM progresso_libro_partita WHERE partita_id = ? AND libro_chiave = ?').get(partitaId, chiave) as { avanzamento: number } | undefined)?.avanzamento ?? 0)
      : tipo === 'film' ? confermatoPrima
        : ((prepared('SELECT avanzamento FROM progresso_videogioco_partita WHERE partita_id = ? AND videogioco_chiave = ?').get(partitaId, chiave) as { avanzamento: number } | undefined)?.avanzamento ?? 0);
    const era = avanzamentoCompleto(avanzamentoPrima, totale);
    if (tipo === 'libro') {
      if (richiesto > 0) prepared('INSERT INTO progresso_libro_partita (partita_id, libro_chiave, avanzamento, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, libro_chiave) DO UPDATE SET avanzamento = excluded.avanzamento, updated_at = excluded.updated_at').run(partitaId, chiave, richiesto, adesso);
      else prepared('DELETE FROM progresso_libro_partita WHERE partita_id = ? AND libro_chiave = ?').run(partitaId, chiave);
    } else if (tipo === 'film' && richiesto > 0) {
      prepared('INSERT INTO progresso_film_partita (partita_id, film_chiave, avanzamento, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, film_chiave) DO UPDATE SET avanzamento = excluded.avanzamento, updated_at = excluded.updated_at').run(partitaId, chiave, richiesto, adesso);
    } else if (tipo === 'film') {
      prepared('DELETE FROM progresso_film_partita WHERE partita_id = ? AND film_chiave = ?').run(partitaId, chiave);
    } else if (richiesto > 0) {
      prepared('INSERT INTO progresso_videogioco_partita (partita_id, videogioco_chiave, avanzamento, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, videogioco_chiave) DO UPDATE SET avanzamento = excluded.avanzamento, updated_at = excluded.updated_at').run(partitaId, chiave, richiesto, adesso);
    } else {
      prepared('DELETE FROM progresso_videogioco_partita WHERE partita_id = ? AND videogioco_chiave = ?').run(partitaId, chiave);
    }
    const registrato = richiesto >= totale;
    if (registrato && !era) {
      const doti = noteDelConseguimento(riga, false, st);
      // le note e i punti che il conseguimento registra subito sotto (`applicaEffettiLettura`, stessa regola e stessa origine)
      const origine = origineLettura(partitaId, tipo);
      const dote = doti.length ? ` · Dote: ${doti.map((d) => testoDoteInPunti({ nome: nomeDote(d.dote), note: d.note, delta: puntiDote(partitaId, d.dote, d.note, origine) })).join(', ')}` : '';
      const titolo = nomeCorrente;
      const etichetta = tipo === 'libro' ? 'Libro letto' : tipo === 'film' ? 'Film visto' : 'Videogioco completato';
      const dove = tipo === 'libro' ? (riga as RigaLibro).dove : tipo === 'film' ? ((riga as RigaFilm).dove === 'cinema' ? 'Cinema' : 'DVD') : (riga as RigaAttivita).luogo;
      registraEvento(partitaId, 'lettura', `${etichetta}: ${titolo}`, `${dove}${dote}.`, { tipo, chiave });
    }
    // ---- Il conseguimento dà le sue Doti: un libro finito, un film visto, un gioco completato ----
    // Si registrano (da segnare a mano nelle Doti, che qui non si toccano). Un film al cinema si
    // rivede, e ogni visione conta: la prima con le sue note, quelle dopo con le voci «ripetuto».
    // Libri, DVD e videogiochi si conseguono una volta sola.
    if (tipo !== 'film' || (riga as RigaFilm).dove !== 'cinema') {
      if (registrato && !era) applicaEffettiLettura(partitaId, tipo, chiave, riga, false, adesso, st);
      else if (!registrato && era) annullaEffettiLettura(partitaId, tipo, chiave);
    } else {
      // Al cinema il progresso non ha tetto: conta quante visioni si aggiungono o si tolgono.
      const prima = confermatoPrima;
      for (let i = prima; i < richiesto; i++) applicaEffettiLettura(partitaId, tipo, chiave, riga, i > 0, adesso, st);
      for (let i = prima; i > richiesto; i--) annullaUltimoEffettoLettura(partitaId, tipo, chiave);
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  const stato = letturePartita(partitaId);
  // che cosa il conseguimento dà (o, disfatto, dava): da segnare a mano nelle Doti
  const daSegnare = daSegnareFra(registroPrima, puntiRegistrati(partitaId, tipo, chiave));
  const statoDopo = statoDisponibilitaPartita(partitaId);
  const dto = tipo === 'libro' ? libroDto(riga as RigaLibro, stato, posizioniLibri(), articoliCollegati('libri'), statoDopo, postiApertiDaiLibri(), catalogo) : tipo === 'film' ? filmDto(riga as RigaFilm, stato, posizioniFilm(), statoDopo, catalogo, negoziPerFonte('film')) : videogiocoDto(riga as RigaAttivita, stato, sediAttivita(), articoliCollegati('videogiochi'), statoDopo, catalogo);
  return daSegnare.length ? { ...dto, daSegnare } : dto;
}

/** Dove è arrivata una lettura nella partita: sessioni lette, visioni o serate, sessioni di gioco; il totale (null al cinema, che non ne ha) e il nome. */
export function avanzamentoLettura(partitaId: number, tipo: TipoLettura, chiave: string): { avanzamento: number; totale: number | null; nome: string } {
  const riga = (tipo === 'libro' ? prepared('SELECT * FROM libro WHERE chiave = ? AND nascosto = 0').get(chiave) : tipo === 'film' ? prepared('SELECT * FROM film WHERE chiave = ? AND nascosto = 0').get(chiave) : prepared("SELECT * FROM attivita WHERE chiave = ? AND tipo='videogioco' AND nascosto = 0").get(chiave)) as RigaLibro | RigaFilm | RigaAttivita | undefined;
  if (!riga) throw httpErrors.notFound('lettura-non-trovata', `${tipo === 'libro' ? 'Il libro' : tipo === 'film' ? 'Il film' : 'Il videogioco'} '${chiave}' non esiste.`);
  const nome = oggettiPerFonte(tipo).get(chiave)?.nome ?? riga.nome;
  if (tipo === 'libro') {
    const totale = totaleLibro(riga as RigaLibro);
    const r = prepared('SELECT avanzamento FROM progresso_libro_partita WHERE partita_id = ? AND libro_chiave = ?').get(partitaId, chiave) as { avanzamento: number } | undefined;
    return { avanzamento: r?.avanzamento ?? 0, totale, nome };
  }
  if (tipo === 'film') {
    const r = prepared('SELECT avanzamento FROM progresso_film_partita WHERE partita_id = ? AND film_chiave = ?').get(partitaId, chiave) as { avanzamento: number } | undefined;
    return { avanzamento: r?.avanzamento ?? 0, totale: (riga as RigaFilm).dove === 'cinema' ? null : Math.max((riga as RigaFilm).sessioni ?? 1, 1), nome };
  }
  const r = prepared('SELECT avanzamento FROM progresso_videogioco_partita WHERE partita_id = ? AND videogioco_chiave = ?').get(partitaId, chiave) as { avanzamento: number } | undefined;
  return { avanzamento: r?.avanzamento ?? 0, totale: Math.max((riga as RigaAttivita).sessioni ?? 1, 1), nome };
}

// ---- Turni delle attività contate per volte (i lavori) ----
//
// Un turno registrato dice le Doti che l'attività dichiara (il primo le voci senza `ripetuto`, gli
// altri quelle «dalla seconda volta in poi», e non le prime), oppure quelle che il turno dichiara da sé (il secondo
// turno al Beef Bowl Shop): il gioco le dà, l'utente le segna a mano (le Doti qui non si toccano). Ogni turno
// registrato ha la sua riga in `turno_partita` (`ordine`), e ciò che dà sta in `effetto_lettura_partita`
// (tipo «attivita», stesso `ordine`), per toglierlo identico e dire quanto: dalla spunta della giornata o dal
// contatore, il turno si conta da una parte sola.

/** L'attività contata per volte (`tracciamento = 'svolta'`), o un errore che dice perché no. */
function attivitaConTurni(chiave: string, soloRiduzione = false, pescaAutorizzata = false): RigaAttivita {
  const riga = prepared('SELECT * FROM attivita WHERE chiave = ?').get(chiave) as RigaAttivita | undefined;
  if (!riga) throw httpErrors.notFound('attivita-non-trovata', `L'attività '${chiave}' non esiste.`);
  if(riga.pesca_regola_chiave){
    if(soloRiduzione || pescaAutorizzata && riga.pesca_ruolo==='visita')return riga;
    throw httpErrors.conflict('attivita-fonte-pesca','Questa attività usa il registro della pesca: registra la visita con il gesto dedicato, senza un secondo turno generico.');
  }
  if (riga.confidente_chiave) {
    if (soloRiduzione) return riga;
    throw httpErrors.conflict('attivita-fonte-confidente', 'Questa attività rimanda al Confidente: registra l’incontro nella sua scheda, senza aggiungere un turno generico.');
  }
  // come la scheda dell'attività: un valore fuori catalogo vale quello del tipo
  const tracciamento = eTracciamentoAttivita(riga.tracciamento) ? riga.tracciamento : tracciamentoPerTipo(riga.tipo);
  if (tracciamento !== 'svolta') throw httpErrors.badRequest('attivita-non-conteggiabile', `«${riga.nome}» non si conta per volte svolte: non ha turni da registrare.`);
  return riga;
}

/** Le volte che l'attività risulta svolta nella partita (zero se non c'è riga). */
function volteSvolte(partitaId: number, chiave: string): number {
  return (prepared('SELECT volte FROM attivita_svolta_partita WHERE partita_id = ? AND attivita_chiave = ?').get(partitaId, chiave) as { volte: number } | undefined)?.volte ?? 0;
}

/** Scrive (inserendo o aggiornando) il conto delle volte svolte di un'attività nella partita. */
function scriviVolte(partitaId: number, chiave: string, volte: number, adesso: string): void {
  prepared('INSERT INTO attivita_svolta_partita (partita_id, attivita_chiave, volte, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, attivita_chiave) DO UPDATE SET volte = excluded.volte, updated_at = excluded.updated_at').run(partitaId, chiave, volte, adesso);
}

export interface TurnoRegistrato {
  attivita: string;
  nome: string;
  ordine: number;
  doti: Array<{ chiave: string; nome: string; delta: number; note: number }>;
  /** R9-12/2: la paga canonica dell'attività (`paga_yen` / `paga_massima`), letta e riportata. L13 (decisione 18): la paga base entra da sola nel
   *  saldo quando il turno si registra (`yenDelTurno`, `utente.yen_automatico`), e si toglie togliendo il turno. Null se non ne ha. */
  paga: { yen: number; massima: number | null } | null;
  /** L13: l'esito ottenuto (null = «senza punti»), per le attività che dichiarano esiti; assente per le altre. */
  esito?: { chiave: string; nome: string; automatico?: boolean } | null;
  /** 2026-10-27: le creazioni della voce (solo se più di una) e gli oggetti dati e consumati dal turno, per dire alla spunta che cosa ha applicato. */
  quantita?: number;
  oggetti?: Array<{ nome: string; quantita: number }>;
  consumati?: Array<{ nome: string; quantita: number }>;
}

/**
 * Registra un turno in più e ne applica le Doti (`doti` del turno, se dichiarate, al posto di quelle dell'attività). `st` è lo
 * stato della partita già calcolato da chi registra più turni di fila (P5'): il turno ne aggiorna il conto delle volte, l'unica
 * parte dello stato che un turno cambia, così ogni turno vede quel che vedrebbe ricalcolandolo.
 */
export function registraTurno(partitaId: number, chiave: string, doti?: Array<{ dote: string; note: 1 | 2 | 3 }>, st?: StatoDisponibilita, interno?:{pescaAutorizzata:true}, esito?: TurnoRegistrato['esito'],
  /** Ondata 5 (lotto E): la fascia in cui si svolge il turno (quella della voce del Diario che lo registra); senza, quella corrente della partita. */
  fascia?: FasciaPrezzo | null,
  /** Revisione della chiusura dell'ondata 5 (N1): la voce del Diario che lo registra, per lo sconto del negozio del suo momento (`scontoAllaVoce`). */
  voceUid?: string | null,
  /** 2026-10-27: le creazioni dello strumento dichiarate dalla voce (l'effetto `turno`): moltiplicano gli oggetti dati e consumati dall'esito. */
  quantita?: number): TurnoRegistrato {
  const riga = attivitaConTurni(chiave,false,interno?.pescaAutorizzata===true);
  const adesso = nowIso();
  return getDb().transaction(() => {
    const prima = volteSvolte(partitaId, chiave);
    // dopo i turni già contati (anche quelli segnati prima del registro, che non hanno riga) e dopo l'ultimo registrato
    const ultimo = (prepared('SELECT MAX(ordine) AS m FROM turno_partita WHERE partita_id = ? AND attivita_chiave = ?').get(partitaId, chiave) as { m: number | null }).m ?? 0;
    const ordine = Math.max(ultimo, prima) + 1;
    scriviVolte(partitaId, chiave, prima + 1, adesso);
    prepared('INSERT INTO turno_partita (partita_id, attivita_chiave, ordine, created_at) VALUES (?, ?, ?, ?)').run(partitaId, chiave, ordine, adesso);
    // che cosa dà il turno: si registra e si ricorda, le Doti si segnano a mano (`aggiornaDote`)
    // lo stato si legge dopo aver scritto le volte, come quando si ricalcolava qui: quello passato si aggiorna allo stesso punto
    st?.attivitaSvolte.set(chiave, prima + 1);
    const daApplicare = doti ?? noteDelConseguimento(riga, ordine > 1, st ?? statoDisponibilitaPartita(partitaId));
    const applicate: TurnoRegistrato['doti'] = [];
    for (const d of daApplicare) {
      const punti = puntiDote(partitaId, d.dote, d.note);
      prepared("INSERT INTO effetto_lettura_partita (partita_id, tipo, chiave, ordine, dote_chiave, punti, note, updated_at) VALUES (?, 'attivita', ?, ?, ?, ?, ?, ?)")
        .run(partitaId, chiave, ordine, d.dote, punti, d.note, adesso);
      applicate.push({ chiave: d.dote, nome: nomeDote(d.dote), delta: punti, note: d.note });
    }
    // Ondata 5 (lotto G): il trofeo che l'esito scelto fa ottenere (la lotteria vinta → «Soldi facili») si segna da solo, con il suo «prima»
    if (esito) segnaTrofeoDelTurno(partitaId, chiave, ordine, esito.chiave);
    // e gli oggetti del catalogo che l'esito dà (la Comet Burger vinta → «Distintivo numero due» e 3 «Big Bang Burger») entrano fra gli ottenuti;
    // senza esito toglie soltanto le righe rimaste da un turno con lo stesso numero
    // 2026-10-27: con la quantità della voce (le creazioni) e la versione con il bonus scelta alla spunta (`oggettiDelTurno`)
    const oggetti = segnaOggettiDelTurno(partitaId, chiave, ordine, esito?.chiave, quantita);
    // Ondata 5 (lotto F-bis): e gli oggetti che l'esito consuma (il concime della pianta, i materiali della fabbricazione) escono dalle copie
    const consumati = segnaConsumiDelTurno(partitaId, chiave, ordine, esito?.chiave, quantita);
    // L13 (decisione 18): gli yen del turno si muovono da soli (la paga del lavoro entra; il costo dell'attività o il prezzo della sfida
    // dell'esito si scalano, mai sotto zero). I turni della pesca no: la loro quota la porta la visita. Un movimento rimasto aperto con lo
    // stesso turno (un turno tolto per un'altra strada) si chiude prima, così ogni turno ha il suo
    if (!interno?.pescaAutorizzata) {
      const y = yenDelTurno(riga, esito ?? undefined, fascia ?? fasciaDellaPartita(partitaId), partitaId, voceUid), causa = { tipo: 'turno' as const, chiave: `${chiave}:${ordine}` };
      restituisciYenAutomatico(partitaId, causa, 'turno-non-piu-presente');
      if (y) muoviYenAutomatico(partitaId, causa, y.importo, y.motivo);
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    return { attivita: chiave, nome: riga.nome, ordine, doti: applicate, paga: riga.paga_yen != null ? { yen: riga.paga_yen, massima: riga.paga_massima ?? null } : null, ...(esito !== undefined ? { esito } : {}),
      ...(esito && quantita && quantita > 1 ? { quantita } : {}), ...(oggetti.length ? { oggetti } : {}), ...(consumati.length ? { consumati } : {}) };
  })();
}

/**
 * L13 (decisione 18): gli yen di un turno, fotografati quando si registra. La paga base del lavoro (`paga_yen`) entra; altrimenti si scala il
 * prezzo dell'articolo dell'esito scelto (la sfida della Big Bang Burger: il prezzo vive solo nell'articolo) o, senza, il costo dell'attività
 * (`costo`: freccette, palestra…). Un esito «senza punti» di un'attività con sfide a prezzi diversi non dice quale sfida si è pagata: niente.
 * `articolo`: l'articolo della sfida che il turno paga, perché lo stesso acquisto non si conti due volte (`articoloPagatoDalTurno`).
 */
function yenDelTurno(riga: Pick<RigaAttivita, 'chiave' | 'nome' | 'paga_yen' | 'costo'>, esito?: { chiave: string; nome: string }, fascia?: FasciaPrezzo | null, partitaId?: number | null, voceUid?: string | null): { importo: number; motivo: string; articolo?: string } | null {
  if (riga.paga_yen != null && riga.paga_yen > 0) return { importo: riga.paga_yen, motivo: `Paga del turno: ${riga.nome}` };
  const dichiarati = esitiDellAttivita(riga.chiave)?.esiti;
  const articolo = esito ? dichiarati?.esiti.find((e) => e.chiave === esito.chiave)?.articolo ?? null : null;
  if (articolo) {
    // Ondata 5 (lotto E, decisione 5): il prezzo della fascia in cui si svolge il turno (la sera le sfide costano 500 ¥); con la partita anche
    // lo sconto del negozio legato al rango di un Confidente (chiusura dell'ondata 5), come la spunta della voce: con la voce che registra il
    // turno, quello del suo momento (`scontoAllaVoce`)
    const prezzo = prezzoDellArticolo(articolo, fascia, partitaId, voceUid);
    return prezzo != null && prezzo > 0 ? { importo: -prezzo, motivo: `${riga.nome}: ${esito!.nome}`, articolo } : null;
  }
  if (dichiarati && !esito && dichiarati.esiti.some((e) => e.articolo)) return null;
  return riga.costo != null && riga.costo > 0 ? { importo: -riga.costo, motivo: `Costo dell'attività: ${riga.nome}` } : null;
}
/**
 * L13 (decisione 18, doppio conteggio): l'articolo che il turno dell'attività con l'esito scelto paga da solo (la sfida della Big Bang Burger),
 * con la stessa regola di `yenDelTurno`; null se il turno non paga un articolo (paga del lavoro, costo dell'attività, nessun prezzo).
 */
export function articoloPagatoDalTurno(attivita: string, esito: string): string | null {
  const riga = prepared('SELECT chiave, nome, paga_yen, costo FROM main.attivita WHERE chiave = ?').get(attivita) as Pick<RigaAttivita, 'chiave' | 'nome' | 'paga_yen' | 'costo'> | undefined;
  return riga ? yenDelTurno(riga, { chiave: esito, nome: '' })?.articolo ?? null : null;
}
/**
 * L13 (decisione 19): gli yen della sfida di un turno già registrato (l'esito con il suo nome), con la stessa regola di `yenDelTurno`. Per la
 * voce già spuntata il cui articolo, che pagava la sfida al posto del turno, viene tolto o cambiato nella guida: allora la sfida la paga il turno,
 * come farebbe la spunta (`motoreDiario.riallineaStatiDellaVoce`). Null se il turno non paga un articolo.
 */
export function yenDellaSfidaDelTurno(attivita: string, esito: { chiave: string; nome: string }, fascia?: FasciaPrezzo | null, partitaId?: number | null, voceUid?: string | null): { importo: number; motivo: string; articolo: string } | null {
  const riga = prepared('SELECT chiave, nome, paga_yen, costo FROM main.attivita WHERE chiave = ?').get(attivita) as Pick<RigaAttivita, 'chiave' | 'nome' | 'paga_yen' | 'costo'> | undefined;
  const y = riga ? yenDelTurno(riga, esito, fascia, partitaId, voceUid) : null;
  return y?.articolo ? { importo: y.importo, motivo: y.motivo, articolo: y.articolo } : null;
}

/** Toglie un turno con i punti che aveva dato: quello di `ordine` (la spunta che lo aveva registrato), solo se c'è
 *  ancora — il contatore può averlo già tolto, e `volte` non deve scendere due volte —, oppure l'ultimo (il contatore):
 *  l'ultimo registrato, o uno di quelli contati prima del registro, che non hanno punti da restituire. */
export function togliTurno(partitaId: number, chiave: string, ordine?: number, interno?:{pescaAutorizzata:true}): void {
  if(!interno?.pescaAutorizzata)attivitaConTurni(chiave, true);
  const adesso = nowIso();
  getDb().transaction(() => {
    const prima = volteSvolte(partitaId, chiave);
    const bersaglio = ordine !== undefined
      ? (prepared('SELECT ordine FROM turno_partita WHERE partita_id = ? AND attivita_chiave = ? AND ordine = ?').get(partitaId, chiave, ordine) as { ordine: number } | undefined)?.ordine ?? null
      : (prepared('SELECT MAX(ordine) AS m FROM turno_partita WHERE partita_id = ? AND attivita_chiave = ?').get(partitaId, chiave) as { m: number | null }).m;
    if (ordine !== undefined && bersaglio === null) return;
    if (bersaglio !== null) {
      const collegata=prepared('SELECT s.* FROM utente.pesca_sessione s JOIN utente.turno_partita t ON t.uid=s.turno_uid WHERE t.partita_id=? AND t.attivita_chiave=? AND t.ordine=?').get(partitaId,chiave,bersaglio) as {id:string;origine_turno:string}|undefined;
      if(collegata&&collegata.origine_turno==='creato'&&!interno?.pescaAutorizzata)throw httpErrors.conflict('pesca-turno-posseduto','Il turno è posseduto dal registro della pesca: rimuovi la fonte o la sessione con la relativa anteprima.');
      if(collegata)prepared('UPDATE utente.pesca_sessione SET turno_revocato_il=? WHERE partita_id=? AND id=?').run(adesso,partitaId,collegata.id);
      // il turno esce dal registro; le Doti restano come sono (si segnano a mano). L13 (decisione 18): gli yen che il turno aveva mosso da
      // soli tornano (la spesa restituita com'era stata scalata, la paga tolta al più fino a zero). Un turno registrato prima degli yen automatici
      // non ha movimento (il saldo di allora lo contava già) e non restituisce niente. Non si segna: il + del contatore è sempre un turno nuovo,
      // nato adesso, e muove i suoi yen; il turno di una voce di prima rispuntata lo scarta la spunta (`motoreDiario.applicaEffettiVoce`)
      restituisciYenAutomatico(partitaId, { tipo: 'turno', chiave: `${chiave}:${bersaglio}` }, 'turno-tolto');
      // Ondata 5 (lotto G): il trofeo che il turno aveva segnato con il suo esito torna com'era (resta se c'era già o se un altro lo rivendica)
      togliTrofeoDelTurno(partitaId, chiave, bersaglio);
      // e gli oggetti che l'esito del turno aveva dato se ne vanno
      togliOggettiDelTurno(partitaId, chiave, bersaglio);
      // e le copie che aveva consumato tornano (Ondata 5, lotto F-bis)
      togliConsumiDelTurno(partitaId, chiave, bersaglio);
      prepared("DELETE FROM effetto_lettura_partita WHERE partita_id = ? AND tipo = 'attivita' AND chiave = ? AND ordine = ?").run(partitaId, chiave, bersaglio);
      prepared('DELETE FROM turno_partita WHERE partita_id = ? AND attivita_chiave = ? AND ordine = ?').run(partitaId, chiave, bersaglio);
    }
    // un turno contato prima del registro dei turni (nessuna riga, ben prima degli yen automatici) non ha movimento: il − non restituisce niente
    if (prima > 0) scriviVolte(partitaId, chiave, prima - 1, adesso);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
}

/** Il contatore dell'attività: porta le volte a `volte` registrando o togliendo turni. Dice che cosa danno i turni
 *  aggiunti (o davano quelli tolti), da segnare a mano nelle Doti.
 *  L13: un'attività che dichiara esiti aggiunge un turno alla volta, con l'esito scelto (`esito`: la chiave, null = «senza punti»;
 *  nel modo automatico si ricava dal giorno della partita): senza scelta il + si ferma (409) e non registra un turno vuoto. */
export function impostaVolteAttivita(partitaId: number, chiave: string, volte: number, esito?: string | null): DoteDaSegnareDto[] {
  const prima = puntiRegistrati(partitaId, 'attivita', chiave);
  getDb().transaction(() => {
    // lo stato della partita si calcola una volta per tutti i turni da aggiungere, non una per turno (P5')
    const da = volteSvolte(partitaId, chiave);
    attivitaConTurni(chiave, volte <= da);
    const st = da < volte ? statoDisponibilitaPartita(partitaId) : undefined;
    const esiti = da < volte ? esitiDellAttivita(chiave)?.esiti ?? null : null;
    if (esiti) {
      if (volte - da !== 1) throw httpErrors.badRequest('esito-un-turno-alla-volta', 'Questa attività dichiara i suoi esiti: aggiungi un turno alla volta, scegliendo l’esito.');
      const r = risolviEsitoTurno(chiave, esiti, esito, st!);
      registraTurno(partitaId, chiave, r.doti, st, undefined, r.esito);
      return;
    }
    if (esito !== undefined && da < volte) throw httpErrors.badRequest('esito-non-dichiarato', 'Questa attività non dichiara esiti da scegliere.');
    for (let v = da; v < volte; v++) registraTurno(partitaId, chiave, undefined, st);
    for (let v = volteSvolte(partitaId, chiave); v > volte; v--) togliTurno(partitaId, chiave);
  })();
  return daSegnareFra(prima, puntiRegistrati(partitaId, 'attivita', chiave));
}

/** Che cosa dà un turno dell'attività, in parole: le voci del primo turno e quelle dal secondo in poi. */
export function effettiDelTurno(riga: { effetti_json: string | null }): string[] {
  const nomi = nomiCondizioniMemo();
  return leggiVociEffetto(riga.effetti_json).filter((v) => v.effetto.famiglia === 'dote').map((v) => `${v.ripetuto ? 'Dal 2° turno' : '1° turno'}: ${descriviVoceEffetto({ ...v, ripetuto: undefined }, { condizioni: nomi })}`);
}
