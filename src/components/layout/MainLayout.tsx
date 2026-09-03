// ============================================================
// MainLayout — shell dell'app, tablet-first
// ============================================================
//
// ≥ lg (1024px, tablet orizzontale / desktop): Topbar + Sidebar + Outlet.
// <  lg (tablet verticale / telefono): Topbar + Outlet + barra di
//    navigazione in basso con bersagli touch da 56px.
// ============================================================

import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { ToastContainer } from '../shared/Toast';

/** Struttura principale con navigazione adattiva, contenuto route e overlay globali. */
export function MainLayout() {
  return (
    <div className="flex flex-col h-dvh">
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
