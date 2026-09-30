// ============================================================
// 092 — la giornata della guida diventa una lista di voci con identità stabile (`voce_giornata`)
// ============================================================
//
// Richiesta dell'utente (2026-09-30): «le modifiche diventano nuovo canone a tutti gli effetti quindi non sono mai singola
// partita... ma tutte devono alterare i dati iniziali», con l'ordine esatto delle voci di ogni fascia, azioni della guida
// comprese. Finora le azioni stavano in `giorno_percorso.azioni_json` e si riconoscevano dalla posizione (data, indice):
// spunte e correzioni vivevano nel file delle partite, agganciate a quella posizione, e le voci dell'utente in tabelle a
// parte. Da qui ogni voce della giornata è una riga del file di gioco:
//   - `uid`: l'identità stabile, a cui si agganciano le spunte delle partite (`spunta_voce_partita`, «utente» 015). Per le
//     azioni della guida è l'impronta di (data, indice, testo): due file discesi dalla stessa guida danno lo stesso uid.
//   - `fascia` e `ordine`: la posizione esatta nella giornata (ordine 0, 1, 2… dentro la fascia).
//   - `genere`: 'azione' (si spunta) oppure 'evento' / 'scadenza' / 'promemoria' (si mostrano, non si spuntano).
//   - i campi dell'azione (testo, note, tipo, collegamento, rango atteso, effetti della spunta).
//   - `indice_guida`: la posizione che l'azione aveva in `azioni_json`, perché la «utente» 015 traduca spunte e
//     correzioni fatte per posizione. Le voci nate dopo non ce l'hanno.
// `giorno_percorso.azioni_json` resta com'era, come copia storica della guida d'origine: nessuno la legge più.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

interface AzioneSeed {
  fascia?: string; azione?: string; tipo?: string; note?: string | null; rangoAtteso?: number | null;
  riferimento?: { tipo: string; chiave: string } | null; riferimentoTesto?: string | null; produce?: unknown;
}

/** L'uid di un'azione della guida: impronta di data, posizione d'origine e testo (32 esadecimali). */
export function uidAzioneGuida(data: string, indice: number, azione: string): string {
  return createHash('sha256').update(`guida|${data}|${indice}|${azione}`).digest('hex').slice(0, 32);
}

export const migration092: Migration = {
  id: 92,
  name: 'giornata_canone',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS voce_giornata (
      uid                 TEXT PRIMARY KEY,
      data                TEXT NOT NULL,
      fascia              TEXT NOT NULL CHECK (fascia IN ('giorno','sera')),
      ordine              INTEGER NOT NULL,
      genere              TEXT NOT NULL DEFAULT 'azione' CHECK (genere IN ('azione','evento','scadenza','promemoria')),
      azione              TEXT NOT NULL,
      note                TEXT,
      tipo                TEXT NOT NULL DEFAULT 'altro',
      riferimento_tipo    TEXT,
      riferimento_chiave  TEXT,
      riferimento_testo   TEXT,
      rango_atteso        INTEGER,
      produce_json        TEXT NOT NULL DEFAULT '[]',
      indice_guida        INTEGER,
      created_at          TEXT NOT NULL,
      updated_at          TEXT NOT NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_voce_giornata_data ON voce_giornata(data, fascia, ordine)');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_voce_giornata_guida ON voce_giornata(data, indice_guida) WHERE indice_guida IS NOT NULL');
    const esistente = db.prepare('SELECT COUNT(*) AS n FROM voce_giornata').get() as { n: number };
    if (esistente.n > 0) return;
    const giorni = db.prepare('SELECT data, azioni_json FROM giorno_percorso ORDER BY ordine').all() as Array<{ data: string; azioni_json: string }>;
    const inserisci = db.prepare(`INSERT INTO voce_giornata (uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo, rango_atteso, produce_json, indice_guida, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'azione', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const adesso = new Date().toISOString();
    let voci = 0;
    const illeggibili: string[] = [];
    for (const g of giorni) {
      let azioni: AzioneSeed[];
      try { azioni = JSON.parse(g.azioni_json) as AzioneSeed[]; } catch { illeggibili.push(g.data); continue; }
      const ordine = { giorno: 0, sera: 0 };
      azioni.forEach((a, indice) => {
        const fascia = a.fascia === 'sera' ? 'sera' : 'giorno';
        const testo = String(a.azione ?? '');
        inserisci.run(uidAzioneGuida(g.data, indice, testo), g.data, fascia, ordine[fascia]++, testo, a.note ?? null, a.tipo ?? 'altro',
          a.riferimento?.tipo ?? null, a.riferimento?.chiave ?? null, a.riferimentoTesto ?? null, a.rangoAtteso ?? null,
          JSON.stringify(Array.isArray(a.produce) ? a.produce : []), indice, adesso, adesso);
        voci++;
      });
    }
    logger.info({ giorni: giorni.length, voci }, 'migrazione 092: la giornata della guida diventa voci con identità stabile');
    if (illeggibili.length) logger.warn({ giorni: illeggibili }, 'migrazione 092: azioni_json illeggibile, giorni senza voci');
  },
};
