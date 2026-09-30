// ============================================================
// Sidebar — navigazione principale (solo ≥ lg), richiudibile
// ============================================================
//
// Richiesta dell'utente (2026-09-30): il menu a sinistra si riduce alle sole icone per lasciare spazio al contenuto
// (la Home a 1366×657 aveva la guida del giorno ridotta a pochi pixel). Il pulsante in cima lo riduce o lo riapre, e
// la scelta resta (`preferenzeStore.menuRidotto`). Ridotto, col mouse: passando sopra il menu si apre **sopra** il
// contenuto (non lo sposta) e uscendo si richiude; sul tablet, dove non c'è il passaggio del mouse, vale il pulsante.
// Ridotte, le voci restano raggiungibili: nome accessibile e `title` sono il nome della voce.
// ============================================================

import { NavLink } from 'react-router-dom';
import { useConfigStore } from '../../stores/configStore';
import { usePreferenzeStore } from '../../stores/preferenzeStore';
import { VOCI_NAV } from './navigazione';
import { IconaNav } from './IconaNav';
import { IconChevronLeft, IconChevronRight } from '../shared/icons';

/** Navigazione laterale fra le aree principali dell'app: larga (210 px) o ridotta alle icone (64 px). */
export function Sidebar() {
  const version = useConfigStore((s) => s.config?.appVersion ?? '');
  const ridotto = usePreferenzeStore((s) => s.menuRidotto);
  const imposta = usePreferenzeStore((s) => s.impostaMenuRidotto);

  return (
    <nav className={`barra-laterale hidden lg:flex shrink-0 ${ridotto ? 'barra-laterale--ridotta' : ''}`} aria-label="Menu principale">
      <div className="barra-laterale__pannello bg-bg-secondary border-r border-border flex flex-col py-3">
        <div className="flex px-2 pb-1">
          <button type="button" className="btn btn-ghost btn-sm touch barra-laterale__interruttore" onClick={() => imposta(!ridotto)}
            aria-expanded={!ridotto} aria-label={ridotto ? 'Apri il menu' : 'Riduci il menu alle icone'} title={ridotto ? 'Apri il menu' : 'Riduci il menu alle icone'}>
            {ridotto ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
          </button>
        </div>
        <div className="flex flex-col gap-1 px-2">
          {VOCI_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={ridotto ? item.label : undefined}
              aria-label={item.label}
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
                  <span className="barra-laterale__etichetta">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
        <div className="flex-1" />
        <div className="barra-laterale__etichetta px-4 text-[11px] text-text-muted">v{version}</div>
      </div>
    </nav>
  );
}
