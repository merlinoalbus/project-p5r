// ============================================================
// Sidebar — navigazione principale (solo ≥ lg)
// ============================================================

import { NavLink } from 'react-router-dom';
import { useConfigStore } from '../../stores/configStore';
import { VOCI_NAV } from './navigazione';
import { IconaNav } from './IconaNav';

/** Navigazione laterale a larghezza fissa fra le aree principali dell'app. */
export function Sidebar() {
  const version = useConfigStore((s) => s.config?.appVersion ?? '');

  return (
    <nav className="hidden lg:flex w-[210px] shrink-0 bg-bg-secondary border-r border-border flex-col py-3">
      <div className="flex flex-col gap-1 px-2">
        {VOCI_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `touch voce-menu flex items-center gap-3 px-3 py-2 rounded-md text-[18px] no-underline transition-colors ${
                isActive
                  ? 'bg-primary-bg text-primary font-semibold'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <IconaNav voce={item} attiva={isActive} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
      <div className="flex-1" />
      <div className="px-4 text-[11px] text-text-muted">v{version}</div>
    </nav>
  );
}
