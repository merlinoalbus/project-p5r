// ============================================================
// DotiIncontro — la Dote che un Confidente dà al passaggio di rango, rango per rango, e la finestra per cambiarla
// ============================================================
//
// Scelta dell'utente (2026-09-30): la Dote di un incontro (Takemi il Coraggio, Yoshida il Fascino…) arrivava da ogni incontro
// registrato, e il dato si corregge qui («al dato finale ci penso io»). Dal 2026-10-17 (scelta dell'utente: «Solo al passaggio
// di rango», dopo un'uscita con Sojiro che dava solo punti e ricordava Gentilezza +3) l'app la ricorda solo quando si passa al
// rango: con la spunta dell'azione del passaggio o alzando il rango in Partita → Confidenti. Le Doti le segna l'utente a mano.
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { RigaDote } from '../guida/RigaDote';
import { impostaDotiIncontro, isApiError, ripristinaDoteIncontro } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import type { DoteNote } from '../../../shared/effettiAzione';
import type { ConfidenteDettaglioDto } from '../../types';

interface Props {
  confidente: ConfidenteDettaglioDto;
  /** Il rango della partita attiva: il prossimo incontro vale verso il successivo (evidenziato). */
  rangoPartita: number | null;
  onSalvato: () => void | Promise<void>;
}

/** Riquadro della scheda di un Confidente: elenca, rango per rango, le Doti date al passaggio a quel rango
 * (evidenziando il prossimo rango della partita) e apre una finestra
 * in cui modificarle su una bozza — fino a cinque per rango — da salvare tutta insieme. */
export function DotiIncontro({ confidente, rangoPartita, onSalvato }: Props) {
  const [aperta, setAperta] = useState(false);
  const [bozza, setBozza] = useState<Array<{ rango: number; doti: DoteNote[] }>>([]);
  // la bozza com'era all'apertura: finestra aperta con Doti cambiate e non salvate = bozza sporca (per «Aggiorna» e la chiusura della scheda del browser)
  const [partenza, setPartenza] = useState('');
  useBozzaSporca('doti-incontro', `Doti al passaggio di rango di ${confidente.nome}`, aperta && JSON.stringify(bozza) !== partenza);
  const [occupato, setOccupato] = useState(false);
  const verso = rangoPartita === null ? null : Math.min(10, rangoPartita + 1);
  const conDoti = confidente.dotiIncontro.filter((r) => r.doti.length > 0);

  /** Apre la finestra con una bozza copiata dai dati del Confidente, così le modifiche non toccano l'originale finché non si salva. */
  const apri = () => {
    const copia = confidente.dotiIncontro.map((r) => ({ rango: r.rango, doti: r.doti.map((d) => ({ ...d })) }));
    setBozza(copia); setPartenza(JSON.stringify(copia)); setAperta(true);
  };
  /** Sostituisce nella bozza le Doti di un rango. */
  const cambiaRango = (rango: number, doti: DoteNote[]) => setBozza((b) => b.map((r) => (r.rango === rango ? { ...r, doti } : r)));
  /** Salva l'intera bozza, avvisa `onSalvato` e chiude la finestra; in caso di errore la finestra resta aperta. */
  const salva = async () => {
    setOccupato(true);
    try {
      await impostaDotiIncontro(confidente.chiave, bozza);
      await onSalvato();
      notifica('success', 'Dote al passaggio di rango aggiornata: vale dai prossimi passaggi.');
      setAperta(false);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.');
    } finally {
      setOccupato(false);
    }
  };

  /** «Ripristina» un passaggio: la Dote torna com'era nella guida. Il server risponde 409 se quel passaggio non è mai stato cambiato (la scheda non lo dice prima). */
  const ripristina = async (rango: number) => {
    if (occupato) return;
    if (JSON.stringify(bozza) !== partenza && !window.confirm('Ci sono modifiche non salvate: ripristinando perdi anche quelle. Continuare?')) return;
    setOccupato(true);
    try {
      await ripristinaDoteIncontro(confidente.chiave, rango);
      await onSalvato();
      notifica('success', `Dote del passaggio al rango ${rango} ripristinata come nella guida.`);
      setAperta(false);
    } catch (err) {
      if (isApiError(err, 'dote-della-guida')) notifica('info', `Il passaggio al rango ${rango} non è stato modificato: è già come nella guida.`);
      else notifica('error', err instanceof Error ? err.message : 'Ripristino non riuscito.');
    } finally {
      setOccupato(false);
    }
  };

  return (
    <section className="card flex flex-col gap-2" aria-labelledby="doti-incontro">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="doti-incontro" className="m-0 text-[15px] font-semibold">Dote al passaggio di rango</h2>
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" onClick={apri} disabled={confidente.dotiIncontro.length === 0} />
      </div>
      <p className="m-0 text-[12px] text-text-muted">
        Il gioco dà queste Doti quando si passa al rango indicato: l'app te le ricorda quando registri il passaggio — spuntando nella giornata
        l'azione del passaggio o alzando il rango in Partita → Confidenti —, una volta sola, e le segni tu nella scheda Doti. Un'uscita che dà
        solo punti non le ricorda.
      </p>
      {conDoti.length === 0 ? <p className="m-0 text-[13px] text-text-muted">Nessuna Dote dichiarata.</p> : (
        <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light">
          {conDoti.map((r) => (
            <li key={r.rango} className="py-1.5 flex gap-3 items-center text-[13px]">
              <span className={`chip shrink-0 ${verso === r.rango ? 'chip--oro' : ''}`} title={verso === r.rango ? 'Il prossimo passaggio di rango nella partita è a questo rango' : undefined}>rango {r.rango}</span>
              <span>{r.testo}</span>
            </li>
          ))}
        </ul>
      )}
      {aperta && (
        <Modal aperta larga titolo={`Dote al passaggio di rango: ${confidente.nome}`} onChiudi={() => setAperta(false)} azioni={(
          <div className="flex flex-wrap justify-end gap-1.5 w-full">
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={() => setAperta(false)} />
            <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva" disabled={occupato} onClick={() => void salva()} />
          </div>
        )}>
          <p className="m-0 text-[12px] text-text-muted">Per ogni rango, le Doti che il gioco dà quando si passa a quel rango. Vale dai prossimi passaggi: le Doti delle partite non cambiano (le segni tu).</p>
          <ul className="m-0 p-0 list-none flex flex-col gap-3">
            {bozza.map((r) => (
              <li key={r.rango} className="flex flex-col gap-2 rounded border border-border p-2" aria-label={`Rango ${r.rango}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-[13px]">Al passaggio al rango {r.rango}</strong>
                  <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Ripristina" aria-label={`Ripristina la Dote del rango ${r.rango} come nella guida`} disabled={occupato} onClick={() => void ripristina(r.rango)} />
                </div>
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
