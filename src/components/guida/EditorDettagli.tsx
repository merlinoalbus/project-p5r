// ============================================================
// EditorDettagli — i dettagli di una voce della guida si correggono (2026-10-18)
// ============================================================
//
// Segnalazione dell'utente: «ci sono elementi non modificabili come questo Contenuto...». I dettagli (contenuto, debolezze,
// resistenze, note…) vengono dall'importazione della guida e si vedevano soltanto; scelta dell'utente «Renderli modificabili»:
// nella «Modifica» della voce sono righe etichetta → testo, che si correggono, si tolgono o si aggiungono. Un elenco si scrive
// separato da virgole e torna un elenco; un numero torna un numero; una riga non toccata torna identica; una tabella resta com'è e si
// può solo togliere. La `maschera` di una Persona non compare: la decide la Persona del compendio.
// ============================================================

import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { IconaAzione } from '../shared/IconaAzione';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { etichetteRipetute, type RigaDettaglio } from '../../utils/dettagliVoce';

/** L'editor: le righe (in JSON, perché il modulo della correzione tiene solo testi) e la loro modifica. */
export function EditorDettagli({ valore, onCambia, nascosti = [] }: { valore: string; onCambia: (v: string) => void; nascosti?: readonly string[] }) {
  const righe = JSON.parse(valore) as RigaDettaglio[];
  const cambia = (nuove: RigaDettaglio[]) => onCambia(JSON.stringify(nuove));
  const ripetute = etichetteRipetute(righe);
  const aggiorna = (i: number, parte: Partial<RigaDettaglio>) => cambia(righe.map((r, j) => (j === i ? { ...r, ...parte } : r)));
  // le righe nascoste (le affinità di una Persona collegata al compendio) restano nei dati com'erano: qui non si vedono e non si toccano
  const visibili = righe.map((r, i) => ({ r, i })).filter(({ r }) => !nascosti.includes(r.chiave));
  return (
    <fieldset className="m-0 flex w-full flex-col gap-2 border-0 p-0 text-[12px]">
      <legend className="mb-1 p-0">Dettagli</legend>
      {visibili.length === 0 && <p className="m-0 text-text-muted">Nessun dettaglio.</p>}
      {ripetute.length > 0 && <p className="m-0 text-error" role="alert">Etichetta ripetuta: {ripetute.join(', ')}. Cambiala per salvare.</p>}
      {visibili.map(({ r, i }) => (
        <div key={i} className="flex flex-wrap items-start gap-2 rounded-md bg-white/[0.03] p-1.5" role="group" aria-label={`Dettaglio ${r.etichetta || i + 1}`}>
          <label className="flex w-full flex-col gap-1 sm:w-[170px]">
            Etichetta
            <input className="form-input" value={r.etichetta} maxLength={LIMITI_GUIDA.punto.etichetta} onChange={(e) => aggiorna(i, { etichetta: e.target.value })} />
          </label>
          {r.forma === 'tabella' || r.forma === 'altro'
            ? <p className="m-0 min-w-[180px] flex-1 self-center text-text-muted">{r.forma === 'tabella' ? `Tabella della guida (${Array.isArray(r.originale) ? r.originale.length : 0} righe)` : 'Valore della guida'}: resta com’è.</p>
            : <label className="flex min-w-[180px] flex-1 flex-col gap-1">
              {r.forma === 'elenco' ? 'Testo (elenco, separato da virgole)' : 'Testo'}
              <textarea className="form-input min-h-[44px]" rows={Math.min(6, Math.max(1, Math.ceil(r.testo.length / 60)))} value={r.testo} maxLength={LIMITI_GUIDA.punto.dettaglio} onChange={(e) => aggiorna(i, { testo: e.target.value })} />
            </label>}
          <PulsanteVisivo tono="fantasma" compatto className="self-end" icona={<IconaAzione chiave="chiudi" dimensione={18} />} titolo="Togli"
            aria-label={`Togli il dettaglio ${r.etichetta || i + 1}`} onClick={() => cambia(righe.filter((_, j) => j !== i))} />
        </div>
      ))}
      {righe.length < LIMITI_GUIDA.punto.dettagli && (
        <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={18} />} titolo="Aggiungi un dettaglio"
          onClick={() => cambia([...righe, { chiave: '', etichetta: '', testo: '', forma: 'testo' }])} />
      )}
    </fieldset>
  );
}
