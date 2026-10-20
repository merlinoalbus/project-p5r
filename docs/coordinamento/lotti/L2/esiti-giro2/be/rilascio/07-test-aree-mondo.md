# 07 — server/routes/aree-mondo.test.ts (test di R1, R3/R2-28, FUN2-8, FUN2-9)

## Modifica 1 di 2 — import (riga 9)

TESTO VECCHIO
~~~~
import { sincronizzaPercorsiMappe } from '../services/mappe/percorsiMappe.js';
import type { AreaDettaglioDto,
~~~~

TESTO NUOVO
~~~~
import { chiaveMappa, idMappa, sincronizzaPercorsiMappe } from '../services/mappe/percorsiMappe.js';
import { importaMappe } from '../services/mappe/mappeService.js';
import type { AreaDettaglioDto,
~~~~

## Modifica 2 di 2 — quattro casi nuovi prima del caso «12» (riga 214)

TESTO VECCHIO
~~~~
    await request(app).post('/api/mappe').send({ nome: 'Appunti L2', tipo: 'generica', genitore: 'shibuya' }).expect(201);
  });

  it('12 — pacchetto delle mappe:
~~~~

TESTO NUOVO
~~~~
    await request(app).post('/api/mappe').send({ nome: 'Appunti L2', tipo: 'generica', genitore: 'shibuya' }).expect(201);
  });

  it('R1 (giro 2) — l’indice delle mappe dice se l’Area di una planimetria è da verificare (l’area staff di Tokyo), come la pagina dell’Area', async () => {
    const albero = (await request(app).get('/api/mappe/albero').expect(200)).body.data as MappaRiassuntoDto[];
    const conArea = albero.filter((m) => m.area);
    expect(conArea.length).toBeGreaterThan(0);
    const staff = conArea.filter((m) => m.area!.chiave === 'citta/tokyo/area-riservata-allo-staff');
    expect(staff.length).toBe(2);
    expect(staff.every((m) => m.area!.daVerificare === true)).toBe(true);
    expect(conArea.filter((m) => m.area!.chiave !== 'citta/tokyo/area-riservata-allo-staff').every((m) => m.area!.daVerificare === false)).toBe(true);
    // «Tieni»: nell'indice il segno se ne va
    await request(app).put('/api/aree/citta/tokyo/area-riservata-allo-staff').send({ daVerificare: false }).expect(200);
    const dopo = (await request(app).get('/api/mappe/albero').expect(200)).body.data as MappaRiassuntoDto[];
    expect(dopo.filter((m) => m.area?.chiave === 'citta/tokyo/area-riservata-allo-staff').every((m) => m.area!.daVerificare === false)).toBe(true);
    // e il dettaglio di una sua planimetria dice lo stesso
    const una = staff[0].chiave;
    expect(((await request(app).get(`/api/mappe/${encodeURIComponent(una)}`).expect(200)).body.data as MappaDto).area?.daVerificare).toBe(false);
  });

  it('R3 (giro 2), R2-28 — un’Area corretta dall’utente resta com’è dopo un import senza «sovrascrivi», dall’app e dal seed; «Ripristina» la riporta', async () => {
    // un'Area della guida (seed) di Shibuya, che l'utente corregge
    const { chiave, slug } = prepared("SELECT chiave, slug FROM area WHERE quartiere_chiave = 'shibuya' AND origine = 'seed' AND seed_json IS NULL ORDER BY ordine LIMIT 1").get() as { chiave: string; slug: string };
    const pacchetto = (await request(app).get('/api/mappe/esporta?radice=shibuya').expect(200)).body.data as EsportazioneMappeDto;
    const nomeGuida = pacchetto.aree!.find((a) => a.slug === slug)!.nome;
    await request(app).put(`/api/aree/citta/shibuya/${slug}`).send({ nome: 'Nome dato dall’utente' }).expect(200);
    const corretta = () => prepared('SELECT nome, nome_rivisto, origine, seed_json IS NOT NULL AS corretta, planimetria_predefinita FROM area WHERE chiave = ?').get(chiave);
    const prima = corretta();
    expect(prima).toMatchObject({ nome: 'Nome dato dall’utente', nome_rivisto: 1, origine: 'seed', corretta: 1 });
    // dall'app, senza «sovrascrivi»
    await request(app).post('/api/mappe/importa').send({ pacchetto }).expect(200);
    expect(corretta()).toEqual(prima);
    // dal seed (il pacchetto del seed sopra un'Area del seed corretta dall'utente)
    importaMappe(structuredClone(pacchetto), { origine: 'seed' });
    expect(corretta()).toEqual(prima);
    // «Ripristina» rimette i valori della guida
    await request(app).post(`/api/aree/citta/shibuya/${slug}/ripristina`).expect(200);
    expect(prepared('SELECT nome FROM area WHERE chiave = ?').pluck().get(chiave)).toBe(nomeGuida);
  });

  it('FUN2-8 (giro 2) — dall’editor una mappa senza Area non entra nel mondo: spostarla sotto un quartiere o renderla `luogo`/`area` lì è 409 usa-aggiungi-area; nei Memento e fra le generiche niente cambia', async () => {
    // una mappa sciolta nei Memento (ammessa), resa `luogo` lì
    const sciolta = (await request(app).post('/api/mappe').send({ nome: 'Sciolta di prova', tipo: 'generica', genitore: 'dungeon-mementos' }).expect(201)).body.data as MappaDto;
    await request(app).put(`/api/mappe/${encodeURIComponent(sciolta.chiave)}`).send({ tipo: 'luogo' }).expect(200);
    const sposta = await request(app).put(`/api/mappe/${encodeURIComponent(sciolta.chiave)}`).send({ genitore: 'citta-kichijoji' });
    expect([sposta.status, sposta.body.error?.code]).toEqual([409, 'usa-aggiungi-area']);
    expect(prepared('SELECT genitore_chiave FROM mappa WHERE chiave = ?').pluck().get(idMappa(sciolta.chiave))).toBe('dungeon-mementos');
    expect((await request(app).put(`/api/mappe/${encodeURIComponent(sciolta.chiave)}`).send({ genitore: 'tokyo' })).status).toBe(409);
    // una generica del mondo resta ammessa, ma non diventa un `luogo` sciolto
    const generica = (await request(app).post('/api/mappe').send({ nome: 'Appunti di Kichijoji', tipo: 'generica', genitore: 'citta-kichijoji' }).expect(201)).body.data as MappaDto;
    const resa = await request(app).put(`/api/mappe/${encodeURIComponent(generica.chiave)}`).send({ tipo: 'area' });
    expect([resa.status, resa.body.error?.code]).toEqual([409, 'usa-aggiungi-area']);
    await request(app).put(`/api/mappe/${encodeURIComponent(generica.chiave)}`).send({ nome: 'Appunti rinominati' }).expect(200);
    // nei Memento lo spostamento resta com'era
    const altra = (await request(app).post('/api/mappe').send({ nome: 'Altra dei Memento', tipo: 'generica', genitore: 'dungeon-mementos' }).expect(201)).body.data as MappaDto;
    await request(app).put(`/api/mappe/${encodeURIComponent(sciolta.chiave)}`).send({ genitore: altra.chiave }).expect(200);
    // nessuna planimetria del mondo è finita fra le «da collocare»
    expect(((await request(app).get('/api/aree/da-collocare').expect(200)).body.data as Array<{ chiave: string }>).some((m) => [sciolta.chiave, generica.chiave].includes(m.chiave))).toBe(false);
  });

  it('FUN2-9 (giro 2) — le planimetrie da collocare dicono la chiave del loro genitore, perché «Colloca» proponga il quartiere giusto', async () => {
    // una planimetria di Shibuya tolta dalla sua Area finisce fra le «da collocare»
    const pianta = prepared("SELECT chiave FROM mappa WHERE area_chiave = 'citta/shibuya/central-street' ORDER BY versione_ordine LIMIT 1").pluck().get() as string;
    getDb().pragma('foreign_keys = OFF');
    prepared('UPDATE area SET planimetria_predefinita = NULL WHERE chiave = ?').run('citta/shibuya/central-street');
    prepared('UPDATE mappa SET area_chiave = NULL, versione_ordine = NULL, versione_etichetta = NULL WHERE chiave = ?').run(pianta);
    getDb().pragma('foreign_keys = ON');
    const elenco = (await request(app).get('/api/aree/da-collocare').expect(200)).body.data as Array<{ chiave: string; genitore?: string | null; genitoreNome: string | null }>;
    const voce = elenco.find((m) => m.chiave === chiaveMappa(pianta))!;
    expect(voce).toMatchObject({ genitore: chiaveMappa(prepared('SELECT genitore_chiave FROM mappa WHERE chiave = ?').pluck().get(pianta) as string), genitoreNome: expect.any(String) });
    // la chiave è quella con cui il quartiere si riconosce nella città (`mappaChiave`)
    const quartieri = (await request(app).get('/api/compendio/citta').expect(200)).body.data as QuartiereRiassuntoDto[];
    expect(quartieri.find((q) => q.mappaChiave === voce.genitore)?.chiave).toBe('shibuya');
  });

  it('12 — pacchetto delle mappe:
~~~~
