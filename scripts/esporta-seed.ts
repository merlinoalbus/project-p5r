// ============================================================
// esporta-seed — riversa il catalogo corretto dentro `data/seed`, così ogni nuova istanza lo ha già
// ============================================================
//
//   npm run seed:esporta            mostra che cosa cambierebbe, senza scrivere
//   npm run seed:esporta -- --scrivi  scrive davvero
//
// Il valore predefinito è **non scrivere**: un comando che riscrive un file di dati senza dire
// prima che cosa cambia è un comando che prima o poi cancella qualcosa. Con `--scrivi` il file
// viene sostituito, ed è git a tenere la storia — perciò va eseguito su un albero pulito.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { initDb, closeDb } from '../server/db/dbService.js';
import { runMigrations } from '../server/db/migrationRunner.js';
import { esportaNegoziSeed, riepilogoEsportazioneCatalogo } from '../server/services/seed/esportaSeed.js';
import { config } from '../server/config.js';

const DESTINAZIONE = path.resolve('data/seed/negozi.json');

function main(): void {
  const scrivi = process.argv.includes('--scrivi');
  const db = initDb(path.join(config.dataDir, config.dbFileName));
  runMigrations(db);

  const r = riepilogoEsportazioneCatalogo();
  console.log(`catalogo attuale: ${r.negozi} negozi e ${r.articoli} articoli`);
  console.log(`  di cui aggiunti o corretti da te: ${r.negoziUtente} negozi, ${r.articoliUtente} articoli`);
  console.log(`  righe nascoste, che NON finiscono nel seed: ${r.nascosti}`);
  console.log(`  righe con condizioni che la prosa non esprime: ${r.conCondizioniProprie}`);

  // Il file di adesso serve a due cose: dire che cosa cambia, e non perdere i campi che il
  // database non conosce (vedi `campiEstranei` in `esportaSeed.ts`).
  const vecchio = fs.existsSync(DESTINAZIONE) ? fs.readFileSync(DESTINAZIONE, 'utf8') : '';
  const precedente = vecchio ? (JSON.parse(vecchio) as ReturnType<typeof esportaNegoziSeed>) : undefined;
  const nuovo = JSON.stringify(esportaNegoziSeed(precedente), null, 2) + '\n';
  if (nuovo === vecchio) {
    console.log('\nil file è già allineato: niente da scrivere.');
  } else {
    const dv = vecchio.split('\n').length, dn = nuovo.split('\n').length;
    console.log(`\n${path.relative(process.cwd(), DESTINAZIONE)}: ${dv} righe → ${dn} righe (${(nuovo.length - vecchio.length) / 1024 >= 0 ? '+' : ''}${((nuovo.length - vecchio.length) / 1024).toFixed(1)} kB)`);
    if (scrivi) {
      fs.writeFileSync(DESTINAZIONE, nuovo, 'utf8');
      console.log('scritto. Ora `git diff data/seed/negozi.json` mostra esattamente che cosa è cambiato.');
    } else {
      console.log('non scritto: rilancia con `-- --scrivi` quando hai letto il riepilogo qui sopra.');
    }
  }
  closeDb();
}

main();
