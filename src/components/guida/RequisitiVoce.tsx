// ============================================================
// RequisitiVoce — l'elenco «In scorta» di una voce del Diario: una griglia di chip interruttore, uno per requisito (arcano o Persona specifica)
// ============================================================
//
// Una voce può chiedere di avere in scorta certe Persona (`AzionePercorsoDto.requisiti`, scelti nell'editor della voce). La casella di ogni
// requisito è della partita ed è un promemoria manuale: non legge né scrive la scorta. La prima spunta della voce è consentita solo con tutte le
// caselle spuntate (la casella di completamento, in `AzioneGiornata`, dice quante ne mancano e a N/N «Pronta»; il server risponde comunque 409
// `requisiti-incompleti`); l'annullo è libero. Una chiamata per cambio, senza ottimismo: il chip cambia quando il server ha risposto; mentre una
// richiesta è in corso il chip è appena attenuato (resta col fuoco, il tocco è ignorato) e il nuovo conteggio si annuncia con garbo.
//
// Il chip è compatto (32 px visivi, 44 px di tocco con un'area invisibile sopra e sotto, mai sovrapposta a quella della fila accanto: le file
// distano 12 px): la figura dell'arcano con, nell'angolo, il cerchio della casella (vuoto, o rosso con la spunta), e il nome breve — la Persona
// se è specifica (l'arcano lo dice la figura), altrimenti l'arcano — fino a due righe, con il nome completo nel titolo e nel nome accessibile.
// Spuntato non è un rosso pieno (che nell'app vuol dire «fatto», D15): contorno rosso e fondo scuro, testo attenuato.
//
// Sotto i 768 px (o con la colonna delle voci stretta) l'elenco esce dalla colonna del testo e prende tutta la larghezza della voce, sotto
// casella e immagine: il rientro della colonna si misura (`--scorta-rientro`) e il CSS lo usa come margine negativo solo lì.
// Finché la voce non è fatta la griglia è sempre in vista; a voce fatta si riduce a una riga (figure in miniatura e «N/N») che si apre dal
// tocco (la voce si rimonta quando cambia `fatta`, vedi `Azione`). Senza partita i chip si leggono soltanto.
// ============================================================

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { impostaRequisitoVoce } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { chiaveRequisito, type RequisitoVoceDto } from '../../../shared/requisitiVoce';
import type { AzionePercorsoDto } from '../../types';
import { IconGiu } from '../shared/iconeGuida';
import { IconaArcano } from '../shared/IconaArcano';
import { nomeBreveRequisito, nomeRequisito } from '../../utils/requisitiVoce';

interface Props {
  a: AzionePercorsoDto;
  partitaId: number | null;
  /** La voce aggiornata dal server (dopo ogni cambio di casella). */
  onCambiata: (a: AzionePercorsoDto) => void;
  /** Cresce a ogni tentativo di completare la voce con caselle mancanti: il fuoco va alla prima che manca e le mancanti si evidenziano. */
  richiamo?: number;
}

/** Quante figure mostra al massimo la riga ripiegata (le altre diventano «+N»): la riga sta in una sola linea anche a 375 px. */
const FIGURE_RIPIEGATA = 6;
/** Sotto questa larghezza della colonna del testo l'elenco esce dalla colonna e prende tutta la riga della voce (tre chip da 112 px e spazi). */
const COLONNA_MINIMA = 348;
/** Per quanto restano evidenziate le caselle mancanti dopo un tentativo di completare la voce. */
const DURATA_RICHIAMO_MS = 1600;

/** Il segno di spunta del cerchio sulla figura: compare con un piccolo rimbalzo (movimento ridotto: nessuna transizione, regola globale). */
function SegnoSpunta() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5.5 12.5l4.2 4.2L18.5 8" /></svg>
  );
}

/** L'elenco «In scorta» della voce (solo per le voci che hanno requisiti). */
export function RequisitiVoce({ a, partitaId, onCambiata, richiamo = 0 }: Props) {
  const [occupate, setOccupate] = useState<ReadonlySet<string>>(new Set());
  const [aperta, setAperta] = useState(!a.fatta);
  // l'annuncio per il lettore di schermo (regione educata): vuoto all'apertura, scritto solo dopo un gesto
  const [annuncio, setAnnuncio] = useState('');
  const [evidenzia, setEvidenzia] = useState(false);
  const vivo = useRef(true);
  const sezione = useRef<HTMLElement>(null);
  // le richieste partono una alla volta, in ordine: ogni risposta contiene gli effetti di tutte le precedenti, quindi con due caselle toccate di
  // seguito la voce mostrata è sempre quella più recente e nessuna risposta può riportarla indietro
  const coda = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const requisiti = a.requisiti;
  const conRequisiti = !!requisiti?.length;
  // il rientro della colonna del testo nella riga della voce (maniglia, casella, immagine e spazi): il CSS lo usa come margine negativo quando
  // l'elenco deve prendere tutta la larghezza della voce. Si rimisura quando la riga o la colonna cambiano misura (la didascalia della casella
  // cambia larghezza fra «Mancano n» e «Pronta»)
  useLayoutEffect(() => {
    const el = sezione.current;
    const colonna = el?.parentElement;
    const riga = el?.closest('li');
    if (!el || !colonna || !riga) return;
    const misura = () => {
      const inizioRiga = riga.getBoundingClientRect().left + riga.clientLeft + (parseFloat(getComputedStyle(riga).paddingLeft) || 0);
      el.style.setProperty('--scorta-rientro', `${Math.max(0, Math.round(colonna.getBoundingClientRect().left - inizioRiga))}px`);
      // colonna stretta a qualunque larghezza di schermo (il Diario a mezza pagina in Home e in Partita › Oggi): l'elenco prende la riga intera.
      // Un attributo e non una classe: React riscrive `className` a ogni render, `data-piena` non lo tocca
      el.toggleAttribute('data-piena', colonna.clientWidth < COLONNA_MINIMA);
    };
    misura();
    const osservatore = new ResizeObserver(misura);
    osservatore.observe(riga);
    osservatore.observe(colonna);
    return () => osservatore.disconnect();
  }, [conRequisiti]);
  // un tentativo di completare la voce con caselle mancanti: il fuoco alla prima che manca (con lo scorrimento minimo) e le mancanti evidenziate
  useEffect(() => {
    if (!richiamo || !sezione.current) return;
    const prima = sezione.current.querySelector<HTMLInputElement>('input[type="checkbox"]:not(:checked)');
    const mancano = sezione.current.querySelectorAll('input[type="checkbox"]:not(:checked)').length;
    if (!prima) return;
    prima.focus({ preventScroll: true });
    prima.closest('label')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    setEvidenzia(true);
    setAnnuncio(`Per completare la voce mancano ${mancano} ${mancano === 1 ? 'Persona' : 'Persone'} in scorta da spuntare.`);
    const t = window.setTimeout(() => { if (vivo.current) setEvidenzia(false); }, DURATA_RICHIAMO_MS);
    return () => window.clearTimeout(t);
  }, [richiamo]);
  if (!requisiti?.length) return null;
  const conCaselle = partitaId !== null;
  const totale = requisiti.length;
  const fatti = requisiti.filter((r) => r.fatto === true).length;
  const pronta = conCaselle && fatti === totale;
  const cambia = async (r: RequisitoVoceDto, fatto: boolean) => {
    if (partitaId === null) return;
    const chiave = chiaveRequisito(r.arcana, r.persona);
    if (occupate.has(chiave)) return;
    setOccupate((s) => new Set(s).add(chiave));
    const richiesta = async () => {
      try {
        const agg = await impostaRequisitoVoce(partitaId, a.uid, r.arcana, r.persona, fatto);
        if (!vivo.current) return;
        onCambiata(agg);
        const t = agg.requisiti?.length ?? 0;
        const f = agg.requisiti?.filter((x) => x.fatto === true).length ?? 0;
        setAnnuncio(t ? `In scorta ${f} su ${t}${f === t && !agg.fatta ? ': la voce si può completare' : ''}.` : '');
      } catch (err) {
        if (vivo.current) notifica('error', err instanceof Error ? err.message : 'Casella non aggiornata.');
      } finally {
        if (vivo.current) setOccupate((s) => { const n = new Set(s); n.delete(chiave); return n; });
      }
    };
    coda.current = coda.current.then(richiesta);
    await coda.current;
  };
  const conta = (
    // il titolo «In scorta» è subito prima: al lettore di schermo il conteggio arriva come «3 su 9»
    <span className="scorta-voce__conta">
      {conCaselle ? <><span aria-hidden="true">{fatti}/{totale}</span><span className="sr-only">{fatti} su {totale}</span></> : totale}
    </span>
  );
  const titolo = <span className="scorta-voce__titolo">In scorta</span>;
  const nascoste = Math.max(0, totale - FIGURE_RIPIEGATA);
  const testata = conCaselle && !a.fatta
    ? (
      <div className="scorta-voce__testata">
        {titolo}{conta}
        <div className="scorta-voce__barra" role="progressbar" aria-label="Persone in scorta" aria-valuemin={0} aria-valuemax={totale} aria-valuenow={fatti} aria-valuetext={`${fatti} su ${totale}`}>
          <span style={{ width: `${(fatti / totale) * 100}%` }} />
        </div>
      </div>
    )
    : conCaselle
      // a voce fatta: una riga con «N/N», le figure in miniatura (al più sei, poi «+N») e subito dopo la freccia, che apre e chiude la griglia
      ? (
        <button type="button" className="scorta-voce__testata" aria-expanded={aperta} title={aperta ? 'Chiudi: In scorta' : 'Apri: In scorta'} onClick={() => setAperta((v) => !v)}>
          {titolo}{conta}
          {!aperta && (
            <span className="scorta-voce__riepilogo" aria-hidden="true">
              {requisiti.slice(0, FIGURE_RIPIEGATA).map((r) => <IconaArcano key={chiaveRequisito(r.arcana, r.persona)} arcana={r.arcana} dimensione={20} />)}
              {nascoste > 0 && <span className="scorta-voce__altre">+{nascoste}</span>}
            </span>
          )}
          <span className="scorta-voce__freccia" aria-hidden="true"><IconGiu size={18} /></span>
        </button>
      )
      : <div className="scorta-voce__testata">{titolo}{conta}</div>;
  return (
    <section ref={sezione} className={`scorta-voce ${pronta ? 'scorta-voce--pronta' : ''} ${evidenzia ? 'scorta-voce--richiamo' : ''}`} aria-label="In scorta">
      {testata}
      {/* il nuovo conteggio dopo ogni casella, e il motivo quando si prova a completare la voce troppo presto */}
      <span className="sr-only" aria-live="polite">{annuncio}</span>
      {(aperta || !a.fatta || !conCaselle) && (
        <ul className="scorta-chips">
          {requisiti.map((r) => {
            const chiave = chiaveRequisito(r.arcana, r.persona);
            const spuntato = r.fatto === true;
            const nome = nomeRequisito(r);
            const contenuto = (
              <>
                <span className="scorta-chip__figura">
                  <IconaArcano arcana={r.arcana} dimensione={24} />
                  {conCaselle && <span className="scorta-chip__segno" aria-hidden="true"><SegnoSpunta /></span>}
                </span>
                <span className="scorta-chip__nome">{nomeBreveRequisito(r)}</span>
              </>
            );
            return (
              <li key={chiave}>
                {conCaselle
                  ? (
                    <label className={`scorta-chip ${spuntato ? 'scorta-chip--spuntato' : 'scorta-chip--manca'} ${occupate.has(chiave) ? 'scorta-chip--occupato' : ''}`} title={nome}>
                      <input type="checkbox" className="sr-only" checked={spuntato} aria-label={nome} aria-busy={occupate.has(chiave) || undefined}
                        onChange={(e) => void cambia(r, e.target.checked)} />
                      {contenuto}
                    </label>
                  )
                  : <span className="scorta-chip scorta-chip--lettura" title={nome}>{contenuto}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
