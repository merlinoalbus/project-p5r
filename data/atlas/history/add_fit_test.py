from pathlib import Path
p=Path('C:/Repository/project-p5r-main/src/components/mappe/VisoreMappa.test.tsx')
s=p.read_text(encoding='utf-8')
s=s.replace("import { VisoreMappa } from './VisoreMappa';", "import { VisoreMappa } from './VisoreMappa';\nimport * as inquadratura from '../../utils/inquadraturaMappa';")
s+='''

it('applica l’arrivo dopo il fit definitivo senza alterare le percentuali originali', async () => {
  const misura = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 600, height: 400, x: 0, y: 0, top: 0, left: 0, right: 600, bottom: 400, toJSON: () => ({}) });
  const area = vi.spyOn(inquadratura, 'areaImmagine').mockReturnValue({ x: 100, y: 200, w: 200, h: 400 });
  try {
    const { container } = render(<MemoryRouter><VisoreMappa mappa={{ ...mappa, immagineUrl: '/fit.png', larghezza: 1000, altezza: 1000, spilli: [] }} partitaId={null} onNaviga={vi.fn()} puntoIniziale={{ x: 65, y: 35, zoom: 2.5 }} /></MemoryRouter>);
    const img = screen.getByRole('img', { name: 'Mappa: Shibuya' });
    Object.defineProperty(img, 'naturalWidth', { value: 1000 });
    Object.defineProperty(img, 'naturalHeight', { value: 1000 });
    fireEvent.load(img);
    await waitFor(() => {
      const transform = (container.querySelector('.visore-mappa__livello') as HTMLElement).style.transform;
      const match = /translate\\(([-.\\d]+)px, ([-.\\d]+)px\\) scale\\(([-.\\d]+)\\)/.exec(transform);
      expect(match).not.toBeNull();
      const [x, y, z] = match!.slice(1).map(Number);
      expect(z).toBeCloseTo(2.2);
      expect(x + 650 * z).toBeCloseTo(300);
      expect(y + 350 * z).toBeCloseTo(200);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Adatta alla finestra' }));
    await waitFor(() => expect((container.querySelector('.visore-mappa__livello') as HTMLElement).style.transform).toContain('scale(0.88)'));
  } finally { area.mockRestore(); misura.mockRestore(); }
});
'''
p.write_text(s,encoding='utf-8')
