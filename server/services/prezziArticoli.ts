// ============================================================
// prezziArticoli — il prezzo in yen di un'offerta nella fascia in cui si compra (Ondata 5, lotto E; decisioni 2, 5 e 18)
// ============================================================
//
// Il prezzo vive solo nell'offerta: `articolo.prezzo` e, quando una fascia costa diversamente, `articolo.prezzo_per_fascia_json`
// (decisione 5: «il prezzo serale di 500 yen è un dato dell'articolo», le sfide della Big Bang Burger). Chi scala gli yen da solo
// (decisione 18: l'effetto «articolo» della voce spuntata, il turno della sfida, l'anteprima dell'elenco del passato) e chi lo mostra legge
// da qui, con la fascia della voce del Diario o, senza voce, quella corrente della partita: tutti dicono lo stesso importo.
// ============================================================

import { prepared } from '../db/dbService.js';
import { prezzoNellaFascia, type FasciaPrezzo } from '../../shared/catalogo.js';

const eFascia = (v: unknown): v is FasciaPrezzo => v === 'giorno' || v === 'sera';

/** Vero se il file di gioco ha la colonna del prezzo per fascia (migrazione 260); uno schema di prima legge solo `prezzo`. */
function conPrezzoPerFascia(): boolean {
  return !!prepared("SELECT 1 FROM pragma_table_info('articolo', 'main') WHERE name = 'prezzo_per_fascia_json'").get();
}

/** La fascia della voce del Diario (giorno o sera); null se la voce non c'è più. */
export function fasciaDellaVoce(voceUid: string): FasciaPrezzo | null {
  const f = (prepared('SELECT fascia FROM main.voce_giornata WHERE uid = ?').get(voceUid) as { fascia: string } | undefined)?.fascia;
  return eFascia(f) ? f : null;
}

/** La fascia corrente della partita (giorno o sera). */
export function fasciaDellaPartita(partitaId: number): FasciaPrezzo | null {
  const f = (prepared('SELECT fascia_gioco FROM utente.partita WHERE id = ?').get(partitaId) as { fascia_gioco: string } | undefined)?.fascia_gioco;
  return eFascia(f) ? f : null;
}

/** Il prezzo in yen dell'offerta nella fascia (null = offerta assente o prezzo non indicato). Senza fascia nota vale `prezzo`. */
export function prezzoDellArticolo(articolo: string, fascia: FasciaPrezzo | null | undefined): number | null {
  const r = prepared(conPrezzoPerFascia() ? 'SELECT prezzo, prezzo_per_fascia_json FROM main.articolo WHERE chiave = ?' : 'SELECT prezzo, NULL AS prezzo_per_fascia_json FROM main.articolo WHERE chiave = ?')
    .get(articolo) as { prezzo: number | null; prezzo_per_fascia_json: string | null } | undefined;
  return r ? prezzoNellaFascia(r.prezzo, r.prezzo_per_fascia_json, fascia) : null;
}
