// ============================================================
// DettagliPunto — i dettagli strutturati di un punto (o di un'area) della guida, come elenco «chiave: valore»
// ============================================================

import { etichettaDettaglio } from '../../utils/dettagliVoce';

/** Le voci non vuote di `dettagli`, con la chiave resa leggibile. */
export function DettagliPunto({ d }: { d: Record<string, unknown> }) {
  const voci = Object.entries(d).filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && v.length === 0));
  if (voci.length === 0) return null;
  return (
    <dl className="dl-scheda m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
      {voci.map(([k, v]) => (
        <div key={k} className="contents"><dt className="text-text-muted capitalize">{etichettaDettaglio(k)}</dt><dd className="m-0">{Array.isArray(v) ? v.map((x) => (typeof x === 'object' && x !== null ? Object.values(x).join(' · ') : String(x))).join(Array.isArray(v) && v.some((x) => typeof x === 'object') ? ' — ' : ', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd></div>
      ))}
    </dl>
  );
}
