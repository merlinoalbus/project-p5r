// ============================================================
// attivitaService — attività del tempo libero, lavori, libri e film con effetti sulle Doti e letture per partita (Fase 8.1)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { registraEvento } from './storicoService.js';
import type { AttivitaDto, AttivitaTutteDto, CondizioneSpilloDto, DisponibilitaDto, FilmDto, FilmDvdDto, LibroDto, LibriDto, TipoLettura, VideogiocoDto, VideogiochiDto } from '../../shared/types.js';
import { statoDisponibilitaPartita, valutaRequisiti, type RequisitoDisponibilita, type StatoDisponibilita } from './disponibilitaService.js';
import { aggiornaDote, puntiDaNote } from './partiteService.js';
import { descriviRequisitoSpillo, normalizzaCondizioniSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';

interface RigaAttivita { chiave: string; ordine: number; nome: string; tipo: string; luogo: string; luogo_chiave: string | null; fascia: string | null; costo: number | null; sblocco: string | null; sessioni: number | null; doti_json: string; altri_effetti: string | null; regole: string; premi: string | null; paga: string | null; fonte: string; verificato: number; condizioni_json: string | null }
interface RigaLibro { effetto_json?: string | null; chiave: string; ordine: number; nome: string; nome_it: string | null; dove: string; prezzo: number | null; disponibile_dal: string | null; dote: string | null; note: number | null; sblocca: string | null; sessioni: number | null; dettagli: string | null; fonte: string; verificato: number; condizioni_json: string | null }
interface RigaFilm { chiave: string; ordine: number; nome: string; nome_it: string | null; dove: 'cinema' | 'dvd'; periodo: string; dote: string | null; note: number | null; note_successive: number | null; prezzo: number | null; sessioni: number; dettagli: string | null; fonte: string; verificato: number; condizioni_json: string | null }

/** La disponibilità di una riga, dalle condizioni strutturate (migrazione 052).
 *
 * Prima queste tre famiglie avevano solo prosa — «dal 18 aprile», «dal 24 aprile», «5 giugno,
 * evento con Ryuji Sakamoto» — e nessuno la leggeva: l'elenco mostrava come già acquistabile un
 * libro che esce a settembre. La condizione non nasconde niente: dice «non ancora», che in una
 * guida è un'informazione, non un ostacolo. */
function conDisponibilita(condizioniJson: string | null, st: StatoDisponibilita | null): { condizioni: CondizioneSpilloDto[] | null; disponibilita: DisponibilitaDto | null } {
  let grezze: RequisitoSpillo[] = [];
  try { grezze = normalizzaCondizioniSpillo(condizioniJson ? (JSON.parse(condizioniJson) as unknown) : []); } catch { grezze = []; }
  if (grezze.length === 0) return { condizioni: null, disponibilita: null };
  const condizioni = grezze.map((c) => ({ ...c, testo: descriviRequisitoSpillo(c) }));
  return { condizioni, disponibilita: st ? valutaRequisiti(condizioni as RequisitoDisponibilita[], st) : null };
}
interface RigaPosizioneLibro { libro_chiave: string; tipo: LibroDto['posizioni'][number]['tipo']; chiave: string; etichetta: string }
interface RigaPosizioneFilm { film_chiave: string; tipo: FilmDto['posizioni'][number]['tipo']; chiave: string; etichetta: string; ruolo: FilmDto['posizioni'][number]['ruolo'] }

const attivitaDto = (r: RigaAttivita, st: StatoDisponibilita | null = null): AttivitaDto => ({
  chiave: r.chiave, nome: r.nome, tipo: r.tipo as AttivitaDto['tipo'], luogo: r.luogo, luogoChiave: r.luogo_chiave, fascia: r.fascia as AttivitaDto['fascia'], costo: r.costo, sblocco: r.sblocco, sessioni: r.sessioni,
  doti: JSON.parse(r.doti_json) as AttivitaDto['doti'], altriEffetti: r.altri_effetti, regole: r.regole, premi: r.premi, paga: r.paga, fonte: r.fonte, verificato: r.verificato === 1,
  ...conDisponibilita(r.condizioni_json, st),
});
interface StatoLetture { fatti: Set<string>; progressiLibri: Map<string, number>; progressiFilm: Map<string, number>; progressiVideogiochi: Map<string, number> }
/** Il libro che cambia le regole di tutti gli altri, **da lì in avanti**.
 *
 * «Lettura rapida» — biblioteca della Shujin, gratis — dichiara nei suoi stessi dati:
 * *«Raddoppia la velocita di lettura di tutti i libri»*, e l'app lo mostrava senza applicarlo.
 *
 * Come si applica è la parte che conta, e la prima stesura l'aveva sbagliata: **non è
 * retroattivo**. Dimezzare il totale di ogni libro avrebbe voluto dire che finire «Lettura rapida»
 * completa da solo i libri lasciati a metà — due sessioni su tre diventano due su due — e nel gioco
 * non succede: quelle due sessioni le hai lette alla velocità di prima, e restano due.
 *
 * Quel che raddoppia è **quanto rende un pomeriggio da qui in poi**. Il requisito del libro non si
 * muove; a muoversi è il passo: da quando «Lettura rapida» è letto, una sessione vale due. Un libro
 * da tre fermo a due si chiude con **una** sessione sola, e uno cominciato da zero si chiude con
 * due — non con una e mezza, perché il pomeriggio si spende intero. */
const CHIAVE_LETTURA_RAPIDA = 'lettura-rapida';
const haLetturaRapida = (stato: StatoLetture) => stato.fatti.has(`libro/${CHIAVE_LETTURA_RAPIDA}`);
const totaleLibro = (r: RigaLibro) => Math.max(r.sessioni ?? 1, 1);

/** Il quartiere che un libro apre, letto dall'effetto dichiarato.
 *
 * Il nome lo risolve qui il server invece di farlo cercare al frontend: la scheda di un libro non
 * ha nessun altro motivo per conoscere l'elenco dei quartieri, e chiederglielo per una riga sola
 * vorrebbe dire una chiamata in piu' su ogni pagina che mostra libri. */
function luogoSbloccato(effettoJson: string | null | undefined): { sbloccaLuogo: string | null; sbloccaLuogoNome: string | null } {
  if (!effettoJson) return { sbloccaLuogo: null, sbloccaLuogoNome: null };
  try {
    const e = JSON.parse(effettoJson) as { famiglia?: string; luogo?: string };
    if (e.famiglia !== 'sblocca-luogo' || !e.luogo) return { sbloccaLuogo: null, sbloccaLuogoNome: null };
    const q = prepared('SELECT nome FROM quartiere WHERE chiave = ?').get(e.luogo) as { nome: string } | undefined;
    return { sbloccaLuogo: e.luogo, sbloccaLuogoNome: q?.nome ?? null };
  } catch { return { sbloccaLuogo: null, sbloccaLuogoNome: null }; }
}
const libroDto = (r: RigaLibro, stato: StatoLetture, posizioni: Map<string, LibroDto['posizioni']>, st: StatoDisponibilita | null = null): LibroDto => {
  const totaleSessioni = totaleLibro(r);
  const grezzo = stato.progressiLibri.get(r.chiave) ?? 0;
  // «Finito» resta un fatto registrato, non dedotto dal conteggio. La differenza si vede quando i
  // dati cambiano sotto i piedi: se una correzione del seed abbassa le sessioni di un libro, il
  // progresso si accorcia ma il libro **non** diventa letto da solo — non l'hai letto tu, è
  // cambiato il numero. L'unico caso in cui la soglia raggiunta vale da sola è «Lettura rapida»,
  // che è una cosa che succede nella partita e non nei dati: lì il riallineamento è esplicito,
  // dentro `impostaLettura`, e scrive davvero le letture che il dimezzamento ha completato.
  const fatto = stato.fatti.has(`libro/${r.chiave}`);
  return {
    chiave: r.chiave, nome: r.nome, nomeIt: r.nome_it, dove: r.dove, prezzo: r.prezzo, disponibileDal: r.disponibile_dal, dote: r.dote as LibroDto['dote'], note: r.note, sblocca: r.sblocca, ...luogoSbloccato(r.effetto_json), sessioni: r.sessioni, dettagli: r.dettagli, fonte: r.fonte, verificato: r.verificato === 1,
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
    chiave: r.chiave, nome: r.nome, nomeIt: r.nome_it, dove: r.dove, periodo: r.periodo, dote: r.dote as FilmDto['dote'], note: r.note, noteSuccessive: r.note_successive, prezzo: r.prezzo, dettagli: r.dettagli, fonte: r.fonte, verificato: r.verificato === 1,
    posizioni: posizioni.get(r.chiave) ?? [], totaleSessioni, progresso, iniziato, fatto: r.dove === 'cinema' ? iniziato : progresso >= totaleSessioni,
    ...conDisponibilita(r.condizioni_json, st),
  };
};

function letturePartita(partitaId: number | undefined): StatoLetture {
  if (partitaId === undefined) return { fatti: new Set(), progressiLibri: new Map(), progressiFilm: new Map(), progressiVideogiochi: new Map() };
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const fatti = new Set((prepared('SELECT tipo, chiave FROM lettura_partita WHERE partita_id = ?').all(partitaId) as Array<{ tipo: string; chiave: string }>).map((r) => `${r.tipo}/${r.chiave}`));
  const progressiLibri = new Map((prepared('SELECT libro_chiave, avanzamento FROM progresso_libro_partita WHERE partita_id = ?').all(partitaId) as Array<{ libro_chiave: string; avanzamento: number }>).map((r) => [r.libro_chiave, r.avanzamento]));
  const progressiFilm = new Map((prepared('SELECT film_chiave, avanzamento FROM progresso_film_partita WHERE partita_id = ?').all(partitaId) as Array<{ film_chiave: string; avanzamento: number }>).map((r) => [r.film_chiave, r.avanzamento]));
  const progressiVideogiochi = new Map((prepared('SELECT videogioco_chiave, avanzamento FROM progresso_videogioco_partita WHERE partita_id = ?').all(partitaId) as Array<{ videogioco_chiave: string; avanzamento: number }>).map((r) => [r.videogioco_chiave, r.avanzamento]));
  return { fatti, progressiLibri, progressiFilm, progressiVideogiochi };
}

const videogiocoDto = (r: RigaAttivita, stato: StatoLetture, st: StatoDisponibilita | null = null): VideogiocoDto => {
  const totaleRound = Math.max(r.sessioni ?? 1, 1);
  const progresso = Math.min(Math.max(stato.progressiVideogiochi.get(r.chiave) ?? 0, 0), totaleRound);
  return { ...attivitaDto(r, st), tipo: 'videogioco', totaleRound, progresso, iniziato: progresso > 0, fatto: progresso >= totaleRound };
};

export function videogiochiTutti(partitaId?: number): VideogiochiDto {
  const stato = letturePartita(partitaId);
  const st = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId);
  const videogiochi = (prepared("SELECT * FROM attivita WHERE tipo='videogioco' ORDER BY ordine").all() as RigaAttivita[]).map((r) => videogiocoDto(r, stato, st));
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
  const st = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId);
  return (prepared('SELECT * FROM libro ORDER BY ordine').all() as RigaLibro[]).map((r) => libroDto(r, stato, posizioni, st));
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
  const film = (prepared('SELECT * FROM film ORDER BY ordine').all() as RigaFilm[]).map((r) => filmDto(r, stato, posizioni, st));
  return {
    film,
    iniziati: film.filter((f) => f.iniziato).length,
    completati: film.filter((f) => f.fatto).length,
    sessioniCompletamentoFatte: film.reduce((n, f) => n + Math.min(f.progresso, f.totaleSessioni), 0),
    sessioniObiettivo: film.reduce((n, f) => n + f.totaleSessioni, 0),
    visioniRegistrate: film.reduce((n, f) => n + f.progresso, 0),
  };
}

/** Attività, lavori, libri e film; con partita, libri letti e film visti. */
export function attivitaTutte(partitaId?: number): AttivitaTutteDto {
  const stato = letturePartita(partitaId);
  const st = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId);
  const attivita = (prepared('SELECT * FROM attivita ORDER BY ordine').all() as RigaAttivita[]).map((r) => attivitaDto(r, st));
  const libri = elencoLibri(partitaId);
  const posizioni = posizioniFilm();
  const film = (prepared('SELECT * FROM film ORDER BY ordine').all() as RigaFilm[]).map((r) => filmDto(r, stato, posizioni, st));
  return { attivita: attivita.filter((a) => a.tipo !== 'lavoro'), lavori: attivita.filter((a) => a.tipo === 'lavoro'), libri, film, libriLetti: libri.filter((l) => l.fatto).length, filmVisti: film.filter((f) => f.iniziato).length };
}

/**
 * Registra una lettura/visione. `lettura_partita` contiene soltanto fruizioni completate:
 * libri, film e DVD entrano quando l'avanzamento raggiunge il rispettivo totale.
 */
/** Vero se la partita ha letto «Anima da cineasta» (Royal): i punti di film e DVD salgono di uno scalino. */
function haAnimaDaCineasta(partitaId: number): boolean {
  return !!prepared("SELECT 1 FROM lettura_partita WHERE partita_id = ? AND tipo = 'libro' AND chiave = 'anima-da-cineasta'").get(partitaId);
}

/** Le note che un conseguimento dà, e a quale Dote.
 *
 * `successiva` è vero dalla seconda volta in poi, e riguarda solo i film al cinema: là la guida
 * dichiara riga per riga quanto vale rivedere un titolo, e dove non lo dichiara (`note_successive`
 * vuoto) rivederlo non dà niente — che è quel che l'app faceva finora, quindi nessuna partita
 * cambia da sola. */
function noteDelConseguimento(riga: RigaLibro | RigaFilm | RigaAttivita, tipo: TipoLettura, successiva: boolean): { dote: string; note: 1 | 2 | 3 } | null {
  if (tipo === 'videogioco') {
    const doti = JSON.parse((riga as RigaAttivita).doti_json) as Array<{ dote: string | null; note: number | null }>;
    const d = doti.find((x) => x.dote && x.note);
    return d ? { dote: d.dote!, note: Math.min(3, Math.max(1, d.note!)) as 1 | 2 | 3 } : null;
  }
  const r = riga as RigaLibro | RigaFilm;
  if (!r.dote) return null;
  const grezze = successiva ? (riga as RigaFilm).note_successive : r.note;
  if (!grezze || grezze < 1) return null;
  return { dote: r.dote, note: Math.min(3, Math.max(1, grezze)) as 1 | 2 | 3 };
}

/** Applica le note di un conseguimento e **scrive che cosa ha dato**, per poterlo togliere identico.
 *
 * Il bonus del libro è la regola che l'utente ha ricordato: tre note lette in un libro valgono il
 * quarto scalino (7 punti invece di 5), e la stessa `puntiDaNote` lo sa già fare — bastava passarle
 * che si tratta di un libro, cosa che nessuno faceva perché nessuno chiamava da qui. */
function applicaEffettiLettura(partitaId: number, tipo: TipoLettura, chiave: string, riga: RigaLibro | RigaFilm | RigaAttivita, successiva: boolean, adesso: string): void {
  const n = noteDelConseguimento(riga, tipo, successiva);
  if (!n) return;
  const ordine = ((prepared('SELECT MAX(ordine) AS m FROM effetto_lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ?').get(partitaId, tipo, chiave) as { m: number | null }).m ?? 0) + 1;
  const cinema = tipo === 'film' && haAnimaDaCineasta(partitaId);
  const punti = puntiDaNote(n.note, tipo === 'libro', false, cinema);
  aggiornaDote(partitaId, n.dote, { delta: punti });
  prepared('INSERT INTO effetto_lettura_partita (partita_id, tipo, chiave, ordine, dote_chiave, punti, note, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(partitaId, tipo, chiave, ordine, n.dote, punti, n.note, adesso);
}

/** Toglie l'**ultimo** conseguimento registrato: al cinema la prima visione vale più delle altre,
 *  e restituire la prima quando si disfa la terza sarebbe un regalo. */
function annullaUltimoEffettoLettura(partitaId: number, tipo: TipoLettura, chiave: string): void {
  const ultimo = prepared('SELECT ordine FROM effetto_lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ? ORDER BY ordine DESC LIMIT 1').get(partitaId, tipo, chiave) as { ordine: number } | undefined;
  if (!ultimo) return;
  for (const e of prepared('SELECT dote_chiave, punti FROM effetto_lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ? AND ordine = ?').all(partitaId, tipo, chiave, ultimo.ordine) as Array<{ dote_chiave: string; punti: number }>) {
    aggiornaDote(partitaId, e.dote_chiave, { delta: -e.punti });
  }
  prepared('DELETE FROM effetto_lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ? AND ordine = ?').run(partitaId, tipo, chiave, ultimo.ordine);
}

/** Toglie tutto quello che un elemento ha dato: si usa quando si disfa un completamento. */
function annullaEffettiLettura(partitaId: number, tipo: TipoLettura, chiave: string): void {
  for (const e of prepared('SELECT dote_chiave, punti FROM effetto_lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ?').all(partitaId, tipo, chiave) as Array<{ dote_chiave: string; punti: number }>) {
    aggiornaDote(partitaId, e.dote_chiave, { delta: -e.punti });
  }
  prepared('DELETE FROM effetto_lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ?').run(partitaId, tipo, chiave);
}

export function impostaLettura(partitaId: number, tipo: TipoLettura, chiave: string, modifica: { fatto: boolean } | { avanzamento: number }): LibroDto | FilmDto | VideogiocoDto {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const riga = (tipo === 'libro' ? prepared('SELECT * FROM libro WHERE chiave = ?').get(chiave) : tipo === 'film' ? prepared('SELECT * FROM film WHERE chiave = ?').get(chiave) : prepared("SELECT * FROM attivita WHERE chiave = ? AND tipo='videogioco'").get(chiave)) as RigaLibro | RigaFilm | RigaAttivita | undefined;
  if (!riga) throw httpErrors.notFound('lettura-non-trovata', `${tipo === 'libro' ? 'Il libro' : 'Il film'} '${chiave}' non esiste.`);
  const adesso = nowIso();
  const totale = tipo === 'libro' ? totaleLibro(riga as RigaLibro) : Math.max((riga as RigaFilm | RigaAttivita).sessioni ?? 1, 1);
  const richiesto = 'avanzamento' in modifica ? modifica.avanzamento : modifica.fatto ? totale : 0;
  const senzaMassimo = tipo === 'film' && (riga as RigaFilm).dove === 'cinema';
  if (!Number.isInteger(richiesto) || richiesto < 0 || (!senzaMassimo && richiesto > totale)) {
    throw httpErrors.badRequest('avanzamento-non-valido', senzaMassimo ? "L'avanzamento deve essere un intero non negativo." : `L'avanzamento deve essere un intero fra 0 e ${totale}.`);
  }
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
      const dote = 'dote' in riga && riga.dote ? ` · Dote: ${riga.dote}${riga.note ? ` (${riga.note} ${riga.note === 1 ? 'nota' : 'note'})` : ''}` : '';
      const titolo = tipo === 'libro' ? (riga as RigaLibro).nome_it ?? riga.nome : riga.nome;
      const etichetta = tipo === 'libro' ? 'Libro letto' : tipo === 'film' ? 'Film visto' : 'Videogioco completato';
      const dove = tipo === 'libro' ? (riga as RigaLibro).dove : tipo === 'film' ? ((riga as RigaFilm).dove === 'cinema' ? 'Cinema' : 'DVD') : (riga as RigaAttivita).luogo;
      registraEvento(partitaId, 'lettura', `${etichetta}: ${titolo}`, `${dove}${dote}.`, { tipo, chiave });
    }
    // ---- Il conseguimento alza le Doti ----
    //
    // È qui il trigger, non nel pulsante: un libro **finito**, un film **visto**, un gioco
    // **completato**. Prima non lo faceva nessuno — la scheda diceva «Coraggio ♪♪♪» e i punti non
    // arrivavano — e i punti li davano solo la guida del giorno, le domande in classe e i pulsanti
    // a mano.
    //
    // Un film al cinema si rivede, e ogni visione conta: la prima con le sue note, quelle dopo con
    // `note_successive`, che dove la guida non dichiara niente resta vuoto e vale zero. Libri, DVD e
    // videogiochi si conseguono una volta sola, e il loro effetto scatta al completamento.
    if (tipo !== 'film' || (riga as RigaFilm).dove !== 'cinema') {
      if (registrato && !era) applicaEffettiLettura(partitaId, tipo, chiave, riga, false, adesso);
      else if (!registrato && era) annullaEffettiLettura(partitaId, tipo, chiave);
    } else {
      // Al cinema il progresso non ha tetto: conta quante visioni si aggiungono o si tolgono.
      const prima = confermatoPrima;
      for (let i = prima; i < richiesto; i++) applicaEffettiLettura(partitaId, tipo, chiave, riga, i > 0, adesso);
      for (let i = prima; i > richiesto; i--) annullaUltimoEffettoLettura(partitaId, tipo, chiave);
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  const stato = letturePartita(partitaId);
  return tipo === 'libro' ? libroDto(riga as RigaLibro, stato, posizioniLibri()) : tipo === 'film' ? filmDto(riga as RigaFilm, stato, posizioniFilm()) : videogiocoDto(riga as RigaAttivita, stato);
}
