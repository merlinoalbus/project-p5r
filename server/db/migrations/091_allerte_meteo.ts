// ============================================================
// 091 — le allerte meteo del catalogo diventano giorni e fasce (`allerta_meteo`)
// ============================================================
//
// Il gioco ha, oltre ai quattro meteo di base, sei allerte a date fisse (pioggia torrenziale, polline, ondata di calore,
// notte torrida, stagione influenzale, ondata di gelo). Il catalogo (Trofei e finali → Meteo, `dati_guida.completamento`)
// le scrive in prosa: «Date (solo di giorno): 26/7, 28/7…», «22/8-26/8», «29/7 (sera)». Scelta dell'utente (2026-09-30):
// il meteo di base si segna a mano, le allerte le mostra l'app da sola. Qui la prosa si legge una volta sola
// (`leggiDateAllerta`) e ogni allerta diventa una riga per giorno e fascia, con nome ed effetti.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { chiaveAllerta, leggiDateAllerta } from '../../../shared/meteoPartita.js';
import { logger } from '../../utils/logger.js';

interface VoceMeteo { condizione: string; effetti: string[] }

export const migration091: Migration = {
  id: 91,
  name: 'allerte_meteo',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS allerta_meteo (
      data          TEXT NOT NULL,
      fascia        TEXT NOT NULL CHECK (fascia IN ('giorno','sera')),
      chiave        TEXT NOT NULL,
      nome          TEXT NOT NULL,
      effetti_json  TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (data, fascia, chiave)
    )`);
    const riga = db.prepare("SELECT json FROM dati_guida WHERE chiave = 'completamento'").get() as { json: string } | undefined;
    if (!riga) return;
    const meteo = ((JSON.parse(riga.json) as { meteo?: VoceMeteo[] }).meteo ?? []).filter((m) => /^Allerta:/i.test(m.condizione));
    const ordine = new Map((db.prepare('SELECT data, ordine FROM giorno_calendario').all() as Array<{ data: string; ordine: number }>).map((r) => [r.data, r.ordine]));
    const perOrdine = new Map([...ordine].map(([d, o]) => [o, d]));
    const inserisci = db.prepare('INSERT OR IGNORE INTO allerta_meteo (data, fascia, chiave, nome, effetti_json) VALUES (?, ?, ?, ?, ?)');
    for (const m of meteo) {
      const nome = m.condizione.replace(/^Allerta:\s*/i, '').replace(/\s*\((?:di giorno|di sera)\)\s*$/i, '').trim();
      const chiave = chiaveAllerta(nome);
      const effetti = JSON.stringify(m.effetti.filter((e) => !/^\s*Date\b/i.test(e)));
      for (const { dal, al, fasce } of leggiDateAllerta(m.effetti)) {
        const da = ordine.get(dal); const a = ordine.get(al);
        if (da === undefined || a === undefined) { logger.warn({ allerta: nome, dal, al }, 'migrazione 091: data di allerta fuori dal calendario di gioco'); continue; }
        for (let o = da; o <= a; o++) {
          const data = perOrdine.get(o);
          if (data) for (const f of fasce) inserisci.run(data, f, chiave, nome, effetti);
        }
      }
    }
  },
};
