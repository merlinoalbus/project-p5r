// ============================================================
// Migrazione 250 — le identità doppie del catalogo diventano una (ondata 5, lotto C: O5-03, O5-14, RG-01; decisione 21)
// ============================================================
//
// Decisione 21 (c) dell'utente (26/10/2026, risposta: «Gli effetti degli oggetti ai fini di questa app non è necessario gestirli se non come
// informazione testuale. Non sono d'accordo nel rimandare attività a fasi successive»; raccomandazione approvata: «unioni delle identità
// doppie su elenco scritto con cestino reversibile»). Lo stesso oggetto aveva due o tre schede nel catalogo: una con l'offerta del negozio,
// l'altra con i regali, le ricompense o la fonte della guida. Così un regalo «senza listino» non aveva prezzo né «Segna anche comprato», la
// ricerca mostrava nomi doppi e alcune offerte (Cesta di vestiti di Akihabara, 8.000 ¥) stavano su una scheda che nessun'altra pagina leggeva.
//
// Ogni riga dell'elenco qui sotto è un'unione con il gesto della fusione del catalogo (`unisciIdentita` → `fondiOggetti144`), reversibile dal
// Cestino: l'identità tolta va nel Cestino, offerte, regali, ricompense, proposte e fonti passano all'identità che resta, i nomi alternativi
// sono quelli scritti qui. Resta l'identità con la categoria della guida italiana (pagina Oggetti / Oggetti chiave), che prevale sulla
// categoria che il listino dava all'offerta: per esempio la Crostatina angelo è un consumabile, la Tessera puntate alte un oggetto chiave.
//
// Fuori dall'elenco, con il motivo (scritto anche nell'audit):
//   - Stilografica (regalo della cartoleria) e Stilografica (Yoshida) (dono di Yoshida al rango massimo, «Sblocca tecniche oratorie»): due
//     oggetti diversi, non un doppione;
//   - Distintivo dell'angelo ×2: le due righe dell'equipaggiamento restano finché l'abbinamento non è verificato in gioco (progetto, punto 18).
// Il Braccialetto d'argento (252) e le Gemme elementali (253) hanno le loro migrazioni; le righe che nominano più regali insieme la 251.
//
// Nessuna partita e nessuna voce del Diario cambia (le guardie di `unisciIdentita` lo verificano a ogni unione). Idempotente: un'identità
// già tolta non si tocca. Audit in `dati_guida.audit-250-identita-doppie`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { scriviAudit, unisciIdentita, type UnioneIdentita } from './identitaDoppie250.js';

const AUDIT = 'audit-250-identita-doppie';

/** L'elenco delle unioni (scritto e approvato con la decisione 21): `da` si toglie, `a` resta. */
export const UNIONI_250: readonly UnioneIdentita[] = [
  // ---- regali (RG-01, O5-03): la scheda della guida dei regali si unisce a quella con l'offerta del negozio
  { da: 'regalo/tartufi-al-cioccolato', a: 'regalo/tartufi', alias: ['Tartufi al cioccolato'], perche: 'stesso regalo del Taisho Store' },
  { da: 'regalo/pesi-da-polso-caviglia', a: 'regalo/pesi-da-polso', alias: ['Pesi da polso/caviglia'], perche: 'stesso regalo del Prossimo Asso' },
  { da: 'regalo/copertina-fodera-per-libro', a: 'regalo/copertina', alias: ['Fodera per libro'], perche: 'stessa Copertina di High Sense' },
  { da: 'regalo/copertina-per-libri', a: 'regalo/copertina', alias: ['Copertina per libri'], perche: 'stessa Copertina di High Sense' },
  { da: 'regalo/set-mascotte-locali', a: 'regalo/set-di-mascotte-locali', alias: ['Set mascotte locali'], perche: 'stesso regalo di Tokobushiya' },
  { da: 'regalo/bagno-di-rose-traduzione-non-ufficiale-en-bath-of-roses', a: 'regalo/bagno-di-rose', alias: ['Bath of Roses'], perche: 'stesso regalo del Fioraio Sukebe' },
  { da: 'regalo/profumo-di-design-en-designer-perfume', a: 'regalo/profumo-di-design', alias: ['Designer Perfume'], perche: 'stesso regalo del Body Chop' },
  { da: 'regalo/profumo-design', a: 'regalo/profumo-di-design', alias: ['Profumo design'], perche: 'stesso regalo del Body Chop' },
  { da: 'regalo/puzzle-3d-48-lati', a: 'regalo/puzzle-3d-a-48-lati', alias: ['Puzzle 3D 48 lati'], perche: 'stesso regalo di Mran Mran' },
  { da: 'regalo/set-di-aromi-pregiati', a: 'regalo/set-aromi-pregiati', alias: ['Set di aromi pregiati'], perche: 'stesso regalo del Body Chop' },
  { da: 'regalo/set-di-noodle-istantanei', a: 'regalo/set-noodle-istantanei', alias: ['Set di noodle istantanei'], perche: 'stesso regalo del Discount Rocinante' },
  { da: 'regalo/zuppa-di-noodle-istantanea-traduzione-non-ufficiale-en-cup-noodle-set', a: 'regalo/set-noodle-istantanei', alias: ['Zuppa di noodle istantanea', 'Cup Noodle Set'], perche: 'stesso Set noodle istantanei del Discount Rocinante' },
  { da: 'regalo/snack-confezione', a: 'regalo/snack', alias: [], perche: 'stesso regalo del Discount Rocinante' },
  { da: 'regalo/tazza-nera-traduzione-non-ufficiale-allgamestaff', a: 'regalo/tazza-nera', alias: [], perche: 'stesso regalo di Mran Mran' },
  { da: 'regalo/sveglia-rumorosa-traduzione-non-ufficiale-en-blaring-alarm-clock', a: 'regalo/sveglia-chiassosa', alias: ['Sveglia rumorosa', 'Blaring Alarm Clock'], perche: 'stesso regalo di Akindo (12.000 ¥)' },
  { da: 'regalo/puzzle-ring-anello-puzzle', a: 'regalo/anelli-intrecciati', alias: ['Puzzle Ring', 'Anello puzzle'], perche: 'stesso regalo di Mran Mran' },
  { da: 'regalo/spilla-da-idol-idol-pins', a: 'regalo/spille-idol', alias: ['Spilla da idol', 'Idol Pins'], perche: 'stesso regalo di Tokobushiya' },
  { da: 'regalo/diffusore-macchina-per-aromi-aroma-machine', a: 'regalo/diffusore-di-aromi', alias: ['Macchina per aromi', 'Aroma Machine'], perche: 'stesso regalo di Akindo (18.000 ¥)' },
  { da: 'regalo/cuscino-mochi-mochi-cushion', a: 'regalo/cuscino-mochi', alias: ['Mochi Cushion'], perche: 'stesso regalo di Mran Mran (6.500 ¥)' },
  // ---- altre identità doppie (O5-14): resta la scheda con la categoria della guida italiana
  { da: 'consumabile/homunculus-2', a: 'consumabile/homunculus', alias: [], perche: 'stesso Homunculus di Tanaka (la scheda tolta non aveva offerte)' },
  { da: 'accessorio/corona-della-salvezza', a: 'consumabile/corona-della-salvezza', alias: ['Crown of Salvation'], perche: 'la guida (Oggetti, Negozi speciali) la descrive come consumabile che cura le alterazioni e ripristina tutti gli HP degli alleati, 990.000 ¥ da Tanaka' },
  { da: 'accessorio/corona-della-salvezza-2', a: 'consumabile/corona-della-salvezza', alias: [], perche: 'stessa Corona della salvezza di Tanaka (990.000 ¥, grado Caos)' },
  { da: 'materiale/lente-condensante-2', a: 'materiale/lente-condensante', alias: [], perche: 'stessa Lente condensante (offerta nascosta di Tanaka)' },
  { da: 'regalo/crostatina-angelo', a: 'consumabile/crostatina-angelo', alias: [], perche: 'consumabile di cura nella pagina Oggetti' },
  { da: 'regalo/natto-rugiadoso', a: 'consumabile/natto-rugiadoso', alias: [], perche: 'consumabile di cura nella pagina Oggetti' },
  { da: 'regalo/olio-del-recupero', a: 'consumabile/olio-del-recupero', alias: [], perche: 'consumabile per le alterazioni nella pagina Oggetti' },
  { da: 'regalo/aroma-rinfrescante', a: 'consumabile/aroma-rinfrescante', alias: [], perche: 'consumabile per le alterazioni nella pagina Oggetti' },
  { da: 'materiale/razione-militare', a: 'consumabile/razione-militare', alias: [], perche: 'consumabile di battaglia nella pagina Oggetti' },
  { da: 'arma/kogatana-nera', a: 'materiale/kogatana-nera', alias: [], perche: 'materiale (Oggetti chiave e materiali; Negozi speciali: «spada che cambia forma»)' },
  { da: 'protezione/veste-nera', a: 'materiale/veste-nera', alias: [], perche: 'materiale (Oggetti chiave e materiali; Negozi speciali: «oggetto che cambia forma»)' },
  { da: 'arma/catena-di-perline', a: 'consumabile/catena-di-perline', alias: [], perche: 'consumabile che ripristina tutti gli HP degli alleati (pagina Oggetti)' },
  { da: 'arma/tessera-puntate-alte', a: 'chiave/tessera-puntate-alte', alias: [], perche: 'oggetto chiave del Palazzo di Niijima' },
  { da: 'altro/esperto-a-biliardo', a: 'libro/esperto-a-biliardo', alias: [], perche: 'stesso libro del Prossimo Asso' },
  { da: 'altro/la-fattorizzazione', a: 'libro/la-fattorizzazione', alias: [], perche: 'stesso libro del Mercante Sakai' },
  { da: 'altro/cesta-di-vestiti', a: 'chiave/cesta-di-vestiti', alias: [], perche: 'stessa Cesta di vestiti (Oggetti chiave): l’offerta di Akihabara a 8.000 ¥ passa alla scheda della guida' },
  { da: 'regalo/cesta-di-vestiti', a: 'chiave/cesta-di-vestiti', alias: [], perche: 'stessa Cesta di vestiti (Oggetti chiave): l’offerta a punti di Vestiti usati passa alla scheda della guida' },
];

/** Restano separate, con il motivo. */
export const FUORI_ELENCO_250 = [
  { chiavi: ['regalo/stilografica', 'chiave/stilografica-yoshida'], perche: 'due oggetti diversi: il regalo della cartoleria Mitsubachi e il dono di Yoshida al rango massimo («Sblocca tecniche oratorie»)' },
  { chiavi: ['accessorio/distintivo-dellangelo', 'accessorio/distintivo-dellangelo-2'], perche: 'due righe dell’equipaggiamento: restano finché l’abbinamento non è verificato in gioco' },
] as const;

export const migration250: Migration = {
  id: 250,
  name: 'identita_doppie_unite',
  up(db) {
    if (!db.inTransaction) throw new Error('250: manca la transazione della migrazione; nessuna modifica applicata.');
    for (const t of ['catalogo_oggetto', 'articolo', 'confidente_regalo', 'proposta_abbinamento', 'cestino', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 250, tabella: t }, 'tabella assente: identità doppie non unite'); return; }
    }
    const esiti = UNIONI_250.map((u) => ({ ...unisciIdentita(db, u), perche: u.perche }));
    for (const e of esiti.filter((x) => x.esito === 'ferma')) logger.warn({ migrazione: 250, da: e.da, a: e.a, motivo: e.motivo }, 'unione non applicata, lasciata com’è');
    // la Cesta di vestiti di Akihabara: l'offerta c'era già, su una scheda doppia; dopo l'unione si legge dalla scheda della guida
    const cesta = db.prepare("SELECT chiave, prezzo, nascosto, catalogo_chiave FROM main.articolo WHERE chiave = 'akiba/cesta-di-vestiti'").get() ?? null;
    const conteggi = {
      unite: esiti.filter((e) => e.esito === 'unita').length,
      giaUnite: esiti.filter((e) => e.esito === 'gia-unita').length,
      ferme: esiti.filter((e) => e.esito === 'ferma').length,
      proposteAggiornate: esiti.reduce((n, e) => n + (e.proposteAggiornate?.length ?? 0), 0),
    };
    scriviAudit(db, AUDIT, 250, { conteggi, esiti, fuoriElenco: FUORI_ELENCO_250, cestaAkihabara: cesta });
    logger.info({ migrazione: 250, ...conteggi }, 'Identità doppie del catalogo unite');
  },
};
