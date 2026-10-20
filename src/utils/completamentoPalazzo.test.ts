// ============================================================
// Test completamentoPalazzo — anello e livello (concluso/completato) dai numeri del server (L4, §1.5, §8.10)
// ============================================================

import { anelloPalazzo, livelloPalazzo } from './completamentoPalazzo';

const raccolta = { totale: 107, presi: 107, mappe: 9, mappeComplete: 9 };
/** Kamoshida p1 com'è sul 3201: concluso (Tesoro e boss), 56/71 oggetti permanenti, non completato. */
const kamoshidaP1 = { nome: 'Palazzo di Kamoshida', raccolta, completato: null, concluso: 'Tesoro e boss finale',
  completamento: { oggetti: 71, fatti: 56, tesoro: true, boss: true, concluso: true, completato: false } };

it('nei Palazzi l’anello conta gli oggetti permanenti, non i collezionabili', () => {
  expect(anelloPalazzo(kamoshidaP1)).toEqual({ quota: 56 / 71, fatti: 56, totale: 71, etichetta: 'Avanzamento in Palazzo di Kamoshida: 56 oggetti permanenti fatti su 71' });
});

it('senza partita, o senza oggetti da contare, niente anello', () => {
  expect(anelloPalazzo({ ...kamoshidaP1, completamento: { ...kamoshidaP1.completamento, fatti: null } })).toBeNull();
  expect(anelloPalazzo({ ...kamoshidaP1, completamento: { ...kamoshidaP1.completamento, oggetti: 0, fatti: 0 } })).toBeNull();
});

it('nei Memento (completamento assente) l’anello resta quello degli obiettivi', () => {
  expect(anelloPalazzo({ nome: 'Memento', raccolta: { totale: 10, presi: 1, mappe: 2, mappeComplete: 1 }, completato: null, concluso: null }, true))
    .toEqual({ quota: 0.1, fatti: 1, totale: 10, etichetta: 'Avanzamento in Memento: 1 elementi fatti su 10' });
});

it('concluso ma non completato: «Concluso» con quel che manca al completamento', () => {
  expect(livelloPalazzo(kamoshidaP1)).toEqual({ testo: 'Concluso', perche: 'Tesoro e boss finale · al completamento mancano 15 oggetti permanenti' });
});

it('completato vince su concluso; né l’uno né l’altro, niente segno', () => {
  expect(livelloPalazzo({ ...kamoshidaP1, completato: 'Tesoro, boss finale e tutti gli oggetti permanenti (71/71)' }))
    .toEqual({ testo: 'Completato', perche: 'Tesoro, boss finale e tutti gli oggetti permanenti (71/71)' });
  expect(livelloPalazzo({ ...kamoshidaP1, concluso: null })).toBeNull();
});
