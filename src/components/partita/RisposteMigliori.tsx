// ============================================================
// RisposteMigliori — le risposte da dare nei dialoghi del Confidente scelto, in evidenza subito sotto le note ♪
// ============================================================
//
// Quali dialoghi servono ADESSO: la scheda del Confidente (`ConfidenteDettaglioPage`, «Prossimo passo: rango N») mostra aperti i dialoghi
// con `rango` > rango della partita e ≤ rango + 1, cioè — con ranghi interi — `rango === rango attuale + 1`: il dialogo etichettato «Rango N»
// è quello che si affronta per arrivare al rango N (anche le Doti d'incontro, `dotiIncontro`, e i semafori dei requisiti, `semafori[0]`,
// sono indicizzati sul rango di arrivo). Qui si applica lo stesso criterio: aperti per primi i dialoghi del rango attuale + 1. Gli altri
// ranghi restano consultabili sotto «Tutte le risposte», ripiegati. Il componente delle scelte è `DialogoRango` (massimo dei punti
// evidenziato), lo stesso della scheda. Il dettaglio si legge solo per il Confidente scelto e si ricorda (`useDettaglioConfidente`);
// il caricamento e l'errore stanno dentro la sezione: il resto del pannello resta usabile.
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DialogoRango } from '../confidenti/DialogoRango';
import { useDettaglioConfidente } from './useDettaglioConfidente';
import { Spinner } from '../shared/PageState';

interface Props {
  chiave: string;
  nome: string;
  /** Il rango del Confidente nella partita. */
  rango: number;
}

/** Sezione «Risposte migliori»: i dialoghi del prossimo passaggio di rango aperti, gli altri ripiegati sotto «Tutte le risposte». */
export function RisposteMigliori({ chiave, nome, rango }: Props) {
  const { dati, caricamento, errore, riprova } = useDettaglioConfidente(chiave);
  // le scelte dell'utente su ogni dialogo (id → aperto); senza scelta, aperto solo se è del prossimo passaggio
  const [scelte, setScelte] = useState<Record<number, boolean>>({});
  const [tutte, setTutte] = useState(false);
  const arrivo = rango + 1;
  const dialoghi = dati?.dialoghi ?? [];
  const prossimi = rango < 10 ? dialoghi.filter((d) => d.rango === arrivo) : [];
  const altri = dialoghi.filter((d) => !prossimi.includes(d));
  const aperto = (id: number, predefinito: boolean) => scelte[id] ?? predefinito;
  const alterna = (id: number, predefinito: boolean) => setScelte((s) => ({ ...s, [id]: !(s[id] ?? predefinito) }));

  return (
    <section className="risposte-migliori" aria-label={`Risposte migliori di ${nome}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <h4 className="m-0 font-display uppercase text-[16px] tracking-wide">Risposte migliori</h4>
        {rango < 10 && <span className="text-[12px] text-text-muted">per il rango {arrivo}</span>}
        <Link to={`/confidenti/${encodeURIComponent(chiave)}`} className="touch inline-flex items-center ml-auto text-[12px] text-primary underline underline-offset-2">Scheda completa</Link>
      </div>
      {caricamento && <div className="flex items-center gap-2 text-[13px] text-text-muted" role="status"><Spinner size={18} /> Carico le risposte…</div>}
      {errore && (
        <p className="m-0 text-[13px] text-error" role="alert">
          Risposte non disponibili: {errore}{' '}
          <button type="button" className="btn btn-secondary btn-sm touch" onClick={riprova}>Riprova</button>
        </p>
      )}
      {dati && (
        <>
          {rango >= 10 && <p className="m-0 text-[13px] text-text-muted">Rango massimo: nessun altro dialogo da affrontare.</p>}
          {rango < 10 && prossimi.length === 0 && <p className="m-0 text-[13px] text-text-muted">Nessun dialogo documentato per il rango {arrivo}.</p>}
          {prossimi.length > 0 && (
            <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
              {prossimi.map((d) => <DialogoRango key={d.id} d={d} aperto={aperto(d.id, true)} onToggle={() => alterna(d.id, true)} />)}
            </ul>
          )}
          {altri.length > 0 && (
            <>
              <button type="button" className="btn btn-ghost btn-sm touch self-start" aria-expanded={tutte} onClick={() => setTutte((v) => !v)}>
                {tutte ? 'Nascondi le altre risposte' : `Tutte le risposte (${altri.length} ${altri.length === 1 ? 'altro rango' : 'altri ranghi'})`}
              </button>
              {tutte && (
                <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                  {altri.map((d) => <DialogoRango key={d.id} d={d} aperto={aperto(d.id, false)} onToggle={() => alterna(d.id, false)} />)}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
