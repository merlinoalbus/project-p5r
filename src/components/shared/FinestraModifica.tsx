// ============================================================
// FinestraModifica — la struttura unica delle finestre di modifica (L13, modelli comuni 5)
// ============================================================
//
// Titolo e «Chiudi» in testa (li dà `Modal`); al centro il corpo a sezioni (`SezioneCampi`: una colonna sotto 768 px, due da 768 in su)
// che è l'UNICO punto che scorre (`.modal-body`: niente riquadri che scorrono dentro la finestra, i testi lunghi si allungano da
// sé, vedi `CampoTesto`); in fondo il piè FISSO con le azioni, sempre in vista anche sul telefono: «Elimina» a sinistra e separato
// (tono pericolo), «Annulla» e «Salva» a destra. Prima quattro moduli (Richiesta, Persona, Nuova Area, Correzione della guida)
// mettevano Salva e Annulla in fondo al corpo, e sul telefono l'azione primaria usciva dallo schermo dopo quattro schermate.
//
// Invio in un campo salva (il corpo è un `<form>`); `sporca` chiede conferma prima di chiudere con modifiche non salvate (X, Esc o
// «Annulla»), come già facevano le finestre scritte a mano. L'eliminazione la decide chi usa il componente: `onElimina` parte al
// tocco (di solito apre `conferma()` con l'elenco di chi cita il dato).
// ============================================================

import type { FormEvent, ReactNode } from 'react';
import { CHIUDI_SENZA_SALVARE, conferma } from '../../stores/confermaStore';
import { Modal } from './Modal';
import { PulsanteVisivo } from './PulsanteVisivo';
import { IconaAzione } from './IconaAzione';

interface Props {
  titolo: string;
  onChiudi: () => void;
  /** Salva (crea o corregge); la finestra non si chiude da sé: chi salva chiama `onChiudi` a buon fine. */
  onSalva: () => void | Promise<void>;
  /** Testo del pulsante primario («Salva», «Aggiungi»). */
  titoloSalva?: string;
  /** Il modulo è salvabile (obbligatori compilati, valori nei limiti). Default sì. */
  salvabile?: boolean;
  /** Un salvataggio o un'eliminazione è in corso: i comandi sono spenti. */
  occupato?: boolean;
  /** Ci sono modifiche non salvate: chiudere chiede conferma. */
  sporca?: boolean;
  /** Se c'è, il piè mostra «Elimina» (pericolo) a sinistra. */
  onElimina?: () => void;
  titoloElimina?: string;
  /** Altri comandi del piè, a sinistra accanto a «Elimina» (per esempio «Ripristina»). */
  azioniExtra?: ReactNode;
  /** Finestra stretta (520 px) invece che larga (860 px): per i moduli con pochi campi. */
  stretta?: boolean;
  /** Un `aria-label` più preciso del titolo per il modulo (lettori di schermo). */
  nomeModulo?: string;
  /**
   * L13 (ondata 4a): i dati da modificare non sono ancora arrivati. La finestra è già QUESTA (stesso titolo, stesso piè, «Salva» spento) e
   * mostra «Un attimo…» al posto del corpo, o l'errore se la lettura non è riuscita: quando i dati arrivano cambia solo il corpo, la
   * finestra non si smonta e non si rimonta (prima un guscio di caricamento a parte spariva e ne nasceva un'altra, col fuoco perso).
   */
  caricamento?: boolean;
  erroreCaricamento?: string | null;
  children: ReactNode;
}

/** Una finestra di modifica: titolo, corpo a sezioni che scorre, piè fisso con Elimina / Annulla / Salva. */
export function FinestraModifica({ titolo, onChiudi, onSalva, titoloSalva = 'Salva', salvabile = true, occupato = false, sporca = false, onElimina, titoloElimina = 'Elimina', azioniExtra, stretta, nomeModulo, caricamento = false, erroreCaricamento = null, children }: Props) {
  const inAttesa = caricamento || !!erroreCaricamento;
  /** Chiude, chiedendo conferma se ci sono modifiche non salvate (non durante un salvataggio). */
  const chiudi = async () => {
    if (occupato) return;
    if (sporca && !(await conferma(CHIUDI_SENZA_SALVARE))) return;
    onChiudi();
  };
  /** Invio in un campo: salva, se si può. */
  const invia = (e: FormEvent) => { e.preventDefault(); if (salvabile && !occupato && !inAttesa) void onSalva(); };
  return (
    <Modal titolo={titolo} aperta larga={!stretta} onChiudi={() => void chiudi()} azioni={(
      <div className="flex w-full flex-wrap items-center gap-2">
        <div className="finestra-modifica__elimina flex flex-wrap items-center gap-2">
          {!inAttesa && onElimina && <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo={titoloElimina} disabled={occupato} onClick={onElimina} />}
          {!inAttesa && azioniExtra}
        </div>
        <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={() => void chiudi()} />
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={20} />} titolo={titoloSalva} disabled={occupato || !salvabile || inAttesa} onClick={() => void onSalva()} />
      </div>
    )}>
      <form className="finestra-modifica" aria-label={nomeModulo ?? titolo} onSubmit={invia}>
        {erroreCaricamento ? <p role="alert" className="m-0 text-error-testo">{erroreCaricamento}</p> : caricamento ? <p role="status" className="m-0">Un attimo…</p> : children}
      </form>
    </Modal>
  );
}
