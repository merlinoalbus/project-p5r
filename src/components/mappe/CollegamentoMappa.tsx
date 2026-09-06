import { Link } from 'react-router-dom';
import { IconaAzione } from '../shared/IconaAzione';
import { schedaAccessoMondo } from '../../utils/accessoMondo';
import type { TipoAccessoMondo } from '../../../shared/accessoMondo';

/** Porta dalla scheda di un'entità al suo punto sulla mappa.
 *
 * È lo stesso collegamento per tutte le sezioni — negozi, attività, confidenti, articoli,
 * Palazzi — perché il mondo è uno solo: la scheda dice che cos'è, la mappa dove si trova.
 * L'indirizzo passa sempre dal risolutore unico, che sceglie la destinazione quando è una sola e
 * lascia scegliere quando sono più d'una. */
export function CollegamentoMappa({ tipo, chiave, testo = 'Dove si trova', compatto = false }: {
  tipo: TipoAccessoMondo; chiave: string; testo?: string; compatto?: boolean;
}) {
  return <Link
    to={schedaAccessoMondo(tipo, chiave)}
    className={compatto ? 'chip no-underline inline-flex items-center gap-1' : 'btn btn-ghost btn-sm touch self-start inline-flex items-center gap-1.5'}
  ><IconaAzione chiave="mappa" dimensione={compatto ? 14 : 16} />{testo}</Link>;
}
