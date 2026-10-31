// ============================================================
// Lotto F-bis dell'Ondata 5 (decisioni 21 e 22 dell'utente) — strumenti comuni delle migrazioni 288-297 (e della 298, con il suo lotto)
// ============================================================
//
// Decisione 21, precisazione dell'utente (26 ottobre): «Ovviamente esula dalla decisione 1 se esistono oggetti con effetti che incidono su cose
// rilevanti per l'app già censite come effetti diretti o indiretti». Decisione 22: fabbricazione per creazione con il bonus casuale indicato
// alla spunta; tesori a mano; Black Frost e Bugs solo etichetta. Le migrazioni del lotto modellano con i tipi dell'app gli oggetti che incidono
// su Doti, yen, oggetti ricevuti e consumati, letture e fusioni, e convertono le voci del Diario che li citano.
//
// Regole comuni (le stesse della 234 e del lotto G, con la decisione 23 del 29 ottobre):
//   - fino al 28 ottobre le voci del periodo validato (fino al 05-31) non si scrivevano mai: le migrazioni 288-300 preparano per loro proposte
//     «da completare» (`proposta_conversione_voce`), e lo fanno ancora da sole, nel loro codice. Dalla decisione 23 («applicale direttamente
//     a meno di impatti per i quali è necessaria mia decisione esplicita») il periodo validato NON è più un motivo per fermarsi: `convertiVoce`
//     converte anche una voce di quel periodo, con le stesse condizioni di ogni altra. Una migrazione nuova prepara una proposta, invece di
//     convertire, solo per (a) una correzione incerta, (b) una scelta che solo l'utente conosce, (c) una voce già registrata nelle partite
//     (che `convertiVoce` salta comunque); le proposte rimaste aperte da prima le applica la migrazione 302;
//   - una voce si converte solo se è ancora esattamente come letta il 2026-10-26 sulla copia dei dati (testo e, uno per uno,
//     uid, ordine e valore degli effetti) e se NESSUNA partita la cita (ogni tabella dello schema `utente` con la colonna `voce_uid`): le
//     partite già spuntate non si riscrivono. Gli effetti si scrivono come li scrive `salvaEffettiVoce` (`dati_json` canonico, `chiave`
//     dell'effetto, registro di transizione con l'impronta della lista); l'uid di un effetto nuovo è derivato dall'uid della voce;
//   - un dato della guida si tocca solo se è ancora quello atteso e mai corretto dall'utente (`origine = 'seed'`, `seed_json IS NULL`);
//     ciò che c'è già (anche nascosto) non si ricrea;
//   - l'audit di ogni migrazione accoda un'esecuzione solo se è la prima o se qualcosa è cambiato (una seconda esecuzione identica non lo
//     sporca).
// Una migrazione non importa da `server/services/` (convenzione di `pulizieL11`): le poche funzioni pure che servono sono ripetute qui.
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import { esisteTabella } from './pulizieL11.js';
import { normalizzaEffettoVoce, type EffettoVoce } from '../../../shared/effettiVoce.js';
import { ordineGioco } from '../../../shared/condizioniSpillo.js';

/** L'ultimo giorno del periodo validato. Dalla decisione 23 non blocca più nessuna conversione: resta per le migrazioni 288-300, che lo
 *  usano nel loro codice, e per i conteggi degli audit. */
export const ULTIMO_GIORNO_VALIDATO = '05-31';
export const LOTTO_FBIS = 'O5-Fbis';
export const FONTE_DOTI = 'https://www.allgamestaff.it/persona-5-royal/doti-sociali/';
export const FONTE_NEGOZI = 'https://www.allgamestaff.it/persona-5-royal/elenco-dei-negozi/';
export const FONTE_FABBRICAZIONE = 'https://www.allgamestaff.it/persona-5-royal/fabbricazione/';
export const FONTE_CHIHAYA = 'https://www.allgamestaff.it/persona-5-royal/confidente-chihaya-mifune/';
export const FONTE_OGGETTI = 'https://www.allgamestaff.it/persona-5-royal/oggetti/';
export const FONTE_OGGETTI_CHIAVE = 'https://www.allgamestaff.it/persona-5-royal/oggetti-chiave-essenziali/';
export const FONTE_DVD = 'https://www.allgamestaff.it/persona-5-royal/dvd-a-noleggio/';

export type Esito = { chiave: string; esito: string };

/** Il JSON canonico (chiavi ordinate, `undefined` tolti), come `jsonCanonico` di `propostePartitaService`. */
export function canonico(v: unknown): string {
  const ordina = (x: unknown): unknown => {
    if (x == null || typeof x === 'string' || typeof x === 'boolean') return x ?? null;
    if (typeof x === 'number' && Number.isFinite(x)) return x;
    if (Array.isArray(x)) return x.map(ordina);
    if (typeof x !== 'object') throw new Error('valore non serializzabile');
    return Object.fromEntries(Object.entries(x as Record<string, unknown>).filter(([, y]) => y !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, y]) => [k, ordina(y)]));
  };
  return JSON.stringify(ordina(v));
}
export const impronta = (v: unknown): string => createHash('sha256').update(canonico(v)).digest('hex');
/** Un uid di 32 caratteri derivato da un seme (stesso dato su ogni copia). */
export const uidDa = (seme: string): string => createHash('sha256').update(seme).digest('hex').slice(0, 32);

/** La `chiave` di `voce_effetto` per un effetto (la stessa regola di `chiaveEffetto` del motore). */
export function chiaveEffetto(e: EffettoVoce): string | null {
  switch (e.tipo) {
    case 'acquisto': return e.articolo;
    case 'dote': case 'fortuna': return e.dote;
    case 'lettura': return e.chiave;
    case 'storia': return e.evento;
    case 'domanda': return String(e.domanda);
    case 'cruciverba': return e.data;
    case 'richiesta': return e.richiesta;
    case 'articolo': return e.articolo;
    case 'invito': return e.invito;
    case 'persona': return String(e.persona);
    case 'yen': return 'yen';
    case 'oggetto': return e.oggetto;
    case 'trofeo': return e.trofeo;
    case 'sblocco': return `${e.bersaglio}:${e.chiave}`;
    case 'turno': return e.attivita;
    // L13 (ondata 7, O7-2, migrazione 311): i risultati di un esame, con la chiave dell'esame come il motore
    case 'esame': return e.esame;
    default: return (e as { attivita?: string }).attivita ?? null;
  }
}

/** L'audit di una migrazione del lotto: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
export function scriviAuditFbis(db: AppDatabase, chiave: string, migrazione: number, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  if (!esisteTabella(db, 'dati_guida')) return;
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(chiave) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) {
    try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; }
  }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(chiave, JSON.stringify({ migrazione, lotto: 'ondata-5-F-bis', decisioni: ['L13-21', 'L13-22'], esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }] }));
}

/** Le tabelle dello schema `utente` con la colonna `voce_uid`, o null se lo schema non è attaccato o non ha le spunte (non si può verificare). */
export function tabellePartiteConVoce(db: AppDatabase): string[] | null {
  const schemi = db.prepare('PRAGMA database_list').all() as Array<{ name: string }>;
  if (!schemi.some((s) => s.name === 'utente')) return null;
  const tabelle = (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((t) => t.name);
  const conVoce = tabelle.filter((t) => (db.prepare(`PRAGMA utente.table_info("${t}")`).all() as Array<{ name: string }>).some((c) => c.name === 'voce_uid'));
  return conVoce.includes('spunta_voce_partita') ? conVoce : null;
}

/** Un effetto scritto: l'uid e il valore. */
export interface EffettoConUid { uid: string; effetto: EffettoVoce }
/**
 * Un effetto atteso sulla voce: il valore e l'uid. L'uid è null per gli effetti nati da una decisione (una proposta applicata, un salvataggio)
 * che ha dato un uid casuale, diverso su ogni copia dei dati: allora l'effetto si riconosce dal valore e dalla posizione. `togli`: esce.
 */
export interface EffettoAtteso { uid: string | null; effetto: EffettoVoce; togli?: true }
/**
 * La conversione di UNA voce dopo il 05-31: gli effetti come sono oggi (`attesi`, in ordine), quelli da togliere (per uid in `togli`, o con
 * `togli: true` sull'atteso), quelli da aggiungere (con un seme per l'uid) e, se serve, il collegamento della voce (con quello atteso oggi).
 */
export interface ConversioneVoce {
  uid: string; data: string; azione: string;
  attesi: EffettoAtteso[];
  togli: string[];
  aggiungi: Array<{ seme: string; effetto: EffettoVoce }>;
  /** Effetti che restano con lo stesso uid e cambiano valore (l'acquisto dell'Aojiru che assorbe la sua Dote). */
  modifica?: EffettoConUid[];
  collega?: { tipoPrima: string; riferimentoPrima: { tipo: string; chiave: string } | null; tipo: string; riferimento: { tipo: string; chiave: string } };
  motivo: string;
  /** Il lotto nel registro delle operazioni sugli effetti (e nel seme del suo id); senza, quello del lotto F-bis (`LOTTO_FBIS`), come per 288-297. */
  lotto?: string;
}

interface RigaEffetto { uid: string; ordine: number; tipo: string; chiave: string | null; dati_json: string; origine: string }

const errore = (m: string): never => { throw new Error(`F-bis: ${m}; nessuna modifica applicata.`); };

/** Il giorno è nel periodo validato (dal 04-01 al 05-31)? Con l'ordine dell'anno scolastico: gennaio-marzo vengono DOPO maggio. Dalla
 *  decisione 23 è solo un'informazione (la usa la 299, già eseguita), non un motivo per non convertire. */
export const nelPeriodoValidato = (data: string): boolean => ordineGioco(data) <= ordineGioco(ULTIMO_GIORNO_VALIDATO);

/** Perché la voce non si converte (null = si può). Solo letture. Il periodo validato non è un motivo (decisione 23); la voce già registrata
 *  nelle partite sì (c), come la voce cambiata dopo la lettura. */
function motivoPerSaltare(db: AppDatabase, c: ConversioneVoce, partite: string[] | null): string | null {
  if (partite === null) return 'schema delle partite non attaccato: spunte non verificabili';
  const v = db.prepare('SELECT data, azione, tipo, riferimento_tipo, riferimento_chiave FROM main.voce_giornata WHERE uid = ?').get(c.uid) as
    { data: string; azione: string; tipo: string; riferimento_tipo: string | null; riferimento_chiave: string | null } | undefined;
  if (!v) return 'voce assente';
  if (v.data !== c.data || v.azione !== c.azione) return 'giorno o testo diversi da quelli attesi: modificata';
  if (c.collega) {
    const rif = v.riferimento_tipo && v.riferimento_chiave ? { tipo: v.riferimento_tipo, chiave: v.riferimento_chiave } : null;
    if (v.tipo !== c.collega.tipoPrima || canonico(rif) !== canonico(c.collega.riferimentoPrima)) return 'tipo o collegamento diversi da quelli attesi';
  }
  const t = db.prepare('SELECT stato FROM main.voce_effetto_transizione WHERE voce_uid = ?').get(c.uid) as { stato: string } | undefined;
  if (t && t.stato !== 'convertita') return 'fonte degli effetti da correggere';
  if (c.attesi.length && !t) return 'fonte degli effetti senza registro';
  const rs = db.prepare('SELECT uid, ordine, tipo, chiave, dati_json, origine FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').all(c.uid) as RigaEffetto[];
  if (rs.length !== c.attesi.length) return 'effetti diversi da quelli attesi';
  for (const [i, r] of rs.entries()) {
    const atteso = c.attesi[i]!;
    let letto: EffettoVoce | null;
    try { letto = normalizzaEffettoVoce(JSON.parse(r.dati_json)); } catch { letto = null; }
    if ((atteso.uid !== null && r.uid !== atteso.uid) || r.ordine !== i || !letto || canonico(letto) !== canonico(atteso.effetto)) return 'effetti diversi da quelli attesi';
  }
  // un raccordo degli effetti ancora aperto è una decisione in sospeso dell'utente: la voce non si tocca. Le decisioni già prese
  // (`proposta_effetto_voce` confermate o scartate) e il registro delle operazioni sugli effetti (`operazione_effetti_voce`) sono storia: gli
  // effetti di oggi sono già confrontati uno per uno qui sopra, e la conversione si aggiunge al registro (`convertiVoce`)
  if (esisteTabella(db, 'proposta_effetto_voce') && db.prepare("SELECT 1 FROM main.proposta_effetto_voce WHERE voce_uid = ? AND stato = 'aperta' LIMIT 1").get(c.uid)) return 'ha un raccordo degli effetti ancora aperto (proposta_effetto_voce): decisione in sospeso';
  const citata = partite.filter((tabella) => db.prepare(`SELECT 1 FROM utente."${tabella}" WHERE voce_uid = ? LIMIT 1`).get(c.uid));
  if (citata.length) return `citata nelle partite (${citata.join(', ')}): spuntata o con effetti registrati, non si riscrive`;
  return null;
}

/**
 * Converte una voce (vedi `ConversioneVoce`; dalla decisione 23 anche del periodo validato), con il registro di transizione. Ritorna l'esito per l'audit, con prima e dopo.
 * Una voce già convertita (gli effetti nuovi ci sono già con il loro uid e gli effetti tolti non ci sono più) si dice tale e non si tocca.
 */
export function convertiVoce(db: AppDatabase, c: ConversioneVoce, partite: string[] | null, adesso: string): Esito & { prima?: unknown; dopo?: unknown } {
  const chiave = `voce:${c.data}:${c.uid}`;
  const nuovi = c.aggiungi.map((a) => ({ uid: uidDa(a.seme), effetto: a.effetto }));
  const modifiche = c.modifica ?? [];
  const presenti = (db.prepare('SELECT uid FROM main.voce_effetto WHERE voce_uid = ?').pluck().all(c.uid) as string[]);
  const valoreDi = (u: string): string | null => { const r = db.prepare('SELECT dati_json FROM main.voce_effetto WHERE uid = ? AND voce_uid = ?').pluck().get(u, c.uid) as string | undefined; try { return r === undefined ? null : canonico(normalizzaEffettoVoce(JSON.parse(r))); } catch { return null; } };
  // già convertita: gli effetti nuovi (uid derivati, unici) ci sono; senza effetti nuovi, i tolti non ci sono più e le modifiche valgono
  const gia = nuovi.length > 0 ? nuovi.every((n) => presenti.includes(n.uid))
    : (c.togli.length > 0 || modifiche.length > 0) && c.togli.every((u) => !presenti.includes(u)) && modifiche.every((m) => valoreDi(m.uid) === canonico(m.effetto));
  if (gia) return { chiave, esito: 'già convertita' };
  const motivo = motivoPerSaltare(db, c, partite);
  if (motivo) return { chiave, esito: `saltata: ${motivo}` };
  // gli attesi con l'uid di questa copia (riconosciuti dal valore dove l'uid non è fisso) e i tolti
  const righe = db.prepare('SELECT uid FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').pluck().all(c.uid) as string[];
  const attesi: EffettoConUid[] = c.attesi.map((a, i) => ({ uid: righe[i]!, effetto: a.effetto }));
  const togli = [...c.togli, ...c.attesi.flatMap((a, i) => (a.togli ? [righe[i]!] : []))];
  for (const n of nuovi) {
    const valido = normalizzaEffettoVoce(JSON.parse(canonico(n.effetto)));
    if (!valido || canonico(valido) !== canonico(n.effetto)) errore(`effetto nuovo non valido sulla voce ${c.uid}`);
    if (db.prepare('SELECT 1 FROM main.voce_effetto WHERE uid = ?').get(n.uid)) errore(`l'uid ${n.uid} è già usato`);
  }
  for (const m of modifiche) {
    const valido = normalizzaEffettoVoce(JSON.parse(canonico(m.effetto)));
    if (!valido || canonico(valido) !== canonico(m.effetto) || !attesi.some((a) => a.uid === m.uid) || togli.includes(m.uid)) errore(`modifica non valida dell'effetto ${m.uid} sulla voce ${c.uid}`);
  }
  const restano = attesi.filter((e) => !togli.includes(e.uid)).map((e) => modifiche.find((m) => m.uid === e.uid) ?? e);
  const dopo = [...restano, ...nuovi];
  for (const m of modifiche) {
    if (db.prepare('UPDATE main.voce_effetto SET tipo = ?, chiave = ?, dati_json = ?, updated_at = ? WHERE uid = ? AND voce_uid = ?')
      .run(m.effetto.tipo, chiaveEffetto(m.effetto), canonico(m.effetto), adesso, m.uid, c.uid).changes !== 1) errore(`l'effetto ${m.uid} non è stato modificato`);
  }
  for (const u of togli) if (db.prepare('DELETE FROM main.voce_effetto WHERE uid = ? AND voce_uid = ?').run(u, c.uid).changes !== 1) errore(`l'effetto ${u} non è stato tolto`);
  // riordino in due passi (la chiave primaria è voce + ordine): prima fuori scala, poi al posto giusto
  for (const [ordine, e] of restano.entries()) if (db.prepare('UPDATE main.voce_effetto SET ordine = ? WHERE uid = ? AND voce_uid = ?').run(ordine + 10_000, e.uid, c.uid).changes !== 1) errore(`l'effetto ${e.uid} non è stato riordinato`);
  for (const [ordine, e] of restano.entries()) db.prepare('UPDATE main.voce_effetto SET ordine = ? WHERE uid = ? AND voce_uid = ?').run(ordine, e.uid, c.uid);
  for (const [i, n] of nuovi.entries()) {
    db.prepare("INSERT INTO main.voce_effetto (uid, voce_uid, ordine, tipo, chiave, dati_json, origine, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'regola', ?)")
      .run(n.uid, c.uid, restano.length + i, n.effetto.tipo, chiaveEffetto(n.effetto), canonico(n.effetto), adesso);
  }
  const improntaDopo = impronta(dopo.map((e) => e.effetto));
  if (db.prepare('SELECT 1 FROM main.voce_effetto_transizione WHERE voce_uid = ?').get(c.uid)) {
    if (db.prepare("UPDATE main.voce_effetto_transizione SET impronta = ?, aggiornata_il = ? WHERE voce_uid = ? AND stato = 'convertita'").run(improntaDopo, adesso, c.uid).changes !== 1) errore(`il registro di ${c.uid} non è stato scritto`);
  } else {
    db.prepare("INSERT INTO main.voce_effetto_transizione (voce_uid, stato, raw_json, motivo, impronta, aggiornata_il) VALUES (?, 'convertita', '[]', NULL, ?, ?)").run(c.uid, improntaDopo, adesso);
  }
  // il registro delle operazioni sugli effetti, come per ogni salvataggio (`motoreDiario.salvaEffettiVoce`) e per le migrazioni 147 e 154:
  // la conversione resta nella storia della voce, con prima e dopo
  if (esisteTabella(db, 'operazione_effetti_voce')) {
    const lotto = c.lotto ?? LOTTO_FBIS;
    const id = uidDa(`${lotto}:operazione:${c.uid}:${canonico(dopo.map((e) => e.uid))}`);
    db.prepare('INSERT OR IGNORE INTO main.operazione_effetti_voce (id, voce_uid, payload_json, prima_json, dopo_json, creata_il) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, c.uid, canonico({ lotto, motivo: c.motivo, ...(c.collega ? { collegamento: c.collega.riferimento } : {}) }), canonico({ effetti: attesi }), canonico({ effetti: dopo }), adesso);
  }
  if (c.collega) {
    if (db.prepare('UPDATE main.voce_giornata SET tipo = ?, riferimento_tipo = ?, riferimento_chiave = ?, riferimento_testo = NULL WHERE uid = ?')
      .run(c.collega.tipo, c.collega.riferimento.tipo, c.collega.riferimento.chiave, c.uid).changes !== 1) errore(`la voce ${c.uid} non è stata collegata`);
  }
  // rilettura: gli effetti sono quelli scritti, validi e nell'ordine
  const rs = db.prepare('SELECT uid, ordine, tipo, chiave, dati_json FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').all(c.uid) as RigaEffetto[];
  if (rs.length !== dopo.length || rs.some((r, i) => r.uid !== dopo[i]!.uid || r.ordine !== i || canonico(normalizzaEffettoVoce(JSON.parse(r.dati_json))) !== canonico(dopo[i]!.effetto) || r.chiave !== chiaveEffetto(dopo[i]!.effetto))) errore(`effetti riletti diversi da quelli scritti in ${c.uid}`);
  return { chiave, esito: `convertita (${c.motivo})`,
    prima: { effetti: attesi, ...(c.collega ? { collegamento: { tipo: c.collega.tipoPrima, riferimento: c.collega.riferimentoPrima } } : {}) },
    dopo: { effetti: dopo, ...(c.collega ? { collegamento: { tipo: c.collega.tipo, riferimento: c.collega.riferimento } } : {}) } };
}

/** Una proposta «da completare» nuova su una voce: non si applica da sola. Dalla decisione 23 serve solo per (a) una correzione incerta,
 *  (b) una scelta che solo l'utente conosce, (c) una voce già registrata nelle partite; non per il solo periodo validato. */
export interface NuovaProposta {
  id: string; voce: string;
  tipo: string | null; riferimento: { tipo: string; chiave: string } | null;
  effetti: Array<{ effetto: Record<string, unknown>; completa: string[]; scelte: string[] | null }>;
  togli: string[];
  motivo: string; certezza: 'certa' | 'probabile' | 'da-verificare';
  /** Il lotto della proposta; senza, quello del lotto F-bis (`LOTTO_FBIS`), come per 288-297. */
  lotto?: string;
}
export function nuovaProposta(db: AppDatabase, p: NuovaProposta, adesso: string): Esito {
  if (!esisteTabella(db, 'proposta_conversione_voce')) return { chiave: p.id, esito: 'tabella delle proposte assente' };
  if (db.prepare('SELECT 1 FROM main.proposta_conversione_voce WHERE id = ?').get(p.id)) return { chiave: p.id, esito: 'proposta già presente' };
  if (!db.prepare('SELECT 1 FROM main.voce_giornata WHERE uid = ?').get(p.voce)) return { chiave: p.id, esito: 'voce assente: nessuna proposta' };
  for (const u of p.togli) if (!db.prepare('SELECT 1 FROM main.voce_effetto WHERE uid = ? AND voce_uid = ?').get(u, p.voce)) return { chiave: p.id, esito: `l'effetto da togliere ${u} non è più sulla voce: nessuna proposta` };
  db.prepare(`INSERT INTO main.proposta_conversione_voce (id, voce_uid, lotto, tipo_proposto, riferimento_tipo, riferimento_chiave, effetti_json, togli_json, motivo, certezza, creata_il)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(p.id, p.voce, p.lotto ?? LOTTO_FBIS, p.tipo, p.riferimento?.tipo ?? null, p.riferimento?.chiave ?? null, JSON.stringify(p.effetti), JSON.stringify(p.togli), p.motivo, p.certezza, adesso);
  return { chiave: p.id, esito: `proposta creata (aperta, ${p.certezza})` };
}

/** Chiude una proposta aperta superata da un dato strutturato o da un'altra proposta, solo se è ancora com'era (voce ed effetti). */
export function chiudiProposta(db: AppDatabase, v: { id: string; voce: string; effetti: string; modo: 'sostituita' | 'superata'; da: string | null; perche: string }, adesso: string): Esito {
  if (!esisteTabella(db, 'proposta_conversione_voce')) return { chiave: v.id, esito: 'tabella delle proposte assente' };
  const r = db.prepare('SELECT voce_uid, stato, effetti_json FROM main.proposta_conversione_voce WHERE id = ?').get(v.id) as { voce_uid: string; stato: string; effetti_json: string } | undefined;
  if (!r) return { chiave: v.id, esito: 'proposta assente' };
  if (r.stato !== 'aperta') return { chiave: v.id, esito: `già decisa (${r.stato}): non toccata` };
  if (r.voce_uid !== v.voce || r.effetti_json !== v.effetti) return { chiave: v.id, esito: 'contenuto diverso da quello atteso: non toccata' };
  if (v.da !== null && !db.prepare('SELECT 1 FROM main.proposta_conversione_voce WHERE id = ?').get(v.da)) return { chiave: v.id, esito: `la proposta che la sostituisce (${v.da}) non c’è: lasciata aperta` };
  if (db.prepare("UPDATE main.proposta_conversione_voce SET stato = 'scartata', decisa_il = ?, esito_json = ? WHERE id = ? AND stato = 'aperta'")
    .run(adesso, JSON.stringify({ modo: v.modo, ...(v.da ? { da: v.da } : {}), perche: v.perche }), v.id).changes !== 1) errore(`la proposta ${v.id} non si chiude`);
  return { chiave: v.id, esito: `chiusa come ${v.modo}${v.da ? ` (${v.da})` : ''}` };
}

/** Una scheda nuova del catalogo (non tocca quella che c'è già). */
export function creaScheda(db: AppDatabase, s: { chiave: string; categoria: string; nome: string; effetto: string; descrizione: string; fonteChiave: string }, adesso: string): Esito {
  const c = db.prepare(`INSERT INTO main.catalogo_oggetto (chiave, categoria, sottocategoria, nome, nomi_altri_json, nome_originale, effetto, descrizione, statistiche_json, fonte_tipo, fonte_chiave, origine, nascosto, updated_at)
    VALUES (?, ?, NULL, ?, '[]', NULL, ?, ?, NULL, 'guida', ?, 'seed', 0, ?) ON CONFLICT(chiave) DO NOTHING`).run(s.chiave, s.categoria, s.nome, s.effetto, s.descrizione, s.fonteChiave, adesso).changes;
  return { chiave: s.chiave, esito: c ? 'scheda creata' : 'scheda già presente' };
}

/** Un negozio nuovo in una sede (non tocca quello che c'è già, né una sede che ha già un negozio). */
export function creaNegozio(db: AppDatabase, n: { chiave: string; nome: string; luogo: string; quartiere: string; sede: string; tipo: string; confidente: string | null; note: string; fonte: string; condizioni: unknown[] }, adesso: string): Esito {
  const gia = db.prepare('SELECT nascosto FROM main.negozio WHERE chiave = ?').get(n.chiave) as { nascosto: number } | undefined;
  if (gia) return { chiave: n.chiave, esito: gia.nascosto ? 'negozio già presente ma nascosto' : 'negozio già presente' };
  const sede = db.prepare('SELECT 1 FROM main.luogo WHERE chiave = ?').get(n.sede) ? n.sede : null;
  if (sede) {
    const altro = db.prepare('SELECT chiave FROM main.negozio WHERE sede_chiave = ?').pluck().get(sede) as string | undefined;
    if (altro) return { chiave: n.chiave, esito: `la sede ha già il negozio ${altro}: nessun negozio nuovo` };
  }
  const quartiere = db.prepare('SELECT 1 FROM main.quartiere WHERE chiave = ?').get(n.quartiere) ? n.quartiere : null;
  const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.negozio').pluck().get() as number;
  db.prepare(`INSERT INTO main.negozio (chiave, ordine, nome, luogo, luogo_chiave, tipo, gestore, confidente_chiave, note, fonte, origine, nascosto, updated_at, condizioni_json, sede_chiave)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 'seed', 0, ?, ?, ?)`)
    .run(n.chiave, ordine, n.nome, n.luogo, quartiere, n.tipo, n.confidente, n.note, n.fonte, adesso, JSON.stringify(n.condizioni), sede);
  return { chiave: n.chiave, esito: `creato (ordine ${ordine}, sede ${sede ?? 'assente: solo il quartiere'})` };
}

/** Un'offerta nuova in un negozio che esiste, per un oggetto del catalogo visibile (non tocca quella che c'è già). */
export function creaOfferta(db: AppDatabase, a: { chiave: string; negozio: string; nome: string; categoria: string; prezzo: number | null; catalogo: string; condizioni: unknown[];
  quantita: number | null; rifornimento: unknown; fonte: string; oggettoFonte?: string; oggettoChiave?: string; nota?: string }, adesso: string): Esito {
  const gia = db.prepare('SELECT nascosto FROM main.articolo WHERE chiave = ?').get(a.chiave) as { nascosto: number } | undefined;
  if (gia) return { chiave: a.chiave, esito: gia.nascosto ? 'offerta già presente ma nascosta: non toccata' : 'offerta già presente' };
  if (!db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ?').get(a.negozio)) return { chiave: a.chiave, esito: 'negozio assente: nessuna offerta' };
  if (!db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ? AND nascosto = 0').get(a.catalogo)) return { chiave: a.chiave, esito: `oggetto ${a.catalogo} assente o nascosto: nessuna offerta` };
  const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.articolo WHERE negozio_chiave = ?').pluck().get(a.negozio) as number;
  db.prepare(`INSERT INTO main.articolo (chiave, negozio_chiave, ordine, nome, categoria, per, prezzo, effetto, statistiche, nota, fonte, verificato, origine, nascosto, updated_at,
      condizioni_json, catalogo_chiave, quantita, rifornimento_json, oggetto_fonte, oggetto_chiave)
    VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, NULL, ?, ?, 1, 'seed', 0, ?, ?, ?, ?, ?, ?, ?)`)
    .run(a.chiave, a.negozio, ordine, a.nome, a.categoria, a.prezzo, a.nota ?? null, a.fonte, adesso, JSON.stringify(a.condizioni), a.catalogo, a.quantita, JSON.stringify(a.rifornimento), a.oggettoFonte ?? null, a.oggettoChiave ?? null);
  return { chiave: a.chiave, esito: `creata (${a.prezzo ?? 0} ¥, ordine ${ordine})` };
}

/** Un'attività nuova con i suoi esiti (non tocca quella che c'è già). */
export function creaAttivita(db: AppDatabase, a: { chiave: string; nome: string; tipo: string; luogo: string; quartiere: string; sede: string; fascia: string; fonte: string; dettagli: string; condizioni: unknown[]; esiti: string }, adesso: string): Esito {
  if (db.prepare('SELECT 1 FROM main.attivita WHERE chiave = ?').get(a.chiave)) return { chiave: a.chiave, esito: 'attività già presente' };
  const sede = db.prepare('SELECT 1 FROM main.luogo WHERE chiave = ?').get(a.sede) ? a.sede : null;
  const quartiere = db.prepare('SELECT 1 FROM main.quartiere WHERE chiave = ?').get(a.quartiere) ? a.quartiere : null;
  const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.attivita').pluck().get() as number;
  db.prepare(`INSERT INTO main.attivita (chiave, ordine, nome, tipo, luogo, luogo_chiave, fascia, costo, doti_json, fonte, verificato, sessioni, origine, nascosto, updated_at,
      condizioni_json, sede_chiave, dettagli, tracciamento, esiti_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, '[]', ?, 1, 1, 'seed', 0, ?, ?, ?, ?, 'svolta', ?)`)
    .run(a.chiave, ordine, a.nome, a.tipo, a.luogo, quartiere, a.fascia, a.fonte, adesso, JSON.stringify(a.condizioni), sede, a.dettagli, a.esiti);
  return { chiave: a.chiave, esito: `creata (ordine ${ordine}, sede ${sede ?? 'assente'})` };
}

/** Un testo di gioco corretto solo se è ancora quello atteso e della guida mai corretta dall'utente. */
export function correggiTesto(db: AppDatabase, t: { tabella: 'catalogo_oggetto' | 'negozio' | 'articolo' | 'confidente_abilita'; dove: string; parametri: unknown[]; colonna: string; prima: string | null; dopo: string; etichetta: string }, adesso: string): Esito {
  const conSeed = t.tabella !== 'confidente_abilita';
  const r = db.prepare(`SELECT "${t.colonna}" AS v${conSeed ? ', origine, seed_json' : ''} FROM main."${t.tabella}" WHERE ${t.dove}`).get(...t.parametri) as { v: string | null; origine?: string; seed_json?: string | null } | undefined;
  if (!r) return { chiave: t.etichetta, esito: 'riga assente' };
  if (r.v === t.dopo) return { chiave: t.etichetta, esito: 'già corretto' };
  if (r.v !== t.prima || (conSeed && (r.origine !== 'seed' || r.seed_json !== null))) return { chiave: t.etichetta, esito: 'testo diverso da quello atteso o corretto dall’utente: non toccato' };
  const set = conSeed ? `"${t.colonna}" = ?, updated_at = ?` : `"${t.colonna}" = ?`;
  const valori = conSeed ? [t.dopo, adesso] : [t.dopo];
  if (db.prepare(`UPDATE main."${t.tabella}" SET ${set} WHERE ${t.dove} AND "${t.colonna}" IS ?`).run(...valori, ...t.parametri, t.prima).changes !== 1) errore(`${t.etichetta} non si aggiorna`);
  return { chiave: t.etichetta, esito: 'corretto' };
}
