// ============================================================
// Dungeon — colori e nomi italiani dei tipi di punto di interesse (fuori dai componenti per il fast refresh)
// ============================================================

import type { PuntoInteresseDto } from '../types';

export const COLORE_TIPO: Record<PuntoInteresseDto['tipo'], string> = {
  sicura: '#3ba7ff', forziere: '#f2d94e', 'forziere-chiuso': '#f29b3e', volonta: '#c85cff', puzzle: '#7fd8c8', miniboss: '#ff6b6b', boss: '#e5352b',
  'ombra-sciagura': '#b0b0c0', persona: '#5fd67a', oggetto: '#ececf1', scorciatoia: '#8ab4f8', altro: '#9a9aae',
};
export const NOME_TIPO: Record<PuntoInteresseDto['tipo'], string> = {
  sicura: 'Sicura', forziere: 'Forziere', 'forziere-chiuso': 'Forziere chiuso', volonta: 'Volontà', puzzle: 'Enigma', miniboss: 'Mini-boss', boss: 'Boss',
  'ombra-sciagura': 'Ombra sciagura', persona: 'Persona', oggetto: 'Oggetto', scorciatoia: 'Scorciatoia', altro: 'Altro',
};
