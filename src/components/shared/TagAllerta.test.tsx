/** @vitest-environment jsdom */
// ============================================================
// Test TagAllerta — il tag dell'allerta meteo di una giornata: nome, fascia sola, effetti nel suggerimento (2026-10-12)
// ============================================================

import { render } from '@testing-library/react';
import { TagAllerte } from './TagAllerta';
import type { AllertaGiornoDto } from '../../types';

const calore: AllertaGiornoDto = { chiave: 'ondata-di-calore', nome: 'Ondata di calore', effetti: ['I distributori automatici restano senza bevande.'], fasce: ['giorno'], modificata: false };
const torrida: AllertaGiornoDto = { chiave: 'notte-torrida', nome: 'Notte torrida', effetti: ['I distributori automatici restano senza bevande.'], fasce: ['sera'], modificata: false };
const gelo: AllertaGiornoDto = { chiave: 'ondata-di-gelo', nome: 'Ondata di gelo', effetti: ['Le Ombre possono essere afflitte da Congelamento.'], fasce: ['giorno', 'sera'], modificata: false };

it('un tag per allerta: nome, la fascia se è una sola, gli effetti nel suggerimento; letto come «Allerta meteo»', () => {
  const { container } = render(<div><TagAllerte allerte={[torrida, calore, gelo]} /></div>);
  const tag = [...container.querySelectorAll('.chip--allerta')];
  expect(tag.map((t) => t.textContent)).toEqual([
    'Allerta meteo: Notte torrida · solo di sera', 'Allerta meteo: Ondata di calore · solo di giorno', 'Allerta meteo: Ondata di gelo']);
  // a schermo «Allerta meteo:» e «solo di» non si vedono: sono per i lettori di schermo
  expect(tag[0].querySelectorAll('.sr-only')).toHaveLength(2);
  expect(tag[2].querySelectorAll('.sr-only')).toHaveLength(1);
  expect(tag[0]).toHaveAttribute('title', 'Notte torrida (solo di sera): I distributori automatici restano senza bevande.');
  expect(tag[2]).toHaveAttribute('title', 'Ondata di gelo: Le Ombre possono essere afflitte da Congelamento.');
  // il tag non si tocca (scelta «Solo il nome»)
  expect(container.querySelector('button, a')).toBeNull();
});

it('senza allerte nessun tag', () => {
  const { container } = render(<div><TagAllerte allerte={[]} /></div>);
  expect(container.querySelector('.chip--allerta')).toBeNull();
});
