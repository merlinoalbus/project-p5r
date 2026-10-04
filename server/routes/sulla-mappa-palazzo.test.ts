// ============================================================
// «Sulla mappa» di una voce collegata a un Palazzo: l'ingresso in città (scelta dell'utente, 2026-10-01)
// ============================================================
//
// La voce «Prima infiltrazione tutorial nel Palazzo di Kamoshida…» apriva la radice `dungeon-kamoshida`, che non ha
// planimetria: nella scheda «Oggi» si vedeva l'elenco nudo delle stanze, fuori dal riquadro. Scelta dell'utente:
// «Ingresso in città» — lo spillo che da fuori porta dentro; senza ingresso, la prima planimetria del Palazzo.
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { ingressoDelPalazzo, palazzoDiIngresso, palazzoDiOgniMappa } from '../services/palazziService.js';
import type { PercorsoGiornoDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

/** La prima planimetria vera del Palazzo nell'ordine della scheda, letta qui per conto suo. */
const primaPlanimetria = (dungeon: string): string | undefined => {
  const palazzi = palazzoDiOgniMappa();
  return (prepared("SELECT chiave FROM mappa WHERE ruolo_immagine IN ('planimetria-nativa', 'illustrazione-editoriale') ORDER BY ordine, chiave").all() as Array<{ chiave: string }>)
    .map((r) => r.chiave).find((k) => k !== `dungeon-${dungeon}` && palazzi.get(k) === dungeon);
};

describe('«Sulla mappa» di un Palazzo', () => {
  beforeAll(() => {
    dbDiProva();
  });
  afterAll(() => closeDb());

  it('Kamoshida: lo spillo d’ingresso sulla mappa della Shujin, quello che a Palazzo completato si blocca', async () => {
    const ingresso = ingressoDelPalazzo('kamoshida')!;
    expect(ingresso.chiave).toBe('citta-shujin-academy');
    const spillo = prepared('SELECT id, mappa_chiave, riferimento_tipo, riferimento_chiave, seed_identita_json FROM spillo WHERE id = ?').get(ingresso.spilloId) as { id: number; mappa_chiave: string; riferimento_tipo: string | null; riferimento_chiave: string | null; seed_identita_json: string | null };
    expect(palazzoDiIngresso(spillo, null, palazzoDiOgniMappa())).toBe('kamoshida');
    // e la voce della guida del 12 aprile lo usa
    const id = ((await request(app).post('/api/partite').send({ nome: 'Sulla mappa' })).body.data as { id: number }).id;
    const g = (await request(app).get(`/api/compendio/percorso/04-12?partita=${id}`)).body.data as PercorsoGiornoDto;
    const voce = g.azioni.find((a) => a.riferimento?.tipo === 'dungeon' && a.riferimento.chiave === 'kamoshida')!;
    expect(voce.mappa).toEqual(ingresso);
  });

  it('con più ingressi vince quello aperto nel giorno della voce (la Shujin: il solo 11 aprile, poi dal 12 aprile)', async () => {
    /** Le condizioni salvate sullo spillo con quell'id (lista vuota se non ne ha o se lo spillo manca). */
    const condizioni = (id: number | null) => JSON.parse((prepared('SELECT condizioni_json FROM spillo WHERE id = ?').pluck().get(id) as string | null) ?? '[]') as unknown[];
    // nel pacchetto (canone di produzione) la Shujin ha i due ingressi: quello del solo 11 aprile (la prima infiltrazione)…
    const il11 = ingressoDelPalazzo('kamoshida', '04-11')!;
    expect(il11.chiave).toBe('citta-shujin-academy');
    expect(condizioni(il11.spilloId)).toEqual([{ tipo: 'intervallo', dal: '04-11', al: '04-11' }]);
    // …e quello dal 12 aprile al 2 maggio
    const il12 = ingressoDelPalazzo('kamoshida', '04-12')!;
    expect(il12.chiave).toBe('citta-shujin-academy');
    expect(il12.spilloId).not.toBe(il11.spilloId);
    expect(condizioni(il12.spilloId)).toEqual([{ tipo: 'intervallo', dal: '04-12', al: '05-02' }]);
    // la voce della guida dell'11 aprile porta al primo: è quello che quel giorno si vede sulla mappa
    const id = ((await request(app).post('/api/partite').send({ nome: 'Sulla mappa 11' })).body.data as { id: number }).id;
    const g = (await request(app).get(`/api/compendio/percorso/04-11?partita=${id}`)).body.data as PercorsoGiornoDto;
    const voce = g.azioni.find((a) => a.riferimento?.tipo === 'dungeon' && a.riferimento.chiave === 'kamoshida');
    expect(voce?.azione).toMatch(/^Prima infiltrazione tutorial nel Palazzo di Kamoshida/);
    expect(voce!.mappa).toEqual(il11);
  });

  it('un Palazzo senza ingresso sulle mappe: la sua prima planimetria in ordine logico, mai la radice', () => {
    // Madarame: si tolgono gli eventuali ingressi da fuori, per esserne certi
    const palazzi = palazzoDiOgniMappa();
    const destinazioni = new Map((prepared('SELECT spillo_id, mappa_chiave FROM spillo_destinazione WHERE mappa_chiave IS NOT NULL').all() as Array<{ spillo_id: number; mappa_chiave: string }>).map((d) => [d.spillo_id, d.mappa_chiave]));
    for (const s of prepared('SELECT id, mappa_chiave, riferimento_tipo, riferimento_chiave, seed_identita_json FROM spillo WHERE mappa_chiave IS NOT NULL').all() as Array<{ id: number; mappa_chiave: string; riferimento_tipo: string | null; riferimento_chiave: string | null; seed_identita_json: string | null }>) {
      if (palazzoDiIngresso(s, destinazioni.get(s.id) ?? null, palazzi) === 'madarame') prepared('DELETE FROM spillo WHERE id = ?').run(s.id);
    }
    const attesa = primaPlanimetria('madarame');
    expect(attesa).toBeTruthy();
    expect(ingressoDelPalazzo('madarame')).toEqual({ chiave: attesa, spilloId: null });
  });

  it('i Memento (le richieste) seguono la stessa regola; un dungeon senza mappe non porta da nessuna parte', () => {
    const memento = ingressoDelPalazzo('mementos')!;
    expect(memento.chiave).not.toBe('dungeon-mementos');
    expect(ingressoDelPalazzo('nessuno')).toBeNull();
  });
});
