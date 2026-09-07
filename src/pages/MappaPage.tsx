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
import type { MappaRiassuntoDto } from '../types';
import { centroAccessoMondo, schedaAccessoMondo } from '../utils/accessoMondo';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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

/** Tokyo non ha un visore proprio: la sua mappa è quella disegnata nella Città.
 *
 * Il nodo `tokyo` dell'atlante resta — è il genitore dei quartieri, e senza di lui l'albero non
 * sta in piedi — ma la sua *planimetria* non è più una destinazione: chi ci arrivava vedeva una
 * seconda Tokyo, diversa da quella che aveva appena guardato. Il reindirizzamento è qui e non
 * solo sui collegamenti perché i modi di arrivarci sono tanti (le briciole del visore, «Torna a
 * Tokyo», un indirizzo salvato) e vanno tutti a finire nello stesso posto. */
const TOKYO = 'tokyo';
const CITTA = '/guida/citta';

export function MappaPage() {
  const { chiave } = useParams<{ chiave: string }>();
  const attiva = usePartitaStore((s) => s.attiva);
  if (!chiave) return <IndiceMappe />;
  if (chiave === TOKYO) return <Navigate to={CITTA} replace />;
  return <RisolviMappa chiave={chiave}>{k => k === TOKYO ? <Navigate to={CITTA} replace /> : <DettaglioMappa chiave={k} partitaId={attiva?.id ?? null} />}</RisolviMappa>;
}

/** Le radici che sono versioni dello stesso luogo formano una scheda sola, come nell'albero. */
function radiciRaggruppate(mappe: MappaRiassuntoDto[]): Array<{ chiave: string; capofila: MappaRiassuntoDto; versioni: MappaRiassuntoDto[] }> {
  const gruppi: Array<{ chiave: string; capofila: MappaRiassuntoDto; versioni: MappaRiassuntoDto[] }> = [];
  const indice = new Map<string, number>();
  for (const m of mappe.filter(x => !x.genitore)) {
    const id = m.gruppoImmagini ? `esplicito:${m.gruppoImmagini.id}` : m.immagineCollezione ? `presentazione:${m.immagineCollezione.ambito}` : null;
    const posto = id !== null ? indice.get(id) : undefined;
    if (id !== null && posto !== undefined) { gruppi[posto].versioni.push(m); continue; }
    if (id !== null) indice.set(id, gruppi.length);
    gruppi.push({ chiave: id ?? m.chiave, capofila: m, versioni: [m] });
  }
  return gruppi;
}

/** Indice: radici (Tokyo, Palazzi) con le mappe figlie. */
function IndiceMappe() {
  useDocumentTitle('Mappe');
  const albero = useCarica(() => getAlberoMappe(), []);
  const mappe = useMemo(() => albero.dati ?? [], [albero.dati]);
  // discendenti e spilli dell'intero sottoalbero: la scheda dice quanto contiene davvero, non solo il primo livello
  const totali = useMemo(() => {
    const figliDi = new Map<string | null, MappaRiassuntoDto[]>();
    for (const m of mappe) figliDi.set(m.genitore, [...(figliDi.get(m.genitore) ?? []), m]);
    const cache = new Map<string, { mappe: number; spilli: number }>();
    const conta = (chiave: string, visti: Set<string>): { mappe: number; spilli: number } => {
      const salvato = cache.get(chiave);
      if (salvato) return salvato;
      if (visti.has(chiave)) return { mappe: 0, spilli: 0 };
      visti.add(chiave);
      const esito = (figliDi.get(chiave) ?? []).reduce((acc, f) => {
        const sotto = conta(f.chiave, visti);
        return { mappe: acc.mappe + 1 + sotto.mappe, spilli: acc.spilli + f.numeroSpilli + sotto.spilli };
      }, { mappe: 0, spilli: 0 });
      cache.set(chiave, esito);
      return esito;
    };
    return { conta: (chiave: string) => conta(chiave, new Set()), figliDi };
  }, [mappe]);
  const gruppi = useMemo(() => radiciRaggruppate(mappe), [mappe]);
  return <div className="flex flex-col gap-4">
    <IntestazionePagina titolo="Mappe" sottotitolo="Luoghi e planimetrie di Tokyo e dei Palazzi." />
    <PageState isLoading={albero.caricamento} error={albero.errore} onRetry={albero.ricarica}>
      <ul className="m-0 p-0 list-none grid gap-3 grid-cols-1 lg:grid-cols-2 items-start" aria-label="Mappe">
        {gruppi.map(({ chiave, capofila, versioni }) => {
          const sotto = versioni.reduce((acc, v) => {
            const c = totali.conta(v.chiave);
            return { mappe: acc.mappe + c.mappe, spilli: acc.spilli + c.spilli + v.numeroSpilli };
          }, { mappe: 0, spilli: 0 });
          const nome = capofila.gruppoImmagini?.nome ?? nomePresentazioneMappa(capofila);
          const conFigli = versioni.some(v => (totali.figliDi.get(v.chiave) ?? []).length > 0);
          return <li key={chiave} className="card min-w-0 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* La voce Tokyo porta alla mappa canonica, non al visore: il reindirizzamento
                  esiste comunque, ma un collegamento che rimbalza si vede, e non c'è ragione di
                  farglielo fare. */}
              <Link to={capofila.chiave === TOKYO ? CITTA : urlMappa(capofila.chiave)} className="font-display text-[20px] no-underline text-text break-words">{nome}</Link>
              <span className="chip text-[11px]">{NOME_TIPO_MAPPA[capofila.tipo]}</span>
              <span className="text-[12px] text-text-muted">
                {sotto.spilli} spilli · {sotto.mappe > 0 ? `${sotto.mappe} mappe` : versioni.length > 1 ? `${versioni.length} versioni` : 'una planimetria'}
              </span>
            </div>
            {versioni.length > 1 && <ImmaginiLuogo mappe={versioni} nome={nome} />}
            {conFigli && <details>
              <summary className="touch cursor-pointer py-2 text-[13px] text-text-muted" aria-label={`Mostra le mappe di ${nome}`}>Luoghi e planimetrie ({sotto.mappe})</summary>
              {versioni.map(v => <AlberoLuoghi key={v.chiave} mappe={mappe} genitore={v.chiave} espandibile />)}
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
