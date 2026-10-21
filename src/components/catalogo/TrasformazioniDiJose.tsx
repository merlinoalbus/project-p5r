import { Link } from 'react-router-dom';
import type { TrasformazioneOggettoDto } from '../../types';

export function TrasformazioniDiJose({ trasformazioni }: { trasformazioni: TrasformazioneOggettoDto[] }) {
  if (!trasformazioni.length) return null;
  return <section className="card flex min-w-0 flex-col gap-2" aria-label="Trasformazioni di Jose">
    <h3 className="m-0 text-base">Trasformazioni da <Link to="/guida/negozi/jose">Jose</Link></h3>
    <ul className="m-0 list-none divide-y divide-border p-0">{trasformazioni.map((t) => <li key={t.palazzo} className="flex flex-col gap-1 py-2 text-[13px]">
      <div className="flex flex-wrap items-center gap-1">{t.cristallo ? <Link className="touch inline-flex items-center" to={t.cristallo.casa}>{t.cristallo.nome}</Link> : <span>Cristallo non collegato</span>}
        <span aria-label="si trasforma in">→</span>{t.anello ? <Link className="touch inline-flex items-center" to={t.anello.casa}>{t.anello.nome}</Link> : <span>Anello non collegato</span>}</div>
      <span>{t.soloNuovaPartitaPlus ? 'Solo in Nuova Partita+' : `Dopo la distruzione del Palazzo: ${t.palazzoNome}`}</span>
      {t.palazzoConcluso !== null && <span>Partita: Palazzo {t.palazzoConcluso ? 'concluso' : 'non ancora concluso'}.</span>}
      {t.nuovaPartitaPlus !== null && <span>Partita: {t.nuovaPartitaPlus ? 'Nuova Partita+' : 'prima partita'}.</span>}
      <a href={t.fonte} target="_blank" rel="noreferrer" className="touch inline-flex items-center self-start">Fonte della trasformazione</a>
    </li>)}</ul>
    <p className="m-0 text-[12px] text-text-muted">Il requisito non attesta il possesso del Cristallo né una trasformazione già effettuata.</p>
  </section>;
}
