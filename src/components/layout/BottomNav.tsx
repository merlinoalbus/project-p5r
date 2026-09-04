// ============================================================
// BottomNav — barra di navigazione in basso (solo < lg, tablet/telefono)
// ============================================================

import { NavLink } from 'react-router-dom';
import { VOCI_NAV } from './navigazione';
import { IconaNav } from './IconaNav';

/** Barra fissa in basso con le voci principali, bersagli touch da 56px. */
export function BottomNav() {
  const voci = VOCI_NAV.filter((v) => v.principale);
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-bg-secondary border-t border-border flex items-stretch z-[100]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navigazione principale"
    >
      {voci.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 text-[11px] no-underline transition-colors ${
              isActive ? 'text-primary font-semibold' : 'text-text-secondary'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <IconaNav voce={item} attiva={isActive} />
              <span className="voce-menu text-[12px]">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
