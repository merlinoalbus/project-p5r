// ============================================================
// contestoConversione — quello che il convertitore prosa→stati chiede al database
// ============================================================
//
// `shared/migraCondizioni.ts` non tocca il DB: riceve funzioni. Qui si costruiscono, una volta
// per uso, dalle tabelle della Guida: il nome di una richiesta, di un libro, di un film o di un
// articolo → la sua chiave; se un quartiere ha una data di sblocco; quali libri vende Jinbocho;
// la finestra di ogni Palazzo. Si accetta il `db` esplicito perché serve anche alle migrazioni,
// che non passano dal `prepared` condiviso.
// ============================================================

import type Database from 'better-sqlite3';
import type { ContestoConversione } from '../../../shared/migraCondizioni.js';
import { bloccoGuidaDi, finestreDaDati, type FinestraDungeon } from '../datiGuida.js';

/** Forma di confronto di un nome: senza accenti, apici e virgolette tipografiche ridotti all'apostrofo, minuscole, spazi compattati. */
function piatto(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`´“”„"]/g, "'").toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Nome (o nome italiano) → chiave, con lettura pigra della tabella. */
function cercaPerNome(db: Database.Database, sql: string): (nome: string) => string | null {
  let mappa: Map<string, string> | null = null;
  return (nome) => {
    if (!mappa) {
      mappa = new Map();
      for (const r of db.prepare(sql).all() as Array<{ chiave: string; nome: string; nome_it?: string | null }>) {
        mappa.set(piatto(r.nome), r.chiave);
        if (r.nome_it) mappa.set(piatto(r.nome_it), r.chiave);
      }
    }
    return mappa.get(piatto(nome)) ?? null;
  };
}

/** Vero se la tabella esiste nel `db`: le migrazioni possono girare quando le tabelle della Guida non sono ancora state create. */
function haTabella(db: Database.Database, nome: string): boolean {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(nome);
}

/**
 * La query che legge i nomi di una tabella: `nome_it` (la copia italiana, tolta dal modello di libri, film e articoli) si legge solo se la colonna
 * c'è ancora, perché le migrazioni storiche girano anche su database di prima della sua eliminazione (L11, R11-02/10); dopo, non esiste più.
 */
function selezioneNomi(db: Database.Database, tabella: string): string {
  const colonne = (db.prepare(`PRAGMA table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name);
  return `SELECT chiave, nome${colonne.includes('nome_it') ? ', nome_it' : ''} FROM ${tabella}`;
}

/** Il contesto di base: le funzioni di ricerca sui dati della Guida. Ogni riga vi aggiunge negozio, gestore e chiave. */
export function contestoConversione(db: Database.Database): ContestoConversione {
  /** Ricerca di ripiego per le tabelle che mancano: non trova mai nulla. */
  const vuoto = () => null;
  /** Abbreviazione di `haTabella` sul `db` di questo contesto. */
  const ha = (t: string) => haTabella(db, t);
  let datati: Set<string> | null = null;
  let finestre: Map<string, FinestraDungeon> | null = null;
  return {
    richiesta: ha('richiesta') ? cercaPerNome(db, 'SELECT chiave, nome FROM richiesta') : vuoto,
    libro: ha('libro') ? cercaPerNome(db, selezioneNomi(db, 'libro')) : vuoto,
    film: ha('film') ? cercaPerNome(db, selezioneNomi(db, 'film')) : vuoto,
    articolo: ha('articolo') ? cercaPerNome(db, selezioneNomi(db, 'articolo')) : vuoto,
    attivita: ha('attivita') ? cercaPerNome(db, 'SELECT chiave, nome FROM attivita') : vuoto,
    quartiereDatato: (q) => {
      if (!datati) datati = new Set(ha('quartiere') ? (db.prepare('SELECT chiave FROM quartiere WHERE sblocco_data IS NOT NULL').all() as Array<{ chiave: string }>).map((r) => r.chiave) : []);
      return datati.has(q);
    },
    libriJinbocho: () => (ha('libro') ? (db.prepare("SELECT chiave FROM libro WHERE dove LIKE '%Jinbocho%' ORDER BY ordine").all() as Array<{ chiave: string }>).map((r) => r.chiave) : []),
    finestraArco: (d) => {
      // una trascrizione assente o illeggibile vale «nessuna finestra»: non si indovina
      if (!finestre) finestre = finestreDaDati(bloccoGuidaDi(db, 'finestre-dungeon'));
      return finestre.get(d) ?? null;
    },
  };
}

/** Il contesto di una riga del catalogo: il negozio e chi lo gestisce, per «grado cliente», «punti negozio» e «Rango Confidente 3». */
export function contestoRiga(db: Database.Database, base: ContestoConversione, riga: { tabella: string; chiave: string; negozio_chiave?: unknown; confidente_chiave?: unknown; catalogo_chiave?: unknown }): ContestoConversione {
  const negozio = riga.tabella === 'negozio' ? riga.chiave : riga.tabella === 'articolo' && typeof riga.negozio_chiave === 'string' ? riga.negozio_chiave : null;
  const confidente = riga.tabella === 'negozio'
    ? (typeof riga.confidente_chiave === 'string' ? riga.confidente_chiave : null)
    : negozio && haTabella(db, 'negozio') ? ((db.prepare('SELECT confidente_chiave FROM negozio WHERE chiave = ?').get(negozio) as { confidente_chiave: string | null } | undefined)?.confidente_chiave ?? null) : null;
  let libroCorrente: string | null = null;
  if (riga.tabella === 'libro' && haTabella(db, 'libro') && db.prepare('SELECT 1 FROM libro WHERE chiave = ?').get(riga.chiave)) libroCorrente = riga.chiave;
  if (riga.tabella === 'articolo' && haTabella(db, 'articolo') && haTabella(db, 'libro')) {
    const colArticolo = new Set((db.prepare('PRAGMA main.table_info(articolo)').all() as Array<{ name: string }>).map((c) => c.name));
    const colLibro = new Set((db.prepare('PRAGMA main.table_info(libro)').all() as Array<{ name: string }>).map((c) => c.name));
    if (colArticolo.has('catalogo_chiave') && colLibro.has('catalogo_chiave')) {
      // Un null esplicito è una rimozione del legame: non si ripiega sulla vecchia riga.
      const catalogo = riga.catalogo_chiave !== undefined ? riga.catalogo_chiave
        : (db.prepare('SELECT catalogo_chiave FROM articolo WHERE chiave = ?').get(riga.chiave) as { catalogo_chiave: string | null } | undefined)?.catalogo_chiave;
      if (typeof catalogo === 'string') {
        const libri = db.prepare('SELECT chiave FROM libro WHERE catalogo_chiave = ?').all(catalogo) as Array<{ chiave: string }>;
        if (libri.length === 1) libroCorrente = libri[0].chiave;
      }
    } else if (!colArticolo.has('catalogo_chiave') && !colLibro.has('catalogo_chiave') && (db.pragma('main.user_version', { simple: true }) as number) < 121) {
      // Unica corrispondenza storica attestata dalla fonte pubblica, prima delle FK L7.
      // Nessuna deduzione dal nome, nessun fallback per FK moderne assenti o ambigue.
      const r = colArticolo.has('origine') ? db.prepare('SELECT origine FROM articolo WHERE chiave = ?').get(riga.chiave) as { origine: string } | undefined : undefined;
      if (riga.catalogo_chiave === undefined && riga.chiave === 'libreria-nagiuri/comprendere-il-cuore' && r?.origine === 'seed'
        && db.prepare('SELECT 1 FROM libro WHERE chiave = ?').get('comprendere-il-cuore')) libroCorrente = 'comprendere-il-cuore';
    }
  }
  return { ...base, negozio, confidenteNegozio: confidente, chiaveCorrente: riga.chiave, tabellaCorrente: riga.tabella, libroCorrente };
}
