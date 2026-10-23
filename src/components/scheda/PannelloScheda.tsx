// ============================================================
// PannelloScheda — la scheda di un oggetto citato dal diario, in un pannello sopra il diario (R10-27)
// ============================================================
//
// Decisione dell'utente del 2026-10-23 («Pannello sopra il diario»): toccando un oggetto citato da una voce (Confidente, luogo, Palazzo,
// libro, film, attività, negozio, Richiesta…) la sua scheda si apre sopra il diario, senza lasciare la pagina; chiudendo il pannello si
// torna alla stessa posizione di scorrimento. Lo usano la Home e la Guida › Giorno per giorno; Partita › Oggi non lo attiva e i suoi
// cartellini navigano come sempre (con il ritorno alla voce, `ritornoDiario`).
//
// Come funziona:
// - la pagina sotto non cambia e non si rimonta: il pannello è un livello sopra, quindi la posizione di scorrimento del diario resta quella;
// - la scheda aperta sta nell'indirizzo, nel parametro `?pannello=<indirizzo>` (non `?scheda=`, che è della Partita): aprire aggiunge una
//   voce alla cronologia, il tasto Indietro del browser chiude il pannello (o torna alla scheda di prima), un ricaricamento lo riapre;
// - la scheda è la pagina dell'oggetto così com'è (stesso codice del menù), che dentro il pannello legge la scheda al posto dell'indirizzo
//   vero (`routerScheda`): ogni suo spostamento (un'altra infiltrazione, un altro oggetto) resta nel pannello;
// - sul telefono è un foglio dal basso, da 1024 px un pannello a destra; l'area interna scorre da sola, il diario sotto sta fermo;
// - non è una superficie di approvazione: mostra la scheda, con ciò che la scheda già dice dello stato della partita.
// ============================================================

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, type KeyboardEvent as TastoReact, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { resolvePath, useLocation, useNavigate, type NavigateOptions, type To } from 'react-router-dom';
import { Spinner } from '../shared/PageState';
import { ErroreInRiquadro } from '../shared/ErrorePagina';
import { pigra } from '../../utils/pagineLazy';
import { IconChevronLeft, IconClose } from '../shared/icons';
import { ApriPannelloContext, SchedaCorrenteContext, type ApriPannello, type SchedaCorrente } from './contestoScheda';
import { conSchedaNelPannello, profonditaDaStato, schedaDaParametri, statoConProfondita, trovaScheda, type SchedaTrovata } from '../../utils/pannelloScheda';

/** Le pagine che mostrano un elemento di un elenco (libri, film, attività, Richieste) ricevono la chiave dell'elemento. */
interface PropsElemento { soloChiave?: string }

const ConfidenteDettaglioPage = pigra(() => import('../../pages/ConfidenteDettaglioPage'), 'ConfidenteDettaglioPage');
const DungeonDettaglioPage = pigra(() => import('../../pages/DungeonDettaglioPage'), 'DungeonDettaglioPage');
const NegozioPage = pigra(() => import('../../pages/NegozioPage'), 'NegozioPage');
const LuogoPage = pigra(() => import('../../pages/LuogoPage'), 'LuogoPage');
const OggettoPage = pigra(() => import('../../pages/OggettoPage'), 'OggettoPage');
const LibriPage = pigra<typeof import('../../pages/LibriPage'), PropsElemento>(() => import('../../pages/LibriPage'), 'LibriPage');
const FilmPage = pigra<typeof import('../../pages/FilmPage'), PropsElemento>(() => import('../../pages/FilmPage'), 'FilmPage');
const AttivitaPage = pigra<typeof import('../../pages/AttivitaPage'), PropsElemento>(() => import('../../pages/AttivitaPage'), 'AttivitaPage');
const RichiestePage = pigra<typeof import('../../pages/RichiestePage'), PropsElemento>(() => import('../../pages/RichiestePage'), 'RichiestePage');

/** La pagina che corrisponde alla scheda: le stesse del menù; per gli elenchi, filtrate sull'elemento. */
function ContenutoScheda({ scheda }: { scheda: SchedaTrovata }) {
  const solo = scheda.elemento ?? undefined;
  switch (scheda.tipo) {
    case 'confidente': return <ConfidenteDettaglioPage.Componente />;
    case 'dungeon': return <DungeonDettaglioPage.Componente />;
    case 'negozio': return <NegozioPage.Componente />;
    case 'luogo': return <LuogoPage.Componente />;
    case 'oggetto': return <OggettoPage.Componente />;
    case 'libro': return <LibriPage.Componente soloChiave={solo} />;
    case 'film': return <FilmPage.Componente soloChiave={solo} />;
    case 'attivita': return <AttivitaPage.Componente soloChiave={solo} />;
    case 'richiesta': return <RichiestePage.Componente soloChiave={solo} />;
  }
}

/** Gli elementi che ricevono il fuoco con Tab. */
const ATTIVABILI = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** L'indirizzo (percorso, parametri, ancora) a cui porta una destinazione del router, risolta rispetto alla scheda mostrata. */
function indirizzoDi(a: To, daPercorso: string): string {
  const p = resolvePath(a, daPercorso);
  return `${p.pathname}${p.search}${p.hash}`;
}

interface PropsPannello { scheda: SchedaTrovata; profondita: number; onChiudi: () => void }

/** Il livello sopra il diario: foglio dal basso o pannello a destra, con la testa (indietro, tipo di scheda, chiudi) e l'area che scorre. */
function Pannello({ scheda, profondita, onChiudi }: PropsPannello) {
  const posizione = useLocation();
  const navigate = useNavigate();
  const foglio = useRef<HTMLDivElement | null>(null);
  const corpo = useRef<HTMLDivElement | null>(null);
  const premutoSuSfondo = useRef(false);
  // la chiusura è letta da un ref: gli effetti non si rifanno a ogni render del diario
  const chiudi = useRef(onChiudi);
  useEffect(() => { chiudi.current = onChiudi; });

  // `naviga` deve restare la stessa funzione fra uno spostamento e l'altro (le pagine la usano nelle dipendenze dei loro effetti, come
  // `navigate` di react-router, che è stabile): legge la posizione di adesso da un ref aggiornato prima degli effetti delle pagine
  const adesso = useRef({ posizione, profondita, percorsoScheda: scheda.pathname });
  useLayoutEffect(() => { adesso.current = { posizione, profondita, percorsoScheda: scheda.pathname }; });

  /** Si sposta fra le schede del pannello: se la meta è una scheda resta nel pannello (una voce di cronologia in più, o la stessa
   *  sostituita), altrimenti è una pagina vera e il pannello si lascia con la pagina sotto. */
  const naviga = useCallback((a: To | number, opzioni?: NavigateOptions) => {
    if (typeof a === 'number') { void navigate(a); return; }
    const { posizione: vera, profondita: n, percorsoScheda } = adesso.current;
    const verso = indirizzoDi(a, percorsoScheda);
    const trovata = trovaScheda(verso);
    if (!trovata) { void navigate(verso, opzioni); return; }
    const sostituisce = opzioni?.replace === true;
    void navigate(
      { pathname: vera.pathname, search: conSchedaNelPannello(vera.search, trovata.indirizzo), hash: vera.hash },
      { replace: sostituisce, state: statoConProfondita(vera.state, n + (sostituisce ? 0 : 1)) },
    );
  }, [navigate]);

  const corrente = useMemo<SchedaCorrente>(() => ({
    posizione: { pathname: scheda.pathname, search: scheda.search, hash: scheda.hash, state: null, key: scheda.indirizzo },
    params: scheda.params,
    naviga,
  }), [scheda, naviga]);

  // Esc chiude (a meno che una finestra aperta dalla scheda non la stia già chiudendo con lo stesso tasto)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('.modal-overlay')) return;
      chiudi.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // un'altra scheda (un altro percorso) riparte dall'alto; un cambio di soli parametri (un'altra infiltrazione, un'altra planimetria) no
  useEffect(() => { corpo.current?.scrollTo?.({ top: 0 }); }, [scheda.pathname]);

  // il fuoco entra nel pannello all'apertura (sul pannello, non su un campo: su tablet e telefono non si apre la tastiera)
  useEffect(() => {
    const el = foglio.current;
    if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true });
  }, []);

  /** Tab e Maiusc+Tab restano dentro il pannello. */
  const tieniIlFuoco = (e: TastoReact<HTMLDivElement>) => {
    const el = foglio.current;
    if (e.key !== 'Tab' || !el) return;
    const elenco = [...el.querySelectorAll<HTMLElement>(ATTIVABILI)].filter((x) => !x.closest('[hidden], [inert]'));
    if (elenco.length === 0) { e.preventDefault(); return; }
    const primo = elenco[0];
    const ultimo = elenco[elenco.length - 1];
    const attivo = document.activeElement;
    if (e.shiftKey && (attivo === primo || attivo === el)) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && attivo === ultimo) { e.preventDefault(); primo.focus(); }
  };

  /** I collegamenti dentro la scheda che portano a un'altra scheda restano nel pannello; quelli verso una pagina vera funzionano come sempre
   *  (e lasciano il diario: «indietro» riporta qui, con il pannello com'era). Le ancore della stessa scheda scorrono nell'area del pannello. */
  const intercetta = (e: MouseEvent<HTMLElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || !e.currentTarget.contains(a) || a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href') ?? '';
    if (href.startsWith('#')) {
      e.preventDefault(); e.stopPropagation();
      let id = href.slice(1);
      try { id = decodeURIComponent(id); } catch { /* resta com'è */ }
      corpo.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`)?.scrollIntoView({ block: 'start' });
      return;
    }
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    const verso = `${url.pathname}${url.search}${url.hash}`;
    if (!trovaScheda(verso)) return;
    e.preventDefault(); e.stopPropagation();
    naviga(verso);
  };

  return createPortal(
    // lo sfondo chiude solo se il gesto comincia e finisce lì: una selezione di testo rilasciata fuori dal pannello non lo chiude
    <div className="pannello-scheda" role="presentation"
      onMouseDown={(e) => { premutoSuSfondo.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (premutoSuSfondo.current && e.target === e.currentTarget) onChiudi(); premutoSuSfondo.current = false; }}>
      <div ref={foglio} className="pannello-scheda__foglio" role="dialog" aria-modal="true" aria-label={`Scheda: ${scheda.etichetta}`} tabIndex={-1} onKeyDown={tieniIlFuoco}>
        <div className="pannello-scheda__testa">
          {profondita > 1 && (
            <button type="button" className="btn btn-ghost btn-sm touch shrink-0" onClick={() => void navigate(-1)} aria-label="Torna alla scheda di prima">
              <IconChevronLeft size={18} /> Indietro
            </button>
          )}
          <span className="pannello-scheda__etichetta">{scheda.etichetta}</span>
          <button type="button" className="touch flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-text-muted hover:text-text" onClick={onChiudi} aria-label="Chiudi la scheda e torna al diario">
            <IconClose size={20} />
          </button>
        </div>
        <div ref={corpo} className="pannello-scheda__corpo" onClickCapture={intercetta}>
          <SchedaCorrenteContext.Provider value={corrente}>
            {/* UI-ASSET-01: se il file di una pagina non c'è più (rilascio durante l'uso) l'errore resta NEL pannello: il diario sotto, con le
                sue bozze, non si tocca. La `key` riparte con la scheda: passando a un'altra scheda l'errore di prima non resta addosso. */}
            <ErroreInRiquadro key={`${scheda.modello}|${scheda.elemento ?? ''}`}>
              <Suspense fallback={<div className="flex justify-center py-10"><Spinner size={36} /></div>}>
                {/* come nel router: la stessa route con parametri diversi è la stessa pagina (non si rimonta, lo spostamento fra infiltrazioni o
                    planimetrie non ricarica tutto); un'altra route, o un altro elemento di un elenco, è un'altra pagina */}
                <ContenutoScheda key={`${scheda.modello}|${scheda.elemento ?? ''}`} scheda={scheda} />
              </Suspense>
            </ErroreInRiquadro>
          </SchedaCorrenteContext.Provider>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Dà ai cartellini del diario la possibilità di aprire la scheda di un oggetto in un pannello, e mostra il pannello quando l'indirizzo lo
 *  chiede. Va messo attorno al diario (la guida del giorno); fuori, i cartellini navigano come sempre. */
export function ProviderPannelloScheda({ children }: { children: ReactNode }) {
  const posizione = useLocation();
  const navigate = useNavigate();
  const scheda = useMemo(() => schedaDaParametri(posizione.search), [posizione.search]);
  const profondita = profonditaDaStato(posizione.state);
  const chiamante = useRef<HTMLElement | null>(null);

  /** Apre la scheda aggiungendo una voce alla cronologia; il diario sotto (pagina, scorrimento, ancora) non cambia. */
  const apri = useCallback<ApriPannello>((indirizzo, daElemento) => {
    const trovata = trovaScheda(indirizzo);
    if (!trovata) return;
    chiamante.current = daElemento ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    void navigate(
      { pathname: posizione.pathname, search: conSchedaNelPannello(posizione.search, trovata.indirizzo), hash: posizione.hash },
      { state: statoConProfondita(posizione.state, profondita + 1) },
    );
  }, [navigate, posizione.pathname, posizione.search, posizione.hash, posizione.state, profondita]);

  /** Chiude il pannello: indietro di tutte le voci che ha aggiunto (si torna alla voce di cronologia del diario com'era); se il pannello
   *  era già nell'indirizzo all'arrivo (nessuna voce aggiunta), toglie il parametro. */
  const chiudi = useCallback(() => {
    if (profondita > 0) { void navigate(-profondita); return; }
    void navigate(
      { pathname: posizione.pathname, search: conSchedaNelPannello(posizione.search, null), hash: posizione.hash },
      { replace: true, state: statoConProfondita(posizione.state, 0) },
    );
  }, [navigate, posizione.pathname, posizione.search, posizione.hash, posizione.state, profondita]);

  // chiuso il pannello, il fuoco torna al cartellino che l'aveva aperto (senza far scorrere il diario)
  const aperto = scheda !== null;
  const eraAperto = useRef(false);
  useEffect(() => {
    if (eraAperto.current && !aperto) {
      const el = chiamante.current;
      chiamante.current = null;
      if (el?.isConnected) el.focus({ preventScroll: true });
    }
    eraAperto.current = aperto;
  }, [aperto]);

  return (
    <ApriPannelloContext.Provider value={apri}>
      {children}
      {scheda && <Pannello scheda={scheda} profondita={profondita} onChiudi={chiudi} />}
    </ApriPannelloContext.Provider>
  );
}
