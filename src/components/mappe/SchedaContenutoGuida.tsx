import { useState } from 'react';
import type { SchedaContenutoGuidaDto } from '../../../shared/organizzazioneMappe';
import { aggiornaSpillo, aggiungiImmagineSpillo, aggiornaImmagineSpillo, eliminaImmagineSpillo, impostaSpilloRaccolto, impostaStatoPunto, impostaAcquisto } from '../../services/api';
import { CondizioniEditor } from '../guida/CondizioniEditor';
import { SchedaSpillo } from './VisoreMappa';

export function SchedaContenutoGuida({ spillo, partitaId, onChiudi, onCambiato }: { spillo: SchedaContenutoGuidaDto; partitaId: number | null; onChiudi: () => void; onCambiato: () => Promise<void> }) {
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [modifica, setModifica] = useState(false);
  const esegui = async (azione: () => Promise<unknown>) => {
    setOccupato(true); setErrore(null);
    try { await azione(); await onCambiato(); }
    catch (e) { setErrore(e instanceof Error ? e.message : 'Operazione non riuscita.'); }
    finally { setOccupato(false); }
  };
  return <div>
    {errore && <p role="alert">{errore}</p>}
    <SchedaSpillo spillo={spillo} partitaId={partitaId} occupato={occupato} nonSpaziale onChiudi={onChiudi}
      onRaccolto={(s, valore) => esegui(() => impostaSpilloRaccolto(partitaId!, s.id, valore))}
      onStatoPunto={(s, stato) => esegui(() => impostaStatoPunto(partitaId!, s.dettaglio!.punto!.chiave, stato))}
      onAcquisto={(_s, articolo, fatto) => esegui(() => impostaAcquisto(partitaId!, articolo, fatto))} />
    <button type="button" className="btn" disabled={occupato} onClick={() => setModifica(v => !v)}>{modifica ? 'Chiudi modifica' : 'Modifica contenuto'}</button>
    {modifica && <EditorContenuto key={spillo.id} spillo={spillo} occupato={occupato} esegui={esegui} />}
  </div>;
}

function EditorContenuto({ spillo, occupato, esegui }: { spillo: SchedaContenutoGuidaDto; occupato: boolean; esegui: (azione: () => Promise<unknown>) => Promise<void> }) {
  const [nome, setNome] = useState(spillo.nome);
  const [descrizione, setDescrizione] = useState(spillo.descrizione);
  const [collezionabile, setCollezionabile] = useState(spillo.collezionabile);
  const [condizioni, setCondizioni] = useState<import('../../../shared/condizioniSpillo').RequisitoSpillo[]>(spillo.condizioni);
  return <form aria-label="Modifica contenuto della guida" onSubmit={e => { e.preventDefault(); void esegui(() => aggiornaSpillo(spillo.id, { nome, descrizione, collezionabile, condizioni })); }}>
    <fieldset disabled={occupato} className="flex flex-col gap-3">
      <label>Nome<input className="form-input" required value={nome} onChange={e => setNome(e.target.value)} /></label>
      <label>Descrizione<textarea className="form-input" value={descrizione} onChange={e => setDescrizione(e.target.value)} /></label>
      <label><input type="checkbox" checked={collezionabile} onChange={e => setCollezionabile(e.target.checked)} /> Collezionabile</label>
      <CondizioniEditor condizioni={condizioni} onCambia={setCondizioni} disabilitato={occupato} />
      <button className="btn" type="submit">Salva contenuto</button>
      <label>Aggiungi immagine<input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) void esegui(() => aggiungiImmagineSpillo(spillo.id, f)); e.target.value = ''; }} /></label>
      {spillo.immagini.map(i => <div key={i.id}>
        <label>Didascalia<input className="form-input" defaultValue={i.didascalia} onBlur={e => { if (e.target.value !== i.didascalia) void esegui(() => aggiornaImmagineSpillo(i.id, { didascalia: e.target.value })); }} /></label>
        <button type="button" onClick={() => void esegui(() => eliminaImmagineSpillo(i.id))}>Rimuovi immagine</button>
      </div>)}
    </fieldset>
  </form>;
}
