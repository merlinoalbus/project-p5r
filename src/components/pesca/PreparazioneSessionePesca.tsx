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
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

const nuovoId = () => crypto.randomUUID().replaceAll('-', '');
const testo = (e: unknown) => e instanceof Error ? e.message : 'Operazione non riuscita.';
const canonico = (v: unknown): unknown => Array.isArray(v) ? v.map(canonico) : v && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonico(x)])) : v;
const uguali = (a: unknown, b: unknown) => JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));

export function RiepilogoSessionePreparata({ richiesta: r, sessioneFotografata }: { richiesta: NuovaSessionePesca; sessioneFotografata?: SessionePescaDto }) {
  return <div className="flex min-w-0 flex-col gap-2 rounded border border-border p-2 testo-13">
    <strong>{r.scelta.tipo === 'nuova' ? 'Visita da registrare' : 'Registrazione da aggiungere a una visita già segnata'}</strong>
    <span>{dataGiocoTesto(r.momento.giorno)} · {r.momento.fascia} · visita {r.momento.ordineVisita + 1} nella fascia.</span>
    <span>{r.turno.tipo === 'nuovo' ? 'Conta un turno nuovo.' : r.turno.tipo === 'esistente' ? `Si collega al turno ${r.turno.ordine}, già contato: il conteggio non cambia.` : 'È una delle visite già contate prima: il conteggio non cambia.'}</span>
    {/* L7-04: niente firme, uid né id: la visita e le sue fonti si dicono con il momento e con il tipo */}
    <span>Registrata da: {r.fonte.tipo === 'manuale' ? 'dichiarazione a mano' : 'voce del Diario'}.</span>
    {r.scelta.tipo === 'collega' && <>
      {sessioneFotografata?.id === r.scelta.sessioneId ? <div className="flex min-w-0 flex-col gap-1">
        <span>Visita scelta: {sessioneFotografata.nome} · {dataGiocoTesto(sessioneFotografata.momento.giorno)} · {sessioneFotografata.momento.fascia} · visita {sessioneFotografata.momento.ordineVisita + 1} nella fascia.</span>
        <strong>Già registrata da</strong>
        {!sessioneFotografata.fonti.length && <span>Nessuna registrazione attiva.</span>}
        <ul className="m-0 pl-4">{sessioneFotografata.fonti.map(f => <li key={f.id} className="break-words">
          {f.fonte.tipo === 'manuale' ? 'Dichiarazione a mano' : 'Voce del Diario'}{f.orfana ? ' · la voce non c’è più' : ''}
        </li>)}</ul>
      </div> : <p role="alert" className="m-0 text-warning">Non si leggono le registrazioni della visita scelta: rileggi l’anteprima prima di confermare.</p>}
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- la versione dei gesti della partita e `invalidazioneAnteprima` non entrano nella lettura: fanno rileggere
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
      if (dto.azione !== 'registra-sessione' || !uguali(dto.richiesta, r) || dto.stato.partitaId !== partitaId) throw new Error('L’anteprima non corrisponde più alla visita che stai registrando: rileggila prima di confermare.');
      if (r.scelta.tipo === 'collega') {
        const sessioneId = r.scelta.sessioneId;
        if (!dto.stato.sessioni.some(s => s.id === sessioneId)) throw new Error('L’anteprima non mostra la visita scelta: rileggila prima di confermare.');
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
  return <div className="flex min-w-0 flex-col gap-3 testo-13">
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
    <p className="m-0">Una visita conta un solo turno. Le visite contate prima non diventano catture, e collegarsi a una di loro non aumenta il conteggio.</p>
    {registro.caricamento && !stato && <p role="status">Leggo visite e turni…</p>}
    {registro.errore && <p role="alert" className="m-0 text-error-testo">{registro.errore}<PulsanteVisivo tono="fantasma" className="ml-2" icona={<IconaAzione chiave="ricalcola" dimensione={22} />} titolo="Rileggi" onClick={() => void registro.ricarica()} /></p>}
    {stato?.regola.stato !== 'collegata' && stato && <p role="alert" className="m-0 text-warning">La regola della pesca non è completa: {stato.regola.motivi.join(' ')} Da qui non si registrano visite finché non viene sistemata.</p>}
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0" disabled={disabilitato}>
      <Selettore etichetta="Visita da registrare" valore={sessione} disabilitato={disabilitato}
        opzioni={[{ chiave: '', nome: 'Una visita nuova' }, ...(stato?.sessioni ?? []).map(s => ({ chiave: s.id, nome: `${dataGiocoTesto(s.momento.giorno)} · ${s.momento.fascia} · visita ${s.momento.ordineVisita + 1}${s.orfana ? ' · l’attività della guida non c’è più' : ''}`, dettaglio: s.attiva ? 'Registrata' : 'Senza registrazioni attive' }))]}
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
      {!sessione && <Selettore etichetta="È già nel conteggio delle visite?" valore={sceltaTurno} vuoto="Scegli" disabilitato={disabilitato}
        opzioni={[{ chiave: 'nuovo', nome: 'No: conta un turno nuovo' },
          ...(stato?.contatore.turni ?? []).filter(t => t.raccordatoASessione === null).map(t => ({ chiave: `turno:${t.firma}`, nome: `Sì: è il turno ${t.ordine}`, dettaglio: 'il conteggio non cambia' })),
          ...((stato?.contatore.quoteNonRappresentate ?? 0) > 0 ? [{ chiave: 'storico', nome: 'Sì: è fra le visite contate prima', dettaglio: 'il conteggio non cambia' }] : [])]}
        onCambia={v => { invalida(); setSceltaTurno(v); }} />}
      {sessione && !turno() && <p role="alert" className="m-0 text-warning">Il turno di questa visita non c’è più o è stato tolto: collegarsi non lo rimette.</p>}
      <OsservazionePescaForm partitaId={sessione ? undefined : partitaId} valore={osservazione} disabilitato={disabilitato || !!sessione} onCambia={o => { invalida(); setOsservazione(o); }} />
      {!!sessione && <p className="m-0 text-text-secondary">Quello che hai segnato della visita resta com’è. Per correggerlo usa «Correggi la visita» in Partita → Progressi, nella pesca.</p>}
    </fieldset>
    {!anteprima && !confermato && <PulsanteVisivo icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Rivedi questa visita" className="self-start" disabled={disabilitato || !momentoPescaCompleto(momento) || !turno() || stato?.regola.stato !== 'collegata'} onClick={() => void prepara()} />}
    {anteprima && !confermato && <div className="flex min-w-0 flex-col gap-3 border-t border-border pt-2">
      <RiepilogoSessionePreparata richiesta={anteprima.richiesta} sessioneFotografata={sessioneFotografata} />
      <p className="m-0">{anteprima.dto.esitoPrevisto}</p>
      <ul className="m-0 pl-4">{anteprima.dto.conseguenze.map((s, i) => <li key={i}>{s}</li>)}</ul>
      <ProfiliSessionePesca punto={anteprima.dto.punto} profili={anteprima.dto.profili} profiliPianificazione={anteprima.dto.profiliPianificazione} /><BeneficiPesca benefici={anteprima.dto.benefici} />
      <label className="touch flex items-start gap-2"><input type="checkbox" className="mt-1 h-5 w-5" checked={attestato} disabled={occupato || !!pendente} onChange={e => setAttestato(e.target.checked)} /><span>Confermo la visita e il conteggio mostrati. Punti e spese restano da approvare a parte.</span></label>
      <div className="flex flex-wrap gap-2"><PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Rivedi i dati" disabled={occupato || !!pendente} onClick={invalida} /><PulsanteVisivo tono="primario" icona={<IconaAzione chiave="raggiunto" dimensione={22} />} titolo={titoloConferma} disabled={occupato || !!pendente || !attestato} onClick={() => void conferma()} /></div>
    </div>}
    {confermato && <p role="status" className="m-0">{confermaScrive ? 'Visita registrata.' : 'Visita pronta: si registra con la spunta della voce. Turno, catture e punti non sono ancora segnati.'}</p>}
    {confermato && !confermaScrive && onInvalidata && <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Riapri la visita" className="self-start" onClick={() => { onInvalidata(); setConfermato(false); invalida(); }} />}
    {errore && <p role="alert" className="m-0 text-error-testo">{errore}</p>}
    {pendente && <p role="alert" className="m-0 text-warning">Un’operazione di pesca non è ancora confermata: completala dall’elenco «Operazioni da completare». Finché resta aperta non si invia altro.</p>}
  </div>;
}
