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
      { path: 'impostazioni', element: <ImpostazioniPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
