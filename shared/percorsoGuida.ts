// ============================================================
// percorsoGuida — l'indirizzo di un valore dentro un blocco JSON della guida (L11 · B11, correzioni ai blocchi)
// ============================================================
//
// I blocchi di `dati_guida` (personaggi, sfide, completamento, oggetti, Jose) non si riscrivono mai: una correzione dell'utente è una riga
// di `correzione_dati_guida` con l'indirizzo del valore e il valore nuovo, applicata in lettura sopra il blocco (`datiGuidaCorretti`).
//
// Grammatica: segmenti separati da «/».
//   - proprietà:      `armi`, `mischia`                         (identificatore `[A-Za-z][A-Za-z0-9]*`)
//   - elemento d'un array scelto per un campo-selettore: `[campo=valore]`, con `valore` in `encodeURIComponent`
//                     (`sfide…/elenco/[chiave=battaglia-1]/regole`, `abiti/elenco/[nome=Gelo%20Totale]/dove`)
// Il valore finale è uno scalare o un array di stringhe, sostituito per intero.
//
// Funzioni pure, senza dipendenze: le usano il server e gli script di verifica.
// ============================================================

export type Segmento =
  | { tipo: 'proprieta'; nome: string }
  | { tipo: 'selettore'; campo: string; valore: string };

/** Un puntatore a indici: nomi di proprietà e posizioni in un array. */
export type Puntatore = Array<string | number>;

export interface EsitoRisoluzione {
  trovato: boolean;
  valore: unknown;
  puntatore: Puntatore;
}

const PROPRIETA = /^[A-Za-z][A-Za-z0-9]*$/;
const SELETTORE = /^\[([A-Za-z][A-Za-z0-9]*)=([^\]]*)\]$/;

/** Lo scalare di un selettore come testo (i numeri e i booleani si confrontano come testo). */
const comeTesto = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '\u0000');

/** Il segmento-selettore di un elemento: il valore si codifica, così «/», «]» e «=» non rompono l'indirizzo. */
export function segmentoSelettore(campo: string, valore: string | number): string {
  return `[${campo}=${encodeURIComponent(String(valore))}]`;
}

/** Scompone un indirizzo; lancia `Error` se non rispetta la grammatica. */
export function analizzaPercorso(percorso: string): Segmento[] {
  if (!percorso) throw new Error('Indirizzo vuoto.');
  return percorso.split('/').map((s): Segmento => {
    const sel = SELETTORE.exec(s);
    if (sel) {
      let valore: string;
      try { valore = decodeURIComponent(sel[2]!); } catch { throw new Error(`Selettore non valido: ${s}`); }
      return { tipo: 'selettore', campo: sel[1]!, valore };
    }
    if (!PROPRIETA.test(s)) throw new Error(`Segmento non valido: «${s}»`);
    return { tipo: 'proprieta', nome: s };
  });
}

const eOggetto = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Risolve l'indirizzo sulla `base`: valore trovato e puntatore a indici (stabile anche se un selettore viene corretto dopo). */
export function risolvi(base: unknown, segmenti: ReadonlyArray<Segmento>): EsitoRisoluzione {
  let nodo: unknown = base;
  const puntatore: Puntatore = [];
  for (const s of segmenti) {
    if (s.tipo === 'proprieta') {
      if (!eOggetto(nodo) || !Object.prototype.hasOwnProperty.call(nodo, s.nome)) return { trovato: false, valore: undefined, puntatore };
      nodo = nodo[s.nome];
      puntatore.push(s.nome);
    } else {
      if (!Array.isArray(nodo)) return { trovato: false, valore: undefined, puntatore };
      const i = nodo.findIndex((e) => eOggetto(e) && comeTesto(e[s.campo]) === s.valore);
      if (i < 0) return { trovato: false, valore: undefined, puntatore };
      nodo = nodo[i];
      puntatore.push(i);
    }
  }
  return { trovato: true, valore: nodo, puntatore };
}

/** Una copia di `base` col valore al puntatore sostituito; gli altri rami restano gli stessi oggetti. `base` non cambia. */
export function impostaImmutabile(base: unknown, puntatore: ReadonlyArray<string | number>, valore: unknown): unknown {
  if (puntatore.length === 0) return valore;
  const [testa, ...resto] = puntatore as [string | number, ...Array<string | number>];
  if (typeof testa === 'number') {
    if (!Array.isArray(base)) throw new Error('Il puntatore non corrisponde alla forma del blocco.');
    const copia = base.slice();
    copia[testa] = impostaImmutabile(base[testa], resto, valore);
    return copia;
  }
  if (!eOggetto(base)) throw new Error('Il puntatore non corrisponde alla forma del blocco.');
  return { ...base, [testa]: impostaImmutabile(base[testa], resto, valore) };
}

/** Confronto JSON profondo (l'ordine delle chiavi di un oggetto non conta, quello degli array sì). */
export function uguali(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => uguali(x, b[i]));
  if (eOggetto(a)) {
    if (!eOggetto(b)) return false;
    const ka = Object.keys(a);
    return ka.length === Object.keys(b).length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && uguali(a[k], b[k]));
  }
  return false;
}

/** Il tipo «grosso» di un valore, per accorgersi che una correzione non si addice più alla guida: null, array, oggetto o il typeof. */
export function generePrimitivo(v: unknown): 'null' | 'array' | 'oggetto' | 'testo' | 'numero' | 'booleano' | 'altro' {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'object') return 'oggetto';
  if (typeof v === 'string') return 'testo';
  if (typeof v === 'number') return 'numero';
  if (typeof v === 'boolean') return 'booleano';
  return 'altro';
}
