// ============================================================
// MainLayout — shell dell'app, tablet-first; carica glossario e partite
// ============================================================
//
// ≥ lg (1024px, tablet orizzontale / desktop): Topbar + Sidebar + Outlet.
// <  lg (tablet verticale / telefono): Topbar + Outlet + barra di
//    navigazione in basso con bersagli touch da 56px.
//
// Lotto C (punto 10): il primo elemento della pagina è «Vai al contenuto» (visibile solo quando ha il fuoco), che porta a
// `<main id="contenuto" tabIndex={-1}>`; dopo ogni cambio di pagina il fuoco va sull'h1 della pagina nuova (`useFuocoNavigazione`) e,
// quando non lo si sposta, il cambio si annuncia nella regione `status` qui sotto.
// ============================================================

import { Suspense, useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { annotaNavigazione } from '../../utils/ritornoMappe';
import { Outlet, useLocation } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { AvvisoNuovaVersione } from './AvvisoNuovaVersione';
import { AvvisoPartiteNonCaricate } from './AvvisoPartiteNonCaricate';
import { ToastContainer } from '../shared/Toast';
import { HostConferma } from '../shared/DialogoConferma';
import { Spinner } from '../shared/PageState';
import { MeteoAlCambioGiorno } from '../partita/MeteoAlCambioGiorno';
import { useGlossarioStore } from '../../stores/glossarioStore';
import { usePartitaStore } from '../../stores/partitaStore';
import { useAsset, useAssetStore } from '../../stores/assetStore';
import { useFontStore } from '../../stores/fontStore';
import { sfondoPerPercorso } from './sfondi';
import { urlMiniatura } from '../../../shared/miniature';
import { RicercaGlobale } from '../ricerca/RicercaGlobale';
import { useScorciatoiaRicerca } from '../../hooks/useScorciatoiaRicerca';
import { useFuocoNavigazione } from './useFuocoNavigazione';

/** Struttura principale con navigazione adattiva, contenuto route e overlay globali. */
export function MainLayout() {
  const caricaGlossario = useGlossarioStore((s) => s.carica);
  const caricaPartite = usePartitaStore((s) => s.carica);
  const caricaAsset = useAssetStore((s) => s.carica);
  const caricaFont = useFontStore((s) => s.carica);
  useEffect(() => {
    void caricaGlossario();
    void caricaPartite();
    void caricaAsset();
    void caricaFont();
  }, [caricaGlossario, caricaPartite, caricaAsset, caricaFont]);

  // il tasto «/» apre la ricerca globale da ogni pagina (non mentre si scrive in un campo)
  useScorciatoiaRicerca();

  // Sfondo ripetibile, sfondo a tema della sezione (con variante Allarme in Fusione) e icona del sito dagli asset predefiniti (se presenti).
  const sfondo = useAsset('sfondi/pattern-nero');
  const location = useLocation();
  const allarmeAttivo = usePartitaStore((s) => !!s.attiva?.allarmeAttivo);
  const haAttiva = usePartitaStore((s) => s.attiva !== null);
  const sfondoSezioneIntero = useAsset(sfondoPerPercorso(location.pathname, allarmeAttivo));
  // R12-03: lo sfondo della sezione sta sotto un gradiente scuro al 70-93%, quindi non serve a piena risoluzione: la miniatura da 1024 px
  // del server (quella delle altre viste) se è un'immagine del database, invariato se è un asset statico
  const sfondoSezione = sfondoSezioneIntero ? urlMiniatura(sfondoSezioneIntero, 1024) : null;
  const icona = useAsset('identita/icona-32');
  // Da quale pagina si entra nelle mappe: «Chiudi» di visore ed editor ci riporta lì (`utils/ritornoMappe`).
  const paginaPrecedente = useRef<string | null>(null);
  useEffect(() => {
    const qui = location.pathname + location.search;
    if (paginaPrecedente.current === qui) return;
    annotaNavigazione(paginaPrecedente.current, location.pathname);
    paginaPrecedente.current = qui;
  }, [location.pathname, location.search]);
  // il fuoco dopo un cambio di pagina, e l'annuncio quando non si sposta (svuotata e riscritta: lo stesso titolo si riannuncia)
  const main = useRef<HTMLElement | null>(null);
  const [annuncio, setAnnuncio] = useState('');
  const attesaAnnuncio = useRef<number | undefined>(undefined);
  const annuncia = useCallback((testo: string) => {
    setAnnuncio('');
    window.clearTimeout(attesaAnnuncio.current);
    attesaAnnuncio.current = window.setTimeout(() => setAnnuncio(testo), 50);
  }, []);
  useEffect(() => () => window.clearTimeout(attesaAnnuncio.current), []);
  useFuocoNavigazione(main, annuncia);
  /** «Vai al contenuto»: il fuoco su <main> senza toccare l'indirizzo (un `#contenuto` nell'URL sarebbe un cambio di posizione). */
  const vaiAlContenuto = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    main.current?.focus();
  };
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    const originale = { href: link.href, type: link.type };
    if (icona) {
      link.href = icona;
      link.type = icona.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    }
    return () => {
      link.href = originale.href;
      link.type = originale.type;
    };
  }, [icona]);

  return (
    <div className="relative isolate flex flex-col h-dvh" style={sfondo ? { backgroundImage: `url("${sfondo}")`, backgroundRepeat: 'repeat', backgroundSize: '512px' } : undefined}>
      <a href="#contenuto" className="salta-al-contenuto" onClick={vaiAlContenuto}>Vai al contenuto</a>
      {sfondoSezione && <div key={sfondoSezione} className="sfondo-sezione" style={{ backgroundImage: `url("${sfondoSezione}")` }} aria-hidden="true" data-testid="sfondo-sezione" />}
      <Topbar />
      {/* UI-ASSET-01: una sola riga, solo quando sul server c'è un'app più nuova (mai un ricaricamento da sola) */}
      <AvvisoNuovaVersione />
      {/* R12-01/4: l'elenco delle partite non caricato si dichiara con «Riprova». La Home (percorso «/home», «/» la rimanda lì) senza
          partita attiva ha già la sua schermata d'errore a tutta pagina; con una partita attiva mostra i dati vecchi, quindi la striscia serve anche lì */}
      {(!['/', '/home'].includes(location.pathname) || haAttiva) && <AvvisoPartiteNonCaricate />}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-5 pb-24 lg:pb-5 flex flex-col" ref={main} id="contenuto" tabIndex={-1}>
          {/* le pagine arrivano alla prima visita (router.tsx): intanto la cornice resta e al centro gira l'attesa */}
          <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size={40} /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNav />
      {/* il cambio di pagina, quando il fuoco resta dov'è (vedi useFuocoNavigazione) */}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{annuncio}</p>
      {/* cambiato il giorno della partita, il meteo del giorno nuovo */}
      <MeteoAlCambioGiorno />
      <ToastContainer />
      {/* le domande «sei sicuro?» di `conferma()` (stores/confermaStore), al posto di window.confirm */}
      <HostConferma />
      {/* L11 B4: la ricerca globale, aperta dal pulsante della Topbar o dal tasto «/» */}
      <RicercaGlobale />
    </div>
  );
}
