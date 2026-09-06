import { ImmaginiLuogo } from '../components/mappe/ImmaginiLuogo';
import { SelettoreContestoMappa } from '../components/mappe/SelettoreContestoMappa';
import { nomePresentazioneMappa, presentaMappa } from '../utils/presentazioneMappa';
import { AlberoLuoghi } from '../components/mappe/AlberoLuoghi';
import { ContenutiGuidaMappa } from '../components/mappe/ContenutiGuidaMappa';
import { RisolviMappa } from '../components/mappe/RisolviMappa';
import { haPlanimetria } from '../utils/haPlanimetria';
// ============================================================
// MappaPage — indice delle mappe (albero) e visore a schermo intero di una mappa (Fase 13.2)
// ============================================================

import { urlMappa } from '../utils/navigazioneMappa';
import { useMemo } from 'react';
import { centroAccessoMondo, schedaAccessoMondo } from '../utils/accessoMondo';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { useMappaPartita } from '../hooks/useMappaPartita';
import { getAlberoMappe } from '../services/api';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { VisoreMappa } from '../components/mappe/VisoreMappa';
import { CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { NOME_TIPO_MAPPA } from '../../shared/spilli';

export function MappaPage() {
  const { chiave } = useParams<{ chiave: string }>();
  const attiva = usePartitaStore((s) => s.attiva);
  return chiave ? <RisolviMappa chiave={chiave}>{k => <DettaglioMappa chiave={k} partitaId={attiva?.id ?? null} />}</RisolviMappa> : <IndiceMappe />;
}

/** Indice: radici (Tokyo, Palazzi, Dedalo) con le mappe figlie. */
function IndiceMappe() {
  useDocumentTitle('Mappe');
  const albero = useCarica(() => getAlberoMappe(), []);
  const mappe = albero.dati ?? [];
  return <div className="flex flex-col gap-4">
    <IntestazionePagina titolo="Mappe" sottotitolo="Luoghi e planimetrie di Tokyo, Palazzi e Dedali." />
    <PageState isLoading={albero.caricamento} error={albero.errore} onRetry={albero.ricarica}>
      <ul className="m-0 p-0 list-none grid gap-3 grid-cols-1 lg:grid-cols-2 items-start" aria-label="Mappe">
        {mappe.filter(m => !m.genitore).map(radice => {
          const figli = mappe.filter(m => m.genitore === radice.chiave);
          const nome = nomePresentazioneMappa(radice);
          return <li key={radice.chiave} className="card min-w-0 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={urlMappa(radice.chiave)} className="font-display text-[20px] no-underline text-text break-words">{nome}</Link>
              <span className="chip text-[11px]">{NOME_TIPO_MAPPA[radice.tipo]}</span>
              <span className="text-[12px] text-text-muted">{radice.numeroSpilli} spilli · {figli.length} mappe</span>
            </div>
            {figli.length > 0 && <details>
              <summary className="touch cursor-pointer py-2 text-[13px] text-text-muted" aria-label={`Mostra le mappe di ${nome}`}>Luoghi e planimetrie ({figli.length})</summary>
              <AlberoLuoghi mappe={mappe} genitore={radice.chiave} espandibile />
            </details>}
          </li>;
        })}
      </ul>
    </PageState>
  </div>;
}

/** Visore a schermo intero con lo stato della partita attiva. */
function DettaglioMappa({ chiave, partitaId }: { chiave: string; partitaId: number | null }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const spilloIniziale = Number(params.get('spillo')) || null; const puntoIniziale = useMemo(() => centroAccessoMondo(params), [params]);
  const { mappa, caricamento, errore, ricarica, raccolto, statoPunto, acquisto } = useMappaPartita(chiave, partitaId);
  const albero = useCarica(getAlberoMappe, [chiave]);
  const presentata = mappa ? presentaMappa(mappa, params.get('contesto')) : null;
  useDocumentTitle(presentata ? `${presentata.nome} — Mappe` : 'Mappa');
  return (
    <PageState isLoading={caricamento && !mappa} error={errore} onRetry={ricarica}>
      {mappa && <div className="flex flex-col gap-4">

        {!haPlanimetria(mappa) ? <section className="card flex flex-col gap-3">
          <nav aria-label="Percorso del luogo">{mappa.percorso.map((p, i) => <span key={p.chiave}>{i > 0 && ' › '}<Link to={`/guida/mappe/${encodeURIComponent(p.chiave)}`}>{p.nome}</Link></span>)}</nav>
          <h1 className="m-0 titolo-display">{presentata!.nome}</h1>
          <h2 className="m-0 text-lg">Luoghi e planimetrie</h2>
          <PageState isLoading={albero.caricamento} error={albero.errore} onRetry={albero.ricarica}><AlberoLuoghi mappe={albero.dati ?? []} genitore={mappa.chiave} /></PageState>
          {mappa.entita && <Link to={schedaAccessoMondo(mappa.entita.tipo, mappa.entita.chiave)}>Scheda del luogo</Link>}
          <Link to={`/guida/mappe/${encodeURIComponent(mappa.chiave)}/modifica`}>Modifica luogo</Link>
        </section> : <><VisoreMappa
          key={`${mappa.chiave}-${spilloIniziale ?? ''}-${params.get('x') ?? ''}-${params.get('y') ?? ''}-${params.get('zoom') ?? ''}`}
          contenutiPannello={<><SelettoreContestoMappa mappa={mappa} selezione={params.get('contesto')} onCambia={id => { const q = new URLSearchParams(params); if (id) q.set('contesto', id); else q.delete('contesto'); setParams(q, { replace: true }); }} />{mappa.gruppoImmagini ? <ImmaginiLuogo mappe={(albero.dati ?? [mappa]).filter(m => m.gruppoImmagini?.id === mappa.gruppoImmagini!.id)} attuale={mappa.chiave} /> : <nav aria-label="Planimetrie del luogo"><label>Planimetrie <select className="form-input" value={mappa.chiave} onChange={e => navigate(urlMappa(e.target.value))}>
          {(albero.dati ?? [mappa]).filter(m => m.chiave === mappa.chiave || (m.genitore === mappa.genitore && !!(m.immagineUrl || m.assetOriginale))).map(m => <option key={m.chiave} value={m.chiave}>{nomePresentazioneMappa(m)}</option>)}
        </select></label></nav>}<ContenutiGuidaMappa mappa={mappa.chiave} area={params.get('area')} dungeon={mappa.entita?.tipo === 'dungeon' ? mappa.entita.chiave : undefined} /></>}
          mappa={presentata!}
          partitaId={partitaId}
          selezioneIniziale={spilloIniziale} puntoIniziale={puntoIniziale}
          onNaviga={(k, arrivo) => navigate(urlMappa(k, arrivo))}
          onRaccolto={raccolto}
          onStatoPunto={statoPunto}
          onAcquisto={acquisto}
          onChiudi={() => navigate('/guida/mappe')}
          azioni={<>{mappa.entita && <Link className="btn btn-secondary touch" to={schedaAccessoMondo(mappa.entita.tipo, mappa.entita.chiave)}>Scheda del luogo</Link>}<CollegamentoVisivo to={`/guida/mappe/${encodeURIComponent(mappa.chiave)}/modifica`} tono="secondario" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica mappa" /></>}
        /></>}
        {!haPlanimetria(mappa) && <ContenutiGuidaMappa mappa={mappa.chiave} area={params.get('area')} dungeon={mappa.entita?.tipo === 'dungeon' ? mappa.entita.chiave : undefined} />}
      </div>}
    </PageState>
  );
}
