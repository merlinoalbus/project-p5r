// ============================================================
// CampoListaPersona — un elenco di Persona scelte per nome italiano da un elenco chiuso (L11-06)
// ============================================================
//
// Per i campi `elenco` della finestra «Modifica» (`ModificaGuida`) con `formato` `persone` (Persona di un set DLC, Persona-carta di una skill) o
// `persone-in-ordine` (ingredienti di una ricetta speciale: le righe sono numerate). Ogni riga è un selettore con la ricerca: il valore è il nome canonico che
// il server si aspetta, le opzioni arrivano con la scheda e un valore che non è più in elenco si mostra comunque. Il server ricontrolla ogni voce.
// ============================================================

import { useIdStabili } from '../../hooks/useIdStabili';
import type { CampoCorrezioneDto, ValoreCampoCorrezione } from '../../types';
import { IconaAzione } from '../shared/IconaAzione';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { Selettore } from '../shared/Selettore';
import { MASSIMO_VOCI_PERSONA, problemaListaPersona } from './listaPersonaLogica';

interface Props {
  campo: CampoCorrezioneDto;
  valore: ValoreCampoCorrezione | undefined;
  imposta: (voci: string[]) => void;
  occupato: boolean;
}

/** Le Persona del campo, una per riga con «Togli», e «Aggiungi una Persona» in fondo. */
export function CampoListaPersona({ campo, valore, imposta, occupato }: Props) {
  const voci = Array.isArray(valore) ? valore : [];
  // le righe hanno uno stato loro (i selettori): la chiave è un id stabile, non l'indice (`useIdStabili`)
  const chiavi = useIdStabili(voci.length);
  const nomi = new Map((campo.opzioni ?? []).map((o) => [o.chiave, o.nome]));
  const opzioni = (campo.opzioni ?? []).map((o) => ({ chiave: o.chiave, nome: o.nome, dettaglio: o.nome !== o.chiave ? o.chiave : undefined }));
  const problema = problemaListaPersona(voci, campo);
  return (
    <fieldset className="regole-editor flex min-w-0 flex-col gap-2 sm:col-span-2">
      <legend>{campo.etichetta}</legend>
      {voci.length === 0 && <p className="m-0 testo-12 text-text-muted">Nessuna Persona.</p>}
      {voci.map((v, i) => (
        <div key={chiavi.ids[i]} className="flex items-center gap-2">
          {campo.formato === 'persone-in-ordine' && <span className="chip shrink-0" aria-hidden>{i + 1}</span>}
          <div className="min-w-0 flex-1">
            <Selettore etichetta={`Persona ${i + 1}`} valore={v} ricerca="sempre" disabilitato={occupato} segnaposto="Scegli la Persona…"
              opzioni={v === '' || nomi.has(v) ? opzioni : [{ chiave: v, nome: v }, ...opzioni]}
              onCambia={(k) => imposta(voci.map((x, j) => (j === i ? k : x)))} />
          </div>
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" className="shrink-0" disabled={occupato}
            onClick={() => { chiavi.togli(i); imposta(voci.filter((_, j) => j !== i)); }} aria-label={`Togli ${v === '' ? `la riga ${i + 1}` : `«${nomi.get(v) ?? v}»`} da ${campo.etichetta}`} />
        </div>
      ))}
      <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una Persona"
        disabled={occupato || voci.length >= MASSIMO_VOCI_PERSONA} onClick={() => { chiavi.aggiungi(); imposta([...voci, '']); }} />
      {problema && <p role="alert" className="m-0 testo-12 text-error-testo">{problema}</p>}
    </fieldset>
  );
}
