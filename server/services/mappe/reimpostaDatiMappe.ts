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
import type { EsportazioneMappeDto } from '../../../shared/types.js';
import { importaMappe } from './mappeService.js';
import { collegaPalazziAiLuoghi, sincronizzaMappe } from './sincronizzaMappe.js';
import { applicaPresenzaAiLuoghi } from './presenzaEntita.js';

/** Tabelle che compongono il livello mappe: sono le uniche che la ricostruzione svuota. */
export const TABELLE_MAPPE = [
  'spillo_partita', 'spillo_destinazione', 'spillo_immagine', 'spillo',
  'quartiere_ingresso', 'mappa_presentazione', 'mappa_entita', 'mappa_percorso', 'mappa_alias',
  'guida_alias', 'guida_mappa', 'organizzazione_mappa_esito', 'mappa',
] as const;

export interface RapportoRicarica {
  svuotate: Record<string, number>;
  sincronizzate: { mappe: number; spilli: number; riclassificati: number };
  importate: Array<{ pacchetto: number; mappe: number; spilli: number; saltate: string[]; condizioniScartate: number }>;
  conteggi: { prima: Record<string, number>; dopo: Record<string, number> };
  fuoriDalLivelloMappe: Array<{ tabella: string; prima: number; dopo: number }>;
}

function conteggi(db: AppDatabase): Record<string, number> {
  const tabelle = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Array<{ name: string }>).map((r) => r.name);
  return Object.fromEntries(tabelle.map((t) => [t, (db.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get() as { n: number }).n]));
}

/**
 * Ricostruisce l'atlante dai pacchetti del seed. `pacchetti` sono quelli letti da
 * `data/seed/mappe/`, nello stesso ordine con cui il caricamento del seed li passa.
 */
export function reimpostaDatiMappe(db: AppDatabase, pacchetti: readonly EsportazioneMappeDto[]): RapportoRicarica {
  const prima = conteggi(db);
  const svuotate: Record<string, number> = {};
  const sincronizzate = { mappe: 0, spilli: 0, riclassificati: 0 };
  const importate: RapportoRicarica['importate'] = [];
  db.transaction(() => {
    for (const tabella of TABELLE_MAPPE) {
      if (prima[tabella] === undefined) continue;
      svuotate[tabella] = db.prepare(`DELETE FROM "${tabella}"`).run().changes;
    }
    Object.assign(sincronizzate, sincronizzaMappe(db));
    for (const [indice, pacchetto] of pacchetti.entries()) {
      if (!pacchetto.mappe.length) continue;
      const esito = importaMappe(pacchetto, { origine: 'seed', pacchettiSeed: pacchetti });
      importate.push({ pacchetto: indice, mappe: esito.mappe, spilli: esito.spilli, saltate: esito.saltate, condizioniScartate: esito.condizioniScartate });
    }
    // Dopo l'importazione, non prima: i pin dell'atlante nativo arrivano col pacchetto, e un
    // negozio disegnato sulla planimetria e' lo stesso negozio dell'illustrazione del quartiere.
    // Se chiude di sera devono sparire tutti e due.
    // dopo l'importazione: i pacchetti ripuliscono gli spilli di seed delle mappe che toccano
    collegaPalazziAiLuoghi(db);
    applicaPresenzaAiLuoghi(db);
    const violazioni = db.pragma('foreign_key_check') as unknown[];
    if (violazioni.length) throw new Error('Ricostruzione annullata: vincoli referenziali non soddisfatti.');
  })();
  const dopo = conteggi(db);
  const mappe = new Set<string>(TABELLE_MAPPE);
  return {
    svuotate, sincronizzate, importate, conteggi: { prima, dopo },
    fuoriDalLivelloMappe: Object.keys(dopo)
      .filter((t) => !mappe.has(t) && prima[t] !== dopo[t])
      .map((t) => ({ tabella: t, prima: prima[t] ?? 0, dopo: dopo[t] })),
  };
}
