/** Interrompe l'avvio del backend sulle linee Node prima delle patch di sicurezza richieste. */
export function verificaRuntimeNode(versione: string): void {
  const [maggiore, minore, patch] = versione.split('.').slice(0, 3).map(Number);
  const versioniMinime: Record<number, readonly [number, number, number]> = {
    22: [22, 23, 4],
    24: [24, 22, 1],
    26: [26, 12, 1],
  };
  const minima = versioniMinime[maggiore];
  const valida = minima !== undefined && (
    maggiore > minima[0]
    || (maggiore === minima[0] && (
      minore > minima[1]
      || (minore === minima[1] && patch >= minima[2])
    ))
  );
  if (!valida) {
    throw new Error(`Node.js ${versione} non è supportato per il backend. Usa almeno Node.js 22.23.4, 24.22.1 o 26.12.1 nella rispettiva linea.`);
  }
}
