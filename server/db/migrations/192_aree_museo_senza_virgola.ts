// ============================================================
// 192 — le Aree del Museo di Madarame si chiamano «Museo 1P» e «Museo 2P» (L11 · R11-10c/11, decisione D6 dell'utente, 24/10)
// ============================================================
//
// Le due Aree si chiamavano «Museo, 1P» e «Museo, 2P»; le planimetrie sono «Museo 1P» e «Museo 2P - Livello N». Il nome dell'Area diventa quello delle
// planimetrie, senza la virgola. Cambia SOLO `area.nome` delle due righe e solo se il nome è ancora quello di prima (un nome già cambiato dall'utente
// non si tocca): chiavi, indirizzi (`slug`), ordine, origine e ogni altra colonna restano. Idempotente. Scrive solo in `main`; si controlla per impronta
// che le altre colonne di `area` e le tabelle vicine non siano cambiate.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';

const RINOMINE: ReadonlyArray<{ chiave: string; da: string; a: string }> = [
  { chiave: 'dungeon/madarame/museo-1p', da: 'Museo, 1P', a: 'Museo 1P' },
  { chiave: 'dungeon/madarame/museo-2p', da: 'Museo, 2P', a: 'Museo 2P' },
];
const INTATTE = ['mappa', 'luogo', 'punto_interesse', 'dungeon', 'voce_giornata', 'cestino'] as const;
const errore = (motivo: string): never => { throw new Error(`192: ${motivo}; nessuna modifica applicata.`); };

export const migration192: Migration = {
  id: 192, name: 'aree_museo_senza_virgola',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'area')) return;
    const prima = new Map<string, string>([['area', improntaTabella(db, 'area', ['nome'])]]);
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));

    const cambiate: string[] = [];
    for (const r of RINOMINE) {
      const info = db.prepare('UPDATE main.area SET nome = ? WHERE chiave = ? AND nome = ?').run(r.a, r.chiave, r.da);
      if (info.changes === 1) cambiate.push(r.chiave);
    }

    for (const r of RINOMINE) {
      const nome = db.prepare('SELECT nome FROM main.area WHERE chiave = ?').pluck().get(r.chiave) as string | undefined;
      if (nome !== undefined && nome !== r.a && nome !== r.da) continue; // già cambiato dall'utente: resta com'è
      if (nome === r.da) errore(`l'Area ${r.chiave} ha ancora il nome «${r.da}»`);
    }
    if (improntaTabella(db, 'area', ['nome']) !== prima.get('area')) errore('le altre colonne di area sono cambiate');
    for (const t of INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L11-R11-10c-192', rinominate: cambiate }, 'Aree del Museo senza virgola');
  },
};
