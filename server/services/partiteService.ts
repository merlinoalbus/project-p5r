// ============================================================
// partiteService — partite multiple e tracking (Doti, Confidenti, compendio, Persona possedute)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { CHIAVI_STATISTICHE, statistichePerLivello, type Statistiche } from '../../shared/statistiche.js';
import { t } from './traduzioniService.js';
import { skillDto } from './compendioService.js';
import { registraEvento } from './storicoService.js';
import { verificaObiettivi } from './obiettiviService.js';
import { semaforiConfidente, statoPartitaSemafori, type StatoPartitaSemafori } from './semaforiService.js';
import type {
  CompendioPartitaDto, ConfidentePartitaDto, Difficolta, DoteSocialePartitaDto, ModificaConfidente, ModificaDote, PartitaDto, PersonaPossedutaDto, RangoDoteDto,
  SemaforiRangoDto,
} from '../../shared/types.js';

interface RigaPartita {
  id: number; nome: string; note: string; attiva: number; livello_protagonista: number; data_gioco: string | null; difficolta: Difficolta;
  nuova_partita_plus: number; dlc_posseduti_json: string; allarme_attivo: number; created_at: string; updated_at: string;
}

function partitaDto(r: RigaPartita): PartitaDto {
  return {
    id: r.id, nome: r.nome, note: r.note, attiva: r.attiva === 1, livelloProtagonista: r.livello_protagonista, dataGioco: r.data_gioco,
    difficolta: r.difficolta, nuovaPartitaPlus: r.nuova_partita_plus === 1, dlcPosseduti: JSON.parse(r.dlc_posseduti_json) as number[],
    allarmeAttivo: r.allarme_attivo === 1, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function rigaPartita(id: number): RigaPartita {
  const r = prepared('SELECT * FROM partita WHERE id = ?').get(id) as RigaPartita | undefined;
  if (!r) throw httpErrors.notFound('partita-non-trovata', `La partita ${id} non esiste.`);
  return r;
}

// ---- Partite ----

export function elencaPartite(): PartitaDto[] {
  return (prepared('SELECT * FROM partita ORDER BY attiva DESC, updated_at DESC').all() as RigaPartita[]).map(partitaDto);
}

export function partitaAttiva(): PartitaDto | null {
  const r = prepared('SELECT * FROM partita WHERE attiva = 1').get() as RigaPartita | undefined;
  return r ? partitaDto(r) : null;
}

export function leggiPartita(id: number): PartitaDto {
  return partitaDto(rigaPartita(id));
}

/** Campi modificabili di una partita. */
export interface DatiPartita {
  nome?: string;
  note?: string;
  livelloProtagonista?: number;
  dataGioco?: string | null;
  difficolta?: Difficolta;
  nuovaPartitaPlus?: boolean;
  dlcPosseduti?: number[];
  allarmeAttivo?: boolean;
}

/** Crea una partita; se è la prima (o `attiva` è richiesto) diventa attiva. */
/** Primo giorno del percorso della guida ('MM-GG'): giorno corrente predefinito di una nuova partita. */
function primoGiornoDelGioco(): string | null {
  return (prepared('SELECT data FROM giorno_percorso ORDER BY ordine LIMIT 1').get() as { data: string } | undefined)?.data ?? null;
}

export function creaPartita(dati: DatiPartita & { nome: string; attiva?: boolean }): PartitaDto {
  const db = getDb();
  return db.transaction(() => {
    const adesso = nowIso();
    const nessuna = (prepared('SELECT COUNT(*) AS n FROM partita').get() as { n: number }).n === 0;
    const attiva = dati.attiva || nessuna;
    if (attiva) prepared('UPDATE partita SET attiva = 0 WHERE attiva = 1').run();
    const info = prepared(`INSERT INTO partita (nome, note, attiva, livello_protagonista, data_gioco, difficolta, nuova_partita_plus, dlc_posseduti_json, allarme_attivo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      dati.nome, dati.note ?? '', attiva ? 1 : 0, dati.livelloProtagonista ?? 1, dati.dataGioco ?? primoGiornoDelGioco(), dati.difficolta ?? 'normale',
      dati.nuovaPartitaPlus ? 1 : 0, JSON.stringify(dati.dlcPosseduti ?? []), dati.allarmeAttivo ? 1 : 0, adesso, adesso,
    );
    const id = Number(info.lastInsertRowid);
    // Doti sociali a zero e Confidenti non sbloccati: righe esplicite così il tracking parte completo.
    for (const d of prepared('SELECT chiave FROM dote_sociale').all() as Array<{ chiave: string }>) {
      prepared('INSERT INTO dote_sociale_partita (partita_id, dote_chiave, punti, updated_at) VALUES (?, ?, 0, ?)').run(id, d.chiave, adesso);
    }
    for (const c of prepared('SELECT chiave FROM confidente').all() as Array<{ chiave: string }>) {
      prepared('INSERT INTO confidente_partita (partita_id, confidente_chiave, sbloccato, rango, note, updated_at) VALUES (?, ?, 0, 0, \'\', ?)').run(id, c.chiave, adesso);
    }
    registraEvento(id, 'partita-creata', `Partita «${dati.nome}» creata`, `Difficoltà ${dati.difficolta ?? 'normale'}${dati.nuovaPartitaPlus ? ', Nuova Partita +' : ''}, protagonista al livello ${dati.livelloProtagonista ?? 1}.`, { livelloProtagonista: dati.livelloProtagonista ?? 1 });
    return partitaDto(rigaPartita(id));
  })();
}

export function aggiornaPartita(id: number, dati: DatiPartita): PartitaDto {
  const r = rigaPartita(id);
  return getDb().transaction(() => {
    prepared(`UPDATE partita SET nome = ?, note = ?, livello_protagonista = ?, data_gioco = ?, difficolta = ?, nuova_partita_plus = ?, dlc_posseduti_json = ?, allarme_attivo = ?, updated_at = ? WHERE id = ?`).run(
      dati.nome ?? r.nome, dati.note ?? r.note, dati.livelloProtagonista ?? r.livello_protagonista,
      dati.dataGioco === undefined ? r.data_gioco : dati.dataGioco, dati.difficolta ?? r.difficolta,
      dati.nuovaPartitaPlus === undefined ? r.nuova_partita_plus : dati.nuovaPartitaPlus ? 1 : 0,
      dati.dlcPosseduti ? JSON.stringify(dati.dlcPosseduti) : r.dlc_posseduti_json,
      dati.allarmeAttivo === undefined ? r.allarme_attivo : dati.allarmeAttivo ? 1 : 0, nowIso(), id,
    );
    if (dati.livelloProtagonista !== undefined && dati.livelloProtagonista !== r.livello_protagonista) {
      registraEvento(id, 'livello-protagonista', `Protagonista al livello ${dati.livelloProtagonista}`, `Da ${r.livello_protagonista} a ${dati.livelloProtagonista}.`, { da: r.livello_protagonista, a: dati.livelloProtagonista });
    }
    if (dati.allarmeAttivo !== undefined && (dati.allarmeAttivo ? 1 : 0) !== r.allarme_attivo) {
      registraEvento(id, 'allarme', dati.allarmeAttivo ? 'Allarme delle fusioni attivo' : 'Allarme delle fusioni terminato', '', { attivo: dati.allarmeAttivo });
    }
    return partitaDto(rigaPartita(id));
  })();
}

export function attivaPartita(id: number): PartitaDto {
  rigaPartita(id);
  getDb().transaction(() => {
    prepared('UPDATE partita SET attiva = 0 WHERE attiva = 1').run();
    prepared('UPDATE partita SET attiva = 1, updated_at = ? WHERE id = ?').run(nowIso(), id);
  })();
  return partitaDto(rigaPartita(id));
}

export function eliminaPartita(id: number): void {
  const r = rigaPartita(id);
  getDb().transaction(() => {
    prepared('DELETE FROM partita WHERE id = ?').run(id);
    if (r.attiva === 1) {
      // Promuove la partita più recente, se ne resta una.
      const altra = prepared('SELECT id FROM partita ORDER BY updated_at DESC LIMIT 1').get() as { id: number } | undefined;
      if (altra) prepared('UPDATE partita SET attiva = 1 WHERE id = ?').run(altra.id);
    }
  })();
}

// ---- Doti sociali ----

/** Punti per numero di note (stadio normale); 3 note da libro = 7; ×1,5 arrotondato per difetto. */
export function puntiDaNote(note: 1 | 2 | 3, libro = false, fortuna = false): number {
  const base = note === 1 ? 2 : note === 2 ? 3 : libro ? 7 : 5;
  return fortuna ? Math.floor(base * 1.5) : base;
}

function ranghiDote(chiave: string): RangoDoteDto[] {
  return (prepared('SELECT rango, nome, soglia FROM dote_sociale_rango WHERE dote_chiave = ? ORDER BY rango').all(chiave) as Array<{ rango: number; nome: string; soglia: number }>)
    .map((r) => ({ rango: r.rango, nome: t('rangoDote', `${chiave}/${r.rango}`), soglia: r.soglia }));
}

/** Rango raggiunto con `punti` e distanza dal successivo. */
export function progressoDote(punti: number, ranghi: RangoDoteDto[]): { rango: number; nomeRango: string; sogliaProssima: number | null; mancanti: number | null } {
  let attuale = ranghi[0] ?? { rango: 1, nome: '', soglia: 0 };
  for (const r of ranghi) if (punti >= r.soglia) attuale = r;
  const prossimo = ranghi.find((r) => r.rango === attuale.rango + 1) ?? null;
  return { rango: attuale.rango, nomeRango: attuale.nome, sogliaProssima: prossimo?.soglia ?? null, mancanti: prossimo ? prossimo.soglia - punti : null };
}

export function dotiSociali(partitaId: number): DoteSocialePartitaDto[] {
  rigaPartita(partitaId);
  return (prepared(`SELECT d.chiave, d.nome, d.ordine, COALESCE(dp.punti, 0) AS punti, dp.updated_at
    FROM dote_sociale d LEFT JOIN dote_sociale_partita dp ON dp.dote_chiave = d.chiave AND dp.partita_id = ? ORDER BY d.ordine`).all(partitaId) as Array<{ chiave: string; nome: string; ordine: number; punti: number; updated_at: string | null }>)
    .map((d) => {
      const ranghi = ranghiDote(d.chiave);
      return { chiave: d.chiave, nome: t('doteSociale', d.chiave), ordine: d.ordine, punti: d.punti, ...progressoDote(d.punti, ranghi), ranghi, updatedAt: d.updated_at };
    });
}

/** Imposta (`punti`), incrementa (`delta`) o aggiunge le `note` visualizzate in gioco; mai sotto zero. */
export function aggiornaDote(partitaId: number, chiave: string, mod: ModificaDote): DoteSocialePartitaDto {
  rigaPartita(partitaId);
  const dote = prepared('SELECT chiave FROM dote_sociale WHERE chiave = ?').get(chiave);
  if (!dote) throw httpErrors.notFound('dote-non-trovata', `La dote sociale '${chiave}' non esiste.`);
  const attuale = (prepared('SELECT punti FROM dote_sociale_partita WHERE partita_id = ? AND dote_chiave = ?').get(partitaId, chiave) as { punti: number } | undefined)?.punti ?? 0;
  const incremento = mod.note !== undefined ? puntiDaNote(mod.note, mod.libro, mod.fortuna) : (mod.delta ?? 0);
  const nuovo = Math.max(0, mod.punti !== undefined ? mod.punti : attuale + incremento);
  const ranghi = ranghiDote(chiave);
  const prima = progressoDote(attuale, ranghi);
  const dopo = progressoDote(nuovo, ranghi);
  return getDb().transaction(() => {
    prepared('INSERT INTO dote_sociale_partita (partita_id, dote_chiave, punti, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, dote_chiave) DO UPDATE SET punti = excluded.punti, updated_at = excluded.updated_at').run(partitaId, chiave, nuovo, nowIso());
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
    if (dopo.rango !== prima.rango) {
      registraEvento(partitaId, 'dote-rango', `${t('doteSociale', chiave)}: rango ${dopo.rango} «${dopo.nomeRango}»`, `Da «${prima.nomeRango}» (rango ${prima.rango}) con ${nuovo} punti.`, { dote: chiave, da: prima.rango, a: dopo.rango, punti: nuovo });
    }
    return dotiSociali(partitaId).find((d) => d.chiave === chiave)!;
  })();
}

// ---- Confidenti ----

/** Arrotonda ai centesimi (5 × 1,5 × 1,2 = 9; 7,5 resta 7,5): evita residui binari. */
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Punti Confidente come nel gioco: ogni risposta vale 5/10/15 punti base (1–3 note), un regalo gradito 50,
 * un'uscita senza salto di rango 10; moltiplicatori cumulativi: Persona dello stesso arcano ×1,5,
 * esami (primo ×1,5, top 10 ×1,2), invito accettato subito via SMS ×1,2.
 */
export function puntiConfidente(mod: ModificaConfidente): number {
  const base = mod.regalo ? 50 : mod.uscita ? 10 : mod.noteRisposta !== undefined ? mod.noteRisposta * 5 : 0;
  const molt = (mod.bonusArcano ? 1.5 : 1) * (mod.esame === 'primo' ? 1.5 : mod.esame === 'top10' ? 1.2 : 1) * (mod.invito ? 1.2 : 1);
  return round2(base * molt);
}

export function confidenti(partitaId: number): ConfidentePartitaDto[] {
  rigaPartita(partitaId);
  return (prepared(`SELECT c.chiave, c.nome, c.arcana, c.ordine, COALESCE(cp.sbloccato, 0) AS sbloccato, COALESCE(cp.rango, 0) AS rango, COALESCE(cp.punti, 0) AS punti,
      COALESCE(cp.note, '') AS note, cp.updated_at, cr.punti_necessari,
      EXISTS (SELECT 1 FROM persona_posseduta pp JOIN persona p ON p.id = pp.persona_id WHERE pp.partita_id = ? AND p.arcana = c.arcana) AS in_scorta
    FROM confidente c
    LEFT JOIN confidente_partita cp ON cp.confidente_chiave = c.chiave AND cp.partita_id = ?
    LEFT JOIN confidente_rango cr ON cr.confidente_chiave = c.chiave AND cr.rango = COALESCE(cp.rango, 0)
    ORDER BY c.ordine`).all(partitaId, partitaId) as Array<{ chiave: string; nome: string; arcana: string; ordine: number; sbloccato: number; rango: number; punti: number; note: string; updated_at: string | null; punti_necessari: number | null; in_scorta: number }>)
    .map((c) => ({
      chiave: c.chiave, nome: c.nome, arcana: c.arcana, arcanaNome: t('arcana', c.arcana), ordine: c.ordine, sbloccato: c.sbloccato === 1, rango: c.rango,
      punti: c.punti, puntiNecessari: c.rango >= 10 ? null : c.punti_necessari,
      mancanti: c.rango >= 10 || c.punti_necessari === null ? null : round2(Math.max(0, c.punti_necessari - c.punti)),
      personaArcanoInScorta: c.in_scorta === 1,
      regaliFatti: regaliFattiDi(partitaId, c.chiave),
      note: c.note, semafori: [] as SemaforiRangoDto[], updatedAt: c.updated_at,
    }))
    .map((c, _i, tutti) => { const semafori = semaforiConfidente(c.chiave, c.rango, statoSemafori(partitaId, tutti)); return { ...c, semafori, bloccato: bloccoRango(semafori, c.rango + 1) }; });
}

let cacheStato: { partitaId: number; firma: string; stato: StatoPartitaSemafori } | null = null;
/** Stato della partita per i semafori, calcolato una volta per chiamata (stessa firma dei ranghi). */
function statoSemafori(partitaId: number, confidentiPartita: Array<{ chiave: string; rango: number }>): StatoPartitaSemafori {
  const firma = `${partitaId}|${confidentiPartita.map((c) => `${c.chiave}:${c.rango}`).join(',')}|${(prepared('SELECT updated_at FROM partita WHERE id = ?').get(partitaId) as { updated_at: string } | undefined)?.updated_at ?? ''}`;
  if (cacheStato && cacheStato.partitaId === partitaId && cacheStato.firma === firma) return cacheStato.stato;
  const doti = new Map(dotiSociali(partitaId).map((d) => [d.chiave, d.rango]));
  const ranghi = new Map(confidentiPartita.map((c) => [c.chiave, c.rango]));
  const stato = statoPartitaSemafori(partitaId, ranghi, doti);
  cacheStato = { partitaId, firma, stato };
  return stato;
}

function regaliFattiDi(partitaId: number, chiave: string): string[] {
  return (prepared('SELECT regalo FROM regalo_partita WHERE partita_id = ? AND confidente_chiave = ? ORDER BY fatto_at').all(partitaId, chiave) as Array<{ regalo: string }>).map((r) => r.regalo);
}

/** Segna un regalo come consegnato (o non consegnato) al Confidente nella partita. */
export function impostaRegaloFatto(partitaId: number, chiave: string, regalo: string, fatto: boolean): ConfidentePartitaDto {
  rigaPartita(partitaId);
  if (!prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(chiave)) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${chiave}' non esiste.`);
  const nome = regalo.trim();
  if (!nome) throw httpErrors.badRequest('regalo-vuoto', 'Indica il nome del regalo.');
  const adesso = nowIso();
  getDb().transaction(() => {
    if (fatto) prepared('INSERT OR IGNORE INTO regalo_partita (partita_id, confidente_chiave, regalo, fatto_at) VALUES (?, ?, ?, ?)').run(partitaId, chiave, nome, adesso);
    else prepared('DELETE FROM regalo_partita WHERE partita_id = ? AND confidente_chiave = ? AND regalo = ?').run(partitaId, chiave, nome);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return confidenti(partitaId).find((c) => c.chiave === chiave)!;
}

/** Requisiti non verdi (né confermati) del semaforo di `rango`: il Confidente è bloccato finché non lo sono tutti. */
export function bloccoRango(semafori: SemaforiRangoDto[], rango: number): { rango: number; motivi: string[] } | null {
  const sem = semafori.find((s) => s.rango === rango);
  if (!sem || sem.pronto || sem.requisiti.length === 0) return null;
  const motivi = sem.requisiti.filter((r) => r.stato !== 'verde').map((r) => (r.dettaglio ? `${r.testo} (${r.dettaglio})` : r.testo));
  return motivi.length > 0 ? { rango, motivi } : null;
}

export function aggiornaConfidente(partitaId: number, chiave: string, dati: ModificaConfidente): ConfidentePartitaDto {
  rigaPartita(partitaId);
  if (!prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(chiave)) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${chiave}' non esiste.`);
  const attuale = confidenti(partitaId).find((c) => c.chiave === chiave)!;
  const rango = dati.rango ?? attuale.rango;
  // Invariante: un rango > 0 implica lo sblocco (anche se il client manda sbloccato=false).
  const sbloccato = rango > 0 ? true : (dati.sbloccato ?? attuale.sbloccato);
  // Blocco (specifica 12.3): non si sale a un rango — né si sblocca il Confidente — finché i requisiti dei semafori non sono verdi o
  // confermati. `forza` è la via d'uscita esplicita dell'utente (requisito valutato male, partita importata): passa e resta nello storico.
  const primoRangoDaVerificare = attuale.rango + 1;
  const ultimoRangoDaVerificare = rango > attuale.rango ? rango : sbloccato && !attuale.sbloccato ? 1 : 0;
  const bloccoInfranto: Array<{ rango: number; motivi: string[] }> = [];
  for (let r = primoRangoDaVerificare; r <= ultimoRangoDaVerificare; r++) {
    const blocco = bloccoRango(attuale.semafori, r);
    if (!blocco) continue;
    if (!dati.forza) throw httpErrors.conflict('confidente-bloccato', `${attuale.nome}: rango ${r} non raggiungibile finché i requisiti non sono soddisfatti — ${blocco.motivi.join(' · ')}`, { rango: r, motivi: blocco.motivi });
    bloccoInfranto.push(blocco);
  }
  // Punti verso il rango successivo: al cambio di rango ripartono da zero (nessun riporto, come nel gioco), salvo valore esplicito.
  const incremento = (dati.deltaPunti ?? 0) + puntiConfidente(dati);
  let punti = dati.punti !== undefined ? dati.punti : rango !== attuale.rango ? 0 : attuale.punti + incremento;
  punti = round2(Math.max(0, punti));
  return getDb().transaction(() => {
    prepared(`INSERT INTO confidente_partita (partita_id, confidente_chiave, sbloccato, rango, punti, note, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(partita_id, confidente_chiave) DO UPDATE SET sbloccato = excluded.sbloccato, rango = excluded.rango, punti = excluded.punti, note = excluded.note, updated_at = excluded.updated_at`)
      .run(partitaId, chiave, sbloccato ? 1 : 0, rango, punti, dati.note ?? attuale.note, nowIso());
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
    if (sbloccato && !attuale.sbloccato) registraEvento(partitaId, 'confidente-sbloccato', `${attuale.nome} (${attuale.arcanaNome}) sbloccato`, '', { confidente: chiave });
    for (const b of bloccoInfranto) {
      registraEvento(partitaId, 'confidente-rango', `${attuale.nome}: rango ${b.rango} segnato nonostante i requisiti`, b.motivi.join(' · '), { confidente: chiave });
    }
    if (rango !== attuale.rango) {
      registraEvento(partitaId, 'confidente-rango', `${attuale.nome} (${attuale.arcanaNome}): rango ${rango}${rango === 10 ? ' — massimo' : ''}`, `Da rango ${attuale.rango}.`, { confidente: chiave, da: attuale.rango, a: rango });
    }
    return confidenti(partitaId).find((c) => c.chiave === chiave)!;
  })();
}

// ---- Compendio personale ----

interface RigaCompendio {
  persona_id: number; nome: string; arcana: string; livello: number; registrata: number; livello_registrato: number | null; updated_at: string;
  bonus_forza: number; bonus_magia: number; bonus_resistenza: number; bonus_agilita: number; bonus_fortuna: number; skill_ids_json: string | null; tratto_skill_id: number | null; carica: number;
}
const SQL_COMPENDIO = `SELECT cp.persona_id, p.nome, p.arcana, p.livello, cp.registrata, cp.livello_registrato, cp.updated_at, cp.bonus_forza, cp.bonus_magia, cp.bonus_resistenza,
  cp.bonus_agilita, cp.bonus_fortuna, cp.skill_ids_json, cp.tratto_skill_id, cp.carica FROM compendio_partita cp JOIN persona p ON p.id = cp.persona_id`;
const BONUS_ZERO: Statistiche = { forza: 0, magia: 0, resistenza: 0, agilita: 0, fortuna: 0 };
const SIGLE: Record<keyof Statistiche, string> = { forza: 'FR', magia: 'MA', resistenza: 'RS', agilita: 'AG', fortuna: 'FO' };

function sommaBonus(stima: Statistiche, bonus: Statistiche): Statistiche {
  const out = { ...stima };
  for (const k of CHIAVI_STATISTICHE) out[k] = Math.min(99, Math.max(1, stima[k] + bonus[k]));
  return out;
}

function compendioDto(r: RigaCompendio): CompendioPartitaDto {
  const skillIds = r.skill_ids_json ? (JSON.parse(r.skill_ids_json) as number[]) : [];
  return {
    personaId: r.persona_id, nome: r.nome, nomeIt: t('persona', r.nome), arcana: r.arcana, arcanaNome: t('arcana', r.arcana), livello: r.livello, registrata: r.registrata === 1, livelloRegistrato: r.livello_registrato,
    bonus: { forza: r.bonus_forza, magia: r.bonus_magia, resistenza: r.bonus_resistenza, agilita: r.bonus_agilita, fortuna: r.bonus_fortuna },
    skill: skillIds.map((id) => skillDto(id)).filter((x): x is NonNullable<typeof x> => x !== null),
    tratto: r.tratto_skill_id ? skillDto(r.tratto_skill_id) : null, carica: r.carica === 1, updatedAt: r.updated_at,
  };
}

export function compendioPartita(partitaId: number): CompendioPartitaDto[] {
  rigaPartita(partitaId);
  return (prepared(`${SQL_COMPENDIO} WHERE cp.partita_id = ? ORDER BY p.livello, p.nome`).all(partitaId) as RigaCompendio[]).map(compendioDto);
}

interface Istantanea { livello: number; bonus: Statistiche; skillIds: number[]; trattoSkillId: number | null; carica: boolean }

/** Istantanea registrata nel compendio (null se la Persona non è registrata o non ha livello). */
function istantaneaCompendio(partitaId: number, personaId: number): Istantanea | null {
  const r = prepared(`${SQL_COMPENDIO} WHERE cp.partita_id = ? AND cp.persona_id = ? AND cp.registrata = 1`).get(partitaId, personaId) as RigaCompendio | undefined;
  if (!r || r.livello_registrato === null) return null;
  return {
    livello: r.livello_registrato, bonus: { forza: r.bonus_forza, magia: r.bonus_magia, resistenza: r.bonus_resistenza, agilita: r.bonus_agilita, fortuna: r.bonus_fortuna },
    skillIds: r.skill_ids_json ? (JSON.parse(r.skill_ids_json) as number[]) : [], trattoSkillId: r.tratto_skill_id, carica: r.carica === 1,
  };
}

function scriviIstantanea(partitaId: number, personaId: number, i: Istantanea, adesso: string): void {
  prepared(`INSERT INTO compendio_partita (partita_id, persona_id, registrata, livello_registrato, bonus_forza, bonus_magia, bonus_resistenza, bonus_agilita, bonus_fortuna, skill_ids_json, tratto_skill_id, carica, updated_at)
    VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(partita_id, persona_id) DO UPDATE SET registrata = 1, livello_registrato = excluded.livello_registrato, bonus_forza = excluded.bonus_forza, bonus_magia = excluded.bonus_magia,
      bonus_resistenza = excluded.bonus_resistenza, bonus_agilita = excluded.bonus_agilita, bonus_fortuna = excluded.bonus_fortuna, skill_ids_json = excluded.skill_ids_json,
      tratto_skill_id = excluded.tratto_skill_id, carica = excluded.carica, updated_at = excluded.updated_at`)
    .run(partitaId, personaId, i.livello, i.bonus.forza, i.bonus.magia, i.bonus.resistenza, i.bonus.agilita, i.bonus.fortuna, JSON.stringify(i.skillIds), i.trattoSkillId, i.carica ? 1 : 0, adesso);
}

export function aggiornaCompendio(partitaId: number, personaId: number, dati: { registrata: boolean; livelloRegistrato?: number | null }): CompendioPartitaDto[] {
  rigaPartita(partitaId);
  const persona = prepared('SELECT nome FROM persona WHERE id = ?').get(personaId) as { nome: string } | undefined;
  if (!persona) throw httpErrors.notFound('persona-non-trovata', `La Persona ${personaId} non esiste.`);
  const giaRegistrata = !!prepared('SELECT 1 FROM compendio_partita WHERE partita_id = ? AND persona_id = ? AND registrata = 1').get(partitaId, personaId);
  return getDb().transaction(() => {
    if (!dati.registrata) {
      prepared('DELETE FROM compendio_partita WHERE partita_id = ? AND persona_id = ?').run(partitaId, personaId);
    } else {
      if (!giaRegistrata) registraEvento(partitaId, 'compendio-registrata', `${t('persona', persona.nome)} registrata nel compendio`, dati.livelloRegistrato ? `Al livello ${dati.livelloRegistrato}.` : '', { livello: dati.livelloRegistrato ?? null }, personaId);
      // Registrazione manuale (senza esemplare in scorta): istantanea di livello, senza bonus né skill (l'evocazione usa le innate).
      prepared(`INSERT INTO compendio_partita (partita_id, persona_id, registrata, livello_registrato, bonus_forza, bonus_magia, bonus_resistenza, bonus_agilita, bonus_fortuna, skill_ids_json, tratto_skill_id, carica, updated_at)
        VALUES (?, ?, 1, ?, 0, 0, 0, 0, 0, NULL, NULL, 0, ?)
        ON CONFLICT(partita_id, persona_id) DO UPDATE SET registrata = 1, livello_registrato = excluded.livello_registrato, updated_at = excluded.updated_at`).run(partitaId, personaId, dati.livelloRegistrato ?? null, nowIso());
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
    return compendioPartita(partitaId);
  })();
}

// ---- Persona possedute ----

interface RigaPosseduta {
  id: number; partita_id: number; persona_id: number; livello: number; forza: number | null; magia: number | null; resistenza: number | null;
  agilita: number | null; fortuna: number | null; bonus_forza: number; bonus_magia: number; bonus_resistenza: number; bonus_agilita: number; bonus_fortuna: number;
  tratto_skill_id: number | null; in_squadra: number; carica: number; note: string; created_at: string; updated_at: string;
  nome: string; arcana: string; livello_base: number; b_forza: number; b_magia: number; b_resistenza: number; b_agilita: number; b_fortuna: number; tratto_nome: string;
}

const SQL_POSSEDUTA = `SELECT pp.*, p.nome, p.arcana, p.livello AS livello_base, p.forza AS b_forza, p.magia AS b_magia, p.resistenza AS b_resistenza,
  p.agilita AS b_agilita, p.fortuna AS b_fortuna, p.tratto AS tratto_nome FROM persona_posseduta pp JOIN persona p ON p.id = pp.persona_id`;

function possedutaDto(r: RigaPosseduta): PersonaPossedutaDto {
  const trattoId = r.tratto_skill_id ?? (prepared('SELECT id FROM skill WHERE nome = ?').get(r.tratto_nome) as { id: number } | undefined)?.id ?? null;
  const skill = (prepared('SELECT slot, skill_id FROM persona_posseduta_skill WHERE posseduta_id = ? ORDER BY slot').all(r.id) as Array<{ slot: number; skill_id: number }>)
    .map((s) => ({ slot: s.slot, ...skillDto(s.skill_id)! }));
  const bonus = { forza: r.bonus_forza, magia: r.bonus_magia, resistenza: r.bonus_resistenza, agilita: r.bonus_agilita, fortuna: r.bonus_fortuna };
  const statisticheBase = CHIAVI_STATISTICHE.every((k) => bonus[k] === 0);
  const base = { forza: r.b_forza, magia: r.b_magia, resistenza: r.b_resistenza, agilita: r.b_agilita, fortuna: r.b_fortuna };
  const stimate = statistichePerLivello(base, r.livello_base, r.livello);
  return {
    id: r.id, personaId: r.persona_id, nome: r.nome, nomeIt: t('persona', r.nome), arcana: r.arcana, arcanaNome: t('arcana', r.arcana), livelloBase: r.livello_base, livello: r.livello,
    statistiche: sommaBonus(stimate, bonus),
    statisticheStimate: stimate,
    bonus,
    statisticheBase,
    statisticheBaseLivello: base, tratto: trattoId ? skillDto(trattoId) : null, inSquadra: r.in_squadra === 1, carica: r.carica === 1, note: r.note, skill, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export function personePossedute(partitaId: number): PersonaPossedutaDto[] {
  rigaPartita(partitaId);
  return (prepared(`${SQL_POSSEDUTA} WHERE pp.partita_id = ? ORDER BY pp.in_squadra DESC, pp.livello DESC, p.nome`).all(partitaId) as RigaPosseduta[]).map(possedutaDto);
}

/** Dati di una Persona posseduta (creazione/aggiornamento). */
export interface DatiPosseduta {
  livello?: number;
  /** Bonus per statistica (null = azzera). */
  bonus?: Statistiche | null;
  /** Evocazione dal Registro: livello, bonus, skill, tratto e carica non indicati vengono dall'istantanea del compendio. */
  daRegistro?: boolean;
  trattoSkillId?: number | null;
  inSquadra?: boolean;
  /** Persona «carica» (nome giallo: creata durante l'Allarme). */
  carica?: boolean;
  note?: string;
  /** Skill conosciute, in ordine di slot (max 8). */
  skillIds?: number[];
  /** Testo libero sull'origine (es. «fusione», «cattura», «Registro»): finisce nello storico. */
  origine?: string;
}

function verificaSkill(skillIds: number[] | undefined): void {
  if (!skillIds) return;
  if (skillIds.length > 8) throw httpErrors.badRequest('troppe-skill', 'Una Persona può conoscere al massimo 8 skill.');
  if (new Set(skillIds).size !== skillIds.length) throw httpErrors.badRequest('skill-duplicata', 'La stessa skill compare più volte.');
  for (const id of skillIds) if (!prepared('SELECT 1 FROM skill WHERE id = ?').get(id)) throw httpErrors.notFound('skill-non-trovata', `La skill ${id} non esiste.`);
}

export function aggiungiPosseduta(partitaId: number, personaId: number, dati: DatiPosseduta): PersonaPossedutaDto {
  rigaPartita(partitaId);
  const p = prepared('SELECT id, nome, arcana, livello FROM persona WHERE id = ?').get(personaId) as { id: number; nome: string; arcana: string; livello: number } | undefined;
  if (!p) throw httpErrors.notFound('persona-non-trovata', `La Persona ${personaId} non esiste.`);
  if (prepared('SELECT 1 FROM persona_posseduta WHERE partita_id = ? AND persona_id = ?').get(partitaId, personaId)) {
    throw httpErrors.conflict('persona-gia-posseduta', 'Questa Persona è già nella scorta della partita.');
  }
  verificaSkill(dati.skillIds);
  if (dati.trattoSkillId && !prepared("SELECT 1 FROM skill WHERE id = ? AND elemento = 'trait'").get(dati.trattoSkillId)) throw httpErrors.badRequest('tratto-non-valido', 'Il tratto indicato non è una skill di tipo tratto.');
  const adesso = nowIso();
  // Evocazione dal Registro: l'istantanea del compendio fornisce i valori non indicati.
  const ist = dati.daRegistro ? istantaneaCompendio(partitaId, personaId) : null;
  if (dati.daRegistro && !ist) throw httpErrors.badRequest('non-registrata', `${t('persona', p.nome)} non è registrata nel compendio di questa partita: non si può evocare dal Registro.`);
  const livello = dati.livello ?? ist?.livello ?? p.livello;
  const bonus = dati.bonus ?? ist?.bonus ?? BONUS_ZERO;
  const trattoSkillId = dati.trattoSkillId === undefined ? ist?.trattoSkillId ?? null : dati.trattoSkillId;
  const carica = dati.carica ?? ist?.carica ?? false;
  return getDb().transaction(() => {
    const info = prepared(`INSERT INTO persona_posseduta (partita_id, persona_id, livello, bonus_forza, bonus_magia, bonus_resistenza, bonus_agilita, bonus_fortuna, tratto_skill_id, in_squadra, carica, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(partitaId, personaId, livello, bonus.forza, bonus.magia, bonus.resistenza, bonus.agilita, bonus.fortuna,
      trattoSkillId, dati.inSquadra === false ? 0 : 1, carica ? 1 : 0, dati.note ?? '', adesso, adesso);
    const id = Number(info.lastInsertRowid);
    const skillIds = dati.skillIds ?? ist?.skillIds ?? skillInnateFinoAlLivello(personaId, livello);
    skillIds.forEach((sid, i) => prepared('INSERT INTO persona_posseduta_skill (posseduta_id, slot, skill_id) VALUES (?, ?, ?)').run(id, i + 1, sid));
    const giaRegistrata = !!prepared('SELECT 1 FROM compendio_partita WHERE partita_id = ? AND persona_id = ? AND registrata = 1').get(partitaId, personaId);
    registraEvento(partitaId, 'persona-aggiunta', `${t('persona', p.nome)} (${t('arcana', p.arcana)}) aggiunta alla scorta`, `Livello ${livello}${dati.origine ? ` · ${dati.origine}` : ''}.`, { livello, skillIds, origine: dati.origine ?? null }, personaId);
    // Ottenere una Persona la registra nel compendio (come in gioco): l'istantanea è lo stato con cui entra in scorta.
    // L'evocazione dal Registro non tocca l'istantanea (ne è la copia).
    if (!dati.daRegistro) {
      if (!giaRegistrata) registraEvento(partitaId, 'compendio-registrata', `${t('persona', p.nome)} registrata nel compendio`, `Al livello ${livello}.`, { livello }, personaId);
      scriviIstantanea(partitaId, personaId, { livello, bonus, skillIds, trattoSkillId, carica }, adesso);
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    verificaObiettivi(partitaId, personaId);
    return possedutaDto(prepared(`${SQL_POSSEDUTA} WHERE pp.id = ?`).get(id) as RigaPosseduta);
  })();
}

/** Registra (o aggiorna) nel compendio l'istantanea dell'esemplare in scorta: livello, bonus, skill, tratto, carica. */
export function registraPossedutaNelCompendio(partitaId: number, possedutaId: number): CompendioPartitaDto[] {
  rigaPartita(partitaId);
  const r = prepared(`${SQL_POSSEDUTA} WHERE pp.id = ? AND pp.partita_id = ?`).get(possedutaId, partitaId) as RigaPosseduta | undefined;
  if (!r) throw httpErrors.notFound('posseduta-non-trovata', `La Persona posseduta ${possedutaId} non esiste in questa partita.`);
  const adesso = nowIso();
  return getDb().transaction(() => {
    const skillIds = (prepared('SELECT skill_id FROM persona_posseduta_skill WHERE posseduta_id = ? ORDER BY slot').all(r.id) as Array<{ skill_id: number }>).map((x) => x.skill_id);
    const bonus = { forza: r.bonus_forza, magia: r.bonus_magia, resistenza: r.bonus_resistenza, agilita: r.bonus_agilita, fortuna: r.bonus_fortuna };
    const prima = istantaneaCompendio(partitaId, r.persona_id);
    scriviIstantanea(partitaId, r.persona_id, { livello: r.livello, bonus, skillIds, trattoSkillId: r.tratto_skill_id, carica: r.carica === 1 }, adesso);
    registraEvento(partitaId, 'compendio-registrata', `${t('persona', r.nome)} ${prima ? 'aggiornata' : 'registrata'} nel compendio`, `Al livello ${r.livello}${CHIAVI_STATISTICHE.some((k) => bonus[k] !== 0) ? ` con bonus ${CHIAVI_STATISTICHE.filter((k) => bonus[k] !== 0).map((k) => `${SIGLE[k]} ${bonus[k] > 0 ? '+' : ''}${bonus[k]}`).join(' ')}` : ''}.`, { livello: r.livello, bonus, skillIds, possedutaId: r.id }, r.persona_id);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    return compendioPartita(partitaId);
  })();
}

/** Le ultime 8 skill che la Persona ha appreso fino al livello dato (innate comprese). */
export function skillInnateFinoAlLivello(personaId: number, livello: number): number[] {
  const righe = prepared('SELECT skill_id FROM persona_skill WHERE persona_id = ? AND livello <= ? ORDER BY livello, skill_id').all(personaId, livello) as Array<{ skill_id: number }>;
  return righe.slice(-8).map((r) => r.skill_id);
}

export function aggiornaPosseduta(partitaId: number, possedutaId: number, dati: DatiPosseduta): PersonaPossedutaDto {
  rigaPartita(partitaId);
  const r = prepared(`${SQL_POSSEDUTA} WHERE pp.id = ? AND pp.partita_id = ?`).get(possedutaId, partitaId) as RigaPosseduta | undefined;
  if (!r) throw httpErrors.notFound('posseduta-non-trovata', `La Persona posseduta ${possedutaId} non esiste in questa partita.`);
  verificaSkill(dati.skillIds);
  if (dati.trattoSkillId && !prepared("SELECT 1 FROM skill WHERE id = ? AND elemento = 'trait'").get(dati.trattoSkillId)) throw httpErrors.badRequest('tratto-non-valido', 'Il tratto indicato non è una skill di tipo tratto.');
  const adesso = nowIso();
  return getDb().transaction(() => {
    const prima = { forza: r.bonus_forza, magia: r.bonus_magia, resistenza: r.bonus_resistenza, agilita: r.bonus_agilita, fortuna: r.bonus_fortuna };
    const b = dati.bonus === undefined ? prima : dati.bonus ?? BONUS_ZERO;
    prepared(`UPDATE persona_posseduta SET livello = ?, bonus_forza = ?, bonus_magia = ?, bonus_resistenza = ?, bonus_agilita = ?, bonus_fortuna = ?, tratto_skill_id = ?, in_squadra = ?, carica = ?, note = ?, updated_at = ? WHERE id = ?`).run(
      dati.livello ?? r.livello, b.forza, b.magia, b.resistenza, b.agilita, b.fortuna,
      dati.trattoSkillId === undefined ? r.tratto_skill_id : dati.trattoSkillId, dati.inSquadra === undefined ? r.in_squadra : dati.inSquadra ? 1 : 0,
      dati.carica === undefined ? r.carica : dati.carica ? 1 : 0, dati.note ?? r.note, adesso, possedutaId,
    );
    const skillPrima = (prepared('SELECT skill_id FROM persona_posseduta_skill WHERE posseduta_id = ? ORDER BY slot').all(possedutaId) as Array<{ skill_id: number }>).map((x) => x.skill_id);
    if (dati.skillIds) {
      prepared('DELETE FROM persona_posseduta_skill WHERE posseduta_id = ?').run(possedutaId);
      dati.skillIds.forEach((sid, i) => prepared('INSERT INTO persona_posseduta_skill (posseduta_id, slot, skill_id) VALUES (?, ?, ?)').run(possedutaId, i + 1, sid));
    }
    const nomeIt = t('persona', r.nome);
    if (dati.livello !== undefined && dati.livello !== r.livello) {
      registraEvento(partitaId, 'persona-livello', `${nomeIt} al livello ${dati.livello}`, `Da ${r.livello} a ${dati.livello}.`, { da: r.livello, a: dati.livello, possedutaId }, r.persona_id);
    }
    if (dati.skillIds && (dati.skillIds.length !== skillPrima.length || dati.skillIds.some((id, i) => id !== skillPrima[i]))) {
      const nuove = dati.skillIds.filter((id) => !skillPrima.includes(id)).map((id) => skillDto(id)?.nomeIt ?? String(id));
      const perse = skillPrima.filter((id) => !dati.skillIds!.includes(id)).map((id) => skillDto(id)?.nomeIt ?? String(id));
      const parti = [nuove.length ? `Apprese: ${nuove.join(', ')}` : '', perse.length ? `Dimenticate: ${perse.join(', ')}` : ''].filter(Boolean);
      registraEvento(partitaId, 'persona-skill', `${nomeIt}: skill aggiornate`, parti.length ? `${parti.join(' · ')}.` : 'Ordine degli slot cambiato.', { da: skillPrima, a: dati.skillIds, possedutaId }, r.persona_id);
    }
    if (dati.bonus !== undefined && CHIAVI_STATISTICHE.some((k) => b[k] !== prima[k])) {
      const senzaBonus = CHIAVI_STATISTICHE.every((k) => b[k] === 0);
      registraEvento(partitaId, 'persona-statistiche', `${nomeIt}: bonus ${senzaBonus ? 'azzerati' : 'aggiornati'}`,
        senzaBonus ? 'Statistiche riportate alla stima del livello.' : `${CHIAVI_STATISTICHE.map((k) => `${SIGLE[k]} ${b[k] > 0 ? '+' : ''}${b[k]}`).join(' · ')}.`, { da: prima, a: b, possedutaId }, r.persona_id);
    }
    // Il compendio NON segue i cambiamenti: come in gioco, l'istantanea si aggiorna solo con «Registra».
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    verificaObiettivi(partitaId, r.persona_id);
    return possedutaDto(prepared(`${SQL_POSSEDUTA} WHERE pp.id = ?`).get(possedutaId) as RigaPosseduta);
  })();
}

export function rimuoviPosseduta(partitaId: number, possedutaId: number, motivo?: string): void {
  rigaPartita(partitaId);
  const r = prepared(`${SQL_POSSEDUTA} WHERE pp.id = ? AND pp.partita_id = ?`).get(possedutaId, partitaId) as RigaPosseduta | undefined;
  if (!r) throw httpErrors.notFound('posseduta-non-trovata', `La Persona posseduta ${possedutaId} non esiste in questa partita.`);
  getDb().transaction(() => {
    prepared('DELETE FROM persona_posseduta WHERE id = ?').run(possedutaId);
    registraEvento(partitaId, 'persona-rimossa', `${t('persona', r.nome)} rimossa dalla scorta`, `Era al livello ${r.livello}${motivo ? ` · ${motivo}` : ''}.`, { livello: r.livello, motivo: motivo ?? null }, r.persona_id);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
  })();
}
