// ============================================================
// 227 — Posizioni di libri e film, sedi dei listini e legami delle note storiche si correggono e si ripristinano (L11 · R11-17/1, gruppo «Luoghi e note»)
// ============================================================
//
// `libro_posizione`, `film_posizione`, `negozio_luogo_extra` (con `negozio_sede_spillo`) e `nota_storica_legame` sono elenchi di righe figlie: dove si trova
// un libro, dove si guarda un film, in quali altri luoghi vende un negozio, a quali offerte e oggetti si riferisce una nota. Un oggetto che sta su più righe
// (e che può averne zero) non può portare la propria fotografia sulle righe: se si toglie l'ultima, la fotografia sparirebbe con lei e non si potrebbe
// più rimettere la guida. Anche le tabelle padre (`libro`, `film`, `negozio`, `nota_storica`) hanno già `seed_json` per altro (la fotografia del
// catalogo o della nota). Per questo ogni oggetto ha una tabella-fotografia propria, una riga per padre, con le tre colonne del registro dei ripristini
// (`origine` 'seed' | 'utente', `seed_json`, `updated_at`): `libro_posizione_foto`, `film_posizione_foto`, `negozio_sede_foto`, `nota_storica_legame_foto`.
//
// Nessun valore cambia: ogni riga di oggi è, per definizione, quella della guida (`origine = 'seed'`, `seed_json` vuoto) e la prima correzione prenderà la
// fotografia. La migrazione crea le tabelle e una riga per ogni padre (il servizio ne crea una per i padri nati dopo). Idempotente. Ogni anomalia lancia
// prima di cambiare qualcosa (il runner la esegue in una transazione, e la copia di avvio è la via di ritorno); a lavoro fatto riconfronta l'impronta di
// tutte le tabelle toccate o vicine. Solo `main`: non scrive in `utente`.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { conta, esisteTabella, improntaTabella } from './pulizieL11.js';

const FOTOGRAFIE = [
  { foto: 'libro_posizione_foto', padre: 'libro' },
  { foto: 'film_posizione_foto', padre: 'film' },
  { foto: 'negozio_sede_foto', padre: 'negozio' },
  { foto: 'nota_storica_legame_foto', padre: 'nota_storica' },
] as const;
const COLONNA_PADRE: Record<string, string> = {
  libro_posizione_foto: 'libro_chiave', film_posizione_foto: 'film_chiave', negozio_sede_foto: 'negozio_chiave', nota_storica_legame_foto: 'nota_chiave',
};
/** Le tabelle che questa migrazione non deve cambiare: gli elenchi figli, i padri, i dati vicini. */
const INTATTE = ['libro_posizione', 'film_posizione', 'negozio_luogo_extra', 'negozio_sede_spillo', 'nota_storica_legame', 'libro', 'film', 'negozio', 'nota_storica',
  'luogo', 'attivita', 'articolo', 'catalogo_oggetto', 'quartiere', 'spillo', 'mappa', 'diario', 'voce_giornata', 'dungeon', 'dati_guida', 'cestino'] as const;
const errore = (motivo: string): never => { throw new Error(`227: ${motivo}; nessuna modifica applicata.`); };

function creaFotografia(db: AppDatabase, foto: string, padre: string): void {
  const colonna = COLONNA_PADRE[foto]!;
  db.exec(`CREATE TABLE IF NOT EXISTS main.${foto} (
    ${colonna} TEXT PRIMARY KEY REFERENCES ${padre}(chiave) ON DELETE CASCADE,
    origine    TEXT NOT NULL DEFAULT 'seed' CHECK (origine IN ('seed', 'utente')),
    seed_json  TEXT,
    updated_at TEXT
  )`);
  db.exec(`INSERT OR IGNORE INTO main.${foto} (${colonna}) SELECT chiave FROM main.${padre}`);
}

export const migration227: Migration = {
  id: 227, name: 'luoghi_e_note_correggibili',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const presenti = FOTOGRAFIE.filter((f) => esisteTabella(db, f.padre));
    if (!esisteTabella(db, 'libro') || !esisteTabella(db, 'film') || !esisteTabella(db, 'negozio')) errore('mancano le tabelle libro, film o negozio');

    const prima = new Map<string, string>();
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));

    for (const f of presenti) creaFotografia(db, f.foto, f.padre);

    for (const f of presenti) {
      const colonna = COLONNA_PADRE[f.foto]!;
      if (conta(db, `SELECT COUNT(*) FROM main.${f.foto}`) !== conta(db, `SELECT COUNT(*) FROM main.${f.padre}`)) errore(`${f.foto}: non c'è una riga per ogni ${f.padre}`);
      if (conta(db, `SELECT COUNT(*) FROM main.${f.foto} WHERE origine <> 'seed' OR seed_json IS NOT NULL OR updated_at IS NOT NULL`) !== 0) errore(`${f.foto}: una riga risulta già corretta`);
      if (conta(db, `SELECT COUNT(*) FROM main.${f.foto} x LEFT JOIN main.${f.padre} p ON p.chiave = x.${colonna} WHERE p.chiave IS NULL`) !== 0) errore(`${f.foto}: una riga non ha il suo ${f.padre}`);
    }
    for (const [t, imp] of prima) if (improntaTabella(db, t) !== imp) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L11-R11-17-227', fotografie: presenti.map((f) => f.foto) }, 'posizioni, sedi e legami delle note correggibili (tabelle-fotografia per padre)');
  },
};
