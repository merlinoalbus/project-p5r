// ============================================================
// vocabolarioMappe — come si chiamano le mappe intorno a quella aperta (L0, 2026-10-20)
// ============================================================
//
// Le parole seguono le gerarchie: Città → Quartiere → Area → Planimetria nel mondo, Palazzo → Area → Planimetria nei Palazzi.
// «Luogo» è solo l'attività (Untouchable, Diner), e non nomina più una zona né una mappa.
// ============================================================

import type { TipoMappa } from '../../shared/spilli';

/** L'intestazione delle mappe vicine (figlie e genitore) di una mappa del tipo dato, nel pannello del visore. */
export function titoloMappeVicine(tipo: TipoMappa): string {
  switch (tipo) {
    case 'citta': return 'Quartieri';
    case 'quartiere': return 'Aree';
    case 'luogo': return 'Planimetrie e mappe collegate';
    case 'palazzo':
    case 'area': return 'Planimetrie';
    default: return 'Mappe collegate';
  }
}

/** Il nome delle mappe che stanno accanto a una mappa del tipo dato (stesso genitore): il selettore del pannello cambia fra loro. */
export function titoloMappeSorelle(tipo: TipoMappa): string {
  switch (tipo) {
    case 'quartiere': return 'Quartieri';
    case 'luogo': return 'Aree';
    case 'area': return 'Planimetrie';
    case 'palazzo': return 'Palazzi';
    default: return 'Mappe';
  }
}

/** Il nome per i lettori di schermo del gruppo delle mappe accanto («Altri quartieri», «Altre aree»…), accordato per genere. */
export function etichettaMappeSorelle(tipo: TipoMappa): string {
  switch (tipo) {
    case 'quartiere': return 'Altri quartieri';
    case 'luogo': return 'Altre aree';
    case 'area': return 'Altre planimetrie';
    case 'palazzo': return 'Altri Palazzi';
    default: return 'Altre mappe';
  }
}
