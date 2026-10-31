// ============================================================
// domandeService — domande in classe ed esami con tracking per partita (Fase 6.2)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { partitaNonTrovata, verificaPartita } from './verificaPartita.js';
import { registraEvento } from './storicoService.js';
import { nomeDote } from './partiteService.js';
import { puntiDote } from './puntiDoti.js';
import { ordineGioco } from '../../shared/condizioniSpillo.js';
import type { DomandaDto, DomandeDto, EsameDto, PremioEsameDto } from '../../shared/types.js';
import { CONFIDENTI_CON_BONUS_ESAME, MOLTIPLICATORE_ESAME, nomePiazzamentoEsame, PIAZZAMENTI_ESAME, type PremioPiazzamentoEsame } from '../../shared/puntiConfidenti.js';
import { eDote } from '../../shared/doti.js';
import { premiDellEsame } from './piazzamentoEsamiService.js';
import { ricompensePerFonte } from './catalogoOggettiLetture.js';
import { righePerEsame } from './esamiCollegamento.js';
import { vociCollegate } from './vociDiStato.js';
import { testoDoteInPunti } from '../../shared/note.js';

interface RigaDomanda { id: number; chiave: string | null; ordine: number; data: string; tipo: DomandaDto['tipo']; chi: string; domanda: string; risposte_json: string; ricompensa: string; note: string; fonte: string }

/**
 * Indice SOLO per ordinare/confrontare date di gioco 'MM-GG' nell'anno scolastico (aprile → marzo), non conta i giorni reali.
 * È `ordineGioco` (R4": il conto dei mesi era scritto anche qui), con -1 per una data che non si legge.
 */
export function indiceGiornoScolastico(data: string): number {
  const [m, g] = data.split('-').map(Number);
  if (!Number.isInteger(m) || !Number.isInteger(g)) return -1;
  return ordineGioco(data);
}

/** Una domanda come DTO: risposte dal JSON, `fatta` se il suo id è fra quelli segnati nella partita. */
function domandaDto(r: RigaDomanda, fatte: Set<number>, oggettiRicompensa: NonNullable<DomandaDto['oggettiRicompensa']>, voceUid?: string, premioVoce?: DomandaDto['premioVoce']): DomandaDto {
  return { id: r.id, chiave: r.chiave ?? null, data: r.data, tipo: r.tipo, chi: r.chi, domanda: r.domanda, risposte: JSON.parse(r.risposte_json) as DomandaDto['risposte'], ricompensa: r.ricompensa, oggettiRicompensa, note: r.note, fonte: r.fonte, fatta: fatte.has(r.id), ...(voceUid ? { voceUid } : {}), ...(premioVoce ? { premioVoce } : {}) };
}

/** L13 (ondata 7, O7-2): il premio di un piazzamento con i nomi (Doti e trofeo). */
function premioEsameDto(p: PremioPiazzamentoEsame): PremioEsameDto {
  const trofeo = p.trofeo ? { chiave: p.trofeo, nome: (prepared('SELECT nome FROM trofeo WHERE chiave = ?').pluck().get(p.trofeo) as string | undefined) ?? 'Trofeo non più nell’elenco' } : null;
  return { piazzamento: p.piazzamento, nome: nomePiazzamentoEsame(p.piazzamento), doti: p.doti.map((d) => ({ dote: d.dote, nome: nomeDote(d.dote), note: d.note })), trofeo };
}

/** Gli esami in ordine, con giorni e domande composti dalle righe riassuntive di `domanda` (R9-18: la fonte unica); `ordine` corre su tutto l'esame.
 *  L13 (ondata 7, O7-2): con i premi per piazzamento e il requisito di Conoscenza per il primo posto, dalle colonne dell'esame (`premiDellEsame`). */
export function esami(): EsameDto[] {
  const premi = ricompensePerFonte('esame');
  const righe = (prepared("SELECT data, tipo, ordine, risposte_json FROM domanda WHERE tipo IN ('esame-medio', 'esame-finale') ORDER BY ordine").all() as Array<{ data: string; tipo: string; ordine: number; risposte_json: string }>)
    .sort((x, y) => indiceGiornoScolastico(x.data) - indiceGiornoScolastico(y.data) || x.ordine - y.ordine);
  const esamiDb = prepared('SELECT chiave, nome, data_risultati, note FROM esame ORDER BY ordine').all() as Array<{ chiave: string; nome: string; data_risultati: string | null; note: string }>;
  // le righe di ogni esame: la regola unica di `esamiCollegamento` (tipo dal nome, dopo i risultati dell'esame precedente dello stesso tipo e fino ai suoi)
  const righeDi = righePerEsame(esamiDb, righe);
  return esamiDb
    .map((e) => {
      const sue = righeDi.get(e.chiave) ?? [];
      const domande = sue.flatMap((r) => (JSON.parse(r.risposte_json) as Array<{ testo: string; domanda?: string }>).map((x) => ({ data: r.data, domanda: x.domanda ?? '', risposta: x.testo })))
        .map((d, i) => ({ ...d, ordine: i + 1 }));
      const p = premiDellEsame(e.chiave);
      return { chiave: e.chiave, nome: e.nome, date: [...new Set(sue.map((r) => r.data))], dataRisultati: e.data_risultati, domande, note: e.note, oggettiRicompensa: premi.get(e.chiave) ?? [],
        premi: (p?.premi ?? []).map(premioEsameDto), requisitoConoscenza: p?.requisito ?? null };
    });
}

/** L13 (ondata 7, O7-2): il moltiplicatore dell'esame come lo descrive la regola del codice (`shared/puntiConfidenti.ts`): i Confidenti che lo
 *  ricevono, con il nome della guida, e i piazzamenti che moltiplicano (gli altri valgono ×1). */
function moltiplicatoreDto(): DomandeDto['moltiplicatore'] {
  const nome = prepared('SELECT nome FROM confidente WHERE chiave = ?').pluck();
  return {
    confidenti: CONFIDENTI_CON_BONUS_ESAME.flatMap((chiave) => { const n = nome.get(chiave) as string | undefined; return n ? [{ chiave, nome: n }] : []; }),
    piazzamenti: PIAZZAMENTI_ESAME.flatMap(({ chiave, nome: n }) => MOLTIPLICATORE_ESAME[chiave] !== 1 ? [{ piazzamento: chiave, nome: n, valore: MOLTIPLICATORE_ESAME[chiave] }] : []),
  };
}

/** Tutte le domande in ordine di data, con lo stato «fatta» della partita (se indicata) e le prossime rispetto alla data di gioco. */
export function domande(partitaId?: number): DomandeDto {
  let fatte = new Set<number>();
  let dataGioco: string | null = null;
  if (partitaId !== undefined) {
    verificaPartita(partitaId); // solo le partite del proprietario della richiesta
    const p = prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null } | undefined;
    if (!p) throw partitaNonTrovata(partitaId);
    dataGioco = p.data_gioco;
    fatte = new Set((prepared('SELECT domanda_id FROM domanda_partita WHERE partita_id = ?').all(partitaId) as Array<{ domanda_id: number }>).map((r) => r.domanda_id));
  }
  // ordine di calendario scolastico (aprile → marzo) e, a pari data, ordine del seed: le voci aggiunte in coda al seed (quiz TV) restano al loro giorno
  const righe = (prepared('SELECT * FROM domanda ORDER BY ordine').all() as RigaDomanda[]).sort((x, y) => indiceGiornoScolastico(x.data) - indiceGiornoScolastico(y.data) || x.ordine - y.ordine);
  const premiDomande = ricompensePerFonte('domanda', righe.flatMap((r) => r.chiave ? [r.chiave] : []));
  // la voce del Diario che segna la domanda (se una sola): la pagina ne mostra il «Applica» della Conoscenza (R12-01/5)
  const voci = vociCollegate('domanda');
  // L13 (ondata 7, O7-2): la ricompensa è ciò che danno le voci che segnano la domanda (decisione 9), dai loro effetti
  const premiVoci = premiDalleVociDelleDomande();
  const tutte = righe.map((r) => domandaDto(r, fatte, r.chiave ? premiDomande.get(r.chiave) ?? [] : [], voci.get(String(r.id))?.voceUid, premiVoci.get(r.id)));
  const oggi = dataGioco ? indiceGiornoScolastico(dataGioco) : null;
  // le domande non fatte della **prima** data da oggi in poi (una o due): il prossimo appuntamento
  const daFare = oggi === null ? [] : tutte.filter((d) => !d.fatta && indiceGiornoScolastico(d.data) >= oggi);
  const prossime = daFare.length ? daFare.filter((d) => d.data === daFare[0].data) : [];
  // le note generali (testo informativo); i premi stanno negli esami, il moltiplicatore nella regola del codice
  const premi = prepared("SELECT json FROM esame_premi WHERE chiave = 'premi'").get() as { json: string } | undefined;
  const note = premi ? JSON.parse(premi.json) as { fonte?: unknown; noteGenerali?: unknown } : null;
  const testo = (x: unknown): string | undefined => (typeof x === 'string' && x.trim() ? x : undefined);
  return { domande: tutte, esami: esami(), premi: note ? { ...(testo(note.fonte) ? { fonte: testo(note.fonte) } : {}), ...(testo(note.noteGenerali) ? { noteGenerali: testo(note.noteGenerali) } : {}) } : null,
    moltiplicatore: moltiplicatoreDto(), dataGioco, prossime, fatte: fatte.size, totale: tutte.length };
}

/**
 * L13 (ondata 7, O7-2; decisione 9): per ogni domanda citata da almeno una voce del Diario (effetto «domanda»), ciò che le voci danno: le Doti
 * dei loro effetti, una volta sola per Dote e note, e se una di loro chiede alla spunta il piazzamento di un esame. Tutte le voci che la citano,
 * non solo la voce «collegata» (`vociCollegate`, che chiede un legame univoco per la spunta dalla Guida): qui si dice che cosa il Diario dà.
 */
export function premiDalleVociDelleDomande(): Map<number, NonNullable<DomandaDto['premioVoce']>> {
  const righe = prepared(`SELECT d.chiave AS domanda, e.tipo AS tipo, e.dati_json AS dati
      FROM main.voce_effetto d JOIN main.voce_effetto e ON e.voce_uid = d.voce_uid
     WHERE d.tipo = 'domanda' AND e.tipo IN ('dote', 'esame') ORDER BY d.chiave, d.voce_uid, e.ordine`).all() as Array<{ domanda: string; tipo: string; dati: string }>;
  const out = new Map<number, NonNullable<DomandaDto['premioVoce']>>();
  for (const id of prepared("SELECT DISTINCT chiave FROM main.voce_effetto WHERE tipo = 'domanda'").pluck().all() as string[]) out.set(Number(id), { doti: [], esameAllaSpunta: false });
  for (const r of righe) {
    const p = out.get(Number(r.domanda));
    if (!p) continue;
    let e: unknown;
    try { e = JSON.parse(r.dati); } catch { continue; }
    const x = e as { dote?: unknown; note?: unknown };
    if (r.tipo === 'esame') p.esameAllaSpunta = true;
    else if (eDote(x.dote) && (x.note === 1 || x.note === 2 || x.note === 3) && !p.doti.some((d) => d.dote === x.dote && d.note === x.note)) p.doti.push({ dote: x.dote, nome: nomeDote(x.dote), note: x.note });
  }
  return out;
}

/**
 * Scrive lo stato «fatta» della domanda nella partita (la tabella `domanda_partita`, l'unica verità) e registra l'evento alla prima
 * volta; dice se la domanda è stata segnata ora (`nuova`). Non costruisce l'elenco delle domande: lo fa chi chiama, una volta.
 */
export function scriviDomandaFatta(partitaId: number, domandaId: number, fatta: boolean, conoscenza: boolean): { nuova: boolean } {
  verificaPartita(partitaId);
  const d = prepared('SELECT * FROM domanda WHERE id = ?').get(domandaId) as RigaDomanda | undefined;
  if (!d) throw httpErrors.notFound('domanda-non-trovata', `La domanda ${domandaId} non esiste.`);
  const adesso = nowIso();
  let nuova = false;
  getDb().transaction(() => {
    if (fatta) {
      const info = prepared('INSERT OR IGNORE INTO domanda_partita (partita_id, domanda_id, fatta_at) VALUES (?, ?, ?)').run(partitaId, domandaId, adesso);
      if (info.changes > 0) {
        nuova = true;
        registraEvento(partitaId, 'domanda-risposta', `Domanda del ${d.data} (${d.chi || d.tipo}) risposta`, `${d.domanda}${conoscenza ? ` · il gioco dà ${testoDoteInPunti({ nome: nomeDote('conoscenza'), note: 1, delta: puntiDote(partitaId, 'conoscenza', 1) })} (da segnare nelle Doti)` : ''}`, { domandaId, conoscenza });
      }
    } else {
      prepared('DELETE FROM domanda_partita WHERE partita_id = ? AND domanda_id = ?').run(partitaId, domandaId);
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return { nuova };
}

/** Segna una domanda come fatta (o no) e registra l'evento. Con `conoscenza` la risposta vale una nota di Conoscenza: la
 *  risposta la dice (`daSegnare`), ma le Doti si segnano a mano (scelta dell'utente, 2026-09-30) e qui non si toccano.
 *  È il gesto «basso»: la pagina della Guida passa da `segnaDomandaDallaGuida` (spuntaDellaGuidaService), che lo usa solo dove
 *  non c'è una voce del Diario che segna la stessa domanda. */
export function impostaDomandaFatta(partitaId: number, domandaId: number, fatta: boolean, conoscenza: boolean): DomandeDto {
  const { nuova } = scriviDomandaFatta(partitaId, domandaId, fatta, conoscenza);
  const esito = domande(partitaId);
  return nuova && conoscenza ? { ...esito, daSegnare: [{ chiave: 'conoscenza', nome: nomeDote('conoscenza'), delta: puntiDote(partitaId, 'conoscenza', 1), note: 1 }] } : esito;
}
