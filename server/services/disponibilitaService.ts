// ============================================================
// disponibilitaService — quando una cosa è davvero raggiungibile nella partita
// ============================================================
//
// Un solo valutatore per tutto: spilli, articoli, negozi, attività, libri, film, luoghi. Riceve
// condizioni **strutturate** (`shared/condizioniSpillo.ts`) e lo stato della partita, e risponde
// con un semaforo per condizione — verde, rosso, o grigio quando alla partita manca il dato (il
// giorno corrente non impostato, il boss non segnato) — e con uno stato complessivo:
// «bloccato» se una condizione è rossa, «ignoto» se resta del grigio, «disponibile» altrimenti.
//
// Qui non c'è nessuna lettura di prosa. C'era — un lettore di frasi con ventidue espressioni
// regolari — ed è stato tolto l'11 settembre 2026: le frasi si convertono una volta all'ingresso
// dei dati (`shared/migraCondizioni.ts`), e ciò che non si converte non è una condizione.
//
// I requisiti dei Confidenti (dote, arcano, abilità, Palazzo, richiesta, rango, data, meteo)
// passano dal valutatore dei semafori (`semaforiService.valuta`), così Doti, Palazzi e ranghi
// hanno un'unica regola in tutta l'app; il resto si valuta qui.
// ============================================================

import { prepared } from '../db/dbService.js';
import { confidenti, dotiSociali } from './partiteService.js';
import { dataLeggibile, statoPartitaSemafori, valuta, type RigaRequisito, type StatoPartitaSemafori } from './semaforiService.js';
import { ARCHI_STORIA, CONTATORI, EVENTI_STORIA, RANGHI_CLIENTE, membroDellEvento, descriviRequisitoSpillo, nomePalazzo, ordineGioco, proiezioneDiPresenza, dataSbloccoQuartiere, type ContatoreChiave, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import type { RequisitoSeed } from '../../shared/seed.js';
import type { DisponibilitaDto, SemaforoRequisitoDto } from '../../shared/types.js';

/** Stagioni del calendario di gioco per mese (aprile → marzo). */
const STAGIONE_PER_MESE: Record<number, string> = { 4: 'primavera', 5: 'primavera', 6: 'estate', 7: 'estate', 8: 'estate', 9: 'autunno', 10: 'autunno', 11: 'autunno', 12: 'inverno', 1: 'inverno', 2: 'inverno', 3: 'primavera' };

/** Testo piatto: minuscolo, senza accenti, spazi normalizzati. */
function piatto(testo: string): string {
  return testo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// l'ordine del calendario di gioco (aprile → marzo) e la lettura della data di sblocco dei quartieri stanno nel modulo condiviso
export { ordineGioco, dataSbloccoQuartiere };

/** Un requisito da valutare: quello di un Confidente (dal seed, con il suo testo) o una condizione con il testo generato. */
export type RequisitoDisponibilita = RequisitoSeed | (RequisitoSpillo & { testo: string });

export interface SbloccoQuartiere { nome: string; dal: string | null }

/** Stato della partita per la disponibilità: quello dei semafori dei Confidenti più tutto ciò che le condizioni chiedono. */
export interface StatoDisponibilita extends StatoPartitaSemafori {
  partitaId?: number;
  articoliOttenuti: Set<string>;
  /** «libro/chiave», «film/chiave». */
  letture: Set<string>;
  contatori: Map<ContatoreChiave, number>;
  attivitaSvolte: Map<string, number>;
  /** Yen spesi in ciascun negozio: la somma dei prezzi degli articoli segnati come acquistati. */
  spesaPerNegozio: Map<string, number>;
  puntiNegozio: Map<string, number>;
  eventi: Set<string>;
  giornoSettimana: string | null;
  /** Quartieri della Guida con la data di sblocco («MM-GG») quando il testo dello sblocco comincia con una data. */
  sbloccoQuartieri: Map<string, SbloccoQuartiere>;
  /** L'arco della storia in cui si trova la partita, dalla data di gioco e dalle finestre dei Palazzi. */
  arcoCorrente: string | null;
}

export function sbloccoQuartieri(): Map<string, SbloccoQuartiere> {
  const righe = prepared('SELECT chiave, nome, sblocco_data FROM quartiere').all() as Array<{ chiave: string; nome: string; sblocco_data: string | null }>;
  return new Map(righe.map((q) => [q.chiave, { nome: q.nome, dal: q.sblocco_data }]));
}

/** Le finestre dei Palazzi (data/seed/finestre-dungeon.json), lette da `dati_guida`. */
export function finestreArchi(): Map<string, { dal: string; al: string | null }> {
  const out = new Map<string, { dal: string; al: string | null }>();
  const riga = prepared("SELECT json FROM dati_guida WHERE chiave = 'finestre-dungeon'").get() as { json: string } | undefined;
  if (!riga) return out;
  try {
    const dati = JSON.parse(riga.json) as { finestre?: Array<{ dungeon: string; dal?: string | null; al?: string | null }> };
    for (const f of dati.finestre ?? []) if (f.dal) out.set(f.dungeon, { dal: f.dal, al: f.al ?? null });
  } catch { /* trascrizione illeggibile: nessuna finestra */ }
  return out;
}

/** L'arco raggiunto a una data: l'ultimo Palazzo la cui finestra è già cominciata; prima del primo si è comunque nel primo. */
export function arcoAllaData(dataGioco: string | null, finestre: Map<string, { dal: string; al: string | null }>): string | null {
  if (!dataGioco) return null;
  const oggi = ordineGioco(dataGioco);
  let arco: string = ARCHI_STORIA[0];
  for (const d of ARCHI_STORIA) {
    const f = finestre.get(d);
    if (f && ordineGioco(f.dal) <= oggi) arco = d;
  }
  return arco;
}

export function statoDisponibilitaPartita(partitaId: number): StatoDisponibilita {
  const ranghi = new Map(confidenti(partitaId).map((c) => [c.chiave, c.rango]));
  const doti = new Map(dotiSociali(partitaId).map((d) => [d.chiave, d.rango]));
  const st = statoPartitaSemafori(partitaId, ranghi, doti);
  const giorno = st.dataGioco ? (prepared('SELECT giorno_settimana FROM giorno_calendario WHERE data = ?').get(st.dataGioco) as { giorno_settimana: string | null } | undefined)?.giorno_settimana ?? null : null;
  const conta = (sql: string): number => (prepared(sql).get(partitaId) as { n: number }).n;
  const contatori = new Map<ContatoreChiave, number>([
    ['film-completati', conta('SELECT COUNT(*) AS n FROM progresso_film_partita p JOIN film f ON f.chiave = p.film_chiave WHERE p.partita_id = ? AND p.avanzamento >= f.sessioni')],
    ['videogiochi-completati', conta("SELECT COUNT(*) AS n FROM progresso_videogioco_partita p JOIN attivita a ON a.chiave = p.videogioco_chiave WHERE p.partita_id = ? AND a.tipo = 'videogioco' AND p.avanzamento >= a.sessioni")],
    ['libri-letti', conta('SELECT COUNT(*) AS n FROM progresso_libro_partita p JOIN libro l ON l.chiave = p.libro_chiave WHERE p.partita_id = ? AND p.avanzamento >= l.sessioni')],
  ]);
  return {
    ...st, partitaId,
    articoliOttenuti: new Set((prepared('SELECT articolo_chiave FROM acquisto_partita WHERE partita_id = ?').all(partitaId) as Array<{ articolo_chiave: string }>).map((a) => a.articolo_chiave)),
    letture: new Set((prepared('SELECT tipo, chiave FROM lettura_partita WHERE partita_id = ?').all(partitaId) as Array<{ tipo: string; chiave: string }>).map((a) => a.tipo + '/' + a.chiave)),
    contatori,
    attivitaSvolte: new Map((prepared('SELECT attivita_chiave, volte FROM attivita_svolta_partita WHERE partita_id = ?').all(partitaId) as Array<{ attivita_chiave: string; volte: number }>).map((r) => [r.attivita_chiave, r.volte])),
    spesaPerNegozio: new Map((prepared('SELECT a.negozio_chiave AS negozio, COALESCE(SUM(a.prezzo), 0) AS spesa FROM acquisto_partita q JOIN articolo a ON a.chiave = q.articolo_chiave WHERE q.partita_id = ? GROUP BY a.negozio_chiave').all(partitaId) as Array<{ negozio: string; spesa: number }>).map((r) => [r.negozio, r.spesa])),
    puntiNegozio: new Map((prepared('SELECT negozio_chiave, punti FROM punti_negozio_partita WHERE partita_id = ?').all(partitaId) as Array<{ negozio_chiave: string; punti: number }>).map((r) => [r.negozio_chiave, r.punti])),
    eventi: new Set((prepared('SELECT evento_chiave FROM evento_storia_partita WHERE partita_id = ? AND avvenuto = 1').all(partitaId) as Array<{ evento_chiave: string }>).map((r) => r.evento_chiave)),
    giornoSettimana: giorno ? piatto(giorno) : null,
    sbloccoQuartieri: sbloccoQuartieri(),
    arcoCorrente: arcoAllaData(st.dataGioco, finestreArchi()),
  };
}

function nomeNegozio(chiave: string): string {
  return (prepared('SELECT nome FROM negozio WHERE chiave = ?').get(chiave) as { nome: string } | undefined)?.nome ?? chiave;
}
function nomeAttivita(chiave: string): string {
  return (prepared('SELECT nome FROM attivita WHERE chiave = ?').get(chiave) as { nome: string } | undefined)?.nome ?? chiave;
}

/** Valuta un requisito: quelli dei Confidenti col valutatore dei semafori, gli altri qui. */
function valutaRequisito(r: RequisitoDisponibilita, indice: number, st: StatoDisponibilita): SemaforoRequisitoDto {
  const base = { indice, testo: r.testo, confermato: false } as const;
  const esito = (tipo: SemaforoRequisitoDto['tipo'], stato: SemaforoRequisitoDto['stato'], dettaglio: string): SemaforoRequisitoDto => ({ ...base, tipo, stato, dettaglio, manuale: false });
  switch (r.tipo) {
    case 'gruppo': {
      const esiti = r.condizioni.map((c, i) => valutaRequisito({ ...c, testo: descriviRequisitoSpillo(c) }, i, st));
      const stato = r.modo === 'tutte'
        ? (esiti.some((e) => e.stato === 'rosso') ? 'rosso' : esiti.some((e) => e.stato === 'grigio') ? 'grigio' : 'verde')
        : (esiti.some((e) => e.stato === 'verde') ? 'verde' : esiti.some((e) => e.stato === 'grigio') ? 'grigio' : 'rosso');
      return esito('gruppo', stato, esiti.map((e) => e.testo + ': ' + e.dettaglio).join(' · '));
    }
    case 'non': {
      const dentro = valutaRequisito({ ...r.condizione, testo: descriviRequisitoSpillo(r.condizione) }, indice, st);
      return { ...dentro, ...base, tipo: 'non', stato: dentro.stato === 'verde' ? 'rosso' : dentro.stato === 'rosso' ? 'verde' : 'grigio', dettaglio: 'Non: ' + dentro.dettaglio };
    }
    case 'articolo': {
      const ok = st.articoliOttenuti.has(r.articolo);
      return esito('articolo', ok ? 'verde' : 'rosso', ok ? 'Articolo segnato come ottenuto' : 'Segna l’articolo come acquistato/ottenuto nel negozio');
    }
    case 'lettura': {
      const ok = st.letture.has(r.categoria + '/' + r.chiave);
      return esito('lettura', ok ? 'verde' : 'rosso', ok ? 'Completato nella partita' : 'Ancora da completare (Partita → Letture e giochi)');
    }
    case 'contatore': {
      const v = st.contatori.get(r.cosa) ?? 0;
      const nome = CONTATORI.find((c) => c.chiave === r.cosa)?.nome ?? r.cosa;
      return esito('contatore', v >= r.almeno ? 'verde' : 'rosso', `${nome}: ${v} di ${r.almeno}`);
    }
    case 'attivita': {
      const v = st.attivitaSvolte.get(r.attivita) ?? 0;
      return esito('attivita', v >= r.volte ? 'verde' : 'rosso', `${nomeAttivita(r.attivita)}: svolta ${v} ${v === 1 ? 'volta' : 'volte'} di ${r.volte} (Partita → Progressi)`);
    }
    case 'evento': {
      const nome = EVENTI_STORIA.find((e) => e.chiave === r.evento)?.nome ?? r.evento;
      const membro = membroDellEvento(r.evento);
      if (membro) {
        // «Entra in squadra» si legge dalla squadra: verde se c'è, rosso se dichiarato fuori, grigio se non segnato.
        if (st.membriSquadra.has(membro)) return esito('evento', 'verde', `${nome}: in squadra`);
        if (st.membriFuoriSquadra.has(membro)) return esito('evento', 'rosso', `${nome}: non in squadra (Partita → Denaro e squadra)`);
        return esito('evento', 'grigio', `${nome}: non ancora segnato in squadra (Partita → Denaro e squadra)`);
      }
      const ok = st.eventi.has(r.evento);
      return esito('evento', ok ? 'verde' : 'rosso', ok ? `${nome}: avvenuto` : `${nome}: non ancora segnato (Partita → Progressi)`);
    }
    case 'rango-cliente': {
      const spesa = st.spesaPerNegozio.get(r.negozio) ?? 0;
      const richiesto = RANGHI_CLIENTE.find((x) => x.chiave === r.rango);
      const attuale = [...RANGHI_CLIENTE].reverse().find((x) => spesa >= x.spesa) ?? RANGHI_CLIENTE[0];
      const ok = !!richiesto && spesa >= richiesto.spesa;
      return esito('rango-cliente', ok ? 'verde' : 'rosso', `${nomeNegozio(r.negozio)}: grado ${attuale.nome} (spesi ¥${spesa.toLocaleString('it-IT')}${richiesto && !ok ? `, servono ¥${richiesto.spesa.toLocaleString('it-IT')}` : ''})`);
    }
    case 'punti-negozio': {
      const v = st.puntiNegozio.get(r.negozio) ?? 0;
      return esito('punti-negozio', v >= r.punti ? 'verde' : 'rosso', `${nomeNegozio(r.negozio)}: ${v} punti di ${r.punti} (Partita → Progressi)`);
    }
    case 'arco': {
      if (!st.arcoCorrente) return esito('arco', 'grigio', 'Imposta il giorno corrente della partita');
      const ok = ARCHI_STORIA.indexOf(st.arcoCorrente as typeof ARCHI_STORIA[number]) >= ARCHI_STORIA.indexOf(r.dungeon as typeof ARCHI_STORIA[number]);
      return esito('arco', ok ? 'verde' : 'rosso', ok ? `Siamo nell'arco del ${nomePalazzo(st.arcoCorrente)}` : `Dall'arco del ${nomePalazzo(r.dungeon)}: siamo ancora in quello del ${nomePalazzo(st.arcoCorrente)}`);
    }
    case 'intervallo': {
      if (!st.dataGioco) return esito('data', 'grigio', 'Imposta il giorno corrente della partita');
      const oggi = ordineGioco(st.dataGioco);
      const dentro = oggi >= ordineGioco(r.dal) && oggi <= ordineGioco(r.al);
      return esito('data', dentro ? 'verde' : 'rosso', r.dal === r.al ? (dentro ? `Solo il ${dataLeggibile(r.dal)}: è oggi` : `Solo il ${dataLeggibile(r.dal)}, oggi è il ${dataLeggibile(st.dataGioco)}`) : dentro ? `Nel periodo dal ${dataLeggibile(r.dal)} al ${dataLeggibile(r.al)} (oggi ${dataLeggibile(st.dataGioco)})` : `Solo dal ${dataLeggibile(r.dal)} al ${dataLeggibile(r.al)}, oggi è il ${dataLeggibile(st.dataGioco)}`);
    }
    case 'piove': {
      if (!st.meteoOggi) return esito('meteo', 'grigio', 'Meteo del giorno corrente non noto');
      const piove = /piogg|tempor/i.test(st.meteoOggi);
      return esito('meteo', piove ? 'verde' : 'rosso', piove ? `Oggi ${st.meteoOggi}` : `Solo con la pioggia: oggi ${st.meteoOggi}`);
    }
    case 'giorno-settimana': {
      if (!st.giornoSettimana) return esito('giorno-settimana', 'grigio', 'Imposta il giorno corrente della partita');
      const ok = r.giorni.includes(st.giornoSettimana);
      return esito('giorno-settimana', ok ? 'verde' : 'rosso', ok ? `Oggi è ${st.giornoSettimana}` : `Solo ${r.giorni.join(', ')}: oggi è ${st.giornoSettimana}`);
    }
    case 'fascia': {
      if (!st.fasciaGioco) return esito('fascia', 'grigio', 'Imposta il momento della giornata nella scheda Oggi');
      const ok = st.fasciaGioco === r.fascia;
      return esito('fascia', ok ? 'verde' : 'rosso', ok ? `Ora è ${st.fasciaGioco}` : `Solo di ${r.fascia}: ora è ${st.fasciaGioco}`);
    }
    case 'stagione': {
      if (!st.dataGioco) return esito('stagione', 'grigio', 'Imposta il giorno corrente della partita');
      const attuale = STAGIONE_PER_MESE[Number(st.dataGioco.slice(0, 2))] ?? '';
      const ok = attuale === r.stagione;
      return esito('stagione', ok ? 'verde' : 'rosso', ok ? `Siamo in ${attuale}` : `Solo in ${r.stagione}: siamo in ${attuale}`);
    }
    case 'quartiere': {
      const q = st.sbloccoQuartieri.get(r.quartiere);
      const nome = q?.nome ?? r.quartiere;
      if (!q?.dal) return esito('data', 'grigio', `${nome}: la Guida non indica una data di sblocco`);
      // stessa valutazione (e stesso testo) di una data della guida
      const esitoData = valutaRequisito({ tipo: 'data', dal: q.dal, testo: r.testo }, indice, st);
      return { ...esitoData, dettaglio: `${nome}: ${esitoData.dettaglio}` };
    }
    default: {
      const { tipo, testo, ...dati } = r as RequisitoSeed & Record<string, unknown>;
      if (tipo === 'richiesta') dati.richiesta = (prepared('SELECT nome FROM richiesta WHERE chiave=?').get(String(dati.richiesta)) as { nome: string } | undefined)?.nome ?? dati.richiesta;
      const riga: RigaRequisito = { confidente_chiave: '', rango: 0, indice, tipo, dati_json: JSON.stringify(dati), testo };
      const valutato = valuta(riga, st);
      // Palazzo non completato e richiesta non conclusa sono fatti che l'app registra (boss segnato, richiesta completata): per la
      // disponibilità valgono come blocco, non come dubbio da confermare a mano.
      if ((tipo === 'palazzo' || tipo === 'richiesta') && valutato.stato === 'grigio') {
        return { ...valutato, stato: 'rosso', manuale: false, dettaglio: valutato.dettaglio.replace(/\s*(?:—\s*)?(?:o|oppure) conferma qui\s*$/, '') };
      }
      return { ...valutato, manuale: false };
    }
  }
}

/** Come sotto, ma per uno spillo: **solo la presenza nasconde**.
 *
 * Un requisito che non riguarda la presenza — una dote da alzare, un Confidente da portare a un
 * rango, una porta che vuole una chiave — non deve far sparire il pin: la cosa c'è, e la guida
 * serve proprio a dire dov'è prima che tu possa usarla. Resta scritto accanto al pin, e concorre
 * al massimo a un «ignoto».
 *
 * Il rosso di una condizione di presenza invece toglie il pin, ed è quello che si vuole: se il
 * quartiere apre a giugno, in aprile quel negozio non c'è, e mostrarlo manda il giocatore a
 * cercare una cosa che non esiste ancora.
 */
export function valutaRequisitiSpillo(elenco: RequisitoDisponibilita[], st: StatoDisponibilita): DisponibilitaDto {
  const requisiti = elenco.map((r, i) => valutaRequisito(r, i, st));
  // Si valuta la **proiezione di presenza** di ciascun requisito, non il requisito intero: di
  // `tutte(fascia sera, dote 3)` resta `tutte(fascia sera)`, e se quella è rossa la cosa in
  // quel momento non c'è — dote o non dote.
  const bloccante = elenco.some((r, i) => {
    const presenza = proiezioneDiPresenza(r as unknown as { tipo: string }) as RequisitoDisponibilita | null;
    return presenza !== null && valutaRequisito({ ...presenza, testo: r.testo }, i, st).stato === 'rosso';
  });
  const stato = bloccante ? 'bloccato'
    : requisiti.some((q) => q.stato === 'rosso' || q.stato === 'grigio') ? 'ignoto' : 'disponibile';
  return { stato, requisiti };
}

/** Disponibilità complessiva: «bloccato» con almeno un rosso, «ignoto» se resta del grigio, «disponibile» altrimenti (anche senza requisiti). */
export function valutaRequisiti(elenco: RequisitoDisponibilita[], st: StatoDisponibilita): DisponibilitaDto {
  const requisiti = elenco.map((r, i) => valutaRequisito(r, i, st));
  const stato = requisiti.some((q) => q.stato === 'rosso') ? 'bloccato' : requisiti.some((q) => q.stato === 'grigio') ? 'ignoto' : 'disponibile';
  return { stato, requisiti };
}
