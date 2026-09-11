// ============================================================
// SelettoreRicerca — un elenco chiuso in cui si cerca scrivendo
// ============================================================
//
// Al posto di una tendina con trecento voci: un pulsante che mostra la scelta, e quando lo apri un
// campo dove scrivi un pezzo del nome e l'elenco si restringe mentre scrivi. Il testo scritto
// serve solo a filtrare — il valore è **sempre** una voce dell'elenco, mai quello che hai
// digitato (richiesta dell'utente: «facilitare la ricerca all'interno dei selectbox usando
// l'inserimento di parti di testo dinamico», e «niente campi liberi su selettori condizionali»).
//
// Le voci possono avere un gruppo (intestazione nell'elenco) e un dettaglio (in grigio a destra).
// Bersagli touch da 44 px; da tastiera: frecce, Invio, Esc.
// ============================================================

import { useEffect, useId, useMemo, useRef, useState } from 'react';

export interface OpzioneRicerca { chiave: string; nome: string; dettaglio?: string; gruppo?: string }

interface Props {
  etichetta: string;
  valore: string;
  opzioni: OpzioneRicerca[];
  onCambia: (chiave: string) => void;
  disabilitato?: boolean;
  /** Testo del pulsante quando non c'è ancora una scelta. */
  segnaposto?: string;
  className?: string;
}

function piatto(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function SelettoreRicerca({ etichetta, valore, opzioni, onCambia, disabilitato, segnaposto = 'Scegli…', className }: Props) {
  const [aperto, setAperto] = useState(false);
  const [testo, setTesto] = useState('');
  const [evidenziata, setEvidenziata] = useState(0);
  const id = useId();
  const radice = useRef<HTMLDivElement | null>(null);
  const scelta = opzioni.find((o) => o.chiave === valore) ?? null;

  const filtrate = useMemo(() => {
    const q = piatto(testo.trim());
    const base = q ? opzioni.filter((o) => piatto(o.nome).includes(q) || (o.dettaglio ? piatto(o.dettaglio).includes(q) : false) || (o.gruppo ? piatto(o.gruppo).includes(q) : false)) : opzioni;
    return base.slice(0, 200);
  }, [opzioni, testo]);

  const apri = () => { setTesto(''); setEvidenziata(Math.max(0, opzioni.findIndex((o) => o.chiave === valore))); setAperto(true); };
  useEffect(() => {
    if (!aperto) return;
    const fuori = (e: PointerEvent) => { if (radice.current && !radice.current.contains(e.target as Node)) setAperto(false); };
    document.addEventListener('pointerdown', fuori);
    return () => document.removeEventListener('pointerdown', fuori);
  }, [aperto]);

  const scegli = (chiave: string) => { onCambia(chiave); setAperto(false); };
  const tastiera = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); setAperto(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setEvidenziata((i) => Math.min(filtrate.length - 1, i + 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setEvidenziata((i) => Math.max(0, i - 1)); return; }
    if (e.key === 'Enter') { e.preventDefault(); const o = filtrate[Math.min(evidenziata, filtrate.length - 1)]; if (o) scegli(o.chiave); }
  };

  return (
    <div ref={radice} className={`selettore-ricerca ${className ?? ''}`}>
      <button type="button" className="selettore-ricerca__scelta touch" aria-haspopup="listbox" aria-expanded={aperto} aria-label={etichetta} disabled={disabilitato} onClick={() => (aperto ? setAperto(false) : apri())} title={scelta ? scelta.nome : segnaposto}>
        <span className="selettore-ricerca__etichetta">{etichetta}</span>
        <span className={`selettore-ricerca__valore ${scelta ? '' : 'selettore-ricerca__valore--vuoto'}`}>{scelta ? scelta.nome : segnaposto}</span>
      </button>
      {aperto && (
        <div className="selettore-ricerca__tendina" onKeyDown={tastiera}>
          <input className="form-input selettore-ricerca__campo" type="search" value={testo} onChange={(e) => { setTesto(e.target.value); setEvidenziata(0); }} placeholder={`Cerca ${etichetta.toLowerCase()}…`} aria-label={`Cerca ${etichetta}`} aria-controls={id} autoComplete="off" autoFocus />
          <ul id={id} role="listbox" aria-label={etichetta} className="selettore-ricerca__elenco">
            {filtrate.length === 0 && <li className="selettore-ricerca__vuoto">Nessuna voce corrisponde.</li>}
            {filtrate.map((o, i) => {
              // Le intestazioni di gruppo compaiono solo dove il gruppo cambia, nell'ordine dell'elenco.
              const intestazione = o.gruppo && (i === 0 || filtrate[i - 1].gruppo !== o.gruppo) ? o.gruppo : null;
              return [
                intestazione ? <li key={`gruppo:${o.chiave}`} role="presentation" className="selettore-ricerca__gruppo">{intestazione}</li> : null,
                <li key={o.chiave} role="option" aria-selected={o.chiave === valore} className={`selettore-ricerca__voce ${i === evidenziata ? 'selettore-ricerca__voce--evidenziata' : ''} ${o.chiave === valore ? 'selettore-ricerca__voce--scelta' : ''}`}>
                  <button type="button" className="selettore-ricerca__pulsante touch" onMouseEnter={() => setEvidenziata(i)} onClick={() => scegli(o.chiave)}>
                    <span className="min-w-0 flex-1 break-words">{o.nome}</span>
                    {o.dettaglio && <span className="text-text-muted text-[11px] shrink-0">{o.dettaglio}</span>}
                  </button>
                </li>,
              ];
            })}
            {opzioni.length > filtrate.length && filtrate.length >= 200 && <li className="selettore-ricerca__vuoto">Scrivi qualche lettera in più per restringere.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
