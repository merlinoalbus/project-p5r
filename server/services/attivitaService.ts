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
import { registraEvento } from './storicoService.js';
import type { AttivitaDto, AttivitaTutteDto, CondizioneSpilloDto, DisponibilitaDto, DoteDaSegnareDto, FilmDto, FilmDvdDto, LibroDto, LibriDto, TipoLettura, VideogiocoDto, VideogiochiDto, VoceEffettoDto } from '../../shared/types.js';
import { statoDisponibilitaPartita, valutaRequisiti, type RequisitoDisponibilita, type StatoDisponibilita } from './disponibilitaService.js';
import { nomeDote, puntiDaNote } from './partiteService.js';
import { descriviRequisitoSpillo, normalizzaCondizioniSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { descriviVoceEffetto, dotiDaEffetti, leggiVociEffetto, type VoceEffetto } from '../../shared/effettiCatalogo.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { eTracciamentoAttivita, tracciamentoPerTipo } from '../../shared/attivita.js';

interface RigaAttivita { chiave: string; ordine: number; nome: string; tipo: string; luogo: string; luogo_chiave: string | null; sede_chiave: string | null; fascia: string | null; costo: number | null; sblocco: string | null; sessioni: number | null; doti_json: string; altri_effetti: string | null; regole: string; premi: string | null; paga: string | null; paga_yen: number | null; paga_massima: number | null; dettagli: string | null; effetti_json: string | null; tracciamento: string; fonte: string; verificato: number; condizioni_json: string | null }
interface RigaLibro { effetto_json?: string | null; effetti_json: string | null; chiave: string; ordine: number; nome: string; nome_it: string | null; dove: string; prezzo: number | null; disponibile_dal: string | null; dote: string | null; note: number | null; sblocca: string | null; sessioni: number | null; dettagli: string | null; fonte: string; verificato: number; condizioni_json: string | null }
interface RigaFilm { effetti_json: string | null; chiave: string; ordine: number; nome: string; nome_it: string | null; dove: 'cinema' | 'dvd'; periodo: string; dote: string | null; note: number | null; note_successive: number | null; prezzo: number | null; sessioni: number; dettagli: string | null; fonte: string; verificato: number; condizioni_json: string | null }

/** La disponibilità di una riga, dalle condizioni strutturate. La condizione non nasconde niente:
 *  dice «non ancora», che in una guida è un'informazione, non un ostacolo. */
function conDisponibilita(condizioniJson: string | null, st: StatoDisponibilita | null): { condizioni: CondizioneSpilloDto[] | null; disponibilita: DisponibilitaDto | null } {
  let grezze: RequisitoSpillo[];
  try { grezze = normalizzaCondizioniSpillo(condizioniJson ? (JSON.parse(condizioniJson) as unknown) : []); } catch { grezze = []; }
  if (grezze.length === 0) return { condizioni: null, disponibilita: null };
  const nomi = nomiCondizioniMemo();
  const condizioni = grezze.map((c) => ({ ...c, testo: descriviRequisitoSpillo(c, nomi) }));
  return { condizioni, disponibilita: st ? valutaRequisiti(condizioni as RequisitoDisponibilita[], st) : null };
}

/** Gli effetti dichiarati con la loro frase, i nomi di quartieri e attività risolti dal database. */
function effettiDto(json: string | null): { effetti: VoceEffettoDto[]; effettiTesto: string[] } {
  const voci = leggiVociEffetto(json);
  const nomi = nomiCondizioniMemo();
  const effetti = voci.map((v) => ({ ...v, testo: descriviVoceEffetto(v, { luoghi: nomi.quartieri, attivita: nomi.attivita, condizioni: nomi }) }));
  return { effetti, effettiTesto: effetti.map((e) => e.testo) };
}

interface RigaPosizioneLibro { libro_chiave: string; tipo: LibroDto['posizioni'][number]['tipo']; chiave: string; etichetta: string }
interface RigaPosizioneFilm { film_chiave: string; tipo: FilmDto['posizioni'][number]['tipo']; chiave: string; etichetta: string; ruolo: FilmDto['posizioni'][number]['ruolo'] }

/** Nome di ogni luogo della città, per la sede delle attività. */
function nomiLuoghi(): Map<string, string> {
  return new Map((prepared('SELECT chiave, nome FROM luogo').all() as Array<{ chiave: string; nome: string }>).map((l) => [l.chiave, l.nome]));
}

/** Gli articoli collegati a libri e videogiochi (migrazione 073): dove si compra ciascuno. */
function articoliCollegati(fonte: 'libri' | 'videogiochi'): Map<string, LibroDto['negozi']> {
  const out = new Map<string, LibroDto['negozi']>();
  for (const a of prepared('SELECT a.chiave, a.oggetto_chiave, a.prezzo, n.chiave AS negozio, n.nome AS negozio_nome FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave WHERE a.oggetto_fonte = ? AND a.nascosto = 0 AND n.nascosto = 0 ORDER BY n.ordine, a.ordine').all(fonte) as Array<{ chiave: string; oggetto_chiave: string; prezzo: number | null; negozio: string; negozio_nome: string }>) {
    const elenco = out.get(a.oggetto_chiave) ?? [];
    elenco.push({ articolo: a.chiave, negozio: a.negozio, negozioNome: a.negozio_nome, prezzo: a.prezzo });
    out.set(a.oggetto_chiave, elenco);
  }
  return out;
}

const attivitaDto = (r: RigaAttivita, sedi: Map<string, string>, st: StatoDisponibilita | null = null): AttivitaDto => ({
  chiave: r.chiave, nome: r.nome, tipo: r.tipo as AttivitaDto['tipo'], luogo: r.luogo, luogoChiave: r.luogo_chiave, fascia: r.fascia as AttivitaDto['fascia'], costo: r.costo, sblocco: r.sblocco, sessioni: r.sessioni,
  doti: JSON.parse(r.doti_json) as AttivitaDto['doti'], altriEffetti: r.altri_effetti, regole: r.regole, premi: r.premi, paga: r.paga,
  pagaYen: r.paga_yen, pagaMassima: r.paga_massima, dettagli: r.dettagli, ...effettiDto(r.effetti_json),
  tracciamento: eTracciamentoAttivita(r.tracciamento) ? r.tracciamento : tracciamentoPerTipo(r.tipo),
  sedeChiave: r.sede_chiave, sedeNome: r.sede_chiave ? (sedi.get(r.sede_chiave) ?? null) : null,
  verificato: r.verificato === 1,
  ...conDisponibilita(r.condizioni_json, st),
});
interface StatoLetture { fatti: Set<string>; progressiLibri: Map<string, number>; progressiFilm: Map<string, number>; progressiVideogiochi: Map<string, number> }
/** Il libro che cambia le regole di tutti gli altri, **da lì in avanti**: «Lettura rapida» raddoppia
 *  quanto rende un pomeriggio, non è retroattivo (le sessioni già lette restano quelle). */
const CHIAVE_LETTURA_RAPIDA = 'lettura-rapida';
const haLetturaRapida = (stato: StatoLetture) => stato.fatti.has(`libro/${CHIAVE_LETTURA_RAPIDA}`);
const totaleLibro = (r: RigaLibro) => Math.max(r.sessioni ?? 1, 1);

/** Il quartiere che un libro apre, letto dagli effetti dichiarati (voce «sblocca-luogo»); il nome lo risolve il server. */
function luogoSbloccato(effettiJson: string | null, effettoJson: string | null | undefined): { sbloccaLuogo: string | null; sbloccaLuogoNome: string | null } {
  let luogo: string | null = null;
  for (const v of leggiVociEffetto(effettiJson)) if (v.effetto.famiglia === 'sblocca-luogo') { luogo = v.effetto.luogo; break; }
  if (!luogo && effettoJson) {
    try { const e = JSON.parse(effettoJson) as { famiglia?: string; luogo?: string }; if (e.famiglia === 'sblocca-luogo' && e.luogo) luogo = e.luogo; } catch { /* dichiarazione illeggibile: nessun luogo */ }
  }
  if (!luogo) return { sbloccaLuogo: null, sbloccaLuogoNome: null };
  const q = prepared('SELECT nome FROM quartiere WHERE chiave = ?').get(luogo) as { nome: string } | undefined;
  return { sbloccaLuogo: luogo, sbloccaLuogoNome: q?.nome ?? null };
}
const libroDto = (r: RigaLibro, stato: StatoLetture, posizioni: Map<string, LibroDto['posizioni']>, negozi: Map<string, LibroDto['negozi']>, st: StatoDisponibilita | null = null): LibroDto => {
  const totaleSessioni = totaleLibro(r);
  const grezzo = stato.progressiLibri.get(r.chiave) ?? 0;
  // «Finito» resta un fatto registrato, non dedotto dal conteggio: se una correzione dei dati
  // abbassa le sessioni, il libro non diventa letto da solo. L'unica soglia che vale da sola è
  // «Lettura rapida», che è un fatto della partita, riallineato esplicitamente in `impostaLettura`.
  const fatto = stato.fatti.has(`libro/${r.chiave}`);
  return {
    chiave: r.chiave, nome: r.nome, nomeIt: r.nome_it, dove: r.dove, prezzo: r.prezzo, disponibileDal: r.disponibile_dal, dote: r.dote as LibroDto['dote'], note: r.note, sblocca: r.sblocca, ...luogoSbloccato(r.effetti_json, r.effetto_json), sessioni: r.sessioni, dettagli: r.dettagli,
    ...effettiDto(r.effetti_json), negozi: negozi.get(r.chiave) ?? [],
    verificato: r.verificato === 1,
    posizioni: posizioni.get(r.chiave) ?? [], totaleSessioni, progresso: fatto ? totaleSessioni : Math.min(Math.max(grezzo, 0), totaleSessioni), fatto,
    ...conDisponibilita(r.condizioni_json, st),
  };
};
const filmDto = (r: RigaFilm, stato: StatoLetture, posizioni: Map<string, FilmDto['posizioni']>, st: StatoDisponibilita | null = null): FilmDto => {
  const totaleSessioni = Math.max(r.sessioni, 1);
  const grezzo = Math.max(stato.progressiFilm.get(r.chiave) ?? 0, 0);
  const progresso = r.dove === 'dvd' ? Math.min(grezzo, totaleSessioni) : grezzo;
  const iniziato = progresso > 0;
  return {
    chiave: r.chiave, nome: r.nome, nomeIt: r.nome_it, dove: r.dove, dote: r.dote as FilmDto['dote'], note: r.note, noteSuccessive: r.note_successive, prezzo: r.prezzo, dettagli: r.dettagli,
    ...effettiDto(r.effetti_json), verificato: r.verificato === 1,
    posizioni: posizioni.get(r.chiave) ?? [], totaleSessioni, progresso, iniziato, fatto: r.dove === 'cinema' ? iniziato : progresso >= totaleSessioni,
    ...conDisponibilita(r.condizioni_json, st),
  };
};

function letturePartita(partitaId: number | undefined): StatoLetture {
  if (partitaId === undefined) return { fatti: new Set(), progressiLibri: new Map(), progressiFilm: new Map(), progressiVideogiochi: new Map() };
  verificaPartita(partitaId);
  const fatti = new Set((prepared('SELECT tipo, chiave FROM lettura_partita WHERE partita_id = ?').all(partitaId) as Array<{ tipo: string; chiave: string }>).map((r) => `${r.tipo}/${r.chiave}`));
  const progressiLibri = new Map((prepared('SELECT libro_chiave, avanzamento FROM progresso_libro_partita WHERE partita_id = ?').all(partitaId) as Array<{ libro_chiave: string; avanzamento: number }>).map((r) => [r.libro_chiave, r.avanzamento]));
  const progressiFilm = new Map((prepared('SELECT film_chiave, avanzamento FROM progresso_film_partita WHERE partita_id = ?').all(partitaId) as Array<{ film_chiave: string; avanzamento: number }>).map((r) => [r.film_chiave, r.avanzamento]));
  const progressiVideogiochi = new Map((prepared('SELECT videogioco_chiave, avanzamento FROM progresso_videogioco_partita WHERE partita_id = ?').all(partitaId) as Array<{ videogioco_chiave: string; avanzamento: number }>).map((r) => [r.videogioco_chiave, r.avanzamento]));
  return { fatti, progressiLibri, progressiFilm, progressiVideogiochi };
}

const videogiocoDto = (r: RigaAttivita, stato: StatoLetture, sedi: Map<string, string>, negozi: Map<string, LibroDto['negozi']>, st: StatoDisponibilita | null = null): VideogiocoDto => {
  const totaleRound = Math.max(r.sessioni ?? 1, 1);
  const progresso = Math.min(Math.max(stato.progressiVideogiochi.get(r.chiave) ?? 0, 0), totaleRound);
  return { ...attivitaDto(r, sedi, st), tipo: 'videogioco', negozi: negozi.get(r.chiave) ?? [], totaleRound, progresso, iniziato: progresso > 0, fatto: progresso >= totaleRound };
};

export function videogiochiTutti(partitaId?: number): VideogiochiDto {
  const stato = letturePartita(partitaId);
  const st = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId);
  const sedi = nomiLuoghi(); const negozi = articoliCollegati('videogiochi');
  const videogiochi = (prepared("SELECT * FROM attivita WHERE tipo='videogioco' AND nascosto = 0 ORDER BY ordine").all() as RigaAttivita[]).map((r) => videogiocoDto(r, stato, sedi, negozi, st));
  return { videogiochi, iniziati: videogiochi.filter((v) => v.iniziato).length, completati: videogiochi.filter((v) => v.fatto).length, roundFatti: videogiochi.reduce((n, v) => n + v.progresso, 0), roundObiettivo: videogiochi.reduce((n, v) => n + v.totaleRound, 0) };
}

function posizioniFilm(): Map<string, FilmDto['posizioni']> {
  const esito = new Map<string, FilmDto['posizioni']>();
  for (const r of prepared('SELECT film_chiave, tipo, chiave, etichetta, ruolo FROM film_posizione ORDER BY film_chiave, ordine').all() as RigaPosizioneFilm[]) {
    const elenco = esito.get(r.film_chiave) ?? [];
    elenco.push({ tipo: r.tipo, chiave: r.chiave, etichetta: r.etichetta, ruolo: r.ruolo });
    esito.set(r.film_chiave, elenco);
  }
  return esito;
}

function posizioniLibri(): Map<string, LibroDto['posizioni']> {
  const esito = new Map<string, LibroDto['posizioni']>();
  for (const r of prepared('SELECT libro_chiave, tipo, chiave, etichetta FROM libro_posizione ORDER BY libro_chiave, ordine').all() as RigaPosizioneLibro[]) {
    const elenco = esito.get(r.libro_chiave) ?? [];
    elenco.push({ tipo: r.tipo, chiave: r.chiave, etichetta: r.etichetta });
    esito.set(r.libro_chiave, elenco);
  }
  return esito;
}

function elencoLibri(partitaId?: number): LibroDto[] {
  const stato = letturePartita(partitaId);
  const posizioni = posizioniLibri();
  const negozi = articoliCollegati('libri');
  const st = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId);
  return (prepared('SELECT * FROM libro WHERE nascosto = 0 ORDER BY ordine').all() as RigaLibro[]).map((r) => libroDto(r, stato, posizioni, negozi, st));
}

export function libriTutti(partitaId?: number): LibriDto {
  const libri = elencoLibri(partitaId);
  return {
    libri, completati: libri.filter((l) => l.fatto).length,
    sessioniFatte: libri.reduce((n, l) => n + l.progresso, 0),
    sessioniTotali: libri.reduce((n, l) => n + l.totaleSessioni, 0),
    letturaRapida: haLetturaRapida(letturePartita(partitaId)),
  };
}

export function filmDvdTutti(partitaId?: number): FilmDvdDto {
  const stato = letturePartita(partitaId);
  const posizioni = posizioniFilm();
  const st = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId);
  const film = (prepared('SELECT * FROM film WHERE nascosto = 0 ORDER BY ordine').all() as RigaFilm[]).map((r) => filmDto(r, stato, posizioni, st));
  return {
    film,
    iniziati: film.filter((f) => f.iniziato).length,
    completati: film.filter((f) => f.fatto).length,
    sessioniCompletamentoFatte: film.reduce((n, f) => n + Math.min(f.progresso, f.totaleSessioni), 0),
    sessioniObiettivo: film.reduce((n, f) => n + f.totaleSessioni, 0),
    visioniRegistrate: film.reduce((n, f) => n + f.progresso, 0),
  };
}

/** Attività, lavori, libri e film; con partita, libri letti e film visti. Le righe nascoste non compaiono. */
export function attivitaTutte(partitaId?: number): AttivitaTutteDto {
  const stato = letturePartita(partitaId);
  const st = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId);
  const sedi = nomiLuoghi();
  const attivita = (prepared('SELECT * FROM attivita WHERE nascosto = 0 ORDER BY ordine').all() as RigaAttivita[]).map((r) => attivitaDto(r, sedi, st));
  const libri = elencoLibri(partitaId);
  const posizioni = posizioniFilm();
  const film = (prepared('SELECT * FROM film WHERE nascosto = 0 ORDER BY ordine').all() as RigaFilm[]).map((r) => filmDto(r, stato, posizioni, st));
  return { attivita: attivita.filter((a) => a.tipo !== 'lavoro'), lavori: attivita.filter((a) => a.tipo === 'lavoro'), libri, film, libriLetti: libri.filter((l) => l.fatto).length, filmVisti: film.filter((f) => f.iniziato).length };
}

/** Vero se la partita ha letto «Anima da cineasta» (Royal): i punti di film e DVD salgono di uno scalino. */
function haAnimaDaCineasta(partitaId: number): boolean {
  return !!prepared("SELECT 1 FROM lettura_partita WHERE partita_id = ? AND tipo = 'libro' AND chiave = 'anima-da-cineasta'").get(partitaId);
}

/** Le note che un conseguimento dà, Dote per Dote, dagli effetti dichiarati.
 *
 * `successiva` è vero dalla seconda volta in poi e riguarda i film al cinema e i turni delle attività
 * contate per volte: contano le voci `ripetuto`, e dove la guida non dichiara niente ripetere non dà niente. Una voce con condizioni
 * («piove») conta solo se la partita le soddisfa in quel momento. */
function noteDelConseguimento(riga: RigaLibro | RigaFilm | RigaAttivita, successiva: boolean, st: StatoDisponibilita): Array<{ dote: string; note: 1 | 2 | 3 }> {
  const voci: VoceEffetto[] = leggiVociEffetto(riga.effetti_json);
  const nomi = nomiCondizioniMemo();
  return dotiDaEffetti(voci, { successiva })
    .filter((d) => d.condizioni.length === 0 || valutaRequisiti(d.condizioni.map((c) => ({ ...c, testo: descriviRequisitoSpillo(c, nomi) })) as RequisitoDisponibilita[], st).stato === 'disponibile')
    .map((d) => ({ dote: d.dote, note: Math.min(3, Math.max(1, d.note)) as 1 | 2 | 3 }));
}

/** Registra le note di un conseguimento: **che cosa il gioco dà** (tre note lette in un libro valgono il quarto scalino:
 *  `puntiDaNote` lo sa già). Le Doti non si toccano — si segnano a mano (`aggiornaDote`, scelta dell'utente 2026-09-30) —:
 *  il registro dice che cosa ricordare e, al cinema, quale visione è la prima. */
function applicaEffettiLettura(partitaId: number, tipo: TipoLettura, chiave: string, riga: RigaLibro | RigaFilm | RigaAttivita, successiva: boolean, adesso: string, st: StatoDisponibilita): void {
  const doti = noteDelConseguimento(riga, successiva, st);
  if (doti.length === 0) return;
  const ordine = ((prepared('SELECT MAX(ordine) AS m FROM effetto_lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ?').get(partitaId, tipo, chiave) as { m: number | null }).m ?? 0) + 1;
  const cinema = tipo === 'film' && haAnimaDaCineasta(partitaId);
  for (const n of doti) {
    const punti = puntiDaNote(n.note, tipo === 'libro', false, cinema);
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
function puntiRegistrati(partitaId: number, tipo: string, chiave: string): Map<string, number> {
  return new Map((prepared('SELECT dote_chiave, SUM(punti) AS punti FROM effetto_lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ? GROUP BY dote_chiave').all(partitaId, tipo, chiave) as Array<{ dote_chiave: string; punti: number }>)
    .map((r) => [r.dote_chiave, r.punti]));
}

/** Che cosa cambia fra due letture del registro: le Doti da segnare a mano (in più o in meno). */
function daSegnareFra(prima: Map<string, number>, dopo: Map<string, number>): DoteDaSegnareDto[] {
  const chiavi = [...new Set([...prima.keys(), ...dopo.keys()])];
  return chiavi.map((c) => ({ chiave: c, nome: nomeDote(c), delta: (dopo.get(c) ?? 0) - (prima.get(c) ?? 0) })).filter((d) => d.delta !== 0);
}

/**
 * Registra una lettura/visione. `lettura_partita` contiene soltanto fruizioni completate: libri,
 * film e DVD entrano quando l'avanzamento raggiunge il rispettivo totale. Una riga non ancora
 * disponibile nella partita non si può avanzare (409): la guida dice «non ancora», e segnare una
 * lettura che il gioco non permette falserebbe i progressi.
 */
export function impostaLettura(partitaId: number, tipo: TipoLettura, chiave: string, modifica: { fatto: boolean } | { avanzamento: number }): LibroDto | FilmDto | VideogiocoDto {
  verificaPartita(partitaId);
  const riga = (tipo === 'libro' ? prepared('SELECT * FROM libro WHERE chiave = ? AND nascosto = 0').get(chiave) : tipo === 'film' ? prepared('SELECT * FROM film WHERE chiave = ? AND nascosto = 0').get(chiave) : prepared("SELECT * FROM attivita WHERE chiave = ? AND tipo='videogioco' AND nascosto = 0").get(chiave)) as RigaLibro | RigaFilm | RigaAttivita | undefined;
  if (!riga) throw httpErrors.notFound('lettura-non-trovata', `${tipo === 'libro' ? 'Il libro' : tipo === 'film' ? 'Il film' : 'Il videogioco'} '${chiave}' non esiste.`);
  const adesso = nowIso();
  const totale = tipo === 'libro' ? totaleLibro(riga as RigaLibro) : Math.max((riga as RigaFilm | RigaAttivita).sessioni ?? 1, 1);
  const richiesto = 'avanzamento' in modifica ? modifica.avanzamento : modifica.fatto ? totale : 0;
  const senzaMassimo = tipo === 'film' && (riga as RigaFilm).dove === 'cinema';
  if (!Number.isInteger(richiesto) || richiesto < 0 || (!senzaMassimo && richiesto > totale)) {
    throw httpErrors.badRequest('avanzamento-non-valido', senzaMassimo ? "L'avanzamento deve essere un intero non negativo." : `L'avanzamento deve essere un intero fra 0 e ${totale}.`);
  }
  const st = statoDisponibilitaPartita(partitaId);
  if (richiesto > 0 && conDisponibilita(riga.condizioni_json, st).disponibilita?.stato === 'bloccato') {
    throw httpErrors.conflict('lettura-non-disponibile', `'${riga.nome}' non è ancora disponibile nella partita: la condizione di sblocco non è soddisfatta.`);
  }
  const registroPrima = puntiRegistrati(partitaId, tipo, chiave);
  getDb().transaction(() => {
    // Quante visioni/sessioni c'erano **prima** di questa scrittura: al cinema serve a sapere
    // quante se ne aggiungono o se ne tolgono, perché ognuna è un conseguimento a sé.
    const confermatoPrima = tipo === 'film'
      ? ((prepared('SELECT avanzamento FROM progresso_film_partita WHERE partita_id = ? AND film_chiave = ?').get(partitaId, chiave) as { avanzamento: number } | undefined)?.avanzamento ?? 0)
      : 0;
    const era = tipo === 'videogioco'
      ? !!prepared('SELECT 1 FROM progresso_videogioco_partita WHERE partita_id = ? AND videogioco_chiave = ? AND avanzamento >= ?').get(partitaId, chiave, totale)
      : !!prepared('SELECT 1 FROM lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ?').get(partitaId, tipo, chiave);
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
    if (tipo === 'libro' || tipo === 'film') {
      if (registrato) prepared('INSERT INTO lettura_partita (partita_id, tipo, chiave, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, tipo, chiave) DO UPDATE SET updated_at = excluded.updated_at').run(partitaId, tipo, chiave, adesso);
      else prepared('DELETE FROM lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ?').run(partitaId, tipo, chiave);
    }
    if (registrato && !era) {
      const doti = noteDelConseguimento(riga, false, st);
      const dote = doti.length ? ` · Dote: ${doti.map((d) => `${d.dote} (${d.note} ${d.note === 1 ? 'nota' : 'note'})`).join(', ')}` : '';
      const titolo = tipo === 'libro' ? (riga as RigaLibro).nome_it ?? riga.nome : riga.nome;
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
  const dto = tipo === 'libro' ? libroDto(riga as RigaLibro, stato, posizioniLibri(), articoliCollegati('libri')) : tipo === 'film' ? filmDto(riga as RigaFilm, stato, posizioniFilm()) : videogiocoDto(riga as RigaAttivita, stato, nomiLuoghi(), articoliCollegati('videogiochi'));
  return daSegnare.length ? { ...dto, daSegnare } : dto;
}

/** Dove è arrivata una lettura nella partita: sessioni lette, visioni o serate, sessioni di gioco; il totale (null al cinema, che non ne ha) e il nome. */
export function avanzamentoLettura(partitaId: number, tipo: TipoLettura, chiave: string): { avanzamento: number; totale: number | null; nome: string } {
  const riga = (tipo === 'libro' ? prepared('SELECT * FROM libro WHERE chiave = ? AND nascosto = 0').get(chiave) : tipo === 'film' ? prepared('SELECT * FROM film WHERE chiave = ? AND nascosto = 0').get(chiave) : prepared("SELECT * FROM attivita WHERE chiave = ? AND tipo='videogioco' AND nascosto = 0").get(chiave)) as RigaLibro | RigaFilm | RigaAttivita | undefined;
  if (!riga) throw httpErrors.notFound('lettura-non-trovata', `${tipo === 'libro' ? 'Il libro' : tipo === 'film' ? 'Il film' : 'Il videogioco'} '${chiave}' non esiste.`);
  const nome = tipo === 'libro' ? (riga as RigaLibro).nome_it ?? riga.nome : riga.nome;
  if (tipo === 'libro') {
    const totale = totaleLibro(riga as RigaLibro);
    const letto = !!prepared("SELECT 1 FROM lettura_partita WHERE partita_id = ? AND tipo = 'libro' AND chiave = ?").get(partitaId, chiave);
    const r = prepared('SELECT avanzamento FROM progresso_libro_partita WHERE partita_id = ? AND libro_chiave = ?').get(partitaId, chiave) as { avanzamento: number } | undefined;
    return { avanzamento: letto ? Math.max(totale, r?.avanzamento ?? 0) : r?.avanzamento ?? 0, totale, nome };
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
function attivitaConTurni(chiave: string): RigaAttivita {
  const riga = prepared('SELECT * FROM attivita WHERE chiave = ?').get(chiave) as RigaAttivita | undefined;
  if (!riga) throw httpErrors.notFound('attivita-non-trovata', `L'attività '${chiave}' non esiste.`);
  // come la scheda dell'attività: un valore fuori catalogo vale quello del tipo
  const tracciamento = eTracciamentoAttivita(riga.tracciamento) ? riga.tracciamento : tracciamentoPerTipo(riga.tipo);
  if (tracciamento !== 'svolta') throw httpErrors.badRequest('attivita-non-conteggiabile', `«${riga.nome}» non si conta per volte svolte: non ha turni da registrare.`);
  return riga;
}

function volteSvolte(partitaId: number, chiave: string): number {
  return (prepared('SELECT volte FROM attivita_svolta_partita WHERE partita_id = ? AND attivita_chiave = ?').get(partitaId, chiave) as { volte: number } | undefined)?.volte ?? 0;
}

function scriviVolte(partitaId: number, chiave: string, volte: number, adesso: string): void {
  prepared('INSERT INTO attivita_svolta_partita (partita_id, attivita_chiave, volte, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, attivita_chiave) DO UPDATE SET volte = excluded.volte, updated_at = excluded.updated_at').run(partitaId, chiave, volte, adesso);
}

export interface TurnoRegistrato {
  attivita: string;
  nome: string;
  ordine: number;
  doti: Array<{ chiave: string; nome: string; delta: number; note: number }>;
}

/** Registra un turno in più e ne applica le Doti (`doti` del turno, se dichiarate, al posto di quelle dell'attività). */
export function registraTurno(partitaId: number, chiave: string, doti?: Array<{ dote: string; note: 1 | 2 | 3 }>): TurnoRegistrato {
  const riga = attivitaConTurni(chiave);
  const adesso = nowIso();
  return getDb().transaction(() => {
    const prima = volteSvolte(partitaId, chiave);
    // dopo i turni già contati (anche quelli segnati prima del registro, che non hanno riga) e dopo l'ultimo registrato
    const ultimo = (prepared('SELECT MAX(ordine) AS m FROM turno_partita WHERE partita_id = ? AND attivita_chiave = ?').get(partitaId, chiave) as { m: number | null }).m ?? 0;
    const ordine = Math.max(ultimo, prima) + 1;
    scriviVolte(partitaId, chiave, prima + 1, adesso);
    prepared('INSERT INTO turno_partita (partita_id, attivita_chiave, ordine, created_at) VALUES (?, ?, ?, ?)').run(partitaId, chiave, ordine, adesso);
    // che cosa dà il turno: si registra e si ricorda, le Doti si segnano a mano (`aggiornaDote`)
    const daApplicare = doti ?? noteDelConseguimento(riga, ordine > 1, statoDisponibilitaPartita(partitaId));
    const applicate: TurnoRegistrato['doti'] = [];
    for (const d of daApplicare) {
      const punti = puntiDaNote(d.note, false);
      prepared("INSERT INTO effetto_lettura_partita (partita_id, tipo, chiave, ordine, dote_chiave, punti, note, updated_at) VALUES (?, 'attivita', ?, ?, ?, ?, ?, ?)")
        .run(partitaId, chiave, ordine, d.dote, punti, d.note, adesso);
      applicate.push({ chiave: d.dote, nome: nomeDote(d.dote), delta: punti, note: d.note });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    return { attivita: chiave, nome: riga.nome, ordine, doti: applicate };
  })();
}

/** Toglie un turno con i punti che aveva dato: quello di `ordine` (la spunta che lo aveva registrato), solo se c'è
 *  ancora — il contatore può averlo già tolto, e `volte` non deve scendere due volte —, oppure l'ultimo (il contatore):
 *  l'ultimo registrato, o uno di quelli contati prima del registro, che non hanno punti da restituire. */
export function togliTurno(partitaId: number, chiave: string, ordine?: number): void {
  attivitaConTurni(chiave);
  const adesso = nowIso();
  getDb().transaction(() => {
    const prima = volteSvolte(partitaId, chiave);
    const bersaglio = ordine !== undefined
      ? (prepared('SELECT ordine FROM turno_partita WHERE partita_id = ? AND attivita_chiave = ? AND ordine = ?').get(partitaId, chiave, ordine) as { ordine: number } | undefined)?.ordine ?? null
      : (prepared('SELECT MAX(ordine) AS m FROM turno_partita WHERE partita_id = ? AND attivita_chiave = ?').get(partitaId, chiave) as { m: number | null }).m;
    if (ordine !== undefined && bersaglio === null) return;
    if (bersaglio !== null) {
      // il turno esce dal registro; le Doti restano come sono (si segnano a mano)
      prepared("DELETE FROM effetto_lettura_partita WHERE partita_id = ? AND tipo = 'attivita' AND chiave = ? AND ordine = ?").run(partitaId, chiave, bersaglio);
      prepared('DELETE FROM turno_partita WHERE partita_id = ? AND attivita_chiave = ? AND ordine = ?').run(partitaId, chiave, bersaglio);
    }
    if (prima > 0) scriviVolte(partitaId, chiave, prima - 1, adesso);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
}

/** Il contatore dell'attività: porta le volte a `volte` registrando o togliendo turni. Dice che cosa danno i turni
 *  aggiunti (o davano quelli tolti), da segnare a mano nelle Doti. */
export function impostaVolteAttivita(partitaId: number, chiave: string, volte: number): DoteDaSegnareDto[] {
  attivitaConTurni(chiave);
  const prima = puntiRegistrati(partitaId, 'attivita', chiave);
  getDb().transaction(() => {
    for (let v = volteSvolte(partitaId, chiave); v < volte; v++) registraTurno(partitaId, chiave);
    for (let v = volteSvolte(partitaId, chiave); v > volte; v--) togliTurno(partitaId, chiave);
  })();
  return daSegnareFra(prima, puntiRegistrati(partitaId, 'attivita', chiave));
}

/** Che cosa dà un turno dell'attività, in parole: le voci del primo turno e quelle dal secondo in poi. */
export function effettiDelTurno(riga: { effetti_json: string | null }): string[] {
  const nomi = nomiCondizioniMemo();
  return leggiVociEffetto(riga.effetti_json).filter((v) => v.effetto.famiglia === 'dote').map((v) => `${v.ripetuto ? 'Dal 2° turno' : '1° turno'}: ${descriviVoceEffetto({ ...v, ripetuto: undefined }, { condizioni: nomi })}`);
}
