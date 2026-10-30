// ============================================================
// Migrazione 305 — i Dedali dei Memento si aprono dai Palazzi affrontati, con la condizione scritta una volta sul Dedalo (richiesta dell'utente)
// ============================================================
//
// Richiesta dell'utente del 2026-10-30 (screenshot della finestra «Aperture durante la visita»): «questa schermata ad ogni Memento del Diario
// non va bene... le aperture dovrebbero dipendere dai palazzi affrontati... cerca nella guida ufficiale... in ogni caso è irrilevante il dedalo
// aperto ai fini della guida...». Fino a qui i nove fatti «Dedalo di … aperto» (`shared/condizioniSpillo.ts`, letti da sette dedali nelle
// offerte di Jose) si dichiaravano a mano a ogni visita ai Memento del Diario. Ora si calcolano: ogni Dedalo (`dungeon_area` dei Memento) porta
// la sua condizione d'apertura (`dungeon_area.condizioni_json`, colonna nuova, nullable), e il fatto «aperto» vale quanto quella condizione
// sullo stato della partita (`condizioni/valutatore.ts`, caso `evento`).
//
// Condizioni, dalla guida italiana (sezione «Come sbloccare il Dedalo di …» di ciascuna pagina):
//   Qimranut     «Aver completato il Palazzo di Kamoshida» e «Il 7 MAGGIO … Morgana ci porterà nel Sottopasso» → Palazzo di Kamoshida + dal 7 maggio
//   Aiyatsbus    «aver completamente esplorato il Palazzo di Madarame»                                         → Palazzo di Madarame
//   Chemdah      «l'apertura delle prime aree … aver completamente esplorato il Palazzo di Madarame»           → Palazzo di Madarame
//   Kaitul       «aver completamente esplorato il Palazzo di Kaneshiro»                                        → Palazzo di Kaneshiro
//   Akzeriyyuth  «aver completamente esplorato il Palazzo di Futaba»                                           → Palazzo di Futaba
//   Adyeshach    «aver completamente esplorato il Palazzo di Okumura»                                          → Palazzo di Okumura
//   Sheriruth    «aver completamente esplorato il Palazzo di Shido»                                            → Palazzo di Shido
//   Iweleth      chiuso «fino al 24 DICEMBRE» → la finestra del Dedalo di Iweleth, già scritta sulla sua scheda (`dungeon.finestra_dal` = 12-24)
//   Da'at        «interdetta fino al 20 GENNAIO»                                                               → dal 20 gennaio
// «Completato» è il Palazzo concluso nella partita (Tesoro e boss finale, `palazziService.statoPalazzi`): mai la data.
// Si scrive **solo dove il Dedalo esiste ed è senza condizione**: una condizione già presente resta com'è. Le partite non si toccano: le aperture
// già dichiarate nelle visite restano nelle loro spunte (`spunta_voce_partita.effetti_json`) e negli eventi segnati, ma non decidono più nulla.
// Idempotente: la seconda volta non trova niente da fare. Audit in `dati_guida.audit-305-dedali-aperti-dai-palazzi`.
//
// Fonti: https://www.allgamestaff.it/persona-5-royal/dedalo-di-qimranut/ (e così per aiyatsbus, chemdah, kaitul, akzeriyyuth, adyeshach,
// sheriruth, iweleth, daat), lette il 2026-10-30.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';

const AUDIT = 'audit-305-dedali-aperti-dai-palazzi';
const RICHIESTA = '2026-10-30: «questa schermata ad ogni Memento del Diario non va bene... le aperture dovrebbero dipendere dai palazzi affrontati... cerca nella guida ufficiale... in ogni caso è irrilevante il dedalo aperto ai fini della guida...»';
const FONTE = 'https://www.allgamestaff.it/persona-5-royal/dedalo-di-<nome>/ (sezione «Come sbloccare il Dedalo di …»)';
const palazzo = (dungeon: string) => ({ tipo: 'palazzo', dungeon });
/** Le condizioni, nella forma delle scritture dell'app (`JSON.stringify` delle condizioni normalizzate: `tipo` prima, poi i suoi dati). */
const APERTURE: ReadonlyArray<{ dedalo: string; condizioni: unknown[] }> = [
  { dedalo: 'mementos-01-qimranut', condizioni: [palazzo('kamoshida'), { tipo: 'data', dal: '05-07' }] },
  { dedalo: 'mementos-02-aiyatsbus', condizioni: [palazzo('madarame')] },
  { dedalo: 'mementos-03-chemdah', condizioni: [palazzo('madarame')] },
  { dedalo: 'mementos-04-kaitul', condizioni: [palazzo('kaneshiro')] },
  { dedalo: 'mementos-05-akzeriyyuth', condizioni: [palazzo('futaba')] },
  { dedalo: 'mementos-06-adyeshach', condizioni: [palazzo('okumura')] },
  { dedalo: 'mementos-07-sheriruth', condizioni: [palazzo('shido')] },
  { dedalo: 'mementos-08-iweleth', condizioni: [{ tipo: 'finestra-palazzo', dungeon: 'iweleth' }] },
  { dedalo: 'mementos-09-daat', condizioni: [{ tipo: 'data', dal: '01-20' }] },
];
const errore = (motivo: string): never => { throw new Error(`305: ${motivo}; nessuna modifica applicata.`); };

/** La colonna della condizione d'apertura dei Dedali, se manca. */
function colonnaCondizioni(db: AppDatabase): boolean {
  const colonne = new Set((db.prepare('PRAGMA main.table_info(dungeon_area)').all() as Array<{ name: string }>).map((c) => c.name));
  if (colonne.has('condizioni_json')) return false;
  db.exec('ALTER TABLE main.dungeon_area ADD COLUMN condizioni_json TEXT');
  return true;
}

/** La condizione di ogni Dedalo dei Memento, solo se il Dedalo c'è ed è senza condizione. Restituisce gli esiti per l'audit. */
function condizioniSuiDedali(db: AppDatabase): Array<{ dedalo: string; esito: string; condizione: string | null }> {
  const leggi = db.prepare('SELECT dungeon_chiave, condizioni_json FROM main.dungeon_area WHERE chiave = ?');
  const scrivi = db.prepare("UPDATE main.dungeon_area SET condizioni_json = ? WHERE chiave = ? AND dungeon_chiave = 'mementos' AND condizioni_json IS NULL");
  return APERTURE.map(({ dedalo, condizioni }) => {
    const testo = JSON.stringify(condizioni);
    const r = leggi.get(dedalo) as { dungeon_chiave: string; condizioni_json: string | null } | undefined;
    if (!r) return { dedalo, esito: 'Dedalo assente: niente da scrivere', condizione: null };
    if (r.dungeon_chiave !== 'mementos') return { dedalo, esito: `lasciato: appartiene a «${r.dungeon_chiave}», non ai Memento`, condizione: r.condizioni_json };
    if (r.condizioni_json !== null) return { dedalo, esito: r.condizioni_json === testo ? 'già con la condizione della guida' : 'con una condizione propria: lasciata com’era', condizione: r.condizioni_json };
    if (scrivi.run(testo, dedalo).changes !== 1) errore(`la condizione del Dedalo ${dedalo} non è stata scritta`);
    const riletta = (leggi.get(dedalo) as { condizioni_json: string | null }).condizioni_json;
    if (riletta !== testo) errore(`condizione del Dedalo ${dedalo} riletta diversa da quella scritta`);
    return { dedalo, esito: 'scritta', condizione: testo };
  });
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, daDire: boolean): void {
  if (!esisteTabella(db, 'dati_guida')) return;
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !daDire) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 305, richiesta: RICHIESTA, fonte: FONTE,
      regola: 'la condizione d’apertura sul Dedalo dei Memento solo se il Dedalo esiste ed è senza condizione; le partite non si toccano',
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration305: Migration = {
  id: 305,
  name: 'dedali_aperti_dai_palazzi',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'dungeon_area')) { logger.warn({ migrazione: 305 }, 'tabella dei Dedali assente: niente da fare'); return; }
    const colonna = colonnaCondizioni(db);
    const dedali = condizioniSuiDedali(db);
    const scritte = dedali.filter((d) => d.esito === 'scritta').length;
    scriviAudit(db, { colonnaAggiunta: colonna, dedali }, colonna || scritte > 0);
    logger.info({ migrazione: 305, colonnaAggiunta: colonna, dedaliScritti: scritte }, 'Dedali dei Memento aperti dai Palazzi');
  },
};
