// ============================================================
// 150 — le correzioni L7 rimaste dopo la 144 (docs/coordinamento/lotti/L7/riscontro-da-fare-2026-10-23.md; vince il dato di Royal)
// ============================================================
//
//   1. Sakai, finestra 26/6–2/7: il risultato è la Veste nera materiale mutageno (guida AGS: «usabile per la Trasmutazione»), non l'armatura
//      del listino: `protezione/veste-nera` → `materiale/veste-nera`.
//   2. Sakai, finestra 26/7–30/7: il risultato è il libro (G-034 punto 10): `altro/la-fattorizzazione` → `libro/la-fattorizzazione`.
//      Come ogni modifica di un'offerta dall'app, la riga di prima si conserva in `seed_json` (se vuoto) e passa a origine `utente`.
//   3. Mothman muschiato (baratto del Gachapon): cinque scambi con Replica d'arma, poi Balsamo vitale DAL 6° scambio (AGS: «dopo cinque
//      scambi»); la nota diceva «dal 5° scambio». Il testo di prima resta nella nota.
//   4. Le ultime due proposte di Sakai (passano dalla copia congelata del gesto di conferma, come la 144), con le decisioni dell'utente:
//      · Distintivo dell'angelo: risposta dell'utente del 23/10 alla domanda, «Crystal Skull R (+6)» = `accessorio/distintivo-dellangelo-2`
//        (l'altra versione viene scartata);
//      · costo «Maschera del ladro» dell'Ofuda della magia (19–24/9): l'utente ha detto «sempre vale la versione royal. In ogni caso verifica
//        tu quale chiedere sakai»; la verifica del PM sulla fonte The Gamer dice che la Thief Mask si compra una volta a settimana al Discount
//        Rocinante, a 2.000 ¥, quindi `regalo/maschera-del-ladro`; le due versioni accessorio vengono scartate.
//   5. Carta abilità Media (voce di Madarame, Atrio): la 144 ha scritto quantità 1 e la nota diceva «indicata dall'utente alla conferma», che
//      non è vero. La quantità resta 1: è ricavata dal singolare del testo della voce («Carta abilità Media.»), e la guida AGS dice «una Carta
//      abilità Media» (Samurai Gamers: «Media Skill Card», senza numero; nessuna fonte dà un numero esplicito). Si corregge solo la nota della
//      proposta, che ora dice da dove viene il valore; la provenienza resta anche nel registro (dati_guida).
// Conservativa: ogni valore si scrive solo se è ancora esattamente quello atteso; nulla del lavoro dell'utente cambia. Idempotente.
// Non tocca `partite.db`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { confermaProposta144 } from './abbinamentiCatalogo144.js';
import { logger } from '../../utils/logger.js';

type Esito = { voce: string; esito: 'applicata' | 'gia-fatta' | 'saltata'; motivo?: string };

const IDENTITA: ReadonlyArray<{ articolo: string; prima: string; dopo: string }> = [
  { articolo: 'mercante-sakai/veste-nera', prima: 'protezione/veste-nera', dopo: 'materiale/veste-nera' },
  { articolo: 'mercante-sakai/la-fattorizzazione', prima: 'altro/la-fattorizzazione', dopo: 'libro/la-fattorizzazione' },
];

const MOTHMAN = 'gachapon-akihabara/scambio-mothman-muschiato';
const MOTHMAN_PRIMA = 'Replica d\'arma (poi Balsamo vitale dal 5° scambio)';
const MOTHMAN_DOPO = 'Replica d\'arma per cinque scambi, poi Balsamo vitale dal 6° scambio';

const PROPOSTE: ReadonlyArray<{ tipo: 'articolo'; riga: string; gruppo: string; scelta: string }> = [
  { tipo: 'articolo', riga: 'mercante-sakai/distintivo-dellangelo', gruppo: '', scelta: 'accessorio/distintivo-dellangelo-2' },
  { tipo: 'articolo', riga: 'mercante-sakai/ofuda-della-magia', gruppo: 'costo/maschera del ladro', scelta: 'regalo/maschera-del-ladro' },
];

const NOTA_FALSA = 'Quantità indicata dall’utente alla conferma.';
const NOTA_VERA = 'Quantità 1 ricavata dal singolare del testo della voce («Carta abilità Media.»), che la guida AGS del Palazzo di Madarame conferma con «una Carta abilità Media» (miniboss dell’Atrio); nessuna fonte dà un numero esplicito.';

function identita(db: AppDatabase, adesso: string, esiti: Esito[]): void {
  for (const c of IDENTITA) {
    const voce = `risultato di ${c.articolo}`;
    const a = db.prepare('SELECT catalogo_chiave FROM main.articolo WHERE chiave = ?').get(c.articolo) as { catalogo_chiave: string | null } | undefined;
    if (!a) { esiti.push({ voce, esito: 'saltata', motivo: 'articolo assente' }); continue; }
    if (a.catalogo_chiave === c.dopo) { esiti.push({ voce, esito: 'gia-fatta' }); continue; }
    if (a.catalogo_chiave !== c.prima) { esiti.push({ voce, esito: 'saltata', motivo: 'il risultato non è più quello sbagliato noto' }); continue; }
    if (!db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ? AND nascosto = 0').get(c.dopo)) { esiti.push({ voce, esito: 'saltata', motivo: 'oggetto di destinazione assente o nascosto' }); continue; }
    if (db.prepare("SELECT 1 FROM main.ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave = ?").get(c.articolo)) { esiti.push({ voce, esito: 'saltata', motivo: 'l’offerta ha risultati separati' }); continue; }
    const riga = db.prepare('SELECT * FROM main.articolo WHERE chiave = ?').get(c.articolo);
    const r = db.prepare("UPDATE main.articolo SET catalogo_chiave = ?, seed_json = COALESCE(seed_json, ?), origine = 'utente', updated_at = ? WHERE chiave = ? AND catalogo_chiave = ?")
      .run(c.dopo, JSON.stringify(riga), adesso, c.articolo, c.prima);
    esiti.push(r.changes === 1 ? { voce, esito: 'applicata' } : { voce, esito: 'saltata', motivo: 'cambiato nel frattempo' });
  }
}

function mothman(db: AppDatabase, adesso: string, esiti: Esito[]): void {
  const voce = 'soglia di Mothman muschiato';
  const a = db.prepare('SELECT nota FROM main.articolo WHERE chiave = ?').get(MOTHMAN) as { nota: string | null } | undefined;
  if (!a) { esiti.push({ voce, esito: 'saltata', motivo: 'offerta assente' }); return; }
  if (a.nota?.includes(MOTHMAN_DOPO)) { esiti.push({ voce, esito: 'gia-fatta' }); return; }
  if (!a.nota?.includes(MOTHMAN_PRIMA)) { esiti.push({ voce, esito: 'saltata', motivo: 'la nota non è più quella attesa' }); return; }
  const riga = db.prepare('SELECT * FROM main.articolo WHERE chiave = ?').get(MOTHMAN);
  const nota = `${a.nota.replace(MOTHMAN_PRIMA, MOTHMAN_DOPO)}\nTesto di prima (soglia sbagliata): «${MOTHMAN_PRIMA}». Guida AGS: cinque scambi con Replica d’arma, poi Balsamo vitale.`;
  const r = db.prepare("UPDATE main.articolo SET nota = ?, seed_json = COALESCE(seed_json, ?), updated_at = ? WHERE chiave = ? AND nota = ?")
    .run(nota, JSON.stringify(riga), adesso, MOTHMAN, a.nota);
  esiti.push(r.changes === 1 ? { voce, esito: 'applicata' } : { voce, esito: 'saltata', motivo: 'cambiata nel frattempo' });
}

function proposte(db: AppDatabase, esiti: Esito[]): void {
  // la conferma usa la copia congelata del gesto (abbinamentiCatalogo144.ts), sulla connessione della migrazione: nessun servizio vivo
  const stato = db.prepare('SELECT stato FROM main.proposta_abbinamento WHERE riga_tipo = ? AND riga_chiave = ? AND gruppo = ? AND catalogo_chiave = ?');
  for (const p of PROPOSTE) {
    const voce = `proposta ${p.riga} → ${p.scelta}`;
    const s = stato.get(p.tipo, p.riga, p.gruppo, p.scelta) as { stato: string } | undefined;
    if (!s) { esiti.push({ voce, esito: 'saltata', motivo: 'proposta assente' }); continue; }
    if (s.stato === 'confermata') { esiti.push({ voce, esito: 'gia-fatta' }); continue; }
    if (s.stato !== 'da-approvare') { esiti.push({ voce, esito: 'saltata', motivo: `proposta ${s.stato}` }); continue; }
    try {
      confermaProposta144(db, { riga_tipo: p.tipo, riga_chiave: p.riga, gruppo: p.gruppo, catalogo_chiave: p.scelta });
      esiti.push({ voce, esito: 'applicata' });
    } catch (e) {
      esiti.push({ voce, esito: 'saltata', motivo: e instanceof Error ? e.message : String(e) });
    }
  }
}

function cartaMedia(db: AppDatabase, adesso: string, esiti: Esito[]): void {
  const voce = 'nota della proposta Carta abilità Media';
  const dove = "riga_tipo = 'voce' AND riga_chiave = 'madarame-06-sala-del-tesoro-atrio/4' AND gruppo = 'ricompensa-media-125' AND catalogo_chiave = 'carta-abilita/media' AND stato = 'confermata' AND quantita = 1";
  const p = db.prepare(`SELECT nota FROM main.proposta_abbinamento WHERE ${dove}`).get() as { nota: string | null } | undefined;
  if (!p) { esiti.push({ voce, esito: 'saltata', motivo: 'proposta assente o diversa da quella della 144' }); return; }
  if (p.nota?.includes(NOTA_VERA)) { esiti.push({ voce, esito: 'gia-fatta' }); return; }
  if (!p.nota?.includes(NOTA_FALSA)) { esiti.push({ voce, esito: 'saltata', motivo: 'la nota non contiene la frase da correggere' }); return; }
  const r = db.prepare(`UPDATE main.proposta_abbinamento SET nota = ?, updated_at = ? WHERE ${dove} AND nota = ?`).run(p.nota.replace(NOTA_FALSA, NOTA_VERA), adesso, p.nota);
  esiti.push(r.changes === 1 ? { voce, esito: 'applicata', motivo: 'quantità dal singolare del testo della voce' } : { voce, esito: 'saltata', motivo: 'cambiata nel frattempo' });
}

export const migration150: Migration = {
  id: 150,
  name: 'correzioni_l7_residue',
  up(db) {
    const ok = (t: string) => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t);
    if (!['articolo', 'catalogo_oggetto', 'ricompensa_oggetto', 'proposta_abbinamento', 'dati_guida'].every(ok)) return;
    const adesso = new Date().toISOString();
    const esiti: Esito[] = [];
    identita(db, adesso, esiti);
    mothman(db, adesso, esiti);
    proposte(db, esiti);
    cartaMedia(db, adesso, esiti);
    if (esiti.some((e) => e.esito !== 'gia-fatta')) db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run('correzioni-l7-residue-150', JSON.stringify({ versione: 1, esiti }));
    logger.info({ esiti }, '[migration150] correzioni L7 residue');
  },
};
