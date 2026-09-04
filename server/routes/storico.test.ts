// ============================================================
// Test API storico — eventi registrati dalle modifiche di tracking; filtri, paginazione, eliminazione
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { PersonaRiassuntoDto, SkillRiassuntoDto, StoricoDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

async function idDi(nome: string): Promise<number> {
  const lista = (await request(app).get(`/api/compendio/persona?q=${encodeURIComponent(nome)}`)).body.data as PersonaRiassuntoDto[];
  const p = lista.find((x) => x.nome === nome);
  if (!p) throw new Error(`Persona ${nome} non trovata`);
  return p.id;
}

describe('API storico', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('registra gli eventi delle modifiche e li restituisce dal più recente, con filtri, cursore ed eliminazione', async () => {
    const p = await request(app).post('/api/partite').send({ nome: 'Storia', livelloProtagonista: 5, difficolta: 'difficile' });
    const id = p.body.data.id as number;
    let s = (await request(app).get(`/api/partite/${id}/storico`)).body.data as StoricoDto;
    expect(s.totale).toBe(1);
    expect(s.eventi[0]).toMatchObject({ tipo: 'partita-creata', tipoNome: 'Partita creata', gruppo: 'partita', personaId: null });
    expect(s.eventi[0].titolo).toContain('Storia');
    expect(s.eventi[0].dettaglio).toContain('difficile');

    // partita: livello protagonista e Allarme (nessun evento se il valore non cambia)
    await request(app).put(`/api/partite/${id}`).send({ livelloProtagonista: 12 });
    await request(app).put(`/api/partite/${id}`).send({ livelloProtagonista: 12 });
    await request(app).put(`/api/partite/${id}`).send({ allarmeAttivo: true });
    await request(app).put(`/api/partite/${id}`).send({ nome: 'Storia 2' });
    s = (await request(app).get(`/api/partite/${id}/storico`)).body.data as StoricoDto;
    expect(s.eventi.map((e) => e.tipo)).toEqual(['allarme', 'livello-protagonista', 'partita-creata']);
    expect(s.eventi[1]).toMatchObject({ titolo: 'Protagonista al livello 12', dati: { da: 5, a: 12 } });

    // Doti: evento solo al cambio di rango
    await request(app).patch(`/api/partite/${id}/doti/fascino`).send({ delta: 3 });
    const dote = (await request(app).patch(`/api/partite/${id}/doti/fascino`).send({ punti: 999 })).body.data as { rango: number; nomeRango: string };
    s = (await request(app).get(`/api/partite/${id}/storico?tipi=dote-rango`)).body.data as StoricoDto;
    expect(s.totale).toBe(1);
    expect(s.eventi[0].titolo).toContain(`rango ${dote.rango}`);
    expect(s.eventi[0].titolo).toContain(dote.nomeRango);

    // Confidenti: sblocco e rango
    await request(app).put(`/api/partite/${id}/confidenti/gemelle`).send({ forza: true, rango: 3 });
    await request(app).put(`/api/partite/${id}/confidenti/gemelle`).send({ note: 'ciao' });
    s = (await request(app).get(`/api/partite/${id}/storico?tipi=confidente-sbloccato,confidente-rango`)).body.data as StoricoDto;
    // ranghi 1, 2 e 3 delle Gemelle chiedono ciascuno una Persona precisa in scorta: tre salti forzati tracciati, piu il cambio di rango
    expect(s.eventi.map((e) => e.tipo)).toEqual(['confidente-rango', 'confidente-rango', 'confidente-rango', 'confidente-rango', 'confidente-sbloccato']);
    expect(s.eventi[0].titolo).toMatch(/rango 3/);
    expect(s.eventi.filter((e) => e.titolo.includes('nonostante i requisiti'))).toHaveLength(3);

    // Persona: aggiunta (+ registrazione nel compendio), livello, skill, statistiche, rimozione
    const pixie = await idDi('Pixie');
    const poss = (await request(app).post(`/api/partite/${id}/persona`).send({ personaId: pixie, origine: 'cattura nei Mementos' })).body.data as { id: number; skill: SkillRiassuntoDto[] };
    s = (await request(app).get(`/api/partite/${id}/storico?persona=${pixie}`)).body.data as StoricoDto;
    expect(s.eventi.map((e) => e.tipo)).toEqual(['compendio-registrata', 'persona-aggiunta']);
    expect(s.eventi[1].dettaglio).toContain('cattura nei Mementos');
    expect(s.eventi[1]).toMatchObject({ personaId: pixie, personaNome: 'Pixie' });
    // seconda registrazione esplicita: nessun nuovo evento
    await request(app).put(`/api/partite/${id}/compendio/${pixie}`).send({ registrata: true, livelloRegistrato: 3 });
    expect(((await request(app).get(`/api/partite/${id}/storico?tipi=compendio-registrata`)).body.data as StoricoDto).totale).toBe(1);
    const skills = (await request(app).get('/api/compendio/skill?q=Agi')).body.data as SkillRiassuntoDto[];
    const dia = skills.find((x) => x.nome === 'Agi')!; // Pixie non conosce Agi: compare fra le «apprese»
    expect(poss.skill.some((x) => x.id === dia.id)).toBe(false);
    const nuoveSkill = [...poss.skill.map((x) => x.id).slice(0, 3), dia.id];
    await request(app).put(`/api/partite/${id}/persona/${poss.id}`).send({ livello: 9, skillIds: nuoveSkill, bonus: { forza: 1, magia: 1, resistenza: 1, agilita: 1, fortuna: 1 } });
    await request(app).put(`/api/partite/${id}/persona/${poss.id}`).send({ note: 'solo note' });
    s = (await request(app).get(`/api/partite/${id}/storico?persona=${pixie}`)).body.data as StoricoDto;
    expect(s.eventi.map((e) => e.tipo)).toEqual(['persona-statistiche', 'persona-skill', 'persona-livello', 'compendio-registrata', 'persona-aggiunta']);
    expect(s.eventi[0].dettaglio).toContain('FR +1');
    expect(s.eventi[1].dettaglio).toContain(dia.nomeIt);
    expect(s.eventi[2]).toMatchObject({ titolo: `${s.eventi[2].personaNomeIt} al livello 9`, dati: { da: 2, a: 9 } });
    await request(app).delete(`/api/partite/${id}/persona/${poss.id}`);
    s = (await request(app).get(`/api/partite/${id}/storico?persona=${pixie}&limite=1`)).body.data as StoricoDto;
    expect(s.eventi[0].tipo).toBe('persona-rimossa');
    expect(s.eventi[0].dettaglio).toContain('livello 9');
    expect(s.totale).toBe(6);
    expect(s.prossimo).toBe(s.eventi[0].id);

    // paginazione con cursore
    const tutto = (await request(app).get(`/api/partite/${id}/storico`)).body.data as StoricoDto;
    const pagina1 = (await request(app).get(`/api/partite/${id}/storico?limite=4`)).body.data as StoricoDto;
    expect(pagina1.eventi).toHaveLength(4);
    expect(pagina1.totale).toBe(tutto.totale);
    const pagina2 = (await request(app).get(`/api/partite/${id}/storico?limite=4&prima=${pagina1.prossimo}`)).body.data as StoricoDto;
    expect([...pagina1.eventi, ...pagina2.eventi].map((e) => e.id)).toEqual(tutto.eventi.slice(0, 8).map((e) => e.id));
    expect(pagina2.eventi.every((e) => e.id < pagina1.prossimo!)).toBe(true);

    // eliminazione di una voce e validazione
    const daEliminare = tutto.eventi[0];
    expect((await request(app).delete(`/api/partite/${id}/storico/${daEliminare.id}`)).status).toBe(204);
    expect(((await request(app).get(`/api/partite/${id}/storico`)).body.data as StoricoDto).totale).toBe(tutto.totale - 1);
    expect((await request(app).delete(`/api/partite/${id}/storico/${daEliminare.id}`)).status).toBe(404);
    expect((await request(app).get(`/api/partite/${id}/storico?limite=0`)).status).toBe(400);
    expect((await request(app).get('/api/partite/99999/storico')).status).toBe(404);
    expect(((await request(app).get(`/api/partite/${id}/storico?tipi=inesistente`)).body.data as StoricoDto).eventi).toEqual([]);

    // cancellare la partita cancella lo storico (cascade)
    const altra = await request(app).post('/api/partite').send({ nome: 'Effimera' });
    await request(app).delete(`/api/partite/${altra.body.data.id}`);
    expect((await request(app).get(`/api/partite/${altra.body.data.id}/storico`)).status).toBe(404);
  });

  it('elimina più voci in una volta (ids non esistenti o di altre partite ignorati)', async () => {
    const p = await request(app).post('/api/partite').send({ nome: 'Multi', livelloProtagonista: 3, difficolta: 'normale' });
    const id = (p.body.data as { id: number }).id;
    await request(app).put(`/api/partite/${id}`).send({ livelloProtagonista: 4 });
    await request(app).put(`/api/partite/${id}`).send({ livelloProtagonista: 5 });
    await request(app).put(`/api/partite/${id}`).send({ livelloProtagonista: 6 });
    const s = (await request(app).get(`/api/partite/${id}/storico`)).body.data as StoricoDto;
    expect(s.totale).toBeGreaterThanOrEqual(3);
    const ids = s.eventi.slice(0, 2).map((e) => e.id);
    const esito = await request(app).post(`/api/partite/${id}/storico/elimina`).send({ ids: [...ids, 999999] });
    expect(esito.status).toBe(200);
    expect(esito.body.data).toEqual({ eliminati: 2 });
    expect(((await request(app).get(`/api/partite/${id}/storico`)).body.data as StoricoDto).totale).toBe(s.totale - 2);
    expect((await request(app).post(`/api/partite/${id}/storico/elimina`).send({ ids: [] })).status).toBe(400);
  });
});
