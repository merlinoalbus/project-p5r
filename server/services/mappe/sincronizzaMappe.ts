import { riconciliaAreeGuida } from './organizzazioneMappe.js';
import type { RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { categoriaSpillo } from '../../../shared/spilli.js';
import { finestraDaDate, unisci } from './presenzaEntita.js';
import { sincronizzaPercorsiMappe } from './percorsiMappe.js';
// ============================================================
// sincronizzaMappe — crea l'albero delle mappe dalle entità della guida e gli spilli dai marcatori esistenti (Fase 13.1)
// ============================================================
//
// Idempotente: aggiunge solo ciò che manca (mai sovrascrive modifiche dell'utente). Usata dalla migrazione 027 e dai
// test; dal 2026-09-12 nessun avvio la chiama (il pacchetto di gioco è la fotografia dell'istanza di produzione).
//   - `tokyo` (città) → `citta-<quartiere>` (quartiere, entità quartiere, asset `mappe/citta-<q>`, immagine dell'istanza se già scaricata)
//   - `dungeon-<chiave>` (palazzo | dedalo, asset `palazzi/<chiave>`) → `<area>` (area, entità area, immagine dell'istanza se presente)
//   - spilli: uno per marcatore dei punti (riferimento `punto`) e dei luoghi (riferimento `luogo`), stessa origine del marcatore;
//     passaggi verso le mappe figlie (Tokyo → quartieri, Palazzo/Dedalo → aree) disposti in griglia, da posizionare nell'editor.
// ============================================================

import { nowIso } from '../../db/dbService.js';
import type { AppDatabase } from '../../db/dbService.js';
import { spilloPerPunto } from '../../../shared/spilli.js';
import { spilloPerLuogo } from '../../../shared/tipiLuogo.js';
import { assegnaUidMancanti } from './identitaSpillo.js';

function adesso(): string { return new Date().toISOString(); }

/** Posizioni (in percentuale) dei quartieri sulla mappa globale di Tokyo del gioco (stima dalla mappa ufficiale: da rifinire nell'editor). */
const POSIZIONI_TOKYO: Record<string, [number, number]> = {
  'citta-ogikubo': [16.5, 23], 'citta-nakano': [23, 26], 'citta-shinjuku': [30, 28], 'citta-ikebukuro': [38.5, 20], 'citta-ichigaya': [41.5, 29],
  'citta-ueno': [62.5, 19], 'citta-suidobashi': [59.5, 27], 'citta-asakusa': [75.5, 17.5], 'citta-akihabara': [70.5, 29.5], 'citta-kanda-jinbocho': [69, 38.5],
  'citta-meiji-shrine': [20, 37.5], 'citta-harajuku': [28, 38.5], 'citta-inokashira-park': [10, 41.5], 'citta-kichijoji': [14, 47], 'citta-maihama': [92, 45],
  'citta-shibuya': [34.5, 49.5], 'citta-mementos': [36, 56], 'citta-shujin-academy': [45, 46.5], 'citta-roppongi': [54, 55], 'citta-tsukishima': [85, 61],
  'citta-yongen-jaya': [18, 56], 'citta-shinagawa': [60, 68], 'citta-yokohama-chinatown': [9, 76], 'citta-odaiba': [74, 79],
};

/** Posizione di partenza del passaggio verso una mappa figlia: Tokyo dalla tabella, Mementos lungo la discesa verticale, altrimenti griglia. */
function posizionePassaggio(radice: string, figlia: string, i: number, n: number): [number, number] {
  if (radice === 'tokyo' && POSIZIONI_TOKYO[figlia]) return POSIZIONI_TOKYO[figlia];
  if (radice === 'dungeon-mementos') return [i % 2 === 0 ? 44 : 56, Math.min(95, 10 + (i * 80) / Math.max(1, n - 1))];
  const colonne = Math.max(1, Math.ceil(Math.sqrt(n)));
  const righe = Math.max(1, Math.ceil(n / colonne));
  return [10 + (80 * (i % colonne)) / Math.max(1, colonne - 1), 10 + (80 * Math.floor(i / colonne)) / Math.max(1, righe - 1)];
}

/** Un tipo di luogo che oggi ha uno spillo proprio, e quello con cui il pin nasceva prima (2026-09-12):
 *  la scuola era «attività» (il «servizio» resta sull'icona generica dell'attività: il Leblanc e la palestra non sono lavanderie). */
const VECCHIA_CORRISPONDENZA: Record<string, string> = { scuola: 'attivita' };

/** Gli spilli di seed dei luoghi seguono il catalogo dei tipi di luogo (shared/tipiLuogo) quando la
 *  corrispondenza cambia. Regola **mirata**: si tocca solo lo spillo rimasto al tipo della vecchia
 *  corrispondenza; i pacchetti possono assegnare tipi più fini (il bagno pubblico è «terme», non
 *  «lavanderia») e quelli restano. Non tocca gli spilli dell'utente. Si rifà a ogni avvio come le
 *  altre regole sui dati. */
export function riallineaSpilliLuoghi(db: AppDatabase): number {
  const tabelle = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>).map((r) => r.name));
  if (!tabelle.has('spillo') || !tabelle.has('luogo')) return 0;
  const agg = db.prepare(`UPDATE spillo SET tipo = ?, updated_at = ? WHERE origine = 'seed' AND riferimento_tipo = 'luogo' AND tipo = ?
    AND riferimento_chiave IN (SELECT chiave FROM luogo WHERE tipo = ?)`);
  const t = nowIso();
  let n = 0;
  for (const [tipoLuogo, vecchio] of Object.entries(VECCHIA_CORRISPONDENZA)) {
    const nuovo = spilloPerLuogo(tipoLuogo);
    if (nuovo !== vecchio) n += agg.run(nuovo, t, vecchio, tipoLuogo).changes;
  }
  return n;
}

export function sincronizzaMappe(db: AppDatabase): { mappe: number; spilli: number; riclassificati: number; conSblocco: number } {
  const tabelle = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((r) => r.name));
  if (!tabelle.has('mappa')) return { mappe: 0, spilli: 0, riclassificati: 0, conSblocco: 0 };
  const immaginiMappa = new Set(tabelle.has('immagine') ? (db.prepare("SELECT chiave FROM immagine WHERE ambito = 'mappa'").all() as Array<{ chiave: string }>).map((r) => r.chiave) : []);
  // Tokyo, i quartieri e i Palazzi portano illustrazioni disegnate per l'applicazione, non piante
  // estratte dal gioco: il ruolo lo dichiarano qui, invece di lasciarlo dedurre dall'asset. La
  // colonna arriva con la migrazione 043, mentre questa funzione gira già dalla 027: dove non
  // c'è ancora, l'inserimento la omette e la 043 assegnerà il ruolo alle righe esistenti.
  const conRuolo = (db.prepare('PRAGMA table_info(mappa)').all() as Array<{ name: string }>).some((c) => c.name === 'ruolo_immagine');
  const insMappa = db.prepare(`INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, immagine_chiave, asset, entita_tipo, entita_chiave, origine, updated_at${conRuolo ? ', ruolo_immagine' : ''})
    VALUES (@chiave, @nome, @tipo, @genitore, @ordine, @immagine, @asset, @entitaTipo, @entitaChiave, 'seed', @adesso${conRuolo ? ", CASE WHEN @asset IS NULL AND @immagine IS NULL THEN 'nessuna' WHEN @asset LIKE 'palazzi/%' THEN 'emblema' ELSE 'illustrazione-editoriale' END" : ''})
    ON CONFLICT(chiave) DO UPDATE SET immagine_chiave = COALESCE(mappa.immagine_chiave, excluded.immagine_chiave), asset = COALESCE(mappa.asset, excluded.asset)${conRuolo ? ", ruolo_immagine = CASE WHEN mappa.ruolo_immagine <> 'nessuna' THEN mappa.ruolo_immagine ELSE excluded.ruolo_immagine END" : ''}`);
  let mappe = 0;
  const prima = (db.prepare('SELECT COUNT(*) AS n FROM mappa').get() as { n: number }).n;
  const t = adesso();
  insMappa.run({ chiave: 'tokyo', nome: 'Tokyo', tipo: 'citta', genitore: null, ordine: 0, immagine: immaginiMappa.has('tokyo') ? 'tokyo' : null, asset: 'mappe/tokyo', entitaTipo: null, entitaChiave: null, adesso: t });
  if (tabelle.has('quartiere')) {
    for (const q of db.prepare('SELECT chiave, nome, ordine FROM quartiere ORDER BY ordine').all() as Array<{ chiave: string; nome: string; ordine: number }>) {
      const chiave = `citta-${q.chiave}`;
      insMappa.run({ chiave, nome: q.nome, tipo: 'quartiere', genitore: 'tokyo', ordine: q.ordine, immagine: immaginiMappa.has(chiave) ? chiave : null, asset: `mappe/${chiave}`, entitaTipo: 'quartiere', entitaChiave: q.chiave, adesso: t });
    }
  }
  if (tabelle.has('dungeon')) {
    for (const d of db.prepare('SELECT chiave, nome, tipo, ordine FROM dungeon ORDER BY ordine').all() as Array<{ chiave: string; nome: string; tipo: string; ordine: number }>) {
      const chiave = `dungeon-${d.chiave}`;
      insMappa.run({ chiave, nome: d.nome, tipo: d.tipo === 'mementos' ? 'dedalo' : 'palazzo', genitore: null, ordine: 100 + d.ordine, immagine: null, asset: `palazzi/${d.chiave}`, entitaTipo: 'dungeon', entitaChiave: d.chiave, adesso: t });
      for (const a of db.prepare('SELECT chiave, nome, ordine FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine').all(d.chiave) as Array<{ chiave: string; nome: string; ordine: number }>) {
        if (tabelle.has('guida_mappa') && !db.prepare('SELECT 1 FROM mappa WHERE chiave=?').get(a.chiave)) {
          db.prepare("INSERT OR IGNORE INTO guida_mappa(area_chiave,nome,note,metadata_json) VALUES(?,?,'','{}')").run(a.chiave,a.nome);
          db.prepare('INSERT OR IGNORE INTO guida_alias(chiave,area_chiave) VALUES(?,?)').run(a.chiave,a.chiave);
          continue;
        }
        insMappa.run({ chiave: a.chiave, nome: a.nome, tipo: 'area', genitore: chiave, ordine: a.ordine, immagine: immaginiMappa.has(a.chiave) ? a.chiave : null, asset: null, entitaTipo: 'area', entitaChiave: a.chiave, adesso: t });
      }
    }
  }
  mappe = (db.prepare('SELECT COUNT(*) AS n FROM mappa').get() as { n: number }).n - prima;

  // ---- Spilli dai marcatori ----
  const esiste = db.prepare('SELECT 1 FROM spillo WHERE riferimento_tipo = ? AND riferimento_chiave = ?');
  const insSpillo = db.prepare(`INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, collezionabile, ordine, origine, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const mappaEsiste = db.prepare('SELECT 1 FROM mappa WHERE chiave = ?');
  // I quartieri con una data di sblocco: prima di quella data non ci sono, e i loro pin nemmeno.
  // La colonna arriva con una migrazione: dove lo schema è ancora indietro non c'è, e chiedere
  // comunque farebbe fallire tutta la sincronizzazione invece di saltare una condizione.
  const haSblocco = tabelle.has('quartiere') && (db.prepare("SELECT name FROM pragma_table_info('quartiere')")
    .all() as Array<{ name: string }>).some((c) => c.name === 'sblocco_data');
  const quartieriConSblocco = new Set(haSblocco
    ? (db.prepare("SELECT chiave FROM quartiere WHERE sblocco_data IS NOT NULL AND sblocco_data <> ''").all() as Array<{ chiave: string }>).map((q) => q.chiave)
    : []);
  // Le finestre dei Palazzi, trascritte in `data/seed/finestre-dungeon.json` e caricate in
  // `dati_guida`: nel catalogo le date sono prosa, e ricavarle con un'espressione regolare
  // vorrebbe dire sbagliarne qualcuna senza accorgersene.
  const finestrePerDungeon = new Map<string, RequisitoSpillo[]>();
  const luoghiDungeon = new Map<string, { mappa: string; nomeMappa: string; descrizione: string }>();
  const nomiDungeon = new Map<string, string>(tabelle.has('dungeon')
    ? (db.prepare('SELECT chiave, nome FROM dungeon').all() as Array<{ chiave: string; nome: string }>).map((d) => [d.chiave, d.nome])
    : []);
  if (tabelle.has('dati_guida')) {
    const riga = db.prepare("SELECT json FROM dati_guida WHERE chiave = 'finestre-dungeon'").get() as { json: string } | undefined;
    if (riga) {
      try {
        const dati = JSON.parse(riga.json) as { finestre?: Array<{ dungeon: string; dal?: string | null; al?: string | null; luogo?: { mappa?: string | null; nome?: string | null } }> };
        for (const f of dati.finestre ?? []) {
          finestrePerDungeon.set(f.dungeon, finestraDaDate(f.dal, f.al));
          const l = f.luogo;
          // solo dove il punto del mondo reale è dichiarato: un ingresso inventato porterebbe il
          // giocatore nel posto sbagliato, che è peggio di non avere il collegamento
          if (l?.mappa) {
            luoghiDungeon.set(f.dungeon, {
              mappa: l.mappa,
              nomeMappa: nomiDungeon.get(f.dungeon) ?? f.dungeon,
              descrizione: `Ingresso nel Metaverso${l.nome ? ` — ${l.nome}` : ''}.`,
            });
          }
        }
      } catch { /* una trascrizione illeggibile non deve impedire la sincronizzazione */ }
    }
  }
  let conSblocco = 0;
  let spilli = 0;
  let riclassificati = 0;
  if (tabelle.has('marcatore_mappa') && tabelle.has('punto_interesse')) {
    const righe = db.prepare(`SELECT m.punto_chiave, m.x, m.y, m.origine, p.area_chiave, p.tipo, p.nome, p.descrizione, p.ordine, p.esauribile
      FROM marcatore_mappa m JOIN punto_interesse p ON p.chiave = m.punto_chiave`).all() as Array<{ punto_chiave: string; x: number; y: number; origine: string; area_chiave: string; tipo: string; nome: string; descrizione: string; ordine: number; esauribile: number }>;
    for (const r of righe) {
      if (esiste.get('punto', r.punto_chiave)) continue;
      const guida = tabelle.has('guida_mappa') && db.prepare('SELECT 1 FROM guida_mappa WHERE area_chiave=?').get(r.area_chiave);
      if (!mappaEsiste.get(r.area_chiave) && !guida) continue;
      const tipo = spilloPerPunto(r.tipo);
      // collezionabile lo dice la categoria (consumabile), non il punto: le stesse regole dell'API (2026-09-12)
      const collezionabile = categoriaSpillo(tipo) === 'consumabile' ? 1 : 0;
      if (guida && !mappaEsiste.get(r.area_chiave)) {
        db.prepare(`INSERT INTO spillo(mappa_chiave,area_guida_chiave,ruolo_guida,tipo,nome,descrizione,x,y,riferimento_tipo,riferimento_chiave,collezionabile,ordine,origine,updated_at) VALUES(NULL,?,'punto',?,?,?,?,?,'punto',?,?,?,?,?)`).run(r.area_chiave,tipo,r.nome,r.descrizione,r.x,r.y,r.punto_chiave,collezionabile,r.ordine,r.origine === 'seed'?'seed':'utente',t);
      } else insSpillo.run(r.area_chiave, tipo, r.nome, r.descrizione, r.x, r.y, 'punto', r.punto_chiave, collezionabile, r.ordine, r.origine === 'seed' ? 'seed' : 'utente', t);
      spilli++;
    }
    // ---- Riclassificazione degli spilli di seed già esistenti: quando la corrispondenza `spilloPerPunto` cambia (per esempio con
    // i tipi nemico, oggetto-chiave, punto-sensibile, tesoro-palazzo, seme-bramosia) tipo e collezionabilità seguono il registro.
    // Non tocca gli spilli creati dall'utente né gli stati per partita (`spillo_partita` è legata all'uid, che non cambia). ----
    const aggSpillo = db.prepare(`UPDATE spillo SET tipo = ?, collezionabile = ?, updated_at = ?
      WHERE riferimento_tipo = 'punto' AND riferimento_chiave = ? AND origine = 'seed' AND (tipo <> ? OR collezionabile <> ?)`);
    for (const r of righe) {
      const tipo = spilloPerPunto(r.tipo);
      // collezionabile lo dice la categoria (consumabile), non il punto: le stesse regole dell'API (2026-09-12)
      const collezionabile = categoriaSpillo(tipo) === 'consumabile' ? 1 : 0;
      riclassificati += aggSpillo.run(tipo, collezionabile, t, r.punto_chiave, tipo, collezionabile).changes;
    }
  }
  if (tabelle.has('marcatore_luogo') && tabelle.has('luogo')) {
    const righe = db.prepare(`SELECT m.luogo_chiave, m.x, m.y, m.origine, l.quartiere_chiave, l.tipo, l.nome, l.cosa_offre, l.ordine
      FROM marcatore_luogo m JOIN luogo l ON l.chiave = m.luogo_chiave`).all() as Array<{ luogo_chiave: string; x: number; y: number; origine: string; quartiere_chiave: string; tipo: string; nome: string; cosa_offre: string; ordine: number }>;
    for (const r of righe) {
      const mappa = `citta-${r.quartiere_chiave}`;
      if (esiste.get('luogo', r.luogo_chiave) || !mappaEsiste.get(mappa)) continue;
      // Uno spillo di città **non è condizionato** (richiesta dell'utente, 2026-09-11): la
      // disponibilità è del negozio o dell'attività che mostra, non del segnalino. Il quartiere
      // che si sblocca più avanti nasconde il **passaggio** che ci porta (sotto), non i suoi luoghi.
      insSpillo.run(mappa, spilloPerLuogo(r.tipo), r.nome, r.cosa_offre, r.x, r.y, 'luogo', r.luogo_chiave, 0, r.ordine, r.origine === 'seed' ? 'seed' : 'utente', t);
      spilli++;
    }
    riclassificati += riallineaSpilliLuoghi(db);
  }
  // ---- Passaggi automatici verso le mappe figlie (Tokyo → quartieri, Palazzo/Dedalo → aree): posizioni predefinite (Tokyo dalla mappa ufficiale, Mementos in verticale) o griglia, da trascinare nell'editor ----
  const figlieDi = db.prepare("SELECT chiave, nome FROM mappa WHERE genitore_chiave = ? ORDER BY ordine, chiave");
  for (const radice of db.prepare("SELECT chiave FROM mappa WHERE origine = 'seed' AND (tipo = 'citta' OR tipo = 'palazzo' OR tipo = 'dedalo')").all() as Array<{ chiave: string }>) {
    const figlie = figlieDi.all(radice.chiave) as Array<{ chiave: string; nome: string }>;
    figlie.forEach((f, i) => {
      // Le planimetrie native richiedono ingressi reali: la griglia non è una connessione del gioco.
      if (f.chiave.startsWith('nativo-')) return;
      // I Memento stanno fuori dall'atlante e hanno una pagina loro: niente passaggio da Tokyo,
      // altrimenti resta la porta di servizio verso una radice che dall'indice è stata tolta.
      if (f.chiave === 'citta-mementos') return;
      if (esiste.get('mappa', f.chiave)) return;
      const [x, y] = posizionePassaggio(radice.chiave, f.chiave, i, figlie.length);
      const passaggio = insSpillo.run(radice.chiave, 'passaggio', f.nome, '', Math.round(x * 10) / 10, Math.round(y * 10) / 10, 'mappa', f.chiave, 0, i, 'seed', t);
      // Anche la via per arrivarci: se il quartiere non è ancora sbloccato, sulla mappa di Tokyo
      // non deve esserci nemmeno il passaggio che ci porta.
      const quartiere = f.chiave.startsWith('citta-') ? f.chiave.slice('citta-'.length) : null;
      const dungeon = f.chiave.startsWith('dungeon-') ? f.chiave.slice('dungeon-'.length) : null;
      // Un Palazzo esiste solo fra il giorno in cui si apre e quello in cui scade: fuori da quella
      // finestra il passaggio che ci porta non deve esserci.
      const presenzaFiglia = unisci(
        quartiere && quartieriConSblocco.has(quartiere) ? [{ tipo: 'quartiere' as const, quartiere }] : [],
        dungeon ? (finestrePerDungeon.get(dungeon) ?? []) : []);
      if (presenzaFiglia.length) {
        db.prepare('UPDATE spillo SET condizioni_json = ? WHERE id = ?')
          .run(JSON.stringify(presenzaFiglia), Number(passaggio.lastInsertRowid));
        conSblocco++;
      }
      spilli++;
    });
  }
  riconciliaAreeGuida(db);
  sincronizzaPercorsiMappe(db);
  // ogni spillo inserito qui riceve l'uid della sua identità (se la colonna c'è già: la 027 gira prima della 067)
  assegnaUidMancanti(db);
  return { mappe, spilli, riclassificati, conSblocco };
}


/** Il pin che, dalla mappa dove il Palazzo sta davvero, ci porta dentro.
 *
 * Un Palazzo non è un mondo a parte: il castello di Kamoshida è la scuola, il museo di Madarame è
 * Central Street a Shibuya. Finché la sua mappa restava una radice senza nulla che ci portasse, il
 * mondo non era uno — e la finestra di tempo del Palazzo non aveva dove posarsi, perché le
 * condizioni vivono sugli spilli e nessuno spillo ci arrivava.
 *
 * Va eseguita **dopo** l'importazione dei pacchetti, non dentro la sincronizzazione: `importaMappe`
 * ripulisce gli spilli di seed delle mappe che importa, e il pin di Futaba su Yongen-Jaya veniva
 * creato e subito cancellato da un pacchetto successivo — spariva senza che nulla lo segnalasse.
 *
 * Dove il punto del mondo reale non è dichiarato da nessuna fonte, il Palazzo si aggancia alla
 * mappa generale di Tokyo: raggiungibile e onesto, invece che irraggiungibile o messo a caso.
 */
export function collegaPalazziAiLuoghi(db: AppDatabase): number {
  const t = nowIso();
  const tabelle = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>).map((x) => x.name));
  if (!tabelle.has('mappa') || !tabelle.has('dati_guida')) return 0;
  const riga = db.prepare("SELECT json FROM dati_guida WHERE chiave = 'finestre-dungeon'").get() as { json: string } | undefined;
  if (!riga) return 0;
  let dati: { finestre?: Array<{ dungeon: string; dal?: string | null; al?: string | null; luogo?: { mappa?: string | null; nome?: string | null } }> };
  try { dati = JSON.parse(riga.json) as typeof dati; } catch { return 0; }
  const nomi = new Map<string, string>(tabelle.has('dungeon')
    ? (db.prepare('SELECT chiave, nome FROM dungeon').all() as Array<{ chiave: string; nome: string }>).map((d) => [d.chiave, d.nome])
    : []);
  const mappaEsiste = db.prepare('SELECT 1 FROM mappa WHERE chiave = ?');
  const esiste = db.prepare("SELECT 1 FROM spillo WHERE riferimento_tipo = 'mappa' AND riferimento_chiave = ?");
  const inserisci = db.prepare(`INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, collezionabile, ordine, origine, updated_at)
    VALUES (?, 'passaggio', ?, ?, ?, ?, 'mappa', ?, 0, ?, 'seed', ?)`);
  let creati = 0;
  for (const f of dati.finestre ?? []) {
    // I Memento restano fuori dall'atlante: non sono un luogo che si raggiunge da Tokyo, sono un
    // pozzo con una pagina sua. Un pin d'ingresso sulla mappa generale porterebbe a una radice che
    // dall'indice delle mappe e' stata tolta apposta.
    if (f.dungeon === 'mementos') continue;
    const mappaPalazzo = `dungeon-${f.dungeon}`;
    const dove = f.luogo?.mappa;
    if (!dove || !mappaEsiste.get(dove) || !mappaEsiste.get(mappaPalazzo) || esiste.get(mappaPalazzo)) continue;
    const quante = (db.prepare('SELECT COUNT(*) AS n FROM spillo WHERE mappa_chiave = ?').get(dove) as { n: number }).n;
    const [x, y] = posizionePassaggio(dove, mappaPalazzo, quante, quante + 1);
    const creato = inserisci.run(dove, nomi.get(f.dungeon) ?? f.dungeon,
      `Ingresso nel Metaverso${f.luogo?.nome ? ` — ${f.luogo.nome}` : ''}.`,
      Math.round(x * 10) / 10, Math.round(y * 10) / 10, mappaPalazzo, quante, t);
    const finestra = finestraDaDate(f.dal, f.al);
    if (finestra.length) {
      db.prepare('UPDATE spillo SET condizioni_json = ? WHERE id = ?')
        .run(JSON.stringify(finestra), Number(creato.lastInsertRowid));
    }
    creati += 1;
  }
  assegnaUidMancanti(db);
  return creati;
}
