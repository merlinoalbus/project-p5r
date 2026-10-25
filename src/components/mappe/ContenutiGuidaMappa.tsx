// ============================================================
// ContenutiGuidaMappa — le sezioni della guida legate a un luogo, con le loro schede apribili
// ============================================================

import { useState, type MouseEvent } from 'react';
import { SchedaContenutoGuida } from './SchedaContenutoGuida';
import { usePartitaStore } from '../../stores/partitaStore';
import { Link, useNavigate } from 'react-router-dom';
import { getContenutiMappa, risolviMappa } from '../../services/api';
import { casaConInfiltrazione, urlMappa } from '../../utils/navigazioneMappa';
import { useCarica } from '../../hooks/useCarica';
import { PageState } from '../shared/PageState';
import { TitoloSezione } from '../shared/TitoloSezione';
/** Pannello «Contenuti della guida» di una mappa: un `details` per area, con descrizione, note,
 * dettagli collegati, planimetrie figlie ed elementi (i passi di un enigma rientrati sotto il loro
 * contenitore). Un elemento con scheda si apre in linea in `SchedaContenutoGuida`, una alla volta.
 * I contenuti si ricaricano quando cambiano la partita attiva o la sua data, fascia o meteo;
 * `area` apre la sezione richiesta (o avvisa se non è di questa mappa), `dungeon` aggiunge il
 * collegamento alla scheda del Palazzo o dei Memento. Senza aree non mostra nulla. */
export function ContenutiGuidaMappa({ mappa, area, dungeon }: { mappa: string; area?: string | null; dungeon?: string }) {
  const attiva = usePartitaStore(s => s.attiva);
  const [selezionato, seleziona] = useState<number | null>(null);
  // L0: nei Memento le sezioni sono dedali, nei Palazzi infiltrazioni; il collegamento porta alla scheda del posto
  const memento = dungeon === 'mementos';
  const contenuti = useCarica(() => getContenutiMappa(mappa, attiva?.id), [mappa, attiva?.id, attiva?.dataGioco, attiva?.fasciaGioco, attiva?.meteoOra]);
  const navigate = useNavigate();
  /** L3 (AP3-4): il nome di una planimetria porta dritto alla sua casa (la scheda del Palazzo sulla sua area, con l'infiltrazione
   *  della sezione), senza passare dal redirect di `/guida/mappe/<k>` che la perderebbe. Il collegamento resta per aprirla altrove
   *  (nuova scheda, tasti); se la casa non si trova si va comunque al vecchio indirizzo. */
  const apriPlanimetria = (e: MouseEvent<HTMLAnchorElement>, chiave: string, infiltrazione: string | null) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    risolviMappa(chiave)
      .then((r) => navigate(r.tipo === 'mappa' ? casaConInfiltrazione(r.casa, r.mappa, infiltrazione) : urlMappa(chiave)))
      .catch(() => navigate(urlMappa(chiave)));
  };
  // Ogni comando di questo pannello è l'unico contenuto della sua riga — un `li`, uno `strong`,
  // una riga a sé — e non una parola dentro una frase: valgono 44 px come tutti gli altri. Erano
  // 19-22 px, e si vedevano solo aprendo il pannello sulla radice di un Palazzo, che è una vista
  // che la passata di misura non campionava (rilievo del validatore, 2026-09-13).
  // I passi di un Enigma (095) arrivano dal server subito sotto di lui, con `contenitore`: qui rientrano, come nella scheda del Palazzo.
  return <PageState isLoading={contenuti.caricamento} error={contenuti.errore} onRetry={contenuti.ricarica}>
    {!!contenuti.dati?.aree.length && <section className="card flex flex-col gap-3" aria-label="Contenuti della guida">
      <TitoloSezione>Contenuti della guida</TitoloSezione>
      {/* L3 (§4.1): nei Palazzi la scheda si apre sull'infiltrazione chiesta (`?infiltrazione=`); i Memento restano col loro `?area=`.
          Una richiesta che non appartiene a questa mappa apre la scheda e basta. */}
      {dungeon && <Link className="touch inline-flex items-center self-start" to={`/guida/dungeon/${encodeURIComponent(dungeon)}${area && contenuti.dati.aree.some(a => a.chiave === area) ? `?${memento ? 'area' : 'infiltrazione'}=${encodeURIComponent(area)}` : ''}`}>{memento ? 'Apri la scheda dei Memento' : 'Apri la scheda del Palazzo'}</Link>}
      {area && !contenuti.dati.aree.some(a => a.chiave === area) && <p role="status">{memento ? 'Il dedalo richiesto non appartiene a questa mappa.' : 'L’infiltrazione richiesta non appartiene a questa mappa.'}</p>}
      {contenuti.dati.aree.map(a => <details className="border-b border-border-light py-2" key={`${a.chiave}:${area ?? ''}`} open={a.chiave === area || undefined}>
        <summary className="cursor-pointer font-semibold touch">{a.nome}</summary>
        {a.descrizione && <p className="whitespace-pre-wrap">{a.descrizione}</p>}        {!!a.collegamenti?.length && <details><summary className="cursor-pointer touch">{memento ? 'Dettagli del dedalo' : 'Dettagli dell’infiltrazione'}</summary>{a.collegamenti.map(c => <div key={c.id}>
          <button type="button" className="touch inline-flex items-center text-left" onClick={() => seleziona(c.id)}>{c.nome}</button>
          {selezionato === c.id && <SchedaContenutoGuida key={`${c.id}:${attiva?.id ?? 'nessuna'}`} spillo={c} partitaId={attiva?.id ?? null} onChiudi={() => seleziona(null)} onCambiato={contenuti.ricarica} />}
        </div>)}</details>}
        {!!a.mappe.length && <ul aria-label={`Planimetrie di ${a.nome}`}>{a.mappe.map(m => <li key={m.chiave}><Link className="touch inline-flex items-center" to={`/guida/mappe/${encodeURIComponent(m.chiave)}`} onClick={(e) => apriPlanimetria(e, m.chiave, memento ? null : a.chiave)}>{m.nome}</Link></li>)}</ul>}
        {!!a.punti.length && <ul className="list-none p-0 flex flex-col gap-2" aria-label={`Elementi di ${a.nome}`}>{a.punti.filter(p => p.ruolo !== 'sezione').map(p => <li key={p.id} className={p.contenitore != null ? 'ml-4 border-l-2 border-border-light pl-2' : undefined} data-passo-di={p.contenitore ?? undefined}><strong>{p.scheda ? <button type="button" className="touch inline-flex items-center text-left" onClick={() => seleziona(p.scheda!.id)}>{p.nome}</button> : p.nome}</strong>{p.descrizione && <p className="whitespace-pre-wrap">{p.descrizione}</p>}{p.scheda && selezionato === p.id && <SchedaContenutoGuida key={`${p.id}:${attiva?.id ?? 'nessuna'}`} spillo={p.scheda} partitaId={attiva?.id ?? null} onChiudi={() => seleziona(null)} onCambiato={contenuti.ricarica} />}</li>)}</ul>}
      </details>)}
    </section>}
  </PageState>;
}
