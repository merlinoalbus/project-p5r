// ============================================================
// 100 — Nei Memento le voci sono Persona o Trama
// ============================================================
//
// Richiesta dell'utente (2026-10-11): «A seguire le richieste e poi gli elementi Trama... unico tipo visto che nei memento è
// tutto random quindi è impossibile segnare Stanze, porte, meccanismi forzieri o altro». Scelte dell'utente: le voci di oggi che
// non sono Persona diventano «tutte Trama»; «Straziato re dei desideri», segnata Persona ma senza maschera («-», «Non
// reclutabile»: un'Ombra che non si cattura), «Diventa Trama». La regola vale per ogni Persona dei Memento con la maschera «-»
// (una Persona aggiunta senza maschera resta Persona).
//   - Cambia solo il tipo: nome, testo, dettagli, area del dedalo e stati delle partite restano (lo stato vive in
//     `punto_partita` per chiave, e nei pin collegati, che restano collegati: Trama non è descrittiva).
//   - Nei Memento non ci sono più Enigmi: i passi di un Enigma convertito tornano voci della sua area, in fondo, ognuno col suo
//     stato (l'Enigma tiene il suo). Nei dati di oggi non ce n'erano (misurato sulla copia di prima della 100 e sul pacchetto),
//     ma un pacchetto importato più avanti passa di qui.
//   - Le voci dei Palazzi non si toccano.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

/** Le aree della guida (dedali) del dungeon dei Memento. */
const AREE_DEI_MEMENTO = "(SELECT a.chiave FROM dungeon_area a JOIN dungeon d ON d.chiave = a.dungeon_chiave WHERE d.tipo = 'mementos')";

export const migration100: Migration = {
  id: 100,
  name: 'trama_dei_memento',
  up(db) {
    // i passi degli Enigmi dei Memento escono dall'Enigma: in fondo alle voci della loro area del dedalo (o del dedalo, senza area)
    const passi = db.prepare(`SELECT chiave, area_chiave, area_dedalo_chiave FROM punto_interesse
      WHERE contenitore_chiave IS NOT NULL AND area_chiave IN ${AREE_DEI_MEMENTO} ORDER BY area_chiave, contenitore_chiave, ordine, chiave`).all() as Array<{ chiave: string; area_chiave: string; area_dedalo_chiave: string | null }>;
    const ultimo = db.prepare('SELECT COALESCE(MAX(ordine), -1) AS n FROM punto_interesse WHERE area_chiave = ? AND area_dedalo_chiave IS ? AND contenitore_chiave IS NULL');
    const sciogli = db.prepare('UPDATE punto_interesse SET contenitore_chiave = NULL, ordine = ? WHERE chiave = ?');
    for (const p of passi) sciogli.run((ultimo.get(p.area_chiave, p.area_dedalo_chiave) as { n: number }).n + 1, p.chiave);
    // tutte Trama, tranne le Persona: quelle con la maschera «-» della guida (non reclutabili) sono Ombre, e diventano Trama
    const r = db.prepare(`UPDATE punto_interesse SET tipo = 'trama'
      WHERE area_chiave IN ${AREE_DEI_MEMENTO} AND tipo <> 'trama'
        AND (tipo <> 'persona' OR TRIM(COALESCE(json_extract(dettagli_json, '$.maschera'), '')) = '-')`).run();
    logger.info({ voci: r.changes, passiSciolti: passi.length }, 'migrazione 100: le voci dei Memento sono Persona o Trama');
  },
};
