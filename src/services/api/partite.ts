// ============================================================
// API partite — partite multiple e tracking
// ============================================================

import type {
  CompendioPartitaDto, ConfidentePartitaDto, Difficolta, DoteSocialePartitaDto, PartitaDto, PersonaPossedutaDto, StatisticheDto,
} from '../../types';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './_helpers';

/** Campi modificabili di una partita. */
export interface DatiPartita {
  nome?: string;
  note?: string;
  livelloProtagonista?: number;
  dataGioco?: string | null;
  difficolta?: Difficolta;
  nuovaPartitaPlus?: boolean;
  dlcPosseduti?: number[];
  allarmeAttivo?: boolean;
}

/** Dati di una Persona posseduta. */
export interface DatiPosseduta {
  livello?: number;
  statistiche?: StatisticheDto | null;
  trattoSkillId?: number | null;
  inSquadra?: boolean;
  note?: string;
  skillIds?: number[];
}

export const getPartite = (): Promise<PartitaDto[]> => apiGet('/partite');
export const getPartitaAttiva = (): Promise<PartitaDto | null> => apiGet('/partite/attiva');
export const creaPartita = (dati: DatiPartita & { nome: string; attiva?: boolean }): Promise<PartitaDto> => apiPost('/partite', dati);
export const aggiornaPartita = (id: number, dati: DatiPartita): Promise<PartitaDto> => apiPut(`/partite/${id}`, dati);
export const attivaPartita = (id: number): Promise<PartitaDto> => apiPost(`/partite/${id}/attiva`);
export const eliminaPartita = (id: number): Promise<void> => apiDelete(`/partite/${id}`);

export const getDoti = (id: number): Promise<DoteSocialePartitaDto[]> => apiGet(`/partite/${id}/doti`);
export const aggiornaDote = (id: number, chiave: string, mod: { punti?: number; delta?: number }): Promise<DoteSocialePartitaDto> =>
  apiPatch(`/partite/${id}/doti/${encodeURIComponent(chiave)}`, mod);

export const getConfidentiPartita = (id: number): Promise<ConfidentePartitaDto[]> => apiGet(`/partite/${id}/confidenti`);
export const aggiornaConfidente = (id: number, chiave: string, dati: { sbloccato?: boolean; rango?: number; note?: string }): Promise<ConfidentePartitaDto> =>
  apiPut(`/partite/${id}/confidenti/${encodeURIComponent(chiave)}`, dati);

export const getCompendioPartita = (id: number): Promise<CompendioPartitaDto[]> => apiGet(`/partite/${id}/compendio`);
export const aggiornaCompendio = (id: number, personaId: number, dati: { registrata: boolean; livelloRegistrato?: number | null }): Promise<CompendioPartitaDto[]> =>
  apiPut(`/partite/${id}/compendio/${personaId}`, dati);

export const getPossedute = (id: number): Promise<PersonaPossedutaDto[]> => apiGet(`/partite/${id}/persona`);
export const aggiungiPosseduta = (id: number, personaId: number, dati: DatiPosseduta = {}): Promise<PersonaPossedutaDto> =>
  apiPost(`/partite/${id}/persona`, { personaId, ...dati });
export const aggiornaPosseduta = (id: number, possedutaId: number, dati: DatiPosseduta): Promise<PersonaPossedutaDto> =>
  apiPut(`/partite/${id}/persona/${possedutaId}`, dati);
export const rimuoviPosseduta = (id: number, possedutaId: number): Promise<void> => apiDelete(`/partite/${id}/persona/${possedutaId}`);
