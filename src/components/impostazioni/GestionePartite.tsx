// ============================================================
// GestionePartite — elenco partite: attiva, crea, elimina
// ============================================================

import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePartitaStore } from '../../stores/partitaStore';
import { notifica } from '../../stores/notificationStore';
import { NuovaPartitaModal } from '../partita/NuovaPartitaModal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione, IconaScheda } from '../shared/IconaAzione';
import { conferma } from '../../stores/confermaStore';

/** Gestione delle partite multiple. */
export function GestionePartite() {
  const { partite, rendiAttiva, elimina } = usePartitaStore(useShallow((s) => ({ partite: s.partite, rendiAttiva: s.rendiAttiva, elimina: s.elimina })));
  const [nuova, setNuova] = useState(false);
  const [occupato, setOccupato] = useState<number | null>(null);

  /** Rende attiva la partita indicata; durante l'operazione disabilita i pulsanti della sua riga. */
  const attiva = async (id: number) => {
    setOccupato(id);
    try {
      await rendiAttiva(id);
      notifica('success', 'Partita attivata.');
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Operazione fallita.');
    } finally {
      setOccupato(null);
    }
  };

  /** Elimina la partita dopo la conferma (DialogoConferma: l'eliminazione porta via tutto il suo stato e non è reversibile). */
  const rimuovi = async (id: number, nome: string) => {
    if (!(await conferma({ titolo: 'Eliminare la partita?', testo: `La partita «${nome}» se ne va con tutto il suo stato (Doti, Confidenti, scorta, compendio). L'operazione non è reversibile.`, etichetta: 'Elimina la partita' }))) return;
    setOccupato(id);
    try {
      await elimina(id);
      notifica('info', `Partita «${nome}» eliminata.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Eliminazione fallita.');
    } finally {
      setOccupato(null);
    }
  };

  return (
    <section className="card flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 testo-15 font-semibold">Partite</h2>
        <PulsanteVisivo tono="primario" compatto icona={<IconaScheda chiave="nuova-partita" dimensione={20} />} titolo="Nuova partita" onClick={() => setNuova(true)} />
      </div>
      {partite.length === 0 ? (
        <p className="m-0 testo-13 text-text-muted">Nessuna partita ancora.</p>
      ) : (
        <ul className="m-0 p-0 list-none divide-y divide-border-light">
          {partite.map((p) => (
            <li key={p.id} className="flex items-center gap-2 py-2 flex-wrap">
              <span className="font-semibold">{p.nome}</span>
              <span className="chip">Liv. {p.livelloProtagonista}</span>
              <span className="testo-12 text-text-muted">{p.difficolta}{p.nuovaPartitaPlus ? ' · NG+' : ''}</span>
              <span className="flex-1" />
              {p.attiva ? <span className="chip chip--attivo">Attiva</span> : <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="attiva" dimensione={20} />} titolo="Rendi attiva" disabled={occupato === p.id} onClick={() => void attiva(p.id)} />}
              <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" disabled={occupato === p.id} onClick={() => void rimuovi(p.id, p.nome)} />
            </li>
          ))}
        </ul>
      )}
      <NuovaPartitaModal aperta={nuova} onChiudi={() => setNuova(false)} />
    </section>
  );
}
