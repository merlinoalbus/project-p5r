// ============================================================
// movimento — la preferenza di movimento ridotto del sistema (`prefers-reduced-motion`), per gli scorrimenti fatti dal codice
// ============================================================
// `scrollIntoView({ behavior: 'smooth' })` ignora la preferenza dell'utente: chi chiede movimento ridotto vede comunque la pagina
// scivolare. `comportamentoScorrimento()` dà 'auto' (salto diretto) con quella preferenza, 'smooth' altrimenti; senza `matchMedia`
// (test, ambienti senza motore di layout) vale 'smooth', come prima.
// ============================================================

/** Vero se il sistema chiede movimento ridotto; falso fuori dal browser o senza `matchMedia`. */
export function movimentoRidotto(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Il `behavior` da dare a `scrollIntoView`/`scrollTo`: 'auto' con movimento ridotto, 'smooth' altrimenti. */
export function comportamentoScorrimento(): 'auto' | 'smooth' {
  return movimentoRidotto() ? 'auto' : 'smooth';
}
