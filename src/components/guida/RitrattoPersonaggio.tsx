// ============================================================
// RitrattoPersonaggio — «per chi è» con le facce, non con la frase
// ============================================================
//
// Nelle tabelle degli abiti e degli articoli la colonna «Per» dice a chi serve una cosa, e lo dice
// a parole: «Ryuji», «Tutti tranne Morgana e Futaba», «Personaggi femminili e Morgana». I ritratti
// li abbiamo già — li usa il Compendio — e un volto si riconosce prima di leggerlo.
//
// **Ogni riga ha le sue facce**, non solo quelle che nominano una persona sola: era il primo
// tentativo, e lasciava tre righe su venti con l'immagine e le altre a testo, che è peggio di
// niente. La frase si legge e si risolve in un **insieme**: «tutti» è la squadra, «tranne X»
// toglie X, «personaggi femminili e Morgana» è quel gruppo lì. Le facce mostrate sono quelle che
// **possono** usare l'oggetto, che è la domanda della colonna.
//
// La frase resta scritta sotto: le parentesi della guida — «(non presente nelle versioni
// rimasterizzate 2022)» — dicono cose che nessun ritratto può dire.
// ============================================================

import { AssetImg } from '../shared/AssetImg';

/** La squadra, nell'ordine in cui il gioco la presenta. */
const SQUADRA = [
  { chiave: 'joker', nome: 'Protagonista', asset: 'personaggi/joker', genere: 'm' },
  { chiave: 'morgana', nome: 'Morgana', asset: 'confidenti/morgana', genere: 'gatto' },
  { chiave: 'ryuji', nome: 'Ryuji', asset: 'confidenti/ryuji', genere: 'm' },
  { chiave: 'ann', nome: 'Ann', asset: 'confidenti/ann', genere: 'f' },
  { chiave: 'yusuke', nome: 'Yusuke', asset: 'confidenti/yusuke', genere: 'm' },
  { chiave: 'makoto', nome: 'Makoto', asset: 'confidenti/makoto', genere: 'f' },
  { chiave: 'futaba', nome: 'Futaba', asset: 'confidenti/futaba', genere: 'f' },
  { chiave: 'haru', nome: 'Haru', asset: 'confidenti/haru', genere: 'f' },
  { chiave: 'akechi', nome: 'Akechi', asset: 'confidenti/akechi', genere: 'm' },
  { chiave: 'kasumi', nome: 'Sumire/Kasumi', asset: 'confidenti/kasumi', genere: 'f' },
] as const;

/** Come la guida chiama ciascuno, comprese le forme che usa nelle frasi. */
const ALIAS: Record<string, string> = {
  protagonista: 'joker', joker: 'joker', ren: 'joker', akira: 'joker',
  morgana: 'morgana', mona: 'morgana',
  ryuji: 'ryuji', skull: 'ryuji',
  ann: 'ann', panther: 'ann',
  yusuke: 'yusuke', fox: 'yusuke',
  makoto: 'makoto', queen: 'makoto',
  futaba: 'futaba', oracle: 'futaba',
  haru: 'haru', noir: 'haru',
  akechi: 'akechi', crow: 'akechi',
  sumire: 'kasumi', kasumi: 'kasumi', violet: 'kasumi',
};

/** I nomi citati in un pezzo di frase, nell'ordine della squadra. */
function nominati(pezzo: string): Set<string> {
  const trovati = new Set<string>();
  for (const [alias, chiave] of Object.entries(ALIAS)) {
    if (new RegExp(`\\b${alias}\\b`, 'i').test(pezzo)) trovati.add(chiave);
  }
  return trovati;
}

/** Chi può usare la cosa, secondo la frase della guida.
 *
 * Si spezza sul «tranne»: a sinistra chi è compreso, a destra chi è escluso. «Tutti», «personaggi
 * maschili» e «personaggi femminili» aprono l'insieme; i nomi propri lo aggiungono. Se non si
 * capisce niente — una frase che non nomina nessuno e non dice «tutti» — non si inventa: nessuna
 * faccia, resta la frase. */
function chiPuoUsarlo(chi: string): string[] {
  const testo = chi.toLowerCase();
  const [inclusi, esclusi = ''] = testo.split(/\btranne\b/);
  const dentro = new Set<string>();
  if (/\btutti\b|\bparty\b|\btutto il gruppo\b/.test(inclusi)) for (const p of SQUADRA) dentro.add(p.chiave);
  if (/maschil/.test(inclusi)) for (const p of SQUADRA) if (p.genere === 'm') dentro.add(p.chiave);
  if (/femminil/.test(inclusi)) for (const p of SQUADRA) if (p.genere === 'f') dentro.add(p.chiave);
  for (const c of nominati(inclusi)) dentro.add(c);
  for (const c of nominati(esclusi)) dentro.delete(c);
  return SQUADRA.filter((p) => dentro.has(p.chiave)).map((p) => p.chiave);
}

function Faccia({ chiave, dimensione }: { chiave: string; dimensione: number }) {
  const p = SQUADRA.find((x) => x.chiave === chiave);
  if (!p) return null;
  return (
    <AssetImg nome={p.asset} alt={p.nome} className="rounded-full border border-border-light bg-bg-tertiary object-cover object-top"
      style={{ width: dimensione, height: dimensione }}
      fallback={<span className="grid place-items-center rounded-full bg-bg-tertiary text-[9px] text-text-muted"
        style={{ width: dimensione, height: dimensione }}>{p.nome.slice(0, 2)}</span>} />
  );
}

/** Le facce di chi può usare la cosa, con sotto la frase della guida. */
export function RitrattoPersonaggio({ chi, dimensione = 24 }: { chi: string; dimensione?: number }) {
  const chiavi = chiPuoUsarlo(chi);
  if (chiavi.length === 0) return <span>{chi}</span>;
  // Uno solo: faccia e nome sulla stessa riga, che è come si legge «Akechi».
  if (chiavi.length === 1) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Faccia chiave={chiavi[0]} dimensione={dimensione} />
        <span>{chi}</span>
      </span>
    );
  }
  return (
    <span className="flex flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-0.5" title={chi}>
        {chiavi.map((k) => <Faccia key={k} chiave={k} dimensione={dimensione} />)}
      </span>
      <span className="text-[11px] text-text-muted">{chi}</span>
    </span>
  );
}
