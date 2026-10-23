import type { RequisitoSpillo } from './condizioniSpillo.js';
import type { NotaStoricaOfferta } from './tanakaNotaStorica.js';

/** Revisione della sola lettura: non è una ricevuta né un consenso commerciale. */
export interface ConfrontoTanakaDto {
  versione: 1;
  revisione: string;
  negozio: Record<string, unknown> | null;
  rapporto124: unknown;
  offerte: Array<{ chiave: string; corrente: Record<string, unknown> | null; collegamenti: unknown[]; rilievi: string[]; noteStoriche: NotaStoricaOfferta[] }>;
  royal: Array<{ chiave: string; nome: string; catalogo: string; prezzo: number; grado: string; rapporto: string;
    condizioni: RequisitoSpillo[]; catalogoCorrente: Record<string, unknown> | null; rilievi: string[]; noteStoriche: NotaStoricaOfferta[] }>;
  proposte: Array<{ tuple: [string, string, string, string | null]; stato: string;
    modificaRaw: string | null; fotografiaRaw: string | null; fonteCorrente: unknown;
    riconciliazione: 'coincidente' | 'rettifica-124-provata' | 'creazione-da-riconciliare' | 'conflitto'; rilievi: string[] }>;
}
