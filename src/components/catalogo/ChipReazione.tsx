// ChipReazione — la reazione del Confidente a un regalo (+3/+2/+1), con il suo significato anche per touch e lettori di schermo (revisione dei
// lotti D e D2: prima «+3» lo spiegava solo il `title`, che su touch non si vede e il lettore di schermo legge come «più tre» senza contesto).
import type { ReazioneRegalo } from '../../../shared/puntiConfidenti';
import { testoReazione } from '../../../shared/regali';

export function ChipReazione({ reazione }: { reazione: ReazioneRegalo }) {
  return (
    <span className="chip tabular-nums" title="Reazione del Confidente (bonus affinità della guida)">
      <span className="sr-only">Reazione </span>{testoReazione(reazione)}
    </span>
  );
}
