// ============================================================
// attivita — i cataloghi delle attività: tipo, fascia, come si tracciano
// ============================================================
//
// Il tipo e la fascia di un'attività erano testo con un elenco ammesso solo nel modulo del
// catalogo; qui diventano cataloghi condivisi con l'etichetta, usati dal modulo, dalle pagine e
// dalle migrazioni. `tracciamento` dice come la partita conta un'attività: per niente (studiare,
// mangiare), come «svolta n volte» (mini-giochi, lavori, sfide: sono le attività che le
// condizioni citano) o per sessioni (i videogiochi, che hanno un numero di round).
// ============================================================

export const TIPI_ATTIVITA = [
  { chiave: 'mini-gioco', nome: 'Mini-gioco' },
  { chiave: 'lavoro', nome: 'Lavoro part-time' },
  { chiave: 'studio', nome: 'Studio' },
  { chiave: 'lettura', nome: 'Lettura' },
  { chiave: 'videogioco', nome: 'Videogioco' },
  { chiave: 'allenamento', nome: 'Allenamento' },
  { chiave: 'cibo', nome: 'Cibo e bevande' },
  { chiave: 'sfida', nome: 'Sfida' },
  { chiave: 'altro', nome: 'Altro' },
] as const;
export type TipoAttivita = (typeof TIPI_ATTIVITA)[number]['chiave'];

export const FASCE_ATTIVITA = [
  { chiave: 'giorno', nome: 'Di giorno' },
  { chiave: 'sera', nome: 'Di sera' },
  { chiave: 'entrambe', nome: 'Giorno e sera' },
] as const;
export type FasciaAttivita = (typeof FASCE_ATTIVITA)[number]['chiave'];

export const TRACCIAMENTI_ATTIVITA = [
  { chiave: 'nessuno', nome: 'Non si conta' },
  { chiave: 'svolta', nome: 'Si conta quante volte è stata svolta' },
  { chiave: 'sessioni', nome: 'Si conta per sessioni (round)' },
] as const;
export type TracciamentoAttivita = (typeof TRACCIAMENTI_ATTIVITA)[number]['chiave'];

/** Il tracciamento che spetta a un tipo: i videogiochi per sessioni, mini-giochi, lavori e sfide per volte, il resto niente. */
export function tracciamentoPerTipo(tipo: string): TracciamentoAttivita {
  if (tipo === 'videogioco') return 'sessioni';
  if (tipo === 'mini-gioco' || tipo === 'lavoro' || tipo === 'sfida') return 'svolta';
  return 'nessuno';
}

export function eTipoAttivita(x: unknown): x is TipoAttivita { return typeof x === 'string' && TIPI_ATTIVITA.some((t) => t.chiave === x); }
export function eFasciaAttivita(x: unknown): x is FasciaAttivita { return typeof x === 'string' && FASCE_ATTIVITA.some((f) => f.chiave === x); }
export function eTracciamentoAttivita(x: unknown): x is TracciamentoAttivita { return typeof x === 'string' && TRACCIAMENTI_ATTIVITA.some((t) => t.chiave === x); }

export const NOME_TIPO_ATTIVITA: Record<TipoAttivita, string> = Object.fromEntries(TIPI_ATTIVITA.map((t) => [t.chiave, t.nome])) as Record<TipoAttivita, string>;
export const NOME_FASCIA_ATTIVITA: Record<FasciaAttivita, string> = Object.fromEntries(FASCE_ATTIVITA.map((f) => [f.chiave, f.nome])) as Record<FasciaAttivita, string>;
