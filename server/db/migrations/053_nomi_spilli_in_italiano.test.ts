// ============================================================
// 053 — la traduzione dei nomi degli spilli non identificati
// ============================================================
//
// Le due cose che contano: che il giapponese sparisca dai nomi che l'app mostra, e che **non si
// inventi** niente dove non si sa. Un nome nativo che non conosciamo resta esattamente com'è: è la
// traccia per identificarlo, e falsificarla sarebbe peggio che lasciarla scomoda.

import Database from 'better-sqlite3';
import { nomeSpilloTradotto, traduciNomiSpilli } from './053_nomi_spilli_in_italiano.js';

describe('nomeSpilloTradotto', () => {
  it('traduce il nome nativo e conserva il tipo, senza decidere che cosa sia lo spillo', () => {
    expect(nomeSpilloTradotto('Da identificare: «ミニマップ：自分用アイコン» (tipo 28)'))
      .toBe('Da identificare (tipo 28) — minimappa: icona del giocatore');
    expect(nomeSpilloTradotto('Da identificare: «ミニマップ：チェック» (tipo 43)'))
      .toBe('Da identificare (tipo 43) — minimappa: punto da esaminare');
  });

  it('decodifica anche il nome arrivato come byte esadecimali', () => {
    expect(nomeSpilloTradotto('Da identificare: «837d83438370838c83585f8341834383658380947a927582b582bd82c682ab82» (tipo 104)'))
      .toBe('Da identificare (tipo 104) — Covo dei Ladri: quando è stato posizionato un oggetto');
  });

  it('lascia stare quel che non sa tradurre e quel che non ha quella forma', () => {
    expect(nomeSpilloTradotto('Da identificare (tipo 115)')).toBeNull();
    expect(nomeSpilloTradotto('Da identificare: «ミニマップ：ignoto» (tipo 200)')).toBeNull();
    expect(nomeSpilloTradotto('Café Leblanc')).toBeNull();
  });
});

describe('traduciNomiSpilli', () => {
  const db = new Database(':memory:');
  beforeAll(() => {
    db.exec("CREATE TABLE spillo (id INTEGER PRIMARY KEY, nome TEXT, origine TEXT DEFAULT 'seed')");
    const ins = db.prepare('INSERT INTO spillo (id, nome, origine) VALUES (?, ?, ?)');
    ins.run(1, 'Da identificare: «ミニマップ：自分用アイコン» (tipo 28)', 'seed');
    ins.run(2, 'Da identificare: «ミニマップ：ベルベット» (tipo 20)', 'seed');
    ins.run(3, 'Da identificare (tipo 115)', 'seed');
    ins.run(4, 'Aula del protagonista', 'seed');
    // Uno che hai scritto tu con quel nome: non si tocca, anche se la forma coincide.
    ins.run(5, 'Da identificare: «ミニマップ：チェック» (tipo 43)', 'utente');
  });

  it('traduce solo le righe del seed che sa tradurre, e le altre restano', () => {
    expect(traduciNomiSpilli(db)).toBe(2);
    const nomi = (db.prepare('SELECT id, nome FROM spillo ORDER BY id').all() as Array<{ id: number; nome: string }>).map((r) => r.nome);
    expect(nomi[0]).toBe('Da identificare (tipo 28) — minimappa: icona del giocatore');
    expect(nomi[1]).toBe('Da identificare (tipo 20) — minimappa: Velluto');
    expect(nomi[2]).toBe('Da identificare (tipo 115)');
    expect(nomi[3]).toBe('Aula del protagonista');
    expect(nomi[4]).toBe('Da identificare: «ミニマップ：チェック» (tipo 43)');
  });

  it('rifarla non cambia più niente', () => {
    expect(traduciNomiSpilli(db)).toBe(0);
  });
});
