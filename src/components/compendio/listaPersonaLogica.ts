// ============================================================
// listaPersonaLogica — le regole di un elenco di Persona scelte da un elenco chiuso (L11-06)
// ============================================================
//
// I campi con `formato` `persone` o `persone-in-ordine` della finestra «Modifica» (`ModificaGuida`): stessi controlli del server, detti prima di salvare.
// ============================================================

import type { CampoCorrezioneDto } from '../../types';

/** Quante voci accetta il server in un elenco della finestra di correzione. */
export const MASSIMO_VOCI_PERSONA = 60;

/** Il campo è un elenco di Persona scelte da un elenco chiuso? */
export const eListaPersona = (formato: CampoCorrezioneDto['formato']): boolean => formato === 'persone' || formato === 'persone-in-ordine';

/** Il primo problema dell'elenco, in italiano (`null` se va bene). */
export function problemaListaPersona(voci: readonly string[], campo: Pick<CampoCorrezioneDto, 'opzioni' | 'minimoVoci'>): string | null {
  if (voci.some((v) => v === '')) return 'Scegli la Persona in ogni riga, oppure togli la riga vuota.';
  const doppia = voci.find((v, i) => voci.indexOf(v) !== i);
  if (doppia !== undefined) return `La Persona «${campo.opzioni?.find((o) => o.chiave === doppia)?.nome ?? doppia}» compare due volte: ogni Persona può stare una sola volta.`;
  const minimo = campo.minimoVoci ?? 0;
  if (voci.length < minimo) return minimo === 1 ? 'Serve almeno una Persona.' : `Servono almeno ${minimo} Persona.`;
  return null;
}
