// @vitest-environment jsdom
// ============================================================
// Test GuidaQuiz — la guida del quiz (il Triple Seven), il pulsante che la apre, il cartellino sulla voce del diario, l'editor
// ============================================================

import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GuidaQuiz, PulsanteGuidaQuiz } from './GuidaQuiz';
import { CartelliniAzione, type AzioneMostrata } from './PartiAzione';
import { EditorQuiz } from './EditorQuiz';
import type { QuizAttivita } from '../../../shared/quizAttivita';
import type { QuizVoceDto } from '../../types';

const QUIZ: QuizAttivita = {
  giorni: [7, 17, 27], spiegazione: 'Memorizza dove sta il codice.', domanda: 'Dove si trova il codice a barre di…?',
  voci: [
    { oggetto: 'Black Donuts', altroNome: 'Black Donut', risposta: 'Vicino alla descrizione dello zucchero di canna', nota: null },
    { oggetto: 'Boy Chance', altroNome: 'Black Box o Shonen Trip', risposta: 'Sul retro, sul logo dell’azienda', nota: 'Abbinamento incerto: nella guida italiana è «Black Box» o «Shonen Trip».' },
    { oggetto: 'Cow’s Milk', altroNome: 'Cow Milk', risposta: 'Accanto al logo dell’azienda', nota: null },
    { oggetto: 'Edo Rice Balls', altroNome: 'Edo Rice Ball', risposta: 'Sul retro', nota: null },
    { oggetto: 'Panda Bread', altroNome: 'BW Panda Pan', risposta: 'Vicino alla coda', nota: null },
    { oggetto: 'Skeleton Umbrella', altroNome: null, risposta: 'Dietro il manico', nota: null },
    { oggetto: 'Zebramen', altroNome: 'Zebra Ramen', risposta: 'Vicino alle informazioni sulla zebra', nota: null },
  ],
  esiti: [{ esito: 'Giusta al primo tentativo', premio: '7.400 ¥ e 3 punti Fascino' }, { esito: 'Due errori', premio: '3.500 ¥ e 2 punti Fascino' }],
};
const VOCE: QuizVoceDto = { attivita: 'lavoro-triple-seven', nome: 'Commesso al Triple Seven', quiz: QUIZ, oggi: false };

describe('GuidaQuiz', () => {
  it('dice quando, come funziona, la domanda, ogni risposta con i due nomi, la nota sempre visibile e i premi', () => {
    render(<GuidaQuiz quiz={QUIZ} />);
    expect(screen.getByText(/il 7, il 17 e il 27 di ogni mese/)).toBeInTheDocument();
    expect(screen.getByText(/Memorizza dove sta il codice\./)).toBeInTheDocument();
    expect(screen.getByText('«Dove si trova il codice a barre di…?»')).toBeInTheDocument();
    const risposte = within(screen.getByRole('region', { name: 'Risposte' })).getAllByRole('listitem');
    expect(risposte).toHaveLength(7);
    expect(risposte[0]).toHaveTextContent('Black Donutsanche «Black Donut»Vicino alla descrizione dello zucchero di canna');
    expect(risposte[1]).toHaveTextContent('Abbinamento incerto');
    // senza altro nome non c'è «anche»
    expect(risposte[5]).not.toHaveTextContent('anche');
    expect(within(screen.getByRole('region', { name: 'Premi' })).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Giusta al primo tentativo: 7.400 ¥ e 3 punti Fascino', 'Due errori: 3.500 ¥ e 2 punti Fascino']);
    expect(screen.queryByText('Oggi c’è il quiz')).toBeNull();
  });

  it('la ricerca trova per nome della guida, per altro nome e per risposta; senza risultati lo dice', () => {
    render(<GuidaQuiz quiz={QUIZ} oggi />);
    expect(screen.getByText('Oggi c’è il quiz')).toBeInTheDocument();
    const cerca = screen.getByRole('searchbox', { name: 'Cerca prodotto o risposta' });
    const elenco = () => within(screen.getByRole('region', { name: 'Risposte' })).queryAllByRole('listitem').map((li) => li.querySelector('strong')!.textContent);
    fireEvent.change(cerca, { target: { value: 'zebra ramen' } });
    expect(elenco()).toEqual(['Zebramen']);
    fireEvent.change(cerca, { target: { value: 'black box' } });
    expect(elenco()).toEqual(['Boy Chance']);
    fireEvent.change(cerca, { target: { value: 'manico' } });
    expect(elenco()).toEqual(['Skeleton Umbrella']);
    fireEvent.change(cerca, { target: { value: 'nessuno così' } });
    expect(screen.getByText('Nessun elemento corrisponde a «nessuno così».')).toBeInTheDocument();
  });

  it('con pochi elementi la ricerca non c\'è', () => {
    render(<GuidaQuiz quiz={{ ...QUIZ, voci: QUIZ.voci.slice(0, 3) }} />);
    expect(screen.queryByRole('searchbox')).toBeNull();
  });
});

describe('PulsanteGuidaQuiz e cartellino della voce', () => {
  it('apre la guida in una finestra e la richiude; in oro nei giorni del quiz', () => {
    const { rerender } = render(<PulsanteGuidaQuiz voce={VOCE} />);
    const pulsante = screen.getByRole('button', { name: 'Guida del quiz: Commesso al Triple Seven' });
    expect(pulsante).toHaveTextContent('Guida del quiz');
    expect(pulsante).toHaveClass('btn-secondary');
    fireEvent.click(pulsante);
    const finestra = screen.getByRole('dialog', { name: 'Guida del quiz — Commesso al Triple Seven' });
    expect(within(finestra).getByText('Zebramen')).toBeInTheDocument();
    fireEvent.click(within(finestra).getByRole('button', { name: 'Chiudi' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<PulsanteGuidaQuiz voce={{ ...VOCE, oggi: true }} />);
    const oro = screen.getByRole('button', { name: 'Guida del quiz: Commesso al Triple Seven (oggi c’è il quiz)' });
    expect(oro).toHaveTextContent('oggi c’è il quiz');
    expect(oro).toHaveClass('btn-primary');
  });

  it('il cartellino della voce che registra il turno apre la guida; una voce senza quiz non ne ha', () => {
    const base: AzioneMostrata = { azione: 'Lavora al Triple Seven', tipo: 'lavoro', riferimento: { tipo: 'negozio', chiave: 'triple-seven' }, riferimentoTesto: 'Triple Seven', rangoAtteso: null, note: null, produceTesto: ['Turno: Commesso al Triple Seven'], fatta: false, effetti: null, stato: null, mappa: null };
    const { rerender } = render(<MemoryRouter><CartelliniAzione a={{ ...base, quiz: [VOCE] }} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Guida del quiz: Commesso al Triple Seven' }));
    expect(screen.getByRole('dialog', { name: 'Guida del quiz — Commesso al Triple Seven' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    rerender(<MemoryRouter><CartelliniAzione a={{ ...base, quiz: [] }} /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /Guida del quiz/ })).toBeNull();
    rerender(<MemoryRouter><CartelliniAzione a={base} /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /Guida del quiz/ })).toBeNull();
  });
});

/** L'editor con il suo stato, come nel modulo (quiz e giorni scritti a mano). */
function ConStato({ iniziale, giorni = '' }: { iniziale: QuizAttivita | null; giorni?: string }) {
  const [d, setD] = useState<{ quiz_json: QuizAttivita | null; _giorniQuiz: string }>({ quiz_json: iniziale, _giorniQuiz: giorni });
  return <><EditorQuiz quiz={d.quiz_json} giorni={d._giorniQuiz} onCambia={(p) => setD((x) => ({ ...x, ...p }))} /><output data-testid="stato">{JSON.stringify(d)}</output></>;
}
const stato = () => JSON.parse(screen.getByTestId('stato').textContent!) as { quiz_json: QuizAttivita | null; _giorniQuiz: string };

describe('EditorQuiz', () => {
  it('senza guida offre di aggiungerla; con la guida si scrivono giorni, domanda, risposte e premi, e si toglie tutto', () => {
    render(<ConStato iniziale={null} />);
    fireEvent.click(screen.getByRole('button', { name: /Aggiungi la guida di un quiz/ }));
    expect(stato().quiz_json).toEqual({ giorni: [], spiegazione: '', domanda: '', voci: [{ oggetto: '', altroNome: null, risposta: '', nota: null }], esiti: [] });
    fireEvent.change(screen.getByLabelText('Giorni del mese'), { target: { value: '7, 40' } });
    expect(screen.getByText('Scrivi solo giorni del mese, da 1 a 31, separati da virgole.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Giorni del mese'), { target: { value: '7, 17' } });
    expect(screen.getByText('Vuoto se il quiz non ha giorni fissi')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Domanda'), { target: { value: 'Dove?' } });
    fireEvent.change(screen.getByLabelText('Nome della risposta 1'), { target: { value: 'Panda Bread' } });
    fireEvent.change(screen.getByLabelText('Altro nome della risposta 1'), { target: { value: 'BW Panda Pan' } });
    fireEvent.change(screen.getByLabelText('Risposta 1'), { target: { value: 'Vicino alla coda' } });
    fireEvent.change(screen.getByLabelText('Nota della risposta 1'), { target: { value: 'Sicura' } });
    fireEvent.click(screen.getByRole('button', { name: /Aggiungi una risposta/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Togli la risposta 2' }));
    fireEvent.click(screen.getByRole('button', { name: /Aggiungi un premio/ }));
    fireEvent.change(screen.getByLabelText('Esito 1'), { target: { value: 'Perfetto' } });
    fireEvent.change(screen.getByLabelText('Premio 1'), { target: { value: '7.400 ¥' } });
    expect(stato()).toEqual({
      _giorniQuiz: '7, 17',
      quiz_json: { giorni: [], spiegazione: '', domanda: 'Dove?', voci: [{ oggetto: 'Panda Bread', altroNome: 'BW Panda Pan', risposta: 'Vicino alla coda', nota: 'Sicura' }], esiti: [{ esito: 'Perfetto', premio: '7.400 ¥' }] },
    });
    // l'altro nome e la nota svuotati tornano null
    fireEvent.change(screen.getByLabelText('Altro nome della risposta 1'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Nota della risposta 1'), { target: { value: '' } });
    expect(stato().quiz_json!.voci[0]).toEqual({ oggetto: 'Panda Bread', altroNome: null, risposta: 'Vicino alla coda', nota: null });
    fireEvent.click(screen.getByRole('button', { name: 'Togli il premio 1' }));
    expect(stato().quiz_json!.esiti).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: /Togli la guida del quiz/ }));
    expect(stato()).toEqual({ quiz_json: null, _giorniQuiz: '' });
    expect(screen.getByRole('button', { name: /Aggiungi la guida di un quiz/ })).toBeInTheDocument();
  });
});
