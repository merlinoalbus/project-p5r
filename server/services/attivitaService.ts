// ============================================================
// attivitaService — attività del tempo libero, lavori, libri e film con effetti sulle Doti e letture per partita (Fase 8.1)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { registraEvento } from './storicoService.js';
import type { AttivitaDto, AttivitaTutteDto, FilmDto, LibroDto, TipoLettura } from '../../shared/types.js';

interface RigaAttivita { chiave: string; ordine: number; nome: string; tipo: string; luogo: string; luogo_chiave: string | null; fascia: string | null; costo: number | null; sblocco: string | null; doti_json: string; altri_effetti: string | null; regole: string; premi: string | null; paga: string | null; fonte: string; verificato: number }
interface RigaLibro { chiave: string; ordine: number; nome: string; nome_it: string | null; dove: string; prezzo: number | null; disponibile_dal: string | null; dote: string | null; note: number | null; sblocca: string | null; sessioni: number | null; dettagli: string | null; fonte: string; verificato: number }
interface RigaFilm { chiave: string; ordine: number; nome: string; nome_it: string | null; dove: 'cinema' | 'dvd'; periodo: string; dote: string | null; note: number | null; prezzo: number | null; dettagli: string | null; fonte: string; verificato: number }

const attivitaDto = (r: RigaAttivita): AttivitaDto => ({
  chiave: r.chiave, nome: r.nome, tipo: r.tipo as AttivitaDto['tipo'], luogo: r.luogo, luogoChiave: r.luogo_chiave, fascia: r.fascia as AttivitaDto['fascia'], costo: r.costo, sblocco: r.sblocco,
  doti: JSON.parse(r.doti_json) as AttivitaDto['doti'], altriEffetti: r.altri_effetti, regole: r.regole, premi: r.premi, paga: r.paga, fonte: r.fonte, verificato: r.verificato === 1,
});
const libroDto = (r: RigaLibro, fatti: Set<string>): LibroDto => ({
  chiave: r.chiave, nome: r.nome, nomeIt: r.nome_it, dove: r.dove, prezzo: r.prezzo, disponibileDal: r.disponibile_dal, dote: r.dote as LibroDto['dote'], note: r.note, sblocca: r.sblocca, sessioni: r.sessioni, dettagli: r.dettagli, fonte: r.fonte, verificato: r.verificato === 1, fatto: fatti.has(`libro/${r.chiave}`),
});
const filmDto = (r: RigaFilm, fatti: Set<string>): FilmDto => ({
  chiave: r.chiave, nome: r.nome, nomeIt: r.nome_it, dove: r.dove, periodo: r.periodo, dote: r.dote as FilmDto['dote'], note: r.note, prezzo: r.prezzo, dettagli: r.dettagli, fonte: r.fonte, verificato: r.verificato === 1, fatto: fatti.has(`film/${r.chiave}`),
});

function letturePartita(partitaId: number | undefined): Set<string> {
  if (partitaId === undefined) return new Set();
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  return new Set((prepared('SELECT tipo, chiave FROM lettura_partita WHERE partita_id = ?').all(partitaId) as Array<{ tipo: string; chiave: string }>).map((r) => `${r.tipo}/${r.chiave}`));
}

/** Attività, lavori, libri e film; con partita, libri letti e film visti. */
export function attivitaTutte(partitaId?: number): AttivitaTutteDto {
  const fatti = letturePartita(partitaId);
  const attivita = (prepared('SELECT * FROM attivita ORDER BY ordine').all() as RigaAttivita[]).map(attivitaDto);
  const libri = (prepared('SELECT * FROM libro ORDER BY ordine').all() as RigaLibro[]).map((r) => libroDto(r, fatti));
  const film = (prepared('SELECT * FROM film ORDER BY ordine').all() as RigaFilm[]).map((r) => filmDto(r, fatti));
  return { attivita: attivita.filter((a) => a.tipo !== 'lavoro'), lavori: attivita.filter((a) => a.tipo === 'lavoro'), libri, film, libriLetti: libri.filter((l) => l.fatto).length, filmVisti: film.filter((f) => f.fatto).length };
}

/** Segna (o toglie) un libro letto / film visto nella partita; evento alla prima spunta. */
export function impostaLettura(partitaId: number, tipo: TipoLettura, chiave: string, fatto: boolean): LibroDto | FilmDto {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const riga = (tipo === 'libro' ? prepared('SELECT * FROM libro WHERE chiave = ?').get(chiave) : prepared('SELECT * FROM film WHERE chiave = ?').get(chiave)) as RigaLibro | RigaFilm | undefined;
  if (!riga) throw httpErrors.notFound('lettura-non-trovata', `${tipo === 'libro' ? 'Il libro' : 'Il film'} '${chiave}' non esiste.`);
  const adesso = nowIso();
  getDb().transaction(() => {
    const era = !!prepared('SELECT 1 FROM lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ?').get(partitaId, tipo, chiave);
    if (fatto) prepared('INSERT INTO lettura_partita (partita_id, tipo, chiave, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, tipo, chiave) DO UPDATE SET updated_at = excluded.updated_at').run(partitaId, tipo, chiave, adesso);
    else prepared('DELETE FROM lettura_partita WHERE partita_id = ? AND tipo = ? AND chiave = ?').run(partitaId, tipo, chiave);
    if (fatto && !era) {
      const dote = riga.dote ? ` · Dote: ${riga.dote}${riga.note ? ` (${riga.note} ${riga.note === 1 ? 'nota' : 'note'})` : ''}` : '';
      registraEvento(partitaId, 'lettura', `${tipo === 'libro' ? 'Libro letto' : 'Film visto'}: ${riga.nome_it ?? riga.nome}`, `${tipo === 'libro' ? (riga as RigaLibro).dove : (riga as RigaFilm).dove === 'cinema' ? 'Cinema' : 'DVD'}${dote}.`, { tipo, chiave });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  const fatti = new Set(fatto ? [`${tipo}/${chiave}`] : []);
  return tipo === 'libro' ? libroDto(riga as RigaLibro, fatti) : filmDto(riga as RigaFilm, fatti);
}
