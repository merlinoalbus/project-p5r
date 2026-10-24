// ============================================================
// ContenutoScheda — la pagina che corrisponde a una scheda riconosciuta da `trovaScheda`
// ============================================================
//
// Lo usano il pannello sopra il diario (`PannelloScheda`) e il cassetto «Gestione del Confidente» (`SchedaNelCassetto`): in entrambi la
// pagina dell'oggetto è la stessa del menù e legge la scheda al posto dell'indirizzo vero (`SchedaCorrenteContext`).
// ============================================================

import {
  AttivitaPage, ConfidenteDettaglioPage, DungeonDettaglioPage, FilmPage, LibriPage, LuogoPage, NegozioPage, OggettoPage, RichiestePage,
} from './pagineScheda';
import type { SchedaTrovata } from '../../utils/pannelloScheda';

/** La pagina che corrisponde alla scheda: le stesse del menù; per gli elenchi, filtrate sull'elemento. */
export function ContenutoScheda({ scheda }: { scheda: SchedaTrovata }) {
  const solo = scheda.elemento ?? undefined;
  switch (scheda.tipo) {
    case 'confidente': return <ConfidenteDettaglioPage.Componente />;
    case 'dungeon': return <DungeonDettaglioPage.Componente />;
    case 'negozio': return <NegozioPage.Componente />;
    case 'luogo': return <LuogoPage.Componente />;
    case 'oggetto': return <OggettoPage.Componente />;
    case 'libro': return <LibriPage.Componente soloChiave={solo} />;
    case 'film': return <FilmPage.Componente soloChiave={solo} />;
    case 'attivita': return <AttivitaPage.Componente soloChiave={solo} />;
    case 'richiesta': return <RichiestePage.Componente soloChiave={solo} />;
  }
}
