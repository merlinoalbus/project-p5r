// ============================================================
// PulsanteAppuntiFissi — apre e chiude la finestra degli appunti fissi dalla barra superiore (2026-10-31, C7)
// ============================================================
//
// Un punto stabile, su ogni pagina e a ogni larghezza, come Cerca e Schermo sempre acceso: un interruttore (`aria-pressed`) che apre la
// finestra (o la riporta com'era se è ridotta a icona) e, aperta, la chiude. `data-pulsante-appunti-fissi`: ci torna il fuoco alla
// chiusura della finestra. Solo nella preparazione (costante di build qui sotto e nel punto d'uso).
// ============================================================

import { useAppuntiFissiStore } from '../../stores/appuntiFissiStore';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

export const PulsanteAppuntiFissi: StrumentoDiModifica<typeof PulsanteAppuntiFissiReale> = IN_RILASCIO ? NienteInRilascio : PulsanteAppuntiFissiReale;
function PulsanteAppuntiFissiReale() {
  const stato = useAppuntiFissiStore((s) => s.stato);
  const aperta = stato === 'aperta';
  return (
    <button
      type="button"
      data-pulsante-appunti-fissi
      className={`touch flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none ${stato !== 'chiusa' ? 'bg-primary-bg text-primary-testo' : 'bg-transparent text-text-secondary hover:text-text'}`}
      aria-label="Appunti fissi"
      aria-pressed={stato !== 'chiusa'}
      title={aperta ? 'Chiudi gli appunti fissi' : stato === 'ridotta' ? 'Riapri gli appunti fissi' : 'Apri gli appunti fissi'}
      // aperta, la chiusura la fa la finestra: prima chiede delle modifiche non salvate di un appunto
      onClick={() => { const s = useAppuntiFissiStore.getState(); if (aperta) s.chiediChiusura(); else s.apri(); }}
    >
      <IconaAzione chiave="piano" dimensione={22} />
    </button>
  );
}
