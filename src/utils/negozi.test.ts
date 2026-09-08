// ============================================================
// Le categorie di un articolo: due elenchi che devono restare uno solo
// ============================================================
//
// La categoria di un articolo è scritta in due posti che non si vedono fra loro: l'enum di
// `server/schemas/catalogo.ts`, che decide che cosa il server accetta, e `NOME_CATEGORIA_ARTICOLO`,
// che decide che cosa il menu offre. Se divergono il difetto è silenzioso e cattivo nei due versi:
// una voce solo nel menu fa fallire il salvataggio con un errore di validazione su una scelta che
// l'app stessa proponeva; una voce solo nell'enum è una categoria che nessuno può scegliere.
//
// Aggiungerne una vuol dire toccarli tutti e due — e dare alla categoria la sua figura, che è la
// terza cosa che si dimentica: senza, la riga resta sul cartiglio rosso di riserva.

import fs from 'node:fs';
import path from 'node:path';
import { NOME_CATEGORIA_ARTICOLO } from './negozi';
import { chiaveCategoria } from './categorie';

const RADICE = path.resolve(__dirname, '../..');

/** Le categorie che il server accetta, lette dall'enum di zod nel sorgente. */
function categorieDelServer(): string[] {
  const src = fs.readFileSync(path.join(RADICE, 'server/schemas/catalogo.ts'), 'utf8');
  const blocco = src.split('categoria: z.enum([')[1]?.split('])')[0];
  if (!blocco) throw new Error('enum delle categorie non trovato in server/schemas/catalogo.ts');
  return [...blocco.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe('categorie di un articolo', () => {
  const server = categorieDelServer();

  it('il menu offre esattamente quello che il server accetta', () => {
    expect([...server].sort()).toEqual(Object.keys(NOME_CATEGORIA_ARTICOLO).sort());
  });

  it('sono più delle nove di partenza: libri, DVD, videogiochi e i consumabili distinti', () => {
    for (const c of ['libro', 'film', 'dvd', 'videogioco', 'cura', 'sp', 'battaglia', 'stato', 'esplorazione', 'oggetto-chiave']) {
      expect(server).toContain(c);
    }
  });

  it.each(categorieDelServer())('«%s» ha la sua figura consegnata', (categoria) => {
    expect(fs.existsSync(path.join(RADICE, `public/asset/ui/categoria-${chiaveCategoria(categoria)}.png`))).toBe(true);
  });

  it('ogni categoria ha un’etichetta italiana non vuota', () => {
    for (const [chiave, nome] of Object.entries(NOME_CATEGORIA_ARTICOLO)) {
      expect(nome, `etichetta mancante per ${chiave}`).toMatch(/\S/);
    }
  });
});
