// ============================================================
// FinestraDaVerificare — un pin fatto con la sua voce non fatta, da prima dell'aggiornamento: i due gesti che lo sistemano (L4, §4.1)
// ============================================================
//
// La migrazione utente 022 ha conservato le divergenze che c'erano (decisione dell'utente: niente segnato al suo posto): il pin risulta
// fatto, una sua voce no. La finestra lo dice senza gergo e offre i due gesti che le chiudono (R4-14b): **«Segna la voce»** (la voce
// diventa fatta) o **«Togli il fatto al pin»** (il pin torna da fare, la voce resta com'è). La stessa finestra si apre dalla voce
// (guida dell'infiltrazione), dal pin (visore) e dalla sezione «Da verificare» della scheda del Palazzo.
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { impostaStatoPunto, togliFattoAlPin } from '../../services/api';
import { notifica } from '../../stores/notificationStore';

/** Quel che serve della divergenza: il pin (nome, uid, planimetria) e la voce (chiave, nome, infiltrazione). */
export interface DivergenzaDaVerificare {
  spilloUid: string;
  spilloNome: string;
  mappaNome?: string | null;
  voce: string;
  voceNome: string;
  infiltrazioneNome?: string | null;
}

interface Props {
  divergenza: DivergenzaDaVerificare;
  partitaId: number;
  onChiudi: () => void;
  /** Dopo uno dei due gesti: chi l'ha aperta rilegge (la scheda, la mappa). */
  onRisolta: () => Promise<void> | void;
}

/** Il testo che spiega la divergenza, lo stesso nella finestra e nella conferma del tocco diretto sul pin (§8.5). */
export const SPIEGAZIONE_DA_VERIFICARE = 'Il pin risulta fatto ma la voce no: era così prima dell’aggiornamento.';

/** La finestra «Da verificare» con «Segna la voce» e «Togli il fatto al pin». */
export function FinestraDaVerificare({ divergenza: d, partitaId, onChiudi, onRisolta }: Props) {
  const [occupato, setOccupato] = useState(false);
  const esegui = async (gesto: () => Promise<unknown>, ok: string) => {
    setOccupato(true);
    try {
      await gesto();
      notifica('success', ok);
      await onRisolta();
      onChiudi();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Non riuscito.');
    } finally {
      setOccupato(false);
    }
  };
  return (
    <Modal titolo="Da verificare" aperta onChiudi={onChiudi}
      azioni={<>
        <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={() => void esegui(() => togliFattoAlPin(partitaId, d.spilloUid), `«${d.spilloNome}» torna da fare.`)}>Togli il fatto al pin</button>
        <button type="button" className="btn btn-primary touch" disabled={occupato} onClick={() => void esegui(() => impostaStatoPunto(partitaId, d.voce, 'ottenuto'), `«${d.voceNome}» segnata.`)}>Segna la voce</button>
      </>}>
      <div className="flex flex-col gap-2 text-[14px]">
        <p className="m-0">{SPIEGAZIONE_DA_VERIFICARE}</p>
        <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">
          <dt className="text-text-muted">Pin</dt>
          <dd className="m-0 break-words">{d.spilloNome}{d.mappaNome ? <span className="text-text-muted"> · {d.mappaNome}</span> : null} <span className="chip chip--oro text-[11px]">fatto</span></dd>
          <dt className="text-text-muted">Voce</dt>
          <dd className="m-0 break-words">{d.voceNome}{d.infiltrazioneNome ? <span className="text-text-muted"> · {d.infiltrazioneNome}</span> : null} <span className="chip text-[11px]">non fatta</span></dd>
        </dl>
        <p className="m-0 text-[13px] text-text-secondary">«Segna la voce» la rende fatta; «Togli il fatto al pin» rimette il pin da fare e lascia la voce com’è.</p>
      </div>
    </Modal>
  );
}
