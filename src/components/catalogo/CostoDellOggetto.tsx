import { Link } from 'react-router-dom';
import type { CostoOggettoDto } from '../../types';
import { formattaYen } from '../../utils/letture';

/** La stessa resa in listino, pagina oggetto e visore: uno scambio non diventa un prezzo in yen. */
export function CostoDellOggetto({ costo, prezzo, daVerificare = false }: { costo: CostoOggettoDto | null; prezzo: number | null; daVerificare?: boolean }) {
  if (daVerificare) return <span>Costo di scambio da correggere nel negozio</span>;
  if (costo?.tipo === 'fiori') return <span>Scambio: {costo.importo.toLocaleString('it-IT')} fiori</span>;
  if (costo?.tipo === 'oggetti') return <span className="flex flex-wrap items-center gap-x-2">Scambio:{costo.oggetti.map((o) => <span key={o.chiave}>
    {o.quantita} × {o.casa && o.nome ? <Link className="touch inline-flex items-center" to={o.casa}>{o.nome}</Link> : <span>{o.nome ?? 'Oggetto eliminato o da collegare'}</span>}
  </span>)}</span>;
  return <span>{prezzo === null ? 'Costo non indicato' : prezzo === 0 ? 'Gratis' : formattaYen(prezzo)}</span>;
}
