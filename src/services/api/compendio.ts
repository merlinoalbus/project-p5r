// ============================================================
// API compendio — arcani, glossario, Persona, skill, oggetti, Confidenti, regole
// ============================================================

import type {
  ArcanaDto, ConfidenteDto, GlossarioDto, OggettoDto, PersonaDettaglioDto, PersonaRiassuntoDto, RegoleFusioneDto, SkillDettaglioDto, SkillRiassuntoDto, TermineDto,
} from '../../types';
import { apiGet, queryString } from './_helpers';

/** Filtri dell'elenco Persona (stessi nomi della query API). */
export interface FiltriPersona {
  q?: string;
  arcana?: string;
  livelloMin?: number;
  livelloMax?: number;
  dlc?: boolean;
  rara?: boolean;
  speciale?: boolean;
  skill?: string;
}

export const getArcani = (): Promise<ArcanaDto[]> => apiGet('/compendio/arcani');
export const getGlossario = (): Promise<GlossarioDto> => apiGet('/compendio/glossario');
export const getTermini = (): Promise<TermineDto[]> => apiGet('/compendio/termini');

export const getRegoleFusione = (): Promise<RegoleFusioneDto> => apiGet('/compendio/fusione/regole');
export const getPersone = (f: FiltriPersona = {}): Promise<PersonaRiassuntoDto[]> => apiGet(`/compendio/persona${queryString(f)}`);
export const getPersona = (id: number): Promise<PersonaDettaglioDto> => apiGet(`/compendio/persona/${id}`);
export const getSkills = (f: { q?: string; elemento?: string } = {}): Promise<SkillRiassuntoDto[]> => apiGet(`/compendio/skill${queryString(f)}`);
export const getSkill = (id: number): Promise<SkillDettaglioDto> => apiGet(`/compendio/skill/${id}`);
export const getOggetti = (f: { q?: string; categoria?: string } = {}): Promise<OggettoDto[]> => apiGet(`/compendio/oggetti${queryString(f)}`);
export const getConfidenti = (): Promise<ConfidenteDto[]> => apiGet('/compendio/confidenti');
