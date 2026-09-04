// ============================================================
// cicliSalvatiService — cicli di fusione salvati per partita: anelli validati, anello corrente, iterazioni (Fase 5.5)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { t } from './traduzioniService.js';
import { registraEvento } from './storicoService.js';
import { contestoDa, personaOErrore, scontoPartita } from './fusione/fusioneService.js';
import { fondi } from './fusione/motoreFusione.js';
import { prezzoEvocazione } from './fusione/alberoFusione.js';
import { bonusLivelliFusione, prezzoScontato } from '../../shared/bonusVelluto.js';
import type { AnelloCicloDto, CicloSalvatoDto, PersonaFusioneDto } from '../../shared/types.js';

interface RigaCiclo { id: number; partita_id: number; persona_id: number; nome: string; note: string; anelli_json: string; costo: number; iterazioni: number; anello_corrente: number; created_at: string; updated_at: string; persona_nome: string; arcana: string }

const SQL_CICLO = 'SELECT c.*, p.nome AS persona_nome, p.arcana FROM ciclo_salvato c JOIN persona p ON p.id = c.persona_id';

/** Anello come arriva dal client: solo gli id, tutto il resto viene ricalcolato. */
export interface AnelloInput { ingredienteId: number; partnerId: number; risultatoId: number; partnerModo?: 'scorta' | 'registro' | 'cattura' }

export interface DatiCiclo { personaId: number; anelli: AnelloInput[]; nome?: string; note?: string }
export interface ModificaCiclo { nome?: string; note?: string; anelloCorrente?: number; iterazioni?: number }

function personaDto(id: number): PersonaFusioneDto {
  const p = personaOErrore(id);
  return { id: p.id, nome: p.nome, nomeIt: t('persona', p.nome), arcana: p.arcana, arcanaNome: t('arcana', p.arcana), livello: p.livello, speciale: p.speciale, rara: p.rara, dlc: p.dlc };
}

function rangoArcana(partitaId: number, arcana: string): number {
  return (prepared('SELECT MAX(COALESCE(cp.rango, 0)) AS r FROM confidente c LEFT JOIN confidente_partita cp ON cp.confidente_chiave = c.chiave AND cp.partita_id = ? WHERE c.arcana = ?').get(partitaId, arcana) as { r: number | null }).r ?? 0;
}

/** Ricalcola e valida gli anelli: fusioni valide, catena continua, ritorno al bersaglio, lunghezza 2–5. */
export function anelliValidati(partitaId: number, personaId: number, input: AnelloInput[]): AnelloCicloDto[] {
  if (input.length < 2 || input.length > 5) throw httpErrors.badRequest('ciclo-non-valido', 'Un ciclo ha da 2 a 5 anelli.');
  const { ctx } = contestoDa({ partitaId });
  const registro = new Set((prepared('SELECT persona_id FROM compendio_partita WHERE partita_id = ? AND registrata = 1').all(partitaId) as Array<{ persona_id: number }>).map((r) => r.persona_id));
  const scorta = new Set((prepared('SELECT persona_id FROM persona_posseduta WHERE partita_id = ?').all(partitaId) as Array<{ persona_id: number }>).map((r) => r.persona_id));
  const rangoMatto = rangoArcana(partitaId, 'Fool');
  const sconto = scontoPartita(partitaId).sconto;
  const out: AnelloCicloDto[] = [];
  let corrente = personaId;
  input.forEach((a, i) => {
    if (a.ingredienteId !== corrente) throw httpErrors.badRequest('ciclo-non-valido', `L'anello ${i + 1} non parte dal risultato dell'anello precedente.`);
    const ing = personaOErrore(a.ingredienteId);
    const partner = personaOErrore(a.partnerId);
    const r = fondi(ing, partner, ctx);
    if (!r || r.risultato.id !== a.risultatoId) throw httpErrors.badRequest('ciclo-non-valido', `L'anello ${i + 1} (${t('persona', ing.nome)} + ${t('persona', partner.nome)}) non produce ${t('persona', personaOErrore(a.risultatoId).nome)} in questa partita.`);
    const modo: AnelloCicloDto['partnerModo'] = registro.has(partner.id) ? 'registro' : scorta.has(partner.id) ? 'scorta' : 'cattura';
    const rango = rangoArcana(partitaId, r.risultato.arcana);
    const bonus = bonusLivelliFusione(rangoMatto, rango);
    out.push({ ingrediente: personaDto(ing.id), partner: personaDto(partner.id), partnerModo: modo, partnerCosto: modo === 'registro' ? prezzoScontato(prezzoEvocazione(partner), sconto) : 0, risultato: personaDto(r.risultato.id), tipo: r.tipo, bonusLivelli: { min: bonus.min, max: bonus.max }, rangoArcano: rango });
    corrente = r.risultato.id;
  });
  if (corrente !== personaId) throw httpErrors.badRequest('ciclo-non-valido', 'L\'ultimo anello deve rigenerare la Persona di partenza.');
  return out;
}

function cicloDto(r: RigaCiclo): CicloSalvatoDto {
  const anelli = JSON.parse(r.anelli_json) as AnelloCicloDto[];
  const corrente = Math.min(r.anello_corrente, anelli.length - 1);
  const a = anelli[corrente];
  const possedute = prepared('SELECT id, persona_id FROM persona_posseduta WHERE partita_id = ?').all(r.partita_id) as Array<{ id: number; persona_id: number }>;
  const poss = (personaId: number) => possedute.find((p) => p.persona_id === personaId)?.id ?? null;
  const registrato = !!prepared('SELECT 1 FROM compendio_partita WHERE partita_id = ? AND persona_id = ? AND registrata = 1').get(r.partita_id, a.partner.id);
  const ingredientePossedutaId = poss(a.ingrediente.id);
  const partnerPossedutaId = poss(a.partner.id);
  return {
    id: r.id, personaId: r.persona_id, nome: r.persona_nome, nomeIt: t('persona', r.persona_nome), arcanaNome: t('arcana', r.arcana), titolo: r.nome, note: r.note,
    anelli, costo: r.costo, lunghezza: anelli.length, iterazioni: r.iterazioni, anelloCorrente: corrente,
    avanzamento: { ingredientePossedutaId, partnerPossedutaId, partnerRegistrato: registrato, eseguibile: ingredientePossedutaId !== null && partnerPossedutaId !== null && ingredientePossedutaId !== partnerPossedutaId },
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function riga(partitaId: number, id: number): RigaCiclo {
  const r = prepared(`${SQL_CICLO} WHERE c.id = ? AND c.partita_id = ?`).get(id, partitaId) as RigaCiclo | undefined;
  if (!r) throw httpErrors.notFound('ciclo-non-trovato', `Il ciclo ${id} non esiste in questa partita.`);
  return r;
}

function verificaPartita(partitaId: number): void {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
}

export function cicliSalvati(partitaId: number): CicloSalvatoDto[] {
  verificaPartita(partitaId);
  return (prepared(`${SQL_CICLO} WHERE c.partita_id = ? ORDER BY c.id DESC`).all(partitaId) as RigaCiclo[]).map(cicloDto);
}

export function salvaCiclo(partitaId: number, dati: DatiCiclo): CicloSalvatoDto {
  verificaPartita(partitaId);
  const anelli = anelliValidati(partitaId, dati.personaId, dati.anelli);
  const costo = anelli.reduce((s, a) => s + a.partnerCosto, 0);
  const adesso = nowIso();
  const nomeIt = t('persona', personaOErrore(dati.personaId).nome);
  return getDb().transaction(() => {
    const info = prepared('INSERT INTO ciclo_salvato (partita_id, persona_id, nome, note, anelli_json, costo, iterazioni, anello_corrente, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)')
      .run(partitaId, dati.personaId, dati.nome ?? `Ciclo per ${nomeIt}`, dati.note ?? '', JSON.stringify(anelli), costo, adesso, adesso);
    const id = Number(info.lastInsertRowid);
    registraEvento(partitaId, 'ciclo-salvato', `Ciclo di fusione salvato: ${nomeIt}`, `${anelli.length} anelli: ${anelli.map((a) => `${a.ingrediente.nomeIt} + ${a.partner.nomeIt} → ${a.risultato.nomeIt}`).join('; ')}.`, { cicloId: id }, dati.personaId);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    return cicloDto(riga(partitaId, id));
  })();
}

export function aggiornaCiclo(partitaId: number, id: number, dati: ModificaCiclo): CicloSalvatoDto {
  verificaPartita(partitaId);
  const r = riga(partitaId, id);
  const lunghezza = (JSON.parse(r.anelli_json) as AnelloCicloDto[]).length;
  if (dati.anelloCorrente !== undefined && (dati.anelloCorrente < 0 || dati.anelloCorrente >= lunghezza)) throw httpErrors.badRequest('anello-non-valido', `L'anello corrente va da 0 a ${lunghezza - 1}.`);
  const adesso = nowIso();
  prepared('UPDATE ciclo_salvato SET nome = ?, note = ?, anello_corrente = ?, iterazioni = ?, updated_at = ? WHERE id = ?').run(dati.nome ?? r.nome, dati.note ?? r.note, dati.anelloCorrente ?? r.anello_corrente, dati.iterazioni ?? r.iterazioni, adesso, id);
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  return cicloDto(riga(partitaId, id));
}

/** Segna eseguito l'anello corrente: passa al successivo; al ritorno sul bersaglio conta un'iterazione e registra l'evento. */
export function avanzaCiclo(partitaId: number, id: number): CicloSalvatoDto {
  verificaPartita(partitaId);
  const r = riga(partitaId, id);
  const anelli = JSON.parse(r.anelli_json) as AnelloCicloDto[];
  const prossimo = (r.anello_corrente + 1) % anelli.length;
  const completata = prossimo === 0;
  const adesso = nowIso();
  return getDb().transaction(() => {
    prepared('UPDATE ciclo_salvato SET anello_corrente = ?, iterazioni = ?, updated_at = ? WHERE id = ?').run(prossimo, r.iterazioni + (completata ? 1 : 0), adesso, id);
    const a = anelli[r.anello_corrente];
    registraEvento(partitaId, completata ? 'ciclo-iterazione' : 'ciclo-anello', completata ? `Ciclo «${r.nome}»: iterazione ${r.iterazioni + 1} completata` : `Ciclo «${r.nome}»: anello ${r.anello_corrente + 1}/${anelli.length}`,
      `${a.ingrediente.nomeIt} + ${a.partner.nomeIt} → ${a.risultato.nomeIt}.`, { cicloId: id, anello: r.anello_corrente, iterazioni: r.iterazioni + (completata ? 1 : 0) }, a.risultato.id);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    return cicloDto(riga(partitaId, id));
  })();
}

export function eliminaCiclo(partitaId: number, id: number): void {
  verificaPartita(partitaId);
  const info = prepared('DELETE FROM ciclo_salvato WHERE id = ? AND partita_id = ?').run(id, partitaId);
  if (info.changes === 0) throw httpErrors.notFound('ciclo-non-trovato', `Il ciclo ${id} non esiste in questa partita.`);
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
}
