// ============================================================
// Test API percorso giorno per giorno (Fase 7.5b) — seed, indice, scheda del giorno con riferimenti, azioni fatte per partita con evento, giorno corrente
// ============================================================

import request from 'supertest';
import { closeDb, getDb, initDb } from '../db/dbService.js';
import { caricaPacchetto, ricaricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { AzionePercorsoDto, GiornoCorrenteDto, PercorsoGiornoDto, PercorsoIndiceDto, StoricoDto } from '../../shared/types.js';

const app = createApp();

describe('API percorso giorno per giorno', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    caricaPacchetto(db);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('indice: 346 giorni dal 9 aprile al 20 marzo in ordine, conteggi; scheda del 12 aprile con azioni, riferimenti risolti e collegamenti', async () => {
    const i = (await request(app).get('/api/compendio/percorso')).body.data as PercorsoIndiceDto;
    expect(i.totaleGiorni).toBe(346);
    expect(i.giorni[0]).toMatchObject({ giorno: '04-09', giornoSettimana: 'sab' });
    expect(i.giorni[i.giorni.length - 1].giorno).toBe('03-20');
    expect(i.giorniCoperti).toBeGreaterThanOrEqual(290);
    expect(i.dataCorrente).toBeNull();
    const g = (await request(app).get('/api/compendio/percorso/04-12')).body.data as PercorsoGiornoDto;
    expect(g).toMatchObject({ giorno: '04-12', giornoSettimana: 'mar', fase: 'Palazzo di Kamoshida', precedente: '04-11', successivo: '04-13', coperto: true });
    expect(g.trama.length).toBeGreaterThan(20);
    expect(g.azioni.length).toBeGreaterThanOrEqual(3);
    // ogni voce ha la sua identità; prima quelle di giorno, poi quelle di sera
    expect(new Set(g.azioni.map((a) => a.uid)).size).toBe(g.azioni.length);
    expect(g.azioni.every((a) => /^[0-9a-f]{32}$/.test(a.uid) && a.giorno === '04-12' && a.genere === 'azione')).toBe(true);
    const fasce = g.azioni.map((a) => a.fascia);
    expect(fasce).toEqual([...fasce].sort((x, y) => (x === y ? 0 : x === 'giorno' ? -1 : 1)));
    expect(g.azioni.find((a) => a.tipo === 'palazzo')?.riferimento).toEqual({ tipo: 'dungeon', chiave: 'kamoshida' });
    expect(g.azioni.find((a) => a.fascia === 'giorno' && a.tipo === 'confidente')?.riferimento).toEqual({ tipo: 'confidente', chiave: 'ryuji' });
    expect(g.avvisi.length).toBeGreaterThan(0);
    expect(g.fonte.startsWith('https://www.allgamestaff.it/')).toBe(true);
    expect((await request(app).get('/api/compendio/percorso/13-40')).status).toBe(404);
    expect((await request(app).get('/api/compendio/percorso?partita=99999')).status).toBe(404);
  });

  it('azioni fatte per partita con evento (una sola volta), riapertura, validazione; giorno corrente; reseed stabile', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Percorso' })).body.data as { id: number }).id;
    const prima = ((await request(app).get('/api/compendio/percorso/04-12')).body.data as PercorsoGiornoDto).azioni[0];
    let a = (await request(app).put(`/api/partite/${id}/percorso`).send({ uid: prima.uid, fatta: true })).body.data as AzionePercorsoDto;
    expect(a).toMatchObject({ uid: prima.uid, giorno: '04-12', fatta: true });
    a = (await request(app).put(`/api/partite/${id}/percorso`).send({ uid: prima.uid, fatta: true })).body.data as AzionePercorsoDto; // idempotente
    expect(a).toMatchObject({ uid: prima.uid, fatta: true });
    const g = (await request(app).get(`/api/compendio/percorso/04-12?partita=${id}`)).body.data as PercorsoGiornoDto;
    expect(g.fatte).toBe(1);
    expect(g.azioni[0].fatta).toBe(true);
    const storico = (await request(app).get(`/api/partite/${id}/storico?tipi=percorso`)).body.data as StoricoDto;
    expect(storico.totale).toBe(1);
    expect(storico.eventi[0].titolo).toContain('04-12');
    a = (await request(app).put(`/api/partite/${id}/percorso`).send({ uid: prima.uid, fatta: false })).body.data as AzionePercorsoDto;
    expect(a.fatta).toBe(false);
    expect((await request(app).put(`/api/partite/${id}/percorso`).send({ uid: '0'.repeat(32), fatta: true })).status).toBe(404);
    expect((await request(app).put(`/api/partite/${id}/percorso`).send({ uid: 'non-un-uid', fatta: true })).status).toBe(400);
    const gc = (await request(app).put(`/api/partite/${id}/giorno`).send({ data: '05-19' })).body.data as GiornoCorrenteDto;
    expect(gc.dataCorrente).toBe('05-19');
    expect(gc.partita.id).toBe(id);
    expect(gc.partita.dataGioco).toBe('05-19');
    const i = (await request(app).get(`/api/compendio/percorso?partita=${id}`)).body.data as PercorsoIndiceDto;
    expect(i.dataCorrente).toBe('05-19');
    expect((await request(app).put(`/api/partite/${id}/giorno`).send({ data: '13-40' })).status).toBe(404);
    const primaDel19 = ((await request(app).get('/api/compendio/percorso/05-19')).body.data as PercorsoGiornoDto).azioni[0];
    await request(app).put(`/api/partite/${id}/percorso`).send({ uid: primaDel19.uid, fatta: true });
    // il pacchetto ricaricato ridà le stesse voci con le stesse identità: la spunta resta
    ricaricaPacchetto(getDb());
    const dopo = (await request(app).get(`/api/compendio/percorso/05-19?partita=${id}`)).body.data as PercorsoGiornoDto;
    expect(dopo.azioni[0].fatta).toBe(true);
    expect(dopo.dataCorrente).toBe('05-19');
  });

  it('con la partita ogni azione ha lo stato (consigliata/bloccata/neutra con motivo) e, se ha un luogo, la mappa collegata', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Oggi' })).body.data as { id: number }).id;
    const senza = (await request(app).get('/api/compendio/percorso/04-12')).body.data as PercorsoGiornoDto;
    expect(senza.azioni.every((a) => a.stato === null)).toBe(true);
    const g = (await request(app).get(`/api/compendio/percorso/04-12?partita=${id}`)).body.data as PercorsoGiornoDto;
    expect(g.azioni.length).toBeGreaterThan(0);
    for (const a of g.azioni) {
      expect(a.stato).not.toBeNull();
      expect(['consigliata', 'bloccata', 'neutra']).toContain(a.stato!.tipo);
      if (a.stato!.tipo === 'bloccata') expect(a.stato!.motivo).toBeTruthy();
      // un Palazzo porta al suo ingresso in città, centrato sullo spillo (Kamoshida: la Shujin), non alla radice senza pianta
      if (a.riferimento?.tipo === 'dungeon') expect(a.mappa).toEqual({ chiave: 'citta-shujin-academy', spilloId: expect.any(Number) });
    }
    // un giorno con un Confidente e rango atteso: lo stato riflette i semafori del rango (bloccata se un requisito è rosso)
    const giorni = ((await request(app).get(`/api/compendio/percorso?partita=${id}`)).body.data as PercorsoIndiceDto).giorni.filter((x) => x.azioni > 0).slice(0, 40);
    let trovata = false;
    for (const x of giorni) {
      const gg = (await request(app).get(`/api/compendio/percorso/${x.giorno}?partita=${id}`)).body.data as PercorsoGiornoDto;
      const conf = gg.azioni.find((a) => a.tipo === 'confidente' && a.riferimento?.tipo === 'confidente' && a.rangoAtteso !== null && a.rangoAtteso > 1);
      if (conf) { trovata = true; expect(conf.stato!.tipo === 'bloccata' ? conf.stato!.motivo!.length > 0 : true).toBe(true); break; }
    }
    expect(trovata).toBe(true);
  });

  it('alla spunta dice i punti della guida (Doti «+N» dalle note, da segnare a mano), applica le note del Confidente scelte e le annulla togliendo la spunta', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Effetti' })).body.data as { id: number }).id;
    const g = (await request(app).get(`/api/compendio/percorso/04-12?partita=${id}`)).body.data as PercorsoGiornoDto;
    const conDote = g.azioni.find((x) => /Conoscenza \+(\d)/.test(x.note ?? ''))!;
    // le «+N» della guida sono note: 1 → 2 punti, 2 → 3, 3 → 5
    const noteGuida = Number(/Conoscenza \+(\d)/.exec(conDote.note ?? '')![1]);
    const atteso = [2, 3, 5][noteGuida - 1];
    const fatta = (await request(app).put(`/api/partite/${id}/percorso`).send({ uid: conDote.uid, fatta: true })).body.data as AzionePercorsoDto;
    expect(fatta.effetti?.doti).toEqual([{ chiave: 'conoscenza', nome: 'Conoscenza', delta: atteso, note: noteGuida, cinema: false }]);
    // le Doti si segnano a mano: la spunta le dice, non le tocca
    const doti = (await request(app).get(`/api/partite/${id}/doti`)).body.data as Array<{ chiave: string; punti: number }>;
    expect(doti.find((d) => d.chiave === 'conoscenza')!.punti).toBe(0);
    // la scheda del giorno espone gli effetti registrati; togliere la spunta non tocca le Doti
    const rilettura = (await request(app).get(`/api/compendio/percorso/04-12?partita=${id}`)).body.data as PercorsoGiornoDto;
    expect(rilettura.azioni.find((x) => x.uid === conDote.uid)!.effetti?.doti[0].delta).toBe(atteso);
    await request(app).put(`/api/partite/${id}/percorso`).send({ uid: conDote.uid, fatta: false });
    expect(((await request(app).get(`/api/partite/${id}/doti`)).body.data as Array<{ chiave: string; punti: number }>).find((d) => d.chiave === 'conoscenza')!.punti).toBe(0);
    // Confidente: serve il rango 1 e la scelta delle note; senza Persona del Carro in scorta 2 note = 10 punti
    await request(app).put(`/api/partite/${id}/confidenti/ryuji`).send({ forza: true, rango: 1 });
    const indice = (await request(app).get(`/api/compendio/percorso?partita=${id}`)).body.data as PercorsoIndiceDto;
    let trovata: { uid: string } | null = null;
    for (const giorno of indice.giorni) {
      const gg = (await request(app).get(`/api/compendio/percorso/${giorno.giorno}?partita=${id}`)).body.data as PercorsoGiornoDto;
      const az = gg.azioni.find((x) => x.tipo === 'confidente' && x.riferimento?.chiave === 'ryuji' && (x.rangoAtteso ?? 0) >= 2);
      if (az) { trovata = { uid: az.uid }; break; }
    }
    expect(trovata).not.toBeNull();
    const conNote = (await request(app).put(`/api/partite/${id}/percorso`).send({ ...trovata!, fatta: true, noteRisposta: 2 })).body.data as AzionePercorsoDto;
    expect(conNote.effetti?.confidente).toMatchObject({ chiave: 'ryuji', noteRisposta: 2, punti: 10, bonusArcano: false });
    const conf = (await request(app).get(`/api/partite/${id}/confidenti`)).body.data as Array<{ chiave: string; punti: number }>;
    expect(conf.find((c) => c.chiave === 'ryuji')!.punti).toBe(10);
    await request(app).put(`/api/partite/${id}/percorso`).send({ ...trovata!, fatta: false });
    expect(((await request(app).get(`/api/partite/${id}/confidenti`)).body.data as Array<{ chiave: string; punti: number }>).find((c) => c.chiave === 'ryuji')!.punti).toBe(0);
    // senza scelta delle note nessun punto al Confidente
    const senza = (await request(app).put(`/api/partite/${id}/percorso`).send({ ...trovata!, fatta: true })).body.data as AzionePercorsoDto;
    expect(senza.effetti?.confidente ?? null).toBeNull();
    expect((await request(app).put(`/api/partite/${id}/percorso`).send({ ...trovata!, fatta: true, noteRisposta: 4 })).status).toBe(400);
  });

  it('«Anima da cineasta» alza di uno scalino i punti di film e DVD alla spunta, solo se il libro risulta letto', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Cineasta', dataGioco: '12-15' })).body.data as { id: number }).id;
    // Una sessione parziale non deve attivare il bonus: il percorso legge soltanto il
    // completamento canonico in `lettura_partita`.
    // il libro chiede di aver già visto un film: qui si prova il bonus, non la disponibilità
    getDb().prepare("UPDATE libro SET sessioni=2, condizioni_json='[]' WHERE chiave='anima-da-cineasta'").run();
    expect((await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave: 'anima-da-cineasta', avanzamento: 1 })).status).toBe(200);
    // cerco il primo DVD della guida che dà una Dote e che la spunta completa («(1/2)» è solo la prima serata: i punti arrivano alla fine)
    let trovato: { uid: string; note: number; dote: string; chiave: string | null } | null = null;
    const indice = (await request(app).get('/api/compendio/percorso')).body.data as { giorni: Array<{ giorno: string }> };
    for (const g of indice.giorni) {
      const giorno = (await request(app).get(`/api/compendio/percorso/${g.giorno}?partita=${id}`)).body.data as PercorsoGiornoDto;
      const dvd = giorno.azioni.find((x) => x.tipo === 'dvd' && /(Conoscenza|Coraggio|Fascino|Gentilezza|Perizia) \+(\d)/.test(x.note ?? '') && x.produce.some((e) => e.tipo === 'lettura' && e.almeno === null));
      if (dvd) { const m = /(Conoscenza|Coraggio|Fascino|Gentilezza|Perizia) \+(\d)/.exec(dvd.note ?? '')!; trovato = { uid: dvd.uid, note: Number(m[2]), dote: m[1].toLowerCase(), chiave: dvd.riferimento?.tipo === 'film' ? dvd.riferimento.chiave : null }; break; }
    }
    expect(trovato).not.toBeNull();
    const { uid, dote, chiave } = trovato!;
    // I punti non li applica più il percorso: li dà il **conseguimento** del DVD, e spuntare
    // l'azione lo segna come visto. La sorgente dev'essere una sola, altrimenti chi spunta qui e
    // segna anche la visione sulla pagina Film prende i punti due volte — un errore che non si vede
    // subito e che settimane dopo lascia un rango in più senza sapere quali punti fossero veri.
    // Quindi si guarda la Dote detta dalla visione: gli effetti dell'azione registrano la visione
    // portata avanti, con le Doti che dà (da segnare a mano), senza Doti proprie dell'azione.
    const dettaDalla = (a: AzionePercorsoDto) => (a.effetti?.letture ?? []).flatMap((l) => l.doti ?? []).filter((d) => d.chiave === dote).reduce((s, d) => s + d.delta, 0);
    const senza = (await request(app).put(`/api/partite/${id}/percorso`).send({ uid, fatta: true })).body.data as AzionePercorsoDto;
    expect(senza.effetti?.doti).toEqual([]);
    expect(senza.effetti?.letture).toEqual([expect.objectContaining({ categoria: 'film', chiave, prima: 0 })]);
    // un DVD dà due note: 3 punti senza il libro
    expect(dettaDalla(senza)).toBe(3);

    // Togliere la spunta **non** disfa la visione: la spunta dice «l'ho fatto quel giorno», il
    // tracciamento dice «l'ho visto». Disfarla da qui butterebbe via un avanzamento che potrebbe
    // essere stato segnato sulla pagina Film, e fra un'asimmetria e una perdita di dati si sceglie
    // l'asimmetria.
    await request(app).put(`/api/partite/${id}/percorso`).send({ uid, fatta: false });

    // Col libro letto lo scalino sale, e vale per le visioni **da lì in avanti**: si disfa la
    // visione dalla sua pagina — che è dove quel dato vive — e la si rifà.
    expect(chiave).not.toBeNull();
    const disfatta = (await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'film', chiave, avanzamento: 0 })).body.data as { daSegnare?: Array<{ chiave: string; delta: number }> };
    expect(disfatta.daSegnare?.find((d) => d.chiave === dote)?.delta).toBe(-3);
    expect((await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave: 'anima-da-cineasta', fatto: true })).status).toBe(200);
    const col = (await request(app).put(`/api/partite/${id}/percorso`).send({ uid, fatta: true })).body.data as AzionePercorsoDto;
    expect(dettaDalla(col)).toBe(5);
    // le Doti della partita non si sono mosse: si segnano a mano
    expect(((await request(app).get(`/api/partite/${id}/doti`)).body.data as Array<{ chiave: string; punti: number }>).find((d) => d.chiave === dote)!.punti).toBe(0);
  });

  it('un film al cinema della guida riceve lo scalino di «Anima da cineasta»: 5 punti senza il libro, 7 col libro', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Cinema', dataGioco: '05-01' })).body.data as { id: number }).id;
    const g = (await request(app).get(`/api/compendio/percorso/05-01?partita=${id}`)).body.data as PercorsoGiornoDto;
    const film = g.azioni.find((x) => x.riferimento?.tipo === 'film' && /Gentilezza \+3/.test(x.note ?? ''))!;
    expect(film).toBeDefined();
    expect(film.riferimento).toEqual({ tipo: 'film', chiave: 'cinema-the-cake-knight-rises' });
    // Anche qui i punti li dice il conseguimento, non la spunta: tre note al cinema sono 5 punti, 7
    // col libro. Che la regola dello scalino continui a valere è il senso di questa prova.
    const gentilezza = (a: AzionePercorsoDto) => (a.effetti?.letture ?? []).flatMap((l) => l.doti ?? []).filter((d) => d.chiave === 'gentilezza').reduce((s, d) => s + d.delta, 0);
    const prima = (await request(app).put(`/api/partite/${id}/percorso`).send({ uid: film.uid, fatta: true })).body.data as AzionePercorsoDto;
    expect(gentilezza(prima)).toBe(5);

    await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'film', chiave: 'cinema-the-cake-knight-rises', avanzamento: 0 });
    await request(app).put(`/api/partite/${id}/percorso`).send({ uid: film.uid, fatta: false });
    await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave: 'anima-da-cineasta', fatto: true });
    const col = (await request(app).put(`/api/partite/${id}/percorso`).send({ uid: film.uid, fatta: true })).body.data as AzionePercorsoDto;
    expect(gentilezza(col)).toBe(7);
  });
});
