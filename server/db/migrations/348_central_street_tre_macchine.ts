// ============================================================
// 348 — Central Street: tre macchine con le loro offerte (L2-02, lotto «Macchine e fine del listino condiviso»)
// ============================================================
//
// La soluzione della settimana 2 descrive «tre distributori automatici, uno accanto all'altro», e uno solo con merce nuova (Nastea, 1UP, Starvicks, Durian au
// lait). Fino a qui i pin 1527, 1768 e 1769 rimandavano ai listini della Shujin e di Yongen, con una sede aggiuntiva: ora ogni macchina ha righe proprie e
// la sua scorta. Assortimenti: edificio (3), cancello-2 (4), tabaccaio più Durian au lait (4), tutti a 130 ¥ (guida, pagina Oggetti e soluzione). Durian è
// nel catalogo (`consumabile/durian-au-lait`) e la sua riga di origine è quella del sottopasso.
//
// La data: «Central Street, Shibuya (da Lunedì 4/18)» la guida (pagina Oggetti, righe di Second Maid, Earl Green, Manta, Acqua di Udagawa, Joylent, Punch, Tè
// energetico, e anche Nastea, 1UP, Starvicks, Durian au lait) la dà per tutti gli undici prodotti: è la data delle macchine, e sta in un punto solo,
// `negozio.sblocco_json`. Le condizioni delle offerte restano identiche a quelle delle righe di origine.
//
// I pin si ripuntano con la guardia per identità e riferimento atteso (uid invariati). Ogni pin ripuntato perde la riga di `negozio_sede_spillo` e la sede
// aggiuntiva in `negozio_luogo_extra`: tenute, il listino di Aoyama e di Yongen continuerebbe a vendere a Shibuya accanto alla macchina nuova. Le righe
// tolte sono nel verbale. Il pin si ripunta sempre: gli acquisti del registro che citano la sede aggiuntiva restano sull'offerta d'origine, che ne porta la scorta,
// e il verbale ne dice il numero (un pin lasciato indietro resterebbe su un negozio di un'altra Area, e nessuno ritenterebbe). `cosa_offre` perde «Bevande dei listini condivisi».
// Idempotente. Verbale: `dati_guida.audit-l2-02-central-street`. Non scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { acquistiNellaSede, chiaviNuove, creaPuntoVendita, fotografa, offerta, ripuntaPin, riscriviCosaOffre, scriviVerbale, togliSedeAggiuntiva, verificaFotografia, type EsitoL2, type NuovoPuntoVendita, type RegolaImpronta, type SedeTolta } from './attrezziL2.js';

const errore = (motivo: string): never => { throw new Error(`348: ${motivo}; nessuna modifica applicata.`); };

const LUOGO = 'shibuya/distributori-central-street';
const AREA = 'citta/shibuya/central-street';
const MAPPA = 'nativo-rmap-001-3-0';
const PREZZO = 130;
const DAL_18_APRILE = [{ tipo: 'data', dal: '04-18' }] as const;
const EDIFICIO = 'distributore-shujin-edificio';
const CANCELLO = 'distributore-shujin-cancello-2';
const TABACCAIO = 'distributore-yongen-tabaccaio';
const SOTTOPASSO = 'distributore-shibuya-sottopasso';

const MACCHINE: ReadonlyArray<NuovoPuntoVendita & { pin: { id: number; uid: string; da: string } }> = [
  { chiave: 'distributore-shibuya-central-street-1', nome: 'Distributore di Central Street (primo)', sede: LUOGO, sblocco: DAL_18_APRILE,
    righe: ['second-maid', 'manta', 'earl-green'].map((b) => offerta(EDIFICIO, b, PREZZO)),
    pin: { id: 1527, uid: '446c772e697f3e8a35b1a6940ec11e92', da: EDIFICIO } },
  { chiave: 'distributore-shibuya-central-street-2', nome: 'Distributore di Central Street (secondo)', sede: LUOGO, sblocco: DAL_18_APRILE,
    righe: ['joylent', 'punch-non-filtrato', 'te-energetico', 'acqua-di-udagawa'].map((b) => offerta(CANCELLO, b, PREZZO)),
    pin: { id: 1768, uid: '2d486eff82f9423f1496e0e308155ed1', da: CANCELLO } },
  { chiave: 'distributore-shibuya-central-street-3', nome: 'Distributore di Central Street (terzo)', sede: LUOGO, sblocco: DAL_18_APRILE,
    righe: [...['nastea', '1up', 'starvicks'].map((b) => offerta(TABACCAIO, b, PREZZO)), offerta(SOTTOPASSO, 'durian-au-lait', PREZZO)],
    pin: { id: 1769, uid: '75f4f19ca61a45e7098db063cd8c0209', da: TABACCAIO } },
];

const REGOLE: readonly RegolaImpronta[] = [
  { tabella: 'luogo', senzaColonne: ['cosa_offre', 'updated_at'], conFotografiaDi: [LUOGO] },
  { tabella: 'negozio', senzaColonne: [] },
  { tabella: 'articolo', senzaColonne: [] },
  { tabella: 'spillo', senzaColonne: ['riferimento_tipo', 'riferimento_chiave', 'descrizione', 'updated_at'] },
];

export const migration348: Migration = {
  id: 348,
  name: 'central_street_tre_macchine',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!['luogo', 'negozio', 'articolo', 'spillo', 'cestino', 'dati_guida', 'negozio_sede_spillo', 'negozio_luogo_extra'].every((t) => esisteTabella(db, t))) return;

    const adesso = new Date().toISOString();
    const esiti: EsitoL2[] = [];
    const sedeOk = db.prepare("SELECT 1 FROM main.luogo WHERE chiave = ? AND area_chiave = ? AND tipo = 'distributore' AND nascosto = 0").get(LUOGO, AREA);
    if (!sedeOk) {
      esiti.push({ voce: `luogo ${LUOGO}`, esito: 'saltata', motivo: 'sede assente, nascosta o con un\'altra Area' });
      scriviVerbale(db, 'audit-l2-02-central-street', 'L2-02 · 348', esiti);
      return;
    }

    const prima = fotografa(db, REGOLE);
    const sediTolte: SedeTolta[] = [];
    const acquistiCitati: Record<string, number> = {};
    for (const m of MACCHINE) {
      creaPuntoVendita(db, adesso, m, esiti);
      const citati = acquistiNellaSede(db, m.pin.da, LUOGO);
      if (citati > 0) { acquistiCitati[m.pin.da] = citati; logger.warn({ migrazione: 'L2-02-348', offertaDOrigine: m.pin.da, sede: LUOGO, righe: citati }, 'acquisti del registro nella sede aggiuntiva: restano sull’offerta d’origine'); }
      const esito = ripuntaPin(db, adesso, { id: m.pin.id, uid: m.pin.uid, tipo: 'distributore', mappa: MAPPA, origine: 'utente', da: [['negozio', m.pin.da]], a: ['negozio', m.chiave] }, esiti);
      if (esito === 'applicata') { const tolta = togliSedeAggiuntiva(db, m.pin.uid, m.pin.da, LUOGO); if (tolta) sediTolte.push(tolta); }
    }
    riscriviCosaOffre(db, adesso, 'L2-02 · 348', LUOGO, 'Bevande dei listini condivisi', '', esiti);

    const anomalia = verificaFotografia(db, REGOLE, prima, chiaviNuove(db, MACCHINE.map((m) => m.chiave), esiti));
    if (anomalia) errore(anomalia);
    if (scriviVerbale(db, 'audit-l2-02-central-street', 'L2-02 · 348', esiti, { sediTolte, acquistiCitati })) logger.info({ migrazione: 'L2-02-348', sediTolte: sediTolte.length }, 'Central Street: tre macchine con offerte proprie');
  },
};
