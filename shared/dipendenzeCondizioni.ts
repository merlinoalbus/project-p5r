import type { RequisitoSpillo } from './condizioniSpillo.js';

type Formula = boolean | { tipo: 'atomo'; chiave: string } | { tipo: 'non'; figlia: Formula } | { tipo: 'e' | 'o'; figlie: Formula[] };
const chiave = (f: Formula): string => JSON.stringify(f);
function nega(f: Formula): Formula { return typeof f === 'boolean' ? !f : f.tipo === 'non' ? f.figlia : { tipo: 'non', figlia: f }; }
function combina(tipo: 'e' | 'o', figlie: Formula[]): Formula {
  const neutro = tipo === 'e';
  const distinte = new Map<string, Formula>();
  for (const f of figlie.flatMap((x) => typeof x !== 'boolean' && x.tipo === tipo ? x.figlie : [x])) {
    if (f === !neutro) return !neutro;
    if (f === neutro) continue;
    if (distinte.has(chiave(nega(f)))) return !neutro;
    distinte.set(chiave(f), f);
  }
  const restano = [...distinte.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, f]) => f);
  return !restano.length ? neutro : restano.length === 1 ? restano[0] : { tipo, figlie: restano };
}
function sostituisci(f: Formula, atomo: string, valore: boolean): Formula {
  if (typeof f === 'boolean') return f;
  if (f.tipo === 'atomo') return f.chiave === atomo ? valore : f;
  if (f.tipo === 'non') return nega(sostituisci(f.figlia, atomo, valore));
  return combina(f.tipo, f.figlie.map((x) => sostituisci(x, atomo, valore)));
}
function primoAtomo(f: Formula): string {
  if (typeof f === 'boolean') throw new Error('Formula costante senza atomi');
  if (f.tipo === 'atomo') return f.chiave;
  if (f.tipo === 'non') return primoAtomo(f.figlia);
  return f.figlie.map(primoAtomo).sort()[0];
}

/** ROBDD esatto; il budget cambia soltanto algoritmo, mai il risultato. */
function soddisfacibile(formula: Formula): boolean {
  const limite = 4096;
  const pieno = Symbol('memoria-diagramma');
  const memo = new Map<string, number>();
  const nodi = new Map<string, number>();
  const costruisci = (f: Formula): number => {
    if (typeof f === 'boolean') return f ? 1 : 0;
    const k = chiave(f), noto = memo.get(k);
    if (noto !== undefined) return noto;
    if (memo.size + nodi.size >= limite) throw pieno;
    const a = primoAtomo(f);
    const basso = costruisci(sostituisci(f, a, false)), alto = costruisci(sostituisci(f, a, true));
    let id = basso;
    if (basso !== alto) {
      const nk = JSON.stringify([a, basso, alto]);
      id = nodi.get(nk) ?? nodi.size + 2;
      nodi.set(nk, id);
    }
    memo.set(k, id);
    return id;
  };
  try { return costruisci(formula) !== 0; }
  catch (errore) { if (errore !== pieno) throw errore; }
  // Ricerca esatta con short-circuit. La cache è limitata, la ricerca e la semantica no.
  const risposte = new Map<string, boolean>();
  const cerca = (f: Formula): boolean => {
    if (typeof f === 'boolean') return f;
    const k = chiave(f), noto = risposte.get(k);
    if (noto !== undefined) return noto;
    const a = primoAtomo(f);
    const esito = cerca(sostituisci(f, a, true)) || cerca(sostituisci(f, a, false));
    if (risposte.size >= limite) risposte.clear();
    risposte.set(k, esito);
    return esito;
  };
  return cerca(formula);
}

const cache = new Map<string, readonly string[]>();
/** Libri con influenza positiva nella formula: F(libro=true) AND NON F(libro=false) è soddisfacibile.
 * Le altre condizioni restano necessarie secondo AND/OR/NON; non si promette uno sblocco immediato nella partita.
 * Avvisi e NON(avviso) non sono operandi, come nel valutatore. Nessun limite alla copertura semantica. */
export function libriCheSbloccano(condizioni: readonly RequisitoSpillo[]): string[] {
  const firma = JSON.stringify(condizioni);
  const noto = cache.get(firma);
  if (noto) return [...noto];
  const libri = new Map<string, string>();
  const formulaDi = (c: RequisitoSpillo): Formula | null => {
    if (c.tipo === 'avviso') return null;
    if (c.tipo === 'da-subito') return true;
    if (c.tipo === 'non') { const f = formulaDi(c.condizione); return f === null ? null : nega(f); }
    if (c.tipo === 'gruppo') {
      const fs = c.condizioni.map(formulaDi).filter((f): f is Formula => f !== null);
      return fs.length ? combina(c.modo === 'tutte' ? 'e' : 'o', fs) : c.condizioni.length ? null : true;
    }
    const a = JSON.stringify(Object.fromEntries(Object.entries(c).sort(([a], [b]) => a.localeCompare(b))));
    if (c.tipo === 'lettura' && c.categoria === 'libro') libri.set(c.chiave, a);
    return { tipo: 'atomo', chiave: a };
  };
  const f = combina('e', condizioni.map(formulaDi).filter((v): v is Formula => v !== null));
  const risultato = [...libri].filter(([, a]) => soddisfacibile(combina('e', [sostituisci(f, a, true), nega(sostituisci(f, a, false))]))).map(([libro]) => libro);
  if (cache.size >= 128) cache.delete(cache.keys().next().value!);
  cache.set(firma, risultato);
  return [...risultato];
}
