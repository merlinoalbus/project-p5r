// ============================================================
// articoli — le categorie di un articolo dei negozi, una sola fonte per tipo, schema del catalogo e ricerca degli articoli
// ============================================================
//
// Le categorie sono i tipi di cosa che un negozio può vendere. Le etichette italiane stanno in `src/utils/negozi.ts`, le figure
// in `ui/categoria-*`. Prima l'elenco era scritto tre volte (tipo, schema del catalogo, rotta della ricerca: rilievo F16 della
// verifica completa, 2026-10-03).
// ============================================================

export const CATEGORIE_ARTICOLO = [
  'arma', 'protezione', 'accessorio', 'abito', 'consumabile', 'regalo', 'materiale', 'cibo',
  'cura', 'sp', 'battaglia', 'stato', 'esplorazione', 'oggetto-chiave', 'libro', 'film', 'dvd', 'videogioco', 'altro',
] as const;

export type CategoriaArticolo = (typeof CATEGORIE_ARTICOLO)[number];

/** Vero se `x` è una categoria di articolo. */
export function eCategoriaArticolo(x: unknown): x is CategoriaArticolo {
  return typeof x === 'string' && (CATEGORIE_ARTICOLO as readonly string[]).includes(x);
}
