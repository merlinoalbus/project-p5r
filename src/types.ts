// ============================================================
// Tipi frontend — DTO locali + riesport dei tipi condivisi
// ============================================================

export type * from '../shared/types';

/** Configurazione pubblica esposta da GET /api/config. */
export interface AppConfigDto {
  appVersion: string;
  gioco: string;
}
