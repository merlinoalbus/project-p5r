/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test CondizioniEditor — stato → operatore → valori, blocchi E / O / NON, elenchi chiusi con ricerca
// ============================================================

import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { CondizioniEditor } from './CondizioniEditor';
import type { RequisitoSpillo } from '../../../shared/condizioniSpillo';

vi.mock('../../services/api/condizioni', () => ({
  getElenchiRegole: vi.fn(async () => ({
    articoli: [{ chiave: 'untouchable/pistola', nome: 'Pistola', gruppo: 'Untouchable' }],
    letture: [{ chiave: 'spadaccino-provetto', nome: 'Spadaccino provetto', categoria: 'libro' }, { chiave: 'dvd-x', nome: 'Un film', categoria: 'film' }],
    arcani: [{ chiave: 'Fool', nome: 'Fool' }], persone: [{ chiave: 'Pixie', nome: 'Pixie' }], abilita: [{ chiave: 'Dia', nome: 'Dia' }],
    squadra: [{ chiave: 'ann', nome: 'Ann Takamaki' }, { chiave: 'ryuji', nome: 'Ryuji Sakamoto' }],
    attivita: [{ chiave: 'biliardo', nome: 'Biliardo' }, { chiave: 'freccette', nome: 'Freccette' }],
    negozi: [{ chiave: 'tanaka-affari-loschi', nome: 'Tanaka' }],
    eventi: [{ chiave: 'mansarda-pulita', nome: 'Mansarda del Leblanc pulita' }],
    contatori: [{ chiave: 'film-completati', nome: 'Film o DVD completati' }],
  })),
}));
vi.mock('../../services/api/compendio', () => ({
  getConfidenti: vi.fn(async () => [{ chiave: 'sojiro', nome: 'Sojiro Sakura', arcana: 'Hierophant' }, { chiave: 'ann', nome: 'Ann Takamaki', arcana: 'Lovers' }]),
  getQuartieri: vi.fn(async () => [{ chiave: 'akihabara', nome: 'Akihabara', sbloccoData: '08-31' }, { chiave: 'ueno', nome: 'Ueno', sbloccoData: null }]),
  getRichieste: vi.fn(async () => ({ richieste: [{ chiave: 'lo-zio-ingordo', nome: 'Lo zio ingordo' }] })),
  getDungeons: vi.fn(async () => [{ chiave: 'kamoshida', nome: 'Palazzo di Kamoshida', tipo: 'palazzo' }, { chiave: 'madarame', nome: 'Palazzo di Madarame', tipo: 'palazzo' }]),
}));

/** L'editor dentro uno stato vero, così ogni cambio si vede nel DOM come succede nelle pagine. */
function Prova({ iniziali = [], onCambia }: { iniziali?: RequisitoSpillo[]; onCambia?: (c: RequisitoSpillo[]) => void }) {
  const [c, setC] = useState<RequisitoSpillo[]>(iniziali);
  return <CondizioniEditor condizioni={c} onCambia={(n) => { setC(n); onCambia?.(n); }} />;
}
const scegli = (ambito: ReturnType<typeof within>, etichetta: string, voce: string | RegExp) => {
  fireEvent.click(ambito.getByRole('button', { name: etichetta }));
  fireEvent.click(ambito.getByRole('option', { name: voce }).querySelector('button')!);
};

describe('CondizioniEditor', () => {
  it('parte chiuso e vuoto; «+ condizione» crea una riga già valida e ogni cambio produce la condizione nuova', async () => {
    const onCambia = vi.fn();
    render(<Prova onCambia={onCambia} />);
    expect(screen.getByText('nessuna: sempre disponibile')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Condizioni/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'condizione' }));
    expect(onCambia).toHaveBeenLastCalledWith([{ tipo: 'data', dal: '04-18' }]);
    const riga = within(screen.getByRole('group', { name: 'Condizione: dal 18 aprile' }));
    // l'operatore cambia il tipo: «solo il» è un periodo di un giorno
    fireEvent.change(riga.getByLabelText('Operatore'), { target: { value: 'il' } });
    expect(onCambia).toHaveBeenLastCalledWith([{ tipo: 'intervallo', dal: '04-18', al: '04-18' }]);
  });

  it('lo stato si sceglie da un elenco con ricerca e i valori dagli elenchi della Guida: Confidente con rango a passi', async () => {
    const onCambia = vi.fn();
    render(<Prova iniziali={[{ tipo: 'data', dal: '04-18' }]} onCambia={onCambia} />);
    const riga = within(await screen.findByRole('group', { name: 'Condizione: dal 18 aprile' }));
    fireEvent.click(riga.getByRole('button', { name: 'Stato' }));
    fireEvent.change(riga.getByLabelText('Cerca Stato'), { target: { value: 'confid' } });
    expect(within(riga.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Confidente']);
    fireEvent.click(riga.getByRole('option', { name: 'Confidente' }).querySelector('button')!);
    expect(onCambia).toHaveBeenLastCalledWith([{ tipo: 'confidente', confidente: 'sojiro', rango: 1 }]);
    const nuova = within(screen.getByRole('group', { name: 'Condizione: Rango Confidente Sojiro Sakura 1' }));
    fireEvent.click(nuova.getByRole('button', { name: 'Rango: più' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rango: più' }));
    expect(onCambia).toHaveBeenLastCalledWith([{ tipo: 'confidente', confidente: 'sojiro', rango: 3 }]);
    scegli(within(screen.getByRole('group', { name: 'Condizione: Rango Confidente Sojiro Sakura 3' })), 'Confidente', /Ann Takamaki/);
    expect(onCambia).toHaveBeenLastCalledWith([{ tipo: 'confidente', confidente: 'ann', rango: 3 }]);
    // e mai un campo di testo libero: dentro la riga l'unico input è la ricerca, che non è un valore
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  });

  it('NON, gruppi TUTTE / ALMENO UNA annidati, cambio di modo, rimozione', async () => {
    const onCambia = vi.fn();
    render(<Prova iniziali={[{ tipo: 'evento', evento: 'mansarda-pulita' }]} onCambia={onCambia} />);
    const riga = within(await screen.findByRole('group', { name: 'Condizione: Mansarda del Leblanc pulita' }));
    fireEvent.click(riga.getByRole('button', { name: 'NON' }));
    expect(onCambia).toHaveBeenLastCalledWith([{ tipo: 'non', condizione: { tipo: 'evento', evento: 'mansarda-pulita' } }]);
    fireEvent.click(screen.getByRole('button', { name: 'gruppo ALMENO UNA' }));
    expect(onCambia).toHaveBeenLastCalledWith([{ tipo: 'non', condizione: { tipo: 'evento', evento: 'mansarda-pulita' } }, { tipo: 'gruppo', modo: 'almeno-una', condizioni: [{ tipo: 'data', dal: '04-18' }] }]);
    const gruppo = within(screen.getByRole('group', { name: 'Gruppo ALMENO UNA' }));
    fireEvent.click(gruppo.getByRole('button', { name: 'gruppo TUTTE' }));
    expect(screen.getByRole('group', { name: 'Gruppo TUTTE' })).toBeInTheDocument();
    fireEvent.click(gruppo.getByRole('button', { name: /^ALMENO UNA/ }));
    expect(onCambia.mock.calls.at(-1)![0][1].modo).toBe('tutte');
    // negare un gruppo lo avvolge in NON; togliere l'ultima riga di un gruppo toglie il gruppo
    const tutte = within(screen.getAllByRole('group', { name: 'Gruppo TUTTE' })[0]);
    fireEvent.click(tutte.getAllByRole('button', { name: 'NON' })[0]);
    expect(onCambia.mock.calls.at(-1)![0][1].tipo).toBe('non');
    // il pulsante del gruppo esterno (negato) viene prima, nella sua testa, di quello del gruppo annidato
    fireEvent.click(within(screen.getByRole('group', { name: 'Gruppo NON TUTTE' })).getAllByRole('button', { name: 'Togli il gruppo' })[0]);
    expect(onCambia).toHaveBeenLastCalledWith([{ tipo: 'non', condizione: { tipo: 'evento', evento: 'mansarda-pulita' } }]);
    fireEvent.click(screen.getByRole('button', { name: 'Togli la condizione: Mansarda del Leblanc pulita' }));
    expect(onCambia).toHaveBeenLastCalledWith([]);
  });

  it('gli stati con più campi: attività con volte, grado cliente di un negozio, Persona con abilità', async () => {
    const onCambia = vi.fn();
    render(<Prova iniziali={[{ tipo: 'data', dal: '04-18' }]} onCambia={onCambia} />);
    const riga = () => within(screen.getAllByRole('group', { name: /^Condizione:/ })[0]);
    await screen.findByRole('group', { name: 'Condizione: dal 18 aprile' });
    scegli(riga(), 'Stato', 'Attività');
    expect(onCambia).toHaveBeenLastCalledWith([{ tipo: 'attivita', attivita: 'biliardo', volte: 1 }]);
    scegli(riga(), 'Attività', 'Freccette');
    fireEvent.click(riga().getByRole('button', { name: 'Volte: più' }));
    expect(onCambia).toHaveBeenLastCalledWith([{ tipo: 'attivita', attivita: 'freccette', volte: 2 }]);
    scegli(riga(), 'Stato', 'Grado cliente');
    expect(onCambia).toHaveBeenLastCalledWith([{ tipo: 'rango-cliente', negozio: 'tanaka-affari-loschi', rango: 'nero' }]);
    scegli(riga(), 'Grado', /Caos/);
    expect(onCambia).toHaveBeenLastCalledWith([{ tipo: 'rango-cliente', negozio: 'tanaka-affari-loschi', rango: 'caos' }]);
    scegli(riga(), 'Stato', 'Persona con abilità');
    expect(onCambia).toHaveBeenLastCalledWith([{ tipo: 'persona-abilita', persona: 'Pixie', abilita: 'Dia' }]);
  });
});
