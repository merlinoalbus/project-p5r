// ============================================================
// Router — route react-router v7 (createBrowserRouter)
// ============================================================

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/HomePage';
import { CompendioPage } from './pages/CompendioPage';
import { PersonaDettaglioPage } from './pages/PersonaDettaglioPage';
import { SkillPage } from './pages/SkillPage';
import { SkillDettaglioPage } from './pages/SkillDettaglioPage';
import { GlossarioPage } from './pages/GlossarioPage';
import { FusionePage } from './pages/FusionePage';
import { ConfidenteDettaglioPage } from './pages/ConfidenteDettaglioPage';
import { DomandePage } from './pages/DomandePage';
import { CalendarioPage } from './pages/CalendarioPage';
import { GuidaPage } from './pages/GuidaPage';
import { DungeonPage } from './pages/DungeonPage';
import { DungeonDettaglioPage } from './pages/DungeonDettaglioPage';
import { RichiestePage } from './pages/RichiestePage';
import { BattagliaPage } from './pages/BattagliaPage';
import { CittaPage } from './pages/CittaPage';
import { QuartierePage } from './pages/QuartierePage';
import { AttivitaPage } from './pages/AttivitaPage';
import { CruciverbaPage } from './pages/CruciverbaPage';
import { NegoziPage } from './pages/NegoziPage';
import { PercorsoPage } from './pages/PercorsoPage';
import { CompletamentoPage } from './pages/CompletamentoPage';
import { NegozioPage } from './pages/NegozioPage';
import { PartitaPage } from './pages/PartitaPage';
import { ImpostazioniPage } from './pages/ImpostazioniPage';
import { NotFoundPage } from './pages/NotFoundPage';

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
      { path: 'guida/citta', element: <CittaPage /> },
      { path: 'guida/citta/:chiave', element: <QuartierePage /> },
      { path: 'guida/attivita', element: <AttivitaPage /> },
      { path: 'guida/cruciverba', element: <CruciverbaPage /> },
      { path: 'guida/completamento', element: <CompletamentoPage /> },
      { path: 'guida/percorso', element: <PercorsoPage /> },
      { path: 'guida/percorso/:data', element: <PercorsoPage /> },
      { path: 'guida/negozi', element: <NegoziPage /> },
      { path: 'guida/negozi/:chiave', element: <NegozioPage /> },
      { path: 'impostazioni', element: <ImpostazioniPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
