// ============================================================
// Migrazione 299 — la versione con il bonus degli esiti e lo strumento con la quantità nelle voci (richiesta dell'utente del 2026-10-27)
// ============================================================
//
// Richiesta dell'utente: «ma che poi cristo... bastava un pulsante bonus sì/no. L'oggetto è stato già scelto, la quantità anche... se il pulsante
// bonus è attivo quando riscuoto applica la versione con il bonus, altrimenti quella base». La finestra della spunta della fabbricazione elencava
// per ogni ricetta «creato» / «con il bonus» con i materiali («TOTALMENTE INUSABILE»); vale per ogni strumento, nessun caso a mano.
//
// Il codice ora sa che un esito è la VERSIONE CON IL BONUS di un altro (`bonusDi`, `shared/esitiAttivita.ts`), che la voce dice lo strumento e la
// quantità (`quantita` dell'effetto `turno`) e che alla spunta resta solo l'interruttore «Bonus». Questa migrazione porta i dati a quella forma:
//   (1) gli esiti delle attività: dove un esito «X-bonus» è la versione con il bonus di «X» (stesso gruppo, articolo, condizioni e materiali
//       consumati, gli stessi oggetti dati con più copie, le stesse Doti con una nota in più) si scrive `bonusDi` = «X». Ricavato dai dati, per
//       ogni attività; oggi vale per le dieci ricette della fabbricazione (migrazione 290). I valori della guida restano quelli della 290, già
//       giusti (https://www.allgamestaff.it/persona-5-royal/fabbricazione/: ogni creazione consuma i materiali e dà un oggetto; l'elogio di
//       Morgana dà 2 oggetti consumando i materiali di uno e un punto di Perizia in più, una volta per sessione; decisione 22: Perizia ♪♪ e ♪♪♪).
//       Solo su un'attività della guida mai corretta dall'utente (`origine = 'seed'`, `seed_json IS NULL`); il testo dei dettagli si aggiorna
//       solo se è ancora quello della 290;
//   (2) le voci con il turno di un'attività con versioni con il bonus: lo strumento si scrive come esito BASE (il bonus si dice alla spunta e
//       arriva a caso, decisione 22) con la quantità; un effetto «oggetto ricevuto» dello stesso prodotto esce (gli oggetti li dà l'esito: due
//       fonti dello stesso dato raddoppierebbero) e, se c'è, ne dà la quantità. Senza quell'effetto la quantità è quella della guida per le voci
//       che la dicono (tabella qui sotto). Dopo il 05-31 con `convertiVoce` (mai una voce citata da una partita); nel periodo validato solo
//       proposte da approvare;
//   (3) le proposte aperte che aggiungono quel turno (la 290 sulle voci del 04-20, 04-21 e 05-30) si chiudono come sostituite da proposte con
//       lo strumento base e la quantità; le proposte aperte «oggetto ricevuto» dello stesso prodotto su una voce con quel turno si chiudono come
//       superate (l'esito dà già l'oggetto).
// La voce del 11-18 («bombe o strumenti d'infiltrazione») non dice che cosa si crea: resta senza strumento (si sceglie nell'editor della voce).
// Conservativa (le regole di `fbisOndata5.ts`) e idempotente. Audit in `dati_guida.audit-299-bonus-si-no`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { coppiaBonus, haVersioniBonus, leggiEsitiAttivita, type EsitiAttivita, type EsitoAttivita, type OggettoEsito } from '../../../shared/esitiAttivita.js';
import { normalizzaEffettoVoce, type EffettoVoce } from '../../../shared/effettiVoce.js';
import { canonico, chiudiProposta, convertiVoce, nelPeriodoValidato, nuovaProposta, tabellePartiteConVoce, type Esito } from './fbisOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-299-bonus-si-no';
const LOTTO = 'bonus-si-no-299';
const FONTE = 'https://www.allgamestaff.it/persona-5-royal/fabbricazione/';
const errore = (motivo: string): never => { throw new Error(`299: ${motivo}; nessuna modifica applicata.`); };

/** I dettagli scritti dalla 290 (si aggiornano solo se sono ancora questi) e quelli nuovi. */
const DETTAGLI_290 = 'Si fabbrica nella mansarda del Leblanc, di sera, dal rango 1 di Morgana. Ogni creazione usa i materiali della ricetta e dà un oggetto con Perizia ♪♪; a volte, a caso, arriva il bonus: un oggetto in più e Perizia ♪♪♪. Il bonus si indica alla spunta, scegliendo l’esito. La ricetta degli Strumenti del cercatore non è nei dati: materiali e prodotto sono da verificare in gioco.';
const DETTAGLI_299 = 'Si fabbrica nella mansarda del Leblanc, di sera, dal rango 1 di Morgana. Ogni creazione usa i materiali della ricetta e dà un oggetto; la sessione dà Perizia ♪♪. A volte, a caso, arriva il bonus: un oggetto in più senza altri materiali e Perizia ♪♪♪. Nella voce del Diario si scelgono lo strumento e la quantità; alla spunta si dice solo se è arrivato il bonus. La ricetta degli Strumenti del cercatore non è nei dati: materiali e prodotto sono da verificare in gioco.';

/**
 * La quantità (le creazioni) che la guida dice per le voci di fabbricazione lette il 2026-10-27, quando la voce non ha già un «oggetto ricevuto»
 * dello stesso prodotto da cui ricavarla. Regola della guida: una creazione per sessione, tre con la Perizia al rango 2 (il 04-21 la Perizia
 * passa a «Decente», rango 2).
 */
const QUANTITA_DALLA_GUIDA: Readonly<Record<string, { quantita: number; perche: string }>> = {
  '30d7b54381f0688e920e74aeac401453': { quantita: 3, perche: '04-20: «3 di base, 4 salvando e ricaricando» (il quarto è il bonus)' },
  '30d2458a024c2f6f7db05630e52792cb': { quantita: 2, perche: '04-21: «2 di base, 3 ricaricando in caso di fallimento» (il terzo è il bonus)' },
  '62409d1ed182fe1a795c533ef8b02bf6': { quantita: 3, perche: '05-30: «possibilità di ottenere 4 grimaldelli» (3 creazioni, la quarta con il bonus)' },
  'f2900f8c540dcea8328d42bb6fc0a25a': { quantita: 3, perche: '07-25: dal 04-21 la Perizia è al rango 2 (Decente) e la guida dice 3 creazioni per sessione' },
};

type Turno = Extract<EffettoVoce, { tipo: 'turno' }>;

/** Le Doti di `b` sono quelle di `a` con una nota in più (stesse Doti, stesso ordine)? */
const dotiConUnaNotaInPiu = (a: EsitoAttivita, b: EsitoAttivita): boolean =>
  a.doti.length > 0 && a.doti.length === b.doti.length && a.doti.every((d, i) => b.doti[i]!.dote === d.dote && b.doti[i]!.note === d.note + 1);
/** Gli oggetti dati da `b` sono quelli di `a` (stesse chiavi), con almeno una copia in più in qualcuno e mai meno? */
const oggettiConPiuCopie = (a: EsitoAttivita, b: EsitoAttivita): boolean => {
  const oa = a.oggetti ?? [], ob = b.oggetti ?? [];
  if (!oa.length || oa.length !== ob.length) return false;
  if (!oa.every((o) => ob.some((x) => x.oggetto === o.oggetto && x.quantita >= o.quantita))) return false;
  return ob.some((x) => x.quantita > (oa.find((o) => o.oggetto === x.oggetto)?.quantita ?? 0));
};

/** (1) La versione con il bonus degli esiti, ricavata dai dati: «X-bonus» di «X» con le regole dette in testa. */
function collegaVersioniBonus(db: AppDatabase, adesso: string, esiti: Esito[]): number {
  let cambiate = 0;
  const righe = db.prepare("SELECT chiave, origine, seed_json, esiti_json, dettagli FROM main.attivita WHERE esiti_json IS NOT NULL AND esiti_json <> ''").all() as
    Array<{ chiave: string; origine: string; seed_json: string | null; esiti_json: string; dettagli: string | null }>;
  for (const r of righe) {
    const dati = leggiEsitiAttivita(r.esiti_json);
    if (!dati || dati.modo !== 'scelta') continue;
    const coppie = dati.esiti.flatMap((base) => {
      const bonus = dati.esiti.find((x) => x.chiave === `${base.chiave}-bonus`);
      return !base.bonusDi && bonus && !bonus.bonusDi && bonus.gruppo === base.gruppo && canonico(bonus.consuma ?? []) === canonico(base.consuma ?? [])
        && bonus.articolo === base.articolo && canonico(bonus.condizioni) === canonico(base.condizioni) && dotiConUnaNotaInPiu(base, bonus) && oggettiConPiuCopie(base, bonus)
        ? [{ base: base.chiave, bonus: bonus.chiave }] : [];
    });
    if (!coppie.length) {
      if (haVersioniBonus(dati)) esiti.push({ chiave: `attivita:${r.chiave}`, esito: 'versioni con il bonus già collegate' });
      continue;
    }
    if (r.origine !== 'seed' || r.seed_json !== null) { esiti.push({ chiave: `attivita:${r.chiave}`, esito: `corretta dall’utente: ${coppie.length} coppie riconosciute ma non scritte (si collegano dall’editor degli esiti)` }); continue; }
    const nuovi: EsitiAttivita = { modo: dati.modo, esiti: dati.esiti.map((e) => { const c = coppie.find((x) => x.bonus === e.chiave); return c ? { ...e, bonusDi: c.base } : e; }) };
    const json = JSON.stringify(nuovi);
    const riletti = leggiEsitiAttivita(json);
    if (!riletti || JSON.stringify(riletti) !== json || riletti.esiti.filter((e) => e.bonusDi).length !== coppie.length) errore(`gli esiti di «${r.chiave}» con la versione con il bonus non si rileggono validi`);
    const dettagli = r.dettagli === DETTAGLI_290 ? DETTAGLI_299 : r.dettagli;
    if (db.prepare('UPDATE main.attivita SET esiti_json = ?, dettagli = ?, updated_at = ? WHERE chiave = ? AND esiti_json = ?').run(json, dettagli, adesso, r.chiave, r.esiti_json).changes !== 1) errore(`l'attività «${r.chiave}» non si aggiorna`);
    cambiate += 1;
    esiti.push({ chiave: `attivita:${r.chiave}`, esito: `collegate ${coppie.length} versioni con il bonus (${coppie.map((c) => `${c.bonus} → ${c.base}`).join(', ')})${dettagli !== r.dettagli ? '; dettagli aggiornati' : ''}` });
  }
  return cambiate;
}

/** Le attività con versioni con il bonus, con i loro esiti (dopo il punto 1). */
function attivitaConBonus(db: AppDatabase): Map<string, EsitiAttivita> {
  const out = new Map<string, EsitiAttivita>();
  for (const r of db.prepare("SELECT chiave, esiti_json FROM main.attivita WHERE esiti_json IS NOT NULL AND esiti_json <> ''").all() as Array<{ chiave: string; esiti_json: string }>) {
    const e = leggiEsitiAttivita(r.esiti_json);
    if (e && haVersioniBonus(e)) out.set(r.chiave, e);
  }
  return out;
}

/**
 * Le creazioni ricavate dalle copie di un «oggetto ricevuto» dello stesso prodotto: con l'esito base T = q × copie per creazione; con quello con
 * il bonus T = copie del bonus + (q − 1) × copie per creazione. Null se il conto non torna intero (ambiguo: non si indovina).
 */
function quantitaDalleCopie(base: OggettoEsito, bonus: OggettoEsito, copie: number, conBonus: boolean): number | null {
  const q = conBonus ? (copie - bonus.quantita) / base.quantita + 1 : copie / base.quantita;
  return Number.isSafeInteger(q) && q >= 1 && q <= 999 ? q : null;
}

interface Normalizzazione { nuovo: Turno; togli: string[]; perche: string }
/**
 * Lo strumento di un turno scritto come esito base con la quantità; gli «oggetti ricevuti» dello stesso prodotto escono (danno la quantità).
 * Null se non c'è niente da cambiare; una stringa se non si può decidere (il motivo, per l'audit).
 */
function normalizzaTurno(uidVoce: string, t: Turno, esiti: EsitiAttivita, altri: ReadonlyArray<{ uid: string; effetto: EffettoVoce }>): Normalizzazione | string | null {
  if (!t.esito) return 'senza strumento: si sceglie nell’editor della voce';
  const coppia = coppiaBonus(esiti, t.esito);
  if (!coppia) return null;
  const conBonus = t.esito === coppia.bonus.chiave;
  const prodotti = coppia.base.oggetti ?? [];
  const doppi = altri.filter((x): x is { uid: string; effetto: Extract<EffettoVoce, { tipo: 'oggetto' }> } => x.effetto.tipo === 'oggetto' && prodotti.some((p) => p.oggetto === (x.effetto as { oggetto: string }).oggetto));
  let quantita: number, perche: string;
  if (doppi.length > 1) return `più effetti «oggetto ricevuto» dello stesso prodotto (${doppi.map((d) => d.uid).join(', ')}): non si decide quale vale`;
  if (doppi.length === 1) {
    const d = doppi[0]!.effetto;
    const pb = prodotti.find((p) => p.oggetto === d.oggetto)!, pbb = (coppia.bonus.oggetti ?? []).find((p) => p.oggetto === d.oggetto);
    const q = pbb ? quantitaDalleCopie(pb, pbb, d.quantita, conBonus) : null;
    if (q === null) return `l’«oggetto ricevuto» ×${d.quantita} non dà un numero intero di creazioni: non si indovina`;
    quantita = q; perche = `la quantità dall’«oggetto ricevuto» ×${d.quantita} della voce, che esce: gli oggetti li dà lo strumento`;
  } else if (t.quantita !== undefined) {
    // una quantità già scritta nella voce (dall'utente o da un'esecuzione di prima) non si cambia
    quantita = t.quantita; perche = 'la quantità resta quella della voce';
  } else if (QUANTITA_DALLA_GUIDA[uidVoce]) {
    quantita = QUANTITA_DALLA_GUIDA[uidVoce]!.quantita; perche = `la quantità dalla guida (${QUANTITA_DALLA_GUIDA[uidVoce]!.perche})`;
  } else {
    quantita = t.quantita ?? 1; perche = 'la quantità resta quella della voce';
  }
  const nuovo: Turno = quantita > 1 ? { tipo: 'turno', attivita: t.attivita, esito: coppia.base.chiave, quantita } : { tipo: 'turno', attivita: t.attivita, esito: coppia.base.chiave };
  if (!doppi.length && canonico(nuovo) === canonico(t)) return null;
  const valido = normalizzaEffettoVoce(JSON.parse(canonico(nuovo)));
  if (!valido || canonico(valido) !== canonico(nuovo)) errore(`il turno nuovo della voce ${uidVoce} non è valido`);
  return { nuovo, togli: doppi.map((d) => d.uid), perche: `${conBonus ? 'lo strumento come esito base (il bonus si dice alla spunta, arriva a caso)' : 'lo strumento resta'}; ${perche}` };
}

const leggiEffetto = (json: string): EffettoVoce | null => { try { return normalizzaEffettoVoce(JSON.parse(json)); } catch { return null; } };

/** (2) Le voci con il turno di un'attività con versioni con il bonus. */
function vociConStrumento(db: AppDatabase, bonus: Map<string, EsitiAttivita>, adesso: string, esiti: Esito[]): void {
  const partite = tabellePartiteConVoce(db);
  const voci = db.prepare("SELECT DISTINCT voce_uid FROM main.voce_effetto WHERE tipo = 'turno' ORDER BY voce_uid").pluck().all() as string[];
  for (const uid of voci) {
    const v = db.prepare('SELECT data, azione FROM main.voce_giornata WHERE uid = ?').get(uid) as { data: string; azione: string } | undefined;
    if (!v) continue;
    const righe = (db.prepare('SELECT uid, dati_json FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').all(uid) as Array<{ uid: string; dati_json: string }>)
      .map((r) => ({ uid: r.uid, effetto: leggiEffetto(r.dati_json) }));
    const turni = righe.filter((r): r is { uid: string; effetto: Turno } => r.effetto?.tipo === 'turno' && bonus.has(r.effetto.attivita));
    if (!turni.length) continue;
    const chiave = `voce:${v.data}:${uid}`;
    if (turni.length > 1) { esiti.push({ chiave, esito: 'lasciata com’è: più turni di attività con il bonus nella stessa voce' }); continue; }
    if (righe.some((r) => r.effetto === null)) { esiti.push({ chiave, esito: 'lasciata com’è: un effetto della voce non si legge' }); continue; }
    const t = turni[0]!;
    const altri = righe.filter((r) => r.uid !== t.uid) as Array<{ uid: string; effetto: EffettoVoce }>;
    const n = normalizzaTurno(uid, t.effetto, bonus.get(t.effetto.attivita)!, altri);
    if (n === null) { esiti.push({ chiave, esito: 'già a posto' }); continue; }
    if (typeof n === 'string') { esiti.push({ chiave, esito: `lasciata com’è: ${n}` }); continue; }
    if (nelPeriodoValidato(v.data)) {
      const id = `O5bonus-${uid.slice(0, 8)}-01-strumento`;
      esiti.push(nuovaProposta(db, { id, voce: uid, tipo: null, riferimento: null, effetti: [{ effetto: n.nuovo as unknown as Record<string, unknown>, completa: [], scelte: null }],
        togli: [t.uid, ...n.togli], motivo: `${n.perche}. Alla spunta resta solo «Bonus» sì/no.`, certezza: 'probabile', lotto: LOTTO }, adesso));
      continue;
    }
    esiti.push(convertiVoce(db, { uid, data: v.data, azione: v.azione, attesi: righe.map((r) => ({ uid: r.uid, effetto: r.effetto! })), togli: n.togli, aggiungi: [],
      modifica: [{ uid: t.uid, effetto: n.nuovo }], motivo: `${n.perche}; alla spunta resta solo «Bonus» sì/no`, lotto: LOTTO }, partite, adesso));
  }
}

interface RigaProposta { id: string; voce_uid: string; tipo_proposto: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; effetti_json: string; togli_json: string; motivo: string; certezza: string }
type EffettoProposto = { effetto: Record<string, unknown>; completa: string[]; scelte: string[] | null };

/** (3) Le proposte aperte: il turno con lo strumento base e la quantità; gli «oggetti ricevuti» dello stesso prodotto superati. */
function proposteAperte(db: AppDatabase, bonus: Map<string, EsitiAttivita>, adesso: string, esiti: Esito[]): void {
  if (!esisteTabella(db, 'proposta_conversione_voce')) return;
  const aperte = db.prepare("SELECT id, voce_uid, tipo_proposto, riferimento_tipo, riferimento_chiave, effetti_json, togli_json, motivo, certezza FROM main.proposta_conversione_voce WHERE stato = 'aperta' ORDER BY id").all() as RigaProposta[];
  const leggi = (r: RigaProposta): EffettoProposto[] | null => { try { const x = JSON.parse(r.effetti_json) as unknown; return Array.isArray(x) ? x as EffettoProposto[] : null; } catch { return null; } };
  /** I prodotti degli strumenti che ogni voce ha (nei suoi effetti o in una proposta aperta), per riconoscere gli «oggetti ricevuti» doppi. */
  const prodottiPerVoce = new Map<string, Set<string>>();
  const aggiungiProdotti = (voce: string, t: Turno) => {
    const coppia = coppiaBonus(bonus.get(t.attivita), t.esito);
    if (!coppia) return;
    const s = prodottiPerVoce.get(voce) ?? new Set<string>();
    for (const o of coppia.base.oggetti ?? []) s.add(o.oggetto);
    prodottiPerVoce.set(voce, s);
  };
  for (const r of db.prepare("SELECT voce_uid, dati_json FROM main.voce_effetto WHERE tipo = 'turno'").all() as Array<{ voce_uid: string; dati_json: string }>) {
    const e = leggiEffetto(r.dati_json);
    if (e?.tipo === 'turno' && bonus.has(e.attivita)) aggiungiProdotti(r.voce_uid, e);
  }
  // le proposte del turno: chiuse come sostituite da una con lo strumento base e la quantità
  for (const r of aperte) {
    const effetti = leggi(r);
    if (!effetti) continue;
    const i = effetti.findIndex((x) => { const e = normalizzaEffettoVoce(x?.effetto); return e?.tipo === 'turno' && bonus.has(e.attivita); });
    if (i < 0) continue;
    const t = normalizzaEffettoVoce(effetti[i]!.effetto) as Turno;
    aggiungiProdotti(r.voce_uid, t);
    if (!Array.isArray(effetti[i]!.completa) || effetti[i]!.completa.length) { esiti.push({ chiave: r.id, esito: 'lasciata com’è: il turno chiede di completare dati' }); continue; }
    const n = normalizzaTurno(r.voce_uid, t, bonus.get(t.attivita)!, []);
    if (n === null) { esiti.push({ chiave: r.id, esito: 'già a posto' }); continue; }
    if (typeof n === 'string') { esiti.push({ chiave: r.id, esito: `lasciata com’è: ${n}` }); continue; }
    let togli: unknown;
    try { togli = JSON.parse(r.togli_json); } catch { togli = null; }
    if (!Array.isArray(togli) || togli.some((x) => typeof x !== 'string')) { esiti.push({ chiave: r.id, esito: 'lasciata com’è: effetti da togliere illeggibili' }); continue; }
    const id = `O5bonus-${r.voce_uid.slice(0, 8)}-02-strumento`;
    const nuoviEffetti = effetti.map((x, j) => (j === i ? { effetto: n.nuovo as unknown as Record<string, unknown>, completa: [], scelte: null } : x));
    const creata = nuovaProposta(db, { id, voce: r.voce_uid, tipo: r.tipo_proposto, riferimento: r.riferimento_tipo && r.riferimento_chiave ? { tipo: r.riferimento_tipo, chiave: r.riferimento_chiave } : null,
      effetti: nuoviEffetti, togli: togli as string[], motivo: `${r.motivo} — 2026-10-27: ${n.perche}; alla spunta resta solo «Bonus» sì/no.`,
      certezza: r.certezza === 'certa' || r.certezza === 'da-verificare' ? r.certezza : 'probabile', lotto: LOTTO }, adesso);
    esiti.push(creata);
    if (creata.esito.startsWith('proposta creata') || creata.esito === 'proposta già presente') {
      esiti.push(chiudiProposta(db, { id: r.id, voce: r.voce_uid, effetti: r.effetti_json, modo: 'sostituita', da: id,
        perche: 'lo strumento si scrive come esito base con la quantità: il bonus si dice alla spunta con l’interruttore «Bonus»' }, adesso));
    }
  }
  // le proposte «oggetto ricevuto» dello stesso prodotto di uno strumento della voce: superate (l'esito dello strumento dà già l'oggetto)
  for (const r of aperte) {
    const prodotti = prodottiPerVoce.get(r.voce_uid);
    const effetti = prodotti ? leggi(r) : null;
    if (!prodotti || !effetti?.length) continue;
    const tutti = effetti.every((x) => { const e = (x?.effetto ?? {}) as { tipo?: unknown; oggetto?: unknown }; return e.tipo === 'oggetto' && typeof e.oggetto === 'string' && prodotti.has(e.oggetto); });
    if (!tutti) continue;
    let togli: unknown;
    try { togli = JSON.parse(r.togli_json); } catch { togli = null; }
    if (!Array.isArray(togli) || togli.length) { esiti.push({ chiave: r.id, esito: 'lasciata com’è: toglie anche altri effetti' }); continue; }
    esiti.push(chiudiProposta(db, { id: r.id, voce: r.voce_uid, effetti: r.effetti_json, modo: 'superata', da: null,
      perche: 'gli oggetti della fabbricazione li dà lo strumento della voce (esito base o con il bonus, per la quantità): questa li raddoppierebbe' }, adesso));
  }
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  if (!esisteTabella(db, 'dati_guida')) return;
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({ migrazione: 299, richiesta: '2026-10-27: «bastava un pulsante bonus sì/no»', decisioni: ['L13-22'], fonti: [FONTE], esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }] }));
}

export const migration299: Migration = {
  id: 299,
  name: 'bonus_si_no_della_fabbricazione',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['attivita', 'voce_giornata', 'voce_effetto', 'voce_effetto_transizione']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 299, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    if (!haColonna(db, 'attivita', 'esiti_json')) { logger.warn({ migrazione: 299 }, 'esiti delle attività assenti: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const esiti: Esito[] = [];
    const attivitaCambiate = collegaVersioniBonus(db, adesso, esiti);
    const bonus = attivitaConBonus(db);
    vociConStrumento(db, bonus, adesso, esiti);
    proposteAperte(db, bonus, adesso, esiti);
    const conteggi = {
      attivitaCollegate: attivitaCambiate,
      versioniBonus: [...bonus.values()].reduce((n, e) => n + e.esiti.filter((x) => x.bonusDi).length, 0),
      vociConvertite: esiti.filter((e) => e.esito.startsWith('convertita')).length,
      vociSaltate: esiti.filter((e) => e.esito.startsWith('saltata') || e.esito.startsWith('lasciata')).length,
      proposteCreate: esiti.filter((e) => e.esito.startsWith('proposta creata')).length,
      proposteChiuse: esiti.filter((e) => e.esito.startsWith('chiusa')).length,
    };
    const cambiato = conteggi.attivitaCollegate + conteggi.vociConvertite + conteggi.proposteCreate + conteggi.proposteChiuse > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { conteggi, esiti }, cambiato);
    logger.info({ migrazione: 299, ...conteggi }, 'Bonus sì/no: versioni con il bonus degli esiti, strumento e quantità nelle voci, proposte');
  },
};
