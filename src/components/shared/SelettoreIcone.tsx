// ============================================================
// SelettoreIcone — una scelta fra poche voci, ognuna con la sua figura
// ============================================================
//
// Per le scelte brevi con un'illustrazione — la categoria di un articolo, la famiglia di un
// effetto, il tipo di un negozio, il tipo e la fascia di un'attività, dove si vede un film — una
// tendina nasconde proprio la cosa che aiuta a scegliere: la figura. Qui le voci sono tessere da
// almeno 44 px con l'icona sopra e l'etichetta sotto; a scelta singola è un `radiogroup`, a scelta
// multipla un `group` di interruttori (`aria-pressed`). Le tessere si dividono la riga e vanno a
// capo: sul telefono ne entrano tre o quattro, su desktop tutte.
// ============================================================

import type { ReactNode } from 'react';
import { IconaCategoria } from '../guida/IconaCategoria';

export interface OpzioneIcone {
  chiave: string;
  nome: string;
  /** La chiave dell'illustrazione (`IconaCategoria`); se manca si usa la chiave della voce. */
  categoria?: string;
  /** Una figura propria al posto dell'illustrazione di categoria. */
  icona?: ReactNode;
  /** Un numero accanto al nome (quanti articoli hanno quella categoria). */
  conteggio?: number;
}

interface Base {
  etichetta: string;
  opzioni: OpzioneIcone[];
  disabilitato?: boolean;
  /** Tessere più strette (icona 28 px) per i pannelli dei filtri. */
  compatto?: boolean;
  className?: string;
}
interface Singolo extends Base { multiplo?: false; valore: string; onCambia: (chiave: string) => void }
interface Multiplo extends Base { multiplo: true; valore: string[]; onCambia: (chiavi: string[]) => void }

export function SelettoreIcone(props: Singolo | Multiplo) {
  const { etichetta, opzioni, disabilitato, compatto, className } = props;
  const scelte = new Set(props.multiplo ? props.valore : [props.valore]);
  const scegli = (chiave: string) => {
    if (props.multiplo) props.onCambia(scelte.has(chiave) ? props.valore.filter((v) => v !== chiave) : [...props.valore, chiave]);
    else props.onCambia(chiave);
  };
  return (
    <div role={props.multiplo ? 'group' : 'radiogroup'} aria-label={etichetta} className={`selettore-icone ${compatto ? 'selettore-icone--compatto' : ''} ${className ?? ''}`}>
      {opzioni.map((o) => {
        const attiva = scelte.has(o.chiave);
        return (
          <button key={o.chiave} type="button" className={`selettore-icone__tessera touch ${attiva ? 'selettore-icone__tessera--attiva' : ''}`}
            role={props.multiplo ? undefined : 'radio'} aria-checked={props.multiplo ? undefined : attiva} aria-pressed={props.multiplo ? attiva : undefined}
            disabled={disabilitato} onClick={() => scegli(o.chiave)} title={o.nome}>
            <span className="selettore-icone__icona" aria-hidden="true">{o.icona ?? <IconaCategoria categoria={o.categoria ?? o.chiave} dimensione={compatto ? 28 : 36} />}</span>
            <span className="selettore-icone__nome">{o.conteggio !== undefined ? `${o.nome} ${o.conteggio}` : o.nome}</span>
          </button>
        );
      })}
    </div>
  );
}
