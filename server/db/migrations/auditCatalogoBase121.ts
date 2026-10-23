// F5: copia congelata, identica, di `shared/auditCatalogo.ts` com'era quando la migrazione 121 l'ha usata. Non modificarla: il modulo
// vivo è l'altro file.
/** Censimento ricostruito di M7: non sostituisce il documento preliminare mai ritrovato. */
export interface RiferimentoAuditCatalogo {
  id: string;
  tipo: string;
  chiave: string;
  catalogo: string | null;
}
export interface FonteAuditCatalogo {
  id: string;
  tipo: string;
  chiave: string;
  impronta: string;
  fontePubblicaHash: string | null;
  nuova: boolean;
  mutata: boolean;
  input: unknown;
  granularita: 'fonte';
  esito: 'collegata' | 'proposta' | 'da-verificare' | 'esclusa';
  motivo: string;
  decisione: boolean;
  sottoelementiNonRiconciliati: boolean;
  risultati: RiferimentoAuditCatalogo[];
  proposte: RiferimentoAuditCatalogo[];
  /** Risultati del contesto: non attribuiti a questa singola riga. */
  contestoRisultati: RiferimentoAuditCatalogo[];
}
export interface AuditCatalogo {
  schemaVersion: 1;
  ricostruzione: true;
  creatoIl: string;
  campiPerTipo: Record<string, string[]>;
  canonicalizzazione: 'json-chiavi-ordinate-v1';
  originePacchetto: unknown;
  fonti: FonteAuditCatalogo[];
  manifestAssenti: Array<{ tipo: string; chiave: string; impronta: string }>;
  risultatiConFonti: Array<RiferimentoAuditCatalogo & { fonti: string[]; fontiContesto: string[]; dati: unknown }>;
  limiti: string[];
  /** Appendice distinta: presente soltanto nelle future conversioni che censiscono i residui delle voci. */
  residuiVoci?: Array<{ voce: string; lacune: Array<{ campo: string; motivo: string;
    locatori?: Array<{ campo: string; inizio: number; fine: number; testo: string }> }> }>;
}

/** Condivisa con il generatore del manifest. Le stringhe JSON non vengono reinterpretate. */
export function inputImprontaCatalogo(input: unknown, campi: readonly string[]): unknown {
  const canonico = (x: unknown, togliPuntatori: boolean): unknown => {
    if (Array.isArray(x)) return x.map((v) => canonico(v, togliPuntatori));
    if (!x || typeof x !== 'object') return x ?? null;
    return Object.fromEntries(Object.entries(x as Record<string, unknown>)
      .filter(([k]) => !togliPuntatori || k !== 'catalogoChiave')
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([k, v]) => [k, canonico(v, togliPuntatori)]));
  };
  if (campi.includes('*')) return canonico(input, true);
  const r = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
  return canonico(Object.fromEntries(campi.map((k) => [k, r[k] ?? null])), false);
}
