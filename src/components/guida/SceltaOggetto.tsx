// ============================================================
// SceltaOggetto — prima si sceglie la cosa da vendere; se non c'è, la si inserisce
// ============================================================
//
// L'archivio è uno solo su tutti i tipi — equipaggiamenti, consumabili, oggetti chiave, abiti,
// libri, film, videogiochi — e si cerca per nome nel Selettore (ricerca sempre aperta, voci
// raggruppate per archivio). La categoria arriva con l'oggetto scelto. E soprattutto **collega, non
// copia**: sulla riga restano `oggetto_fonte` e `oggetto_chiave`, nome, effetto e statistiche si
// leggono dall'oggetto a ogni lettura.
// ============================================================

import { useCarica } from '../../hooks/useCarica';
import { getTuttiGliOggetti } from '../../services/api/catalogo';
import { Selettore } from '../shared/Selettore';
import type { OggettoSelezionabileDto } from '../../types';
import { NOME_ARCHIVIO, chiaveOggetto, etichettaOggetto } from '../../utils/oggetti';

interface Props {
  collegato: OggettoSelezionabileDto | null;
  onCollega: (o: OggettoSelezionabileDto) => void;
  onScollega: () => void;
  aMano: boolean;
  onAMano: () => void;
  /** Il collegamento salvato sulla riga, per ritrovare l'oggetto quando l'archivio arriva. */
  collegamento?: { fonte: string | null; chiave: string | null };
  /** Chiamato con l'oggetto trovato nell'archivio per il collegamento salvato, o con null se non c'è più. */
  onArchivio?: (trovato: OggettoSelezionabileDto | null) => void;
  disabilitato?: boolean;
}

export function SceltaOggetto({ collegato, onCollega, onScollega, aMano, onAMano, collegamento, onArchivio, disabilitato }: Props) {
  const elenco = useCarica(async () => {
    const voci = await getTuttiGliOggetti();
    if (collegamento?.fonte && collegamento.chiave) onArchivio?.(voci.find((o) => o.fonte === collegamento.fonte && o.chiave === collegamento.chiave) ?? null);
    return voci;
  }, []);
  const voci = elenco.dati ?? [];
  // Il collegamento salvato punta a un oggetto che l'archivio non ha più: lo si dice, e il legame
  // resta finché non si sceglie un altro oggetto o si passa alla via «a mano».
  const collegamentoPerso = !collegato && !aMano && !!collegamento?.fonte && !!collegamento.chiave && elenco.dati !== null;

  if (collegato) {
    return (
      <fieldset className="regole-editor flex flex-col gap-2">
        <legend>Oggetto collegato</legend>
        <div className="flex flex-wrap items-baseline gap-2">
          <strong className="text-[15px]">{etichettaOggetto(collegato)}</strong>
          <span className="chip text-[11px]">{NOME_ARCHIVIO[collegato.fonte]}</span>
        </div>
        {/* In sola lettura, e viene dall'oggetto: qui non si digita niente. */}
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
          {collegato.effetto && <><dt className="text-text-muted">Effetto</dt><dd className="m-0">{collegato.effetto}</dd></>}
          {collegato.statistiche && <><dt className="text-text-muted">Statistiche</dt><dd className="m-0">{collegato.statistiche}</dd></>}
          {collegato.per && <><dt className="text-text-muted">Per chi</dt><dd className="m-0">{collegato.per}</dd></>}
        </dl>
        <button type="button" className="btn btn-ghost touch self-start" disabled={disabilitato} onClick={onScollega}>Scollega e scegli un altro oggetto</button>
      </fieldset>
    );
  }

  return (
    <fieldset className="regole-editor flex flex-col gap-2">
      <legend>Che cosa vende</legend>
      {elenco.errore && <p className="m-0 text-[12px]" role="alert">Non riesco a leggere l’archivio. <button type="button" className="btn touch" onClick={() => void elenco.ricarica()}>Riprova</button></p>}
      {collegamentoPerso && (
        <p className="m-0 text-[12px] text-warning" role="alert">
          L’oggetto collegato ({NOME_ARCHIVIO[collegamento!.fonte as OggettoSelezionabileDto['fonte']] ?? collegamento!.fonte} · {collegamento!.chiave}) non è più nell’archivio: il legame resta finché non scegli un altro oggetto o lo inserisci a mano.
        </p>
      )}
      <Selettore etichetta="Che cosa vende" valore="" ricerca="sempre" disabilitato={disabilitato || elenco.caricamento}
        segnaposto={elenco.caricamento ? 'Carico l’archivio…' : `Cerca fra ${voci.length} oggetti di ogni tipo…`}
        opzioni={voci.map((o) => ({ chiave: chiaveOggetto(o), nome: etichettaOggetto(o), gruppo: NOME_ARCHIVIO[o.fonte], dettaglio: o.statistiche ?? undefined }))}
        onCambia={(k) => { const o = voci.find((x) => chiaveOggetto(x) === k); if (o) onCollega(o); }} />
      {!aMano && <button type="button" className="btn touch self-start" disabled={disabilitato} onClick={onAMano}>{collegamentoPerso ? 'Lo inserisco a mano (scollega)' : 'Non c’è: lo inserisco'}</button>}
    </fieldset>
  );
}
