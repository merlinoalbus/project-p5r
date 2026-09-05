// ============================================================
// Registro dei tipi di spillo delle mappe (Fase 13): icona, colore, collezionabile per default, corrispondenze dai tipi esistenti
// ============================================================
//
// Condiviso fra server (migrazione dei marcatori, importazione) e frontend (visore, editor, legenda). L'icona è l'asset
// `ui/spillo-<tipo>` (prompt §18) con riserva SVG in codice (`IconaSpillo`).
// ============================================================

export const TIPI_SPILLO = ['passaggio', 'negozio', 'forziere', 'tesoro', 'tesoro-palazzo', 'seme-bramosia', 'oggetto-chiave', 'boss', 'miniboss', 'nemico', 'punto-sensibile', 'sicura', 'scorciatoia', 'confidente', 'dialogo', 'attivita', 'ristorante', 'distributore', 'treno', 'nota'] as const;
export type TipoSpillo = (typeof TIPI_SPILLO)[number];

export const TIPI_RIFERIMENTO = ['mappa', 'negozio', 'punto', 'luogo', 'confidente', 'richiesta', 'attivita'] as const;
export type TipoRiferimento = (typeof TIPI_RIFERIMENTO)[number];

export interface DefinizioneSpillo {
  nome: string;
  colore: string;
  /** Sparisce quando raccolto (salvo «mostra anche i raccolti»). */
  collezionabile: boolean;
  /** Riferimento tipico dello spillo. */
  riferimento: TipoRiferimento | null;
}

export const DEFINIZIONI_SPILLO: Record<TipoSpillo, DefinizioneSpillo> = {
  passaggio: { nome: 'Passaggio', colore: '#3b82f6', collezionabile: false, riferimento: 'mappa' },
  negozio: { nome: 'Negozio', colore: '#22c55e', collezionabile: false, riferimento: 'negozio' },
  forziere: { nome: 'Forziere', colore: '#eab308', collezionabile: true, riferimento: 'punto' },
  tesoro: { nome: 'Tesoro', colore: '#a855f7', collezionabile: true, riferimento: 'punto' },
  'tesoro-palazzo': { nome: 'Tesoro del Palazzo', colore: '#d946ef', collezionabile: true, riferimento: 'punto' },
  'seme-bramosia': { nome: 'Seme della bramosia', colore: '#c85cff', collezionabile: true, riferimento: 'punto' },
  'oggetto-chiave': { nome: 'Oggetto chiave', colore: '#fbbf24', collezionabile: true, riferimento: 'punto' },
  boss: { nome: 'Boss', colore: '#e5352b', collezionabile: true, riferimento: 'punto' },
  miniboss: { nome: 'Miniboss', colore: '#f97316', collezionabile: true, riferimento: 'punto' },
  nemico: { nome: 'Nemico', colore: '#b0b0c0', collezionabile: false, riferimento: 'punto' },
  'punto-sensibile': { nome: 'Punto sensibile', colore: '#7fd8c8', collezionabile: false, riferimento: 'punto' },
  sicura: { nome: 'Stanza sicura', colore: '#38bdf8', collezionabile: false, riferimento: 'punto' },
  scorciatoia: { nome: 'Scorciatoia', colore: '#9ca3af', collezionabile: false, riferimento: 'punto' },
  confidente: { nome: 'Confidente', colore: '#ec4899', collezionabile: false, riferimento: 'confidente' },
  /** Conversazione con un personaggio che non è un Confidente: si «raccoglie» una volta fatta; nessun riferimento tipico (il luogo si sceglie a mano se serve). */
  dialogo: { nome: 'Dialogo', colore: '#6366f1', collezionabile: true, riferimento: null },
  attivita: { nome: 'Attività', colore: '#facc15', collezionabile: false, riferimento: 'luogo' },
  ristorante: { nome: 'Ristorante', colore: '#a16207', collezionabile: false, riferimento: 'luogo' },
  distributore: { nome: 'Distributore', colore: '#06b6d4', collezionabile: false, riferimento: 'luogo' },
  treno: { nome: 'Stazione', colore: '#15803d', collezionabile: false, riferimento: 'mappa' },
  nota: { nome: 'Nota', colore: '#ececf1', collezionabile: false, riferimento: null },
};

/** Tipo di spillo per un punto di interesse dei dungeon (tipi di `utils/dungeon.ts`). */
export function spilloPerPunto(tipoPunto: string): TipoSpillo {
  switch (tipoPunto) {
    case 'forziere': case 'forziere-chiuso': return 'forziere';
    case 'oggetto': return 'oggetto-chiave';
    case 'volonta': return 'seme-bramosia';
    case 'tesoro': return 'tesoro-palazzo';
    case 'puzzle': return 'punto-sensibile';
    case 'boss': return 'boss';
    case 'miniboss': return 'miniboss';
    case 'ombra-sciagura': return 'nemico';
    case 'sicura': return 'sicura';
    case 'scorciatoia': return 'scorciatoia';
    default: return 'nota';
  }
}

/** Tipo di spillo per un luogo della città (tipi di `LuogoDto`). */
export function spilloPerLuogo(tipoLuogo: string): TipoSpillo {
  switch (tipoLuogo) {
    case 'negozio': return 'negozio';
    case 'ristorante': return 'ristorante';
    case 'confidente': return 'confidente';
    case 'distributore': return 'distributore';
    case 'trasporto': return 'treno';
    case 'attivita': case 'servizio': case 'scuola': return 'attivita';
    default: return 'nota';
  }
}

export const TIPI_MAPPA = ['citta', 'quartiere', 'luogo', 'palazzo', 'area', 'dedalo', 'generica'] as const;
export type TipoMappa = (typeof TIPI_MAPPA)[number];
export const NOME_TIPO_MAPPA: Record<TipoMappa, string> = { citta: 'Città', quartiere: 'Quartiere', luogo: 'Luogo', palazzo: 'Palazzo', area: 'Area', dedalo: 'Dedalo', generica: 'Mappa' };
