// ============================================================
// semaforiService — semafori dei requisiti per rango dei Confidenti (Fase 12.3)
// ============================================================
//
// Ogni requisito del seed viene valutato sullo stato della partita: Doti (rango), Persona dell'arcano in scorta, Persona con una
// skill precisa in scorta (Gemelle Custodi), Palazzo (completato: boss finale nella Guida o sulla mappa, Tesoro
// del Palazzo o raccolta al 100% — `palazziService.palazziCompletati`; mai grigio), richiesta dei Mementos completata, rango di un altro Confidente, data di gioco corrente,
// meteo del giorno corrente, evento di storia segnato nella partita (il caffè al Leblanc, il duello con Akechi: Partita →
// Progressi). I requisiti non verificabili («manuale») sono grigi finché l'utente non li conferma; le avvertenze («avviso»)
// sono grigie ma non bloccano il rango (`bloccante: false`).
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
// quando un Palazzo è completato lo decide `palazziService` (boss finale, Tesoro, 100%: mai la data)
import { palazziCompletati } from './palazziService.js';
import { EVENTI_STORIA, dataLeggibile, nomePalazzo, ordineGioco } from '../../shared/condizioniSpillo.js';
import { guastaLAperto, nomeMeteo, type MeteoPartita } from '../../shared/meteoPartita.js';
import { meteoOra } from './meteoService.js';
export { dataLeggibile };
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { nomeDote } from '../../shared/doti.js';
import { t } from './traduzioniService.js';
import type { RequisitoRango, SemaforiRangoDto, SemaforoRequisitoDto } from '../../shared/types.js';

export interface RigaRequisito { confidente_chiave: string; rango: number; indice: number; tipo: RequisitoRango['tipo']; dati_json: string; testo: string }

/** Stato della partita letto una volta per tutti i Confidenti. */
export interface StatoPartitaSemafori {
  doti: Map<string, number>;
  arcaniInScorta: Set<string>;
  /** Coppie «persona|abilità» (minuscole) presenti nella scorta: per le richieste delle Gemelle Custodi. */
  personeConAbilita: Set<string>;
  /** I Palazzi completati nella partita, con il perché (vedi `palazziCompletati`). */
  palazziCompletati: Map<string, string>;
  richiesteCompletate: Set<string>;
  ranghiConfidenti: Map<string, number>;
  /** I Ladri che hai detto di avere nel gruppo. */
  membriSquadra: Set<string>;
  /** Quelli che hai detto di **non** avere: e' una risposta, e vale rosso invece che grigio. */
  membriFuoriSquadra: Set<string>;
  dataGioco: string | null;
  /** Momento della giornata corrente della partita (scheda «Oggi»): «giorno» o «sera». */
  fasciaGioco: 'giorno' | 'sera' | null;
  /** Il meteo del giorno corrente **nella fascia corrente**: segnato nella partita o, se no, della guida (`meteoService.meteoOra`). */
  meteoOra: { meteo: MeteoPartita; origine: 'partita' | 'guida' } | null;
  conferme: Set<string>;
  /** Gli eventi di storia segnati come avvenuti (Partita → Progressi): i requisiti `evento` li leggono da qui. */
  eventi: Set<string>;
}

/** Lo stato della partita che serve ai semafori: ranghi e Doti li passa chi chiama; qui si leggono arcani in scorta,
 *  coppie Persona|abilità (in minuscolo), Richieste completate (per chiave e per nome in minuscolo), Palazzi completati,
 *  data e fascia di gioco (fascia «giorno» se non è «sera»), meteo del momento, requisiti confermati a mano
 *  (`confidente/rango/indice`), membri della squadra dentro e fuori, eventi di storia avvenuti. */
export function statoPartitaSemafori(partitaId: number, ranghiConfidenti: Map<string, number>, doti: Map<string, number>): StatoPartitaSemafori {
  const arcani = new Set((prepared('SELECT DISTINCT p.arcana FROM persona_posseduta pp JOIN persona p ON p.id = pp.persona_id WHERE pp.partita_id = ?').all(partitaId) as Array<{ arcana: string }>).map((r) => r.arcana));
  const abilita = new Set((prepared(`SELECT p.nome AS persona, s.nome AS abilita FROM persona_posseduta pp JOIN persona p ON p.id = pp.persona_id
    JOIN persona_posseduta_skill ps ON ps.posseduta_id = pp.id JOIN skill s ON s.id = ps.skill_id WHERE pp.partita_id = ?`).all(partitaId) as Array<{ persona: string; abilita: string }>)
    .map((r) => `${r.persona.toLowerCase()}|${r.abilita.toLowerCase()}`));
  const richieste = new Set((prepared("SELECT rp.richiesta_chiave, r.nome FROM richiesta_partita rp JOIN richiesta r ON r.chiave = rp.richiesta_chiave WHERE rp.partita_id = ? AND rp.stato = 'completata'").all(partitaId) as Array<{ richiesta_chiave: string; nome: string }>).flatMap((r) => [r.richiesta_chiave, r.nome.toLowerCase()]));
  const partita = prepared('SELECT data_gioco, fascia_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null; fascia_gioco: string | null } | undefined;
  const dataGioco = partita?.data_gioco ?? null;
  const fasciaGioco = partita ? (partita.fascia_gioco === 'sera' ? 'sera' : 'giorno') : null;
  const conferme = new Set((prepared('SELECT confidente_chiave, rango, indice FROM requisito_partita WHERE partita_id = ? AND confermato = 1').all(partitaId) as Array<{ confidente_chiave: string; rango: number; indice: number }>).map((r) => `${r.confidente_chiave}/${r.rango}/${r.indice}`));
  // Chi e' in squadra: i Ladri con l'interruttore «In squadra» acceso (`in_squadra = 1`), e chi e' fuori quelli con
  // l'interruttore spento. **L'interruttore, non la presenza della riga.** Prima bastava avere segnato un livello (la riga
  // nasce li') perche' il Ladro risultasse in squadra: si accendeva per sbaglio e non si poteva spegnere.
  const membriSquadra = new Set((prepared('SELECT personaggio_chiave FROM membro_squadra_partita WHERE partita_id = ? AND in_squadra = 1').all(partitaId) as Array<{ personaggio_chiave: string }>).map((r) => r.personaggio_chiave));
  const membriFuoriSquadra = new Set((prepared('SELECT personaggio_chiave FROM membro_squadra_partita WHERE partita_id = ? AND in_squadra = 0').all(partitaId) as Array<{ personaggio_chiave: string }>).map((r) => r.personaggio_chiave));
  const eventi = new Set((prepared('SELECT evento_chiave FROM evento_storia_partita WHERE partita_id = ? AND avvenuto = 1').all(partitaId) as Array<{ evento_chiave: string }>).map((r) => r.evento_chiave));
  return { doti, arcaniInScorta: arcani, personeConAbilita: abilita, palazziCompletati: palazziCompletati(partitaId), richiesteCompletate: richieste, ranghiConfidenti, membriSquadra, membriFuoriSquadra, dataGioco, fasciaGioco, meteoOra: meteoOra(partitaId, dataGioco, fasciaGioco), conferme, eventi };
}

// L'ordine del calendario di gioco e i nomi dei Palazzi vengono da `shared/condizioniSpillo.ts`: qui erano riscritti a mano
// (rilievo R2 della verifica completa, 2026-10-03).

/**
 * Il semaforo di un requisito di rango sullo stato della partita: per tipo (Dote, Persona dell'arcano o con un'abilità,
 * Palazzo, richiesta, membro in squadra, rango di un Confidente, data, meteo, evento) dice verde o rosso con il dettaglio di
 * che cosa manca. Quel che l'app non sa verificare è grigio, verde se l'utente l'ha confermato a mano; gli avvisi non bloccano.
 */
export function valuta(r: RigaRequisito, st: StatoPartitaSemafori): SemaforoRequisitoDto {
  const dati = JSON.parse(r.dati_json) as Record<string, string | number>;
  const chiaveConferma = `${r.confidente_chiave}/${r.rango}/${r.indice}`;
  const confermato = st.conferme.has(chiaveConferma);
  const base = { indice: r.indice, tipo: r.tipo, testo: r.testo, confermato };
  /** Il semaforo di un requisito che l'app non sa verificare da sola: grigio, oppure verde se l'utente l'ha confermato a mano. */
  const grigio = (dettaglio: string): SemaforoRequisitoDto => ({ ...base, stato: confermato ? 'verde' : 'grigio', dettaglio: confermato ? `${dettaglio} · confermato a mano` : dettaglio, manuale: true });
  switch (r.tipo) {
    case 'dote': {
      const attuale = st.doti.get(String(dati.dote)) ?? 1;
      const richiesto = Number(dati.rango);
      return { ...base, stato: attuale >= richiesto ? 'verde' : 'rosso', dettaglio: `${nomeDote(String(dati.dote))}: rango ${attuale} di ${richiesto}`, manuale: false };
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
      const nome = nomePalazzo(String(dati.dungeon));
      const perche = st.palazziCompletati.get(String(dati.dungeon));
      if (perche) return { ...base, stato: 'verde', dettaglio: `${nome}: completato (${perche})`, manuale: false };
      // Il boss sconfitto è uno stato che l'app registra: o risulta o non risulta, e finché non
      // risulta la condizione è falsa (decisione dell'utente, 2026-09-13).
      return { ...base, stato: 'rosso', dettaglio: `${nome}: non risulta completato — segna il boss finale sconfitto (nella Guida o sulla mappa), il Tesoro del Palazzo o tutto il raccolto (Guida → Palazzi)`, manuale: false };
    }
    case 'richiesta': {
      const nome = String(dati.richiesta);
      const ok = st.richiesteCompletate.has(nome) || st.richiesteCompletate.has(nome.toLowerCase());
      return ok ? { ...base, stato: 'verde', dettaglio: `Richiesta «${nome}» completata`, manuale: false } : { ...base, stato: 'rosso', dettaglio: `Richiesta «${nome}» non risulta completata (Guida → Richieste)`, manuale: false };
    }
    case 'squadra': {
      const chiave = String(dati.membro);
      // Il protagonista nel gruppo c'e' sempre: non dipende da quel che e' stato segnato.
      // **Due risposte, non tre** (decisione dell'utente, 2026-09-13): «in squadra» e' una variabile
      // booleana, e un Ladro che non risulta nel gruppo non e' nel gruppo. Il terzo stato — «non
      // l'ho ancora segnato», grigio, col beneficio del dubbio — faceva comparire cose che nella
      // partita non ci sono ancora, ed e' proprio quello che una guida non deve fare.
      const dentro = chiave === 'joker' || st.membriSquadra.has(chiave);
      return dentro
        ? { ...base, stato: 'verde', dettaglio: `${t('confidente', chiave)} e' in squadra`, manuale: false }
        : { ...base, stato: 'rosso', dettaglio: `${t('confidente', chiave)} non e' in squadra (Partita → Denaro e squadra)`, manuale: false };
    }
    case 'confidente': {
      const attuale = st.ranghiConfidenti.get(String(dati.confidente)) ?? 0;
      const richiesto = Number(dati.rango);
      return { ...base, stato: attuale >= richiesto ? 'verde' : 'rosso', dettaglio: `${t('confidente', String(dati.confidente))}: rango ${attuale} di ${richiesto}`, manuale: false };
    }
    case 'data': {
      if (!st.dataGioco) return { ...base, stato: 'rosso', dettaglio: `Disponibile dal ${dataLeggibile(String(dati.dal))}: il giorno corrente della partita non è impostato (Partita → Oggi)`, manuale: false };
      const ok = ordineGioco(st.dataGioco) >= ordineGioco(String(dati.dal));
      return { ...base, stato: ok ? 'verde' : 'rosso', dettaglio: ok ? `Disponibile dal ${dataLeggibile(String(dati.dal))} (oggi ${dataLeggibile(st.dataGioco)})` : `Disponibile dal ${dataLeggibile(String(dati.dal))}, oggi è il ${dataLeggibile(st.dataGioco)}`, manuale: false };
    }
    case 'meteo': {
      // Senza meteo (né segnato né nella guida) non si sa: da controllare, ma non si blocca il rango per un dato che
      // manca (scelta dell'utente, 2026-09-30). Col meteo, conta quello della fascia in cui si è: «Sereno/Pioggia» di sera è pioggia.
      if (!st.meteoOra) return { ...base, stato: 'grigio', dettaglio: 'Il meteo di oggi non è segnato: controllalo nel gioco o segnalo in Partita → Oggi (non blocca)', manuale: false, bloccante: false };
      const quando = st.fasciaGioco === 'sera' ? 'Stasera' : 'Oggi';
      const come = `${quando} ${nomeMeteo(st.meteoOra.meteo).toLowerCase()}${st.meteoOra.origine === 'guida' ? ' (dalla guida)' : ''}`;
      const guasto = guastaLAperto(st.meteoOra.meteo);
      return { ...base, stato: guasto ? 'rosso' : 'verde', dettaglio: guasto ? `${come}: evento all'aperto non disponibile` : come, manuale: false };
    }
    case 'evento': {
      // Un fatto della storia che solo tu sai (il caffè al Leblanc, il duello con Akechi): un dato della
      // partita, lo stesso interruttore di Partita → Progressi. Il «Condizione soddisfatta» qui lo scrive
      // (`confermaRequisito`), e il semaforo lo legge, non una conferma a parte.
      const chiave = String(dati.evento);
      const nome = EVENTI_STORIA.find((e) => e.chiave === chiave)?.nome ?? chiave;
      const ok = st.eventi.has(chiave);
      return { ...base, confermato: ok, stato: ok ? 'verde' : 'grigio', dettaglio: ok ? `${nome}: segnato` : `${nome}: da segnare, qui o in Partita → Progressi`, manuale: true };
    }
    case 'avviso':
      // Da controllare nel gioco, ma non ferma il rango: senza un dato che lo dica, bloccare vorrebbe
      // dire bloccare anche quando è tutto a posto (scelta dell'utente, 2026-09-30).
      return { ...base, stato: 'grigio', dettaglio: 'Da controllare nel gioco: non blocca il rango', manuale: false, bloccante: false };
    default:
      return grigio('Non verificabile dall\'app');
  }
}

/** Il requisito conta per sapere se il rango è raggiungibile: le avvertenze no. */
export const requisitoBloccante = (r: SemaforoRequisitoDto): boolean => r.bloccante !== false;

/** Semafori dei ranghi superiori a `rangoAttuale` per un Confidente. */
export function semaforiConfidente(chiave: string, rangoAttuale: number, st: StatoPartitaSemafori): SemaforiRangoDto[] {
  const righe = prepared('SELECT * FROM confidente_requisito WHERE confidente_chiave = ? AND rango > ? ORDER BY rango, indice').all(chiave, rangoAttuale) as RigaRequisito[];
  const perRango = new Map<number, RigaRequisito[]>();
  for (const r of righe) { const l = perRango.get(r.rango) ?? []; l.push(r); perRango.set(r.rango, l); }
  return [...perRango.entries()].map(([rango, lista]) => {
    const requisiti = lista.map((r) => valuta(r, st));
    return { rango, requisiti, pronto: requisiti.filter(requisitoBloccante).every((q) => q.stato === 'verde') };
  });
}

/** Segna (o toglie) un evento di storia della partita: lo stesso dato dell'interruttore di Partita → Progressi. */
export function impostaEventoStoria(partitaId: number, evento: string, avvenuto: boolean): void {
  prepared('INSERT INTO evento_storia_partita (partita_id, evento_chiave, avvenuto, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, evento_chiave) DO UPDATE SET avvenuto = excluded.avvenuto, updated_at = excluded.updated_at').run(partitaId, evento, avvenuto ? 1 : 0, nowIso());
}

/** Conferma (o revoca) a mano un requisito non verificabile. Un requisito `evento` non ha una conferma sua:
 *  segna l'evento della partita, così il Confidente e Partita → Progressi dicono la stessa cosa. */
export function confermaRequisito(partitaId: number, chiave: string, rango: number, indice: number, confermato: boolean): void {
  verificaPartita(partitaId);
  const riga = prepared('SELECT tipo, dati_json FROM confidente_requisito WHERE confidente_chiave = ? AND rango = ? AND indice = ?').get(chiave, rango, indice) as { tipo: string; dati_json: string } | undefined;
  if (!riga) throw httpErrors.notFound('requisito-non-trovato', 'Requisito non trovato.');
  if (riga.tipo === 'avviso') throw httpErrors.badRequest('requisito-non-confermabile', 'È un\'avvertenza da controllare nel gioco: non blocca il rango e non si conferma.');
  const evento = riga.tipo === 'evento' ? String((JSON.parse(riga.dati_json) as { evento?: unknown }).evento ?? '') : null;
  if (evento !== null && !EVENTI_STORIA.some((e) => e.chiave === evento)) throw httpErrors.notFound('evento-non-trovato', 'Evento di storia non trovato.');
  getDb().transaction(() => {
    if (evento !== null) impostaEventoStoria(partitaId, evento, confermato);
    else prepared(`INSERT INTO requisito_partita (partita_id, confidente_chiave, rango, indice, confermato, updated_at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(partita_id, confidente_chiave, rango, indice) DO UPDATE SET confermato = excluded.confermato, updated_at = excluded.updated_at`).run(partitaId, chiave, rango, indice, confermato ? 1 : 0, nowIso());
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
  })();
}

/** Per ogni evento di storia, i ranghi dei Confidenti che lo chiedono («Sojiro Sakura, rango 3»). */
export function ranghiPerEvento(): Map<string, string[]> {
  const righe = prepared(`SELECT r.rango, r.dati_json, c.nome FROM confidente_requisito r JOIN confidente c ON c.chiave = r.confidente_chiave
    WHERE r.tipo = 'evento' ORDER BY c.ordine, r.rango`).all() as Array<{ rango: number; dati_json: string; nome: string }>;
  const out = new Map<string, string[]>();
  for (const r of righe) {
    const evento = String((JSON.parse(r.dati_json) as { evento?: unknown }).evento ?? '');
    const l = out.get(evento) ?? [];
    l.push(`${r.nome}, rango ${r.rango}`);
    out.set(evento, l);
  }
  return out;
}
