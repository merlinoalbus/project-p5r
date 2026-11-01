// ============================================================
// MenuModificaPalazzo — gli strumenti di modifica della scheda di un Palazzo in un solo menu «Modifica ⋯» (lotto B, punto 6)
// ============================================================
//
// Prima erano sparsi su tre righe («✎» accanto al nome, «Modifica testo» e «+ Infiltrazione», «Modifica aree», «Modifica» e «Altro»
// dell'area): sul telefono riempivano la prima schermata prima della mappa. Le voci hanno gli stessi nomi accessibili dei comandi di prima;
// le finestre e i moduli che aprono sono quelli della pagina (`DungeonDettaglioPage`). Nei Memento resta la modalità «Modifica la guida».
// ============================================================

import { MenuModifica } from '../shared/MenuModifica';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import type { AreaDungeonDto, AreaRiassuntoDto, DungeonDettaglioDto } from '../../types';

/** Le finestre della gestione che il menu apre (le tiene la pagina). */
export type FinestraPalazzo = 'aggiungi-area' | 'aggiungi-planimetria' | 'modifica-area' | 'elimina-area' | 'nuova-infiltrazione';

interface Props {
  d: DungeonDettaglioDto;
  /** L'infiltrazione aperta. */
  area: AreaDungeonDto;
  /** L'area aperta, se c'è: con lei le sue azioni. */
  areaFisica: AreaRiassuntoDto | null;
  /** Le versioni dell'area aperta sono lette: «Modifica area» e «Aggiungi planimetria» ne hanno bisogno. */
  dettaglioAreaPronto: boolean;
  classePulsante?: string;
  onCorreggiScheda: () => void;
  onBossFinale: () => void;
  onModificaTesto: (infiltrazione: string) => void;
  onModificaAree: (infiltrazione: string) => void;
  onFinestra: (f: FinestraPalazzo) => void;
}

/** Il menu «Modifica ⋯» del Palazzo: scheda, boss finale, testo e aree dell'infiltrazione, infiltrazione nuova e le azioni dell'area. */
export function MenuModificaPalazzo({ d, area, areaFisica, dettaglioAreaPronto, classePulsante = '', onCorreggiScheda, onBossFinale, onModificaTesto, onModificaAree, onFinestra }: Props) {
  return (
    <MenuModifica cosa={`il Palazzo «${d.nome}»`} classePulsante={classePulsante}>
      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Correggi la scheda" dettaglio="del Palazzo"
        aria-label={`Correggi la scheda: il Palazzo «${d.nome}»`} onClick={onCorreggiScheda} />
      {/* L4 §8.14: la voce del boss finale (non per un Palazzo col boss dei Memento, Iweleth: il server lo rifiuta) */}
      {d.regolaBoss !== 'memento' && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Boss finale"
        dettaglio={d.voceBossFinale?.nome ?? 'da dichiarare'} aria-label={`Boss finale: il Palazzo «${d.nome}»`} onClick={onBossFinale} />}
      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="note" dimensione={20} />} titolo="Modifica testo" dettaglio={area.nome}
        aria-label={`Modifica testo: l’infiltrazione «${area.nome}»`} onClick={() => onModificaTesto(area.chiave)} />
      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Modifica aree" dettaglio="toccate dall’infiltrazione"
        aria-label="Modifica aree" onClick={() => onModificaAree(area.chiave)} />
      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi infiltrazione" onClick={() => onFinestra('nuova-infiltrazione')} />
      {areaFisica && <>
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica area" dettaglio={areaFisica.nome}
          aria-label="Modifica area" disabled={!dettaglioAreaPronto} onClick={() => onFinestra('modifica-area')} />
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="carica" dimensione={20} />} titolo="Aggiungi planimetria" dettaglio={areaFisica.nome}
          aria-label="Aggiungi planimetria" disabled={!dettaglioAreaPronto} onClick={() => onFinestra('aggiungi-planimetria')} />
        <PulsanteVisivo tono="fantasma" compatto className="text-error-testo" icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina area" dettaglio={areaFisica.nome}
          aria-label="Elimina area" onClick={() => onFinestra('elimina-area')} />
      </>}
    </MenuModifica>
  );
}
