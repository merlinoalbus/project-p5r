// ============================================================
// Test quizAttivita — normalizzazione, lettura, giorni del quiz
// ============================================================

import { eGiornoDelQuiz, giorniDelQuizTesto, leggiGiorniQuiz, leggiQuiz, normalizzaQuiz, LIMITI_QUIZ } from './quizAttivita';

describe('normalizzaQuiz', () => {
  it('pulisce giorni, testi, elementi ed esiti', () => {
    expect(normalizzaQuiz({
      giorni: [27, 7, 7, 0, 32, 3.5, '17'], spiegazione: '  Come funziona  ', domanda: ' Dove? ',
      voci: [{ oggetto: ' A ', altroNome: ' a ', risposta: ' r ', nota: '  ' }, { oggetto: 'B', altroNome: ' Bi ', risposta: 'q', nota: ' incerto ' }, { oggetto: 'C', risposta: '' }, null, 'x'],
      esiti: [{ esito: 'Bene', premio: '7.400 ¥' }, { esito: 'Male', premio: '' }, 3],
    })).toEqual({
      giorni: [7, 27], spiegazione: 'Come funziona', domanda: 'Dove?',
      voci: [{ oggetto: 'A', altroNome: null, risposta: 'r', nota: null }, { oggetto: 'B', altroNome: 'Bi', risposta: 'q', nota: 'incerto' }],
      esiti: [{ esito: 'Bene', premio: '7.400 ¥' }],
    });
  });
  it('null se non è un oggetto o se non resta né domanda né elemento; i testi si tagliano ai limiti', () => {
    for (const v of [null, undefined, 3, 'quiz', [], { giorni: [7] }, { voci: [{ oggetto: 'A', risposta: '' }] }]) expect(normalizzaQuiz(v)).toBeNull();
    expect(normalizzaQuiz({ domanda: 'x'.repeat(1000) })!.domanda).toHaveLength(LIMITI_QUIZ.domanda);
    expect(normalizzaQuiz({ voci: Array.from({ length: 100 }, (_, i) => ({ oggetto: `o${i}`, risposta: 'r' })) })!.voci).toHaveLength(LIMITI_QUIZ.voci);
  });
});

describe('leggiQuiz, eGiornoDelQuiz, giorniDelQuizTesto', () => {
  it('legge la colonna: vuota o illeggibile = null', () => {
    expect(leggiQuiz(null)).toBeNull();
    expect(leggiQuiz('{rotto')).toBeNull();
    expect(leggiQuiz('{"domanda":"D"}')).toEqual({ giorni: [], spiegazione: '', domanda: 'D', voci: [], esiti: [] });
  });
  it('il giorno del quiz si legge da «MM-GG»', () => {
    const q = { giorni: [7, 17, 27] };
    expect(['05-07', '05-17', '12-27'].map((g) => eGiornoDelQuiz(q, g))).toEqual([true, true, true]);
    expect(['05-23', '07-05', '05-1', ''].map((g) => eGiornoDelQuiz(q, g))).toEqual([false, false, false, false]);
  });
  it('i giorni scritti a mano: separatori liberi, ordinati, senza doppioni; null se c\'è altro', () => {
    expect(leggiGiorniQuiz('27, 7; 17  7')).toEqual([7, 17, 27]);
    expect(leggiGiorniQuiz('  ')).toEqual([]);
    for (const t of ['0', '32', '7, x', '7.5', '-3', '100']) expect(leggiGiorniQuiz(t), t).toBeNull();
  });
  it('i giorni in parole, con l\'articolo giusto', () => {
    expect(giorniDelQuizTesto([7, 17, 27])).toBe('il 7, il 17 e il 27 di ogni mese');
    expect(giorniDelQuizTesto([1, 8, 11])).toBe("l'1, l'8 e l'11 di ogni mese");
    expect(giorniDelQuizTesto([5])).toBe('il 5 di ogni mese');
    expect(giorniDelQuizTesto([])).toBe('');
  });
});
