// ============================================================
// Router — route react-router v7 (createBrowserRouter)
// ============================================================
//
// Le pagine si caricano quando servono (rilievo P3" della verifica completa): prima tutte e trentanove stavano nel bundle
// iniziale, editor delle mappe, fusione e impostazioni compresi. Restano subito pronte solo la home, che è la pagina d'arrivo, e
// la pagina «non trovata». Il `Suspense` sta nel layout, attorno all'`Outlet`: la cornice dell'app c'è subito, e cambiando pagina
// React Router (che naviga in una transizione) tiene a schermo quella di prima finché la nuova non è arrivata.
// ============================================================

import { lazy, type ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

/** Una pagina caricata alla prima visita: il modulo la esporta per nome, `lazy` vuole l'export predefinito. */
function pigra<M>(carica: () => Promise<M>, nome: keyof M) {
  return lazy(async () => ({ default: (await carica())[nome] as ComponentType }));
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
const CittaPage = pigra(() => import('./pages/CittaPage'), 'CittaPage');
const MappaPage = pigra(() => import('./pages/MappaPage'), 'MappaPage');
const AccessoMondoPage = pigra(() => import('./pages/AccessoMondoPage'), 'AccessoMondoPage');
const EditorMappaPage = pigra(() => import('./pages/EditorMappaPage'), 'EditorMappaPage');
const QuartierePage = pigra(() => import('./pages/QuartierePage'), 'QuartierePage');
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
const NegozioPage = pigra(() => import('./pages/NegozioPage'), 'NegozioPage');
const RimossiPage = pigra(() => import('./pages/RimossiPage'), 'RimossiPage');
const PartitaPage = pigra(() => import('./pages/PartitaPage'), 'PartitaPage');
const ImpostazioniPage = pigra(() => import('./pages/ImpostazioniPage'), 'ImpostazioniPage');

/** Albero delle route applicative. */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <HomePage /> },
      { path: 'compendio', element: <CompendioPage /> },
      { path: 'compendio/persona/:id', element: <PersonaDettaglioPage /> },
      { path: 'compendio/glossario', element: <GlossarioPage /> },
      { path: 'skill', element: <SkillPage /> },
      { path: 'skill/:id', element: <SkillDettaglioPage /> },
      { path: 'fusione', element: <FusionePage /> },
      { path: 'partita', element: <PartitaPage /> },
      { path: 'confidenti/:chiave', element: <ConfidenteDettaglioPage /> },
      { path: 'guida', element: <GuidaPage /> },
      { path: 'guida/domande', element: <DomandePage /> },
      { path: 'guida/calendario', element: <CalendarioPage /> },
      { path: 'guida/dungeon', element: <DungeonPage /> },
      { path: 'guida/dungeon/:chiave', element: <DungeonDettaglioPage /> },
      { path: 'guida/richieste', element: <RichiestePage /> },
      { path: 'guida/battaglia', element: <BattagliaPage /> },
      { path: 'guida/mappe', element: <MappaPage /> },
      { path: 'guida/mondo/:tipo/:chiave', element: <AccessoMondoPage /> },
      { path: 'guida/mappe/:chiave', element: <MappaPage /> },
      { path: 'guida/mappe/:chiave/modifica', element: <EditorMappaPage /> },
      { path: 'guida/citta', element: <CittaPage /> },
      { path: 'guida/citta/:chiave', element: <QuartierePage /> },
      { path: 'guida/attivita', element: <AttivitaPage /> },
      { path: 'guida/libri', element: <LibriPage /> },
      { path: 'guida/film', element: <FilmPage /> },
      { path: 'guida/videogiochi', element: <VideogiochiPage /> },
      { path: 'guida/cruciverba', element: <CruciverbaPage /> },
      { path: 'guida/completamento', element: <CompletamentoPage /> },
      { path: 'guida/covo', element: <CovoPage /> },
      { path: 'guida/sfide', element: <SfidePage /> },
      { path: 'guida/personaggi', element: <PersonaggiPage /> },
      { path: 'guida/oggetti', element: <OggettiPage /> },
      { path: 'guida/percorso', element: <PercorsoPage /> },
      { path: 'guida/percorso/:data', element: <PercorsoPage /> },
      { path: 'guida/negozi', element: <NegoziPage /> },
      { path: 'guida/negozi/:chiave', element: <NegozioPage /> },
      { path: 'guida/rimossi', element: <RimossiPage /> },
      { path: 'impostazioni', element: <ImpostazioniPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
