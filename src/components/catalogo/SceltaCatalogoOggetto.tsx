import { useMemo } from 'react';
import { CATEGORIA_OGGETTO, GRUPPI_OGGETTO } from '../../../shared/catalogo';
import type { CatalogoOggettoDto } from '../../types';
import { useCarica } from '../../hooks/useCarica';
import { getCatalogoOggetti } from '../../services/api/catalogoOggetti';
import { Selettore } from '../shared/Selettore';

interface Props {
  valore: string;
  onScegli: (oggetto: CatalogoOggettoDto) => void;
  etichetta?: string;
  disabilitato?: boolean;
  escludi?: readonly string[];
  includi?: readonly string[];
  aggiornamento?: number;
}

/** Stesso selettore per offerte, regali e proposte: ricerca anche gli alias senza copiarli nel nome mostrato. */
export function SceltaCatalogoOggetto({ aggiornamento = 0, ...props }: Props) {
  const elenco = useCarica(() => getCatalogoOggetti(), [aggiornamento]);
  return <SceltaNelCatalogo {...props} oggetti={elenco.dati} caricamento={elenco.caricamento} errore={elenco.errore} onRicarica={() => void elenco.ricarica()} />;
}

export interface StatoSceltaCatalogo {
  oggetti: readonly CatalogoOggettoDto[] | null;
  caricamento: boolean;
  errore: string | null;
  onRicarica: () => void;
}

/** La variante già caricata riusa un'unica lettura per identità e componenti del costo di un'offerta. */
export function SceltaNelCatalogo({ valore, onScegli, etichetta = 'Oggetto', disabilitato, escludi, includi, oggetti, caricamento, errore, onRicarica }: Props & StatoSceltaCatalogo) {
  const opzioni = useMemo(() => (oggetti ?? []).filter((o) => !escludi?.includes(o.chiave) && (!includi || includi.includes(o.chiave))).map((o) => ({
    chiave: o.chiave, nome: o.nome,
    gruppo: GRUPPI_OGGETTO[CATEGORIA_OGGETTO[o.categoria].gruppo], dettaglio: CATEGORIA_OGGETTO[o.categoria].nome,
    testoRicerca: [...o.nomiAltri, o.nomeOriginale ?? ''].join(' '),
  })), [oggetti, escludi, includi]);
  return <div className="flex min-w-0 flex-col gap-2">
    {errore ? <p role="alert" className="m-0 text-[13px]">{errore} <button type="button" className="btn btn-ghost touch" disabled={disabilitato} onClick={onRicarica}>Riprova</button></p> : null}
    {valore && oggetti && !oggetti.some((o) => o.chiave === valore) ? <p role="alert" className="m-0 text-[13px]">L’oggetto collegato non è più nel catalogo disponibile. La scelta resta finché non la cambi.</p> : null}
    <Selettore etichetta={etichetta} valore={valore} opzioni={opzioni} ricerca="sempre"
      disabilitato={disabilitato || caricamento || !!errore} segnaposto={caricamento ? 'Caricamento del catalogo…' : 'Cerca per nome o altro nome'}
      onCambia={(k) => { const o = oggetti?.find((o) => o.chiave === k); if (o) onScegli(o); }} />
  </div>;
}
