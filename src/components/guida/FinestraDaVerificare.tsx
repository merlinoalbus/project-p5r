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
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

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
        <PulsanteVisivo icona={<IconaAzione chiave="elimina" dimensione={22} />} titolo="Togli il fatto al pin" disabled={occupato} onClick={() => void esegui(() => togliFattoAlPin(partitaId, d.spilloUid), `«${d.spilloNome}» torna da fare.`)} />
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="raggiunto" dimensione={22} />} titolo="Segna la voce" disabled={occupato} onClick={() => void esegui(() => impostaStatoPunto(partitaId, d.voce, 'ottenuto'), `«${d.voceNome}» segnata.`)} />
      </>}>
      <div className="flex flex-col gap-2 testo-14">
        <p className="m-0">{SPIEGAZIONE_DA_VERIFICARE}</p>
        <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 testo-13">
          <dt className="text-text-muted">Pin</dt>
          <dd className="m-0 break-words">{d.spilloNome}{d.mappaNome ? <span className="text-text-muted"> · {d.mappaNome}</span> : null} <span className="chip chip--oro testo-12">fatto</span></dd>
          <dt className="text-text-muted">Voce</dt>
          <dd className="m-0 break-words">{d.voceNome}{d.infiltrazioneNome ? <span className="text-text-muted"> · {d.infiltrazioneNome}</span> : null} <span className="chip testo-12">non fatta</span></dd>
        </dl>
        <p className="m-0 testo-13 text-text-secondary">«Segna la voce» la rende fatta; «Togli il fatto al pin» rimette il pin da fare e lascia la voce com’è.</p>
      </div>
    </Modal>
  );
}
