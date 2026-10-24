// ============================================================
// 180 — il contatore dello studio (R10-05/4)
// ============================================================
//
// Le tre attività di studio (Biblioteca della scuola, Diner di Shibuya, Leblanc) avevano tracciamento `nessuno`: l'effetto `turno` di una voce veniva
// rifiutato e una sessione di studio non si contava. Ora hanno tracciamento `svolta`: l'attività svolta conta il suo contatore.
// Le voci che lo registrano sono solo quelle in cui il testo dice il luogo dello studio senza ambiguità: 04-22 (Divanetto del Leblanc, già collegata
// all'attività), 05-03 (tavolino del Leblanc) e 07-06 (Diner). Restano fuori «Studiare» senza luogo (05-01, 05-07), «Studiare al tavolino» (05-19, due
// effetti di Conoscenza), lo studio di gruppo (12-19) e «Studiare con Makoto» (un incontro). L'effetto vale dalla prossima spunta; le spunte già date
// non riapplicano niente. Solo `main`. Testo, ordine, giorno e uid delle voci non cambiano. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiEffettoAllaVoce } from './aggiungiEffettoVoce.js';

const ATTIVITA_STUDIO = ['studio-biblioteca-scuola', 'studio-diner-shibuya', 'studio-leblanc'] as const;
const VOCI: ReadonlyArray<{ voce: string; testo: string; attivita: (typeof ATTIVITA_STUDIO)[number] }> = [
  { voce: 'b8efc7f09a6026a0a3b6c10be2e98b1d', testo: 'studiare sul Divanetto', attivita: 'studio-leblanc' },
  { voce: '865c3aa8b9e10f1f08b60174b51a52bb', testo: 'Studia sul tavolino del Leblanc', attivita: 'studio-leblanc' },
  { voce: '4e2b4e55c07ed7d170a158d963393c82', testo: 'Studiare al Diner', attivita: 'studio-diner-shibuya' },
];

export const migration180: Migration = {
  id: 180, name: 'contatore_studio',
  up(db) {
    const cambiate = ATTIVITA_STUDIO.map((a) => db.prepare("UPDATE main.attivita SET tracciamento = 'svolta' WHERE chiave = ? AND tracciamento = 'nessuno'").run(a).changes).reduce((x, y) => x + y, 0);
    const esiti = VOCI.map((a) => aggiungiEffettoAllaVoce(db, '180', a.voce, a.testo, { tipo: 'turno', attivita: a.attivita }, a.attivita));
    const conta = (e: string) => esiti.filter((x) => x === e).length;
    logger.info({ tracciamento: cambiate, aggiunti: conta('aggiunto'), presenti: conta('presente'), saltati: conta('saltato') }, '[migration180] contatore dello studio');
  },
};
