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
import { esportaAttivitaSeed, esportaNegoziSeed, riepilogoEsportazioneCatalogo } from '../server/services/seed/esportaSeed.js';
import { config } from '../server/config.js';

/** I file che il comando sa ricostruire, con la funzione che li produce.
 *
 * Erano i soli negozi, ed era metà del lavoro: le correzioni ai libri, ai film e alle attività —
 * che l'app ha imparato ad accettare — restavano nel database di questa istanza e non arrivavano a
 * nessun altro. Aggiungerne uno domani è una riga qui. */
const FILE = [
  { percorso: path.resolve('data/seed/negozi.json'), produci: esportaNegoziSeed as (p?: never) => unknown },
  { percorso: path.resolve('data/seed/attivita.json'), produci: esportaAttivitaSeed as (p?: never) => unknown },
] as const;

/** Il rientro del file com'è oggi: due spazi in `negozi.json`, **uno** in `attivita.json`.
 *
 * Riscrivere con un rientro diverso cambia ogni riga del file: la prima prova ha prodotto 1912
 * righe aggiunte e 1889 tolte per una modifica che ne toccava ventitré. È la stessa ragione per cui
 * l'esportazione conserva l'ordine delle chiavi — un diff che cambia tutto non si legge — e va
 * dedotto dal file, non deciso qui: i due file del seed non usano lo stesso. */
function rientroDi(testo: string): number {
  const riga = testo.split('\n')[1] ?? '';
  const spazi = /^( +)"/.exec(riga)?.[1].length;
  return spazi && spazi > 0 ? spazi : 2;
}

function main(): void {
  const scrivi = process.argv.includes('--scrivi');
  const db = initDb(path.join(config.dataDir, config.dbFileName));
  runMigrations(db);

  const r = riepilogoEsportazioneCatalogo();
  console.log(`catalogo attuale: ${r.negozi} negozi e ${r.articoli} articoli`);
  console.log(`  di cui aggiunti o corretti da te: ${r.negoziUtente} negozi, ${r.articoliUtente} articoli`);
  console.log(`  righe nascoste, che NON finiscono nel seed: ${r.nascosti}`);
  console.log(`  righe con condizioni che la prosa non esprime: ${r.conCondizioniProprie}`);

  let cambiati = 0;
  for (const { percorso, produci } of FILE) {
    // Il file di adesso serve a due cose: dire che cosa cambia, e non perdere i campi che il
    // database non conosce (vedi `campiEstranei` in `esportaSeed.ts`).
    const vecchio = fs.existsSync(percorso) ? fs.readFileSync(percorso, 'utf8') : '';
    const precedente = vecchio ? (JSON.parse(vecchio) as never) : undefined;
    const nuovo = JSON.stringify(produci(precedente), null, rientroDi(vecchio)) + '\n';
    const nome = path.relative(process.cwd(), percorso);
    if (nuovo === vecchio) {
      console.log(`\n${nome}: già allineato, niente da scrivere.`);
      continue;
    }
    cambiati += 1;
    const dv = vecchio.split('\n').length, dn = nuovo.split('\n').length;
    console.log(`\n${nome}: ${dv} righe → ${dn} righe (${nuovo.length - vecchio.length >= 0 ? '+' : ''}${((nuovo.length - vecchio.length) / 1024).toFixed(1)} kB)`);
    if (scrivi) {
      fs.writeFileSync(percorso, nuovo, 'utf8');
      console.log(`scritto. Ora \`git diff ${nome}\` mostra esattamente che cosa è cambiato.`);
    }
  }
  if (cambiati > 0 && !scrivi) console.log('\nnon scritto: rilancia con `-- --scrivi` quando hai letto il riepilogo qui sopra.');
  closeDb();
}

main();
