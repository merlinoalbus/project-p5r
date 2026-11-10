import { useMemo, useState } from 'react';
import { CATEGORIA_OGGETTO, GRUPPI_OGGETTO, type GruppoOggetto } from '../../../shared/catalogo';
import { ModuloOggetto } from './ModuloOggetto';
import type { CatalogoOggettoDto } from '../../types';
import { useCarica } from '../../hooks/useCarica';
import { getCatalogoOggetti } from '../../services/api/catalogoOggetti';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `aggiornamento` non entra nella lettura: è il segnale del chiamante per rileggere
  const elenco = useCarica(() => getCatalogoOggetti(), [aggiornamento]);
  return <SceltaNelCatalogo {...props} oggetti={elenco.dati} caricamento={elenco.caricamento} errore={elenco.errore} onRicarica={() => void elenco.ricarica()} />;
}

export interface StatoSceltaCatalogo {
  oggetti: readonly CatalogoOggettoDto[] | null;
  caricamento: boolean;
  errore: string | null;
  onRicarica: () => void;
}

/** L'ordine dei gruppi nell'elenco: quello di `GRUPPI_OGGETTO`. */
const ORDINE_GRUPPI = Object.keys(GRUPPI_OGGETTO) as GruppoOggetto[];

/**
 * La variante già caricata riusa un'unica lettura per identità e componenti del costo di un'offerta. L3: le voci stanno a gruppi contigui
 * (Equipaggiamento, Consumabili…, poi per nome), così ogni intestazione compare una volta; con `onCrea` in fondo all'elenco c'è «Crea
 * l'oggetto», che apre il modulo dell'oggetto col testo cercato e, salvato, lo sceglie.
 */
export function SceltaNelCatalogo({ valore, onScegli, etichetta = 'Oggetto', disabilitato, escludi, includi, oggetti, caricamento, errore, onRicarica, onCreato, compatto }: Props & StatoSceltaCatalogo & {
  /** Un oggetto creato da «Crea l’oggetto»: chi ospita rilegge il catalogo; senza, la voce non c'è. */
  onCreato?: (oggetto: CatalogoOggettoDto) => void;
  compatto?: boolean;
}) {
  const opzioni = useMemo(() => (oggetti ?? []).filter((o) => !escludi?.includes(o.chiave) && (!includi || includi.includes(o.chiave)))
    .map((o) => ({ o, g: CATEGORIA_OGGETTO[o.categoria].gruppo }))
    .sort((a, b) => ORDINE_GRUPPI.indexOf(a.g) - ORDINE_GRUPPI.indexOf(b.g) || a.o.nome.localeCompare(b.o.nome, 'it'))
    .map(({ o, g }) => ({
      chiave: o.chiave, nome: o.nome, gruppo: GRUPPI_OGGETTO[g], dettaglio: CATEGORIA_OGGETTO[o.categoria].nome,
      testoRicerca: [...o.nomiAltri, o.nomeOriginale ?? ''].join(' '),
    })), [oggetti, escludi, includi]);
  const [nuovo, setNuovo] = useState<string | null>(null);
  return <div className="flex min-w-0 flex-col gap-2">
    {errore ? <p role="alert" className="m-0 testo-13">{errore} <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" disabled={disabilitato} onClick={onRicarica} /></p> : null}
    {valore && oggetti && !oggetti.some((o) => o.chiave === valore) ? <p role="alert" className="m-0 testo-13">L’oggetto collegato non è più nel catalogo disponibile. La scelta resta finché non la cambi.</p> : null}
    <Selettore etichetta={etichetta} valore={valore} opzioni={opzioni} ricerca="sempre" compatto={compatto}
      disabilitato={disabilitato || caricamento || !!errore} segnaposto={caricamento ? 'Caricamento del catalogo…' : 'Cerca per nome o altro nome'}
      crea={onCreato ? { etichetta: (t) => (t ? `Crea l’oggetto «${t}»` : 'Crea un oggetto nuovo'), onCrea: (t) => setNuovo(t) } : undefined}
      onCambia={(k) => { const o = oggetti?.find((o) => o.chiave === k); if (o) onScegli(o); }} />
    {nuovo !== null && <ModuloOggetto nomeIniziale={nuovo} onChiudi={() => setNuovo(null)} onSalvato={(o) => { setNuovo(null); onCreato?.(o); onScegli(o); }} />}
  </div>;
}
