// ============================================================
// 203 — `attivita.altri_effetti`, `regole`, `premi`, `paga` tolte dal modello (L9 · R9-14/1, passo 2)
// ============================================================
//
// Le tre colonne di prosa (`altri_effetti`, `regole`, `premi`) sono già dentro `attivita.dettagli` per intero (24, 15 e 14 attività) e `paga` (4 righe,
// «3.500 yen a turno (fino a 7.400…)») ripete `paga_yen` e `paga_massima`. Nessun lettore vivo le usa più (il DTO, gli schemi e l'editor non le portano
// più). Si archiviano TUTTE le righe con un valore in `dati_guida.archivio-frasi-l11` (colonne `attivita.<nome>`, chiave dell'attività → testo) e si
// tolgono le colonne; il registro `FONTI_TOLTE` riceve le voci. Idempotente (ogni colonna si toglie solo se c'è), senza modifiche parziali: impronte delle
// altre colonne di `attivita` e delle tabelle vicine. Scrive solo in `main`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { archiviaFrasi, archiviate, esisteTabella, haColonna, improntaTabella, righeConValore, type RigheArchiviate } from './pulizieL11.js';

const COLONNE = ['altri_effetti', 'regole', 'premi', 'paga'] as const;
const INTATTE = ['luogo', 'negozio', 'articolo', 'quartiere', 'libro', 'film', 'catalogo_oggetto', 'cestino', 'voce_giornata'] as const;
const errore = (motivo: string): never => { throw new Error(`203: ${motivo}; nessuna modifica applicata.`); };

export const migration203: Migration = {
  id: 203, name: 'attivita_colonne_di_prosa_tolte',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'attivita')) return;
    const daTogliere = COLONNE.filter((c) => haColonna(db, 'attivita', c));
    if (daTogliere.length === 0) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');

    const prima = new Map<string, string>([['attivita', improntaTabella(db, 'attivita', daTogliere)]]);
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));

    const colonne: Record<string, RigheArchiviate> = {};
    for (const c of daTogliere) colonne[`attivita.${c}`] = righeConValore(db, 'attivita', c);
    const attese = Object.fromEntries(Object.entries(colonne).map(([k, v]) => [k, Object.keys(v).length]));
    archiviaFrasi(db, 'L9-R9-14 · 203', colonne, {});

    for (const c of daTogliere) db.exec(`ALTER TABLE main.attivita DROP COLUMN "${c}"`);

    for (const [k, n] of Object.entries(attese)) if (archiviate(db, k) !== n) errore(`l'archivio di ${k} non ha ${n} righe`);
    for (const c of daTogliere) if (haColonna(db, 'attivita', c)) errore(`la colonna attivita.${c} esiste ancora`);
    if (improntaTabella(db, 'attivita') !== prima.get('attivita')) errore('le colonne rimaste di attivita sono cambiate');
    for (const t of INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L9-R9-14-203', tolte: daTogliere, archiviate: attese }, 'colonne di prosa delle attività tolte dal modello');
  },
};
