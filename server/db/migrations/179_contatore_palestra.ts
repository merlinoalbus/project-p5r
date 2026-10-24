// ============================================================
// 179 — il contatore della palestra (R10-05/3)
// ============================================================
//
// L'allenamento in palestra (Protein Lovers) aveva tracciamento `nessuno`: l'effetto `turno` di una voce del Diario veniva rifiutato, e una seduta in
// palestra non si contava. Ora ha tracciamento `svolta` (come biliardo, bagni, freccette): l'attività svolta conta il suo contatore.
// Le voci che lo registrano sono solo quelle in cui il testo dice una seduta sola in palestra, senza alternative: «Palestra con …»,
// «Allenamento libero in palestra», «Massaggio da Kawakami, poi allenamento libero in palestra». Restano fuori «in alternativa», «oppure»,
// «due sessioni» (12-22), l'allenamento senza luogo (01-14, 11-18) e quello in camera. L'effetto vale dalla prossima spunta: le spunte già date non
// riapplicano niente e nessuna proposta nasce. Solo `main`. Testo, ordine, giorno e uid delle voci non cambiano. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiEffettoAllaVoce } from './aggiungiEffettoVoce.js';

const ATTIVITA = 'allenamento-palestra-protein-lovers';
const VOCI: ReadonlyArray<{ voce: string; testo: string }> = [
  { voce: '0545972321f88ed2444e9003cbf75327', testo: 'Palestra con le Proteine' },
  { voce: '17268096122a7ca1efd3f7a7c5abd1e3', testo: 'Palestra con le Proteine' },
  { voce: '844b47df721428195e51913fafb32ddd', testo: 'Palestra con le Proteine' },
  { voce: '13cc185cdca5d4cf4cd854225da1e263', testo: 'allenamento libero in palestra' },
  { voce: '675beb30fbe7551abf7c1dfc092410b2', testo: 'allenamento libero in palestra' },
  { voce: '2f582422ad71fa51e50681618e31d843', testo: 'Allenamento libero in palestra' },
  { voce: '09c81caf0113ee93df055f9c990c9913', testo: 'Allenamento libero in palestra' },
  { voce: 'cda3fef63d0da9f5df9f24782eaf293f', testo: 'allenamento libero in palestra' },
  { voce: 'b6df4d31a94c9c196f8aca8c59a28ae6', testo: 'Allenamento libero in palestra' },
  { voce: '13b2e1f61193ed27ff12192f6b644de9', testo: 'Palestra con integratore' },
  { voce: '9f3c1cdce3a1d8856f6454aa76b7ebb8', testo: 'Palestra: frullato proteico premium' },
  { voce: '9a106cd72f8bc166c78d89c073069076', testo: 'Palestra con il Frullato iperproteico' },
  { voce: 'c4c5dbcc6df664011e3d5161cc04a7d5', testo: 'Palestra con il frullato migliore' },
  { voce: '9fc37214f6869d39877413f974aa3d6a', testo: 'Palestra con il Frullato iperproteico' },
  { voce: 'cf1b56b0cf6a17e3dec6bc82b2e15441', testo: 'Palestra con il Frullato proteico' },
  { voce: '487c098e049482783358a99e4810fe14', testo: 'Palestra con il Frullato iperproteico' },
];

export const migration179: Migration = {
  id: 179, name: 'contatore_palestra',
  up(db) {
    // il tracciamento passa da «nessuno» a «svolta» solo se è ancora «nessuno» (una scelta diversa dell'utente non si tocca)
    const cambiato = db.prepare("UPDATE main.attivita SET tracciamento = 'svolta' WHERE chiave = ? AND tracciamento = 'nessuno'").run(ATTIVITA).changes;
    const esiti = VOCI.map((a) => aggiungiEffettoAllaVoce(db, '179', a.voce, a.testo, { tipo: 'turno', attivita: ATTIVITA }, ATTIVITA));
    const conta = (e: string) => esiti.filter((x) => x === e).length;
    logger.info({ tracciamento: cambiato, aggiunti: conta('aggiunto'), presenti: conta('presente'), saltati: conta('saltato') }, '[migration179] contatore della palestra');
  },
};
