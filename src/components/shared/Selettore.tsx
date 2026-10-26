// ============================================================
// Selettore — l'unico elenco chiuso dell'app
// ============================================================
//
// Al posto della tendina nativa: un pulsante che mostra etichetta e scelta, e quando lo apri un
// elenco a righe da 44 px. Da dieci voci in su compare un campo dove scrivi un pezzo del nome e
// l'elenco si restringe mentre scrivi (richiesta dell'utente: «ricerca in tutti i selettori con più
// di 10 voci», poi estesa «a tutti i selettori nell'app» per coerenza). Il testo scritto serve
// solo a filtrare — il valore è **sempre** una voce dell'elenco, mai quello che hai digitato.
//
// Le voci possono avere un gruppo (intestazione nell'elenco) e un dettaglio (in grigio a destra).
// `vuoto` aggiunge in testa la voce «nessuna scelta» con chiave ''. Da tastiera: frecce, Home/Fine, Invio, Esc, Tab.
//
// Accessibilità (WCAG 2.2, schema APG del combobox con listbox): il fuoco resta sul pulsante (o sul campo di ricerca) e la voce
// evidenziata è dichiarata con `aria-activedescendant`; le voci sono `option` senza pulsanti dentro, quindi Tab non le attraversa
// una a una e chiude la tendina. Il nome accessibile dice anche il valore quando l'etichetta non è visibile (selettore compatto).
// ============================================================

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { LARGHEZZA_TENDINA, SOGLIA_RICERCA, TETTO_VOCI } from '../../utils/selettore';
import { piatto } from '../../utils/testo';
import { testoNoteAParole } from '../../../shared/note';
import { TestoNote } from './TestoNote';

export interface OpzioneSelettore { chiave: string; nome: string; dettaglio?: string; gruppo?: string; testoRicerca?: string }

export interface PropsSelettore {
  etichetta: string;
  valore: string;
  opzioni: OpzioneSelettore[];
  onCambia: (chiave: string) => void;
  disabilitato?: boolean;
  /** Testo del pulsante quando non c'è ancora una scelta. */
  segnaposto?: string;
  /** La voce «nessuna scelta», con chiave ''. */
  vuoto?: string;
  /** `auto` = campo di ricerca da dieci voci in su; `sempre`; `mai`. */
  ricerca?: 'auto' | 'sempre' | 'mai';
  /** Stretto quanto il contenuto, senza l'etichetta sopra il valore: per i filtri in linea. */
  compatto?: boolean;
  /** LAY3-7: il nome accessibile del pulsante dice anche il valore scelto, intero («Infiltrazione 1 di 9: 1. Passaggio…»), per i
   *  selettori compatti il cui valore chiuso si accorcia coi puntini (l'elenco aperto mostra comunque i nomi interi).
   *  Dal lotto accessibilità vale già per ogni selettore `compatto` (l'etichetta non è visibile, il testo visibile è il valore: 2.5.3);
   *  per gli altri, che mostrano l'etichetta sopra il valore, il valore è nella descrizione accessibile. */
  valoreNelNome?: boolean;
  /** L13 (modelli comuni, 1): forma da CAMPO di modulo, a scelta del chiamante. Con `etichettaSopra` l'etichetta sta SOPRA il pulsante,
   *  come in ogni campo dell'app (`Campo`), e il pulsante ha bordo, fondo e altezza di un campo di testo: è per i selettori che stanno in
   *  una griglia di campi (finestre di modifica, form). Senza la prop resta la forma di sempre (maiuscoletto sopra il valore, dentro il
   *  pulsante), che non allunga le righe fitte, le barre di filtri e le righe di tabella. Il compatto non ha mai l'etichetta visibile e ignora la prop. */
  etichettaSopra?: boolean;
  className?: string;
}

/**
 * Pulsante combobox con etichetta e voce scelta (o `segnaposto`) che apre una tendina con l'elenco delle voci,
 * eventualmente filtrabile; la scelta chiama `onCambia` con la chiave. L'elenco mostra al massimo `TETTO_VOCI`
 * voci (con l'invito a restringere se ce ne sono di più), filtra senza accenti su nome, dettaglio e gruppo, e si
 * chiude scegliendo, con Esc o toccando fuori.
 */
export function Selettore({ etichetta, valore, opzioni, onCambia, disabilitato, segnaposto = 'Scegli…', vuoto, ricerca = 'auto', compatto, valoreNelNome, etichettaSopra, className }: PropsSelettore) {
  const [aperto, setAperto] = useState(false);
  const [testo, setTesto] = useState('');
  const [evidenziata, setEvidenziata] = useState(0);
  const [aDestra, setADestra] = useState(false);
  const id = useId();
  const radice = useRef<HTMLDivElement | null>(null);
  const pulsante = useRef<HTMLButtonElement | null>(null);
  const elenco = useRef<HTMLUListElement | null>(null);
  /** Spazio gestito alla pressione: il rilascio non deve riattivare il pulsante (che riaprirebbe la tendina appena chiusa). */
  const spazioGestito = useRef(false);
  const tutte = useMemo(() => (vuoto === undefined ? opzioni : [{ chiave: '', nome: vuoto }, ...opzioni]), [opzioni, vuoto]);
  const scelta = tutte.find((o) => o.chiave === valore) ?? null;
  /** Il nome accessibile porta il valore quando il testo visibile è solo il valore (compatto: 2.5.3) o lo chiede il chiamante. */
  const nomeConValore = !!compatto || !!valoreNelNome;
  const conRicerca = ricerca === 'sempre' || (ricerca === 'auto' && tutte.length >= SOGLIA_RICERCA);

  const { filtrate, tagliate } = useMemo(() => {
    const q = conRicerca ? piatto(testo.trim()) : '';
    const base = q ? tutte.filter((o) => piatto(o.nome).includes(q) || (o.dettaglio ? piatto(o.dettaglio).includes(q) : false)
      || (o.gruppo ? piatto(o.gruppo).includes(q) : false) || (o.testoRicerca ? piatto(o.testoRicerca).includes(q) : false)) : tutte;
    return { filtrate: base.slice(0, TETTO_VOCI), tagliate: base.length > TETTO_VOCI };
  }, [tutte, testo, conRicerca]);

  /** Indice della voce evidenziata, riportato dentro l'elenco filtrato (-1 se l'elenco è vuoto). */
  const attiva = filtrate.length === 0 ? -1 : Math.min(evidenziata, filtrate.length - 1);
  const idVoce = (i: number) => `${id}-voce-${i}`;
  const idValore = `${id}-valore`;

  /** Apre la tendina con il filtro vuoto e la voce scelta evidenziata, decidendo da che lato ancorarla. */
  const apri = () => {
    setTesto('');
    setEvidenziata(Math.max(0, tutte.findIndex((o) => o.chiave === valore)));
    // La tendina è larga almeno LARGHEZZA_TENDINA: se da qui al bordo destro non ci sta, si
    // appende al bordo destro del pulsante invece di sfondare la finestra e far scorrere la pagina.
    const r = pulsante.current?.getBoundingClientRect();
    setADestra(!!r && typeof window !== 'undefined' && r.left + Math.max(r.width, LARGHEZZA_TENDINA) > window.innerWidth - 8);
    setAperto(true);
  };
  useEffect(() => {
    if (!aperto) return;
    /** Un tocco fuori dal selettore chiude la tendina. */
    const fuori = (e: PointerEvent) => { if (radice.current && !radice.current.contains(e.target as Node)) setAperto(false); };
    document.addEventListener('pointerdown', fuori);
    return () => document.removeEventListener('pointerdown', fuori);
  }, [aperto]);

  /** Chiude la tendina e riporta il fuoco sul pulsante. */
  const chiudi = () => { setAperto(false); pulsante.current?.focus(); };
  /** Comunica la voce scelta e chiude. */
  const scegli = (chiave: string) => { onCambia(chiave); chiudi(); };
  useEffect(() => {
    if (!aperto) return;
    // In una finestra la tendina sta nel corpo scorrevole, che la taglia: in fondo al modulo se ne vedeva una riga (a 768×1024
    // 42 px su 304). All'apertura il corpo scorre quanto basta a mostrarla intera, ma mai oltre il punto in cui il pulsante arriva
    // in cima: chi l'ha toccato deve continuare a vederlo. Non per il foglio dal basso del telefono (fixed), che sta già in vista.
    const corpo = radice.current?.closest<HTMLElement>('.modal-body');
    const tendina = corpo ? radice.current?.querySelector<HTMLElement>('.selettore__tendina') : null;
    if (!corpo || !tendina || !pulsante.current || getComputedStyle(tendina).position === 'fixed') return;
    const c = corpo.getBoundingClientRect();
    const sotto = tendina.getBoundingClientRect().bottom - c.bottom;
    const finoAlPulsante = pulsante.current.getBoundingClientRect().top - c.top;
    // le misure a schermo sono in scala durante l'animazione d'apertura della finestra (0.95): si riportano a quelle vere
    const scala = corpo.offsetHeight > 0 ? c.height / corpo.offsetHeight : 1;
    if (sotto > 0 && finoAlPulsante > 0) corpo.scrollTop += Math.min(sotto, finoAlPulsante) / scala;
  }, [aperto]);
  useEffect(() => {
    if (!aperto) return;
    elenco.current?.querySelector<HTMLElement>('.selettore__voce--evidenziata')?.scrollIntoView?.({ block: 'nearest' });
  }, [aperto, evidenziata, filtrate]);
  /**
   * Tastiera nella tendina: Esc chiude, frecce spostano l'evidenziazione entro le voci filtrate (PagSu/PagGiù di dieci), Invio sceglie
   * quella evidenziata; Home/Fine portano alla prima/ultima voce solo senza campo di ricerca (nel campo spostano il cursore del testo);
   * Spazio sceglie solo senza campo (nel campo è un carattere); Tab chiude senza rubare il fuoco e lo lascia proseguire.
   */
  const tastiera = (e: React.KeyboardEvent) => {
    const ultima = Math.max(0, filtrate.length - 1);
    if (e.key === 'Escape') { e.preventDefault(); chiudi(); return; }
    if (e.key === 'Tab') {
      // dal campo di ricerca il fuoco torna prima sul pulsante: la tendina sparisce con il campo e il Tab riparte da un punto certo
      if (e.target !== pulsante.current) pulsante.current?.focus();
      setAperto(false);
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setEvidenziata(Math.min(ultima, attiva + 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setEvidenziata(Math.max(0, attiva - 1)); return; }
    if (e.key === 'PageDown') { e.preventDefault(); setEvidenziata(Math.min(ultima, attiva + 10)); return; }
    if (e.key === 'PageUp') { e.preventDefault(); setEvidenziata(Math.max(0, attiva - 10)); return; }
    if (!conRicerca && e.key === 'Home') { e.preventDefault(); setEvidenziata(0); return; }
    if (!conRicerca && e.key === 'End') { e.preventDefault(); setEvidenziata(ultima); return; }
    if (e.key === 'Enter' || (!conRicerca && e.key === ' ')) {
      e.preventDefault();
      if (e.key === ' ') spazioGestito.current = true;
      const o = filtrate[attiva];
      if (o) scegli(o.chiave);
    }
  };
  /**
   * Tastiera sul pulsante: a tendina chiusa le frecce la aprono; a tendina aperta i tasti passano a `tastiera` se non
   * c'è il campo di ricerca (con il campo li gestisce la tendina stessa), Esc sempre.
   */
  const tastieraPulsante = (e: React.KeyboardEvent) => {
    if (!aperto && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); apri(); return; }
    if (aperto && (!conRicerca || e.key === 'Escape')) tastiera(e);
  };
  /** Lo Spazio già usato per scegliere non deve riattivare il pulsante al rilascio. */
  const rilascioPulsante = (e: React.KeyboardEvent) => {
    if (e.key === ' ' && spazioGestito.current) { e.preventDefault(); spazioGestito.current = false; }
  };
  /** Il fuoco è andato fuori dal selettore (tocco su altro, Maiusc+Tab, scorciatoia): la tendina si chiude. */
  const perdeFuoco = (e: React.FocusEvent) => {
    const verso = e.relatedTarget as Node | null;
    if (aperto && verso && radice.current && !radice.current.contains(verso)) setAperto(false);
  };

  return (
    <div ref={radice} onBlur={perdeFuoco} className={`selettore ${compatto ? 'selettore--compatto' : etichettaSopra ? 'selettore--con-etichetta' : ''} ${className ?? ''}`}>
      {/* etichetta sopra il pulsante (stile dei campi); il nome accessibile lo dà già `aria-label` del pulsante. Toccarla porta il fuoco
          sul pulsante, come una vera <label> */}
      {!compatto && etichettaSopra && <span className="campo__etichetta" aria-hidden="true" onClick={() => pulsante.current?.focus()}>{etichetta}</span>}
      <button ref={pulsante} type="button" role="combobox" className="selettore__scelta touch" aria-haspopup="listbox" aria-expanded={aperto} aria-controls={id} aria-activedescendant={aperto && !conRicerca && attiva >= 0 ? idVoce(attiva) : undefined} aria-label={nomeConValore ? `${etichetta}: ${scelta ? testoNoteAParole(scelta.nome) : segnaposto}` : etichetta} aria-describedby={nomeConValore ? undefined : idValore} disabled={disabilitato} onClick={() => (aperto ? setAperto(false) : apri())} onKeyDown={tastieraPulsante} onKeyUp={rilascioPulsante} title={scelta ? scelta.nome : segnaposto}>
        {!compatto && !etichettaSopra && <span className="selettore__etichetta">{etichetta}</span>}
        <span id={idValore} className={`selettore__valore ${scelta ? '' : 'selettore__valore--vuoto'}`}>{scelta ? <TestoNote testo={scelta.nome} /> : segnaposto}</span>
        <span className="selettore__freccia" aria-hidden="true">▾</span>
      </button>
      {aperto && (
        <div className={`selettore__tendina ${aDestra ? 'selettore__tendina--destra' : ''}`} onKeyDown={conRicerca ? tastiera : undefined}>
          {conRicerca && <input className="form-input selettore__campo" type="search" value={testo} onChange={(e) => { setTesto(e.target.value); setEvidenziata(0); }} placeholder={`Cerca ${etichetta.toLowerCase()}…`} aria-label={`Cerca ${etichetta}`} aria-controls={id} aria-activedescendant={attiva >= 0 ? idVoce(attiva) : undefined} autoComplete="off" autoFocus />}
          {/* il fuoco resta sul pulsante o sul campo: premere su una voce non deve spostarlo (toglierebbe la tendina da sotto il dito) */}
          <ul ref={elenco} id={id} role="listbox" aria-label={etichetta} className="selettore__elenco" onMouseDown={(e) => e.preventDefault()}>
            {filtrate.length === 0 && <li role="presentation" className="selettore__vuoto">Nessuna voce corrisponde.</li>}
            {filtrate.map((o, i) => {
              // Le intestazioni di gruppo compaiono solo dove il gruppo cambia, nell'ordine dell'elenco.
              const intestazione = o.gruppo && (i === 0 || filtrate[i - 1].gruppo !== o.gruppo) ? o.gruppo : null;
              return [
                intestazione ? <li key={`gruppo:${o.chiave}`} role="presentation" className="selettore__gruppo">{intestazione}</li> : null,
                // La voce è l'`option` stessa (nessun pulsante dentro): ha un id per `aria-activedescendant`, il tocco la sceglie.
                <li key={o.chiave || '__vuoto'} id={idVoce(i)} role="option" aria-selected={o.chiave === valore} onMouseEnter={() => setEvidenziata(i)} onClick={() => scegli(o.chiave)} className={`selettore__voce ${i === attiva ? 'selettore__voce--evidenziata' : ''} ${o.chiave === valore ? 'selettore__voce--scelta' : ''}`}>
                  <div className="selettore__pulsante touch">
                    <span className="min-w-0 flex-1 break-words"><TestoNote testo={o.nome} /></span>
                    {o.dettaglio && <span className="text-text-muted testo-12 shrink-0">{o.dettaglio}</span>}
                  </div>
                </li>,
              ];
            })}
            {tagliate && <li role="presentation" className="selettore__vuoto">Scrivi qualche lettera in più per restringere.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

