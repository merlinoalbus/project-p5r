import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  getFortuna,
  leggiAcquistiRegistrati,
} from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { usePartitaStore } from '../../stores/partitaStore';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { dataGiocoTesto } from '../../utils/dateGioco';
import { fortunaDelConsumo } from '../../utils/fortunaConsumo';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { annullaFonteConRegistro, eseguiAcquistoConRegistro, gestoPendenteNelloScope, rimuoviLegacyConRegistro, useGestiPartita } from '../../services/gestiPartita';
import { GestiPartita } from '../partita/GestiPartita';
import type { ValutazionePresenza } from '../../../shared/valutazioneAcquisto';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

const nuovoId = () => crypto.randomUUID().replaceAll('-', '');
const messaggio = (e: unknown) => e instanceof Error ? e.message : 'Operazione non riuscita.';
const fortunaInParole = (f: boolean | null) => f === null ? 'Fortuna non nota' : f ? 'con Fortuna' : 'senza Fortuna';
const fasciaInParole = (f: string) => f === 'sera' ? 'di sera' : 'di giorno';

/** Quanto contava il vecchio segno «Acquistato», in parole: non è il prezzo davvero pagato. */
function ProvaPresenza({ valutazione: v }: { valutazione: ValutazionePresenza }) {
  return <span className="testo-12">Nel vecchio conteggio valeva {v.contributoYen.toLocaleString('it-IT')} yen{v.statoPrezzo === 'ignoto' ? ' (prezzo non noto)' : v.statoPrezzo === 'offerta-assente' ? ' (offerta non più presente)' : ''}: non è il prezzo davvero pagato.</span>;
}

/** Il consumo che sta per essere registrato, in parole (senza identificativi). */
export function RiepilogoConsumoPreparato({ consumo: r }: { consumo: NuovaRegistrazioneAcquisto }) {
  return <div className="flex min-w-0 flex-col gap-1 rounded border border-border p-2 testo-13">
    <strong>Consumo da confermare</strong>
    <span>{dataGiocoTesto(r.momento.giorno)}, {fasciaInParole(r.momento.fascia)} · {nomeDote(r.variante)} · {fortunaInParole(r.fortuna)}.</span>
    <span>{r.scelta.tipo === 'nuova' ? 'È un consumo nuovo.' : 'Si collega a un consumo già registrato.'}{r.rapportoLegacy?.tipo === 'rappresenta' ? ' Prende il posto del vecchio segno «Acquistato».' : r.rapportoLegacy?.tipo === 'ulteriore' ? ' Il vecchio segno «Acquistato» resta: è un consumo in più.' : ''}</span>
    {r.rapportoLegacy?.valutazione && <ProvaPresenza valutazione={r.rapportoLegacy.valutazione} />}
    <span>{r.fonte.tipo === 'diario' ? 'Nasce da una voce del Diario.' : 'Lo inserisci tu a mano.'}</span>
  </div>;
}

/** Un consumo già registrato, in parole, con le voci del Diario che lo confermano. */
export function DettagliConsumo({ acquisto, fonteSelezionata }: { acquisto: RegistrazioneAcquistoDto; fonteSelezionata?: string | null }) {
  return <div className="flex min-w-0 flex-col gap-1 break-words">
    <strong>{acquisto.identita.nome} · {acquisto.identita.negozioNome}</strong>
    <span>{dataGiocoTesto(acquisto.momento.giorno)}, {fasciaInParole(acquisto.momento.fascia)} · {nomeDote(acquisto.consumo.variante)} · {fortunaInParole(acquisto.consumo.fortuna)} · {acquisto.prezzoYen.toLocaleString('it-IT')} yen</span>
    <span>{acquisto.attiva ? '' : 'Nessuna voce o registrazione lo conferma più. '}{acquisto.orfana ? 'L’offerta non c’è più nel catalogo. ' : ''}{acquisto.legacyFirma ? 'Prende il posto di un vecchio segno «Acquistato».' : ''}</span>
    {acquisto.provenienze.map((p) => <div key={p.id} className="flex min-w-0 flex-col gap-1 border-l border-border pl-2">
      <strong>{p.id === fonteSelezionata ? 'Da togliere: ' : ''}{p.fonte.tipo === 'manuale' ? 'Inserito a mano' : 'Dal Diario'}</strong>
      {p.fonte.tipo === 'diario' && (p.voceCorrente ? <Link className="touch self-start" to={`/guida/percorso/${p.voceCorrente.giorno}?voce=${encodeURIComponent(p.fonte.voceUid)}`}>Apri la voce del {dataGiocoTesto(p.voceCorrente.giorno)}</Link> : <span className="text-warning">La voce non c’è più.</span>)}
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
  invalidazioneAnteprima?: number;
  onRecuperato?: () => void | Promise<void>;
  onConferma: (richiesta: RichiestaRegistraAcquisto) => Promise<void>;
}

/** Lo stesso gesto serve per l’acquisto a mano, per la prima spunta e per una spunta già fatta. La Fortuna non si chiede: la legge dallo stato della partita. */
export function PreparazioneAcquistoAojiru({ partitaId, fonte, articolo = ARTICOLO_AOJIRU, giorno, fascia = 'giorno', stato, titoloConferma = 'Registra il consumo', esitoConferma = 'Consumo registrato.', confermaScrive = true, invalidazioneAnteprima = 0, onRecuperato, onConferma }: PreparazioneProps) {
  useGestiPartita();
  const pendente = gestoPendenteNelloScope(partitaId, { articolo, ...(fonte.tipo === 'diario' ? { voceUid: fonte.voceUid } : {}) });
  const registro = useCarica(() => leggiAcquistiRegistrati(partitaId), [partitaId, invalidazioneAnteprima]);
  const fortuna = useCarica(() => getFortuna(partitaId), [partitaId, invalidazioneAnteprima]);
  const oggi = usePartitaStore((s) => (s.attiva?.id === partitaId ? s.attiva.dataGioco : null));
  const [campi, setCampi] = useState(() => ({ giorno: giorno ?? '', fascia, ordine: '1', variante: '' as '' | DoteChiave, scelta: '', rapporto: '' }));
  const [anteprima, setAnteprima] = useState<AnteprimaRegistrazioneAcquistoDto | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [incerto, setIncerto] = useState(false);
  const [confermato, setConfermato] = useState(false);
  const [attestato, setAttestato] = useState(false);
  const [epocaAnteprima, setEpocaAnteprima] = useState(invalidazioneAnteprima);
  if (epocaAnteprima !== invalidazioneAnteprima) {
    setEpocaAnteprima(invalidazioneAnteprima); setAnteprima(null); setAttestato(false); setConfermato(false); setErrore(null); setIncerto(false); setOccupato(false);
  }
  const blocco = useRef(false);
  const vivo = useRef(true);
  const contesto = JSON.stringify([partitaId, articolo, fonte, invalidazioneAnteprima]);
  const contestoRef = useRef('');
  useLayoutEffect(() => { vivo.current = true; contestoRef.current = contesto; return () => { vivo.current = false; contestoRef.current = ''; }; }, [contesto]);
  const attiva = () => vivo.current && contestoRef.current === contesto;
  const presenza = registro.dati?.presenzeStoriche.find((p) => p.articolo === articolo) ?? null;
  const registrazioni = registro.dati?.registrazioni.filter((r) => r.identita.articolo === articolo) ?? [];
  const altreStessoGiorno = (anteprima?.acquisti.registrazioni ?? registrazioni).filter(r => r.attiva && r.momento.giorno === (anteprima?.nuovo.momento.giorno ?? campi.giorno)
    && r.id !== (anteprima?.nuovo.scelta.tipo === 'collega' ? anteprima.nuovo.scelta.acquistoId : campi.scelta));
  const [mese = '', data = ''] = campi.giorno.split('-');
  const cambia = (delta: Partial<typeof campi>) => {
    setCampi((c) => ({ ...c, ...delta })); setAnteprima(null); setAttestato(false); setErrore(null);
  };
  // la Fortuna di quel consumo, dallo stato della partita (si rilegge a ogni anteprima)
  const fortunaCalcolata = fortunaDelConsumo(fortuna.dati, campi.giorno, campi.variante, oggi);
  const valido = !!mese && !!data && eDote(campi.variante) && Number.isInteger(Number(campi.ordine)) && Number(campi.ordine) >= 1 && Number(campi.ordine) <= 1_000_001
    && (!presenza || campi.rapporto === 'rappresenta' || campi.rapporto === 'ulteriore') && !!fortuna.dati;
  const prepara = async () => {
    if (blocco.current || !valido || !eDote(campi.variante)) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    try {
      const a = await anteprimaRegistrazioneAcquisto(partitaId, {
        operazioneId: nuovoId(), articolo, fonte, momento: { giorno: campi.giorno, fascia: campi.fascia, ordine: Number(campi.ordine) - 1 },
        variante: campi.variante, fortuna: fortunaCalcolata,
        scelta: campi.scelta ? { tipo: 'collega', acquistoId: campi.scelta } : { tipo: 'nuova' },
        rapportoLegacy: presenza ? { tipo: campi.rapporto as 'rappresenta' | 'ulteriore', firma: presenza.firma, valutazione: presenza.valutazione } : null,
      });
      if (attiva()) setAnteprima(a);
    } catch (e) { if (attiva()) { setErrore(messaggio(e)); await registro.ricarica(); } }
    finally { blocco.current = false; if (attiva()) setOccupato(false); }
  };
  const conferma = async () => {
    if (!anteprima || !attestato || blocco.current || confermato) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    try {
      await onConferma({ ...anteprima.nuovo, revisioneAcquistiAttesa: anteprima.revisioneAcquistiAttesa });
      if (attiva()) { setConfermato(true); setIncerto(false); }
    } catch (e) {
      if (attiva()) {
        const dubbio = confermaScrive && !!gestoPendenteNelloScope(partitaId, { articolo, ...(fonte.tipo === 'diario' ? { voceUid: fonte.voceUid } : {}) }); setIncerto(dubbio); setErrore(messaggio(e));
        if (!dubbio) { setAnteprima(null); setAttestato(false); await registro.ricarica(); }
      }
    } finally { blocco.current = false; if (attiva()) setOccupato(false); }
  };
  if (confermato) return <p role="status" className="m-0 text-success">{esitoConferma}</p>;
  if (pendente) return <div className="flex flex-col gap-2"><p role="status" className="m-0 text-warning">C’è già un’operazione da completare per questa voce: finché non è chiusa non ne invio un’altra.</p><GestiPartita partitaId={partitaId} onCambiato={async () => { if (attiva()) await onRecuperato?.(); }} /></div>;
  return <div className="flex min-w-0 flex-col gap-3 testo-13">
    <p className="m-0">Domenica · 5.000 yen · non consuma tempo. Dà 2 punti (1 nota) alla Dote del succo, 3 se in quel giorno la Fortuna era accesa su quella Dote: la Fortuna la leggo dalla partita, non devi dirmela.</p>
    {stato?.aojiru && <p className="m-0">{stato.aojiru.varianteAttesa ? `Prossima variante prevista: ${nomeDote(stato.aojiru.varianteAttesa)}.` : 'Variante iniziale da osservare.'}</p>}
    {!!stato?.aojiru?.incongruenze.length && <ul className="m-0 pl-4 text-warning">{stato.aojiru.incongruenze.map((s) => <li key={s}>{s}</li>)}</ul>}
    {registro.errore && <p role="alert" className="m-0 text-error-testo">{registro.errore}<PulsanteVisivo tono="fantasma" className="ml-2" icona={<IconaAzione chiave="riprova" dimensione={22} />} titolo="Riprova" onClick={() => void registro.ricarica()} /></p>}
    {fortuna.errore && <p role="alert" className="m-0 text-error-testo">Non riesco a leggere la Fortuna della partita: {fortuna.errore}<PulsanteVisivo tono="fantasma" className="ml-2" icona={<IconaAzione chiave="riprova" dimensione={22} />} titolo="Riprova" onClick={() => void fortuna.ricarica()} /></p>}
    {presenza?.valutazione && <ProvaPresenza valutazione={presenza.valutazione} />}
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0" disabled={occupato || incerto || !!anteprima || !registro.dati}>
      <Selettore etichetta="Consumo" valore={campi.scelta} opzioni={[{ chiave: '', nome: 'Un consumo nuovo' }, ...registrazioni.map((r) => ({ chiave: r.id, nome: `${dataGiocoTesto(r.momento.giorno)} · ${fasciaInParole(r.momento.fascia)} · ${nomeDote(r.consumo.variante)}${r.attiva ? '' : ' · non più confermato'}` }))]}
        onCambia={(id) => {
          const r = registrazioni.find((x) => x.id === id);
          cambia(r ? { scelta: id, giorno: r.momento.giorno, fascia: r.momento.fascia, ordine: String(r.momento.ordine + 1), variante: r.consumo.variante, rapporto: presenza?.valutazione && r.legacyFirma === presenza.firma && r.legacyValutazioneId === presenza.valutazione.id ? 'rappresenta' : '' } : { scelta: '', variante: '', rapporto: '' });
        }} />
      <div className="flex flex-wrap items-end gap-2">
        <Selettore etichetta="Mese" valore={mese} opzioni={MESI_GIOCO.map((m) => ({ chiave: m.numero, nome: m.nome }))} onCambia={(m) => cambia({ giorno: `${m}-${data && Number(data) <= (GIORNI_NEL_MESE[m] ?? 31) ? data : ''}` })} />
        <Selettore etichetta="Giorno" valore={data} disabilitato={!mese} opzioni={Array.from({ length: mese ? GIORNI_NEL_MESE[mese] ?? 31 : 0 }, (_, i) => ({ chiave: String(i + 1).padStart(2, '0'), nome: String(i + 1) }))} onCambia={(g) => cambia({ giorno: `${mese}-${g}` })} />
        <Selettore etichetta="Quando" valore={campi.fascia} opzioni={[{ chiave: 'giorno', nome: 'Di giorno' }, { chiave: 'sera', nome: 'Di sera' }]} onCambia={(f) => cambia({ fascia: f as 'giorno' | 'sera' })} />
        <label className="flex flex-col gap-1">Quale in quella fascia<input className="form-input w-24" type="number" min={1} max={1_000_001} step={1} value={campi.ordine} onChange={(e) => cambia({ ordine: e.target.value })} /></label>
      </div>
      <Selettore etichetta="Che succo hai bevuto" valore={campi.variante} opzioni={ORDINE_AOJIRU.map((d) => ({ chiave: d, nome: nomeDote(d) }))} onCambia={(d) => cambia({ variante: d as DoteChiave })} />
      {!!campi.variante && <span className="testo-12 text-text-secondary">{fortunaCalcolata === null ? 'Di quel giorno la partita non ricorda la Fortuna: conto solo i 2 punti certi.' : fortunaCalcolata ? 'In quel giorno la Fortuna era accesa su questa Dote: 3 punti.' : 'In quel giorno la Fortuna non era accesa su questa Dote: 2 punti.'}</span>}
      {presenza && <Selettore etichetta="Il vecchio segno «Acquistato»" valore={campi.rapporto} opzioni={[{ chiave: 'rappresenta', nome: 'Questo consumo prende il suo posto' }, { chiave: 'ulteriore', nome: 'È un consumo in più' }]} onCambia={(r) => cambia({ rapporto: r })} />}
    </fieldset>
    {!anteprima && <PulsanteVisivo icona={<IconaAzione chiave="dettagli" dimensione={22} />} titolo="Mostra il riepilogo" className="self-start" disabled={!valido || occupato || !registro.dati} onClick={() => void prepara()} />}
    {anteprima && <div className="flex flex-col gap-2 rounded border border-border p-3">
      <strong>{anteprima.identita.nome} · {dataGiocoTesto(anteprima.nuovo.momento.giorno)}, {fasciaInParole(anteprima.nuovo.momento.fascia)} · {nomeDote(anteprima.effetto.dote)}</strong>
      <span>{anteprima.effetto.puntiConfermati === null ? 'Il totale dei punti non è certo.' : `${anteprima.effetto.puntiConfermati} punti · ${anteprima.effetto.note} ${anteprima.effetto.note === 1 ? 'nota' : 'note'}.`} Costo: 5.000 yen.</span>
      <span>{anteprima.esitoPrevisto === 'registrata' ? 'È un consumo nuovo.' : anteprima.esitoPrevisto === 'fonte-collegata' ? 'Si collega al consumo scelto; non ne aggiunge un altro.' : 'Questa voce è già collegata: non aggiunge un consumo.'}</span>
      {anteprima.nuovo.scelta.tipo === 'collega' && anteprima.acquisti.registrazioni.filter(r => anteprima.nuovo.scelta.tipo === 'collega' && r.id === anteprima.nuovo.scelta.acquistoId).map(r => <DettagliConsumo key={r.id} acquisto={r} />)}
      <span>{anteprima.nuovo.fonte.tipo === 'manuale' ? 'Inserito a mano' : 'Dal Diario'} · {fortunaInParole(anteprima.nuovo.fortuna)}.</span>
      {anteprima.nuovo.rapportoLegacy && <span>{anteprima.nuovo.rapportoLegacy.tipo === 'rappresenta' ? 'Prende il posto del vecchio segno «Acquistato».' : 'Il vecchio segno «Acquistato» resta: è un consumo in più.'}</span>}
      {anteprima.nuovo.rapportoLegacy?.valutazione && <ProvaPresenza valutazione={anteprima.nuovo.rapportoLegacy.valutazione} />}
      {!!altreStessoGiorno.length && <div role="alert" className="flex flex-col gap-1 text-warning"><strong>Forse è già registrato.</strong><span>Per il {dataGiocoTesto(anteprima.nuovo.momento.giorno)} ci sono già {altreStessoGiorno.length} consumi. Se è lo stesso, collega quello; se è un altro, puoi registrarlo.</span>{altreStessoGiorno.map(r => <DettagliConsumo key={r.id} acquisto={r} />)}</div>}
      {anteprima.disponibilita.motivi.map((m) => <p className="m-0 text-warning" key={m}>{m}</p>)}
      <p className="m-0">Punti e yen non cambiano da soli: i punti li applichi dal pulsante sulla voce, gli yen li cambi tu a mano.</p>
      <label className="touch flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={attestato} disabled={occupato || incerto} onChange={(e) => setAttestato(e.target.checked)} />Giorno, succo e vecchio segno sono giusti.</label>
      <div className="flex flex-wrap gap-2">
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave={incerto ? 'riprova' : 'raggiunto'} dimensione={22} />} titolo={incerto ? 'Riprova' : titoloConferma} disabled={occupato || !attestato} onClick={() => void conferma()} />
        {!incerto && <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="modifica" dimensione={22} />} titolo="Correggi" disabled={occupato} onClick={() => { setAnteprima(null); setAttestato(false); }} />}
      </div>
    </div>}
    {errore && <p role="alert" className="m-0 text-error-testo">{errore}</p>}
    {incerto && <p role="alert" className="m-0 text-warning">Non è sicuro che sia andata a buon fine. «Riprova» ripete la stessa operazione una volta sola: se era già riuscita, non si duplica.</p>}
    {occupato && <p role="status" className="m-0">Un attimo…</p>}
  </div>;
}

/** I consumi registrati e le voci che li confermano, distinti dal vecchio segno «Acquistato». */
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
    catch (e) { if (vivo.current) setErrore(`Fatto, ma non sono riuscito ad aggiornare la pagina: ${messaggio(e)}`); }
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
      // l'etichetta finisce nelle notifiche: sempre il nome leggibile (il consumo ha quello della sua identità; questo componente tratta solo l'Aojiru), mai la chiave
      const nomeArticolo = a.acquisto?.identita.nome ?? 'Aojiru';
      const bersaglio = { etichetta: provenienza ? `Voce che conferma il consumo di ${nomeArticolo}` : `Vecchio segno «Acquistato» di ${nomeArticolo}`, articolo: a.articolo };
      if (provenienza) await annullaFonteConRegistro(partitaId, { operazioneId: a.operazioneId, provenienzaId: provenienza, revisioneAcquistiAttesa: a.revisioneAcquistiAttesa }, bersaglio);
      else await rimuoviLegacyConRegistro(partitaId, { operazioneId: a.operazioneId, articolo: a.articolo, revisioneAcquistiAttesa: a.revisioneAcquistiAttesa }, bersaglio);
      if (vivo.current) { setRicevuta('Tolto. Lo ritrovi nel Cestino.'); setRimozione(null); setIncerto(false); }
      await aggiorna();
    } catch (e) { if (vivo.current) { const dubbio = !!gestoPendenteNelloScope(partitaId, { articolo: a.articolo }); setIncerto(dubbio); setErrore(messaggio(e)); if (!dubbio) setRimozione(null); } }
    finally { blocco.current = false; if (vivo.current) setOccupato(false); }
  };
  return <div className="flex min-w-0 flex-col gap-2 testo-12">
    <span>{stato?.aojiru ? `${stato.aojiru.confermate} ${stato.aojiru.confermate === 1 ? 'consumo confermato' : 'consumi confermati'}` : `${stato?.registrazioni.length ?? 0} ${(stato?.registrazioni.length ?? 0) === 1 ? 'consumo registrato' : 'consumi registrati'}`}</span>
    {stato?.presenzaStorica && <div className="flex flex-col gap-1"><span>C’è un vecchio segno «Acquistato» senza giorno né succo{stato.presenzaStorica.rappresentataDa ? ', già collegato a un consumo' : ''}.</span>
      {stato.presenzaStorica.valutazione && <ProvaPresenza valutazione={stato.presenzaStorica.valutazione} />}
      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli solo il vecchio segno" className="self-start" disabled={occupato} onClick={() => void preparaRimozione(null)} /></div>}
    {stato?.aojiru?.varianteAttesa && <span>Prossimo previsto: {nomeDote(stato.aojiru.varianteAttesa)}; conferma quello che hai bevuto davvero.</span>}
    {!!stato?.aojiru?.incongruenze.length && <ul className="m-0 pl-4 text-warning">{stato.aojiru.incongruenze.map((m) => <li key={m}>{m}</li>)}</ul>}
    {registrabile && <PulsanteVisivo compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Registra un consumo" className="self-start" disabled={occupato} onClick={() => { setRicevuta(null); setErrore(null); setNuovo(true); }} />}
    {!!stato?.registrazioni.length && <details><summary className="touch">Consumi e voci</summary><ul className="m-0 flex list-none flex-col gap-2 p-0">
      {stato.registrazioni.map((r) => <li key={r.id} className="flex flex-col gap-1 border-t border-border pt-2">
        <DettagliConsumo acquisto={r} />
        {r.provenienze.map((p) => <div className="flex flex-wrap items-center gap-1" key={p.id}>
          {p.fonte.tipo === 'manuale' ? <span>Inserito a mano</span> : p.voceCorrente ? <Link className="touch inline-flex items-center" to={`/guida/percorso/${p.voceCorrente.giorno}?voce=${encodeURIComponent(p.fonte.voceUid)}`}>Dal Diario · {dataGiocoTesto(p.voceCorrente.giorno)}</Link> : <span className="text-warning">La voce del Diario non c’è più</span>}
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli solo questa voce" disabled={occupato} onClick={() => void preparaRimozione(p.id)} />
        </div>)}
      </li>)}
    </ul></details>}
    {ricevuta && <p role="status" className="m-0 text-success">{ricevuta}</p>}
    {errore && <p role="alert" className="m-0 text-error-testo">{errore}</p>}
    <Modal aperta={nuovo} titolo="Registra il consumo di Aojiru" onChiudi={() => { if (!gestoPendenteNelloScope(partitaId, { articolo: stato?.articolo ?? ARTICOLO_AOJIRU })) setNuovo(false); }} larga>
      <PreparazioneAcquistoAojiru key={`${partitaId}:${stato?.articolo ?? ARTICOLO_AOJIRU}`} partitaId={partitaId} fonte={{ tipo: 'manuale' }} articolo={stato?.articolo} stato={stato}
        onRecuperato={aggiorna}
        giorno={partita?.id === partitaId ? partita.dataGioco : null} fascia={partita?.id === partitaId ? partita.fasciaGioco : 'giorno'}
        onConferma={async (richiesta) => {
          await eseguiAcquistoConRegistro(partitaId, richiesta, { etichetta: 'Consumo di Aojiru inserito a mano', articolo: richiesta.articolo });
          if (vivo.current) setRicevuta('Consumo registrato.');
          await aggiorna();
        }} />
    </Modal>
    <Modal aperta={rimozione !== null} titolo="Vuoi toglierlo?" onChiudi={() => { if (!occupato && !gestoPendenteNelloScope(partitaId, { articolo: stato?.articolo ?? ARTICOLO_AOJIRU })) setRimozione(null); }} azioni={<>
      <button type="button" className="btn btn-ghost touch" disabled={occupato || incerto} onClick={() => setRimozione(null)}>Annulla</button>
      <PulsanteVisivo tono="primario" icona={<IconaAzione chiave={incerto ? 'riprova' : 'elimina'} dimensione={22} />} titolo={incerto ? 'Riprova' : 'Sì, toglilo'} disabled={occupato} onClick={() => void rimuovi()} />
    </>}>
      <p>{rimozione?.provenienza ? 'Si toglie soltanto questa voce.' : 'Si toglie soltanto il vecchio segno «Acquistato».'} {rimozione?.anteprima.ultimaFonte ? 'È l’ultima voce che lo conferma: il consumo non conta più. Se serve correggere i punti, compare il pulsante «Annulla» sulla voce.' : 'Le altre voci del consumo restano.'} Lo ritrovi nel Cestino.</p>
      {rimozione?.anteprima.acquisto && <DettagliConsumo acquisto={rimozione.anteprima.acquisto} fonteSelezionata={rimozione.provenienza} />}
      {rimozione?.anteprima.presenzaStorica && <div className="flex flex-col gap-1 break-words"><strong>Vecchio segno · {rimozione.anteprima.presenzaStorica.negozioNome}</strong><span>{rimozione.anteprima.presenzaStorica.orfana ? 'L’offerta non c’è più nel catalogo. ' : ''}Non dice quante volte, quando né quale succo.</span>{rimozione.anteprima.presenzaStorica.valutazione && <ProvaPresenza valutazione={rimozione.anteprima.presenzaStorica.valutazione} />}{rimozione.anteprima.presenzaStorica.rappresentataDa && <span>È già rappresentato da un consumo registrato.</span>}</div>}
      {errore && <p role="alert" className="text-error-testo">{errore}</p>}
      {incerto && <p role="alert">Non è sicuro che sia andata a buon fine: la verifica ripete soltanto la stessa operazione.</p>}
      {incerto && <GestiPartita partitaId={partitaId} onCambiato={async () => { if (vivo.current) { setRimozione(null); setIncerto(false); await aggiorna(); } }} />}
    </Modal>
  </div>;
}
