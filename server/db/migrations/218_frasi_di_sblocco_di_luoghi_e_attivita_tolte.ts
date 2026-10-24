// ============================================================
// 218 — `luogo.sblocco` e `attivita.sblocco` tolte dal modello (L11 · R11-02/9, passo 2)
// ============================================================
//
// Le frasi di sblocco di 39 luoghi e 18 attività ripetono, o ripetevano, condizioni strutturate (analisi dati `lotti/L11/sblocchi-luoghi-attivita-2026-10-24.md`).
// La migrazione 216 ha portato nella struttura ciò che solo la frase diceva. Qui: (1) le quattro frasi che sono racconto del Confidente e non condizioni del luogo
// (Galleria di Kasumi, Chihaya, Cancello della Shujin, Corridoio del 2° piano) restano come nota del luogo, con il testo originale; (2) TUTTE le frasi (anche
// le tre con la data sbagliata: Ichigaya, Meiji, Planetario) vanno in `dati_guida.archivio-frasi-l11` (colonne `luogo.sblocco` e `attivita.sblocco`, chiave → frase);
// (3) le due colonne si tolgono; il registro `FONTI_TOLTE` riceve le voci. Lo sblocco mostrato dal DTO è ora generato dalle condizioni. Idempotente (ogni colonna si
// toglie solo se c'è), senza modifiche parziali: impronte delle altre colonne di `luogo` e `attivita` (salvo `note` dei quattro luoghi) e delle tabelle vicine.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { archiviaFrasi, archiviate, esisteTabella, haColonna, improntaTabella, righeConValore } from './pulizieL11.js';

const errore = (motivo: string): never => { throw new Error(`218: ${motivo}; nessuna modifica applicata.`); };
/** I luoghi la cui frase è il racconto del Confidente: resta come nota del luogo. */
const LUOGHI_RACCONTO = ['kichijoji/kichijoji-galleria-kasumi', 'shinjuku/chihaya-stand', 'shujin-academy/cancello-shujin', 'shujin-academy/corridoio-2-piano-shujin'] as const;
const INTATTE = ['articolo', 'negozio', 'quartiere', 'confidente_invito', 'confidente_disponibilita', 'voce_giornata', 'cestino'] as const;

export const migration218: Migration = {
  id: 218, name: 'frasi_di_sblocco_di_luoghi_e_attivita_tolte',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const daTogliere = (['luogo', 'attivita'] as const).filter((t) => esisteTabella(db, t) && haColonna(db, t, 'sblocco'));
    if (daTogliere.length === 0) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');

    const prima = new Map<string, string>();
    for (const t of daTogliere) prima.set(t, improntaTabella(db, t, t === 'luogo' ? ['sblocco', 'note'] : ['sblocco']));
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));

    const colonne: Record<string, ReturnType<typeof righeConValore>> = {};
    for (const t of daTogliere) colonne[`${t}.sblocco`] = righeConValore(db, t, 'sblocco');
    const attese = Object.fromEntries(Object.entries(colonne).map(([k, v]) => [k, Object.keys(v).length]));

    // 1. il racconto del Confidente resta come nota del luogo (testo originale)
    let aggiunte = 0;
    if (daTogliere.includes('luogo')) {
      for (const chiave of LUOGHI_RACCONTO) {
        const frase = colonne['luogo.sblocco']![chiave];
        if (typeof frase !== 'string') continue;
        const nota = db.prepare('SELECT note FROM main.luogo WHERE chiave = ?').pluck().get(chiave) as string | null | undefined;
        const aggiunta = `Sblocco (racconto del Confidente, dalla guida): ${frase}`;
        if ((nota ?? '').includes(aggiunta)) continue;
        db.prepare('UPDATE main.luogo SET note = ? WHERE chiave = ?').run(nota ? `${nota}\n${aggiunta}` : aggiunta, chiave);
        aggiunte++;
      }
    }

    archiviaFrasi(db, 'L11-B12 · 218', colonne, {});
    for (const t of daTogliere) db.exec(`ALTER TABLE main.${t} DROP COLUMN "sblocco"`);

    for (const [k, n] of Object.entries(attese)) if (archiviate(db, k) !== n) errore(`l'archivio di ${k} non ha ${n} righe`);
    for (const t of daTogliere) if (haColonna(db, t, 'sblocco')) errore(`la colonna ${t}.sblocco esiste ancora`);
    for (const t of daTogliere) if (improntaTabella(db, t, t === 'luogo' ? ['note'] : []) !== prima.get(t)) errore(`le altre colonne di ${t} sono cambiate`);
    for (const t of INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L11-B12-218', tolte: daTogliere.map((t) => `${t}.sblocco`), archiviate: attese, noteDelLuogo: aggiunte }, 'frasi di sblocco di luoghi e attività tolte dal modello');
  },
};
