// ============================================================
// semaforiService — semafori dei requisiti per rango dei Confidenti (Fase 12.3)
// ============================================================
//
// Ogni requisito del seed viene valutato sullo stato della partita: Doti (rango), Persona dell'arcano in scorta, Persona con una
// skill precisa in scorta (Gemelle Custodi), Palazzo (boss
// segnato ottenuto/esaurito nella Guida), richiesta dei Mementos completata, rango di un altro Confidente, data di gioco corrente,
// meteo del giorno corrente. I requisiti non verificabili («manuale») sono grigi finché l'utente non li conferma; un requisito
// verificabile ma senza dati sufficienti (nessun giorno corrente, boss non segnato) è grigio e accetta la conferma manuale.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { t } from './traduzioniService.js';
import type { RequisitoSeed } from '../../shared/seed.js';
import type { SemaforiRangoDto, SemaforoRequisitoDto } from '../../shared/types.js';

export interface RigaRequisito { confidente_chiave: string; rango: number; indice: number; tipo: RequisitoSeed['tipo']; dati_json: string; testo: string }

/** Stato della partita letto una volta per tutti i Confidenti. */
export interface StatoPartitaSemafori {
  doti: Map<string, number>;
  arcaniInScorta: Set<string>;
  /** Coppie «persona|abilità» (minuscole) presenti nella scorta: per le richieste delle Gemelle Custodi. */
  personeConAbilita: Set<string>;
  bossGestiti: Set<string>;
  richiesteCompletate: Set<string>;
  ranghiConfidenti: Map<string, number>;
  dataGioco: string | null;
  meteoOggi: string | null;
  conferme: Set<string>;
}

export function statoPartitaSemafori(partitaId: number, ranghiConfidenti: Map<string, number>, doti: Map<string, number>): StatoPartitaSemafori {
  const arcani = new Set((prepared('SELECT DISTINCT p.arcana FROM persona_posseduta pp JOIN persona p ON p.id = pp.persona_id WHERE pp.partita_id = ?').all(partitaId) as Array<{ arcana: string }>).map((r) => r.arcana));
  const abilita = new Set((prepared(`SELECT p.nome AS persona, s.nome AS abilita FROM persona_posseduta pp JOIN persona p ON p.id = pp.persona_id
    JOIN persona_posseduta_skill ps ON ps.posseduta_id = pp.id JOIN skill s ON s.id = ps.skill_id WHERE pp.partita_id = ?`).all(partitaId) as Array<{ persona: string; abilita: string }>)
    .map((r) => `${r.persona.toLowerCase()}|${r.abilita.toLowerCase()}`));
  const boss = new Set((prepared(`SELECT DISTINCT a.dungeon_chiave FROM punto_partita sp JOIN punto_interesse pi ON pi.chiave = sp.punto_chiave JOIN dungeon_area a ON a.chiave = pi.area_chiave
    WHERE sp.partita_id = ? AND pi.tipo = 'boss'`).all(partitaId) as Array<{ dungeon_chiave: string }>).map((r) => r.dungeon_chiave));
  const richieste = new Set((prepared("SELECT rp.richiesta_chiave, r.nome FROM richiesta_partita rp JOIN richiesta r ON r.chiave = rp.richiesta_chiave WHERE rp.partita_id = ? AND rp.stato = 'completata'").all(partitaId) as Array<{ richiesta_chiave: string; nome: string }>).flatMap((r) => [r.richiesta_chiave, r.nome.toLowerCase()]));
  const partita = prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null } | undefined;
  const dataGioco = partita?.data_gioco ?? null;
  const meteo = dataGioco ? (prepared('SELECT meteo FROM giorno_calendario WHERE data = ?').get(dataGioco) as { meteo: string | null } | undefined)?.meteo ?? null : null;
  const conferme = new Set((prepared('SELECT confidente_chiave, rango, indice FROM requisito_partita WHERE partita_id = ? AND confermato = 1').all(partitaId) as Array<{ confidente_chiave: string; rango: number; indice: number }>).map((r) => `${r.confidente_chiave}/${r.rango}/${r.indice}`));
  return { doti, arcaniInScorta: arcani, personeConAbilita: abilita, bossGestiti: boss, richiesteCompletate: richieste, ranghiConfidenti, dataGioco, meteoOggi: meteo, conferme };
}

const NOMI_MESI = ['', 'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
/** «04-18» → «18 aprile» (le date del gioco sono senza anno); testi non in quel formato restano com'erano. */
export function dataLeggibile(d: string): string {
  const m = /^(\d{2})-(\d{2})$/.exec(d);
  if (!m) return d;
  const mese = NOMI_MESI[Number(m[1])];
  return mese ? `${Number(m[2])} ${mese}` : d;
}

function confrontaDate(a: string, b: string): number {
  // calendario di gioco: da aprile (04) a marzo (03) dell'anno dopo
  const ordine = (d: string): number => { const [m, g] = d.split('-').map(Number); return ((m + 8) % 12) * 100 + g; };
  return ordine(a) - ordine(b);
}

const NOMI_DOTI: Record<string, string> = { conoscenza: 'Conoscenza', coraggio: 'Coraggio', fascino: 'Fascino', gentilezza: 'Gentilezza', perizia: 'Perizia' };
const NOMI_DUNGEON: Record<string, string> = { kamoshida: 'Palazzo di Kamoshida', madarame: 'Palazzo di Madarame', kaneshiro: 'Palazzo di Kaneshiro', futaba: 'Palazzo di Futaba', okumura: 'Palazzo di Okumura', niijima: 'Palazzo di Niijima', shido: 'Palazzo di Shido', maruki: 'Palazzo di Maruki', iweleth: 'Prigione di Iweleth' };

export function valuta(r: RigaRequisito, st: StatoPartitaSemafori): SemaforoRequisitoDto {
  const dati = JSON.parse(r.dati_json) as Record<string, string | number>;
  const chiaveConferma = `${r.confidente_chiave}/${r.rango}/${r.indice}`;
  const confermato = st.conferme.has(chiaveConferma);
  const base = { indice: r.indice, tipo: r.tipo, testo: r.testo, confermato };
  const grigio = (dettaglio: string): SemaforoRequisitoDto => ({ ...base, stato: confermato ? 'verde' : 'grigio', dettaglio: confermato ? `${dettaglio} · confermato a mano` : dettaglio, manuale: true });
  switch (r.tipo) {
    case 'dote': {
      const attuale = st.doti.get(String(dati.dote)) ?? 1;
      const richiesto = Number(dati.rango);
      return { ...base, stato: attuale >= richiesto ? 'verde' : 'rosso', dettaglio: `${NOMI_DOTI[String(dati.dote)] ?? dati.dote}: rango ${attuale} di ${richiesto}`, manuale: false };
    }
    case 'persona-arcano': {
      const ok = st.arcaniInScorta.has(String(dati.arcano));
      return { ...base, stato: ok ? 'verde' : 'rosso', dettaglio: ok ? `Persona ${t('arcana', String(dati.arcano))} in scorta` : `Nessuna Persona ${t('arcana', String(dati.arcano))} in scorta`, manuale: false };
    }
    case 'persona-abilita': {
      const persona = String(dati.persona);
      const skill = String(dati.abilita);
      const ok = st.personeConAbilita.has(`${persona.toLowerCase()}|${skill.toLowerCase()}`);
      return { ...base, stato: ok ? 'verde' : 'rosso', dettaglio: ok ? `${persona} con ${skill} in scorta` : `Nessuna ${persona} con ${skill} in scorta`, manuale: false };
    }
    case 'palazzo': {
      const nome = NOMI_DUNGEON[String(dati.dungeon)] ?? String(dati.dungeon);
      if (st.bossGestiti.has(String(dati.dungeon))) return { ...base, stato: 'verde', dettaglio: `${nome}: boss segnato nella Guida`, manuale: false };
      return grigio(`${nome}: segna il boss come sconfitto nella Guida o conferma qui`);
    }
    case 'richiesta': {
      const nome = String(dati.richiesta);
      const ok = st.richiesteCompletate.has(nome) || st.richiesteCompletate.has(nome.toLowerCase());
      return ok ? { ...base, stato: 'verde', dettaglio: `Richiesta «${nome}» completata`, manuale: false } : grigio(`Richiesta «${nome}» non risulta completata (Guida → Richieste) — oppure conferma qui`);
    }
    case 'confidente': {
      const attuale = st.ranghiConfidenti.get(String(dati.confidente)) ?? 0;
      const richiesto = Number(dati.rango);
      return { ...base, stato: attuale >= richiesto ? 'verde' : 'rosso', dettaglio: `${t('confidente', String(dati.confidente))}: rango ${attuale} di ${richiesto}`, manuale: false };
    }
    case 'data': {
      if (!st.dataGioco) return grigio(`Disponibile dal ${dataLeggibile(String(dati.dal))}: imposta il giorno corrente della partita`);
      const ok = confrontaDate(st.dataGioco, String(dati.dal)) >= 0;
      return { ...base, stato: ok ? 'verde' : 'rosso', dettaglio: ok ? `Disponibile dal ${dataLeggibile(String(dati.dal))} (oggi ${dataLeggibile(st.dataGioco)})` : `Disponibile dal ${dataLeggibile(String(dati.dal))}, oggi è il ${dataLeggibile(st.dataGioco)}`, manuale: false };
    }
    case 'meteo': {
      if (!st.meteoOggi) return grigio('Evento all\'aperto: meteo del giorno corrente non noto');
      const piove = /piogg|tempor|nev/i.test(st.meteoOggi);
      return { ...base, stato: piove ? 'rosso' : 'verde', dettaglio: piove ? `Oggi ${st.meteoOggi}: evento non disponibile` : `Oggi ${st.meteoOggi}`, manuale: false };
    }
    default:
      return grigio('Non verificabile dall\'app');
  }
}

/** Semafori dei ranghi superiori a `rangoAttuale` per un Confidente. */
export function semaforiConfidente(chiave: string, rangoAttuale: number, st: StatoPartitaSemafori): SemaforiRangoDto[] {
  const righe = prepared('SELECT * FROM confidente_requisito WHERE confidente_chiave = ? AND rango > ? ORDER BY rango, indice').all(chiave, rangoAttuale) as RigaRequisito[];
  const perRango = new Map<number, RigaRequisito[]>();
  for (const r of righe) { const l = perRango.get(r.rango) ?? []; l.push(r); perRango.set(r.rango, l); }
  return [...perRango.entries()].map(([rango, lista]) => {
    const requisiti = lista.map((r) => valuta(r, st));
    return { rango, requisiti, pronto: requisiti.every((q) => q.stato === 'verde') };
  });
}

/** Conferma (o revoca) a mano un requisito non verificabile. */
export function confermaRequisito(partitaId: number, chiave: string, rango: number, indice: number, confermato: boolean): void {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  if (!prepared('SELECT 1 FROM confidente_requisito WHERE confidente_chiave = ? AND rango = ? AND indice = ?').get(chiave, rango, indice)) throw httpErrors.notFound('requisito-non-trovato', 'Requisito non trovato.');
  getDb().transaction(() => {
    prepared(`INSERT INTO requisito_partita (partita_id, confidente_chiave, rango, indice, confermato, updated_at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(partita_id, confidente_chiave, rango, indice) DO UPDATE SET confermato = excluded.confermato, updated_at = excluded.updated_at`).run(partitaId, chiave, rango, indice, confermato ? 1 : 0, nowIso());
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
  })();
}
