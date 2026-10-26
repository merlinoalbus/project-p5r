// ============================================================
// Migrazione 270 — le copie dell'effetto e delle statistiche nelle offerte si tolgono: si leggono dall'oggetto del catalogo (Ondata 5, Lotto F)
// ============================================================
//
// Decisione 21 (a) dell'utente: «Gli effetti degli oggetti ai fini di questa app non è necessario gestirli se non come informazione testuale»;
// un solo punto per il testo dell'effetto (`catalogo_oggetto.effetto`) e per le statistiche (`catalogo_oggetto.statistiche_json`); «si tolgono
// le copie (articoli, traduzioni, descrizioni) e si correggono i testi sbagliati». Censimento sulla copia alla 268: 431 offerte con
// `articolo.effetto` e 199 con `articolo.statistiche`, tutte collegate a un oggetto del catalogo (che la lettura usa già, `negoziService`):
// copie morte, in parte diverse dal catalogo. Fra queste le frasi sbagliate di O5-08: Vino della grazia e Soma «di un alleato» (la guida:
// tutti gli alleati; decisione 11, vale il catalogo), Spray supremo «rimuove uno stato negativo» (la guida: riduce le statistiche di un
// nemico per tre turni), Curry del Leblanc «ripristina leggermente gli SP» (la guida: 50 SP a tutti), Collana cremisi di Stoneon «Potenzia
// attacco Fuoco». Le statistiche sono 199 copie identiche di `statistiche_json.testo`; `effetto_json` non ha righe.
//
// Che cosa fa: per ogni offerta collegata a un oggetto del catalogo che c'è, `effetto`, `statistiche` ed `effetto_json` diventano NULL, e
// così nella fotografia della guida (`seed_json`), dove c'è, perché «Ripristina» non rimetta la copia; anche nelle fotografie delle offerte
// collegate dall'utente, la cui riga non ha più la copia (`fotografieConCopia`). Conservativa:
//   - una riga creata dall'utente (`origine = 'utente'` senza `seed_json`) non si tocca;
//   - una riga corretta dall'utente in uno di questi campi (valore diverso dalla fotografia) non si tocca;
//   - un testo che non c'è nell'oggetto (né effetto né effetti delle letture, né statistiche) non si perde: la riga resta com'è, salvo le due
//     frasi superate elencate in `SUPERATE` con il motivo.
// I valori di prima di ogni riga stanno nell'audit `dati_guida.audit-270-effetti-offerte`. Nessuna voce del Diario e nessun dato delle partite
// cambia (impronta controllata). Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { FONTE_ACCESSORI, FONTE_OGGETTI, improntaDiario, scriviAuditTesti } from './testiOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-270-effetti-offerte';
const errore = (motivo: string): never => { throw new Error(`270: ${motivo}; nessuna modifica applicata.`); };
const CAMPI = ['effetto', 'statistiche', 'effetto_json'] as const;
type Campo = (typeof CAMPI)[number];

/** Le frasi dell'offerta senza un corrispettivo nell'oggetto che si tolgono comunque, perché superate da un dato (con il motivo). */
const SUPERATE: Readonly<Record<string, string>> = {
  // Decisione 13 e lotto D (257): a chi piace un regalo si legge da `confidente_regalo`; l'offerta di 37 Gradi Celsius è nascosta (lotto C, 252)
  '37-gradi-celsius/braccialetto-argento': 'elenco «gradito a» superato da confidente_regalo (decisione 13); offerta nascosta',
  // L'oggetto collegato è un consumabile di Tanaka, non un accessorio: la frase è sbagliata e non dice che cosa fa
  'tanaka-affari-loschi/inspired-hand-mirror': 'frase sbagliata («accessorio»): l’oggetto collegato è un consumabile',
};

interface Riga { chiave: string; origine: string; seed_json: string | null; effetto: string | null; statistiche: string | null; effetto_json: string | null;
  c_effetto: string; c_statistiche: string | null }
interface Esito { chiave: string; esito: string; prima?: Partial<Record<Campo, string | null>> }

const pieno = (v: string | null | undefined): boolean => typeof v === 'string' && v.trim() !== '';

/** Vero se l'oggetto del catalogo dice qualcosa al posto del testo dell'offerta: un effetto, voci d'effetto (letture, videogiochi), statistiche. */
function oggettoDiceEffetto(r: Riga): boolean {
  if (pieno(r.c_effetto)) return true;
  try {
    const s = JSON.parse(r.c_statistiche ?? 'null') as { effetti?: unknown } | null;
    return !!s && Array.isArray(s.effetti) && s.effetti.length > 0;
  } catch { return false; }
}
function oggettoDiceStatistiche(r: Riga): boolean {
  try {
    const s = JSON.parse(r.c_statistiche ?? 'null') as { testo?: unknown } | null;
    return !!s && typeof s.testo === 'string' && s.testo.trim() !== '';
  } catch { return false; }
}

function togli(db: AppDatabase, r: Riga): Esito {
  const prima = Object.fromEntries(CAMPI.filter((c) => r[c] !== null).map((c) => [c, r[c]])) as Partial<Record<Campo, string | null>>;
  if (r.origine === 'utente' && r.seed_json === null) return { chiave: r.chiave, esito: 'offerta creata dall’utente: non toccata', prima };
  let foto: Record<string, unknown> | null = null;
  if (r.seed_json !== null) {
    try {
      const v = JSON.parse(r.seed_json) as unknown;
      if (!v || typeof v !== 'object' || Array.isArray(v)) return { chiave: r.chiave, esito: 'fotografia della guida illeggibile: non toccata', prima };
      foto = v as Record<string, unknown>;
    } catch { return { chiave: r.chiave, esito: 'fotografia della guida illeggibile: non toccata', prima }; }
    // un campo corretto dall'utente (diverso dalla fotografia) resta: un dato salvato non si cambia in silenzio
    const corretto = CAMPI.find((c) => c in foto! && (foto![c] ?? null) !== r[c]);
    if (corretto) return { chiave: r.chiave, esito: `${corretto} corretto dall’utente: non toccata`, prima };
  }
  const superata = SUPERATE[r.chiave];
  if (pieno(r.effetto) && !oggettoDiceEffetto(r) && !superata) return { chiave: r.chiave, esito: 'effetto che l’oggetto del catalogo non dice: non toccata (unico punto)', prima };
  if (pieno(r.statistiche) && !oggettoDiceStatistiche(r) && !superata) return { chiave: r.chiave, esito: 'statistiche che l’oggetto del catalogo non dice: non toccata (unico punto)', prima };
  const nuovaFoto = foto ? JSON.stringify({ ...foto, ...Object.fromEntries(CAMPI.filter((c) => c in foto!).map((c) => [c, null])) }) : null;
  const n = db.prepare(`UPDATE main.articolo SET effetto = NULL, statistiche = NULL, effetto_json = NULL, seed_json = ?, updated_at = ?
    WHERE chiave = ? AND effetto IS ? AND statistiche IS ? AND effetto_json IS ? AND seed_json IS ?`)
    .run(nuovaFoto, new Date().toISOString(), r.chiave, r.effetto, r.statistiche, r.effetto_json, r.seed_json).changes;
  if (n !== 1) errore(`l'offerta ${r.chiave} non si aggiorna`);
  return { chiave: r.chiave, esito: superata ? `copia tolta (${superata})` : 'copia tolta', prima };
}

/**
 * Le offerte collegate che non hanno più la copia nella riga (già tolta quando l'utente ha collegato l'oggetto) ma la conservano nella
 * fotografia della guida: la copia si toglie anche da lì (con il valore di prima nell'audit), così la fotografia non porta un secondo testo
 * dell'effetto. «Ripristina» non lo riscriverebbe comunque (effetto e statistiche non sono più colonne scrivibili dell'offerta).
 */
function fotografieConCopia(db: AppDatabase): Esito[] {
  const righe = db.prepare(`SELECT a.chiave, a.seed_json FROM main.articolo a JOIN main.catalogo_oggetto c ON c.chiave = a.catalogo_chiave
    WHERE a.seed_json IS NOT NULL AND a.effetto IS NULL AND a.statistiche IS NULL AND a.effetto_json IS NULL ORDER BY a.chiave`).all() as Array<{ chiave: string; seed_json: string }>;
  const esiti: Esito[] = [];
  for (const r of righe) {
    let foto: Record<string, unknown>;
    try {
      const v = JSON.parse(r.seed_json) as unknown;
      if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
      foto = v as Record<string, unknown>;
    } catch { continue; }
    const conCopia = CAMPI.filter((c) => foto[c] !== undefined && foto[c] !== null);
    if (!conCopia.length) continue;
    const prima = Object.fromEntries(conCopia.map((c) => [c, foto[c] as string])) as Partial<Record<Campo, string | null>>;
    const nuova = JSON.stringify({ ...foto, ...Object.fromEntries(conCopia.map((c) => [c, null])) });
    if (db.prepare('UPDATE main.articolo SET seed_json = ? WHERE chiave = ? AND seed_json = ?').run(nuova, r.chiave, r.seed_json).changes !== 1) errore(`la fotografia dell'offerta ${r.chiave} non si aggiorna`);
    esiti.push({ chiave: r.chiave, esito: 'copia tolta dalla fotografia della guida', prima });
  }
  return esiti;
}

export const migration270: Migration = {
  id: 270,
  name: 'effetti_copiati_negli_articoli',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'catalogo_oggetto') || !esisteTabella(db, 'articolo')) { logger.warn({ migrazione: 270 }, 'catalogo o articoli assenti: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const righe = db.prepare(`SELECT a.chiave, a.origine, a.seed_json, a.effetto, a.statistiche, a.effetto_json, c.effetto AS c_effetto, c.statistiche_json AS c_statistiche
      FROM main.articolo a JOIN main.catalogo_oggetto c ON c.chiave = a.catalogo_chiave
      WHERE a.effetto IS NOT NULL OR a.statistiche IS NOT NULL OR a.effetto_json IS NOT NULL ORDER BY a.chiave`).all() as Riga[];
    const esitiRighe = righe.map((r) => togli(db, r));
    const esitiFoto = fotografieConCopia(db);
    const esiti = [...esitiRighe, ...esitiFoto];
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const tolte = esitiRighe.filter((e) => e.esito.startsWith('copia tolta'));
    const conteggi = {
      offerteConCopia: righe.length,
      copieTolte: tolte.length,
      fotografieRipulite: esitiFoto.length,
      effettiTolti: tolte.filter((e) => pieno(e.prima?.effetto)).length,
      statisticheTolte: tolte.filter((e) => pieno(e.prima?.statistiche)).length,
      dichiarazioniTolte: tolte.filter((e) => e.prima?.effetto_json != null).length,
      superate: tolte.filter((e) => e.esito !== 'copia tolta').length,
      nonToccate: esitiRighe.length - tolte.length,
      senzaOggetto: db.prepare("SELECT COUNT(*) FROM main.articolo WHERE catalogo_chiave IS NULL AND (COALESCE(effetto, '') <> '' OR COALESCE(statistiche, '') <> '' OR effetto_json IS NOT NULL)").pluck().get() as number,
    };
    if (tolte.length + esitiFoto.length) invalidaCacheDiGioco();
    scriviAuditTesti(db, AUDIT, 270, { fonti: [FONTE_OGGETTI, FONTE_ACCESSORI], conteggi, esiti });
    logger.info({ migrazione: 270, ...conteggi }, 'Offerte: effetto e statistiche si leggono solo dall’oggetto del catalogo');
  },
};
