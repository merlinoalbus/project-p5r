// ============================================================
// npm run negozi:integra — aggiunge al catalogo gli articoli che la guida elenca e a noi mancano
// ============================================================
//
//   npx tsx scripts/integra-articoli-negozi.ts [--scrivi]
//
// Confrontando `data/seed/oggetti-negozi.json` — la trascrizione della pagina «Elenco dei negozi»
// — con `data/seed/negozi.json` sono emersi articoli che la guida vende e che il catalogo non ha.
// Non è un problema delle mappe: è una lacuna del catalogo, e finché resta quegli articoli non
// esistono per l'applicazione, quindi non hanno prezzo, non si spuntano come acquistati e non
// arrivano alla mappa.
//
// Questo comando li aggiunge, prendendo prezzo e nome dalla trascrizione e la categoria da quella
// prevalente fra gli articoli già presenti nello stesso negozio — un negozio di dolci vende
// dolci. Senza `--scrivi` non tocca niente e si limita a dire che cosa farebbe.
//
// Ogni riga aggiunta porta la propria fonte e `verificato: true`, perché viene da una pagina della
// guida letta direttamente, non da una deduzione.
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface Articolo {
  chiave: string; ordine: number; nome: string; nomeIt: string | null; categoria: string;
  per: string | null; prezzo: number | null; effetto: string | null; statistiche: string | null;
  disponibileDal: string | null; condizione: string | null; nota: string | null;
  fonte: string; verificato: boolean;
}
interface Negozio { chiave: string; nome: string; articoli: Articolo[] }
interface Trascrizione {
  fonte: string;
  negozi: Record<string, string[]>;
  prezzi?: Record<string, Record<string, number | null>>;
  noteSuiPrezzi?: Record<string, string>;
}

function normalizza(nome: string): string {
  return nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Una chiave stabile e leggibile, nello stesso stile di quelle già in uso. */
function chiaveDi(negozio: string, nome: string): string {
  return `${negozio}/${normalizza(nome).replace(/ /g, '-')}`;
}

const scrivi = process.argv.includes('--scrivi');
const percorsoNegozi = path.join('data', 'seed', 'negozi.json');
const dati = JSON.parse(readFileSync(percorsoNegozi, 'utf8')) as { negozi: Negozio[] };
const trascrizione = JSON.parse(readFileSync(path.join('data', 'seed', 'oggetti-negozi.json'), 'utf8')) as Trascrizione;

const perChiave = new Map(dati.negozi.map((n) => [n.chiave, n]));
let aggiunti = 0;
const nonTrovati: string[] = [];
const senzaPrezzo: string[] = [];

for (const [chiaveNegozio, elenco] of Object.entries(trascrizione.negozi)) {
  const negozio = perChiave.get(chiaveNegozio);
  if (!negozio) { nonTrovati.push(chiaveNegozio); continue; }
  const noti = new Set((negozio.articoli ?? []).map((a) => normalizza(a.nome)));
  // la categoria prevalente del negozio: è la scelta meno arbitraria fra quelle disponibili
  const conteggio = new Map<string, number>();
  for (const a of negozio.articoli ?? []) conteggio.set(a.categoria, (conteggio.get(a.categoria) ?? 0) + 1);
  const categoria = [...conteggio.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? 'altro';
  let ordine = Math.max(0, ...(negozio.articoli ?? []).map((a) => a.ordine)) + 1;

  for (const nome of elenco) {
    if (noti.has(normalizza(nome))) continue;
    const prezzo = trascrizione.prezzi?.[chiaveNegozio]?.[nome] ?? null;
    if (prezzo === null) senzaPrezzo.push(`${chiaveNegozio}: ${nome}`);
    negozio.articoli = negozio.articoli ?? [];
    negozio.articoli.push({
      chiave: chiaveDi(chiaveNegozio, nome), ordine: ordine++, nome, nomeIt: null,
      categoria, per: null, prezzo, effetto: null, statistiche: null,
      disponibileDal: null, condizione: null,
      nota: trascrizione.noteSuiPrezzi?.[chiaveNegozio] ?? null,
      fonte: trascrizione.fonte, verificato: true,
    });
    aggiunti += 1;
  }
}

console.log(`articoli da aggiungere: ${aggiunti}`);
if (nonTrovati.length) console.log('  negozi della trascrizione assenti dal catalogo:', nonTrovati.join(', '));
if (senzaPrezzo.length) console.log(`  senza prezzo (${senzaPrezzo.length}): ${senzaPrezzo.slice(0, 6).join(', ')}`);
if (scrivi) {
  writeFileSync(percorsoNegozi, JSON.stringify(dati, null, 2) + '\n', 'utf8');
  console.log('scritto', percorsoNegozi);
} else {
  console.log('prova a vuoto: rilancia con --scrivi per applicare');
}
process.exitCode = nonTrovati.length ? 1 : 0;
