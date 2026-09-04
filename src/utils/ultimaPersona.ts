// ============================================================
// ultimaPersona — ricorda (per la sessione del browser) l'ultima Persona aperta dal compendio, per tornarci al ritorno dalla scheda
// ============================================================

const CHIAVE = 'p5r-compendio-ultima';

/** Memorizza l'id della Persona che si sta per aprire. */
export function ricordaUltimaPersona(id: number): void {
  try {
    globalThis.sessionStorage?.setItem(CHIAVE, String(id));
  } catch {
    // Storage non disponibile: nessun ritorno mirato.
  }
}

/** Legge e consuma l'id memorizzato (null se assente o non valido). */
export function ultimaPersonaVista(): number | null {
  try {
    const grezzo = globalThis.sessionStorage?.getItem(CHIAVE);
    if (!grezzo) return null;
    globalThis.sessionStorage?.removeItem(CHIAVE);
    const n = Number(grezzo);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}
