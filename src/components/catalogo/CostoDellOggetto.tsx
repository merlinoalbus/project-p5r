import { Link } from 'react-router-dom';
import type { CostoOggettoDto } from '../../types';
import { formattaYen } from '../../utils/letture';
import { testoCostoAImporto, type PrezzoPerFascia } from '../../../shared/catalogo';

/** La stessa resa in listino, pagina oggetto e visore: uno scambio non diventa un prezzo in yen.
 *  Ondata 5 (lotto E): le monete del Casinò e i punti negozio si leggono come i fiori («350 monete», «30 punti»); il prezzo di una fascia
 *  diverso da quello normale (le sfide della Big Bang Burger di sera, decisione 5) compare accanto, solo se c'è. */
export function CostoDellOggetto({ costo, prezzo, prezzoPerFascia = null, daVerificare = false }: { costo: CostoOggettoDto | null; prezzo: number | null; prezzoPerFascia?: PrezzoPerFascia | null; daVerificare?: boolean }) {
  if (daVerificare) return <span>Costo di scambio da correggere nel negozio</span>;
  if (costo?.tipo === 'fiori') return <span>Scambio: {testoCostoAImporto(costo)}</span>;
  if (costo?.tipo === 'monete' || costo?.tipo === 'punti') return <span>{testoCostoAImporto(costo)}</span>;
  if (costo?.tipo === 'oggetti') return <span className="flex flex-wrap items-center gap-x-2">Scambio:{costo.oggetti.map((o) => <span key={o.chiave}>
    {o.quantita} × {o.casa && o.nome ? <Link className="touch inline-flex items-center" to={o.casa}>{o.nome}</Link> : <span>{o.nome ?? 'Oggetto eliminato o da collegare'}</span>}
  </span>)}</span>;
  const base = prezzo === null ? 'Costo non indicato' : prezzo === 0 ? 'Gratis' : formattaYen(prezzo);
  // solo le fasce con un prezzo diverso da quello normale: ripetere lo stesso importo non direbbe niente
  const fasce = (['giorno', 'sera'] as const).flatMap((f) => {
    const p = prezzoPerFascia?.[f];
    return p !== undefined && p !== prezzo ? [`${f === 'sera' ? 'di sera' : 'di giorno'} ${p === 0 ? 'gratis' : formattaYen(p)}`] : [];
  });
  return <span>{base}{fasce.length ? <span className="text-text-secondary"> · {fasce.join(' · ')}</span> : null}</span>;
}
