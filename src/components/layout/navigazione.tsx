// ============================================================
// Voci di navigazione condivise fra Sidebar (≥lg) e BottomNav (<lg)
// ============================================================

import type { ReactNode } from 'react';
import { IconBolt, IconBook, IconFusion, IconGear, IconHome, IconMask } from '../shared/icons';

/** Voce di menu principale. */
export interface VoceNav {
  to: string;
  label: string;
  icon: ReactNode;
  /** Chiave dell'asset predefinito (`ui/nav-<chiave>`, variante attiva `-attiva`). */
  asset: string;
  /** Se true la voce compare anche nella barra in basso (max 5). */
  principale: boolean;
}

/** Voci in ordine di visualizzazione. */
export const VOCI_NAV: VoceNav[] = [
  { to: '/home', label: 'Home', icon: <IconHome size={20} />, asset: 'ui/nav-home', principale: true },
  { to: '/compendio', label: 'Compendio', icon: <IconBook size={20} />, asset: 'ui/nav-compendio', principale: true },
  { to: '/skill', label: 'Skill', icon: <IconBolt size={20} />, asset: 'ui/nav-skill', principale: true },
  { to: '/fusione', label: 'Fusione', icon: <IconFusion size={20} />, asset: 'ui/nav-fusione', principale: true },
  { to: '/partita', label: 'Partita', icon: <IconMask size={20} />, asset: 'ui/nav-partita', principale: true },
  { to: '/impostazioni', label: 'Impostazioni', icon: <IconGear size={20} />, asset: 'ui/nav-impostazioni', principale: false },
];

