// ============================================================
// 386 — gli otto negozi di Shibuya aperti dal 18 aprile portano la data sul negozio (L6-09, residuo «un solo dove» della ROADMAP)
// ============================================================
//
// La Lotteria di Shibuya ha la data della guida («dal 18 aprile») nello sblocco del negozio (346); otto negozi di Shibuya la avevano invece ripetuta
// su ogni offerta, come prima condizione di `articolo.condizioni_json`: 37 Gradi Celsius, Big Bang Burger, Discount Rocinante, Farmacia Aohige,
// Fiorista Rafflesia, Libreria Taiheido, Prossimo Asso (la sua nota: «La guida data tutti gli articoli del negozio “da Lunedì 4/18”») e Triple
// Seven. Un dato, un punto di modifica: la data va in `negozio.sblocco_json` e la condizione `{ tipo: 'data', dal: '04-18' }` esce dalle offerte di
// quei negozi; le altre condizioni delle offerte restano identiche, nello stesso ordine. La Lotteria, che ha già la data sul negozio, la ripeteva
// ancora su tre offerte (`lotto-r`, `lotto-s`, `lotteria-gratta-e-vinci`): anche lì esce dalle offerte.
// La disponibilità non cambia: un'offerta si compra se il negozio è presente (sblocco e orari, `negoziService.condizioniPresenza`) e se valgono le sue
// condizioni, quindi «negozio dal 18/4 ∧ resto» = «offerta dal 18/4 ∧ resto». Gli esiti dei turni che puntano a un'offerta (le sfide della Big
// Bang Burger) leggono anche lo sblocco del negozio (`esitiAttivitaService.articoloEsito`, stesso cambiamento). Le offerte del Prossimo Asso senza
// la data (dal 5 giugno, dopo aver pescato o giocato a freccette) cadono comunque dopo il 18 aprile.
// Guardie: il negozio c'è, ha la sede a Shibuya e lo sblocco vuoto (o già questo); un'offerta si riscrive solo se ha la data e il JSON si legge.
// Verbale in `dati_guida.audit-l6-09-data-negozi-shibuya` (prima e dopo di ogni riga). Nessuna scrittura in `utente`. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { registraAudit } from './archivioL1.js';
import { diverseFuori, improntaPartite, righePerChiave } from './decisioniDati0111.js';

const AUDIT = 'audit-l6-09-data-negozi-shibuya';
const errore = (motivo: string): never => { throw new Error(`386: ${motivo}; nessuna modifica applicata.`); };

const NEGOZI = ['37-gradi-celsius', 'big-bang-burger', 'discount-rocinante', 'farmacia-aohige', 'fiorista-rafflesia', 'libreria-taiheido', 'prossimo-asso', 'triple-seven', 'lotteria-shibuya'] as const;
const SBLOCCO = JSON.stringify([{ tipo: 'data', dal: '04-18' }]);
const eLaData = (c: unknown): boolean => {
  if (typeof c !== 'object' || c === null || Array.isArray(c)) return false;
  const o = c as Record<string, unknown>;
  return Object.keys(o).length === 2 && o.tipo === 'data' && o.dal === '04-18';
};
const leggi = (json: string | null): unknown[] | null => {
  if (json === null) return null;
  try { const v: unknown = JSON.parse(json); return Array.isArray(v) ? v : null; } catch { return null; }
};

export const migration386: Migration = {
  id: 386,
  name: 'data_dei_negozi_di_shibuya',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'negozio') || !esisteTabella(db, 'articolo') || !esisteTabella(db, 'luogo') || !esisteTabella(db, 'dati_guida')) return;
    const colonne = (db.prepare('PRAGMA main.table_info(negozio)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('sblocco_json')) return;
    const adesso = new Date().toISOString();
    const negoziPrima = righePerChiave(db, 'negozio', ['chiave']);
    const articoliPrima = righePerChiave(db, 'articolo', ['chiave']);
    const partitePrima = improntaPartite(db);
    const toccatiNegozi = new Set<string>();
    const toccatiArticoli = new Set<string>();
    const esiti: Array<{ chiave: string; esito: string; prima?: unknown; dopo?: unknown }> = [];

    for (const chiave of NEGOZI) {
      const n = db.prepare('SELECT n.sblocco_json, l.quartiere_chiave FROM main.negozio n LEFT JOIN main.luogo l ON l.chiave = n.sede_chiave WHERE n.chiave = ?').get(chiave) as
        { sblocco_json: string | null; quartiere_chiave: string | null } | undefined;
      if (!n) { esiti.push({ chiave, esito: 'negozio assente' }); continue; }
      if (n.quartiere_chiave !== 'shibuya') { esiti.push({ chiave, esito: `sede fuori da Shibuya (${n.quartiere_chiave ?? 'nessuna'}): non toccato` }); continue; }
      const sblocco = leggi(n.sblocco_json);
      const giaSbloccato = sblocco !== null && sblocco.length === 1 && eLaData(sblocco[0]);
      const vuoto = n.sblocco_json === null || (sblocco !== null && sblocco.length === 0);
      if (!giaSbloccato && !vuoto) { esiti.push({ chiave, esito: 'sblocco già diverso: non toccato', prima: n.sblocco_json }); continue; }
      const offerte = db.prepare('SELECT chiave, condizioni_json FROM main.articolo WHERE negozio_chiave = ? ORDER BY ordine, chiave').all(chiave) as Array<{ chiave: string; condizioni_json: string | null }>;
      const illeggibili = offerte.filter((o) => o.condizioni_json !== null && leggi(o.condizioni_json) === null);
      if (illeggibili.length) { esiti.push({ chiave, esito: `condizioni illeggibili in ${illeggibili.map((o) => o.chiave).join(', ')}: non toccato` }); continue; }
      const daTogliere = offerte.filter((o) => (leggi(o.condizioni_json) ?? []).some(eLaData));
      if (giaSbloccato && daTogliere.length === 0) { esiti.push({ chiave, esito: 'già fatto' }); continue; }
      if (!giaSbloccato) {
        if (db.prepare('UPDATE main.negozio SET sblocco_json = ?, updated_at = ? WHERE chiave = ?').run(SBLOCCO, adesso, chiave).changes !== 1) errore(`il negozio ${chiave} non si aggiorna`);
        toccatiNegozi.add(chiave);
        esiti.push({ chiave, esito: 'data sul negozio', prima: n.sblocco_json, dopo: SBLOCCO });
      }
      for (const o of daTogliere) {
        const dopo = JSON.stringify((leggi(o.condizioni_json) ?? []).filter((c) => !eLaData(c)));
        if (db.prepare('UPDATE main.articolo SET condizioni_json = ?, updated_at = ? WHERE chiave = ? AND condizioni_json = ?').run(dopo, adesso, o.chiave, o.condizioni_json).changes !== 1) errore(`l'offerta ${o.chiave} non si aggiorna`);
        toccatiArticoli.add(o.chiave);
        esiti.push({ chiave: o.chiave, esito: 'data tolta dall’offerta', prima: o.condizioni_json, dopo });
      }
    }

    const fuori = [
      ...diverseFuori(negoziPrima, righePerChiave(db, 'negozio', ['chiave']), toccatiNegozi).map((k) => `negozio ${k}`),
      ...diverseFuori(articoliPrima, righePerChiave(db, 'articolo', ['chiave']), toccatiArticoli).map((k) => `articolo ${k}`),
    ];
    if (fuori.length) errore(`righe cambiate fuori dall'elenco: ${fuori.slice(0, 5).join(', ')}`);
    if (improntaPartite(db) !== partitePrima) errore('le tabelle delle partite sono cambiate');
    if (toccatiNegozi.size || toccatiArticoli.size) registraAudit(db, AUDIT, { migrazione: 386, il: adesso, negozi: toccatiNegozi.size, offerte: toccatiArticoli.size, esiti });
    logger.info({ migrazione: 386, negozi: toccatiNegozi.size, offerte: toccatiArticoli.size }, 'data del 18 aprile sui negozi di Shibuya');
  },
};
