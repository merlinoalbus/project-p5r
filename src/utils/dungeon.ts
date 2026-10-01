// ============================================================
// Dungeon — colori e nomi italiani dei tipi di punto di interesse (fuori dai componenti per il fast refresh)
// ============================================================

import type { PuntoInteresseDto } from '../types';

export const COLORE_TIPO: Record<PuntoInteresseDto['tipo'], string> = {
  sicura: '#3ba7ff', porta: '#94a3b8', meccanismo: '#5eead4', forziere: '#f2d94e', 'forziere-chiuso': '#f29b3e', volonta: '#c85cff', puzzle: '#7fd8c8', miniboss: '#ff6b6b', boss: '#e5352b',
  'ombra-sciagura': '#b0b0c0', persona: '#5fd67a', oggetto: '#ececf1', scorciatoia: '#8ab4f8', storia: '#ff2e63', altro: '#9a9aae',
};
/** I nomi dei tipi come li vede l'utente (2026-10-01: le chiavi restano quelle dei dati, cambiano solo le etichette —
 *  «Sicura» → «Stanze sicure», «Volontà» → «Semi della bramosia», «Forziere chiuso» → «Forziere raro», «Ombra sciagura» →
 *  «Nemico» — e si aggiungono Porta, Meccanismo e Storia). */
export const NOME_TIPO: Record<PuntoInteresseDto['tipo'], string> = {
  sicura: 'Stanze sicure', porta: 'Porta', meccanismo: 'Meccanismo', forziere: 'Forziere normale', 'forziere-chiuso': 'Forziere raro', volonta: 'Semi della bramosia',
  puzzle: 'Enigma', miniboss: 'Mini-boss', boss: 'Boss', 'ombra-sciagura': 'Nemico', persona: 'Persona', oggetto: 'Oggetto', scorciatoia: 'Scorciatoia',
  storia: 'Storia', altro: 'Altro',
};
