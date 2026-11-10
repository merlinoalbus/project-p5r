// ============================================================
// 349 — Shujin: ogni macchina ha la sua scorta (L2-03, lotto «Macchine e fine del listino condiviso»; risposta dell'utente a Q2: A)
// ============================================================
//
// La guida descrive due macchine nell'edificio, due nel cortile (quella a destra con la merce dell'edificio, non del cortile) e due al cancello. Tre pin
// nell'edificio più il 339 condividevano la scorta di un solo negozio. Per il piano (§3):
//   - 290 resta su `distributore-shujin-edificio`, la prima macchina;
//   - 291 passa a `distributore-shujin-edificio-2`, nuovo con offerte proprie (a 130 ¥ come le sorelle);
//   - 1759 è un terzo pin per due macchine: passa al luogo dell'edificio, senza macchina attribuita;
//   - 339 passa a `distributore-shujin-cancello-1`, reso visibile: l'indicazione dell'utente del 7/11 supera il nascondimento del 21/9;
//   - 1760 e 292 non cambiano; le 8 righe del registro della partita 1 restano sul cortile;
//   - `distributore-shujin-cortile-destra` è nuovo e senza pin, nel luogo del cortile, con l'assortimento dell'edificio.
//
// La 151 resta intatta: il suo risultato (339 sul listino dell'edificio) è il riferimento atteso, insieme al «nessun riferimento» di chi non l'ha applicata.
// Idempotente, con guardie per identità e riferimento atteso. Verbale: `dati_guida.audit-l2-03-macchine-shujin`. Non scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { chiaviNuove, creaPuntoVendita, fotografa, offerta, ripuntaPin, scriviVerbale, verificaFotografia, type EsitoL2, type NuovoPuntoVendita, type RegolaImpronta, type RiferimentoPin } from './attrezziL2.js';

const errore = (motivo: string): never => { throw new Error(`349: ${motivo}; nessuna modifica applicata.`); };

const EDIFICIO = 'distributore-shujin-edificio';
const EDIFICIO_2 = 'distributore-shujin-edificio-2';
const CORTILE = 'distributore-shujin-cortile';
const CORTILE_DESTRA = 'distributore-shujin-cortile-destra';
const CANCELLO_1 = 'distributore-shujin-cancello-1';
const LUOGO_EDIFICIO = 'shujin-academy/distributori-shujin';
const MAPPA_EDIFICIO = 'nativo-rmap-002-0-0';
const MAPPA_CANCELLO = 'nativo-rmap-002-1-0';
const PREZZO = 130;
const ASSORTIMENTO_EDIFICIO = ['second-maid', 'manta', 'earl-green'].map((b) => offerta(EDIFICIO, b, PREZZO));
const SULL_EDIFICIO: readonly RiferimentoPin[] = [['negozio', EDIFICIO]];

const REGOLE: readonly RegolaImpronta[] = [
  { tabella: 'luogo', senzaColonne: [] },
  { tabella: 'negozio', senzaColonne: ['nascosto', 'updated_at'] },
  { tabella: 'articolo', senzaColonne: [] },
  { tabella: 'spillo', senzaColonne: ['riferimento_tipo', 'riferimento_chiave', 'updated_at'] },
];

export const migration349: Migration = {
  id: 349,
  name: 'macchine_shujin',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!['luogo', 'negozio', 'articolo', 'spillo', 'cestino', 'dati_guida'].every((t) => esisteTabella(db, t))) return;

    const adesso = new Date().toISOString();
    const esiti: EsitoL2[] = [];
    const prima = fotografa(db, REGOLE);
    const sedeDi = (negozio: string): string | null => (db.prepare('SELECT sede_chiave FROM main.negozio WHERE chiave = ?').pluck().get(negozio) as string | null | undefined) ?? null;

    const nuovi: readonly NuovoPuntoVendita[] = [
      { chiave: EDIFICIO_2, nome: 'Distributore Edificio Scolastico (secondo)', sede: sedeDi(EDIFICIO), note: 'Edificio principale 1P.', righe: ASSORTIMENTO_EDIFICIO },
      { chiave: CORTILE_DESTRA, nome: 'Distributore del cortile (destra)', sede: sedeDi(CORTILE), righe: ASSORTIMENTO_EDIFICIO },
    ];
    for (const n of nuovi) creaPuntoVendita(db, adesso, n, esiti);

    // il cancello-1 torna visibile, poi il pin 339 ci va sopra
    const voce = `negozio ${CANCELLO_1} visibile`;
    const nascosto = db.prepare("SELECT nascosto FROM main.negozio WHERE chiave = ? AND tipo = 'distributore'").pluck().get(CANCELLO_1) as number | undefined;
    if (nascosto === undefined) esiti.push({ voce, esito: 'saltata', motivo: 'negozio assente' });
    else if (nascosto === 0) esiti.push({ voce, esito: 'gia-fatta' });
    else { db.prepare('UPDATE main.negozio SET nascosto = 0, updated_at = ? WHERE chiave = ? AND nascosto = 1').run(adesso, CANCELLO_1); esiti.push({ voce, esito: 'applicata' }); }

    ripuntaPin(db, adesso, { id: 291, uid: '74f0a5c4f60cb7473419ce0755f9d069', tipo: 'distributore', mappa: MAPPA_EDIFICIO, origine: 'utente', da: SULL_EDIFICIO, a: ['negozio', EDIFICIO_2] }, esiti);
    ripuntaPin(db, adesso, { id: 1759, uid: '9090382a626b0f350444647b4aed66fd', tipo: 'distributore', mappa: MAPPA_EDIFICIO, origine: 'utente', da: SULL_EDIFICIO, a: ['luogo', LUOGO_EDIFICIO] }, esiti);
    ripuntaPin(db, adesso, { id: 339, uid: '2f9a84fe407df45bcd1af8df57d39bea', tipo: 'distributore', mappa: MAPPA_CANCELLO, origine: 'utente', da: [['negozio', EDIFICIO], [null, null]], a: ['negozio', CANCELLO_1] }, esiti);

    const anomalia = verificaFotografia(db, REGOLE, prima, chiaviNuove(db, nuovi.map((n) => n.chiave), esiti));
    if (anomalia) errore(anomalia);
    if (scriviVerbale(db, 'audit-l2-03-macchine-shujin', 'L2-03 · 349', esiti)) logger.info({ migrazione: 'L2-03-349' }, 'Shujin: una scorta per macchina');
  },
};
