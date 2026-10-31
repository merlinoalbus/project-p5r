// ============================================================
// ConfermaRiapertura — «Riapri» di una voce della guida, con la conferma quando si riapre anche altro (L4 §8.11, §8.6)
// ============================================================
//
// La regola unica della scheda del Palazzo (`GuidaDellArea`) e della guida del visore (`GuidaNelVisore`): togliere il segno a una voce
// toglie il segno a tutti i suoi pin; se altre voci li condividono si riaprono anche loro, e se la voce è un passo di un Enigma risolto
// l'Enigma si riapre. In questi casi prima lo si dice («Riapre anche: …», «Riapre anche l'Enigma «…»») in una finestra con «Annulla» e
// «Riapri»; altrimenti si riapre subito.
// ============================================================

import { useState, type ReactNode } from 'react';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { enigmiCheSiRiaprono, righeRiapertura, testoVociDelGesto } from '../../utils/gestiVoce';
import type { PuntoInteresseDto } from '../../types';

export interface ConfermaRiapertura {
  /** «Riapri» sulla voce: con le infiltrazioni per dire le voci condivise («nella 2ª infiltrazione») e tutte le voci fra cui cercare il suo
   *  Enigma risolto. Chiede conferma se si riapre anche altro, altrimenti riapre subito. */
  chiedi: (voce: PuntoInteresseDto, infiltrazioni: ReadonlyArray<{ chiave: string; ordine: number }> | undefined, tutte: readonly PuntoInteresseDto[]) => void;
  /** La finestra della conferma, da mettere nel componente (null quando non c'è niente da confermare). */
  finestra: ReactNode;
}

/** La conferma di «Riapri»: `riapri` salva la riapertura della voce (subito, o dopo «Riapri» nella finestra). */
export function useConfermaRiapertura(riapri: (voce: PuntoInteresseDto) => void): ConfermaRiapertura {
  // la voce da riaprire, in attesa della conferma, con le righe di quel che si riapre con lei
  const [riapertura, setRiapertura] = useState<{ voce: PuntoInteresseDto; righe: string[] } | null>(null);
  const chiedi: ConfermaRiapertura['chiedi'] = (voce, infiltrazioni, tutte) => {
    const righe = righeRiapertura((voce.condivise ?? []).length > 0 ? testoVociDelGesto(voce.condivise!, infiltrazioni) : null, enigmiCheSiRiaprono([voce], tutte));
    if (righe.length > 0) setRiapertura({ voce, righe }); else riapri(voce);
  };
  const finestra = riapertura && (
    <Modal titolo={`Riaprire «${riapertura.voce.nome}»?`} aperta onChiudi={() => setRiapertura(null)}
      azioni={<>
        <button type="button" className="btn btn-secondary touch" onClick={() => setRiapertura(null)}>Annulla</button>
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Riapri" onClick={() => { const v = riapertura.voce; setRiapertura(null); riapri(v); }} />
      </>}>
      {riapertura.righe.map((r) => <p key={r} className="m-0 testo-14">{r}</p>)}
    </Modal>
  );
  return { chiedi, finestra };
}
