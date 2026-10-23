// ============================================================
// organizzazioneMappe — DTO dei contenuti della guida sulle mappe (aree, punti, schede) e della risoluzione di un percorso
// ============================================================

import type { SpilloDto, StatoPunto } from './types.js';
import type { CarattereVoce } from './caratteriVoce.js';
export type SchedaContenutoGuidaDto = Omit<SpilloDto, 'x' | 'y' | 'mappaChiave' | 'destinazione' | 'destinazioneNonDisponibile'> & { areaGuida: string };
/** Le sezioni della guida non sono planimetrie. */
export interface DestinazioneGuidaDto { area: string; dungeon: string; mappaPalazzo: string; nome: string;
  /** L3: la casa della sezione, la scheda del Palazzo sull'infiltrazione (`/guida/dungeon/<k>?infiltrazione=<i>`). Il server la manda
   *  sempre; è facoltativa solo per i dati di prova scritti prima di L3. */
  casa?: string }
/** Che cosa apre un percorso: una mappa, con la sua casa (L2: l'unica pagina che la mostra — La città, il quartiere, l'Area con la
 *  versione, o il visore), oppure una sezione della guida di un Palazzo. */
export type RisoluzioneMappaDto = { tipo: 'mappa'; mappa: string; casa: string } | ({ tipo: 'guida' } & DestinazioneGuidaDto);
export interface PuntoGuidaMappaDto { scheda?: SchedaContenutoGuidaDto; id: number | string; nome: string; descrizione: string; tipo: string; riferimento: { tipo: string; chiave: string } | null; collezionabile: boolean; soloPosizione: boolean; ruolo: 'punto' | 'sezione';
  /** L'id dell'elemento dell'Enigma di cui questo è un passo (095): sta subito sotto di lui; null = elemento dell'area. */
  contenitore?: number | string | null;
  // ---- L4 (§2.3): da L4 i punti sono le voci della guida (`punto:<chiave>`); le schede senza mappa legate a una voce sono assorbite
  // nella voce e non compaiono più come elementi a sé (né `scheda`). Per le voci dei Palazzi: ----
  /** Lo stato con cui la voce risulta nella partita (null senza partita o da fare); presente solo con la partita. */
  stato?: StatoPunto | null;
  /** Il carattere della voce (permanente, rigenerabile, racconto; null per le Persona). */
  carattere?: CarattereVoce | null;
  esauribile?: boolean }
export interface AreaGuidaMappaDto { collegamenti?: SchedaContenutoGuidaDto[]; chiave: string; nome: string; descrizione: string; note: string; punti: PuntoGuidaMappaDto[]; mappe: Array<{ chiave: string; nome: string }> }
export interface ContenutiMappaDto { mappa: string; aree: AreaGuidaMappaDto[] }
