// ============================================================
// Sfondi a tema per sezione (Fase 11.1): asset «sfondi/*» o dell'identità scelti dal percorso corrente
// ============================================================

export interface SfondoSezione {
  /** Prefisso del percorso (il primo che corrisponde vince). */
  prefisso: string;
  sfondo: string;
  /** Variante mostrata quando nella partita attiva è acceso l'Allarme delle fusioni. */
  allarme?: string;
}

/** Abbinamenti sezione → asset: Stanza di Velluto per Compendio, Skill, Fusione e Impostazioni; Mementos per la Guida; splash dell'identità per Home, Partita e Confidenti. Ogni sezione ha il suo sfondo (decisione dell'utente). */
export const SFONDI_SEZIONE: ReadonlyArray<SfondoSezione> = [
  { prefisso: '/fusione', sfondo: 'sfondi/stanza-velluto', allarme: 'sfondi/stanza-velluto-allarme' },
  { prefisso: '/compendio', sfondo: 'sfondi/stanza-velluto' },
  { prefisso: '/skill', sfondo: 'sfondi/stanza-velluto' },
  { prefisso: '/guida', sfondo: 'sfondi/mementos' },
  { prefisso: '/partita', sfondo: 'identita/splash-verticale-senza-testo' },
  { prefisso: '/confidenti', sfondo: 'identita/splash-verticale-senza-testo' },
  { prefisso: '/home', sfondo: 'identita/splash-orizzontale-senza-testo' },
  { prefisso: '/impostazioni', sfondo: 'sfondi/stanza-velluto' },
];

/** Chiave dell'asset di sfondo per il percorso, oppure null se la sezione non ne ha uno. */
export function sfondoPerPercorso(pathname: string, allarmeAttivo = false): string | null {
  const s = SFONDI_SEZIONE.find((x) => pathname === x.prefisso || pathname.startsWith(`${x.prefisso}/`));
  if (!s) return null;
  return allarmeAttivo && s.allarme ? s.allarme : s.sfondo;
}
