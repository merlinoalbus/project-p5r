import { useState } from 'react';
import { SchedaContenutoGuida } from './SchedaContenutoGuida';
import { usePartitaStore } from '../../stores/partitaStore';
import { Link } from 'react-router-dom';
import { getContenutiMappa } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { PageState } from '../shared/PageState';
export function ContenutiGuidaMappa({ mappa, area, dungeon }: { mappa: string; area?: string | null; dungeon?: string }) {
  const attiva = usePartitaStore(s => s.attiva);
  const [selezionato, seleziona] = useState<number | null>(null);
  const contenuti = useCarica(() => getContenutiMappa(mappa, attiva?.id), [mappa, attiva?.id, attiva?.dataGioco, attiva?.fasciaGioco]);
  // Ogni comando di questo pannello è l'unico contenuto della sua riga — un `li`, uno `strong`,
  // una riga a sé — e non una parola dentro una frase: valgono 44 px come tutti gli altri. Erano
  // 19-22 px, e si vedevano solo aprendo il pannello sulla radice di un Palazzo, che è una vista
  // che la passata di misura non campionava (rilievo del validatore, 2026-09-13).
  return <PageState isLoading={contenuti.caricamento} error={contenuti.errore} onRetry={contenuti.ricarica}>
    {!!contenuti.dati?.aree.length && <section className="card flex flex-col gap-3" aria-label="Contenuti della guida">
      <h2 className="m-0 text-lg">Contenuti della guida</h2>
      {dungeon && <Link className="touch inline-flex items-center self-start" to={`/guida/dungeon/${encodeURIComponent(dungeon)}`}>Apri la scheda del palazzo o dedalo</Link>}
      {area && !contenuti.dati.aree.some(a => a.chiave === area) && <p role="status">La sezione richiesta non appartiene a questo luogo.</p>}
      {contenuti.dati.aree.map(a => <details className="border-b border-border-light py-2" key={`${a.chiave}:${area ?? ''}`} open={a.chiave === area || undefined}>
        <summary className="cursor-pointer font-semibold touch">{a.nome}</summary>
        {a.descrizione && <p className="whitespace-pre-wrap">{a.descrizione}</p>}{a.note && <p className="whitespace-pre-wrap">{a.note}</p>}
        {!!a.collegamenti?.length && <details><summary className="cursor-pointer touch">Dettagli della sezione</summary>{a.collegamenti.map(c => <div key={c.id}>
          <button type="button" className="touch inline-flex items-center text-left" onClick={() => seleziona(c.id)}>{c.nome}</button>
          {selezionato === c.id && <SchedaContenutoGuida key={`${c.id}:${attiva?.id ?? 'nessuna'}`} spillo={c} partitaId={attiva?.id ?? null} onChiudi={() => seleziona(null)} onCambiato={contenuti.ricarica} />}
        </div>)}</details>}
        {!!a.mappe.length && <ul aria-label={`Planimetrie di ${a.nome}`}>{a.mappe.map(m => <li key={m.chiave}><Link className="touch inline-flex items-center" to={`/guida/mappe/${encodeURIComponent(m.chiave)}`}>{m.nome}</Link></li>)}</ul>}
        {!!a.punti.length && <ul className="list-none p-0 flex flex-col gap-2" aria-label={`Elementi di ${a.nome}`}>{a.punti.filter(p => p.ruolo !== 'sezione').map(p => <li key={p.id}><strong>{p.scheda ? <button type="button" className="touch inline-flex items-center text-left" onClick={() => seleziona(p.scheda!.id)}>{p.nome}</button> : p.nome}</strong>{p.descrizione && <p className="whitespace-pre-wrap">{p.descrizione}</p>}{p.scheda && selezionato === p.id && <SchedaContenutoGuida key={`${p.id}:${attiva?.id ?? 'nessuna'}`} spillo={p.scheda} partitaId={attiva?.id ?? null} onChiudi={() => seleziona(null)} onCambiato={contenuti.ricarica} />}</li>)}</ul>}
      </details>)}
    </section>}
  </PageState>;
}
