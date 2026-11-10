// ============================================================
// Utente 068 — `registro_acquisti.sede_chiave` tolta: la scorta è dell'offerta (L2-10, lotto «Macchine e fine del listino condiviso»)
// ============================================================
//
// Ogni macchina è un punto vendita con le sue offerte: un acquisto vale per l'offerta che cita, e la colonna della sede non si legge né si scrive più.
// La colonna si toglie sempre, così lo schema converge e `FONTI_TOLTE` è vera. Il codice di prima scriveva qui, per gli acquisti dalla pagina del negozio, la sede
// principale: una riga può quindi avere un valore. Prima di toglierla, la riga comprata in una sede aggiuntiva (Central Street, Tornello) passa all'offerta della macchina
// che quella sede è diventata (`rimappaAcquisti`), così la scorta non cambia di macchina; il valore resta anche nella copia fatta prima delle migrazioni (`runBootBackup`). Il conteggio e i valori (id della riga → sede) vanno nel verbale `main.dati_guida.audit-utente-068-sede`
// quando il file di gioco è attaccato, come fanno le migrazioni utente 052, 053, 055, 056; il log dice quante righe avevano un valore.
// Il CHECK sta sulla colonna, e con la colonna se ne va. Dopo la rimappatura le altre colonne di ogni riga restano identiche (impronta prima e dopo del DROP). In `RIFERIMENTI_PARTITE` la colonna
// resta opzionale per i file vecchi. Idempotente: se la colonna non c'è non fa niente.
//
// UNICA ECCEZIONE MOTIVATA ALL'APPEND-ONLY (rilievo P1 della revisione automatica sulla PR 110, 2026-11-10; DECISIONI §4). Nella versione registrata il
// segno «ottenuto» di una riga spostata con `ottenuto_qui = 1` si copiava nell'offerta della macchina senza la sua valutazione durevole
// (`acquistiLegacy.valutazioniLegacyPartita` la pretende per ogni presenza) e si toglieva dall'offerta d'origine senza la sua associazione
// (`acquisto_legacy_associazione`). Quel ramo non si è mai potuto completare. Con una presenza d'origine la DELETE avveniva sempre: al più una riga per
// offerta porta il segno (lo scrivono solo `scriviRiga` alla prima riga, `togliRiga` e «solo presenza» all'erede, la utente 051 una volta per
// offerta), quindi spostata quella nessun'altra lo portava. E ogni presenza ha la sua associazione (la crea la utente 030 per le
// presenze di allora e `negoziService.impostaAcquisto` → `nuovaValutazioneLegacy` per le nuove; `valutazioniLegacyPartita` rifiuta una presenza
// che non ce l'ha), e il runner applica la migrazione con le chiavi esterne spente e poi confronta `utente.foreign_key_check` prima e dopo DENTRO
// la transazione, prima di avanzare `user_version` (`migrationRunner.ts`, `applica`): l'associazione rimasta orfana è una violazione nuova, la
// transazione si annulla, `user_version` resta a 67 e l'avvio si ferma (`server/index.ts`, «FATALE su errore»). Nessun file è quindi mai arrivato
// alla 68 passando da lì, e correggere quel ramo qui non riscrive dati già migrati. Con quelle due invarianti gli altri rami restano identici (fuori
// da esse il risultato converge comunque, perché la utente 072 valuta ogni presenza delle macchine senza associazione): una riga con `ottenuto_qui = 0`
// (rilievo P2) si sposta come prima, senza presenza alla macchina, e la presenza mancante la crea la utente 072 per tutti i file, anche per quelli
// già arrivati alla 68; con `ottenuto_qui = 1` e l'offerta d'origine senza presenza non si scrive alcun segno, come prima.
// Il ramo corretto (`portaIlSegno`): la macchina riceve la presenza con la sua valutazione (`nuovaValutazioneLegacy`, come un acquisto nuovo), se non
// l'ha già; se l'ha e un'altra sua riga porta il segno, la riga spostata non lo porta più. L'offerta d'origine tiene il segno se le restano
// acquisti (passa al più vecchio, come `scorteService.togliRiga`); altrimenti la presenza se ne va con la sua associazione (la valutazione resta
// nell'archivio immutabile, come quando si toglie un acquisto dall'app).
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { nuovaValutazioneLegacy } from '../acquistiLegacy.js';

const COLONNA = 'sede_chiave';
const errore = (motivo: string): never => { throw new Error(`utente 068: ${motivo}; nessuna modifica applicata.`); };

const colonne = (db: AppDatabase): string[] => (db.prepare('PRAGMA utente.table_info(registro_acquisti)').all() as Array<{ name: string }>).map((c) => c.name);

/** Numero delle righe e SHA-256 delle colonne che restano. */
function impronta(db: AppDatabase): string {
  const tenute = colonne(db).filter((c) => c !== COLONNA).map((c) => `"${c}"`).join(', ');
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare(`SELECT ${tenute} FROM utente.registro_acquisti ORDER BY id`).iterate()) { h.update(JSON.stringify(r) + '\n'); n++; }
  return `${n}:${h.digest('hex')}`;
}

const AUDIT = 'audit-utente-068-sede';
const CENTRAL_STREET = 'shibuya/distributori-central-street';
const TORNELLO = 'shibuya/distributore-tornello-ginza';
/** Il listino d'origine, la sua sede aggiuntiva e la macchina che è diventata (migrazioni 348 e 350). */
const MACCHINE_DELLE_SEDI: ReadonlyArray<{ negozio: string; sede: string; macchina: string }> = [
  { negozio: 'distributore-shujin-edificio', sede: CENTRAL_STREET, macchina: 'distributore-shibuya-central-street-1' },
  { negozio: 'distributore-shujin-cancello-2', sede: CENTRAL_STREET, macchina: 'distributore-shibuya-central-street-2' },
  { negozio: 'distributore-yongen-tabaccaio', sede: CENTRAL_STREET, macchina: 'distributore-shibuya-central-street-3' },
  { negozio: 'distributore-shujin-edificio', sede: TORNELLO, macchina: 'distributore-shibuya-tornello-1' },
  { negozio: 'distributore-yongen-tabaccaio', sede: TORNELLO, macchina: 'distributore-shibuya-tornello-2' },
];

type Rimappata = { id: number; da: string; a: string; segno?: { macchina: 'presenza nuova' | 'presenza già della macchina' | 'segno a un’altra riga della macchina'; origine: string } };

/**
 * Il segno «ottenuto» della riga spostata `r` (che lo portava, `ottenuto_qui = 1`) passa con lei alla macchina; dentro la transazione della migrazione,
 * con le chiavi esterne spente dal runner, quindi l'associazione della presenza d'origine si toglie qui e non per cascata. Senza presenza d'origine
 * non c'è segno da portare (come nella versione registrata).
 */
function portaIlSegno(db: AppDatabase, r: { id: number; partita_id: number; articolo_chiave: string }, nuova: string): Rimappata['segno'] {
  const origine = db.prepare('SELECT updated_at FROM utente.acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').get(r.partita_id, r.articolo_chiave) as { updated_at: string } | undefined;
  if (!origine) {
    // come nella versione registrata: nessun segno da portare (la presenza mancante alla macchina la crea la utente 072)
    logger.warn({ migrazione: 'utente-068', riga: r.id, articolo: r.articolo_chiave }, 'acquisto con il segno «ottenuto» senza presenza d’origine: si sposta senza segno');
    return undefined;
  }
  let macchina: NonNullable<Rimappata['segno']>['macchina'];
  if (!db.prepare('SELECT 1 FROM utente.acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').get(r.partita_id, nuova)) {
    // la presenza nasce con la data del segno d'origine e con la sua valutazione durevole, come ogni presenza nuova (`negoziService.impostaAcquisto`)
    db.prepare('INSERT INTO utente.acquisto_partita (partita_id, articolo_chiave, updated_at) VALUES (?, ?, ?)').run(r.partita_id, nuova, origine.updated_at);
    nuovaValutazioneLegacy(db, { partita_id: r.partita_id, articolo_chiave: nuova, updated_at: origine.updated_at });
    macchina = 'presenza nuova';
  } else if (db.prepare('SELECT 1 FROM utente.registro_acquisti WHERE partita_id = ? AND articolo_chiave = ? AND ottenuto_qui = 1 AND id <> ?').get(r.partita_id, nuova, r.id)) {
    // un solo acquisto per offerta porta il segno: quello che la macchina aveva già
    db.prepare('UPDATE utente.registro_acquisti SET ottenuto_qui = 0 WHERE id = ?').run(r.id);
    macchina = 'segno a un’altra riga della macchina';
  } else macchina = 'presenza già della macchina';
  // l'offerta d'origine: con altri acquisti il segno passa al più vecchio (come `scorteService.togliRiga`); senza, la presenza se ne va
  const erede = db.prepare('SELECT id FROM utente.registro_acquisti WHERE partita_id = ? AND articolo_chiave = ? ORDER BY id LIMIT 1').get(r.partita_id, r.articolo_chiave) as { id: number } | undefined;
  if (erede) {
    db.prepare('UPDATE utente.registro_acquisti SET ottenuto_qui = 1 WHERE id = ?').run(erede.id);
    return { macchina, origine: `segno all’acquisto ${erede.id}` };
  }
  db.prepare('DELETE FROM utente.acquisto_legacy_associazione WHERE partita_id = ? AND articolo_chiave = ?').run(r.partita_id, r.articolo_chiave);
  if (db.prepare('DELETE FROM utente.acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').run(r.partita_id, r.articolo_chiave).changes !== 1) errore(`la presenza di ${r.articolo_chiave} non si toglie`);
  return { macchina, origine: 'presenza tolta (la valutazione resta nell’archivio)' };
}

/**
 * Un acquisto fatto in una sede aggiuntiva è un acquisto di quella macchina: la riga passa all'offerta della macchina nuova, se esiste, e porta con sé il segno
 * «ottenuto» (`acquisto_partita`, con la sua valutazione), se lo portava (`portaIlSegno`). Così le scorte non cambiano di macchina.
 */
function rimappaAcquisti(db: AppDatabase): Rimappata[] {
  const fatte: Rimappata[] = [];
  for (const m of MACCHINE_DELLE_SEDI) {
    const righe = db.prepare(`SELECT id, partita_id, articolo_chiave, ottenuto_qui FROM utente.registro_acquisti WHERE ${COLONNA} = ? AND articolo_chiave LIKE ? ORDER BY id`)
      .all(m.sede, `${m.negozio}/%`) as Array<{ id: number; partita_id: number; articolo_chiave: string; ottenuto_qui: number }>;
    for (const r of righe) {
      const nuova = `${m.macchina}/${r.articolo_chiave.slice(m.negozio.length + 1)}`;
      if (!db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ?').get(nuova)) continue;
      db.prepare('UPDATE utente.registro_acquisti SET articolo_chiave = ? WHERE id = ?').run(nuova, r.id);
      // il segno lo porta la riga com'è adesso (un passaggio precedente può avergliene dato uno come erede dell'offerta d'origine)
      const ottenuto = db.prepare('SELECT ottenuto_qui FROM utente.registro_acquisti WHERE id = ?').pluck().get(r.id) as number;
      const segno = ottenuto === 1 ? portaIlSegno(db, r, nuova) : undefined;
      fatte.push({ id: r.id, da: r.articolo_chiave, a: nuova, ...(segno ? { segno } : {}) });
    }
  }
  return fatte;
}

export const utente068: Migration = {
  id: 68,
  name: 'registro_senza_sede',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!colonne(db).includes(COLONNA)) return;
    const conValore = db.prepare(`SELECT COUNT(*) FROM utente.registro_acquisti WHERE ${COLONNA} IS NOT NULL`).pluck().get() as number;
    if (conValore > 0) logger.warn({ migrazione: 'utente-068', righeConSede: conValore }, 'registro_acquisti aveva righe con la sede: i valori restano nel verbale e nella copia di avvio');
    const conGioco = !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'dati_guida'").get();
    const valori = Object.fromEntries((db.prepare(`SELECT id, ${COLONNA} AS sede FROM utente.registro_acquisti WHERE ${COLONNA} IS NOT NULL ORDER BY id`).all() as Array<{ id: number; sede: string }>).map((r) => [String(r.id), r.sede]));
    const rimappate = conGioco ? rimappaAcquisti(db) : [];
    if (conGioco) {
      const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
      const esecuzioni = vecchio ? (JSON.parse(vecchio) as { esecuzioni?: unknown[] }).esecuzioni ?? [] : [];
      db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
        .run(AUDIT, JSON.stringify({ migrazione: 'utente-068', esecuzioni: [...esecuzioni, { il: new Date().toISOString(), righeConSede: conValore, valori, rimappate }] }));
    }
    const prima = impronta(db);
    db.exec(`ALTER TABLE utente.registro_acquisti DROP COLUMN ${COLONNA}`);
    if (colonne(db).includes(COLONNA)) errore('la colonna esiste ancora');
    if (impronta(db) !== prima) errore('le altre colonne del registro sono cambiate');
    logger.info({ migrazione: 'utente-068', righeConSede: conValore }, 'registro_acquisti.sede_chiave tolta');
  },
};
