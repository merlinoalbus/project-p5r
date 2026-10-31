// ============================================================
// vociDiStato — la voce del Diario che segna una domanda in classe o un cruciverba (R12-01/5)
// ============================================================
//
// Una domanda in classe e un cruciverba hanno UNA sola verità, la tabella della partita (`domanda_partita`, `cruciverba_partita`), e due
// modi di segnarla: la pagina della Guida e la voce del Diario che li cita con un effetto di stato (migrazioni 157 e 158). Perché i due non
// si separino, quando la voce c'è la spunta dalla Guida passa dallo STESSO gesto della voce: la voce risulta fatta anche nel Diario e nella
// Home, e la Conoscenza compare come «Applica» sulla voce (D6: mai in automatico).
//
// Il legame è sicuro solo dove non c'è ambiguità, e si dichiara qui in un posto solo:
//   - UNA voce sola cita quella domanda/quel cruciverba (due voci = nessuna è «la» voce); si contano TUTTE le voci che lo citano,
//     anche quelle che non sarebbero collegabili: i filtri che seguono decidono solo se la voce unica lo è;
//   - la voce non segna altro dello stesso genere (le date con due domande: spuntare una segnerebbe anche l'altra);
//   - gli effetti della voce sono soltanto Dote, domanda e cruciverba, e la voce non è un incontro con un Confidente né una visita
//     ai Palazzi: la spunta dalla Guida non ha scelte da chiedere (note di risposta, aperture dei dedali, acquisti, pesca) né Doti
//     o rango da toccare oltre a ciò che la voce già dichiara. L13 (ondata 8, O8-1): anche le note di rango fisse della voce
//     («puntiConfidente», come Ann ♪♪ delle domande del 25 aprile, 20 giugno e 7 luglio) sono dichiarate dalla voce e alla spunta entrano
//     senza scelte (`effettiDiStatoService.applicaPunti`): la voce resta collegabile.
// ============================================================

import { prepared } from '../db/dbService.js';

export type StatoCollegabile = 'domanda' | 'cruciverba';

interface RigaLegame { chiave: string; voce_uid: string; segnati: number; conoscenza: number; idonea: number }

/** Per ogni oggetto citato (chiave dell'effetto) la voce che lo segna, dove il legame è univoco; `conoscenza`: la voce porta anche la Dote Conoscenza.
 *
 *  L'unicità si conta su TUTTE le voci che citano l'oggetto, senza alcun filtro: una seconda voce che lo cita (anche un incontro, o una
 *  voce con effetti d'altro tipo) resterebbe non spuntata nel Diario mentre la domanda risulta fatta, ed è esattamente la
 *  contraddizione che il legame evita. Solo dopo, sulla voce unica, la colonna `idonea` (azione, non un Confidente né un Palazzo,
 *  effetti soltanto Dote/domanda/cruciverba e note di rango fisse) decide se è collegabile. */
export function vociCollegate(tipo: StatoCollegabile): Map<string, { voceUid: string; conoscenza: boolean }> {
  const righe = prepared(`
    SELECT e.chiave AS chiave, e.voce_uid AS voce_uid,
           (SELECT COUNT(*) FROM main.voce_effetto x WHERE x.voce_uid = e.voce_uid AND x.tipo IN ('domanda', 'cruciverba')) AS segnati,
           (SELECT COUNT(*) FROM main.voce_effetto k WHERE k.voce_uid = e.voce_uid AND k.tipo = 'dote' AND k.chiave = 'conoscenza') AS conoscenza,
           CASE WHEN v.genere = 'azione'
                 AND COALESCE(v.tipo, '') <> 'confidente' AND COALESCE(v.riferimento_tipo, '') NOT IN ('confidente', 'dungeon')
                 AND NOT EXISTS (SELECT 1 FROM main.voce_effetto y WHERE y.voce_uid = e.voce_uid AND y.tipo NOT IN ('dote', 'domanda', 'cruciverba', 'puntiConfidente'))
                THEN 1 ELSE 0 END AS idonea
      FROM main.voce_effetto e
      LEFT JOIN main.voce_giornata v ON v.uid = e.voce_uid
     WHERE e.tipo = ?
  `).all(tipo) as RigaLegame[];
  const perChiave = new Map<string, RigaLegame[]>();
  for (const r of righe) perChiave.set(r.chiave, [...(perChiave.get(r.chiave) ?? []), r]);
  const out = new Map<string, { voceUid: string; conoscenza: boolean }>();
  for (const [chiave, voci] of perChiave) {
    const unica = new Set(voci.map((v) => v.voce_uid));
    // una sola voce cita l'oggetto, quella voce segna un solo oggetto di questo genere ed è idonea al legame
    if (unica.size === 1 && voci.length === 1 && voci[0]!.segnati === 1 && voci[0]!.idonea === 1) out.set(chiave, { voceUid: voci[0]!.voce_uid, conoscenza: voci[0]!.conoscenza > 0 });
  }
  return out;
}

/** La voce che segna quell'oggetto (domanda: l'id come testo; cruciverba: la data 'MM-GG'), o null se il legame non è univoco. */
export function voceCollegata(tipo: StatoCollegabile, chiave: string): { voceUid: string; conoscenza: boolean } | null {
  return vociCollegate(tipo).get(chiave) ?? null;
}
