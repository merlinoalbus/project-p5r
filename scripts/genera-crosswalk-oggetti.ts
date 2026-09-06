// ============================================================
// npm run oggetti:crosswalk — lega gli oggetti della guida ai negozi e agli articoli
// ============================================================
//
//   npx tsx --env-file=.env scripts/genera-crosswalk-oggetti.ts [--dati <cartella>] [--out <file>]
//
// Gli oggetti della pagina «Oggetti» vengono dalla guida e **non hanno una chiave**: hanno un nome
// e una riga di testo che dice dove si trovano. Gli articoli del catalogo, invece, una chiave ce
// l'hanno, e attraverso il negozio arrivano alla mappa. Manca il ponte fra le due cose.
//
// Il ponte non si indovina, si legge: `data/seed/oggetti-negozi.json` è la trascrizione della
// pagina «Elenco dei negozi» della guida, scritta una volta e versionata. Questo comando la
// **valida** e la unisce alla via esatta — un oggetto il cui nome è già il nome di un articolo del
// catalogo — producendo il crosswalk che il server serve.
//
// Validare vuol dire dire dove la trascrizione non torna. Un negozio che il catalogo non ha è un
// errore da correggere e fa fallire il comando. Un articolo che nessun «Oggetto» della guida
// chiama così, invece, non lo è: la stessa pagina dei negozi vende accessori, armi, libri e DVD,
// che nella guida hanno pagine loro. Quelli si annotano e basta.
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { initDb, closeDb, getDb } from '../server/db/dbService.js';
import { runMigrations } from '../server/db/migrationRunner.js';
import type { OggettiGuidaDto } from '../shared/types.js';

interface Trascrizione {
  fonte: string;
  negozi: Record<string, string[]>;
}

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
const trascrizione = JSON.parse(readFileSync(path.join('data', 'seed', 'oggetti-negozi.json'), 'utf8')) as Trascrizione;

const articoli = getDb().prepare('SELECT chiave, nome, negozio_chiave FROM articolo WHERE nascosto = 0')
  .all() as Array<{ chiave: string; nome: string; negozio_chiave: string }>;
const negoziEsistenti = new Set((getDb().prepare('SELECT chiave FROM negozio WHERE nascosto = 0')
  .all() as Array<{ chiave: string }>).map((r) => r.chiave));

const perNomeArticolo = new Map<string, typeof articoli>();
for (const a of articoli) {
  const k = normalizza(a.nome);
  perNomeArticolo.set(k, [...(perNomeArticolo.get(k) ?? []), a]);
}
const perNomeGuida = new Map<string, string[]>();
for (const v of voci) {
  const k = normalizza(v.nome);
  perNomeGuida.set(k, [...(perNomeGuida.get(k) ?? []), v.nome]);
}

// Un oggetto può essere venduto in più posti, e la guida li elenca tutti: l'applicazione deve
// mostrarli tutti, non sceglierne uno. Per questo il ponte tiene una lista, non una chiave sola.
type Abbinamento = { nome: string; articolo?: string; negozi: string[]; via: string };
const abbinamenti = new Map<string, Abbinamento>();
const problemi: Record<string, string[]> = {
  'negozio trascritto che il catalogo non ha': [],
  'articolo di un’altra sezione della guida (accessori, armi, libri, DVD…)': [],
  'oggetto della guida con lo stesso nome di un altro': [],
  'oggetto senza articolo e non trascritto in nessun negozio': [],
};

// ---- via esatta: l'oggetto ha lo stesso nome di un articolo del catalogo -----------------------
for (const v of voci) {
  const k = normalizza(v.nome);
  const candidati = perNomeArticolo.get(k) ?? [];
  if (candidati.length !== 1) continue;
  if ((perNomeGuida.get(k) ?? []).length > 1) {
    problemi['oggetto della guida con lo stesso nome di un altro'].push(v.nome);
    continue;
  }
  abbinamenti.set(v.nome, { nome: v.nome, articolo: candidati[0].chiave,
    negozi: [candidati[0].negozio_chiave], via: 'nome dell’articolo' });
}

// ---- via trascritta: la guida dice chi lo vende ------------------------------------------------
for (const [negozio, articoliDelNegozio] of Object.entries(trascrizione.negozi)) {
  if (!negoziEsistenti.has(negozio)) {
    problemi['negozio trascritto che il catalogo non ha'].push(negozio);
    continue;
  }
  for (const nome of articoliDelNegozio) {
    const k = normalizza(nome);
    const nomiGuida = perNomeGuida.get(k);
    if (!nomiGuida) {
      // Non è un errore: l'elenco dei negozi vende anche accessori, armi, libri e DVD, che nella
      // guida hanno pagine proprie e non compaiono fra gli «Oggetti». Si annota e si tira avanti.
      problemi['articolo di un’altra sezione della guida (accessori, armi, libri, DVD…)'].push(`${negozio}: ${nome}`);
      continue;
    }
    for (const nomeGuida of nomiGuida) {
      const presente = abbinamenti.get(nomeGuida);
      if (presente) {
        // già trovato per un'altra via o in un altro negozio: si aggiunge il posto, non si scarta
        if (!presente.negozi.includes(negozio)) presente.negozi.push(negozio);
      } else {
        abbinamenti.set(nomeGuida, { nome: nomeGuida, negozi: [negozio], via: 'trascritto dalla guida' });
      }
    }
  }
}

for (const v of voci) {
  if (!abbinamenti.has(v.nome)) {
    problemi['oggetto senza articolo e non trascritto in nessun negozio'].push(v.nome);
  }
}

const elenco = [...abbinamenti.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
const esito = {
  schemaVersion: 2,
  cosaE: 'ponte fra gli oggetti della guida, che hanno solo un nome, e i negozi e gli articoli del catalogo, che hanno una chiave e arrivano alla mappa',
  fonti: { trascrizione: 'data/seed/oggetti-negozi.json', pagina: trascrizione.fonte },
  comeSiRigenera: 'npm run oggetti:crosswalk',
  criterio: 'due vie: il nome dell’articolo quando coincide in modo univoco, e la trascrizione della pagina «Elenco dei negozi». Un oggetto venduto in più posti li tiene tutti.',
  generato: new Date().toISOString().slice(0, 10),
  abbinamenti: elenco,
  summary: {
    vociGuida: voci.length, articoli: articoli.length, abbinati: elenco.length,
    conPiuNegozi: elenco.filter((a) => a.negozi.length > 1).length,
    perVia: {
      'nome dell’articolo': elenco.filter((a) => a.via === 'nome dell’articolo').length,
      'trascritto dalla guida': elenco.filter((a) => a.via === 'trascritto dalla guida').length,
    },
    problemi: Object.fromEntries(Object.entries(problemi).map(([k, v]) => [k, v.length])),
  },
  problemi: Object.fromEntries(Object.entries(problemi).map(([k, v]) => [k, v.slice(0, 40)])),
};

closeDb();
writeFileSync(destinazione, JSON.stringify(esito, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(esito.summary, null, 1));
for (const [k, v] of Object.entries(problemi)) {
  if (v.length) console.log(`  ${k}: ${v.slice(0, 6).join(', ')}${v.length > 6 ? ` … e altri ${v.length - 6}` : ''}`);
}
console.log('scritto', destinazione);
// Solo un negozio che il catalogo non ha è un errore di trascrizione da correggere: il resto è
// materia di altre pagine della guida, e va scritto senza far fallire nulla.
process.exitCode = problemi['negozio trascritto che il catalogo non ha'].length ? 1 : 0;
