// ============================================================
// DotiIncontro — la Dote che un Confidente dà a ogni incontro, rango per rango, e la finestra per cambiarla
// ============================================================
//
// Scelta dell'utente (2026-09-30): la Dote di un incontro (Takemi il Coraggio, Yoshida il Fascino…) arriva da ogni incontro
// registrato — la spunta nella giornata, le note di risposta o il passaggio di rango in Partita → Confidenti — una volta per
// incontro, e il dato si corregge qui («al dato finale ci penso io»). Un incontro vale «verso» il rango successivo a quello
// della partita: quello che lo raggiunge e quelli prima.
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { RigaDote } from '../guida/RigaDote';
import { impostaDotiIncontro } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import type { DoteNote } from '../../../shared/effettiAzione';
import type { ConfidenteDettaglioDto } from '../../types';

interface Props {
  confidente: ConfidenteDettaglioDto;
  /** Il rango della partita attiva: il prossimo incontro vale verso il successivo (evidenziato). */
  rangoPartita: number | null;
  onSalvato: () => void | Promise<void>;
}

export function DotiIncontro({ confidente, rangoPartita, onSalvato }: Props) {
  const [aperta, setAperta] = useState(false);
  const [bozza, setBozza] = useState<Array<{ rango: number; doti: DoteNote[] }>>([]);
  const [occupato, setOccupato] = useState(false);
  const verso = rangoPartita === null ? null : Math.min(10, rangoPartita + 1);
  const conDoti = confidente.dotiIncontro.filter((r) => r.doti.length > 0);

  const apri = () => { setBozza(confidente.dotiIncontro.map((r) => ({ rango: r.rango, doti: r.doti.map((d) => ({ ...d })) }))); setAperta(true); };
  const cambiaRango = (rango: number, doti: DoteNote[]) => setBozza((b) => b.map((r) => (r.rango === rango ? { ...r, doti } : r)));
  const salva = async () => {
    setOccupato(true);
    try {
      await impostaDotiIncontro(confidente.chiave, bozza);
      await onSalvato();
      notifica('success', 'Dote a ogni incontro aggiornata: vale dai prossimi incontri.');
      setAperta(false);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.');
    } finally {
      setOccupato(false);
    }
  };

  return (
    <section className="card flex flex-col gap-2" aria-labelledby="doti-incontro">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="doti-incontro" className="m-0 text-[15px] font-semibold">Dote a ogni incontro</h2>
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" onClick={apri} disabled={confidente.dotiIncontro.length === 0} />
      </div>
      <p className="m-0 text-[12px] text-text-muted">
        Il gioco dà queste Doti a ogni incontro: l'app te le ricorda quando lo registri — spuntandolo nella giornata, segnando le note di risposta
        o il passaggio di rango in Partita → Confidenti —, una volta per incontro, e le segni tu nella scheda Doti. Un incontro vale verso il
        rango successivo a quello raggiunto.
      </p>
      {conDoti.length === 0 ? <p className="m-0 text-[13px] text-text-muted">Nessuna Dote dichiarata.</p> : (
        <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light">
          {conDoti.map((r) => (
            <li key={r.rango} className="py-1.5 flex gap-3 items-center text-[13px]">
              <span className={`chip shrink-0 ${verso === r.rango ? 'chip--oro' : ''}`} title={verso === r.rango ? 'Il prossimo incontro nella partita vale verso questo rango' : undefined}>verso {r.rango}</span>
              <span>{r.testo}</span>
            </li>
          ))}
        </ul>
      )}
      {aperta && (
        <Modal aperta larga titolo={`Dote a ogni incontro: ${confidente.nome}`} onChiudi={() => setAperta(false)} azioni={(
          <div className="flex flex-wrap justify-end gap-1.5 w-full">
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={() => setAperta(false)} />
            <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva" disabled={occupato} onClick={() => void salva()} />
          </div>
        )}>
          <p className="m-0 text-[12px] text-text-muted">Per ogni rango, le Doti che il gioco dà a un incontro verso quel rango. Vale dai prossimi incontri: le Doti delle partite non cambiano (le segni tu).</p>
          <ul className="m-0 p-0 list-none flex flex-col gap-3">
            {bozza.map((r) => (
              <li key={r.rango} className="flex flex-col gap-2 rounded border border-border p-2" aria-label={`Rango ${r.rango}`}>
                <strong className="text-[13px]">Verso il rango {r.rango}</strong>
                {r.doti.length === 0 && <span className="text-[12px] text-text-muted">Nessuna Dote.</span>}
                {r.doti.map((d, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-0"><RigaDote etichetta={`Dote ${i + 1} del rango ${r.rango}`} dote={d} onCambia={(nuova) => cambiaRango(r.rango, r.doti.map((x, j) => (j === i ? nuova : x)))} /></div>
                    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli la Dote ${i + 1} del rango ${r.rango}`} onClick={() => cambiaRango(r.rango, r.doti.filter((_, j) => j !== i))} />
                  </div>
                ))}
                {r.doti.length < 5 && (
                  <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una Dote" aria-label={`Aggiungi una Dote al rango ${r.rango}`}
                    onClick={() => cambiaRango(r.rango, [...r.doti, { dote: 'fascino', note: 2 }])} />
                )}
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </section>
  );
}
