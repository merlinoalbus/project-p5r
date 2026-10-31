// ============================================================
// effettiDellaVoce — l'effetto nuovo, la categoria (icona) di ogni tipo di effetto e gli articoli di un negozio (L13, ondata 4a)
// ============================================================
//
// Condivisi dall'elenco unico degli effetti (`ElencoEffettiVoce`), dagli «Acquisti da questo negozio» (`AcquistiNegozioVoce`) e dalle
// schede delle proposte da completare (`ProposteDaCompletare`).
// ============================================================

import { ARTICOLO_AOJIRU } from '../../shared/acquisti';
import type { EffettoVoce } from '../../shared/effettiVoce';
import { ATTIVITA_PESCA, REGOLA_PESCA } from '../../shared/pesca';
import type { RigaEffetto } from './effettoAutomatico';

type Tipo = EffettoVoce['tipo'];

/** Un effetto appena aggiunto: il più semplice, con l'oggetto da scegliere (chiave vuota, o 0 per i numeri). */
export function effettoNuovo(t: Tipo): EffettoVoce {
  switch (t) {
    case 'dote': return { tipo: 'dote', dote: 'fascino', note: 2 };
    case 'lettura': return { tipo: 'lettura', categoria: 'libro', chiave: '', almeno: null };
    case 'turno': return { tipo: 'turno', attivita: '' };
    case 'acquisto': return { tipo: 'acquisto', articolo: ARTICOLO_AOJIRU, variante: null, sostituisceDoti: [] };
    case 'pesca': return { tipo: 'pesca', regola: REGOLA_PESCA, attivita: ATTIVITA_PESCA, sostituisceTurni: [], sostituisceDoti: [] };
    case 'fortuna': return { tipo: 'fortuna', dote: 'coraggio' };
    case 'storia': return { tipo: 'storia', evento: '' };
    case 'domanda': return { tipo: 'domanda', domanda: 0 };
    case 'cruciverba': return { tipo: 'cruciverba', data: '' };
    case 'richiesta': return { tipo: 'richiesta', richiesta: '' };
    case 'articolo': return { tipo: 'articolo', articolo: '' };
    case 'invito': return { tipo: 'invito', invito: '' };
    case 'persona': return { tipo: 'persona', persona: 0 };
    case 'yen': return { tipo: 'yen', importo: 0 };
    case 'oggetto': return { tipo: 'oggetto', oggetto: '', quantita: 1 };
    case 'trofeo': return { tipo: 'trofeo', trofeo: '' };
    case 'sblocco': return { tipo: 'sblocco', bersaglio: 'richiesta', chiave: '' };
    case 'personaTolta': return { tipo: 'personaTolta', persona: 0 };
    // 2026-10-28 («i punti rango andavano gestiti come note»): un effetto nuovo dà note, come una risposta nei dialoghi
    case 'puntiConfidente': return { tipo: 'puntiConfidente', confidente: '', note: 1 };
    case 'uscitaOggetto': return { tipo: 'uscitaOggetto', oggetto: '', quantita: 1, modo: 'restituito' };
    // L13 (ondata 7, O7-2): i risultati di un esame, con l'esame da scegliere
    case 'esame': return { tipo: 'esame', esame: '' };
  }
}

/** Tutti i tipi di effetto, nell'ordine del menu «Aggiungi un effetto» (prima «Avanzate» ne nascondeva sei), con l'icona della categoria.
 *  Yen, oggetto ricevuto, oggetto uscito, Persona tolta, punti a un Confidente e trofeo hanno una figura propria (`ui/categoria-<chiave>`,
 *  consegnate il 2026-10-29); se non si carica, `catenaCategoria` torna alla figura della famiglia che mostravano prima. */
export const MENU_EFFETTI: ReadonlyArray<{ tipo: Tipo; categoria: string }> = [
  { tipo: 'dote', categoria: 'dote' }, { tipo: 'lettura', categoria: 'libro' }, { tipo: 'turno', categoria: 'lavoro' },
  { tipo: 'articolo', categoria: 'acquisto' }, { tipo: 'yen', categoria: 'yen' }, { tipo: 'oggetto', categoria: 'oggetto-ricevuto' },
  { tipo: 'uscitaOggetto', categoria: 'oggetto-uscito' },
  { tipo: 'sblocco', categoria: 'richiesta' }, { tipo: 'richiesta', categoria: 'richiesta' }, { tipo: 'trofeo', categoria: 'trofeo' },
  { tipo: 'storia', categoria: 'trama' }, { tipo: 'domanda', categoria: 'esame' }, { tipo: 'esame', categoria: 'esame' }, { tipo: 'cruciverba', categoria: 'esame' },
  { tipo: 'invito', categoria: 'confidente' }, { tipo: 'puntiConfidente', categoria: 'punti-confidente' },
  { tipo: 'persona', categoria: 'velluto' }, { tipo: 'personaTolta', categoria: 'persona-tolta' }, { tipo: 'fortuna', categoria: 'dote' },
  { tipo: 'acquisto', categoria: 'acquisto' }, { tipo: 'pesca', categoria: 'attivita' },
];
/** La categoria (l'icona) di ogni tipo di effetto. */
export const CATEGORIA_EFFETTO: Record<Tipo, string> = Object.fromEntries(MENU_EFFETTI.map((m) => [m.tipo, m.categoria])) as Record<Tipo, string>;

/** L'effetto è un articolo del negozio `negozio` (la chiave dell'articolo è «negozio/articolo»)? */
export const eArticoloDelNegozio = (r: RigaEffetto, negozio: string): boolean => r.effetto.tipo === 'articolo' && r.effetto.articolo.startsWith(`${negozio}/`);
