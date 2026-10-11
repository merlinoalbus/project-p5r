// ============================================================
// Test maschere — dal nome di una maschera scritto dalla guida alla Persona del compendio
// ============================================================

import { closeDb, prepared } from '../db/dbService.js';
import { dbDiProva } from '../../test/dbDiProva.js';
import { indiceMaschere, normalizza, personaDellaMaschera } from './maschere.js';
import { invalidaCacheTraduzioni } from './traduzioniService.js';

beforeEach(() => { dbDiProva(); });
afterEach(() => closeDb());

/** L'id di una Persona del compendio dal nome canonico. */
const id = (nome: string) => prepared('SELECT id FROM persona WHERE nome = ?').pluck().get(nome) as number;

it('trova la Persona dal nome inglese o italiano, senza badare a maiuscole, accenti e punteggiatura; «Norna», la sua traduzione, vale Norn', () => {
  const idx = indiceMaschere();
  expect(personaDellaMaschera(idx, 'Pixie')).toEqual({ id: id('Pixie'), nome: 'Pixie', nomeIt: 'Pixie' });
  expect(personaDellaMaschera(idx, 'Bicorno')).toEqual({ id: id('Bicorn'), nome: 'Bicorn', nomeIt: 'Bicorno' });
  expect(personaDellaMaschera(idx, "jack-o'-LANTERN")?.id).toBe(id("Jack-o'-Lantern"));
  expect(personaDellaMaschera(idx, 'Norna')?.nome).toBe('Norn');
  expect(normalizza("Jack-o'-Lantern")).toBe('jack o lantern');
});

it('l\'alias Norna → Norn vale anche senza la traduzione italiana (la guida scriveva «Norna» prima che il compendio la avesse)', () => {
  prepared("DELETE FROM traduzione WHERE ambito = 'persona' AND chiave = 'Norn'").run();
  invalidaCacheTraduzioni();
  const idx = indiceMaschere();
  expect(idx.has('norna')).toBe(false);
  expect(personaDellaMaschera(idx, 'Norna')).toEqual({ id: id('Norn'), nome: 'Norn', nomeIt: 'Norn' });
});

it('senza una maschera che il compendio conosca non c\'è Persona', () => {
  const idx = indiceMaschere();
  for (const m of ['-', '', '   ', 'Nessuna Persona così', null, undefined, 42]) expect(personaDellaMaschera(idx, m)).toBeNull();
});
