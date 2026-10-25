// ============================================================
// PlanimetrieDaCollocare — l'elenco «Da collocare» dell'albero dei luoghi, col gesto «Colloca» (L11 B5, R11-13/1)
// ============================================================
//
// Le planimetrie senza Area (del mondo e dei Palazzi): una riga ciascuna con miniatura, nome, genitore e numero di pin, e «Colloca», che
// apre la finestra condivisa per quartiere **o** Palazzo. Stesso contenuto della sezione in fondo a La città (`AreeDellaCitta`).
// ============================================================

import { useState } from 'react';
import { AnteprimaMappa } from './AnteprimaMappa';
import { FinestraCollocaPlanimetria, type ContenitoreColloca } from './FinestraCollocaPlanimetria';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import type { MappaDaCollocareDto } from '../../types';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** Le planimetrie da collocare, una riga per planimetria; a «Colloca» fatto chiede di rileggere l'albero (`onCollocata`). */
// L12 (passo 8): nel rilascio (sola lettura) l'elenco da collocare non esiste; la condizione è costante di build, `PlanimetrieDaCollocareReale` esce dal bundle
export const PlanimetrieDaCollocare: StrumentoDiModifica<typeof PlanimetrieDaCollocareReale> = IN_RILASCIO ? NienteInRilascio : PlanimetrieDaCollocareReale;
function PlanimetrieDaCollocareReale({ elenco, contenitori, onCollocata }: {
  elenco: MappaDaCollocareDto[]; contenitori: ContenitoreColloca[]; onCollocata: () => Promise<void>;
}) {
  const [scelta, setScelta] = useState<MappaDaCollocareDto | null>(null);
  return (
    <>
      <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Planimetrie da collocare">
        {elenco.map((m) => (
          <li key={m.chiave} className="flex flex-wrap items-center gap-3">
            <AnteprimaMappa mappa={m} className="h-12 w-16" sizes="64px" />
            <span className="flex min-w-[10rem] flex-1 flex-col">
              <span className="break-words font-semibold">{m.nome}</span>
              <span className="testo-12 text-text-muted">{m.genitoreNome ?? 'senza genitore'} · {m.numeroSpilli === 1 ? '1 pin' : `${m.numeroSpilli} pin`}</span>
            </span>
            <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="seleziona" dimensione={20} />} titolo="Colloca" onClick={() => setScelta(m)} />
          </li>
        ))}
      </ul>
      {scelta && <FinestraCollocaPlanimetria mappa={scelta} contenitori={contenitori} onChiudi={() => setScelta(null)}
        onCollocata={async () => { setScelta(null); await onCollocata(); }} />}
    </>
  );
}
