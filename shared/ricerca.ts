// ============================================================
// ricerca — i tipi di oggetto della ricerca globale, le etichette dei gruppi, i limiti e i DTO: condivisi da server e interfaccia (L11, B3)
// ============================================================
//
// Regola di R11-10b: le etichette dicono il tipo di cosa che si trova; per un posto non compare mai «Mappa» né «atlante» (la pagina dei
// posti si chiama «Luoghi della guida»). Un tipo che si aggiunge qui senza il suo costruttore nel server (`Record<TipoRicerca, …>` in
// `server/services/ricerca/indiceRicerca.ts`) non compila: così ogni tipo ha voci e una casa (R11-09/1), per costruzione e non per test.
// ============================================================

import type { IllustrazioneDto } from './types.js';

/** Nell'ordine in cui il server costruisce l'indice e, a parità di punteggio, l'interfaccia mostra i gruppi. */
export const TIPI_RICERCA = [
  'confidente', 'persona', 'ombra', 'skill', 'oggetto', 'libro', 'film', 'videogioco',
  'luogo', 'negozio', 'attivita', 'quartiere', 'citta', 'area', 'planimetria',
  'palazzo', 'infiltrazione', 'dedalo', 'area-dedalo', 'voce',
  'richiesta', 'giorno', 'domanda', 'trofeo', 'sfida',
] as const;
export type TipoRicerca = (typeof TIPI_RICERCA)[number];

/** Come si chiama un gruppo e un suo elemento (il singolare serve all'etichetta accessibile di un risultato). */
export const ETICHETTE_RICERCA: Readonly<Record<TipoRicerca, { singolare: string; plurale: string }>> = {
  confidente: { singolare: 'Confidente', plurale: 'Confidenti' },
  persona: { singolare: 'Persona', plurale: 'Persona' },
  ombra: { singolare: 'Ombra', plurale: 'Ombre' },
  skill: { singolare: 'Skill', plurale: 'Skill' },
  oggetto: { singolare: 'Oggetto', plurale: 'Oggetti' },
  libro: { singolare: 'Libro', plurale: 'Libri' },
  film: { singolare: 'Film', plurale: 'Film e DVD' },
  videogioco: { singolare: 'Videogioco', plurale: 'Videogiochi' },
  luogo: { singolare: 'Luogo', plurale: 'Luoghi' },
  negozio: { singolare: 'Negozio', plurale: 'Negozi' },
  attivita: { singolare: 'Attività', plurale: 'Attività' },
  quartiere: { singolare: 'Quartiere', plurale: 'Quartieri' },
  citta: { singolare: 'Città', plurale: 'Città' },
  area: { singolare: 'Area', plurale: 'Aree' },
  planimetria: { singolare: 'Planimetria', plurale: 'Planimetrie' },
  palazzo: { singolare: 'Palazzo', plurale: 'Palazzi e Memento' },
  infiltrazione: { singolare: 'Infiltrazione', plurale: 'Infiltrazioni' },
  dedalo: { singolare: 'Dedalo', plurale: 'Dedali' },
  'area-dedalo': { singolare: 'Area del dedalo', plurale: 'Aree dei dedali' },
  voce: { singolare: 'Voce della guida', plurale: 'Voci della guida' },
  richiesta: { singolare: 'Richiesta', plurale: 'Richieste' },
  giorno: { singolare: 'Giorno', plurale: 'Giorni' },
  domanda: { singolare: 'Domanda in classe', plurale: 'Domande in classe' },
  trofeo: { singolare: 'Trofeo', plurale: 'Trofei' },
  sfida: { singolare: 'Sfida', plurale: 'Sfide' },
};

export const MIN_CARATTERI_RICERCA = 2;
export const LIMITE_PREDEFINITO_RICERCA = 8;
export const LIMITE_MASSIMO_RICERCA = 50;
/** Il parametro d'indirizzo che dice quale elemento di un elenco mostrare (lo legge il pannello della scheda e, da B4, anche la pagina). */
export const PARAMETRO_ELEMENTO = 'elemento';

/** Il segno di un risultato: il posto è chiuso adesso o non ancora aperto (con la partita, R11-10b/1), o l'area è «da verificare» (R11-10b/3).
 *  `testo` è già scritto dalla regola unica di L5 (`presenzaDelLuogo`), mai riscritto dall'interfaccia. */
export interface StatoRicercaDto { tipo: 'chiuso-adesso' | 'non-ancora-aperto' | 'da-verificare'; testo: string }

/** Un oggetto trovato. */
export interface RisultatoRicercaDto {
  tipo: TipoRicerca;
  /** Chiave dell'oggetto nel suo tipo (per Persona e Skill l'id come testo): serve alla chiave React e a «Mostra altri». */
  chiave: string;
  /** Il nome come lo mostrano le pagine (italiano). */
  nome: string;
  /** Il nome originale o il sinonimo per cui è stato trovato, se non è il nome mostrato («Queen» per Makoto); null se ha trovato il nome. */
  trovatoCome: string | null;
  /** Il posto nella gerarchia dal contenitore più grande, senza il nome stesso: ['Tokyo', 'Shibuya']; vuoto per le radici e per i tipi senza gerarchia. */
  percorso: string[];
  /** La pagina dell'oggetto: sempre un indirizzo del router (mai il visore `/guida/mappe/<chiave>`). */
  casa: string;
  /** L'immagine con la regola unica (`immagineMappa.ts` per i posti): la caricata, poi l'asset predefinito; null se il tipo non ne ha una. */
  immagine: IllustrazioneDto | null;
  stato: StatoRicercaDto | null;
}

/** I risultati di un tipo: `totale` è quanti corrispondono, `risultati` i migliori fino al limite. */
export interface GruppoRicercaDto { tipo: TipoRicerca; totale: number; risultati: RisultatoRicercaDto[] }

/** La risposta di `GET /api/ricerca`: i gruppi in ordine di miglior corrispondenza; nessun gruppo vuoto. */
export interface RicercaGlobaleDto { q: string; totale: number; gruppi: GruppoRicercaDto[] }
