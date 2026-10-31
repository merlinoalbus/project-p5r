import { Link } from 'react-router-dom';
import type { RicompensaOggettoDto } from '../../types';

/** L13 (ondata 11, O11-3): con la regola del dono in parole (`condizione`), questa prende il posto della prima riga della nota, che dice la
 *  stessa cosa in prosa; le righe successive (l'indirizzo della fonte) restano. Senza `condizione` la nota resta com'è. */
function testoSottoIlNome(o: RicompensaOggettoDto): string | null {
  if (!o.condizione) return o.nota;
  return [o.condizione, ...(o.nota ?? '').split('\n').slice(1)].join('\n');
}

/** Identità e quantità dal legame, mai interpretate dal testo della guida. */
export function OggettiCollegati({ oggetti }: { oggetti: readonly RicompensaOggettoDto[] }) {
  return <ul className="m-0 flex min-w-0 list-none flex-col gap-1 p-0">
    {oggetti.map((o) => {
      const testo = testoSottoIlNome(o);
      return <li key={o.chiave} className="min-w-0 break-words">
        {o.quantita !== null && <span className="tabular-nums">{o.quantita} × </span>}<Link to={o.casa} className="touch inline-flex max-w-full items-center break-words">{o.nome}</Link>
        {o.quantita === null && <span className="block testo-12 text-text-muted">Quantità non indicata dalla guida</span>}
        {testo && <span className={o.condizione ? 'block whitespace-pre-line text-pretty testo-12 text-text-secondary' : 'block whitespace-pre-line testo-12 text-text-secondary'}>{testo}</span>}
      </li>;
    })}
  </ul>;
}
