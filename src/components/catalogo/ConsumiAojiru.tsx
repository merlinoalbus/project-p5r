import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ARTICOLO_AOJIRU, ORDINE_AOJIRU,
  type AnteprimaRegistrazioneAcquistoDto, type AnteprimaRimozioneAcquistoDto,
  type FonteAcquisto, type RichiestaRegistraAcquisto, type StatoAcquistiArticoloDto,
  type RegistrazioneAcquistoDto,
  type NuovaRegistrazioneAcquisto,
} from '../../../shared/acquisti';
import { eDote, nomeDote, type DoteChiave } from '../../../shared/doti';
import { GIORNI_NEL_MESE, MESI_GIOCO } from '../../../shared/condizioniSpillo';
import {
  anteprimaAnnullaProvenienzaAcquisto,
  anteprimaRegistrazioneAcquisto, anteprimaRimuoviPresenzaStoricaAcquisto,
  leggiAcquistiRegistrati,
} from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { usePartitaStore } from '../../stores/partitaStore';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { dataGiocoTesto } from '../../utils/dateGioco';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { annullaFonteConRegistro, eseguiAcquistoConRegistro, gestoPendenteNelloScope, rimuoviLegacyConRegistro, useGestiPartita } from '../../services/gestiPartita';
import { GestiPartita } from '../partita/GestiPartita';

const nuovoId = () => crypto.randomUUID().replaceAll('-', '');
const messaggio = (e: unknown) => e instanceof Error ? e.message : 'Operazione non riuscita.';

/** Payload della medesima anteprima, distinto dalla configurazione della guida. */
export function RiepilogoConsumoPreparato({ consumo: r }: { consumo: NuovaRegistrazioneAcquisto }) {
  return <div className="flex min-w-0 flex-col gap-1 rounded border border-border p-2 text-[13px]">
    <strong>Consumazione osservata da confermare</strong>
    <span>{dataGiocoTesto(r.momento.giorno)} · {r.momento.fascia} · ordine {r.momento.ordine + 1} · {nomeDote(r.variante)} · Fortuna {r.fortuna === null ? 'non dichiarata' : r.fortuna ? 'attiva' : 'assente'}.</span>
    <span>{r.scelta.tipo === 'nuova' ? 'Una nuova consumazione' : 'Collega un fatto esistente'} · vecchia presenza: {r.rapportoLegacy?.tipo === 'rappresenta' ? 'questa consumazione la rappresenta' : r.rapportoLegacy?.tipo === 'ulteriore' ? 'consumazione ulteriore' : 'nessuna da raccordare'}.</span>
    {r.scelta.tipo === 'collega' && <code className="break-all">Consumazione collegata {r.scelta.acquistoId}</code>}
    <code className="break-all text-[11px]">Articolo {r.articolo} · operazione {r.operazioneId}</code>
    {r.fonte.tipo === 'diario' ? <code className="break-all text-[11px]">Fonte Diario · voce {r.fonte.voceUid} · effetto {r.fonte.effettoUid}</code> : <span>Fonte manuale.</span>}
  </div>;
}

/** Identità e fonti del fatto letto, conservate anche quando l’offerta non esiste più. */
export function DettagliConsumo({ acquisto, fonteSelezionata }: { acquisto: RegistrazioneAcquistoDto; fonteSelezionata?: string | null }) {
  return <div className="flex min-w-0 flex-col gap-1 break-words">
    <strong>{acquisto.identita.nome} · {acquisto.identita.negozioNome}</strong>
    <span>{dataGiocoTesto(acquisto.momento.giorno)} · {acquisto.momento.fascia} · ordine {acquisto.momento.ordine + 1} · {nomeDote(acquisto.consumo.variante)} · Fortuna {acquisto.consumo.fortuna === null ? 'non dichiarata' : acquisto.consumo.fortuna ? 'attiva' : 'assente'} · {acquisto.prezzoYen.toLocaleString('it-IT')} yen</span>
    <code className="break-all text-[11px]">Consumazione {acquisto.id} · articolo {acquisto.identita.articolo}</code>
    <span>{acquisto.attiva ? 'Con fonti attive' : 'Senza fonti attive'}{acquisto.orfana ? ' · offerta non più presente' : ''}{acquisto.legacyFirma ? ' · rappresenta una vecchia presenza' : ''}.</span>
    {acquisto.provenienze.map((p) => <div key={p.id} className="flex min-w-0 flex-col gap-1 border-l border-border pl-2">
      <strong>{p.id === fonteSelezionata ? 'Fonte selezionata da togliere · ' : ''}{p.fonte.tipo === 'manuale' ? 'Manuale' : 'Diario'}</strong>
      <code className="break-all text-[11px]">Fonte {p.id}</code>
      {p.fonte.tipo === 'diario' && <><code className="break-all text-[11px]">Voce {p.fonte.voceUid} · effetto {p.fonte.effettoUid}</code>{p.voceCorrente ? <Link className="touch self-start" to={`/guida/percorso/${p.voceCorrente.giorno}?voce=${encodeURIComponent(p.fonte.voceUid)}`}>Apri il Diario · {dataGiocoTesto(p.voceCorrente.giorno)}</Link> : <span className="text-warning">Voce non più presente.</span>}</>}
    </div>)}
  </div>;
}

interface PreparazioneProps {
  partitaId: number;
  fonte: FonteAcquisto;
  articolo?: string;
  giorno?: string | null;
  fascia?: 'giorno' | 'sera';
  stato?: StatoAcquistiArticoloDto;
  titoloConferma?: string;
  esitoConferma?: string;
  confermaScrive?: boolean;
  onRecuperato?: () => void | Promise<void>;
  onConferma: (richiesta: RichiestaRegistraAcquisto) => Promise<void>;
}

/** Lo stesso gesto esplicito serve per acquisto manuale, prima spunta e raccordo di una spunta già fatta. */
export function PreparazioneAcquistoAojiru({ partitaId, fonte, articolo = ARTICOLO_AOJIRU, giorno, fascia = 'giorno', stato, titoloConferma = 'Registra la consumazione', esitoConferma = 'Consumazione registrata.', confermaScrive = true, onRecuperato, onConferma }: PreparazioneProps) {
  useGestiPartita();
  const pendente = gestoPendenteNelloScope(partitaId, { articolo, ...(fonte.tipo === 'diario' ? { voceUid: fonte.voceUid } : {}) });
  const registro = useCarica(() => leggiAcquistiRegistrati(partitaId), [partitaId]);
  const [campi, setCampi] = useState(() => ({ giorno: giorno ?? '', fascia, ordine: '1', variante: '' as '' | DoteChiave, fortuna: 'ignota', scelta: '', rapporto: '' }));
  const [anteprima, setAnteprima] = useState<AnteprimaRegistrazioneAcquistoDto | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [incerto, setIncerto] = useState(false);
  const [confermato, setConfermato] = useState(false);
  const [attestato, setAttestato] = useState(false);
  const blocco = useRef(false);
  const vivo = useRef(true);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const presenza = registro.dati?.presenzeStoriche.find((p) => p.articolo === articolo) ?? null;
  const registrazioni = registro.dati?.registrazioni.filter((r) => r.identita.articolo === articolo) ?? [];
  const altreStessoGiorno = (anteprima?.acquisti.registrazioni ?? registrazioni).filter(r => r.attiva && r.momento.giorno === (anteprima?.nuovo.momento.giorno ?? campi.giorno)
    && r.id !== (anteprima?.nuovo.scelta.tipo === 'collega' ? anteprima.nuovo.scelta.acquistoId : campi.scelta));
  const [mese = '', data = ''] = campi.giorno.split('-');
  const cambia = (delta: Partial<typeof campi>) => {
    setCampi((c) => ({ ...c, ...delta })); setAnteprima(null); setAttestato(false); setErrore(null);
  };
  const valido = !!mese && !!data && eDote(campi.variante) && Number.isInteger(Number(campi.ordine)) && Number(campi.ordine) >= 1 && Number(campi.ordine) <= 1_000_001
    && (!presenza || campi.rapporto === 'rappresenta' || campi.rapporto === 'ulteriore');
  const prepara = async () => {
    if (blocco.current || !valido || !eDote(campi.variante)) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    try {
      const a = await anteprimaRegistrazioneAcquisto(partitaId, {
        operazioneId: nuovoId(), articolo, fonte, momento: { giorno: campi.giorno, fascia: campi.fascia, ordine: Number(campi.ordine) - 1 },
        variante: campi.variante, fortuna: campi.fortuna === 'ignota' ? null : campi.fortuna === 'si',
        scelta: campi.scelta ? { tipo: 'collega', acquistoId: campi.scelta } : { tipo: 'nuova' },
        rapportoLegacy: presenza ? { tipo: campi.rapporto as 'rappresenta' | 'ulteriore', firma: presenza.firma } : null,
      });
      if (vivo.current) setAnteprima(a);
    } catch (e) { if (vivo.current) setErrore(messaggio(e)); }
    finally { blocco.current = false; if (vivo.current) setOccupato(false); }
  };
  const conferma = async () => {
    if (!anteprima || !attestato || blocco.current || confermato) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    try {
      await onConferma({ ...anteprima.nuovo, revisioneAcquistiAttesa: anteprima.revisioneAcquistiAttesa });
      if (vivo.current) { setConfermato(true); setIncerto(false); }
    } catch (e) {
      if (vivo.current) {
        const dubbio = confermaScrive && !!gestoPendenteNelloScope(partitaId, { articolo, ...(fonte.tipo === 'diario' ? { voceUid: fonte.voceUid } : {}) }); setIncerto(dubbio); setErrore(messaggio(e));
        if (!dubbio) { setAnteprima(null); setAttestato(false); await registro.ricarica(); }
      }
    } finally { blocco.current = false; if (vivo.current) setOccupato(false); }
  };
  if (confermato) return <p role="status" className="m-0 text-success">{esitoConferma}</p>;
  if (pendente) return <div className="flex flex-col gap-2"><p role="status" className="m-0 text-warning">Esiste un’operazione ancora da risolvere per questa fonte. Nessuna nuova registrazione viene inviata.</p><GestiPartita partitaId={partitaId} onCambiato={async () => { if (vivo.current) await onRecuperato?.(); }} /></div>;
  return <div className="flex min-w-0 flex-col gap-3 text-[13px]">
    <p className="m-0">Domenica · 5.000 yen · nessun tempo consumato. La base è 2 punti interni (1 nota); con Fortuna della stessa Dote sono 3 (2 note). Senza dichiarazione su Fortuna il totale resta ignoto.</p>
    {stato?.aojiru && <p className="m-0">{stato.aojiru.varianteAttesa ? `Prossima variante prevista: ${nomeDote(stato.aojiru.varianteAttesa)}.` : 'Variante iniziale da osservare.'} {stato.aojiru.nota}</p>}
    {!!stato?.aojiru?.incongruenze.length && <ul className="m-0 pl-4 text-warning">{stato.aojiru.incongruenze.map((s) => <li key={s}>{s}</li>)}</ul>}
    {registro.errore && <p role="alert" className="m-0 text-error">{registro.errore}<button className="btn btn-ghost touch" onClick={() => void registro.ricarica()}>Rileggi gli acquisti</button></p>}
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0" disabled={occupato || incerto || !!anteprima || !registro.dati}>
      <Selettore etichetta="Registrazione" valore={campi.scelta} opzioni={[{ chiave: '', nome: 'Una nuova consumazione' }, ...registrazioni.map((r) => ({ chiave: r.id, nome: `${dataGiocoTesto(r.momento.giorno)} · ${r.momento.fascia} · ${nomeDote(r.consumo.variante)}${r.attiva ? '' : ' · senza fonti attive'}`, dettaglio: `ID ${r.id}` }))]}
        onCambia={(id) => {
          const r = registrazioni.find((x) => x.id === id);
          cambia(r ? { scelta: id, giorno: r.momento.giorno, fascia: r.momento.fascia, ordine: String(r.momento.ordine + 1), variante: r.consumo.variante, fortuna: r.consumo.fortuna === null ? 'ignota' : r.consumo.fortuna ? 'si' : 'no', rapporto: r.legacyFirma ? 'rappresenta' : '' } : { scelta: '', variante: '', fortuna: 'ignota', rapporto: '' });
        }} />
      <div className="flex flex-wrap items-end gap-2">
        <Selettore etichetta="Mese osservato" valore={mese} opzioni={MESI_GIOCO.map((m) => ({ chiave: m.numero, nome: m.nome }))} onCambia={(m) => cambia({ giorno: `${m}-${data && Number(data) <= (GIORNI_NEL_MESE[m] ?? 31) ? data : ''}` })} />
        <Selettore etichetta="Giorno osservato" valore={data} disabilitato={!mese} opzioni={Array.from({ length: mese ? GIORNI_NEL_MESE[mese] ?? 31 : 0 }, (_, i) => ({ chiave: String(i + 1).padStart(2, '0'), nome: String(i + 1) }))} onCambia={(g) => cambia({ giorno: `${mese}-${g}` })} />
        <Selettore etichetta="Fascia osservata" valore={campi.fascia} opzioni={[{ chiave: 'giorno', nome: 'Di giorno' }, { chiave: 'sera', nome: 'Di sera' }]} onCambia={(f) => cambia({ fascia: f as 'giorno' | 'sera' })} />
        <label className="flex flex-col gap-1">Ordine nella fascia<input className="form-input w-24" type="number" min={1} max={1_000_001} step={1} value={campi.ordine} onChange={(e) => cambia({ ordine: e.target.value })} /></label>
      </div>
      <Selettore etichetta="Variante realmente consumata" valore={campi.variante} opzioni={ORDINE_AOJIRU.map((d) => ({ chiave: d, nome: nomeDote(d) }))} onCambia={(d) => cambia({ variante: d as DoteChiave })} />
      <Selettore etichetta="Fortuna della stessa Dote in quel momento" valore={campi.fortuna} opzioni={[{ chiave: 'ignota', nome: 'Non lo so' }, { chiave: 'no', nome: 'Assente' }, { chiave: 'si', nome: 'Attiva' }]} onCambia={(f) => cambia({ fortuna: f })} />
      {presenza && <Selettore etichetta="Rapporto con la vecchia spunta Acquistato" valore={campi.rapporto} opzioni={[{ chiave: 'rappresenta', nome: 'Questa consumazione rappresenta quel segno' }, { chiave: 'ulteriore', nome: 'È una consumazione ulteriore' }]} onCambia={(r) => cambia({ rapporto: r })} />}
    </fieldset>
    {!anteprima && <button type="button" className="btn btn-secondary touch self-start" disabled={!valido || occupato || !registro.dati} onClick={() => void prepara()}>Mostra l’anteprima</button>}
    {anteprima && <div className="flex flex-col gap-2 rounded border border-border p-3">
      <strong>{anteprima.identita.nome} · {dataGiocoTesto(anteprima.nuovo.momento.giorno)} · {anteprima.nuovo.momento.fascia} · {nomeDote(anteprima.effetto.dote)}</strong>
      <span>{anteprima.effetto.puntiConfermati === null ? 'Totale Doti non attestato: Fortuna ignota.' : `${anteprima.effetto.puntiConfermati} punti interni · ${anteprima.effetto.note} ${anteprima.effetto.note === 1 ? 'nota' : 'note'}.`} Costo: 5.000 yen.</span>
      <span>{anteprima.esitoPrevisto === 'registrata' ? 'Nuova consumazione.' : anteprima.esitoPrevisto === 'fonte-collegata' ? 'Collega questa fonte alla consumazione indicata; non aggiunge un acquisto.' : 'Questa fonte è già collegata: non aggiunge un acquisto.'}</span>
      {anteprima.nuovo.scelta.tipo === 'collega' && <><code className="break-all">Consumazione collegata: {anteprima.nuovo.scelta.acquistoId}</code>{anteprima.acquisti.registrazioni.filter(r => anteprima.nuovo.scelta.tipo === 'collega' && r.id === anteprima.nuovo.scelta.acquistoId).map(r => <DettagliConsumo key={r.id} acquisto={r} />)}</>}
      <span>Fonte: {anteprima.nuovo.fonte.tipo === 'manuale' ? 'manuale' : 'Diario'} · ordine nella fascia {anteprima.nuovo.momento.ordine + 1} · Fortuna {anteprima.nuovo.fortuna === null ? 'non dichiarata' : anteprima.nuovo.fortuna ? 'attiva' : 'assente'}.</span>
      {anteprima.nuovo.fonte.tipo === 'diario' && <code className="break-all text-[11px]">Voce {anteprima.nuovo.fonte.voceUid} · effetto {anteprima.nuovo.fonte.effettoUid}</code>}
      <span>Vecchia presenza: {anteprima.nuovo.rapportoLegacy?.tipo === 'rappresenta' ? 'questa consumazione la rappresenta' : anteprima.nuovo.rapportoLegacy?.tipo === 'ulteriore' ? 'questa consumazione è ulteriore' : 'nessuna da raccordare'}.</span>
      {!!altreStessoGiorno.length && <div role="alert" className="flex flex-col gap-1 text-warning"><strong>Possibile doppia registrazione nella stessa data.</strong><span>Esistono altre {altreStessoGiorno.length} consumazioni attive il {dataGiocoTesto(anteprima.nuovo.momento.giorno)}. Controlla variante e fonti: se è lo stesso consumo, collega quello esistente; se è un altro, puoi registrarlo.</span>{altreStessoGiorno.map(r => <DettagliConsumo key={r.id} acquisto={r} />)}</div>}
      {anteprima.disponibilita.motivi.map((m) => <p className="m-0 text-warning" key={m}>{m}</p>)}
      <p className="m-0">Doti e denaro passano da «Da applicare»: questa registrazione non modifica i saldi automaticamente.</p>
      <label className="touch flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={attestato} disabled={occupato || incerto} onChange={(e) => setAttestato(e.target.checked)} />Confermo il momento, la variante osservata e il rapporto con le registrazioni già presenti.</label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary touch" disabled={occupato || !attestato} onClick={() => void conferma()}>{incerto ? 'Verifica la stessa operazione' : titoloConferma}</button>
        {!incerto && <button type="button" className="btn btn-ghost touch" disabled={occupato} onClick={() => { setAnteprima(null); setAttestato(false); }}>Correggi i dati</button>}
      </div>
    </div>}
    {errore && <p role="alert" className="m-0 text-error">{errore}</p>}
    {incerto && <p role="alert" className="m-0 text-warning">La risposta non è arrivata: l’esito è incerto. La verifica ripresenta soltanto la stessa operazione con lo stesso identificativo; non crea una seconda consumazione.</p>}
    {occupato && <p role="status" className="m-0">Operazione in corso…</p>}
  </div>;
}

/** Consumazioni e provenienze restano distinte dalla singola presenza storica. */
export function ConsumiAojiru({ partitaId, stato, onCambiato, registrabile = true }: { partitaId: number; stato?: StatoAcquistiArticoloDto; onCambiato: () => void | Promise<void>; registrabile?: boolean }) {
  useGestiPartita();
  const partita = usePartitaStore((s) => s.attiva);
  const [nuovo, setNuovo] = useState(false);
  const [rimozione, setRimozione] = useState<{ anteprima: AnteprimaRimozioneAcquistoDto; provenienza: string | null } | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [incerto, setIncerto] = useState(false);
  const [ricevuta, setRicevuta] = useState<string | null>(null);
  const blocco = useRef(false);
  const vivo = useRef(true);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const aggiorna = async () => {
    useSuggerimentiStore.getState().invalida();
    if (!vivo.current) return;
    try { await onCambiato(); }
    catch (e) { if (vivo.current) setErrore(`Operazione registrata; aggiornamento della pagina non riuscito: ${messaggio(e)}`); }
  };
  const preparaRimozione = async (provenienza: string | null) => {
    if (blocco.current) return;
    blocco.current = true; setOccupato(true); setErrore(null); setRicevuta(null);
    try {
      const operazioneId = nuovoId();
      const anteprima = provenienza ? await anteprimaAnnullaProvenienzaAcquisto(partitaId, { operazioneId, provenienzaId: provenienza }) : await anteprimaRimuoviPresenzaStoricaAcquisto(partitaId, { operazioneId, articolo: stato?.articolo ?? ARTICOLO_AOJIRU });
      if (vivo.current) setRimozione({ anteprima, provenienza });
    } catch (e) { if (vivo.current) setErrore(messaggio(e)); }
    finally { blocco.current = false; if (vivo.current) setOccupato(false); }
  };
  const rimuovi = async () => {
    if (!rimozione || blocco.current) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    const { anteprima: a, provenienza } = rimozione;
    try {
      const bersaglio = { etichetta: provenienza ? `Fonte della consumazione ${a.acquisto?.identita.nome ?? a.articolo}` : `Vecchia presenza ${a.articolo}`, articolo: a.articolo };
      const e = provenienza ? await annullaFonteConRegistro(partitaId, { operazioneId: a.operazioneId, provenienzaId: provenienza, revisioneAcquistiAttesa: a.revisioneAcquistiAttesa }, bersaglio) : await rimuoviLegacyConRegistro(partitaId, { operazioneId: a.operazioneId, articolo: a.articolo, revisioneAcquistiAttesa: a.revisioneAcquistiAttesa }, bersaglio);
      if (vivo.current) { setRicevuta(`Rimozione registrata · operazione ${e.operazioneId}.`); setRimozione(null); setIncerto(false); }
      await aggiorna();
    } catch (e) { if (vivo.current) { const dubbio = !!gestoPendenteNelloScope(partitaId, { articolo: a.articolo }); setIncerto(dubbio); setErrore(messaggio(e)); if (!dubbio) setRimozione(null); } }
    finally { blocco.current = false; if (vivo.current) setOccupato(false); }
  };
  return <div className="flex min-w-0 flex-col gap-2 text-[12px]">
    <span>{stato?.aojiru ? `${stato.aojiru.confermate} consumazioni confermate` : `${stato?.registrazioni.length ?? 0} consumazioni registrate`}</span>
    {stato?.presenzaStorica && <div><span>Vecchia presenza: non attesta quantità, momento o variante{stato.presenzaStorica.rappresentataDa ? ' · collegata a una consumazione' : ''}.</span><button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato} onClick={() => void preparaRimozione(null)}>Togli solo la vecchia presenza</button></div>}
    {stato?.aojiru?.varianteAttesa && <span>Prossima prevista: {nomeDote(stato.aojiru.varianteAttesa)}; conferma quella osservata.</span>}
    {!!stato?.aojiru?.incongruenze.length && <ul className="m-0 pl-4 text-warning">{stato.aojiru.incongruenze.map((m) => <li key={m}>{m}</li>)}</ul>}
    {registrabile && <button type="button" className="btn btn-secondary btn-sm touch self-start" disabled={occupato} onClick={() => { setRicevuta(null); setErrore(null); setNuovo(true); }}>Registra una consumazione</button>}
    {!!stato?.registrazioni.length && <details><summary className="touch">Consumazioni e fonti</summary><ul className="m-0 flex list-none flex-col gap-2 p-0">
      {stato.registrazioni.map((r) => <li key={r.id} className="flex flex-col gap-1 border-t border-border pt-2">
        <DettagliConsumo acquisto={r} />
        {r.provenienze.map((p) => <div className="flex flex-wrap items-center gap-1" key={p.id}>
          {p.fonte.tipo === 'manuale' ? <span>Fonte manuale</span> : p.voceCorrente ? <Link className="touch inline-flex items-center" to={`/guida/percorso/${p.voceCorrente.giorno}?voce=${encodeURIComponent(p.fonte.voceUid)}`}>Fonte Diario · {dataGiocoTesto(p.voceCorrente.giorno)}</Link> : <span className="text-warning">Fonte Diario non più presente</span>}
          <button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato} onClick={() => void preparaRimozione(p.id)}>Togli solo questa fonte</button>
        </div>)}
      </li>)}
    </ul></details>}
    {ricevuta && <p role="status" className="m-0 text-success">{ricevuta}</p>}
    {errore && <p role="alert" className="m-0 text-error">{errore}</p>}
    <Modal aperta={nuovo} titolo="Registra il consumo di Aojiru" onChiudi={() => { if (!gestoPendenteNelloScope(partitaId, { articolo: stato?.articolo ?? ARTICOLO_AOJIRU })) setNuovo(false); }} larga>
      <PreparazioneAcquistoAojiru key={`${partitaId}:${stato?.articolo ?? ARTICOLO_AOJIRU}`} partitaId={partitaId} fonte={{ tipo: 'manuale' }} articolo={stato?.articolo} stato={stato}
        onRecuperato={aggiorna}
        giorno={partita?.id === partitaId ? partita.dataGioco : null} fascia={partita?.id === partitaId ? partita.fasciaGioco : 'giorno'}
        onConferma={async (richiesta) => {
          const e = await eseguiAcquistoConRegistro(partitaId, richiesta, { etichetta: 'Consumazione manuale Aojiru', articolo: richiesta.articolo });
          if (vivo.current) setRicevuta(`Consumazione registrata · operazione ${e.operazioneId}.`);
          await aggiorna();
        }} />
    </Modal>
    <Modal aperta={rimozione !== null} titolo="Togli la registrazione indicata" onChiudi={() => { if (!occupato && !gestoPendenteNelloScope(partitaId, { articolo: stato?.articolo ?? ARTICOLO_AOJIRU })) setRimozione(null); }} azioni={<>
      <button type="button" className="btn btn-ghost touch" disabled={occupato || incerto} onClick={() => setRimozione(null)}>Annulla</button>
      <button type="button" className="btn btn-primary touch" disabled={occupato} onClick={() => void rimuovi()}>{incerto ? 'Verifica la stessa operazione' : 'Conferma la rimozione'}</button>
    </>}>
      <p>{rimozione?.provenienza ? 'Si toglie soltanto la fonte indicata.' : 'Si toglie soltanto la vecchia presenza Acquistato.'} {rimozione?.anteprima.ultimaFonte ? 'È l’ultima fonte: il fatto non conta più come attivo; le correzioni ai saldi passano da «Da applicare».' : 'Le altre fonti della consumazione rimangono.'} Il ripristino è nel Cestino.</p>
      {rimozione?.anteprima.acquisto && <DettagliConsumo acquisto={rimozione.anteprima.acquisto} fonteSelezionata={rimozione.provenienza} />}
      {rimozione?.anteprima.presenzaStorica && <div className="flex flex-col gap-1 break-words"><strong>Vecchia presenza · {rimozione.anteprima.presenzaStorica.negozioNome}</strong><code className="break-all">{rimozione.anteprima.presenzaStorica.articolo}</code><span>{rimozione.anteprima.presenzaStorica.orfana ? 'Offerta non più presente. ' : ''}Quantità, data e variante non attestate.</span>{rimozione.anteprima.presenzaStorica.rappresentataDa && <code className="break-all">Rappresentata dalla consumazione {rimozione.anteprima.presenzaStorica.rappresentataDa}</code>}</div>}
      {errore && <p role="alert" className="text-error">{errore}</p>}
      {incerto && <p role="alert">Esito incerto: la verifica riguarda soltanto la stessa operazione.</p>}
      {incerto && <GestiPartita partitaId={partitaId} onCambiato={async () => { if (vivo.current) { setRimozione(null); setIncerto(false); await aggiorna(); } }} />}
    </Modal>
  </div>;
}
