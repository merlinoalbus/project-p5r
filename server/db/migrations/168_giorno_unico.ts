// ============================================================
// 168 — un solo modello del giorno (R9-15, G-016a)
// ============================================================
//
// Il giorno di gioco viveva in due tabelle da 346 righe con le stesse date: `giorno_calendario` (meteo in due fasce, tempo libero, settimana) e
// `giorno_percorso` (trama, fase, vincoli, copertura). Nasce `giorno`, la fonte unica, con le due fonti fuse riga per riga (nessuna data in una
// sola):
//   meteo_giorno / meteo_sera  = il meteo del calendario spezzato nelle due fasce («Sereno/Pioggia» = giorno sereno, sera pioggia; un solo
//                                valore vale per entrambe), senza le parentesi, che diventano `nota_meteo` («notte torrida», «ondata di gelo»);
//   tempo_libero_json          = {giorno, sera} del calendario (NULL dove non è documentato);
//   settimana                  = il numero della «Soluzione per settimana»;
//   trama, fase, vincoli_json, avvisi_json, fonte, coperto = dal percorso.
// Il 24 maggio resta «Nuvoloso» con la nota «possibile pioggia» e `meteo_da_verificare = 1` (G-016a: unica divergenza vera fra le due fonti).
// Le due tabelle di prima NON si toccano: i lettori passano a `giorno` col blocco dei servizi del calendario (F). Il giorno della settimana
// non si salva: si calcola dalla data (R9-16). `giorno_percorso.azioni_json`, copia storica, non si porta. Idempotente: si ricopia solo se `giorno`
// è vuota; una riga già presente non si riscrive.
// ============================================================

import type { Migration } from '../migrationRunner.js';

/** Il meteo di una fascia: «Sereno/Pioggia (nota)» → { giorno: 'Sereno', sera: 'Pioggia', nota: 'nota' }. */
export function meteoInDueFasce(raw: string | null): { giorno: string | null; sera: string | null; nota: string | null } {
  if (raw === null || raw.trim() === '') return { giorno: null, sera: null, nota: null };
  const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(raw.trim());
  const base = (m ? m[1]! : raw).trim();
  const nota = m ? m[2]!.trim() : null;
  const parti = base.split('/').map((p) => p.trim()).filter((p) => p !== '');
  if (parti.length === 0) return { giorno: null, sera: null, nota };
  return { giorno: parti[0]!, sera: parti[1] ?? parti[0]!, nota };
}

export const migration168: Migration = {
  id: 168, name: 'giorno_unico',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS main.giorno (
      data                TEXT PRIMARY KEY,
      ordine              INTEGER NOT NULL,
      meteo_giorno        TEXT,
      meteo_sera          TEXT,
      nota_meteo          TEXT,
      meteo_da_verificare INTEGER NOT NULL DEFAULT 0 CHECK (meteo_da_verificare IN (0, 1)),
      tempo_libero_json   TEXT,
      settimana           INTEGER REFERENCES settimana_guida(numero),
      fase                TEXT NOT NULL DEFAULT '',
      trama               TEXT NOT NULL DEFAULT '',
      vincoli_json        TEXT NOT NULL DEFAULT '[]',
      avvisi_json         TEXT NOT NULL DEFAULT '[]',
      fonte               TEXT NOT NULL DEFAULT '',
      coperto             INTEGER NOT NULL DEFAULT 1 CHECK (coperto IN (0, 1)),
      origine             TEXT NOT NULL DEFAULT 'seed' CHECK (origine IN ('seed', 'utente')),
      seed_json           TEXT,
      updated_at          TEXT NOT NULL
    )`);
    const righe = db.prepare(`SELECT c.data AS data, c.ordine AS ordine, c.meteo AS meteo, c.tempo_libero_json AS tempo_libero_json, c.settimana AS settimana,
        p.fase AS fase, p.trama AS trama, p.vincoli_json AS vincoli_json, p.avvisi_json AS avvisi_json, p.fonte AS fonte, p.coperto AS coperto
      FROM main.giorno_calendario c JOIN main.giorno_percorso p ON p.data = c.data ORDER BY c.ordine`).all() as Array<{
      data: string; ordine: number; meteo: string | null; tempo_libero_json: string | null; settimana: number | null;
      fase: string; trama: string; vincoli_json: string; avvisi_json: string; fonte: string; coperto: number }>;
    const inserisci = db.prepare(`INSERT OR IGNORE INTO main.giorno (data, ordine, meteo_giorno, meteo_sera, nota_meteo, meteo_da_verificare, tempo_libero_json, settimana,
      fase, trama, vincoli_json, avvisi_json, fonte, coperto, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`);
    for (const r of righe) {
      const m = meteoInDueFasce(r.meteo);
      const maggio24 = r.data === '05-24';
      inserisci.run(r.data, r.ordine, m.giorno, m.sera, maggio24 ? 'possibile pioggia' : m.nota, maggio24 ? 1 : 0, r.tempo_libero_json, r.settimana,
        r.fase, r.trama, r.vincoli_json, r.avvisi_json, r.fonte, r.coperto);
    }
  },
};
