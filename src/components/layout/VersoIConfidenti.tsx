// ============================================================
// VersoIConfidenti — la destinazione unica di «Confidenti» (L4-05)
// ============================================================
//
// L'indice della Guida e il pin Confidente non ancora collegato portano entrambi a `/confidenti`: con una partita attiva l'elenco dei
// Confidenti della partita (rango, risposte, regali), senza i Personaggi, che aprono la scheda di ogni Confidente (R9-09/3). Finché
// l'elenco delle partite non è arrivato non si sceglie: si manderebbe ai Personaggi chi una partita ce l'ha.
// ============================================================

import { Navigate } from 'react-router-dom';
import { usePartitaStore } from '../../stores/partitaStore';

export function VersoIConfidenti() {
  const caricata = usePartitaStore((s) => s.caricata);
  const conPartita = usePartitaStore((s) => s.attiva !== null);
  if (!caricata) return null;
  return <Navigate to={conPartita ? '/partita?scheda=confidenti' : '/guida/personaggi'} replace />;
}
