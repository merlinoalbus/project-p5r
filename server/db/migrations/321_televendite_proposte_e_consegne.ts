// ============================================================
// Migrazione 321 — televendite: le 6 proposte del periodo validato applicate, le 4 consegne dovute solo con un set comprato
// ============================================================
//
// L13, ondata 9, lotto O9-3. Istruzione dell'utente del 2026-10-31 (risposte ai tre punti aperti della riga «e» della sezione Televendite della
// ROADMAP, migrazione 239, decisione 4): «Televendite. é possibile non venga acquistato nessun set. in tal caso viene meno la consegna. Aggiungi
// le voci di acquisto. Applica le 6 proposte.».
//
//   - «Aggiungi le voci di acquisto»: già fatto dalla migrazione 241 (decisione 20: le domeniche 26/6, 7/8, 25/9 e 29/1, coi due set in
//     alternativa). Qui nessuna scrittura: l'audit lo dice.
//   - «é possibile non venga acquistato nessun set»: è già il modello (`alternativeAcquistiService`: alla spunta un set o «Nessuno»; i set non
//     scelti non si applicano, niente yen, niente acquisto). Nessuna scrittura.
//   - «Applica le 6 proposte»: le proposte aperte `L13-televendite-<uid8>-set` (migrazione 239) sulle voci delle domeniche del periodo
//     validato, tutte spuntate nella partita 1. Si applicano con la stessa scrittura delle conversioni (`convertiVoce`: gli effetti nuovi in coda
//     con uid derivati, il registro di transizione e il registro delle operazioni) e con `ancheSpuntata` che porta le parole dell'utente; il
//     collegamento al Canale di televendite dove manca (05-08 e 05-22); la proposta risulta «applicata» con l'esito. Solo se la proposta e la
//     voce sono ancora quelle lette il 2026-10-31 sulla copia portata alla 319 (proposta: voce, tipo, collegamento, effetti, togli; voce: giorno,
//     testo, collegamento, nessun effetto). Le ricevute della partita 1 non cambiano: i set aggiunti dopo la spunta restano «da scegliere»
//     togliendo e rimettendo la spunta (meccanismo esistente, righe «c» e «g» della sezione Televendite).
//   - «in tal caso viene meno la consegna»: le quattro voci di consegna (05-09, 05-16, 05-23, 05-30 sera) dichiarano quando sono dovute
//     (`voce_giornata.condizioni_json`, migrazione 320): ALMENO UNA fra «Articolo ottenuto» dei due set della domenica prima. Senza nessun set
//     la voce è «non dovuta» nella partita (`server/services/voceDovuta.ts`): non si spunta, non blocca l'avanzamento. Solo se la voce è quella
//     letta (giorno, testo) e non ha già condizioni diverse; i quattro articoli devono esserci. Le spunte di oggi restano (storia).
//     Fuori dal periodo validato non c'è nessuna voce di consegna (la nota del 29/1 dice «La consegna arriva il 30 gennaio»): nessuna voce nuova.
//
// Controlli (uno che non torna annulla tutto): lo schema `utente` identico (impronta di ogni riga); il periodo validato (04-01…05-31) identico
// fuori dalle 6 + 4 voci elencate (righe, effetti, registri di transizione). Idempotente: la seconda volta tutto risulta «già fatto» e l'audit
// non si sporca. Audit in `dati_guida.audit-321-televendite-proposte-consegne`, con prima e dopo.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { canonico, convertiVoce, nelPeriodoValidato, tabellePartiteConVoce, uidDa } from './fbisOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';
import { normalizzaCondizioniSpillo } from '../../../shared/condizioniSpillo.js';
import type { EffettoVoce } from '../../../shared/effettiVoce.js';

const AUDIT = 'audit-321-televendite-proposte-consegne';
const LOTTO = 'O9-3';
const DECISIONE_PROPOSTE = 'Applica le 6 proposte.';
const DECISIONE_CONSEGNA = 'é possibile non venga acquistato nessun set. in tal caso viene meno la consegna.';
const RICHIESTA = '2026-10-31: «Televendite. é possibile non venga acquistato nessun set. in tal caso viene meno la consegna. Aggiungi le voci di acquisto. Applica le 6 proposte.» (L13, ondata 9, lotto O9-3)';
const NEGOZIO = 'home-shopping-tv';
const FONTE_29_1 = 'https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-39/';
const errore = (motivo: string): never => { throw new Error(`321: ${motivo}; nessuna modifica applicata.`); };
const art = (k: string) => `${NEGOZIO}/${k}`;

/** Le 6 proposte lette il 2026-10-31: la voce (giorno, testo, collegata o no al negozio) e i due set nell'ordine della proposta. */
const PROPOSTE: ReadonlyArray<{ id: string; voce: string; data: string; azione: string; collegata: boolean; set: readonly [string, string] }> = [
  { id: 'L13-televendite-055e267c-set', voce: '055e267c419a45e5706194a2aa31162b', data: '04-24', collegata: true, set: ['set-sveglia-primaverile', 'set-condiv-primaverile'],
    azione: 'Leblanc: esaminare la TV per il Canale di televendite - Set sveglia primaverile 1.680 yen (1 Cerotto alla caffeina, 10 gocce per occhioni, 10 Te caldo e aspro) oppure Set Condiv. primaverile 5.980 yen (5 Sakura Mochi, 1 Pacco di frutta primav., 1 Festa in lattina)' },
  { id: 'L13-televendite-1e202ac9-set', voce: '1e202ac91321bc3ce30e98456cfebceb', data: '05-01', collegata: true, set: ['set-della-razione-militare', 'set-dellallenamento'],
    azione: 'Televendite: Set dell’allenamento (4.980 yen)' },
  { id: 'L13-televendite-7f647050-set', voce: '7f6470501ff00db41ffc4d5e59d083bb', data: '05-08', collegata: false, set: ['set-rilassante', 'set-bionutrienti'],
    azione: 'Televendite: Set Bionutrienti (2.680 yen)' },
  { id: 'L13-televendite-d0a68550-set', voce: 'd0a68550f64240566662691d55a1cd97', data: '05-15', collegata: true, set: ['pacchetto-allevia-allergie', 'dono-cure-cosmetiche'],
    azione: 'Canale di televendite: acquista il "Dono cure cosmetiche" (14.800 Yen)' },
  { id: 'L13-televendite-671aa425-set', voce: '671aa4250e5f130a0e708067ab257514', data: '05-22', collegata: false, set: ['set-muscoli-plus', 'kit-di-avventure-allaperto'],
    azione: 'Televendita: acquista il "Set Muscoli Plus" (4.980 yen)' },
  { id: 'L13-televendite-422fd229-set', voce: '422fd22992f3031030cc97c98bbc9f3e', data: '05-29', collegata: true, set: ['set-regalo-giapponese', 'set-paravento-giapponese'],
    azione: 'Televendite: acquistare il Set Paravento giapponese (4.980 yen),' },
];

/** Le 4 voci di consegna lette il 2026-10-31 (sera del giorno dopo la domenica) e i due set di quella domenica. */
const CONSEGNE: ReadonlyArray<{ voce: string; data: string; azione: string; domenica: string; set: readonly [string, string] }> = [
  { voce: '92286895124b58b1eb978e1dfae91ce9', data: '05-09', azione: "Consegna al Leblanc dell'ordine effettuato dal Canale di televendite", domenica: '05-08', set: ['set-rilassante', 'set-bionutrienti'] },
  { voce: 'ece194c79f86d7235d1ecb1a699f269e', data: '05-16', azione: 'Ricevi il pacco acquistato nella Televendita.', domenica: '05-15', set: ['pacchetto-allevia-allergie', 'dono-cure-cosmetiche'] },
  { voce: '648d63302e032ad6d146e3c468da5f8b', data: '05-23', azione: "Ritirare l'ordine del Canale di televendite", domenica: '05-22', set: ['set-muscoli-plus', 'kit-di-avventure-allaperto'] },
  { voce: '2f0d22944d0840331560795a9f83e822', data: '05-30', azione: "Ritirare l'ordine del Canale di televendite", domenica: '05-29', set: ['set-regalo-giapponese', 'set-paravento-giapponese'] },
];

/** Le voci d'acquisto della 241 (sola lettura, per l'audit: «Aggiungi le voci di acquisto» è già fatto). */
const VOCI_241 = [
  { voce: '927bb256a4ac9c10f22c10462fa74786', data: '06-26' }, { voce: '9a08fba07e583dc3b3ecd607e4b234e7', data: '08-07' },
  { voce: '154de92b4fa4edfdcddd2b4f67676120', data: '09-25' }, { voce: 'cf64772a6723d39425ef4828a90eee4a', data: '01-29' },
];

type Esito = { chiave: string; esito: string; prima?: unknown; dopo?: unknown };

/** La proposta come la scrive la 239 (`effetti_json` letto il 2026-10-31). */
const effettiProposta = (set: readonly [string, string]): string => JSON.stringify(set.map((k) => ({ effetto: { tipo: 'articolo', articolo: art(k) }, completa: [], scelte: null })));
/** Le condizioni della consegna: almeno uno dei due set della domenica prima, nella forma normalizzata del vocabolario unico. */
function condizioniConsegna(set: readonly [string, string]): string {
  const grezze = [{ tipo: 'gruppo', modo: 'almeno-una', condizioni: set.map((k) => ({ tipo: 'articolo', articolo: art(k) })) }];
  const valide = normalizzaCondizioniSpillo(grezze);
  if (valide.length !== 1 || canonico(valide) !== canonico(grezze)) errore('le condizioni della consegna non sono nella forma del vocabolario');
  return JSON.stringify(valide);
}

/** L'impronta di ogni riga dello schema `utente`: deve restare identica. */
function improntaPartite(db: AppDatabase): string {
  const h = createHash('sha256');
  for (const t of (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map((x) => x.name)) {
    h.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}"`).iterate()) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}

/** L'impronta del periodo validato fuori dalle voci toccate qui: righe della voce, effetti e registro di transizione. */
function improntaPeriodo(db: AppDatabase, toccate: ReadonlySet<string>): string {
  const h = createHash('sha256');
  const voci = (db.prepare('SELECT * FROM main.voce_giornata ORDER BY uid').all() as Array<Record<string, unknown> & { uid: string; data: string }>)
    .filter((v) => nelPeriodoValidato(v.data) && !toccate.has(v.uid));
  for (const v of voci) {
    h.update(JSON.stringify(v) + '\n');
    for (const e of db.prepare('SELECT * FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').iterate(v.uid)) h.update(JSON.stringify(e) + '\n');
    h.update(JSON.stringify(db.prepare('SELECT * FROM main.voce_effetto_transizione WHERE voce_uid = ?').get(v.uid) ?? null) + '\n');
  }
  return `${voci.length}:${h.digest('hex')}`;
}

const articoloVisibile = (db: AppDatabase, chiave: string): boolean => !!db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND nascosto = 0').get(chiave);

/** Perché la proposta non si applica (null = si può): stato, contenuto, articoli. Solo letture (la voce la controlla `convertiVoce`). */
function propostaDaSaltare(db: AppDatabase, p: typeof PROPOSTE[number]): string | null {
  const r = db.prepare('SELECT voce_uid, lotto, stato, tipo_proposto, riferimento_tipo, riferimento_chiave, effetti_json, togli_json FROM main.proposta_conversione_voce WHERE id = ?').get(p.id) as
    { voce_uid: string; lotto: string; stato: string; tipo_proposto: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; effetti_json: string; togli_json: string } | undefined;
  if (!r) return 'proposta assente in questi dati';
  if (r.stato !== 'aperta') return `proposta già decisa (${r.stato})`;
  if (r.voce_uid !== p.voce || r.lotto !== 'L13-televendite' || r.tipo_proposto !== null || r.riferimento_tipo !== 'negozio' || r.riferimento_chiave !== NEGOZIO
    || r.effetti_json !== effettiProposta(p.set) || r.togli_json !== '[]') return 'proposta diversa da quella letta';
  for (const k of p.set) if (!articoloVisibile(db, art(k))) return `l’articolo ${art(k)} non c’è (o è nascosto)`;
  return null;
}

function applicaProposte(db: AppDatabase, partite: string[] | null, adesso: string): Esito[] {
  if (!esisteTabella(db, 'proposta_conversione_voce')) return PROPOSTE.map((p) => ({ chiave: p.id, esito: 'tabella delle proposte assente: niente da fare' }));
  return PROPOSTE.map((p): Esito => {
    const stato = db.prepare('SELECT stato, esito_json FROM main.proposta_conversione_voce WHERE id = ?').get(p.id) as { stato: string; esito_json: string | null } | undefined;
    if (stato?.stato === 'applicata' && stato.esito_json?.includes('"migrazione":321')) return { chiave: p.id, esito: 'già applicata' };
    const motivo = propostaDaSaltare(db, p);
    if (motivo) return { chiave: p.id, esito: `saltata: ${motivo}: voce non toccata` };
    const semi = p.set.map((k) => `${LOTTO}:televendite:${p.voce}:${art(k)}`);
    const e = convertiVoce(db, {
      uid: p.voce, data: p.data, azione: p.azione, attesi: [], togli: [], lotto: LOTTO,
      aggiungi: p.set.map((k, i) => ({ seme: semi[i]!, effetto: { tipo: 'articolo', articolo: art(k) } as EffettoVoce })),
      ...(p.collegata ? {} : { collega: { tipoPrima: 'acquisto', riferimentoPrima: null, tipo: 'acquisto', riferimento: { tipo: 'negozio', chiave: NEGOZIO } } }),
      ancheSpuntata: { decisione: DECISIONE_PROPOSTE },
      motivo: `i due set della domenica in alternativa (decisione 4), dalla proposta ${p.id}: decisione dell’utente del 2026-10-31 («${DECISIONE_PROPOSTE}»)`,
    }, partite, adesso);
    if (e.esito.startsWith('saltata')) return { chiave: p.id, esito: `${e.esito}: proposta lasciata aperta` };
    // convertita o già convertita (gli effetti della proposta ci sono): la proposta risulta applicata, con l'esito
    const esito = { modo: 'migrazione', migrazione: 321, lotto: LOTTO, decisione: DECISIONE_PROPOSTE, effetti: semi.map(uidDa), ...(p.collegata ? {} : { collegamento: { tipo: 'negozio', chiave: NEGOZIO } }) };
    if (db.prepare("UPDATE main.proposta_conversione_voce SET stato = 'applicata', decisa_il = ?, esito_json = ? WHERE id = ? AND stato = 'aperta'").run(adesso, canonico(esito), p.id).changes !== 1) errore(`la proposta ${p.id} non risulta applicata`);
    return { chiave: p.id, esito: `applicata (voce ${e.esito})`, prima: e.prima ?? null, dopo: e.dopo ?? null };
  });
}

function condizioniDelleConsegne(db: AppDatabase): Esito[] {
  if (!haColonna(db, 'voce_giornata', 'condizioni_json')) return CONSEGNE.map((c) => ({ chiave: `voce:${c.data}:${c.voce}`, esito: 'saltata: manca la colonna delle condizioni (320)' }));
  return CONSEGNE.map((c): Esito => {
    const chiave = `voce:${c.data}:${c.voce}`;
    const dopo = condizioniConsegna(c.set);
    const v = db.prepare('SELECT data, azione, genere, condizioni_json FROM main.voce_giornata WHERE uid = ?').get(c.voce) as { data: string; azione: string; genere: string; condizioni_json: string | null } | undefined;
    if (!v) return { chiave, esito: 'saltata: voce assente' };
    if (v.condizioni_json === dopo) return { chiave, esito: 'già scritta' };
    if (v.data !== c.data || v.azione !== c.azione || v.genere !== 'azione') return { chiave, esito: 'saltata: giorno, testo o genere diversi da quelli letti' };
    if (v.condizioni_json !== null) return { chiave, esito: 'saltata: la voce ha già condizioni diverse (dell’utente)', prima: v.condizioni_json };
    for (const k of c.set) if (!articoloVisibile(db, art(k))) return { chiave, esito: `saltata: l’articolo ${art(k)} non c’è (o è nascosto)` };
    if (db.prepare('UPDATE main.voce_giornata SET condizioni_json = ? WHERE uid = ? AND condizioni_json IS NULL').run(dopo, c.voce).changes !== 1) errore(`le condizioni della voce ${c.voce} non si scrivono`);
    return { chiave, esito: `scritta (dovuta solo con uno dei set del ${c.domenica})`, prima: null, dopo: JSON.parse(dopo) as unknown };
  });
}

/** «Aggiungi le voci di acquisto»: le voci della 241 lette (sola lettura). */
function vociDiAcquisto(db: AppDatabase): Esito[] {
  return VOCI_241.map((x) => {
    const v = db.prepare('SELECT data, azione, aggiunta_da FROM main.voce_giornata WHERE uid = ?').get(x.voce) as { data: string; azione: string; aggiunta_da: string | null } | undefined;
    const effetti = v ? (db.prepare('SELECT dati_json FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').pluck().all(x.voce) as string[]) : [];
    return { chiave: `voce:${x.data}:${x.voce}`, esito: v && v.data === x.data ? `già presente (migrazione 241, ${effetti.length} set in alternativa): niente da fare` : 'non trovata: da verificare',
      dopo: v ? { azione: v.azione, aggiuntaDa: v.aggiunta_da, effetti } : null };
  });
}

function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 321, lotto: LOTTO, richiesta: RICHIESTA,
      decisioni: { proposte: DECISIONE_PROPOSTE, consegna: DECISIONE_CONSEGNA },
      modello: {
        nessunSet: 'alla spunta della domenica si sceglie un set o «Nessuno» (alternativeAcquistiService): i set non scelti non si applicano, niente yen, niente acquisto',
        consegna: 'la voce di consegna dichiara quando è dovuta (voce_giornata.condizioni_json, migrazione 320): almeno uno dei due set della domenica prima ottenuto; senza, è «non dovuta» nella partita (voceDovuta): non si spunta (409 voce-non-dovuta), non blocca l’avanzamento; una spunta già presente resta',
        ricevutePartita1: 'le spunte della partita 1 non cambiano: i set aggiunti dopo la spunta restano da scegliere togliendo e rimettendo la spunta',
      },
      fuoriPeriodo: `nessuna voce di consegna fuori dal periodo validato: la nota del 29/1 dice «La consegna arriva il 30 gennaio» (${FONTE_29_1}); nessuna voce nuova`,
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration321: Migration = {
  id: 321,
  name: 'televendite_proposte_e_consegne',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['dati_guida', 'voce_giornata', 'voce_effetto', 'voce_effetto_transizione', 'articolo']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 321, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    const adesso = new Date().toISOString();
    const partiteAttaccate = (db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente');
    const partitePrima = partiteAttaccate ? improntaPartite(db) : null;
    const toccate = new Set([...PROPOSTE.map((p) => p.voce), ...CONSEGNE.map((c) => c.voce)]);
    const periodoPrima = improntaPeriodo(db, toccate);
    const partite = tabellePartiteConVoce(db);
    const proposte = applicaProposte(db, partite, adesso);
    const consegne = condizioniDelleConsegne(db);
    const acquisti = vociDiAcquisto(db);
    if (partiteAttaccate && improntaPartite(db) !== partitePrima) errore('le partite risultano cambiate');
    if (improntaPeriodo(db, toccate) !== periodoPrima) errore('il periodo validato risulta cambiato fuori dalle voci elencate');
    const cambiato = proposte.some((e) => e.esito.startsWith('applicata')) || consegne.some((e) => e.esito.startsWith('scritta'));
    const conteggi = {
      proposteApplicate: proposte.filter((e) => e.esito.startsWith('applicata')).length, proposteGia: proposte.filter((e) => e.esito === 'già applicata').length,
      proposteSaltate: proposte.filter((e) => e.esito.startsWith('saltata')).length,
      consegneScritte: consegne.filter((e) => e.esito.startsWith('scritta')).length, consegneGia: consegne.filter((e) => e.esito === 'già scritta').length,
      consegneSaltate: consegne.filter((e) => e.esito.startsWith('saltata')).length,
    };
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { conteggi, proposte, consegne, vociDiAcquisto: acquisti, improntaPartite: partitePrima, improntaPeriodoValidato: periodoPrima }, cambiato);
    logger.info({ migrazione: 321, ...conteggi }, 'Televendite: proposte del periodo validato applicate, consegne dovute solo con un set comprato');
  },
};
