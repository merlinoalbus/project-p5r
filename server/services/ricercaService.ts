// ============================================================
// ricercaService — la ricerca globale per nome: punteggio, gruppi per tipo e limite (L11, B3, R11-07…R11-10b)
// ============================================================
//
// Cerca nei nomi (mostrato, originale, sinonimi) dell'indice in memoria, mai nei testi lunghi né nel percorso. Una voce corrisponde se una
// sua stringa contiene tutte le parole della ricerca; ordina chi trova per qualità (uguale, inizio, parola, contenuto) con i nomi altri
// dopo il nome, a parità di punteggio per lunghezza del nome. Le cose nascoste non sono nell'indice; i luoghi chiusi sì, con lo stato.
// ============================================================

import { normalizzaTesto } from '../../shared/testo.js';
import { LIMITE_PREDEFINITO_RICERCA, TIPI_RICERCA, type GruppoRicercaDto, type RicercaGlobaleDto, type RisultatoRicercaDto, type StatoRicercaDto, type TipoRicerca } from '../../shared/ricerca.js';
import { indiceRicerca, type VoceIndice } from './ricerca/indiceRicerca.js';
import { chiaveStato, statoDeiRisultati } from './ricerca/statoRicerca.js';

export interface ParametriRicerca { q: string; tipi?: readonly TipoRicerca[]; limite?: number; partita?: number }

/** Il punteggio di una stringa normalizzata rispetto alla ricerca (più basso = meglio): 0 uguale, 1 comincia, 3 una parola comincia, 5 contiene. */
function punteggioDi(s: string, ricerca: string, parole: readonly string[]): number | null {
  if (s === ricerca) return 0;
  if (s.startsWith(ricerca)) return 1;
  if ((` ${s}`).includes(` ${ricerca}`)) return 3;
  if (s.includes(ricerca)) return 5;
  return parole.every((p) => s.includes(p)) ? 5 : null;
}

/** Pura: null se la voce non corrisponde; altrimenti il punteggio (più basso = meglio) e il nome altro per cui ha corrisposto (null se è il nome). */
export function corrisponde(parole: readonly string[], v: VoceIndice): { punti: number; trovatoCome: string | null } | null {
  const ricerca = parole.join(' ');
  let migliore: { punti: number; trovatoCome: string | null } | null = null;
  const sulNome = punteggioDi(v.nomeN, ricerca, parole);
  if (sulNome !== null) migliore = { punti: sulNome, trovatoCome: null };
  for (const a of v.altri) {
    const p = punteggioDi(a.n, ricerca, parole);
    if (p === null) continue;
    // un nome altro uguale alla ricerca vale quanto il nome; per gli altri casi conta un punto dopo il nome (2, 4, 6)
    const punti = p === 0 ? 0 : p + 1;
    if (migliore === null || punti < migliore.punti) migliore = { punti, trovatoCome: a.testo };
  }
  return migliore;
}

interface Trovata { voce: VoceIndice; punti: number; trovatoCome: string | null }

/** La ricerca globale: gruppi per tipo in ordine di miglior corrispondenza, `limite` risultati per gruppo e il `totale` di quelli che corrispondono. */
export function cercaGlobale(p: ParametriRicerca): RicercaGlobaleDto {
  const q = p.q.trim();
  const parole = normalizzaTesto(q).split(' ').filter((x) => x !== '');
  const limite = p.limite ?? LIMITE_PREDEFINITO_RICERCA;
  const tipi = new Set<TipoRicerca>(p.tipi ?? TIPI_RICERCA);
  const perTipo = new Map<TipoRicerca, Trovata[]>();
  if (parole.length > 0) {
    for (const voce of indiceRicerca()) {
      if (!tipi.has(voce.tipo)) continue;
      const c = corrisponde(parole, voce);
      if (!c) continue;
      (perTipo.get(voce.tipo) ?? perTipo.set(voce.tipo, []).get(voce.tipo)!).push({ voce, ...c });
    }
  }
  const gruppi = [...perTipo.entries()].map(([tipo, trovate]) => {
    trovate.sort((a, b) => a.punti - b.punti || a.voce.nomeN.length - b.voce.nomeN.length || a.voce.nome.localeCompare(b.voce.nome, 'it'));
    return { tipo, trovate, migliore: trovate[0]!.punti };
  }).sort((a, b) => a.migliore - b.migliore || TIPI_RICERCA.indexOf(a.tipo) - TIPI_RICERCA.indexOf(b.tipo));

  const mostrate = gruppi.map((g) => g.trovate.slice(0, limite));
  // lo stato con la partita si calcola solo per ciò che si restituisce (404 se la partita non c'è, anche senza luoghi fra i risultati)
  const stati = statoDeiRisultati(mostrate.flatMap((g) => g.map((t) => t.voce)), p.partita);
  const risultato = (t: Trovata): RisultatoRicercaDto => {
    const stato: StatoRicercaDto | null = stati.get(chiaveStato(t.voce)) ?? (t.voce.segno === 'da-verificare' ? { tipo: 'da-verificare', testo: 'Da verificare' } : null);
    return { tipo: t.voce.tipo, chiave: t.voce.chiave, nome: t.voce.nome, trovatoCome: t.trovatoCome, percorso: [...t.voce.percorso], casa: t.voce.casa, immagine: t.voce.immagine, stato };
  };
  const out: GruppoRicercaDto[] = gruppi.map((g, i) => ({ tipo: g.tipo, totale: g.trovate.length, risultati: mostrate[i]!.map(risultato) }));
  return { q, totale: out.reduce((s, g) => s + g.totale, 0), gruppi: out };
}
