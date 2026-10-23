// ============================================================
// 148 — «Camera della vacuità» nella voce F4 del 3 agosto (R10-28d/4, errore 2 di G-028)
// ============================================================
//
// La migrazione 110 ha corretto la voce F4 (Palazzo di Futaba, 08-03) da «Camera del Rigetto e della Camera del Rimorso» a «Camera del Vuoto».
// Il nome della guida è «Camera della vacuità». Questa correzione sostituisce solo quel nome nel testo che la 110 ha scritto.
// Conservativa: scrive solo se la voce è ancora quella (uid fisso), è ancora «da rivedere» e il testo è ESATTAMENTE quello della 110; non tocca
// `testo_precedente_json` (il testo di prima della 110 resta quello originale), il segno «da rivedere», la spunta né altre voci. Il diario
// validato 04-01..06-01 non è coinvolto (la voce è del 3 agosto). Idempotente. Non tocca `partite.db`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const UID = 'c9efdb83a3eeb29a6ceea9a6f6cc2ea2';
const DATA = '08-03';
const TESTO_110 = 'Palazzo di Futaba: esplorazione della Camera del Vuoto, risoluzione di puzzle con codici binari e pannelli riflettenti, combattimenti contro nemici potenziati';
const TESTO_NUOVO = TESTO_110.replace('Camera del Vuoto', 'Camera della vacuità');

export const migration148: Migration = {
  id: 148,
  name: 'camera_della_vacuita',
  up(db) {
    if (!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'voce_giornata'").get()) return;
    const v = db.prepare('SELECT azione, da_rivedere FROM main.voce_giornata WHERE uid = ? AND data = ?').get(UID, DATA) as { azione: string; da_rivedere: number } | undefined;
    let esito: string;
    if (!v) esito = 'voce assente';
    else if (v.azione === TESTO_NUOVO) esito = 'gia-fatta';
    else if (v.da_rivedere !== 1 || v.azione !== TESTO_110) esito = 'saltata: la voce non è più quella scritta dalla 110';
    else {
      const r = db.prepare('UPDATE main.voce_giornata SET azione = ?, updated_at = ? WHERE uid = ? AND data = ? AND da_rivedere = 1 AND azione = ?')
        .run(TESTO_NUOVO, new Date().toISOString(), UID, DATA, TESTO_110);
      esito = r.changes === 1 ? 'applicata' : 'saltata: la voce è cambiata nel frattempo';
    }
    logger.info({ uid: UID, esito }, '[migration148] Camera della vacuità nella voce F4');
  },
};
