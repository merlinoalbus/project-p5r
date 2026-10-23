import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EVENTI_PESCA, nomeEventoPesca, type AnteprimaOperazionePescaDto, type EventoPesca, type FonteFattoPescaDto, type MomentoPesca, type OsservazionePesca, type RicevutaOperazionePescaDto, type SessionePescaDto, type StatoPescaDto, type ValoreFattoPesca } from '../../../shared/pesca';
import { anteprimaPesca, leggiPesca, type AnteprimaClientPesca } from '../../services/api/pesca';
import { eseguiPescaConRegistro, gestoPendenteNelloScope, useGestiPartita } from '../../services/gestiPartita';
import { useCarica } from '../../hooks/useCarica';
import { dataGiocoTesto } from '../../utils/dateGioco';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { GestiPartita } from '../partita/GestiPartita';
import { PreparazioneSessionePesca } from './PreparazioneSessionePesca';
import { MomentoPescaForm } from './MomentoPescaForm';
import { momentoPescaCompleto, type MomentoPescaInCompilazione } from '../../utils/pesca';
import { OsservazionePescaForm } from './OsservazionePescaForm';
import { BeneficiPesca, ProfiliSessionePesca, RiepilogoOsservazionePesca } from './ProfiliPesca';

const nuovoId = () => crypto.randomUUID().replaceAll('-', '');
const erroreTesto = (e: unknown) => e instanceof Error ? e.message : 'Operazione non riuscita.';
const valoreFatto = (v: ValoreFattoPesca) => v === 'avvenuto' ? 'Avvenuto' : v === 'non-avvenuto' ? 'Non avvenuto al momento indicato' : 'Ignoto';
const quando = (m: MomentoPesca | null) => m ? `${dataGiocoTesto(m.giorno)} · ${m.fascia} · visita ${m.ordineVisita + 1}` : 'Data non dichiarata: il passato non viene ricostruito';
const canonico = (v: unknown): unknown => Array.isArray(v) ? v.map(canonico) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonico(x)])) : v;
const uguali = (a: unknown, b: unknown) => JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));

type Editor = { tipo: 'manuale' } | { tipo: 'osservazione'; sessione: SessionePescaDto } | { tipo: 'fatto'; evento: EventoPesca }
  | { tipo: 'esca' } | { tipo: 'saldo' };
interface GestoPronto { titolo: string; operazione: AnteprimaClientPesca }

function FontiSessione({ sessione: s }: { sessione: SessionePescaDto }) {
  return <ul className="m-0 flex min-w-0 flex-col gap-2 pl-4">{s.fonti.map(f => <li key={f.id} className="break-words">
    <span>{f.fonte.tipo === 'manuale' ? 'Dichiarazione manuale' : 'Fonte del Diario'}{f.orfana ? ' · riferimento mancante' : ''}</span>
    <code className="block break-all text-[11px]">Fonte {f.id}{f.generazione ? ` · generazione ${f.generazione}` : ''}</code>
    {f.fonte.tipo === 'diario' && <Link className="touch inline-flex" to={`/guida/percorso/${s.momento.giorno}?voce=${encodeURIComponent(f.fonte.voceUid)}`}>Voce {f.fonte.voceUid} · effetto {f.fonte.effettoUid}</Link>}
  </li>)}</ul>;
}

function FonteFatto({ fonte: f }: { fonte: FonteFattoPescaDto }) {
  return <div className="flex min-w-0 flex-col gap-1"><span>{valoreFatto(f.valore)} · {quando(f.momento)}</span>
    <code className="break-all text-[11px]">Fonte {f.id}{f.sessioneId ? ` · sessione ${f.sessioneId}` : ''}{f.catturaId ? ` · cattura ${f.catturaId}` : ''}{f.provenienzaId ? ` · provenienza ${f.provenienzaId}` : ''}</code>
    {f.nota && <span className="whitespace-pre-wrap break-words">{f.nota}</span>}
  </div>;
}

/** Mostra le fotografie dell’anteprima: non cerca bersagli per nome né sostituisce il dato corrente. */
function BersaglioAnteprima({ dto, operazione: o }: { dto: AnteprimaOperazionePescaDto; operazione: AnteprimaClientPesca }) {
  const s = dto.stato.sessioni.find(s => s.id === o.bersaglio || (o.azione === 'rimuovi-fonte' && s.fonti.some(f => f.id === o.bersaglio)));
  const f = dto.stato.fatti.flatMap(f => f.fonti).find(f => f.id === o.bersaglio);
  const a = dto.stato.acquistiEsca.find(a => a.id === o.bersaglio);
  return <>
    {s && <details open><summary className="touch">Visita e tutte le fonti fotografate</summary><p>{quando(s.momento)} · turno {s.turno.ordine} · {s.turno.origine}{s.turno.revocato ? ' · revocato' : ''}.</p><FontiSessione sessione={s} /><RiepilogoOsservazionePesca osservazione={s.osservazione.dati} /></details>}
    {f && <FonteFatto fonte={f} />}
    {a && <p>Acquisto esca {a.id} · {quando(a.momento)} · quantità {a.quantita} · costo {a.costo.toLocaleString('it-IT')} punti pesca.</p>}
  </>;
}

function ConfermaGestoPesca({ partitaId, pronto, onChiudi, onCambiato }: { partitaId: number; pronto: GestoPronto; onChiudi: (conclusa: boolean) => void; onCambiato: () => void | Promise<void> }) {
  const o = pronto.operazione;
  const anteprima = useCarica(async () => {
    const dto = await anteprimaPesca(partitaId, o);
    if (dto.azione !== o.azione || dto.bersaglio !== o.bersaglio || dto.stato.partitaId !== partitaId || !uguali(dto.richiesta, o.richiesta) || !/^[0-9a-f]{64}$/.test(dto.revisionePescaAttesa)) throw new Error('L’anteprima non coincide con la richiesta originale. Nessun invio consentito.');
    if (o.azione === 'acquista-esca') {
      const costo = dto.acquistoEscaPrevisto;
      if (!costo || costo.unita !== 'punti-pesca' || costo.quantita !== o.richiesta.quantita || !Number.isSafeInteger(costo.costoUnitario) || costo.costoUnitario < 0 || !Number.isSafeInteger(costo.costoTotale) || costo.costoTotale !== costo.costoUnitario * costo.quantita) throw new Error('Il costo fotografato non coincide con quantità e unità dell’acquisto. Nessun invio consentito.');
    }
    return dto;
  }, [partitaId, o.richiesta.operazioneId]);
  const [occupato, setOccupato] = useState(false), [attestato, setAttestato] = useState(false);
  const [ricevuta, setRicevuta] = useState<RicevutaOperazionePescaDto | null>(null), [errore, setErrore] = useState<string | null>(null);
  const blocco = useRef(false), vivo = useRef(true);
  useLayoutEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const gesti = useGestiPartita();
  const pendente = gestoPendenteNelloScope(partitaId, { pesca: true });
  const rifiutata = gesti.gesti.some(g => g.partitaId === partitaId && g.operazioneId === o.richiesta.operazioneId && g.stato === 'rifiutata');
  const conferma = async () => {
    if (blocco.current || !anteprima.dati || !attestato || pendente || ricevuta || rifiutata) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    let acquisita = false;
    try {
      const r = await eseguiPescaConRegistro(partitaId, { ...o, revisionePescaAttesa: anteprima.dati.revisionePescaAttesa }, { etichetta: pronto.titolo, pesca: true });
      acquisita = true;
      if (vivo.current) { setRicevuta(r); await onCambiato(); }
    } catch (e) { if (vivo.current) setErrore(`${acquisita ? 'Operazione registrata; aggiornamento non riuscito: ' : ''}${erroreTesto(e)}`); }
    finally { blocco.current = false; if (vivo.current) setOccupato(false); }
  };
  return <Modal aperta larga titolo={pronto.titolo} onChiudi={() => { if (!occupato) onChiudi(ricevuta !== null); }} azioni={<>
    <button type="button" className="btn btn-ghost touch" disabled={occupato} onClick={() => onChiudi(ricevuta !== null)}>{ricevuta ? 'Chiudi' : 'Torna ai dati conservati'}</button>
    {!ricevuta && <button type="button" className="btn btn-primary touch" disabled={occupato || !!pendente || rifiutata || !attestato || !anteprima.dati || anteprima.caricamento || !!anteprima.errore} onClick={() => void conferma()}>Conferma questo gesto</button>}
  </>}>
    <div className="flex min-w-0 flex-col gap-3 text-[13px]">
      <GestiPartita partitaId={partitaId} contestoChiave={o.richiesta.operazioneId} onCambiato={async (partitaRecuperata, esito) => {
        if (!vivo.current) return;
        const p = esito?.payload, r = esito?.ricevuta;
        const stessoPayload = partitaRecuperata === partitaId && esito?.operazioneId === o.richiesta.operazioneId && p?.tipo === 'pesca'
          && p.dati.azione === o.azione && p.dati.bersaglio === o.bersaglio && uguali(p.dati.richiesta, o.richiesta);
        const propriaRicevuta = stessoPayload && r !== null && r !== undefined && 'sessioneId' in r && r.operazioneId === o.richiesta.operazioneId
          && r.partitaId === partitaId && r.azione === o.azione && r.bersaglio === o.bersaglio && uguali(r.richiesta, o.richiesta);
        if (propriaRicevuta && r && 'sessioneId' in r) { setRicevuta(r); setErrore(null); onChiudi(true); }
        try { await onCambiato(); }
        catch (e) { if (vivo.current) setErrore(`Esito del recupero acquisito; aggiornamento della vista non riuscito: ${erroreTesto(e)}`); }
      }} />
      <code className="break-all text-[11px]">Partita {partitaId} · operazione {o.richiesta.operazioneId}{o.bersaglio ? ` · bersaglio ${o.bersaglio}` : ''}</code>
      {anteprima.caricamento && !anteprima.dati && <p role="status">Preparo il riepilogo corrente…</p>}
      {anteprima.errore && <p role="alert" className="text-error">{anteprima.errore}<button type="button" className="btn btn-ghost touch" disabled={occupato || !!pendente || !!ricevuta} onClick={() => { setAttestato(false); void anteprima.ricarica(); }}>Rileggi l’anteprima</button></p>}
      {anteprima.dati && <>
        <p className="m-0">{anteprima.dati.esitoPrevisto}</p>
        <BersaglioAnteprima dto={anteprima.dati} operazione={o} />
        {o.azione === 'salva-osservazione' && <><strong>Nuova osservazione della stessa visita</strong><RiepilogoOsservazionePesca osservazione={o.richiesta.osservazione} /></>}
        {o.azione === 'registra-fatto' && <p>{nomeEventoPesca(o.bersaglio)} · {valoreFatto(o.richiesta.valore)} · {quando(o.richiesta.momento)}{o.richiesta.nota ? ` · ${o.richiesta.nota}` : ''}.</p>}
        {o.azione === 'acquista-esca' && <p>Acquisto effettivo: {o.richiesta.quantita} Boilie sospetto · {quando(o.richiesta.momento)}. {anteprima.dati.acquistoEscaPrevisto ? <>Costo fotografato: {anteprima.dati.acquistoEscaPrevisto.costoUnitario.toLocaleString('it-IT')} × {anteprima.dati.acquistoEscaPrevisto.quantita.toLocaleString('it-IT')} = {anteprima.dati.acquistoEscaPrevisto.costoTotale.toLocaleString('it-IT')} punti pesca.</> : 'Il costo previsto non è leggibile: nessuna conferma consentita.'} Possesso e uso non registrano una spesa.</p>}
        {o.azione === 'rettifica-punti' && <p>Saldo osservato: {anteprima.dati.stato.saldoPunti === null ? 'ignoto' : anteprima.dati.stato.saldoPunti.toLocaleString('it-IT')} → {o.richiesta.saldoOsservato.toLocaleString('it-IT')} punti pesca. Le singole spese non vengono dichiarate già conteggiate.</p>}
        <ul className="m-0 pl-4">{anteprima.dati.conseguenze.map((c, i) => <li key={i}>{c}</li>)}</ul>
        <ProfiliSessionePesca punto={anteprima.dati.punto} profili={anteprima.dati.profili} profiliPianificazione={anteprima.dati.profiliPianificazione} /><BeneficiPesca benefici={anteprima.dati.benefici} />
        {o.azione.startsWith('rimuovi-') && <p className="m-0">Il gesto conserva la fotografia nel Cestino. Le eventuali correzioni di Doti, yen e punti pesca si applicano dal pulsante sulla voce (gli yen li cambi tu a mano).</p>}
        {!ricevuta && <label className="touch flex items-start gap-2"><input type="checkbox" className="h-5 w-5 shrink-0" checked={attestato} disabled={occupato || !!pendente} onChange={e => setAttestato(e.target.checked)} /><span>Confermo il bersaglio e tutte le conseguenze mostrate per questa partita.</span></label>}
      </>}
      {ricevuta && <p role="status" className="m-0 text-success">Operazione registrata · {ricevuta.esito} · {ricevuta.operazioneId}. Nessun nuovo invio da questa finestra.</p>}
      {errore && <p role="alert" className="m-0 text-error">{errore}</p>}
      {rifiutata && <p role="alert" className="m-0 text-warning">Questa richiesta è stata rifiutata e non viene ripetuta. Torna ai dati conservati per correggerli e preparare una nuova anteprima.</p>}
      {pendente && <p role="alert" className="m-0 text-warning">Esito conservato da verificare nel registro dei gesti: usa il recupero dell’operazione originale.</p>}
    </div>
  </Modal>;
}

function CompilaGestoPesca({ partitaId, editor, stato, aperta, onChiudi, onPronto, onCambiato }: { partitaId: number; editor: Editor; stato: StatoPescaDto; aperta: boolean; onChiudi: () => void; onPronto: (p: GestoPronto) => void; onCambiato: () => void | Promise<void> }) {
  const [momento, setMomento] = useState<MomentoPescaInCompilazione>({ giorno: '', fascia: '', ordineVisita: null });
  const [valore, setValore] = useState<ValoreFattoPesca | ''>(''), [dataFatto, setDataFatto] = useState(''), [nota, setNota] = useState(''), [quantita, setQuantita] = useState('');
  const [osservazione, setOsservazione] = useState<OsservazionePesca | null>(() => editor.tipo === 'osservazione' ? structuredClone(editor.sessione.osservazione.dati) : null);
  useGestiPartita();
  const pendente = gestoPendenteNelloScope(partitaId, { pesca: true });
  const titolo = editor.tipo === 'manuale' ? 'Registra una visita osservata' : editor.tipo === 'osservazione' ? 'Correggi l’osservazione della visita' : editor.tipo === 'fatto' ? nomeEventoPesca(editor.evento) : editor.tipo === 'esca' ? 'Registra un acquisto effettivo di esca' : 'Rettifica il saldo osservato dei punti pesca';
  const intero = quantita.trim() !== '' && Number.isSafeInteger(Number(quantita)) && Number(quantita) >= (editor.tipo === 'saldo' ? 0 : 1) && Number(quantita) <= (editor.tipo === 'saldo' ? 999_999_999 : 1_000_000);
  const completo = editor.tipo === 'osservazione' ? osservazione !== null : editor.tipo === 'fatto' ? valore !== '' && (dataFatto === 'ignota' || (dataFatto === 'nota' && momentoPescaCompleto(momento))) : editor.tipo === 'esca' ? intero && momentoPescaCompleto(momento) && stato.regola.stato === 'collegata' && !!stato.regola.dati : editor.tipo === 'saldo' ? intero : false;
  const prepara = (e: FormEvent) => {
    e.preventDefault(); if (!completo || pendente || !aperta) return;
    const operazioneId = nuovoId();
    if (editor.tipo === 'osservazione' && osservazione) onPronto({ titolo, operazione: { azione: 'salva-osservazione', bersaglio: editor.sessione.id, richiesta: { operazioneId, osservazione: structuredClone(osservazione) } } });
    else if (editor.tipo === 'fatto' && valore !== '' && (dataFatto === 'ignota' || momentoPescaCompleto(momento))) onPronto({ titolo, operazione: { azione: 'registra-fatto', bersaglio: editor.evento, richiesta: { operazioneId, valore, momento: dataFatto === 'ignota' ? null : { ...momento } as MomentoPesca, nota } } });
    else if (editor.tipo === 'esca' && momentoPescaCompleto(momento)) onPronto({ titolo, operazione: { azione: 'acquista-esca', bersaglio: null, richiesta: { operazioneId, momento: { ...momento }, quantita: Number(quantita) } } });
    else if (editor.tipo === 'saldo') onPronto({ titolo, operazione: { azione: 'rettifica-punti', bersaglio: null, richiesta: { operazioneId, saldoOsservato: Number(quantita) } } });
  };
  return <Modal aperta={aperta} larga titolo={titolo} onChiudi={onChiudi}>
    {editor.tipo === 'manuale' ? <PreparazioneSessionePesca partitaId={partitaId} fonte={{ tipo: 'manuale' }}
      onConferma={r => { const { revisionePescaAttesa, ...richiesta } = r; return eseguiPescaConRegistro(partitaId, { azione: 'registra-sessione', richiesta, bersaglio: null, revisionePescaAttesa }, { etichetta: titolo, pesca: true }); }} onCambiato={onCambiato} /> : <form className="flex min-w-0 flex-col gap-3 text-[13px]" onSubmit={prepara}><fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0" disabled={!!pendente}>
      {editor.tipo === 'osservazione' && osservazione && <>
        <p className="m-0">{quando(editor.sessione.momento)} · versione {editor.sessione.osservazione.versione}. La correzione conserva l’identità della visita e il turno, coinvolgendo tutte le fonti mostrate.</p><FontiSessione sessione={editor.sessione} />
        <OsservazionePescaForm valore={osservazione} onCambia={setOsservazione} />
      </>}
      {editor.tipo === 'fatto' && <>
        <Selettore etichetta="Fatto osservato" valore={valore} vuoto="Dichiara l’esito" opzioni={[{ chiave: 'avvenuto', nome: 'Avvenuto' }, { chiave: 'non-avvenuto', nome: 'Non avvenuto al momento indicato' }, { chiave: 'ignoto', nome: 'Ignoto' }]} onCambia={v => setValore(v as ValoreFattoPesca)} />
        <Selettore etichetta="Conosci il momento dell’osservazione?" valore={dataFatto} vuoto="Dichiara il rapporto con il tempo" opzioni={[{ chiave: 'nota', nome: 'Conosco giorno, fascia e ordine della visita' }, { chiave: 'ignota', nome: 'Non conosco il momento' }]} onCambia={setDataFatto} />
        {dataFatto === 'nota' && <MomentoPescaForm valore={momento} onCambia={setMomento} />}
        <label className="flex min-w-0 flex-col gap-1">Nota facoltativa<textarea className="form-input" maxLength={2000} value={nota} onChange={e => setNota(e.target.value)} /></label>
        <p className="m-0 text-text-secondary">La dichiarazione non fabbrica una visita o un turno. Boss non implica Guardiano; un fatto senza data non ricostruisce le condizioni del passato.</p>
      </>}
      {editor.tipo === 'esca' && <><MomentoPescaForm valore={momento} onCambia={setMomento} /><label className="flex flex-col gap-1">Boilie sospetto effettivamente acquistate<input type="number" className="form-input" min={1} max={1_000_000} step={1} value={quantita} onChange={e => setQuantita(e.target.value)} /></label><p className="m-0">Costo per esca nella fonte letta: {stato.regola.dati?.costoEscaPunti.toLocaleString('it-IT') ?? 'non leggibile'} punti pesca. Il possesso o l’uso di un’esca non ne prova l’acquisto. La spesa resta una proposta da decidere.</p></>}
      {editor.tipo === 'saldo' && <><p className="m-0">Saldo attualmente osservato: {stato.saldoPunti === null ? 'ignoto' : stato.saldoPunti.toLocaleString('it-IT')} punti pesca.</p><label className="flex flex-col gap-1">Saldo che hai osservato nel gioco<input type="number" className="form-input" min={0} max={999_999_999} step={1} value={quantita} onChange={e => setQuantita(e.target.value)} /></label><p className="m-0">Questa rettifica non riconosce singole spese come già conteggiate, non modifica le attribuzioni provate e non elimina proposte.</p></>}
      </fieldset>{pendente && <p role="alert" className="m-0 text-warning">Il gesto originale resta da verificare nel registro. Nessuna nuova dichiarazione viene inviata.</p>}
      <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-ghost touch" onClick={onChiudi}>Annulla</button><button type="submit" className="btn btn-secondary touch" disabled={!completo || !!pendente}>Rivedi questa dichiarazione</button></div>
    </form>}
  </Modal>;
}

export function RegistroPesca(props: { partitaId: number; onCambiato?: () => void | Promise<void> }) {
  return <RegistroPescaNelContesto key={props.partitaId} {...props} />;
}
function RegistroPescaNelContesto({ partitaId, onCambiato }: { partitaId: number; onCambiato?: () => void | Promise<void> }) {
  const gesti = useGestiPartita();
  const [editor, setEditor] = useState<Editor | null>(null), [pronto, setPronto] = useState<GestoPronto | null>(null);
  const [ultimoStato, setUltimoStato] = useState<StatoPescaDto | null>(null);
  const vivo = useRef(true), lettura = useRef(0);
  useLayoutEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const registro = useCarica(async () => {
    const questa = ++lettura.current, dto = await leggiPesca(partitaId);
    if (vivo.current && lettura.current === questa) setUltimoStato(dto);
    return dto;
  }, [partitaId, gesti.versionePerPartita[partitaId] ?? 0, gesti.versioneGuida]);
  const pendente = gestoPendenteNelloScope(partitaId, { pesca: true });
  const s = registro.dati ?? ultimoStato;
  const cambiato = async () => { if (vivo.current) { await registro.ricarica(); if (vivo.current) await onCambiato?.(); } };
  const rimuovi = (azione: 'rimuovi-fonte' | 'rimuovi-sessione' | 'rimuovi-fatto' | 'rimuovi-acquisto-esca', bersaglio: string, titolo: string) => {
    if (!pendente) setPronto({ titolo, operazione: { azione, bersaglio, richiesta: { operazioneId: nuovoId() } } });
  };
  return <section id="pesca" className="card flex min-w-0 flex-col gap-3" aria-label="Registro della pesca">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="m-0 font-display text-[17px] uppercase">Pesca a Ichigaya</h2><button type="button" className="btn btn-ghost touch" disabled={registro.caricamento} onClick={() => void registro.ricarica()}>Rileggi il registro pesca</button></div>
    <p className="m-0 text-[13px]">Visite, catture, fatti osservati e spese hanno fonti distinte. I vecchi contatori non provano catture o premi; nessun saldo cambia senza una decisione esplicita.</p>
    <GestiPartita partitaId={partitaId} onCambiato={cambiato} />
    {registro.caricamento && !s && <p role="status">Leggo il registro pesca…</p>}
    {registro.errore && <p role="alert" className="m-0 text-error">{registro.errore}</p>}
    {s && <>
      <p className="m-0 text-[13px]">Saldo punti pesca: <strong>{s.saldoPunti === null ? 'ignoto' : s.saldoPunti.toLocaleString('it-IT')}</strong>. Conteggio attività: {s.contatore.volte}; turni dettagliati: {s.contatore.turni.length}; quote storiche non rappresentate: {s.contatore.quoteNonRappresentate}.</p>
      {registro.caricamento && <p role="status" className="m-0 text-[12px]">Rilettura in corso: i dati precedenti e le bozze restano visibili. Ogni conferma richiede una nuova anteprima del server.</p>}
      {s.regola.stato !== 'collegata' && <p role="alert" className="m-0 text-warning">Regola non collegata integralmente: {s.regola.motivi.join(' ')}. I riferimenti personali esistenti restano visibili.</p>}
      {!!s.avvisi.length && <ul className="m-0 pl-4 text-warning">{s.avvisi.map((a, i) => <li key={i}>{a}</li>)}</ul>}
      <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-secondary touch" disabled={!!pendente || s.regola.stato !== 'collegata'} onClick={() => setEditor({ tipo: 'manuale' })}>Registra o collega una visita</button><button type="button" className="btn btn-ghost touch" disabled={!!pendente} onClick={() => setEditor({ tipo: 'esca' })}>Registra acquisto esca</button><button type="button" className="btn btn-ghost touch" disabled={!!pendente} onClick={() => setEditor({ tipo: 'saldo' })}>Rettifica saldo osservato</button></div>
      <details><summary className="touch">Turni preesistenti e quote del conteggio</summary><p className="text-[13px]">Un raccordo usa la firma del turno originale o una quota storica libera, senza incremento né catture presunte.</p><ul className="m-0 pl-4 text-[12px]">{s.contatore.turni.map(t => <li key={t.firma}>Turno {t.ordine} · attività {t.attivita} · {t.uid ? `UID ${t.uid}` : 'UID non assegnato'}{t.raccordatoASessione ? ` · sessione ${t.raccordatoASessione}` : ' · non raccordato'}</li>)}</ul></details>
      <h3 className="m-0 text-[15px]">Visite osservate · {s.sessioni.length}</h3>
      {!s.sessioni.length && <p className="m-0 text-[13px]">Nessuna visita osservata registrata. Il conteggio precedente rimane distinto.</p>}
      <ul className="m-0 flex min-w-0 list-none flex-col gap-3 p-0">{s.sessioni.map(v => <li key={v.id} className="flex min-w-0 flex-col gap-2 border-t border-border pt-2 text-[13px]">
        <strong>{quando(v.momento)} · {v.attiva ? 'fonti attive' : 'senza fonti attive'}{v.orfana ? ' · riferimento guida mancante' : ''}</strong><code className="break-all text-[11px]">Sessione {v.id} · attività {v.attivita}</code>
        <span>Turno {v.turno.ordine} · {v.turno.origine === 'creato' ? 'creato da questa sessione' : v.turno.origine === 'raccordato' ? 'preesistente raccordato: non posseduto dalla sessione' : 'quota compresa nel conteggio storico'}{v.turno.revocato ? ' · turno revocato successivamente' : ''}.</span>
        <details><summary className="touch">Fonti e provenienze</summary><FontiSessione sessione={v} /><div className="flex flex-wrap gap-2 pt-2">{v.fonti.map(f => <button type="button" className="btn btn-ghost touch" key={f.id} disabled={!!pendente} onClick={() => rimuovi('rimuovi-fonte', f.id, 'Rimuovi soltanto questa fonte della visita')}>Rivedi rimozione fonte {f.id.slice(0, 8)}</button>)}</div></details>
        <RiepilogoOsservazionePesca osservazione={v.osservazione.dati} /><ProfiliSessionePesca punto={v.punto} profili={v.profili} profiliPianificazione={v.profiliPianificazione} /><BeneficiPesca benefici={v.benefici} />
        {!!v.avvisi.length && <ul className="m-0 pl-4 text-warning">{v.avvisi.map((a, i) => <li key={i}>{a}</li>)}</ul>}
        <details><summary className="touch">Revisioni dell’osservazione · {v.revisioni.length}</summary><ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">{v.revisioni.map(r => <li className="border-t border-border pt-2" key={r.id}><strong>Versione {r.versione}{r.id === v.osservazione.id ? ' · corrente' : ''}</strong><code className="block break-all text-[11px]">Osservazione {r.id}{r.precedenteId ? ` · precedente ${r.precedenteId}` : ''}</code><RiepilogoOsservazionePesca osservazione={r.dati} /></li>)}</ul></details>
        <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-secondary touch" disabled={!!pendente} onClick={() => setEditor({ tipo: 'osservazione', sessione: v })}>Correggi l’osservazione</button><button type="button" className="btn btn-ghost touch" disabled={!!pendente} onClick={() => rimuovi('rimuovi-sessione', v.id, 'Rimuovi la visita e tutte le sue fonti')}>Rivedi rimozione completa</button></div>
      </li>)}</ul>
      <h3 className="m-0 text-[15px]">Fatti canonici e fonti temporali</h3>
      <ul className="m-0 flex min-w-0 list-none flex-col gap-3 p-0">{EVENTI_PESCA.map(evento => {
        const f = s.fatti.find(f => f.evento === evento);
        return <li key={evento} className="flex min-w-0 flex-col gap-2 border-t border-border pt-2 text-[13px]">
          <strong>{nomeEventoPesca(evento)} · {f ? valoreFatto(f.valore) : 'ignoto: nessuna fonte letta'}</strong>
          <button type="button" className="btn btn-ghost touch self-start" disabled={!!pendente} onClick={() => setEditor({ tipo: 'fatto', evento })}>Aggiungi un’osservazione manuale</button>
          {f?.avvisi.map((a, i) => <p className="m-0 text-warning" key={i}>{a}</p>)}
          {!f?.fonti.length && <p className="m-0">Nessuna fonte: non equivale a «non avvenuto».</p>}
          <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">{f?.fonti.map(fonte => <li key={fonte.id} className="flex min-w-0 flex-col gap-1 border-l border-border pl-2">
            <FonteFatto fonte={fonte} />
            {fonte.sessioneId ? <button type="button" className="btn btn-ghost touch self-start" disabled={!!pendente || !s.sessioni.some(v => v.id === fonte.sessioneId)} onClick={() => { const sessione = s.sessioni.find(v => v.id === fonte.sessioneId); if (sessione) setEditor({ tipo: 'osservazione', sessione }); }}>Correggi l’osservazione di origine</button>
              : <button type="button" className="btn btn-ghost touch self-start" disabled={!!pendente} onClick={() => rimuovi('rimuovi-fatto', fonte.id, 'Revoca questa sola fonte del fatto')}>Rivedi revoca di questa fonte</button>}
          </li>)}</ul>
        </li>;
      })}</ul>
      <h3 className="m-0 text-[15px]">Acquisti effettivi di esca · {s.acquistiEsca.length}</h3>
      {!s.acquistiEsca.length && <p className="m-0 text-[13px]">Nessun acquisto registrato; possesso e uso restano osservazioni delle visite.</p>}
      <ul className="m-0 flex min-w-0 list-none flex-col gap-3 p-0">{s.acquistiEsca.map(a => <li key={a.id} className="flex min-w-0 flex-col gap-2 border-t border-border pt-2 text-[13px]"><strong>{quando(a.momento)} · {a.quantita} Boilie sospetto · {a.costo.toLocaleString('it-IT')} punti pesca{a.attivo ? '' : ' · rimosso'}</strong><code className="break-all text-[11px]">Acquisto esca {a.id}</code><BeneficiPesca benefici={a.benefici} />{a.attivo && <button type="button" className="btn btn-ghost touch self-start" disabled={!!pendente} onClick={() => rimuovi('rimuovi-acquisto-esca', a.id, 'Rimuovi questo acquisto di esca')}>Rivedi rimozione dell’acquisto</button>}</li>)}</ul>
      <Link className="touch self-start" to="/impostazioni">Apri il Cestino e i gesti conservati</Link>
      {editor && <CompilaGestoPesca key={editor.tipo === 'osservazione' ? `${editor.tipo}:${editor.sessione.id}:${editor.sessione.osservazione.id}` : editor.tipo === 'fatto' ? `${editor.tipo}:${editor.evento}` : editor.tipo} partitaId={partitaId} editor={editor} stato={s} aperta={pronto === null} onChiudi={() => setEditor(null)} onCambiato={cambiato} onPronto={setPronto} />}
    </>}
    {pronto && <ConfermaGestoPesca key={pronto.operazione.richiesta.operazioneId} partitaId={partitaId} pronto={pronto} onChiudi={conclusa => { setPronto(null); if (conclusa) setEditor(null); }} onCambiato={cambiato} />}
  </section>;
}
