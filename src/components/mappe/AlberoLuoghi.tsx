// ============================================================
// AlberoLuoghi — l'albero delle mappe dell'atlante, per genitore, con le famiglie di immagini raccolte
// ============================================================
//
// Ogni livello è un elenco dei figli di un nodo: le mappe che appartengono a una stessa famiglia
// di immagini (gruppo esplicito o collezione di presentazione) stanno insieme come miniature sotto
// un solo titolo, le altre sono collegamenti singoli. I discendenti si annidano ricorsivamente,
// eventualmente dentro un `details` da espandere.
//
// L2 (2026-10-20): le versioni di una stessa Area sono una voce sola col nome dell'Area, e ogni voce porta alla casa del posto.
// ============================================================

import { etichetteDistinte, nomePresentazioneMappa, titoloGruppoImmagini } from '../../utils/presentazioneMappa';
import { ImmaginiLuogo } from './ImmaginiLuogo';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { nomeFiglieMappa } from '../../utils/vocabolarioMappe';
import type { MappaRiassuntoDto } from '../../types';
import { IconaAzione } from '../shared/IconaAzione';

/** La raccolta visuale conserva ogni identità e non rappresenta un passaggio di gioco. */
export function AlberoLuoghi({ mappe, genitore = null, espandibile = false }: { mappe: MappaRiassuntoDto[]; genitore?: string | null; espandibile?: boolean }) {
  const figli = new Map<string | null, MappaRiassuntoDto[]>();
  for (const m of mappe) figli.set(m.genitore, [...(figli.get(m.genitore) ?? []), m]);
  /** Quante voci mostra un elenco di figlie: una per Area (le sue versioni insieme), una per famiglia di immagini, una per mappa sola. */
  const contaVoci = (elenco: MappaRiassuntoDto[]) => new Set(elenco.map((m) => m.area ? `area:${m.area.chiave}` : m.gruppoImmagini ? `esplicito:${m.gruppoImmagini.id}` : m.immagineCollezione ? `presentazione:${m.immagineCollezione.ambito}` : m.chiave)).size;
  /** Disegna l'elenco dei figli di `parent` e, ricorsivamente, i loro discendenti.
   *
   * `antenati` contiene le chiavi già sul cammino dalla radice: un figlio che vi compare viene
   * scartato, così un ciclo nei dati non manda in ricorsione infinita. Le mappe della stessa
   * famiglia escono una volta sola (sul primo membro) come blocco di miniature; le altre come
   * collegamento con il nome reso distinto fra fratelli. Senza figli restituisce `null`. */
  function ramo(parent: string | null, antenati: Set<string>): React.ReactNode {
    const nodi = (figli.get(parent) ?? []).filter(m => !antenati.has(m.chiave));
    if (!nodi.length) return null;
    /** Chiave della famiglia di immagini a cui appartiene la mappa: prima il gruppo esplicito, poi
     * l'ambito della collezione di presentazione; `null` se la mappa sta da sola. */
    const gruppo =(m: MappaRiassuntoDto) => m.gruppoImmagini ? `esplicito:${m.gruppoImmagini.id}` : m.immagineCollezione ? `presentazione:${m.immagineCollezione.ambito}` : null;
    const gruppi = new Map<string, MappaRiassuntoDto[]>();
    for (const m of nodi) { const id = gruppo(m); if (id) gruppi.set(id, [...(gruppi.get(id) ?? []), m]); }
    /** Il sottoalbero di una mappa (aggiungendola agli antenati); con `espandibile` e un
     * contenuto non vuoto lo chiude in un `details` che riporta quante mappe figlie contiene. */
    function discendenti(m: MappaRiassuntoDto) {
      const contenuto = ramo(m.chiave, new Set([...antenati, m.chiave]));
      return espandibile && contenuto ? <details>
        {/* il nome di quel che contiene e quante voci si vedono aprendolo (FUN2-7): le versioni di un'Area contano una volta sola */}
        <summary className="touch cursor-pointer py-1 text-[12px] text-text-muted">{nomeFiglieMappa(m.tipo)} di {m.area?.nome ?? nomePresentazioneMappa(m)} ({contaVoci(figli.get(m.chiave)!)})</summary>
        {contenuto}
      </details> : contenuto;
    }
    const padre = mappe.find(m => m.chiave === parent);
    // L2 (`modifiche.md` §4.6): le planimetrie di una stessa Area sono **una voce sola**, col nome dell'Area e la sua casa (la
    // predefinita apre per prima; le altre versioni si scelgono nella pagina dell'Area), come nell'indice e nel pannello del visore.
    const perArea = new Map<string, MappaRiassuntoDto[]>();
    for (const m of nodi) if (m.area) perArea.set(m.area.chiave, [...(perArea.get(m.area.chiave) ?? []), m]);
    /** La voce che rappresenta l'Area: la planimetria predefinita, altrimenti la prima versione. */
    const rappresentante = (membri: MappaRiassuntoDto[]) => membri.find(v => v.area?.predefinita) ?? membri.slice().sort((a, b) => (a.area?.versioneOrdine ?? 0) - (b.area?.versioneOrdine ?? 0))[0];
    // Fra fratelli il nome deve bastare a distinguerli: dove due finiscono uguali — i fogli non
    // attribuiti di uno stesso Palazzo — ci pensa il numero d'ordine. **Solo fra i nodi che
    // compaiono da soli**: le immagini di una stessa famiglia hanno lo stesso nome per definizione
    // e stanno sotto un'intestazione unica, che numerarle spezzerebbe.
    const soli = nodi.filter(m => !m.area && !gruppo(m));
    const etichette = new Map(etichetteDistinte(soli).map((t, i) => [soli[i].chiave, t]));
    // il gruppo porta il nome di quel che contiene (M19): «Aree di Shibuya», «Quartieri di Tokyo», «Planimetrie di …»
    return <ul className="m-0 pl-4 list-none flex flex-col gap-2" aria-label={parent ? `${padre ? nomeFiglieMappa(padre.tipo) : 'Aree'} di ${padre ? nomePresentazioneMappa(padre) : 'questo posto'}` : 'Città e Palazzi'}>{nodi.map(m => {
      if (m.area) {
        const membri = perArea.get(m.area.chiave)!;
        const capo = rappresentante(membri);
        if (capo.chiave !== m.chiave) return null;
        const pin = membri.reduce((n, v) => n + v.numeroSpilli, 0);
        return <li key={`area:${m.area.chiave}`}>
          {/* R1 (validatore L2): l'area in attesa della scelta dell'utente (lo staff di Tokyo) porta il segno «Da verificare» anche qui,
              accanto al nome e con l'aspetto della pagina Area e delle Aree della città; dove non c'è posto va a capo */}
          <div className="flex flex-wrap items-center gap-x-2">
            <Link className="touch flex min-w-0 items-center gap-2 py-1 no-underline text-text" to={capo.casa || `/guida/mappe/${encodeURIComponent(capo.chiave)}`}>
              <IconaAzione chiave="mappa" dimensione={18} />
              <span>{m.area.nome}</span>
              {membri.length > 1 && <span className="text-[11px] text-text-muted">{membri.length} versioni · {pin} pin</span>}
            </Link>
            {m.area.daVerificare && <span className="chip chip--attivo text-[11px]" title="Nessuna fonte colloca questa area: decidi se tenerla o rimuoverla">Da verificare</span>}
          </div>
          {membri.map(v => <Fragment key={v.chiave}>{discendenti(v)}</Fragment>)}
        </li>;
      }
      const id = gruppo(m);
      if (id) {
        const membri = gruppi.get(id)!;
        if (membri[0].chiave !== m.chiave) return null;
        const titolo = titoloGruppoImmagini(m);
        return <li key={id}>{!m.gruppoImmagini && <h3 className="m-0 py-1 text-sm font-semibold">{titolo}</h3>}<ImmaginiLuogo mappe={membri} nome={titolo} discendenti={discendenti} /></li>;
      }
      return <li key={m.chiave}>
        <Link className="touch flex items-center gap-2 py-1 no-underline text-text" to={m.casa || `/guida/mappe/${encodeURIComponent(m.chiave)}`}>
          {/* L1: un'icona sola per tutte le righe; il caso a parte del Covo citava la mappa «nativo-archivio-022», che non esiste più */}
          <IconaAzione chiave="mappa" dimensione={18} />
          <span>{etichette.get(m.chiave) ?? nomePresentazioneMappa(m)}</span>
        </Link>
        {discendenti(m)}
      </li>;
    })}</ul>;
  }
  return ramo(genitore, new Set(genitore ? [genitore] : []));
}
