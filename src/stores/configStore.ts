// ============================================================
// Config Store — configurazione runtime dal BE (boot bloccante)
// ============================================================

import { create } from 'zustand';
import type { AppConfigDto } from '../types';

interface ConfigState {
  config: AppConfigDto | null;
  setConfig: (config: AppConfigDto) => void;
}

/** Configurazione pubblica caricata una volta durante il bootstrap dell'app. */
export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  setConfig: (config) => set({ config }),
}));
