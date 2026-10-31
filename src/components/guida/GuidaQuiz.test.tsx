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

/** L'editor con il suo stato, come nel modulo (i giorni del mese stanno nel quiz). */
function ConStato({ iniziale }: { iniziale: QuizAttivita | null }) {
  const [d, setD] = useState<{ quiz_json: QuizAttivita | null }>({ quiz_json: iniziale });
  return <><EditorQuiz quiz={d.quiz_json} onCambia={(p) => setD((x) => ({ ...x, ...p }))} /><output data-testid="stato">{JSON.stringify(d)}</output></>;
}
const stato = () => JSON.parse(screen.getByTestId('stato').textContent!) as { quiz_json: QuizAttivita | null };

describe('EditorQuiz', () => {
  it('senza guida offre di aggiungerla; con la guida si scelgono i giorni a pulsanti e si scrivono domanda, risposte e premi, e si toglie tutto', () => {
    render(<ConStato iniziale={null} />);
    fireEvent.click(screen.getByRole('button', { name: /Aggiungi la guida di un quiz/ }));
    expect(stato().quiz_json).toEqual({ giorni: [], spiegazione: '', domanda: '', voci: [{ oggetto: '', altroNome: null, risposta: '', nota: null }], esiti: [] });
    // L13 (O7-5): i giorni del mese a pulsanti 1–31, niente testo da interpretare; restano in ordine
    const giorni = screen.getByRole('group', { name: 'Giorni del mese' });
    expect(within(giorni).getAllByRole('button', { name: /^Giorno \d+$/ })).toHaveLength(31);
    expect(screen.queryByRole('textbox', { name: 'Giorni del mese' })).toBeNull();
    fireEvent.click(within(giorni).getByRole('button', { name: 'Giorno 17' }));
    fireEvent.click(within(giorni).getByRole('button', { name: 'Giorno 7' }));
    expect(within(giorni).getByRole('button', { name: 'Giorno 7' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('C’è il 7 e il 17 di ogni mese.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Domanda'), { target: { value: 'Dove?' } });
    const risposta1 = within(screen.getByRole('group', { name: 'Risposta 1' }));
    fireEvent.change(risposta1.getByLabelText('Nome'), { target: { value: 'Panda Bread' } });
    fireEvent.change(risposta1.getByLabelText('Altro nome'), { target: { value: 'BW Panda Pan' } });
    fireEvent.change(risposta1.getByLabelText('Risposta giusta'), { target: { value: 'Vicino alla coda' } });
    fireEvent.change(risposta1.getByLabelText('Nota'), { target: { value: 'Sicura' } });
    fireEvent.click(screen.getByRole('button', { name: /Aggiungi una risposta/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Togli la risposta 2' }));
    fireEvent.click(screen.getByRole('button', { name: /Aggiungi un premio/ }));
    const premio1 = within(screen.getByRole('group', { name: 'Premio 1' }));
    fireEvent.change(premio1.getByLabelText('Esito'), { target: { value: 'Perfetto' } });
    fireEvent.change(premio1.getByLabelText('Che cosa dà'), { target: { value: '7.400 ¥' } });
    expect(stato()).toEqual({
      quiz_json: { giorni: [7, 17], spiegazione: '', domanda: 'Dove?', voci: [{ oggetto: 'Panda Bread', altroNome: 'BW Panda Pan', risposta: 'Vicino alla coda', nota: 'Sicura' }], esiti: [{ esito: 'Perfetto', premio: '7.400 ¥' }] },
    });
    // un secondo tocco toglie il giorno; «Togli tutti i giorni» li toglie tutti
    fireEvent.click(within(giorni).getByRole('button', { name: 'Giorno 7' }));
    expect(stato().quiz_json!.giorni).toEqual([17]);
    fireEvent.click(screen.getByRole('button', { name: /Togli tutti i giorni/ }));
    expect(stato().quiz_json!.giorni).toEqual([]);
    // l'altro nome e la nota svuotati tornano null
    fireEvent.change(risposta1.getByLabelText('Altro nome'), { target: { value: '' } });
    fireEvent.change(risposta1.getByLabelText('Nota'), { target: { value: '' } });
    expect(stato().quiz_json!.voci[0]).toEqual({ oggetto: 'Panda Bread', altroNome: null, risposta: 'Vicino alla coda', nota: null });
    fireEvent.click(screen.getByRole('button', { name: 'Togli il premio 1' }));
    expect(stato().quiz_json!.esiti).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: /Togli la guida del quiz/ }));
    expect(stato()).toEqual({ quiz_json: null });
    expect(screen.getByRole('button', { name: /Aggiungi la guida di un quiz/ })).toBeInTheDocument();
  });
});
