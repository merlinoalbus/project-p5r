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
// `vuoto` aggiunge in testa la voce «nessuna scelta» con chiave ''. Da tastiera: frecce, Invio, Esc.
// ============================================================

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { LARGHEZZA_TENDINA, SOGLIA_RICERCA, TETTO_VOCI } from '../../utils/selettore';
import { piatto } from '../../utils/testo';

export interface OpzioneSelettore { chiave: string; nome: string; dettaglio?: string; gruppo?: string }

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
  className?: string;
}

/**
 * Pulsante combobox con etichetta e voce scelta (o `segnaposto`) che apre una tendina con l'elenco delle voci,
 * eventualmente filtrabile; la scelta chiama `onCambia` con la chiave. L'elenco mostra al massimo `TETTO_VOCI`
 * voci (con l'invito a restringere se ce ne sono di più), filtra senza accenti su nome, dettaglio e gruppo, e si
 * chiude scegliendo, con Esc o toccando fuori.
 */
export function Selettore({ etichetta, valore, opzioni, onCambia, disabilitato, segnaposto = 'Scegli…', vuoto, ricerca = 'auto', compatto, className }: PropsSelettore) {
  const [aperto, setAperto] = useState(false);
  const [testo, setTesto] = useState('');
  const [evidenziata, setEvidenziata] = useState(0);
  const [aDestra, setADestra] = useState(false);
  const id = useId();
  const radice = useRef<HTMLDivElement | null>(null);
  const pulsante = useRef<HTMLButtonElement | null>(null);
  const elenco = useRef<HTMLUListElement | null>(null);
  const tutte = useMemo(() => (vuoto === undefined ? opzioni : [{ chiave: '', nome: vuoto }, ...opzioni]), [opzioni, vuoto]);
  const scelta = tutte.find((o) => o.chiave === valore) ?? null;
  const conRicerca = ricerca === 'sempre' || (ricerca === 'auto' && tutte.length >= SOGLIA_RICERCA);

  const { filtrate, tagliate } = useMemo(() => {
    const q = conRicerca ? piatto(testo.trim()) : '';
    const base = q ? tutte.filter((o) => piatto(o.nome).includes(q) || (o.dettaglio ? piatto(o.dettaglio).includes(q) : false) || (o.gruppo ? piatto(o.gruppo).includes(q) : false)) : tutte;
    return { filtrate: base.slice(0, TETTO_VOCI), tagliate: base.length > TETTO_VOCI };
  }, [tutte, testo, conRicerca]);

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
    elenco.current?.querySelector<HTMLElement>('.selettore__voce--evidenziata')?.scrollIntoView?.({ block: 'nearest' });
  }, [aperto, evidenziata, filtrate]);
  /** Tastiera nella tendina: Esc chiude, frecce spostano l'evidenziazione entro le voci filtrate, Invio sceglie quella evidenziata. */
  const tastiera = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); chiudi(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setEvidenziata((i) => Math.min(filtrate.length - 1, i + 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setEvidenziata((i) => Math.max(0, i - 1)); return; }
    if (e.key === 'Enter') { e.preventDefault(); const o = filtrate[Math.min(evidenziata, filtrate.length - 1)]; if (o) scegli(o.chiave); }
  };
  /**
   * Tastiera sul pulsante: a tendina chiusa le frecce la aprono; a tendina aperta i tasti passano a `tastiera` se non
   * c'è il campo di ricerca (con il campo li gestisce la tendina stessa), Esc sempre.
   */
  const tastieraPulsante = (e: React.KeyboardEvent) => {
    if (!aperto && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); apri(); return; }
    if (aperto && (!conRicerca || e.key === 'Escape')) tastiera(e);
  };

  return (
    <div ref={radice} className={`selettore ${compatto ? 'selettore--compatto' : ''} ${className ?? ''}`}>
      <button ref={pulsante} type="button" role="combobox" className="selettore__scelta touch" aria-haspopup="listbox" aria-expanded={aperto} aria-controls={id} aria-label={etichetta} disabled={disabilitato} onClick={() => (aperto ? setAperto(false) : apri())} onKeyDown={tastieraPulsante} title={scelta ? scelta.nome : segnaposto}>
        {!compatto && <span className="selettore__etichetta">{etichetta}</span>}
        <span className={`selettore__valore ${scelta ? '' : 'selettore__valore--vuoto'}`}>{scelta ? scelta.nome : segnaposto}</span>
        <span className="selettore__freccia" aria-hidden="true">▾</span>
      </button>
      {aperto && (
        <div className={`selettore__tendina ${aDestra ? 'selettore__tendina--destra' : ''}`} onKeyDown={conRicerca ? tastiera : undefined}>
          {conRicerca && <input className="form-input selettore__campo" type="search" value={testo} onChange={(e) => { setTesto(e.target.value); setEvidenziata(0); }} placeholder={`Cerca ${etichetta.toLowerCase()}…`} aria-label={`Cerca ${etichetta}`} aria-controls={id} autoComplete="off" autoFocus />}
          <ul ref={elenco} id={id} role="listbox" aria-label={etichetta} className="selettore__elenco">
            {filtrate.length === 0 && <li className="selettore__vuoto">Nessuna voce corrisponde.</li>}
            {filtrate.map((o, i) => {
              // Le intestazioni di gruppo compaiono solo dove il gruppo cambia, nell'ordine dell'elenco.
              const intestazione = o.gruppo && (i === 0 || filtrate[i - 1].gruppo !== o.gruppo) ? o.gruppo : null;
              return [
                intestazione ? <li key={`gruppo:${o.chiave}`} role="presentation" className="selettore__gruppo">{intestazione}</li> : null,
                <li key={o.chiave || '__vuoto'} role="option" aria-selected={o.chiave === valore} className={`selettore__voce ${i === evidenziata ? 'selettore__voce--evidenziata' : ''} ${o.chiave === valore ? 'selettore__voce--scelta' : ''}`}>
                  <button type="button" className="selettore__pulsante touch" onMouseEnter={() => setEvidenziata(i)} onClick={() => scegli(o.chiave)}>
                    <span className="min-w-0 flex-1 break-words">{o.nome}</span>
                    {o.dettaglio && <span className="text-text-muted text-[11px] shrink-0">{o.dettaglio}</span>}
                  </button>
                </li>,
              ];
            })}
            {tagliate && <li className="selettore__vuoto">Scrivi qualche lettera in più per restringere.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

