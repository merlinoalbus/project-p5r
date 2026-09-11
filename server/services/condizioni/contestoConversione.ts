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

function haTabella(db: Database.Database, nome: string): boolean {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(nome);
}

/** Il contesto di base: le funzioni di ricerca sui dati della Guida. Ogni riga vi aggiunge negozio, gestore e chiave. */
export function contestoConversione(db: Database.Database): ContestoConversione {
  const vuoto = () => null;
  const ha = (t: string) => haTabella(db, t);
  let datati: Set<string> | null = null;
  let finestre: Map<string, { dal: string; al: string | null }> | null = null;
  return {
    richiesta: ha('richiesta') ? cercaPerNome(db, 'SELECT chiave, nome FROM richiesta') : vuoto,
    libro: ha('libro') ? cercaPerNome(db, 'SELECT chiave, nome, nome_it FROM libro') : vuoto,
    film: ha('film') ? cercaPerNome(db, 'SELECT chiave, nome, nome_it FROM film') : vuoto,
    articolo: ha('articolo') ? cercaPerNome(db, 'SELECT chiave, nome, nome_it FROM articolo') : vuoto,
    attivita: ha('attivita') ? cercaPerNome(db, 'SELECT chiave, nome FROM attivita') : vuoto,
    quartiereDatato: (q) => {
      if (!datati) datati = new Set(ha('quartiere') ? (db.prepare('SELECT chiave FROM quartiere WHERE sblocco_data IS NOT NULL').all() as Array<{ chiave: string }>).map((r) => r.chiave) : []);
      return datati.has(q);
    },
    libriJinbocho: () => (ha('libro') ? (db.prepare("SELECT chiave FROM libro WHERE dove LIKE '%Jinbocho%' ORDER BY ordine").all() as Array<{ chiave: string }>).map((r) => r.chiave) : []),
    finestraArco: (d) => {
      if (!finestre) {
        finestre = new Map();
        const riga = ha('dati_guida') ? (db.prepare("SELECT json FROM dati_guida WHERE chiave = 'finestre-dungeon'").get() as { json: string } | undefined) : undefined;
        if (riga) {
          try {
            const dati = JSON.parse(riga.json) as { finestre?: Array<{ dungeon: string; dal?: string | null; al?: string | null }> };
            for (const f of dati.finestre ?? []) if (f.dal) finestre.set(f.dungeon, { dal: f.dal, al: f.al ?? null });
          } catch { /* trascrizione illeggibile: nessuna finestra, non si indovina */ }
        }
      }
      return finestre.get(d) ?? null;
    },
  };
}

/** Il contesto di una riga del catalogo: il negozio e chi lo gestisce, per «grado cliente», «punti negozio» e «Rango Confidente 3». */
export function contestoRiga(db: Database.Database, base: ContestoConversione, riga: { tabella: string; chiave: string; negozio_chiave?: unknown; confidente_chiave?: unknown }): ContestoConversione {
  const negozio = riga.tabella === 'negozio' ? riga.chiave : riga.tabella === 'articolo' && typeof riga.negozio_chiave === 'string' ? riga.negozio_chiave : null;
  const confidente = riga.tabella === 'negozio'
    ? (typeof riga.confidente_chiave === 'string' ? riga.confidente_chiave : null)
    : negozio && haTabella(db, 'negozio') ? ((db.prepare('SELECT confidente_chiave FROM negozio WHERE chiave = ?').get(negozio) as { confidente_chiave: string | null } | undefined)?.confidente_chiave ?? null) : null;
  return { ...base, negozio, confidenteNegozio: confidente, chiaveCorrente: riga.chiave };
}
