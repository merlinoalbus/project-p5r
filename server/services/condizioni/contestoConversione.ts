// ============================================================
// contestoConversione — quello che il convertitore prosa→stati chiede al database
// ============================================================
//
// `shared/migraCondizioni.ts` non tocca il DB: riceve funzioni. Qui si costruiscono, una volta
// per uso, dalle tabelle della Guida: il nome di una richiesta, di un libro, di un film o di un
// articolo → la sua chiave; se un quartiere ha una data di sblocco; quali libri vende Jinbocho;
// la finestra di ogni Palazzo. Il `db` è esplicito: lo passa chi chiama
// (il salvataggio del catalogo, i test).
// ============================================================

import type Database from 'better-sqlite3';
import type { ContestoConversione } from '../../../shared/migraCondizioni.js';
import { bloccoGuidaDi, finestreDaDati, type FinestraDungeon } from '../datiGuida.js';

/** Forma di confronto di un nome: senza accenti, apici e virgolette tipografiche ridotti all'apostrofo, minuscole, spazi compattati. */
function piatto(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`´“”„"]/g, "'").toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Nome → chiave, con lettura pigra della tabella. */
function cercaPerNome(db: Database.Database, sql: string): (nome: string) => string | null {
  let mappa: Map<string, string> | null = null;
  return (nome) => {
    if (!mappa) {
      mappa = new Map();
      for (const r of db.prepare(sql).all() as Array<{ chiave: string; nome: string }>) {
        mappa.set(piatto(r.nome), r.chiave);
      }
    }
    return mappa.get(piatto(nome)) ?? null;
  };
}

/** Vero se la condizione è una data, anche dentro un gruppo. */
function contieneData(condizione: unknown): boolean {
  if (typeof condizione !== 'object' || condizione === null) return false;
  const c = condizione as { tipo?: unknown; condizioni?: unknown };
  return c.tipo === 'data' || (c.tipo === 'gruppo' && Array.isArray(c.condizioni) && c.condizioni.some(contieneData));
}

/** Vero se il `condizioni_json` di un quartiere contiene una data; un JSON illeggibile vale «non datato». */
function condizioniConData(json: string | null): boolean {
  if (!json) return false;
  try {
    const valore = JSON.parse(json) as unknown;
    return Array.isArray(valore) && valore.some(contieneData);
  } catch {
    return false;
  }
}

/**
 * I quartieri «datati» per la conversione delle frasi: vale la condizione del quartiere (`condizioni_json`): Ikebukuro, Odaiba e Maihama non
 * contano come datati (la loro condizione è un luogo), Kanda-Jinbocho e Roppongi sì (la condizione ha una data), come Shinjuku, Kichijoji,
 * Akihabara e Suidobashi.
 */
function quartieriDatati(db: Database.Database): Set<string> {
  const righe = db.prepare('SELECT chiave, condizioni_json FROM quartiere').all() as Array<{ chiave: string; condizioni_json: string | null }>;
  return new Set(righe.filter((r) => condizioniConData(r.condizioni_json)).map((r) => r.chiave));
}

/** Il contesto di base: le funzioni di ricerca sui dati della Guida. Ogni riga vi aggiunge negozio, gestore e chiave. */
export function contestoConversione(db: Database.Database): ContestoConversione {
  let datati: Set<string> | null = null;
  let finestre: Map<string, FinestraDungeon> | null = null;
  return {
    richiesta: cercaPerNome(db, 'SELECT chiave, nome FROM richiesta'),
    libro: cercaPerNome(db, 'SELECT chiave, nome FROM libro'),
    film: cercaPerNome(db, 'SELECT chiave, nome FROM film'),
    articolo: cercaPerNome(db, 'SELECT chiave, nome FROM articolo'),
    attivita: cercaPerNome(db, 'SELECT chiave, nome FROM attivita'),
    quartiereDatato: (q) => {
      if (!datati) datati = quartieriDatati(db);
      return datati.has(q);
    },
    libriJinbocho: () => (db.prepare("SELECT chiave FROM libro WHERE dove LIKE '%Jinbocho%' ORDER BY ordine").all() as Array<{ chiave: string }>).map((r) => r.chiave),
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
    : negozio ? ((db.prepare('SELECT confidente_chiave FROM negozio WHERE chiave = ?').get(negozio) as { confidente_chiave: string | null } | undefined)?.confidente_chiave ?? null) : null;
  let libroCorrente: string | null = null;
  if (riga.tabella === 'libro' && db.prepare('SELECT 1 FROM libro WHERE chiave = ?').get(riga.chiave)) libroCorrente = riga.chiave;
  if (riga.tabella === 'articolo') {
    // Un null esplicito è una rimozione del legame: non si ripiega sulla vecchia riga.
    const catalogo = riga.catalogo_chiave !== undefined ? riga.catalogo_chiave
      : (db.prepare('SELECT catalogo_chiave FROM articolo WHERE chiave = ?').get(riga.chiave) as { catalogo_chiave: string | null } | undefined)?.catalogo_chiave;
    if (typeof catalogo === 'string') {
      const libri = db.prepare('SELECT chiave FROM libro WHERE catalogo_chiave = ?').all(catalogo) as Array<{ chiave: string }>;
      if (libri.length === 1) libroCorrente = libri[0].chiave;
    }
  }
  return { ...base, negozio, confidenteNegozio: confidente, chiaveCorrente: riga.chiave, tabellaCorrente: riga.tabella, libroCorrente };
}
