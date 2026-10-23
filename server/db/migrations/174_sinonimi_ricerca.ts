// ============================================================
// 174 — i sinonimi della ricerca globale (L11 B3, R11-07/1, G-038 B)
// ============================================================
//
// Nasce il blocco `dati_guida.sinonimi-ricerca`: i nomi con cui un oggetto si cerca e che non sono nel nome mostrato né nell'originale.
//   - i nomi in codice dei Confidenti che la guida usa nel testo (Skull, Panther, Mona, Fox, Queen, Oracle, Noir, Crow); per Kasumi il nome
//     vero Sumire e il nome in codice Violet (la guida italiana la intitola «Kasumi (Fede)»: il nome mostrato resta quello);
//   - «Palazzo di Sae» per il Palazzo di Niijima, «Palazzo sconosciuto» per quello di Maruki, «Mementos» per il Memento;
//   - «Thieves Den» e «Covo» per l'Area Covo dei Ladri;
//   - le tre abbreviazioni del menu attestate dalla guida (G-024): Portaf. → Portafortuna, Amul. → Amuleto, Spec. → Specchio.
// Non servono righe per le Persona (il nome originale è già fra i nomi altri e le grafie della guida sono nella `traduzione`), per i quartieri
// (Kanda e Jinbocho si trovano per parola) né per «Joker» e «Stanza di Velluto» (nessun oggetto da trovare: restano in attesa).
// `INSERT OR IGNORE`: idempotente, e una modifica futura dell'utente al blocco non si riscrive. Non tocca altro.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const BLOCCO = {
  versione: 1,
  fonte: 'G-038 (registro dell’Esperto della guida, 2026-10-20); G-024 per le abbreviazioni',
  sinonimi: [
    { tipo: 'confidente', chiave: 'ryuji', nomi: ['Skull'] },
    { tipo: 'confidente', chiave: 'ann', nomi: ['Panther'] },
    { tipo: 'confidente', chiave: 'morgana', nomi: ['Mona'] },
    { tipo: 'confidente', chiave: 'yusuke', nomi: ['Fox'] },
    { tipo: 'confidente', chiave: 'makoto', nomi: ['Queen'] },
    { tipo: 'confidente', chiave: 'futaba', nomi: ['Oracle'] },
    { tipo: 'confidente', chiave: 'haru', nomi: ['Noir'] },
    { tipo: 'confidente', chiave: 'akechi', nomi: ['Crow'] },
    { tipo: 'confidente', chiave: 'kasumi', nomi: ['Sumire', 'Violet'] },
    { tipo: 'palazzo', chiave: 'niijima', nomi: ['Palazzo di Sae'] },
    { tipo: 'palazzo', chiave: 'maruki', nomi: ['Palazzo sconosciuto'] },
    { tipo: 'palazzo', chiave: 'mementos', nomi: ['Mementos'] },
    { tipo: 'area', chiave: 'citta/yongen-jaya/covo-dei-ladri', nomi: ['Thieves Den', 'Covo'] },
  ],
  abbreviazioni: [
    { abbreviazione: 'Portaf.', esteso: 'Portafortuna' },
    { abbreviazione: 'Amul.', esteso: 'Amuleto' },
    { abbreviazione: 'Spec.', esteso: 'Specchio' },
  ],
};

export const migration174: Migration = {
  id: 174, name: 'sinonimi_ricerca',
  up(db) {
    if (!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'dati_guida'").get()) return;
    db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run('sinonimi-ricerca', JSON.stringify(BLOCCO));
  },
};
