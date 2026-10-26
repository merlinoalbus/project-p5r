// ============================================================
// Migrazione 296 — gli incensi di Mantra Ganda come oggetti del catalogo, e gli oggetti che chiedono Frost Nero e Babau (Ondata 5, lotto F-bis)
// ============================================================
//
// Decisione 21 (precisazione): gli oggetti che incidono su ciò che l'app gestisce si modellano con i suoi tipi. Decisione 22: Black Frost e Bugs
// «Solo etichetta».
//   (1) Censimento F-bis, punto 27: l'Isolamento usava una costante con i prezzi copiati (`INCENSI`); ora la scelta è un incenso del catalogo
//       (`INCENSI_DEL_CATALOGO`, `incensiDellaPartita`) con il prezzo della sua offerta e una copia consumata. Nei dati di Mantra Ganda:
//       - il negozio non aveva condizioni ma la nota diceva «Rango 3 con le Gemelle custodi»: la condizione entra nel negozio e la nota dice
//         che cosa vende davvero (gli incensi dell'Isolamento, non «abilità elementali»);
//       - due righe composte del listino («Incensi elementali singoli», «Muschi combinati») ripetevano le offerte singole (Incenso FR … FO a
//         4.000 ¥, i cinque Muschi a 8.000 ¥) con una scheda propria («Potenzia un singolo elemento…», sbagliata): si nascondono (non si
//         cancellano) se nessuna partita né voce le cita, e la data dei Muschi (dal 1° luglio) passa alle cinque offerte singole che non
//         ce l'hanno (un dato in un solo punto);
//   (2) Censimento F-bis, punto 29: Frost Nero (Black Frost) chiede il «Fiocco di neve malvagio» (Richiesta «Bullismo sui bulli») e Babau
//       (Bugs) la «Palla peli appiccicosa» (Richiesta «La stalker informatica»). Nuova colonna `persona.richiede_oggetto` (la chiave del
//       catalogo), letta come etichetta «Richiede l'oggetto» nel Compendio (`compendioService`); il motore di fusione non la usa. La ricompensa
//       della «Stalker informatica» puntava al doppione `materiale/palla-peli-appiccicosa` (senza effetto): passa alla scheda
//       `chiave/palla-peli-appiccicosa` (quella con l'effetto, come il Fiocco) e il doppione si nasconde, se nessun altro dato lo cita.
// Conservativa: solo dati della guida mai corretti dall'utente, solo i testi e le righe attese. Idempotente. Audit in `dati_guida.audit-296-incensi-fusioni`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { FONTE_NEGOZI, FONTE_OGGETTI_CHIAVE, canonico, correggiTesto, scriviAuditFbis, type Esito } from './fbisOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-296-incensi-fusioni';
const errore = (motivo: string): never => { throw new Error(`296: ${motivo}; nessuna modifica applicata.`); };
const MANTRA = 'mantra-ganda';
const NOTA_PRIMA = "Vende incensi che potenziano l efficacia delle abilità elementali. La presenza del negozio dipende dallo sblocco dell'Isolamento, cioè dal Rango 3 con le Gemelle custodi; ottenere in anticipo la Chiave della cella non cambia nulla e in ogni Nuova Partita + il Rango 3 va raggiunto di nuovo";
const NOTA_DOPO = "Vende gli incensi da bruciare durante l'Isolamento nella Stanza di Velluto (alzano le statistiche della Persona isolata). Il negozio c'è dallo sblocco dell'Isolamento, cioè dal Rango 3 con le Gemelle custodi; ottenere in anticipo la Chiave della cella non cambia nulla e in ogni Nuova Partita + il Rango 3 va raggiunto di nuovo.";
const COND_GEMELLE = [{ tipo: 'confidente', confidente: 'gemelle', rango: 3 }];
const COMPOSTE = [{ articolo: `${MANTRA}/incensi-elementali-singoli`, scheda: 'materiale/incensi-elementali-singoli' }, { articolo: `${MANTRA}/muschi-combinati`, scheda: 'materiale/muschi-combinati' }];
const MUSCHI = ['muschio-fr-ma', 'muschio-fr-ag', 'muschio-ma-rs', 'muschio-ma-fo', 'muschio-rs-ag'].map((m) => `${MANTRA}/${m}`);
const DAL_LUGLIO = { tipo: 'data', dal: '07-01' };
const PERSONE: ReadonlyArray<{ nome: string; oggetto: string }> = [{ nome: 'Black Frost', oggetto: 'chiave/fiocco-di-neve-malvagio' }, { nome: 'Bugs', oggetto: 'chiave/palla-peli-appiccicosa' }];
const PALLA_DOPPIONE = 'materiale/palla-peli-appiccicosa';
const PALLA = 'chiave/palla-peli-appiccicosa';
const STALKER = 'la-stalker-informatica';

const condizioni = (s: string | null): unknown[] => { try { const x = JSON.parse(s ?? '[]') as unknown; return Array.isArray(x) ? x : []; } catch { return []; } };
/** L'oggetto o l'offerta è citata da una partita o da una voce? (allora non si nasconde) */
function citata(db: AppDatabase, chiave: string): boolean {
  const utente = (t: string, c: string): boolean => !!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = ?").get(t)
    && !!db.prepare(`SELECT 1 FROM utente."${t}" WHERE "${c}" = ? LIMIT 1`).get(chiave);
  return utente('acquisto_partita', 'articolo_chiave') || utente('registro_acquisti', 'articolo_chiave') || utente('oggetto_ottenuto_partita', 'catalogo_chiave')
    || utente('oggetto_esito_turno', 'catalogo_chiave') || utente('consumo_oggetto_partita', 'catalogo_chiave') || utente('regalo_partita', 'catalogo_chiave')
    || !!db.prepare('SELECT 1 FROM main.voce_effetto WHERE instr(dati_json, ?) > 0 LIMIT 1').get(`"${chiave}"`);
}
/** Nasconde una riga della guida (offerta o scheda) se nessuno la usa; dice perché altrimenti. */
function nascondi(db: AppDatabase, tabella: 'articolo' | 'catalogo_oggetto', chiave: string, usata: boolean, cosa: string, adesso: string): Esito {
  const r = db.prepare(`SELECT nascosto, origine, seed_json FROM main.${tabella} WHERE chiave = ?`).get(chiave) as { nascosto: number; origine: string; seed_json: string | null } | undefined;
  if (!r) return { chiave, esito: 'assente' };
  if (r.nascosto) return { chiave, esito: 'già nascosta' };
  if (r.origine !== 'seed' || r.seed_json !== null || usata || citata(db, chiave)) return { chiave, esito: 'corretta dall’utente o ancora usata: non toccata' };
  if (db.prepare(`UPDATE main.${tabella} SET nascosto = 1, updated_at = ? WHERE chiave = ? AND nascosto = 0`).run(adesso, chiave).changes !== 1) errore(`${chiave} non si nasconde`);
  return { chiave, esito: `${cosa} nascosta` };
}

export const migration296: Migration = {
  id: 296,
  name: 'incensi_e_oggetti_delle_fusioni',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['negozio', 'articolo', 'catalogo_oggetto', 'ricompensa_oggetto', 'persona', 'voce_effetto']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 296, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    const adesso = new Date().toISOString();
    const esiti: Esito[] = [];
    // (1) Mantra Ganda: condizione e nota del negozio
    const n = db.prepare('SELECT condizioni_json, origine, seed_json FROM main.negozio WHERE chiave = ?').get(MANTRA) as { condizioni_json: string | null; origine: string; seed_json: string | null } | undefined;
    if (!n) esiti.push({ chiave: MANTRA, esito: 'negozio assente' });
    else if (canonico(condizioni(n.condizioni_json)) === canonico(COND_GEMELLE)) esiti.push({ chiave: `condizioni:${MANTRA}`, esito: 'condizione già scritta' });
    else if (n.origine !== 'seed' || n.seed_json !== null || condizioni(n.condizioni_json).length) esiti.push({ chiave: `condizioni:${MANTRA}`, esito: 'condizioni diverse o corrette dall’utente: non toccate' });
    else {
      if (db.prepare("UPDATE main.negozio SET condizioni_json = ?, updated_at = ? WHERE chiave = ? AND origine = 'seed' AND seed_json IS NULL").run(JSON.stringify(COND_GEMELLE), adesso, MANTRA).changes !== 1) errore('la condizione di Mantra Ganda non si scrive');
      esiti.push({ chiave: `condizioni:${MANTRA}`, esito: 'condizione: rango 3 delle Gemelle' });
    }
    if (n) esiti.push(correggiTesto(db, { tabella: 'negozio', dove: 'chiave = ?', parametri: [MANTRA], colonna: 'note', prima: NOTA_PRIMA, dopo: NOTA_DOPO, etichetta: `nota:${MANTRA}` }, adesso));
    // la data dei Muschi alle offerte singole (prima di nascondere la riga composta che la porta)
    const composta = db.prepare('SELECT condizioni_json FROM main.articolo WHERE chiave = ?').get(`${MANTRA}/muschi-combinati`) as { condizioni_json: string | null } | undefined;
    const conLuglio = !!composta && condizioni(composta.condizioni_json).some((c) => canonico(c) === canonico(DAL_LUGLIO));
    for (const m of MUSCHI) {
      const a = db.prepare('SELECT condizioni_json, origine, seed_json FROM main.articolo WHERE chiave = ?').get(m) as { condizioni_json: string | null; origine: string; seed_json: string | null } | undefined;
      if (!a) { esiti.push({ chiave: m, esito: 'offerta assente' }); continue; }
      const c = condizioni(a.condizioni_json);
      if (c.some((x) => (x as { tipo?: unknown }).tipo === 'data' || (x as { tipo?: unknown }).tipo === 'intervallo')) { esiti.push({ chiave: m, esito: c.some((x) => canonico(x) === canonico(DAL_LUGLIO)) ? 'data già scritta' : 'ha già una data: non toccata' }); continue; }
      if (!conLuglio) { esiti.push({ chiave: m, esito: 'la riga composta non dice la data: non toccata' }); continue; }
      if (a.origine !== 'seed' || a.seed_json !== null) { esiti.push({ chiave: m, esito: 'offerta corretta dall’utente: non toccata' }); continue; }
      if (db.prepare("UPDATE main.articolo SET condizioni_json = ?, updated_at = ? WHERE chiave = ? AND origine = 'seed' AND seed_json IS NULL").run(JSON.stringify([...c, DAL_LUGLIO]), adesso, m).changes !== 1) errore(`la data di ${m} non si scrive`);
      esiti.push({ chiave: m, esito: 'data: dal 1° luglio' });
    }
    // le righe composte e le loro schede, nascoste se nessuno le cita (la scheda solo se nessun'altra offerta o ricompensa la usa)
    for (const c of COMPOSTE) {
      esiti.push(nascondi(db, 'articolo', c.articolo, false, 'riga composta', adesso));
      const usata = (db.prepare('SELECT COUNT(*) FROM main.articolo WHERE catalogo_chiave = ? AND nascosto = 0').pluck().get(c.scheda) as number)
        + (db.prepare('SELECT COUNT(*) FROM main.ricompensa_oggetto WHERE catalogo_chiave = ?').pluck().get(c.scheda) as number) > 0;
      esiti.push(nascondi(db, 'catalogo_oggetto', c.scheda, usata, 'scheda composta', adesso));
    }
    // (2) l'oggetto che chiedono Frost Nero e Babau: la ricompensa della Stalker sulla scheda chiave, il doppione nascosto
    const ricompensaDoppione = db.prepare("SELECT quantita, ordine FROM main.ricompensa_oggetto WHERE fonte_tipo = 'richiesta' AND fonte_chiave = ? AND catalogo_chiave = ?").get(STALKER, PALLA_DOPPIONE) as { quantita: number | null; ordine: number } | undefined;
    if (ricompensaDoppione && db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(PALLA)
      && !db.prepare("SELECT 1 FROM main.ricompensa_oggetto WHERE fonte_tipo = 'richiesta' AND fonte_chiave = ? AND catalogo_chiave = ?").get(STALKER, PALLA)) {
      db.prepare("INSERT INTO main.ricompensa_oggetto (fonte_tipo, fonte_chiave, catalogo_chiave, quantita, ordine, nota) VALUES ('richiesta', ?, ?, ?, ?, ?)").run(STALKER, PALLA, ricompensaDoppione.quantita, ricompensaDoppione.ordine, 'oggetto chiave, per fusione di Babau');
      if (db.prepare("DELETE FROM main.ricompensa_oggetto WHERE fonte_tipo = 'richiesta' AND fonte_chiave = ? AND catalogo_chiave = ?").run(STALKER, PALLA_DOPPIONE).changes !== 1) errore('la ricompensa doppia non si toglie');
      esiti.push({ chiave: `ricompensa:${STALKER}`, esito: `dalla scheda ${PALLA_DOPPIONE} a ${PALLA}` });
    } else esiti.push({ chiave: `ricompensa:${STALKER}`, esito: ricompensaDoppione ? 'scheda chiave assente o ricompensa già presente: non toccata' : 'già sulla scheda chiave o assente' });
    const usiDoppione = (db.prepare('SELECT COUNT(*) FROM main.ricompensa_oggetto WHERE catalogo_chiave = ?').pluck().get(PALLA_DOPPIONE) as number)
      + (db.prepare('SELECT COUNT(*) FROM main.articolo WHERE catalogo_chiave = ?').pluck().get(PALLA_DOPPIONE) as number)
      + (esisteTabella(db, 'confidente_regalo') && haColonna(db, 'confidente_regalo', 'catalogo_chiave') ? db.prepare('SELECT COUNT(*) FROM main.confidente_regalo WHERE catalogo_chiave = ?').pluck().get(PALLA_DOPPIONE) as number : 0);
    esiti.push(nascondi(db, 'catalogo_oggetto', PALLA_DOPPIONE, usiDoppione > 0, `doppione di ${PALLA}`, adesso));
    const colonnaNuova = !haColonna(db, 'persona', 'richiede_oggetto');
    if (colonnaNuova) db.exec('ALTER TABLE main.persona ADD COLUMN richiede_oggetto TEXT');
    for (const p of PERSONE) {
      const r = db.prepare('SELECT id, richiede_oggetto, origine, seed_json FROM main.persona WHERE nome = ?').get(p.nome) as { id: number; richiede_oggetto: string | null; origine: string; seed_json: string | null } | undefined;
      if (!r) { esiti.push({ chiave: `persona:${p.nome}`, esito: 'Persona assente' }); continue; }
      if (r.richiede_oggetto === p.oggetto) { esiti.push({ chiave: `persona:${p.nome}`, esito: 'oggetto già scritto' }); continue; }
      if (r.richiede_oggetto !== null || r.origine !== 'seed' || r.seed_json !== null) { esiti.push({ chiave: `persona:${p.nome}`, esito: 'Persona corretta dall’utente o con un altro oggetto: non toccata' }); continue; }
      if (!db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(p.oggetto)) { esiti.push({ chiave: `persona:${p.nome}`, esito: `oggetto ${p.oggetto} assente: non scritto` }); continue; }
      if (db.prepare('UPDATE main.persona SET richiede_oggetto = ? WHERE id = ? AND richiede_oggetto IS NULL').run(p.oggetto, r.id).changes !== 1) errore(`l'oggetto di ${p.nome} non si scrive`);
      esiti.push({ chiave: `persona:${p.nome}`, esito: `richiede ${p.oggetto} (solo etichetta)` });
    }
    const conteggi = {
      negozio: esiti.filter((e) => /^condizione:|^corretto$/.test(e.esito)).length,
      dateMuschi: esiti.filter((e) => e.esito === 'data: dal 1° luglio').length,
      nascoste: esiti.filter((e) => / nascosta$/.test(e.esito) && !e.esito.startsWith('già')).length,
      ricompense: esiti.filter((e) => e.esito.startsWith('dalla scheda')).length,
      colonna: colonnaNuova ? 1 : 0,
      persone: esiti.filter((e) => e.esito.startsWith('richiede ')).length,
    };
    const cambiato = Object.values(conteggi).some((v) => v > 0);
    if (cambiato) invalidaCacheDiGioco();
    scriviAuditFbis(db, AUDIT, 296, { fonti: [FONTE_NEGOZI, FONTE_OGGETTI_CHIAVE], decisione: 'L13-22', conteggi, esiti,
      nota: 'Le righe composte del catalogo di Jose («Ambra grigia» con tre statistiche, «Ambra grigia RS/FR», «Nirvana») restano: dicono che cosa vende Jose in un Dedalo; nell’Isolamento si sceglie l’incenso singolo.' }, cambiato);
    logger.info({ migrazione: 296, ...conteggi }, 'Incensi di Mantra Ganda e oggetti delle fusioni di Frost Nero e Babau');
  },
};
