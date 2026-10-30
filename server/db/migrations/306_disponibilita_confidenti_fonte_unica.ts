// ============================================================
// Migrazione 306 — disponibilità dei Confidenti: la pioggia da una fonte sola, le eccezioni mancanti della guida, Ohya del 5 luglio di sera
// ============================================================
//
// L13, ondata 6, lotto O6-1 (istruzione dell'utente: «completa il lavoro rimasto fermo... le ondate mancanti»). La pioggia dei Confidenti viveva in
// due punti che divergevano: i requisiti di rango (`confidente_requisito`, tipo `meteo`, `non-piove`: li leggono i semafori) e le eccezioni della
// disponibilità strutturata (`confidente_disponibilita.eccezioni_json`, tipo `pioggia`, scritte dalla 163: le leggeva il valutatore della scheda, del
// luogo e del Diario). Da qui la fonte unica è il requisito di rango (col «Ripristina» da `confidente_requisito_guida`), come per il «dal» (R9-04/4):
// il valutatore riceve dal servizio se l'incontro del rango successivo non si fa con la pioggia e le righe `pioggia` residue non si leggono più.
//
// Che cosa fa, ogni scrittura solo se la riga ha ancora il valore atteso (una riga cambiata dall'utente si salta e si dice nell'audit):
//   (a) toglie la riga `pioggia` dalle eccezioni dove i ranghi coincidono con quelli dei requisiti `meteo non-piove` (senza ranghi = tutti, 1-10),
//       anche nella fotografia di «Ripristina» (`dati_guida` `disponibilita-struttura-seed-v1:<chiave>`), confrontata coi requisiti della guida;
//       dove non coincidono (Futaba: eccezione «sempre», nessun requisito) la riga resta, in attesa della risposta dell'utente (domanda 2);
//   (c) le eccezioni della guida italiana Royal che mancavano (pagine «guida-rango-confidente-di-…», lette il 2026-10-30):
//       Kawakami: i giorni del rango 1 e del rango 10 sono tutti («possiamo chiamare Kawakami in qualsiasi giorno della settimana, anche nei
//       giorni in cui Kawakami non è disponibile», prima di sbloccarla; «in qualsiasi giorno della settimana per raggiungere il Rango 10»);
//       Iwai: i giorni del rango 1 sono tutti («può parlare con Iwai in qualsiasi giorno della settimana per sbloccarlo»);
//       Takemi: due giorni dopo un rango («al massimo una volta ogni tre giorni», la stessa lettura di Mishima);
//       Maruki: i giorni in cui non si incontra (dopo il 20 settembre «28 settembre; 4 e 6 ottobre; 1, 3, 8, 10 e 15 novembre»);
//   (e) la voce del Diario del 5 luglio «Confidente Ohya al bar Crossroads di Shinjuku» passa alla sera, dopo «Affidare il bucato a Kawakami»
//       (soluzione della settimana 13: di sera il bucato, poi il Crossroads per il rango 1), solo se è ancora di giorno, col suo testo, e non è
//       spuntata in nessuna partita.
// Non applicati (domande all'utente, decisione 23 casi a/b): Futaba (domanda 2), il rango 7.5 di Takemi con la pioggia (domanda 3), il testo dei
// requisiti di rango 1 di Takemi e Ohya (domanda 1). Le partite non si toccano (si legge solo `utente.spunta_voce_partita`). Idempotente: la
// seconda volta non trova niente da fare e non scrive. Audit in `dati_guida.audit-306-disponibilita-fonte-unica`.
//
// Fonti (guida italiana): https://www.allgamestaff.it/persona-5-royal/guida-rango-confidente-di-kawakami-temperanza/ ;
// …/guida-rango-confidente-di-iwai-appeso/ ; …/guida-rango-confidente-di-tae-takemi-morte/ ; …/guida-rango-confidente-di-maruki-consigliere/ ;
// …/soluzione-settimana-13/ .
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';
import { normalizzaRequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { richiedeNonPioggia } from '../../../shared/disponibilitaStrutturata.js';

const AUDIT = 'audit-306-disponibilita-fonte-unica';
const RICHIESTA = '2026-10-30: «completa il lavoro rimasto fermo... le ondate mancanti e tutto quanto non ancora gestito rispetto all’obiettivo» (L13, ondata 6, lotto O6-1)';
const GUIDA = 'https://www.allgamestaff.it/persona-5-royal/';
const FONTI = {
  kawakami: `${GUIDA}guida-rango-confidente-di-kawakami-temperanza/`,
  iwai: `${GUIDA}guida-rango-confidente-di-iwai-appeso/`,
  takemi: `${GUIDA}guida-rango-confidente-di-tae-takemi-morte/`,
  maruki: `${GUIDA}guida-rango-confidente-di-maruki-consigliere/`,
  settimana13: `${GUIDA}soluzione-settimana-13/`,
} as const;
const SEED = (c: string) => `disponibilita-struttura-seed-v1:${c}`;
const errore = (motivo: string): never => { throw new Error(`306: ${motivo}; nessuna modifica applicata.`); };
type Esito = { chiave: string; esito: string; prima?: unknown; dopo?: unknown };

const TUTTI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const RANGHI = Array.from({ length: 10 }, (_, i) => i + 1);

/** (c) Le eccezioni nuove: il valore che la riga deve avere oggi (letto il 2026-10-30, dopo (a)) e quello che prende. */
const ECCEZIONI_NUOVE: ReadonlyArray<{ confidente: string; atteso: unknown[]; dopo: unknown[]; fonte: string; citazione: string }> = [
  { confidente: 'kawakami', atteso: [], fonte: FONTI.kawakami,
    dopo: [{ tipo: 'giorni-rango', rango: 1, giorni: TUTTI }, { tipo: 'giorni-rango', rango: 10, giorni: TUTTI }],
    citazione: 'prima di sbloccarla si può chiamare in qualsiasi giorno; dopo il giorno di scuola successivo al Rango 9, in qualsiasi giorno per il Rango 10' },
  { confidente: 'iwai', atteso: [], fonte: FONTI.iwai,
    dopo: [{ tipo: 'giorni-rango', rango: 1, giorni: TUTTI }],
    citazione: 'prima di sbloccarlo può parlargli in qualsiasi giorno della settimana' },
  { confidente: 'takemi', atteso: [], fonte: FONTI.takemi,
    dopo: [{ tipo: 'dopo-rango', giorni: 2, effetto: 'non-disponibile' }],
    citazione: 'gli eventi di aumento del rango sono disponibili al massimo una volta ogni tre giorni' },
  { confidente: 'maruki', atteso: [], fonte: FONTI.maruki,
    dopo: [{ tipo: 'date', date: ['09-28', '10-04', '10-06', '11-01', '11-03', '11-08', '11-10', '11-15'], effetto: 'non-disponibile' }],
    citazione: 'dopo il 20 settembre, eccezioni in cui non è possibile incontrarlo: 28 settembre; 4 e 6 ottobre; 1, 3, 8, 10 e 15 novembre' },
];

/** (e) La voce di Ohya del 5 luglio e quella dopo cui va, di sera. */
const VOCE_OHYA = { uid: 'd64fa904303311103b323170025c343d', data: '07-05', azione: 'Confidente Ohya al bar Crossroads di Shinjuku' } as const;
const VOCE_BUCATO = { uid: 'e3817c96df0b8aa98d057a8982ec5e59', azione: 'Affidare il bucato a Kawakami' } as const;

/** Il JSON rimesso in forma canonica; null se non si legge. */
function canonica(testo: string | null | undefined): string | null {
  if (testo === null || testo === undefined) return null;
  try { return JSON.stringify(JSON.parse(testo)); } catch { return null; }
}

/** Le eccezioni di una riga come elenco; null se non si leggono (la riga non si tocca). */
function eccezioniDi(testo: string | null | undefined): Array<Record<string, unknown>> | null {
  if (testo === null || testo === undefined) return null;
  try { const v = JSON.parse(testo) as unknown; return Array.isArray(v) && v.every((e) => !!e && typeof e === 'object') ? v as Array<Record<string, unknown>> : null; } catch { return null; }
}

/** I ranghi di una riga `pioggia` (senza `ranghi` = tutti). */
const ranghiDellaPioggia = (e: Record<string, unknown>): number[] => Array.isArray(e.ranghi) ? [...new Set(e.ranghi.map(Number))].sort((a, b) => a - b) : RANGHI;

/** I ranghi di ogni Confidente con un requisito «non deve piovere» nella tabella data (`confidente_requisito` o la sua copia della guida). */
function ranghiSenzaPioggia(db: AppDatabase, tabella: 'confidente_requisito' | 'confidente_requisito_guida'): Map<string, number[]> {
  const m = new Map<string, Set<number>>();
  if (!esisteTabella(db, tabella)) return new Map();
  for (const r of db.prepare(`SELECT confidente_chiave, rango, tipo, dati_json FROM main.${tabella}`).all() as Array<{ confidente_chiave: string; rango: number; tipo: string; dati_json: string }>) {
    let dati: unknown;
    try { dati = JSON.parse(r.dati_json); } catch { continue; }
    const c = dati && typeof dati === 'object' ? normalizzaRequisitoSpillo({ ...(dati as Record<string, unknown>), tipo: r.tipo }) : null;
    if (!c || !richiedeNonPioggia(c)) continue;
    const s = m.get(r.confidente_chiave) ?? new Set<number>();
    s.add(Number(r.rango));
    m.set(r.confidente_chiave, s);
  }
  return new Map([...m].map(([k, s]) => [k, [...s].sort((a, b) => a - b)]));
}

const stessiRanghi = (a: number[], b: number[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

/** La fotografia di «Ripristina» di un Confidente (testo grezzo), se c'è. */
const fotografia = (db: AppDatabase, c: string): string | undefined =>
  esisteTabella(db, 'dati_guida') ? db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(SEED(c)) as string | undefined : undefined;

/** (a) Le righe `pioggia` che dicono la stessa cosa dei requisiti di rango, tolte dalla riga e dalla fotografia di «Ripristina». */
function pioggia(db: AppDatabase): Esito[] {
  const esiti: Esito[] = [];
  const requisiti = ranghiSenzaPioggia(db, 'confidente_requisito');
  const requisitiGuida = ranghiSenzaPioggia(db, 'confidente_requisito_guida');
  const righe = db.prepare('SELECT confidente_chiave, eccezioni_json FROM main.confidente_disponibilita ORDER BY confidente_chiave').all() as Array<{ confidente_chiave: string; eccezioni_json: string }>;
  for (const r of righe) {
    const c = r.confidente_chiave;
    const eccezioni = eccezioniDi(r.eccezioni_json);
    if (!eccezioni) { esiti.push({ chiave: `disponibilita:${c}`, esito: 'eccezioni illeggibili: non toccate', prima: r.eccezioni_json }); continue; }
    const piogge = eccezioni.filter((e) => e.tipo === 'pioggia');
    if (piogge.length > 0) {
      const req = requisiti.get(c) ?? [];
      if (piogge.length > 1) esiti.push({ chiave: `disponibilita:${c}`, esito: 'più righe «pioggia»: non toccate', prima: r.eccezioni_json });
      else if (!stessiRanghi(ranghiDellaPioggia(piogge[0]!), req)) {
        esiti.push({ chiave: `disponibilita:${c}`, esito: `pioggia ai ranghi ${ranghiDellaPioggia(piogge[0]!).join(',')}, requisiti ai ranghi ${req.join(',') || 'nessuno'}: divergono, non toccata (${c === 'futaba' ? 'domanda 2 all’utente' : 'da decidere con l’utente'})`, prima: r.eccezioni_json });
      } else {
        const dopo = JSON.stringify(eccezioni.filter((e) => e.tipo !== 'pioggia'));
        if (db.prepare('UPDATE main.confidente_disponibilita SET eccezioni_json = ? WHERE confidente_chiave = ? AND eccezioni_json = ?').run(dopo, c, r.eccezioni_json).changes !== 1) errore(`le eccezioni di ${c} non si aggiornano`);
        esiti.push({ chiave: `disponibilita:${c}`, esito: `pioggia tolta (ranghi ${req.join(',')}: gli stessi dei requisiti)`, prima: r.eccezioni_json, dopo });
      }
    }
    // la fotografia di «Ripristina», se c'è: confrontata coi requisiti della guida, la fonte del «Ripristina» dei requisiti
    const seed = fotografia(db, c);
    if (seed === undefined) continue;
    let foto: Record<string, unknown>;
    try { foto = JSON.parse(seed) as Record<string, unknown>; } catch { esiti.push({ chiave: `fotografia:${c}`, esito: 'fotografia illeggibile: non toccata' }); continue; }
    const eccFoto = typeof foto.eccezioni_json === 'string' ? eccezioniDi(foto.eccezioni_json) : null;
    if (!eccFoto) { esiti.push({ chiave: `fotografia:${c}`, esito: 'eccezioni della fotografia illeggibili: non toccate' }); continue; }
    const pioggeFoto = eccFoto.filter((e) => e.tipo === 'pioggia');
    if (pioggeFoto.length === 0) continue;
    const reqG = requisitiGuida.get(c) ?? [];
    if (pioggeFoto.length > 1 || !stessiRanghi(ranghiDellaPioggia(pioggeFoto[0]!), reqG)) {
      esiti.push({ chiave: `fotografia:${c}`, esito: `pioggia della fotografia diversa dai requisiti della guida (${reqG.join(',') || 'nessuno'}): non toccata`, prima: foto.eccezioni_json });
      continue;
    }
    const eccDopo = JSON.stringify(eccFoto.filter((e) => e.tipo !== 'pioggia'));
    if (db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ? AND json = ?').run(JSON.stringify({ ...foto, eccezioni_json: eccDopo }), SEED(c), seed).changes !== 1) errore(`la fotografia di ${c} non si aggiorna`);
    esiti.push({ chiave: `fotografia:${c}`, esito: 'pioggia tolta dalla fotografia di «Ripristina»', prima: foto.eccezioni_json, dopo: eccDopo });
  }
  return esiti;
}

/** (c) Le eccezioni della guida che mancavano: solo dove le eccezioni sono ancora quelle attese (e così la fotografia, se c'è). */
function eccezioniNuove(db: AppDatabase): Esito[] {
  return ECCEZIONI_NUOVE.map((n): Esito => {
    const chiave = `disponibilita:${n.confidente}`;
    const r = db.prepare('SELECT modo, eccezioni_json FROM main.confidente_disponibilita WHERE confidente_chiave = ?').get(n.confidente) as { modo: string; eccezioni_json: string } | undefined;
    if (!r) return { chiave, esito: 'riga assente: niente da fare' };
    const dopo = JSON.stringify(n.dopo);
    if (canonica(r.eccezioni_json) === dopo) return { chiave, esito: 'eccezioni già della guida' };
    if (r.modo !== 'settimanale' || canonica(r.eccezioni_json) !== JSON.stringify(n.atteso)) {
      return { chiave, esito: `eccezioni (o modo «${r.modo}») diverse da quelle attese: non toccate`, prima: r.eccezioni_json };
    }
    const seed = fotografia(db, n.confidente);
    let fotoNuova: string | null = null;
    if (seed !== undefined) {
      let foto: Record<string, unknown> | null;
      try { foto = JSON.parse(seed) as Record<string, unknown>; } catch { foto = null; }
      const eccFoto = foto && typeof foto.eccezioni_json === 'string' ? canonica(foto.eccezioni_json) : null;
      if (!foto || (eccFoto !== JSON.stringify(n.atteso) && eccFoto !== dopo)) return { chiave, esito: 'la fotografia di «Ripristina» ha eccezioni diverse da quelle attese: non toccata', prima: r.eccezioni_json };
      if (eccFoto !== dopo) fotoNuova = JSON.stringify({ ...foto, eccezioni_json: dopo });
    }
    if (db.prepare('UPDATE main.confidente_disponibilita SET eccezioni_json = ? WHERE confidente_chiave = ? AND eccezioni_json = ?').run(dopo, n.confidente, r.eccezioni_json).changes !== 1) errore(`le eccezioni di ${n.confidente} non si aggiornano`);
    if (fotoNuova !== null && db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ? AND json = ?').run(fotoNuova, SEED(n.confidente), seed).changes !== 1) errore(`la fotografia di ${n.confidente} non si aggiorna`);
    return { chiave, esito: `eccezioni della guida (${n.fonte}: «${n.citazione}»)${fotoNuova !== null ? ', anche nella fotografia di «Ripristina»' : ''}`, prima: r.eccezioni_json, dopo };
  });
}

/** Lo schema delle partite è attaccato e ha la tabella? (sola lettura) */
function tabellaPartite(db: AppDatabase, tabella: string): boolean {
  const schemi = db.prepare('PRAGMA database_list').all() as Array<{ name: string }>;
  return schemi.some((s) => s.name === 'utente') && !!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = ?").get(tabella);
}

/** (e) La voce di Ohya del 5 luglio alla sera, dopo il bucato di Kawakami: solo se è ancora di giorno, col suo testo, e mai spuntata. */
function voceOhya(db: AppDatabase, adesso: string): Esito {
  const chiave = `voce:${VOCE_OHYA.uid}`;
  if (!esisteTabella(db, 'voce_giornata')) return { chiave, esito: 'Diario assente: niente da fare' };
  const v = db.prepare('SELECT data, fascia, ordine, azione FROM main.voce_giornata WHERE uid = ?').get(VOCE_OHYA.uid) as { data: string; fascia: string; ordine: number; azione: string } | undefined;
  if (!v) return { chiave, esito: 'voce assente: niente da fare' };
  if (v.data === VOCE_OHYA.data && v.fascia === 'sera') return { chiave, esito: 'voce già di sera' };
  if (v.data !== VOCE_OHYA.data || v.fascia !== 'giorno' || v.azione !== VOCE_OHYA.azione) return { chiave, esito: 'voce diversa da quella attesa (giorno, fascia o testo): non toccata', prima: v };
  // senza lo schema delle partite non si sa se è spuntata: non si sposta (caso c della decisione 23)
  if (!tabellaPartite(db, 'spunta_voce_partita')) return { chiave, esito: 'schema delle partite assente: non si sa se la voce è spuntata, non toccata', prima: v };
  const spunte = (db.prepare('SELECT partita_id FROM utente.spunta_voce_partita WHERE voce_uid = ? ORDER BY partita_id').all(VOCE_OHYA.uid) as Array<{ partita_id: number }>).map((s) => s.partita_id);
  if (spunte.length > 0) return { chiave, esito: `voce spuntata nelle partite ${spunte.join(', ')}: non toccata (dati già registrati)`, prima: v };
  const bucato = db.prepare('SELECT data, fascia, ordine, azione FROM main.voce_giornata WHERE uid = ?').get(VOCE_BUCATO.uid) as { data: string; fascia: string; ordine: number; azione: string } | undefined;
  if (!bucato || bucato.data !== VOCE_OHYA.data || bucato.fascia !== 'sera' || bucato.azione !== VOCE_BUCATO.azione) return { chiave, esito: 'la voce del bucato di Kawakami non è più la sera del 5 luglio: non toccata', prima: v };
  // subito dopo il bucato, spostando avanti di uno le voci della sera che venivano dopo (nessuna, oggi), dall'ultima
  const ordine = bucato.ordine + 1;
  const spostate = db.prepare("SELECT uid, ordine FROM main.voce_giornata WHERE data = ? AND fascia = 'sera' AND ordine >= ? ORDER BY ordine DESC").all(VOCE_OHYA.data, ordine) as Array<{ uid: string; ordine: number }>;
  for (const s of spostate) {
    if (db.prepare('UPDATE main.voce_giornata SET ordine = ?, updated_at = ? WHERE uid = ? AND ordine = ?').run(s.ordine + 1, adesso, s.uid, s.ordine).changes !== 1) errore(`la voce ${s.uid} non si sposta`);
  }
  if (db.prepare("UPDATE main.voce_giornata SET fascia = 'sera', ordine = ?, updated_at = ? WHERE uid = ? AND fascia = 'giorno' AND ordine = ?").run(ordine, adesso, VOCE_OHYA.uid, v.ordine).changes !== 1) errore('la voce di Ohya non si aggiorna');
  return { chiave, esito: `di sera, dopo «${VOCE_BUCATO.azione}» (${FONTI.settimana13})`, prima: v, dopo: { ...v, fascia: 'sera', ordine, vociSpostate: spostate.map((s) => s.uid) } };
}

/** Ciò che resta in attesa di una risposta dell'utente (non si applica): per l'audit. */
const IN_ATTESA = [
  { domanda: 1, chiave: 'requisito:takemi:1 e requisito:ohya:1', che: 'testo «si sblocca a partire dal 15 aprile / 18 giugno (indicazione dell’utente, 2026-09-05)» diverso dai dati (04-18, 07-05): unica divergenza fra testo e dati dei requisiti di tipo data; non toccato' },
  { domanda: 2, chiave: 'disponibilita:futaba', che: 'eccezione «pioggia» per tutti i ranghi senza requisiti meteo: nessun vincolo o non disponibile con la pioggia? non toccata (il valutatore non la legge più)' },
  { domanda: 3, chiave: 'requisito:takemi:7.5', che: 'la guida dice che anche l’evento 7.5 non si fa con la pioggia: non applicato' },
];

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, daDire: boolean): void {
  if (!esisteTabella(db, 'dati_guida')) return;
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !daDire) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 306, richiesta: RICHIESTA, fonti: Object.values(FONTI),
      regola: 'pioggia: una sola fonte, i requisiti di rango; righe «pioggia» tolte solo dove i ranghi coincidono coi requisiti (fotografia di «Ripristina» coi requisiti della guida); eccezioni nuove solo su eccezioni ancora vuote e modo settimanale (e fotografia uguale); voce di Ohya solo se ancora di giorno, col suo testo e mai spuntata; le partite non si toccano',
      inAttesa: IN_ATTESA,
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration306: Migration = {
  id: 306,
  name: 'disponibilita_confidenti_fonte_unica',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['confidente_disponibilita', 'confidente_requisito']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 306, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    if (!haColonna(db, 'confidente_disponibilita', 'eccezioni_json') || !haColonna(db, 'confidente_disponibilita', 'modo')) {
      logger.warn({ migrazione: 306 }, 'disponibilità strutturata assente: niente da fare'); return;
    }
    const adesso = new Date().toISOString();
    const esiti: Esito[] = [...pioggia(db), ...eccezioniNuove(db), voceOhya(db, adesso)];
    const conteggi = {
      pioggiaTolta: esiti.filter((e) => e.chiave.startsWith('disponibilita:') && e.esito.startsWith('pioggia tolta')).length,
      fotografie: esiti.filter((e) => e.chiave.startsWith('fotografia:') && e.esito.startsWith('pioggia tolta')).length,
      eccezioniNuove: esiti.filter((e) => e.esito.startsWith('eccezioni della guida (')).length,
      voci: esiti.filter((e) => e.chiave.startsWith('voce:') && e.esito.startsWith('di sera')).length,
    };
    const cambiato = Object.values(conteggi).some((n) => n > 0);
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { conteggi, esiti }, cambiato);
    logger.info({ migrazione: 306, ...conteggi }, 'disponibilità dei Confidenti: pioggia da una fonte sola, eccezioni della guida');
  },
};
