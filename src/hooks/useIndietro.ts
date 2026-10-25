// ============================================================
// useIndietro — il ritorno delle schede di dettaglio: la pagina di prima dell'app o, entrando da fuori, una rotta di ripiego (lotto B)
// ============================================================
//
// `navigate(-1)` riporta dove si era (filtri, scorrimento, il diario da cui si è aperta la scheda), ma se la scheda è la prima pagina
// dell'app in questa scheda del browser — un collegamento diretto, un segnalibro, una scheda nuova — uscirebbe dall'app. Lo dice
// `history.state.idx`, che il router del browser di React Router scrive a ogni voce: 0 sulla prima. In quel caso si va alla rotta di
// ripiego (l'elenco a cui la scheda appartiene) sostituendo la voce, così «Indietro» del browser non rientra nella scheda.
// ============================================================

import { useNavigate } from 'react-router-dom';

/** Vero se la pagina corrente non è la prima della cronologia dell'app in questa scheda del browser (c'è una pagina dell'app a cui tornare). */
export function ceUnaPaginaPrima(): boolean {
  const stato: unknown = typeof window === 'undefined' ? null : window.history.state;
  const idx = stato && typeof stato === 'object' && 'idx' in stato ? Number((stato as { idx: unknown }).idx) : 0;
  return Number.isFinite(idx) && idx > 0;
}

/** La funzione del ritorno: la pagina di prima dell'app o, se la scheda è entrata da fuori, la rotta di ripiego (sostituendo la voce). */
export function useIndietro(ripiego: string): () => void {
  const navigate = useNavigate();
  return () => {
    if (ceUnaPaginaPrima()) void navigate(-1);
    else void navigate(ripiego, { replace: true });
  };
}
