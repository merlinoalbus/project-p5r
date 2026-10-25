// ============================================================
// 233 — gli esiti delle attività, scelti alla spunta: Big Bang Burger, centro battute, bagno pubblico (L13, ondata 2)
// ============================================================
//
// Decisioni dell'utente del 2026-10-25: (1a) bagno pubblico Fascino +2, +3 il lunedì e il giovedì, valore fisso per giorno della settimana;
// (2a) centro battute: alla spunta si sceglie il risultato fra i valori possibili; Big Bang Burger: «non è il modo giusto» (valori in
// prosa in più posti, voci con valori fissi, nessuna scelta di sfida e di esito). Il meccanismo è `shared/esitiAttivita.ts`.
//
// Che cosa fa (solo `main`, solo righe mai modificate dall'utente: `origine = 'seed'` e `seed_json IS NULL`, e solo se il valore è ancora
// quello letto il 2026-10-25 sulla copia dei dati reali: un testo diverso vuol dire che qualcuno l'ha già toccato, e la riga resta com'è):
//   1. aggiunge la colonna `attivita.esiti_json` (NULL = nessun esito dichiarato), se manca;
//   2. `sfida-big-bang-burger`: sei esiti (Comet, Gravity, Cosmo Tower × vinta/persa). Il nome della terza sfida è quello degli articoli
//      del negozio («Cosmo Tower Burger»; «Cosmo Town» stava solo nella prosa dell'attività). Valori dai testi degli articoli: vinta +1/+2/+3
//      note a Coraggio, Conoscenza, Fascino e Perizia, persa +1/+2/+3 note al solo Coraggio; distintivi e panini restano parole (`premi`:
//      il catalogo non ha i distintivi). Ogni esito cita l'articolo della sua sfida: prezzo (1.200/1.500/1.800 yen) e ranghi (2/3/4) stanno
//      SOLO nel listino; per questo il `costo` dell'attività (1.500, una copia) diventa NULL. Le «Doti in prosa» (`doti_json`) si svuotano
//      e i paragrafi di `dettagli` che le ripetevano («Come funziona», «Altri effetti», «Note sulle Doti») si tolgono; resta il paragrafo
//      «Sblocco (dalla guida)», tenuto come nota per decisione dell'utente (migrazione 229). Il testo degli articoli e delle loro schede di
//      catalogo (stessa frase in `articolo.effetto` e `catalogo_oggetto.effetto`) non ripete più i valori: rimanda agli esiti e tiene il
//      prezzo serale di 500 yen, che non è un dato strutturato (nessuna colonna lo modella);
//   3. `centro-battute-yongen-jaya`: esiti scelti alla spunta per colpi riusciti (+1 Perizia per colpo, letto dai dati dell'attività):
//      1 colpo ♪, 2 colpi ♪♪, 3 colpi o più ♪♪♪ (tre note sono il massimo che un aumento mostra: la convenzione del progetto «+N = N note»);
//      «nessun colpo» è la scelta «senza punti» della spunta. Si toglie il paragrafo «Effetti sulla Perizia non strutturati…»;
//   4. `bagno-pubblico-yongen-jaya`: esiti automatici per giorno della settimana (bagno normale Fascino ♪♪; lunedì e giovedì bagno
//      medicinale Fascino ♪♪♪). Condizioni complementari (giorno-settimana e la sua negazione): ne vale sempre uno, nessuna domanda. Si
//      toglie il paragrafo «Effetti sul Fascino non strutturati…»; resta «Altri effetti» (la pioggia, che non è un valore fisso).
// Le voci del Diario NON si toccano (quelle validate dall'utente fino al 05-31 e le altre: la conversione arriva dopo il suo sì, con la
// funzione `pianoCollegamentoVoceEsiti`); `partite.db` non si tocca (turni e ricevute già salvati restano identici).
// Audit: i valori di prima, riga per riga, in `dati_guida.audit-233-esiti-attivita`. Controlli finali: impronta identica delle tabelle
// vicine e delle colonne non toccate; gli esiti scritti si rileggono validi. Idempotente: rilanciata non trova più i valori di partenza.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { leggiEsitiAttivita, type EsitiAttivita } from '../../../shared/esitiAttivita.js';

const AUDIT = 'audit-233-esiti-attivita';
const errore = (motivo: string): never => { throw new Error(`233: ${motivo}; nessuna modifica applicata.`); };

const BBB = 'sfida-big-bang-burger';
const BATTUTE = 'centro-battute-yongen-jaya';
const BAGNO = 'bagno-pubblico-yongen-jaya';
const QUATTRO = ['coraggio', 'conoscenza', 'fascino', 'perizia'] as const;
const vinta = (n: 1 | 2 | 3) => QUATTRO.map((dote) => ({ dote, note: n }));

const ESITI: Record<string, EsitiAttivita> = {
  [BBB]: { modo: 'scelta', esiti: [
    { chiave: 'comet-vinta', nome: 'Comet Burger · vinta', gruppo: 'Comet Burger', articolo: 'big-bang-burger/sfida-comet-burger', condizioni: [], doti: vinta(1), premi: 'Distintivo 2nd Mate (più 10 HP) e 3 Big Bang Burger' },
    { chiave: 'comet-persa', nome: 'Comet Burger · persa', gruppo: 'Comet Burger', articolo: 'big-bang-burger/sfida-comet-burger', condizioni: [], doti: [{ dote: 'coraggio', note: 1 }], premi: null },
    { chiave: 'gravity-vinta', nome: 'Gravity Burger · vinta', gruppo: 'Gravity Burger', articolo: 'big-bang-burger/sfida-gravity-burger', condizioni: [], doti: vinta(2), premi: 'Distintivo 1st Mate (più 30 HP) e 5 Big Bang Burger' },
    { chiave: 'gravity-persa', nome: 'Gravity Burger · persa', gruppo: 'Gravity Burger', articolo: 'big-bang-burger/sfida-gravity-burger', condizioni: [], doti: [{ dote: 'coraggio', note: 2 }], premi: null },
    { chiave: 'cosmo-tower-vinta', nome: 'Cosmo Tower Burger · vinta', gruppo: 'Cosmo Tower Burger', articolo: 'big-bang-burger/sfida-cosmo-tower-burger', condizioni: [], doti: vinta(3), premi: 'Distintivo Captain (più 50 HP) e 10 Big Bang Burger' },
    { chiave: 'cosmo-tower-persa', nome: 'Cosmo Tower Burger · persa', gruppo: 'Cosmo Tower Burger', articolo: 'big-bang-burger/sfida-cosmo-tower-burger', condizioni: [], doti: [{ dote: 'coraggio', note: 3 }], premi: null },
  ] },
  [BATTUTE]: { modo: 'scelta', esiti: [
    { chiave: 'un-colpo', nome: '1 colpo riuscito', gruppo: null, articolo: null, condizioni: [], doti: [{ dote: 'perizia', note: 1 }], premi: null },
    { chiave: 'due-colpi', nome: '2 colpi riusciti', gruppo: null, articolo: null, condizioni: [], doti: [{ dote: 'perizia', note: 2 }], premi: null },
    { chiave: 'tre-colpi-o-piu', nome: '3 colpi riusciti o più', gruppo: null, articolo: null, condizioni: [], doti: [{ dote: 'perizia', note: 3 }], premi: null },
  ] },
  [BAGNO]: { modo: 'automatico', esiti: [
    { chiave: 'bagno-normale', nome: 'Bagno normale', gruppo: null, articolo: null, condizioni: [{ tipo: 'non', condizione: { tipo: 'giorno-settimana', giorni: ['lunedi', 'giovedi'] } }], doti: [{ dote: 'fascino', note: 2 }], premi: null },
    { chiave: 'bagno-medicinale', nome: 'Bagno medicinale (lunedì e giovedì)', gruppo: null, articolo: null, condizioni: [{ tipo: 'giorno-settimana', giorni: ['lunedi', 'giovedi'] }], doti: [{ dote: 'fascino', note: 3 }], premi: null },
  ] },
};

/** Le Doti in prosa di prima (`doti_json`), esatte come lette sulla copia dei dati reali il 2026-10-25. */
const DOTI_PRIMA: Record<string, string> = {
  [BBB]: '[{"dote":"coraggio","note":null,"condizione":"+1 nota (Comet Burger) fino a +3 note (Cosmo Town Burger) al completamento di ciascuna sfida"},{"dote":"conoscenza","note":null,"condizione":"Stesso schema del Coraggio, vedi sopra"},{"dote":"perizia","note":null,"condizione":"Stesso schema del Coraggio, vedi sopra"},{"dote":"fascino","note":null,"condizione":"Stesso schema del Coraggio, vedi sopra (+1, +2, +3 se la sfida riesce)"}]',
  [BATTUTE]: '[{"dote":"perizia","note":null,"condizione":"Completare il minigioco aumenta la Perizia (Proficiency); numero di note non specificato dalla fonte secondaria"}]',
  [BAGNO]: '[{"dote":"fascino","note":null,"condizione":"Bagno normale: punti Fascino (fonte secondaria; valore esatto in note non confermato sulla guida italiana)"},{"dote":"fascino","note":null,"condizione":"Lunedì e giovedì: bagno \'medicinale/rigenerante\' con punto Fascino aggiuntivo rispetto al bagno normale"}]',
};

/** I paragrafi di `dettagli` che ripetevano in prosa ciò che ora dicono gli esiti (tolti solo se presenti esatti). */
const PARAGRAFI_TOLTI: Record<string, string[]> = {
  [BBB]: [
    'Come funziona: Costi e soglie possono variare tra le tre sfide (dato non confermato con precisione).',
    'Altri effetti: Ricompense: Comet Burger = accessorio \'2nd Mate Badge\' (+10 HP) + 3 oggetti Big Bang Burger; Cosmo Town Burger = accessorio \'Captain Badge\' (+50 HP) + 10 oggetti Big Bang Burger. Anche il solo tentativo, senza completare la sfida, garantisce punti secondo AllGameStaff.',
    'Note sulle Doti: Coraggio: +1 nota (Comet Burger) fino a +3 note (Cosmo Town Burger) al completamento di ciascuna sfida · Conoscenza: Stesso schema del Coraggio, vedi sopra · Perizia: Stesso schema del Coraggio, vedi sopra',
  ],
  [BATTUTE]: ['Effetti sulla Perizia non strutturati: il valore dipende dal risultato della sessione (+1 per colpo riuscito), non è un valore fisso.'],
  [BAGNO]: ['Effetti sul Fascino non strutturati: le fonti Royal discordano (+2 con +1 il lunedì e il giovedì; «+2 o +3»; +1 Coraggio con la pioggia).'],
};

/** Il testo delle tre sfide negli articoli e nelle loro schede di catalogo, prima e dopo: i valori stanno negli esiti dell'attività. */
const SFIDE: Array<{ articolo: string; catalogo: string; prima: string }> = [
  { articolo: 'big-bang-burger/sfida-comet-burger', catalogo: 'altro/sfida-comet-burger', prima: 'Vittoria: più 1 a Coraggio, Conoscenza, Fascino, Perizia, distintivo 2nd Mate che dà più 10 HP, e 3 Big Bang Burger; sconfitta: solo più 1 Coraggio. Prezzo ridotto a 500 yen di sera' },
  { articolo: 'big-bang-burger/sfida-gravity-burger', catalogo: 'altro/sfida-gravity-burger', prima: 'Vittoria: più 2 alle quattro statistiche, distintivo 1st Mate che dà più 30 HP, 5 Big Bang Burger; sconfitta: più 2 Coraggio. Prezzo ridotto a 500 yen di sera' },
  { articolo: 'big-bang-burger/sfida-cosmo-tower-burger', catalogo: 'altro/sfida-cosmo-tower-burger', prima: 'Vittoria: più 3 alle quattro statistiche, distintivo Captain che dà più 50 HP, 10 Big Bang Burger; sconfitta: più 3 Coraggio. Prezzo ridotto a 500 yen di sera' },
];
const TESTO_SFIDA = 'Sfida della Big Bang Burger: gli esiti (vinta o persa), le Doti e i premi sono nella scheda dell’attività «Sfida Big Bang Burger». Prezzo ridotto a 500 yen di sera';

interface RigaAttivita { chiave: string; doti_json: string; dettagli: string | null; costo: number | null; esiti_json: string | null; origine: string; seed_json: string | null }

/** `dettagli` senza i paragrafi indicati (separati da una riga vuota): undefined se uno dei paragrafi non c'è esatto, null se non resta niente. */
function senzaParagrafi(dettagli: string, tolti: readonly string[]): string | null | undefined {
  const paragrafi = dettagli.split('\n\n');
  if (!tolti.every((t) => paragrafi.includes(t))) return undefined;
  const restano = paragrafi.filter((p) => !tolti.includes(p));
  return restano.length ? restano.join('\n\n') : null;
}

function convertiAttivita(db: AppDatabase, chiave: string, rapporto: Record<string, unknown>): void {
  const r = db.prepare('SELECT chiave, doti_json, dettagli, costo, esiti_json, origine, seed_json FROM main.attivita WHERE chiave = ?').get(chiave) as RigaAttivita | undefined;
  if (!r) { rapporto[chiave] = 'assente'; return; }
  if (r.origine !== 'seed' || r.seed_json !== null) { rapporto[chiave] = 'corretta dall’utente: non toccata'; return; }
  if (r.esiti_json !== null) { rapporto[chiave] = 'esiti già dichiarati: non toccata'; return; }
  if (r.doti_json !== DOTI_PRIMA[chiave]) { rapporto[chiave] = 'Doti in prosa diverse da quelle attese: non toccata'; return; }
  if (r.dettagli === null) { rapporto[chiave] = 'dettagli assenti: non toccata'; return; }
  const dettagli = senzaParagrafi(r.dettagli, PARAGRAFI_TOLTI[chiave]!);
  if (dettagli === undefined) { rapporto[chiave] = 'dettagli diversi da quelli attesi: non toccata'; return; }
  const costo = chiave === BBB && r.costo === 1500 ? null : r.costo;
  const esiti = JSON.stringify(ESITI[chiave]);
  const cambio = db.prepare('UPDATE main.attivita SET esiti_json = ?, doti_json = \'[]\', dettagli = ?, costo = ? WHERE chiave = ? AND origine = \'seed\' AND seed_json IS NULL AND esiti_json IS NULL AND doti_json = ? AND dettagli = ?')
    .run(esiti, dettagli, costo, chiave, r.doti_json, r.dettagli);
  if (cambio.changes !== 1) errore(`l'attività ${chiave} non è stata scritta`);
  rapporto[chiave] = { prima: { doti_json: r.doti_json, dettagli: r.dettagli, costo: r.costo, esiti_json: null }, dopo: { esiti_json: esiti, doti_json: '[]', dettagli, costo } };
}

function aggiornaSfide(db: AppDatabase, rapporto: Record<string, unknown>): void {
  const conCatalogo = esisteTabella(db, 'catalogo_oggetto');
  for (const s of SFIDE) {
    const a = db.prepare('SELECT effetto, origine, seed_json FROM main.articolo WHERE chiave = ?').get(s.articolo) as { effetto: string | null; origine: string; seed_json: string | null } | undefined;
    if (a && a.origine === 'seed' && a.seed_json === null && a.effetto === s.prima) {
      if (db.prepare('UPDATE main.articolo SET effetto = ? WHERE chiave = ? AND effetto = ?').run(TESTO_SFIDA, s.articolo, s.prima).changes !== 1) errore(`l'articolo ${s.articolo} non è stato scritto`);
      rapporto[`articolo:${s.articolo}`] = { prima: s.prima, dopo: TESTO_SFIDA };
    } else rapporto[`articolo:${s.articolo}`] = a ? 'testo diverso o corretto dall’utente: non toccato' : 'assente';
    if (!conCatalogo) continue;
    const c = db.prepare('SELECT effetto, origine, seed_json FROM main.catalogo_oggetto WHERE chiave = ?').get(s.catalogo) as { effetto: string; origine: string; seed_json: string | null } | undefined;
    if (c && c.origine === 'seed' && c.seed_json === null && c.effetto === s.prima) {
      if (db.prepare('UPDATE main.catalogo_oggetto SET effetto = ? WHERE chiave = ? AND effetto = ?').run(TESTO_SFIDA, s.catalogo, s.prima).changes !== 1) errore(`la scheda ${s.catalogo} non è stata scritta`);
      rapporto[`catalogo:${s.catalogo}`] = { prima: s.prima, dopo: TESTO_SFIDA };
    } else rapporto[`catalogo:${s.catalogo}`] = c ? 'testo diverso o corretto dall’utente: non toccato' : 'assente';
  }
}

export const migration233: Migration = {
  id: 233,
  name: 'esiti_delle_attivita',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'attivita')) return;
    if (!haColonna(db, 'attivita', 'esiti_json')) db.exec('ALTER TABLE main.attivita ADD COLUMN esiti_json TEXT');
    if (!esisteTabella(db, 'dati_guida') || !esisteTabella(db, 'articolo')) return;
    if (db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave = ?').get(AUDIT)) return; // già applicata: niente da rifare
    // gli esiti scritti qui devono rileggersi validi con la regola unica, prima di scrivere qualunque riga
    for (const [chiave, e] of Object.entries(ESITI)) if (JSON.stringify(leggiEsitiAttivita(JSON.stringify(e))) !== JSON.stringify(e)) errore(`gli esiti di ${chiave} non sono validi`);
    const vicine = ['negozio', 'luogo', 'voce_giornata', 'voce_effetto', 'libro', 'film'].filter((t) => esisteTabella(db, t));
    const senza: Record<string, string[]> = { attivita: ['esiti_json', 'doti_json', 'dettagli', 'costo'], articolo: ['effetto'], catalogo_oggetto: ['effetto'] };
    const prima = new Map<string, string>(['attivita', 'articolo', ...(esisteTabella(db, 'catalogo_oggetto') ? ['catalogo_oggetto'] : []), ...vicine]
      .map((t): [string, string] => [t, improntaTabella(db, t, senza[t] ?? [])]));
    const rapporto: Record<string, unknown> = { data: '2026-10-25' };
    for (const chiave of [BBB, BATTUTE, BAGNO]) convertiAttivita(db, chiave, rapporto);
    // il testo delle sfide rimanda agli esiti solo se la Big Bang Burger li ha davvero (altrimenti i valori resterebbero senza fonte)
    if (leggiEsitiAttivita((db.prepare('SELECT esiti_json FROM main.attivita WHERE chiave = ?').get(BBB) as { esiti_json: string | null } | undefined)?.esiti_json)) aggiornaSfide(db, rapporto);
    for (const [t, imp] of prima) if (improntaTabella(db, t, senza[t] ?? []) !== imp) errore(`la tabella ${t} è cambiata oltre ai campi dichiarati`);
    // solo le tre attività possono avere esiti dopo questa migrazione, e tutti si rileggono validi
    for (const r of db.prepare('SELECT chiave, esiti_json FROM main.attivita WHERE esiti_json IS NOT NULL').all() as Array<{ chiave: string; esiti_json: string }>) {
      if (![BBB, BATTUTE, BAGNO].includes(r.chiave) || !leggiEsitiAttivita(r.esiti_json)) errore(`esiti inattesi o illeggibili in ${r.chiave}`);
    }
    db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(AUDIT, JSON.stringify(rapporto));
    logger.info({ migrazione: 'L13-233', rapporto: Object.fromEntries(Object.entries(rapporto).map(([k, v]) => [k, typeof v === 'string' ? v : 'convertita'])) }, 'Esiti delle attività: Big Bang Burger, centro battute, bagno pubblico');
  },
};
