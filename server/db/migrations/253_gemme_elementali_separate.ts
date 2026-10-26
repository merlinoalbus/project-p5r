// ============================================================
// Migrazione 253 — le Gemme elementali di Tanaka sono quattro Magatama distinti (ondata 5, lotto C: O5-08)
// ============================================================
//
// Censimento O5-08: «Gemme elementali di Tanaka: sono 4 Magatama distinti da 6.000 ciascuno [Negozi speciali]; l'articolo va separato, come
// per i Nirvana». Decisione 21 (c) dell'utente (26/10/2026): unioni delle identità doppie su elenco scritto con cestino reversibile; in caso di
// discordanza fra pagine della guida vale il listino dei negozi.
//
// Stato prima della migrazione: le quattro offerte di Tanaka c'erano già, ciascuna sul suo Magatama (infernale, ciclonico, del gelo,
// elettrico, 6.000 ¥, dal listino Royal della 142: l'offerta che si chiamava «Gemme elementali» era già collegata al Magatama infernale). Restavano:
//   (1) la scheda composta «Gemme elementali» («150 danni elementali a fuoco, vento, freddo o folgorazione»), senza offerte, citata solo
//       dalla copia di ripristino dell'offerta e dalle fotografie delle proposte: si unisce al Magatama infernale, a cui quella offerta è
//       collegata (fusione reversibile dal Cestino, senza aggiungere «Gemme elementali» come nome alternativo: non è un altro nome del
//       Magatama infernale);
//   (2) il Magatama del gelo con due schede: «Magatama ghiaccio» (con l'effetto, 150 danni da ghiaccio) e «Magatama del gelo» (listino di
//       Tanaka, con l'offerta). «Magatama ghiaccio» non è un nome della guida: la pagina Oggetti chiama «Magatama del gelo» l'oggetto da 150
//       danni (6.000 ¥ da Tanaka) e «Magatama del ghiaccio» un oggetto diverso, da 50 danni, che si trova solo nei forzieri dei Dedali e non
//       è nel catalogo, come gli altri Magatama deboli. Resta «Magatama del gelo», SENZA «Magatama ghiaccio» come nome alternativo (la
//       ricerca porterebbe all'oggetto da 150 danni chi cerca quello da 50); l'effetto e la sottocategoria della scheda tolta passano alla
//       scheda che resta, se è vuota. Non c'è discordanza fra pagine della guida (il nome tolto non viene da una pagina): niente nota storica.
// Nessuna partita e nessuna voce del Diario cambia. Idempotente. Audit in `dati_guida.audit-253-gemme-elementali`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { scriviAudit, unisciIdentita } from './identitaDoppie250.js';

const AUDIT = 'audit-253-gemme-elementali';
const GHIACCIO = 'consumabile/magatama-ghiaccio';
const GELO = 'consumabile/magatama-del-gelo';
const GEMME = 'consumabile/gemme-elementali';
const INFERNALE = 'consumabile/magatama-infernale';
/** Le quattro offerte di Tanaka (6.000 ¥) e la scheda su cui devono stare dopo la migrazione. */
const OFFERTE = [
  ['tanaka-affari-loschi/gemme-elementali', INFERNALE],
  ['tanaka-affari-loschi/magatama-ciclonico', 'consumabile/magatama-ciclonico'],
  ['tanaka-affari-loschi/magatama-del-gelo', GELO],
  ['tanaka-affari-loschi/magatama-elettrico', 'consumabile/magatama-elettrico'],
] as const;

export const migration253: Migration = {
  id: 253,
  name: 'gemme_elementali_separate',
  up(db) {
    if (!db.inTransaction) throw new Error('253: manca la transazione della migrazione; nessuna modifica applicata.');
    for (const t of ['catalogo_oggetto', 'articolo', 'cestino', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 253, tabella: t }, 'tabella assente: Gemme elementali non toccate'); return; }
    }
    const adesso = new Date().toISOString();

    // (2) il Magatama del gelo: una scheda sola, col nome del listino e della pagina Oggetti e l'effetto della scheda tolta
    const ghiaccio = db.prepare('SELECT effetto, sottocategoria FROM main.catalogo_oggetto WHERE chiave = ?').get(GHIACCIO) as { effetto: string; sottocategoria: string | null } | undefined;
    let effettoCopiato = 0, sottocategoriaCopiata = 0;
    const gelo = unisciIdentita(db, { da: GHIACCIO, a: GELO, alias: [], perche: 'stesso Magatama del gelo di Tanaka (150 danni da ghiaccio, 6.000 ¥): «Magatama ghiaccio» era il nome della scheda di partenza, non della guida; «Magatama del ghiaccio» (50 danni, forzieri dei Dedali) è un altro oggetto, quindi non diventa un nome alternativo' },
      () => {
        if (!ghiaccio) return;
        if (ghiaccio.effetto.trim()) effettoCopiato = db.prepare("UPDATE main.catalogo_oggetto SET effetto = ?, updated_at = ? WHERE chiave = ? AND trim(effetto) = ''").run(ghiaccio.effetto, adesso, GELO).changes;
        if (ghiaccio.sottocategoria) sottocategoriaCopiata = db.prepare('UPDATE main.catalogo_oggetto SET sottocategoria = ?, updated_at = ? WHERE chiave = ? AND sottocategoria IS NULL').run(ghiaccio.sottocategoria, adesso, GELO).changes;
      });

    // una fusione non riuscita ha annullato anche i ritocchi fatti dentro di lei
    if (gelo.esito !== 'unita') { effettoCopiato = 0; sottocategoriaCopiata = 0; }

    // (1) la scheda composta delle Gemme elementali
    const gemme = unisciIdentita(db, { da: GEMME, a: INFERNALE, alias: [], perche: 'scheda composta delle quattro Magatama elementali: l’offerta che portava quel nome era già collegata al Magatama infernale, le altre tre hanno le loro offerte' });

    for (const e of [gelo, gemme].filter((x) => x.esito === 'ferma')) logger.warn({ migrazione: 253, da: e.da, a: e.a, motivo: e.motivo }, 'unione non applicata, lasciata com’è');
    // controllo: le quattro offerte, ciascuna sul suo Magatama (sola lettura, per l'audit)
    const offerte = OFFERTE.map(([chiave, atteso]) => {
      const r = db.prepare('SELECT prezzo, nascosto, catalogo_chiave FROM main.articolo WHERE chiave = ?').get(chiave) as { prezzo: number | null; nascosto: number; catalogo_chiave: string | null } | undefined;
      return { chiave, atteso, ...(r ?? { assente: true }), giusta: !!r && r.catalogo_chiave === atteso && r.nascosto === 0 };
    });
    const conteggi = { gelo: gelo.esito, gemme: gemme.esito, effettoCopiato, sottocategoriaCopiata, offerteGiuste: offerte.filter((o) => o.giusta).length };
    if (conteggi.offerteGiuste !== OFFERTE.length) logger.warn({ migrazione: 253, offerte }, 'non tutte le offerte delle Magatama elementali sono al loro posto');
    scriviAudit(db, AUDIT, 253, { conteggi, esiti: [gelo, gemme], offerte });
    logger.info({ migrazione: 253, ...conteggi }, 'Gemme elementali: quattro Magatama distinti');
  },
};
