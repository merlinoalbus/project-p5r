// ============================================================
// Migrazione 252 — il Braccialetto d'argento: una sola scheda, di categoria regalo, prezzo solo nell'offerta (ondata 5, lotto C: O5-01, RG-13, RG-14)
// ============================================================
//
// Decisione 12 dell'utente: «il prezzo vive solo negli articoli (68.000) e i regali lo leggono da lì; il valore va verificato in gioco».
// Decisione 21 (c), 26/10/2026: «Braccialetto di 37 Gradi Celsius nascosto» e «in caso di discordanza fra pagine della guida vale il listino
// dei negozi con nota storica». Prima di questa migrazione:
//   - il braccialetto aveva due schede: `accessorio/braccialetto-dargento` (con l'offerta di Tsurukame Diamond, 68.000 ¥, e i 7 regali) e
//     `regalo/braccialetto-argento` (con la sola offerta nascosta di 37 Gradi Celsius, che secondo l'Elenco dei negozi non vende braccialetti);
//   - la scheda usata era di categoria «accessorio», ma la pagina Accessori non lo elenca: è un regalo;
//   - i 7 regali ripetevano nel loro costo «78.000 ¥» (pagina dei regali), che la scheda del Confidente mostrava come «Indicazioni della
//     guida» accanto ai 68.000 dell'offerta: un secondo prezzo, diverso.
// Che cosa fa:
//   (1) unisce `regalo/braccialetto-argento` in `accessorio/braccialetto-dargento` (fusione reversibile dal Cestino; la chiave della scheda
//       resta quella usata dai regali e dalle offerte) e la scheda diventa di categoria «regalo», nella stessa registrazione del Cestino;
//   (2) l'offerta di 37 Gradi Celsius resta nascosta (se fosse visibile si nasconde, con la copia di com'era in `seed_json`);
//   (3) la discordanza della guida diventa una nota storica (`nota_storica` + legami all'offerta e alla scheda), come per l'Homunculus;
//   (4) il «78.000» si toglie dal costo dei 7 regali: il prezzo si legge dall'offerta. Solo righe di seed con quel testo; quelle cambiate
//       dall'utente restano. Il luogo («dove») lo sistema il lotto D con le altre copie.
// Nessuna partita e nessuna voce del Diario cambia. Idempotente. Audit in `dati_guida.audit-252-braccialetto`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { scriviAudit, unisciIdentita } from './identitaDoppie250.js';

const AUDIT = 'audit-252-braccialetto';
const SCHEDA = 'accessorio/braccialetto-dargento';
const DOPPIA = 'regalo/braccialetto-argento';
const OFFERTA = 'tsurukame-diamond/braccialetto-d-argento';
const OFFERTA_37 = '37-gradi-celsius/braccialetto-argento';
const NOTA = 'braccialetto-dargento-prezzo-fonte';
const NOTA_TESTO = 'La guida si contraddice: 78.000 ¥ nella pagina dei regali ai Confidenti, 68.000 ¥ nell’elenco dei negozi (Tsurukame Diamond). Il dato di riferimento è 68.000 ¥, dal listino dei negozi; il valore va verificato in gioco. È una nota sulla fonte: non indica il prezzo corrente dell’offerta né quanto è stato pagato e non applica modifiche al listino.';
const NOTA_FONTE = 'Guida italiana: «Guida ai regali dei Confidenti» ed «Elenco dei negozi»';
/** Il costo dei regali che ripeteva il prezzo della pagina dei regali (i testi di seed, con le loro grafie). */
const COSTO_78 = /^78\.000\s*(¥|yen)$/i;

export const migration252: Migration = {
  id: 252,
  name: 'braccialetto_dargento_regalo',
  up(db) {
    if (!db.inTransaction) throw new Error('252: manca la transazione della migrazione; nessuna modifica applicata.');
    for (const t of ['catalogo_oggetto', 'articolo', 'confidente_regalo', 'cestino', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 252, tabella: t }, 'tabella assente: Braccialetto non toccato'); return; }
    }
    if (!db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(SCHEDA)) { logger.warn({ migrazione: 252 }, 'scheda del Braccialetto assente: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const categoriaRegalo = () => db.prepare("UPDATE main.catalogo_oggetto SET categoria = 'regalo', updated_at = ? WHERE chiave = ? AND categoria = 'accessorio'").run(adesso, SCHEDA).changes;

    // (1) una sola scheda, di categoria regalo (dentro la fusione, così il Cestino rimette anche la categoria)
    let categoriaCambiata = 0;
    const unione = unisciIdentita(db, { da: DOPPIA, a: SCHEDA, alias: ['Braccialetto argento'], perche: 'stesso Braccialetto d’argento; 37 Gradi Celsius non vende braccialetti' },
      () => { categoriaCambiata = categoriaRegalo(); });
    if (unione.esito === 'ferma') logger.warn({ migrazione: 252, motivo: unione.motivo }, 'unione del Braccialetto non applicata, lasciata com’è');
    // senza unione (ferma o già fatta) la categoria si corregge lo stesso, se è ancora quella di seed
    if (unione.esito !== 'unita') {
      categoriaCambiata = 0; // una fusione non riuscita ha annullato anche il ritocco fatto dentro di lei
      const s = db.prepare('SELECT origine FROM main.catalogo_oggetto WHERE chiave = ?').get(SCHEDA) as { origine: string } | undefined;
      if (s?.origine === 'seed') categoriaCambiata = categoriaRegalo();
    }

    // (2) l'offerta di 37 Gradi Celsius resta nascosta
    const a37 = db.prepare('SELECT * FROM main.articolo WHERE chiave = ?').get(OFFERTA_37) as Record<string, unknown> | undefined;
    let offerta37Nascosta = 0;
    if (a37 && a37.nascosto === 0 && a37.origine === 'seed') {
      offerta37Nascosta = db.prepare("UPDATE main.articolo SET nascosto = 1, seed_json = COALESCE(seed_json, ?), origine = 'utente', updated_at = ? WHERE chiave = ? AND nascosto = 0")
        .run(JSON.stringify(a37), adesso, OFFERTA_37).changes;
    }

    // (3) la nota storica sulla discordanza della guida
    let notaCreata = 0, legami = 0;
    if (esisteTabella(db, 'nota_storica') && esisteTabella(db, 'nota_storica_legame')) {
      notaCreata = db.prepare('INSERT OR IGNORE INTO main.nota_storica (chiave, testo, fonte, versione, seed_json, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
        .run(NOTA, NOTA_TESTO, NOTA_FONTE, JSON.stringify({ versione: 1, testo: NOTA_TESTO, fonte: NOTA_FONTE }), adesso).changes;
      const lega = db.prepare('INSERT OR IGNORE INTO main.nota_storica_legame (nota_chiave, tipo, chiave) VALUES (?, ?, ?)');
      if (db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND catalogo_chiave = ?').get(OFFERTA, SCHEDA)) legami += lega.run(NOTA, 'articolo', OFFERTA).changes;
      legami += lega.run(NOTA, 'catalogo', SCHEDA).changes;
    } else logger.warn({ migrazione: 252 }, 'tabelle delle note storiche assenti: nota non scritta');

    // (4) il 78.000 non si ripete nei regali: il prezzo è quello dell'offerta
    const regali = db.prepare("SELECT confidente_chiave, ordine, costo FROM main.confidente_regalo WHERE catalogo_chiave = ? AND origine = 'seed' AND costo IS NOT NULL")
      .all(SCHEDA) as Array<{ confidente_chiave: string; ordine: number; costo: string }>;
    const costiTolti: Array<{ confidente: string; ordine: number; prima: string }> = [];
    for (const r of regali) {
      if (!COSTO_78.test(r.costo.trim())) continue;
      if (db.prepare('UPDATE main.confidente_regalo SET costo = NULL WHERE confidente_chiave = ? AND ordine = ? AND costo = ?').run(r.confidente_chiave, r.ordine, r.costo).changes) {
        costiTolti.push({ confidente: r.confidente_chiave, ordine: r.ordine, prima: r.costo });
      }
    }

    const conteggi = { unione: unione.esito, categoriaCambiata, offerta37Nascosta, offerta37: a37 ? (a37.nascosto === 1 || offerta37Nascosta ? 'nascosta' : 'visibile') : 'assente', notaCreata, legami, costiTolti: costiTolti.length };
    scriviAudit(db, AUDIT, 252, { conteggi, unione, costiTolti });
    logger.info({ migrazione: 252, ...conteggi }, 'Braccialetto d’argento: una scheda, categoria regalo, prezzo dall’offerta');
  },
};
