import { useLayoutEffect, useRef, useState } from 'react';
import type { AnteprimaOperazionePescaDto, FontePesca, NuovaSessionePesca, OsservazionePesca, RichiestaRegistraSessionePesca, SceltaTurnoPesca, SessionePescaDto } from '../../../shared/pesca';
import { leggiPesca, anteprimaPesca } from '../../services/api/pesca';
import { gestoPendenteNelloScope, useGestiPartita } from '../../services/gestiPartita';
import { useCarica } from '../../hooks/useCarica';
import { dataGiocoTesto } from '../../utils/dateGioco';
import { Selettore } from '../shared/Selettore';
import { GestiPartita } from '../partita/GestiPartita';
import { MomentoPescaForm } from './MomentoPescaForm';
import { OsservazionePescaForm } from './OsservazionePescaForm';
import { momentoPescaCompleto, osservazionePescaIgnota, type MomentoPescaInCompilazione } from '../../utils/pesca';
import { BeneficiPesca, ProfiliSessionePesca, RiepilogoOsservazionePesca } from './ProfiliPesca';

const nuovoId = () => crypto.randomUUID().replaceAll('-', '');
const testo = (e: unknown) => e instanceof Error ? e.message : 'Operazione non riuscita.';
const canonico = (v: unknown): unknown => Array.isArray(v) ? v.map(canonico) : v && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonico(x)])) : v;
const uguali = (a: unknown, b: unknown) => JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));

export function RiepilogoSessionePreparata({ richiesta: r, sessioneFotografata }: { richiesta: NuovaSessionePesca; sessioneFotografata?: SessionePescaDto }) {
  return <div className="flex min-w-0 flex-col gap-2 rounded border border-border p-2 text-[13px]">
    <strong>{r.scelta.tipo === 'nuova' ? 'Visita osservata da registrare' : 'Fonte da collegare alla visita esistente'}</strong>
    <span>{dataGiocoTesto(r.momento.giorno)} · {r.momento.fascia} · visita {r.momento.ordineVisita + 1} nella fascia.</span>
    <span>{r.turno.tipo === 'nuovo' ? 'Crea un solo nuovo turno.' : r.turno.tipo === 'esistente' ? `Collega il turno già registrato ${r.turno.ordine}; nessun incremento.` : 'Rappresenta una quota già compresa nel conteggio storico; nessun incremento.'}</span>
    {r.turno.tipo === 'esistente' && <code className="break-all text-[11px]">Fotografia del turno originale: {r.turno.firmaTurno}</code>}
    <span>Fonte nuova: {r.fonte.tipo === 'manuale' ? 'dichiarazione manuale' : 'voce del Diario'}.</span>
    {r.fonte.tipo === 'diario' && <code className="break-all text-[11px]">Voce {r.fonte.voceUid} · effetto {r.fonte.effettoUid}</code>}
    {r.scelta.tipo === 'collega' && <>
      <code className="break-all text-[11px]">Sessione scelta: {r.scelta.sessioneId}</code>
      {sessioneFotografata?.id === r.scelta.sessioneId ? <div className="flex min-w-0 flex-col gap-1">
        <strong>Fonti già collegate, fotografate dall’anteprima</strong>
        {!sessioneFotografata.fonti.length && <span>Nessuna fonte attiva nella fotografia.</span>}
        <ul className="m-0 pl-4">{sessioneFotografata.fonti.map(f => <li key={f.id} className="break-words">
          <code className="break-all">{f.id}</code> · {f.fonte.tipo === 'manuale' ? 'Manuale' : <span>Diario · voce <code className="break-all">{f.fonte.voceUid}</code> · effetto <code className="break-all">{f.fonte.effettoUid}</code> · generazione <code className="break-all">{f.generazione ?? 'non disponibile'}</code></span>}{f.orfana ? ' · riferimento mancante' : ''}
        </li>)}</ul>
      </div> : <p role="alert" className="m-0 text-warning">La fotografia delle fonti esistenti non è disponibile: rileggi l’anteprima prima del consenso.</p>}
    </>}
    <RiepilogoOsservazionePesca osservazione={r.osservazione} />
  </div>;
}

/** Prepara tutti i dati e il CAS; la prima spunta del Diario rimane nel gesto unico del genitore. */
export function PreparazioneSessionePesca({ partitaId, giorno, fascia, fonte, onConferma, onCambiato, onInvalidata,
  confermaScrive = true, titoloConferma = 'Registra la visita', invalidazioneAnteprima = 0,
}: {
  partitaId: number; giorno?: string; fascia?: 'giorno' | 'sera'; fonte: FontePesca;
  onConferma: (r: RichiestaRegistraSessionePesca) => Promise<unknown>;
  onCambiato?: () => void | Promise<void>; onInvalidata?: () => void;
  confermaScrive?: boolean; titoloConferma?: string; invalidazioneAnteprima?: number;
}) {
  const gesti = useGestiPartita();
  const registro = useCarica(() => leggiPesca(partitaId), [partitaId, gesti.versionePerPartita[partitaId] ?? 0, invalidazioneAnteprima]);
  const [momento, setMomento] = useState<MomentoPescaInCompilazione>(() => ({ giorno: giorno ?? '', fascia: fascia ?? '', ordineVisita: null }));
  const [osservazione, setOsservazione] = useState<OsservazionePesca>(() => osservazionePescaIgnota(giorno ?? ''));
  const [sessione, setSessione] = useState('');
  const [sceltaTurno, setSceltaTurno] = useState('');
  const [anteprima, setAnteprima] = useState<{ dto: AnteprimaOperazionePescaDto; richiesta: NuovaSessionePesca } | null>(null);
  const [occupato, setOccupato] = useState(false), [confermato, setConfermato] = useState(false), [attestato, setAttestato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [epocaAnteprima, setEpocaAnteprima] = useState(invalidazioneAnteprima);
  // Un rifiuto noto invalida il consenso firmato, conservando integralmente i campi osservati.
  if (epocaAnteprima !== invalidazioneAnteprima) {
    setEpocaAnteprima(invalidazioneAnteprima); setAnteprima(null); setAttestato(false); setConfermato(false); setErrore(null); setOccupato(false);
  }
  const blocco = useRef(false), vivo = useRef(true), contestoRef = useRef('');
  const contesto = JSON.stringify([partitaId, fonte, invalidazioneAnteprima]);
  useLayoutEffect(() => { vivo.current = true; contestoRef.current = contesto; return () => { vivo.current = false; contestoRef.current = ''; }; }, [contesto]);
  const attiva = () => vivo.current && contestoRef.current === contesto;
  const pendente = gestoPendenteNelloScope(partitaId, { pesca: true });
  const stato = registro.dati;
  const originale = stato?.sessioni.find(s => s.id === sessione);
  const sceltaFotografata = anteprima?.richiesta.scelta;
  const sessioneFotografata = sceltaFotografata?.tipo === 'collega' ? anteprima?.dto.stato.sessioni.find(s => s.id === sceltaFotografata.sessioneId) : undefined;
  const disabilitato = occupato || confermato || !!pendente || !!anteprima || !stato || registro.caricamento || !!registro.errore;
  const turno = (): SceltaTurnoPesca | null => {
    if (!stato) return null;
    if (originale) {
      if (originale.turno.revocato || !originale.turno.firma) return null;
      return originale.turno.origine === 'quota-storica' ? { tipo: 'contatore-storico', firmaContatore: originale.turno.firma }
        : { tipo: 'esistente', ordine: originale.turno.ordine, firmaTurno: originale.turno.firma };
    }
    if (sceltaTurno === 'nuovo') return { tipo: 'nuovo' };
    if (sceltaTurno === 'storico' && stato.contatore.quoteNonRappresentate > 0) return { tipo: 'contatore-storico', firmaContatore: stato.contatore.firma };
    const t = stato.contatore.turni.find(t => `turno:${t.firma}` === sceltaTurno && t.raccordatoASessione === null);
    return t ? { tipo: 'esistente', ordine: t.ordine, firmaTurno: t.firma } : null;
  };
  const invalida = () => { setAnteprima(null); setAttestato(false); setErrore(null); };
  const prepara = async () => {
    const t = turno();
    if (blocco.current || disabilitato || !momentoPescaCompleto(momento) || !t || stato?.regola.stato !== 'collegata') return;
    blocco.current = true; setOccupato(true); setErrore(null);
    const r: NuovaSessionePesca = { operazioneId: nuovoId(), momento: { ...momento }, fonte: { ...fonte },
      scelta: sessione ? { tipo: 'collega', sessioneId: sessione } : { tipo: 'nuova' }, turno: t, osservazione: structuredClone(osservazione) };
    try {
      const dto = await anteprimaPesca(partitaId, { azione: 'registra-sessione', bersaglio: null, richiesta: r });
      if (dto.azione !== 'registra-sessione' || !uguali(dto.richiesta, r) || dto.stato.partitaId !== partitaId) throw new Error('L’anteprima non coincide con la visita e la fonte richieste: nessuna conferma consentita.');
      if (r.scelta.tipo === 'collega') {
        const sessioneId = r.scelta.sessioneId;
        if (!dto.stato.sessioni.some(s => s.id === sessioneId)) throw new Error('L’anteprima non contiene la fotografia della visita scelta: nessuna conferma consentita.');
      }
      if (attiva()) setAnteprima({ dto, richiesta: r });
    } catch (e) { if (attiva()) setErrore(testo(e)); }
    finally { blocco.current = false; if (attiva()) setOccupato(false); }
  };
  const conferma = async () => {
    if (blocco.current || !anteprima || !attestato || confermato || pendente || !attiva()) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    let acquisita = false;
    try {
      await onConferma({ ...anteprima.richiesta, revisionePescaAttesa: anteprima.dto.revisionePescaAttesa });
      acquisita = true;
      if (attiva()) { setConfermato(true); await onCambiato?.(); }
    } catch (e) {
      if (attiva()) {
        setErrore(acquisita ? `Operazione acquisita; aggiornamento della vista non riuscito: ${testo(e)}` : testo(e));
        if (!acquisita && !gestoPendenteNelloScope(partitaId, { pesca: true })) { invalida(); setErrore(testo(e)); await registro.ricarica(); }
      }
    } finally { blocco.current = false; if (attiva()) setOccupato(false); }
  };
  return <div className="flex min-w-0 flex-col gap-3 text-[13px]">
    {confermaScrive && <GestiPartita partitaId={partitaId} onCambiato={async (id, recupero) => {
      if (!attiva()) return;
      const r = anteprima?.richiesta;
      const proprioSuccesso = id === partitaId && r && recupero?.operazioneId === r.operazioneId
        && recupero.payload.tipo === 'pesca' && recupero.payload.dati.azione === 'registra-sessione'
        && uguali(recupero.payload.dati.richiesta, r) && recupero.ricevuta && 'sessioneId' in recupero.ricevuta
        && recupero.ricevuta.azione === 'registra-sessione' && recupero.ricevuta.operazioneId === r.operazioneId
        && recupero.ricevuta.partitaId === partitaId && uguali(recupero.ricevuta.richiesta, r);
      if (proprioSuccesso) { setConfermato(true); setErrore(null); }
      else invalida();
      await registro.ricarica();
      if (attiva()) await onCambiato?.();
    }} />}
    <p className="m-0">Una visita corrisponde a un solo turno. Le vecchie visite non diventano catture; il collegamento a un turno o a una quota storica non aumenta il conteggio.</p>
    {registro.caricamento && !stato && <p role="status">Leggo visite e turni…</p>}
    {registro.errore && <p role="alert" className="m-0 text-error">{registro.errore}<button type="button" className="btn btn-ghost touch" onClick={() => void registro.ricarica()}>Rileggi</button></p>}
    {stato?.regola.stato !== 'collegata' && stato && <p role="alert" className="m-0 text-warning">La regola pesca non è collegata integralmente: {stato.regola.motivi.join(' ')} Nessuna visita viene registrata da questo modulo.</p>}
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0" disabled={disabilitato}>
      <Selettore etichetta="Visita da registrare" valore={sessione} disabilitato={disabilitato}
        opzioni={[{ chiave: '', nome: 'Una nuova visita osservata' }, ...(stato?.sessioni ?? []).map(s => ({ chiave: s.id, nome: `${dataGiocoTesto(s.momento.giorno)} · ${s.momento.fascia} · visita ${s.momento.ordineVisita + 1}${s.orfana ? ' · riferimento mancante' : ''}`, dettaglio: s.attiva ? 'Con fonti attive' : 'Senza fonti attive' }))]}
        onCambia={v => {
          invalida(); setSessione(v);
          const s = stato?.sessioni.find(s => s.id === v);
          if (s) { setMomento({ ...s.momento }); setOsservazione(structuredClone(s.osservazione.dati)); }
          else { setMomento({ giorno: giorno ?? '', fascia: fascia ?? '', ordineVisita: null }); setOsservazione(osservazionePescaIgnota(giorno ?? '')); }
          setSceltaTurno('');
        }} />
      <MomentoPescaForm valore={momento} disabilitato={disabilitato || !!sessione} onCambia={m => {
        invalida(); setMomento(m); setOsservazione(o => ({ ...o, fortuna: { giorno: m.giorno, attiva: o.fortuna.giorno === m.giorno ? o.fortuna.attiva : null } }));
      }} />
      {!sessione && <Selettore etichetta="Rapporto con il conteggio esistente" valore={sceltaTurno} vuoto="Dichiara il rapporto" disabilitato={disabilitato}
        opzioni={[{ chiave: 'nuovo', nome: 'Visita ulteriore: crea un nuovo turno' },
          ...(stato?.contatore.turni ?? []).filter(t => t.raccordatoASessione === null).map(t => ({ chiave: `turno:${t.firma}`, nome: `Turno già registrato ${t.ordine}`, dettaglio: `${t.attivita} · nessun incremento` })),
          ...((stato?.contatore.quoteNonRappresentate ?? 0) > 0 ? [{ chiave: 'storico', nome: 'Quota già compresa nel vecchio conteggio', dettaglio: 'Nessun incremento' }] : [])]}
        onCambia={v => { invalida(); setSceltaTurno(v); }} />}
      {sessione && !turno() && <p role="alert" className="m-0 text-warning">Il turno originale non è disponibile o è stato revocato. Il collegamento non ricrea il passato.</p>}
      <OsservazionePescaForm valore={osservazione} disabilitato={disabilitato || !!sessione} onCambia={o => { invalida(); setOsservazione(o); }} />
      {!!sessione && <p className="m-0 text-text-secondary">Le osservazioni della visita collegata sono conservate. Per correggerle usa la revisione della sessione nel registro pesca.</p>}
    </fieldset>
    {!anteprima && !confermato && <button type="button" className="btn btn-secondary touch self-start" disabled={disabilitato || !momentoPescaCompleto(momento) || !turno() || stato?.regola.stato !== 'collegata'} onClick={() => void prepara()}>Rivedi questa visita</button>}
    {anteprima && !confermato && <div className="flex min-w-0 flex-col gap-3 border-t border-border pt-2">
      <RiepilogoSessionePreparata richiesta={anteprima.richiesta} sessioneFotografata={sessioneFotografata} />
      <p className="m-0">{anteprima.dto.esitoPrevisto}</p>
      <ul className="m-0 pl-4">{anteprima.dto.conseguenze.map((s, i) => <li key={i}>{s}</li>)}</ul>
      <ProfiliSessionePesca punto={anteprima.dto.punto} profili={anteprima.dto.profili} profiliPianificazione={anteprima.dto.profiliPianificazione} /><BeneficiPesca benefici={anteprima.dto.benefici} />
      <label className="touch flex items-start gap-2"><input type="checkbox" className="mt-1 h-5 w-5" checked={attestato} disabled={occupato || !!pendente} onChange={e => setAttestato(e.target.checked)} /><span>Confermo visita, fonte e rapporto con i turni mostrati. I benefici e le spese restano da rivedere separatamente.</span></label>
      <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-ghost touch" disabled={occupato || !!pendente} onClick={invalida}>Rivedi i dati</button><button type="button" className="btn btn-primary touch" disabled={occupato || !!pendente || !attestato} onClick={() => void conferma()}>{titoloConferma}</button></div>
    </div>}
    {confermato && <p role="status" className="m-0">{confermaScrive ? 'Visita registrata. Nessun nuovo invio viene eseguito da questo modulo.' : 'Visita preparata per la spunta. Nessun turno, cattura o beneficio ancora registrato.'}</p>}
    {confermato && !confermaScrive && onInvalidata && <button type="button" className="btn btn-ghost touch self-start" onClick={() => { onInvalidata(); setConfermato(false); invalida(); }}>Riapri questa preparazione</button>}
    {errore && <p role="alert" className="m-0 text-error">{errore}</p>}
    {pendente && <p role="alert" className="m-0 text-warning">Un gesto pesca è ancora da verificare nel registro della scheda. Nessun nuovo invio è consentito.</p>}
  </div>;
}
