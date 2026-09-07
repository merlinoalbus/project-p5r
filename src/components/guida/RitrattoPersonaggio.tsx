// ============================================================
// RitrattoPersonaggio — «per chi è» con la faccia, non con il nome scritto
// ============================================================
//
// Nelle tabelle degli abiti e degli articoli la colonna «Per» è una colonna di nomi propri:
// Protagonista, Morgana, Ryuji… I ritratti li abbiamo già (li usa il Compendio), e un volto si
// riconosce prima di leggerlo — è il rilievo dell'utente: «le colonne che identificano per chi è
// un oggetto potrebbero presentare l'immagine del relativo personaggio e non il testo».
//
// **Il ritratto compare solo quando la riga nomina una persona sola.** La guida scrive anche
// «Tutti tranne Morgana e Futaba»: lì i nomi ci sono ma la frase li **esclude**, e mettere le loro
// facce direbbe l'opposto di quel che c'è scritto. In quel caso resta il testo, che è la verità.
// ============================================================

import { AssetImg } from '../shared/AssetImg';

/** Nome come lo scrive la guida → asset del ritratto. */
const RITRATTO: Record<string, string> = {
  protagonista: 'personaggi/joker',
  joker: 'personaggi/joker',
  morgana: 'confidenti/morgana',
  ryuji: 'confidenti/ryuji',
  ann: 'confidenti/ann',
  yusuke: 'confidenti/yusuke',
  makoto: 'confidenti/makoto',
  haru: 'confidenti/haru',
  futaba: 'confidenti/futaba',
  akechi: 'confidenti/akechi',
  kasumi: 'confidenti/kasumi',
  sumire: 'confidenti/kasumi',
  'sumire/kasumi': 'confidenti/kasumi',
  jose: 'personaggi/jose',
  lavenza: 'personaggi/lavenza',
  caroline: 'personaggi/caroline',
  justine: 'personaggi/justine',
};

/** L'asset del ritratto se la frase nomina **una** persona sola, altrimenti null.
 *
 * Si toglie la parentesi di servizio della guida — «Akechi (non presente nelle versioni
 * rimasterizzate 2022)» — perché quella non cambia di chi si parla. */
function assetRitratto(chi: string): string | null {
  const pulito = chi.replace(/\(.*?\)/g, '').trim().toLowerCase();
  if (!pulito || /\b(tutti|tranne|party|maschili|femminili|e )\b/.test(pulito)) return null;
  return RITRATTO[pulito] ?? null;
}

/** Il ritratto tondo con il nome accanto; senza ritratto, il solo nome. */
export function RitrattoPersonaggio({ chi, dimensione = 26 }: { chi: string; dimensione?: number }) {
  const asset = assetRitratto(chi);
  if (!asset) return <span>{chi}</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <AssetImg nome={asset} alt="" decorativa
        className="shrink-0 rounded-full border border-border-light object-cover object-top"
        style={{ width: dimensione, height: dimensione }}
        fallback={<span aria-hidden className="shrink-0 rounded-full bg-bg-tertiary" style={{ width: dimensione, height: dimensione }} />} />
      <span>{chi}</span>
    </span>
  );
}
