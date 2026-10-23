import { useState } from 'react';
import type { AnteprimaPianoTanakaDto, RicevutaTanakaDto, RigaPianoTanakaDto, ValoriOffertaTanaka } from '../../../shared/tanakaDecisione';
import { confermaPianoTanaka, getDecisioniTanaka, getPianoTanaka, ripristinaDecisioneTanaka } from '../../services/api/catalogoOggetti';
import { useCarica } from '../../hooks/useCarica';
import { PageState } from '../shared/PageState';
import { Modal } from '../shared/Modal';
import { notifica } from '../../stores/notificationStore';
import { descriviRequisitoSpillo, normalizzaCondizioniSpillo } from '../../../shared/condizioniSpillo';

const yen = (n: number | null) => n === null ? 'prezzo non indicato' : `${n.toLocaleString('it-IT')} ¥`;
const DESTINAZIONE: Record<RigaPianoTanakaDto['destinazione'], string> = { aggiorna: 'Chiave conservata, valori Royal', crea: 'Nuova offerta Royal', nascondi: 'Nascosta, conservata nell’archivio' };
/** Le condizioni dell'offerta in parole (il grado cliente); «nessun grado» se non ce ne sono. */
function grado(json: string | null): string {
  let v: unknown;
  try { v = json ? JSON.parse(json) : []; } catch { return 'condizioni illeggibili'; }
  const c = normalizzaCondizioniSpillo(v);
  return c.length ? c.map((x) => descriviRequisitoSpillo(x)).join(' · ') : 'nessun grado';
}
/** Un'offerta in una riga: nome, prezzo, grado, oggetto del catalogo. */
function Valori({ v }: { v: ValoriOffertaTanaka | null }) {
  if (!v) return <span className="text-text-secondary">non c’è</span>;
  return <span className="break-words">{v.nome || '—'} · {yen(v.prezzo)} · {grado(v.condizioniJson)}{v.nascosto ? ' · nascosta' : ''}
    <code className="block break-all text-[11px]">{v.catalogo ?? 'nessun oggetto del catalogo'}</code></span>;
}
/** Un identificativo nuovo per ogni gesto: la ripetizione della stessa richiesta resta idempotente. */
const nuovoId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

/**
 * L7-TANAKA: la decisione unitaria del listino di Tanaka. L'anteprima mostra la destinazione di ogni riga (10 chiavi conservate, 8 nuove,
 * 10 nascoste) e i blocchi; la conferma è un gesto dell'utente, sull'elenco mostrato (le revisioni dell'anteprima fanno da controllo).
 * Le decisioni registrate hanno la ricevuta, l'archivio delle 20 offerte di prima e il ripristino unitario.
 */
export function DecisioneTanaka({ onCambiato }: { onCambiato: () => void }) {
  const piano = useCarica(getPianoTanaka, []);
  const decisioni = useCarica(getDecisioniTanaka, []);
  const ricarica = () => { void piano.ricarica(); void decisioni.ricarica(); onCambiato(); };
  return <section className="flex min-w-0 flex-col gap-3 border-t border-border pt-3" aria-label="Decisione unitaria Tanaka">
    <h3 className="m-0">Decisione unitaria · 20 correnti → 18 Royal</h3>
    <PageState isLoading={piano.caricamento && !piano.dati} error={piano.errore} onRetry={() => void piano.ricarica()}>
      {piano.dati && <Anteprima p={piano.dati} onConfermato={ricarica} />}
    </PageState>
    {!!decisioni.dati?.length && <section className="flex min-w-0 flex-col gap-2"><h4 className="m-0">Decisioni registrate</h4>
      {decisioni.dati.map((d) => <Ricevuta key={d.operazioneId} d={d} onRipristinato={ricarica} />)}</section>}
  </section>;
}

function Anteprima({ p, onConfermato }: { p: AnteprimaPianoTanakaDto; onConfermato: () => void }) {
  const [aperta, setAperta] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  const conferma = async (operazioneId: string) => {
    setOccupato(true);
    try {
      await confermaPianoTanaka({ operazioneId, revisioneConfronto: p.revisioneConfronto, revisionePiano: p.revisionePiano });
      setAperta(null); notifica('success', 'Decisione Tanaka applicata: la ricevuta è qui sotto.'); onConfermato();
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Conferma non riuscita: nessuna offerta è stata modificata.'); }
    finally { setOccupato(false); }
  };
  const k = p.conteggi;
  return <div className="flex min-w-0 flex-col gap-2">
    <p className="m-0">Delle {k.correnti} offerte correnti: {k.aggiorna} conservano la chiave e prendono i valori Royal, {k.nascondi} senza riscontro si nascondono (restano nell’archivio con i loro prezzi); {k.crea} offerte Royal sono nuove. Dopo: {k.attiveDopo} offerte attive. Acquisti, Diario, Doti e yen non cambiano.</p>
    {p.noteStoriche.map((n) => <p key={`${n.id}:${n.legame}`} className="m-0 text-[12px]"><strong>Nota storica della fonte ({n.legame}). </strong>{n.testo} <span className="text-text-secondary">Fonte: {n.fonte}</span></p>)}
    <ul className="m-0 flex list-none flex-col gap-2 p-0">{p.righe.map((r) => <li key={r.chiave} className="min-w-0 border-t border-border pt-2 text-[13px]">
      <strong>{DESTINAZIONE[r.destinazione]}</strong> · <span className="text-text-secondary">{r.rapporto}</span>
      <code className="block break-all text-[11px]">{r.chiave}</code>
      <div className="grid min-w-0 gap-1 sm:grid-cols-2"><div className="min-w-0"><span className="text-text-secondary">Prima: </span><Valori v={r.prima} /></div>
        <div className="min-w-0"><span className="text-text-secondary">Dopo: </span><Valori v={r.dopo} /></div></div>
    </li>)}</ul>
    {p.blocchi.length > 0 && <div role="alert" className="flex flex-col gap-1 text-warning"><strong>Il piano non si può applicare adesso:</strong>
      {p.blocchi.map((b) => <span key={b} className="text-[12px] break-words">{b}</span>)}</div>}
    <button type="button" className="btn btn-primary touch self-start" disabled={!p.applicabile} onClick={() => setAperta(nuovoId())}>Conferma la decisione</button>
    <p className="m-0 break-all text-[11px]">Revisione del piano: {p.revisionePiano}</p>
    {aperta && <Modal aperta titolo="Confermi la decisione Tanaka?" onChiudi={() => { if (!occupato) setAperta(null); }} azioni={<>
      <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={() => setAperta(null)}>Annulla</button>
      <button type="button" className="btn btn-primary touch" disabled={occupato} onClick={() => void conferma(aperta)}>Confermo</button>
    </>}>
      <p className="m-0">Il listino di Tanaka diventa quello Royal dell’elenco mostrato: {k.aggiorna} offerte aggiornate, {k.crea} nuove, {k.nascondi} nascoste. Se nel frattempo qualcosa è cambiato, non viene applicato niente.</p>
      <p className="m-0 mt-2 text-sm">Le offerte di prima restano nell’archivio della ricevuta; la decisione si può ripristinare finché le offerte non vengono corrette o usate.</p>
    </Modal>}
  </div>;
}

function Ricevuta({ d, onRipristinato }: { d: RicevutaTanakaDto; onRipristinato: () => void }) {
  const [aperta, setAperta] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  const ripristina = async (operazioneId: string) => {
    setOccupato(true);
    try {
      await ripristinaDecisioneTanaka(d.operazioneId, { operazioneId, revisioneStato: d.revisioneStato });
      setAperta(null); notifica('success', 'Decisione Tanaka ripristinata: le offerte sono tornate come prima.'); onRipristinato();
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Ripristino non riuscito: nessuna offerta è stata modificata.'); }
    finally { setOccupato(false); }
  };
  return <div className="min-w-0 border-t border-border pt-2 text-[13px]">
    <strong>{d.stato === 'attiva' ? 'Applicata' : 'Ripristinata'}</strong> · {new Date(d.confermataIl).toLocaleString('it-IT')}
    {d.ripristino && <span> · ripristinata il {new Date(d.ripristino.ripristinataIl).toLocaleString('it-IT')}</span>}
    <code className="block break-all text-[11px]">Operazione {d.operazioneId}</code>
    <details><summary className="touch">Archivio delle {d.archivio.length} offerte di prima, con i loro prezzi</summary>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">{d.archivio.map((a) => <li key={a.chiave} className="break-words text-[12px]">
        <code className="break-all">{a.chiave}</code> · {String(a.riga?.nome_it ?? a.riga?.nome ?? 'assente')} · {yen(typeof a.riga?.prezzo === 'number' ? a.riga.prezzo : null)}</li>)}</ul>
    </details>
    {d.stato === 'attiva' && <button type="button" className="btn btn-secondary btn-sm touch mt-1" onClick={() => setAperta(nuovoId())}>Ripristina la decisione</button>}
    {aperta && <Modal aperta titolo="Ripristini la decisione Tanaka?" onChiudi={() => { if (!occupato) setAperta(null); }} azioni={<>
      <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={() => setAperta(null)}>Annulla</button>
      <button type="button" className="btn btn-primary touch" disabled={occupato} onClick={() => void ripristina(aperta)}>Ripristina</button>
    </>}>
      <p className="m-0">Le 20 offerte tornano come nell’archivio e le 8 nuove si tolgono. Se un’offerta è stata corretta dopo, o una nuova offerta è già usata, non si ripristina niente.</p>
    </Modal>}
  </div>;
}
