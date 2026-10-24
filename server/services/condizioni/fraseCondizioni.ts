// Lo sblocco di un'attività o di un luogo in parole, generato dalle sue condizioni (R11-02/9: la frase scritta a mano non c'è più).

/** Le frasi delle condizioni unite da « · »; null senza condizioni. */
export function fraseDelleCondizioni(condizioni: ReadonlyArray<{ testo: string }> | null | undefined): string | null {
  const frasi = (condizioni ?? []).map((c) => c.testo.trim()).filter(Boolean);
  return frasi.length ? frasi.join(' · ') : null;
}
