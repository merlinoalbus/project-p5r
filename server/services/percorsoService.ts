// ============================================================
// percorsoService — guida giorno per giorno: indice dei giorni, scheda del giorno con azioni spuntabili, giorno corrente della partita (Fase 7.5b)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { registraEvento } from './storicoService.js';
import type { AzionePercorsoDto, ConfidentePartitaDto, EffettiAzioneDto, GiornoCorrenteDto, PercorsoGiornoDto, PercorsoIndiceDto, StatoAzioneDto } from '../../shared/types.js';
import { aggiornaConfidente, aggiornaDote, confidenti, leggiPartita, puntiDaNote } from './partiteService.js';

interface Riga { data: string; ordine: number; giorno_settimana: string; fase: string; trama: string; vincoli_json: string; meteo: string | null; azioni_json: string; avvisi_json: string; fonte: string; coperto: number }
type AzioneSeed = Omit<AzionePercorsoDto, 'indice' | 'fatta'>;


function partitaEsiste(partitaId: number): void {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
}

function fattePartita(partitaId: number | undefined, data?: string): Set<string> {
  if (partitaId === undefined) return new Set();
  partitaEsiste(partitaId);
  const righe = (data === undefined
    ? prepared('SELECT data, indice FROM azione_partita WHERE partita_id = ?').all(partitaId)
    : prepared('SELECT data, indice FROM azione_partita WHERE partita_id = ? AND data = ?').all(partitaId, data)) as Array<{ data: string; indice: number }>;
  return new Set(righe.map((r) => `${r.data}/${r.indice}`));
}

/** Effetti registrati alla spunta per le azioni di un giorno (chiave `data/indice`). */
function effettiPartita(partitaId: number | undefined, data: string): Map<string, EffettiAzioneDto> {
  if (partitaId === undefined) return new Map();
  const righe = prepared('SELECT indice, effetti_json FROM azione_partita WHERE partita_id = ? AND data = ? AND effetti_json IS NOT NULL').all(partitaId, data) as Array<{ indice: number; effetti_json: string }>;
  return new Map(righe.map((r) => [`${data}/${r.indice}`, JSON.parse(r.effetti_json) as EffettiAzioneDto]));
}

function dataCorrente(partitaId: number | undefined): string | null {
  if (partitaId === undefined) return null;
  return (prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null } | undefined)?.data_gioco ?? null;
}

/** Indice di tutti i giorni (leggero) con conteggi delle azioni e delle azioni fatte; giorno corrente della partita. */
export function indicePercorso(partitaId?: number): PercorsoIndiceDto {
  const fatte = fattePartita(partitaId);
  const righe = prepared('SELECT data, ordine, giorno_settimana, fase, meteo, azioni_json, avvisi_json, coperto FROM giorno_percorso ORDER BY ordine').all() as Array<Pick<Riga, 'data' | 'ordine' | 'giorno_settimana' | 'fase' | 'meteo' | 'azioni_json' | 'avvisi_json' | 'coperto'>>;
  const giorni = righe.map((r) => {
    const azioni = JSON.parse(r.azioni_json) as AzioneSeed[];
    return { giorno: r.data, giornoSettimana: r.giorno_settimana, fase: r.fase, meteo: r.meteo, azioni: azioni.length, fatte: azioni.filter((_, i) => fatte.has(`${r.data}/${i}`)).length, avvisi: (JSON.parse(r.avvisi_json) as string[]).length, coperto: r.coperto === 1 };
  });
  return { giorni, dataCorrente: dataCorrente(partitaId), totaleGiorni: giorni.length, giorniCoperti: giorni.filter((g) => g.coperto).length };
}

/** Scheda di un giorno con le azioni (fatte nella partita), giorno precedente e successivo. */
export function giornoPercorso(data: string, partitaId?: number): PercorsoGiornoDto {
  const r = prepared('SELECT * FROM giorno_percorso WHERE data = ?').get(data) as Riga | undefined;
  if (!r) throw httpErrors.notFound('giorno-non-trovato', `Nessun giorno del percorso il ${data}.`);
  const fatte = fattePartita(partitaId, data);
  const effetti = effettiPartita(partitaId, data);
  const conf = partitaId ? new Map(confidenti(partitaId).map((c) => [c.chiave, c])) : null;
  const azioni = (JSON.parse(r.azioni_json) as AzioneSeed[]).map((a, i) => ({ ...a, indice: i, fatta: fatte.has(`${data}/${i}`), effetti: effetti.get(`${data}/${i}`) ?? null, stato: conf ? statoAzione(a, conf) : null, mappa: mappaAzione(a) }));
  const prec = prepared('SELECT data FROM giorno_percorso WHERE ordine < ? ORDER BY ordine DESC LIMIT 1').get(r.ordine) as { data: string } | undefined;
  const succ = prepared('SELECT data FROM giorno_percorso WHERE ordine > ? ORDER BY ordine ASC LIMIT 1').get(r.ordine) as { data: string } | undefined;
  return {
    giorno: r.data, giornoSettimana: r.giorno_settimana, fase: r.fase, trama: r.trama, vincoli: JSON.parse(r.vincoli_json) as string[], meteo: r.meteo, azioni, avvisi: JSON.parse(r.avvisi_json) as string[], fonte: r.fonte, coperto: r.coperto === 1,
    precedente: prec?.data ?? null, successivo: succ?.data ?? null, dataCorrente: dataCorrente(partitaId), fatte: azioni.filter((a) => a.fatta).length,
  };
}

/** Stato dell'azione nella partita (12.4): per gli incontri con un Confidente valuta i semafori del rango atteso (o del prossimo). */
export function statoAzione(a: AzioneSeed, conf: Map<string, ConfidentePartitaDto>): StatoAzioneDto {
  if (a.tipo !== 'confidente' || a.riferimento?.tipo !== 'confidente') return { tipo: 'neutra', motivo: null };
  const c = conf.get(a.riferimento.chiave);
  if (!c) return { tipo: 'neutra', motivo: null };
  const atteso = a.rangoAtteso ?? null;
  if (atteso !== null && c.rango >= atteso) return { tipo: 'neutra', motivo: `rango ${atteso} già raggiunto` };
  if (!c.sbloccato && (atteso ?? 1) > 1) return { tipo: 'bloccata', motivo: 'Confidente non ancora sbloccato nella partita' };
  const obiettivo = atteso ?? c.rango + 1;
  // Solo il semaforo del rango obiettivo: un rango senza requisiti e libero (non si ripiega sul rango successivo).
  const sem = c.semafori.find((s) => s.rango === obiettivo);
  if (!sem || sem.requisiti.length === 0) return { tipo: 'neutra', motivo: null };
  const rossi = sem.requisiti.filter((r) => r.stato === 'rosso');
  if (rossi.length > 0) return { tipo: 'bloccata', motivo: rossi.map((r) => (r.dettaglio ? `${r.testo} (${r.dettaglio})` : r.testo)).join(' · ') };
  if (sem.pronto || sem.requisiti.every((r) => r.stato === 'verde')) return { tipo: 'consigliata', motivo: `requisiti del rango ${sem.rango} soddisfatti` };
  const grigi = sem.requisiti.filter((r) => r.stato === 'grigio');
  return { tipo: 'neutra', motivo: grigi.length > 0 ? `da confermare: ${grigi.map((r) => r.testo).join(' · ')}` : null };
}

/** Mappa (e spillo) del luogo dell'azione: Palazzo → `dungeon-<k>`, richiesta → Mementos, negozio/Confidente → spillo del luogo in città. */
export function mappaAzione(a: AzioneSeed): { chiave: string; spilloId: number | null } | null {
  const r = a.riferimento;
  const mappaEsiste = (chiave: string) => !!prepared('SELECT 1 FROM mappa WHERE chiave = ?').get(chiave);
  if (r?.tipo === 'dungeon') return mappaEsiste(`dungeon-${r.chiave}`) ? { chiave: `dungeon-${r.chiave}`, spilloId: null } : null;
  if (r?.tipo === 'richiesta' || a.tipo === 'richiesta') return mappaEsiste('dungeon-mementos') ? { chiave: 'dungeon-mementos', spilloId: null } : null;
  if (r?.tipo === 'negozio') {
    const s = prepared(`SELECT id, mappa_chiave FROM spillo WHERE (riferimento_tipo = 'negozio' AND riferimento_chiave = ?)
      OR (riferimento_tipo = 'luogo' AND riferimento_chiave IN (SELECT chiave FROM luogo WHERE negozio = ?)) ORDER BY id LIMIT 1`).get(r.chiave, r.chiave) as { id: number; mappa_chiave: string } | undefined;
    return s ? { chiave: s.mappa_chiave, spilloId: s.id } : null;
  }
  if (r?.tipo === 'confidente') {
    const s = prepared(`SELECT s.id, s.mappa_chiave FROM spillo s WHERE (s.riferimento_tipo = 'confidente' AND s.riferimento_chiave = ?)
      OR (s.riferimento_tipo = 'luogo' AND s.riferimento_chiave IN (SELECT chiave FROM luogo WHERE confidenti_json LIKE ?)) ORDER BY s.id LIMIT 1`).get(r.chiave, `%"${r.chiave}"%`) as { id: number; mappa_chiave: string } | undefined;
    return s ? { chiave: s.mappa_chiave, spilloId: s.id } : null;
  }
  return null;
}

/** Segna (o toglie) un'azione del giorno come fatta nella partita; evento alla prima spunta. */
/** Nomi delle Doti nelle note della guida («Perizia +2», «Conoscenza +1, Fascino +1»). */
const DOTI_NOTE: Record<string, string> = { conoscenza: 'conoscenza', coraggio: 'coraggio', fascino: 'fascino', gentilezza: 'gentilezza', perizia: 'perizia' };

/** Estrae dalle note della guida gli incrementi delle Doti («Perizia +2»): sono NOTE (1–3), non punti — 132 azioni segnano «+1» e un guadagno da un punto non esiste nel gioco. */
export function dotiDalleNote(note: string | null | undefined): Array<{ chiave: string; delta: number }> {
  if (!note) return [];
  const out: Array<{ chiave: string; delta: number }> = [];
  for (const m of note.matchAll(/(Conoscenza|Coraggio|Fascino|Gentilezza|Perizia)\s*\+\s*(\d+)/gi)) {
    const chiave = DOTI_NOTE[m[1].toLowerCase()];
    const delta = Number(m[2]);
    if (chiave && delta > 0 && !out.some((x) => x.chiave === chiave)) out.push({ chiave, delta });
  }
  return out;
}

export interface OpzioniSpunta {
  /** Note della risposta al Confidente (1–3) quando l'azione è un incontro con un Confidente; assente = nessun punto. */
  noteRisposta?: 1 | 2 | 3;
}

function effettiDi(partitaId: number, data: string, indice: number): EffettiAzioneDto | null {
  const r = prepared('SELECT effetti_json FROM azione_partita WHERE partita_id = ? AND data = ? AND indice = ?').get(partitaId, data, indice) as { effetti_json: string | null } | undefined;
  return r?.effetti_json ? (JSON.parse(r.effetti_json) as EffettiAzioneDto) : null;
}

/**
 * Spunta o toglie un'azione della guida. Alla spunta applica i punti indicati dalla guida (Doti «+N» nelle note; note del Confidente
 * se `noteRisposta` è indicato, col bonus dell'arcano se una Persona dello stesso arcano è in scorta) e li registra; togliendo la spunta
 * li annulla esattamente.
 */
export function impostaAzione(partitaId: number, data: string, indice: number, fatta: boolean, opz: OpzioniSpunta = {}): AzionePercorsoDto {
  partitaEsiste(partitaId);
  const r = prepared('SELECT azioni_json FROM giorno_percorso WHERE data = ?').get(data) as { azioni_json: string } | undefined;
  if (!r) throw httpErrors.notFound('giorno-non-trovato', `Nessun giorno del percorso il ${data}.`);
  const azioni = JSON.parse(r.azioni_json) as AzioneSeed[];
  const a = azioni[indice];
  if (!a) throw httpErrors.notFound('azione-non-trovata', `Il giorno ${data} non ha un'azione con indice ${indice}.`);
  const adesso = nowIso();
  let effetti: EffettiAzioneDto | null = null;
  getDb().transaction(() => {
    const era = !!prepared('SELECT 1 FROM azione_partita WHERE partita_id = ? AND data = ? AND indice = ?').get(partitaId, data, indice);
    if (fatta) {
      if (era) {
        effetti = effettiDi(partitaId, data, indice);
      } else {
        effetti = applicaEffetti(partitaId, a, opz);
      }
      prepared('INSERT INTO azione_partita (partita_id, data, indice, updated_at, effetti_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(partita_id, data, indice) DO UPDATE SET updated_at = excluded.updated_at, effetti_json = COALESCE(azione_partita.effetti_json, excluded.effetti_json)')
        .run(partitaId, data, indice, adesso, effetti ? JSON.stringify(effetti) : null);
    } else {
      const precedenti = era ? effettiDi(partitaId, data, indice) : null;
      if (precedenti) annullaEffetti(partitaId, precedenti);
      prepared('DELETE FROM azione_partita WHERE partita_id = ? AND data = ? AND indice = ?').run(partitaId, data, indice);
    }
    if (fatta && !era) {
      const dett = [`${a.fascia === 'sera' ? 'Sera' : 'Giorno'} · ${a.tipo}${a.riferimentoTesto ? ` · ${a.riferimentoTesto}` : ''}`];
      if (effetti && (effetti.doti.length || effetti.confidente)) dett.push(descriviEffetti(effetti));
      registraEvento(partitaId, 'percorso', `Percorso ${data}: ${a.azione.slice(0, 80)}${a.azione.length > 80 ? '…' : ''}`, `${dett.join(' · ')}.`, { data, indice, tipo: a.tipo, riferimento: a.riferimento, effetti });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return { ...a, indice, fatta, effetti };
}

/** Vero se la partita ha letto «Anima da cineasta» (Royal): i punti di film e DVD salgono di uno scalino. */
function haAnimaDaCineasta(partitaId: number): boolean {
  return !!prepared("SELECT 1 FROM lettura_partita WHERE partita_id = ? AND tipo = 'libro' AND chiave = 'anima-da-cineasta'").get(partitaId);
}

function applicaEffetti(partitaId: number, a: AzioneSeed, opz: OpzioniSpunta): EffettiAzioneDto | null {
  const doti: EffettiAzioneDto['doti'] = [];
  const cinema = (a.tipo === 'dvd' || a.riferimento?.tipo === 'film') && haAnimaDaCineasta(partitaId);
  for (const d of dotiDalleNote(a.note)) {
    // Le note della guida diventano punti (2/3/5), con lo scalino in più di «Anima da cineasta» su film e DVD.
    // I DVD danno sempre due note (3 punti; 5 col libro): la guida li segna «+3» contando il libro, che però valutiamo a parte.
    const note = (a.tipo === 'dvd' ? 2 : Math.min(3, Math.max(1, d.delta))) as 1 | 2 | 3;
    const punti = puntiDaNote(note, false, false, cinema);
    const agg = aggiornaDote(partitaId, d.chiave, { delta: punti });
    doti.push({ chiave: d.chiave, nome: agg.nome, delta: punti, note, cinema });
  }
  let confidente: EffettiAzioneDto['confidente'] = null;
  if (a.tipo === 'confidente' && a.riferimento?.tipo === 'confidente' && opz.noteRisposta) {
    const c = confidenti(partitaId).find((x) => x.chiave === a.riferimento!.chiave);
    if (c && c.rango > 0 && c.rango < 10) {
      const prima = c.punti;
      const agg = aggiornaConfidente(partitaId, c.chiave, { noteRisposta: opz.noteRisposta, bonusArcano: c.personaArcanoInScorta });
      confidente = { chiave: c.chiave, nome: c.nome, noteRisposta: opz.noteRisposta, punti: Math.round((agg.punti - prima) * 100) / 100, bonusArcano: c.personaArcanoInScorta };
    }
  }
  return doti.length || confidente ? { doti, confidente } : null;
}

function annullaEffetti(partitaId: number, e: EffettiAzioneDto): void {
  for (const d of e.doti) aggiornaDote(partitaId, d.chiave, { delta: -d.delta });
  if (e.confidente) aggiornaConfidente(partitaId, e.confidente.chiave, { deltaPunti: -e.confidente.punti });
}

function descriviEffetti(e: EffettiAzioneDto): string {
  const parti = e.doti.map((d) => `${d.nome} +${d.delta}${d.note ? ` (${'♪'.repeat(d.note)}${d.cinema ? ' + Anima da cineasta' : ''})` : ''}`);
  if (e.confidente) parti.push(`${e.confidente.nome} +${e.confidente.punti} punti (${e.confidente.noteRisposta} ${e.confidente.noteRisposta === 1 ? 'nota' : 'note'}${e.confidente.bonusArcano ? ', bonus arcano' : ''})`);
  return parti.join(', ');
}

/** Imposta il giorno corrente della partita (data del calendario di gioco) e restituisce anche la partita aggiornata, così il client allinea lo store senza ricaricare l'elenco. */
export function impostaGiornoCorrente(partitaId: number, data: string): GiornoCorrenteDto {
  partitaEsiste(partitaId);
  if (!prepared('SELECT 1 FROM giorno_percorso WHERE data = ?').get(data)) throw httpErrors.notFound('giorno-non-trovato', `Nessun giorno del percorso il ${data}.`);
  // un giorno nuovo comincia di mattina: la fascia torna a «giorno»; rimarcare lo stesso giorno non la tocca
  prepared("UPDATE partita SET data_gioco = ?, fascia_gioco = CASE WHEN data_gioco IS ? THEN fascia_gioco ELSE 'giorno' END, updated_at = ? WHERE id = ?").run(data, data, nowIso(), partitaId);
  return { dataCorrente: data, partita: leggiPartita(partitaId) };
}
