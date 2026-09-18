// ============================================================
// La migrazione 083 porta le domande della negoziazione dentro la guida alla battaglia
// ============================================================

import { closeDb, initDb, prepared } from '../dbService.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';
import { battaglia } from '../../services/battagliaService.js';
import { invalidaCacheTraduzioni } from '../../services/traduzioniService.js';
import { percorsoDatiNegoziazione } from './083_negoziazione_domande.js';

describe('migrazione 083 — domande della negoziazione', () => {
  beforeAll(() => { caricaPacchetto(initDb(':memory:')); invalidaCacheTraduzioni(); });
  afterAll(() => closeDb());

  it('il file dei dati sta nel repository ed è quello che il pacchetto porta', () => {
    expect(percorsoDatiNegoziazione()).not.toBeNull();
  });

  it('la guida alla battaglia serve le domande con i verdetti per personalità', () => {
    const n = battaglia().negoziazione;
    expect(n.domande?.length).toBeGreaterThan(200);
    expect(n.fonteDomande?.url).toContain('docs.google.com');
    const risposte = (n.domande ?? []).flatMap((d) => d.risposte);
    expect(risposte.length).toBeGreaterThan(600);
    const verdetti = risposte.flatMap((r) => r.verdetti);
    expect(verdetti.length).toBeGreaterThan(600);
    // i valori sono quelli del contratto: nessun residuo inglese
    expect(new Set(verdetti.map((v) => v.esito))).toEqual(new Set(['buona', 'passabile', 'cattiva']));
    expect(new Set(verdetti.map((v) => v.tratto))).toEqual(new Set(['giocosa', 'timida', 'irritabile', 'cupa']));
    // e ogni personalità ha sia risposte buone sia risposte cattive documentate
    for (const t of ['giocosa', 'timida', 'irritabile', 'cupa']) {
      expect(verdetti.some((v) => v.tratto === t && v.esito === 'buona')).toBe(true);
      expect(verdetti.some((v) => v.tratto === t && v.esito === 'cattiva')).toBe(true);
    }
  });

  it('non resta nel testo nessuna riga di verdetto letta per sbaglio come risposta', () => {
    const testi = (battaglia().negoziazione.domande ?? []).flatMap((d) => [d.domanda, ...d.risposte.map((r) => r.testo)]);
    expect(testi.filter((t) => /^(Good|OK|Bad)\s*-\s*(Gloomy|Timid|Upbeat|Irritable)/i.test(t))).toEqual([]);
  });

  it('applicata due volte non duplica niente', () => {
    const prima = battaglia().negoziazione.domande?.length;
    const riga = prepared("SELECT json FROM dati_guida WHERE chiave = 'battaglia'").get() as { json: string };
    expect(JSON.parse(riga.json).negoziazione.domande.length).toBe(prima);
  });
});
