// ============================================================
// PropostaDallaVoce — la scheda del Palazzo aperta dalla proposta di una voce del diario (L3, §4.4, UX3-1; decisione del PM, 2026-10-20)
// ============================================================
//
// Una voce di Palazzo senza infiltrazioni scelte ma con una proposta porta alla prima infiltrazione della proposta (`?daVoce=<uid>`).
// Se la proposta non è «certa» (multipla o probabile) la scheda lo dice sopra il visore — «Aperta dalla proposta della voce del <data>:
// <infiltrazioni> (<certezza>)» — con «Conferma», che scrive l'insieme proposto come nel diario, e «Chiudi». Con la proposta certa, o
// con l'insieme già scelto, niente riga. Il parametro non cambia nient'altro: dopo «Conferma» o «Chiudi» la scheda lo toglie.
// ============================================================

import { useState } from 'react';
import { getVocePercorso, impostaInfiltrazioniVoce } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { dataGiocoConArticolo } from '../../utils/dateGioco';

interface Props {
  uid: string;
  partitaId: number | null;
  /** Toglie `daVoce` dall'indirizzo (con `replace`). */
  onChiudi: () => void;
  /** Dopo «Conferma»: la scheda rilegge (le infiltrazioni della voce sono cambiate) e toglie `daVoce`. */
  onConfermata: () => Promise<void> | void;
}

/** La riga «Aperta dalla proposta…» con «Conferma» e «Chiudi»; niente se la proposta è certa, se non c'è o se la voce non si legge. */
export function PropostaDallaVoce({ uid, partitaId, onChiudi, onConfermata }: Props) {
  const voce = useCarica(() => getVocePercorso(uid, partitaId ?? undefined), [uid, partitaId]);
  const [occupato, setOccupato] = useState(false);
  const v = voce.dati;
  const proposta = v?.propostaInfiltrazioni;
  if (!v || !proposta || proposta.certezza === 'certa' || (v.infiltrazioni?.length ?? 0) > 0 || proposta.infiltrazioni.length === 0) return null;
  const conferma = async () => {
    setOccupato(true);
    try {
      await impostaInfiltrazioniVoce(uid, proposta.infiltrazioni.map((i) => i.chiave), partitaId ?? undefined);
      notifica('success', 'Infiltrazioni della voce confermate.');
      await onConfermata();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Proposta non confermata.');
    } finally {
      setOccupato(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/50 bg-white/[0.04] px-2 py-1.5 text-[12px]" role="status">
      <span className="min-w-0 flex-1 basis-60">
        Aperta dalla proposta della voce {dataGiocoConArticolo(v.giorno, 'di')}: {proposta.infiltrazioni.map((i) => i.nome).join(', ')} ({proposta.certezza})
      </span>
      <span className="flex flex-wrap gap-1.5">
        <button type="button" className="btn btn-primary btn-sm touch" disabled={occupato} onClick={() => void conferma()}>Conferma</button>
        <button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato} onClick={onChiudi}>Chiudi</button>
      </span>
    </div>
  );
}
