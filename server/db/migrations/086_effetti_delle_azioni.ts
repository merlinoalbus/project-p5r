// ============================================================
// 086 — le azioni della guida dichiarano che cosa producono; i lavori danno i punti a ogni turno
// ============================================================
//
// La spunta di un'azione della guida leggeva i punti dal testo delle note («Gentilezza +3»): un
// libro collegato si dava per finito anche solo prendendolo in prestito, «restituire Zorro e
// prendere la Ballerina» finiva la Ballerina, «Sbloccare il lavoro» dava la Dote del turno (difetti
// segnalati dall'utente, 2026-09-30). Ogni azione riceve ora `produce` (`shared/effettiAzione.ts`),
// calcolato una volta dalle note con le regole di `conversioneEffettiAzione`; le azioni che lo
// hanno già (un pacchetto nuovo, una conversione fatta) restano come sono.
//
// I quattro lavori ricevono le Doti di ogni turno come effetti dichiarati (`attivita.effetti_json`,
// la voce del primo turno e quella «anche alle volte successive»), dove nessuno ne ha già scritti:
// il turno registrato dalla spunta o dal contatore dà quei punti, da una parte sola.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { contestoConversione, DOTI_DEI_LAVORI, effettiDellAzione, type AzioneDaConvertire } from '../conversioneEffettiAzione.js';

export const migration086: Migration = {
  id: 86,
  name: 'effetti_delle_azioni',
  up(db) {
    const ctx = contestoConversione(db);
    const scrivi = db.prepare('UPDATE giorno_percorso SET azioni_json = ? WHERE data = ?');
    let convertite = 0;
    let conEffetti = 0;
    for (const g of db.prepare('SELECT data, azioni_json FROM giorno_percorso').all() as Array<{ data: string; azioni_json: string }>) {
      const azioni = JSON.parse(g.azioni_json) as Array<AzioneDaConvertire & { produce?: unknown }>;
      let cambiato = false;
      azioni.forEach((a, indice) => {
        if (a.produce !== undefined) return;
        a.produce = effettiDellAzione(a, { data: g.data, indice }, ctx);
        convertite++;
        if ((a.produce as unknown[]).length) conEffetti++;
        cambiato = true;
      });
      if (cambiato) scrivi.run(JSON.stringify(azioni), g.data);
    }
    const lavoro = db.prepare("UPDATE attivita SET effetti_json = ? WHERE chiave = ? AND tipo = 'lavoro' AND (effetti_json IS NULL OR effetti_json = '[]' OR effetti_json = '')");
    let lavori = 0;
    for (const [chiave, doti] of Object.entries(DOTI_DEI_LAVORI)) {
      const voci = doti.flatMap((d) => [{ effetto: { famiglia: 'dote', dote: d.dote, note: d.note } }, { effetto: { famiglia: 'dote', dote: d.dote, note: d.note }, ripetuto: true }]);
      lavori += lavoro.run(JSON.stringify(voci), chiave).changes;
    }
    logger.info({ convertite, conEffetti, lavori }, 'migrazione 086: effetti delle azioni della guida e Doti dei turni di lavoro');
  },
};
