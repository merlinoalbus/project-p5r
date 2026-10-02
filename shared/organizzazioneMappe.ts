import type { SpilloDto } from './types.js';
export type SchedaContenutoGuidaDto = Omit<SpilloDto, 'x' | 'y' | 'mappaChiave' | 'destinazione' | 'destinazioneNonDisponibile'> & { areaGuida: string };
/** Le sezioni della guida non sono planimetrie. */
export interface DestinazioneGuidaDto { area: string; dungeon: string; mappaPalazzo: string; nome: string }
export type RisoluzioneMappaDto = { tipo: 'mappa'; mappa: string } | ({ tipo: 'guida' } & DestinazioneGuidaDto);
export interface PuntoGuidaMappaDto { scheda?: SchedaContenutoGuidaDto; id: number | string; nome: string; descrizione: string; tipo: string; riferimento: { tipo: string; chiave: string } | null; collezionabile: boolean; soloPosizione: boolean; ruolo: 'punto' | 'sezione';
  /** L'id dell'elemento dell'Enigma di cui questo è un passo (095): sta subito sotto di lui; null = elemento dell'area. */
  contenitore?: number | string | null }
export interface AreaGuidaMappaDto { collegamenti?: SchedaContenutoGuidaDto[]; chiave: string; nome: string; descrizione: string; note: string; punti: PuntoGuidaMappaDto[]; mappe: Array<{ chiave: string; nome: string }> }
export interface ContenutiMappaDto { mappa: string; aree: AreaGuidaMappaDto[] }
