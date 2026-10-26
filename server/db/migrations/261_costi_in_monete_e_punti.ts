// ============================================================
// Migrazione 261 — i costi in monete del Casinò e in punti negozio diventano dati dell'offerta (Ondata 5, Lotto E; decisione 21)
// ============================================================
//
// Prima di questa migrazione 13 offerte non avevano un costo strutturato: le 6 del negozio del Palazzo di Niijima si pagano in monete del
// Casinò, le 7 di Vestiti usati (Kichijoji) in punti negozio, e il costo viveva solo in prosa (`articolo.nota`: «1200 monete del Palazzo di
// Niijima», «si paga in monete del Palazzo, non in yen», «30 punti negozio»; per Cintura di Idaten e Cesta di vestiti solo dentro l'effetto).
// Ora `costo_json` ha i tipi «monete» e «punti» (`shared/catalogo.ts`), letti da listino, pagina dell'oggetto, visore e Compendio.
//
// Guida italiana, Elenco dei negozi [N] (letta il 2026-10-26):
//   «Lobby Piano riservato ai Soci: Catena di perline 120 monete · Soma 350 monete · Tessera puntate alte 50.000 monete»;
//   «Lobby piano puntate alte: Bracciale confuso 400 monete · Pend. disperazione 400 monete · Raggio della vittoria 1.200 monete»;
//   «Vestiti usati: Incenso del risveglio 30 P.ti · Incenso del risveglio 50 P.ti · Spray rapido 30 P.ti · Spray detergente 30 P.ti ·
//    Spray supremo 50 P.ti · Cintura di Idaten 150 P.ti · Cesta di vestiti 50 P.ti».
//
// Che cosa fa, offerta per offerta:
//   (1) `costo_json` = { tipo: 'monete' | 'punti', importo } solo se l'offerta non ha già un costo né un prezzo in yen (un dato salvato non si
//       cambia in silenzio: diverso, resta e l'audit lo dice);
//   (2) la nota che ripeteva il costo si toglie solo se è esattamente quella attesa (le note cambiate dall'utente restano);
//   (3) la frase del costo nell'effetto della Cintura di Idaten («; costo 150 punti») si toglie dall'oggetto del catalogo e dall'offerta, solo
//       se il testo è quello atteso e la scheda è della guida: il costo si legge dall'offerta. Gli effetti delle altre offerte (copie dell'effetto
//       che la pagina non mostra, già diverse dal catalogo) restano al lotto F, che toglie tutte le copie dell'effetto.
// Nessuna voce del Diario e nessun dato delle partite cambia (impronta controllata). Idempotente. Audit in `dati_guida.audit-261-costi`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { FONTE_NEGOZI, improntaDiario, scriviAudit } from './prezziOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-261-costi';
const errore = (motivo: string): never => { throw new Error(`261: ${motivo}; nessuna modifica applicata.`); };

const MONETE_PALAZZO = 'si paga in monete del Palazzo, non in yen';
/** Le offerte, il costo della guida e la nota di oggi che lo ripeteva (null = nessuna nota da togliere). */
const COSTI: ReadonlyArray<{ articolo: string; tipo: 'monete' | 'punti'; importo: number; nota: string | null }> = [
  { articolo: 'negozio-palazzo-niijima/catena-di-perline', tipo: 'monete', importo: 120, nota: MONETE_PALAZZO },
  { articolo: 'negozio-palazzo-niijima/soma', tipo: 'monete', importo: 350, nota: '350 monete; anche in vendita da Jose nei Memento' },
  { articolo: 'negozio-palazzo-niijima/tessera-puntate-alte', tipo: 'monete', importo: 50_000, nota: MONETE_PALAZZO },
  { articolo: 'negozio-palazzo-niijima/bracciale-confuso', tipo: 'monete', importo: 400, nota: MONETE_PALAZZO },
  { articolo: 'negozio-palazzo-niijima/pend-disperazione', tipo: 'monete', importo: 400, nota: MONETE_PALAZZO },
  { articolo: 'negozio-palazzo-niijima/raggio-della-vittoria', tipo: 'monete', importo: 1_200, nota: '1200 monete del Palazzo di Niijima' },
  { articolo: 'vestiti-usati-kichijoji/incenso-del-risveglio', tipo: 'punti', importo: 30, nota: '30 punti negozio' },
  { articolo: 'vestiti-usati-kichijoji/incenso-del-risveglio-50-punti', tipo: 'punti', importo: 50, nota: '50 punti negozio' },
  { articolo: 'vestiti-usati-kichijoji/spray-rapido', tipo: 'punti', importo: 30, nota: '30 punti negozio' },
  { articolo: 'vestiti-usati-kichijoji/spray-detergente', tipo: 'punti', importo: 30, nota: '30 punti negozio' },
  { articolo: 'vestiti-usati-kichijoji/spray-supremo', tipo: 'punti', importo: 50, nota: '50 punti negozio' },
  { articolo: 'vestiti-usati-kichijoji/cintura-di-idaten', tipo: 'punti', importo: 150, nota: null },
  { articolo: 'vestiti-usati-kichijoji/cesta-di-vestiti', tipo: 'punti', importo: 50, nota: null },
];
/** La frase del costo nell'effetto della Cintura di Idaten (oggetto del catalogo e copia dell'offerta). */
const CINTURA = { catalogo: 'accessorio/cintura-di-idaten', articolo: 'vestiti-usati-kichijoji/cintura-di-idaten', prima: 'Accessorio equipaggiabile; costo 150 punti', dopo: 'Accessorio equipaggiabile' };

type Esito = { articolo: string; esito: string };

function costoDellOfferta(db: AppDatabase, c: (typeof COSTI)[number]): Esito[] {
  const r = db.prepare('SELECT prezzo, costo_json, nota FROM main.articolo WHERE chiave = ?').get(c.articolo) as { prezzo: number | null; costo_json: string | null; nota: string | null } | undefined;
  if (!r) return [{ articolo: c.articolo, esito: 'offerta assente' }];
  const esiti: Esito[] = [];
  const atteso = JSON.stringify({ tipo: c.tipo, importo: c.importo });
  if (r.costo_json === atteso) esiti.push({ articolo: c.articolo, esito: 'costo già strutturato' });
  else if (r.costo_json !== null || r.prezzo !== null) esiti.push({ articolo: c.articolo, esito: `costo o prezzo già salvati (${r.costo_json ?? `${r.prezzo} ¥`}): non toccati` });
  else {
    if (db.prepare('UPDATE main.articolo SET costo_json = ?, updated_at = ? WHERE chiave = ? AND costo_json IS NULL AND prezzo IS NULL').run(atteso, new Date().toISOString(), c.articolo).changes !== 1) errore(`il costo di ${c.articolo} non si scrive`);
    esiti.push({ articolo: c.articolo, esito: `costo: ${c.importo} ${c.tipo}` });
  }
  // la nota si toglie solo se il costo strutturato è quello della guida (appena scritto o già presente)
  const costoGiusto = (db.prepare('SELECT costo_json FROM main.articolo WHERE chiave = ?').pluck().get(c.articolo) as string | null) === atteso;
  if (c.nota !== null && costoGiusto) {
    if (r.nota === c.nota) {
      if (db.prepare('UPDATE main.articolo SET nota = NULL WHERE chiave = ? AND nota = ?').run(c.articolo, c.nota).changes !== 1) errore(`la nota di ${c.articolo} non si toglie`);
      esiti.push({ articolo: c.articolo, esito: `nota tolta: ${JSON.stringify(c.nota)}` });
    } else if (r.nota !== null) esiti.push({ articolo: c.articolo, esito: `nota diversa da quella attesa (${JSON.stringify(r.nota)}): non toccata` });
  }
  return esiti;
}

function effettoDellaCintura(db: AppDatabase): Esito[] {
  const esiti: Esito[] = [];
  if (esisteTabella(db, 'catalogo_oggetto')) {
    const o = db.prepare('SELECT effetto, origine FROM main.catalogo_oggetto WHERE chiave = ?').get(CINTURA.catalogo) as { effetto: string; origine: string } | undefined;
    if (!o) esiti.push({ articolo: CINTURA.catalogo, esito: 'oggetto assente' });
    else if (o.effetto === CINTURA.dopo) esiti.push({ articolo: CINTURA.catalogo, esito: 'effetto già senza costo' });
    else if (o.effetto !== CINTURA.prima || o.origine !== 'seed') esiti.push({ articolo: CINTURA.catalogo, esito: 'effetto diverso da quello atteso o corretto dall’utente: non toccato' });
    else {
      if (db.prepare("UPDATE main.catalogo_oggetto SET effetto = ?, updated_at = ? WHERE chiave = ? AND effetto = ? AND origine = 'seed'").run(CINTURA.dopo, new Date().toISOString(), CINTURA.catalogo, CINTURA.prima).changes !== 1) errore('l’effetto della Cintura di Idaten non si aggiorna');
      esiti.push({ articolo: CINTURA.catalogo, esito: 'effetto: tolta la frase del costo' });
    }
  }
  const a = db.prepare('SELECT effetto FROM main.articolo WHERE chiave = ?').get(CINTURA.articolo) as { effetto: string | null } | undefined;
  if (a?.effetto === CINTURA.prima) {
    db.prepare('UPDATE main.articolo SET effetto = ? WHERE chiave = ? AND effetto = ?').run(CINTURA.dopo, CINTURA.articolo, CINTURA.prima);
    esiti.push({ articolo: CINTURA.articolo, esito: 'copia dell’effetto: tolta la frase del costo (resta uguale al catalogo)' });
  }
  return esiti;
}

export const migration261: Migration = {
  id: 261,
  name: 'costi_in_monete_e_punti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'articolo')) { logger.warn({ migrazione: 261 }, 'tabella articolo assente: costi non scritti'); return; }
    const diarioPrima = improntaDiario(db);
    const esiti = [...COSTI.flatMap((c) => costoDellOfferta(db, c)), ...effettoDellaCintura(db)];
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const conteggi = {
      costiScritti: esiti.filter((e) => e.esito.startsWith('costo: ')).length,
      noteTolte: esiti.filter((e) => e.esito.startsWith('nota tolta')).length,
      effettiCorretti: esiti.filter((e) => e.esito.startsWith('effetto: ') || e.esito.startsWith('copia dell')).length,
      nonToccati: esiti.filter((e) => /non toccat|assente/.test(e.esito)).length,
    };
    if (conteggi.costiScritti + conteggi.noteTolte + conteggi.effettiCorretti) invalidaCacheDiGioco();
    scriviAudit(db, AUDIT, 261, { fonte: FONTE_NEGOZI, conteggi, esiti });
    logger.info({ migrazione: 261, ...conteggi }, 'Negozi: costi in monete del Casinò e in punti negozio');
  },
};
