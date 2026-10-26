// ============================================================
// Migrazione 283 — i premi delle sfide della Big Bang Burger come oggetti del catalogo, e «Cosmic Tower Burger» (Ondata 5, Lotto G; decisione 21)
// ============================================================
//
// Decisione 21 dell'utente (26 ottobre): «Non sono d'accordo nel rimandare attività a fasi successive». Progetto dell'ondata 5, lotto G:
// «Esiti con trofeo e premi oggetto […]. Distintivi Big Bang Burger come premi (+10/20/30% HP, prevale Royal; «Cosmic Tower Burger»)»; §7:
// «estendere gli esiti con un trofeo e con premi come oggetti per chiave con quantità; serve anche ai distintivi della Big Bang Burger».
// Censimento O5-10: «I `premi` delle sfide diventano oggetti per chiave con quantità (3, 5 e 10 Big Bang Burger)»; «quando lo fa l'esito, le
// proposte "oggetto big-bang-burger ×3/×5" sulle voci ca8068b2 e fb0ac49a raddoppierebbero il premio: vanno tolte»; «la terza sfida in
// [accessori] si chiama "Cosmic Tower Burger"; nei dati è "Cosmo Tower"». Le schede dei tre distintivi (con l'effetto della guida italiana,
// HP massimi +10/+20/+30%) le crea il lotto F (migrazione 273, `accessorio/distintivo-numero-due`, `-numero-uno`, `-del-capitano`); il
// lotto F (274) ha tolto dal testo dei premi l'effetto copiato e ha lasciato a questo lotto il collegamento all'oggetto e il nome della prova.
// Che cosa fa:
//   (1) gli esiti «vinta» delle tre sfide (`sfida-big-bang-burger`, `attivita.esiti_json`) dicono gli oggetti che danno (`oggetti`,
//       `shared/esitiAttivita.ts`): il distintivo (1) e i Big Bang Burger (3, 5, 10, `consumabile/big-bang-burger`); il testo `premi` diventa
//       vuoto, perché diceva soltanto quegli oggetti. Registrando il turno vinto gli oggetti entrano fra quelli ottenuti (utente 053). Un esito
//       si collega solo se il premio è ancora uno dei due testi attesi (prima o dopo la 274) e se tutte le sue schede sono nel catalogo:
//       altrimenti resta com'è (l'audit dice perché; senza la 273 i distintivi non ci sono e il testo resta);
//   (2) la terza prova si chiama come nella guida, «Cosmic Tower Burger»: gruppo e nomi dei suoi due esiti (le chiavi `cosmo-tower-*` non
//       cambiano: le citano voci e ricevute), il nome della scheda e dell'offerta della sfida e la frase dei dettagli dell'attività, solo se
//       sono ancora i testi attesi;
//   (3) le proposte «oggetto Big Bang Burger ×3» (05-18 sera `ca8068b2`, periodo validato) e «×5» (08-14 `fb0ac49a`) si chiudono come superate,
//       solo se l'esito vinto della loro sfida dà ora quei panini: approvate, raddoppierebbero il premio.
// I turni già registrati nelle partite non si riscrivono: nessun oggetto si aggiunge da solo a una partita salvata (l'audit conta i turni).
// Conservativa: solo l'attività della guida mai corretta dall'utente (`origine = 'seed'`, `seed_json IS NULL`), solo i testi attesi. Nessuna
// voce del Diario cambia (impronta controllata). Idempotente. Audit in `dati_guida.audit-283-premi-sfide`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { improntaDiario } from './rifornimentoOndata5.js';
import { scriviAuditLotteria } from './lotteriaOndata5.js';
import { leggiEsitiAttivita, type EsitiAttivita, type OggettoEsito } from '../../../shared/esitiAttivita.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-283-premi-sfide';
const ATTIVITA = 'sfida-big-bang-burger';
const BURGER = 'consumabile/big-bang-burger';
const FONTE_ACCESSORI = 'https://www.allgamestaff.it/persona-5-royal/accessori/';
const errore = (motivo: string): never => { throw new Error(`283: ${motivo}; nessuna modifica applicata.`); };
type Esito = { chiave: string; esito: string };

/** Esito vinto → i due testi attesi del premio (prima e dopo la 274 del lotto F) e gli oggetti che dà. */
const PREMI: Readonly<Record<string, { testi: readonly string[]; oggetti: OggettoEsito[] }>> = {
  'comet-vinta': { testi: ['Distintivo 2nd Mate (più 10 HP) e 3 Big Bang Burger', 'Distintivo numero due e 3 Big Bang Burger'],
    oggetti: [{ oggetto: 'accessorio/distintivo-numero-due', quantita: 1 }, { oggetto: BURGER, quantita: 3 }] },
  'gravity-vinta': { testi: ['Distintivo 1st Mate (più 30 HP) e 5 Big Bang Burger', 'Distintivo numero uno e 5 Big Bang Burger'],
    oggetti: [{ oggetto: 'accessorio/distintivo-numero-uno', quantita: 1 }, { oggetto: BURGER, quantita: 5 }] },
  'cosmo-tower-vinta': { testi: ['Distintivo Captain (più 50 HP) e 10 Big Bang Burger', 'Distintivo del capitano e 10 Big Bang Burger'],
    oggetti: [{ oggetto: 'accessorio/distintivo-del-capitano', quantita: 1 }, { oggetto: BURGER, quantita: 10 }] },
};
const COSMO = 'Cosmo Tower Burger', COSMIC = 'Cosmic Tower Burger';
const NOMI_ESITI: Readonly<Record<string, { prima: string; dopo: string }>> = {
  'cosmo-tower-vinta': { prima: `${COSMO} · vinta`, dopo: `${COSMIC} · vinta` },
  'cosmo-tower-persa': { prima: `${COSMO} · persa`, dopo: `${COSMIC} · persa` },
};
const SFIDA_COSMIC = { catalogo: 'altro/sfida-cosmo-tower-burger', articolo: 'big-bang-burger/sfida-cosmo-tower-burger', prima: `Sfida ${COSMO}`, dopo: `Sfida ${COSMIC}` };
const DETTAGLI_PRIMA = 'Sblocco (dalla guida): Tre sfide progressive: Comet Burger (Coraggio/Conoscenza/Perizia Rango 2), Gravity Burger (Rango 3), Cosmo Tower Burger (Rango 4)';
const DETTAGLI_DOPO = 'Sblocco (dalla guida): Tre sfide progressive: Comet Burger (Coraggio/Conoscenza/Perizia Rango 2), Gravity Burger (Rango 3), Cosmic Tower Burger (Rango 4)';

/** Le proposte «oggetto Big Bang Burger» che raddoppierebbero il premio dell'esito vinto. `da`: la proposta del turno che la sostituisce. */
const PROPOSTE: ReadonlyArray<{ id: string; voce: string; quantita: number; esito: string; da: string | null }> = [
  { id: 'L13-4b-ca8068b2-02-b-premio', voce: 'ca8068b24c0fe186d2183abb62e1e621', quantita: 3, esito: 'comet-vinta', da: 'L13-4b-ca8068b2-04-a-esiti-attivita' },
  { id: 'L13-4b-fb0ac49a-01-b-premio', voce: 'fb0ac49af6e48c2172f4250626e1c521', quantita: 5, esito: 'gravity-vinta', da: null },
];
const effettiProposta = (q: number) => JSON.stringify([{ effetto: { tipo: 'oggetto', oggetto: BURGER, quantita: q }, completa: [], scelte: null }]);

const stessiOggetti = (a: readonly OggettoEsito[] | undefined, b: readonly OggettoEsito[]): boolean => JSON.stringify(a ?? []) === JSON.stringify(b);

/** Gli esiti della sfida corretti in memoria: oggetti dei premi e nome della terza prova. Ritorna gli esiti per esito. */
function correggiEsiti(db: AppDatabase, dati: EsitiAttivita): Esito[] {
  const out: Esito[] = [];
  const nelCatalogo = db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?');
  for (const [chiave, p] of Object.entries(PREMI)) {
    const e = dati.esiti.find((x) => x.chiave === chiave);
    if (!e) { out.push({ chiave, esito: 'esito assente' }); continue; }
    if (e.premi === null && stessiOggetti(e.oggetti, p.oggetti)) { out.push({ chiave, esito: 'già collegato agli oggetti' }); continue; }
    if (e.oggetti?.length || e.premi === null || !p.testi.includes(e.premi)) { out.push({ chiave, esito: `premio diverso da quello atteso: non toccato (${e.premi ?? 'nessun testo'})` }); continue; }
    const mancanti = p.oggetti.filter((o) => !nelCatalogo.get(o.oggetto)).map((o) => o.oggetto);
    if (mancanti.length) { out.push({ chiave, esito: `schede assenti nel catalogo (${mancanti.join(', ')}; i distintivi li crea la 273 del lotto F): premio lasciato in parole` }); continue; }
    const prima = e.premi;
    e.premi = null;
    e.oggetti = p.oggetti.map((o) => ({ ...o }));
    out.push({ chiave, esito: `collegato agli oggetti (prima: «${prima}»)` });
  }
  for (const e of dati.esiti) {
    if (e.gruppo === COSMO) e.gruppo = COSMIC;
    const n = NOMI_ESITI[e.chiave];
    if (n && e.nome === n.prima) { e.nome = n.dopo; out.push({ chiave: e.chiave, esito: `nome «${n.dopo}»` }); }
  }
  return out;
}

/** Il nome della terza prova nella scheda, nell'offerta e nei dettagli dell'attività, solo se sono ancora i testi attesi. */
function rinominaProva(db: AppDatabase, adesso: string): Esito[] {
  const out: Esito[] = [];
  const s = db.prepare('SELECT nome, origine, seed_json FROM main.catalogo_oggetto WHERE chiave = ?').get(SFIDA_COSMIC.catalogo) as { nome: string; origine: string; seed_json: string | null } | undefined;
  if (!s) out.push({ chiave: SFIDA_COSMIC.catalogo, esito: 'scheda assente' });
  else if (s.nome === SFIDA_COSMIC.dopo) out.push({ chiave: SFIDA_COSMIC.catalogo, esito: 'già «Cosmic»' });
  else if (s.nome !== SFIDA_COSMIC.prima || s.origine !== 'seed' || s.seed_json !== null) out.push({ chiave: SFIDA_COSMIC.catalogo, esito: 'nome diverso o corretto dall’utente: non toccato' });
  else {
    if (db.prepare('UPDATE main.catalogo_oggetto SET nome = ?, updated_at = ? WHERE chiave = ? AND nome = ?').run(SFIDA_COSMIC.dopo, adesso, SFIDA_COSMIC.catalogo, SFIDA_COSMIC.prima).changes !== 1) errore('il nome della scheda della sfida non si aggiorna');
    out.push({ chiave: SFIDA_COSMIC.catalogo, esito: 'nome «Sfida Cosmic Tower Burger»' });
  }
  const a = db.prepare('SELECT nome, origine, seed_json FROM main.articolo WHERE chiave = ?').get(SFIDA_COSMIC.articolo) as { nome: string | null; origine: string; seed_json: string | null } | undefined;
  if (!a) out.push({ chiave: SFIDA_COSMIC.articolo, esito: 'offerta assente' });
  else if (a.nome === SFIDA_COSMIC.dopo) out.push({ chiave: SFIDA_COSMIC.articolo, esito: 'già «Cosmic»' });
  else if (a.nome !== SFIDA_COSMIC.prima || a.origine !== 'seed' || a.seed_json !== null) out.push({ chiave: SFIDA_COSMIC.articolo, esito: 'nome diverso o corretto dall’utente: non toccato' });
  else {
    if (db.prepare('UPDATE main.articolo SET nome = ?, updated_at = ? WHERE chiave = ? AND nome = ?').run(SFIDA_COSMIC.dopo, adesso, SFIDA_COSMIC.articolo, SFIDA_COSMIC.prima).changes !== 1) errore('il nome dell’offerta della sfida non si aggiorna');
    out.push({ chiave: SFIDA_COSMIC.articolo, esito: 'nome «Sfida Cosmic Tower Burger»' });
  }
  if (haColonna(db, 'attivita', 'dettagli')) {
    const d = db.prepare("SELECT dettagli FROM main.attivita WHERE chiave = ? AND origine = 'seed' AND seed_json IS NULL").pluck().get(ATTIVITA) as string | null | undefined;
    if (d === DETTAGLI_DOPO) out.push({ chiave: `dettagli:${ATTIVITA}`, esito: 'già «Cosmic»' });
    else if (d !== DETTAGLI_PRIMA) out.push({ chiave: `dettagli:${ATTIVITA}`, esito: 'dettagli diversi da quelli attesi o corretti dall’utente: non toccati' });
    else {
      if (db.prepare('UPDATE main.attivita SET dettagli = ?, updated_at = ? WHERE chiave = ? AND dettagli = ?').run(DETTAGLI_DOPO, adesso, ATTIVITA, DETTAGLI_PRIMA).changes !== 1) errore('i dettagli della sfida non si aggiornano');
      out.push({ chiave: `dettagli:${ATTIVITA}`, esito: 'dettagli con «Cosmic Tower Burger»' });
    }
  }
  return out;
}

/** Chiude una proposta «oggetto Big Bang Burger» quando l'esito vinto della sua sfida dà ora gli stessi panini. */
function chiudiProposta(db: AppDatabase, p: (typeof PROPOSTE)[number], esiti: EsitiAttivita | null, adesso: string): Esito {
  const r = db.prepare('SELECT voce_uid, stato, effetti_json FROM main.proposta_conversione_voce WHERE id = ?').get(p.id) as { voce_uid: string; stato: string; effetti_json: string } | undefined;
  if (!r) return { chiave: p.id, esito: 'proposta assente' };
  if (r.stato !== 'aperta') return { chiave: p.id, esito: `già decisa (${r.stato}): non toccata` };
  if (r.voce_uid !== p.voce || r.effetti_json !== effettiProposta(p.quantita)) return { chiave: p.id, esito: 'contenuto diverso da quello atteso: non toccata' };
  const daEsito = esiti?.esiti.find((e) => e.chiave === p.esito)?.oggetti?.find((o) => o.oggetto === BURGER)?.quantita;
  if (daEsito !== p.quantita) return { chiave: p.id, esito: 'l’esito vinto non dà (ancora) questi panini: lasciata aperta' };
  if (p.da !== null && !db.prepare('SELECT 1 FROM main.proposta_conversione_voce WHERE id = ?').get(p.da)) return { chiave: p.id, esito: `la proposta del turno (${p.da}) non c’è: lasciata aperta` };
  // senza proposta del turno: il turno della sfida con l'esito vinto deve essere già sulla voce (migrazione 234), altrimenti nessuno dà i panini
  if (p.da === null && !(db.prepare("SELECT dati_json FROM main.voce_effetto WHERE voce_uid = ? AND tipo = 'turno' AND chiave = ?").pluck().all(p.voce, ATTIVITA) as string[])
    .some((j) => { try { return (JSON.parse(j) as { esito?: unknown }).esito === p.esito; } catch { return false; } })) {
    return { chiave: p.id, esito: 'la voce non ha il turno della sfida con l’esito vinto: lasciata aperta' };
  }
  const perche = `i ${p.quantita} Big Bang Burger li dà l’esito vinto della sfida («${p.esito}»), registrando il turno: approvata, la proposta raddoppierebbe il premio (censimento O5-10; migrazione dell’ondata 5, lotto G)`;
  if (db.prepare("UPDATE main.proposta_conversione_voce SET stato = 'scartata', decisa_il = ?, esito_json = ? WHERE id = ? AND stato = 'aperta'")
    .run(adesso, JSON.stringify({ modo: 'superata', ...(p.da ? { da: p.da } : {}), perche }), p.id).changes !== 1) errore(`la proposta ${p.id} non si chiude`);
  return { chiave: p.id, esito: `chiusa come superata${p.da ? ` (${p.da})` : ' (turno della sfida sulla voce)'}` };
}

export const migration283: Migration = {
  id: 283,
  name: 'premi_delle_sfide_come_oggetti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['attivita', 'catalogo_oggetto', 'articolo', 'proposta_conversione_voce', 'voce_giornata']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 283, tabella: t }, 'tabella assente: premi delle sfide non toccati'); return; }
    }
    if (!haColonna(db, 'attivita', 'esiti_json')) { logger.warn({ migrazione: 283 }, 'esiti delle attività assenti: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const diarioPrima = improntaDiario(db);
    const esiti: Esito[] = [];
    const r = db.prepare('SELECT esiti_json, origine, seed_json FROM main.attivita WHERE chiave = ?').get(ATTIVITA) as { esiti_json: string | null; origine: string; seed_json: string | null } | undefined;
    let dati: EsitiAttivita | null = null;
    let motivo: string | null = null;
    if (!r || !r.esiti_json) motivo = 'attività o esiti assenti';
    else if (r.origine !== 'seed' || r.seed_json !== null) motivo = 'attività corretta dall’utente: non toccata';
    else if (!(dati = leggiEsitiAttivita(r.esiti_json))) motivo = 'esiti non validi: non toccati';
    let cambiati = 0;
    if (dati && r?.esiti_json) {
      esiti.push(...correggiEsiti(db, dati));
      const json = JSON.stringify(dati);
      if (json !== JSON.stringify(leggiEsitiAttivita(r.esiti_json))) {
        if (JSON.stringify(leggiEsitiAttivita(json)) !== json) errore('gli esiti corretti non si rileggono validi');
        if (db.prepare("UPDATE main.attivita SET esiti_json = ?, updated_at = ? WHERE chiave = ? AND esiti_json = ? AND origine = 'seed' AND seed_json IS NULL")
          .run(json, adesso, ATTIVITA, r.esiti_json).changes !== 1) errore('gli esiti della sfida non si aggiornano');
        cambiati++;
      }
      esiti.push(...rinominaProva(db, adesso));
    }
    const letti = leggiEsitiAttivita(db.prepare('SELECT esiti_json FROM main.attivita WHERE chiave = ?').pluck().get(ATTIVITA) as string | null);
    esiti.push(...PROPOSTE.map((p) => chiudiProposta(db, p, letti, adesso)));
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    // i turni già registrati non si riscrivono: si contano soltanto, per chi legge l'audit
    const turniGia = db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'turno_partita'").get()
      ? db.prepare('SELECT COUNT(*) FROM utente.turno_partita WHERE attivita_chiave = ?').pluck().get(ATTIVITA) as number : 0;
    const conteggi = {
      esitiCollegati: esiti.filter((e) => e.esito.startsWith('collegato')).length,
      nomi: esiti.filter((e) => /^nome «|^dettagli con/.test(e.esito)).length,
      proposteChiuse: esiti.filter((e) => e.esito.startsWith('chiusa')).length,
      nonToccati: esiti.filter((e) => /non toccat|assente|lasciata aperta|lasciato/.test(e.esito)).length,
      turniGiaRegistrati: turniGia,
    };
    if (cambiati || conteggi.nomi) invalidaCacheDiGioco();
    scriviAuditLotteria(db, AUDIT, 283, { fonti: [FONTE_ACCESSORI], attivita: ATTIVITA, ...(motivo ? { motivo } : {}), conteggi, esiti,
      nota: 'I turni della sfida già registrati nelle partite non ricevono gli oggetti: nessun oggetto si aggiunge da solo a una partita salvata.' });
    if (motivo) logger.warn({ migrazione: 283, motivo }, 'premi delle sfide della Big Bang Burger: nessuna correzione');
    logger.info({ migrazione: 283, ...conteggi }, 'Big Bang Burger: premi delle sfide come oggetti del catalogo, «Cosmic Tower Burger»');
  },
};
