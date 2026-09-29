// ============================================================
// SchedaAreaGuida — un'area della guida senza planimetria: collegarla o eliminarla
// ============================================================
//
// Le aree che la guida racconta ma di cui non si sa ancora quale tavola siano stanno in coda all'elenco
// del Palazzo. Da qui si collegano a una planimetria (anche a una che contiene già altre aree: si
// aggiunge) oppure **si eliminano davvero** (scelta dell'utente, 2026-09-30): se ne vanno i suoi punti
// della guida e quel che le partite ne avevano segnato. La conferma sta nel piè della finestra, sempre in vista.
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { notifica } from '../../stores/notificationStore';
import { SOGLIA_RICERCA } from '../../utils/selettore';
import { corrispondeRicerca } from '../../../shared/testo';

interface Props {
  area: { chiave: string; nome: string; ordine: number; descrizione: string };
  /** Quanti punti della guida ha: la conferma dice che cosa si perde. */
  punti: number;
  /** Le planimetrie del Palazzo, già con il nome e quel che contengono. */
  tavole: Array<{ chiave: string; nome: string; dettaglio?: string }>;
  onCollega: (planimetria: string) => Promise<void>;
  onElimina: () => Promise<void>;
  onChiudi: () => void;
}

export function SchedaAreaGuida({ area, punti, tavole, onCollega, onElimina, onChiudi }: Props) {
  const [conferma, setConferma] = useState(false);
  const [occupato, setOccupato] = useState(false);
  const [cerca, setCerca] = useState('');
  const visibili = tavole.filter((t) => corrispondeRicerca(cerca, t.nome, t.dettaglio));
  const esegui = async (azione: () => Promise<void>) => {
    setOccupato(true);
    try { await azione(); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.'); } finally { setOccupato(false); }
  };

  return (
    // la conferma sta nel piè della finestra, sempre in vista (come nella scheda della planimetria)
    <Modal titolo={`${area.ordine + 1}. ${area.nome}`} aperta onChiudi={onChiudi}
      azioni={conferma
        ? <div role="alertdialog" aria-label="Conferma eliminazione" className="flex w-full flex-col gap-2 rounded-md border border-primary bg-primary-bg p-2.5">
            <p className="m-0 text-[13px]">
              Elimino l’area «{area.nome}» dalla guida, per tutte le partite?
              {punti > 0 ? ` Se ne vanno anche i suoi ${punti} punti della guida e quel che le partite ne avevano segnato.` : ''}
              {' '}Le aree che la seguono salgono di un posto. Un pacchetto di gioco importato dopo la rimette.
            </p>
            <div className="flex flex-wrap justify-end gap-1.5">
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Non eliminare" onClick={() => setConferma(false)} />
              <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina l’area" disabled={occupato} onClick={() => void esegui(onElimina)} />
            </div>
          </div>
        : <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Chiudi" onClick={onChiudi} />}>
      <p className="m-0 text-[13px] text-text-secondary">
        Area della guida senza planimetria{area.descrizione ? `: ${area.descrizione}` : '.'}
      </p>
      {/* Le planimetrie stanno nella finestra, non in una tendina: dentro il corpo che scorre una tendina
          si apriva oltre il bordo e restava tagliata (verifica nel browser a 1366×657, 2026-09-30). */}
      {tavole.length > 0
        ? <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1 p-0 text-[12px]">Collega a una planimetria</legend>
            <span className="text-[11px] text-text-muted">Tocca la planimetria che la contiene: l’area si aggiunge alle sue.</span>
            {tavole.length >= SOGLIA_RICERCA && (
              <input className="form-input" type="search" value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca una planimetria…" aria-label="Cerca una planimetria" autoComplete="off" />
            )}
            <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label="Planimetrie a cui collegarla">
              {visibili.map((t) => (
                <li key={t.chiave}>
                  <button type="button" className="touch flex w-full flex-col rounded-md border border-border-light px-2.5 py-1.5 text-left hover:border-primary disabled:opacity-50" disabled={occupato || conferma}
                    onClick={() => void esegui(() => onCollega(t.chiave))}>
                    <span className="text-[13px] font-semibold leading-tight">{t.nome}</span>
                    {t.dettaglio && <span className="text-[11px] leading-tight text-text-muted">{t.dettaglio}</span>}
                  </button>
                </li>
              ))}
              {visibili.length === 0 && <li className="text-[12px] text-text-muted">Nessuna planimetria corrisponde.</li>}
            </ul>
          </fieldset>
        : <p className="m-0 text-[12px] text-text-muted">Il Palazzo non ha ancora planimetrie: aggiungine una con «Aggiungi».</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-light pt-3">
        <span className="text-[12px] text-text-muted">Toglie l’area dalla guida, con i suoi punti.</span>
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina…" disabled={occupato || conferma} onClick={() => setConferma(true)} />
      </div>
    </Modal>
  );
}
