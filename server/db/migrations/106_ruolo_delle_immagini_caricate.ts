// ============================================================
// 106 — le mappe con un'immagine caricata dall'app e senza ruolo diventano piante (o illustrazioni)
// ============================================================
//
// Segnalazione dell'utente (2026-10-18): «ho provato a caricare una mappa ma non me la carica come planimetria... solo come
// area» — «Aggiungi» nell'elenco del Palazzo, poi «Modifica luogo» → Mappa e l'immagine caricata. Una mappa nata dall'app ha il
// ruolo dell'immagine «nessuna» (043) e caricarne l'immagine non lo cambiava: il visore non la apriva (`haPlanimetria`) e la
// scheda mostrava solo il collegamento al luogo. Da ora il caricamento le dà il ruolo (`RUOLO_DOPO_CARICAMENTO`); qui le mappe
// già caricate così: un'immagine dell'istanza e ruolo «nessuna». Uno stemma o un ruolo già dato non si toccano.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

export const migration106: Migration = {
  id: 106,
  name: 'ruolo_delle_immagini_caricate',
  up(db) {
    // la stessa regola di `RUOLO_DOPO_CARICAMENTO` (mappeService), scritta qui: una migrazione non segue il codice che cambia
    const n = db.prepare(`UPDATE mappa SET ruolo_immagine = CASE WHEN tipo IN ('citta', 'quartiere') THEN 'illustrazione-editoriale' ELSE 'planimetria-nativa' END WHERE ruolo_immagine = 'nessuna' AND immagine_chiave IS NOT NULL`).run().changes;
    logger.info({ mappe: n }, 'migrazione 106: ruolo dell’immagine alle mappe caricate dall’app');
  },
};
