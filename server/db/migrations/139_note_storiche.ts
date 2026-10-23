// ============================================================
// 139 — le note storiche della fonte nel DB (F6, decisione dell'utente)
// ============================================================
//
// La nota sulla discordanza della guida per Homunculus (G-034: 120.000 ¥ nella pagina Oggetti, 5.000 ¥ nel listino Royal di Tanaka)
// era un testo fisso nel codice (`shared/tanakaNotaStorica.ts`), legato a chiavi scritte a mano. Diventa un dato: una riga di
// `nota_storica` (testo e fonte modificabili dall'app, con la copia della guida in `seed_json` per «Ripristina»), e i suoi legami in
// `nota_storica_legame` con le righe che la mostrano. I legami sono le stesse due righe di prima, con gli stessi controlli:
//   - l'offerta `tanaka-affari-loschi/homunculus` del negozio `tanaka-affari-loschi` (negozi, catalogo, confronto Tanaka);
//   - l'oggetto `consumabile/homunculus` del catalogo con fonte `guida` `consumabili/Homunculus`.
// Una riga che non c'è o non ha quella fonte non riceve il legame (come prima non riceveva la nota). Nessun prezzo, acquisto o progresso
// cambia. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

/** Il testo e la fonte di oggi (identici a `NOTA_STORICA_HOMUNCULUS`): sono anche il valore della guida per «Ripristina». */
const CHIAVE = 'homunculus-prezzi-fonte';
const FONTE = 'G-034 punto 2; L7 R7-13b e dati §11.1, revisione43ad8889';
const TESTO = 'La guida si contraddice: 120.000 ¥ nella pagina Oggetti, 5.000 ¥ nel listino Royal di Tanaka. Il dato di riferimento per Persona 5 Royal è 5.000 ¥, dal listino confermato da G-034. È una nota sulla fonte: non indica il prezzo corrente dell’offerta né quanto è stato pagato e non applica modifiche al listino.';

export const migration139: Migration = {
  id: 139,
  name: 'note_storiche',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS main.nota_storica (
      chiave     TEXT PRIMARY KEY,
      testo      TEXT NOT NULL,
      fonte      TEXT NOT NULL,
      versione   INTEGER NOT NULL DEFAULT 1,
      seed_json  TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS main.nota_storica_legame (
      nota_chiave TEXT NOT NULL REFERENCES nota_storica(chiave) ON DELETE CASCADE,
      tipo        TEXT NOT NULL CHECK (tipo IN ('articolo', 'catalogo')),
      chiave      TEXT NOT NULL,
      PRIMARY KEY (nota_chiave, tipo, chiave)
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS main.nota_storica_legame_riga ON nota_storica_legame (tipo, chiave)');
    const adesso = new Date().toISOString();
    const nota = db.prepare('INSERT OR IGNORE INTO main.nota_storica (chiave, testo, fonte, versione, seed_json, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
      .run(CHIAVE, TESTO, FONTE, JSON.stringify({ versione: 1, testo: TESTO, fonte: FONTE }), adesso).changes;
    const tabella = (n: string) => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(n);
    const lega = db.prepare('INSERT OR IGNORE INTO main.nota_storica_legame (nota_chiave, tipo, chiave) VALUES (?, ?, ?)');
    let legami = 0;
    if (tabella('articolo') && db.prepare("SELECT 1 FROM main.articolo WHERE chiave = 'tanaka-affari-loschi/homunculus' AND negozio_chiave = 'tanaka-affari-loschi'").get()) {
      legami += lega.run(CHIAVE, 'articolo', 'tanaka-affari-loschi/homunculus').changes;
    }
    if (tabella('catalogo_oggetto') && db.prepare("SELECT 1 FROM main.catalogo_oggetto WHERE chiave = 'consumabile/homunculus' AND fonte_tipo = 'guida' AND fonte_chiave = 'consumabili/Homunculus'").get()) {
      legami += lega.run(CHIAVE, 'catalogo', 'consumabile/homunculus').changes;
    }
    logger.info({ nota, legami }, '[migration139] note storiche della fonte nel DB');
  },
};
