// ============================================================
// Tipi frontend — DTO locali + riesport dei tipi condivisi
// ============================================================

export type * from '../shared/types';
import type { Capacita, Modalita } from '../shared/capacita';

/** Configurazione pubblica esposta da GET /api/config. */
export interface AppConfigDto {
  appVersion: string;
  gioco: string;
  /** La modalità dell'istanza che risponde (`shared/capacita.ts`): `preparazione` o `rilascio`. */
  modalita: Modalita;
  /** Le capacità di quella modalità, come le dichiara il backend (il frontend le confronta con le proprie all'avvio). */
  capacita: Capacita;
  /** Solo nel rilascio: l'identificativo dell'edizione servita (impronta del manifesto). Cambia a ogni nuova edizione; il frontend
   *  svuota la cache dei contenuti quando cambia (`registraEdizione`). */
  edizione?: string;
}
