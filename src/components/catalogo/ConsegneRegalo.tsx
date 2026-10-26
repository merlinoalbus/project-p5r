// ============================================================
// ConsegneRegalo — i regali dati nella partita, raggruppati, con «Annulla l'ultima» (ondata 5, revisione dei lotti D e D2)
// ============================================================
//
// Rilievo della revisione: una consegna fuori elenco (+1) o una Cartolina spedita, una volta usciti dal cassetto, non si vedevano più e non si
// annullavano. Ora ogni consegna della partita arriva dal server (`ConfidentePartitaDto.consegne`, `OggettoDettaglioDto.partita.consegne`) e
// questo elenco la mostra dove serve: nella scheda del Confidente raggruppata per oggetto, nella scheda dell'oggetto per Confidente. Lo stesso
// regalo dato più volte è una riga sola con il numero di volte (solo se più di una: «×1» non informa) e l'ultima consegna; «Annulla l'ultima»
// toglie proprio quella (`id`), con punti, acquisto, yen ed evento (`POST /partite/:id/regali/annulla`).
// ============================================================

import { Link } from 'react-router-dom';
import type { ConsegnaRegaloDto } from '../../types';
import { dataGiocoConArticolo } from '../../utils/dateGioco';
import type { GruppoConsegne } from '../../utils/consegneRegalo';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

/** Il momento di gioco dell'ultima consegna, se registrato: «data il 12 aprile, sera», «spedita il …»; con più consegne «ultima il …». */
function momento(c: ConsegnaRegaloDto, volte: number): string | null {
  if (!c.dataGioco) return null;
  return `${volte > 1 ? 'ultima' : c.modo === 'cartolina' ? 'spedita' : 'data'} ${dataGiocoConArticolo(c.dataGioco)}${c.fasciaGioco ? `, ${c.fasciaGioco}` : ''}`;
}

interface Props {
  gruppi: GruppoConsegne[];
  /** Una richiesta è in corso: i pulsanti si fermano. */
  occupato: boolean;
  onAnnulla: (gruppo: GruppoConsegne, ultima: ConsegnaRegaloDto) => void;
  /** Il nome accessibile dell'elenco. */
  etichetta: string;
}

/** L'elenco dei regali dati, con il numero di volte, l'ultimo momento e «Annulla l'ultima». */
export function ElencoConsegne({ gruppi, occupato, onAnnulla, etichetta }: Props) {
  return (
    <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light" aria-label={etichetta}>
      {gruppi.map((g) => {
        const ultima = g.consegne[g.consegne.length - 1]!;
        const volte = g.consegne.length;
        const quando = momento(ultima, volte);
        return (
          <li key={g.chiave} className="py-1.5 flex items-center gap-2 testo-13">
            {/* il testo va a capo nella sua colonna e il pulsante resta sulla stessa riga, anche a 375 px */}
            <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <strong className="min-w-0 break-words">{g.casa ? <Link to={g.casa} className="touch inline-flex items-center">{g.nome}</Link> : g.nome}</strong>
              {volte > 1 && <span className="chip tabular-nums"><span aria-hidden="true">×{volte}</span><span className="sr-only">{volte} volte</span></span>}
              {quando && <span className="text-text-secondary tabular-nums text-pretty">{quando}</span>}
            </div>
            <PulsanteVisivo tono="fantasma" compatto className="shrink-0" icona={<IconaAzione chiave="annulla-ultimo" dimensione={20} />}
              titolo={volte > 1 ? 'Annulla l’ultima' : 'Annulla'} disabled={occupato} onClick={() => onAnnulla(g, ultima)}
              aria-label={`Annulla ${volte > 1 ? 'l’ultima consegna' : 'la consegna'}: ${g.nome}`} />
          </li>
        );
      })}
    </ul>
  );
}
