// ============================================================
// 347 — Shujin: un luogo dei distributori per ogni Area (L2-01, lotto «Macchine e fine del listino condiviso»)
// ============================================================
//
// `shujin-academy/distributori-shujin` non ha un'Area e ospita macchine che stanno in posti diversi. Le Aree si leggono dalle planimetrie dei pin (290, 291,
// 292 e 1759 sull'edificio 1P, 339 e 1760 sul cancello): sono due, perché il cortile (pin 292) sta sulla stessa planimetria dell'edificio e non è un'Area.
// La chiave attuale resta alla prima Area (per `area.ordine`, l'edificio) e continua a valere ovunque sia citata; per l'altra nasce un luogo nuovo.
//
// COSA: (1) il luogo attuale riceve la prima Area; (2) per ogni altra Area un luogo nuovo, `shujin-academy/distributori-shujin-<slug dell'Area>`; (3) ogni negozio
// va nel luogo dell'Area del suo pin (edificio e cortile restano nel luogo attuale, i due del cancello passano al nuovo); (4) un pin di tipo luogo su una
// planimetria dell'altra Area segue il suo luogo (oggi nessuno); (5) `cosa_offre` del luogo attuale non dice più che al suo interno ci sono le macchine del cancello.
//
// La scorta del cortile non cambia: il negozio resta nella stessa sede, e le righe del registro con `sede_chiave` NULL valgono la sede del negozio
// (la scorta è dell'offerta, e l'offerta ha una sola sede). Per lo stesso motivo una sede scritta nel registro non ferma lo spostamento.
// «Ripristina» riscrive dalla fotografia: `seed_json` dei negozi spostati riceve la sede nuova, e quella del luogo l'Area (se ha il campo) e il testo nuovo.
//
// Idempotente; ogni parte controlla identità e valore atteso. Verbale: `dati_guida.audit-l2-01-shujin-un-luogo-per-area`. Non scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { FONTE_DISTRIBUTORI, allineaFotografia, fotografa, riscriviCosaOffre, scriviVerbale, verificaFotografia, type EsitoL2, type RegolaImpronta } from './attrezziL2.js';

const errore = (motivo: string): never => { throw new Error(`347: ${motivo}; nessuna modifica applicata.`); };

const LUOGO = 'shujin-academy/distributori-shujin';
const QUARTIERE = 'shujin-academy';
const COSA_OFFRE_ATTESA = '2 distributori nell\'edificio principale (Second Maid, Manta, Earl Green a 130¥), 1 nel cortile (Dr. Salt NEO 210¥, Arginade, Acqua della rinascita 300¥), 2 al cancello della scuola.';
const COSA_OFFRE_NUOVA = 'Distributori dell\'edificio principale e del cortile.';

/** Il pin che dice dove sta ogni negozio. 339 oggi punta all'edificio (151), ma è la macchina del cancello: lo ripunta la 349. */
const NEGOZI: ReadonlyArray<{ negozio: string; pin: number; uid: string }> = [
  { negozio: 'distributore-shujin-edificio', pin: 290, uid: 'e17a163617a1f2aa33fa4bdb3952aefd' },
  { negozio: 'distributore-shujin-cortile', pin: 292, uid: '4f09aeb32069759f1d62f21dac842bba' },
  { negozio: 'distributore-shujin-cancello-1', pin: 339, uid: '2f9a84fe407df45bcd1af8df57d39bea' },
  { negozio: 'distributore-shujin-cancello-2', pin: 1760, uid: '74cd274bb517240d82ccbf4b40c3ebb3' },
];
/** Gli altri pin delle macchine Shujin: contano per il numero delle Aree, senza dire dove sta un negozio. */
const ALTRI_PIN: ReadonlyArray<{ pin: number; uid: string }> = [
  { pin: 291, uid: '74f0a5c4f60cb7473419ce0755f9d069' },
  { pin: 1759, uid: '9090382a626b0f350444647b4aed66fd' },
];

const NOME_PER_SLUG: Readonly<Record<string, string>> = { 'cancello-della-scuola': 'Distributori del cancello della scuola' };

const REGOLE: readonly RegolaImpronta[] = [
  { tabella: 'luogo', senzaColonne: ['area_chiave', 'cosa_offre', 'updated_at'], conFotografiaDi: [LUOGO] },
  { tabella: 'negozio', senzaColonne: ['sede_chiave', 'updated_at'], conFotografiaDi: NEGOZI.map((n) => n.negozio) },
  { tabella: 'articolo', senzaColonne: [] },
  { tabella: 'spillo', senzaColonne: ['riferimento_chiave', 'descrizione', 'updated_at'] },
];

interface AreaPin { chiave: string; slug: string; nome: string; ordine: number }

export const migration347: Migration = {
  id: 347,
  name: 'shujin_un_luogo_per_area',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!['luogo', 'negozio', 'spillo', 'area', 'mappa', 'cestino', 'dati_guida'].every((t) => esisteTabella(db, t))) return;

    const adesso = new Date().toISOString();
    const esiti: EsitoL2[] = [];
    const prima = fotografa(db, REGOLE);
    const areaDelPin = db.prepare(`SELECT a.chiave, a.slug, a.nome, a.ordine FROM main.spillo s JOIN main.mappa m ON m.chiave = s.mappa_chiave JOIN main.area a ON a.chiave = m.area_chiave
      WHERE s.id = ? AND s.uid = ? AND a.quartiere_chiave = ?`);
    const areaDi = (pin: number, uid: string): AreaPin | undefined => areaDelPin.get(pin, uid, QUARTIERE) as AreaPin | undefined;

    const aree = new Map<string, AreaPin>();
    for (const { pin, uid } of [...NEGOZI, ...ALTRI_PIN]) {
      const a = areaDi(pin, uid);
      if (a) aree.set(a.chiave, a); else esiti.push({ voce: `pin ${pin}`, esito: 'saltata', motivo: 'pin assente, con un altro uid o fuori dalle Aree della Shujin' });
    }
    const ordinate = [...aree.values()].sort((x, y) => x.ordine - y.ordine || x.chiave.localeCompare(y.chiave));
    const primaArea = ordinate[0];
    const luogo = db.prepare('SELECT tipo, quartiere_chiave, area_chiave FROM main.luogo WHERE chiave = ?').get(LUOGO) as { tipo: string; quartiere_chiave: string; area_chiave: string | null } | undefined;

    const motivoStop = !primaArea ? 'nessuna Area dai pin' : !luogo ? 'luogo assente' : luogo.tipo !== 'distributore' || luogo.quartiere_chiave !== QUARTIERE ? 'il luogo non è più quello atteso'
      : luogo.area_chiave !== null && luogo.area_chiave !== primaArea.chiave ? `il luogo ha già un'altra Area: ${luogo.area_chiave}` : null;
    if (!primaArea || motivoStop) {
      esiti.push({ voce: `luogo ${LUOGO}`, esito: 'saltata', motivo: motivoStop ?? 'nessuna Area' });
      scriviVerbale(db, 'audit-l2-01-shujin-un-luogo-per-area', 'L2-01 · 347', esiti);
      logger.warn({ migrazione: 'L2-01-347', motivo: motivoStop }, 'luoghi dei distributori della Shujin non divisi');
      return;
    }

    // (1) la chiave attuale alla prima Area
    if (luogo?.area_chiave === primaArea.chiave) esiti.push({ voce: `Area di ${LUOGO}`, esito: 'gia-fatta' });
    else {
      db.prepare('UPDATE main.luogo SET area_chiave = ?, updated_at = ? WHERE chiave = ? AND area_chiave IS NULL').run(primaArea.chiave, adesso, LUOGO);
      allineaFotografia(db, 'luogo', LUOGO, 'area_chiave', null, primaArea.chiave, esiti);
      esiti.push({ voce: `Area di ${LUOGO}`, esito: 'applicata', motivo: primaArea.chiave });
    }

    // (2) un luogo per ogni altra Area
    const luogoDellArea = new Map<string, string>([[primaArea.chiave, LUOGO]]);
    const creati: string[] = [];
    for (const a of ordinate.slice(1)) {
      const chiave = `${LUOGO}-${a.slug}`;
      const voce = `luogo ${chiave}`;
      const esistente = db.prepare('SELECT area_chiave FROM main.luogo WHERE chiave = ?').get(chiave) as { area_chiave: string | null } | undefined;
      if (esistente) {
        if (esistente.area_chiave === a.chiave) { luogoDellArea.set(a.chiave, chiave); esiti.push({ voce, esito: 'gia-fatta' }); } else esiti.push({ voce, esito: 'saltata', motivo: `esiste con l'Area ${esistente.area_chiave}` });
        continue;
      }
      if (db.prepare("SELECT 1 FROM main.cestino WHERE tipo = 'luogo' AND chiave = ?").get(chiave)) { esiti.push({ voce, esito: 'saltata', motivo: 'nel Cestino' }); continue; }
      const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.luogo WHERE quartiere_chiave = ?').pluck().get(QUARTIERE) as number;
      db.prepare(`INSERT INTO main.luogo (chiave, quartiere_chiave, ordine, tipo, nome, cosa_offre, area_chiave, condizioni_json, fonte, verificato, origine, updated_at)
        VALUES (?, ?, ?, 'distributore', ?, '', ?, '[]', ?, 1, 'seed', ?)`).run(chiave, QUARTIERE, ordine, NOME_PER_SLUG[a.slug] ?? `Distributori: ${a.nome}`, a.chiave, FONTE_DISTRIBUTORI, adesso);
      luogoDellArea.set(a.chiave, chiave);
      creati.push(chiave);
      esiti.push({ voce, esito: 'applicata' });
    }

    // (3) i negozi nella sede della loro Area
    for (const n of NEGOZI) {
      const voce = `sede di ${n.negozio}`;
      const area = areaDi(n.pin, n.uid);
      const sede = area ? luogoDellArea.get(area.chiave) : undefined;
      const attuale = db.prepare('SELECT sede_chiave FROM main.negozio WHERE chiave = ?').pluck().get(n.negozio) as string | null | undefined;
      if (!sede) { esiti.push({ voce, esito: 'saltata', motivo: 'Area del pin o suo luogo non disponibili' }); continue; }
      if (attuale === sede) { esiti.push({ voce, esito: 'gia-fatta' }); continue; }
      if (attuale !== LUOGO) { esiti.push({ voce, esito: 'saltata', motivo: `sede non attesa: ${attuale ?? 'nessuna'}` }); continue; }
      db.prepare('UPDATE main.negozio SET sede_chiave = ?, updated_at = ? WHERE chiave = ? AND sede_chiave = ?').run(sede, adesso, n.negozio, LUOGO);
      allineaFotografia(db, 'negozio', n.negozio, 'sede_chiave', LUOGO, sede, esiti);
      esiti.push({ voce, esito: 'applicata', motivo: sede });
    }

    // (4) i pin di tipo luogo seguono il luogo della loro Area
    for (const [area, chiave] of luogoDellArea) {
      if (chiave === LUOGO) continue;
      const pin = db.prepare(`SELECT s.id FROM main.spillo s JOIN main.mappa m ON m.chiave = s.mappa_chiave WHERE s.riferimento_tipo = 'luogo' AND s.riferimento_chiave = ? AND m.area_chiave = ? ORDER BY s.id`).pluck().all(LUOGO, area) as number[];
      for (const id of pin) {
        db.prepare(`UPDATE main.spillo SET riferimento_chiave = ?, updated_at = CASE WHEN origine = 'utente' THEN ? ELSE updated_at END WHERE id = ? AND riferimento_tipo = 'luogo' AND riferimento_chiave = ?`).run(chiave, adesso, id, LUOGO);
        esiti.push({ voce: `pin ${id} → luogo:${chiave}`, esito: 'applicata' });
      }
    }

    // (5) il testo del luogo, che elencava anche le macchine del cancello
    riscriviCosaOffre(db, adesso, 'L2-01 · 347', LUOGO, COSA_OFFRE_ATTESA, COSA_OFFRE_NUOVA, esiti);

    const anomalia = verificaFotografia(db, REGOLE, prima, new Set(creati));
    if (anomalia) errore(anomalia);
    const dettagli = { aree: ordinate.map((a) => a.chiave), numeroAree: ordinate.length, luoghi: Object.fromEntries(luogoDellArea) };
    if (scriviVerbale(db, 'audit-l2-01-shujin-un-luogo-per-area', 'L2-01 · 347', esiti, dettagli)) logger.info({ migrazione: 'L2-01-347', ...dettagli }, 'Shujin: un luogo dei distributori per Area');
  },
};
