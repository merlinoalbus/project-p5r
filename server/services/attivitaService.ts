// ============================================================
// attivitaService — attività del tempo libero, lavori, libri e film con effetti sulle Doti e letture per partita (Fase 8.1)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { registraEvento } from './storicoService.js';
import type { AttivitaDto, AttivitaTutteDto, FilmDto, FilmDvdDto, LibroDto, LibriDto, TipoLettura, VideogiocoDto, VideogiochiDto } from '../../shared/types.js';

interface RigaAttivita { chiave: string; ordine: number; nome: string; tipo: string; luogo: string; luogo_chiave: string | null; fascia: string | null; costo: number | null; sblocco: string | null; sessioni: number | null; doti_json: string; altri_effetti: string | null; regole: string; premi: string | null; paga: string | null; fonte: string; verificato: number }
interface RigaLibro { chiave: string; ordine: number; nome: string; nome_it: string | null; dove: string; prezzo: number | null; disponibile_dal: string | null; dote: string | null; note: number | null; sblocca: string | null; sessioni: number | null; dettagli: string | null; fonte: string; verificato: number }
interface RigaFilm { chiave: string; ordine: number; nome: string; nome_it: string | null; dove: 'cinema' | 'dvd'; periodo: string; dote: string | null; note: number | null; prezzo: number | null; sessioni: number; dettagli: string | null; fonte: string; verificato: number }
interface RigaPosizioneLibro { libro_chiave: string; tipo: LibroDto['posizioni'][number]['tipo']; chiave: string; etichetta: string }
interface RigaPosizioneFilm { film_chiave: string; tipo: FilmDto['posizioni'][number]['tipo']; chiave: string; etichetta: string; ruolo: FilmDto['posizioni'][number]['ruolo'] }

const attivitaDto = (r: RigaAttivita): AttivitaDto => ({
  chiave: r.chiave, nome: r.nome, tipo: r.tipo as AttivitaDto['tipo'], luogo: r.luogo, luogoChiave: r.luogo_chiave, fascia: r.fascia as AttivitaDto['fascia'], costo: r.costo, sblocco: r.sblocco, sessioni: r.sessioni,
  doti: JSON.parse(r.doti_json) as AttivitaDto['doti'], altriEffetti: r.altri_effetti, regole: r.regole, premi: r.premi, paga: r.paga, fonte: r.fonte, verificato: r.verificato === 1,
});
interface StatoLetture { fatti: Set<string>; progressiLibri: Map<string, number>; progressiFilm: Map<string, number>; progressiVideogiochi: Map<string, number> }
const totaleLibro = (r: RigaLibro) => Math.max(r.sessioni ?? 1, 1);
const libroDto = (r: RigaLibro, stato: StatoLetture, posizioni: Map<string, LibroDto['posizioni']>): LibroDto => {
  const fatto = stato.fatti.has(`libro/${r.chiave}`);
  const totaleSessioni = totaleLibro(r);
  const grezzo = stato.progressiLibri.get(r.chiave) ?? 0;
  return {
    chiave: r.chiave, nome: r.nome, nomeIt: r.nome_it, dove: r.dove, prezzo: r.prezzo, disponibileDal: r.disponibile_dal, dote: r.dote as LibroDto['dote'], note: r.note, sblocca: r.sblocca, sessioni: r.sessioni, dettagli: r.dettagli, fonte: r.fonte, verificato: r.verificato === 1,
    posizioni: posizioni.get(r.chiave) ?? [], totaleSessioni, progresso: fatto ? totaleSessioni : Math.min(Math.max(grezzo, 0), totaleSessioni), fatto,
  };
};
const filmDto = (r: RigaFilm, stato: StatoLetture, posizioni: Map<string, FilmDto['posizioni']>): FilmDto => {
  const totaleSessioni = Math.max(r.sessioni, 1);
  const grezzo = Math.max(stato.progressiFilm.get(r.chiave) ?? 0, 0);
  const progresso = r.dove === 'dvd' ? Math.min(grezzo, totaleSessioni) : grezzo;
  const iniziato = progresso > 0;
  return {
    chiave: r.chiave, nome: r.nome, nomeIt: r.nome_it, dove: r.dove, periodo: r.periodo, dote: r.dote as FilmDto['dote'], note: r.note, prezzo: r.prezzo, dettagli: r.dettagli, fonte: r.fonte, verificato: r.verificato === 1,
    posizioni: posizioni.get(r.chiave) ?? [], totaleSessioni, progresso, iniziato, fatto: r.dove === 'cinema' ? iniziato : progresso >= totaleSessioni,
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

const videogiocoDto = (r: RigaAttivita, stato: StatoLetture): VideogiocoDto => {
  const totaleRound = Math.max(r.sessioni ?? 1, 1);
  const progresso = Math.min(Math.max(stato.progressiVideogiochi.get(r.chiave) ?? 0, 0), totaleRound);
  return { ...attivitaDto(r), tipo: 'videogioco', totaleRound, progresso, iniziato: progresso > 0, fatto: progresso >= totaleRound };
};

export function videogiochiTutti(partitaId?: number): VideogiochiDto {
  const stato = letturePartita(partitaId);
  const videogiochi = (prepared("SELECT * FROM attivita WHERE tipo='videogioco' ORDER BY ordine").all() as RigaAttivita[]).map((r) => videogiocoDto(r, stato));
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
  return (prepared('SELECT * FROM libro ORDER BY ordine').all() as RigaLibro[]).map((r) => libroDto(r, stato, posizioni));
}

export function libriTutti(partitaId?: number): LibriDto {
  const libri = elencoLibri(partitaId);
  return { libri, completati: libri.filter((l) => l.fatto).length, sessioniFatte: libri.reduce((n, l) => n + l.progresso, 0), sessioniTotali: libri.reduce((n, l) => n + l.totaleSessioni, 0) };
}

export function filmDvdTutti(partitaId?: number): FilmDvdDto {
  const stato = letturePartita(partitaId);
  const posizioni = posizioniFilm();
  const film = (prepared('SELECT * FROM film ORDER BY ordine').all() as RigaFilm[]).map((r) => filmDto(r, stato, posizioni));
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
  const attivita = (prepared('SELECT * FROM attivita ORDER BY ordine').all() as RigaAttivita[]).map(attivitaDto);
  const libri = elencoLibri(partitaId);
  const posizioni = posizioniFilm();
  const film = (prepared('SELECT * FROM film ORDER BY ordine').all() as RigaFilm[]).map((r) => filmDto(r, stato, posizioni));
  return { attivita: attivita.filter((a) => a.tipo !== 'lavoro'), lavori: attivita.filter((a) => a.tipo === 'lavoro'), libri, film, libriLetti: libri.filter((l) => l.fatto).length, filmVisti: film.filter((f) => f.iniziato).length };
}

/**
 * Registra una lettura/visione. `lettura_partita` contiene soltanto fruizioni completate:
 * libri, film e DVD entrano quando l'avanzamento raggiunge il rispettivo totale.
 */
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
    const era = !!prepared('SELECT 1 FROM lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ?').get(partitaId, tipo, chiave);
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
    if (registrato) prepared('INSERT INTO lettura_partita (partita_id, tipo, chiave, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, tipo, chiave) DO UPDATE SET updated_at = excluded.updated_at').run(partitaId, tipo, chiave, adesso);
    else prepared('DELETE FROM lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ?').run(partitaId, tipo, chiave);
    if (registrato && !era) {
      const dote = 'dote' in riga && riga.dote ? ` · Dote: ${riga.dote}${riga.note ? ` (${riga.note} ${riga.note === 1 ? 'nota' : 'note'})` : ''}` : '';
      const titolo = tipo === 'libro' ? (riga as RigaLibro).nome_it ?? riga.nome : riga.nome;
      const etichetta = tipo === 'libro' ? 'Libro letto' : tipo === 'film' ? 'Film visto' : 'Videogioco completato';
      const dove = tipo === 'libro' ? (riga as RigaLibro).dove : tipo === 'film' ? ((riga as RigaFilm).dove === 'cinema' ? 'Cinema' : 'DVD') : (riga as RigaAttivita).luogo;
      registraEvento(partitaId, 'lettura', `${etichetta}: ${titolo}`, `${dove}${dote}.`, { tipo, chiave });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  const stato = letturePartita(partitaId);
  return tipo === 'libro' ? libroDto(riga as RigaLibro, stato, posizioniLibri()) : tipo === 'film' ? filmDto(riga as RigaFilm, stato, posizioniFilm()) : videogiocoDto(riga as RigaAttivita, stato);
}
