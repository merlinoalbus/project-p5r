// ============================================================
// CorreggiRequisito — correggere un requisito di un Confidente rimasto su una Richiesta che non c'è più (2026-10-11)
// ============================================================
//
// Eliminata una Richiesta, i requisiti dei Confidenti che la citavano restano «da correggere» (scelta dell'utente: «Si elimina e
// si avvisa»). Senza un modo di correggerli il rango restava bloccato per sempre (rilievo del validatore); l'utente ha scelto
// «Requisito correggibile»: dalla finestra si sceglie un'altra Richiesta al suo posto, oppure si toglie il requisito. Vale per
// tutte le partite: i requisiti sono dati di gioco.
// ============================================================

import { useState } from 'react';
import { correggiRequisitoRichiesta, getRichieste, togliRequisitoRichiesta } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import { PageState } from '../shared/PageState';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import type { SemaforoRequisitoDto } from '../../types';

interface Props {
  confidente: { chiave: string; nome: string };
  rango: number;
  requisito: SemaforoRequisitoDto;
  onChiudi: () => void;
  /** Corretto o tolto: chi apre la finestra rilegge i requisiti. */
  onCorretto: () => void | Promise<void>;
}

/** La finestra: il requisito com'è, la Richiesta da citare al suo posto, «Salva» e «Togli il requisito» (con conferma). */
export function CorreggiRequisito({ confidente, rango, requisito, onChiudi, onCorretto }: Props) {
  const richieste = useCarica(() => getRichieste(), []);
  const [scelta, setScelta] = useState('');
  const [togliere, setTogliere] = useState(false);
  const [occupato, setOccupato] = useState(false);
  /** Esegue la correzione o la rimozione; a buon fine notifica, avvisa chi ha aperto e chiude. */
  const esegui = async (fai: () => Promise<void>, fatto: string) => {
    setOccupato(true);
    try { await fai(); notifica('success', fatto); await onCorretto(); onChiudi(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Requisito non corretto.'); }
    finally { setOccupato(false); }
  };
  return (
    <Modal titolo={`Correggi il requisito · ${confidente.nome}, rango ${rango}`} aperta onChiudi={onChiudi}>
      <PageState isLoading={richieste.caricamento && !richieste.dati} error={richieste.errore} onRetry={() => void richieste.ricarica()}>
        {richieste.dati && (
          <div className="flex flex-col gap-3 text-[13px]">
            <p className="m-0">{requisito.testo}</p>
            <p className="m-0 text-[12px] text-text-muted">{requisito.dettaglio}</p>
            {/* in linea: in una finestra così breve la tendina sovrapposta restava tagliata dal corpo scorrevole */}
            <Selettore className="selettore--in-linea" etichetta="Richiesta da citare al suo posto" valore={scelta} vuoto="— scegli —"
              opzioni={richieste.dati.richieste.map((r) => ({ chiave: r.chiave, nome: r.nome, dettaglio: r.areaNome ?? undefined }))} onCambia={setScelta} />
            <div className="flex flex-wrap items-center gap-1.5">
              <PulsanteVisivo type="button" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva" disabled={occupato || !scelta}
                onClick={() => void esegui(() => correggiRequisitoRichiesta(confidente.chiave, rango, requisito.indice, scelta), 'Requisito corretto: cita la Richiesta scelta.')} />
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={onChiudi} />
              <span className="flex-1" />
              {!togliere && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli il requisito" disabled={occupato} onClick={() => setTogliere(true)} />}
            </div>
            {togliere && (
              <section className="flex flex-col gap-1.5 rounded-md border border-primary/40 px-2.5 py-2 text-[12px]" aria-label="Conferma: togliere il requisito">
                <span>Il requisito se ne va per tutte le partite, con le conferme a mano che ne avevano: il rango {rango} di {confidente.nome} non lo chiederà più.</span>
                <div className="flex flex-wrap gap-1.5">
                  <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Confermo" disabled={occupato}
                    onClick={() => void esegui(() => togliRequisitoRichiesta(confidente.chiave, rango, requisito.indice), 'Requisito tolto.')} />
                  <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="No" disabled={occupato} onClick={() => setTogliere(false)} />
                </div>
              </section>
            )}
          </div>
        )}
      </PageState>
    </Modal>
  );
}
