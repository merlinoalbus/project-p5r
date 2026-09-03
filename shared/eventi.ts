// ============================================================
// eventi — tipi dello storico della partita (Fase 5.1), condivisi da backend e frontend
// ============================================================
//
// Ogni modifica di tracking registra un evento in `evento_partita` (titolo e dettaglio già in italiano,
// più i dati grezzi in JSON per eventuali usi futuri). L'utente può eliminare una voce sbagliata.
// ============================================================

export const TIPI_EVENTO = [
  'partita-creata',
  'livello-protagonista',
  'allarme',
  'dote-rango',
  'confidente-sbloccato',
  'confidente-rango',
  'compendio-registrata',
  'persona-aggiunta',
  'persona-livello',
  'persona-skill',
  'persona-statistiche',
  'persona-rimossa',
  'fusione-eseguita',
  'forca',
  'isolamento',
  'obiettivo-creato',
  'obiettivo-raggiunto',
  'piano-salvato',
  'ciclo-salvato',
  'ciclo-anello',
  'ciclo-iterazione',
  'domanda-risposta',
  'punto-dungeon',
  'richiesta-completata',
] as const;

export type TipoEvento = (typeof TIPI_EVENTO)[number];

/** Etichetta italiana e gruppo di ogni tipo (i gruppi guidano i filtri dell'interfaccia). */
export const ETICHETTE_EVENTO: Readonly<Record<TipoEvento, { nome: string; gruppo: 'partita' | 'doti' | 'confidenti' | 'persona' | 'velluto' | 'obiettivi' | 'dungeon' }>> = {
  'partita-creata': { nome: 'Partita creata', gruppo: 'partita' },
  'livello-protagonista': { nome: 'Livello del protagonista', gruppo: 'partita' },
  allarme: { nome: 'Allarme delle fusioni', gruppo: 'velluto' },
  'dote-rango': { nome: 'Rango di una Dote sociale', gruppo: 'doti' },
  'confidente-sbloccato': { nome: 'Confidente sbloccato', gruppo: 'confidenti' },
  'confidente-rango': { nome: 'Rango di un Confidente', gruppo: 'confidenti' },
  'compendio-registrata': { nome: 'Persona registrata nel compendio', gruppo: 'persona' },
  'persona-aggiunta': { nome: 'Persona aggiunta alla scorta', gruppo: 'persona' },
  'persona-livello': { nome: 'Livello di una Persona', gruppo: 'persona' },
  'persona-skill': { nome: 'Skill di una Persona', gruppo: 'persona' },
  'persona-statistiche': { nome: 'Statistiche di una Persona', gruppo: 'persona' },
  'persona-rimossa': { nome: 'Persona rimossa dalla scorta', gruppo: 'persona' },
  'fusione-eseguita': { nome: 'Fusione eseguita', gruppo: 'velluto' },
  forca: { nome: 'Forca (Potenziamento)', gruppo: 'velluto' },
  isolamento: { nome: 'Isolamento', gruppo: 'velluto' },
  'obiettivo-creato': { nome: 'Obiettivo creato', gruppo: 'obiettivi' },
  'obiettivo-raggiunto': { nome: 'Obiettivo raggiunto', gruppo: 'obiettivi' },
  'piano-salvato': { nome: 'Piano di fusione salvato', gruppo: 'obiettivi' },
  'ciclo-salvato': { nome: 'Ciclo di fusione salvato', gruppo: 'obiettivi' },
  'ciclo-anello': { nome: 'Anello di un ciclo eseguito', gruppo: 'velluto' },
  'ciclo-iterazione': { nome: 'Giro di un ciclo completato', gruppo: 'velluto' },
  'domanda-risposta': { nome: 'Domanda in classe risposta', gruppo: 'doti' },
  'punto-dungeon': { nome: 'Punto di interesse gestito', gruppo: 'dungeon' },
  'richiesta-completata': { nome: 'Richiesta dei Mementos completata', gruppo: 'dungeon' },
};

export const GRUPPI_EVENTO: ReadonlyArray<{ chiave: (typeof ETICHETTE_EVENTO)[TipoEvento]['gruppo']; nome: string }> = [
  { chiave: 'partita', nome: 'Partita' },
  { chiave: 'doti', nome: 'Doti sociali' },
  { chiave: 'confidenti', nome: 'Confidenti' },
  { chiave: 'persona', nome: 'Persona' },
  { chiave: 'velluto', nome: 'Stanza di Velluto' },
  { chiave: 'obiettivi', nome: 'Obiettivi e piani' },
  { chiave: 'dungeon', nome: 'Dungeon' },
];

/** Tipi appartenenti a un gruppo. */
export function tipiDelGruppo(gruppo: (typeof GRUPPI_EVENTO)[number]['chiave']): TipoEvento[] {
  return TIPI_EVENTO.filter((t) => ETICHETTE_EVENTO[t].gruppo === gruppo);
}
