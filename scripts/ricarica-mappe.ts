// ============================================================
// npm run mappe:ricarica — azzera e ricostruisce il livello mappe dal seed
// ============================================================
//
//   npx tsx --env-file=.env scripts/ricarica-mappe.ts [--rapporto <file>]
//
// Da usare quando il pacchetto dell'atlante cambia in modo non incrementale. Il rapporto elenca
// i conteggi di tutte le tabelle prima e dopo: se qualcosa fuori dal livello mappe fosse
// cambiato, comparirebbe in «fuoriDalLivelloMappe» e il comando uscirebbe con errore.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../server/config.js';
import { initDb, closeDb } from '../server/db/dbService.js';
import { runMigrations } from '../server/db/migrationRunner.js';
import { caricaSeed } from '../server/services/seed/caricaSeed.js';
import { reimpostaDatiMappe } from '../server/services/mappe/reimpostaDatiMappe.js';
import type { EsportazioneMappeDto } from '../shared/types.js';

const argomenti = process.argv.slice(2);
const indiceRapporto = argomenti.indexOf('--rapporto');
const fileRapporto = indiceRapporto >= 0 ? argomenti[indiceRapporto + 1] : null;

const db = initDb();
runMigrations(db);
// il compendio deve essere allineato prima di ricostruire l'atlante: le mappe si agganciano alle sue entità
caricaSeed(db);

const dirMappe = path.join(config.seedDir, 'mappe');
const pacchetti: EsportazioneMappeDto[] = [];
const editor = path.join(config.seedDir, 'mappe-editor.json');
if (fs.existsSync(editor)) pacchetti.push(JSON.parse(fs.readFileSync(editor, 'utf-8')) as EsportazioneMappeDto);
if (fs.existsSync(dirMappe)) {
  for (const nome of fs.readdirSync(dirMappe).filter((f) => f.endsWith('.json')).sort()) {
    pacchetti.push(JSON.parse(fs.readFileSync(path.join(dirMappe, nome), 'utf-8')) as EsportazioneMappeDto);
  }
}

const rapporto = reimpostaDatiMappe(db, pacchetti);
const riassunto = {
  pacchetti: pacchetti.length,
  mappe: rapporto.conteggi.dopo['mappa'] ?? 0,
  spilli: rapporto.conteggi.dopo['spillo'] ?? 0,
  contenutiGuida: rapporto.conteggi.dopo['guida_mappa'] ?? 0,
  svuotate: rapporto.svuotate,
  importate: rapporto.importate,
  fuoriDalLivelloMappe: rapporto.fuoriDalLivelloMappe,
};
console.log(JSON.stringify(riassunto, null, 1));
if (fileRapporto) {
  fs.mkdirSync(path.dirname(fileRapporto), { recursive: true });
  fs.writeFileSync(fileRapporto, JSON.stringify(rapporto, null, 2), 'utf-8');
  console.log('rapporto completo in', fileRapporto);
}
closeDb();
if (rapporto.fuoriDalLivelloMappe.length) {
  console.error('ATTENZIONE: sono cambiate tabelle fuori dal livello mappe.');
  process.exit(1);
}
