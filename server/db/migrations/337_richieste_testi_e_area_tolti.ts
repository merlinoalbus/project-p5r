// ============================================================
// Migrazione 337 — Richieste: tolti i testi di sblocco e di scadenza della guida e la copia del nome del dedalo (L8-09)
// ============================================================
//
// Voce di piano L8-09: nelle Richieste `disponibile_dal` e `scadenza` (il testo della guida che la conversione della 235 non aveva letto con
// certezza) sono vuote in tutte e 33 le righe della copia del 1° novembre, ma restavano lette (lo stato «da verificare») e modificabili; `area`
// ripete il nome del dedalo di `area_chiave` (33 righe su 33 uguali a `dungeon_area.nome`). Un dato, un punto di modifica: lo sblocco sono le
// condizioni (`condizioni_json`), la scadenza è la data (`scadenza_data`), il dedalo è `area_chiave` con il suo nome.
//
// COSA (convenzione delle migrazioni 194 e 218, `pulizieL11`): (1) si ARCHIVIANO in `dati_guida.archivio-frasi-l11` le righe con un testo di
// sblocco o di scadenza (chiave della Richiesta → testo) e le righe in cui `area` NON è il nome del dedalo collegato (la struttura nuova non la
// ripete); (2) si tolgono le tre colonne; (3) si controlla che le colonne rimaste di `richiesta` e le tabelle vicine siano identiche (impronta
// di ogni riga). Il registro `FONTI_TOLTE` riceve le voci (cestino e importazione). Idempotente (ogni colonna si toglie solo se c'è), senza
// modifiche parziali; scrive solo in `main`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { archiviaFrasi, archiviate, esisteTabella, haColonna, improntaTabella, righeConValore, type RigheArchiviate } from './pulizieL11.js';

const COLONNE = ['disponibile_dal', 'scadenza', 'area'] as const;
/** Le tabelle che questa migrazione non deve cambiare. */
const INTATTE = ['dungeon_area', 'area_dedalo', 'ricompensa_oggetto', 'voce_giornata', 'confidente_requisito', 'cestino'] as const;
const errore = (motivo: string): never => { throw new Error(`337: ${motivo}; nessuna modifica applicata.`); };

export const migration337: Migration = {
  id: 337,
  name: 'richieste_testi_e_area_tolti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'richiesta')) return;
    const presenti = COLONNE.filter((c) => haColonna(db, 'richiesta', c));
    if (presenti.length === 0) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');

    const prima = new Map<string, string>([['richiesta', improntaTabella(db, 'richiesta', [...COLONNE])]]);
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));
    const totale = db.prepare('SELECT COUNT(*) FROM main.richiesta').pluck().get() as number;

    // (1) l'archivio: i testi della guida con un valore, e i nomi d'area che non sono il nome del dedalo collegato
    const archivio: Record<string, RigheArchiviate> = {};
    const prove: Record<string, unknown> = {};
    for (const c of presenti.filter((x) => x !== 'area')) {
      archivio[`richiesta.${c}`] = righeConValore(db, 'richiesta', c);
      prove[`richiesta.${c}`] = { righe: totale, conTesto: Object.keys(archivio[`richiesta.${c}`]).length };
    }
    if (presenti.includes('area')) {
      const diverse = db.prepare(`SELECT r.chiave, r.area AS v FROM main.richiesta r LEFT JOIN main.dungeon_area d ON d.chiave = r.area_chiave
        WHERE r.area IS NOT NULL AND r.area <> '' AND r.area IS NOT d.nome ORDER BY r.rowid`).all() as Array<{ chiave: string; v: string }>;
      archivio['richiesta.area'] = Object.fromEntries(diverse.map((r) => [r.chiave, r.v]));
      const uguali = db.prepare(`SELECT COUNT(*) FROM main.richiesta r JOIN main.dungeon_area d ON d.chiave = r.area_chiave WHERE r.area = d.nome`).pluck().get() as number;
      prove['richiesta.area'] = { righe: totale, ugualiAlNomeDelDedalo: uguali, diverse: diverse.length };
    }
    const attese = Object.fromEntries(Object.entries(archivio).map(([k, v]) => [k, Object.keys(v).length]));
    archiviaFrasi(db, 'L8-09 · 337', archivio, prove);

    // (2) le colonne
    for (const c of presenti) db.exec(`ALTER TABLE main.richiesta DROP COLUMN "${c}"`);

    // (3) le verifiche: archivio completo, colonne tolte, il resto identico
    for (const [k, n] of Object.entries(attese)) if (archiviate(db, k) < n) errore(`l'archivio di ${k} non ha ${n} righe`);
    for (const c of COLONNE) if (haColonna(db, 'richiesta', c)) errore(`la colonna richiesta.${c} esiste ancora`);
    if (improntaTabella(db, 'richiesta') !== prima.get('richiesta')) errore('le colonne rimaste di richiesta sono cambiate');
    for (const t of INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 337, tolte: presenti, archiviate: attese, prove }, 'Richieste: testi della guida e copia del nome del dedalo tolti');
  },
};
