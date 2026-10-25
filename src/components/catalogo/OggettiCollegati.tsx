import { Link } from 'react-router-dom';
import type { RicompensaOggettoDto } from '../../types';

/** Identità e quantità dal legame, mai interpretate dal testo della guida. */
export function OggettiCollegati({ oggetti }: { oggetti: readonly RicompensaOggettoDto[] }) {
  return <ul className="m-0 flex min-w-0 list-none flex-col gap-1 p-0">
    {oggetti.map((o) => <li key={o.chiave} className="min-w-0 break-words">
      {o.quantita !== null && <span className="tabular-nums">{o.quantita} × </span>}<Link to={o.casa} className="touch inline-flex max-w-full items-center break-words">{o.nome}</Link>
      {o.quantita === null && <span className="block testo-12 text-text-muted">Quantità non indicata dalla guida</span>}
      {o.nota && <span className="block whitespace-pre-line testo-12 text-text-secondary">{o.nota}</span>}
    </li>)}
  </ul>;
}
