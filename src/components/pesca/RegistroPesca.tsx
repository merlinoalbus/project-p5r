import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EVENTI_PESCA, incoerenzeOsservazionePesca, nomeEventoPesca, type AnteprimaOperazionePescaDto, type EventoPesca, type FonteFattoPescaDto, type MomentoPesca, type OsservazionePesca, type RicevutaOperazionePescaDto, type SessionePescaDto, type StatoPescaDto, type ValoreFattoPesca } from '../../../shared/pesca';
import { anteprimaPesca, leggiPesca, type AnteprimaClientPesca } from '../../services/api/pesca';
import { eseguiPescaConRegistro, gestoPendenteNelloScope, useGestiPartita } from '../../services/gestiPartita';
import { useCarica } from '../../hooks/useCarica';
import { dataGiocoTesto } from '../../utils/dateGioco';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { CampoTesto } from '../shared/Campo';
import { GestiPartita } from '../partita/GestiPartita';
import { RegistraVisitaPesca } from './RegistraVisitaPesca';
import { turnoDellaVisita } from './visitaPesca';
import { MomentoPescaForm } from './MomentoPescaForm';
import { momentoPescaCompleto, type MomentoPescaInCompilazione } from '../../utils/pesca';
import { OsservazionePescaForm } from './OsservazionePescaForm';
import { BeneficiPesca, ProfiliSessionePesca, RiepilogoOsservazionePesca } from './ProfiliPesca';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { TitoloSezione } from '../shared/TitoloSezione';
import { PromemoriaLibri } from '../shared/PromemoriaLibri';

const nuovoId = () => crypto.randomUUID().replaceAll('-', '');
const erroreTesto = (e: unknown) => e instanceof Error ? e.message : 'Operazione non riuscita.';
// L7 (F9): i testi della pesca in parole da giocatore: «registrazione» al posto di «fonte», «a mano» al posto di «manuale»
const valoreFatto = (v: ValoreFattoPesca) => v === 'avvenuto' ? 'Avvenuto' : v === 'non-avvenuto' ? 'Non ancora avvenuto in quel momento' : 'Non si sa';
const quando = (m: MomentoPesca | null) => m ? `${dataGiocoTesto(m.giorno)} · ${m.fascia} · visita ${m.ordineVisita + 1}` : 'Data non indicata';
const canonico = (v: unknown): unknown => Array.isArray(v) ? v.map(canonico) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonico(x)])) : v;
const uguali = (a: unknown, b: unknown) => JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));

// L10-09: «manuale» (una visita nuova) e «collega» (una registrazione in più su una visita già segnata, il comando della visita) aprono
// il foglio in tre passi `RegistraVisitaPesca`; gli altri gesti restano nel modulo con l'anteprima di `ConfermaGestoPesca`.
type Editor = { tipo: 'manuale' } | { tipo: 'collega'; sessione: SessionePescaDto } | { tipo: 'osservazione'; sessione: SessionePescaDto } | { tipo: 'fatto'; evento: EventoPesca }
  | { tipo: 'esca' } | { tipo: 'saldo' };
type EditorModulo = Exclude<Editor, { tipo: 'manuale' } | { tipo: 'collega' }>;
interface GestoPronto { titolo: string; operazione: AnteprimaClientPesca }

/** L'esito di un gesto sulla pesca, in parole (mai la sigla tecnica). */
const ESITI_PESCA: Record<string, string> = {
  'sessione-creata': 'visita registrata', 'fonte-collegata': 'registrazione aggiunta alla visita', 'gia-collegata': 'la visita era già registrata così', 'osservazione-salvata': 'visita corretta',
  'fonte-rimossa': 'registrazione tolta', 'sessione-rimossa': 'visita tolta', 'fatto-registrato': 'fatto registrato', 'fatto-rimosso': 'fatto tolto',
  'esca-acquistata': 'acquisto dell’esca registrato', 'acquisto-esca-rimosso': 'acquisto dell’esca tolto', 'punti-rettificati': 'saldo dei punti pesca corretto',
};

/** Da dove viene il turno di una visita, in parole (L7-04: mai la sigla del dato). */
const ORIGINE_TURNO: Record<SessionePescaDto['turno']['origine'], string> = {
  creato: 'turno nuovo', raccordato: 'collegato a un turno già contato', 'quota-storica': 'quota del conteggio di prima',
};

function FontiSessione({ sessione: s }: { sessione: SessionePescaDto }) {
  return <ul className="m-0 flex min-w-0 flex-col gap-2 pl-4">{s.fonti.map(f => <li key={f.id} className="break-words">
    <span>{f.fonte.tipo === 'manuale' ? 'Dichiarazione a mano' : 'Voce del Diario'}{f.orfana ? ' · la voce non c’è più' : ''}</span>
    {f.fonte.tipo === 'diario' && <Link className="touch inline-flex" to={`/guida/percorso/${s.momento.giorno}?voce=${encodeURIComponent(f.fonte.voceUid)}`}>Apri la voce del Diario · {quando(s.momento)}</Link>}
  </li>)}</ul>;
}

function FonteFatto({ fonte: f }: { fonte: FonteFattoPescaDto }) {
  return <div className="flex min-w-0 flex-col gap-1"><span>{valoreFatto(f.valore)} · {quando(f.momento)}</span>
    {f.nota && <span className="whitespace-pre-wrap break-words">{f.nota}</span>}
  </div>;
}

/** Mostra le fotografie dell’anteprima: non cerca bersagli per nome né sostituisce il dato corrente. */
function BersaglioAnteprima({ dto, operazione: o }: { dto: AnteprimaOperazionePescaDto; operazione: AnteprimaClientPesca }) {
  const s = dto.stato.sessioni.find(s => s.id === o.bersaglio || (o.azione === 'rimuovi-fonte' && s.fonti.some(f => f.id === o.bersaglio)));
  const f = dto.stato.fatti.flatMap(f => f.fonti).find(f => f.id === o.bersaglio);
  const a = dto.stato.acquistiEsca.find(a => a.id === o.bersaglio);
  return <>
    {s && <details open><summary className="touch">La visita e chi l’ha registrata</summary><p>{quando(s.momento)} · turno {s.turno.ordine} · {ORIGINE_TURNO[s.turno.origine]}{s.turno.revocato ? ' · revocato' : ''}.</p><FontiSessione sessione={s} /><RiepilogoOsservazionePesca osservazione={s.osservazione.dati} /></details>}
    {f && <FonteFatto fonte={f} />}
    {a && <p>Acquisto esca · {quando(a.momento)} · quantità {a.quantita} · costo {a.costo.toLocaleString('it-IT')} punti pesca.</p>}
  </>;
}

function ConfermaGestoPesca({ partitaId, pronto, onChiudi, onCambiato }: { partitaId: number; pronto: GestoPronto; onChiudi: (conclusa: boolean) => void; onCambiato: () => void | Promise<void> }) {
  const o = pronto.operazione;
  const anteprima = useCarica(async () => {
    const dto = await anteprimaPesca(partitaId, o);
    if (dto.azione !== o.azione || dto.bersaglio !== o.bersaglio || dto.stato.partitaId !== partitaId || !uguali(dto.richiesta, o.richiesta) || !/^[0-9a-f]{64}$/.test(dto.revisionePescaAttesa)) throw new Error('L’anteprima non corrisponde più a quello che stai registrando: rileggila prima di confermare.');
    if (o.azione === 'acquista-esca') {
      const costo = dto.acquistoEscaPrevisto;
      if (!costo || costo.unita !== 'punti-pesca' || costo.quantita !== o.richiesta.quantita || !Number.isSafeInteger(costo.costoUnitario) || costo.costoUnitario < 0 || !Number.isSafeInteger(costo.costoTotale) || costo.costoTotale !== costo.costoUnitario * costo.quantita) throw new Error('Il costo mostrato non corrisponde alla quantità comprata: rileggi l’anteprima prima di confermare.');
    }
    return dto;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- l'operazione si riconosce dal suo operazioneId: la stessa operazione non si rilegge
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
    } catch (e) { if (vivo.current) setErrore(`${acquisita ? 'Operazione registrata; la pagina non si è aggiornata: ' : ''}${erroreTesto(e)}`); }
    finally { blocco.current = false; if (vivo.current) setOccupato(false); }
  };
  return <Modal aperta larga titolo={pronto.titolo} onChiudi={() => { if (!occupato) onChiudi(ricevuta !== null); }} azioni={<>
    <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave={ricevuta ? 'chiudi' : 'indietro'} dimensione={22} />} titolo={ricevuta ? 'Chiudi' : 'Torna a quello che hai scritto'} disabled={occupato} onClick={() => onChiudi(ricevuta !== null)} />
    {!ricevuta && <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="raggiunto" dimensione={22} />} titolo="Conferma" disabled={occupato || !!pendente || rifiutata || !attestato || !anteprima.dati || anteprima.caricamento || !!anteprima.errore} onClick={() => void conferma()} />}
  </>}>
    <div className="flex min-w-0 flex-col gap-3 testo-13">
      <GestiPartita partitaId={partitaId} contestoChiave={o.richiesta.operazioneId} onCambiato={async (partitaRecuperata, esito) => {
        if (!vivo.current) return;
        const p = esito?.payload, r = esito?.ricevuta;
        const stessoPayload = partitaRecuperata === partitaId && esito?.operazioneId === o.richiesta.operazioneId && p?.tipo === 'pesca'
          && p.dati.azione === o.azione && p.dati.bersaglio === o.bersaglio && uguali(p.dati.richiesta, o.richiesta);
        const propriaRicevuta = stessoPayload && r !== null && r !== undefined && 'sessioneId' in r && r.operazioneId === o.richiesta.operazioneId
          && r.partitaId === partitaId && r.azione === o.azione && r.bersaglio === o.bersaglio && uguali(r.richiesta, o.richiesta);
        if (propriaRicevuta && r && 'sessioneId' in r) { setRicevuta(r); setErrore(null); onChiudi(true); }
        try { await onCambiato(); }
        catch (e) { if (vivo.current) setErrore(`Esito salvato; la pagina non si è aggiornata: ${erroreTesto(e)}`); }
      }} />
      {anteprima.caricamento && !anteprima.dati && <p role="status">Preparo il riepilogo…</p>}
      {anteprima.errore && <p role="alert" className="text-error-testo">{anteprima.errore}<PulsanteVisivo tono="fantasma" className="ml-2" icona={<IconaAzione chiave="ricalcola" dimensione={22} />} titolo="Rileggi l’anteprima" disabled={occupato || !!pendente || !!ricevuta} onClick={() => { setAttestato(false); void anteprima.ricarica(); }} /></p>}
      {anteprima.dati && <>
        <p className="m-0">{anteprima.dati.esitoPrevisto}</p>
        <BersaglioAnteprima dto={anteprima.dati} operazione={o} />
        {o.azione === 'salva-osservazione' && <><strong>La visita, corretta</strong><RiepilogoOsservazionePesca osservazione={o.richiesta.osservazione} /></>}
        {o.azione === 'registra-fatto' && <p>{nomeEventoPesca(o.bersaglio)} · {valoreFatto(o.richiesta.valore)} · {quando(o.richiesta.momento)}{o.richiesta.nota ? ` · ${o.richiesta.nota}` : ''}.</p>}
        {o.azione === 'acquista-esca' && <p>Acquisto: {o.richiesta.quantita} Boilie sospetto · {quando(o.richiesta.momento)}. {anteprima.dati.acquistoEscaPrevisto ? <>Costo:{anteprima.dati.acquistoEscaPrevisto.costoUnitario.toLocaleString('it-IT')} × {anteprima.dati.acquistoEscaPrevisto.quantita.toLocaleString('it-IT')} = {anteprima.dati.acquistoEscaPrevisto.costoTotale.toLocaleString('it-IT')} punti pesca.</> : 'Il costo previsto non è leggibile: nessuna conferma consentita.'} Possesso e uso non registrano una spesa.</p>}
        {o.azione === 'rettifica-punti' && <p>Saldo: {anteprima.dati.stato.saldoPunti === null ? 'non segnato' : anteprima.dati.stato.saldoPunti.toLocaleString('it-IT')} → {o.richiesta.saldoOsservato.toLocaleString('it-IT')} punti pesca. Le spese già fatte non vengono segnate una per una.</p>}
        <ul className="m-0 pl-4">{anteprima.dati.conseguenze.map((c, i) => <li key={i}>{c}</li>)}</ul>
        <ProfiliSessionePesca punto={anteprima.dati.punto} profili={anteprima.dati.profili} profiliPianificazione={anteprima.dati.profiliPianificazione} /><BeneficiPesca benefici={anteprima.dati.benefici} />
        {o.azione.startsWith('rimuovi-') && <p className="m-0">Quello che togli resta nel Cestino. Le eventuali correzioni di Doti e punti pesca si applicano dal pulsante sulla voce.</p>}
        {!ricevuta && <label className="touch flex items-start gap-2"><input type="checkbox" className="h-5 w-5 shrink-0" checked={attestato} disabled={occupato || !!pendente} onChange={e => setAttestato(e.target.checked)} /><span>Confermo: in questa partita va registrato così, con tutto quello che è mostrato sopra.</span></label>}
      </>}
      {ricevuta && <p role="status" className="m-0 text-success">Registrato: {ESITI_PESCA[ricevuta.esito] ?? 'operazione completata'}. Nessun nuovo invio da questa finestra.</p>}
      {errore && <p role="alert" className="m-0 text-error-testo">{errore}</p>}
      {rifiutata && <p role="alert" className="m-0 text-warning">Questa richiesta è stata rifiutata e non viene ripetuta. Torna a quello che hai scritto, correggilo e rivedi l’anteprima.</p>}
      {pendente && <p role="alert" className="m-0 text-warning">L’operazione non è ancora confermata: completala dall’elenco «Operazioni da completare».</p>}
    </div>
  </Modal>;
}

function CompilaGestoPesca({ partitaId, editor, stato, aperta, onChiudi, onPronto }: { partitaId: number; editor: EditorModulo; stato: StatoPescaDto; aperta: boolean; onChiudi: () => void; onPronto: (p: GestoPronto) => void }) {
  const [momento, setMomento] = useState<MomentoPescaInCompilazione>({ giorno: '', fascia: '', ordineVisita: null });
  const [valore, setValore] = useState<ValoreFattoPesca | ''>(''), [dataFatto, setDataFatto] = useState(''), [nota, setNota] = useState(''), [quantita, setQuantita] = useState('');
  const [osservazione, setOsservazione] = useState<OsservazionePesca | null>(() => editor.tipo === 'osservazione' ? structuredClone(editor.sessione.osservazione.dati) : null);
  useGestiPartita();
  const pendente = gestoPendenteNelloScope(partitaId, { pesca: true });
  const titolo = editor.tipo === 'osservazione' ? 'Correggi la visita' : editor.tipo === 'fatto' ? nomeEventoPesca(editor.evento) : editor.tipo === 'esca' ? 'Registra un acquisto di esca' : 'Correggi il saldo dei punti pesca';
  const intero = quantita.trim() !== '' && Number.isSafeInteger(Number(quantita)) && Number(quantita) >= (editor.tipo === 'saldo' ? 0 : 1) && Number(quantita) <= (editor.tipo === 'saldo' ? 999_999_999 : 1_000_000);
  const completo = editor.tipo === 'osservazione' ? osservazione !== null && !incoerenzeOsservazionePesca(osservazione).length : editor.tipo === 'fatto' ? valore !== '' && (dataFatto === 'ignota' || (dataFatto === 'nota' && momentoPescaCompleto(momento))) : editor.tipo === 'esca' ? intero && momentoPescaCompleto(momento) && stato.regola.stato === 'collegata' && !!stato.regola.dati : editor.tipo === 'saldo' ? intero : false;
  const prepara = (e: FormEvent) => {
    e.preventDefault(); if (!completo || pendente || !aperta) return;
    const operazioneId = nuovoId();
    if (editor.tipo === 'osservazione' && osservazione) onPronto({ titolo, operazione: { azione: 'salva-osservazione', bersaglio: editor.sessione.id, richiesta: { operazioneId, osservazione: structuredClone(osservazione) } } });
    else if (editor.tipo === 'fatto' && valore !== '' && (dataFatto === 'ignota' || momentoPescaCompleto(momento))) onPronto({ titolo, operazione: { azione: 'registra-fatto', bersaglio: editor.evento, richiesta: { operazioneId, valore, momento: dataFatto === 'ignota' ? null : { ...momento } as MomentoPesca, nota } } });
    else if (editor.tipo === 'esca' && momentoPescaCompleto(momento)) onPronto({ titolo, operazione: { azione: 'acquista-esca', bersaglio: null, richiesta: { operazioneId, momento: { ...momento }, quantita: Number(quantita) } } });
    else if (editor.tipo === 'saldo') onPronto({ titolo, operazione: { azione: 'rettifica-punti', bersaglio: null, richiesta: { operazioneId, saldoOsservato: Number(quantita) } } });
  };
  return <Modal aperta={aperta} larga titolo={titolo} onChiudi={onChiudi}>
    <form className="flex min-w-0 flex-col gap-3 testo-13" onSubmit={prepara}><fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0" disabled={!!pendente}>
      {editor.tipo === 'osservazione' && osservazione && <>
        <p className="m-0">{quando(editor.sessione.momento)}. La correzione resta sulla stessa visita e sullo stesso turno, e vale per tutte le registrazioni mostrate.</p><FontiSessione sessione={editor.sessione} />
        <OsservazionePescaForm partitaId={partitaId} valore={osservazione} onCambia={setOsservazione} mostraIncoerenze />
      </>}
      {editor.tipo === 'fatto' && <>
        <Selettore etichetta="Che cosa è successo" valore={valore} vuoto="Scegli" opzioni={[{ chiave: 'avvenuto', nome: 'Avvenuto' }, { chiave: 'non-avvenuto', nome: 'Non ancora avvenuto in quel momento' }, { chiave: 'ignoto', nome: 'Non si sa' }]} onCambia={v => setValore(v as ValoreFattoPesca)} />
        <Selettore etichetta="Sai quando è successo?" valore={dataFatto} vuoto="Scegli" opzioni={[{ chiave: 'nota', nome: 'Sì: giorno, fascia e visita' }, { chiave: 'ignota', nome: 'No' }]} onCambia={setDataFatto} />
        {dataFatto === 'nota' && <MomentoPescaForm valore={momento} onCambia={setMomento} />}
        <CampoTesto etichetta="Nota facoltativa" tipo="lungo" valore={nota} massimo={2000} onCambia={setNota} />
        <p className="m-0 text-text-secondary">Segnare un fatto non aggiunge visite né turni. Il Boss non vuol dire che hai preso anche il Guardiano; un fatto senza data non cambia i giorni passati.</p>
      </>}
      {editor.tipo === 'esca' && <><MomentoPescaForm valore={momento} onCambia={setMomento} /><CampoTesto etichetta="Boilie sospetto comprate" tipo="numero" valore={quantita} aiuto="Da 1 a 1.000.000" onCambia={setQuantita} /><p className="m-0">Costo di un’esca: {stato.regola.dati?.costoEscaPunti.toLocaleString('it-IT') ?? 'non disponibile'} punti pesca. Avere o usare un’esca non vuol dire averla comprata, e la spesa resta da approvare.</p></>}
      {editor.tipo === 'saldo' && <><p className="m-0">Saldo segnato ora: {stato.saldoPunti === null ? 'non segnato' : stato.saldoPunti.toLocaleString('it-IT')} punti pesca.</p><CampoTesto etichetta="Saldo che vedi nel gioco" tipo="numero" valore={quantita} onCambia={setQuantita} /><p className="m-0">Correggere il saldo non segna le spese già fatte, non cambia i punti già attribuiti e non toglie le proposte aperte.</p></>}
      </fieldset>{pendente && <p role="alert" className="m-0 text-warning">L’operazione di prima non è ancora confermata: completala dall’elenco «Operazioni da completare». Nessuna nuova dichiarazione viene inviata.</p>}
      <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-ghost touch" onClick={onChiudi}>Annulla</button><PulsanteVisivo type="submit" tono="secondario" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Rivedi prima di registrare" disabled={!completo || !!pendente} /></div>
    </form>
  </Modal>;
}

/** `promemoria` (Ondata 5, lotto F-bis): gli effetti dei libri letti che riguardano la pesca («Lo zen della pesca»), dal contatore delle attività. */
export function RegistroPesca(props: { partitaId: number; onCambiato?: () => void | Promise<void>; promemoria?: readonly string[] }) {
  return <RegistroPescaNelContesto key={props.partitaId} {...props} />;
}
function RegistroPescaNelContesto({ partitaId, onCambiato, promemoria }: { partitaId: number; onCambiato?: () => void | Promise<void>; promemoria?: readonly string[] }) {
  const gesti = useGestiPartita();
  const [editor, setEditor] = useState<Editor | null>(null), [pronto, setPronto] = useState<GestoPronto | null>(null);
  const [ultimoStato, setUltimoStato] = useState<StatoPescaDto | null>(null);
  const vivo = useRef(true), lettura = useRef(0);
  useLayoutEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const registro = useCarica(async () => {
    const questa = ++lettura.current, dto = await leggiPesca(partitaId);
    if (vivo.current && lettura.current === questa) setUltimoStato(dto);
    return dto;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- le versioni dei gesti (della partita e della guida) non entrano nella lettura: al loro cambio si rilegge
  }, [partitaId, gesti.versionePerPartita[partitaId] ?? 0, gesti.versioneGuida]);
  const pendente = gestoPendenteNelloScope(partitaId, { pesca: true });
  const s = registro.dati ?? ultimoStato;
  const cambiato = async () => { if (vivo.current) { await registro.ricarica(); if (vivo.current) await onCambiato?.(); } };
  const rimuovi = (azione: 'rimuovi-fonte' | 'rimuovi-sessione' | 'rimuovi-fatto' | 'rimuovi-acquisto-esca', bersaglio: string, titolo: string) => {
    if (!pendente) setPronto({ titolo, operazione: { azione, bersaglio, richiesta: { operazioneId: nuovoId() } } });
  };
  return <section id="pesca" className="card flex min-w-0 flex-col gap-3" aria-label="Registro della pesca">
    <div className="flex flex-wrap items-center justify-between gap-2"><TitoloSezione variante="display">Pesca a Ichigaya</TitoloSezione><PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="ricalcola" dimensione={22} />} titolo="Rileggi la pesca" disabled={registro.caricamento} onClick={() => void registro.ricarica()} /></div>
    <p className="m-0 testo-13">Visite, catture, fatti e spese si segnano ognuno per conto suo. Il vecchio conteggio delle visite non dice catture né premi, e il saldo cambia solo con una tua conferma.</p>
    <PromemoriaLibri promemoria={promemoria} />
    <GestiPartita partitaId={partitaId} onCambiato={cambiato} />
    {registro.caricamento && !s && <p role="status">Leggo la pesca…</p>}
    {registro.errore && <p role="alert" className="m-0 text-error-testo">{registro.errore}</p>}
    {s && <>
      <p className="m-0 testo-13">Saldo punti pesca: <strong>{s.saldoPunti === null ? 'non segnato' : s.saldoPunti.toLocaleString('it-IT')}</strong>. Conteggio attività: {s.contatore.volte}; turni dettagliati: {s.contatore.turni.length}; turni contati prima, senza dettaglio: {s.contatore.quoteNonRappresentate}.</p>
      {registro.caricamento && <p role="status" className="m-0 testo-12">Rilettura in corso: quello che vedi e quello che stai scrivendo restano. Ogni conferma passa da una nuova anteprima.</p>}
      {s.regola.stato !== 'collegata' && <p role="alert" className="m-0 text-warning">Regola non collegata integralmente: {s.regola.motivi.join(' ')}. I riferimenti personali esistenti restano visibili.</p>}
      {!!s.avvisi.length && <ul className="m-0 pl-4 text-warning">{s.avvisi.map((a, i) => <li key={i}>{a}</li>)}</ul>}
      <div className="flex flex-wrap gap-2"><PulsanteVisivo icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Registra una visita" disabled={!!pendente || s.regola.stato !== 'collegata'} onClick={() => setEditor({ tipo: 'manuale' })} /><PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="negozio" dimensione={22} />} titolo="Registra acquisto esca" disabled={!!pendente} onClick={() => setEditor({ tipo: 'esca' })} /><PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="modifica" dimensione={22} />} titolo="Correggi il saldo" disabled={!!pendente} onClick={() => setEditor({ tipo: 'saldo' })} /></div>
      <details><summary className="touch">Turni già contati e quote del conteggio</summary><p className="testo-13">Una visita si può collegare a un turno già contato o a una quota libera del conteggio di prima: non aggiunge turni né catture.</p><ul className="m-0 pl-4 testo-12">{s.contatore.turni.map(t => <li key={t.firma}>Turno {t.ordine}{t.raccordatoASessione ? ' · collegato a una visita' : ' · non collegato'}</li>)}</ul></details>
      <h3 className="m-0 testo-15">Visite registrate ·{s.sessioni.length}</h3>
      {!s.sessioni.length && <p className="m-0 testo-13">Nessuna visita registrata. Le visite contate prima restano nel conteggio.</p>}
      <ul className="m-0 flex min-w-0 list-none flex-col gap-3 p-0">{s.sessioni.map(v => <li key={v.id} className="flex min-w-0 flex-col gap-2 border-t border-border pt-2 testo-13">
        <strong>{quando(v.momento)} · {v.attiva ? 'registrata' : 'senza registrazioni attive'}{v.orfana ? ' · l’attività della guida non c’è più' : ''}</strong>
        <span>Turno {v.turno.ordine} · {ORIGINE_TURNO[v.turno.origine]}{v.turno.revocato ? ' · turno tolto dopo' : ''}.</span>
        <details><summary className="touch">Chi l’ha registrata</summary><FontiSessione sessione={v} /><div className="flex flex-wrap gap-2 pt-2">{v.fonti.map(f => <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo={<>Rivedi la rimozione {f.fonte.tipo === 'manuale' ? 'della dichiarazione a mano' : 'della voce del Diario'}</>} key={f.id} disabled={!!pendente} onClick={() => rimuovi('rimuovi-fonte', f.id, 'Togli solo questa registrazione della visita')} />)}</div></details>
        <RiepilogoOsservazionePesca osservazione={v.osservazione.dati} /><ProfiliSessionePesca punto={v.punto} profili={v.profili} profiliPianificazione={v.profiliPianificazione} /><BeneficiPesca benefici={v.benefici} />
        {!!v.avvisi.length && <ul className="m-0 pl-4 text-warning">{v.avvisi.map((a, i) => <li key={i}>{a}</li>)}</ul>}
        <details><summary className="touch">Correzioni della visita · {v.revisioni.length}</summary><ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">{v.revisioni.map(r => <li className="border-t border-border pt-2" key={r.id}><strong>Versione {r.versione}{r.id === v.osservazione.id ? ' · quella valida' : ''}</strong><RiepilogoOsservazionePesca osservazione={r.dati} /></li>)}</ul></details>
        <div className="flex flex-wrap gap-2"><PulsanteVisivo icona={<IconaAzione chiave="modifica" dimensione={22} />} titolo="Correggi la visita"disabled={!!pendente} onClick={() => setEditor({ tipo: 'osservazione', sessione: v })} />
          {/* L10-09: aggiungere una registrazione a una visita già segnata è un comando della visita, non più una scelta del modulo */}
          <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="piu" dimensione={22} />} titolo="Aggiungi a questa visita già segnata" disabled={!!pendente || s.regola.stato !== 'collegata' || turnoDellaVisita(v) === null} onClick={() => setEditor({ tipo: 'collega', sessione: v })} />
          <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Rivedi la rimozione della visita" disabled={!!pendente} onClick={() => rimuovi('rimuovi-sessione', v.id, 'Togli la visita e tutte le sue registrazioni')} /></div>
        {turnoDellaVisita(v) === null && <p className="m-0 text-text-secondary">Questa visita non è più contata nelle attività: non le si aggiungono altre registrazioni.</p>}
      </li>)}</ul>
      <h3 className="m-0 testo-15">Fatti della pesca</h3>
      <ul className="m-0 flex min-w-0 list-none flex-col gap-3 p-0">{EVENTI_PESCA.map(evento => {
        const f = s.fatti.find(f => f.evento === evento);
        return <li key={evento} className="flex min-w-0 flex-col gap-2 border-t border-border pt-2 testo-13">
          <strong>{nomeEventoPesca(evento)} · {f ? valoreFatto(f.valore) : 'non segnato'}</strong>
          <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="piu" dimensione={22} />} titolo="Segna a mano" className="self-start" disabled={!!pendente} onClick={() => setEditor({ tipo: 'fatto', evento })} />
          {f?.avvisi.map((a, i) => <p className="m-0 text-warning" key={i}>{a}</p>)}
          {!f?.fonti.length && <p className="m-0">Non ancora segnato: non vuol dire che non sia avvenuto.</p>}
          <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">{f?.fonti.map(fonte => <li key={fonte.id} className="flex min-w-0 flex-col gap-1 border-l border-border pl-2">
            <FonteFatto fonte={fonte} />
            {fonte.sessioneId ? <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="modifica" dimensione={22} />} titolo="Correggi la visita da cui viene" className="self-start" disabled={!!pendente || !s.sessioni.some(v => v.id === fonte.sessioneId)} onClick={() => { const sessione = s.sessioni.find(v => v.id === fonte.sessioneId); if (sessione) setEditor({ tipo: 'osservazione', sessione }); }} />
              : <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Rivedi la rimozione di questa registrazione" className="self-start" disabled={!!pendente} onClick={() => rimuovi('rimuovi-fatto', fonte.id, 'Togli solo questa registrazione del fatto')} />}
          </li>)}</ul>
        </li>;
      })}</ul>
      <h3 className="m-0 testo-15">Acquisti di esca ·{s.acquistiEsca.length}</h3>
      {!s.acquistiEsca.length && <p className="m-0 testo-13">Nessun acquisto registrato. Avere o usare un’esca si segna nella visita.</p>}
      <ul className="m-0 flex min-w-0 list-none flex-col gap-3 p-0">{s.acquistiEsca.map(a => <li key={a.id} className="flex min-w-0 flex-col gap-2 border-t border-border pt-2 testo-13"><strong>{quando(a.momento)} · {a.quantita} Boilie sospetto · {a.costo.toLocaleString('it-IT')} punti pesca{a.attivo ? '' : ' · rimosso'}</strong><BeneficiPesca benefici={a.benefici} />{a.attivo && <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Rivedi la rimozione dell’acquisto" className="self-start" disabled={!!pendente} onClick={() => rimuovi('rimuovi-acquisto-esca', a.id, 'Togli questo acquisto di esca')} />}</li>)}</ul>
      <Link className="touch self-start" to="/impostazioni">Apri il Cestino e le operazioni da completare</Link>
      {editor && (editor.tipo === 'manuale' || editor.tipo === 'collega')
        ? <RegistraVisitaPesca key={editor.tipo === 'collega' ? `collega:${editor.sessione.id}` : 'manuale'} partitaId={partitaId} collega={editor.tipo === 'collega' ? editor.sessione : null} onChiudi={() => setEditor(null)} onCambiato={cambiato} />
        : editor && <CompilaGestoPesca key={editor.tipo === 'osservazione' ? `${editor.tipo}:${editor.sessione.id}:${editor.sessione.osservazione.id}` : editor.tipo === 'fatto' ? `${editor.tipo}:${editor.evento}` : editor.tipo} partitaId={partitaId} editor={editor} stato={s} aperta={pronto === null} onChiudi={() => setEditor(null)} onPronto={setPronto} />}
    </>}
    {pronto && <ConfermaGestoPesca key={pronto.operazione.richiesta.operazioneId} partitaId={partitaId} pronto={pronto} onChiudi={conclusa => { setPronto(null); if (conclusa) setEditor(null); }} onCambiato={cambiato} />}
  </section>;
}
