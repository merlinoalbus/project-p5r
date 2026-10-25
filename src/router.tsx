// ============================================================
// Router — route react-router v7 (createBrowserRouter)
// ============================================================
//
// Le pagine si caricano quando servono (rilievo P3" della verifica completa): prima tutte e trentanove stavano nel bundle
// iniziale, editor delle mappe, fusione e impostazioni compresi. Restano subito pronte solo la home, che è la pagina d'arrivo, e
// la pagina «non trovata». Il `Suspense` sta nel layout, attorno all'`Outlet`: la cornice dell'app c'è subito, e cambiando pagina
// React Router (che naviga in una transizione) tiene a schermo quella di prima finché la nuova non è arrivata.
//
// UI-ASSET-01 (vecchio chunk durante il rilascio, bozze preservate): ogni pagina caricata alla prima visita ha un `loader` che scarica il
// suo file PRIMA di cambiare pagina. React Router tiene a schermo la pagina di prima finché i `loader` non finiscono: se il file non
// c'è più sul server (l'app è stata rilasciata mentre la scheda era aperta) si resta sulla pagina di prima, con le sue bozze, e compare
// la striscia «nuova versione». Il precarico in tempo morto (`tuttePrecarica`, avviato da `main.tsx`) rende rarissimo il caso.
// Le route hanno un `ErrorBoundary` in italiano: un errore di una pagina non cancella più tutto il layout.
// ============================================================

import { createBrowserRouter, Navigate, replace, type RouteObject } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { ErrorePagina } from './components/shared/ErrorePagina';
import { SchermataAvvio } from './components/shared/SchermataAvvio';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { useVersioneStore } from './stores/versioneStore';
import { eErroreDiChunk, pigra as pigraBase, senzaRete, type PaginaPigra } from './utils/pagineLazy';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** I `precarica` di tutte le pagine, nell'ordine in cui sono dichiarate: `main.tsx` li importa in tempo morto. */
const precaricamenti: Array<() => Promise<void>> = [];
export const tuttePrecarica: ReadonlyArray<() => Promise<void>> = precaricamenti;

/** Una pagina caricata alla prima visita: il modulo la esporta per nome, `lazy` vuole l'export predefinito. */
function pigra<M>(carica: () => Promise<M>, nome: keyof M): PaginaPigra {
  const p = pigraBase(carica, nome);
  precaricamenti.push(p.precarica);
  return p;
}

const CompendioPage = pigra(() => import('./pages/CompendioPage'), 'CompendioPage');
const PersonaDettaglioPage = pigra(() => import('./pages/PersonaDettaglioPage'), 'PersonaDettaglioPage');
const SkillPage = pigra(() => import('./pages/SkillPage'), 'SkillPage');
const SkillDettaglioPage = pigra(() => import('./pages/SkillDettaglioPage'), 'SkillDettaglioPage');
const GlossarioPage = pigra(() => import('./pages/GlossarioPage'), 'GlossarioPage');
const FusionePage = pigra(() => import('./pages/FusionePage'), 'FusionePage');
const ConfidenteDettaglioPage = pigra(() => import('./pages/ConfidenteDettaglioPage'), 'ConfidenteDettaglioPage');
const DomandePage = pigra(() => import('./pages/DomandePage'), 'DomandePage');
const CalendarioPage = pigra(() => import('./pages/CalendarioPage'), 'CalendarioPage');
const GuidaPage = pigra(() => import('./pages/GuidaPage'), 'GuidaPage');
const DungeonPage = pigra(() => import('./pages/DungeonPage'), 'DungeonPage');
const DungeonDettaglioPage = pigra(() => import('./pages/DungeonDettaglioPage'), 'DungeonDettaglioPage');
const RichiestePage = pigra(() => import('./pages/RichiestePage'), 'RichiestePage');
const BattagliaPage = pigra(() => import('./pages/BattagliaPage'), 'BattagliaPage');
const OmbraPage = pigra(() => import('./pages/OmbraPage'), 'OmbraPage');
const CittaPage = pigra(() => import('./pages/CittaPage'), 'CittaPage');
const MappaPage = pigra(() => import('./pages/MappaPage'), 'MappaPage');
const AccessoMondoPage = pigra(() => import('./pages/AccessoMondoPage'), 'AccessoMondoPage');
const QuartierePage = pigra(() => import('./pages/QuartierePage'), 'QuartierePage');
const LuogoPage = pigra(() => import('./pages/LuogoPage'), 'LuogoPage');
const AreaPage = pigra(() => import('./pages/AreaPage'), 'AreaPage');
const AttivitaPage = pigra(() => import('./pages/AttivitaPage'), 'AttivitaPage');
const LibriPage = pigra(() => import('./pages/LibriPage'), 'LibriPage');
const FilmPage = pigra(() => import('./pages/FilmPage'), 'FilmPage');
const VideogiochiPage = pigra(() => import('./pages/VideogiochiPage'), 'VideogiochiPage');
const CruciverbaPage = pigra(() => import('./pages/CruciverbaPage'), 'CruciverbaPage');
const NegoziPage = pigra(() => import('./pages/NegoziPage'), 'NegoziPage');
const PercorsoPage = pigra(() => import('./pages/PercorsoPage'), 'PercorsoPage');
const CompletamentoPage = pigra(() => import('./pages/CompletamentoPage'), 'CompletamentoPage');
const CovoPage = pigra(() => import('./pages/CovoPage'), 'CovoPage');
const SfidePage = pigra(() => import('./pages/SfidePage'), 'SfidePage');
const PersonaggiPage = pigra(() => import('./pages/PersonaggiPage'), 'PersonaggiPage');
const OggettiPage = pigra(() => import('./pages/OggettiPage'), 'OggettiPage');
const OggettoPage = pigra(() => import('./pages/OggettoPage'), 'OggettoPage');
const NegozioPage = pigra(() => import('./pages/NegozioPage'), 'NegozioPage');
const PartitaPage = pigra(() => import('./pages/PartitaPage'), 'PartitaPage');
const ImpostazioniPage = pigra(() => import('./pages/ImpostazioniPage'), 'ImpostazioniPage');

/**
 * Una route a pagina caricata alla prima visita: il `loader` scarica il file PRIMA di cambiare pagina. Se non arriva (errore di chunk), si
 * resta dov'eri: `throw replace(...)` verso la posizione di prima (la pagina con le sue bozze non si smonta mai) e la striscia «nuova versione».
 * Il caso senza «pagina di prima» (primo caricamento, o un Indietro del browser che ha già cambiato l'indirizzo) lo prende `ErrorePagina`.
 * `shouldRevalidate: () => false`: il `loader` non si riesegue a ogni cambio di `?query` della stessa pagina.
 */
const pagina = (path: string, p: PaginaPigra): RouteObject => ({
  path,
  element: <p.Componente />,
  shouldRevalidate: () => false,
  loader: async () => {
    try {
      await p.precarica();
      return null; // un `loader` non può restituire `undefined`
    } catch (e) {
      if (!eErroreDiChunk(e)) throw e;
      // da offline il fallimento non dice che l'app sia stata aggiornata: niente striscia «nuova versione», `ErrorePagina` dice «Sei offline»
      if (senzaRete()) throw e;
      useVersioneStore.getState().segnala('chunk');
      // durante un `loader` la posizione registrata dal router è ancora quella di prima; se anche l'indirizzo del browser è ancora quello
      // (un clic su un collegamento, non un Indietro/Avanti) si torna lì con una sostituzione, senza aggiungere voci di cronologia
      const prima = router.state.location;
      const stessa = prima.pathname === window.location.pathname && prima.search === window.location.search;
      if (stessa && router.state.initialized) throw replace(prima.pathname + prima.search + prima.hash);
      throw e;
    }
  },
});

/**
 * L12 (passo 8): l'editor delle mappe esiste solo nell'istanza di preparazione. Con `IN_RILASCIO` costante di build il ramo è `[]`: la
 * pagina (`EditorMappaPage`, 800 righe di strumenti di modifica) non entra nel bundle, non diventa un chunk e `/guida/mappe/:chiave/modifica`
 * cade nella pagina «non trovata». Il `pigra(...)` sta DENTRO il ramo perché registra il precarico (un effetto che il bundler non scarterebbe).
 */
const rotteEditorMappe: RouteObject[] = IN_RILASCIO
  ? []
  : [pagina('guida/mappe/:chiave/modifica', pigra(() => import('./pages/EditorMappaPage'), 'EditorMappaPage'))];

/** L13 (ondata 4a): l'elenco delle proposte «da completare» esiste solo nella preparazione, come l'editor delle mappe (stesso schema). */
const rotteDaCompletare: RouteObject[] = IN_RILASCIO
  ? []
  : [pagina('guida/da-completare', pigra(() => import('./pages/DaCompletarePage'), 'DaCompletarePage'))];

/** Albero delle route applicative. */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    HydrateFallback: SchermataAvvio,
    ErrorBoundary: ErrorePagina,
    children: [
      {
        // route senza percorso: l'`ErrorBoundary` sta DENTRO `MainLayout`, così l'errore di una pagina lascia menu e barra e si può andare altrove
        ErrorBoundary: ErrorePagina,
        children: [
          { index: true, element: <Navigate to="/home" replace /> },
          { path: 'home', element: <HomePage /> },
          pagina('compendio', CompendioPage),
          pagina('compendio/persona/:id', PersonaDettaglioPage),
          pagina('compendio/glossario', GlossarioPage),
          pagina('skill', SkillPage),
          pagina('skill/:id', SkillDettaglioPage),
          pagina('fusione', FusionePage),
          pagina('partita', PartitaPage),
          pagina('confidenti/:chiave', ConfidenteDettaglioPage),
          // R9-09/3: «i Confidenti» (il link del pin Confidente non ancora collegato) porta all'elenco che già c'è, i Personaggi, che aprono la scheda: nessuna pagina nuova
          { path: 'confidenti', element: <Navigate to="/guida/personaggi" replace /> },
          pagina('guida', GuidaPage),
          pagina('guida/domande', DomandePage),
          pagina('guida/calendario', CalendarioPage),
          pagina('guida/dungeon', DungeonPage),
          // L8 (R8-16): Iweleth esiste solo come dedalo dei Memento; gli indirizzi di prima portano lì (la scheda del Palazzo resta come archivio delle planimetrie)
          { path: 'guida/dungeon/iweleth', element: <Navigate to="/guida/dungeon/mementos?area=mementos-08-iweleth" replace /> },
          { path: 'guida/dungeon/iweleth/area/:slug', element: <Navigate to="/guida/dungeon/mementos?area=mementos-08-iweleth" replace /> },
          pagina('guida/dungeon/:chiave', DungeonDettaglioPage),
          // L3: la casa di un'Area del Palazzo è la scheda stessa, con l'area aperta (`?infiltrazione=`, `?planimetria=`, `?spillo=`…)
          pagina('guida/dungeon/:chiave/area/:slug', DungeonDettaglioPage),
          pagina('guida/richieste', RichiestePage),
          pagina('guida/battaglia', BattagliaPage),
          pagina('guida/ombra/:chiave', OmbraPage),
          pagina('guida/mappe', MappaPage),
          pagina('guida/mondo/:tipo/:chiave', AccessoMondoPage),
          pagina('guida/mappe/:chiave', MappaPage),
          ...rotteEditorMappe,
          ...rotteDaCompletare,
          pagina('guida/citta', CittaPage),
          pagina('guida/citta/:chiave', QuartierePage),
          // L2: la pagina di un'Area del mondo (e delle aree della città: `tokyo` come contenitore)
          pagina('guida/citta/:chiave/:area', AreaPage),
          pagina('guida/attivita', AttivitaPage),
          pagina('guida/libri', LibriPage),
          pagina('guida/film', FilmPage),
          pagina('guida/videogiochi', VideogiochiPage),
          pagina('guida/cruciverba', CruciverbaPage),
          pagina('guida/completamento', CompletamentoPage),
          pagina('guida/covo', CovoPage),
          pagina('guida/sfide', SfidePage),
          pagina('guida/personaggi', PersonaggiPage),
          pagina('guida/oggetti', OggettiPage),
          pagina('guida/oggetto/:categoria/:slug', OggettoPage),
          pagina('guida/percorso', PercorsoPage),
          pagina('guida/percorso/:data', PercorsoPage),
          pagina('guida/negozi', NegoziPage),
          pagina('guida/negozi/:chiave', NegozioPage),
          // L5: la pagina del luogo, fonte unica di orari, presenza, negozi e pin
          pagina('guida/luogo/:quartiere/:luogo', LuogoPage),
          // R10-23/4: i «Rimossi» sono ora i «Nascosti dalla guida» del Cestino, in Impostazioni (il vecchio indirizzo porta lì)
          { path: 'guida/rimossi', element: <Navigate to="/impostazioni#nascosti" replace /> },
          pagina('impostazioni', ImpostazioniPage),
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
