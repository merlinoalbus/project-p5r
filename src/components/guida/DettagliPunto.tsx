// ============================================================
// DettagliPunto — i dettagli strutturati di un punto (o di un'area) della guida, come elenco «chiave: valore»
// ============================================================

import { etichettaDettaglio } from '../../utils/dettagliVoce';
import type { ContenutoOggettoDto } from '../../types';
import { OggettiCollegati } from '../catalogo/OggettiCollegati';
import { nomeCanonicoNelTesto } from '../../utils/elementiGuida';

/** I dettagli che elencano elementi di debolezza o resistenza: si mostrano col vocabolario unico (R8-20c). Il testo dei dettagli non si riscrive nei dati. */
const CHIAVI_AFFINITA = new Set(['deboleA', 'resisteA', 'debolezze', 'resistenze']);
const comeElemento = (k: string, x: unknown): string => (CHIAVI_AFFINITA.has(k) && typeof x === 'string' ? x.split(',').map((p) => nomeCanonicoNelTesto(p.trim())).join(', ') : String(x));

/** Le voci non vuote di `dettagli`, con la chiave resa leggibile. */
export function DettagliPunto({ d, contenuto = [], senzaAffinita = false }: { d: Record<string, unknown>; contenuto?: readonly ContenutoOggettoDto[]; senzaAffinita?: boolean }) {
  // R8-10/1: di una voce «Persona» con la Persona del compendio le debolezze e le resistenze si leggono dal compendio (riquadro «i»): la copia nel
  // testo dei dettagli non si mostra, così correggere le affinità della Persona cambia ciò che si vede ovunque. Nei dati la copia non si tocca.
  const voci = Object.entries(d).filter(([k, v]) => v !== null && v !== '' && !(Array.isArray(v) && v.length === 0) && !(senzaAffinita && CHIAVI_AFFINITA.has(k)));
  if (voci.length === 0 && contenuto.length === 0) return null;
  return (
    <dl className="dl-scheda m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 testo-12">
      {contenuto.length > 0 && <div className="contents"><dt className="text-text-muted">Contenuto</dt><dd className="m-0 min-w-0"><OggettiCollegati oggetti={contenuto} /></dd></div>}
      {voci.map(([k, v]) => (
        <div key={k} className="contents"><dt className="text-text-muted capitalize">{contenuto.length > 0 && k === 'contenuto' ? 'Nota della guida' : etichettaDettaglio(k)}</dt><dd className="m-0 min-w-0 break-words">{Array.isArray(v) ? v.map((x) => (typeof x === 'object' && x !== null ? Object.values(x).join(' · ') : comeElemento(k, x))).join(Array.isArray(v) && v.some((x) => typeof x === 'object') ? ' — ' : ', ') : typeof v === 'object' ? JSON.stringify(v) : comeElemento(k, v)}</dd></div>
      ))}
    </dl>
  );
}
