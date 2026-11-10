// ============================================================
// 351 — Shinjuku: tre macchine con i prodotti della prosa (L2-05, lotto «Macchine e fine del listino condiviso»; risposta dell'utente a Q4: A)
// ============================================================
//
// `shinjuku/distributori-shinjuku` non ha negozi: la sua prosa dice «uno con Second Maid, Manta, Earl Green e Ultimate Amazake; due con Dr. Salt NEO, Arginade
// e Acqua della rinascita». Tre punti vendita con quei prodotti, in «Quartiere a luci rosse (da Martedì 6/21)» (guida, pagina Oggetti): la data sta in un punto
// solo, `negozio.sblocco_json`.
// Prezzi: Second Maid, Manta, Earl Green 130 ¥; Dr. Salt NEO 210 ¥; Amazake definitivo 210 ¥ (`consumabile/amazake-definitivo`, unica offerta e unico prezzo
// della guida). Arginade e Acqua della rinascita costano «100 ¥ / 300 ¥» senza dire su quale macchina (guida, Oggetti, e rapporto K, C4): `prezzo` NULL, col
// motivo in `articolo.nota`. Nessun prezzo inventato (DECISIONI, dati non decidibili).
//
// I pin 1564-1566 restano sul luogo. La prosa stessa dice «Le fonti non dicono quale pin sia quale macchina», la guida non li distingue (Oggetti, Distributori,
// soluzioni delle settimane) e le posizioni non aiutano: uno dei tre vende cose diverse dagli altri due, e assegnarli per ordine direbbe al giocatore che
// lì trova una merce che forse non c'è. Il luogo è il riferimento più specifico noto (AD3, come i pin di Akihabara): la sua pagina mostra le tre macchine,
// e il pin lo si punta dall'editor dopo averlo visto in gioco. Il motivo è nel verbale.
// Idempotente. Verbale: `dati_guida.audit-l2-05-shinjuku`. Non scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { chiaviNuove, creaPuntoVendita, fotografa, offerta, scriviVerbale, verificaFotografia, type EsitoL2, type NuovoPuntoVendita, type RegolaImpronta } from './attrezziL2.js';

const errore = (motivo: string): never => { throw new Error(`351: ${motivo}; nessuna modifica applicata.`); };

const LUOGO = 'shinjuku/distributori-shinjuku';
const AREA = 'citta/shinjuku/quartiere-a-luci-rosse';
const DAL_21_GIUGNO = [{ tipo: 'data', dal: '06-21' }] as const;
const PREZZO_INCERTO = 'La guida dà 100 ¥ o 300 ¥ senza dire su quale macchina.';
const EDIFICIO = 'distributore-shujin-edificio';
const CORTILE = 'distributore-shujin-cortile';

const ASSORTIMENTO_B = [offerta(CORTILE, 'dr-salt-neo', 210), offerta(CORTILE, 'arginade', null, PREZZO_INCERTO), offerta(CORTILE, 'acqua-della-rinascita', null, PREZZO_INCERTO)];
const MACCHINE: readonly NuovoPuntoVendita[] = [
  { chiave: 'distributore-shinjuku-1', nome: 'Distributore di Shinjuku (primo)', sede: LUOGO, sblocco: DAL_21_GIUGNO,
    righe: [...['second-maid', 'manta', 'earl-green'].map((b) => offerta(EDIFICIO, b, 130)), offerta('distributore-akihabara-1', 'amazake-definitivo', 210)] },
  { chiave: 'distributore-shinjuku-2', nome: 'Distributore di Shinjuku (secondo)', sede: LUOGO, sblocco: DAL_21_GIUGNO, righe: ASSORTIMENTO_B },
  { chiave: 'distributore-shinjuku-3', nome: 'Distributore di Shinjuku (terzo)', sede: LUOGO, sblocco: DAL_21_GIUGNO, righe: ASSORTIMENTO_B },
];

const MOTIVO_PIN = 'Le fonti non dicono quale pin sia quale macchina: i pin 1564-1566 restano sul luogo (AD3, DECISIONI: dati non decidibili).';

const REGOLE: readonly RegolaImpronta[] = [
  { tabella: 'luogo', senzaColonne: [] },
  { tabella: 'negozio', senzaColonne: [] },
  { tabella: 'articolo', senzaColonne: [] },
  { tabella: 'spillo', senzaColonne: [] },
];

export const migration351: Migration = {
  id: 351,
  name: 'shinjuku_tre_macchine',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!['luogo', 'negozio', 'articolo', 'cestino', 'dati_guida', 'spillo'].every((t) => esisteTabella(db, t))) return;

    const esiti: EsitoL2[] = [];
    if (!db.prepare("SELECT 1 FROM main.luogo WHERE chiave = ? AND area_chiave = ? AND tipo = 'distributore' AND nascosto = 0").get(LUOGO, AREA)) {
      esiti.push({ voce: `luogo ${LUOGO}`, esito: 'saltata', motivo: 'sede assente, nascosta o con un\'altra Area' });
      scriviVerbale(db, 'audit-l2-05-shinjuku', 'L2-05 · 351', esiti);
      return;
    }

    const prima = fotografa(db, REGOLE);
    const adesso = new Date().toISOString();
    for (const m of MACCHINE) creaPuntoVendita(db, adesso, m, esiti);

    const anomalia = verificaFotografia(db, REGOLE, prima, chiaviNuove(db, MACCHINE.map((m) => m.chiave), esiti));
    if (anomalia) errore(anomalia);
    if (scriviVerbale(db, 'audit-l2-05-shinjuku', 'L2-05 · 351', esiti, { pinNonAttribuiti: MOTIVO_PIN })) logger.info({ migrazione: 'L2-05-351' }, 'Shinjuku: tre macchine con i prodotti della prosa');
  },
};
