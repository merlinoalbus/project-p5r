import { etichetteDistinte, nomePresentazioneMappa } from '../../utils/presentazioneMappa';
import { urlImmagine } from '../../services/api';
import { ImmaginiLuogo } from './ImmaginiLuogo';
import { Link } from 'react-router-dom';
import type { MappaRiassuntoDto } from '../../types';
import { IconaAzione } from '../shared/IconaAzione';

/** La raccolta visuale conserva ogni identità e non rappresenta un passaggio di gioco. */
export function AlberoLuoghi({ mappe, genitore = null, espandibile = false }: { mappe: MappaRiassuntoDto[]; genitore?: string | null; espandibile?: boolean }) {
  const figli = new Map<string | null, MappaRiassuntoDto[]>();
  for (const m of mappe) figli.set(m.genitore, [...(figli.get(m.genitore) ?? []), m]);
  function ramo(parent: string | null, antenati: Set<string>): React.ReactNode {
    const nodi = (figli.get(parent) ?? []).filter(m => !antenati.has(m.chiave));
    if (!nodi.length) return null;
    const gruppo = (m: MappaRiassuntoDto) => m.gruppoImmagini ? `esplicito:${m.gruppoImmagini.id}` : m.immagineCollezione ? `presentazione:${m.immagineCollezione.ambito}` : null;
    const gruppi = new Map<string, MappaRiassuntoDto[]>();
    for (const m of nodi) { const id = gruppo(m); if (id) gruppi.set(id, [...(gruppi.get(id) ?? []), m]); }
    function discendenti(m: MappaRiassuntoDto) {
      const contenuto = ramo(m.chiave, new Set([...antenati, m.chiave]));
      return espandibile && contenuto ? <details>
        <summary className="touch cursor-pointer py-1 text-[12px] text-text-muted" aria-label={`Mostra le mappe di ${nomePresentazioneMappa(m)}`}>Luoghi e planimetrie ({figli.get(m.chiave)!.length})</summary>
        {contenuto}
      </details> : contenuto;
    }
    const padre = mappe.find(m => m.chiave === parent);
    // Fra fratelli il nome deve bastare a distinguerli: dove due finiscono uguali — i fogli non
    // attribuiti di uno stesso Palazzo — ci pensa il numero d'ordine. **Solo fra i nodi che
    // compaiono da soli**: le immagini di una stessa famiglia hanno lo stesso nome per definizione
    // e stanno sotto un'intestazione unica, che numerarle spezzerebbe.
    const soli = nodi.filter(m => !gruppo(m));
    const etichette = new Map(etichetteDistinte(soli).map((t, i) => [soli[i].chiave, t]));
    return <ul className="m-0 pl-4 list-none flex flex-col gap-2" aria-label={parent ? `Mappe di ${padre ? nomePresentazioneMappa(padre) : 'luogo'}` : 'Mappe'}>{nodi.map(m => {
      const id = gruppo(m);
      if (id) {
        const membri = gruppi.get(id)!;
        if (membri[0].chiave !== m.chiave) return null;
        const titolo = m.gruppoImmagini?.nome ?? nomePresentazioneMappa(m);
        return <li key={id}>{!m.gruppoImmagini && <h3 className="m-0 py-1 text-sm font-semibold">{titolo}</h3>}<ImmaginiLuogo mappe={membri} nome={titolo} discendenti={discendenti} /></li>;
      }
      return <li key={m.chiave}>
        <Link className="touch flex items-center gap-2 py-1 no-underline text-text" to={m.chiave === 'nativo-archivio-022' ? '/guida/covo' : `/guida/mappe/${encodeURIComponent(m.chiave)}`}>
          {m.chiave === 'nativo-archivio-022' ? <img src={urlImmagine('guida', 'covo')} alt="" className="h-8 w-8 object-contain" /> : <IconaAzione chiave="mappa" dimensione={18} />}
          <span>{etichette.get(m.chiave) ?? nomePresentazioneMappa(m)}</span>
        </Link>
        {discendenti(m)}
      </li>;
    })}</ul>;
  }
  return ramo(genitore, new Set(genitore ? [genitore] : []));
}
