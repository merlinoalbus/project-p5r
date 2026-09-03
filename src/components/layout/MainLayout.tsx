// ============================================================
// MainLayout — shell dell'app, tablet-first; carica glossario e partite
// ============================================================
//
// ≥ lg (1024px, tablet orizzontale / desktop): Topbar + Sidebar + Outlet.
// <  lg (tablet verticale / telefono): Topbar + Outlet + barra di
//    navigazione in basso con bersagli touch da 56px.
// ============================================================

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { ToastContainer } from '../shared/Toast';
import { useGlossarioStore } from '../../stores/glossarioStore';
import { usePartitaStore } from '../../stores/partitaStore';
import { useAsset, useAssetStore } from '../../stores/assetStore';

/** Struttura principale con navigazione adattiva, contenuto route e overlay globali. */
export function MainLayout() {
  const caricaGlossario = useGlossarioStore((s) => s.carica);
  const caricaPartite = usePartitaStore((s) => s.carica);
  const caricaAsset = useAssetStore((s) => s.carica);
  useEffect(() => {
    void caricaGlossario();
    void caricaPartite();
    void caricaAsset();
  }, [caricaGlossario, caricaPartite, caricaAsset]);

  // Sfondo ripetibile e icona del sito dagli asset predefiniti (se presenti).
  const sfondo = useAsset('sfondi/pattern-nero');
  const icona = useAsset('identita/icona-32');
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
    <div className="flex flex-col h-dvh" style={sfondo ? { backgroundImage: `url("${sfondo}")`, backgroundRepeat: 'repeat', backgroundSize: '512px' } : undefined}>
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-5 pb-24 lg:pb-5 flex flex-col">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <ToastContainer />
    </div>
  );
}
