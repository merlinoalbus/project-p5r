// ============================================================
// Test API piani salvati — salvataggio dal motore, avanzamento sulla scorta, passi eseguibili, obiettivo, validazione
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import { avanzamentoPiano } from '../services/pianiSalvatiService.js';
import type { NodoPianoDto, ObiettivoDto, PersonaRiassuntoDto, PianiFusioneDto, PianoSalvatoDto, StoricoDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

async function idDi(nome: string): Promise<number> {
  const lista = (await request(app).get(`/api/compendio/persona?q=${encodeURIComponent(nome)}`)).body.data as PersonaRiassuntoDto[];
  const p = lista.find((x) => x.nome === nome);
  if (!p) throw new Error(`Persona ${nome} non trovata`);
  return p.id;
}
function foglie(n: NodoPianoDto): NodoPianoDto[] {
  return n.modo === 'fusione' ? n.figli.flatMap(foglie) : [n];
}

describe('API piani salvati', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('avanzamentoPiano: foglie, fusioni fatte, passi eseguibili e completamento', () => {
    const p = (id: number, nome: string): NodoPianoDto['persona'] => ({ id, nome, nomeIt: nome, arcana: 'Fool', arcanaNome: 'Matto', livello: 1, speciale: false, rara: false, dlc: false });
    const foglia = (id: number): NodoPianoDto => ({ persona: p(id, `F${id}`), modo: 'cattura', costo: 0, figli: [], skillPortate: [], skillDaLivello: [] });
    const albero: NodoPianoDto = {
      persona: p(100, 'Bersaglio'), modo: 'fusione', costo: 0, tipo: 'normale', skillPortate: [], skillDaLivello: [],
      figli: [
        { persona: p(50, 'Intermedia'), modo: 'fusione', costo: 0, tipo: 'normale', figli: [foglia(1), foglia(2)], skillPortate: [], skillDaLivello: [] },
        foglia(3),
      ],
    };
    expect(avanzamentoPiano(albero, new Set())).toMatchObject({ completato: false, foglie: 3, foglieInScorta: 0, fusioni: 2, fusioniFatte: 0, passi: [] });
    const a = avanzamentoPiano(albero, new Set([1, 2]));
    expect(a.passi.map((x) => x.risultato.id)).toEqual([50]);
    expect(a.foglieInScorta).toBe(2);
    // l'intermedia è già in scorta: il suo sottoalbero non conta più; con la foglia 3 il passo finale è eseguibile
    const b = avanzamentoPiano(albero, new Set([50, 3]));
    expect(b).toMatchObject({ fusioniFatte: 1, foglie: 1, foglieInScorta: 1 });
    expect(b.passi.map((x) => x.risultato.id)).toEqual([100]);
    expect(avanzamentoPiano(albero, new Set([100])).completato).toBe(true);
  });

  it('salva un piano calcolato dal motore, lo lega a un obiettivo e ricalcola l\'avanzamento sulla scorta', async () => {
    const partita = (await request(app).post('/api/partite').send({ nome: 'Piani', livelloProtagonista: 30 })).body.data as { id: number };
    const id = partita.id;
    const jack = await idDi('Jack Frost');
    const obiettivo = (await request(app).post(`/api/partite/${id}/obiettivi`).send({ personaId: jack })).body.data as ObiettivoDto;
    const calcolo = (await request(app).get(`/api/fusione/piani/${jack}?partita=${id}&profondita=2&alternative=2`)).body.data as PianiFusioneDto;
    expect(calcolo.piani.length).toBeGreaterThan(0);
    const piano = calcolo.piani.find((p) => p.radice.modo === 'fusione') ?? calcolo.piani[0];
    // validazione: radice incoerente, obiettivo di un'altra Persona, albero malformato
    expect((await request(app).post(`/api/partite/${id}/piani`).send({ personaId: jack + 1, piano, opzioni: calcolo.opzioni })).status).toBe(400);
    const pixie = await idDi('Pixie');
    const altro = (await request(app).post(`/api/partite/${id}/obiettivi`).send({ personaId: pixie })).body.data as ObiettivoDto;
    expect((await request(app).post(`/api/partite/${id}/piani`).send({ personaId: jack, piano, opzioni: calcolo.opzioni, obiettivoId: altro.id })).status).toBe(400);
    expect((await request(app).post(`/api/partite/${id}/piani`).send({ personaId: jack, piano: { ...piano, radice: { ...piano.radice, modo: 'fusione', figli: [] } }, opzioni: calcolo.opzioni })).status).toBe(400);
    // salvataggio corretto
    const salvato = (await request(app).post(`/api/partite/${id}/piani`).send({ personaId: jack, piano, opzioni: calcolo.opzioni, obiettivoId: obiettivo.id, nome: 'Il mio piano' }));
    expect(salvato.status).toBe(201);
    const s = salvato.body.data as PianoSalvatoDto;
    expect(s).toMatchObject({ personaId: jack, nome: 'Jack Frost', titolo: 'Il mio piano', obiettivoId: obiettivo.id, obiettivoStato: 'aperto', costo: Math.round(piano.costo) });
    expect(s.avanzamento.completato).toBe(false);
    expect(s.avanzamento.foglie).toBe(foglie(piano.radice).length);
    expect(s.piano.radice.persona.id).toBe(jack);
    // l'obiettivo conta il piano; lo storico ha l'evento
    const ob = (await request(app).get(`/api/partite/${id}/obiettivi`)).body.data as ObiettivoDto[];
    expect(ob.find((o) => o.id === obiettivo.id)?.pianiSalvati).toBe(1);
    const storico = (await request(app).get(`/api/partite/${id}/storico?tipi=piano-salvato`)).body.data as StoricoDto;
    expect(storico.totale).toBe(1);
    expect(storico.eventi[0].dettaglio).toContain('legato a un obiettivo');
    // filtro per obiettivo
    expect(((await request(app).get(`/api/partite/${id}/piani?obiettivo=${obiettivo.id}`)).body.data as PianoSalvatoDto[]).length).toBe(1);
    expect(((await request(app).get(`/api/partite/${id}/piani?obiettivo=${altro.id}`)).body.data as PianoSalvatoDto[]).length).toBe(0);
    // le foglie entrano in scorta → passi eseguibili; il bersaglio entra in scorta → completato (e obiettivo raggiunto)
    if (piano.radice.modo === 'fusione') {
      for (const f of foglie(piano.radice)) await request(app).post(`/api/partite/${id}/persona`).send({ personaId: f.persona.id }).catch(() => undefined);
      const conFoglie = ((await request(app).get(`/api/partite/${id}/piani`)).body.data as PianoSalvatoDto[])[0];
      expect(conFoglie.avanzamento.foglieInScorta).toBe(conFoglie.avanzamento.foglie);
      expect(conFoglie.avanzamento.passi.length).toBeGreaterThan(0);
      expect(conFoglie.avanzamento.passi[0].ingredienti.length).toBeGreaterThanOrEqual(2);
    }
    await request(app).post(`/api/partite/${id}/persona`).send({ personaId: jack });
    const completo = ((await request(app).get(`/api/partite/${id}/piani`)).body.data as PianoSalvatoDto[])[0];
    expect(completo.avanzamento.completato).toBe(true);
    expect(completo.obiettivoStato).toBe('raggiunto');
    // rinomina, obiettivo scollegato, eliminazione
    const agg = (await request(app).put(`/api/partite/${id}/piani/${s.id}`).send({ nome: 'Rinominato', obiettivoId: null })).body.data as PianoSalvatoDto;
    expect(agg).toMatchObject({ titolo: 'Rinominato', obiettivoId: null, obiettivoStato: null });
    expect((await request(app).put(`/api/partite/${id}/piani/${s.id}`).send({ obiettivoId: 99999 })).status).toBe(404);
    expect((await request(app).delete(`/api/partite/${id}/piani/${s.id}`)).status).toBe(204);
    expect((await request(app).delete(`/api/partite/${id}/piani/${s.id}`)).status).toBe(404);
    expect((await request(app).get('/api/partite/99999/piani')).status).toBe(404);
    expect((await request(app).get(`/api/partite/${id}/piani?obiettivo=x`)).status).toBe(400);
  });
});
