// ============================================================
// attivitaService — attività del tempo libero, lavori, libri e film con effetti sulle Doti e letture per partita (Fase 8.1)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { registraEvento } from './storicoService.js';
import type { AttivitaDto, AttivitaTutteDto, CondizioneSpilloDto, DisponibilitaDto, FilmDto, FilmDvdDto, LibroDto, LibriDto, TipoLettura, VideogiocoDto, VideogiochiDto } from '../../shared/types.js';
import { statoDisponibilitaPartita, valutaRequisiti, type RequisitoDisponibilita, type StatoDisponibilita } from './disponibilitaService.js';
import { descriviRequisitoSpillo, normalizzaCondizioniSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';

interface RigaAttivita { chiave: string; ordine: number; nome: string; tipo: string; luogo: string; luogo_chiave: string | null; fascia: string | null; costo: number | null; sblocco: string | null; sessioni: number | null; doti_json: string; altri_effetti: string | null; regole: string; premi: string | null; paga: string | null; fonte: string; verificato: number; condizioni_json: string | null }
interface RigaLibro { chiave: string; ordine: number; nome: string; nome_it: string | null; dove: string; prezzo: number | null; disponibile_dal: string | null; dote: string | null; note: number | null; sblocca: string | null; sessioni: number | null; dettagli: string | null; fonte: string; verificato: number; condizioni_json: string | null }
interface RigaFilm { chiave: string; ordine: number; nome: string; nome_it: string | null; dove: 'cinema' | 'dvd'; periodo: string; dote: string | null; note: number | null; prezzo: number | null; sessioni: number; dettagli: string | null; fonte: string; verificato: number; condizioni_json: string | null }

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
/** Il libro che cambia le regole di tutti gli altri.
 *
 * «Lettura rapida» — biblioteca della Shujin, gratis — dichiara nei suoi stessi dati:
 * *«Raddoppia la velocita di lettura di tutti i libri»*. L'app lo mostrava da sempre e non lo
 * applicava: `totaleLibro` guardava solo la riga del libro, quindi dopo averlo finito i 18 libri
 * da due sessioni continuavano a chiederne due e i 5 da tre continuavano a chiederne tre. Chi
 * seguiva l'app pianificava pomeriggi di lettura che nel gioco non servivano più.
 *
 * Raddoppiare la velocità vuol dire dimezzare le sessioni, **arrotondando per eccesso**: tre
 * diventano due, due diventano una, una resta una — mezza sessione non esiste, il pomeriggio si
 * spende intero. */
const CHIAVE_LETTURA_RAPIDA = 'lettura-rapida';
const haLetturaRapida = (stato: StatoLetture) => stato.fatti.has(`libro/${CHIAVE_LETTURA_RAPIDA}`);
const totaleLibro = (r: RigaLibro, rapida = false) => {
  const piene = Math.max(r.sessioni ?? 1, 1);
  return rapida ? Math.ceil(piene / 2) : piene;
};
const libroDto = (r: RigaLibro, stato: StatoLetture, posizioni: Map<string, LibroDto['posizioni']>, st: StatoDisponibilita | null = null): LibroDto => {
  const totaleSessioni = totaleLibro(r, haLetturaRapida(stato));
  const grezzo = stato.progressiLibri.get(r.chiave) ?? 0;
  // «Finito» resta un fatto registrato, non dedotto dal conteggio. La differenza si vede quando i
  // dati cambiano sotto i piedi: se una correzione del seed abbassa le sessioni di un libro, il
  // progresso si accorcia ma il libro **non** diventa letto da solo — non l'hai letto tu, è
  // cambiato il numero. L'unico caso in cui la soglia raggiunta vale da sola è «Lettura rapida»,
  // che è una cosa che succede nella partita e non nei dati: lì il riallineamento è esplicito,
  // dentro `impostaLettura`, e scrive davvero le letture che il dimezzamento ha completato.
  const fatto = stato.fatti.has(`libro/${r.chiave}`);
  return {
    chiave: r.chiave, nome: r.nome, nomeIt: r.nome_it, dove: r.dove, prezzo: r.prezzo, disponibileDal: r.disponibile_dal, dote: r.dote as LibroDto['dote'], note: r.note, sblocca: r.sblocca, sessioni: r.sessioni, dettagli: r.dettagli, fonte: r.fonte, verificato: r.verificato === 1,
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
    chiave: r.chiave, nome: r.nome, nomeIt: r.nome_it, dove: r.dove, periodo: r.periodo, dote: r.dote as FilmDto['dote'], note: r.note, prezzo: r.prezzo, dettagli: r.dettagli, fonte: r.fonte, verificato: r.verificato === 1,
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
export function impostaLettura(partitaId: number, tipo: TipoLettura, chiave: string, modifica: { fatto: boolean } | { avanzamento: number }): LibroDto | FilmDto | VideogiocoDto {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const riga = (tipo === 'libro' ? prepared('SELECT * FROM libro WHERE chiave = ?').get(chiave) : tipo === 'film' ? prepared('SELECT * FROM film WHERE chiave = ?').get(chiave) : prepared("SELECT * FROM attivita WHERE chiave = ? AND tipo='videogioco'").get(chiave)) as RigaLibro | RigaFilm | RigaAttivita | undefined;
  if (!riga) throw httpErrors.notFound('lettura-non-trovata', `${tipo === 'libro' ? 'Il libro' : 'Il film'} '${chiave}' non esiste.`);
  const adesso = nowIso();
  const totale = tipo === 'libro' ? totaleLibro(riga as RigaLibro, haLetturaRapida(letturePartita(partitaId))) : Math.max((riga as RigaFilm | RigaAttivita).sessioni ?? 1, 1);
  const richiesto = 'avanzamento' in modifica ? modifica.avanzamento : modifica.fatto ? totale : 0;
  const senzaMassimo = tipo === 'film' && (riga as RigaFilm).dove === 'cinema';
  if (!Number.isInteger(richiesto) || richiesto < 0 || (!senzaMassimo && richiesto > totale)) {
    throw httpErrors.badRequest('avanzamento-non-valido', senzaMassimo ? "L'avanzamento deve essere un intero non negativo." : `L'avanzamento deve essere un intero fra 0 e ${totale}.`);
  }
  getDb().transaction(() => {
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
    // Finire «Lettura rapida» cambia il requisito di tutti gli altri libri, quindi qualcuno può
    // averlo già soddisfatto senza toccare niente: due sessioni su un libro che ne chiedeva tre
    // adesso bastano. Va scritto adesso, non lasciato al calcolo di lettura: `completati`,
    // l'archivio delle letture e lo storico leggono la tabella, e resterebbero indietro.
    if (tipo === 'libro' && chiave === CHIAVE_LETTURA_RAPIDA && richiesto >= totale) {
      for (const l of prepared('SELECT * FROM libro').all() as RigaLibro[]) {
        if (l.chiave === CHIAVE_LETTURA_RAPIDA) continue;
        const avanzamento = (prepared('SELECT avanzamento FROM progresso_libro_partita WHERE partita_id = ? AND libro_chiave = ?').get(partitaId, l.chiave) as { avanzamento: number } | undefined)?.avanzamento ?? 0;
        if (avanzamento > 0 && avanzamento >= totaleLibro(l, true)) {
          prepared("INSERT INTO lettura_partita (partita_id, tipo, chiave, updated_at) VALUES (?, 'libro', ?, ?) ON CONFLICT(partita_id, tipo, chiave) DO NOTHING").run(partitaId, l.chiave, adesso);
        }
      }
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  const stato = letturePartita(partitaId);
  return tipo === 'libro' ? libroDto(riga as RigaLibro, stato, posizioniLibri()) : tipo === 'film' ? filmDto(riga as RigaFilm, stato, posizioniFilm()) : videogiocoDto(riga as RigaAttivita, stato);
}
