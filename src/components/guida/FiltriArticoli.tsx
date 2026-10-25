// ============================================================
// FiltriArticoli — ricerca, categorie a tessere, destinatario, stato e disponibilità
// ============================================================
//
// Lo stesso pannello nella scheda del negozio e nella ricerca fra tutti i negozi. La ricerca
// filtra mentre si scrive; le categorie sono tessere con la figura, a scelta multipla e con il
// conteggio; «Per chi» è un elenco chiuso; con una partita compaiono i due segmenti
// Acquistati/Da acquistare e Disponibili/Bloccati. Il filtro è un valore (`utils/articoli.ts`):
// chi lo tiene nell'indirizzo o nello stato lo passa qui e riceve il nuovo.
// ============================================================

import { useId, useState } from 'react';
import { CampoRicerca } from '../shared/CampoRicerca';
import { Selettore } from '../shared/Selettore';
import { SelettoreIcone } from '../shared/SelettoreIcone';
import { Segmenti } from '../shared/Segmenti';
import { NOME_CATEGORIA_ARTICOLO, PERSONAGGI } from '../../utils/negozi';
import { FILTRI_DISPONIBILITA, STATI_ACQUISTO, type FiltroArticoli as Filtro, filtroAttivo, FILTRO_VUOTO } from '../../utils/articoli';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

interface Props {
  filtro: Filtro;
  onCambia: (f: Filtro) => void;
  /** Le categorie da offrire (con quanti articoli ciascuna); se manca, tutte quelle del catalogo. */
  categorie?: Array<{ chiave: string; n?: number }>;
  /** I destinatari da offrire; se manca, i personaggi giocabili. */
  destinatari?: string[];
  /** Con una partita si filtra anche per stato d'acquisto e disponibilità. */
  conPartita: boolean;
  segnaposto?: string;
  /** Lotto C: «Per chi», categorie e segmenti in un pannello aperto dal pulsante «Filtri» (come nel Compendio), riassunti da
   *  chip rimovibili; la ricerca resta in vista. Serve dove l'elenco va visto subito (i Negozi: 19 tessere prima della lista). */
  comprimibili?: boolean;
}

/**
 * Il pannello dei filtri: ricerca, «Per chi» (se ci sono destinatari), «Azzera i filtri» quando qualcosa è attivo,
 * categorie a tessere col conteggio (solo se ce n'è più d'una) e, con una partita, i segmenti di stato d'acquisto e
 * di disponibilità. Ogni cambio passa al genitore il filtro intero aggiornato.
 */
export function FiltriArticoli({ filtro, onCambia, categorie, destinatari, conPartita, segnaposto = 'Cerca un articolo (nome, effetto)…', comprimibili }: Props) {
  const voci = (categorie ?? Object.keys(NOME_CATEGORIA_ARTICOLO).map((chiave) => ({ chiave, n: undefined as number | undefined }))).map((c) => ({ chiave: c.chiave, nome: NOME_CATEGORIA_ARTICOLO[c.chiave] ?? c.chiave, conteggio: c.n }));
  const per = destinatari ?? [...PERSONAGGI];
  const idPannello = useId();
  // il pannello parte aperto se l'indirizzo porta già un filtro diverso dalla ricerca (chi torna lo ritrova com'era)
  const [aperto, setAperto] = useState(() => filtroAttivo({ ...filtro, q: '' }));
  const selettorePer = per.length > 0 && <Selettore compatto etichetta="Per chi" valore={filtro.per} vuoto="Per chiunque" opzioni={per.map((p) => ({ chiave: p, nome: p }))} onCambia={(v) => onCambia({ ...filtro, per: v })} />;
  const tessere = voci.length > 1 && <SelettoreIcone multiplo compatto etichetta="Categorie" valore={filtro.categorie} opzioni={voci} onCambia={(c) => onCambia({ ...filtro, categorie: c })} />;
  const segmenti = conPartita && (
    <div className="filtri-articoli__riga">
      <Segmenti etichetta="Stato d'acquisto" valore={filtro.stato} opzioni={STATI_ACQUISTO} onCambia={(stato) => onCambia({ ...filtro, stato })} />
      <Segmenti etichetta="Disponibilità" valore={filtro.disponibilita} opzioni={FILTRI_DISPONIBILITA} onCambia={(disponibilita) => onCambia({ ...filtro, disponibilita })} />
    </div>
  );
  const azzera = filtroAttivo(filtro) && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="deseleziona" dimensione={20} />} titolo="Azzera i filtri" onClick={() => onCambia({ ...FILTRO_VUOTO })} />;
  if (comprimibili) {
    const attivi: Array<{ chiave: string; testo: string; togli: () => void }> = [
      ...filtro.categorie.map((c) => ({ chiave: `c-${c}`, testo: NOME_CATEGORIA_ARTICOLO[c] ?? c, togli: () => onCambia({ ...filtro, categorie: filtro.categorie.filter((x) => x !== c) }) })),
      ...(filtro.per ? [{ chiave: 'per', testo: `Per ${filtro.per}`, togli: () => onCambia({ ...filtro, per: '' }) }] : []),
      ...(conPartita && filtro.stato !== 'tutti' ? [{ chiave: 'stato', testo: STATI_ACQUISTO.find((x) => x.chiave === filtro.stato)?.nome ?? filtro.stato, togli: () => onCambia({ ...filtro, stato: 'tutti' as const }) }] : []),
      ...(conPartita && filtro.disponibilita !== 'tutti' ? [{ chiave: 'disp', testo: FILTRI_DISPONIBILITA.find((x) => x.chiave === filtro.disponibilita)?.nome ?? filtro.disponibilita, togli: () => onCambia({ ...filtro, disponibilita: 'tutti' as const }) }] : []),
    ];
    return (
      <div className="filtri-articoli" role="search" aria-label="Filtri degli articoli">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <CampoRicerca className="max-sm:basis-full" valore={filtro.q} onCambia={(q) => onCambia({ ...filtro, q })} segnaposto={segnaposto} />
          <PulsanteVisivo attivo={aperto} compatto icona={<IconaAzione chiave="filtri" dimensione={20} />} titolo="Filtri" dettaglio={attivi.length > 0 ? `(${attivi.length})` : undefined}
            onClick={() => setAperto((v) => !v)} aria-expanded={aperto} aria-controls={idPannello} />
          {azzera}
        </div>
        {attivi.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Filtri attivi">
            {attivi.map((f) => <li key={f.chiave}><button type="button" className="chip chip--attivo touch" onClick={f.togli} aria-label={`Togli il filtro ${f.testo}`}>{f.testo} ×</button></li>)}
          </ul>
        )}
        {aperto && (
          <div id={idPannello} className="card filtri-articoli" role="group" aria-label="Altri filtri">
            {selettorePer && <div className="filtri-articoli__riga">{selettorePer}</div>}
            {tessere}
            {segmenti}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="filtri-articoli" role="search" aria-label="Filtri degli articoli">
      <div className="filtri-articoli__riga">
        <CampoRicerca valore={filtro.q} onCambia={(q) => onCambia({ ...filtro, q })} segnaposto={segnaposto} />
        {selettorePer}
        {azzera}
      </div>
      {tessere}
      {segmenti}
    </div>
  );
}
