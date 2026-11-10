// ============================================================
// 385 — i piatti senza le frasi «non reperiti nelle fonti consultate» (L8-07)
// ============================================================
//
// Una frase che dice che un dato manca non informa: ramen, monjayaki e la sfida Big Bang Burger perdono l'effetto (il piatto resta), e a Leblanc esce solo la coda delle due frasi («… non
// reperite/i …»): il bonus («Bonus temporanei in battaglia …») resta. La patata dolce ha già l'effetto vuoto. Guardia per identità sul JSON atteso di ogni riga; il valore di prima va in
// archivio (`luogo.piatti_json.385`); la fotografia `seed_json`, se ripete il JSON atteso, cambia insieme (altrimenti «Ripristina» riporterebbe le frasi). Righe non elencate: identiche.
// Idempotente: una riga già pulita non si scrive. Verbale: `dati_guida.audit-l8-385-piatti`. Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, registraAudit } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`385: ${motivo}; nessuna modifica applicata.`); };
const MIGRAZIONE = 'L8-07 · 385';
const piatti = (...voci: Array<[string, string]>): string => JSON.stringify(voci.map(([nome, effetto]) => ({ nome, prezzo: null, effetto })));

const RIGHE: ReadonlyArray<{ chiave: string; atteso: string; nuovo: string }> = [
  {
    chiave: 'yongen-jaya/leblanc',
    atteso: piatti(['Caffè (varie miscele)', 'Bonus temporanei in battaglia in base ad abbinamento con il curry; ricette specifiche non reperite in dettaglio nelle fonti consultate.'], ['Curry (varie ricette)', 'Bonus temporanei in battaglia; ricette e valori esatti non reperiti in dettaglio nelle fonti consultate.']),
    nuovo: piatti(['Caffè (varie miscele)', 'Bonus temporanei in battaglia in base ad abbinamento con il curry.'], ['Curry (varie ricette)', 'Bonus temporanei in battaglia.']),
  },
  { chiave: 'shibuya/big-bang-burger', atteso: piatti(['Big Bang Burger (sfida)', 'Dettagli su premio/effetto non reperiti nelle fonti consultate.']), nuovo: piatti(['Big Bang Burger (sfida)', '']) },
  { chiave: 'ogikubo/ogikubo-ramen', atteso: piatti(['Ramen', 'Dettagli su varianti/effetti non reperiti nelle fonti consultate.']), nuovo: piatti(['Ramen', '']) },
  { chiave: 'tsukishima/tsukishima-monjayaki', atteso: piatti(['Monjayaki', 'Dettagli su effetti non reperiti nelle fonti consultate.']), nuovo: piatti(['Monjayaki', '']) },
];

export const migration385: Migration = {
  id: 385,
  name: 'piatti_senza_frasi_non_reperiti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'luogo') || !haColonna(db, 'luogo', 'piatti_json') || !esisteTabella(db, 'dati_guida')) return;
    const altre = improntaTabella(db, 'luogo', ['piatti_json', 'seed_json']);
    const pulite: string[] = [];
    const resta: Array<{ chiave: string; motivo: string }> = [];
    for (const r of RIGHE) {
      const riga = db.prepare('SELECT piatti_json, seed_json FROM main.luogo WHERE chiave = ?').get(r.chiave) as { piatti_json: string | null; seed_json: string | null } | undefined;
      if (!riga) { resta.push({ chiave: r.chiave, motivo: 'riga assente' }); continue; }
      if (riga.piatti_json === r.nuovo) continue;
      if (riga.piatti_json !== r.atteso) { resta.push({ chiave: r.chiave, motivo: 'piatti diversi da quelli attesi: restano' }); continue; }
      archiviaSenzaSovrascrivere(db, MIGRAZIONE, 'luogo.piatti_json.385', { [r.chiave]: r.atteso });
      let seed = riga.seed_json;
      if (seed !== null) {
        try {
          const foto = JSON.parse(seed) as Record<string, unknown>;
          if (foto.piatti_json === r.atteso) seed = JSON.stringify({ ...foto, piatti_json: r.nuovo });
          else if (foto.piatti_json !== r.nuovo) resta.push({ chiave: `${r.chiave} (fotografia)`, motivo: 'fotografia diversa da quella attesa: resta' });
        } catch { resta.push({ chiave: `${r.chiave} (fotografia)`, motivo: 'fotografia illeggibile: resta' }); }
      }
      if (db.prepare('UPDATE main.luogo SET piatti_json = ?, seed_json = ? WHERE chiave = ? AND piatti_json = ? AND seed_json IS ?').run(r.nuovo, seed, r.chiave, r.atteso, riga.seed_json).changes !== 1) errore(`${r.chiave} non si aggiorna`);
      pulite.push(r.chiave);
    }
    if (improntaTabella(db, 'luogo', ['piatti_json', 'seed_json']) !== altre) errore('le altre colonne di luogo sono cambiate');
    if (pulite.length === 0 && resta.length === 0) return;
    registraAudit(db, 'audit-l8-385-piatti', { migrazione: MIGRAZIONE, pulite, resta });
    logger.info({ migrazione: 385, pulite, resta }, 'piatti senza le frasi «non reperiti»');
  },
};
