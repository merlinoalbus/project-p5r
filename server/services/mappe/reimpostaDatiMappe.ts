// ============================================================
// reimpostaDatiMappe — svuota il livello mappe e lo ricostruisce dal seed
// ============================================================
//
// Serve quando il pacchetto dell'atlante cambia in modo non incrementale: il reseed normale
// aggiunge e aggiorna, ma non toglie i nodi che il nuovo pacchetto non prevede più. Qui il
// livello mappe viene azzerato e ricostruito, in un'unica transazione.
//
// Tocca soltanto le tabelle dell'atlante. Partite, catalogo, Persona, confidenti, negozi e
// contenuti della guida restano dove sono: il rapporto conta tutte le tabelle prima e dopo,
// così l'affermazione è verificabile invece che dichiarata.
// ============================================================

import type { AppDatabase } from '../../db/dbService.js';
import { percorsoPacchettoDb, regoleAllAvvio } from '../pacchetto/pacchettoGioco.js';

/** Tabelle che compongono il livello mappe: sono le uniche che la ricostruzione svuota. */
export const TABELLE_MAPPE = [
  'spillo_partita', 'spillo_destinazione', 'spillo_immagine', 'spillo',
  'quartiere_ingresso', 'mappa_presentazione', 'mappa_entita', 'mappa_percorso', 'mappa_alias',
  'guida_alias', 'guida_mappa', 'organizzazione_mappa_esito', 'mappa',
] as const;

export interface RapportoRicarica {
  svuotate: Record<string, number>;
  /** Le regole sui dati riapplicate dopo la copia (le stesse dell'avvio). */
  sincronizzate: { spilliTradotti: number; luoghiCollegati: number; spilliRiallineati: number; spilliIdentificati: number };
  importate: Array<{ pacchetto: number; mappe: number; spilli: number; saltate: string[]; condizioniScartate: number }>;
  conteggi: { prima: Record<string, number>; dopo: Record<string, number> };
  fuoriDalLivelloMappe: Array<{ tabella: string; prima: number; dopo: number }>;
}

function conteggi(db: AppDatabase): Record<string, number> {
  const tabelle = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Array<{ name: string }>).map((r) => r.name);
  return Object.fromEntries(tabelle.map((t) => [t, (db.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get() as { n: number }).n]));
}

/**
 * Ricostruisce il livello mappe dal pacchetto di gioco del repository: svuota le tabelle delle
 * mappe, le ricopia dal pacchetto (attaccato in sola lettura) così com'è — è la fotografia dei dati,
 * nessuna sincronizzazione con la guida — e riapplica le regole sui dati dell'avvio. I segni
 * «raccolto» delle partite non si toccano: sono legati all'uid dello spillo, che è l'impronta della
 * sua identità e quindi è lo stesso nel pacchetto e nell'istanza.
 */
export function reimpostaDatiMappe(db: AppDatabase, pacchetto: string = percorsoPacchettoDb()): RapportoRicarica {
  const prima = conteggi(db);
  const svuotate: Record<string, number> = {};
  const sincronizzate = { spilliTradotti: 0, luoghiCollegati: 0, spilliRiallineati: 0, spilliIdentificati: 0 };
  const importate: RapportoRicarica['importate'] = [];
  db.prepare('ATTACH DATABASE ? AS pacchetto').run(pacchetto);
  try {
    db.transaction(() => {
      for (const tabella of TABELLE_MAPPE) {
        if (prima[tabella] === undefined || tabella === 'spillo_partita') continue;
        svuotate[tabella] = db.prepare(`DELETE FROM "${tabella}"`).run().changes;
      }
      let mappe = 0; let spilli = 0;
      for (const tabella of [...TABELLE_MAPPE].reverse()) {
        if (tabella === 'spillo_partita' || prima[tabella] === undefined) continue;
        if (!db.prepare("SELECT 1 FROM pacchetto.sqlite_master WHERE type = 'table' AND name = ?").get(tabella)) continue;
        const colonne = (db.prepare(`PRAGMA main.table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name);
        const nelPacchetto = new Set((db.prepare(`PRAGMA pacchetto.table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name));
        const comuni = colonne.filter((c) => nelPacchetto.has(c)).map((c) => `"${c}"`).join(', ');
        const n = db.prepare(`INSERT INTO main."${tabella}" (${comuni}) SELECT ${comuni} FROM pacchetto."${tabella}"`).run().changes;
        if (tabella === 'mappa') mappe = n; if (tabella === 'spillo') spilli = n;
      }
      importate.push({ pacchetto: 0, mappe, spilli, saltate: [], condizioniScartate: 0 });
      Object.assign(sincronizzate, regoleAllAvvio(db));
      const violazioni = db.pragma('foreign_key_check') as unknown[];
      if (violazioni.length) throw new Error('Ricostruzione annullata: vincoli referenziali non soddisfatti.');
    })();
  } finally {
    db.prepare('DETACH DATABASE pacchetto').run();
  }
  const dopo = conteggi(db);
  const mappe = new Set<string>(TABELLE_MAPPE);
  return {
    svuotate, sincronizzate, importate, conteggi: { prima, dopo },
    fuoriDalLivelloMappe: Object.keys(dopo)
      .filter((t) => !mappe.has(t) && prima[t] !== dopo[t])
      .map((t) => ({ tabella: t, prima: prima[t] ?? 0, dopo: dopo[t] })),
  };
}
