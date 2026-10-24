// ============================================================
// 193 — `luogo.quando` tolto dal modello: l'orario è quello ricavato dai dati (L11 · R11-02/9 e R11-02b/5, decisione dell'utente del 24/10)
// ============================================================
//
// L'unico residuo delle frasi di orari (la 184 aveva tolto `luogo.giorni`, `luogo.giorni_json`, `negozio.orari`): `luogo.quando` («giorno», «sera»,
// «entrambe»), una copia degli orari del luogo (`orari_json`) che 14 luoghi su 109 non ripetevano. Decisione dell'utente: il visore mostra l'orario
// ricavato dai dati anche per quei 14 luoghi. Si archiviano TUTTE le righe con un valore in `dati_guida.archivio-frasi-l11` (colonna `luogo.quando`,
// chiave del luogo → valore; nel registro `prove` le righe che divergono dagli orari) e si toglie la colonna. Il registro `FONTI_TOLTE` riceve la voce.
// Idempotente (la colonna si toglie solo se c'è), senza modifiche parziali: le impronte delle altre colonne di `luogo` e delle tabelle vicine si
// controllano dopo. Scrive solo in `main`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { archiviaFrasi, archiviate, esisteTabella, haColonna, improntaTabella, righeConValore } from './pulizieL11.js';

/** Le tabelle che questa migrazione non deve cambiare. */
const INTATTE = ['negozio', 'articolo', 'quartiere', 'attivita', 'spillo', 'area', 'cestino', 'voce_giornata', 'confidente_disponibilita'] as const;
const errore = (motivo: string): never => { throw new Error(`193: ${motivo}; nessuna modifica applicata.`); };

/** La fascia che gli orari del luogo danno nello stesso vocabolario di `quando` (una sola fascia, altrimenti «entrambe»; nessun orario: «entrambe»). */
function quandoDagliOrari(orariJson: string | null): string {
  if (!orariJson) return 'entrambe';
  try {
    const fasce = (JSON.parse(orariJson) as { fasce?: string[] }).fasce ?? [];
    return fasce.length === 1 ? fasce[0]! : 'entrambe';
  } catch { return 'entrambe'; }
}

export const migration193: Migration = {
  id: 193, name: 'luogo_quando_tolto',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'luogo') || !haColonna(db, 'luogo', 'quando')) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');

    const prima = new Map<string, string>([['luogo', improntaTabella(db, 'luogo', ['quando'])]]);
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));

    const quando = righeConValore(db, 'luogo', 'quando');
    const conOrari = haColonna(db, 'luogo', 'orari_json');
    const divergenti: Record<string, { quando: string; dagliOrari: string }> = {};
    if (conOrari) {
      for (const r of db.prepare('SELECT chiave, quando, orari_json FROM main.luogo WHERE quando IS NOT NULL AND quando <> \'\' ORDER BY rowid').all() as Array<{ chiave: string; quando: string; orari_json: string | null }>) {
        const dagliOrari = quandoDagliOrari(r.orari_json);
        if (dagliOrari !== r.quando) divergenti[r.chiave] = { quando: r.quando, dagliOrari };
      }
    }
    const attese = Object.keys(quando).length;
    archiviaFrasi(db, 'L11-B12 · 193', { 'luogo.quando': quando }, { 'luogo.quando': { righe: attese, divergentiDagliOrari: divergenti } });

    db.exec('ALTER TABLE main.luogo DROP COLUMN "quando"');

    if (archiviate(db, 'luogo.quando') !== attese) errore(`l'archivio di luogo.quando non ha ${attese} righe`);
    if (haColonna(db, 'luogo', 'quando')) errore('la colonna luogo.quando esiste ancora');
    if (improntaTabella(db, 'luogo') !== prima.get('luogo')) errore('le colonne rimaste di luogo sono cambiate');
    for (const t of INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L11-B12-193', tolta: 'luogo.quando', archiviate: attese, divergenti: Object.keys(divergenti).length }, 'luogo.quando tolto dal modello');
  },
};
