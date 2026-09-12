// ============================================================
// PartitaSelettore — cambio rapido della partita attiva dalla barra superiore
// ============================================================

import { useNavigate } from 'react-router-dom';
import { Selettore } from '../shared/Selettore';
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
    <Selettore
      compatto
      className="min-w-0 shrink max-w-[150px] sm:max-w-[240px]"
      etichetta="Partita attiva"
      valore={attiva ? String(attiva.id) : ''}
      segnaposto="Nessuna partita"
      opzioni={[...partite.map((p) => ({ chiave: String(p.id), nome: p.nome, dettaglio: `Liv. ${p.livelloProtagonista}` })), { chiave: '__nuova', nome: 'Nuova partita…' }]}
      onCambia={(k) => void cambia(k)}
    />
  );
}
