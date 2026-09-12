// ============================================================
// 068 — i residui «da configurare» rimasti dopo la 064
// ============================================================
//
// La 064 convertiva le foglie «da-configurare» in stati della partita, ma sull'istanza locale
// dell'utente ventuno libri, ventuno film e tredici attività ne conservavano ancora (il seed non
// era stato ricaricato dopo la migrazione, e le righe restavano com'erano). `leggiCondizioniSalvate`
// le scartava: quelle righe risultavano «sempre disponibili» senza che nessuno lo avesse deciso.
// Qui la stessa conversione (`convertiFoglie`, idempotente) ripassa ogni tabella con
// `condizioni_json`; ciò che non si converte viene elencato nel log, non nascosto.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { convertiFoglie } from './064_stati_al_posto_delle_frasi.js';

export const migration068: Migration = {
  id: 68,
  name: 'residui_da_configurare',
  up(db) {
    const esito = convertiFoglie(db);
    logger.info({ righe: esito.righe, foglie: esito.foglie, scartate: esito.scartate.length }, 'migrazione 068: residui «da configurare» convertiti');
    if (esito.scartate.length) logger.warn({ scartate: esito.scartate }, 'migrazione 068: frasi non convertibili (restano senza condizione)');
  },
};
