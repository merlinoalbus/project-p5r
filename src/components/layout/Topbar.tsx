// ============================================================
// Topbar — logo, sezione corrente, accesso impostazioni
// ============================================================

import { Link, useLocation } from 'react-router-dom';
import { APP_NAME } from '../../utils/constants';
import { VOCI_NAV } from './navigazione';
import { IconGear } from '../shared/icons';

/** Barra superiore con contesto della pagina e azioni globali. */
export function Topbar() {
  const location = useLocation();
  const sezione = VOCI_NAV.find((v) => location.pathname.startsWith(v.to));

  return (
    <header className="flex items-center gap-4 px-4 lg:px-5 h-[56px] bg-bg-secondary border-b border-border shrink-0">
      <Link to="/home" className="flex items-center gap-2 no-underline text-text">
        <span className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white font-black text-[14px] tracking-tight">
          P5
        </span>
        <span className="font-semibold text-[15px] hidden sm:inline">{APP_NAME}</span>
      </Link>
      {sezione && (
        <span className="text-[14px] text-text-secondary truncate">
          <span className="text-text-muted mr-2">/</span>
          {sezione.label}
        </span>
      )}
      <div className="flex-1" />
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
