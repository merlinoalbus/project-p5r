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
import type { MappaDto, MappaRiassuntoDto } from '../types';
import { AnteprimaMappa } from '../components/mappe/AnteprimaMappa';
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
  const totaleMappe = mappe.length;
  const totaleSpilli = useMemo(() => mappe.reduce((s, m) => s + m.numeroSpilli, 0), [mappe]);
  return <div className="flex flex-col gap-4">
    <IntestazionePagina titolo="Mappe"
      sottotitolo={`Tutti i luoghi disegnati della guida: Tokyo, i quartieri e le planimetrie dei Palazzi. ${totaleMappe} mappe con ${totaleSpilli} spilli, raggruppate per il posto a cui appartengono.`} />
    <PageState isLoading={albero.caricamento} error={albero.errore} onRetry={albero.ricarica}>
      {/* L'indice era un elenco di titoli: undici radici e centinaia di planimetrie, tutte scritte
          uguali, e per capire cosa fosse una si doveva aprirla. Una mappa però **si riconosce
          guardandola** — la forma della pianta la distingue in un istante, il nome in tre secondi —
          quindi ogni voce mostra ora la propria anteprima. Le radici sono poche e grosse: una
          griglia di carte, non una lista. */}
      <ul className="m-0 grid list-none grid-cols-1 items-start gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3" aria-label="Mappe">
        {gruppi.map(({ chiave, capofila, versioni }) => {
          const sotto = versioni.reduce((acc, v) => {
            const c = totali.conta(v.chiave);
            return { mappe: acc.mappe + c.mappe, spilli: acc.spilli + c.spilli + v.numeroSpilli };
          }, { mappe: 0, spilli: 0 });
          const nome = capofila.gruppoImmagini?.nome ?? nomePresentazioneMappa(capofila);
          const conFigli = versioni.some(v => (totali.figliDi.get(v.chiave) ?? []).length > 0);
          // La voce Tokyo porta alla mappa canonica, non al visore: il reindirizzamento esiste
          // comunque, ma un collegamento che rimbalza si vede, e non c'è ragione di farglielo fare.
          const destinazione = capofila.chiave === TOKYO ? CITTA : urlMappa(capofila.chiave);
          return <li key={chiave} className="card flex min-w-0 flex-col gap-2.5">
            <Link to={destinazione} className="group flex items-start gap-3 no-underline text-text">
              <AnteprimaMappa mappa={capofila} className="h-[76px] w-[104px]" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-display text-[19px] leading-tight break-words group-hover:text-primary">{nome}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="chip text-[11px]">{NOME_TIPO_MAPPA[capofila.tipo]}</span>
                  <span className="text-[12px] text-text-muted">
                    {sotto.spilli} spilli · {sotto.mappe > 0 ? `${sotto.mappe} mappe` : versioni.length > 1 ? `${versioni.length} versioni` : 'una planimetria'}
                  </span>
                </span>
              </span>
            </Link>
            {/* Versioni e discendenti stanno **dentro la stessa piega**, chiusa. Aperte facevano
                una colonna alta cinque anteprime dentro una griglia a tre colonne: le carte
                diventavano di altezze diverse e l'indice, che serve a scorrere undici radici, si
                allungava per pagine. La piega dice quante ce ne sono, e chi vuole guarda. */}
            {(conFigli || versioni.length > 1) && <details>
              <summary className="touch cursor-pointer py-1 text-[12px] text-text-muted" aria-label={`Mostra le mappe di ${nome}`}>
                Luoghi e planimetrie ({sotto.mappe > 0 ? sotto.mappe : versioni.length})
              </summary>
              <div className="flex flex-col gap-2 pt-1">
                {versioni.length > 1 && <ImmaginiLuogo mappe={versioni} nome={nome} />}
                {conFigli && versioni.map(v => <AlberoLuoghi key={v.chiave} mappe={mappe} genitore={v.chiave} espandibile />)}
              </div>
            </details>}
          </li>;
        })}
      </ul>
    </PageState>
  </div>;
}

/** Un luogo che **contiene** mappe invece di esserne una.
 *
 * È il nodo di raccolta — un Palazzo intero, un quartiere con più piante — e non ha una
 * planimetria propria. La pagina c'era già ma era tre collegamenti nudi in fila: «Scheda del
 * luogo», «Modifica luogo» e un elenco puntato di nomi. Chi ci arrivava cliccando un Palazzo
 * dall'indice trovava una lista di titoli e doveva aprirli uno per uno per capire quale fosse
 * quello che cercava.
 *
 * Ora le mappe contenute sono **una griglia di anteprime**: la forma di una pianta la si riconosce
 * a colpo d'occhio, il nome no. Le azioni sono comandi, non collegamenti in fondo alla pagina. */
function LuogoSenzaPlanimetria({ mappa, nome, albero }: {
  mappa: MappaDto; nome: string; albero: ReturnType<typeof useCarica<MappaRiassuntoDto[]>>;
}) {
  const contenute = useMemo(
    () => (albero.dati ?? []).filter((m) => m.genitore === mappa.chiave).sort((a, b) => a.ordine - b.ordine || a.chiave.localeCompare(b.chiave)),
    [albero.dati, mappa.chiave],
  );
  return <div className="flex flex-col gap-4">
    <header className="card flex flex-col gap-2">
      <nav aria-label="Percorso del luogo" className="flex flex-wrap items-center gap-1 text-[12px] text-text-muted">
        {mappa.percorso.map((p, i) => <span key={p.chiave} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden>›</span>}
          {i === mappa.percorso.length - 1
            ? <span className="text-text">{p.nome}</span>
            : <Link to={urlMappa(p.chiave)} className="text-text-secondary">{p.nome}</Link>}
        </span>)}
      </nav>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h1 className="titolo-display m-0 break-words">{nome}</h1>
        <span className="chip text-[11px]">{NOME_TIPO_MAPPA[mappa.tipo]}</span>
        <span className="text-[12px] text-text-muted">
          {contenute.length === 0 ? 'nessuna planimetria' : contenute.length === 1 ? 'una planimetria' : `${contenute.length} planimetrie`}
          {mappa.numeroSpilli > 0 ? ` · ${mappa.numeroSpilli} spilli` : ''}
        </span>
      </div>
      {/* Va detto, invece di lasciarlo capire dall'assenza: questo nodo raccoglie, non disegna. */}
      <p className="m-0 text-[13px] text-text-secondary">Questo luogo non ha una pianta sua: raccoglie le mappe qui sotto.</p>
      <div className="flex flex-wrap gap-2">
        {mappa.entita && <CollegamentoVisivo to={schedaAccessoMondo(mappa.entita.tipo, mappa.entita.chiave)} tono="secondario" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Scheda del luogo" />}
        <CollegamentoVisivo to={`/guida/mappe/${encodeURIComponent(mappa.chiave)}/modifica`} tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica luogo" />
      </div>
    </header>
    <PageState isLoading={albero.caricamento} error={albero.errore} onRetry={albero.ricarica}>
      {contenute.length > 0
        ? <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 xl:grid-cols-4" aria-label={`Mappe di ${nome}`}>
            {contenute.map((m) => <li key={m.chiave} className="flex">
              <Link to={urlMappa(m.chiave)} className="card card--cliccabile group flex w-full flex-col gap-2 no-underline text-text">
                <AnteprimaMappa mappa={m} className="aspect-[4/3] w-full" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold leading-tight group-hover:text-primary">{nomePresentazioneMappa(m)}</span>
                  <span className="text-[11px] text-text-muted">
                    {m.numeroSpilli > 0 ? `${m.numeroSpilli} spilli` : 'nessuno spillo'}{m.numeroFigli > 0 ? ` · ${m.numeroFigli} dentro` : ''}
                  </span>
                </span>
              </Link>
            </li>)}
          </ul>
        : <p className="m-0 text-[13px] text-text-muted" role="status">Qui non c’è ancora nessuna planimetria. Puoi aggiungerne una dall’editor.</p>}
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

        {!haPlanimetria(mappa) ? <LuogoSenzaPlanimetria mappa={mappa} nome={presentata!.nome} albero={albero} />
         : <><VisoreMappa
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
