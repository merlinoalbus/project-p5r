/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test MappaInterattiva — spilli visibili/nascosti, selezione, zoom, posizionamento con un tocco
// ============================================================

import { fireEvent, render, screen } from '@testing-library/react';
import { MappaInterattiva } from './MappaInterattiva';
import type { PuntoInteresseDto } from '../../types';

const punto = (chiave: string, tipo: PuntoInteresseDto['tipo'], extra: Partial<PuntoInteresseDto> = {}): PuntoInteresseDto => ({ chiave, ordine: 0, tipo, nome: `Punto ${chiave}`, descrizione: '', esauribile: true, dettagli: {}, fonte: '', stato: null, marcatore: { x: 50, y: 50 }, ...extra });

describe('MappaInterattiva', () => {
  it('mostra solo gli spilli fissati e non gestiti, seleziona al tocco, nasconde/mostra i gestiti', () => {
    const onSeleziona = vi.fn();
    const { rerender } = render(<MappaInterattiva src="mappa.png" punti={[punto('a/0', 'forziere'), punto('a/1', 'sicura', { stato: 'ottenuto' }), punto('a/2', 'boss', { marcatore: null })]} selezionato={null} onSeleziona={onSeleziona} posizionamento={false} onPosiziona={vi.fn()} mostraGestiti={false} />);
    expect(screen.getByRole('button', { name: 'Forziere: Punto a/0' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sicura/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Boss/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Forziere: Punto a/0' }));
    expect(onSeleziona).toHaveBeenCalledWith('a/0');
    rerender(<MappaInterattiva src="mappa.png" punti={[punto('a/0', 'forziere'), punto('a/1', 'sicura', { stato: 'ottenuto' })]} selezionato="a/0" onSeleziona={onSeleziona} posizionamento={false} onPosiziona={vi.fn()} mostraGestiti />);
    expect(screen.getByRole('button', { name: 'Sicura: Punto a/1' })).toBeInTheDocument();
    expect(screen.getByText('Punto a/0')).toBeInTheDocument(); // etichetta del selezionato
  });

  it('zoom con i pulsanti e posizionamento con un tocco in percentuale dell\'immagine', () => {
    const onPosiziona = vi.fn();
    render(<MappaInterattiva src="mappa.png" punti={[punto('a/0', 'forziere', { marcatore: null })]} selezionato="a/0" onSeleziona={vi.fn()} posizionamento onPosiziona={onPosiziona} mostraGestiti={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ingrandisci' }));
    expect(screen.getByText(/Zoom 125%/)).toBeInTheDocument();
    const mappa = screen.getByRole('application', { name: "Mappa dell'area" });
    const img = mappa.querySelector('img')!;
    img.getBoundingClientRect = () => ({ left: 100, top: 100, width: 200, height: 100, right: 300, bottom: 200, x: 100, y: 100, toJSON: () => ({}) });
    mappa.setPointerCapture = () => undefined;
    fireEvent.pointerDown(mappa, { clientX: 150, clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(mappa, { clientX: 150, clientY: 150, pointerId: 1 });
    expect(onPosiziona).toHaveBeenCalledWith('a/0', 25, 50);
  });
});
