import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { MappaRiassuntoDto } from '../../types';
import { useAsset } from '../../stores/assetStore';

interface Props {
  mappe: MappaRiassuntoDto[];
  attuale?: string;
  nome?: string;
  discendenti?: (mappa: MappaRiassuntoDto) => ReactNode;
}
/** Le posizioni della collezione arrivano dall’intero catalogo, mai dal filtro visualizzato. */
export function ImmaginiLuogo({ mappe, attuale, nome, discendenti }: Props) {
  const immagini = [...mappe].sort((a, b) => (a.immagineCollezione?.indice ?? a.gruppoImmagini?.ordine ?? a.ordine) - (b.immagineCollezione?.indice ?? b.gruppoImmagini?.ordine ?? b.ordine) || a.chiave.localeCompare(b.chiave));
  const titolo = nome ?? immagini[0]?.gruppoImmagini?.nome ?? 'questo luogo';
  return <ul className="m-0 p-0 list-none flex flex-wrap gap-3" aria-label={`Immagini di ${titolo}`}>{immagini.map((m, i) => <Miniatura key={m.chiave} mappa={m} indice={m.immagineCollezione?.indice ?? i + 1} totale={m.immagineCollezione?.totale ?? immagini.length} attuale={attuale}>{discendenti?.(m)}</Miniatura>)}</ul>;
}
function Miniatura({ mappa, indice, totale, attuale, children }: { mappa: MappaRiassuntoDto; indice: number; totale: number; attuale?: string; children?: ReactNode }) {
  const asset = useAsset(mappa.asset), originale = useAsset(mappa.assetOriginale);
  const src = mappa.immagineUrl ?? asset ?? originale;
  return <li><Link className="card flex flex-col items-center gap-2 no-underline text-text touch" aria-current={attuale === mappa.chiave ? 'page' : undefined} to={`/guida/mappe/${encodeURIComponent(mappa.chiave)}`}>
    {src && <img src={src} alt="" className="w-28 h-24 object-contain bg-neutral-700 rounded" />}
    <span>Immagine {indice} di {totale}</span>
  </Link>{children}</li>;
}
