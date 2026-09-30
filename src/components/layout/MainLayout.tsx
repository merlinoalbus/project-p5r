// ============================================================
// MainLayout — shell dell'app, tablet-first; carica glossario e partite
// ============================================================
//
// ≥ lg (1024px, tablet orizzontale / desktop): Topbar + Sidebar + Outlet.
// <  lg (tablet verticale / telefono): Topbar + Outlet + barra di
//    navigazione in basso con bersagli touch da 56px.
// ============================================================

import { useEffect, useRef } from 'react';
import { annotaNavigazione } from '../../utils/ritornoMappe';
import { Outlet, useLocation } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { ToastContainer } from '../shared/Toast';
import { MeteoAlCambioGiorno } from '../partita/MeteoAlCambioGiorno';
import { useGlossarioStore } from '../../stores/glossarioStore';
import { usePartitaStore } from '../../stores/partitaStore';
import { useAsset, useAssetStore } from '../../stores/assetStore';
import { useFontStore } from '../../stores/fontStore';
import { sfondoPerPercorso } from './sfondi';

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

  // Sfondo ripetibile, sfondo a tema della sezione (con variante Allarme in Fusione) e icona del sito dagli asset predefiniti (se presenti).
  const sfondo = useAsset('sfondi/pattern-nero');
  const location = useLocation();
  const allarmeAttivo = usePartitaStore((s) => !!s.attiva?.allarmeAttivo);
  const sfondoSezione = useAsset(sfondoPerPercorso(location.pathname, allarmeAttivo));
  const icona = useAsset('identita/icona-32');
  // Da quale pagina si entra nelle mappe: «Chiudi» di visore ed editor ci riporta lì (`utils/ritornoMappe`).
  const paginaPrecedente = useRef<string | null>(null);
  useEffect(() => {
    const qui = location.pathname + location.search;
    if (paginaPrecedente.current === qui) return;
    annotaNavigazione(paginaPrecedente.current, location.pathname);
    paginaPrecedente.current = qui;
  }, [location.pathname, location.search]);
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
      {sfondoSezione && <div key={sfondoSezione} className="sfondo-sezione" style={{ backgroundImage: `url("${sfondoSezione}")` }} aria-hidden="true" data-testid="sfondo-sezione" />}
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-5 pb-24 lg:pb-5 flex flex-col">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      {/* cambiato il giorno della partita, il meteo del giorno nuovo */}
      <MeteoAlCambioGiorno />
      <ToastContainer />
    </div>
  );
}
