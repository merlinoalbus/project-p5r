// ============================================================
// 064 — le condizioni sono stati della partita, non frasi
// ============================================================
//
// Al momento di questa migrazione 324 righe del catalogo (13 attività, 22 libri, 21 film, 23
// negozi, 245 articoli) portavano una condizione «da configurare»: una frase della guida che il
// convertitore non sapeva leggere e che restava lì, mostrata come punto interrogativo e valutata
// da nessuno. Tre righe avevano uno «stato» con nome libero. L'utente ha chiesto stati veri
// (2026-09-11): «le condizioni sono stati del sistema che definiscono il comportamento degli
// elementi... non voglio più vedere condizioni espresse come frasi testuali».
//
// Tre cose succedono qui, nell'ordine:
//
// 1. **Le tabelle di stato che mancavano.** Alcune frasi chiedevano cose che la partita non
//    registrava da nessuna parte: quante volte hai giocato a biliardo, se hai pulito la mansarda,
//    quanti punti fedeltà hai in un negozio. Nascono `attivita_svolta_partita`,
//    `evento_storia_partita`, `punti_negozio_partita`. Il grado cliente di Tanaka invece si
//    **calcola** dalla spesa, e non ha tabella.
//
// 2. **Via `fatto_gioco` e `fatto_partita`**: erano lo «stato» a nome libero. Le tre righe che
//    lo usavano contavano film e videogiochi completati, e diventano un `contatore`, che l'app
//    calcola da sola dai progressi.
//
// 3. **Ogni foglia «da configurare» viene convertita** con le regole di `shared/migraCondizioni.ts`,
//    riscritte per coprire tutte le 128 frasi distinte censite. La conversione è chirurgica: si
//    sostituisce la foglia, il resto della condizione (gruppi, negazioni, stati già veri) resta
//    com'è. Se una frase non si converte — non dovrebbe succedere, il censimento è completo — la
//    foglia sparisce e la frase finisce nel log: **non resta testo nei dati**.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type Database from 'better-sqlite3';
import { logger } from '../../utils/logger.js';
import { convertiProsa } from '../../../shared/migraCondizioni.js';
import { normalizzaCondizioniSpillo, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { contestoConversione, contestoRiga } from '../../services/condizioni/contestoConversione.js';

const TABELLE = ['attivita', 'libro', 'film', 'negozio', 'articolo', 'spillo'] as const;

/** Le vecchie foglie: quelle che questa migrazione elimina dal vocabolario. */
type FogliaVecchia = { tipo: 'da-configurare'; nota: string } | { tipo: 'stato'; chiave: string; confronto: string; valore: number };
type Nodo = RequisitoSpillo | FogliaVecchia | { tipo: 'gruppo'; modo: 'tutte' | 'almeno-una'; condizioni: Nodo[] } | { tipo: 'non'; condizione: Nodo };

const CONTATORE_DA_STATO: Record<string, 'film-completati' | 'videogiochi-completati'> = { 'visione-film-dvd-completata': 'film-completati', 'videogioco-completato': 'videogiochi-completati' };

export const migration064: Migration = {
  id: 64,
  name: 'stati_al_posto_delle_frasi',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS attivita_svolta_partita (
        partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
        attivita_chiave TEXT NOT NULL,
        volte INTEGER NOT NULL CHECK (volte >= 0),
        updated_at TEXT NOT NULL,
        PRIMARY KEY (partita_id, attivita_chiave)
      );
      CREATE TABLE IF NOT EXISTS evento_storia_partita (
        partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
        evento_chiave TEXT NOT NULL,
        avvenuto INTEGER NOT NULL DEFAULT 1 CHECK (avvenuto IN (0, 1)),
        updated_at TEXT NOT NULL,
        PRIMARY KEY (partita_id, evento_chiave)
      );
      CREATE TABLE IF NOT EXISTS punti_negozio_partita (
        partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
        negozio_chiave TEXT NOT NULL,
        punti INTEGER NOT NULL CHECK (punti >= 0),
        updated_at TEXT NOT NULL,
        PRIMARY KEY (partita_id, negozio_chiave)
      );
      DROP TABLE IF EXISTS fatto_partita;
      DROP TABLE IF EXISTS fatto_gioco;
    `);
    const esito = convertiFoglie(db);
    if (esito.righe > 0) logger.info({ righe: esito.righe, foglie: esito.foglie, scartate: esito.scartate.length }, 'migrazione 064: condizioni in prosa convertite in stati');
    for (const s of esito.scartate) logger.warn({ frase: s }, 'migrazione 064: frase senza stato, tolta dai dati');
  },
};

/** Sostituisce ogni foglia vecchia dentro `condizioni_json` di tutte le tabelle che ce l'hanno. */
export function convertiFoglie(db: Database.Database): { righe: number; foglie: number; scartate: string[] } {
  const base = contestoConversione(db);
  const scartate: string[] = [];
  let righe = 0; let foglie = 0;
  for (const tabella of TABELLE) {
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(tabella)) continue;
    const colonne = (db.prepare(`PRAGMA table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('condizioni_json')) continue;
    const id = tabella === 'spillo' ? 'id' : 'chiave';
    const candidate = db.prepare(`SELECT * FROM ${tabella} WHERE condizioni_json LIKE '%"da-configurare"%' OR condizioni_json LIKE '%"tipo":"stato"%'`).all() as Array<Record<string, unknown>>;
    const scrivi = db.prepare(`UPDATE ${tabella} SET condizioni_json = ? WHERE ${id} = ?`);
    for (const r of candidate) {
      let albero: Nodo[];
      try { albero = JSON.parse(String(r.condizioni_json)) as Nodo[]; } catch { continue; }
      const ctx = contestoRiga(db, base, { tabella, chiave: String(r.chiave ?? r.id), negozio_chiave: r.negozio_chiave, confidente_chiave: r.confidente_chiave });
      let toccate = 0;
      const visita = (n: Nodo): RequisitoSpillo[] => {
        if (n.tipo === 'gruppo') {
          const condizioni = n.condizioni.flatMap(visita);
          return condizioni.length ? [{ tipo: 'gruppo', modo: n.modo, condizioni }] : [];
        }
        if (n.tipo === 'non') {
          const dentro = visita(n.condizione);
          return dentro.length === 1 ? [{ tipo: 'non', condizione: dentro[0] }] : dentro.length ? [{ tipo: 'non', condizione: { tipo: 'gruppo', modo: 'tutte', condizioni: dentro } }] : [];
        }
        if (n.tipo === 'da-configurare') {
          toccate++;
          const e = convertiProsa([n.nota], ctx);
          scartate.push(...e.scartate.map((s) => `${tabella}/${String(r.chiave ?? r.id)}: ${s}`));
          return e.condizioni;
        }
        if (n.tipo === 'stato') {
          toccate++;
          const cosa = CONTATORE_DA_STATO[n.chiave];
          if (!cosa) { scartate.push(`${tabella}/${String(r.chiave ?? r.id)}: stato «${n.chiave}»`); return []; }
          return [{ tipo: 'contatore', cosa, almeno: Math.max(1, Number(n.valore) || 1) }];
        }
        return [n as RequisitoSpillo];
      };
      const nuove = normalizzaCondizioniSpillo(albero.flatMap(visita));
      if (toccate === 0) continue;
      scrivi.run(JSON.stringify(nuove), r[id]);
      righe++; foglie += toccate;
    }
  }
  return { righe, foglie, scartate };
}
