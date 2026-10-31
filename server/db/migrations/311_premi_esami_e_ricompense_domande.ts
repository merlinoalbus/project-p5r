// ============================================================
// Migrazione 311 — premi degli esami per piazzamento, requisito di Conoscenza, risultati del 24 ottobre, ricompense delle domande dalle voci
// ============================================================
//
// L13, ondata 7, lotto O7-2 (istruzione dell'utente: «completa il lavoro rimasto fermo... le ondate mancanti e tutto quanto non ancora gestito
// rispetto all'obiettivo»). Fonte: https://www.allgamestaff.it/persona-5-royal/interrogazioni-esami-risposte/, riletta il 2026-10-31: «tra i
// primi 10 della classe … Fascino +3», «sopra la media» Fascino +2, «una prestazione insufficiente non comporta alcun bonus»; nessun bonus a
// parte per il primo posto; requisiti di Conoscenza per il primo posto: metà semestre 1 rango 4 o più, fine semestre 1 rango 5, metà semestre 2
// rango 5, fine semestre 2 rango 5 e tutte le risposte corrette; risultati il 20 maggio, 19 luglio, 24 ottobre, 24 dicembre. Il dato Royal
// prevale: i requisiti di Persona 5 vanilla (samurai-gamers) escono.
//   (1) colonne nuove dell'esame: `premi_json` ([{piazzamento, doti:[{dote, note}], trofeo?}]: primo e primi-10 → Fascino ♪♪♪, sopra-media →
//       Fascino ♪♪, altro → nessuno) e `requisito_conoscenza` ({rango, tutteCorrette}). Si scrivono solo se vuote. Il trofeo del primo posto
//       entra solo se la scheda del trofeo lo conferma (`trofeo.come` dice «primo della classe»).
//   (2) `esame_premi` (riga «premi»): restano la fonte della guida e le note generali; «fascinoPerPiazzamento» (con l'«INCERTO»),
//       «moltiplicatoreConfidenti» (la regola sta nel codice, `shared/puntiConfidenti.ts`), «requisitoConoscenza» (vanilla) e «trofeo» escono, con
//       i valori nell'audit. Solo se la riga è ancora quella della guida (origine «seed», campi e testi attesi).
//   (3) le voci dei risultati: per data dei risultati di ogni esame. Il 24 ottobre la voce della domanda (3686c541) ha il Fascino ♪♪♪ fisso del
//       premio e la nota «punteggio massimo agli esami: trofeo Un travestimento perfetto, Fascino +3»: il Fascino esce, entra l'effetto «esame»
//       (alla spunta si sceglie il piazzamento, che dà il premio), la nota (tutta già strutturata: Conoscenza nella Dote, premio e trofeo
//       nell'esame) si toglie conservando il testo di prima, e la proposta aperta del trofeo sulla stessa voce si chiude come superata (il
//       trofeo è il premio del primo posto). Con `convertiVoce`: mai una voce citata da una partita o diversa da quella letta. Il 20 maggio la
//       voce (4ddc2508) è spuntata in una partita con il Fascino già dato: non si converte (decisione 23, caso c). Il 19 luglio e il 24
//       dicembre non hanno una voce dei risultati: si elencano.
//   (4) le ricompense delle domande (decisione 9: la Dote la applica la voce): `domanda.ricompensa` si svuota solo dove il testo dice quel che
//       le voci collegate danno (Conoscenza ♪ per «Conoscenza +1 nota», «… per passo» e «Aumento della Dote Conoscenza…»; niente per le righe
//       d'esame «contribuisce al piazzamento»), solo sulle righe della guida mai corrette. Restano in testo le discordanze, le domande senza voce
//       e le domande della decisione 10 (4, 6, 30, 66: il testo si corregge solo dopo il sì dell'utente).
// Le partite non si toccano (impronta di tutto lo schema `utente` prima e dopo). Idempotente: la seconda volta non trova niente da fare e non
// scrive. Audit in `dati_guida.audit-311-esami-e-domande`. Solo `main`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { canonico, chiudiProposta, convertiVoce, tabellePartiteConVoce, type Esito } from './fbisOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-311-esami-e-domande';
const RICHIESTA = '2026-10-31: «completa il lavoro rimasto fermo... le ondate mancanti e tutto quanto non ancora gestito rispetto all’obiettivo» (L13, ondata 7, lotto O7-2)';
const FONTE = 'https://www.allgamestaff.it/persona-5-royal/interrogazioni-esami-risposte/';
const LOTTO = 'O7-2-esami-311';
const errore = (motivo: string): never => { throw new Error(`311: ${motivo}; nessuna modifica applicata.`); };

/** (1) I requisiti di Conoscenza per il primo posto, dalla guida (per chiave dell'esame). */
const REQUISITI: Readonly<Record<string, { rango: number; tutteCorrette: boolean }>> = {
  'esame-1': { rango: 4, tutteCorrette: false }, 'esame-2': { rango: 5, tutteCorrette: false },
  'esame-3': { rango: 5, tutteCorrette: false }, 'esame-4': { rango: 5, tutteCorrette: true },
};
/** (1) Il trofeo del primo posto, se la sua scheda lo conferma. */
const TROFEO_PRIMO = 'un-travestimento-sapiente';

/** (2) La riga «premi» come la guida l'aveva scritta: i campi e i testi che escono (si confrontano, si conservano nell'audit). */
const CAMPI_PREMI = ['fascinoPerPiazzamento', 'moltiplicatoreConfidenti', 'requisitoConoscenza', 'trofeo', 'fonte', 'noteGenerali'];
const FASCINO_ATTESO = { 'primi_10_(incluso_1_posto)': 'Fascino +3', sopra_la_media: 'Fascino +2', nella_media_o_sotto: 'nessun bonus indicato dalle fonti consultate (INCERTO, non confermato con valori esatti)' };

/** (3) La voce del 24 ottobre: come è oggi e che cosa diventa. */
const VOCE_1024 = {
  uid: '3686c54194396ddffe130905448a381c', data: '10-24', esame: 'esame-3',
  azione: 'Rispondere alla domanda di conoscenza (Distorsione della memoria)',
  nota: 'Conoscenza +1; punteggio massimo agli esami: trofeo Un travestimento perfetto, Fascino +3',
  proposta: { id: 'L13-4b-3686c541-01-b-premio', effetti: '[{"effetto":{"tipo":"trofeo","trofeo":"un-travestimento-sapiente"},"completa":[],"scelte":null}]' },
};
/** (3) La voce del 20 maggio (spuntata in una partita): non si converte, si elenca. */
const VOCE_0520 = '4ddc2508';

/** (4) I testi delle ricompense che dicono una nota di Conoscenza, e quello delle righe d'esame; le domande della decisione 10. */
const TESTI_CONOSCENZA = ['Conoscenza +1 nota', 'Conoscenza +1 nota per passo', 'Aumento della Dote Conoscenza (senza consumo di tempo/fascia oraria)'];
const TESTO_ESAME = 'Conoscenza (contribuisce al piazzamento in classifica)';
const DECISIONE_10 = [4, 6, 30, 66];

/** L'impronta di tutto lo schema `utente` (ogni tabella, ogni riga): alla fine deve essere identica. */
function improntaPartite(db: AppDatabase): string {
  const h = createHash('sha256');
  for (const t of (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map((x) => x.name)) {
    h.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}"`).iterate()) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}

// ---- (1) colonne e premi degli esami ----

function colonne(db: AppDatabase): string[] {
  const nuove: string[] = [];
  for (const c of ['premi_json', 'requisito_conoscenza']) {
    if (haColonna(db, 'esame', c)) continue;
    db.exec(`ALTER TABLE main.esame ADD COLUMN ${c} TEXT CHECK (${c} IS NULL OR json_valid(${c}))`);
    nuove.push(c);
  }
  return nuove;
}

function premiEsami(db: AppDatabase, esiti: Esito[]): number {
  const come = db.prepare('SELECT come FROM main.trofeo WHERE chiave = ?').pluck().get(TROFEO_PRIMO) as string | undefined;
  const trofeo = typeof come === 'string' && /primo della classe/i.test(come) ? TROFEO_PRIMO : null;
  esiti.push({ chiave: `trofeo:${TROFEO_PRIMO}`, esito: trofeo ? 'la scheda del trofeo conferma il primo posto: premio del primo posto' : 'la scheda del trofeo non conferma il primo posto: nessun trofeo nei premi' });
  const premi = JSON.stringify([
    { piazzamento: 'primo', doti: [{ dote: 'fascino', note: 3 }], ...(trofeo ? { trofeo } : {}) },
    { piazzamento: 'primi-10', doti: [{ dote: 'fascino', note: 3 }] },
    { piazzamento: 'sopra-media', doti: [{ dote: 'fascino', note: 2 }] },
  ]);
  let scritte = 0;
  for (const e of db.prepare('SELECT chiave, premi_json, requisito_conoscenza FROM main.esame ORDER BY ordine').all() as Array<{ chiave: string; premi_json: string | null; requisito_conoscenza: string | null }>) {
    const req = REQUISITI[e.chiave];
    const parti: string[] = [];
    if (e.premi_json === null) {
      if (db.prepare('UPDATE main.esame SET premi_json = ? WHERE chiave = ? AND premi_json IS NULL').run(premi, e.chiave).changes !== 1) errore(`i premi di ${e.chiave} non si scrivono`);
      parti.push('premi scritti'); scritte++;
    } else if (e.premi_json !== premi) parti.push('premi già presenti e diversi: lasciati');
    if (!req) parti.push('esame senza requisito nella guida: requisito non scritto');
    else if (e.requisito_conoscenza === null) {
      if (db.prepare('UPDATE main.esame SET requisito_conoscenza = ? WHERE chiave = ? AND requisito_conoscenza IS NULL').run(JSON.stringify(req), e.chiave).changes !== 1) errore(`il requisito di ${e.chiave} non si scrive`);
      parti.push(`requisito scritto (rango ${req.rango}${req.tutteCorrette ? ', tutte giuste' : ''})`); scritte++;
    } else if (e.requisito_conoscenza !== JSON.stringify(req)) parti.push('requisito già presente e diverso: lasciato');
    if (parti.length) esiti.push({ chiave: `esame:${e.chiave}`, esito: parti.join('; ') });
  }
  return scritte;
}

// ---- (2) la riga «premi» ----

function rigaPremi(db: AppDatabase, esiti: Array<Esito & { prima?: unknown; dopo?: unknown }>): number {
  if (!esisteTabella(db, 'esame_premi')) return 0;
  const r = db.prepare("SELECT origine, seed_json, json FROM main.esame_premi WHERE chiave = 'premi'").get() as { origine: string; seed_json: string | null; json: string } | undefined;
  if (!r) { esiti.push({ chiave: 'esame_premi:premi', esito: 'riga assente: niente da fare' }); return 0; }
  let v: Record<string, unknown>;
  try { v = JSON.parse(r.json) as Record<string, unknown>; } catch { esiti.push({ chiave: 'esame_premi:premi', esito: 'JSON illeggibile: lasciato' }); return 0; }
  const chiavi = Object.keys(v).sort();
  if (canonico(chiavi) === canonico(['fonte', 'noteGenerali'])) return 0;
  if (r.origine !== 'seed' || r.seed_json !== null) { esiti.push({ chiave: 'esame_premi:premi', esito: 'corretta dall’utente: lasciata' }); return 0; }
  if (canonico(chiavi) !== canonico([...CAMPI_PREMI].sort()) || canonico(v.fascinoPerPiazzamento) !== canonico(FASCINO_ATTESO) || typeof v.noteGenerali !== 'string') {
    esiti.push({ chiave: 'esame_premi:premi', esito: 'campi o testi diversi da quelli letti: lasciata' }); return 0;
  }
  const dopo = JSON.stringify({ fonte: FONTE, noteGenerali: v.noteGenerali });
  if (db.prepare("UPDATE main.esame_premi SET json = ? WHERE chiave = 'premi' AND json = ?").run(dopo, r.json).changes !== 1) errore('la riga dei premi non si scrive');
  esiti.push({ chiave: 'esame_premi:premi', esito: 'ridotta a fonte e note generali: premi, requisiti e trofeo nelle colonne degli esami, moltiplicatore nella regola del codice', prima: v, dopo: JSON.parse(dopo) });
  return 1;
}

// ---- (3) le voci dei risultati ----

function voce1024(db: AppDatabase, partite: string[] | null, adesso: string, esiti: Array<Esito & { prima?: unknown; dopo?: unknown }>): number {
  const dataRisultati = db.prepare('SELECT data_risultati FROM main.esame WHERE chiave = ?').pluck().get(VOCE_1024.esame) as string | null | undefined;
  if (dataRisultati !== VOCE_1024.data) { esiti.push({ chiave: `voce:${VOCE_1024.data}:${VOCE_1024.uid}`, esito: `i risultati di ${VOCE_1024.esame} non sono il ${VOCE_1024.data}: voce non convertita` }); return 0; }
  const c = convertiVoce(db, {
    uid: VOCE_1024.uid, data: VOCE_1024.data, azione: VOCE_1024.azione, lotto: LOTTO,
    attesi: [
      { uid: null, effetto: { tipo: 'dote', dote: 'conoscenza', note: 1 } },
      { uid: null, effetto: { tipo: 'dote', dote: 'fascino', note: 3 }, togli: true },
      { uid: null, effetto: { tipo: 'domanda', domanda: 50 } },
    ],
    togli: [],
    aggiungi: [{ seme: `${LOTTO}:${VOCE_1024.uid}:esame`, effetto: { tipo: 'esame', esame: VOCE_1024.esame } }],
    motivo: 'risultati dell’esame di metà semestre 2 il 24 ottobre: il Fascino ♪♪♪ fisso era il premio del piazzamento, ora scelto alla spunta (effetto «esame»)',
  }, partite, adesso);
  if (c.esito !== 'già convertita') esiti.push(c);
  let scritte = c.esito.startsWith('convertita') ? 1 : 0;
  if (!c.esito.startsWith('convertita') && c.esito !== 'già convertita') return scritte;
  // la nota: tutta già nei dati (Conoscenza nella Dote, premio e trofeo nell'esame), tolta conservando il testo di prima
  const chiaveNota = `nota:${VOCE_1024.data}:${VOCE_1024.uid}`;
  if (!haColonna(db, 'voce_giornata', 'testo_precedente_json') || !haColonna(db, 'voce_giornata', 'motivo_revisione')) esiti.push({ chiave: chiaveNota, esito: 'colonne del testo precedente assenti: nota lasciata' });
  else {
    const v = db.prepare('SELECT data, azione, note, riferimento_tipo, riferimento_chiave, riferimento_testo, aggiunta_da, testo_precedente_json FROM main.voce_giornata WHERE uid = ?').get(VOCE_1024.uid) as
      { data: string; azione: string; note: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null; aggiunta_da: string | null; testo_precedente_json: string | null } | undefined;
    if (!v) esiti.push({ chiave: chiaveNota, esito: 'voce assente' });
    else if (v.note === null && v.testo_precedente_json !== null) { /* già tolta */ }
    else if (v.data !== VOCE_1024.data || v.azione !== VOCE_1024.azione || v.note !== VOCE_1024.nota || v.testo_precedente_json !== null || v.aggiunta_da !== null) esiti.push({ chiave: chiaveNota, esito: 'voce diversa da quella attesa o modificata dall’utente: nota lasciata' });
    else {
      const precedente = JSON.stringify({ azione: v.azione, note: v.note, riferimento_tipo: v.riferimento_tipo, riferimento_chiave: v.riferimento_chiave, riferimento_testo: v.riferimento_testo });
      const motivo = '2026-10-31 (L13, ondata 7, O7-2): la nota ripeteva la Conoscenza della Dote della voce e il premio dell’esame (Fascino ♪♪♪ ai primi 10, trofeo «Un travestimento sapiente» al primo posto), ora scelto alla spunta: tolta, il dato resta negli effetti e nell’esame.';
      if (db.prepare('UPDATE main.voce_giornata SET note = NULL, testo_precedente_json = ?, motivo_revisione = ?, updated_at = ? WHERE uid = ? AND note = ? AND testo_precedente_json IS NULL')
        .run(precedente, motivo, adesso, VOCE_1024.uid, VOCE_1024.nota).changes !== 1) errore('la nota della voce del 24 ottobre non si toglie');
      esiti.push({ chiave: chiaveNota, esito: `nota «${VOCE_1024.nota}» tolta (testo di prima conservato)` });
      scritte++;
    }
  }
  // la proposta aperta del trofeo sulla stessa voce: il trofeo è il premio del primo posto, dato dalla spunta con l'effetto «esame»
  const p = chiudiProposta(db, { id: VOCE_1024.proposta.id, voce: VOCE_1024.uid, effetti: VOCE_1024.proposta.effetti, modo: 'superata', da: null,
    perche: 'il trofeo «Un travestimento sapiente» è il premio del primo posto dell’esame (esame.premi_json): lo segna la spunta della voce con l’effetto «esame» quando si sceglie «Primo» (migrazione 311)' }, adesso);
  if (p.esito.startsWith('chiusa')) { esiti.push(p); scritte++; }
  else if (p.esito !== 'proposta assente' && !p.esito.startsWith('già decisa')) esiti.push(p);
  return scritte;
}

/** Le voci dei risultati di ogni esame, per l'audit: l'effetto «esame», o le voci del giorno dei risultati con «valutazione» o «risultati» nel testo. */
function vociDeiRisultati(db: AppDatabase): Array<{ esame: string; data: string | null; esito: string }> {
  return (db.prepare('SELECT chiave, data_risultati FROM main.esame ORDER BY ordine').all() as Array<{ chiave: string; data_risultati: string | null }>).map((e) => {
    if (!e.data_risultati) return { esame: e.chiave, data: null, esito: 'senza data dei risultati' };
    const voci = db.prepare("SELECT uid FROM main.voce_giornata WHERE data = ? AND (lower(azione) LIKE '%valutazion%' OR lower(azione) LIKE '%risultat%')").pluck().all(e.data_risultati) as string[];
    const conEsame = db.prepare("SELECT DISTINCT voce_uid FROM main.voce_effetto WHERE tipo = 'esame' AND chiave = ?").pluck().all(e.chiave) as string[];
    if (conEsame.length) return { esame: e.chiave, data: e.data_risultati, esito: `effetto «esame» sulla voce ${conEsame.join(', ')}` };
    if (voci.some((u) => u.startsWith(VOCE_0520))) return { esame: e.chiave, data: e.data_risultati, esito: `la voce dei risultati (${voci.join(', ')}) è spuntata in una partita con il Fascino già dato: non convertita (decisione 23, caso c)` };
    if (voci.length === 1) return { esame: e.chiave, data: e.data_risultati, esito: `una voce dei risultati (${voci[0]}) non convertita: fuori dall’elenco letto` };
    return { esame: e.chiave, data: e.data_risultati, esito: voci.length ? `più voci dei risultati (${voci.join(', ')}): nessuna univoca` : 'nessuna voce dei risultati nel Diario' };
  });
}

// ---- (4) le ricompense delle domande ----

type EsitoDomanda = { id: number; data: string; tipo: string; ricompensa: string; voci: number; doti: string[]; esito: string };

function ricompenseDomande(db: AppDatabase): { esiti: EsitoDomanda[]; svuotate: number } {
  const esiti: EsitoDomanda[] = [];
  let svuotate = 0;
  const righe = db.prepare('SELECT id, data, tipo, ricompensa, origine, seed_json FROM main.domanda ORDER BY ordine').all() as Array<{ id: number; data: string; tipo: string; ricompensa: string; origine: string; seed_json: string | null }>;
  for (const d of righe) {
    if (d.ricompensa === '') continue;
    const voci = db.prepare("SELECT DISTINCT voce_uid FROM main.voce_effetto WHERE tipo = 'domanda' AND chiave = ?").pluck().all(String(d.id)) as string[];
    const doti = [...new Set(voci.flatMap((u) => (db.prepare("SELECT dati_json FROM main.voce_effetto WHERE voce_uid = ? AND tipo = 'dote' ORDER BY ordine").pluck().all(u) as string[])
      .flatMap((j) => { try { const e = JSON.parse(j) as { dote?: unknown; note?: unknown }; return [`${String(e.dote)}:${String(e.note)}`]; } catch { return ['illeggibile']; } })))].sort();
    const base = { id: d.id, data: d.data, tipo: d.tipo, ricompensa: d.ricompensa, voci: voci.length, doti };
    let coincide = false;
    let motivo: string;
    if (!voci.length) motivo = 'nessuna voce del Diario la segna: resta in testo';
    else if (DECISIONE_10.includes(d.id)) motivo = 'decisione 10: vale la voce, il testo si corregge solo dopo il sì dell’utente';
    else if (d.origine !== 'seed' || d.seed_json !== null) motivo = 'corretta dall’utente: lasciata';
    else if (TESTI_CONOSCENZA.includes(d.ricompensa)) { coincide = canonico(doti) === canonico(['conoscenza:1']); motivo = 'le voci danno altro: discordanza, resta in testo'; }
    else if (d.ricompensa === TESTO_ESAME) { coincide = (d.tipo === 'esame-medio' || d.tipo === 'esame-finale') && doti.length === 0; motivo = 'le voci danno una Dote: discordanza, resta in testo'; }
    else motivo = 'testo diverso da quello che le voci danno: discordanza, resta in testo';
    if (!coincide) { esiti.push({ ...base, esito: motivo }); continue; }
    if (db.prepare("UPDATE main.domanda SET ricompensa = '' WHERE id = ? AND ricompensa = ?").run(d.id, d.ricompensa).changes !== 1) errore(`la ricompensa della domanda ${d.id} non si svuota`);
    esiti.push({ ...base, esito: 'svuotata: la ricompensa la dicono gli effetti delle voci' });
    svuotate++;
  }
  return { esiti, svuotate };
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 311, richiesta: RICHIESTA, fonte: FONTE,
      regola: 'premi e requisiti scritti solo nelle colonne vuote; la riga dei premi ridotta solo se ancora quella della guida; la voce del 24 ottobre convertita solo se uguale a quella letta e mai citata da una partita; ricompense delle domande svuotate solo dove il testo coincide con le Doti delle voci, su righe mai corrette, fuori dalla decisione 10; le partite non si toccano',
      daDecidere: [
        'Voce del 20 maggio «Vedi la valutazione conseguita all’esame» (4ddc2508): spuntata nella partita 1 con il Fascino ♪♪ fisso già dato (caso c). La si converte all’effetto «esame» (piazzamento scelto alla spunta, Fascino dal premio)? Servirebbe togliere e rimettere la spunta.',
        'Risultati del 19 luglio e del 24 dicembre: nel Diario non c’è una voce dei risultati. Si aggiunge una voce con l’effetto «esame» (fine semestre 1 e 2)?',
        'Domande con la ricompensa in testo diversa da quella delle voci (elenco «domande» con «discordanza»), e le domande della decisione 10 (4, 6, 30, 66): quale testo vale?',
      ],
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration311: Migration = {
  id: 311,
  name: 'premi_esami_e_ricompense_domande',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['esame', 'domanda', 'voce_giornata', 'voce_effetto', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 311, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    const adesso = new Date().toISOString();
    const partiteAttaccate = (db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente');
    const partitePrima = partiteAttaccate ? improntaPartite(db) : null;
    const nuove = colonne(db);
    const esitiEsami: Esito[] = [];
    const premiScritti = premiEsami(db, esitiEsami);
    const esitiRiga: Array<Esito & { prima?: unknown; dopo?: unknown }> = [];
    const rigaRidotta = rigaPremi(db, esitiRiga);
    const esitiVoci: Array<Esito & { prima?: unknown; dopo?: unknown }> = [];
    const vociScritte = voce1024(db, tabellePartiteConVoce(db), adesso, esitiVoci);
    const domande = ricompenseDomande(db);
    if (partiteAttaccate && improntaPartite(db) !== partitePrima) errore('le partite risultano cambiate');
    const conteggi = {
      colonneAggiunte: nuove.length, premiERequisitiScritti: premiScritti, rigaPremiRidotta: rigaRidotta, scrittureVoci: vociScritte,
      ricompenseSvuotate: domande.svuotate, ricompenseInTesto: (db.prepare("SELECT COUNT(*) FROM main.domanda WHERE ricompensa <> ''").pluck().get() as number),
    };
    const cambiato = nuove.length + premiScritti + rigaRidotta + vociScritte + domande.svuotate > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { conteggi, colonne: nuove, esami: esitiEsami, rigaPremi: esitiRiga, voci: esitiVoci, vociDeiRisultati: vociDeiRisultati(db), domande: domande.esiti }, cambiato);
    logger.info({ migrazione: 311, ...conteggi }, 'esami: premi per piazzamento e requisiti; domande: ricompense dalle voci');
  },
};
