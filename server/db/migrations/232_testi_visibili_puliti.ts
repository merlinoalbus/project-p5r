// ============================================================
// 232 — i testi visibili senza codici interni, riferimenti a file del progetto, dominio grezzo e apostrofi al posto degli accenti (lotto C)
// ============================================================
//
// Decisioni dell'utente del 25/10 (lotto C della revisione UX/UI, indagine C4, poi i rilievi del revisore): togliere dai DATI ciò che
// nei testi mostrati non è per chi gioca. Cinque famiglie (il dettaglio è in testa a `testiGrezzi232.ts`):
//   - i codici del registro del progetto «G-NNN» nelle colonne che l'app mostra; i segmenti «Prima di G-036 (…): …» delle note di
//     disponibilità si tolgono interi. Le colonne di provenienza (`fonte`, `fonte_condizioni_json`, `confidente_rango.fonte`,
//     `relazioni[].fonte` delle varianti, `requisitoConoscenza.fonte` dei premi…) restano intatte: sono la tracciabilità del progetto;
//   - i rimandi al «rapporto» e a file di note, «WebSearch» e la parentesi «sintesi WebSearch»: tolti, senza frasi nuove;
//   - il dominio «allgamestaff.it» scritto nel testo, che diventa il nome del sito «AllGameStaff» (gli indirizzi completi restano);
//   - la fonte visibile delle note storiche senza codici e riferimenti di lavoro; quella di `homunculus-prezzi-fonte`, fatta solo di
//     riferimenti di lavoro, resta vuota per scelta dell'utente («rimuovi la fonte»): servizio, rotta e scheda accettano la fonte vuota;
//   - gli accenti: l'apostrofo al posto della vocale accentata e gli accenti mancanti senza apostrofo, decisi parola per parola.
//     «po'», «Fa'», «Da'at», le contrazioni inglesi, gli apostrofi usati come virgolette e i verbi («abilita il…», «eredita l'…») restano.
//
// L'elenco è CHIUSO ed esplicito (`testiGrezzi232.ts`): tabella, chiave della riga, colonna, (per i JSON) percorso, testo di prima e
// testo di dopo, costruito leggendo i dati a schema 230. Qui non si calcola nessun testo. Guardie, voce per voce:
//   - la riga c'è e il testo di adesso è IDENTICO a quello di prima (un testo cambiato dall'utente, o già corretto, si salta);
//   - nelle colonne JSON si cambia il solo valore al percorso, e solo se il documento è nella forma canonica (`JSON.stringify`);
//   - le note di disponibilità con lo storico dell'editor informativo (`confidente-disponibilita-editor-v1:<chiave>`) si saltano:
//     lo storico vuole che la riga coincida con l'ultima revisione;
//   - la copia della guida della riga (`seed_json`, la fotografia presa alla prima correzione dell'utente) si allinea, come nella 228,
//     sul campo che il registro del ripristino o il servizio della tabella usa per quella colonna (`COPIA_DELLA_GUIDA`), e solo se quel
//     campo ha lo stesso testo di prima: così, anche quando l'utente ha corretto un ALTRO campo della riga, «Ripristina» non rimette il
//     testo grezzo. La copia si allinea anche quando la voce si salta perché l'utente ha riscritto proprio quel testo: il testo
//     dell'utente resta com'è, e «Ripristina» rimette quello pulito della guida. Lo stesso per le copie in `dati_guida`: la fotografia
//     della struttura della disponibilità e quelle degli editor dei Confidenti (dialoghi e abilità, `copiaInDatiGuida`). La copia
//     dell'invito di Makoto del 30/7, diversa dal testo di adesso, è una voce a sé dell'elenco (colonna `seed_json`, percorso `nota`).
//     Non coperta: «Ripristina» delle traduzioni legge il pacchetto del repository (`pacchetto/gioco.db`), non una copia nei dati.
// Nessun'altra riga, colonna o tabella cambia: alla fine ogni tabella toccata è confrontata riga per riga con la sua fotografia di
// prima (solo le colonne delle voci applicate, e `seed_json` dove allineato, possono essere diverse). Ogni anomalia lancia e il runner
// annulla la transazione. I testi di prima restano in `testiGrezzi232.ts` e nella copia di avvio dei dati. Solo `main`.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { colonneDi, esisteTabella } from './pulizieL11.js';
import { CORREZIONI_231, type CorrezioneTesto231 } from './testiGrezzi232.js';

/** Lo storico dell'editor delle informazioni di un Confidente (`disponibilitaConfidentiService`). */
const STORICO_INFORMAZIONI = 'confidente-disponibilita-editor-v1:';
/** Le colonne della riga di disponibilità che lo storico dell'editor confronta con la sua ultima revisione. */
const COLONNE_STORICO = ['giorni_json', 'fasce_json', 'luogo', 'sblocco_data', 'sblocco_requisiti', 'note', 'note_generali', 'fonti_json'];
/** La fotografia della struttura della disponibilità presa alla prima modifica (`disponibilitaStrutturataService`). */
const FOTOGRAFIA_STRUTTURA = 'disponibilita-struttura-seed-v1:';

/** Il campo per il valore intero del documento JSON (la copia lo conserva come testo). */
const DOCUMENTO = { documento: true } as const;
/** Il campo è il percorso nel documento unito da «/» (i premi degli esami nel registro del ripristino). */
const PERCORSO = { percorso: true } as const;
/**
 * Per colonna, il campo che la copia della guida (`seed_json`) usa per lo stesso valore:
 *  - il `p` del registro del ripristino (`server/services/ripristino/righe*.ts`: Ombra, regalo, settimana, evento, esame, premi);
 *  - il nome della colonna per le fotografie dei servizi (`catalogoService` per negozi, luoghi, domande, attività, film, libri e
 *    offerte; il catalogo degli oggetti; le note storiche; gli inviti; i giorni).
 * Le colonne senza voce qui non hanno il campo nella copia (la copia del Palazzo conserva solo il boss finale; il Diario, le
 * abilità, i dialoghi, i requisiti, le traduzioni, le disponibilità, le aree, i punti e i segnaposto non hanno `seed_json`).
 */
const COPIA_DELLA_GUIDA: Record<string, string | typeof DOCUMENTO | typeof PERCORSO> = {
  'ombra.note': 'note',
  'confidente_regalo.nota': 'nota', 'confidente_regalo.dove': 'dove',
  'negozio.note': 'note', 'negozio.luogo': 'luogo',
  'confidente_invito.nota': 'nota',
  'nota_storica.testo': 'testo', 'nota_storica.fonte': 'fonte',
  'settimana_guida.riassunto': 'riassunto', 'settimana_guida.incertezze': 'incertezze',
  'evento_calendario.titolo': 'titolo', 'evento_calendario.dettaglio': 'dettaglio',
  'luogo.note': 'note', 'luogo.cosa_offre': 'cosa_offre',
  'esame.note': 'note',
  'domanda.domanda': 'domanda', 'domanda.note': 'note', 'domanda.risposte_json': DOCUMENTO,
  'esame_premi.json': PERCORSO,
  'attivita.dettagli': 'dettagli', 'film.dettagli': 'dettagli', 'libro.sblocca': 'sblocca', 'articolo.effetto': 'effetto',
  'catalogo_oggetto.descrizione': 'descrizione', 'catalogo_oggetto.effetto': 'effetto',
  'giorno.trama': 'trama', 'giorno.vincoli_json': DOCUMENTO,
  // N3: i nomi mostrati; N4: i testi dentro i JSON delle schede
  'libro.nome': 'nome', 'articolo.nome': 'nome', 'catalogo_oggetto.nome': 'nome', 'attivita.nome': 'nome',
  'attivita.doti_json': DOCUMENTO, 'libro.effetti_json': DOCUMENTO, 'catalogo_oggetto.statistiche_json': DOCUMENTO,
};

/** La copia è l'elenco delle abilità del rango (`[{ nome, descrizione }]`): si allinea l'unica abilità con la descrizione di prima. */
const ELEMENTO = { elemento: 'descrizione' } as const;
type Campo = string | typeof DOCUMENTO | typeof PERCORSO | typeof ELEMENTO;

/**
 * Le copie della guida che non stanno nella riga ma in `dati_guida`: la struttura della disponibilità (`disponibilitaStrutturataScritture`)
 * e le fotografie degli editor dei Confidenti (`confidentiScritture`: `confidente-seed-v1:dialogo:<id>` con `note` e `scelte_json`,
 * `confidente-seed-v1:abilita:<confidente>:<rango>` con l'elenco delle abilità del rango).
 */
function copiaInDatiGuida(c: CorrezioneTesto231): { chiave: string; campo: Campo } | null {
  if (c.tabella === 'confidente_disponibilita' && c.colonna === 'motivo_senza_luogo') return { chiave: FOTOGRAFIA_STRUTTURA + String(c.chiave.confidente_chiave), campo: 'motivo_senza_luogo' };
  if (c.tabella === 'confidente_dialogo' && c.colonna === 'note') return { chiave: `confidente-seed-v1:dialogo:${String(c.chiave.id)}`, campo: 'note' };
  if (c.tabella === 'confidente_dialogo' && c.colonna === 'scelte_json') return { chiave: `confidente-seed-v1:dialogo:${String(c.chiave.id)}`, campo: DOCUMENTO };
  if (c.tabella === 'confidente_abilita' && c.colonna === 'descrizione') {
    return { chiave: `confidente-seed-v1:abilita:${String(c.chiave.confidente_chiave)}:${String(c.chiave.rango)}`, campo: ELEMENTO };
  }
  return null;
}

/**
 * La copia della guida con il testo di dopo al posto di quello di prima, o null se non c'è niente da allineare: la copia non è un
 * documento canonico, il suo campo manca o ha già un altro testo. `DOCUMENTO`: il campo (il nome della colonna) è il documento JSON
 * conservato come testo, e si cambia il solo valore al percorso della voce, se il documento conservato è canonico.
 */
function allinea(copia: unknown, campo: Campo, c: CorrezioneTesto231): unknown {
  if (copia === null || typeof copia !== 'object') return null;
  if (campo === ELEMENTO) {
    if (!Array.isArray(copia) || c.percorso) return null;
    const uguali = copia.filter((a) => a !== null && typeof a === 'object' && (a as Record<string, unknown>).descrizione === c.prima);
    if (uguali.length !== 1) return null;
    (uguali[0] as Record<string, unknown>).descrizione = c.dopo;
    return copia;
  }
  if (Array.isArray(copia)) return null;
  const f = copia as Record<string, unknown>;
  if (typeof campo === 'string') {
    if (c.percorso || f[campo] !== c.prima) return null;
    f[campo] = c.dopo;
    return f;
  }
  if (campo === PERCORSO) {
    if (!c.percorso?.every((p) => typeof p === 'string')) return null;
    const p = c.percorso.join('/');
    if (f[p] !== c.prima) return null;
    f[p] = c.dopo;
    return f;
  }
  if (!c.percorso) return null;
  const doc = canonico(f[c.colonna]);
  if (doc === null || valoreAl(doc, c.percorso) !== c.prima) return null;
  impostaAl(doc, c.percorso, c.dopo);
  f[c.colonna] = JSON.stringify(doc);
  return f;
}

const errore = (motivo: string): never => { throw new Error(`232: ${motivo}; nessuna modifica applicata.`); };
const id = (c: CorrezioneTesto231) => `${c.tabella}.${c.colonna}${c.percorso ? JSON.stringify(c.percorso) : ''} ${JSON.stringify(c.chiave)}`;

type Riga = Record<string, unknown>;

/** Tutte le righe della tabella per rowid (la fotografia per il confronto finale). */
function fotografia(db: AppDatabase, tabella: string): Map<number, Riga> {
  const righe = db.prepare(`SELECT rowid AS "__rowid", * FROM main."${tabella}" ORDER BY rowid`).all() as Riga[];
  return new Map(righe.map((r) => [r.__rowid as number, r]));
}

/** Due valori di cella uguali (i BLOB si confrontano per contenuto). */
const uguale = (a: unknown, b: unknown): boolean => (Buffer.isBuffer(a) && Buffer.isBuffer(b) ? a.equals(b) : a === b);

/** Il valore al percorso di un documento JSON, o undefined. */
function valoreAl(doc: unknown, percorso: ReadonlyArray<string | number>): unknown {
  let v: unknown = doc;
  for (const p of percorso) {
    if (v === null || typeof v !== 'object') return undefined;
    v = (v as Record<string | number, unknown>)[p];
  }
  return v;
}
function impostaAl(doc: unknown, percorso: ReadonlyArray<string | number>, valore: string): void {
  let v = doc as Record<string | number, unknown>;
  for (const p of percorso.slice(0, -1)) v = v[p] as Record<string | number, unknown>;
  v[percorso[percorso.length - 1]] = valore;
}
/** Il documento JSON se il testo è nella forma canonica di `JSON.stringify` (riscriverlo non cambia nient'altro), altrimenti null. */
function canonico(testo: unknown): unknown {
  if (typeof testo !== 'string') return null;
  try { const v = JSON.parse(testo) as unknown; return JSON.stringify(v) === testo ? v : null; } catch { return null; }
}

export const migration232: Migration = {
  id: 232, name: 'testi_visibili_puliti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');

    // l'elenco: ogni voce una volta sola, un testo diverso fra prima e dopo
    const viste = new Set<string>();
    for (const c of CORREZIONI_231) {
      if (viste.has(id(c))) errore(`voce ripetuta nell'elenco: ${id(c)}`);
      viste.add(id(c));
      if (c.prima === c.dopo) errore(`voce senza cambiamento: ${id(c)}`);
    }

    const tabelle = [...new Set(CORREZIONI_231.map((c) => c.tabella))].filter((t) => esisteTabella(db, t));
    const conDatiGuida = esisteTabella(db, 'dati_guida');
    const prima = new Map(tabelle.map((t) => [t, fotografia(db, t)]));
    const datiGuidaPrima = conDatiGuida ? fotografia(db, 'dati_guida') : null;
    // ciò che può cambiare: per tabella, rowid → colonne
    const cambiate = new Map<string, Map<number, Set<string>>>();
    const segna = (tabella: string, rowid: number, colonna: string) => {
      const t = cambiate.get(tabella) ?? new Map<number, Set<string>>();
      t.set(rowid, (t.get(rowid) ?? new Set<string>()).add(colonna));
      cambiate.set(tabella, t);
    };

    const applicate: Record<string, number> = {};
    const copieAllineate: Record<string, number> = {};
    /** Le copie allineate per tipo; «testo dell'utente intatto» quando la voce si è saltata ma la copia si è allineata. */
    const conta = (k: string, conTestoDellUtente: boolean) => {
      const n = conTestoDellUtente ? `${k} (testo dell'utente intatto)` : k;
      copieAllineate[n] = (copieAllineate[n] ?? 0) + 1;
    };
    const saltate: Array<{ voce: string; motivo: string }> = [];
    const salta = (c: CorrezioneTesto231, motivo: string) => { saltate.push({ voce: id(c), motivo }); };

    // le copie della guida in `dati_guida` (struttura della disponibilità, dialoghi e abilità dei Confidenti), con la stessa regola
    const allineaFuori = (c: CorrezioneTesto231, conTestoDellUtente: boolean) => {
      const fuori = copiaInDatiGuida(c);
      if (!fuori || !conDatiGuida) return;
      const f = db.prepare('SELECT rowid AS "__rowid", json FROM main.dati_guida WHERE chiave = ?').get(fuori.chiave) as { __rowid: number; json: string } | undefined;
      const allineata = f ? allinea(canonico(f.json), fuori.campo, c) : null;
      if (!f || allineata === null) return;
      const e = db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ? AND json = ?').run(JSON.stringify(allineata), fuori.chiave, f.json);
      if (e.changes !== 1) errore(`la copia ${fuori.chiave} non è stata aggiornata`);
      segna('dati_guida', f.__rowid, 'json');
      conta(`dati_guida.${fuori.chiave.split(':')[0]}`, conTestoDellUtente);
    };

    for (const c of CORREZIONI_231) {
      if (!tabelle.includes(c.tabella)) { salta(c, 'tabella assente'); continue; }
      const colonne = colonneDi(db, c.tabella);
      const chiavi = Object.keys(c.chiave);
      if (!colonne.includes(c.colonna) || chiavi.some((k) => !colonne.includes(k))) { salta(c, 'colonna assente'); continue; }
      const dove = chiavi.map((k) => `"${k}" = ?`).join(' AND ');
      const valoriChiave = chiavi.map((k) => c.chiave[k]);
      const haSeed = colonne.includes('seed_json');
      const riga = db.prepare(`SELECT rowid AS "__rowid", "${c.colonna}" AS valore${haSeed ? ', seed_json' : ''} FROM main."${c.tabella}" WHERE ${dove}`).all(...valoriChiave) as Array<{ __rowid: number; valore: unknown; seed_json?: string | null }>;
      // una riga che l'editor delle abilità ha riscritto (righe rinumerate) non c'è più con la sua chiave: la copia del rango sì
      if (riga.length !== 1) { salta(c, riga.length === 0 ? 'riga assente' : 'chiave non univoca'); if (riga.length === 0) allineaFuori(c, true); continue; }
      const r = riga[0];

      if (c.tabella === 'confidente_disponibilita' && COLONNE_STORICO.includes(c.colonna) && conDatiGuida
        && db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave = ?').get(STORICO_INFORMAZIONI + String(c.chiave.confidente_chiave))) {
        salta(c, 'la riga ha lo storico dell’editor delle informazioni'); continue;
      }

      // il testo di adesso: se è quello di prima la voce si applica; se è un altro (scritto dall'utente) la voce si salta e il testo resta
      // com'è, ma la copia della guida si allinea lo stesso (sotto), così «Ripristina» rimette il testo pulito
      let nuovo: string | null = null;
      if (c.percorso) {
        const doc = canonico(r.valore);
        if (doc === null) { salta(c, 'documento JSON assente o non canonico'); continue; }
        if (valoreAl(doc, c.percorso) === c.prima) { impostaAl(doc, c.percorso, c.dopo); nuovo = JSON.stringify(doc); }
      } else if (r.valore === c.prima) nuovo = c.dopo;
      if (nuovo !== null) {
        const esito = db.prepare(`UPDATE main."${c.tabella}" SET "${c.colonna}" = ? WHERE ${dove} AND "${c.colonna}" = ?`).run(nuovo, ...valoriChiave, r.valore);
        if (esito.changes !== 1) errore(`la voce ${id(c)} non è stata aggiornata`);
        segna(c.tabella, r.__rowid, c.colonna);
        applicate[`${c.tabella}.${c.colonna}`] = (applicate[`${c.tabella}.${c.colonna}`] ?? 0) + 1;
      } else salta(c, 'testo diverso da quello di prima');

      // la copia della guida nella riga, se il suo campo per questa colonna ha ancora il testo di prima (come nella 228)
      const campo = COPIA_DELLA_GUIDA[`${c.tabella}.${c.colonna}`];
      if (campo !== undefined && haSeed && typeof r.seed_json === 'string') {
        const allineata = allinea(canonico(r.seed_json), campo, c);
        if (allineata !== null) {
          const e = db.prepare(`UPDATE main."${c.tabella}" SET seed_json = ? WHERE ${dove} AND seed_json = ?`).run(JSON.stringify(allineata), ...valoriChiave, r.seed_json);
          if (e.changes !== 1) errore(`la copia della guida di ${id(c)} non è stata aggiornata`);
          segna(c.tabella, r.__rowid, 'seed_json');
          conta(`${c.tabella}.seed_json`, nuovo === null);
        }
      }
      allineaFuori(c, nuovo === null);
    }

    // nessun'altra riga, colonna o tabella: confronto riga per riga con la fotografia di prima
    const confronta = (tabella: string, foto: Map<number, Riga>) => {
      const dopo = fotografia(db, tabella);
      if (dopo.size !== foto.size) errore(`la tabella ${tabella} ha cambiato numero di righe`);
      const ammesse = cambiate.get(tabella) ?? new Map<number, Set<string>>();
      for (const [rowid, r] of foto) {
        const n = dopo.get(rowid) ?? errore(`la tabella ${tabella} ha perso la riga ${rowid}`);
        const libere = ammesse.get(rowid) ?? new Set<string>();
        for (const k of Object.keys(r)) if (!libere.has(k) && !uguale(r[k], n[k])) errore(`la tabella ${tabella} è cambiata fuori dall'elenco (riga ${rowid}, colonna ${k})`);
      }
    };
    for (const [t, foto] of prima) confronta(t, foto);
    if (datiGuidaPrima && !tabelle.includes('dati_guida')) confronta('dati_guida', datiGuidaPrima);

    logger.info({ migrazione: 'lotto-C-232', applicate, copieAllineate, saltate: saltate.length, dettaglioSaltate: saltate.slice(0, 20) }, 'testi visibili ripuliti: codici interni, rimandi a file, dominio e accenti');
  },
};
