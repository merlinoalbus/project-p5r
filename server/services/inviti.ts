// ============================================================
// inviti — gli inviti dei Confidenti e il gesto «Invito avvenuto» (L6 «Condizioni uniche», lotti/L6/modifiche.md §1)
// ============================================================
//
// Un invito («X ti ha chiesto di uscire») è un dato del Confidente (`confidente_invito`, cambiato solo dalla sua pagina, R9-07c) che apre
// un posto; nella partita è un evento (`utente.invito_partita`). Decisioni dell'utente (2026-10-20): l'evento nasce dal gesto diretto
// «Invito avvenuto» (con «Annulla») dalla pagina del Confidente o del posto che apre, oppure, da L10, dalla spunta della voce del diario.
// Si registra **solo con le condizioni vere** sullo stato della partita al momento del gesto (non sulla data): altrimenti 409
// `invito-non-possibile` con quel che manca.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { statoDisponibilitaPartita, type StatoDisponibilita } from './disponibilitaService.js';
import { invitiCheAprono, tuttiGliInviti, type RigaInvito } from './condizioni/condizioneEffettiva.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { cosaManca, valutaInsieme } from './condizioni/valutatore.js';
import { casaDelLuogo } from './luoghiService.js';
import { descriviRequisitoSpillo, leggiCondizioniSalvate } from '../../shared/condizioniSpillo.js';
import type { InvitoDto, PostoApertoDto } from '../../shared/types.js';

/** Il posto che un invito apre, con il nome e la pagina. */
function postoAperto(r: RigaInvito): PostoApertoDto {
  if (r.apre_tipo === 'luogo') {
    const l = prepared('SELECT nome FROM luogo WHERE chiave = ?').get(r.apre_chiave) as { nome: string } | undefined;
    return { tipo: 'luogo', chiave: r.apre_chiave, nome: l?.nome ?? r.apre_chiave, casa: l ? casaDelLuogo(r.apre_chiave) : null };
  }
  if (r.apre_tipo === 'quartiere') {
    const q = prepared('SELECT nome FROM quartiere WHERE chiave = ?').get(r.apre_chiave) as { nome: string } | undefined;
    return { tipo: 'quartiere', chiave: r.apre_chiave, nome: q?.nome ?? r.apre_chiave, casa: q ? `/guida/citta/${r.apre_chiave}` : null };
  }
  const a = prepared('SELECT a.nome, a.slug, a.quartiere_chiave FROM area a WHERE a.chiave = ?').get(r.apre_chiave) as { nome: string; slug: string; quartiere_chiave: string | null } | undefined;
  return { tipo: 'area', chiave: r.apre_chiave, nome: a?.nome ?? r.apre_chiave, casa: a?.quartiere_chiave ? `/guida/citta/${a.quartiere_chiave}/${a.slug}` : null };
}

/** Il DTO di un invito; con lo stato della partita anche se si può registrare adesso, che cosa manca e se è registrato. */
function invitoDto(r: RigaInvito, st: StatoDisponibilita | null): InvitoDto {
  const nomi = nomiCondizioniMemo();
  const condizioni = leggiCondizioniSalvate(r.condizioni_json);
  const confidenteNome = (prepared('SELECT nome FROM confidente WHERE chiave = ?').get(r.confidente_chiave) as { nome: string } | undefined)?.nome ?? r.confidente_chiave;
  let possibile: boolean | null = null;
  let manca: string | null = null;
  if (st) {
    const esito = valutaInsieme(condizioni.map((c) => ({ ...c, testo: descriviRequisitoSpillo(c, nomi) })), st);
    possibile = esito.stato !== 'bloccato';
    manca = possibile ? null : cosaManca(condizioni.length === 1 ? condizioni[0] : { tipo: 'gruppo', modo: 'tutte', condizioni }, st, nomi);
  }
  return {
    chiave: r.chiave, confidente: r.confidente_chiave, confidenteNome, data: r.data, apre: postoAperto(r),
    condizioni, condizioniTesto: condizioni.map((c) => descriviRequisitoSpillo(c, nomi)),
    possibile, manca, registrato: st ? (st.invitiRegistrati?.has(r.chiave) ?? false) : null,
    nota: r.nota, fonte: r.fonte,
  };
}

/** Gli inviti, filtrati per Confidente o per posto aperto (un quartiere comprende i suoi luoghi e le sue Aree); con la partita, col loro stato. */
export function elencaInviti(filtro: { confidente?: string; apreTipo?: RigaInvito['apre_tipo']; apreChiave?: string }, partitaId?: number): InvitoDto[] {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const tutti = tuttiGliInviti();
  let righe = tutti;
  if (filtro.confidente) righe = righe.filter((r) => r.confidente_chiave === filtro.confidente);
  if (filtro.apreTipo && filtro.apreChiave) { const k = new Set(invitiCheAprono(filtro.apreTipo, filtro.apreChiave, tutti).map((r) => r.chiave)); righe = righe.filter((r) => k.has(r.chiave)); }
  const st = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId);
  return righe.map((r) => invitoDto(r, st));
}

/** Gli inviti di un Confidente (senza stato della partita): il DTO del Confidente. */
export function invitiDelConfidente(confidente: string): InvitoDto[] {
  return elencaInviti({ confidente });
}

/** La riga di un invito, o 404. */
function rigaInvito(chiave: string): RigaInvito {
  const r = tuttiGliInviti().find((x) => x.chiave === chiave);
  if (!r) throw httpErrors.notFound('invito-non-trovato', 'Invito non trovato.');
  return r;
}

/** «Invito avvenuto»: registra l'invito nella partita, solo con le condizioni vere adesso (409 `invito-non-possibile` con quel che manca).
 *  Già registrato: niente da fare. `voceUid` è la voce del diario che lo registra (L10); il gesto diretto non ne ha. */
export function registraInvito(partitaId: number, chiave: string, voceUid: string | null = null): InvitoDto {
  verificaPartita(partitaId);
  const r = rigaInvito(chiave);
  const st = statoDisponibilitaPartita(partitaId);
  const dto = invitoDto(r, st);
  if (dto.registrato) return dto;
  if (!dto.possibile) throw httpErrors.conflict('invito-non-possibile', `Non ancora possibile: manca ${dto.manca ?? 'una condizione dell’invito'}.`, { manca: dto.manca, condizioni: dto.condizioniTesto });
  getDb().transaction(() => {
    const adesso = nowIso();
    prepared('INSERT OR IGNORE INTO invito_partita (partita_id, invito_chiave, voce_uid, creato_il) VALUES (?, ?, ?, ?)').run(partitaId, chiave, voceUid, adesso);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return invitoDto(r, statoDisponibilitaPartita(partitaId));
}

/** «Annulla»: toglie l'invito dalla partita. Con `voceUid` (la spunta del diario tolta, L10) solo se l'aveva scritto quella voce. */
export function annullaInvito(partitaId: number, chiave: string, voceUid: string | null = null): InvitoDto {
  verificaPartita(partitaId);
  const r = rigaInvito(chiave);
  getDb().transaction(() => {
    const tolte = voceUid === null
      ? prepared('DELETE FROM invito_partita WHERE partita_id = ? AND invito_chiave = ?').run(partitaId, chiave).changes
      : prepared('DELETE FROM invito_partita WHERE partita_id = ? AND invito_chiave = ? AND voce_uid = ?').run(partitaId, chiave, voceUid).changes;
    if (tolte) prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
  })();
  return invitoDto(r, statoDisponibilitaPartita(partitaId));
}
