// ============================================================
// PartitaSelettore — cambio rapido della partita attiva dalla barra superiore
// ============================================================

import { useNavigate } from 'react-router-dom';
import { usePartitaStore } from '../../stores/partitaStore';
import { notifica } from '../../stores/notificationStore';

/** Menu a tendina con le partite; "Nuova partita…" porta alle impostazioni. */
export function PartitaSelettore() {
  const { partite, attiva, rendiAttiva } = usePartitaStore();
  const navigate = useNavigate();

  const cambia = async (valore: string) => {
    if (valore === '__nuova') {
      navigate('/impostazioni');
      return;
    }
    const id = Number(valore);
    if (!id || id === attiva?.id) return;
    try {
      await rendiAttiva(id);
      notifica('success', 'Partita attiva cambiata.');
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Operazione fallita.');
    }
  };

  return (
    <select
      className="form-input w-auto max-w-[180px] sm:max-w-[240px] min-h-[40px] py-1 text-[13px]"
      value={attiva?.id ?? ''}
      onChange={(e) => void cambia(e.target.value)}
      aria-label="Partita attiva"
    >
      {partite.length === 0 && <option value="">Nessuna partita</option>}
      {partite.map((p) => (
        <option key={p.id} value={p.id}>{p.nome} · Liv. {p.livelloProtagonista}</option>
      ))}
      <option value="__nuova">Nuova partita…</option>
    </select>
  );
}
