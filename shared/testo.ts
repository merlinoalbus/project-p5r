// ============================================================
// testo — normalizzazione e ricerca per parole (minuscole, senza accenti) ed elenchi in italiano, condivisi da frontend e backend
// ============================================================
//
// La ricerca dell'app è una sola (richiesta dell'utente, 2026-11-02: «la ricerca deve accettare anche gli spazi... nelle funzioni di
// ricerca», scelta «tutte, parola per parola»): il testo cercato si divide in parole agli spazi, e una voce corrisponde se OGNI parola
// compare, anche come pezzo di parola, in almeno uno dei suoi testi, in qualunque ordine («takemi tae», «amara medicina»). Spazi doppi o ai
// capi non contano. Una parola si confronta in due modi, e basta che uno trovi: «piatta» (minuscola, senza accenti, punteggiatura compresa:
// «1/7», «yogen-jaya») o senza punteggiatura (`normalizzaTesto`: «jack o lantern» trova «Jack-o'-Lantern», l'apostrofo tipografico vale
// quello dritto). Così nessuna ricerca che trovava prima smette di trovare.
// ============================================================

/** «Jack-o'-Lantern» → «jack o lantern»: confronto insensibile a maiuscole, accenti e punteggiatura. */
export function normalizzaTesto(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Il testo «piatto»: senza accenti e minuscolo, con la punteggiatura che resta (non è `normalizzaTesto`, che la toglie). */
export function piatto(s: string | null | undefined): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('it');
}

/** Elenco italiano: «a», «a e b», «a, b e c»; vuoto = stringa vuota. */
export function congiunzione(voci: readonly string[]): string {
  if (voci.length <= 1) return voci.join('');
  return `${voci.slice(0, -1).join(', ')} e ${voci[voci.length - 1]}`;
}

/** Le parole del testo cercato, piatte e senza doppioni; vuoto se non c'è niente da cercare (testo vuoto o di soli spazi). */
export function paroleRicerca(q: string | null | undefined): string[] {
  return [...new Set(piatto(q).split(/\s+/).filter((p) => p.length > 0))];
}

/** Una parola della ricerca nelle sue due forme di confronto: piatta e senza punteggiatura (vuota se la parola è solo punteggiatura). */
interface ParolaRicerca { piatta: string; norma: string }

/** Le parole (già piatte, da `paroleRicerca`) pronte per il confronto. */
const preparaParole = (parole: readonly string[]): ParolaRicerca[] => parole.map((p) => ({ piatta: p, norma: normalizzaTesto(p) }));

/** Il confronto di parole preparate con i testi: ognuna deve comparire, piatta o senza punteggiatura, in almeno un testo. */
function confronta(parole: readonly ParolaRicerca[], testi: ReadonlyArray<string | null | undefined>): boolean {
  if (parole.length === 0) return true;
  const presenti = testi.filter((t): t is string => !!t);
  const piatti = presenti.map(piatto);
  // la forma senza punteggiatura si calcola solo se serve (una parola che la forma piatta non trova)
  let norme: string[] | null = null;
  return parole.every((p) => piatti.some((t) => t.includes(p.piatta))
    || (p.norma !== '' && (norme ??= presenti.map(normalizzaTesto)).some((t) => t.includes(p.norma))));
}

/**
 * Il filtro di una ricerca, da preparare una volta e usare su ogni voce di un elenco: vero se ogni parola compare in almeno uno dei testi
 * (piatta, o senza punteggiatura); senza parole, sempre vero.
 */
export function filtroRicerca(q: string | null | undefined): (...testi: Array<string | null | undefined>) => boolean {
  const parole = preparaParole(paroleRicerca(q));
  return (...testi) => confronta(parole, testi);
}

/** Vero se ogni parola di `parole` (già divise e piatte, da `paroleRicerca`) compare in almeno uno dei testi: per chi tiene le parole
 *  (la ricerca del Diario, che le usa anche per evidenziare). */
export function corrispondonoParole(parole: readonly string[], ...testi: Array<string | null | undefined>): boolean {
  return confronta(preparaParole(parole), testi);
}

/** Vero se ogni parola della ricerca `q` compare in almeno uno dei testi, in qualunque ordine; una ricerca vuota corrisponde sempre. */
export function corrispondeRicerca(q: string | null | undefined, ...testi: Array<string | null | undefined>): boolean {
  return filtroRicerca(q)(...testi);
}
