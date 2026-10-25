// ============================================================
// DisponibilitaStrutturata — la disponibilità di un Confidente come dato strutturato (R9-01, F4)
// ============================================================
//
// La scheda mostra la struttura (come si incontra, giorni, fasce, eccezioni, «dal») e i luoghi per nome, non più il testo libero (che resta nelle note).
// L'editor scrive la struttura e i luoghi col PUT della rotta strutturata; «Ripristina» riporta la struttura alla fonte. Il vecchio editor delle informazioni
// continua a scrivere solo il testo e le note. Mai un blocco: l'esito «oggi» è un'informazione.
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { useCarica } from '../../hooks/useCarica';
import { getDisponibilitaStrutturata, getLuoghi, ripristinaDisponibilitaStrutturata, salvaDisponibilitaStrutturata } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';
import {
  FASCE_DISPONIBILITA, GIORNI_DISPONIBILITA, MODI_DISPONIBILITA,
  type DisponibilitaConfidenteDto, type DisponibilitaStrutturata as Struttura, type EccezioneDisponibilita, type FasciaDisponibilita, type GiornoDisponibilita, type ModoDisponibilita,
} from '../../../shared/disponibilitaStrutturata';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

const NOME_MODO: Record<ModoDisponibilita, string> = { settimanale: 'In certi giorni della settimana', 'su-messaggio': 'Su suo messaggio', 'stanza-velluto': 'Alla Stanza di Velluto', trama: 'Con la trama' };
const NOME_GIORNO: Record<GiornoDisponibilita, string> = { lun: 'lunedì', mar: 'martedì', mer: 'mercoledì', gio: 'giovedì', ven: 'venerdì', sab: 'sabato', dom: 'domenica', festivi: 'festivi' };
const NOME_FASCIA: Record<FasciaDisponibilita, string> = { giorno: 'di giorno', sera: 'di sera' };
const NOME_STATO: Record<string, string> = { disponibile: 'Disponibile adesso', 'non-disponibile': 'Non disponibile adesso', 'su-messaggio': 'Solo su suo messaggio', trama: 'Con la trama', sconosciuto: 'Non si sa se è disponibile adesso' };

const elenco = (voci: string[]): string => voci.length <= 1 ? voci.join('') : `${voci.slice(0, -1).join(', ')} e ${voci[voci.length - 1]}`;
const dataBreve = (mmgg: string): string => `${mmgg.slice(3)}/${mmgg.slice(0, 2)}`;

/** Un'eccezione in parole. */
function testoEccezione(e: EccezioneDisponibilita): string {
  if (e.tipo === 'pioggia') return e.ranghi?.length ? `Con la pioggia non si incontra ai ranghi ${elenco(e.ranghi.map(String))}` : 'Con la pioggia non è disponibile';
  if (e.tipo === 'dopo-rango') return `Non è disponibile nei ${e.giorni} giorni dopo un rango`;
  return `Al rango ${e.rango} solo ${elenco(e.fasce.map((f) => NOME_FASCIA[f]))}`;
}

/** La struttura in una frase per «Quando». */
function testoQuando(s: Struttura): string {
  if (s.modo !== 'settimanale') return NOME_MODO[s.modo];
  const giorni = s.giorni.length ? elenco(s.giorni.map((g) => NOME_GIORNO[g])) : 'giorni non indicati';
  const fasce = s.fasce.length && s.fasce.length < FASCE_DISPONIBILITA.length ? ` ${elenco(s.fasce.map((f) => NOME_FASCIA[f]))}` : '';
  return `${giorni[0]!.toUpperCase()}${giorni.slice(1)}${fasce}`;
}

/** La scheda: dove (luoghi per nome), quando (struttura), eccezioni, «dal» e se è disponibile adesso nella partita. */
export function DisponibilitaStrutturataScheda({ chiave, partita, versione, onModifica }: { chiave: string; partita?: number; versione: number; onModifica: () => void }) {
  const d = useCarica(() => getDisponibilitaStrutturata(chiave, partita), [chiave, partita, versione]);
  if (d.caricamento && !d.dati) return <p role="status" className="m-0 testo-13 text-text-muted">Un attimo…</p>;
  if (d.errore || !d.dati) return <p role="alert" className="m-0 testo-13 text-error">{d.errore ?? 'Disponibilità non disponibile.'}</p>;
  const { struttura: s, luoghi, oggi, modificata } = d.dati;
  return (
    <div className="flex flex-col gap-1 testo-13 text-text-secondary">
      <span><strong className="text-text">Dove:</strong> {luoghi.length ? luoghi.map((l) => l.nome).join(', ') : (s.motivoSenzaLuogo || '—')}</span>
      <span><strong className="text-text">Quando:</strong> {testoQuando(s)}{s.dal ? ` · dal ${dataBreve(s.dal)}` : ''}</span>
      {s.eccezioni.length > 0 && <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5">{s.eccezioni.map((e, i) => <li key={i}>{testoEccezione(e)}</li>)}</ul>}
      {oggi && <span><span className={`chip ${oggi.stato === 'disponibile' ? 'chip--attivo' : ''}`} title={oggi.motivo}>{NOME_STATO[oggi.stato] ?? oggi.stato}</span> <span className="text-text-muted">{oggi.motivo}</span></span>}
      {!IN_RILASCIO && <span className="flex flex-wrap items-center gap-2">
        <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica la disponibilità" onClick={onModifica} />
        {modificata && <span className="chip" title="La struttura è stata cambiata rispetto alla fonte">Modificata</span>}
      </span>}
    </div>
  );
}

/** «Quando» di un Confidente in una riga (struttura, «dal», eccezioni brevi) e, con la partita, se è disponibile adesso: per la scheda del luogo, dove si elencano i Confidenti che vi si incontrano. */
export function QuandoConfidente({ chiave, partita }: { chiave: string; partita?: number }) {
  const d = useCarica(() => getDisponibilitaStrutturata(chiave, partita), [chiave, partita]);
  if (!d.dati) return d.errore ? null : <span className="testo-12 text-text-muted">…</span>;
  const { struttura: s, oggi } = d.dati;
  return (
    <span className="flex flex-wrap items-center gap-1.5 testo-12 text-text-secondary">
      <span>{testoQuando(s)}{s.dal ? ` · dal ${dataBreve(s.dal)}` : ''}{s.eccezioni.length > 0 ? ` · ${s.eccezioni.map(testoEccezione).join(' · ')}` : ''}</span>
      {oggi && oggi.stato !== 'sconosciuto' && <span className={`chip testo-12 ${oggi.stato === 'disponibile' ? 'chip--attivo' : ''}`} title={oggi.motivo}>{NOME_STATO[oggi.stato] ?? oggi.stato}</span>}
    </span>
  );
}

const uguali = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** L'editor: struttura e luoghi, salvati col PUT; «Ripristina» riporta la struttura alla fonte. Nel rilascio (sola lettura) non esiste (costante di build). */
export const EditorDisponibilitaStrutturata: StrumentoDiModifica<typeof EditorDisponibilitaStrutturataReale> = IN_RILASCIO ? NienteInRilascio : EditorDisponibilitaStrutturataReale;
function EditorDisponibilitaStrutturataReale({ chiave, nome, onChiudi, onSalvato }: { chiave: string; nome: string; onChiudi: () => void; onSalvato: () => void | Promise<void> }) {
  const d = useCarica(() => getDisponibilitaStrutturata(chiave), [chiave]);
  const tuttiILuoghi = useCarica(() => getLuoghi(), []);
  return (
    <Modal titolo={`Disponibilità di ${nome}`} aperta onChiudi={onChiudi} larga>
      {d.errore && <p role="alert" className="m-0 text-error">{d.errore}</p>}
      {!d.dati && !d.errore && <p role="status" className="m-0">Un attimo…</p>}
      {d.dati && <Corpo dati={d.dati} tutti={tuttiILuoghi.dati ?? []} chiave={chiave} onChiudi={onChiudi} onSalvato={onSalvato} />}
    </Modal>
  );
}

function Corpo({ dati, tutti, chiave, onChiudi, onSalvato }: { dati: DisponibilitaConfidenteDto; tutti: Array<{ chiave: string; nome: string; quartiereNome: string }>; chiave: string; onChiudi: () => void; onSalvato: () => void | Promise<void> }) {
  const partenza = dati.struttura;
  const [modo, setModo] = useState<ModoDisponibilita>(partenza.modo);
  const [giorni, setGiorni] = useState<GiornoDisponibilita[]>(partenza.giorni);
  const [fasce, setFasce] = useState<FasciaDisponibilita[]>(partenza.fasce);
  const [eccezioni, setEccezioni] = useState<EccezioneDisponibilita[]>(partenza.eccezioni);
  const [dal, setDal] = useState(partenza.dal ?? '');
  const [motivo, setMotivo] = useState(partenza.motivoSenzaLuogo);
  const [luoghi, setLuoghi] = useState<string[]>(dati.luoghi.map((l) => l.chiave));
  const [occupato, setOccupato] = useState(false);
  const nomeLuogo = (k: string) => dati.luoghi.find((l) => l.chiave === k)?.nome ?? tutti.find((l) => l.chiave === k)?.nome ?? k;
  const dalValido = dal === '' || /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(dal);
  const sporca = modo !== partenza.modo || !uguali(giorni, partenza.giorni) || !uguali(fasce, partenza.fasce) || !uguali(eccezioni, partenza.eccezioni)
    || dal !== (partenza.dal ?? '') || motivo !== partenza.motivoSenzaLuogo || !uguali(luoghi, dati.luoghi.map((l) => l.chiave));
  useBozzaSporca(`disponibilita:${chiave}`, 'la disponibilità del Confidente', sporca);
  const alterna = <T,>(lista: T[], v: T): T[] => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);
  const ordinati = <T,>(lista: T[], ordine: readonly T[]): T[] => ordine.filter((x) => lista.includes(x));

  const esegui = async (azione: () => Promise<DisponibilitaConfidenteDto>, esito: string) => {
    setOccupato(true);
    try { await azione(); notifica('success', esito); await onSalvato(); onChiudi(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.'); }
    finally { setOccupato(false); }
  };
  const salva = () => esegui(() => salvaDisponibilitaStrutturata(chiave, { modo, giorni, fasce, eccezioni, dal: dal === '' ? null : dal, motivoSenzaLuogo: motivo, luoghi }), 'Disponibilità salvata.');
  const modificaEccezione = (i: number, e: EccezioneDisponibilita) => setEccezioni((l) => l.map((x, j) => (j === i ? e : x)));
  const luoghiAggiungibili = tutti.filter((l) => !luoghi.includes(l.chiave)).map((l) => ({ chiave: l.chiave, nome: l.nome, dettaglio: l.quartiereNome }));

  return (
    <div className="flex flex-col gap-3 testo-13">
      <Selettore etichetta="Come si incontra" valore={modo} opzioni={MODI_DISPONIBILITA.map((m) => ({ chiave: m, nome: NOME_MODO[m] }))} onCambia={(v) => setModo(v as ModoDisponibilita)} disabilitato={occupato} />
      {modo === 'settimanale' && (
        <>
          <fieldset className="m-0 flex flex-col gap-1 border-0 p-0"><legend className="p-0 text-text-secondary">Giorni</legend>
            <div className="flex flex-wrap gap-1.5">{GIORNI_DISPONIBILITA.map((g) => <button key={g} type="button" aria-pressed={giorni.includes(g)} disabled={occupato} className={`chip touch ${giorni.includes(g) ? 'chip--attivo' : ''}`} onClick={() => setGiorni(ordinati(alterna(giorni, g), GIORNI_DISPONIBILITA))}>{NOME_GIORNO[g]}</button>)}</div>
          </fieldset>
          <fieldset className="m-0 flex flex-col gap-1 border-0 p-0"><legend className="p-0 text-text-secondary">Fasce (nessuna = tutte)</legend>
            <div className="flex flex-wrap gap-1.5">{FASCE_DISPONIBILITA.map((f) => <button key={f} type="button" aria-pressed={fasce.includes(f)} disabled={occupato} className={`chip touch ${fasce.includes(f) ? 'chip--attivo' : ''}`} onClick={() => setFasce(ordinati(alterna(fasce, f), FASCE_DISPONIBILITA))}>{NOME_FASCIA[f]}</button>)}</div>
          </fieldset>
        </>
      )}
      <label className="flex flex-col gap-1">Disponibile dal (MM-GG, facoltativo)
        <input className="form-input" value={dal} maxLength={5} placeholder="05-18" disabled={occupato} onChange={(e) => setDal(e.target.value)} aria-invalid={!dalValido} />
        {!dalValido && <span className="text-error">Scrivi mese e giorno come 05-18.</span>}
      </label>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0"><legend className="p-0 text-text-secondary">Eccezioni</legend>
        {eccezioni.length === 0 && <span className="text-text-muted">Nessuna eccezione.</span>}
        {eccezioni.map((e, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded border border-border px-2 py-1">
            <span className="min-w-0 flex-1 break-words">{testoEccezione(e)}</span>
            {e.tipo === 'dopo-rango' && <label className="flex items-center gap-1">giorni <input className="form-input w-16" type="number" min={1} max={30} value={e.giorni} disabled={occupato} onChange={(ev) => modificaEccezione(i, { ...e, giorni: Math.min(30, Math.max(1, Math.trunc(Number(ev.target.value)) || 1)) })} /></label>}
            {e.tipo === 'fascia-rango' && <>
              <label className="flex items-center gap-1">rango <input className="form-input w-16" type="number" min={1} max={10} value={e.rango} disabled={occupato} onChange={(ev) => modificaEccezione(i, { ...e, rango: Math.min(10, Math.max(1, Math.trunc(Number(ev.target.value)) || 1)) })} /></label>
              {FASCE_DISPONIBILITA.map((f) => <button key={f} type="button" aria-pressed={e.fasce.includes(f)} disabled={occupato} className={`chip touch ${e.fasce.includes(f) ? 'chip--attivo' : ''}`} onClick={() => { const prossime = ordinati(alterna(e.fasce, f), FASCE_DISPONIBILITA); if (prossime.length > 0) modificaEccezione(i, { ...e, fasce: prossime }); }}>{NOME_FASCIA[f]}</button>)}
            </>}
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" disabled={occupato} onClick={() => setEccezioni((l) => l.filter((_, j) => j !== i))} />
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <PulsanteVisivo compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi: non con la pioggia" disabled={occupato || eccezioni.some((e) => e.tipo === 'pioggia')} onClick={() => setEccezioni((l) => [...l, { tipo: 'pioggia', effetto: 'non-disponibile' }])} />
          <PulsanteVisivo compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi: giorni dopo un rango" disabled={occupato || eccezioni.some((e) => e.tipo === 'dopo-rango')} onClick={() => setEccezioni((l) => [...l, { tipo: 'dopo-rango', giorni: 2, effetto: 'non-disponibile' }])} />
          <PulsanteVisivo compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi: fascia a un rango" disabled={occupato} onClick={() => setEccezioni((l) => [...l, { tipo: 'fascia-rango', rango: 1, fasce: ['sera'] }])} />
        </div>
      </fieldset>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0"><legend className="p-0 text-text-secondary">Luoghi</legend>
        {luoghi.length === 0 && <span className="text-text-muted">Nessun luogo.</span>}
        <ul className="m-0 flex list-none flex-col gap-1 p-0">{luoghi.map((k) => (
          <li key={k} className="flex min-w-0 items-center gap-2"><span className="min-w-0 flex-1 break-words">{nomeLuogo(k)}</span>
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" disabled={occupato} onClick={() => setLuoghi((l) => l.filter((x) => x !== k))} /></li>
        ))}</ul>
        <Selettore etichetta="Aggiungi un luogo" valore="" vuoto="Scegli un luogo" opzioni={luoghiAggiungibili} onCambia={(k) => { if (k) setLuoghi((l) => (l.includes(k) ? l : [...l, k])); }} disabilitato={occupato || luoghiAggiungibili.length === 0} />
      </fieldset>
      {luoghi.length === 0 && (
        <label className="flex flex-col gap-1">Perché non ha un luogo
          <input className="form-input" value={motivo} maxLength={500} disabled={occupato} onChange={(e) => setMotivo(e.target.value)} />
        </label>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {dati.modificata && <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Ripristina la struttura" disabled={occupato} onClick={() => void esegui(() => ripristinaDisponibilitaStrutturata(chiave), 'Struttura ripristinata come nella fonte.')} />}
        <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={onChiudi}>Annulla</button>
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Salva" disabled={occupato || !sporca || !dalValido} onClick={() => void salva()} />
      </div>
    </div>
  );
}
