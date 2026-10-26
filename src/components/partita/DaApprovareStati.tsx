// ============================================================
// DaApprovareStati — l'elenco del passato della partita, dietro un pulsante nella riga dei dati (L13, decisione 19)
// ============================================================
//
// Decisione 19 dell'utente (2026-10-26, «Elenco da approvare»): gli effetti di stato delle voci spuntate in passato e mai applicati (per esempio
// la Persona di una voce che non era entrata nel Compendio Personale) si applicano solo se l'utente li approva, voce per voce. Il censimento del
// server (`statiMancantiService`) li mette fra le proposte «da applicare» della partita (`dati.passato`); qui si vedono tutti insieme, per giorno,
// con «Applica alla partita» o «L'ho già segnato a mano» (`DaApplicare passati`, le stesse decisioni della voce). Ogni proposta compare anche
// sulla sua voce nel Diario.
//
// Il pulsante c'è solo con almeno una proposta aperta («Da approvare · N»), nella riga dei dati della partita che già scorre: nessuna scheda in
// più, l'intestazione resta entro il 30% dell'altezza. Non è dietro il rilascio in sola lettura: le partite sono dei giocatori.
// ============================================================

import { useState } from 'react';
import { getDaApplicare } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { useGestiPartita } from '../../services/gestiPartita';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { DaApplicare } from './DaApplicare';
import { delPassato } from '../../../shared/propostePartita';

/** Il pulsante «Da approvare · N» e la finestra con l'elenco del passato; niente senza proposte aperte. */
export function DaApprovareStati({ partitaId }: { partitaId: number }) {
  const gesti = useGestiPartita();
  const elenco = useCarica(() => getDaApplicare(partitaId), [partitaId, gesti.versionePerPartita[partitaId] ?? 0, gesti.versioneGuida]);
  const [aperta, setAperta] = useState(false);
  const n = (elenco.dati ?? []).filter((p) => p.stato === 'aperta' && delPassato(p)).length;
  if (n === 0 && !aperta) return null;
  return (
    <>
      <PulsanteVisivo tono="secondario" compatto className="shrink-0 tabular-nums" icona={<IconaAzione chiave="registra" dimensione={20} />}
        titolo={`Da approvare · ${n}`} aria-haspopup="dialog"
        aria-label={`Effetti delle voci già spuntate da approvare: ${n}`} title="Effetti delle voci già spuntate mai applicati alla partita" onClick={() => setAperta(true)} />
      <Modal aperta={aperta} titolo="Da approvare nella partita" larga onChiudi={() => { setAperta(false); void elenco.ricarica(); }}>
        <div className="flex flex-col gap-2">
          <p className="m-0 testo-13 text-text-secondary text-pretty">Effetti aggiunti a voci che avevi già spuntato, mai applicati a questa partita. Niente cambia finché non scegli: «Applica alla partita» lo segna ora (togliendo la spunta della voce si annulla come gli altri), «L’ho già segnato a mano» lo toglie dall’elenco.</p>
          {n === 0 && <p role="status" className="m-0 testo-13 text-success">Elenco vuoto: non c’è più niente da approvare.</p>}
          <DaApplicare partitaId={partitaId} passati onCambiato={() => elenco.ricarica()} />
        </div>
      </Modal>
    </>
  );
}
