// ============================================================
// ListinoNegozio — la merce di un negozio: filtri, articoli con la spunta «acquistato», articoli nascosti (L5 F1, estratto da NegozioPage)
// ============================================================
//
// Lo stesso listino nella pagina del negozio e, da L5, nella pagina del luogo, una sezione per negozio della sede (M §4.1, D5): i filtri
// (categoria, destinatario, «anche gli articoli non ancora in vendita»), la tabella con prezzi, condizioni e acquisto, e in fondo gli
// articoli nascosti di questo negozio con il ripristino in un tocco. Cresce con la pagina: nessuna area scorrevole annidata.
// ============================================================

import { useMemo, useState } from 'react';
import { ArticoliTabella } from '../guida/ArticoliTabella';
import { ElementiRimossi } from '../guida/ElementiRimossi';
import { FiltriArticoli } from '../guida/FiltriArticoli';
import { ModificaGuida } from '../guida/ModificaGuida';
import { elenchiDaOpzioni } from '../guida/elenchiDaOpzioni';
import { FILTRO_VUOTO, categoriePresenti, destinatariPresenti, filtraArticoli, type FiltroArticoli as Filtro } from '../../utils/articoli';
import type { ArticoloDto, NegozioDettaglioDto } from '../../types';
import { TrasformazioniDiJose } from '../catalogo/TrasformazioniDiJose';

type Articolo = ArticoloDto;

/** Le sedi si scelgono per nome con la ricerca (il resto dei campi della finestra è standard). */
const CAMPI_SEDI = elenchiDaOpzioni(['sedi']);

interface Props {
  /** Il negozio, con gli articoli e gli acquisti della partita. */
  negozio: NegozioDettaglioDto;
  partitaId: number | null;
  /** Cambia a ogni salvataggio: il blocco degli articoli nascosti si rilegge. */
  versione: number;
  /** «Modifica» di un articolo: chi ospita il listino apre il modulo del catalogo. */
  onModifica: (chiaveArticolo: string) => void;
  /** Un articolo cambiato (acquisto): chi ospita aggiorna il negozio in locale. */
  onCambiato: (a: Articolo) => void;
  /** Un articolo nascosto rimesso: chi ospita rilegge. */
  onRipristinato: () => void;
}

/** Filtri, tabella degli articoli e articoli nascosti di un negozio. */
export function ListinoNegozio({ negozio, partitaId, versione, onModifica, onCambiato, onRipristinato }: Props) {
  const [filtro, setFiltro] = useState<Filtro>({ ...FILTRO_VUOTO });
  const articoli = useMemo(() => negozio.articoliElenco ?? [], [negozio]);
  const categorie = useMemo(() => categoriePresenti(articoli), [articoli]);
  const destinatari = useMemo(() => destinatariPresenti(articoli), [articoli]);
  // Anche un articolo non ancora acquistabile resta consultabile con condizioni e semaforo.
  const visibili = useMemo(() => filtraArticoli(articoli, filtro, partitaId !== null), [articoli, filtro, partitaId]);
  return (
    <>
      <TrasformazioniDiJose trasformazioni={negozio.trasformazioni ?? []} onModificata={onRipristinato} />
      {/* Le altre sedi del listino (i distributori in più luoghi) e il pin che le conferma: si correggono e si rimettono come la guida (R11-17/1) */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <ModificaGuida tipo="negozio-sedi" chiave={negozio.chiave} cosa={`le altre sedi del listino di «${negozio.nome}»`} etichetta="Altre sedi del listino" onSalvato={onRipristinato} campiSpeciali={CAMPI_SEDI} />
      </div>
      {articoli.length > 0 && (
        <FiltriArticoli filtro={filtro} onCambia={setFiltro} categorie={categorie} destinatari={destinatari} conPartita={partitaId !== null} />
      )}
      {articoli.length === 0 ? <p className="m-0 text-[13px] text-text-muted">Nessun articolo acquistabile confermato per questo luogo.</p>
        : <div className="negozio-elenco"><ArticoliTabella onModifica={(a) => onModifica(a.chiave)} articoli={visibili} partitaId={partitaId} onCambiato={onCambiato} onContenutoCambiato={onRipristinato} /></div>}
      {/* Gli articoli nascosti di questo negozio, con il ripristino in un tocco: la pagina «Rimossi» li ha tutti. */}
      <ElementiRimossi tipo="articolo" negozio={negozio.chiave} versione={versione} onRipristinato={onRipristinato} />
    </>
  );
}
