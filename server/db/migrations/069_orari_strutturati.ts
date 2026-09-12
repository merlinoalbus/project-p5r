// ============================================================
// 069 — gli orari di un negozio sono valori, non una frase
// ============================================================
//
// `negozio.orari` portava ventuno frasi distinte («Apertura standard», «Solo di sera», «Sera, dal
// lunedi al venerdi; assente nei giorni di pioggia»…) che nessuno valutava. Nasce `orari_json`
// (`shared/orariNegozio.ts`: giorni, fasce, chiusura con la pioggia, nota), tradotto con un
// dizionario **esatto** sulle frasi che i dati contengono davvero: ogni frase è stata letta e resa
// a mano, e le cinque che non descrivono un orario valutabile («Presente per una settimana a
// partire dalla domenica…») restano nella nota, con gli orari a «sempre». Una frase fuori
// dizionario (righe dell'utente) diventa «sempre» con la frase in nota: niente si perde e niente
// si indovina. La colonna `orari` resta com'è finché l'interfaccia non passa ai valori.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiColonna } from '../colonne.js';
import { ORARI_SEMPRE, type OrariNegozio } from '../../../shared/orariNegozio.js';

const LUN_VEN: OrariNegozio['giorni'] = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi'];
const LUN_SAB: OrariNegozio['giorni'] = [...LUN_VEN, 'sabato'];
const o = (parziale: Partial<OrariNegozio>): OrariNegozio => ({ ...ORARI_SEMPRE, ...parziale });

/** Le frasi dei dati, una per una. La chiave è la frase esatta (spazi ridotti). */
export const ORARI_DALLA_PROSA: Readonly<Record<string, OrariNegozio>> = {
  'Apertura standard': ORARI_SEMPRE,
  'sempre': ORARI_SEMPRE,
  'Sempre accessibile una volta sbloccato': ORARI_SEMPRE,
  'Apertura standard, konbini': ORARI_SEMPRE,
  'Apertura standard, sfide disponibili anche di sera a prezzo ridotto': o({ nota: 'le sfide sono disponibili anche di sera, a prezzo ridotto' }),
  'Apertura standard, giorni di scuola': o({ giorni: LUN_SAB, nota: 'solo nei giorni di scuola' }),
  'Aperto solo di giorno': o({ fasce: ['giorno'] }),
  'Solo di giorno': o({ fasce: ['giorno'] }),
  'Solo di giorno, tutti i giorni': o({ fasce: ['giorno'] }),
  'Diurno': o({ fasce: ['giorno'] }),
  'Solo di giorno, chiuso nei giorni di pioggia': o({ fasce: ['giorno'], chiusoConPioggia: true }),
  'Solo di sera': o({ fasce: ['sera'] }),
  'Aperto solo di sera': o({ fasce: ['sera'] }),
  'Solo la domenica': o({ giorni: ['domenica'] }),
  'Domenica sera': o({ giorni: ['domenica'], fasce: ['sera'] }),
  'Solo la domenica mattina, in date specifiche del calendario': o({ giorni: ['domenica'], fasce: ['giorno'], nota: 'in date specifiche del calendario' }),
  'Sera, dal lunedi al venerdi; assente nei giorni di pioggia': o({ giorni: LUN_VEN, fasce: ['sera'], chiusoConPioggia: true }),
  'Giovedi, sabato e domenica sera (giorni di incontro con il Confidente); la fascia oraria esatta di apertura giornaliera come negozio di equipaggiamento non e specificata dalla guida italiana':
    o({ giorni: ['giovedi', 'sabato', 'domenica'], fasce: ['sera'], nota: 'nei giorni di incontro con il Confidente; l’apertura come negozio di equipaggiamento non è specificata dalla guida' }),
  'Caffe e curry si preparano di sera, a locale chiuso; il curry richiede che il frigorifero contenga gli ingredienti della ricetta':
    o({ fasce: ['sera'], nota: 'a locale chiuso; il curry richiede gli ingredienti della ricetta nel frigorifero' }),
  'Solo durante l esplorazione del Palazzo': o({ nota: 'solo durante l’esplorazione del Palazzo' }),
  'Presente per una settimana a partire dalla domenica, poi assente la settimana successiva': o({ nota: 'presente per una settimana a partire dalla domenica, assente la settimana successiva' }),
};

export function orariDallaProsa(testo: string | null | undefined): { orari: OrariNegozio; nelDizionario: boolean } {
  const chiave = (testo ?? '').replace(/\s+/g, ' ').trim();
  if (!chiave) return { orari: ORARI_SEMPRE, nelDizionario: true };
  const noti = ORARI_DALLA_PROSA[chiave];
  if (noti) return { orari: noti, nelDizionario: true };
  return { orari: o({ nota: chiave }), nelDizionario: false };
}

export const migration069: Migration = {
  id: 69,
  name: 'orari_strutturati',
  up(db) {
    aggiungiColonna(db, 'negozio', 'orari_json', 'TEXT');
    const righe = db.prepare('SELECT chiave, orari FROM negozio WHERE orari_json IS NULL').all() as Array<{ chiave: string; orari: string | null }>;
    const scrivi = db.prepare('UPDATE negozio SET orari_json = ? WHERE chiave = ?');
    const fuori: string[] = [];
    for (const r of righe) {
      const { orari, nelDizionario } = orariDallaProsa(r.orari);
      if (!nelDizionario) fuori.push(`${r.chiave}: «${r.orari}»`);
      scrivi.run(JSON.stringify(orari), r.chiave);
    }
    logger.info({ negozi: righe.length, fuoriDizionario: fuori.length }, 'migrazione 069: orari strutturati');
    if (fuori.length) logger.warn({ fuori }, 'migrazione 069: frasi fuori dizionario, conservate in nota');
  },
};
