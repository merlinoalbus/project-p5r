// ============================================================
// 076 — i negozi con un programma punti lo dichiarano
// ============================================================
//
// Due negozi contano qualcosa oltre agli acquisti: il negozio di vestiti usati di Kichijoji dà
// punti che vengono dalle vendite (l'app non li può calcolare: si segnano a mano, condizione
// `punti-negozio`), e Tanaka ha un grado cliente che sale con la spesa (calcolato dalla partita,
// condizione `rango-cliente`). Nasce `negozio.programma_punti_json`
// ({ nome, unita, calcolo: 'manuale' | 'rango-cliente' }): l'editor delle condizioni offrirà
// «punti negozio» solo ai programmi manuali e «grado cliente» solo a chi ha il grado. Non esiste
// un «punti = f(spesa)»: nel gioco non c'è.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiColonna } from '../colonne.js';

export interface ProgrammaPunti { nome: string; unita: string; calcolo: 'manuale' | 'rango-cliente' }

export const PROGRAMMI_PUNTI: Readonly<Record<string, ProgrammaPunti>> = {
  'vestiti-usati-kichijoji': { nome: 'Punti del negozio', unita: 'punti', calcolo: 'manuale' },
  'tanaka-affari-loschi': { nome: 'Grado cliente', unita: 'yen spesi', calcolo: 'rango-cliente' },
};

export const migration076: Migration = {
  id: 76,
  name: 'programma_punti',
  up(db) {
    aggiungiColonna(db, 'negozio', 'programma_punti_json', 'TEXT');
    const scrivi = db.prepare('UPDATE negozio SET programma_punti_json = ? WHERE chiave = ? AND programma_punti_json IS NULL');
    let dichiarati = 0;
    for (const [chiave, programma] of Object.entries(PROGRAMMI_PUNTI)) dichiarati += scrivi.run(JSON.stringify(programma), chiave).changes;
    logger.info({ dichiarati }, 'migrazione 076: programmi punti dei negozi');
  },
};
