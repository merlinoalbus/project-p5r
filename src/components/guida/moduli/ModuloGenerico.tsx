// ============================================================
// ModuloGenerico — domande e righe del cruciverba: i campi elencati in `definizioni.ts`, più l'editor delle risposte per le domande
// ============================================================

import { Selettore } from '../../shared/Selettore';
import { PulsanteVisivo } from '../../shared/PulsanteVisivo';
import { IconaAzione } from '../../shared/IconaAzione';
import { testoDi, type PropsModulo } from './base';
import { Blocco, Campo, Griglia } from './campi';
import { CAMPI_GENERICI, type Risposta } from './definizioni';

/** Le risposte giuste come righe in ordine: certe domande d'esame si rispondono in più passaggi. */
function EditorRisposte({ risposte, onCambia, disabilitato }: { risposte: Risposta[]; onCambia: (r: Risposta[]) => void; disabilitato?: boolean }) {
  const cambia = (i: number, testo: string) => onCambia(risposte.map((r, j) => (j === i ? { ...r, testo } : r)));
  const togli = (i: number) => onCambia(risposte.filter((_, j) => j !== i).map((r, j) => ({ ...r, ordine: j + 1 })));
  return (
    <fieldset className="regole-editor flex flex-col gap-2">
      <legend>Risposte giuste</legend>
      <p className="m-0 text-[12px] text-text-muted">Che cosa rispondere, nell’ordine. Una sola riga per le domande in classe; più righe dove il gioco chiede una sequenza di risposte.</p>
      {risposte.map((r, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <span className="chip shrink-0" aria-hidden>{i + 1}</span>
          <label className="editor-mappa__campo min-w-[220px] flex-[3]">
            <span className="sr-only">Risposta {i + 1}</span>
            <input className="form-input" type="text" maxLength={300} value={r.testo} disabled={disabilitato} onChange={(e) => cambia(i, e.target.value)} placeholder="La risposta come la dà il gioco" aria-label={`Risposta ${i + 1}`} />
          </label>
          <button type="button" className="btn btn-ghost btn-sm touch" disabled={disabilitato} onClick={() => togli(i)} aria-label={`Togli la risposta ${i + 1}`}>Togli</button>
        </div>
      ))}
      <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una risposta" disabled={disabilitato}
        onClick={() => onCambia([...risposte, { ordine: risposte.length + 1, testo: '' }])} />
    </fieldset>
  );
}

/** Le voci dell'elenco più, in testa, il valore corrente se non è fra quelle. */
function opzioniCon(opzioni: Record<string, string>, valore: string) {
  const voci = Object.entries(opzioni).map(([chiave, nome]) => ({ chiave, nome }));
  return valore && !(valore in opzioni) ? [{ chiave: valore, nome: valore }, ...voci] : voci;
}

function Generico({ tipo, dati, imposta, disabilitato }: PropsModulo & { tipo: 'domanda' | 'cruciverba' }) {
  return (
    <div className="flex flex-col gap-3">
      <Griglia>
        {CAMPI_GENERICI[tipo].map((c) => c.opzioni
          // un valore salvato fuori dall'elenco («Prof. Kawakami (bonus su Ann)») resta visibile e scelto, non sparisce
          ? <Blocco key={c.nome}><Selettore etichetta={c.etichetta} valore={testoDi(dati[c.nome])} vuoto={c.vuoto} ricerca="mai" disabilitato={disabilitato} opzioni={opzioniCon(c.opzioni, testoDi(dati[c.nome]))} onCambia={(k) => imposta({ [c.nome]: k })} /></Blocco>
          : <Campo key={c.nome} nome={c.nome} etichetta={c.etichetta} tipo={c.tipo} aiuto={c.aiuto} dati={dati} imposta={imposta} disabilitato={disabilitato} />)}
      </Griglia>
      {tipo === 'domanda' && <EditorRisposte risposte={dati.risposte_json as Risposta[]} onCambia={(r) => imposta({ risposte_json: r })} disabilitato={disabilitato} />}
    </div>
  );
}

export function ModuloDomanda(p: PropsModulo) { return <Generico tipo="domanda" {...p} />; }
export function ModuloCruciverba(p: PropsModulo) { return <Generico tipo="cruciverba" {...p} />; }
