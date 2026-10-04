// ============================================================
// Le categorie di un articolo: due elenchi che devono restare uno solo
// ============================================================
//
// L'elenco delle categorie sta in `shared/articoli.ts` (dal 2026-10-03, prima era scritto anche nello
// schema del catalogo e nella rotta della ricerca). Restano due lati che non si vedono fra loro: lo
// schema del server, che decide che cosa si accetta, e `NOME_CATEGORIA_ARTICOLO`, che decide che cosa
// il menu offre. Se divergono il difetto è silenzioso e cattivo nei due versi: una voce solo nel menu
// fa fallire il salvataggio con un errore di validazione su una scelta che l'app stessa proponeva; una
// voce solo nello schema è una categoria che nessuno può scegliere.
//
// Aggiungerne una vuol dire dare alla categoria anche la sua etichetta e la sua figura, che è la cosa
// che si dimentica: senza, la riga resta sul cartiglio rosso di riserva.

import fs from 'node:fs';
import path from 'node:path';
import { NOME_CATEGORIA_ARTICOLO } from './negozi';
import { chiaveCategoria } from './categorie';
import { CATEGORIE_ARTICOLO } from '../../shared/articoli';
import { datiArticolo } from '../../server/schemas/catalogo';

const RADICE = path.resolve(__dirname, '../..');

/** Le categorie che lo schema del catalogo accetta davvero: si prova ognuna delle note, più una che non esiste. */
function categorieDelServer(): string[] {
  const forma = datiArticolo.shape.categoria;
  const accettate = [...CATEGORIE_ARTICOLO].filter((c) => forma.safeParse(c).success);
  if (forma.safeParse('inesistente').success) throw new Error('lo schema accetta una categoria che non esiste');
  return accettate;
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
