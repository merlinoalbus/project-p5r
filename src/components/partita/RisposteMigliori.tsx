// ============================================================
// RisposteMigliori — le risposte da dare nell'evento di rango del Confidente aperto nel cassetto, in evidenza accanto al level up
// ============================================================
//
// Quali dialoghi servono ADESSO: la scheda del Confidente (`ConfidenteDettaglioPage`, «Prossimo passo: rango N») mostra aperti i dialoghi
// con `rango` > rango della partita e ≤ rango + 1, cioè — con ranghi interi — `rango === rango attuale + 1`: il dialogo etichettato «Rango N»
// è quello che si affronta per arrivare al rango N (anche le Doti d'incontro, `dotiIncontro`, e i semafori dei requisiti, `semafori[0]`,
// sono indicizzati sul rango di arrivo). Qui si applica lo stesso criterio: aperti per primi i dialoghi del rango attuale + 1 (o, subito
// dopo una salita, quelli del rango appena raggiunto: l'evento appena giocato, le cui note si registrano adesso). Gli altri
// ranghi restano consultabili sotto «Tutte le risposte», ripiegati. Il componente delle scelte è `DialogoRango` (massimo dei punti
// evidenziato), lo stesso della scheda. Il dettaglio si legge solo per il Confidente scelto e si ricorda (`useDettaglioConfidente`);
// il caricamento e l'errore stanno dentro la sezione: il resto del pannello resta usabile.
// ============================================================

import { useState } from 'react';
import { DialogoRango } from '../confidenti/DialogoRango';
import { useDettaglioConfidente } from './useDettaglioConfidente';
import { Spinner } from '../shared/PageState';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

interface Props {
  chiave: string;
  nome: string;
  /** Il rango dell'evento di cui mostrare le risposte: il prossimo (rango della partita + 1) o quello appena raggiunto. */
  rangoEvento: number;
  /** L'evento è quello appena giocato (dopo «Sali al rango N»): le sue note valgono già verso il rango successivo. */
  appenaGiocato?: boolean;
}

/** Sezione «Risposte migliori»: i dialoghi dell'evento del rango indicato aperti, gli altri ripiegati sotto «Tutte le risposte». */
export function RisposteMigliori({ chiave, nome, rangoEvento, appenaGiocato = false }: Props) {
  const { dati, caricamento, errore, riprova } = useDettaglioConfidente(chiave);
  // le scelte dell'utente su ogni dialogo (id → aperto); senza scelta, aperto solo se è dell'evento indicato
  const [scelte, setScelte] = useState<Record<number, boolean>>({});
  const [tutte, setTutte] = useState(false);
  const arrivo = rangoEvento;
  const oltre = arrivo > 10;
  const dialoghi = dati?.dialoghi ?? [];
  const prossimi = !oltre ? dialoghi.filter((d) => d.rango === arrivo) : [];
  const altri = dialoghi.filter((d) => !prossimi.includes(d));
  const aperto = (id: number, predefinito: boolean) => scelte[id] ?? predefinito;
  const alterna = (id: number, predefinito: boolean) => setScelte((s) => ({ ...s, [id]: !(s[id] ?? predefinito) }));

  return (
    <section className="risposte-migliori" aria-label={`Risposte migliori di ${nome}`}>
      <div className="flex items-baseline gap-2 flex-wrap">
        <h4 className="m-0 font-display uppercase testo-16 tracking-wide">Risposte migliori</h4>
        {!oltre && <span className="testo-12 text-text-muted">{appenaGiocato ? `evento del rango ${arrivo} appena giocato: registra le note ottenute` : `evento del rango ${arrivo}`}</span>}
      </div>
      {caricamento && <div className="flex items-center gap-2 testo-13 text-text-muted" role="status"><Spinner size={18} /> Carico le risposte…</div>}
      {errore && (
        <p className="m-0 testo-13 text-error" role="alert">
          Risposte non disponibili: {errore}{' '}
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={riprova} />
        </p>
      )}
      {dati && (
        <>
          {oltre && <p className="m-0 testo-13 text-text-muted">Rango massimo: nessun altro dialogo da affrontare.</p>}
          {!oltre && prossimi.length === 0 && <p className="m-0 testo-13 text-text-muted">Nessun dialogo documentato per il rango {arrivo}.</p>}
          {prossimi.length > 0 && (
            <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
              {prossimi.map((d) => <DialogoRango key={d.id} d={d} aperto={aperto(d.id, true)} onToggle={() => alterna(d.id, true)} />)}
            </ul>
          )}
          {altri.length > 0 && (
            <>
              <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="dettagli" dimensione={20} />} aria-expanded={tutte} onClick={() => setTutte((v) => !v)}
                titolo={tutte ? 'Nascondi le altre risposte' : 'Tutte le risposte'} dettaglio={tutte ? undefined : `${altri.length} ${altri.length === 1 ? 'altro rango' : 'altri ranghi'}`} />
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
