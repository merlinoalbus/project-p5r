// ============================================================
// Migrazione 248 — due offerte secondo l'Elenco dei negozi: la seconda dell'Incenso del risveglio a Vestiti usati e il prezzo del Wafer dei
// ladri di Rocinante (Ondata 5, Lotto B; decisione 21 dell'utente)
// ============================================================
//
// Decisione 21 (26 ottobre): «Non sono d'accordo nel rimandare attività a fasi successive»; le raccomandazioni del progetto si applicano, «in
// caso di discordanza fra pagine della guida vale il listino dei negozi», con la nota storica. Guida italiana, Elenco dei negozi [N], letta il
// 2026-10-26:
//
// 1. Vestiti usati (Kichijoji), due righe distinte per l'Incenso del risveglio:
//      «Incenso del risveglio | 30 P.ti | – | – | –»
//      «Incenso del risveglio | 50 P.ti | 1 settembre in poi | 3 | Il 1° del mese successivo»
//    (la pagina Oggetti [O] le elenca anch'essa a 30 e a 50 punti). Il dato aveva una riga sola, `vestiti-usati-kichijoji/incenso-del-risveglio`,
//    con la nota «30 o 50 punti negozio» e la regola dell'utente.
//      - nasce l'offerta a 50 punti `vestiti-usati-kichijoji/incenso-del-risveglio-50-punti`, collegata allo stesso oggetto del catalogo, con le
//        condizioni del negozio («quartiere Kichijoji») più «dal 1° settembre», 3 pezzi, rifornimento il 1° del mese successivo (come lo Spray
//        supremo dello stesso negozio), subito dopo quella a 30 punti come nell'elenco;
//      - l'offerta di oggi resta quella a 30 punti, senza limiti indicati (regola dell'utente, invariata): la nota passa da «30 o 50 punti
//        negozio» a «30 punti negozio».
//    I punti restano nella nota come per gli altri articoli del negozio (lo Spray supremo ha «50 punti negozio»): il costo in punti strutturato
//    è del Lotto E (`costo_json` di tipo «punti»), che leggerà le due note.
//
// 2. Discount Rocinante: «Wafer dei ladri | 200 ¥ | 28 agosto – 10 ottobre | 3 | Giorno successivo»; il dato aveva 500 ¥, il prezzo che [O]
//    dà per tutti e tre i negozi (KiyasuKu e Triple Seven sono a 500 anche in [N]). Vale [N]: 200 ¥, con la nota storica
//    `wafer-dei-ladri-rocinante-prezzo-fonte`. Se una partita ha già segnato l'offerta o una voce del Diario la compra, il prezzo resta e
//    l'audit lo dice: gli yen già scalati non cambiano in silenzio (sulle copie di oggi: nessuna delle due).
//
// Conservativa: l'offerta nuova nasce solo se manca (se c'è, anche nascosta, non si tocca); nota e prezzo si correggono solo se sono
// esattamente quelli attesi (un dato salvato non cambia in silenzio: diversi, restano e l'audit lo dice). Nessuna voce del Diario e nessun dato
// delle partite cambia (impronta del Diario controllata). Idempotente. Audit in `dati_guida.audit-248-offerte`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { MESE, improntaDiario, scriviAudit } from './rifornimentoOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-248-offerte';
const FONTE_NEGOZI = 'https://www.allgamestaff.it/persona-5-royal/elenco-dei-negozi/';
const errore = (motivo: string): never => { throw new Error(`248: ${motivo}; nessuna modifica applicata.`); };
type Esito = { articolo: string; esito: string };

const NEGOZIO = 'vestiti-usati-kichijoji';
const INCENSO_30 = `${NEGOZIO}/incenso-del-risveglio`;
const INCENSO_50 = `${NEGOZIO}/incenso-del-risveglio-50-punti`;
const CATALOGO_INCENSO = 'consumabile/incenso-del-risveglio';
const NOTA_PRIMA = '30 o 50 punti negozio';
const NOTA_DOPO = '30 punti negozio';

const WAFER = 'discount-rocinante/wafer-dei-ladri';
const NOTA_WAFER = {
  chiave: 'wafer-dei-ladri-rocinante-prezzo-fonte',
  fonte: 'Guida italiana: Elenco dei negozi (Discount Rocinante) e Oggetti (Wafer dei ladri); decisione 21 dell’utente',
  testo: 'La guida si contraddice: l’elenco dei negozi dà il Wafer dei ladri di Discount Rocinante a 200 ¥, la pagina Oggetti a 500 ¥ come negli altri due negozi (Chiosco KiyasuKu e Triple Seven, a 500 ¥ anche nell’elenco). Vale l’elenco dei negozi. È una nota sulla fonte: non cambia il listino.',
};

/** L'offerta a 50 punti, subito dopo quella a 30. */
function incensoA50Punti(db: AppDatabase): Esito {
  if (!db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ?').get(NEGOZIO)) return { articolo: INCENSO_50, esito: 'negozio Vestiti usati assente: nessuna offerta' };
  const gia = db.prepare('SELECT nascosto FROM main.articolo WHERE chiave = ?').get(INCENSO_50) as { nascosto: number } | undefined;
  if (gia) return { articolo: INCENSO_50, esito: gia.nascosto ? 'offerta già presente ma nascosta: non toccata' : 'offerta già presente' };
  if (!esisteTabella(db, 'catalogo_oggetto') || !db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ? AND nascosto = 0').get(CATALOGO_INCENSO)) {
    return { articolo: INCENSO_50, esito: `oggetto del catalogo «${CATALOGO_INCENSO}» assente: nessuna offerta` };
  }
  const base = db.prepare('SELECT ordine FROM main.articolo WHERE chiave = ?').pluck().get(INCENSO_30) as number | undefined;
  const ordine = base === undefined ? (db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.articolo WHERE negozio_chiave = ?').pluck().get(NEGOZIO) as number) : base + 1;
  // le offerte che seguono scendono di un posto (l'ordine non ha un vincolo di unicità: un solo UPDATE)
  if (base !== undefined) db.prepare('UPDATE main.articolo SET ordine = ordine + 1 WHERE negozio_chiave = ? AND ordine >= ?').run(NEGOZIO, ordine);
  const regola = MESE(3);
  const condizioni = [{ tipo: 'quartiere', quartiere: 'kichijoji' }, { tipo: 'data', dal: '09-01' }];
  db.prepare(`INSERT INTO main.articolo (chiave, negozio_chiave, ordine, nome, categoria, per, prezzo, effetto, statistiche, nota, fonte, verificato, origine, nascosto, updated_at,
      condizioni_json, catalogo_chiave, quantita, rifornimento_json)
    VALUES (?, ?, ?, 'Incenso del risveglio', 'consumabile', NULL, NULL, NULL, NULL, '50 punti negozio', ?, 1, 'seed', 0, ?, ?, ?, ?, ?)`)
    .run(INCENSO_50, NEGOZIO, ordine, FONTE_NEGOZI, new Date().toISOString(), JSON.stringify(condizioni), CATALOGO_INCENSO, regola.q, JSON.stringify(regola.r));
  return { articolo: INCENSO_50, esito: `creata (ordine ${ordine}, 50 punti, dal 1° settembre, 3 pezzi, rifornimento il 1° del mese)` };
}

/** La nota dell'offerta a 30 punti. */
function notaIncensoA30(db: AppDatabase): Esito {
  const r = db.prepare('SELECT nota FROM main.articolo WHERE chiave = ?').get(INCENSO_30) as { nota: string | null } | undefined;
  if (!r) return { articolo: INCENSO_30, esito: 'offerta assente' };
  if (r.nota === NOTA_DOPO) return { articolo: INCENSO_30, esito: 'nota già corretta' };
  if (r.nota !== NOTA_PRIMA) return { articolo: INCENSO_30, esito: `nota diversa da quella attesa (${JSON.stringify(r.nota)}): non toccata` };
  if (db.prepare('UPDATE main.articolo SET nota = ? WHERE chiave = ? AND nota = ?').run(NOTA_DOPO, INCENSO_30, NOTA_PRIMA).changes !== 1) errore('la nota dell’Incenso a 30 punti non si aggiorna');
  return { articolo: INCENSO_30, esito: `nota: ${JSON.stringify(NOTA_PRIMA)} → ${JSON.stringify(NOTA_DOPO)}` };
}

/** Il prezzo del Wafer di Rocinante e la sua nota storica. */
function prezzoWafer(db: AppDatabase): Esito[] {
  const esiti: Esito[] = [];
  const r = db.prepare('SELECT prezzo, costo_json FROM main.articolo WHERE chiave = ?').get(WAFER) as { prezzo: number | null; costo_json: string | null } | undefined;
  if (!r) return [{ articolo: WAFER, esito: 'offerta assente' }];
  const comprato = !!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'acquisto_partita'").get()
    && !!db.prepare('SELECT 1 FROM utente.acquisto_partita WHERE articolo_chiave = ?').get(WAFER);
  const daVoce = esisteTabella(db, 'voce_effetto') && !!db.prepare("SELECT 1 FROM main.voce_effetto WHERE json_valid(dati_json) AND json_extract(dati_json, '$.articolo') = ?").get(WAFER);
  if (r.prezzo === 200 && r.costo_json === null) esiti.push({ articolo: WAFER, esito: 'prezzo già 200 ¥' });
  else if (r.prezzo !== 500 || r.costo_json !== null) esiti.push({ articolo: WAFER, esito: `prezzo diverso da quello atteso (${r.prezzo}, costo ${r.costo_json}): non toccato` });
  else if (comprato || daVoce) esiti.push({ articolo: WAFER, esito: `offerta già ${comprato ? 'segnata in una partita' : 'comprata da una voce del Diario'}: prezzo non toccato (gli yen già scalati non cambiano)` });
  else {
    if (db.prepare('UPDATE main.articolo SET prezzo = 200 WHERE chiave = ? AND prezzo = 500 AND costo_json IS NULL').run(WAFER).changes !== 1) errore('il prezzo del Wafer di Rocinante non si aggiorna');
    esiti.push({ articolo: WAFER, esito: 'prezzo: 500 ¥ → 200 ¥' });
  }
  if (!esisteTabella(db, 'nota_storica') || !esisteTabella(db, 'nota_storica_legame')) { esiti.push({ articolo: WAFER, esito: 'tabelle delle note storiche assenti' }); return esiti; }
  const nuova = db.prepare('INSERT OR IGNORE INTO main.nota_storica (chiave, testo, fonte, versione, seed_json, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
    .run(NOTA_WAFER.chiave, NOTA_WAFER.testo, NOTA_WAFER.fonte, JSON.stringify({ versione: 1, testo: NOTA_WAFER.testo, fonte: NOTA_WAFER.fonte }), new Date().toISOString()).changes;
  const legame = db.prepare("INSERT OR IGNORE INTO main.nota_storica_legame (nota_chiave, tipo, chiave) VALUES (?, 'articolo', ?)").run(NOTA_WAFER.chiave, WAFER).changes;
  esiti.push({ articolo: WAFER, esito: `nota storica ${NOTA_WAFER.chiave}: ${nuova ? 'creata' : 'già presente'}${legame ? ', legata all’offerta' : ''}` });
  return esiti;
}

export const migration248: Migration = {
  id: 248,
  name: 'offerte_dall_elenco_dei_negozi',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'articolo') || !esisteTabella(db, 'negozio') || !haColonna(db, 'articolo', 'rifornimento_json')) {
      logger.warn({ migrazione: 248 }, 'articoli o colonna del rifornimento assenti: nessuna offerta'); return;
    }
    const diarioPrima = improntaDiario(db);
    const esiti: Esito[] = [incensoA50Punti(db), notaIncensoA30(db), ...prezzoWafer(db)];
    const scritte = esiti.filter((e) => /^(creata|nota: |prezzo: )/.test(e.esito)).length;
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    if (scritte) invalidaCacheDiGioco();
    scriviAudit(db, AUDIT, 248, { fonte: FONTE_NEGOZI, conteggi: { scritte }, esiti });
    logger.info({ migrazione: 248, scritte }, 'Negozi: offerte secondo l’elenco dei negozi (Incenso del risveglio, Wafer di Rocinante)');
  },
};
