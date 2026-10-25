// ============================================================
// ModificaGuida — correggere un testo della guida dove si legge, e rimetterlo com'era (L11 · B11)
// ============================================================
//
// Un solo componente per tutti gli oggetti che non hanno una pagina di catalogo propria: quartieri, trofei, Doti, personaggi, sfide,
// completamento e Covo, testi degli oggetti, Jose, trasformazioni. Il pulsante sta accanto al dato; al clic chiede all'API la scheda
// dell'oggetto (`GET /api/correzioni/:tipo/:chiave`: i campi che si possono correggere, il valore di adesso e quello della guida) e apre una
// finestra. «Salva» invia i soli campi cambiati; «Ripristina» rimette il valore della guida (di tutti i campi o di uno) dopo una conferma
// che mostra la versione che si perde. Non c'è cestino, né «Da rivedere», né una seconda superficie di approvazione: si sostituisce un valore.
// La bozza non salvata si segnala con `useBozzaSporca`.
// ============================================================

import { Fragment, useState, type ReactNode } from 'react';
import { uguali } from '../../../shared/percorsoGuida';
import { correggiGuida, getSchedaCorrezione, ripristinaGuida } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';
import type { CampoCorrezioneDto, SchedaCorrezioneDto, TipoModificabile, ValoreCampoCorrezione } from '../../types';
import { SceltaCatalogoOggetto } from '../catalogo/SceltaCatalogoOggetto';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { Selettore } from '../shared/Selettore';
import { Blocco, CampoElenco, Griglia } from './moduli/campi';

type Bozza = Record<string, ValoreCampoCorrezione>;

/** Il valore come testo per «Guida: …» e per la conferma del ripristino (le frasi lunghe si accorciano). */
function mostra(c: CampoCorrezioneDto, v: ValoreCampoCorrezione): string {
  if (v === null || v === '') return '(vuoto)';
  if (typeof v === 'boolean') return v ? 'sì' : 'no';
  // le voci di un elenco da opzioni sono chiavi: si mostrano i nomi
  if (Array.isArray(v)) return v.length === 0 ? '(elenco vuoto)' : v.map((x) => c.opzioni?.find((o) => o.chiave === x)?.nome ?? x).join(' · ');
  if (c.tipo === 'scelta') return c.opzioni?.find((o) => o.chiave === v)?.nome ?? String(v);
  const t = String(v);
  return t.length > 200 ? `${t.slice(0, 200)}…` : t;
}

/** Il valore che il campo può salvare? (le stesse regole del server: il server le ricontrolla). */
function validoCampo(c: CampoCorrezioneDto, v: ValoreCampoCorrezione | undefined): boolean {
  if (v === undefined) return false;
  switch (c.tipo) {
    case 'testo': case 'testolungo': return typeof v === 'string' && (v.trim() !== '' || !!c.nullable || c.valoreGuida === '');
    case 'numero': return v === null ? !!c.nullable : typeof v === 'number' && Number.isInteger(v) && v >= 0 && (c.max === undefined || v <= c.max);
    case 'booleano': return typeof v === 'boolean';
    case 'elenco': return Array.isArray(v);
    case 'scelta': return typeof v === 'string';
    case 'oggetto': return v === null ? !!c.nullable : typeof v === 'string' && v !== '';
  }
}

const valoriDi = (s: SchedaCorrezioneDto): Bozza => Object.fromEntries(s.campi.map((c) => [c.percorso, c.valore]));

/** Un campo che la pagina disegna a modo suo (per esempio l'elenco delle skill con i livelli) e/o controlla prima del salvataggio. */
export interface EditorCampoSpeciale {
  /** Sostituisce il campo standard; senza, il campo resta quello del tipo. */
  disegna?: (campo: CampoCorrezioneDto, valore: ValoreCampoCorrezione | undefined, imposta: (v: ValoreCampoCorrezione) => void, occupato: boolean) => ReactNode;
  /** Il motivo, in italiano, per cui il valore non si può salvare (`null` se va bene): blocca «Salva» (il server ricontrolla comunque). */
  errore?: (valore: ValoreCampoCorrezione | undefined) => string | null;
}

export interface PropsModificaGuida {
  tipo: TipoModificabile;
  /** La chiave dell'oggetto come la pagina lo conosce (il nome, o la chiave dell'elenco). */
  chiave: string;
  /** Che cosa si sta correggendo, per il nome accessibile e per la bozza («il quartiere «Shibuya»»). */
  cosa: string;
  /** Una matita sola, dove le righe sono tante (tabelle di tratti e di sfide): niente scritta. */
  soloIcona?: boolean;
  /** Testo accanto alla matita (default «Modifica»). */
  etichetta?: string;
  /** Alla chiusura della finestra, se qualcosa è cambiato (salvato o rimesso): la pagina rilegge i suoi dati. */
  onSalvato: () => void;
  className?: string;
  /** Campi disegnati o controllati dalla pagina, per percorso. */
  campiSpeciali?: Record<string, EditorCampoSpeciale>;
}

function ModificaGuidaReale({ tipo, chiave, cosa, soloIcona, etichetta = 'Modifica', onSalvato, className = '', campiSpeciali }: PropsModificaGuida) {
  const [scheda, setScheda] = useState<SchedaCorrezioneDto | null>(null);
  const [bozza, setBozza] = useState<Bozza>({});
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  /** Il ripristino chiede conferma: `campi` assente = tutto l'oggetto. */
  const [conferma, setConferma] = useState<{ campi?: string[] } | null>(null);
  /** Dall'apertura è stato rimesso almeno un valore della guida: alla chiusura la pagina deve rileggere. */
  const [rimesso, setRimesso] = useState(false);

  const cambiati = scheda ? scheda.campi.filter((c) => !uguali(bozza[c.percorso], c.valore)) : [];
  const tuttiValidi = cambiati.every((c) => validoCampo(c, bozza[c.percorso]) && !campiSpeciali?.[c.percorso]?.errore?.(bozza[c.percorso]));
  useBozzaSporca('modifica-guida', `modifica di ${cosa}`, cambiati.length > 0);

  /** Mette in finestra la scheda ricevuta e riparte dai suoi valori. */
  const carica = (s: SchedaCorrezioneDto) => { setScheda(s); setBozza(valoriDi(s)); setErrore(null); setConferma(null); };
  /** Chiude la finestra scartando la bozza. La pagina rilegge i suoi dati se qualcosa è cambiato (salvato adesso o rimesso prima di chiudere):
   *  non prima, perché certe pagine nascondono il contenuto mentre rileggono e la finestra sparirebbe a metà. */
  const chiudi = (cambiato = false) => {
    const rileggi = cambiato || rimesso;
    setScheda(null); setConferma(null); setErrore(null); setRimesso(false);
    if (rileggi) onSalvato();
  };

  /** Chiede la scheda all'API al clic (non una per riga all'apertura della pagina) e apre la finestra. */
  const apri = () => {
    setOccupato(true);
    void getSchedaCorrezione(tipo, chiave)
      .then(carica)
      .catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Caricamento fallito.'))
      .finally(() => setOccupato(false));
  };

  /** Invia i soli campi cambiati; a buon fine chiude e avvisa la pagina, altrimenti lascia la finestra aperta con l'errore. */
  const salva = async () => {
    if (!scheda || cambiati.length === 0) return;
    setOccupato(true);
    setErrore(null);
    try {
      await correggiGuida(tipo, scheda.chiave, Object.fromEntries(cambiati.map((c) => [c.percorso, bozza[c.percorso] ?? null])));
      notifica('success', `Correzione salvata: ${cosa}.`);
      chiudi(true);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Correzione non salvata.');
    } finally {
      setOccupato(false);
    }
  };

  /** Rimette il valore della guida (tutto o i campi indicati); a buon fine la finestra mostra la scheda aggiornata. */
  const ripristina = async (campi?: string[]) => {
    if (!scheda) return;
    setOccupato(true);
    setErrore(null);
    try {
      const esito = await ripristinaGuida(tipo, scheda.chiave, campi);
      notifica('success', `Valori della guida rimessi: ${cosa}.`);
      carica(esito.scheda);
      setRimesso(true);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Ripristino non riuscito.');
      setConferma(null);
    } finally {
      setOccupato(false);
    }
  };

  const imposta = (percorso: string, v: ValoreCampoCorrezione) => setBozza((b) => ({ ...b, [percorso]: v }));

  /** Un campo del modulo secondo il suo tipo. */
  const disegnaCampo = (c: CampoCorrezioneDto) => {
    const v = bozza[c.percorso];
    const speciale = campiSpeciali?.[c.percorso];
    if (speciale?.disegna) return <Fragment key={c.percorso}>{speciale.disegna(c, v, (nuovo) => imposta(c.percorso, nuovo), occupato)}</Fragment>;
    const problema = speciale?.errore?.(v) ?? null;
    if (problema && !uguali(v, c.valore)) return <Fragment key={c.percorso}>{campoStandard(c, v)}<p role="alert" className="m-0 testo-12 text-error-testo sm:col-span-2">{problema}</p></Fragment>;
    return campoStandard(c, v);
  };

  /** Il campo secondo il suo tipo. */
  const campoStandard = (c: CampoCorrezioneDto, v: ValoreCampoCorrezione | undefined) => {
    switch (c.tipo) {
      case 'elenco':
        return <CampoElenco key={c.percorso} etichetta={c.etichetta} voci={Array.isArray(v) ? v : []} disabilitato={occupato} onCambia={(voci) => imposta(c.percorso, voci)} />;
      case 'booleano':
        return (
          <label key={c.percorso} className="touch flex items-center gap-2 testo-13 sm:col-span-2">
            <input type="checkbox" className="h-5 w-5" checked={v === true} disabled={occupato} onChange={(e) => imposta(c.percorso, e.target.checked)} />
            {c.etichetta}
          </label>
        );
      case 'scelta':
        return (
          <Blocco key={c.percorso}>
            <Selettore etichetta={c.etichetta} valore={typeof v === 'string' ? v : ''} ricerca="auto" disabilitato={occupato}
              opzioni={(c.opzioni ?? []).map((o) => ({ chiave: o.chiave, nome: o.nome }))} onCambia={(k) => imposta(c.percorso, k)} />
          </Blocco>
        );
      case 'oggetto':
        return (
          <Blocco key={c.percorso} largo>
            <SceltaCatalogoOggetto etichetta={c.etichetta} valore={typeof v === 'string' ? v : ''} disabilitato={occupato} onScegli={(o) => imposta(c.percorso, o.chiave)} />
            {c.nullable && v !== null && v !== '' && (
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Nessun oggetto" className="self-start" disabled={occupato} onClick={() => imposta(c.percorso, null)} />
            )}
            {v === null && <span className="testo-12 text-text-muted">Nessun oggetto scelto.</span>}
          </Blocco>
        );
      case 'numero':
        return (
          <label key={c.percorso} className="editor-mappa__campo">
            {c.etichetta}
            <input className="form-input min-h-11" type="number" inputMode="numeric" min={0} max={c.max} step={1} disabled={occupato}
              value={typeof v === 'number' ? v : ''} onChange={(e) => imposta(c.percorso, e.target.value === '' ? null : Number(e.target.value))} />
          </label>
        );
      case 'testolungo':
        return (
          <label key={c.percorso} className="editor-mappa__campo sm:col-span-2">
            {c.etichetta}
            <textarea className="form-input min-h-[88px]" rows={3} maxLength={c.max ?? 6000} disabled={occupato} value={typeof v === 'string' ? v : ''} onChange={(e) => imposta(c.percorso, e.target.value)} />
          </label>
        );
      case 'testo':
        return (
          <label key={c.percorso} className="editor-mappa__campo">
            {c.etichetta}
            <input className="form-input min-h-11" type="text" maxLength={c.max ?? 600} disabled={occupato} value={typeof v === 'string' ? v : ''} onChange={(e) => imposta(c.percorso, e.target.value)} />
          </label>
        );
    }
  };

  /** Sotto un campo corretto: che cosa dice la guida e il gesto per rimetterlo. */
  const rigaGuida = (c: CampoCorrezioneDto) => {
    if (!c.modificato) return null;
    return (
      <div key={`${c.percorso}-guida`} className="flex flex-wrap items-center gap-2 testo-12 text-text-muted sm:col-span-2">
        <span className="min-w-0 flex-1 break-words">Guida: {mostra(c, c.valoreGuida)}</span>
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Rimetti questo" disabled={occupato} onClick={() => setConferma({ campi: [c.percorso] })} />
      </div>
    );
  };

  const daPerdere = scheda && conferma ? scheda.campi.filter((c) => c.modificato && (!conferma.campi || conferma.campi.includes(c.percorso))) : [];

  // i campi in ordine, con un'intestazione quando cambia il gruppo
  const corpo: ReactNode[] = [];
  let gruppo: string | undefined;
  for (const c of scheda?.campi ?? []) {
    if (c.gruppo && c.gruppo !== gruppo) corpo.push(<h3 key={`g-${c.gruppo}`} className="m-0 mt-2 testo-12 font-semibold uppercase tracking-wide text-text-muted sm:col-span-2">{c.gruppo}</h3>);
    gruppo = c.gruppo;
    corpo.push(disegnaCampo(c), rigaGuida(c));
  }

  return <>
    {soloIcona
      ? <button type="button" className={`touch shrink-0 rounded px-1.5 testo-12 text-text-muted hover:text-text ${className}`} aria-label={`Modifica ${cosa}`} title={`Modifica ${cosa}`} disabled={occupato} onClick={apri}>✎</button>
      : <PulsanteVisivo tono="fantasma" compatto className={className} icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo={etichetta}
        aria-label={`${etichetta}: ${cosa}`} disabled={occupato} onClick={apri} />}
    {scheda && (
      <Modal titolo={`${scheda.nome}`} aperta onChiudi={() => chiudi()} larga
        azioni={<>
          {/* «Annulla» della finestra resta di solo testo (ROADMAP 12.8); dopo «Rimetti questo» diventa «Chiudi», con l'icona */}
          {rimesso
            ? <PulsanteVisivo icona={<IconaAzione chiave="chiudi" dimensione={22} />} titolo="Chiudi" disabled={occupato} onClick={() => chiudi()} />
            : <button type="button" className="btn btn-secondary" disabled={occupato} onClick={() => chiudi()}>Annulla</button>}
          {scheda.modificata && <PulsanteVisivo icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Ripristina i valori della guida" disabled={occupato} onClick={() => setConferma({})} />}
          <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Salva" disabled={occupato || cambiati.length === 0 || !tuttiValidi} onClick={() => void salva()} />
        </>}>
        <div className="flex flex-col gap-3">
          <p className="m-0 testo-12 text-text-muted">
            {scheda.modificata
              ? 'Hai corretto questo oggetto: «Ripristina i valori della guida» (o «Rimetti questo» sotto un campo) rimette quello che diceva la guida.'
              : 'Salvando, la correzione vale in tutta l’app e resta anche dopo gli aggiornamenti; potrai rimettere il valore della guida.'}
            {scheda.nota ? ` ${scheda.nota}` : ''}
          </p>
          {scheda.guidaCambiata.length > 0 && (
            <p role="status" className="m-0 rounded-md border border-warning p-2 testo-12">
              La guida è cambiata dopo la tua correzione ({scheda.guidaCambiata.map((p) => scheda.campi.find((c) => c.percorso === p)?.etichetta ?? p).join(', ')}): la tua versione resta in uso finché non la rimetti.
            </p>
          )}
          <Griglia>{corpo}</Griglia>
          {conferma && (
            <div role="alert" className="flex flex-col gap-2 rounded-md border border-warning p-3 testo-13">
              <p className="m-0 font-semibold">Perdi la tua versione:</p>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {daPerdere.map((c) => <li key={c.percorso} className="break-words"><span className="text-text-muted">{c.etichetta}:</span> {mostra(c, c.valore)}</li>)}
              </ul>
              {cambiati.length > 0 && <p className="m-0 text-text-muted">Anche le modifiche di questa finestra non ancora salvate vanno perse.</p>}
              <div className="flex flex-wrap gap-2">
                <PulsanteVisivo tono="pericolo" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Rimetti la guida" disabled={occupato} onClick={() => void ripristina(conferma.campi)} />
                <PulsanteVisivo icona={<IconaAzione chiave="annulla" dimensione={22} />} titolo="No" disabled={occupato} onClick={() => setConferma(null)} />
              </div>
            </div>
          )}
          {errore && <p role="alert" className="m-0 text-sm text-error-testo">{errore} La finestra resta aperta.</p>}
        </div>
      </Modal>
    )}
  </>;
}

/** Nel rilascio (sola lettura) la correzione non esiste: componente vuoto e `ModificaGuidaReale` esce dal bundle (L12, passo 8). */
export const ModificaGuida: StrumentoDiModifica<typeof ModificaGuidaReale> = IN_RILASCIO ? NienteInRilascio : ModificaGuidaReale;
