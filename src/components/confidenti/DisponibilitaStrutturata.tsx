// ============================================================
// DisponibilitaStrutturata — la disponibilità di un Confidente come dato strutturato (R9-01, F4)
// ============================================================
//
// La scheda mostra la struttura (come si incontra, giorni, fasce, eccezioni, «dal») e i luoghi per nome, non più il testo libero (che resta nelle note).
// L'editor scrive la struttura e i luoghi col PUT della rotta strutturata; «Ripristina» riporta la struttura alla fonte. Il vecchio editor delle informazioni
// continua a scrivere solo il testo e le note. Mai un blocco: l'esito «oggi» è un'informazione.
// L13 (ondata 6, migrazione 306): la pioggia non si modifica qui, sta nei requisiti di rango (fonte unica); la scheda la elenca accanto alle
// eccezioni, letta da lì. Eccezioni nuove: i giorni di un rango (al posto di quelli generali) e i giorni del calendario in cui non si incontra.
// ============================================================

import { useState } from 'react';
import { Selettore } from '../shared/Selettore';
import { SelettoreData } from '../shared/SelettoreData';
import { dataValida, ordineGioco } from '../../../shared/condizioniSpillo';
import { Campo, CampoTesto } from '../shared/Campo';
import { FinestraModifica } from '../shared/FinestraModifica';
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
/** «MM-GG» con l'articolo, senza zeri: «il 28/9», «l'8/11». */
const conArticolo = (mmgg: string): string => { const g = Number(mmgg.slice(3)); return `${g === 8 || g === 11 ? 'l’' : 'il '}${g}/${Number(mmgg.slice(0, 2))}`; };
const SETTE_GIORNI = GIORNI_DISPONIBILITA.filter((g) => g !== 'festivi');
const RANGHI = Array.from({ length: 10 }, (_, i) => i + 1);

/** Un'eccezione in parole. */
function testoEccezione(e: EccezioneDisponibilita): string {
  if (e.tipo === 'dopo-rango') return `Non è disponibile nei ${e.giorni} giorni dopo un rango`;
  if (e.tipo === 'fascia-rango') return `Al rango ${e.rango} solo ${elenco(e.fasce.map((f) => NOME_FASCIA[f]))}`;
  if (e.tipo === 'giorni-rango') return `Al rango ${e.rango} ${SETTE_GIORNI.every((g) => e.giorni.includes(g)) ? 'tutti i giorni' : `solo ${elenco(e.giorni.map((g) => NOME_GIORNO[g]))}`}`;
  return e.date.length ? `Non si incontra ${elenco(e.date.map(conArticolo))}` : 'Nessun giorno escluso';
}

/** La pioggia in parole, dai requisiti di rango (la sua sola fonte): null se nessun incontro dipende dalla pioggia. */
function testoPioggia(ranghi: number[]): string | null {
  if (ranghi.length === 0) return null;
  return RANGHI.every((r) => ranghi.includes(r)) ? 'Con la pioggia non è disponibile' : `Con la pioggia non si incontra per ${ranghi.length === 1 ? 'il rango' : 'i ranghi'} ${elenco(ranghi.map(String))}`;
}

/** Le eccezioni e la pioggia, nell'ordine in cui la scheda le elenca. */
const righeEccezioni = (s: Struttura, ranghiPioggia: number[]): string[] => [...s.eccezioni.map(testoEccezione), ...(testoPioggia(ranghiPioggia) ? [testoPioggia(ranghiPioggia)!] : [])];

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
  if (d.errore || !d.dati) return <p role="alert" className="m-0 testo-13 text-error-testo">{d.errore ?? 'Disponibilità non disponibile.'}</p>;
  const { struttura: s, luoghi, oggi, modificata } = d.dati;
  const eccezioni = righeEccezioni(s, d.dati.ranghiNonConLaPioggia ?? []);
  return (
    <div className="flex flex-col gap-1 testo-13 text-text-secondary">
      <span><strong className="text-text">Dove:</strong> {luoghi.length ? luoghi.map((l) => l.nome).join(', ') : (s.motivoSenzaLuogo || '—')}</span>
      <span><strong className="text-text">Quando:</strong> {testoQuando(s)}{s.dal ? ` · dal ${dataBreve(s.dal)}` : ''}</span>
      {eccezioni.length > 0 && <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5">{eccezioni.map((t, i) => <li key={i}>{t}</li>)}</ul>}
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
  const eccezioni = righeEccezioni(s, d.dati.ranghiNonConLaPioggia ?? []);
  return (
    <span className="flex flex-wrap items-center gap-1.5 testo-12 text-text-secondary">
      <span>{testoQuando(s)}{s.dal ? ` · dal ${dataBreve(s.dal)}` : ''}{eccezioni.length > 0 ? ` · ${eccezioni.join(' · ')}` : ''}</span>
      {oggi && oggi.stato !== 'sconosciuto' && <span className={`chip testo-12 ${oggi.stato === 'disponibile' ? 'chip--attivo' : ''}`} title={oggi.motivo}>{NOME_STATO[oggi.stato] ?? oggi.stato}</span>}
    </span>
  );
}

const uguali = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** I giorni del calendario di gioco in cui il Confidente non si incontra: si scelgono (mese e giorno), si aggiungono e si tolgono; mai testo. */
function DateEscluse({ date, onCambia, disabilitato }: { date: string[]; onCambia: (date: string[]) => void; disabilitato: boolean }) {
  const [nuova, setNuova] = useState('');
  const aggiungibile = dataValida(nuova) && !date.includes(nuova);
  const aggiungi = () => { if (aggiungibile) { onCambia([...date, nuova].sort((a, b) => ordineGioco(a) - ordineGioco(b))); setNuova(''); } };
  return (
    <div className="flex basis-full flex-col gap-2">
      {date.length === 0
        ? <span role="alert" className="text-error-testo">Scegli almeno un giorno.</span>
        : <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">{date.map((d) => (
          <li key={d} className="flex items-center gap-1 rounded border border-border pl-2"><span>{dataBreve(d)}</span>
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo={`Togli il ${dataBreve(d)}`} disabled={disabilitato} onClick={() => onCambia(date.filter((x) => x !== d))} /></li>
        ))}</ul>}
      <span className="flex flex-wrap items-center gap-2">
        <SelettoreData etichetta="Giorno da escludere" valore={nuova} onCambia={setNuova} disabilitato={disabilitato} />
        <PulsanteVisivo compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi il giorno" disabled={disabilitato || !aggiungibile} onClick={aggiungi} />
      </span>
    </div>
  );
}

/** I campi dell'editor: la struttura (con «dal» come testo, '' = nessuno) e le chiavi dei luoghi. */
interface CampiDisponibilita { modo: ModoDisponibilita; giorni: GiornoDisponibilita[]; fasce: FasciaDisponibilita[]; eccezioni: EccezioneDisponibilita[]; dal: string; motivo: string; luoghi: string[] }
const campiDisponibilitaDa = (d: DisponibilitaConfidenteDto): CampiDisponibilita => ({
  modo: d.struttura.modo, giorni: d.struttura.giorni, fasce: d.struttura.fasce, eccezioni: d.struttura.eccezioni, dal: d.struttura.dal ?? '', motivo: d.struttura.motivoSenzaLuogo, luoghi: d.luoghi.map((l) => l.chiave),
});
/** Solo per scrivere il corpo mentre i dati arrivano: la finestra non lo mostra finché `campi` è nullo. */
const CAMPI_VUOTI: CampiDisponibilita = { modo: 'settimanale', giorni: [], fasce: [], eccezioni: [], dal: '', motivo: '', luoghi: [] };

/** L'editor: struttura e luoghi, salvati col PUT; «Ripristina» riporta la struttura alla fonte. Nel rilascio (sola lettura) non esiste (costante di build). */
export const EditorDisponibilitaStrutturata: StrumentoDiModifica<typeof EditorDisponibilitaStrutturataReale> = IN_RILASCIO ? NienteInRilascio : EditorDisponibilitaStrutturataReale;
function EditorDisponibilitaStrutturataReale({ chiave, nome, onChiudi, onSalvato }: { chiave: string; nome: string; onChiudi: () => void; onSalvato: () => void | Promise<void> }) {
  const d = useCarica(() => getDisponibilitaStrutturata(chiave), [chiave]);
  const tuttiILuoghi = useCarica(() => getLuoghi(), []);
  const titolo = `Disponibilità di ${nome}`;
  const dati = d.dati;
  const tutti = tuttiILuoghi.dati ?? [];
  // L13 (ondata 4a): una sola finestra dall'apertura alla chiusura (prima un guscio di caricamento a parte si smontava all'arrivo dei dati
  // e nasceva un'altra finestra). I campi partono dai dati letti e diventano propri alla prima modifica (`modifiche`).
  const [modifiche, setModifiche] = useState<CampiDisponibilita | null>(null);
  const campi = modifiche ?? (dati ? campiDisponibilitaDa(dati) : null);
  const aggiorna = (f: (c: CampiDisponibilita) => CampiDisponibilita) => { if (dati) setModifiche((m) => f(m ?? campiDisponibilitaDa(dati))); };
  const setModo = (modo: ModoDisponibilita) => aggiorna((c) => ({ ...c, modo }));
  const setGiorni = (giorni: GiornoDisponibilita[]) => aggiorna((c) => ({ ...c, giorni }));
  const setFasce = (fasce: FasciaDisponibilita[]) => aggiorna((c) => ({ ...c, fasce }));
  const setEccezioni = (f: (l: EccezioneDisponibilita[]) => EccezioneDisponibilita[]) => aggiorna((c) => ({ ...c, eccezioni: f(c.eccezioni) }));
  const setDal = (dal: string) => aggiorna((c) => ({ ...c, dal }));
  const setMotivo = (motivo: string) => aggiorna((c) => ({ ...c, motivo }));
  const setLuoghi = (f: (l: string[]) => string[]) => aggiorna((c) => ({ ...c, luoghi: f(c.luoghi) }));
  const { modo, giorni, fasce, eccezioni, dal, motivo, luoghi } = campi ?? CAMPI_VUOTI;
  const [occupato, setOccupato] = useState(false);
  const nomeLuogo = (k: string) => dati?.luoghi.find((l) => l.chiave === k)?.nome ?? tutti.find((l) => l.chiave === k)?.nome ?? k;
  const dalValido = dal === '' || dataValida(dal);
  const partenza = dati?.struttura;
  const sporca = !!dati && !!partenza && !!campi && (modo !== partenza.modo || !uguali(giorni, partenza.giorni) || !uguali(fasce, partenza.fasce) || !uguali(eccezioni, partenza.eccezioni)
    || dal !== (partenza.dal ?? '') || motivo !== partenza.motivoSenzaLuogo || !uguali(luoghi, dati.luoghi.map((l) => l.chiave)));
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
  /** Un rango ha al massimo un'eccezione per tipo (la fascia, i giorni): quelli ancora liberi. */
  const rangoLibero = (tipo: 'fascia-rango' | 'giorni-rango', r: number): boolean => !eccezioni.some((e) => e.tipo === tipo && e.rango === r);
  const primoRangoLibero = (tipo: 'fascia-rango' | 'giorni-rango'): number | null => RANGHI.find((r) => rangoLibero(tipo, r)) ?? null;
  // un elenco di giorni esclusi vuoto non dice niente: si salva solo con almeno un giorno
  const dateCompilate = eccezioni.every((e) => e.tipo !== 'date' || e.date.length > 0);
  const luoghiAggiungibili = tutti.filter((l) => !luoghi.includes(l.chiave)).map((l) => ({ chiave: l.chiave, nome: l.nome, dettaglio: l.quartiereNome }));

  return (
    <FinestraModifica titolo={titolo} onChiudi={onChiudi} onSalva={salva} salvabile={sporca && dalValido && dateCompilate} occupato={occupato} sporca={sporca}
      caricamento={!campi} erroreCaricamento={campi ? null : d.errore}
      azioniExtra={dati?.modificata ?<PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Ripristina la struttura" disabled={occupato} onClick={() => void esegui(() => ripristinaDisponibilitaStrutturata(chiave), 'Struttura ripristinata come nella fonte.')} /> : undefined}>
    <div className="flex flex-col gap-3 testo-13">
      <Selettore etichettaSopra etichetta="Come si incontra" valore={modo} opzioni={MODI_DISPONIBILITA.map((m) => ({ chiave: m, nome: NOME_MODO[m] }))} onCambia={(v) => setModo(v as ModoDisponibilita)} disabilitato={occupato} />
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
      {/* L13: la data si sceglie (mese e giorno del calendario di gioco), non si digita; si salva sempre come «MM-GG», o niente */}
      <Campo etichetta="Disponibile dal" aiuto="Facoltativa: «nessuna» = disponibile fin dall’inizio." errore={dalValido ? undefined : 'La data salvata non è un giorno del calendario di gioco: sceglila di nuovo (o «nessuna»).'} senzaGruppo>
        <SelettoreData etichetta="Disponibile dal" facoltativa valore={dal} onCambia={setDal} disabilitato={occupato} />
      </Campo>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0"><legend className="p-0 text-text-secondary">Eccezioni</legend>
        {eccezioni.length === 0 && <span className="text-text-muted">Nessuna eccezione.</span>}
        {eccezioni.map((e, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded border border-border px-2 py-1">
            <span className="min-w-0 flex-1 break-words">{e.tipo === 'date' ? 'Giorni in cui non si incontra' : testoEccezione(e)}</span>
            {e.tipo === 'dopo-rango' && <label className="flex items-center gap-1">giorni <input className="form-input w-16" type="number" min={1} max={30} value={e.giorni} disabled={occupato} onChange={(ev) => modificaEccezione(i, { ...e, giorni: Math.min(30, Math.max(1, Math.trunc(Number(ev.target.value)) || 1)) })} /></label>}
            {e.tipo === 'fascia-rango' && <>
              <label className="flex items-center gap-1">rango <input className="form-input w-16" type="number" min={1} max={10} value={e.rango} disabled={occupato} onChange={(ev) => modificaEccezione(i, { ...e, rango: Math.min(10, Math.max(1, Math.trunc(Number(ev.target.value)) || 1)) })} /></label>
              {FASCE_DISPONIBILITA.map((f) => <button key={f} type="button" aria-pressed={e.fasce.includes(f)} disabled={occupato} className={`chip touch ${e.fasce.includes(f) ? 'chip--attivo' : ''}`} onClick={() => { const prossime = ordinati(alterna(e.fasce, f), FASCE_DISPONIBILITA); if (prossime.length > 0) modificaEccezione(i, { ...e, fasce: prossime }); }}>{NOME_FASCIA[f]}</button>)}
            </>}
            {e.tipo === 'giorni-rango' && <>
              <Selettore compatto ricerca="mai" etichetta="Rango" valore={String(e.rango)} opzioni={RANGHI.filter((r) => r === e.rango || rangoLibero('giorni-rango', r)).map((r) => ({ chiave: String(r), nome: `rango ${r}` }))} onCambia={(v) => modificaEccezione(i, { ...e, rango: Number(v) })} disabilitato={occupato} />
              {GIORNI_DISPONIBILITA.map((g) => <button key={g} type="button" aria-pressed={e.giorni.includes(g)} disabled={occupato} className={`chip touch ${e.giorni.includes(g) ? 'chip--attivo' : ''}`} onClick={() => { const prossimi = ordinati(alterna(e.giorni, g), GIORNI_DISPONIBILITA); if (prossimi.length > 0) modificaEccezione(i, { ...e, giorni: prossimi }); }}>{NOME_GIORNO[g]}</button>)}
            </>}
            {e.tipo === 'date' && <DateEscluse date={e.date} disabilitato={occupato} onCambia={(date) => modificaEccezione(i, { ...e, date })} />}
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" disabled={occupato} onClick={() => setEccezioni((l) => l.filter((_, j) => j !== i))} />
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <PulsanteVisivo compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi: giorni dopo un rango" disabled={occupato || eccezioni.some((e) => e.tipo === 'dopo-rango')} onClick={() => setEccezioni((l) => [...l, { tipo: 'dopo-rango', giorni: 2, effetto: 'non-disponibile' }])} />
          <PulsanteVisivo compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi: fascia a un rango" disabled={occupato || primoRangoLibero('fascia-rango') === null} onClick={() => setEccezioni((l) => [...l, { tipo: 'fascia-rango', rango: primoRangoLibero('fascia-rango') ?? 1, fasce: ['sera'] }])} />
          <PulsanteVisivo compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi: giorni a un rango" disabled={occupato || primoRangoLibero('giorni-rango') === null} onClick={() => setEccezioni((l) => [...l, { tipo: 'giorni-rango', rango: primoRangoLibero('giorni-rango') ?? 1, giorni: [...SETTE_GIORNI] }])} />
          <PulsanteVisivo compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi: giorni in cui non si incontra" disabled={occupato || eccezioni.some((e) => e.tipo === 'date')} onClick={() => setEccezioni((l) => [...l, { tipo: 'date', date: [], effetto: 'non-disponibile' }])} />
        </div>
        <span className="text-text-muted">La pioggia si indica nei requisiti di rango («Non deve piovere»).</span>
      </fieldset>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0"><legend className="p-0 text-text-secondary">Luoghi</legend>
        {luoghi.length === 0 && <span className="text-text-muted">Nessun luogo.</span>}
        <ul className="m-0 flex list-none flex-col gap-1 p-0">{luoghi.map((k) => (
          <li key={k} className="flex min-w-0 items-center gap-2"><span className="min-w-0 flex-1 break-words">{nomeLuogo(k)}</span>
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" disabled={occupato} onClick={() => setLuoghi((l) => l.filter((x) => x !== k))} /></li>
        ))}</ul>
        <Selettore etichettaSopra etichetta="Aggiungi un luogo" valore="" vuoto="Scegli un luogo" opzioni={luoghiAggiungibili} onCambia={(k) => { if (k) setLuoghi((l) => (l.includes(k) ? l : [...l, k])); }} disabilitato={occupato || luoghiAggiungibili.length === 0} />
      </fieldset>
      {luoghi.length === 0 && (
        <CampoTesto etichetta="Perché non ha un luogo" valore={motivo} massimo={500} disabilitato={occupato} onCambia={setMotivo} />
      )}
    </div>
    </FinestraModifica>
  );
}
