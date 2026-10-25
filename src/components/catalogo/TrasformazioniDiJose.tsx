import { Link } from 'react-router-dom';
import type { TrasformazioneOggettoDto } from '../../types';
import { ModificaGuida } from '../guida/ModificaGuida';

/**
 * Le trasformazioni di Jose di un oggetto o del suo listino. Con `onModificata` ogni riga ha il gesto «Modifica» (L11 · B11, R11-15/5: cristallo,
 * anello, «solo in Nuova Partita+» e fonte, con «Ripristina» ai valori della guida); chi la mostra rilegge i suoi dati alla chiusura.
 */
export function TrasformazioniDiJose({ trasformazioni, onModificata }: { trasformazioni: TrasformazioneOggettoDto[]; onModificata?: () => void }) {
  if (!trasformazioni.length) return null;
  return <section className="card flex min-w-0 flex-col gap-2" aria-label="Trasformazioni di Jose">
    <h3 className="m-0 text-base">Trasformazioni da <Link to="/guida/negozi/jose">Jose</Link></h3>
    <ul className="m-0 list-none divide-y divide-border p-0">{trasformazioni.map((t) => <li key={t.palazzo} className="flex flex-col gap-1 py-2 testo-13">
      <div className="flex flex-wrap items-center gap-1">{t.cristallo ? <Link className="touch inline-flex items-center" to={t.cristallo.casa}>{t.cristallo.nome}</Link> : <span>Cristallo non collegato</span>}
        <span aria-label="si trasforma in">→</span>{t.anello ? <Link className="touch inline-flex items-center" to={t.anello.casa}>{t.anello.nome}</Link> : <span>Anello non collegato</span>}
        {onModificata && <ModificaGuida tipo="trasformazione" chiave={t.palazzo} cosa={`la trasformazione di ${t.palazzoNome}`} soloIcona className="ml-auto" onSalvato={onModificata} />}</div>
      <span>{t.soloNuovaPartitaPlus ? 'Solo in Nuova Partita+' : `Dopo la distruzione del Palazzo: ${t.palazzoNome}`}</span>
      {t.palazzoConcluso !== null && <span>Partita: Palazzo {t.palazzoConcluso ? 'concluso' : 'non ancora concluso'}.</span>}
      {t.nuovaPartitaPlus !== null && <span>Partita: {t.nuovaPartitaPlus ? 'Nuova Partita+' : 'prima partita'}.</span>}
      <a href={t.fonte} target="_blank" rel="noreferrer" className="touch inline-flex items-center self-start">Fonte della trasformazione</a>
    </li>)}</ul>
    <p className="m-0 testo-12 text-text-muted">Il requisito non attesta il possesso del Cristallo né una trasformazione già effettuata.</p>
  </section>;
}
