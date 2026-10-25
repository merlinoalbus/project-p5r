// ============================================================
// DialogoConferma — la domanda «sei sicuro?» dell'app, al posto di `window.confirm` (lotto B, punto 8)
// ============================================================
//
// Sopra `Modal`, che tiene il fuoco dentro la finestra, chiude con Esc e ridà il fuoco a chi l'ha aperta. Titolo (una domanda),
// testo (che cosa succede), «Annulla» e il pulsante dell'azione: col tono «pericolo» per ciò che non si torna indietro. Il fuoco
// iniziale va su «Annulla», così un Invio di troppo non elimina niente; Esc e la X valgono «Annulla».
//
// Due modi d'uso:
// - `conferma({ titolo, testo, etichetta })` (stores/confermaStore) → Promise<boolean>, con `HostConferma` montato una volta in
//   `MainLayout`: è il sostituto diretto di `if (!window.confirm(...)) return;`;
// - `<DialogoConferma aperta … />` controllato, per chi tiene da sé lo stato della domanda.
// ============================================================

import { useEffect, useId } from 'react';
import { Modal } from './Modal';
import { PulsanteVisivo } from './PulsanteVisivo';
import { IconaAzione } from './IconaAzione';
import { useConfermaStore, type OpzioniConferma } from '../../stores/confermaStore';

interface Props extends OpzioniConferma {
  aperta: boolean;
  onConferma: () => void;
  onAnnulla: () => void;
}

/** Finestra di conferma controllata: «Annulla» (fuoco iniziale) e il pulsante dell'azione, rosso col tono pericolo. */
export function DialogoConferma({ aperta, titolo, testo, etichetta, tono = 'pericolo', icona, onConferma, onAnnulla }: Props) {
  const idTesto = useId();
  const chiaveIcona = icona ?? (tono === 'pericolo' ? 'elimina' : 'accettata');
  return (
    <Modal
      titolo={titolo}
      aperta={aperta}
      onChiudi={onAnnulla}
      ruolo="alertdialog"
      idDescrizione={idTesto}
      azioni={(
        <>
          {/* autoFocus: Modal lascia il fuoco dove l'ha messo il montaggio, quindi parte da qui e non dal pulsante che conferma */}
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={onAnnulla} autoFocus />
          <PulsanteVisivo tono={tono === 'pericolo' ? 'pericolo' : 'primario'} compatto icona={<IconaAzione chiave={chiaveIcona} dimensione={20} />} titolo={etichetta} onClick={onConferma} />
        </>
      )}
    >
      <p id={idTesto} className="m-0 testo-14 leading-normal">{testo}</p>
    </Modal>
  );
}

/** La finestra delle domande fatte con `conferma()`: va montata una sola volta, in `MainLayout`. */
export function HostConferma() {
  const richiesta = useConfermaStore((s) => s.richiesta);
  const rispondi = useConfermaStore((s) => s.rispondi);
  const registraHost = useConfermaStore((s) => s.registraHost);
  useEffect(() => registraHost(), [registraHost]);
  if (!richiesta) return null;
  return (
    <DialogoConferma
      // una domanda nuova è una finestra nuova: il fuoco riparte da «Annulla»
      key={richiesta.id}
      aperta
      titolo={richiesta.titolo}
      testo={richiesta.testo}
      etichetta={richiesta.etichetta}
      tono={richiesta.tono}
      icona={richiesta.icona}
      onConferma={() => rispondi(true)}
      onAnnulla={() => rispondi(false)}
    />
  );
}
