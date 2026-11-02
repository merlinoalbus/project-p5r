// ============================================================
// RegistraVisitaPesca — «Registra una visita» in tre passi: Quando, Cosa hai pescato, Riepilogo (L10-09)
// ============================================================
//
// Stessi dati del modulo unico di prima, nessun campo tolto: giorno, fascia e ordine partono dalla data e dalla fascia della partita
// (l'ordine dopo l'ultima visita di quella fascia, «Cambia» per correggerlo); la domanda «L'avevi già contata nelle attività?» compare
// solo se ci sono visite contate prima senza dettaglio; al passo 2 i pesci si contano, Perizia e quota si scelgono a tocco e il resto sta
// in «Altri dettagli · facoltativi», chiuso. Il passo 3 è l'anteprima del server (frasi, profili, premi da approvare) e il tocco su
// «Registra la visita» è la conferma: niente spunta in più. La protezione resta quella di sempre: si registra solo la richiesta di
// cui si è vista l'anteprima, con la sua firma (`revisionePescaAttesa`), che il server ricalcola e confronta prima di scrivere.
// Con `collega` il foglio aggiunge una registrazione a una visita già segnata (il comando della visita): solo il riepilogo.
// Con `voce` è la pesca di una voce del Diario da completare in «Da applicare» (decisione dell'utente del 01/11): giorno e fascia sono quelli
// della voce, fissi (modificabili solo se la voce non li ha); per una visita nuova «L'avevi già contata nelle attività?» si fa sempre,
// senza risposta già scelta, e va data per andare avanti; al passo 1 si può invece aggiungere la voce a una visita già segnata quel giorno
// e in quella fascia (allora la domanda non si fa, vale il turno di quella visita e si salta al riepilogo, con i dati della visita com'erano). Il foglio non scrive: «Rivedi la proposta completa» passa la
// richiesta con la firma dell'anteprima a `voce.onConferma`, cioè alla decisione della voce, che ha la sua anteprima e la sua conferma.
// ============================================================

import { useLayoutEffect, useRef, useState } from 'react';
import { SPECIE_PESCA, incoerenzeOsservazionePesca, nomeSpeciePesca, type FontePesca, type NuovaSessionePesca, type OsservazionePesca, type RichiestaRegistraSessionePesca, type SessionePescaDto } from '../../../shared/pesca';
import { getFortuna } from '../../services/api';
import { anteprimaPesca, leggiPesca } from '../../services/api/pesca';
import { eseguiPescaConRegistro, gestoPendenteNelloScope, useGestiPartita } from '../../services/gestiPartita';
import { useCarica } from '../../hooks/useCarica';
import { usePartitaStore } from '../../stores/partitaStore';
import { fortunaDelConsumo } from '../../utils/fortunaConsumo';
import { dataGiocoTesto } from '../../utils/dateGioco';
import { dataConArticolo } from '../../../shared/condizioniSpillo';
import { momentoPescaCompleto, osservazionePescaIgnota } from '../../utils/pesca';
import { Modal } from '../shared/Modal';
import { Campo } from '../shared/Campo';
import { Selettore } from '../shared/Selettore';
import { SelettoreData } from '../shared/SelettoreData';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { GestiPartita } from '../partita/GestiPartita';
import { MeteoOsservatoPesca, NumeroOsservatoPesca, RangoPeriziaOsservato, SceltaOsservata } from './CampiPesca';
import { BeneficiPesca, ProfiliSessionePesca, RiepilogoOsservazionePesca } from './ProfiliPesca';
import {
  aggiungiPesce, conDettaglioPesce, conFinale, conFortunaDallaPartita, conPerizia, conQuota, nessunPesce,
  ordinale, ordineVisitaSuccessivo, osservazioneDelGiorno, pesciIgnoti, quantiPesci, richiestaVisita, scelteConto, togliPesce, turnoDellaScelta, turnoDellaVisita,
} from './visitaPesca';

const nuovoId = () => crypto.randomUUID().replaceAll('-', '');
const testoErrore = (e: unknown) => e instanceof Error ? e.message : 'Operazione non riuscita.';
const canonico = (v: unknown): unknown => Array.isArray(v) ? v.map(canonico) : v && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonico(x)])) : v;
const uguali = (a: unknown, b: unknown) => JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));

type Passo = 1 | 2 | 3;
const PASSI: ReadonlyArray<{ passo: Passo; nome: string }> = [{ passo: 1, nome: 'Quando' }, { passo: 2, nome: 'Cosa hai pescato' }, { passo: 3, nome: 'Riepilogo' }];
const fasciaTesto = (f: 'giorno' | 'sera') => f === 'sera' ? 'di sera' : 'di giorno';

/** Una scelta a tocco (chip da 44 px) fra poche risposte; quella scelta è accesa. */
function SceltaATocco<T extends string>({ etichetta, valore, opzioni, onCambia, disabilitato }: {
  etichetta: string; valore: T; opzioni: ReadonlyArray<{ chiave: T; nome: string; dettaglio?: string }>; onCambia: (v: T) => void; disabilitato?: boolean;
}) {
  return <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0" disabled={disabilitato}>
    <legend className="mb-2 p-0 testo-12 font-semibold uppercase tracking-wider text-text-secondary">{etichetta}</legend>
    <div className="flex min-w-0 flex-wrap gap-2">{opzioni.map(o => <button key={o.chiave} type="button" aria-pressed={valore === o.chiave}
      className={valore === o.chiave ? 'chip chip--attivo touch flex-1 justify-center testo-13' : 'chip touch flex-1 justify-center testo-13'} onClick={() => onCambia(o.chiave)}>
      <span>{o.nome}{o.dettaglio && <span className="block testo-12 font-normal text-text-secondary">{o.dettaglio}</span>}</span>
    </button>)}</div>
  </fieldset>;
}

/** I pesci presi in parole: «non li ricordi», «nessuno», «1 Guardiano di Ichigaya, 2 altri pesci». */
function pesciInParole(o: OsservazionePesca): string {
  if (o.catture === null) return 'non li ricordi';
  if (!o.catture.length) return 'nessuno';
  return SPECIE_PESCA.map(s => ({ s, n: quantiPesci(o, s.chiave) ?? 0 })).filter(x => x.n > 0)
    .map(({ s, n }) => s.chiave === 'altro' ? `${n} ${n === 1 ? 'altro pesce' : 'altri pesci'}` : `${n} ${s.nome}`).join(', ');
}
const sinoTesto = (v: boolean | null) => v === null ? 'non ricordi' : v ? 'sì' : 'no';
const periziaTesto = (e: OsservazionePesca['perizia']['esito']) => e === 'ignota' ? 'non ricordi' : e === 'ricevuta' ? 'ricevuta' : 'non ricevuta';

/** La pesca di una voce del Diario da completare in «Da applicare»: da dove viene, il giorno e la fascia della voce (se li ha) e la
 *  decisione della voce a cui passare la richiesta firmata. */
export interface PescaDellaVoce {
  fonte: Extract<FontePesca, { tipo: 'diario' }>;
  giorno?: string;
  fascia?: 'giorno' | 'sera';
  onConferma: (r: RichiestaRegistraSessionePesca) => Promise<unknown>;
}

/** Un dato che viene dalla voce e non si cambia: l'etichetta come quella dei campi, il valore in grassetto. */
function DatoDellaVoce({ etichetta, valore }: { etichetta: string; valore: string }) {
  return <div className="flex min-w-0 flex-col gap-1">
    <span className="testo-12 font-semibold uppercase tracking-wider text-text-secondary">{etichetta}</span>
    <span className="min-w-0 break-words"><strong>{valore}</strong> <span className="testo-12 text-text-secondary">· quello della voce</span></span>
  </div>;
}

export function RegistraVisitaPesca({ partitaId, collega, voce, onChiudi, onCambiato }: {
  partitaId: number;
  /** La visita già segnata a cui aggiungere una registrazione (il comando della visita); `null` per una visita nuova. */
  collega: SessionePescaDto | null;
  /** La pesca di una voce del Diario («Da applicare»): il foglio prepara la richiesta e la passa alla decisione della voce, senza scrivere. */
  voce?: PescaDellaVoce;
  onChiudi: () => void; onCambiato?: () => void | Promise<void>;
}) {
  const gesti = useGestiPartita();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- la versione dei gesti della partita non entra nella lettura: al suo cambio si rilegge
  const registro = useCarica(() => leggiPesca(partitaId), [partitaId, gesti.versionePerPartita[partitaId] ?? 0]);
  const stato = registro.dati;
  // La data e la fascia della partita (anche se non è quella attiva): sono il punto di partenza, e il «giorno di oggi» della Fortuna
  const partita = usePartitaStore(s => s.partite.find(p => p.id === partitaId) ?? (s.attiva?.id === partitaId ? s.attiva : null));
  const oggi = partita?.dataGioco ?? null;
  // della visita da collegare conta l'id: con una visita la Fortuna non si legge
  const idCollega = collega?.id ?? null;
  const fortuna = useCarica(() => idCollega !== null ? Promise.resolve(null) : getFortuna(partitaId), [partitaId, idCollega]);

  // Con la voce: giorno e fascia della voce, fissi; se la voce non li ha si scelgono (si parte vuoti, come nel modulo di prima: la data
  // della partita non è quella di una voce già fatta). Senza voce: quelli della partita.
  const giornoFisso = !!voce?.giorno, fasciaFissa = !!voce?.fascia;
  const [passo, setPasso] = useState<Passo>(collega ? 3 : 1);
  const [giorno, setGiorno] = useState(() => voce ? voce.giorno ?? '' : oggi ?? '');
  const [fascia, setFascia] = useState<'giorno' | 'sera' | ''>(() => voce ? voce.fascia ?? '' : partita?.fasciaGioco ?? '');
  const [ordineScelto, setOrdineScelto] = useState<number | null>(null), [cambiaOrdine, setCambiaOrdine] = useState(false);
  // con la voce la risposta sul conto non è già scelta: va data
  const [conto, setConto] = useState(() => voce ? '' : 'nuovo');
  // con la voce: '' = una visita nuova, altrimenti l'id della visita già segnata quel giorno e in quella fascia a cui aggiungere la voce
  const [visitaScelta, setVisitaScelta] = useState('');
  const [osservazione, setOsservazione] = useState<OsservazionePesca>(() => osservazionePescaIgnota(voce ? voce.giorno ?? '' : oggi ?? ''));
  const [richiesta, setRichiesta] = useState<NuovaSessionePesca | null>(() => {
    const t = collega ? turnoDellaVisita(collega) : null;
    return collega && t ? richiestaVisita({ operazioneId: nuovoId(), momento: collega.momento, fonte: { tipo: 'manuale' }, collega: collega.id, turno: t, osservazione: collega.osservazione.dati }) : null;
  });
  const [occupato, setOccupato] = useState(false), [confermato, setConfermato] = useState(false), [errore, setErrore] = useState<string | null>(null);
  const blocco = useRef(false), vivo = useRef(true);
  useLayoutEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const pendente = gestoPendenteNelloScope(partitaId, { pesca: true });

  // L'anteprima del server, letta quando si arriva al riepilogo: una richiesta nuova (un operazioneId nuovo) per ogni arrivo
  const anteprima = useCarica(async () => {
    if (!richiesta) return null;
    const dto = await anteprimaPesca(partitaId, { azione: 'registra-sessione', bersaglio: null, richiesta });
    if (dto.azione !== 'registra-sessione' || !uguali(dto.richiesta, richiesta) || dto.stato.partitaId !== partitaId || !/^[0-9a-f]{64}$/.test(dto.revisionePescaAttesa))
      throw new Error('Il riepilogo non corrisponde più alla visita che stai registrando: rileggilo prima di registrare.');
    if (richiesta.scelta.tipo === 'collega') {
      const id = richiesta.scelta.sessioneId;
      if (!dto.stato.sessioni.some(s => s.id === id)) throw new Error('Il riepilogo non mostra più la visita scelta: rileggilo prima di registrare.');
    }
    return dto;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- la richiesta si riconosce dal suo operazioneId: uno nuovo per ogni arrivo al riepilogo
  }, [partitaId, richiesta?.operazioneId ?? null]);

  // Il giorno di gioco della Fortuna sulla Perizia, dalla partita (come prima: un valore già segnato non si riscrive)
  const dalloStato = collega ? null : fortunaDelConsumo(fortuna.dati ?? null, osservazione.fortuna.giorno, 'perizia', oggi);
  const osservazioneEffettiva = conFortunaDallaPartita(osservazione, dalloStato);
  const ordineCalcolato = stato && giorno && (fascia === 'giorno' || fascia === 'sera') ? ordineVisitaSuccessivo(stato.sessioni, giorno, fascia) : null;
  const ordineVisita = cambiaOrdine ? ordineScelto : ordineCalcolato;
  const momento = { giorno, fascia, ordineVisita };
  const fonte: FontePesca = voce ? voce.fonte : { tipo: 'manuale' };
  const scelte = stato ? scelteConto(stato) : [];
  const turno = stato ? turnoDellaScelta(stato, conto) : null;
  // con la voce: le visite già segnate quel giorno e in quella fascia, e quella scelta (se dopo una rilettura non c'è più, va riscelta)
  const visiteDelMomento = voce && stato && giorno && (fascia === 'giorno' || fascia === 'sera')
    ? stato.sessioni.filter(s => s.momento.giorno === giorno && s.momento.fascia === fascia).sort((a, b) => a.momento.ordineVisita - b.momento.ordineVisita) : [];
  const visita = visitaScelta ? visiteDelMomento.find(s => s.id === visitaScelta) ?? null : null;
  const turnoVisita = visita ? turnoDellaVisita(visita) : null;
  const incoerenze = incoerenzeOsservazionePesca(osservazioneEffettiva);
  const regolaPronta = stato?.regola.stato === 'collegata';
  const spento = occupato || confermato || !!pendente || !stato;
  const passo1Pronto = !spento && regolaPronta && (visitaScelta ? !!visita && turnoVisita !== null : momentoPescaCompleto(momento) && turno !== null);
  const giaUsato = ordineVisita !== null && !!stato?.sessioni.some(s => s.momento.giorno === giorno && s.momento.fascia === fascia && s.momento.ordineVisita === ordineVisita);
  const titolo = voce ? 'Completa la pesca della voce già fatta' : collega ? 'Aggiungi a questa visita già segnata' : 'Registra una visita';
  // la visita già segnata del riepilogo: quella del comando della visita o quella scelta per la voce
  const visitaDelRiepilogo = collega ?? (richiesta?.scelta.tipo === 'collega' ? visita : null);

  const cambia = (o: OsservazionePesca) => setOsservazione(o);
  // con la voce, cambiare giorno o fascia toglie la scelta della visita già segnata (era di quel giorno e di quella fascia)
  const cambiaGiorno = (g: string) => { setGiorno(g); setOsservazione(o => osservazioneDelGiorno(o, g)); setVisitaScelta(''); };
  const cambiaFascia = (f: 'giorno' | 'sera' | '') => { setFascia(f); setVisitaScelta(''); };
  const avantiDalPasso1 = () => {
    if (!passo1Pronto) return;
    setErrore(null);
    if (!visitaScelta) { setPasso(2); return; }
    // la voce si aggiunge a una visita già segnata: momento e osservazione restano quelli della visita, si va al riepilogo
    if (!visita || !turnoVisita) return;
    setPasso(3);
    setRichiesta(richiestaVisita({ operazioneId: nuovoId(), momento: visita.momento, fonte, collega: visita.id, turno: turnoVisita, osservazione: visita.osservazione.dati }));
  };
  const vaiAlRiepilogo = () => {
    if (!passo1Pronto || visitaScelta || incoerenze.length || fortuna.caricamento || !momentoPescaCompleto(momento) || !turno) return;
    setErrore(null); setPasso(3);
    setRichiesta(richiestaVisita({ operazioneId: nuovoId(), momento, fonte, collega: null, turno, osservazione: osservazioneEffettiva }));
  };
  const indietro = () => { setErrore(null); if (passo === 3) { setRichiesta(null); setPasso(visitaScelta ? 1 : 2); } else setPasso(1); };
  /** Con la voce: la richiesta con la firma dell'anteprima passa alla decisione della voce (che apre la sua anteprima); qui non si scrive. */
  const prosegui = async () => {
    const dto = anteprima.dati;
    if (!voce || blocco.current || !richiesta || !dto || anteprima.caricamento || anteprima.errore || pendente) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    try {
      await voce.onConferma({ ...richiesta, revisionePescaAttesa: dto.revisionePescaAttesa });
    } catch (e) {
      if (vivo.current) {
        setErrore(testoErrore(e));
        // un rifiuto chiede un riepilogo nuovo (una richiesta nuova), con i dati segnati che restano
        if (!gestoPendenteNelloScope(partitaId, { pesca: true })) { await registro.ricarica(); if (vivo.current) setRichiesta({ ...richiesta, operazioneId: nuovoId() }); }
      }
    } finally { blocco.current = false; if (vivo.current) setOccupato(false); }
  };
  const registra = async () => {
    const dto = anteprima.dati;
    if (blocco.current || !richiesta || !dto || anteprima.caricamento || anteprima.errore || confermato || pendente) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    let acquisita = false;
    try {
      const { revisionePescaAttesa } = dto;
      await eseguiPescaConRegistro(partitaId, { azione: 'registra-sessione', richiesta, bersaglio: null, revisionePescaAttesa }, { etichetta: titolo, pesca: true });
      acquisita = true;
      if (vivo.current) { setConfermato(true); await onCambiato?.(); }
    } catch (e) {
      if (vivo.current) {
        setErrore(acquisita ? `Visita registrata; la pagina non si è aggiornata: ${testoErrore(e)}` : testoErrore(e));
        // un rifiuto (la pesca è cambiata dopo il riepilogo, una richiesta rifiutata) chiede un riepilogo nuovo; i dati scritti restano
        if (!acquisita && !gestoPendenteNelloScope(partitaId, { pesca: true })) { await registro.ricarica(); if (vivo.current && richiesta) setRichiesta({ ...richiesta, operazioneId: nuovoId() }); }
      }
    } finally { blocco.current = false; if (vivo.current) setOccupato(false); }
  };

  const azioni = confermato
    ? <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="chiudi" dimensione={22} />} titolo="Chiudi" onClick={onChiudi} />
    : <>
      {passo === 1 || collega
        ? <PulsanteVisivo tono="fantasma" className="mr-auto" icona={<IconaAzione chiave="chiudi" dimensione={22} />} titolo="Annulla" disabled={occupato} onClick={onChiudi} />
        : <PulsanteVisivo tono="fantasma" className="mr-auto" icona={<IconaAzione chiave="indietro" dimensione={22} />} titolo={passo === 3 ? 'Correggi' : 'Indietro'} disabled={occupato} onClick={indietro} />}
      {passo === 1 && <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="esegui" dimensione={22} />} titolo="Avanti" disabled={!passo1Pronto} onClick={avantiDalPasso1} />}
      {passo === 2 && <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="esegui" dimensione={22} />} titolo="Avanti" disabled={!passo1Pronto || !!incoerenze.length || fortuna.caricamento} onClick={vaiAlRiepilogo} />}
      {passo === 3 && <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="raggiunto" dimensione={22} />} titolo={voce ? 'Rivedi la proposta completa' : 'Registra la visita'}
        disabled={occupato || !!pendente || !richiesta || !anteprima.dati || anteprima.caricamento || !!anteprima.errore} onClick={() => void (voce ? prosegui() : registra())} />}
    </>;

  return <Modal aperta larga titolo={titolo} onChiudi={() => { if (!occupato) onChiudi(); }} azioni={azioni}>
    {/* con la voce il foglio non scrive: i gesti della partita li segue «Da applicare», che decide */}
    {!voce && <GestiPartita partitaId={partitaId} onCambiato={async (id, recupero) => {
      if (!vivo.current) return;
      const r = richiesta;
      const proprioSuccesso = id === partitaId && r && recupero?.operazioneId === r.operazioneId
        && recupero.payload.tipo === 'pesca' && recupero.payload.dati.azione === 'registra-sessione'
        && uguali(recupero.payload.dati.richiesta, r) && recupero.ricevuta && 'sessioneId' in recupero.ricevuta
        && recupero.ricevuta.azione === 'registra-sessione' && recupero.ricevuta.operazioneId === r.operazioneId
        && recupero.ricevuta.partitaId === partitaId && uguali(recupero.ricevuta.richiesta, r);
      if (proprioSuccesso) { setConfermato(true); setErrore(null); }
      else if (r) setRichiesta({ ...r, operazioneId: nuovoId() });
      await registro.ricarica();
      if (vivo.current) await onCambiato?.();
    }} />}
    {!collega && <ol className="m-0 flex min-w-0 list-none gap-1 p-0" aria-label="Passi">{PASSI.map(p => <li key={p.passo} className="flex min-w-0 flex-1">
      <span aria-current={p.passo === passo ? 'step' : undefined} className={p.passo === passo ? 'chip chip--attivo w-full justify-center text-center' : 'chip w-full justify-center text-center'}>{p.passo} · {p.nome}</span>
    </li>)}</ol>}
    {registro.caricamento && !stato && <p role="status" className="m-0 testo-13">Leggo le visite…</p>}
    {registro.errore && <p role="alert" className="m-0 testo-13 text-error-testo">{registro.errore}<PulsanteVisivo tono="fantasma" className="ml-2" icona={<IconaAzione chiave="ricalcola" dimensione={22} />} titolo="Rileggi" onClick={() => void registro.ricarica()} /></p>}
    {stato && !regolaPronta && <p role="alert" className="m-0 testo-13 text-warning">La regola della pesca non è completa: {stato.regola.motivi.join(' ')} Finché non viene sistemata non si registrano visite.</p>}

    {passo === 1 && <div className="flex min-w-0 flex-col gap-4 testo-13">
      {giornoFisso
        ? <DatoDellaVoce etichetta="Giorno" valore={dataGiocoTesto(giorno)} />
        : <Campo etichetta="Giorno" aiuto={giorno && giorno === oggi ? 'Oggi nella partita' : undefined} senzaGruppo>
          <SelettoreData etichetta="Giorno della visita" valore={giorno} disabilitato={spento} onCambia={cambiaGiorno} />
        </Campo>}
      {fasciaFissa && (fascia === 'giorno' || fascia === 'sera')
        ? <DatoDellaVoce etichetta="Fascia" valore={fascia === 'sera' ? 'Di sera' : 'Di giorno'} />
        : <SceltaATocco etichetta="Fascia" valore={fascia} disabilitato={spento} opzioni={[{ chiave: 'giorno', nome: 'Di giorno' }, { chiave: 'sera', nome: 'Di sera' }]} onCambia={cambiaFascia} />}
      {/* con la voce: una visita nuova o la voce aggiunta a una visita già segnata quel giorno e in quella fascia (come il modulo di prima) */}
      {voce && visiteDelMomento.length > 0 && <div className="flex min-w-0 flex-col gap-2">
        <SceltaATocco etichetta="Visita" valore={visitaScelta} disabilitato={spento}
          opzioni={[{ chiave: '', nome: 'Una visita nuova' }, ...visiteDelMomento.map(s => ({ chiave: s.id, nome: `Aggiungi alla ${ordinale(s.momento.ordineVisita + 1)} visita`,
            dettaglio: `${s.attiva ? 'già segnata' : 'senza registrazioni attive'}${s.orfana ? ' · l’attività della guida non c’è più' : ''}` }))]}
          onCambia={setVisitaScelta} />
        {visita && <p className="m-0 text-text-secondary">Quello che avevi segnato della visita resta com’è: la voce si aggiunge, e la visita resta una sola.</p>}
        {visita && !turnoVisita && <p role="alert" className="m-0 text-warning">Il turno di questa visita non c’è più o è stato tolto: aggiungerle la voce non lo rimette.</p>}
      </div>}
      {voce && visitaScelta && !visita && <p role="alert" className="m-0 text-warning">La visita scelta non c’è più: scegli di nuovo.<PulsanteVisivo tono="fantasma" className="ml-2" icona={<IconaAzione chiave="ricalcola" dimensione={22} />} titolo="Una visita nuova" onClick={() => setVisitaScelta('')} /></p>}
      {!visitaScelta && <div className="card flex min-w-0 flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1">{ordineVisita !== null && momentoPescaCompleto(momento)
          ? <>Sarà la <strong>{ordinale(ordineVisita + 1)} visita</strong> {fasciaTesto(momento.fascia)} {dataConArticolo(giorno, 'di')}.</>
          : 'Scegli giorno e fascia: l’ordine della visita si calcola da solo.'}</span>
        {!cambiaOrdine
          ? <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Cambia" disabled={spento || ordineCalcolato === null} onClick={() => { setOrdineScelto(ordineCalcolato); setCambiaOrdine(true); }} />
          : <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="ricalcola" dimensione={20} />} titolo="Calcola da solo" disabled={spento} onClick={() => { setCambiaOrdine(false); setOrdineScelto(null); }} />}
        {cambiaOrdine && <div className="w-full"><NumeroOsservatoPesca etichetta="Quale visita era in quella fascia (1ª, 2ª…)" valore={ordineScelto === null ? null : ordineScelto + 1}
          minimo={1} massimo={1_000_001} disabilitato={spento} onCambia={n => setOrdineScelto(n === null ? null : n - 1)} /></div>}
        {giaUsato && <p className="m-0 w-full text-warning">C’è già una visita segnata con quest’ordine in quella fascia.</p>}
      </div>}
      {/* con la voce la domanda si fa sempre e la risposta va data; senza, solo se c'è più di una risposta (L10-09) */}
      {!visitaScelta && (voce ? scelte.length > 0 : scelte.length > 1) && <div className="flex min-w-0 flex-col gap-2 rounded border border-dashed border-border-input p-3">
        <SceltaATocco etichetta="L’avevi già contata nelle attività?" valore={conto} disabilitato={spento} opzioni={scelte} onCambia={setConto} />
        {conto === '' && <p className="m-0 text-text-secondary">Rispondi per andare avanti.</p>}
        {conto !== '' && turno === null && <p role="alert" className="m-0 text-warning">Quella visita contata non c’è più: scegli di nuovo.</p>}
      </div>}
    </div>}

    {passo === 2 && <div className="flex min-w-0 flex-col gap-4 testo-13">
      <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0" disabled={spento}>
        <legend className="mb-2 p-0 testo-12 font-semibold uppercase tracking-wider text-text-secondary">Pesci presi</legend>
        <ul className="m-0 flex min-w-0 list-none flex-col p-0">{SPECIE_PESCA.map(s => {
          const n = quantiPesci(osservazione, s.chiave);
          return <li key={s.chiave} className="flex min-w-0 items-center gap-2 border-b border-border py-1">
            <span className="min-w-0 flex-1">{s.nome}</span>
            <span className="condizione-numero shrink-0" role="group" aria-label={`Quanti: ${s.nome}`}>
              <button type="button" aria-label={`${s.nome}: uno in meno`} disabled={spento || !n} onClick={() => cambia(togliPesce(osservazione, s.chiave))}><IconaAzione chiave="meno" dimensione={16} /></button>
              <span className="condizione-numero__valore" aria-live="polite">{n === null ? '–' : n}</span>
              <button type="button" aria-label={`${s.nome}: uno in più`} disabled={spento || (osservazione.catture?.length ?? 0) >= 1000} onClick={() => cambia(aggiungiPesce(osservazione, s.chiave, nuovoId()))}><IconaAzione chiave="piu" dimensione={16} /></button>
            </span>
          </li>;
        })}</ul>
        <div className="mt-2 flex min-w-0 flex-wrap gap-2">
          <button type="button" aria-pressed={osservazione.catture === null} className={osservazione.catture === null ? 'chip chip--attivo touch testo-13' : 'chip touch testo-13'} onClick={() => cambia(pesciIgnoti(osservazione))}>Non ricordo i pesci</button>
          <button type="button" aria-pressed={osservazione.catture?.length === 0} className={osservazione.catture?.length === 0 ? 'chip chip--attivo touch testo-13' : 'chip touch testo-13'} onClick={() => cambia(nessunPesce(osservazione))}>Nessun pesce</button>
        </div>
      </fieldset>
      <SceltaATocco etichetta="Perizia ricevuta alla fine?" valore={osservazione.perizia.esito} disabilitato={spento}
        opzioni={[{ chiave: 'ricevuta', nome: 'Sì' }, { chiave: 'non-ricevuta', nome: 'No' }, { chiave: 'ignota', nome: 'Non ricordo' }]} onCambia={v => cambia(conPerizia(osservazione, v))} />
      <SceltaATocco etichetta="Quota d’ingresso pagata?" valore={osservazione.quota.pagata === null ? 'ignota' : osservazione.quota.pagata ? 'si' : 'no'} disabilitato={spento}
        opzioni={[{ chiave: 'si', nome: 'Sì' }, { chiave: 'no', nome: 'No' }, { chiave: 'ignota', nome: 'Non ricordo' }]} onCambia={v => cambia(conQuota(osservazione, v === 'ignota' ? null : v === 'si'))} />
      <details className="card min-w-0">
        <summary className="touch cursor-pointer"><strong>Altri dettagli</strong> <span className="testo-12 text-text-secondary">· facoltativi</span></summary>
        <fieldset className="m-0 mt-3 flex min-w-0 flex-col gap-3 border-0 p-0" disabled={spento}>
          <div className="griglia-campi">
            <RangoPeriziaOsservato valore={osservazione.rangoPeriziaOsservato} disabilitato={spento}
              onCambia={r => cambia({ ...osservazione, rangoPeriziaOsservato: r, provenienzaRango: r === null ? 'ignoto' : 'dichiarato' })} />
            <NumeroOsservatoPesca etichetta="Tentativi già fatti nella visita" valore={osservazione.tentativiConsumati} massimo={7} disabilitato={spento} onCambia={tentativiConsumati => cambia({ ...osservazione, tentativiConsumati })} />
            <MeteoOsservatoPesca valore={osservazione.meteo} disabilitato={spento} onCambia={meteo => cambia({ ...osservazione, meteo })} />
            <SceltaOsservata etichetta="Allerta ondata di gelo" valore={osservazione.allertaGelo} disabilitato={spento} onCambia={allertaGelo => cambia({ ...osservazione, allertaGelo })} />
            <SceltaOsservata etichetta="Avevi il Boilie sospetto nella visita?" valore={osservazione.escaSpecialePosseduta} disabilitato={spento} onCambia={escaSpecialePosseduta => cambia({ ...osservazione, escaSpecialePosseduta })} />
            <SceltaOsservata etichetta="Terzo semestre già in corso?" valore={osservazione.faseTerzoSemestre} disabilitato={spento} onCambia={faseTerzoSemestre => cambia({ ...osservazione, faseTerzoSemestre })} />
            <Selettore etichetta="Come è finita la visita" valore={osservazione.finale.tipo} disabilitato={spento}
              opzioni={[{ chiave: 'ignoto', nome: 'Non lo so' }, { chiave: 'uscita-dopo-riscossione', nome: 'Uscito dopo aver ritirato i premi' }, { chiave: 'uscita-senza-riscossione', nome: 'Uscito senza ritirare i premi' }]}
              onCambia={v => cambia(conFinale(osservazione, v as OsservazionePesca['finale']['tipo'], nuovoId))} />
            <SceltaOsservata etichetta="Hai ripreso a pescare dopo aver ritirato i premi?" valore={osservazione.finale.ripresaDopoRiscossione} disabilitato={spento}
              onCambia={ripresaDopoRiscossione => cambia({ ...osservazione, finale: { ...osservazione.finale, ripresaDopoRiscossione } })} />
          </div>
          {!!osservazione.catture?.length && <div className="flex min-w-0 flex-col gap-2">
            <strong>A quale tentativo è arrivato ogni pesce</strong>
            <ul className="m-0 flex min-w-0 list-none flex-col gap-3 p-0">{osservazione.catture.map((c, i) => <li key={c.id} className="flex min-w-0 flex-col gap-2 border-t border-border pt-2">
              <span>{i + 1}. {nomeSpeciePesca(c.specie)}</span>
              <div className="griglia-campi">
                <NumeroOsservatoPesca etichetta="A quale tentativo" valore={c.tentativo} minimo={1} massimo={7} disabilitato={spento} onCambia={tentativo => cambia(conDettaglioPesce(osservazione, c.id, { tentativo }))} />
                <NumeroOsservatoPesca etichetta="Ordine nella visita" valore={c.posizione} disabilitato={spento} onCambia={posizione => cambia(conDettaglioPesce(osservazione, c.id, { posizione }))} />
              </div>
            </li>)}</ul>
          </div>}
          <p className="m-0">Fortuna sulla Perizia quel giorno: <strong>{osservazioneEffettiva.fortuna.attiva === null ? 'non segnata nella partita' : osservazioneEffettiva.fortuna.attiva ? 'accesa' : 'non accesa'}</strong> (la legge dalla partita).</p>
          <p className="m-0 testo-12 text-text-secondary">Lascia vuoto quello che non ricordi. Avere o usare un’esca non vuol dire averla comprata, e il rango di oggi non dice quello di una visita passata.</p>
        </fieldset>
      </details>
      {fortuna.errore && <p role="alert" className="m-0 text-warning">Non si legge la Fortuna della partita: {fortuna.errore} Per una visita di oggi rileggi prima di andare avanti.<PulsanteVisivo tono="fantasma" className="ml-2" icona={<IconaAzione chiave="ricalcola" dimensione={22} />} titolo="Rileggi" onClick={() => void fortuna.ricarica()} /></p>}
      {!!incoerenze.length && <ul role="alert" className="m-0 pl-4 text-warning">{incoerenze.map((e, i) => <li key={i}>{e}</li>)}</ul>}
    </div>}

    {passo === 3 && <div className="flex min-w-0 flex-col gap-3 testo-13">
      {collega && !richiesta && <p role="alert" className="m-0 text-warning">Questa visita non è più contata nelle attività: aggiungerle una registrazione non la conta di nuovo.</p>}
      {richiesta && <div className="card flex min-w-0 flex-col gap-1">
        <strong className="font-display testo-17">{dataGiocoTesto(richiesta.momento.giorno)} · {fasciaTesto(richiesta.momento.fascia)} · {ordinale(richiesta.momento.ordineVisita + 1)} visita</strong>
        <span>Pesci: {pesciInParole(richiesta.osservazione)}.</span>
        <span>Perizia: {periziaTesto(richiesta.osservazione.perizia.esito)}. Quota d’ingresso pagata: {sinoTesto(richiesta.osservazione.quota.pagata)}.</span>
        {visitaDelRiepilogo && <span>Già segnata {visitaDelRiepilogo.fonti.length === 1 ? 'una volta' : `${visitaDelRiepilogo.fonti.length} volte`}: la visita resta una sola.</span>}
        {voce && <span>Si registra quando confermi la proposta della voce, nella finestra che segue.</span>}
      </div>}
      {anteprima.caricamento && !anteprima.dati && <p role="status" className="m-0">Preparo il riepilogo…</p>}
      {anteprima.errore && <p role="alert" className="m-0 text-error-testo">{anteprima.errore}<PulsanteVisivo tono="fantasma" className="ml-2" icona={<IconaAzione chiave="ricalcola" dimensione={22} />} titolo="Rileggi il riepilogo" disabled={occupato || !!pendente} onClick={() => void anteprima.ricarica()} /></p>}
      {anteprima.dati && richiesta && <>
        <div className="flex min-w-0 flex-col gap-1">
          <strong className="testo-12 uppercase tracking-wider text-text-secondary">Cosa cambia</strong>
          <ul className="m-0 flex flex-col gap-1 pl-4">{anteprima.dati.conseguenze.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </div>
        {!!anteprima.dati.benefici.length && <details><summary className="touch cursor-pointer">Premi da approvare a parte · {anteprima.dati.benefici.length}</summary><BeneficiPesca benefici={anteprima.dati.benefici} /></details>}
        {(!!anteprima.dati.profili.length || !!anteprima.dati.profiliPianificazione.length) && <details><summary className="touch cursor-pointer">Guardiano e Boss secondo la guida</summary>
          <ProfiliSessionePesca punto={anteprima.dati.punto} profili={anteprima.dati.profili} profiliPianificazione={anteprima.dati.profiliPianificazione} /></details>}
        <details><summary className="touch cursor-pointer">Tutto quello che hai segnato</summary><RiepilogoOsservazionePesca osservazione={richiesta.osservazione} /></details>
      </>}
    </div>}

    {confermato && <p role="status" className="m-0 testo-13 text-success">Visita registrata.</p>}
    {errore && <p role="alert" className="m-0 testo-13 text-error-testo">{errore}</p>}
    {pendente && <p role="alert" className="m-0 testo-13 text-warning">Un’operazione di pesca non è ancora confermata: completala dall’elenco «Operazioni da completare». Finché resta aperta non si invia altro.</p>}
  </Modal>;
}
