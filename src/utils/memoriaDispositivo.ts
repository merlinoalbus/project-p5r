// ============================================================
// memoriaDispositivo — le preferenze ricordate su questo dispositivo (`localStorage`), lette e scritte in un posto solo
// ============================================================
//
// Ciò che si ricorda qui è una comodità di chi guarda (una sezione aperta, un filtro, il posto di una finestra), mai un dato: la pagina
// funziona anche senza. La memoria può mancare o rifiutarsi (finestra privata, dati del sito bloccati o cancellati, quota piena, ambienti
// senza `localStorage`): ogni lettura e scrittura passa da qui, protetta, e chi chiama decide che cosa vale quando non c'è niente.
// ============================================================

/** Il testo ricordato sotto `chiave`: `null` se la chiave non c'è, `undefined` se la memoria del dispositivo non c'è o non risponde. */
export function leggiMemoria(chiave: string): string | null | undefined {
  try { return globalThis.localStorage?.getItem(chiave); } catch { return undefined; }
}

/** Il JSON ricordato sotto `chiave`, già letto (la forma la controlla chi chiama); `null` se manca, è illeggibile o la memoria non c'è. */
export function leggiMemoriaJson(chiave: string): unknown {
  const grezzo = leggiMemoria(chiave);
  if (!grezzo) return null;
  try { return JSON.parse(grezzo) as unknown; } catch { return null; }
}

/** Ricorda `valore` sotto `chiave`; se la memoria non c'è o lo rifiuta (piena, bloccata) si perde solo il ricordo. */
export function scriviMemoria(chiave: string, valore: string): void {
  try { globalThis.localStorage?.setItem(chiave, valore); } catch { /* memoria non disponibile: la scelta vale per questa visita */ }
}

/** Ricorda `valore` in JSON sotto `chiave` (come `scriviMemoria`). */
export function scriviMemoriaJson(chiave: string, valore: unknown): void {
  try { globalThis.localStorage?.setItem(chiave, JSON.stringify(valore)); } catch { /* memoria non disponibile: la scelta vale per questa visita */ }
}
