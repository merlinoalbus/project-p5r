// ============================================================
// ModuloInfiltrazione — «Modifica testo» di un'infiltrazione di Palazzo: nome e descrizione, con l'eliminazione (dal menu «Modifica ⋯»)
// ============================================================

import { aggiornaArea, eliminaArea } from '../../services/api';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { NEL_CESTINO } from '../../utils/cestino';
import { CampoCorrezione, CorrezioneGuida } from './CorrezioneGuida';
import type { AreaDungeonDto } from '../../types';

/** Il modulo del testo dell'infiltrazione, aperto sotto la riga dell'infiltrazione. `onSalvato` rilegge la scheda; `onEliminata` dice
 *  alla pagina quale infiltrazione se n'è andata (se era quella aperta, la scheda torna sul Palazzo). */
export function ModuloInfiltrazione({ area, onChiudi, onSalvato, onEliminata }: { area: AreaDungeonDto; onChiudi: () => void; onSalvato: () => Promise<unknown>; onEliminata: (chiave: string) => void }) {
  return (
    <CorrezioneGuida aperta onChiudi={onChiudi} cosa={`l’infiltrazione «${area.nome}»`} etichetta="Modifica testo"
      iniziale={() => ({ nome: area.nome, descrizione: area.descrizione })}
      onSalva={async (b) => { await aggiornaArea(area.chiave, b); await onSalvato(); }}
      // «Devo poter rimuovere un'area» (2026-09-30): l'eliminazione vera, per tutte le partite
      elimina={{
        avviso: `Se ne va dalla guida per tutte le partite${area.punti.length ? `, con i suoi ${area.punti.length} punti e quel che le partite ne avevano segnato` : ''}; le aree del Palazzo restano, con le loro altre infiltrazioni. ${NEL_CESTINO}`,
        onElimina: async () => { const k = area.chiave; await eliminaArea(k); onEliminata(k); await onSalvato(); },
      }}>
      {(b, cambia) => <>
        <CampoCorrezione etichetta="Nome dell’infiltrazione" valore={b.nome} massimo={LIMITI_GUIDA.area.nome} onCambia={(v) => cambia({ nome: v })} />
        <CampoCorrezione etichetta="Descrizione" valore={b.descrizione} multilinea massimo={LIMITI_GUIDA.area.descrizione} onCambia={(v) => cambia({ descrizione: v })} />
      </>}
    </CorrezioneGuida>
  );
}
