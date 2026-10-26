// ============================================================
// Migrazione 251 — le righe dei regali che nominano quattro oggetti insieme diventano una riga per oggetto (ondata 5, lotto C: RG-01)
// ============================================================
//
// Decisione 21 (c) dell'utente (26/10/2026; raccomandazione approvata: «unioni delle identità doppie su elenco scritto con cestino
// reversibile») e censimento dei regali (RG-01: «Le righe composte vanno sciolte in un oggetto per riga»). Due schede del catalogo erano
// in realtà un elenco di quattro regali in una sola riga:
//   - «Spilla idol / Diffusore aromi / Anelli puzzle / Cuscino mochi (traduzione non ufficiale)», nelle righe di Ryuji e Ann;
//   - «Puzzle Ring, Spilla da idol, Diffusore per aromi, Cuscino mochi», nelle righe di Makoto, Futaba e Haru.
// Senza un oggetto vero non avevano offerta, prezzo né «Segna anche comprato». Ogni riga diventa quattro righe, una per oggetto del listino
// (Spille idol di Tokobushiya, Diffusore di aromi di Akindo, Anelli intrecciati e Cuscino Mochi di Mran Mran), con gli stessi dati della
// riga di partenza (il segno «sconsigliato» compreso: la sua riconversione a +1 è del lotto D, decisione 21). La prima riga conserva il suo
// numero, le altre vanno in fondo all'elenco del Confidente; poi la scheda composta va nel Cestino. Un oggetto che il Confidente ha già in
// elenco non si ripete. Ripristinare la scheda dal Cestino rimette la riga com'era e toglie quelle aggiunte.
//
// Nessuna partita cambia (la guardia verifica che nessuna riga delle partite citi queste schede), nessuna voce del Diario le cita.
// Idempotente: una scheda già sciolta non si tocca. Audit in `dati_guida.audit-251-regali-composti`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { scriviAudit, sciogliRigaComposta, type RigaComposta } from './identitaDoppie250.js';

const AUDIT = 'audit-251-regali-composti';

export const COMPOSTE_251: readonly RigaComposta[] = [
  { chiave: 'regalo/spilla-idol-diffusore-aromi-anelli-puzzle-cuscino-mochi-traduzione-non-ufficiale', oggetti: ['regalo/spille-idol', 'regalo/diffusore-di-aromi', 'regalo/anelli-intrecciati', 'regalo/cuscino-mochi'] },
  { chiave: 'regalo/puzzle-ring-spilla-da-idol-diffusore-per-aromi-cuscino-mochi', oggetti: ['regalo/anelli-intrecciati', 'regalo/spille-idol', 'regalo/diffusore-di-aromi', 'regalo/cuscino-mochi'] },
];

export const migration251: Migration = {
  id: 251,
  name: 'regali_righe_composte_sciolte',
  up(db) {
    if (!db.inTransaction) throw new Error('251: manca la transazione della migrazione; nessuna modifica applicata.');
    for (const t of ['catalogo_oggetto', 'confidente_regalo', 'cestino', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 251, tabella: t }, 'tabella assente: righe composte non sciolte'); return; }
    }
    const esiti = COMPOSTE_251.map((r) => sciogliRigaComposta(db, r));
    for (const e of esiti.filter((x) => x.esito === 'ferma')) logger.warn({ migrazione: 251, chiave: e.chiave, motivo: e.motivo }, 'riga composta non sciolta, lasciata com’è');
    const conteggi = {
      sciolte: esiti.filter((e) => e.esito === 'sciolta').length,
      giaSciolte: esiti.filter((e) => e.esito === 'gia-sciolta').length,
      ferme: esiti.filter((e) => e.esito === 'ferma').length,
      righeRiscritte: esiti.reduce((n, e) => n + (e.righe?.filter((r) => !r.nuova).length ?? 0), 0),
      righeAggiunte: esiti.reduce((n, e) => n + (e.righe?.filter((r) => r.nuova).length ?? 0), 0),
      oggettiGiaInElenco: esiti.reduce((n, e) => n + (e.saltate?.length ?? 0), 0),
    };
    scriviAudit(db, AUDIT, 251, { conteggi, esiti });
    logger.info({ migrazione: 251, ...conteggi }, 'Regali: righe composte sciolte in un oggetto per riga');
  },
};
