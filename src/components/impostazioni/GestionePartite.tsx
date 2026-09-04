// ============================================================
// GestionePartite — elenco partite: attiva, crea, elimina
// ============================================================

import { useState } from 'react';
import { usePartitaStore } from '../../stores/partitaStore';
import { notifica } from '../../stores/notificationStore';
import { NuovaPartitaModal } from '../partita/NuovaPartitaModal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

/** Gestione delle partite multiple. */
export function GestionePartite() {
  const { partite, rendiAttiva, elimina } = usePartitaStore();
  const [nuova, setNuova] = useState(false);
  const [occupato, setOccupato] = useState<number | null>(null);

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

  const rimuovi = async (id: number, nome: string) => {
    if (!window.confirm(`Eliminare la partita «${nome}» con tutto il suo stato (Doti, Confidenti, scorta, compendio)? L'operazione non è reversibile.`)) return;
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
        <h2 className="m-0 text-[15px] font-semibold">Partite</h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setNuova(true)}>+ Nuova partita</button>
      </div>
      {partite.length === 0 ? (
        <p className="m-0 text-[13px] text-text-muted">Nessuna partita ancora.</p>
      ) : (
        <ul className="m-0 p-0 list-none divide-y divide-border-light">
          {partite.map((p) => (
            <li key={p.id} className="flex items-center gap-2 py-2 flex-wrap">
              <span className="font-semibold">{p.nome}</span>
              <span className="chip">Liv. {p.livelloProtagonista}</span>
              <span className="text-[12px] text-text-muted">{p.difficolta}{p.nuovaPartitaPlus ? ' · NG+' : ''}</span>
              <span className="flex-1" />
              {p.attiva ? <span className="chip chip--attivo">Attiva</span> : <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="attiva" dimensione={20} />} titolo="Rendi attiva" disabled={occupato === p.id} onClick={() => void attiva(p.id)} />}
              <button type="button" className="btn btn-danger btn-sm" disabled={occupato === p.id} onClick={() => void rimuovi(p.id, p.nome)}>Elimina</button>
            </li>
          ))}
        </ul>
      )}
      <NuovaPartitaModal aperta={nuova} onChiudi={() => setNuova(false)} />
    </section>
  );
}
