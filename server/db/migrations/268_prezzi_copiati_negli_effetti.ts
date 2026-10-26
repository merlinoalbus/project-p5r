// ============================================================
// Migrazione 268 — i prezzi copiati nei testi dell'effetto si tolgono: il prezzo si legge dall'offerta (Ondata 5, Lotto E; decisione 21)
// ============================================================
//
// Decisione 21 (a) dell'utente: un solo punto per ogni dato, «si tolgono le copie». Il censimento (riga «Effetto di catalogo e articolo con
// prezzo dentro») contava, oltre alle sfide della Big Bang Burger (262), alla Cintura di Idaten e alla Cesta (261), tre gruppi rimasti:
//   - la Cartolina (`regalo/cartolina` e la sua offerta `discount-rocinante/cartolina`): «Regalo economico; esiste anche una variante da 2000
//     yen». Non è una variante: è il prezzo del «Set divertimento dei Ladri» delle televendite del 25 settembre (2.000 ¥, contiene Cartolina ×3;
//     guida, Canale di televendite: «Set divertimento dei Ladri (2.000 Yen) che ci darà Wafer dei ladri x5 e Cartolina x3»), che è già
//     un'offerta con il suo contenuto (decisione 4). Diventa «Regalo economico»;
//   - i 20 vecchi articoli unici delle televendite, nascosti dal L13 (decisione 4) e tenuti per il nome, con la scheda: «Set A «X» a ¥N oppure
//     Set B «Y» a ¥M: oggi sono due articoli distinti del GG». I due prezzi sono quelli dei due set, che sono offerte: si tolgono «a ¥N»;
//   - le copie dell'effetto negli articoli di Vestiti usati (Spray rapido, Spray detergente, Incenso del risveglio, Spray supremo, Cesta di
//     vestiti) dicono ancora il costo in punti («costo 30 punti anziché yen», «costo 50 punti», «variante da 50 punti con 3 unità dal primo
//     settembre»), che dalla 261 vive in `costo_json` e, per la variante, nell'offerta `incenso-del-risveglio-50-punti` (50 punti, 3 pezzi,
//     dal 1° settembre). Si toglie la sola parte del costo; il resto della copia dell'effetto lo toglie il lotto F con la colonna.
// Ogni riga si tocca solo se è della guida (`origine = 'seed'`, `seed_json` vuoto: mai una riga corretta dall'utente), se il testo è
// esattamente quello atteso e se l'offerta che porta il prezzo c'è (visibile, con quel prezzo). Altrimenti resta com'è e l'audit lo dice.
// Il prezzo dei vecchi articoli nascosti (`articolo.prezzo`) non si tocca: è il dato che le spunte di prima hanno letto.
// Nessuna voce del Diario e nessun dato delle partite cambia (impronta controllata). Idempotente. Audit in `dati_guida.audit-268-effetti`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { FONTE_NEGOZI, FONTE_SPECIALI, improntaDiario, numeroItaliano, scriviAudit } from './prezziOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-268-effetti';
const FONTE_TELEVENDITE = 'https://www.allgamestaff.it/persona-5-royal/indice/ (Canale di televendite, 25 settembre)';
const errore = (motivo: string): never => { throw new Error(`268: ${motivo}; nessuna modifica applicata.`); };
const TELEVENDITE = 'home-shopping-tv';

interface Esito { chiave: string; tabella: 'catalogo_oggetto' | 'articolo'; esito: string; prima?: string; dopo?: string }

/** Il testo dell'effetto di una riga della guida non modificata dall'utente; undefined se la riga non c'è o non è della guida. */
function effettoDellaGuida(db: AppDatabase, tabella: 'catalogo_oggetto' | 'articolo', chiave: string): string | null | undefined {
  const r = db.prepare(`SELECT effetto, origine, seed_json FROM main.${tabella} WHERE chiave = ?`).get(chiave) as { effetto: string | null; origine: string; seed_json: string | null } | undefined;
  return r && r.origine === 'seed' && r.seed_json === null ? r.effetto : undefined;
}

/** Riscrive l'effetto della riga da `prima` a `dopo`, solo se è ancora `prima` (controllo del valore atteso). */
function riscrivi(db: AppDatabase, tabella: 'catalogo_oggetto' | 'articolo', chiave: string, prima: string, dopo: string): Esito {
  const attuale = effettoDellaGuida(db, tabella, chiave);
  if (attuale === undefined) return { chiave, tabella, esito: 'riga assente, non della guida o corretta dall’utente: non toccata' };
  if (attuale === dopo) return { chiave, tabella, esito: 'già senza il prezzo' };
  if (attuale !== prima) return { chiave, tabella, esito: 'testo diverso da quello atteso: non toccato' };
  if (db.prepare(`UPDATE main.${tabella} SET effetto = ?, updated_at = ? WHERE chiave = ? AND effetto = ? AND origine = 'seed' AND seed_json IS NULL`)
    .run(dopo, new Date().toISOString(), chiave, prima).changes !== 1) errore(`l'effetto di ${tabella} ${chiave} non si aggiorna`);
  return { chiave, tabella, esito: 'prezzo tolto', prima, dopo };
}

// ---- Cartolina ----
const CARTOLINA_PRIMA = 'Regalo economico; esiste anche una variante da 2000 yen';
const CARTOLINA_DOPO = 'Regalo economico';
const SET_CARTOLINA = `${TELEVENDITE}/set-divertimento-dei-ladri`;

function cartolina(db: AppDatabase): Esito[] {
  const set = db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND prezzo = 2000 AND costo_json IS NULL AND nascosto = 0').get(SET_CARTOLINA);
  const contiene = esisteTabella(db, 'ricompensa_oggetto')
    && !!db.prepare("SELECT 1 FROM main.ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave = ? AND catalogo_chiave = 'regalo/cartolina'").get(SET_CARTOLINA);
  if (!set || !contiene) return [{ chiave: 'regalo/cartolina', tabella: 'catalogo_oggetto', esito: 'set delle televendite da 2.000 ¥ con la Cartolina assente o diverso: non toccata' }];
  return [riscrivi(db, 'catalogo_oggetto', 'regalo/cartolina', CARTOLINA_PRIMA, CARTOLINA_DOPO), riscrivi(db, 'articolo', 'discount-rocinante/cartolina', CARTOLINA_PRIMA, CARTOLINA_DOPO)];
}

// ---- Vecchi articoli unici delle televendite ----
const UNICO_TELEVENDITE = /^Set A «([^«»]+)» a ¥([\d.]+) oppure Set B «([^«»]+)» a ¥([\d.]+): oggi sono due articoli distinti del (\d\d-\d\d)\.$/;

/** Vero se fra le offerte visibili delle televendite c'è il set con quel nome (del catalogo o dell'offerta), quel prezzo e quel giorno. */
function setInVendita(db: AppDatabase, nome: string, prezzo: number, giorno: string): boolean {
  const righe = db.prepare(`SELECT a.condizioni_json FROM main.articolo a LEFT JOIN main.catalogo_oggetto c ON c.chiave = a.catalogo_chiave
    WHERE a.negozio_chiave = ? AND a.nascosto = 0 AND a.costo_json IS NULL AND a.prezzo = ? AND (c.nome = ? OR a.nome = ?)`).all(TELEVENDITE, prezzo, nome, nome) as Array<{ condizioni_json: string | null }>;
  return righe.some((r) => {
    try {
      const c = JSON.parse(r.condizioni_json ?? '[]') as unknown;
      return Array.isArray(c) && c.some((x) => !!x && typeof x === 'object' && (x as { tipo?: unknown }).tipo === 'intervallo' && (x as { dal?: unknown }).dal === giorno && (x as { al?: unknown }).al === giorno);
    } catch { return false; }
  });
}

function unicoTelevendite(db: AppDatabase): Esito[] {
  const esiti: Esito[] = [];
  const unici = db.prepare(`SELECT chiave, catalogo_chiave, effetto FROM main.articolo WHERE negozio_chiave = ? AND nascosto = 1 AND effetto LIKE 'Set A «%' ORDER BY chiave`)
    .all(TELEVENDITE) as Array<{ chiave: string; catalogo_chiave: string | null; effetto: string }>;
  for (const u of unici) {
    const m = UNICO_TELEVENDITE.exec(u.effetto);
    if (!m) { esiti.push({ chiave: u.chiave, tabella: 'articolo', esito: 'testo diverso da quello atteso: non toccato' }); continue; }
    const [, nomeA, prezzoA, nomeB, prezzoB, giorno] = m as unknown as [string, string, string, string, string, string];
    const pA = numeroItaliano(prezzoA), pB = numeroItaliano(prezzoB);
    if (pA === null || pB === null || !setInVendita(db, nomeA, pA, giorno) || !setInVendita(db, nomeB, pB, giorno)) {
      esiti.push({ chiave: u.chiave, tabella: 'articolo', esito: 'uno dei due set non è un’offerta con quel nome, prezzo e giorno: non toccato' }); continue;
    }
    const dopo = `Set A «${nomeA}» oppure Set B «${nomeB}»: oggi sono due articoli distinti del ${giorno}.`;
    esiti.push(riscrivi(db, 'articolo', u.chiave, u.effetto, dopo));
    // la scheda del catalogo del vecchio articolo dice la stessa cosa: la stessa correzione, se il testo è lo stesso
    if (u.catalogo_chiave) esiti.push(riscrivi(db, 'catalogo_oggetto', u.catalogo_chiave, u.effetto, dopo));
  }
  return esiti;
}

// ---- Vestiti usati: la parte del costo nelle copie dell'effetto ----
const VESTITI = 'vestiti-usati-kichijoji';
const COSTO_IN_PUNTI = /^(.*); costo (\d+) punti(?: anziché yen)?$/;
const INCENSO = `${VESTITI}/incenso-del-risveglio`;
const INCENSO_50 = `${VESTITI}/incenso-del-risveglio-50-punti`;
const VARIANTE_INCENSO = '; costo 30 punti, variante da 50 punti con 3 unità dal primo settembre';

/** Il costo in punti dell'offerta (null se non è un costo in punti leggibile). */
function puntiDellOfferta(db: AppDatabase, chiave: string): number | null {
  const r = db.prepare('SELECT costo_json FROM main.articolo WHERE chiave = ? AND nascosto = 0').get(chiave) as { costo_json: string | null } | undefined;
  try {
    const c = JSON.parse(r?.costo_json ?? 'null') as { tipo?: unknown; importo?: unknown } | null;
    return c && c.tipo === 'punti' && typeof c.importo === 'number' ? c.importo : null;
  } catch { return null; }
}

/** La variante da 50 punti dell'Incenso è un'offerta: 50 punti, 3 pezzi, dal 1° settembre. */
function varianteIncensoInVendita(db: AppDatabase): boolean {
  const r = db.prepare('SELECT quantita, condizioni_json FROM main.articolo WHERE chiave = ? AND nascosto = 0').get(INCENSO_50) as { quantita: number | null; condizioni_json: string | null } | undefined;
  if (!r || r.quantita !== 3 || puntiDellOfferta(db, INCENSO_50) !== 50) return false;
  try {
    const c = JSON.parse(r.condizioni_json ?? '[]') as unknown;
    return Array.isArray(c) && c.some((x) => !!x && typeof x === 'object' && (x as { tipo?: unknown }).tipo === 'data' && (x as { dal?: unknown }).dal === '09-01');
  } catch { return false; }
}

function vestitiUsati(db: AppDatabase): Esito[] {
  const esiti: Esito[] = [];
  const righe = db.prepare("SELECT chiave, effetto FROM main.articolo WHERE negozio_chiave = ? AND effetto LIKE '%; costo % punti%' ORDER BY chiave").all(VESTITI) as Array<{ chiave: string; effetto: string }>;
  for (const r of righe) {
    if (r.chiave === INCENSO && r.effetto.endsWith(VARIANTE_INCENSO)) {
      if (puntiDellOfferta(db, INCENSO) !== 30 || !varianteIncensoInVendita(db)) { esiti.push({ chiave: r.chiave, tabella: 'articolo', esito: 'costo o variante da 50 punti diversi dall’atteso: non toccato' }); continue; }
      esiti.push(riscrivi(db, 'articolo', r.chiave, r.effetto, r.effetto.slice(0, -VARIANTE_INCENSO.length)));
      continue;
    }
    const m = COSTO_IN_PUNTI.exec(r.effetto);
    if (!m || !m[1]!.trim()) { esiti.push({ chiave: r.chiave, tabella: 'articolo', esito: 'testo diverso da quello atteso: non toccato' }); continue; }
    if (puntiDellOfferta(db, r.chiave) !== Number(m[2])) { esiti.push({ chiave: r.chiave, tabella: 'articolo', esito: `il costo dell’offerta non è ${m[2]} punti: non toccato` }); continue; }
    esiti.push(riscrivi(db, 'articolo', r.chiave, r.effetto, m[1]!));
  }
  return esiti;
}

export const migration268: Migration = {
  id: 268,
  name: 'prezzi_copiati_negli_effetti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'catalogo_oggetto') || !esisteTabella(db, 'articolo')) { logger.warn({ migrazione: 268 }, 'catalogo o articoli assenti: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const esiti: Esito[] = [...cartolina(db), ...unicoTelevendite(db), ...vestitiUsati(db)];
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const tolti = esiti.filter((e) => e.esito === 'prezzo tolto');
    const conteggi = {
      prezziTolti: tolti.length,
      catalogo: tolti.filter((e) => e.tabella === 'catalogo_oggetto').length,
      articoli: tolti.filter((e) => e.tabella === 'articolo').length,
      giaSenzaPrezzo: esiti.filter((e) => e.esito === 'già senza il prezzo').length,
      nonToccati: esiti.filter((e) => /non toccat/.test(e.esito)).length,
    };
    if (tolti.length) invalidaCacheDiGioco();
    scriviAudit(db, AUDIT, 268, { fonti: [FONTE_TELEVENDITE, FONTE_NEGOZI, FONTE_SPECIALI], conteggi, esiti });
    logger.info({ migrazione: 268, ...conteggi }, 'Catalogo e offerte: prezzi copiati tolti dai testi dell’effetto');
  },
};
