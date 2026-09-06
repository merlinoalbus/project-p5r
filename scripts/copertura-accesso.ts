// ============================================================
// npm run accesso:copertura — quante voci del catalogo arrivano davvero alla mappa
// ============================================================
//
//   npx tsx --env-file=.env scripts/copertura-accesso.ts [--dati <cartella>] [--rapporto <file>]
//
// Misura sull'**intero** inventario, non su un campione: ogni negozio, articolo, luogo,
// confidente, attività e punto di interesse viene passato al risolutore unico, e si conta chi
// arriva a una mappa e chi per di più arriva a un punto preciso. Un campione qui ingannerebbe,
// perché le voci non sono affatto omogenee: i 499 articoli dipendono tutti dal negozio che li
// vende, mentre i 688 punti di interesse dipendono dall'area della guida.
//
// Serve per rispondere con un numero alla domanda «le sezioni portano alla mappa?», che è metà
// dell'obiettivo del progetto.
// ============================================================
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { initDb, closeDb, getDb } from '../server/db/dbService.js';
import { runMigrations } from '../server/db/migrationRunner.js';
import { risolviAccessoMondo } from '../server/services/mappe/accessoMondoService.js';
import { TIPI_ACCESSO_MONDO, type TipoAccessoMondo } from '../shared/accessoMondo.js';

/** Da quale tabella vengono le chiavi di ciascun tipo, e quali righe contano. */
const SORGENTI: Partial<Record<TipoAccessoMondo, string>> = {
  negozio: 'SELECT chiave FROM negozio WHERE nascosto = 0',
  articolo: 'SELECT chiave FROM articolo WHERE nascosto = 0',
  luogo: 'SELECT chiave FROM luogo',
  confidente: 'SELECT chiave FROM confidente',
  attivita: 'SELECT chiave FROM attivita',
  punto: 'SELECT chiave FROM punto_interesse',
};

function argomento(nome: string): string | undefined {
  const i = process.argv.indexOf(nome);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const dati = argomento('--dati') ?? process.env.DATA_DIR ?? 'data';
const rapporto = argomento('--rapporto');

const db = initDb(path.join(dati, 'project-p5r.db'));
runMigrations(db);

// Un'eccezione del risolutore non e' un'entita' senza associazione: e' un guasto, e confonderle
// nasconderebbe un bug SQL dietro un numero che sembra normale. Vanno contate a parte, e la
// misura non vale se ce n'e' anche una sola.
const perTipo: Record<string, { voci: number; conAccesso: number; conPunto: number; senzaAccesso: string[]; errori: Array<{ chiave: string; errore: string }> }> = {};
let voci = 0, conAccesso = 0, conPunto = 0, errori = 0;

for (const tipo of TIPI_ACCESSO_MONDO) {
  const sql = SORGENTI[tipo];
  if (!sql) continue;
  const chiavi = (getDb().prepare(sql).all() as Array<{ chiave: string }>).map((r) => r.chiave);
  const riga = { voci: chiavi.length, conAccesso: 0, conPunto: 0, senzaAccesso: [] as string[],
    errori: [] as Array<{ chiave: string; errore: string }> };
  for (const chiave of chiavi) {
    let esito;
    try {
      esito = risolviAccessoMondo(tipo, chiave);
    } catch (e) {
      riga.errori.push({ chiave, errore: e instanceof Error ? e.message : String(e) });
      errori += 1;
      continue;
    }
    const destinazioni = esito.destinazioni ?? [];
    if (destinazioni.length) {
      riga.conAccesso += 1;
      // «punto preciso» = la destinazione porta a un pin, non solo alla mappa
      if (destinazioni.some((d) => d.spillo != null)) riga.conPunto += 1;
    } else if (riga.senzaAccesso.length < 20) {
      riga.senzaAccesso.push(chiave);
    }
  }
  perTipo[tipo] = riga;
  voci += riga.voci; conAccesso += riga.conAccesso; conPunto += riga.conPunto;
}

const esito = {
  schemaVersion: 1,
  misurato: new Date().toISOString().slice(0, 10),
  nota: 'inventario completo, nessun campione',
  perTipo,
  summary: {
    voci, conAccesso, conPunto, errori,
    quotaAccesso: voci ? Number((conAccesso / voci).toFixed(4)) : 0,
    quotaPunto: voci ? Number((conPunto / voci).toFixed(4)) : 0,
  },
};

closeDb();
console.log(JSON.stringify(esito.summary, null, 1));
for (const [tipo, r] of Object.entries(perTipo)) {
  console.log(`  ${tipo.padEnd(11)} ${String(r.voci).padStart(4)} voci · ${String(r.conAccesso).padStart(4)} con accesso · ${String(r.conPunto).padStart(4)} con punto preciso`);
}
if (errori) {
  console.error(`
MISURA NON VALIDA: ${errori} entità hanno fatto fallire il risolutore.`);
  for (const [tipo, r] of Object.entries(perTipo)) {
    for (const e of r.errori.slice(0, 5)) console.error(`  ${tipo} ${e.chiave}: ${e.errore}`);
  }
}
if (rapporto) {
  mkdirSync(path.dirname(rapporto), { recursive: true });
  writeFileSync(rapporto, JSON.stringify(esito, null, 2), 'utf8');
  console.log('rapporto in', rapporto);
}
process.exitCode = errori ? 1 : 0;
