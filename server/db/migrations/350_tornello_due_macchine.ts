// ============================================================
// 350 — Tornello della linea Ginza: due macchine con le loro offerte (L2-04, lotto «Macchine e fine del listino condiviso»; risposta dell'utente a Q3)
// ============================================================
//
// «Tornello Ginza ha i due distributori diversi che contengono gli stessi elementi dei distributori degli altri quartieri (e non c'è niente da verificare)».
// Due punti vendita con offerte proprie, uguali ai listini che i pin mostrano oggi: 1547 l'edificio della Shujin, 1548 il tabaccaio di Yongen (senza Durian au
// lait, che è della macchina di Central Street). I prezzi sono quelli delle righe di oggi; le offerte perdono solo il segno `daVerificare` del
// rifornimento, se la riga di origine lo porta: per l'utente qui non c'è niente da verificare, e la regola (lunedì, pezzi, caldo) resta quella.
// Il pin 1547 perde la riga di `negozio_sede_spillo` e la sede aggiuntiva (vedi la 348); il 1548 non le aveva. I pin si ripuntano sempre: gli acquisti del registro
// che citano la sede restano sull'offerta d'origine e il verbale ne dice il numero. `cosa_offre` perde «Bevande dei listini condivisi».
// Idempotente, con guardie per identità e riferimento atteso. Verbale: `dati_guida.audit-l2-04-tornello`. Non scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { acquistiNellaSede, chiaviNuove, creaPuntoVendita, fotografa, offerteVisibili, ripuntaPin, riscriviCosaOffre, scriviVerbale, togliSedeAggiuntiva, verificaFotografia, type EsitoL2, type RegolaImpronta, type SedeTolta } from './attrezziL2.js';

const errore = (motivo: string): never => { throw new Error(`350: ${motivo}; nessuna modifica applicata.`); };

const LUOGO = 'shibuya/distributore-tornello-ginza';
const AREA = 'citta/shibuya/tornello-della-linea-ginza';
const MAPPA = 'nativo-rmap-001-5-0';
const MACCHINE = [
  { chiave: 'distributore-shibuya-tornello-1', nome: 'Distributore del tornello (primo)', listino: 'distributore-shujin-edificio', pin: { id: 1547, uid: '893abd4c6a3c5d10312ec59ce8364505' } },
  { chiave: 'distributore-shibuya-tornello-2', nome: 'Distributore del tornello (secondo)', listino: 'distributore-yongen-tabaccaio', pin: { id: 1548, uid: 'a0263bf91fdec589ad92bda73db21676' } },
] as const;

const REGOLE: readonly RegolaImpronta[] = [
  { tabella: 'luogo', senzaColonne: ['cosa_offre', 'updated_at'], conFotografiaDi: [LUOGO] },
  { tabella: 'negozio', senzaColonne: [] },
  { tabella: 'articolo', senzaColonne: [] },
  { tabella: 'spillo', senzaColonne: ['riferimento_tipo', 'riferimento_chiave', 'descrizione', 'updated_at'] },
];

export const migration350: Migration = {
  id: 350,
  name: 'tornello_due_macchine',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!['luogo', 'negozio', 'articolo', 'spillo', 'cestino', 'dati_guida', 'negozio_sede_spillo', 'negozio_luogo_extra'].every((t) => esisteTabella(db, t))) return;

    const adesso = new Date().toISOString();
    const esiti: EsitoL2[] = [];
    if (!db.prepare("SELECT 1 FROM main.luogo WHERE chiave = ? AND area_chiave = ? AND tipo = 'distributore' AND nascosto = 0").get(LUOGO, AREA)) {
      esiti.push({ voce: `luogo ${LUOGO}`, esito: 'saltata', motivo: 'sede assente, nascosta o con un\'altra Area' });
      scriviVerbale(db, 'audit-l2-04-tornello', 'L2-04 · 350', esiti);
      return;
    }

    const prima = fotografa(db, REGOLE);
    const sediTolte: SedeTolta[] = [];
    const acquistiCitati: Record<string, number> = {};
    for (const m of MACCHINE) {
      creaPuntoVendita(db, adesso, { chiave: m.chiave, nome: m.nome, sede: LUOGO, righe: offerteVisibili(db, m.listino), senzaDaVerificare: true }, esiti);
      const citati = acquistiNellaSede(db, m.listino, LUOGO);
      if (citati > 0) { acquistiCitati[m.listino] = citati; logger.warn({ migrazione: 'L2-04-350', offertaDOrigine: m.listino, sede: LUOGO, righe: citati }, 'acquisti del registro nella sede aggiuntiva: restano sull’offerta d’origine'); }
      const esito = ripuntaPin(db, adesso, { id: m.pin.id, uid: m.pin.uid, tipo: 'distributore', mappa: MAPPA, origine: 'utente', da: [['negozio', m.listino]], a: ['negozio', m.chiave] }, esiti);
      if (esito === 'applicata') { const tolta = togliSedeAggiuntiva(db, m.pin.uid, m.listino, LUOGO); if (tolta) sediTolte.push(tolta); }
    }
    riscriviCosaOffre(db, adesso, 'L2-04 · 350', LUOGO, 'Bevande dei listini condivisi', '', esiti);

    const anomalia = verificaFotografia(db, REGOLE, prima, chiaviNuove(db, MACCHINE.map((m) => m.chiave), esiti));
    if (anomalia) errore(anomalia);
    if (scriviVerbale(db, 'audit-l2-04-tornello', 'L2-04 · 350', esiti, { sediTolte, acquistiCitati })) logger.info({ migrazione: 'L2-04-350', sediTolte: sediTolte.length }, 'Tornello: due macchine con offerte proprie');
  },
};
