// ============================================================
// operazioniVellutoService — esecuzione dalla scorta di fusione (Ghigliottina), Forca e Isolamento (Fase 5.4)
// ============================================================
//
// Ogni operazione modifica la scorta in una sola transazione, registra un evento nello storico e verifica gli obiettivi.
// I valori non deterministici (livello raggiunto con la Forca, ripartizione dei punti casuali) li indica l'utente:
// l'app propone i valori attesi dalle regole di `shared/bonusVelluto.ts` ma non inventa numeri.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { t } from './traduzioniService.js';
import { skillDto } from './compendioService.js';
import { registraEvento } from './storicoService.js';
import { aggiungiPosseduta, personePossedute, skillInnateFinoAlLivello } from './partiteService.js';
import { verificaObiettivi } from './obiettiviService.js';
import { contestoDa, ingredienteDa, personaOErrore } from './fusione/fusioneService.js';
import { fondi, ricettaSpeciale, type RicettaFusione } from './fusione/motoreFusione.js';
import { analisiEredita } from './fusione/eredita.js';
import { CHIAVI_STATISTICHE, type Statistiche } from '../../shared/statistiche.js';
import { FORCA_INCIDENTE_BONUS, INCENSI, bonusLivelliFusione, guadagnoIncenso, moltiplicatoreForca, puntiAllarmeFusione, tierResistenza } from '../../shared/bonusVelluto.js';
import type { AnteprimaFusioneDto, EsitoForcaDto, EsitoFusioneScortaDto, EsitoIsolamentoDto, PersonaPossedutaDto, SkillRiassuntoDto } from '../../shared/types.js';

interface RigaScorta { id: number; persona_id: number; livello: number; forza: number | null; magia: number | null; resistenza: number | null; agilita: number | null; fortuna: number | null; carica: number; nome: string; arcana: string; livello_base: number; rara: number }

function possedutaOErrore(partitaId: number, possedutaId: number): RigaScorta {
  const r = prepared(`SELECT pp.id, pp.persona_id, pp.livello, pp.forza, pp.magia, pp.resistenza, pp.agilita, pp.fortuna, pp.carica, p.nome, p.arcana, p.livello AS livello_base, p.rara
    FROM persona_posseduta pp JOIN persona p ON p.id = pp.persona_id WHERE pp.id = ? AND pp.partita_id = ?`).get(possedutaId, partitaId) as RigaScorta | undefined;
  if (!r) throw httpErrors.notFound('posseduta-non-trovata', `La Persona posseduta ${possedutaId} non è nella scorta di questa partita.`);
  return r;
}

function skillDi(possedutaId: number): number[] {
  return (prepared('SELECT skill_id FROM persona_posseduta_skill WHERE posseduta_id = ? ORDER BY slot').all(possedutaId) as Array<{ skill_id: number }>).map((x) => x.skill_id);
}

function rangoArcana(partitaId: number, arcana: string): number {
  return (prepared('SELECT MAX(COALESCE(cp.rango, 0)) AS r FROM confidente c LEFT JOIN confidente_partita cp ON cp.confidente_chiave = c.chiave AND cp.partita_id = ? WHERE c.arcana = ?').get(partitaId, arcana) as { r: number | null }).r ?? 0;
}

function partitaInfo(partitaId: number): { allarme: boolean; livelloProtagonista: number } {
  const r = prepared('SELECT allarme_attivo, livello_protagonista FROM partita WHERE id = ?').get(partitaId) as { allarme_attivo: number; livello_protagonista: number } | undefined;
  if (!r) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  return { allarme: r.allarme_attivo === 1, livelloProtagonista: r.livello_protagonista };
}

function possedutaDto(partitaId: number, id: number): PersonaPossedutaDto {
  const p = personePossedute(partitaId).find((x) => x.id === id);
  if (!p) throw httpErrors.notFound('posseduta-non-trovata', `La Persona posseduta ${id} non esiste.`);
  return p;
}

// ---- Fusione dalla scorta ----

/** Ricetta della fusione fra gli esemplari posseduti (due → `fondi`; tre o più → ricetta speciale del risultato indicato). */
function ricettaDagliEsemplari(partitaId: number, esemplari: RigaScorta[], risultatoId: number | undefined): RicettaFusione {
  const { ctx } = contestoDa({ partitaId });
  const persone = esemplari.map((e) => personaOErrore(e.persona_id));
  if (esemplari.length === 2) {
    const r = fondi(persone[0], persone[1], ctx);
    if (!r) throw httpErrors.badRequest('fusione-impossibile', `${t('persona', persone[0].nome)} e ${t('persona', persone[1].nome)} non producono alcuna Persona.`);
    if (risultatoId !== undefined && r.risultato.id !== risultatoId) throw httpErrors.badRequest('risultato-incoerente', `Questa coppia produce ${t('persona', r.risultato.nome)}, non la Persona indicata.`);
    return r;
  }
  if (risultatoId === undefined) throw httpErrors.badRequest('risultato-richiesto', 'Con tre o più ingredienti indica la Persona risultato della ricetta speciale.');
  const target = personaOErrore(risultatoId);
  const speciale = ricettaSpeciale(target, ctx);
  if (!speciale) throw httpErrors.badRequest('fusione-impossibile', `${t('persona', target.nome)} non ha una ricetta speciale disponibile in questa partita.`);
  const attesi = speciale.ingredienti.map((p) => p.id).sort((x, y) => x - y);
  const dati = persone.map((p) => p.id).sort((x, y) => x - y);
  if (attesi.length !== dati.length || attesi.some((id, i) => id !== dati[i])) {
    throw httpErrors.badRequest('ingredienti-incoerenti', `La ricetta speciale di ${t('persona', target.nome)} richiede: ${speciale.ingredienti.map((p) => t('persona', p.nome)).join(', ')}.`);
  }
  return speciale;
}

/** Anteprima: risultato, livello suggerito (base + bonus del Confidente), skill ereditabili e slot, tratti. */
export function anteprimaFusione(partitaId: number, possedutaIds: number[], risultatoId?: number): AnteprimaFusioneDto {
  const info = partitaInfo(partitaId);
  const esemplari = possedutaIds.map((id) => possedutaOErrore(partitaId, id));
  if (new Set(possedutaIds).size !== possedutaIds.length) throw httpErrors.badRequest('ingredienti-duplicati', 'Lo stesso esemplare compare più volte.');
  const ricetta = ricettaDagliEsemplari(partitaId, esemplari, risultatoId);
  const ingredienti = esemplari.map((e) => ingredienteDa(personaOErrore(e.persona_id), partitaId, e.livello));
  const an = analisiEredita(ricetta.risultato, ingredienti);
  const rangoMatto = rangoArcana(partitaId, 'Fool');
  const rango = rangoArcana(partitaId, ricetta.risultato.arcana);
  const bonus = bonusLivelliFusione(rangoMatto, rango);
  const slotDisponibili = info.allarme ? an.slot : an.slotScelti;
  const skillInnate = skillInnateFinoAlLivello(ricetta.risultato.id, ricetta.risultato.livello + bonus.min);
  const cariche = esemplari.filter((e) => e.carica === 1).length;
  return {
    risultato: { id: ricetta.risultato.id, nome: ricetta.risultato.nome, nomeIt: t('persona', ricetta.risultato.nome), arcana: ricetta.risultato.arcana, arcanaNome: t('arcana', ricetta.risultato.arcana), livello: ricetta.risultato.livello, speciale: ricetta.risultato.speciale, rara: ricetta.risultato.rara, dlc: ricetta.risultato.dlc },
    tipo: ricetta.tipo,
    ingredienti: esemplari.map((e) => ({ possedutaId: e.id, personaId: e.persona_id, nome: e.nome, nomeIt: t('persona', e.nome), livello: e.livello, carica: e.carica === 1 })),
    cariche,
    livelloBase: ricetta.risultato.livello,
    bonusLivelli: { min: bonus.min, max: bonus.max, rangoMatto, rangoArcano: rango, affidabilita: bonus.affidabilita },
    livelloSuggerito: Math.min(99, ricetta.risultato.livello + bonus.min),
    sopraProtagonista: ricetta.risultato.livello > info.livelloProtagonista,
    allarme: info.allarme,
    puntiAllarme: info.allarme ? puntiAllarmeFusione(cariche) : 0,
    rischioIncidente: info.allarme && cariche > 0,
    slot: an.slot,
    slotScelti: slotDisponibili,
    candidate: an.candidate.map((c) => ({ ...(skillDto(c.id) as SkillRiassuntoDto), da: c.da, ereditabile: c.ereditabile, giaAppresa: c.giaAppresa, motivo: c.motivo })),
    tratti: an.tratti.map((x) => ({ id: x.skill.id, nome: x.skill.nome, nomeIt: t('skill', x.skill.nome), da: x.da })),
    skillInnate: skillInnate.map((id) => skillDto(id)).filter((s): s is SkillRiassuntoDto => s !== null),
  };
}

export interface DatiFusioneScorta {
  possedutaIds: number[];
  risultatoId?: number;
  /** Skill ereditate scelte (fra le candidate ereditabili), al massimo `slotScelti` (tutti gli slot con l'Allarme). */
  skillIds?: number[];
  trattoSkillId?: number | null;
  /** Livello di partenza osservato in gioco (default: base + bonus minimo). */
  livello?: number;
  /** Statistiche osservate (con l'Allarme il gioco aggiunge punti casuali): se assenti restano stimate. */
  statistiche?: Statistiche | null;
  note?: string;
}

/** Esegue la fusione: rimuove gli ingredienti, aggiunge il risultato con skill innate + ereditate, registra l'evento. */
export function eseguiFusione(partitaId: number, dati: DatiFusioneScorta): EsitoFusioneScortaDto {
  const anteprima = anteprimaFusione(partitaId, dati.possedutaIds, dati.risultatoId);
  const scelte = dati.skillIds ?? [];
  if (new Set(scelte).size !== scelte.length) throw httpErrors.badRequest('skill-duplicata', 'La stessa skill compare più volte.');
  if (scelte.length > anteprima.slotScelti) throw httpErrors.badRequest('troppe-skill', `Puoi scegliere al massimo ${anteprima.slotScelti} skill da ereditare${anteprima.allarme ? '' : ' (una la assegna il gioco)'}.`);
  for (const id of scelte) {
    const c = anteprima.candidate.find((x) => x.id === id);
    if (!c) throw httpErrors.badRequest('skill-non-candidata', `La skill ${id} non è fra quelle degli ingredienti.`);
    if (!c.ereditabile) throw httpErrors.badRequest('skill-non-ereditabile', `${c.nomeIt}: ${c.motivo ?? 'non ereditabile'}.`);
  }
  if (dati.trattoSkillId && !anteprima.tratti.some((x) => x.id === dati.trattoSkillId)) throw httpErrors.badRequest('tratto-non-valido', 'Il tratto scelto non appartiene al risultato né agli ingredienti.');
  const livello = Math.min(99, Math.max(anteprima.livelloBase, dati.livello ?? anteprima.livelloSuggerito));
  const innate = skillInnateFinoAlLivello(anteprima.risultato.id, livello);
  // Le ereditate hanno la precedenza; le innate più recenti riempiono fino a 8 slot.
  const skillIds = [...scelte];
  for (const id of [...innate].reverse()) if (skillIds.length < 8 && !skillIds.includes(id)) skillIds.push(id);
  const skillFinali = [...scelte, ...skillIds.filter((id) => !scelte.includes(id)).sort((x, y) => innate.indexOf(x) - innate.indexOf(y))];
  const adesso = nowIso();
  return getDb().transaction(() => {
    const rimosse = anteprima.ingredienti.map((i) => ({ possedutaId: i.possedutaId, personaId: i.personaId, nomeIt: i.nomeIt, livello: i.livello }));
    for (const i of anteprima.ingredienti) prepared('DELETE FROM persona_posseduta WHERE id = ? AND partita_id = ?').run(i.possedutaId, partitaId);
    // Un esemplare della stessa specie già in scorta impedirebbe l'inserimento: la fusione lo sostituisce.
    const doppione = prepared('SELECT id FROM persona_posseduta WHERE partita_id = ? AND persona_id = ?').get(partitaId, anteprima.risultato.id) as { id: number } | undefined;
    if (doppione) throw httpErrors.conflict('persona-gia-posseduta', `${anteprima.risultato.nomeIt} è già nella scorta: rimuovila o usala prima di fondere un altro esemplare.`);
    const risultato = aggiungiPosseduta(partitaId, anteprima.risultato.id, {
      livello, skillIds: skillFinali, trattoSkillId: dati.trattoSkillId ?? null, statistiche: dati.statistiche ?? null, note: dati.note ?? '', carica: anteprima.allarme,
      origine: `fusione ${anteprima.tipo === 'speciale' ? 'speciale' : anteprima.tipo === 'tesoro' ? 'con Demone del Tesoro' : anteprima.tipo === 'stesso-arcano' ? 'stesso arcano' : 'normale'}${anteprima.allarme ? ' durante l\'Allarme' : ''}`,
    });
    const nomiEreditate = scelte.map((id) => anteprima.candidate.find((c) => c.id === id)?.nomeIt ?? String(id));
    registraEvento(partitaId, 'fusione-eseguita', `Fusione: ${rimosse.map((r) => r.nomeIt).join(' + ')} → ${anteprima.risultato.nomeIt}`,
      `Livello ${livello} (base ${anteprima.livelloBase}${anteprima.bonusLivelli.max > 0 ? `, bonus Confidente +${anteprima.bonusLivelli.min}–${anteprima.bonusLivelli.max}` : ''})${nomiEreditate.length ? ` · ereditate: ${nomiEreditate.join(', ')}` : ''}${anteprima.allarme ? ` · Allarme (+${anteprima.puntiAllarme} punti casuali, Persona carica)` : ''}.`,
      { ingredienti: rimosse, risultatoId: anteprima.risultato.id, possedutaId: risultato.id, livello, skillEreditate: scelte, tipo: anteprima.tipo, allarme: anteprima.allarme }, anteprima.risultato.id);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    return { risultato: possedutaDto(partitaId, risultato.id), rimosse, anteprima };
  })();
}

// ---- Forca ----

export interface DatiForca {
  riceventeId: number;
  sacrificioId: number;
  /** Livello raggiunto dal ricevente dopo l'esecuzione (osservato in gioco); default: invariato. */
  nuovoLivello?: number;
  /** Skill trasferite dal sacrificio (1, fino a 3 con l'Allarme). */
  skillTrasferiteIds?: number[];
  /** Skill da dimenticare per far posto (se gli 8 slot sono pieni). */
  skillRimosseIds?: number[];
  /** Incidente (Allarme): nessuna EXP, punti statistica garantiti indicati dall'utente. */
  incidente?: boolean;
  /** Punti statistica aggiunti (incidente o distribuzione osservata dei level-up). */
  puntiStatistica?: Partial<Statistiche>;
}

/** Esegue la Forca: rimuove il sacrificio, aggiorna livello/skill/statistiche del ricevente, registra l'evento con i moltiplicatori. */
export function eseguiForca(partitaId: number, dati: DatiForca): EsitoForcaDto {
  const info = partitaInfo(partitaId);
  if (dati.riceventeId === dati.sacrificioId) throw httpErrors.badRequest('forca-stesso-esemplare', 'Il sacrificio deve essere un esemplare diverso dal ricevente.');
  const ric = possedutaOErrore(partitaId, dati.riceventeId);
  const sac = possedutaOErrore(partitaId, dati.sacrificioId);
  const rango = rangoArcana(partitaId, ric.arcana);
  const igorMax = rangoArcana(partitaId, 'Fool') >= 10;
  const esito = moltiplicatoreForca({ rangoConfidente: rango, igorMax, stessaArcana: sac.arcana === ric.arcana, tesoro: sac.rara === 1, allarme: info.allarme, penalitaLivello: sac.livello > ric.livello });
  const cariche = (sac.carica === 1 ? 1 : 0) + (ric.carica === 1 ? 1 : 0);
  const puntiGarantiti = cariche >= 2 ? FORCA_INCIDENTE_BONUS.entrambeCariche : cariche === 1 ? FORCA_INCIDENTE_BONUS.unaPersonaCarica : FORCA_INCIDENTE_BONUS.sacrificioNormale;
  const trasferite = dati.skillTrasferiteIds ?? [];
  const maxTrasferite = info.allarme ? 3 : 1;
  if (dati.incidente && trasferite.length > 0) throw httpErrors.badRequest('incidente-senza-skill', 'Con l\'incidente non si trasferiscono skill.');
  if (trasferite.length > maxTrasferite) throw httpErrors.badRequest('troppe-skill', `Si trasferiscono al massimo ${maxTrasferite} skill${info.allarme ? ' con l\'Allarme' : ''}.`);
  const skillSac = skillDi(sac.id);
  for (const id of trasferite) if (!skillSac.includes(id)) throw httpErrors.badRequest('skill-non-del-sacrificio', `La skill ${id} non appartiene al sacrificio.`);
  const skillRic = skillDi(ric.id);
  const rimosse = dati.skillRimosseIds ?? [];
  for (const id of rimosse) if (!skillRic.includes(id)) throw httpErrors.badRequest('skill-non-del-ricevente', `La skill ${id} non appartiene al ricevente.`);
  const nuovoLivello = Math.min(99, Math.max(ric.livello, dati.nuovoLivello ?? ric.livello));
  if (dati.incidente && nuovoLivello !== ric.livello) throw httpErrors.badRequest('incidente-senza-livelli', 'Con l\'incidente il ricevente non guadagna livelli.');
  const nuove = trasferite.filter((id) => !skillRic.includes(id));
  const skillFinali = [...skillRic.filter((id) => !rimosse.includes(id)), ...nuove];
  if (skillFinali.length > 8) throw httpErrors.badRequest('troppe-skill', `Il ricevente avrebbe ${skillFinali.length} skill: scegli ${skillFinali.length - 8} skill da dimenticare.`);
  const punti = dati.puntiStatistica ?? {};
  const totalePunti = sommaPunti(punti);
  const adesso = nowIso();
  return getDb().transaction(() => {
    prepared('DELETE FROM persona_posseduta WHERE id = ? AND partita_id = ?').run(sac.id, partitaId);
    // Statistiche: se l'utente indica punti, si parte dai valori attuali (registrati o stimati) e si sommano.
    if (totalePunti > 0) {
      const attuali = possedutaDto(partitaId, ric.id).statistiche;
      const nuove: Statistiche = { ...attuali };
      for (const k of CHIAVI_STATISTICHE) nuove[k] = Math.min(99, attuali[k] + (punti[k] ?? 0));
      prepared('UPDATE persona_posseduta SET forza = ?, magia = ?, resistenza = ?, agilita = ?, fortuna = ? WHERE id = ?').run(nuove.forza, nuove.magia, nuove.resistenza, nuove.agilita, nuove.fortuna, ric.id);
    }
    prepared('UPDATE persona_posseduta SET livello = ?, updated_at = ? WHERE id = ?').run(nuovoLivello, adesso, ric.id);
    prepared('DELETE FROM persona_posseduta_skill WHERE posseduta_id = ?').run(ric.id);
    skillFinali.forEach((sid, i) => prepared('INSERT INTO persona_posseduta_skill (posseduta_id, slot, skill_id) VALUES (?, ?, ?)').run(ric.id, i + 1, sid));
    if (nuovoLivello !== ric.livello) {
      prepared(`INSERT INTO compendio_partita (partita_id, persona_id, registrata, livello_registrato, updated_at) VALUES (?, ?, 1, ?, ?)
        ON CONFLICT(partita_id, persona_id) DO UPDATE SET livello_registrato = MAX(COALESCE(compendio_partita.livello_registrato, 0), excluded.livello_registrato), updated_at = excluded.updated_at`).run(partitaId, ric.persona_id, nuovoLivello, adesso);
    }
    const nomiSkill = nuove.map((id) => skillDto(id)?.nomeIt ?? String(id));
    registraEvento(partitaId, 'forca', `Forca: ${t('persona', sac.nome)} sacrificata per ${t('persona', ric.nome)}`,
      dati.incidente
        ? `Incidente: nessuna EXP, +${totalePunti} punti statistica.`
        : `EXP ×${esito.moltiplicatore.toLocaleString('it-IT')}${nuovoLivello !== ric.livello ? ` · livello ${ric.livello} → ${nuovoLivello}` : ''}${nomiSkill.length ? ` · trasferite: ${nomiSkill.join(', ')}` : ''}${totalePunti > 0 ? ` · +${totalePunti} punti` : ''}.`,
      { riceventeId: ric.id, sacrificio: { personaId: sac.persona_id, livello: sac.livello }, moltiplicatore: esito.moltiplicatore, fattori: esito.fattori, incidente: dati.incidente === true, da: ric.livello, a: nuovoLivello, skillTrasferite: trasferite, punti }, ric.persona_id);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    verificaObiettivi(partitaId, ric.persona_id);
    return { ricevente: possedutaDto(partitaId, ric.id), sacrificio: { personaId: sac.persona_id, nomeIt: t('persona', sac.nome), livello: sac.livello, carica: sac.carica === 1 }, moltiplicatore: esito.moltiplicatore, fattori: esito.fattori, interpolato: esito.interpolato, incidente: dati.incidente === true, puntiGarantiti };
  })();
}

function sommaPunti(p: Partial<Statistiche>): number {
  return CHIAVI_STATISTICHE.reduce((s, k) => s + Math.max(0, p[k] ?? 0), 0);
}

// ---- Isolamento ----

const ELEMENTO_SKILL: Record<string, string | null> = { phys: 'Phys', gun: null, fire: 'Fire', ice: 'Ice', electric: 'Elec', wind: 'Wind', psy: 'Psy', nuclear: 'Nuke', bless: 'Bless', curse: 'Curse' };

/** Skill di resistenza che la Persona ottiene in isolamento (tier dal livello, elemento dalla prima debolezza), se esiste nel dataset. */
export function skillResistenzaIsolamento(personaId: number, livello: number): { elemento: string | null; skill: SkillRiassuntoDto | null; tier: string } {
  const tier = tierResistenza(livello);
  const deb = prepared("SELECT elemento FROM persona_affinita WHERE persona_id = ? AND codice = 'wk' ORDER BY elemento").all(personaId) as Array<{ elemento: string }>;
  for (const d of deb) {
    const suffisso = ELEMENTO_SKILL[d.elemento];
    if (!suffisso) continue;
    const s = prepared('SELECT id FROM skill WHERE nome = ?').get(`${tier.chiave} ${suffisso}`) as { id: number } | undefined;
    if (s) return { elemento: d.elemento, skill: skillDto(s.id), tier: tier.chiave };
  }
  return { elemento: deb[0]?.elemento ?? null, skill: null, tier: tier.chiave };
}

export interface DatiIsolamento {
  possedutaId: number;
  incenso?: string;
  giorni: number;
  /** Statistiche interessate dall'incenso (una per quello base, due per i Musk, tre per il Rasta). */
  statistiche?: Array<keyof Statistiche>;
  /** Skill di resistenza appresa (default: quella calcolata da debolezza e livello); null = nessuna. */
  skillResistenzaId?: number | null;
  skillRimossaId?: number | null;
}

/** Registra un ciclo di isolamento: statistiche dall'incenso e skill di resistenza. */
export function eseguiIsolamento(partitaId: number, dati: DatiIsolamento): EsitoIsolamentoDto {
  const info = partitaInfo(partitaId);
  const p = possedutaOErrore(partitaId, dati.possedutaId);
  const incenso = dati.incenso ? INCENSI.find((i) => i.chiave === dati.incenso) : undefined;
  if (dati.incenso && !incenso) throw httpErrors.badRequest('incenso-non-valido', `Incenso «${dati.incenso}» sconosciuto.`);
  const stat = dati.statistiche ?? [];
  if (incenso && stat.length !== incenso.statistiche) throw httpErrors.badRequest('statistiche-incenso', `L'incenso «${incenso.nome}» agisce su ${incenso.statistiche} ${incenso.statistiche === 1 ? 'statistica' : 'statistiche'}: indicane esattamente ${incenso.statistiche}.`);
  for (const k of stat) if (!(CHIAVI_STATISTICHE as readonly string[]).includes(k)) throw httpErrors.badRequest('statistica-non-valida', `Statistica «${String(k)}» sconosciuta.`);
  const guadagno = incenso ? guadagnoIncenso(incenso, dati.giorni, info.allarme) : { applicazioni: 0, puntiPerStatistica: 0, totale: 0 };
  const suggerita = skillResistenzaIsolamento(p.persona_id, p.livello);
  const skillId = dati.skillResistenzaId === undefined ? suggerita.skill?.id ?? null : dati.skillResistenzaId;
  if (skillId !== null && !prepared('SELECT 1 FROM skill WHERE id = ?').get(skillId)) throw httpErrors.notFound('skill-non-trovata', `La skill ${skillId} non esiste.`);
  const skillAttuali = skillDi(p.id);
  const rimossa = dati.skillRimossaId ?? null;
  if (rimossa !== null && !skillAttuali.includes(rimossa)) throw httpErrors.badRequest('skill-non-del-ricevente', 'La skill da dimenticare non appartiene alla Persona.');
  const finali = [...skillAttuali.filter((id) => id !== rimossa)];
  if (skillId !== null && !finali.includes(skillId)) finali.push(skillId);
  if (finali.length > 8) throw httpErrors.badRequest('troppe-skill', 'La Persona ha già 8 skill: indica quale dimenticare per apprendere la resistenza.');
  const adesso = nowIso();
  return getDb().transaction(() => {
    const attuali = possedutaDto(partitaId, p.id).statistiche;
    const nuove: Statistiche = { ...attuali };
    for (const k of stat) nuove[k] = Math.min(99, attuali[k] + guadagno.puntiPerStatistica);
    if (guadagno.puntiPerStatistica > 0) prepared('UPDATE persona_posseduta SET forza = ?, magia = ?, resistenza = ?, agilita = ?, fortuna = ? WHERE id = ?').run(nuove.forza, nuove.magia, nuove.resistenza, nuove.agilita, nuove.fortuna, p.id);
    prepared('UPDATE persona_posseduta SET updated_at = ? WHERE id = ?').run(adesso, p.id);
    prepared('DELETE FROM persona_posseduta_skill WHERE posseduta_id = ?').run(p.id);
    finali.forEach((sid, i) => prepared('INSERT INTO persona_posseduta_skill (posseduta_id, slot, skill_id) VALUES (?, ?, ?)').run(p.id, i + 1, sid));
    const nomeSkill = skillId !== null ? skillDto(skillId)?.nomeIt ?? null : null;
    registraEvento(partitaId, 'isolamento', `Isolamento: ${t('persona', p.nome)} per ${dati.giorni} ${dati.giorni === 1 ? 'giorno' : 'giorni'}`,
      [incenso ? `${incenso.nome}: +${guadagno.puntiPerStatistica} a ${stat.join(', ')}${info.allarme ? ' (Allarme ×2)' : ''}` : 'senza incenso', nomeSkill ? `appresa ${nomeSkill}` : 'nessuna skill di resistenza'].join(' · ') + '.',
      { possedutaId: p.id, incenso: incenso?.chiave ?? null, giorni: dati.giorni, statistiche: stat, punti: guadagno.puntiPerStatistica, skillId, allarme: info.allarme }, p.persona_id);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    verificaObiettivi(partitaId, p.persona_id);
    return { persona: possedutaDto(partitaId, p.id), guadagno, skillAppresa: skillId !== null ? skillDto(skillId) : null, elementoDebolezza: suggerita.elemento };
  })();
}
