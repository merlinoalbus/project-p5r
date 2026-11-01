// ============================================================
// schedePartita — le schede della pagina Partita (tutte tranne «Oggi»), caricate alla prima apertura (L5-11)
// ============================================================
//
// Prima la pagina importava le tredici schede insieme, anche per aprire solo «Oggi». Ora ognuna è un file a parte che si scarica quando serve
// (o prima, in tempo morto: `main.tsx` ne importa i `precarica`; la piastrella della scheda lo fa al passaggio del mouse, al fuoco e al tocco).
// Stessa difesa delle altre pagine a richiesta (`utils/pagineLazy.ts`): un solo ritentativo, e se il file è sparito dopo un rilascio l'errore
// resta nel riquadro della scheda (`ErroreInRiquadro`, «L'app è stata aggiornata»). «Oggi» resta nel file della pagina: è la scheda d'apertura.
// ============================================================

import { pigra, type PaginaPigra } from '../../utils/pagineLazy';

/** Tutte le schede caricate a richiesta ricevono la partita attiva. */
export interface PropsSchedaPartita { partitaId: number }

export const DotiSociali = pigra<typeof import('./DotiSociali'), PropsSchedaPartita>(() => import('./DotiSociali'), 'DotiSociali');
export const SquadraPartita = pigra<typeof import('./SquadraPartita'), PropsSchedaPartita>(() => import('./SquadraPartita'), 'SquadraPartita');
/** Anche il cassetto del Confidente del Diario (`PartiAzione`, `soloCassetto`) usa questa pagina pigra: un import statico altrove la porterebbe
 *  nel caricamento iniziale. */
export const ConfidentiPartita = pigra<typeof import('./ConfidentiPartita'), PropsSchedaPartita & { soloCassetto?: { chiave: string; onChiudi: () => void } }>(() => import('./ConfidentiPartita'), 'ConfidentiPartita');
export const LettureEGiochi = pigra<typeof import('./LettureEGiochi'), PropsSchedaPartita>(() => import('./LettureEGiochi'), 'LettureEGiochi');
export const ProgressiPartita = pigra<typeof import('./ProgressiPartita'), PropsSchedaPartita>(() => import('./ProgressiPartita'), 'ProgressiPartita');
export const ScortaPersona = pigra<typeof import('./ScortaPersona'), PropsSchedaPartita>(() => import('./ScortaPersona'), 'ScortaPersona');
export const CompendioPersonale = pigra<typeof import('./CompendioPersonale'), PropsSchedaPartita>(() => import('./CompendioPersonale'), 'CompendioPersonale');
export const PersonaDellaPartita = pigra<typeof import('./PersonaDellaPartita'), PropsSchedaPartita>(() => import('./PersonaDellaPartita'), 'PersonaDellaPartita');
export const ObiettiviPartita = pigra<typeof import('./ObiettiviPartita'), PropsSchedaPartita>(() => import('./ObiettiviPartita'), 'ObiettiviPartita');
export const PianiSalvati = pigra<typeof import('./PianiSalvati'), PropsSchedaPartita>(() => import('./PianiSalvati'), 'PianiSalvati');
export const CicliSalvati = pigra<typeof import('./CicliSalvati'), PropsSchedaPartita>(() => import('./CicliSalvati'), 'CicliSalvati');
export const StoricoPartita = pigra<typeof import('./StoricoPartita'), PropsSchedaPartita>(() => import('./StoricoPartita'), 'StoricoPartita');

/** Le chiavi (`?scheda=`) delle schede caricate a richiesta, con la loro pagina pigra. */
export const SCHEDE_A_RICHIESTA = {
  doti: DotiSociali,
  squadra: SquadraPartita,
  confidenti: ConfidentiPartita,
  letture: LettureEGiochi,
  progressi: ProgressiPartita,
  scorta: ScortaPersona,
  compendio: CompendioPersonale,
  'persona-partita': PersonaDellaPartita,
  obiettivi: ObiettiviPartita,
  piani: PianiSalvati,
  cicli: CicliSalvati,
  storico: StoricoPartita,
} as const satisfies Record<string, PaginaPigra<PropsSchedaPartita>>;
export type ChiaveSchedaARichiesta = keyof typeof SCHEDE_A_RICHIESTA;

/** I `precarica` delle schede (il modulo importato resta in memoria: la promessa riuscita è in cache). */
export const precaricaSchedePartita: ReadonlyArray<() => Promise<void>> = Object.values(SCHEDE_A_RICHIESTA).map((p) => p.precarica);
