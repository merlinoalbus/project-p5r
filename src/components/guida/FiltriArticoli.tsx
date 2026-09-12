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

import { CampoRicerca } from '../shared/CampoRicerca';
import { Selettore } from '../shared/Selettore';
import { SelettoreIcone } from '../shared/SelettoreIcone';
import { NOME_CATEGORIA_ARTICOLO, PERSONAGGI } from '../../utils/negozi';
import { FILTRI_DISPONIBILITA, STATI_ACQUISTO, type FiltroArticoli as Filtro, filtroAttivo, FILTRO_VUOTO } from '../../utils/articoli';

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
}

/** Un gruppo di segmenti: una scelta sola, bersagli da 44 px, `radiogroup`. */
function Segmenti<T extends string>({ etichetta, valore, opzioni, onCambia }: { etichetta: string; valore: T; opzioni: ReadonlyArray<{ chiave: T; nome: string }>; onCambia: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={etichetta} className="segmenti">
      {opzioni.map((o) => (
        <button key={o.chiave} type="button" role="radio" aria-checked={valore === o.chiave} className={`segmenti__voce touch ${valore === o.chiave ? 'segmenti__voce--attiva' : ''}`} onClick={() => onCambia(o.chiave)}>{o.nome}</button>
      ))}
    </div>
  );
}

export function FiltriArticoli({ filtro, onCambia, categorie, destinatari, conPartita, segnaposto = 'Cerca un articolo (nome, effetto)…' }: Props) {
  const voci = (categorie ?? Object.keys(NOME_CATEGORIA_ARTICOLO).map((chiave) => ({ chiave, n: undefined as number | undefined }))).map((c) => ({ chiave: c.chiave, nome: NOME_CATEGORIA_ARTICOLO[c.chiave] ?? c.chiave, conteggio: c.n }));
  const per = destinatari ?? [...PERSONAGGI];
  return (
    <div className="filtri-articoli" role="search" aria-label="Filtri degli articoli">
      <div className="filtri-articoli__riga">
        <CampoRicerca valore={filtro.q} onCambia={(q) => onCambia({ ...filtro, q })} segnaposto={segnaposto} />
        {per.length > 0 && <Selettore compatto etichetta="Per chi" valore={filtro.per} vuoto="Per chiunque" opzioni={per.map((p) => ({ chiave: p, nome: p }))} onCambia={(v) => onCambia({ ...filtro, per: v })} />}
        {filtroAttivo(filtro) && <button type="button" className="btn btn-ghost btn-sm touch" onClick={() => onCambia({ ...FILTRO_VUOTO })}>Azzera i filtri</button>}
      </div>
      {voci.length > 1 && <SelettoreIcone multiplo compatto etichetta="Categorie" valore={filtro.categorie} opzioni={voci} onCambia={(c) => onCambia({ ...filtro, categorie: c })} />}
      {conPartita && (
        <div className="filtri-articoli__riga">
          <Segmenti etichetta="Stato d'acquisto" valore={filtro.stato} opzioni={STATI_ACQUISTO} onCambia={(stato) => onCambia({ ...filtro, stato })} />
          <Segmenti etichetta="Disponibilità" valore={filtro.disponibilita} opzioni={FILTRI_DISPONIBILITA} onCambia={(disponibilita) => onCambia({ ...filtro, disponibilita })} />
        </div>
      )}
    </div>
  );
}
