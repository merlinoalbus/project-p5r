// ============================================================
// pannelloScheda — quali indirizzi si aprono nel pannello sopra il diario, e come l'indirizzo lo ricorda (R10-27)
// ============================================================
//
// Decisione dell'utente del 2026-10-23 («Pannello sopra il diario»): toccando un oggetto citato da una voce del diario (Confidente, luogo,
// Palazzo, libro, film, attività, negozio, Richiesta…) la sua scheda si apre in un pannello sopra il diario, senza lasciare la pagina;
// chiudendolo si torna alla stessa posizione di scorrimento. Vale nella Home e nella Guida › Giorno per giorno; Partita › Oggi non cambia.
//
// Il pannello non ha una pagina sua: mostra la pagina dell'oggetto così com'è (la stessa del menù), per questo qui c'è solo l'elenco degli
// indirizzi che sa mostrare. L'indirizzo mostrato sta in un parametro dedicato (`?pannello=<indirizzo>`, NON `?scheda=`, che è della Partita):
// così «indietro» del browser chiude il pannello (o torna alla scheda di prima), e un ricaricamento lo riapre.
//
// Libri, film, attività e Richieste non hanno una pagina per singolo elemento: l'indirizzo `/guida/libri?elemento=<chiave>` (e gli analoghi)
// esiste solo per il pannello e mostra quell'elemento nell'elenco filtrato. Senza `elemento` l'indirizzo è l'elenco, e si apre come pagina.
// ============================================================

import { matchPath } from 'react-router-dom';

/** Il parametro d'indirizzo che dice quale scheda sta aperta nel pannello. */
export const PARAMETRO_PANNELLO = 'pannello';
/** La chiave dello stato della cronologia che conta quante voci il pannello ha aggiunto (per chiuderlo tornando indietro di altrettante). */
export const STATO_PROFONDITA = 'pannelloProfondita';
/** Il parametro che, negli indirizzi per elenco, dice quale elemento mostrare. */
export const PARAMETRO_ELEMENTO = 'elemento';

export type TipoScheda = 'confidente' | 'dungeon' | 'negozio' | 'luogo' | 'oggetto' | 'libro' | 'film' | 'attivita' | 'richiesta';

interface DefinizioneScheda {
  modello: string;
  tipo: TipoScheda;
  etichetta: string;
  /** L'indirizzo è un elenco: vale solo con `?elemento=`. */
  elenco?: boolean;
}

/** Gli indirizzi che il pannello sa mostrare, dal più specifico al più generico. */
const SCHEDE: readonly DefinizioneScheda[] = [
  { modello: '/confidenti/:chiave', tipo: 'confidente', etichetta: 'Confidente' },
  { modello: '/guida/dungeon/:chiave/area/:slug', tipo: 'dungeon', etichetta: 'Palazzo' },
  { modello: '/guida/dungeon/:chiave', tipo: 'dungeon', etichetta: 'Palazzo' },
  { modello: '/guida/negozi/:chiave', tipo: 'negozio', etichetta: 'Negozio' },
  { modello: '/guida/luogo/:quartiere/:luogo', tipo: 'luogo', etichetta: 'Luogo' },
  { modello: '/guida/oggetto/:categoria/:slug', tipo: 'oggetto', etichetta: 'Oggetto' },
  { modello: '/guida/libri', tipo: 'libro', etichetta: 'Libro', elenco: true },
  { modello: '/guida/film', tipo: 'film', etichetta: 'Film e DVD', elenco: true },
  { modello: '/guida/attivita', tipo: 'attivita', etichetta: 'Attività', elenco: true },
  { modello: '/guida/richieste', tipo: 'richiesta', etichetta: 'Richiesta', elenco: true },
];

/** Una scheda che il pannello può mostrare, con l'indirizzo scomposto. */
export interface SchedaTrovata {
  tipo: TipoScheda;
  /** Il modello d'indirizzo che l'ha riconosciuta: due schede con lo stesso modello sono la stessa pagina (come due indirizzi della stessa route). */
  modello: string;
  etichetta: string;
  /** L'indirizzo intero (percorso, parametri e ancora): è la chiave della scheda. */
  indirizzo: string;
  pathname: string;
  search: string;
  hash: string;
  params: Readonly<Record<string, string | undefined>>;
  /** Per libri, film, attività e Richieste: la chiave dell'elemento da mostrare. */
  elemento: string | null;
}

/** Scompone un indirizzo dell'app (comincia con «/», non con «//»); null se non lo è. */
export function scomponiIndirizzo(indirizzo: string): { pathname: string; search: string; hash: string } | null {
  if (!indirizzo.startsWith('/') || indirizzo.startsWith('//')) return null;
  try {
    const u = new URL(indirizzo, 'http://app.invalid');
    return { pathname: u.pathname, search: u.search, hash: u.hash };
  } catch { return null; }
}

/** La scheda che il pannello mostra per quell'indirizzo, o null se l'indirizzo è una pagina da aprire come pagina. */
export function trovaScheda(indirizzo: string | null | undefined): SchedaTrovata | null {
  if (!indirizzo) return null;
  const parti = scomponiIndirizzo(indirizzo);
  if (!parti) return null;
  const elemento = new URLSearchParams(parti.search).get(PARAMETRO_ELEMENTO) || null;
  for (const def of SCHEDE) {
    const m = matchPath({ path: def.modello, end: true }, parti.pathname);
    if (!m) continue;
    if (def.elenco && !elemento) return null;
    return { tipo: def.tipo, modello: def.modello, etichetta: def.etichetta, indirizzo: `${parti.pathname}${parti.search}${parti.hash}`, ...parti, params: m.params, elemento: def.elenco ? elemento : null };
  }
  return null;
}

/** L'indirizzo di un elemento di un elenco (libro, film, attività, Richiesta) da mostrare nel pannello. */
export function indirizzoElemento(elenco: '/guida/libri' | '/guida/film' | '/guida/attivita' | '/guida/richieste', chiave: string): string {
  return `${elenco}?${PARAMETRO_ELEMENTO}=${encodeURIComponent(chiave)}`;
}

/** La scheda aperta nel pannello secondo i parametri dell'indirizzo, o null. */
export function schedaDaParametri(search: string): SchedaTrovata | null {
  return trovaScheda(new URLSearchParams(search).get(PARAMETRO_PANNELLO));
}

/** I parametri dell'indirizzo con la scheda del pannello impostata (o tolta, con null); gli altri parametri restano. */
export function conSchedaNelPannello(search: string, indirizzo: string | null): string {
  const p = new URLSearchParams(search);
  if (indirizzo === null) p.delete(PARAMETRO_PANNELLO); else p.set(PARAMETRO_PANNELLO, indirizzo);
  const testo = p.toString();
  return testo ? `?${testo}` : '';
}

/** Quante voci di cronologia ha aggiunto il pannello, dallo stato dell'indirizzo (0 se non lo dice). */
export function profonditaDaStato(stato: unknown): number {
  if (typeof stato !== 'object' || stato === null) return 0;
  const n = (stato as Record<string, unknown>)[STATO_PROFONDITA];
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : 0;
}

/** Lo stato dell'indirizzo con la profondità del pannello (0 la toglie); il resto dello stato resta com'è. */
export function statoConProfondita(stato: unknown, n: number): Record<string, unknown> {
  const base = typeof stato === 'object' && stato !== null ? { ...(stato as Record<string, unknown>) } : {};
  if (n > 0) base[STATO_PROFONDITA] = n; else delete base[STATO_PROFONDITA];
  return base;
}
