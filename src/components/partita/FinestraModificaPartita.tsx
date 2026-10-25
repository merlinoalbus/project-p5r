// ============================================================
// FinestraModificaPartita — i dati della partita (nome, livello, data, difficoltà, NG+, Allarme, note) in una finestra
// ============================================================
//
// Erano la scheda «Riepilogo» della Partita; l'utente l'ha tolta dalla fila delle schede (2026-10-25) e ha chiesto il modulo in due
// posti: dal pulsante «Modifica» nella riga dei dati della Partita e da Impostazioni → Partite, per ogni partita.
// ============================================================

import { Modal } from '../shared/Modal';
import { RiepilogoPartita } from './RiepilogoPartita';
import type { PartitaDto } from '../../types';

interface Props {
  partita: PartitaDto;
  aperta: boolean;
  onChiudi: () => void;
}

/** Finestra larga con il modulo dei dati della partita; si rimonta quando cambia la partita. */
export function FinestraModificaPartita({ partita, aperta, onChiudi }: Props) {
  return (
    <Modal titolo={`Dati della partita «${partita.nome}»`} aperta={aperta} onChiudi={onChiudi} larga>
      <RiepilogoPartita key={partita.id} partita={partita} onNaviga={onChiudi} />
    </Modal>
  );
}
