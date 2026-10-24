// ============================================================
// elenchiDaOpzioni — i campi speciali di `ModificaGuida` che si disegnano come elenco da opzioni (L11 · R11-17/1, gruppo «Luoghi e note»)
// ============================================================

import type { CampoCorrezioneDto, ValoreCampoCorrezione } from '../../types';
import { CampoElencoDaOpzioni } from './CampoElencoDaOpzioni';
import type { EditorCampoSpeciale } from './ModificaGuida';

/** I campi speciali per i percorsi indicati: ognuno si disegna con `CampoElencoDaOpzioni` (voci scelte per nome, con la ricerca). */
export function elenchiDaOpzioni(percorsi: readonly string[]): Record<string, EditorCampoSpeciale> {
  return Object.fromEntries(percorsi.map((p) => [p, {
    disegna: (campo: CampoCorrezioneDto, valore: ValoreCampoCorrezione | undefined, imposta: (v: ValoreCampoCorrezione) => void, occupato: boolean) =>
      <CampoElencoDaOpzioni campo={campo} valore={valore} imposta={imposta} occupato={occupato} />,
  } satisfies EditorCampoSpeciale]));
}
