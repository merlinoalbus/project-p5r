/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test VisoreMappa — spilli con icona, raccolti nascosti, categorie, popup ancorato, scheda del negozio, navigazione (Fase 13.2)
// ============================================================

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VisoreMappa } from './VisoreMappa';
import * as inquadratura from '../../utils/inquadraturaMappa';
import type { MappaDto, SpilloDto } from '../../types';

function spillo(extra: Partial<SpilloDto> & { id: number; nome: string; tipo: SpilloDto['tipo'] }): SpilloDto {
  return { mappaChiave: 'citta-shibuya', tipoNome: extra.tipo, colore: '#abc', descrizione: '', x: 50, y: 50, riferimento: null, collezionabile: false, ordine: 0, origine: 'seed', raccolto: false, dettaglio: null, condizioni: [], immagini: [], updatedAt: '2026-09-04T00:00:00.000Z', ...extra };
}

const mappa: MappaDto = {
  chiave: 'citta-shibuya', nome: 'Shibuya', nomeRivisto: false, tipo: 'quartiere', genitore: 'tokyo', genitoreNome: 'Tokyo', ordine: 1, immagineUrl: null, asset: null, entita: { tipo: 'quartiere', chiave: 'shibuya' }, origine: 'seed',
  numeroSpilli: 4, numeroFigli: 1, updatedAt: '2026-09-04T00:00:00.000Z', larghezza: 1000, altezza: 500, note: '',
  percorso: [{ chiave: 'tokyo', nome: 'Tokyo' }, { chiave: 'citta-shibuya', nome: 'Shibuya' }], arrivi: [],
  figli: [{ chiave: 'shibuya-centro', nome: 'Shibuya centro', nomeRivisto: false, tipo: 'luogo', genitore: 'citta-shibuya', ordine: 0, immagineUrl: null, asset: null, entita: null, origine: 'utente', numeroSpilli: 0, numeroFigli: 0, updatedAt: '' }],
  spilli: [
    spillo({ id: 1, nome: 'Untouchable', tipo: 'negozio', tipoNome: 'Negozio', x: 20, y: 20, riferimento: { tipo: 'luogo', chiave: 'shibuya/untouchable' }, dettaglio: { tipo: 'luogo', luogo: { chiave: 'shibuya/untouchable', quartiere: 'shibuya', tipo: 'negozio', nome: 'Untouchable', cosaOffre: 'Armi e munizioni', quando: null }, negozio: { chiave: 'untouchable', nome: 'Untouchable', tipo: 'armi', disponibilita: { stato: 'disponibile', requisiti: [] }, articoli: [{ chiave: 'a1', nome: 'Pistola modello Tkachev', categoria: 'arma', prezzo: 12000, disponibileDal: null, comprato: false, disponibilita: { stato: 'disponibile', requisiti: [] } }, { chiave: 'a2', nome: 'Fucile a pompa Governor', categoria: 'arma', prezzo: 48000, disponibileDal: 'dal 18 giugno', comprato: false, disponibilita: { stato: 'bloccato', requisiti: [{ indice: 0, tipo: 'data', stato: 'rosso', testo: 'dal 18 giugno', dettaglio: 'oggi è il 20 aprile', manuale: false, confermato: false }] } }, { chiave: 'a3', nome: 'Proiettili perforanti', categoria: 'munizioni', prezzo: 3000, disponibileDal: null, comprato: false, disponibilita: { stato: 'ignoto', requisiti: [{ indice: 0, tipo: 'manuale', stato: 'grigio', testo: 'rango cliente Oscuro', dettaglio: 'Condizione non verificabile dai dati della partita', manuale: true, confermato: false }] } }] } } }),
    spillo({ id: 2, nome: 'Scrigno raccolto', tipo: 'forziere', tipoNome: 'Forziere', x: 80, y: 80, collezionabile: true, raccolto: true }),
    spillo({ id: 3, nome: 'Verso il centro', tipo: 'passaggio', tipoNome: 'Passaggio', x: 10, y: 90, riferimento: { tipo: 'mappa', chiave: 'shibuya-centro' }, dettaglio: { tipo: 'mappa', mappa: { chiave: 'shibuya-centro', nome: 'Shibuya centro', tipo: 'luogo' }, immagine: { url: '/api/immagini/mappa/shibuya-centro/file', asset: null } }, immagini: [{ id: 31, url: '/api/immagini/spillo/3-a/file', asset: null, didascalia: 'La scala', ordine: 0 }, { id: 32, url: null, asset: 'spilli/citta-shibuya/3-2', didascalia: '', ordine: 1 }] }),
    spillo({ id: 4, nome: 'Scrigno da aprire', tipo: 'forziere', tipoNome: 'Forziere', x: 90, y: 10, collezionabile: true, descrizione: 'Contiene un Panino a mezzaluna.' }),
    spillo({ id: 5, nome: 'Forziere del corridoio', tipo: 'forziere', tipoNome: 'Forziere', x: 40, y: 60, collezionabile: true, riferimento: { tipo: 'punto', chiave: 'kamoshida-02/3' }, dettaglio: { tipo: 'punto', punto: { chiave: 'kamoshida-02/3', tipo: 'forziere', nome: 'Forziere del corridoio', descrizione: '', esauribile: true, dungeon: 'kamoshida', area: 'kamoshida-02', stato: null } } }),
    // spillo con una condizione non soddisfatta alla data corrente della partita: nascosto finché non si chiede di vederlo
    spillo({ id: 6, nome: 'Bancarella estiva', tipo: 'attivita', tipoNome: 'Attività', x: 60, y: 30, condizioni: [{ tipo: 'data', dal: '06-18', testo: 'dal 18 giugno' }], disponibilita: { stato: 'bloccato', requisiti: [{ indice: 0, tipo: 'data', stato: 'rosso', testo: 'dal 18 giugno', dettaglio: 'Disponibile dal 18 giugno, oggi è il 20 aprile', manuale: false, confermato: false }] } }),
  ],
};

function monta(extra: Partial<Parameters<typeof VisoreMappa>[0]> = {}) {
  const onNaviga = vi.fn();
  const onRaccolto = vi.fn().mockResolvedValue(undefined);
  const onStatoPunto = vi.fn().mockResolvedValue(undefined);
  const onAcquisto = vi.fn().mockResolvedValue(undefined);
  render(<MemoryRouter><VisoreMappa mappa={mappa} partitaId={7} onNaviga={onNaviga} onRaccolto={onRaccolto} onStatoPunto={onStatoPunto} onAcquisto={onAcquisto} {...extra} /></MemoryRouter>);
  return { onNaviga, onRaccolto, onStatoPunto, onAcquisto };
}

describe('VisoreMappa', () => {
  it('mostra gli spilli con tipo e nome, nasconde i collezionabili raccolti e li rivela con l’interruttore', () => {
    monta();
    expect(screen.getByRole('button', { name: 'Negozio: Untouchable' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Forziere: Scrigno da aprire' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Scrigno raccolto/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mostra anche i raccolti (1)' }));
    expect(screen.getByRole('button', { name: 'Forziere: Scrigno raccolto (raccolto)' })).toBeInTheDocument();
    // progresso dei collezionabili: 1 su 3
    expect(screen.getByRole('progressbar', { name: 'Collezionabili raccolti' })).toHaveAttribute('aria-valuenow', '33');
    expect(screen.getByText('1 di 3 raccolti · 33%')).toBeInTheDocument();
  });

  it('le categorie filtrano gli spilli; «Nascondi tutti» e «Mostra tutti» agiscono su tutte', () => {
    monta();
    const categorie = within(screen.getByRole('list', { name: 'Categorie degli spilli' }));
    fireEvent.click(categorie.getByRole('button', { name: /Forziere/ }));
    expect(screen.queryByRole('button', { name: 'Forziere: Scrigno da aprire' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Negozio: Untouchable' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nascondi tutti' }));
    expect(screen.queryByRole('button', { name: 'Negozio: Untouchable' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mostra tutti' }));
    expect(screen.getByRole('button', { name: 'Forziere: Scrigno da aprire' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Negozio: Untouchable' })).toBeInTheDocument();
  });

  it('il click su uno spillo apre il popup ancorato con le azioni: passaggio → apre la mappa collegata', () => {
    const { onNaviga } = monta();
    fireEvent.click(screen.getByRole('button', { name: 'Passaggio: Verso il centro' }));
    const popup = within(screen.getByRole('dialog', { name: 'Verso il centro' }));
    // immagine della mappa collegata e schermate di riferimento nel popup
    expect(popup.getByRole('img', { name: 'Immagine: Verso il centro' })).toHaveAttribute('src', '/api/immagini/mappa/shibuya-centro/file');
    expect(within(popup.getByRole('list', { name: 'Schermate di Verso il centro' })).getAllByRole('button')).toHaveLength(2);
    fireEvent.click(popup.getByRole('button', { name: 'Ingrandisci: La scala' }));
    expect(screen.getByRole('dialog', { name: 'La scala' })).toBeInTheDocument();
    fireEvent.click(popup.getByRole('button', { name: 'Vai: Shibuya centro' }));
    expect(onNaviga).toHaveBeenCalledWith('shibuya-centro', undefined);
  });

  it('il popup di un collezionabile permette di segnarlo raccolto; la scheda del negozio elenca gli articoli con prezzo', async () => {
    const { onRaccolto } = monta();
    fireEvent.click(screen.getByRole('button', { name: 'Forziere: Scrigno da aprire' }));
    const popup = within(screen.getByRole('dialog', { name: 'Scrigno da aprire' }));
    expect(popup.getByText('Contiene un Panino a mezzaluna.')).toBeInTheDocument();
    fireEvent.click(popup.getByRole('button', { name: 'Raccolto' }));
    expect(onRaccolto).toHaveBeenCalledWith(expect.objectContaining({ id: 4 }), true);
    fireEvent.click(screen.getByRole('button', { name: 'Negozio: Untouchable' }));
    const scheda = within(await screen.findByRole('region', { name: 'Scheda: Untouchable' }));
    // Non piu' una tabella: nel pannello da 280 px impilarla dava quattro etichette maiuscole per
    // articolo che mangiavano un terzo della larghezza. Ogni articolo e' una riga di un elenco.
    expect(scheda.getByRole('list', { name: 'Articoli di Untouchable' })).toBeInTheDocument();
    expect(scheda.getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(scheda.getByText('Pistola modello Tkachev')).toBeInTheDocument();
    expect(scheda.getByText('12.000 ¥')).toBeInTheDocument();
    expect(scheda.getByRole('link', { name: 'scheda del negozio' })).toHaveAttribute('href', '/guida/negozi/untouchable');
    // Si vede solo ciò che soddisfa **tutte** le condizioni (decisione dell'utente, 2026-09-13):
    // l'articolo bloccato dalla data e quello con una condizione che la partita non sa verificare
    // sono tutti e due nascosti e conteggiati. In una guida che dice «questo c'è adesso» un forse
    // vale come un no; il chip «Da verificare» si legge chiedendo di vedere i non disponibili.
    expect(scheda.getByText(/Untouchable · 1 articolo/)).toBeInTheDocument();
    expect(scheda.queryByText('Fucile a pompa Governor')).not.toBeInTheDocument();
    expect(scheda.queryByText('Proiettili perforanti')).not.toBeInTheDocument();
    // Come per gli spilli: nascosto di regola, e un comando per vederlo — con il suo «Non ancora»
    // accanto, così non si confonde con quel che si può comprare oggi.
    fireEvent.click(scheda.getByRole('button', { name: 'Mostra anche i 2 articoli non ancora in vendita' }));
    expect(scheda.getByText('Fucile a pompa Governor')).toBeInTheDocument();
    expect(scheda.getByText('Non ancora')).toHaveAttribute('title', 'dal 18 giugno — oggi è il 20 aprile');
    expect(scheda.getByText('Da verificare')).toHaveAttribute('title', 'rango cliente Oscuro — Condizione non verificabile dai dati della partita');
    expect(scheda.getByText(/Untouchable · 3 articoli/)).toBeInTheDocument();
    fireEvent.click(scheda.getByRole('button', { name: 'Nascondi i 2 articoli non ancora in vendita' }));
    expect(scheda.queryByText('Fucile a pompa Governor')).not.toBeInTheDocument();
  });

  it('percorso, mappa genitore e mappe figlie navigano; senza partita il collezionabile non è segnabile', () => {
    const { onNaviga } = monta({ partitaId: null });
    fireEvent.click(screen.getByRole('button', { name: 'Tokyo' }));
    expect(onNaviga).toHaveBeenCalledWith('tokyo');
    fireEvent.click(screen.getByRole('button', { name: 'Su: Tokyo' }));
    fireEvent.click(within(screen.getByRole('list', { name: 'Mappe figlie' })).getByRole('button', { name: /Shibuya centro/ }));
    expect(onNaviga).toHaveBeenLastCalledWith('shibuya-centro');
    fireEvent.click(screen.getByRole('button', { name: 'Forziere: Scrigno da aprire' }));
    expect(within(screen.getByRole('dialog', { name: 'Scrigno da aprire' })).queryByRole('button', { name: 'Raccolto' })).not.toBeInTheDocument();
    expect(screen.getByText(/attiva una partita per segnarli/)).toBeInTheDocument();
  });

  it('un punto della Guida si segna «Ottenuto»/«Esaurito» dal popup; gli articoli del negozio si comprano dalla scheda', async () => {
    const { onStatoPunto, onAcquisto } = monta();
    fireEvent.click(screen.getByRole('button', { name: 'Forziere: Forziere del corridoio' }));
    const popup = within(screen.getByRole('dialog', { name: 'Forziere del corridoio' }));
    expect(popup.queryByRole('button', { name: 'Raccolto' })).not.toBeInTheDocument();
    fireEvent.click(popup.getByRole('button', { name: 'Esaurito' }));
    expect(onStatoPunto).toHaveBeenCalledWith(expect.objectContaining({ id: 5 }), 'esaurito');
    await waitFor(() => expect(popup.getByRole('button', { name: 'Ottenuto' })).not.toBeDisabled());
    fireEvent.click(popup.getByRole('button', { name: 'Ottenuto' }));
    expect(onStatoPunto).toHaveBeenLastCalledWith(expect.objectContaining({ id: 5 }), 'ottenuto');
    fireEvent.click(screen.getByRole('button', { name: 'Negozio: Untouchable' }));
    const scheda = within(await screen.findByRole('region', { name: 'Scheda: Untouchable' }));
    fireEvent.click(scheda.getByRole('checkbox', { name: 'Pistola modello Tkachev comprato' }));
    expect(onAcquisto).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 'a1', true);
  });

  it('i controlli dello zoom stanno sulla mappa: «Riduci» è disattivo al minimo «adatta», «Ingrandisci» lo riattiva', () => {
    monta();
    const riduci = screen.getByRole('button', { name: 'Riduci' });
    expect(riduci).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ingrandisci' }));
    expect(riduci).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Adatta alla finestra' }));
    expect(riduci).toBeDisabled();
  });

  it('lo spillo bloccato non c’è di regola, e quando lo si chiede torna **marcato**', () => {
    // Sono due domande diverse, e la mappa risponde a una sola per volta: «cosa posso fare
    // adesso» è la vista predefinita, «dove sarà quella cosa» si chiede col comando. Quando
    // tornano, i pin bloccati devono essere riconoscibili a colpo d'occhio: se fossero uguali
    // agli altri, il comando servirebbe a confondere invece che a informare.
    monta();
    expect(screen.queryByRole('button', { name: /Attività: Bancarella estiva/ })).toBeNull();
    const interruttore = screen.getByRole('button', { name: /Mostra anche i non ancora disponibili \(1\)/ });
    expect(interruttore).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(interruttore);
    // il nome accessibile lo dichiara, per chi il grigio non lo vede
    const pin = screen.getByRole('button', { name: 'Attività: Bancarella estiva (non ancora disponibile)' });
    expect(pin).toHaveClass('spillo-mappa--bloccato');
    fireEvent.click(pin);
    const popup = within(screen.getByRole('dialog', { name: 'Bancarella estiva' }));
    expect(popup.getByText('Non ancora')).toHaveAttribute('title', 'dal 18 giugno — Disponibile dal 18 giugno, oggi è il 20 aprile');
    const condizioni = within(popup.getByRole('group', { name: 'Condizioni di visibilità' }));
    expect(condizioni.getByRole('img', { name: 'Condizione non soddisfatta' })).toBeInTheDocument();
    fireEvent.click(interruttore);
    expect(screen.queryByRole('button', { name: /Attività: Bancarella estiva/ })).toBeNull();
  });

  it('un indirizzo con lo spillo bloccato non lo rivela: il comando sì, l’URL no', async () => {
    // Era il contrario: la selezione iniziale lo rendeva visibile «per non centrare la mappa sul
    // vuoto». Ma un comando lo si preme sapendo cosa si sta chiedendo; un indirizzo arriva da un
    // collegamento e farebbe alla mappa quello che l'interfaccia non fa.
    const misura = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
    try {
      monta({ selezioneIniziale: 6 });
      await new Promise((r) => setTimeout(r, 20));
      expect(screen.queryByRole('button', { name: /Attività: Bancarella estiva/ })).toBeNull();
      expect(screen.queryByRole('dialog', { name: 'Bancarella estiva' })).toBeNull();
      // e il comando resta lì, spento: la scelta è di chi guarda, non dell'indirizzo
      expect(screen.getByRole('button', { name: /Mostra anche i non ancora disponibili/ })).toHaveAttribute('aria-pressed', 'false');
    } finally {
      misura.mockRestore();
    }
  });

  it('senza partita le condizioni non nascondono nulla e si leggono come testo', () => {
    monta({ partitaId: null });
    expect(screen.queryByRole('button', { name: /Mostra anche i non ancora disponibili/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Attività: Bancarella estiva' }));
    const popup = within(screen.getByRole('dialog', { name: 'Bancarella estiva' }));
    expect(within(popup.getByRole('group', { name: 'Condizioni di visibilità' })).getByText('dal 18 giugno')).toBeInTheDocument();
  });
});

it('centra il punto iniziale con lo zoom configurato senza selezionare un pin',async()=>{
 const misura=vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({width:1000,height:500,left:0,top:0,right:1000,bottom:500,x:0,y:0,toJSON:()=>({})});
 try {
  monta({puntoIniziale:{x:20,y:80,zoom:2.5}});
  // Lo zoom configurato è un moltiplicatore del fit, e il fit ora lascia il margine che serve al
  // bersaglio dei pin (24 px ai lati e sotto, 44 sopra: la goccia è ancorata alla punta e si alza).
  // Su una tela 1000×500 con un'immagine 1000×500 il fit vale min(952/1000, 432/500) = 0,864.
  const atteso = 0.864 * 2.5;
  await waitFor(()=>{
   const t=(document.querySelector('.visore-mappa__livello') as HTMLElement).style.transform;
   const m=/translate\(([-.\d]+)px, ([-.\d]+)px\) scale\(([-.\d]+)\)/.exec(t);
   expect(m).not.toBeNull();
   const [x,y,z]=m!.slice(1).map(Number);
   expect(z).toBeCloseTo(atteso, 3);
   expect(x+200*z).toBeCloseTo(500);   // il punto chiesto (20%) finisce al centro della tela
   expect(y+400*z).toBeCloseTo(250);   // e così l'80% in verticale
  });
  expect(screen.queryByRole('dialog')).toBeNull();
 }finally{misura.mockRestore();}
});


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
      const match = /translate\(([-.\d]+)px, ([-.\d]+)px\) scale\(([-.\d]+)\)/.exec(transform);
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

// Due spilli più vicini di un bersaglio diventano un gruppo: se restassero due gocce distinte,
// nessuna delle due riceverebbe i 44 px di area del tocco, perché se li toglierebbero a vicenda.
// Non è una regola dello zoom minimo — vale a ogni ingrandimento, e si scioglie da sola quando
// ingrandendo la distanza sullo schermo supera il bersaglio.
describe('raggruppamento degli spilli vicini', () => {
  const vicini: MappaDto = {
    ...mappa, numeroSpilli: 2, spilli: [
      spillo({ id: 11, nome: 'Chiosco', tipo: 'attivita', tipoNome: 'Attività', x: 50, y: 50 }),
      spillo({ id: 12, nome: 'Distributore', tipo: 'negozio', tipoNome: 'Negozio', x: 50.2, y: 50.1 }),
    ],
  };

  /** Sulla tela, non nella legenda: lì i due spilli restano due voci d'elenco e va bene così. */
  const sullaTela = (container: HTMLElement) => [...container.querySelectorAll('.visore-mappa__livello .spillo-mappa')].map((e) => e.getAttribute('aria-label'));

  it('fonde i due spilli in un gruppo che li nomina entrambi', () => {
    const { container } = render(<MemoryRouter><VisoreMappa mappa={vicini} partitaId={null} onNaviga={vi.fn()} /></MemoryRouter>);
    expect(sullaTela(container)).toEqual(['2 spilli vicini: Chiosco, Distributore']);
  });

  // Nell'editor vale la stessa regola (scelta dell'utente, 2026-09-13): i pin vicini diventano un
  // gruppo e dall'elenco si sceglie quale modificare. La sola differenza è che il pin **selezionato**
  // esce dalla nube e si mostra da solo, perché lì il gesto è trascinare proprio quel pin.
  it('nell’editor il gruppo c’è lo stesso, e il pin selezionato esce e si mostra da solo', () => {
    const editor = { strumento: 'seleziona' as const, selezionatoId: null, onSeleziona: vi.fn(), onClickMappa: vi.fn(), onSposta: vi.fn() };
    const { container, rerender } = render(<MemoryRouter><VisoreMappa mappa={vicini} partitaId={null} onNaviga={vi.fn()} editor={editor} /></MemoryRouter>);
    expect(sullaTela(container)).toEqual(['2 spilli vicini: Chiosco, Distributore']);
    fireEvent.click(screen.getByRole('button', { name: '2 spilli vicini: Chiosco, Distributore' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: '2 spilli vicini' })).getByRole('button', { name: /Chiosco/ }));
    expect(editor.onSeleziona).toHaveBeenCalledWith(11);
    rerender(<MemoryRouter><VisoreMappa mappa={vicini} partitaId={null} onNaviga={vi.fn()} editor={{ ...editor, selezionatoId: 11 }} /></MemoryRouter>);
    // il pin scelto è a sé (trascinabile), l'altro resta dov'era: niente gocce sovrapposte
    expect(sullaTela(container)).toEqual(['Attività: Chiosco', 'Negozio: Distributore']);
  });
});

// Il gruppo deve **aprirsi**, non ingrandire: nel pacchetto ci sono spilli con le stesse coordinate,
// e la loro distanza sullo schermo resta zero a qualunque ingrandimento. Un bersaglio da 45 px che
// non fa niente è peggio di un bersaglio piccolo (rilievo del validatore, 2026-09-13).
describe('apertura del gruppo di spilli', () => {
  const coincidenti: MappaDto = {
    ...mappa, numeroSpilli: 2, spilli: [
      spillo({ id: 21, nome: 'Stanza sicura', tipo: 'sicura', tipoNome: 'Stanza sicura', x: 40, y: 40 }),
      spillo({ id: 22, nome: 'Punto di spostamento', tipo: 'passaggio', tipoNome: 'Passaggio', x: 40, y: 40 }),
    ],
  };

  it('il tocco apre l’elenco e da lì si sceglie lo spillo, che resta raggruppato', async () => {
    const { container } = render(<MemoryRouter><VisoreMappa mappa={coincidenti} partitaId={null} onNaviga={vi.fn()} /></MemoryRouter>);
    const gruppo = screen.getByRole('button', { name: '2 spilli vicini: Stanza sicura, Punto di spostamento' });
    expect(gruppo).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(gruppo);
    const elenco = screen.getByRole('dialog', { name: '2 spilli vicini' });
    fireEvent.click(within(elenco).getByRole('button', { name: /Punto di spostamento/ }));
    // il popup dello spillo scelto si apre...
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Punto di spostamento' })).toBeInTheDocument());
    // ...e la nube non si scorpora: restano due gocce sovrapposte, senza bersaglio, se lo facesse
    expect([...container.querySelectorAll('.visore-mappa__livello .spillo-mappa')]).toHaveLength(1);
  });
});

// L'elenco del gruppo vive dentro la tela, che ritaglia (`overflow: hidden`): deve scorrere in
// orizzontale e ribaltarsi sotto il gruppo quando sopra non c'è posto, come già fa il popup dello
// spillo. Senza, a 768 e 1280 l'intestazione e il tasto di chiusura finivano fuori dal ritaglio
// (rilievo del validatore, 2026-09-13).
describe('l’elenco del gruppo resta dentro la tela', () => {
  const conGruppoIn = (x: number, y: number): MappaDto => ({
    ...mappa, numeroSpilli: 2, spilli: [
      spillo({ id: 31, nome: 'Uno', tipo: 'nota', tipoNome: 'Nota', x, y }),
      spillo({ id: 32, nome: 'Due', tipo: 'nota', tipoNome: 'Nota', x: x + 0.2, y }),
    ],
  });
  const conTela = async (m: MappaDto) => {
    cleanup();
    const misura = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 1000, height: 500, left: 0, top: 0, right: 1000, bottom: 500, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
    try {
      const { container } = render(<MemoryRouter><VisoreMappa mappa={m} partitaId={null} onNaviga={vi.fn()} /></MemoryRouter>);
      // la tela si misura con un rAF: finché non è misurata il fit è quello neutro
      await waitFor(() => expect((container.querySelector('.visore-mappa__livello') as HTMLElement).style.transform).toContain('scale(0.864)'));
      const gruppo = await screen.findByRole('button', { name: /spilli vicini/ });
      fireEvent.click(gruppo);
      const elenco = await screen.findByRole('dialog', { name: '2 spilli vicini' });
      return { classe: elenco.className, transform: elenco.style.transform };
    } finally { misura.mockRestore(); }
  };

  it('si ribalta sotto il gruppo quando in alto non c’è spazio', async () => {
    const alto = await conTela(conGruppoIn(50, 2));
    expect(alto.classe).toContain('spillo-popup--sotto');
    const basso = await conTela(conGruppoIn(50, 90));
    expect(basso.classe).not.toContain('spillo-popup--sotto');
  });

  it('scorre in orizzontale quanto basta a restare nella tela', async () => {
    const sinistra = await conTela(conGruppoIn(1, 50));
    const scostamento = /translate\(calc\(-50% \+ ([-.\d]+)px\)/.exec(sinistra.transform);
    expect(scostamento).not.toBeNull();
    expect(Number(scostamento![1])).toBeGreaterThan(0);   // spinto verso destra, dentro la tela
    const destra = await conTela(conGruppoIn(98, 50));
    const s2 = /translate\(calc\(-50% \+ ([-.\d]+)px\)/.exec(destra.transform);
    expect(Number(s2![1])).toBeLessThan(0);
  });
});

// L'elenco si chiude come si chiude il popup: toccando la mappa, o con Esc. Prima restava aperto
// (rilievo del validatore, 2026-09-13), e quando il suo «×» finiva fuori dal ritaglio non c'era
// più un modo ovvio di levarlo.
describe('chiusura dell’elenco del gruppo', () => {
  const vicinissimi: MappaDto = {
    ...mappa, numeroSpilli: 2, spilli: [
      spillo({ id: 41, nome: 'Alfa', tipo: 'nota', tipoNome: 'Nota', x: 50, y: 50 }),
      spillo({ id: 42, nome: 'Beta', tipo: 'nota', tipoNome: 'Nota', x: 50, y: 50 }),
    ],
  };
  const apri = () => {
    render(<MemoryRouter><VisoreMappa mappa={vicinissimi} partitaId={null} onNaviga={vi.fn()} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /spilli vicini/ }));
    expect(screen.getByRole('dialog', { name: '2 spilli vicini' })).toBeInTheDocument();
  };

  it('un tocco sulla mappa lo chiude', () => {
    apri();
    const tela = screen.getByRole('application');
    fireEvent.pointerDown(tela, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(tela, { pointerId: 1, clientX: 10, clientY: 10 });
    expect(screen.queryByRole('dialog', { name: '2 spilli vicini' })).toBeNull();
    expect(screen.getByRole('button', { name: /spilli vicini/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('Esc lo chiude', () => {
    apri();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '2 spilli vicini' })).toBeNull();
  });
});
