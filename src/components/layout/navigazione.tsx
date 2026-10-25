// ============================================================
// Voci di navigazione condivise fra Sidebar (≥lg) e BottomNav (<lg)
// ============================================================

import type { ReactNode } from 'react';
import { IconBolt, IconBook, IconFusion, IconGear, IconHome, IconMask } from '../shared/icons';
import { IconBussola } from '../shared/iconeGuida';

/** Voce di menu principale. */
export interface VoceNav {
  to: string;
  label: string;
  icon: ReactNode;
  /** Chiave dell'asset predefinito (`ui/nav-<chiave>`, variante attiva `-attiva`). */
  asset: string;
  /** Se true la voce compare anche nella barra in basso (max 5). */
  principale: boolean;
  /** Altri inizi di percorso che appartengono a questa sezione (per le briciole della Topbar): il Confidente sta nella Partita. */
  anche?: string[];
}

/**
 * Voci in ordine di visualizzazione.
 *
 * Lotto C (punto 10, 2026-10-25): nella barra in basso (sotto i 1024 px) c'è la **Guida** al posto di **Skill**. La Guida è il cuore
 * dichiarato dell'app (la guida italiana trasformata in app) e sul telefono era solo una stella senza nome nella barra in alto, la
 * stessa stella della «Stella» delle Doti in Home e di metà delle piastrelle dell'indice della Guida. In basso ha icona e nome come
 * le altre voci; la barra in alto resta con logo, partita, ricerca e impostazioni. Skill resta a un tocco: il chip «Skill» in testa al
 * Compendio, i nomi delle skill nelle schede delle Persona, la piastrella della Home quando non c'è una partita attiva e, da 1024 px, la barra
 * laterale (che mostra tutte le voci, nello stesso ordine di prima); la ricerca globale trova le singole skill.
 * L'icona di riserva della Guida è la bussola (l'asset `ui/nav-guida` è un libro aperto con la stella): niente più stella da sola.
 */
export const VOCI_NAV: VoceNav[] = [
  { to: '/home', label: 'Home', icon: <IconHome size={20} />, asset: 'ui/nav-home', principale: true },
  { to: '/compendio', label: 'Compendio', icon: <IconBook size={20} />, asset: 'ui/nav-compendio', principale: true },
  { to: '/skill', label: 'Skill', icon: <IconBolt size={20} />, asset: 'ui/nav-skill', principale: false },
  { to: '/fusione', label: 'Fusione', icon: <IconFusion size={20} />, asset: 'ui/nav-fusione', principale: true },
  { to: '/partita', label: 'Partita', icon: <IconMask size={20} />, asset: 'ui/nav-partita', principale: true, anche: ['/confidenti'] },
  { to: '/guida', label: 'Guida', icon: <IconBussola size={20} />, asset: 'ui/nav-guida', principale: true },
  { to: '/impostazioni', label: 'Impostazioni', icon: <IconGear size={20} />, asset: 'ui/nav-impostazioni', principale: false },
];

/** La voce di navigazione a cui appartiene un percorso (`/guida/calendario` → Guida, `/confidenti/takemi` → Partita), o undefined. */
export function voceDelPercorso(pathname: string): VoceNav | undefined {
  const dentro = (inizio: string) => pathname === inizio || pathname.startsWith(`${inizio}/`);
  return VOCI_NAV.find((v) => dentro(v.to) || (v.anche ?? []).some(dentro));
}
