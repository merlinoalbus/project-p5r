// ============================================================
// Migrazione 271 — la copia dell'effetto dell'equipaggiamento nelle traduzioni si toglie: vale l'oggetto del catalogo (Ondata 5, Lotto F)
// ============================================================
//
// Decisione 21 (a) dell'utente: un solo punto per il testo dell'effetto, «si tolgono le copie (articoli, traduzioni, descrizioni)». Censimento
// sulla copia alla 268: le 223 righe di `traduzione` dell'ambito `descrizioneOggetto` (chiave = descrizione inglese di `oggetto`, testo = la resa
// italiana) sono la sorgente da cui la migrazione 121 ha scritto `catalogo_oggetto.effetto` dell'equipaggiamento, e oggi ne sono copie identiche
// (223 su 223, nessuna corretta dall'utente). Ogni `oggetto` ha la sua scheda del catalogo, e la lettura preferisce già il catalogo
// (`compendioService`): correggere la traduzione non cambiava niente di visibile — un secondo punto che inganna. Dalla 271 la lettura usa solo
// il catalogo, e qui la copia si toglie.
//
// Conservativa: si toglie solo una riga della guida (`fonte = 'seed'`, senza la marca «creata dall'utente») il cui testo è uguale all'effetto
// della scheda del catalogo dell'equipaggiamento con quella descrizione; una riga corretta dall'utente o diversa resta e l'audit lo dice.
// Le righe tolte, intere, stanno nell'audit `dati_guida.audit-271-traduzioni` (si possono rimettere). Nessuna voce del Diario cambia.
// Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { improntaDiario, scriviAuditTesti } from './testiOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-271-traduzioni';
const AMBITO = 'descrizioneOggetto';
const errore = (motivo: string): never => { throw new Error(`271: ${motivo}; nessuna modifica applicata.`); };

interface RigaTraduzione { ambito: string; chiave: string; testo: string; extra_json: string | null; fonte: string; updated_at: string }

export const migration271: Migration = {
  id: 271,
  name: 'traduzioni_copiate_dell_equipaggiamento',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['traduzione', 'oggetto', 'catalogo_oggetto']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 271, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    const diarioPrima = improntaDiario(db);
    const righe = db.prepare('SELECT ambito, chiave, testo, extra_json, fonte, updated_at FROM main.traduzione WHERE ambito = ? ORDER BY chiave').all(AMBITO) as RigaTraduzione[];
    // l'effetto della scheda del catalogo dell'equipaggiamento con quella descrizione (una descrizione = un oggetto: 223 distinte su 223)
    const effettoDi = db.prepare(`SELECT c.effetto FROM main.oggetto o JOIN main.catalogo_oggetto c ON c.fonte_tipo = 'equipaggiamento' AND c.fonte_chiave = CAST(o.id AS TEXT)
      WHERE o.descrizione = ?`).pluck();
    const togli = db.prepare("DELETE FROM main.traduzione WHERE ambito = ? AND chiave = ? AND testo = ? AND fonte = 'seed'");
    const tolte: RigaTraduzione[] = [];
    const rimaste: Array<{ chiave: string; motivo: string }> = [];
    for (const r of righe) {
      if (r.fonte !== 'seed' || r.extra_json !== null) { rimaste.push({ chiave: r.chiave, motivo: 'riga corretta o creata dall’utente' }); continue; }
      const effetti = effettoDi.all(r.chiave) as string[];
      if (!effetti.length) { rimaste.push({ chiave: r.chiave, motivo: 'nessuna scheda del catalogo per questa descrizione' }); continue; }
      if (!effetti.every((e) => e === r.testo)) { rimaste.push({ chiave: r.chiave, motivo: 'testo diverso dall’effetto della scheda del catalogo' }); continue; }
      if (togli.run(AMBITO, r.chiave, r.testo).changes !== 1) errore(`la traduzione ${r.chiave} non si toglie`);
      tolte.push(r);
    }
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const conteggi = { righe: righe.length, tolte: tolte.length, rimaste: rimaste.length };
    if (tolte.length) invalidaCacheDiGioco();
    scriviAuditTesti(db, AUDIT, 271, { ambito: AMBITO, conteggi, tolte, rimaste });
    logger.info({ migrazione: 271, ...conteggi }, 'Traduzioni: tolta la copia dell’effetto dell’equipaggiamento (vale il catalogo)');
  },
};
