// ============================================================
// Topbar — logo, briciole (sezione e pagina), selettore partita, ricerca, accesso impostazioni
// ============================================================
//
// Lotto C (punto 10): le briciole hanno due livelli, la sezione (collegamento) e la pagina aperta, col titolo che la pagina dà a
// `useDocumentTitle` («GUIDA / CALENDARIO DI GIOCO», «GUIDA / <nome del Palazzo>», «PARTITA / <Confidente>»): prima si fermavano alla
// sezione e sul Confidente mancavano. La Guida sotto i 1024 px non è più una stella senza nome qui: sta nella barra in basso (vedi
// `navigazione.tsx`).
// ============================================================

import { Link, useLocation } from 'react-router-dom';
import { APP_NAME } from '../../utils/constants';
import { voceDelPercorso } from './navigazione';
import { PartitaSelettore } from './PartitaSelettore';
import { PulsanteCerca } from '../ricerca/PulsanteCerca';
import { IconGear } from '../shared/icons';
import { AssetImg } from '../shared/AssetImg';
import { useTitoloPaginaStore } from '../../stores/titoloPaginaStore';

/** La seconda briciola: il titolo della pagina (la parte prima di « — », che nei titoli dice il contenitore), se non è la sezione stessa. */
function briciolaPagina(titolo: string | null, sezione: string, pathname: string, inizioSezione: string): string | null {
  if (!titolo || pathname === inizioSezione) return null;
  const pagina = titolo.split(' — ')[0].trim();
  return pagina && pagina.toLocaleLowerCase('it') !== sezione.toLocaleLowerCase('it') ? pagina : null;
}

/** Barra superiore con contesto della pagina e azioni globali. */
export function Topbar() {
  const location = useLocation();
  const sezione = voceDelPercorso(location.pathname);
  const titolo = useTitoloPaginaStore((s) => s.titolo);
  const pagina = sezione ? briciolaPagina(titolo, sezione.label, location.pathname, sezione.to) : null;

  return (
    <header className="flex items-center gap-1 sm:gap-2 lg:gap-3 px-3 lg:px-5 h-[60px] lg:h-[68px] bg-bg-secondary border-b border-border shrink-0">
      {/* `touch`: il logo e' il collegamento alla Home ed e' su ogni pagina, ma misurava 104x36 —
          quattro pixel sotto il minimo che il progetto si e' dato per i bersagli tattili. */}
      <Link to="/home" className="touch flex items-center gap-2 no-underline text-text shrink-0" aria-label={`${APP_NAME} — Home`}>
        <AssetImg
          nome="identita/logo-orizzontale"
          alt={APP_NAME}
          className="h-9 sm:h-10 lg:h-12 w-auto max-w-[104px] sm:max-w-[180px] lg:max-w-[300px] object-contain"
          fallback={
            <>
              <AssetImg nome="identita/logo" alt={APP_NAME} className="w-8 h-8 object-contain" fallback={<span className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white font-black testo-14 tracking-tight">P5</span>} />
              <span className="font-display uppercase testo-24 leading-none hidden sm:inline">{APP_NAME}</span>
            </>
          }
        />
      </Link>
      {sezione && (
        <nav aria-label="Briciole" className="hidden md:flex min-w-0">
          <ol className="voce-menu testo-17 text-text-secondary flex items-center min-w-0 m-0 p-0 list-none">
            <li className="flex items-center shrink-0">
              <span className="text-text-muted mr-2" aria-hidden="true">/</span>
              {pagina
                ? <Link to={sezione.to} className="touch inline-flex items-center no-underline text-text-secondary hover:text-text">{sezione.label}</Link>
                : <span aria-current="page">{sezione.label}</span>}
            </li>
            {pagina && (
              <li className="flex items-center min-w-0">
                <span className="text-text-muted mx-2" aria-hidden="true">/</span>
                <span className="truncate text-text" aria-current="page" title={pagina}>{pagina}</span>
              </li>
            )}
          </ol>
        </nav>
      )}
      <div className="flex-1 min-w-0" />
      <PartitaSelettore />
      {/* L11 B4 (R11-07/2): la ricerca si raggiunge da ogni pagina e a ogni larghezza; la barra in basso ha già il tetto di cinque voci */}
      <PulsanteCerca />
      <Link
        to="/impostazioni"
        className="touch lg:hidden flex items-center justify-center rounded-md text-text-secondary hover:text-text"
        aria-label="Impostazioni"
      >
        <IconGear size={22} />
      </Link>
    </header>
  );
}
