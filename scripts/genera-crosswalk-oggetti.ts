// ============================================================
// npm run oggetti:crosswalk — lega gli oggetti della guida agli articoli del catalogo
// ============================================================
//
//   npx tsx --env-file=.env scripts/genera-crosswalk-oggetti.ts [--dati <cartella>]
//
// Gli oggetti della pagina «Oggetti» vengono dalla guida e **non hanno una chiave**: hanno un
// nome e una riga di testo che dice dove si trovano. Gli articoli del catalogo, invece, una
// chiave ce l'hanno, e attraverso il negozio arrivano alla mappa. Manca il ponte fra le due cose.
//
// Il ponte non si può fare a runtime con un confronto fra nomi: sarebbe una somiglianza calcolata
// ogni volta, che cambia se cambia un nome e che nessuno può ispezionare. Si fa invece **una
// volta**, generando un file versionato che assegna la chiave soltanto dove la corrispondenza è
// **univoca in entrambe le direzioni** — un solo articolo con quel nome, e quel nome preso da un
// solo oggetto. Tutti gli altri restano dichiaratamente senza collegamento.
//
// Il file prodotto è materiale di catalogo: si rigenera con questo comando, si legge a occhio, e
// se un abbinamento è sbagliato si vede e si corregge lì.
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { initDb, closeDb, getDb } from '../server/db/dbService.js';
import { runMigrations } from '../server/db/migrationRunner.js';
import type { OggettiGuidaDto } from '../shared/types.js';

/** Confronto fra nomi: minuscole, accenti tolti, tutto ciò che non è lettera o cifra a spazio. */
function normalizza(nome: string): string {
  return nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

function argomento(nome: string): string | undefined {
  const i = process.argv.indexOf(nome);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const dati = argomento('--dati') ?? process.env.DATA_DIR ?? 'data';
const destinazione = argomento('--out') ?? path.join('data', 'seed', 'oggetti-crosswalk.json');

const db = initDb(path.join(dati, 'project-p5r.db'));
runMigrations(db);

const guida = JSON.parse(readFileSync(path.join('data', 'seed', 'oggetti-guida.json'), 'utf8')) as OggettiGuidaDto;
const voci = [...(guida.consumabili ?? []), ...(guida.chiaveEMateriali ?? [])];

const articoli = getDb().prepare('SELECT chiave, nome, negozio_chiave FROM articolo WHERE nascosto = 0')
  .all() as Array<{ chiave: string; nome: string; negozio_chiave: string }>;

const perNomeArticolo = new Map<string, typeof articoli>();
for (const a of articoli) {
  const k = normalizza(a.nome);
  perNomeArticolo.set(k, [...(perNomeArticolo.get(k) ?? []), a]);
}
const perNomeGuida = new Map<string, number>();
for (const v of voci) perNomeGuida.set(normalizza(v.nome), (perNomeGuida.get(normalizza(v.nome)) ?? 0) + 1);

const abbinamenti: Array<{ nome: string; articolo: string; negozio: string }> = [];
const scartati: Record<string, string[]> = { 'più di un articolo con quel nome': [], 'più di un oggetto con quel nome': [], 'nessun articolo con quel nome': [] };

for (const v of voci) {
  const k = normalizza(v.nome);
  const candidati = perNomeArticolo.get(k) ?? [];
  if (!candidati.length) { scartati['nessun articolo con quel nome'].push(v.nome); continue; }
  if (candidati.length > 1) { scartati['più di un articolo con quel nome'].push(v.nome); continue; }
  if ((perNomeGuida.get(k) ?? 0) > 1) { scartati['più di un oggetto con quel nome'].push(v.nome); continue; }
  abbinamenti.push({ nome: v.nome, articolo: candidati[0].chiave, negozio: candidati[0].negozio_chiave });
}
abbinamenti.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

const esito = {
  schemaVersion: 1,
  cosaE: 'ponte fra gli oggetti della guida, che hanno solo un nome, e gli articoli del catalogo, che hanno una chiave e un negozio',
  comeSiRigenera: 'npm run oggetti:crosswalk',
  criterio: 'corrispondenza univoca in entrambe le direzioni fra nomi normalizzati; ogni caso ambiguo resta escluso',
  generato: new Date().toISOString().slice(0, 10),
  abbinamenti,
  summary: {
    vociGuida: voci.length, articoli: articoli.length, abbinati: abbinamenti.length,
    scartati: Object.fromEntries(Object.entries(scartati).map(([k, v]) => [k, v.length])),
  },
  esempiScartati: Object.fromEntries(Object.entries(scartati).map(([k, v]) => [k, v.slice(0, 5)])),
};

closeDb();
writeFileSync(destinazione, JSON.stringify(esito, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(esito.summary, null, 1));
console.log('scritto', destinazione);
