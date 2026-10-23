// ============================================================
// SchermataAvvio — l'attesa a tutta pagina del primo caricamento (HydrateFallback del router)
// ============================================================
//
// Con i `loader` delle route, al primo caricamento di un indirizzo profondo il router non è «pronto» finché il file della pagina non è
// arrivato: senza questa schermata si vedrebbe una pagina vuota (e React Router lo segnala in console).
// ============================================================

import { Spinner } from './PageState';

/** Spinner centrato a tutta altezza, sul fondo del tema. */
export function SchermataAvvio() {
  return (
    <div className="flex items-center justify-center h-dvh bg-bg">
      <Spinner size={40} />
    </div>
  );
}
