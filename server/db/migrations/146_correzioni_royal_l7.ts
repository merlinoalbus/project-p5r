// ============================================================
// 146 — tre correzioni ai dati secondo Royal dal riscontro di L7 (docs/coordinamento/lotti/L7/riscontro-2026-10-23.md §10)
// ============================================================
//
// Vale il dato di Royal; il testo superato resta come nota storica.
//   - Mercante Sakai, Frusta decorativa: l'effetto diceva «Ottenuta in cambio di…» (è il costo, già in `costo_json`); diventa
//     «Arma per Ann: Fo +5» (guida AGS Sakai, 12/6–17/6).
//   - Mercante Sakai, Elisir del padre: l'effetto diceva «Ottenuto in cambio di Panino supernova»; diventa «Ridona tutti gli HP e gli SP
//     a tutti gli alleati» (guida AGS Sakai, 22/1–2/2).
//   - Archivio sintetico di Jose, riga 18: «Nirvana (+3 a tutte le statistiche di una Persona)». Le fonti elencano cinque Nirvana (FO, AG,
//     RS, MA, FR), ciascuno +3 a una sola statistica. La riga grezza (`dati_guida`, protetta dal confronto della 132) NON si tocca: la
//     correzione è una nota storica (migrazione 139) legata ai cinque articoli di Jose e ai cinque oggetti del catalogo.
// Conservativa: l'effetto si scrive solo se è ancora esattamente il valore sbagliato; il testo di prima va in `nota` (senza cancellare
// una nota che c'è già); la nota storica si crea solo se manca, e solo sui legami che esistono. Idempotente. Non tocca prezzi, costi,
// acquisti, condizioni né `partite.db`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';

const CORREZIONI_EFFETTO: ReadonlyArray<{ articolo: string; prima: string; dopo: string }> = [
  { articolo: 'mercante-sakai/frusta-decorativa', prima: 'Ottenuta in cambio di Proteine d importazione', dopo: 'Arma per Ann: Fo +5' },
  { articolo: 'mercante-sakai/elisir-del-padre', prima: 'Ottenuto in cambio di Panino supernova', dopo: 'Ridona tutti gli HP e gli SP a tutti gli alleati' },
];

const CHIAVE_NOTA = 'nirvana-archivio-jose';
const FONTE_NOTA = 'AGS — guida ai Memento, sezione Jose; L7 riscontro del 23/10/2026';
const TESTO_NOTA = 'L’archivio sintetico di Jose riporta un solo «Nirvana (+3 a tutte le statistiche di una Persona)». Le fonti di Royal elencano cinque oggetti separati: Nirvana FO, AG, RS, MA e FR, ciascuno +3 a una sola statistica (80 Fiori, Dedalo di Adyeshach). I cinque oggetti di questo scambio sono giusti; la riga aggregata dell’archivio resta come testo originale e non cambia il listino.';
const STATISTICHE = ['fo', 'ag', 'rs', 'ma', 'fr'] as const;

type Esito = { voce: string; esito: 'applicata' | 'gia-fatta' | 'saltata'; motivo?: string };

function correggiEffetti(db: AppDatabase, adesso: string, esiti: Esito[]): void {
  const leggi = db.prepare('SELECT effetto, nota, origine FROM main.articolo WHERE chiave = ?');
  const scrivi = db.prepare('UPDATE main.articolo SET effetto = ?, nota = ?, updated_at = ? WHERE chiave = ? AND effetto = ?');
  for (const c of CORREZIONI_EFFETTO) {
    const voce = `effetto di ${c.articolo}`;
    const a = leggi.get(c.articolo) as { effetto: string | null; nota: string | null; origine: string } | undefined;
    if (!a) { esiti.push({ voce, esito: 'saltata', motivo: 'articolo assente' }); continue; }
    if (a.effetto === c.dopo) { esiti.push({ voce, esito: 'gia-fatta' }); continue; }
    if (a.effetto !== c.prima) { esiti.push({ voce, esito: 'saltata', motivo: 'l’effetto non è più quello sbagliato noto' }); continue; }
    const storica = `Testo di prima dell’effetto (superato, corretto secondo Royal, guida AGS Sakai): «${c.prima}». È il costo dello scambio, già nel costo dell’offerta.`;
    const nota = a.nota ? `${a.nota}\n\n${storica}` : storica;
    esiti.push(scrivi.run(c.dopo, nota, adesso, c.articolo, c.prima).changes === 1 ? { voce, esito: 'applicata' } : { voce, esito: 'saltata', motivo: 'effetto cambiato nel frattempo' });
  }
}

function notaNirvana(db: AppDatabase, adesso: string, esiti: Esito[]): void {
  const voce = `nota storica ${CHIAVE_NOTA}`;
  const ok = (t: string) => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t);
  if (!ok('nota_storica') || !ok('nota_storica_legame')) { esiti.push({ voce, esito: 'saltata', motivo: 'tabelle delle note storiche assenti' }); return; }
  const esistente = !!db.prepare('SELECT 1 FROM main.nota_storica WHERE chiave = ?').get(CHIAVE_NOTA);
  if (!esistente) {
    db.prepare('INSERT INTO main.nota_storica (chiave, testo, fonte, versione, seed_json, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
      .run(CHIAVE_NOTA, TESTO_NOTA, FONTE_NOTA, JSON.stringify({ versione: 1, testo: TESTO_NOTA, fonte: FONTE_NOTA }), adesso);
  }
  const lega = db.prepare('INSERT OR IGNORE INTO main.nota_storica_legame (nota_chiave, tipo, chiave) VALUES (?, ?, ?)');
  let legami = 0;
  for (const s of STATISTICHE) {
    if (db.prepare("SELECT 1 FROM main.articolo WHERE chiave = ? AND negozio_chiave = 'jose'").get(`jose/nirvana-${s}`)) legami += lega.run(CHIAVE_NOTA, 'articolo', `jose/nirvana-${s}`).changes;
    if (db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(`consumabile/nirvana-${s}`)) legami += lega.run(CHIAVE_NOTA, 'catalogo', `consumabile/nirvana-${s}`).changes;
  }
  esiti.push(!esistente || legami ? { voce, esito: 'applicata' } : { voce, esito: 'gia-fatta' });
}

export const migration146: Migration = {
  id: 146,
  name: 'correzioni_royal_l7',
  up(db) {
    const ok = (t: string) => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t);
    if (!['articolo', 'catalogo_oggetto', 'dati_guida'].every(ok)) return;
    const adesso = new Date().toISOString();
    const esiti: Esito[] = [];
    correggiEffetti(db, adesso, esiti);
    notaNirvana(db, adesso, esiti);
    if (esiti.some((e) => e.esito !== 'gia-fatta')) {
      db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run('correzioni-royal-l7-146', JSON.stringify({ versione: 1, esiti }));
    }
    logger.info({ esiti }, '[migration146] correzioni Royal dal riscontro di L7');
  },
};
