// @vitest-environment jsdom
// ============================================================
// Test ImpostazioniPage — il collegamento alla documentazione delle API (Swagger e documento OpenAPI)
// ============================================================
//
// Le sezioni con dati propri (partite, caratteri, immagini, traduzioni, pacchetto, backup) hanno i loro test:
// qui sono sostituite da segnaposto vuoti, perché interessa solo la sezione della documentazione.
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ImpostazioniPage } from './ImpostazioniPage';

vi.mock('../components/impostazioni/GestionePartite', () => ({ GestionePartite: () => null }));
vi.mock('../components/impostazioni/TraduzioniEditor', () => ({ TraduzioniEditor: () => null }));
vi.mock('../components/impostazioni/CaratteriEditor', () => ({ CaratteriEditor: () => null }));
vi.mock('../components/impostazioni/ImmaginiCaricate', () => ({ ImmaginiCaricate: () => null }));
vi.mock('../components/impostazioni/BackupIstanza', () => ({ BackupIstanza: () => null }));
vi.mock('../components/impostazioni/PacchettoGioco', () => ({ PacchettoGioco: () => null }));
vi.mock('../components/impostazioni/MieiDati', () => ({ MieiDati: () => null }));

it('la sezione «Documentazione delle API» apre Swagger e il documento OpenAPI del server in una nuova scheda', () => {
  render(<MemoryRouter><ImpostazioniPage /></MemoryRouter>);
  const sezione = screen.getByRole('region', { name: 'Documentazione delle API' });
  expect(sezione).toBeTruthy();
  const docs = screen.getByRole('link', { name: /Apri la documentazione/ });
  expect(docs.getAttribute('href')).toBe('/api/docs');
  expect(docs.getAttribute('target')).toBe('_blank');
  expect(docs.getAttribute('rel')).toBe('noopener');
  const json = screen.getByRole('link', { name: /Documento OpenAPI/ });
  expect(json.getAttribute('href')).toBe('/api/openapi.json');
  expect(json.getAttribute('target')).toBe('_blank');
});
