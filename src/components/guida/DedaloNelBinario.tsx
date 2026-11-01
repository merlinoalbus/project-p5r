// ============================================================
// DedaloNelBinario — un dedalo dei Memento nel binario della scheda (da 1024 px) o nella fila del tablet (`DungeonDettaglioPage`)
// ============================================================

import { SpuntaCompletata, TestoCompletata } from './SpuntaCompletata';
import { nomeBreveDedalo, percentualeDedalo } from '../../utils/dedali';
import { classiSuggerito } from '../../utils/suggerimenti';
import type { AreaDungeonDto } from '../../types';

/** Un dedalo nel binario (da 1024 px) o nella fila (tablet): numero, nome, percentuale e barra, ✓ se completato. La percentuale è
 *  quella della regola unica (L10-03, `percentualeDedalo`), la stessa della scheda del dedalo e della sua carta nei Luoghi. */
export function DedaloNelBinario({ a, scelto, suggerito, onScegli, fila }: { a: AreaDungeonDto; scelto: boolean; suggerito: boolean; onScegli: () => void; fila?: boolean }) {
  const percentuale = percentualeDedalo(a);
  const completato = a.dedalo?.completato === true;
  if (fila) {
    return (
      <button type="button" aria-pressed={scelto} onClick={onScegli} title={a.nome} className={`chip touch shrink-0 ${scelto ? 'chip--attivo' : ''} ${completato ? 'chip--icona' : ''} ${classiSuggerito(suggerito, 'chip')}`}>
        {completato && <SpuntaCompletata />}{a.ordine + 1} {nomeBreveDedalo(a.nome)}{!completato && percentuale !== null ? ` · ${percentuale}%` : ''}{completato && <TestoCompletata />}
      </button>
    );
  }
  return (
    <button type="button" aria-pressed={scelto} onClick={onScegli} title={a.nome}
      className={`touch flex w-full flex-col gap-1 rounded-md border px-2 py-1.5 text-left transition-colors ${scelto ? 'border-primary bg-primary-bg text-text' : 'border-transparent text-text-secondary hover:border-border hover:bg-white/[0.05] hover:text-text'} ${classiSuggerito(suggerito)}`}>
      <span className="flex items-baseline gap-1.5 testo-13 leading-tight">
        <span className={`w-4 shrink-0 text-right font-display ${scelto ? 'text-primary-testo' : 'text-text-muted'}`}>{a.ordine + 1}</span>
        <span className="min-w-0 flex-1 font-semibold">{nomeBreveDedalo(a.nome)}{completato && <>{' '}<SpuntaCompletata dimensione={12} /><TestoCompletata /></>}</span>
        <span className="shrink-0 testo-12 tabular-nums text-text-muted">{percentuale !== null ? `${percentuale}%` : `${a.dedalo?.obiettivi.totale ?? 0} el.`}</span>
      </span>
      {percentuale !== null && <span className="visore-mappa__progresso ml-5 h-1" aria-hidden><span className="visore-mappa__progresso-barra" style={{ width: `${percentuale}%` }} /></span>}
    </button>
  );
}
