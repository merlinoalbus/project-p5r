// ============================================================
// Migrazione 276 — i nomi inglesi delle abilità dentro gli effetti dell'equipaggiamento diventano quelli italiani (Ondata 5, Lotto F)
// ============================================================
//
// Decisione 21 dell'utente: l'effetto resta testo, in un solo punto (`catalogo_oggetto.effetto`); regola del progetto «tutto in italiano»
// (rilievo LOW della revisione del lotto F: «+Dia…», «Mana Surge (SP +30%) / FR +5»). Gli effetti dell'equipaggiamento vengono dal dataset
// inglese (migrazione 121): il nome dell'abilità concessa è rimasto quello inglese («+Fire Amp», «+Angelic Grace», «Mana Surge»), mentre la
// resa italiana di ogni abilità è già nei dati, `traduzione` ambito `skill` (come la mostra il compendio). Sulla copia alla 274: 52 schede
// con un nome traducibile così, più 5 nomi senza resa nei dati, che la guida italiana [Accessori] dà: Mana Bonus «Bonus mana», Mana Surge
// «Ondata mana», Life Surge «Ondata vitale», Insta-heal «Guarigione ist.» (Guarigione istantanea), Gatling Blow «Colpo gatling».
//
// Che cosa fa: in ogni pezzo dell'effetto (separati da « / ») un nome di abilità all'inizio (con il «+» davanti o senza), seguito dalla fine
// del pezzo o da una parentesi, diventa il nome italiano; il resto del testo non cambia (le sigle FR, MA, RS, AG, FO sono già quelle del
// glossario). Si prova il nome più lungo per primo. Conservativa: solo schede dell'equipaggiamento mai corrette dall'utente (`origine =
// 'seed'`, `seed_json` vuoto). I nomi inglesi rimasti senza resa li conta l'audit `dati_guida.audit-276-nomi-abilita`, con prima e dopo di
// ogni scheda. Nessuna voce del Diario cambia. Idempotente (un nome italiano non è una chiave inglese da tradurre).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { FONTE_ACCESSORI, improntaDiario, scriviAuditTesti } from './testiOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-276-nomi-abilita';
const errore = (motivo: string): never => { throw new Error(`276: ${motivo}; nessuna modifica applicata.`); };

/** I nomi che i dati non traducono e la guida [Accessori] sì (colonna dell'abilità). */
const DALLA_GUIDA: Readonly<Record<string, string>> = {
  'Mana Bonus': 'Bonus mana', 'Mana Surge': 'Ondata mana', 'Life Surge': 'Ondata vitale', 'Insta-heal': 'Guarigione istantanea', 'Gatling Blow': 'Colpo gatling',
};

/** Traduce i nomi delle abilità all'inizio dei pezzi dell'effetto; restituisce il testo nuovo e i nomi tradotti. */
function traduciNomi(effetto: string, nomi: ReadonlyArray<readonly [string, string]>): { testo: string; tradotti: string[] } {
  const tradotti: string[] = [];
  const pezzi = effetto.split(' / ').map((pezzo) => {
    const piu = pezzo.startsWith('+') ? '+' : '';
    const corpo = pezzo.slice(piu.length);
    const trovato = nomi.find(([en]) => corpo.startsWith(en) && (corpo.length === en.length || /^\s*\(/.test(corpo.slice(en.length))));
    if (!trovato) return pezzo;
    tradotti.push(`${trovato[0]} → ${trovato[1]}`);
    return `${piu}${trovato[1]}${corpo.slice(trovato[0].length)}`;
  });
  return { testo: pezzi.join(' / '), tradotti };
}

export const migration276: Migration = {
  id: 276,
  name: 'nomi_delle_abilita_negli_effetti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'catalogo_oggetto') || !esisteTabella(db, 'traduzione')) { logger.warn({ migrazione: 276 }, 'catalogo o traduzioni assenti: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const dalleTraduzioni = db.prepare("SELECT chiave, testo FROM main.traduzione WHERE ambito = 'skill' AND testo <> chiave AND trim(testo) <> ''").all() as Array<{ chiave: string; testo: string }>;
    const mappa = new Map<string, string>(Object.entries(DALLA_GUIDA));
    for (const t of dalleTraduzioni) mappa.set(t.chiave, t.testo); // la resa dei dati (anche corretta dall'utente) vale sulla guida
    const nomi = [...mappa.entries()].sort((a, b) => b[0].length - a[0].length);
    const schede = db.prepare("SELECT chiave, effetto FROM main.catalogo_oggetto WHERE fonte_tipo = 'equipaggiamento' AND origine = 'seed' AND seed_json IS NULL AND effetto <> '' ORDER BY chiave").all() as Array<{ chiave: string; effetto: string }>;
    const esiti: Array<{ chiave: string; prima: string; dopo: string; tradotti: string[] }> = [];
    for (const s of schede) {
      const { testo, tradotti } = traduciNomi(s.effetto, nomi);
      if (testo === s.effetto) continue;
      const n = db.prepare("UPDATE main.catalogo_oggetto SET effetto = ?, updated_at = ? WHERE chiave = ? AND effetto = ? AND origine = 'seed' AND seed_json IS NULL")
        .run(testo, new Date().toISOString(), s.chiave, s.effetto).changes;
      if (n !== 1) errore(`la scheda ${s.chiave} non si aggiorna`);
      esiti.push({ chiave: s.chiave, prima: s.effetto, dopo: testo, tradotti });
    }
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    // i nomi inglesi rimasti: un pezzo che comincia con parole in maiuscolo, seguite dalla fine o da una parentesi, che non è un nome italiano noto
    const italiani = new Set(mappa.values());
    const rimasti = new Map<string, number>();
    for (const r of db.prepare("SELECT effetto FROM main.catalogo_oggetto WHERE fonte_tipo = 'equipaggiamento' AND nascosto = 0 AND effetto <> ''").pluck().all() as string[]) {
      for (const pezzo of r.split(' / ')) {
        const m = /^\+?([A-Z][A-Za-z'-]+(?: [A-Z][A-Za-z'-]+)+)(?=\s*(\(|$))/.exec(pezzo);
        if (m && !italiani.has(m[1]!)) rimasti.set(m[1]!, (rimasti.get(m[1]!) ?? 0) + 1);
      }
    }
    const conteggi = { schedeTradotte: esiti.length, nomiTradotti: esiti.reduce((n, e) => n + e.tradotti.length, 0), nomiInglesiRimasti: Object.fromEntries(rimasti) };
    if (esiti.length) invalidaCacheDiGioco();
    scriviAuditTesti(db, AUDIT, 276, { fonti: [FONTE_ACCESSORI, 'traduzione (ambito skill)'], conteggi, esiti }, esiti.length);
    logger.info({ migrazione: 276, schedeTradotte: conteggi.schedeTradotte, nomiTradotti: conteggi.nomiTradotti }, 'Catalogo: nomi italiani delle abilità negli effetti dell’equipaggiamento');
  },
};
