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
import { atterraggioDelPalazzo, destinazioneDellaVoce, destinazionePalazzo, ingressoDelPalazzo, palazzoDiIngresso, palazzoDiOgniMappa } from '../services/palazziService.js';
import { chiaveMappa } from '../services/mappe/percorsiMappe.js';
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

  // 2026-10-31 (O9-4, migrazione 322: «Planimetrie delle aree fisse dei Memento si possono rimuovere»): le otto strutture fisse non ci sono
  // più; il ripiego dei Memento non ha una planimetria su cui cadere e resta sulla radice, mai su una mappa tolta. Un dungeon senza mappe non
  // porta da nessuna parte
  it('i Memento senza strutture fisse: il ripiego non cade su una mappa tolta; un dungeon senza mappe non porta da nessuna parte', () => {
    const tolte = ['nativo-rmap-190-1-0', 'nativo-rmap-190-2-0', 'nativo-rmap-190-3-0', 'nativo-rmap-190-51-0', 'nativo-rmap-190-61-0', 'nativo-rmap-190-62-0', 'nativo-rmap-192-62-0', 'nativo-rmap-195-11-0'];
    expect(prepared(`SELECT COUNT(*) FROM mappa WHERE chiave IN (${tolte.map(() => '?').join(',')})`).pluck().get(...tolte)).toBe(0);
    const memento = ingressoDelPalazzo('mementos')!;
    expect(tolte).not.toContain(memento.chiave);
    expect(prepared('SELECT 1 FROM mappa WHERE chiave = ?').pluck().get(memento.chiave)).toBe(1);
    expect(ingressoDelPalazzo('nessuno')).toBeNull();
  });

  // la mappa di Tokyo (`atterraggio` della scheda) segue la regola del Diario: i Memento senza una destinazione vera non atterrano
  // da nessuna parte (si apre la scheda dei Memento); i Palazzi restano con la loro destinazione unica
  it('atterraggio dalla mappa di Tokyo: la regola del Diario, per tipo di dungeon', () => {
    const conIngresso = ingressoDelPalazzo('mementos', undefined, { ripiego: false });
    if (!conIngresso) expect(atterraggioDelPalazzo('mementos', '05-09')).toBeNull();
    const kamoshida = destinazionePalazzo('kamoshida', '04-11')!;
    expect(atterraggioDelPalazzo('kamoshida', '04-11')).toEqual({ mappa: chiaveMappa(kamoshida.chiave), spillo: kamoshida.spilloId });
  });

  // 2026-10-30 («Memento - aree fisse — Strutture che i Memento riusano si può rimuovere»): nel Diario i Memento non ripiegano sulla
  // planimetria delle strutture fisse; senza atterraggio né ingresso la voce non ha «Sulla mappa». I Palazzi restano con il ripiego
  it('nel Diario i Memento senza ingresso non portano alle strutture fisse; i Palazzi sì alla prima planimetria', () => {
    const conIngresso = ingressoDelPalazzo('mementos', undefined, { ripiego: false });
    expect(destinazioneDellaVoce('mementos')).toEqual(conIngresso);
    if (!conIngresso) expect(destinazioneDellaVoce('mementos', '05-09')).toBeNull();
    expect(destinazioneDellaVoce('kamoshida', '04-11')).toEqual(destinazionePalazzo('kamoshida', '04-11'));
    expect(destinazioneDellaVoce('nessuno')).toBeNull();
  });
});
