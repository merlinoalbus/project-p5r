// ============================================================
// lotti — suddivide un elenco in blocchi di dimensione fissa
// ============================================================

/** Restituisce i blocchi consecutivi di `dimensione` elementi (l'ultimo può essere più corto). */
export function lotti<T>(elementi: readonly T[], dimensione: number): T[][] {
  if (!Number.isInteger(dimensione) || dimensione <= 0) throw new Error('La dimensione del lotto deve essere un intero positivo.');
  const out: T[][] = [];
  for (let i = 0; i < elementi.length; i += dimensione) out.push(elementi.slice(i, i + dimensione));
  return out;
}
