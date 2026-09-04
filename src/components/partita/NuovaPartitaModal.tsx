// ============================================================
// NuovaPartitaModal — creazione di una partita (diventa attiva)
// ============================================================

import { useState } from 'react';
import { usePartitaStore } from '../../stores/partitaStore';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import type { Difficolta } from '../../types';

interface Props {
  aperta: boolean;
  onChiudi: () => void;
}

/** Modale con nome, difficoltà e NG+; la nuova partita viene resa attiva. */
export function NuovaPartitaModal({ aperta, onChiudi }: Props) {
  const crea = usePartitaStore((s) => s.crea);
  const [nome, setNome] = useState('');
  const [difficolta, setDifficolta] = useState<Difficolta>('normale');
  const [ngPlus, setNgPlus] = useState(false);
  const [occupato, setOccupato] = useState(false);

  const conferma = async () => {
    if (!nome.trim()) return;
    setOccupato(true);
    try {
      await crea({ nome: nome.trim(), difficolta, nuovaPartitaPlus: ngPlus });
      notifica('success', `Partita «${nome.trim()}» creata e attivata.`);
      setNome('');
      onChiudi();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Creazione fallita.');
    } finally {
      setOccupato(false);
    }
  };

  return (
    <Modal
      titolo="Nuova partita"
      aperta={aperta}
      onChiudi={onChiudi}
      azioni={
        <>
          <button type="button" className="btn btn-secondary" onClick={onChiudi}>Annulla</button>
          <button type="button" className="btn btn-primary" disabled={occupato || !nome.trim()} onClick={() => void conferma()}>Crea</button>
        </>
      }
    >
      <label className="form-label">Nome
        <input className="form-input mt-1" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Prima partita" autoFocus maxLength={80} />
      </label>
      <label className="form-label">Difficoltà
        <select className="form-input mt-1" value={difficolta} onChange={(e) => setDifficolta(e.target.value as Difficolta)}>
          <option value="sicura">Sicura</option>
          <option value="facile">Facile</option>
          <option value="normale">Normale</option>
          <option value="difficile">Difficile</option>
          <option value="spietata">Spietata</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-[13px] touch">
        <input type="checkbox" checked={ngPlus} onChange={(e) => setNgPlus(e.target.checked)} /> Nuova Partita +
      </label>
    </Modal>
  );
}
