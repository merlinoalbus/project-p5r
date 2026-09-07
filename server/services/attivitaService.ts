// ============================================================
// attivitaService — attività del tempo libero, lavori, libri e film con effetti sulle Doti e letture per partita (Fase 8.1)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { registraEvento } from './storicoService.js';
import type { AttivitaDto, AttivitaTutteDto, FilmDto, LibroDto, LibriDto, TipoLettura } from '../../shared/types.js';

interface RigaAttivita { chiave: string; ordine: number; nome: string; tipo: string; luogo: string; luogo_chiave: string | null; fascia: string | null; costo: number | null; sblocco: string | null; doti_json: string; altri_effetti: string | null; regole: string; premi: string | null; paga: string | null; fonte: string; verificato: number }
interface RigaLibro { chiave: string; ordine: number; nome: string; nome_it: string | null; dove: string; prezzo: number | null; disponibile_dal: string | null; dote: string | null; note: number | null; sblocca: string | null; sessioni: number | null; dettagli: string | null; fonte: string; verificato: number }
interface RigaFilm { chiave: string; ordine: number; nome: string; nome_it: string | null; dove: 'cinema' | 'dvd'; periodo: string; dote: string | null; note: number | null; prezzo: number | null; dettagli: string | null; fonte: string; verificato: number }
interface RigaPosizioneLibro { libro_chiave: string; tipo: LibroDto['posizioni'][number]['tipo']; chiave: string; etichetta: string }

const attivitaDto = (r: RigaAttivita): AttivitaDto => ({
  chiave: r.chiave, nome: r.nome, tipo: r.tipo as AttivitaDto['tipo'], luogo: r.luogo, luogoChiave: r.luogo_chiave, fascia: r.fascia as AttivitaDto['fascia'], costo: r.costo, sblocco: r.sblocco,
  doti: JSON.parse(r.doti_json) as AttivitaDto['doti'], altriEffetti: r.altri_effetti, regole: r.regole, premi: r.premi, paga: r.paga, fonte: r.fonte, verificato: r.verificato === 1,
});
interface StatoLetture { fatti: Set<string>; progressiLibri: Map<string, number> }
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
const filmDto = (r: RigaFilm, fatti: Set<string>): FilmDto => ({
  chiave: r.chiave, nome: r.nome, nomeIt: r.nome_it, dove: r.dove, periodo: r.periodo, dote: r.dote as FilmDto['dote'], note: r.note, prezzo: r.prezzo, dettagli: r.dettagli, fonte: r.fonte, verificato: r.verificato === 1, fatto: fatti.has(`film/${r.chiave}`),
});

function letturePartita(partitaId: number | undefined): StatoLetture {
  if (partitaId === undefined) return { fatti: new Set(), progressiLibri: new Map() };
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const fatti = new Set((prepared('SELECT tipo, chiave FROM lettura_partita WHERE partita_id = ?').all(partitaId) as Array<{ tipo: string; chiave: string }>).map((r) => `${r.tipo}/${r.chiave}`));
  const progressiLibri = new Map((prepared('SELECT libro_chiave, avanzamento FROM progresso_libro_partita WHERE partita_id = ?').all(partitaId) as Array<{ libro_chiave: string; avanzamento: number }>).map((r) => [r.libro_chiave, r.avanzamento]));
  return { fatti, progressiLibri };
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

/** Attività, lavori, libri e film; con partita, libri letti e film visti. */
export function attivitaTutte(partitaId?: number): AttivitaTutteDto {
  const stato = letturePartita(partitaId);
  const attivita = (prepared('SELECT * FROM attivita ORDER BY ordine').all() as RigaAttivita[]).map(attivitaDto);
  const libri = elencoLibri(partitaId);
  const film = (prepared('SELECT * FROM film ORDER BY ordine').all() as RigaFilm[]).map((r) => filmDto(r, stato.fatti));
  return { attivita: attivita.filter((a) => a.tipo !== 'lavoro'), lavori: attivita.filter((a) => a.tipo === 'lavoro'), libri, film, libriLetti: libri.filter((l) => l.fatto).length, filmVisti: film.filter((f) => f.fatto).length };
}

/** Segna (o toglie) un libro letto / film visto nella partita; evento alla prima spunta. */
export function impostaLettura(partitaId: number, tipo: TipoLettura, chiave: string, modifica: { fatto: boolean } | { avanzamento: number }): LibroDto | FilmDto {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const riga = (tipo === 'libro' ? prepared('SELECT * FROM libro WHERE chiave = ?').get(chiave) : prepared('SELECT * FROM film WHERE chiave = ?').get(chiave)) as RigaLibro | RigaFilm | undefined;
  if (!riga) throw httpErrors.notFound('lettura-non-trovata', `${tipo === 'libro' ? 'Il libro' : 'Il film'} '${chiave}' non esiste.`);
  const adesso = nowIso();
  const totale = tipo === 'libro' ? totaleLibro(riga as RigaLibro) : 1;
  const richiesto = 'avanzamento' in modifica ? modifica.avanzamento : modifica.fatto ? totale : 0;
  if (!Number.isInteger(richiesto) || richiesto < 0 || richiesto > totale) throw httpErrors.badRequest('avanzamento-non-valido', `L'avanzamento deve essere un intero fra 0 e ${totale}.`);
  getDb().transaction(() => {
    const era = !!prepared('SELECT 1 FROM lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ?').get(partitaId, tipo, chiave);
    if (tipo === 'libro') {
      if (richiesto > 0) prepared('INSERT INTO progresso_libro_partita (partita_id, libro_chiave, avanzamento, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, libro_chiave) DO UPDATE SET avanzamento = excluded.avanzamento, updated_at = excluded.updated_at').run(partitaId, chiave, richiesto, adesso);
      else prepared('DELETE FROM progresso_libro_partita WHERE partita_id = ? AND libro_chiave = ?').run(partitaId, chiave);
    }
    const completo = richiesto === totale;
    if (completo) prepared('INSERT INTO lettura_partita (partita_id, tipo, chiave, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, tipo, chiave) DO UPDATE SET updated_at = excluded.updated_at').run(partitaId, tipo, chiave, adesso);
    else prepared('DELETE FROM lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ?').run(partitaId, tipo, chiave);
    if (completo && !era) {
      const dote = riga.dote ? ` · Dote: ${riga.dote}${riga.note ? ` (${riga.note} ${riga.note === 1 ? 'nota' : 'note'})` : ''}` : '';
      registraEvento(partitaId, 'lettura', `${tipo === 'libro' ? 'Libro letto' : 'Film visto'}: ${riga.nome_it ?? riga.nome}`, `${tipo === 'libro' ? (riga as RigaLibro).dove : (riga as RigaFilm).dove === 'cinema' ? 'Cinema' : 'DVD'}${dote}.`, { tipo, chiave });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  const stato = letturePartita(partitaId);
  return tipo === 'libro' ? libroDto(riga as RigaLibro, stato, posizioniLibri()) : filmDto(riga as RigaFilm, stato.fatti);
}
