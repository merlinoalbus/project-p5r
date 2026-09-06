// ============================================================
// Il contratto di visibilità dei pin, provato nei due sensi
// ============================================================
//
// La regola, come l'ha data l'utente: un pin si nasconde **solo** quando quella cosa, nel momento
// in cui consulti la guida, nel mondo non c'è. Un quartiere che apre il 18 giugno l'11 aprile non
// esiste, e i suoi negozi nemmeno: mostrarli manderebbe il giocatore in un posto che non c'è.
//
// L'altro senso conta quanto il primo, ed è quello che si era sbagliato. Gli elementi fissi —
// porte, forzieri, stanze sicure, passaggi, scale — ci sono sempre, e restano visibili anche
// quando sono chiusi o non ancora raggiunti: una porta chiusa si vede, altrimenti la guida ti
// direbbe dov'è solo dopo che l'hai aperta. Per un pezzo 1130 pin su 1339 sono stati marcati
// «da configurare» per via della loro bandiera nativa, e comparivano grigi: questo test esiste
// perché non ricapiti.
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import { closeDb, initDb, getDb } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { caricaSeed } from '../seed/caricaSeed.js';
import { sincronizzaMappe } from './sincronizzaMappe.js';
import { nascondeIlPin } from '../../../shared/condizioniSpillo.js';

const DIR_SEED = path.join('data', 'seed');

describe('visibilità condizionale dei pin', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    sincronizzaMappe(db);
  });
  afterAll(() => closeDb());

  function condizioniDi(mappa: string): Array<{ nome: string; condizioni: unknown[] }> {
    return (getDb().prepare('SELECT nome, condizioni_json FROM spillo WHERE mappa_chiave = ?')
      .all(mappa) as Array<{ nome: string; condizioni_json: string | null }>)
      .map((r) => ({ nome: r.nome, condizioni: r.condizioni_json ? JSON.parse(r.condizioni_json) : [] }));
  }

  it('i luoghi di un quartiere che si sblocca più avanti portano la condizione del quartiere', () => {
    const bloccati = condizioniDi('citta-shinjuku');
    expect(bloccati.length).toBeGreaterThan(0);
    // Il quartiere c'e' sempre; accanto puo' esserci la fascia oraria del locale, che e'
    // anch'essa presenza — un bar solo di sera, di giorno, non c'e'.
    for (const s of bloccati) {
      expect(s.condizioni).toContainEqual({ tipo: 'quartiere', quartiere: 'shinjuku' });
    }
  });

  it('un quartiere disponibile dall’inizio non nasconde niente', () => {
    for (const s of condizioniDi('citta-yongen-jaya')) expect(s.condizioni).toEqual([]);
  });

  it('gli elementi fissi delle planimetrie native non hanno condizioni di visibilità', () => {
    // sono porte, forzieri, stanze sicure, passaggi: ci sono sempre, anche quando sono chiusi
    const fissi = getDb().prepare(`SELECT COUNT(*) AS n FROM spillo
      WHERE mappa_chiave LIKE 'nativo-%' AND condizioni_json IS NOT NULL AND condizioni_json NOT IN ('', '[]')`)
      .get() as { n: number };
    expect(fissi.n).toBe(0);
    const quanti = getDb().prepare("SELECT COUNT(*) AS n FROM spillo WHERE mappa_chiave LIKE 'nativo-%'")
      .get() as { n: number };
    expect(quanti.n).toBeGreaterThan(1000);
  });

  it('l’unica condizione in uso è la presenza, non il prerequisito', () => {
    const tipi = new Set<string>();
    for (const r of getDb().prepare("SELECT condizioni_json FROM spillo WHERE condizioni_json IS NOT NULL AND condizioni_json NOT IN ('', '[]')")
      .all() as Array<{ condizioni_json: string }>) {
      for (const c of JSON.parse(r.condizioni_json) as Array<{ tipo: string }>) tipi.add(c.tipo);
    }
    // La regola generale, non l'elenco del momento: ogni condizione in uso deve essere di
    // presenza. `da-configurare` qui vorrebbe dire che una bandiera nativa e' tornata a
    // nascondere un pin; `dote` o `confidente` che un prerequisito e' tornato a farlo sparire.
    expect(tipi.size).toBeGreaterThan(0);
    for (const t of tipi) expect(nascondeIlPin(t)).toBe(true);
  });
});
