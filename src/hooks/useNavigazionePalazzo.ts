// ============================================================
// useNavigazionePalazzo — gli indirizzi della scheda di un Palazzo (o dei Memento): infiltrazione, area, versione e passaggi del visore
// ============================================================
//
// L3 (§4.1–§4.2): l'area ha il suo indirizzo (`/area/<slug>`), l'infiltrazione e la versione vanno nei parametri (`?infiltrazione=`,
// `?planimetria=`); i Memento aprono il dedalo con `?area=`. R10-28: muovendosi nella scheda il ritorno al diario (`&da=&voce=`) resta
// nell'indirizzo, così «Esci» non sparisce. AP3-2/AP3-4: una planimetria del Palazzo si apre nella scheda, non nella sua pagina.
// ============================================================

import type { useNavigate, useSearchParams } from '../components/scheda/routerScheda';
import { risolviMappa } from '../services/api';
import { urlCasa, urlMappa, type NavigaMappa, type PuntoArrivo } from '../utils/navigazioneMappa';
import type { leggiRitornoDiario } from '../utils/ritornoDiario';
import type { AreaDungeonDto, AreaRiassuntoDto, DungeonDettaglioDto } from '../types';

interface Ingressi {
  chiave: string;
  d: DungeonDettaglioDto | null | undefined;
  ritorno: ReturnType<typeof leggiRitornoDiario>;
  params: URLSearchParams;
  setParams: ReturnType<typeof useSearchParams>[1];
  navigate: ReturnType<typeof useNavigate>;
  areePalazzo: readonly AreaRiassuntoDto[];
  /** L'infiltrazione aperta (nei Memento il dedalo). */
  area: AreaDungeonDto | null;
  areaFisica: AreaRiassuntoDto | null;
  planimetriaScelta: string | null;
}

/** I gesti di navigazione della scheda del Palazzo, ricavati dallo stato dell'indirizzo. */
export function useNavigazionePalazzo({ chiave, d, ritorno, params, setParams, navigate, areePalazzo, area, areaFisica, planimetriaScelta }: Ingressi) {
  /** Memento: apre un dedalo mettendolo nell'indirizzo (che perde gli altri parametri). */
  const scegliArea = (k: string) => { setParams(ritorno ? { area: k, da: ritorno.da, voce: ritorno.voce } : { area: k }); };
  // ---- Palazzi (L3, §4.1–§4.2): l'area ha il suo indirizzo, l'infiltrazione va nei parametri ----
  const base = `/guida/dungeon/${encodeURIComponent(chiave)}`;
  /** R10-28: muovendosi nella scheda (infiltrazione, area, planimetria) il ritorno al diario resta nell'indirizzo, così «Esci» non sparisce. */
  const tieniRitorno = (q: URLSearchParams) => { if (ritorno) { q.set('da', ritorno.da); q.set('voce', ritorno.voce); } return q; };
  /** Apre l'area `s`, con l'infiltrazione e la versione date (se ci sono). */
  const apriArea = (s: string, infiltrazione?: string | null, planimetria?: string | null) => {
    const q = tieniRitorno(new URLSearchParams());
    if (infiltrazione) q.set('infiltrazione', infiltrazione);
    if (planimetria) q.set('planimetria', planimetria);
    const testo = q.toString();
    navigate(`${base}/area/${encodeURIComponent(s)}${testo ? `?${testo}` : ''}`);
  };
  /** Un'area scelta dall'elenco: l'infiltrazione aperta resta se la tocca, altrimenti si apre la prima che la tocca. */
  const scegliAreaFisica = (s: string) => {
    const a = areePalazzo.find((x) => x.slug === s);
    apriArea(s, area && a?.infiltrazioni?.some((x) => x.chiave === area.chiave) ? area.chiave : null);
  };
  /** Un'infiltrazione scelta (selettore, aree senza infiltrazione): si apre sulla sua prima area. */
  const scegliInfiltrazione = (k: string) => navigate(`${base}?${tieniRitorno(new URLSearchParams({ infiltrazione: k })).toString()}`);
  /** Un'infiltrazione scelta dentro l'area aperta («Infiltrazioni in quest'area»): l'area e la versione restano. */
  const scegliInfiltrazioneQui = (k: string) => (areaFisica ? apriArea(areaFisica.slug, k, planimetriaScelta) : scegliInfiltrazione(k));
  /** Un'altra versione dell'area: cambia solo `?planimetria=` (sostituendo la voce della cronologia), come nella pagina dell'Area (L2). */
  const scegliVersione = (p: string) => {
    const q = new URLSearchParams(params);
    q.set('planimetria', p);
    for (const k of ['spillo', 'x', 'y', 'zoom']) q.delete(k);
    setParams(q, { replace: true });
  };
  /** AP3-2, AP3-4: l'indirizzo nella scheda della planimetria `mappa`, se è di un'area di questo Palazzo (altrimenti null), con
   *  l'arrivo dato. L'infiltrazione aperta resta se tocca l'area d'arrivo, come scegliendo l'area dall'elenco; `?planimetria=` c'è
   *  sempre, perché con `?infiltrazione=` la versione iniziale dell'infiltrazione passerebbe davanti a quella chiesta. */
  const indirizzoPlanimetriaQui = (mappa: string, arrivo?: PuntoArrivo): string | null => {
    const p = d?.planimetrie.find((x) => x.chiave === mappa);
    const a = p?.area ? areePalazzo.find((x) => x.chiave === p.area) : undefined;
    if (!a) return null;
    const q = tieniRitorno(new URLSearchParams());
    if (area && a.infiltrazioni?.some((x) => x.chiave === area.chiave)) q.set('infiltrazione', area.chiave);
    q.set('planimetria', mappa);
    return urlCasa(`${base}/area/${encodeURIComponent(a.slug)}?${q.toString()}`, arrivo);
  };
  /** Apre nella scheda la planimetria `mappa` se è di un'area di questo Palazzo (vero se l'ha aperta). */
  const apriPlanimetriaQui = (mappa: string, arrivo?: PuntoArrivo): boolean => {
    const indirizzo = indirizzoPlanimetriaQui(mappa, arrivo);
    if (indirizzo) navigate(indirizzo);
    return indirizzo !== null;
  };
  /** AP3-4: il collegamento del nome di una planimetria in «Da raccogliere»: la sua area nella scheda, altrimenti la sua pagina. */
  const indirizzoRaccolta = (mappa: string) => indirizzoPlanimetriaQui(mappa) ?? urlMappa(mappa);
  /** AP3-2: i passaggi (e le briciole) del visore della scheda. Una planimetria del Palazzo si apre qui; una chiave che la scheda non
   *  conosce (interna, alias) si risolve, e se è del Palazzo si apre qui, altrimenti si va alla sua casa. */
  const navigaDalVisore: NavigaMappa = (k, arrivo) => {
    if (apriPlanimetriaQui(k, arrivo)) return;
    risolviMappa(k)
      .then((r) => { if (r.tipo === 'mappa' && apriPlanimetriaQui(r.mappa, arrivo)) return; navigate(r.tipo === 'mappa' ? urlCasa(r.casa, arrivo) : urlMappa(k, arrivo)); })
      .catch(() => navigate(urlMappa(k, arrivo)));
  };
  /** Un'infiltrazione eliminata dalla guida: se era quella aperta, la scheda torna sul Palazzo. */
  const areaEliminata = (k: string) => { if (area?.chiave === k) navigate(base); };
  return { base, tieniRitorno, scegliArea, apriArea, scegliAreaFisica, scegliInfiltrazione, scegliInfiltrazioneQui, scegliVersione, indirizzoRaccolta, navigaDalVisore, areaEliminata };
}
