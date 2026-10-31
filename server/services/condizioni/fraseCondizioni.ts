// Lo sblocco di un'attività o di un luogo in parole, generato dalle sue condizioni (R11-02/9: la frase scritta a mano non c'è più).

/** Le frasi delle condizioni unite da « · »; null senza condizioni. */
export function fraseDelleCondizioni(condizioni: ReadonlyArray<{ testo: string }> | null | undefined): string | null {
  const frasi = (condizioni ?? []).map((c) => c.testo.trim()).filter(Boolean);
  return frasi.length ? frasi.join(' · ') : null;
}

/** Le condizioni di calendario: aprono la frase della regola («Dal 24 dicembre · …»). */
const DI_CALENDARIO: ReadonlySet<string> = new Set(['data', 'intervallo']);

/**
 * L13 (ondata 11, O11-3): la regola di un dono in una frase, generata dalle sue condizioni: prima il giorno, poi le altre nell'ordine in cui
 * sono scritte, unite come in `fraseDelleCondizioni`, con la prima lettera maiuscola («Dal 19 marzo · Rango Confidente Ann Takamaki 10»).
 * Null senza condizioni.
 */
export function fraseDellaRegola(condizioni: ReadonlyArray<{ tipo: string; testo: string }> | null | undefined): string | null {
  const elenco = condizioni ?? [];
  const frase = fraseDelleCondizioni([...elenco.filter((c) => DI_CALENDARIO.has(c.tipo)), ...elenco.filter((c) => !DI_CALENDARIO.has(c.tipo))]);
  return frase ? frase.charAt(0).toUpperCase() + frase.slice(1) : null;
}
