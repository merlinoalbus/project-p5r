import { getDb } from '../db/dbService.js';
import type { CampoScambioCensimento, CensimentoScambiCatalogoDto, NodoScambioCensimento, SezioneScambiCensimento } from '../../shared/censimentoScambiCatalogo.js';

type Riga = Record<string, unknown>;
const record = (v: unknown): Riga | null => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Riga : null;
const CAMPI_JOSE = ['nome', 'effetto', 'costo', 'requisito', 'fonte'] as const;
const CAMPI_VENDITORE = ['venditore', 'fonte'] as const;
const CAMPI_OFFERTA = ['ricevi', 'dai', 'note', 'fonte'] as const;

function campo(r: Riga | null, chiave: string): CampoScambioCensimento {
  if (!r || !Object.hasOwn(r, chiave)) return { stato: 'assente', valore: null };
  const v = r[chiave];
  if (v === null) return { stato: 'null', valore: null };
  if (typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v))) return { stato: 'valido', valore: v };
  // Mai restituire un oggetto inatteso: potrebbe contenere blocchi estranei all'allowlist.
  return { stato: 'non-supportato', valore: null };
}
function nodo(v: unknown, percorso: string, campi: readonly string[]): NodoScambioCensimento {
  const r = record(v);
  return { percorso, uid: typeof r?.uid === 'string' ? r.uid : null, stato: r ? 'valido' : 'non-supportato',
    campi: Object.fromEntries(campi.map((k) => [k, campo(r, k)])) };
}
function sezione(r: Riga | null, percorso: string, campi: readonly string[], proprieta: 'scambi' | 'offerte'): SezioneScambiCensimento {
  const base = { percorso, motivo: null, righe: [] };
  if (!r || !Object.hasOwn(r, proprieta)) return { ...base, stato: 'assente' };
  const v = r[proprieta];
  if (v === null) return { ...base, stato: 'null' };
  if (!Array.isArray(v)) return { ...base, stato: 'non-supportato', motivo: 'La sezione attesa non è un array.' };
  return { ...base, stato: v.length ? 'valido' : 'vuoto', righe: v.map((x, i) => nodo(x, `${percorso}/${i}`, campi)) };
}

/** Un'unica fotografia di lettura; niente cache, log del corpo, partite o blocchi restituiti integralmente. */
export function censimentoScambiCatalogo(): CensimentoScambiCatalogoDto {
  const db = getDb();
  return db.transaction((): CensimentoScambiCatalogoDto => {
    const righe = db.prepare("SELECT chiave,json FROM dati_guida WHERE chiave IN ('jose','oggetti-guida') ORDER BY chiave").all() as Array<{ chiave: string; json: unknown }>;
    function leggi(chiave: string, campi: readonly string[]): { radice: Riga | null; sezione: SezioneScambiCensimento } {
      const r = righe.find((x) => x.chiave === chiave); const percorso = `${chiave}/scambi`;
      if (!r) return { radice: null, sezione: { percorso, stato: 'assente', motivo: 'Blocco assente.', righe: [] } };
      let v: unknown;
      try {
        if (typeof r.json !== 'string') return { radice: null, sezione: { percorso, stato: 'non-supportato', motivo: 'Il blocco non contiene testo JSON.', righe: [] } };
        v = JSON.parse(r.json) as unknown;
      } catch { return { radice: null, sezione: { percorso, stato: 'malformato', motivo: 'JSON del blocco illeggibile; il contenuto non viene esposto.', righe: [] } }; }
      const radice = record(v);
      if (!radice) return { radice: null, sezione: { percorso, stato: v === null ? 'null' : 'non-supportato', motivo: 'La radice non è un oggetto.', righe: [] } };
      return { radice, sezione: sezione(radice, percorso, campi, 'scambi') };
    }
    const jose = leggi('jose', CAMPI_JOSE);
    const guida = leggi('oggetti-guida', CAMPI_VENDITORE);
    const originali = Array.isArray(guida.radice?.scambi) ? guida.radice.scambi : [];
    return { versione: 1, completo: true, significatoCompletezza: 'nessun-taglio-delle-righe-proiettate', jose: jose.sezione,
      guida: { ...guida.sezione, righe: guida.sezione.righe.map((r, i) => ({ ...r,
        offerte: sezione(record(originali[i]), `${r.percorso}/offerte`, CAMPI_OFFERTA, 'offerte') })) } };
  })();
}
