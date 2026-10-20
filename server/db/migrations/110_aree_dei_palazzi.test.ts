// ============================================================
// Test 110 — le Aree dei Palazzi e i legami infiltrazione ↔ area, il diario (L3, 2026-10-20), su una copia ridotta con i casi reali:
// Kamoshida con 152-1-0 (cinque versioni, ordine di mappa diverso da quello del gruppo), 151-6-0 e un gruppo `utente:`; Madarame con
// 153-5-0 (pin 777), 153-7-0 (predefinita ultima) e il Labirinto `generica`; Futaba con infiltrazioni senza planimetria; Iweleth; Memento.
// In più il confronto dorato dei 117 nomi (riferimento calcolato con le funzioni vere del FE sui dati di sviluppo, uguale a l3aree-dev.json).
// ============================================================

import { closeDb, initDb, type AppDatabase } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import {
  assegnaAreePalazzi110, CORREZIONI_TEAM, diarioCurato110, INFILTRAZIONI, migration110, nomeAreaPalazzo110, PROPOSTE_G022, SEGNALATA, VOCE_NUOVA,
  type IdentitaPlanimetria110,
} from './110_aree_dei_palazzi.js';
import nomiDorati from './dati/110-nomi-aree-palazzi.json';

/** Le migrazioni fino alla 109 e la 110 (la si registra in index.ts quando i servizi di L3 la leggono). */
const CON_LA_110 = [...migrations.filter((m) => m.id < 110), migration110];

afterEach(() => closeDb());

/** I valori di oggi delle voci che il team corregge (dati/ di sviluppo e produzione al 2026-10-20). */
const VOCI_DA_CORREGGERE: Record<string, { data: string; azione: string; note: string | null; rif: [string, string]; testo: string }> = {
  c9efdb83a3eeb29a6ceea9a6f6cc2ea2: { data: '08-03', azione: 'Palazzo di Futaba: esplorazione della Camera del Rigetto e della Camera del Rimorso, risoluzione di puzzle', note: null, rif: ['dungeon', 'futaba'], testo: 'Palazzo di Futaba' },
  '7dd92df212b81bb87aba6e7a2fa8c874': { data: '10-29', azione: 'Palazzo di Sae Niijima: ingresso iniziale nel Casino', note: 'Ricompensa: ciondolo del Leblanc da Sojiro', rif: ['confidente', 'makoto'], testo: 'Palazzo di Sae Niijima' },
  dece90bfb20d9d3328f2a6b0ca417590: { data: '11-14', azione: 'Palazzo di Niijima: Lobby del Piano Puntate Alte', note: null, rif: ['confidente', 'makoto'], testo: 'Palazzo di Sae Niijima' },
  '589d82e823703ee879d72f974fd51139': { data: '11-19', azione: "Palazzo di Sae Niijima: battaglia contro l'Ombra di Sae", note: "Trofeo: Lastrico del Casino dell'Invidia", rif: ['confidente', 'makoto'], testo: 'Palazzo di Sae Niijima' },
  '65fdbeab5101e6068310fea982553d22': { data: '06-20', azione: 'Palazzo di Kaneshiro: prima esplorazione', note: 'Usare attacchi nucleari contro i nemici', rif: ['dungeon', 'kaneshiro'], testo: 'Palazzo di Kaneshiro' },
  '527cf9832e94e93e855436191e06f8b6': { data: '11-24', azione: "Palazzo di Shido: Ponte Anteriore, Sala d'ingresso", note: 'Assicurarsi di avere equipaggiata una Persona di Arcano Imperatrice per i giorni successivi', rif: ['dungeon', 'shido'], testo: 'Palazzo di Shido' },
};

/** Lo schema fino alla 109 e i dati di prova, con le stesse chiavi della produzione. */
function primaDella110(): AppDatabase {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 110));
  const d = db.prepare('INSERT INTO dungeon (chiave, tipo, ordine, nome) VALUES (?, ?, ?, ?)');
  const nomi: Record<string, string> = { kamoshida: 'Palazzo di Kamoshida', madarame: 'Palazzo di Madarame', kaneshiro: 'Palazzo di Kaneshiro', futaba: 'Palazzo di Futaba', okumura: 'Palazzo di Okumura', niijima: 'Palazzo di Niijima', shido: 'Palazzo di Shido', iweleth: 'Dedalo di Iweleth', maruki: 'Palazzo di Maruki' };
  Object.entries(nomi).forEach(([k, n], i) => d.run(k, 'palazzo', i + 1, n));
  d.run('mementos', 'mementos', 10, 'Memento');
  // le infiltrazioni di G-022, con ordine e nome dell'app; una di Iweleth e un dedalo dei Memento
  const inf = db.prepare('INSERT INTO dungeon_area (chiave, dungeon_chiave, ordine, nome) VALUES (?, ?, ?, ?)');
  for (const [palazzo, elenco] of Object.entries(INFILTRAZIONI)) elenco.forEach(([chiave, nome], i) => inf.run(chiave, palazzo, i, nome));
  inf.run('iweleth-01-entrata', 'iweleth', 0, 'Entrata');
  inf.run('mementos-01-chemdah', 'mementos', 0, 'Chemdah');
  const m = db.prepare("INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, entita_tipo, entita_chiave, origine, nome_rivisto, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'x')");
  for (const k of [...Object.keys(nomi), 'mementos']) m.run(`dungeon-${k}`, k === 'mementos' ? 'Memento' : nomi[k], k === 'mementos' ? 'dedalo' : 'palazzo', null, 100, 'dungeon', k, 'seed', 0);
  const p = db.prepare('INSERT INTO mappa_presentazione (mappa_chiave, contesti_json, gruppo_immagini_json) VALUES (?, ?, ?)');
  const gruppo = (id: string, nome: string, ordine: number, etichetta: string, nomeRivisto?: boolean) => JSON.stringify({ id, nome, ordine, etichetta, ...(nomeRivisto ? { nomeRivisto } : {}) });
  // Kamoshida: 152-1-0 (versione #0 all'ordine 1; 151-16-0 prima per ordine di mappa, col nome rivisto «Sala Centrale»)
  const prigione = 'nativo-rmap-152-1-0';
  [['nativo-rmap-152-1-0', 'Prigione sotterranea - Tutorial', 1, 0, 'Prigione sotterranea -1P', 1], ['nativo-rmap-152-2-0', 'Prigione sotterranea - Tutorial', 4, 1, 'Prigione sotterranea -2P', 1],
    ['nativo-rmap-151-16-0', 'Sala Centrale', 0, 2, 'Sala Centrale', 1], ['nativo-rmap-152-4-0', 'Passaggio sotterraneo', 2, 3, 'Passaggio sotterraneo', 0],
    ['nativo-rmap-152-6-0', "Palestra dell'amore", 3, 4, "Palestra dell'Amore", 0]].forEach(([k, n, o, g, e, r]) => {
    m.run(k, n, 'area', 'dungeon-kamoshida', o, null, null, 'utente', r);
    p.run(k, '[]', gruppo(prigione, 'Prigione sotterranea - Tutorial', g as number, e as string));
  });
  // il Tetto (seed, gruppo non rivisto) e un gruppo dell'utente
  m.run('nativo-rmap-151-6-0', 'Tetto', 'area', 'dungeon-kamoshida', 10, null, null, 'seed', 0);
  m.run('nativo-rmap-151-6-1', 'Tetto - Condotto Areazione', 'area', 'dungeon-kamoshida', 11, null, null, 'seed', 0);
  p.run('nativo-rmap-151-6-0', '[]', gruppo('nativo-rmap-151-6-0', 'Tetto', 0, 'Scala'));
  p.run('nativo-rmap-151-6-1', '[]', gruppo('nativo-rmap-151-6-0', 'Tetto', 1, 'Condotto'));
  m.run('nativo-rmap-151-7-0', 'Torre - Livello inferiore', 'area', 'dungeon-kamoshida', 20, null, null, 'seed', 0);
  m.run('nativo-rmap-151-13-0', 'Torre - Corridoio', 'area', 'dungeon-kamoshida', 21, null, null, 'seed', 0);
  p.run('nativo-rmap-151-7-0', '[]', gruppo('utente:nativo-rmap-151-7-0', 'Torre - Livello inferiore', 0, 'Livello Inferiore'));
  p.run('nativo-rmap-151-13-0', '[]', gruppo('utente:nativo-rmap-151-7-0', 'Torre - Livello inferiore', 1, 'Corridoio Seme della Bramosia'));
  // una sciolta col gergo dell'estrattore e una sciolta che si chiamerebbe come il Tetto (slug -2)
  m.run('nativo-rmap-151-99-0', 'Palazzo di Kamoshida — Immagini native che nessun campo usa', 'area', 'dungeon-kamoshida', 30, null, null, 'seed', 0);
  m.run('nativo-rmap-151-98-0', 'Tetto', 'area', 'dungeon-kamoshida', 40, null, null, 'seed', 0);
  // Madarame: il Giardino (pin 777), la Galleria con la predefinita ultima per ordine di mappa, il Labirinto `generica` col nome rivisto
  m.run('nativo-rmap-153-5-0', 'Giardino centrale', 'area', 'dungeon-madarame', 50, null, null, 'seed', 0);
  p.run('nativo-rmap-153-5-0', JSON.stringify([{ id: 'texpack-27-elemento-27', nome: 'Giardino centrale' }]), gruppo('nativo-rmap-153-5-0', 'Giardino centrale', 0, 'Esterno'));
  [['nativo-rmap-153-7-2', 60, 2, 'Livello 0'], ['nativo-rmap-153-7-1', 61, 1, 'Livello -1'], ['nativo-rmap-153-7-0', 62, 0, 'Livello -2']].forEach(([k, o, g, e]) => {
    m.run(k, `Sala del Tesoro - Galleria - ${e}`, 'area', 'dungeon-madarame', o, null, null, 'utente', 1);
    p.run(k, '[]', gruppo('nativo-rmap-153-7-0', 'Sala del Tesoro - Galleria', g as number, e as string, true));
  });
  m.run('palazzo-di-madarame-il-labirinto-contorto', 'Il Labirinto Contorto', 'generica', 'dungeon-madarame', 70, null, null, 'utente', 1);
  // Iweleth: una sciolta; Memento: una planimetria che non diventa un'Area
  m.run('nativo-rmap-160-1-0', 'Entrata', 'area', 'dungeon-iweleth', 0, null, null, 'seed', 0);
  m.run('nativo-rmap-190-1-0', 'Chemdah', 'area', 'dungeon-mementos', 0, null, null, 'seed', 0);
  // i legami di oggi per planimetria (seed e utente)
  const seed = '{"origine":"seed","dichiarata":"pacchetto"}'; const utente = '{"origine":"utente","dichiarata":"editor"}';
  const me = db.prepare("INSERT INTO mappa_entita (mappa_chiave, entita_tipo, entita_chiave, fonte_json) VALUES (?, 'area', ?, ?)");
  me.run('nativo-rmap-152-1-0', 'kamoshida-1-tutorial-palazzo-11-04', seed);
  me.run('nativo-rmap-152-2-0', 'kamoshida-1-tutorial-palazzo-11-04', seed);
  me.run('nativo-rmap-152-4-0', 'kamoshida-tutorial-palazzo-12-04', seed);
  me.run('nativo-rmap-151-16-0', 'kamoshida-tutorial-palazzo-12-04', utente);
  me.run('nativo-rmap-151-6-1', 'kamoshida-13-tetto', seed);
  me.run('nativo-rmap-151-7-0', 'kamoshida-13-tetto', utente);
  me.run('nativo-rmap-153-7-0', 'madarame-scopri-dove-il-tesoro', utente);
  me.run('nativo-rmap-153-7-1', 'madarame-scopri-dove-il-tesoro', utente);
  me.run('nativo-rmap-153-7-0', 'madarame-il-furto-del-cuore-di-madarame', utente);
  me.run('nativo-rmap-160-1-0', 'iweleth-01-entrata', seed);
  me.run('nativo-rmap-190-1-0', 'mementos-01-chemdah', seed);
  // il diario: le voci di G-022 (quelle da correggere coi valori di oggi), la sera dell'11-13, B3 al 06-26 e una voce del validato
  const g = db.prepare("INSERT INTO giorno_percorso (data, ordine) VALUES (?, ?)");
  ['04-11', '06-20', '06-26', '07-01', '08-03', '10-29', '11-13', '11-14', '11-19', '11-24'].forEach((x, i) => g.run(x, i));
  const v = db.prepare("INSERT INTO voce_giornata (uid, data, fascia, ordine, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'palazzo', ?, ?, ?, 'c', 'u')");
  PROPOSTE_G022.forEach((pr, i) => {
    const c = VOCI_DA_CORREGGERE[pr.uid];
    if (c) v.run(pr.uid, c.data, 'giorno', 0, c.azione, c.note, c.rif[0], c.rif[1], c.testo);
    else v.run(pr.uid, '07-01', 'giorno', i, `Voce ${pr.sigla}`, null, 'dungeon', pr.palazzo, null);
  });
  v.run(SEGNALATA.uid, '11-13', 'sera', 0, SEGNALATA.azione, null, 'confidente', 'makoto', 'Palazzo di Sae Niijima');
  v.run(VOCE_NUOVA.dopo, '06-26', 'giorno', 0, 'Giornata libera: proseguire il Palazzo di Kaneshiro', null, null, null, null);
  v.run('validata-04-11', '04-11', 'giorno', 0, 'Prima infiltrazione tutorial', null, 'dungeon', 'kamoshida', null);
  return db;
}

/** Ciò che non deve cambiare: le colonne di prima delle mappe, le fonti vecchie dei legami, pin e voci dei Palazzi. */
const impronta = (db: AppDatabase) => JSON.stringify({
  mappe: db.prepare('SELECT chiave, nome, tipo, genitore_chiave, ordine, entita_tipo, entita_chiave, origine, nome_rivisto, updated_at FROM mappa ORDER BY chiave').all(),
  legamiVecchi: db.prepare('SELECT * FROM mappa_entita ORDER BY mappa_chiave, entita_chiave').all(),
  presentazione: db.prepare('SELECT * FROM mappa_presentazione ORDER BY mappa_chiave').all(),
  infiltrazioni: db.prepare('SELECT * FROM dungeon_area ORDER BY chiave').all(),
});
/** Le voci del diario nelle colonne di prima, fuori dalle sei corrette dal team. */
const vociIntatte = (db: AppDatabase) => JSON.stringify(db.prepare(`SELECT uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo, rango_atteso,
  produce_json, indice_guida, created_at, updated_at FROM voce_giornata WHERE uid NOT IN (${CORREZIONI_TEAM.map(() => '?').join(', ')}) ORDER BY uid`).all(...CORREZIONI_TEAM.map((c) => c.uid)));

it('il nome di ogni Area è quello che la pagina del Palazzo mostra oggi: 117 nomi dorati uno per uno', () => {
  const dorati = nomiDorati as Array<{ area: string; identita: IdentitaPlanimetria110; nome: string }>;
  expect(dorati).toHaveLength(117);
  const diversi = dorati.filter((x) => nomeAreaPalazzo110(x.identita).nome !== x.nome).map((x) => x.area);
  expect(diversi).toEqual([]);
  // i casi delle regole: gruppo rivisto, nome rivisto della predefinita, gergo dell'estrattore, contesti, «???» invariati
  const per = (k: string) => nomeAreaPalazzo110(dorati.find((x) => x.area === k)!.identita);
  expect(per('dungeon/madarame/museo-1p')).toEqual({ nome: 'Museo, 1P', rivisto: true });
  expect(per('dungeon/kamoshida/torre-livello-intermedio')).toEqual({ nome: 'Torre - Livello Intermedio', rivisto: true });
  expect(per('dungeon/futaba/palazzo-di-futaba-planimetria-non-attribuita')).toEqual({ nome: 'Palazzo di Futaba — Planimetria non attribuita', rivisto: false });
  expect(per('dungeon/okumura/fabbrica-centrale-linea-di-smaltimento')).toEqual({ nome: 'Fabbrica centrale / Linea di smaltimento', rivisto: false });
  expect(per('dungeon/maruki/auditorium')).toEqual({ nome: '??? Auditorium', rivisto: false });
});

it('crea le Aree dei Palazzi con le versioni nell’ordine di mappa e i legami; Memento, fonti vecchie, pin e voci intatti', () => {
  const db = primaDella110();
  const prima = impronta(db);
  runMigrations(db, CON_LA_110);
  expect(db.pragma('main.user_version', { simple: true })).toBeGreaterThanOrEqual(110);
  expect(impronta(db)).toBe(prima);
  const aree = db.prepare('SELECT chiave, dungeon_chiave AS d, slug, nome, nome_rivisto AS rivisto, ordine, planimetria_predefinita AS predefinita, origine, da_verificare AS dv FROM area WHERE dungeon_chiave IS NOT NULL ORDER BY dungeon_chiave, ordine').all();
  expect(aree).toEqual([
    { chiave: 'dungeon/iweleth/entrata', d: 'iweleth', slug: 'entrata', nome: 'Entrata', rivisto: 0, ordine: 0, predefinita: 'nativo-rmap-160-1-0', origine: 'seed', dv: 0 },
    // 152-1-0: un'area sola (decisione PM a), col titolo della predefinita (#0 del gruppo), all'ordine di mappa minimo
    { chiave: 'dungeon/kamoshida/prigione-sotterranea-tutorial', d: 'kamoshida', slug: 'prigione-sotterranea-tutorial', nome: 'Prigione sotterranea - Tutorial', rivisto: 1, ordine: 0, predefinita: 'nativo-rmap-152-1-0', origine: 'utente', dv: 0 },
    { chiave: 'dungeon/kamoshida/tetto', d: 'kamoshida', slug: 'tetto', nome: 'Tetto', rivisto: 0, ordine: 10, predefinita: 'nativo-rmap-151-6-0', origine: 'seed', dv: 0 },
    // il gruppo `utente:` è dell'utente anche se le planimetrie sono del seed
    { chiave: 'dungeon/kamoshida/torre-livello-inferiore', d: 'kamoshida', slug: 'torre-livello-inferiore', nome: 'Torre - Livello inferiore', rivisto: 0, ordine: 20, predefinita: 'nativo-rmap-151-7-0', origine: 'utente', dv: 0 },
    { chiave: 'dungeon/kamoshida/palazzo-di-kamoshida-planimetria-non-attribuita', d: 'kamoshida', slug: 'palazzo-di-kamoshida-planimetria-non-attribuita', nome: 'Palazzo di Kamoshida — Planimetria non attribuita', rivisto: 0, ordine: 30, predefinita: 'nativo-rmap-151-99-0', origine: 'seed', dv: 0 },
    { chiave: 'dungeon/kamoshida/tetto-2', d: 'kamoshida', slug: 'tetto-2', nome: 'Tetto', rivisto: 0, ordine: 40, predefinita: 'nativo-rmap-151-98-0', origine: 'seed', dv: 0 },
    { chiave: 'dungeon/madarame/giardino-centrale', d: 'madarame', slug: 'giardino-centrale', nome: 'Giardino centrale', rivisto: 0, ordine: 50, predefinita: 'nativo-rmap-153-5-0', origine: 'seed', dv: 0 },
    // 153-7-0: la predefinita «Livello -2» è l'ultima nell'ordine di mappa (decisione PM b)
    { chiave: 'dungeon/madarame/sala-del-tesoro-galleria', d: 'madarame', slug: 'sala-del-tesoro-galleria', nome: 'Sala del Tesoro - Galleria', rivisto: 1, ordine: 60, predefinita: 'nativo-rmap-153-7-0', origine: 'utente', dv: 0 },
    // il Labirinto Contorto, `generica`, è un'area a sé (dubbio 8)
    { chiave: 'dungeon/madarame/il-labirinto-contorto', d: 'madarame', slug: 'il-labirinto-contorto', nome: 'Il Labirinto Contorto', rivisto: 1, ordine: 70, predefinita: 'palazzo-di-madarame-il-labirinto-contorto', origine: 'utente', dv: 0 },
  ]);
  // versioni nell'ordine di mappa, etichetta del gruppo dove c'è (anche un gruppo di una sola, come il Giardino), nessuna per le sciolte
  expect(db.prepare("SELECT chiave || ':' || versione_ordine || ':' || COALESCE(versione_etichetta, '-') FROM mappa WHERE area_chiave IN ('dungeon/kamoshida/prigione-sotterranea-tutorial', 'dungeon/madarame/sala-del-tesoro-galleria', 'dungeon/madarame/giardino-centrale', 'dungeon/kamoshida/tetto-2') ORDER BY area_chiave, versione_ordine").pluck().all())
    .toEqual([
      'nativo-rmap-151-16-0:0:Sala Centrale', 'nativo-rmap-152-1-0:1:Prigione sotterranea -1P', 'nativo-rmap-152-4-0:2:Passaggio sotterraneo', 'nativo-rmap-152-6-0:3:Palestra dell\'Amore', 'nativo-rmap-152-2-0:4:Prigione sotterranea -2P',
      'nativo-rmap-151-98-0:0:-',
      'nativo-rmap-153-5-0:0:Esterno',
      'nativo-rmap-153-7-2:0:Livello 0', 'nativo-rmap-153-7-1:1:Livello -1', 'nativo-rmap-153-7-0:2:Livello -2',
    ]);
  // Memento: nessuna area, la planimetria resta senza
  expect(db.prepare("SELECT COUNT(*) FROM area WHERE dungeon_chiave = 'mementos'").pluck().get()).toBe(0);
  expect(db.prepare("SELECT area_chiave FROM mappa WHERE chiave = 'nativo-rmap-190-1-0'").pluck().get()).toBeNull();
  // i legami: dalle righe di oggi (origine seed solo se tutte le righe lo sono; iniziale la prima di mappa), più il pin 777 con «regola»
  expect(db.prepare('SELECT infiltrazione_chiave AS i, area_chiave AS a, ordine, planimetria_iniziale AS iniziale, origine FROM infiltrazione_area ORDER BY infiltrazione_chiave, ordine').all()).toEqual([
    { i: 'iweleth-01-entrata', a: 'dungeon/iweleth/entrata', ordine: 0, iniziale: 'nativo-rmap-160-1-0', origine: 'seed' },
    { i: 'kamoshida-1-tutorial-palazzo-11-04', a: 'dungeon/kamoshida/prigione-sotterranea-tutorial', ordine: 0, iniziale: 'nativo-rmap-152-1-0', origine: 'seed' },
    { i: 'kamoshida-13-tetto', a: 'dungeon/kamoshida/tetto', ordine: 0, iniziale: 'nativo-rmap-151-6-1', origine: 'seed' },
    { i: 'kamoshida-13-tetto', a: 'dungeon/kamoshida/torre-livello-inferiore', ordine: 1, iniziale: 'nativo-rmap-151-7-0', origine: 'utente' },
    { i: 'kamoshida-tutorial-palazzo-12-04', a: 'dungeon/kamoshida/prigione-sotterranea-tutorial', ordine: 0, iniziale: 'nativo-rmap-151-16-0', origine: 'utente' },
    { i: 'madarame-il-furto-del-cuore-di-madarame', a: 'dungeon/madarame/giardino-centrale', ordine: 0, iniziale: 'nativo-rmap-153-5-0', origine: 'regola' },
    { i: 'madarame-il-furto-del-cuore-di-madarame', a: 'dungeon/madarame/sala-del-tesoro-galleria', ordine: 1, iniziale: 'nativo-rmap-153-7-0', origine: 'utente' },
    { i: 'madarame-scopri-dove-il-tesoro', a: 'dungeon/madarame/sala-del-tesoro-galleria', ordine: 0, iniziale: 'nativo-rmap-153-7-1', origine: 'utente' },
  ]);
  // un'infiltrazione senza planimetria (Futaba) resta senza aree; le sue voci non si toccano
  expect(db.prepare("SELECT COUNT(*) FROM infiltrazione_area WHERE infiltrazione_chiave LIKE 'futaba-%'").pluck().get()).toBe(0);
  // il legame dal diario nasce solo dalla scelta dell'utente
  expect(db.prepare('SELECT COUNT(*) FROM voce_infiltrazione').pluck().get()).toBe(0);
  expect(db.pragma('foreign_key_check')).toEqual([]);
});

it('il diario: proposte di G-022, sei correzioni con il testo precedente, una voce segnalata, una nuova; il validato e le altre voci intatti', () => {
  const db = primaDella110();
  const intatte = vociIntatte(db);
  runMigrations(db, CON_LA_110);
  // le proposte: 37 voci, 102 posizioni; N2 con l'Arena due volte non di seguito; R2 che salta; motivo e certezza
  expect(db.prepare('SELECT COUNT(DISTINCT voce_uid) AS voci, COUNT(*) AS righe FROM proposta_infiltrazione_voce').get()).toEqual({ voci: 37, righe: 102 });
  expect(db.prepare("SELECT infiltrazione_chiave FROM proposta_infiltrazione_voce WHERE voce_uid = 'dece90bfb20d9d3328f2a6b0ca417590' ORDER BY ordine").pluck().all())
    .toEqual(['niijima-11-lobby-piano-puntate-alte', 'niijima-12-arena-combattimenti', 'niijima-13-oscura-dimora', 'niijima-12-arena-combattimenti', 'niijima-14-direzione-sala-del-boss']);
  expect(db.prepare("SELECT infiltrazione_chiave FROM proposta_infiltrazione_voce WHERE voce_uid = '6e28e155072a065d80a68a72ae5be9bb' ORDER BY ordine").pluck().all())
    .toEqual(['maruki-01-ingresso', 'maruki-05-auditorium', 'maruki-06-ripostiglio', 'maruki-07-sala-di-controllo']);
  expect(db.prepare("SELECT regola, certezza, motivo FROM proposta_infiltrazione_voce WHERE voce_uid = 'f3d6ddf19b62f76616e3de65ac00f2b9'").get())
    .toEqual({ regola: 'data-nel-nome', certezza: 'certa', motivo: 'La data è nel nome del tutorial.' });
  expect(db.prepare("SELECT DISTINCT certezza FROM proposta_infiltrazione_voce WHERE voce_uid IN ('65fdbeab5101e6068310fea982553d22', '589d82e823703ee879d72f974fd51139')").pluck().all()).toEqual(['probabile']);
  expect(db.prepare("SELECT DISTINCT certezza FROM proposta_infiltrazione_voce WHERE voce_uid = 'a513390589dcbc75a7ae4ef1aa798d06'").pluck().all()).toEqual(['multipla']);
  // nessuna proposta per la sera dell'11-13 né per le n/a
  expect(db.prepare('SELECT COUNT(*) FROM proposta_infiltrazione_voce WHERE voce_uid = ?').pluck().get(SEGNALATA.uid)).toBe(0);
  // le sei correzioni: valori nuovi, testo precedente uguale ai valori di prima, da rivedere; updated_at invariato
  const corretta = (uid: string) => db.prepare('SELECT azione, note, riferimento_tipo AS rt, riferimento_chiave AS rk, riferimento_testo AS rtesto, da_rivedere AS dr, aggiunta_da AS da, motivo_revisione AS mr, testo_precedente_json AS tp, updated_at AS u FROM voce_giornata WHERE uid = ?').get(uid) as Record<string, unknown>;
  const f4 = corretta('c9efdb83a3eeb29a6ceea9a6f6cc2ea2');
  expect(f4).toMatchObject({ azione: 'Palazzo di Futaba: esplorazione della Camera del Vuoto, risoluzione di puzzle', dr: 1, da: null, mr: null, u: 'u' });
  expect(JSON.parse(f4.tp as string)).toEqual({ azione: VOCI_DA_CORREGGERE.c9efdb83a3eeb29a6ceea9a6f6cc2ea2.azione, note: null, riferimento_tipo: 'dungeon', riferimento_chiave: 'futaba', riferimento_testo: 'Palazzo di Futaba' });
  for (const uid of ['7dd92df212b81bb87aba6e7a2fa8c874', 'dece90bfb20d9d3328f2a6b0ca417590', '589d82e823703ee879d72f974fd51139']) {
    const n = corretta(uid);
    expect(n).toMatchObject({ rt: 'dungeon', rk: 'niijima', rtesto: 'Palazzo di Sae Niijima', dr: 1 });
    expect(JSON.parse(n.tp as string)).toMatchObject({ riferimento_tipo: 'confidente', riferimento_chiave: 'makoto' });
  }
  expect(corretta('65fdbeab5101e6068310fea982553d22')).toMatchObject({ note: 'Usare attacchi nucleari contro i nemici. Nella guida: Cerca il boss della mala', dr: 1 });
  expect(corretta('527cf9832e94e93e855436191e06f8b6')).toMatchObject({ note: 'Assicurarsi di avere equipaggiata una Persona di Arcano Imperatrice per i giorni successivi. Nella guida: Ponte anteriore', dr: 1 });
  // la sera dell'11-13: solo segnalata
  expect(corretta(SEGNALATA.uid)).toMatchObject({ azione: SEGNALATA.azione, rt: 'confidente', rk: 'makoto', dr: 1, mr: SEGNALATA.motivo, tp: null, da: null });
  // la voce nuova in fondo alla fascia del giorno, dopo B3, che resta com'è
  expect(db.prepare("SELECT uid, ordine, tipo, azione, riferimento_tipo AS rt, riferimento_chiave AS rk, aggiunta_da AS da, da_rivedere AS dr FROM voce_giornata WHERE data = '06-26' ORDER BY ordine").all()).toEqual([
    { uid: VOCE_NUOVA.dopo, ordine: 0, tipo: 'palazzo', azione: 'Giornata libera: proseguire il Palazzo di Kaneshiro', rt: null, rk: null, da: null, dr: 0 },
    { uid: VOCE_NUOVA.uid, ordine: 1, tipo: 'palazzo', azione: VOCE_NUOVA.azione, rt: 'dungeon', rk: 'kaneshiro', da: 'team', dr: 1 },
  ]);
  // le altre voci, nelle colonne di prima, identiche (la voce nuova a parte); il validato senza segnalazioni
  expect(JSON.stringify((JSON.parse(vociIntatte(db)) as Array<{ uid: string }>).filter((x) => x.uid !== VOCE_NUOVA.uid))).toBe(intatte);
  expect(db.prepare("SELECT COUNT(*) FROM voce_giornata WHERE data BETWEEN '04-01' AND '06-01' AND (da_rivedere <> 0 OR aggiunta_da IS NOT NULL OR testo_precedente_json IS NOT NULL OR motivo_revisione IS NOT NULL)").pluck().get()).toBe(0);
});

it('si può rieseguire: la seconda volta nessuna riga toccata, anche dopo «Rimetti il precedente»; un’area nuova del Palazzo riceve lo slug libero', () => {
  const db = primaDella110();
  runMigrations(db, CON_LA_110);
  const fotografia = () => JSON.stringify([
    db.prepare('SELECT * FROM area ORDER BY chiave').all(), db.prepare('SELECT chiave, area_chiave, versione_ordine, versione_etichetta FROM mappa ORDER BY chiave').all(),
    db.prepare('SELECT * FROM infiltrazione_area ORDER BY infiltrazione_chiave, area_chiave').all(), db.prepare('SELECT * FROM proposta_infiltrazione_voce ORDER BY voce_uid, ordine').all(),
    db.prepare('SELECT * FROM voce_giornata ORDER BY uid').all(),
  ]);
  // l'utente rimette il testo precedente di F4: la voce torna com'era, il testo precedente resta, e la migrazione non la ricorregge
  const f4 = db.prepare("SELECT testo_precedente_json FROM voce_giornata WHERE uid = 'c9efdb83a3eeb29a6ceea9a6f6cc2ea2'").pluck().get() as string;
  db.prepare("UPDATE voce_giornata SET azione = ?, da_rivedere = 0 WHERE uid = 'c9efdb83a3eeb29a6ceea9a6f6cc2ea2'").run((JSON.parse(f4) as { azione: string }).azione);
  const prima = fotografia();
  expect(assegnaAreePalazzi110(db, 'y')).toEqual({ aree: 0, planimetrie: 0, etichette: 0, legami: 0, legamiDaRegola: 0 });
  db.transaction(() => migration110.up(db))();
  expect(fotografia()).toBe(prima);
  // una planimetria nuova sotto Madarame: un'area in più, con lo slug libero; nessun legame inventato
  db.prepare("INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, origine, updated_at) VALUES ('nuova-1', 'Giardino centrale', 'area', 'dungeon-madarame', 900, 'utente', 'x')").run();
  expect(assegnaAreePalazzi110(db, 'y')).toEqual({ aree: 1, planimetrie: 1, etichette: 0, legami: 0, legamiDaRegola: 0 });
  expect(db.prepare("SELECT slug || ':' || origine FROM area WHERE chiave LIKE 'dungeon/madarame/giardino%' ORDER BY ordine").pluck().all()).toEqual(['giardino-centrale:seed', 'giardino-centrale-2:utente']);
});

it('si ferma con un errore leggibile su un uid del diario validato, su un valore di oggi diverso dall’atteso, su un’infiltrazione con un altro nome', () => {
  const casi: Array<[string, (db: AppDatabase) => void, RegExp]> = [
    ['validato', (db) => db.prepare("UPDATE voce_giornata SET data = '05-01' WHERE uid = '65fdbeab5101e6068310fea982553d22'").run(), /B1 .* è del 05-01, nel diario validato 04-01\.\.06-01/],
    ['valore', (db) => db.prepare("UPDATE voce_giornata SET note = 'Altro' WHERE uid = '65fdbeab5101e6068310fea982553d22'").run(), /B1 .* non ha più il valore atteso/],
    ['F4', (db) => db.prepare("UPDATE voce_giornata SET azione = 'Palazzo di Futaba: Camera del Rigetto' WHERE uid = 'c9efdb83a3eeb29a6ceea9a6f6cc2ea2'").run(), /F4 .* non ha più il valore atteso/],
    ['nome', (db) => db.prepare("UPDATE dungeon_area SET nome = 'Arena' WHERE chiave = 'niijima-12-arena-combattimenti'").run(), /N2, infiltrazione 11 del Palazzo niijima: atteso «Arena combattimenti»/],
    ['palazzo', (db) => db.prepare("UPDATE dungeon_area SET dungeon_chiave = 'shido' WHERE chiave = 'maruki-01-ingresso'").run(), /R1, infiltrazione 0 del Palazzo maruki/],
    ['sera', (db) => db.prepare('UPDATE voce_giornata SET azione = ? WHERE uid = ?').run('Altro testo', SEGNALATA.uid), /11-13 sera .* non è quella attesa/],
  ];
  for (const [, guasta, errore] of casi) {
    const db = primaDella110();
    guasta(db);
    expect(() => runMigrations(db, CON_LA_110)).toThrow(errore);
    // niente applicato: la versione resta 109 e non c'è nessuna area dei Palazzi
    expect(db.pragma('main.user_version', { simple: true })).toBe(109);
    expect(db.prepare("SELECT COUNT(*) FROM sqlite_master WHERE name = 'infiltrazione_area'").pluck().get()).toBe(0);
    closeDb();
  }
});

it('una base senza il diario curato (il pacchetto iniziale di una generazione precedente) riceve le aree ma non tocca il diario', () => {
  const db = primaDella110();
  db.prepare("DELETE FROM voce_giornata WHERE uid = '3fb31dded3f9581173037ce9d1ec9535'").run();
  expect(diarioCurato110(db)).toEqual({ curato: false, motivo: 'mancano le voci M1 di G-022' });
  const prima = JSON.stringify(db.prepare('SELECT * FROM voce_giornata ORDER BY uid').all());
  runMigrations(db, CON_LA_110);
  expect(db.prepare('SELECT COUNT(*) FROM area WHERE dungeon_chiave IS NOT NULL').pluck().get()).toBe(9);
  expect(db.prepare('SELECT COUNT(*) FROM proposta_infiltrazione_voce').pluck().get()).toBe(0);
  expect(JSON.stringify(db.prepare('SELECT uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo, rango_atteso, produce_json, indice_guida, created_at, updated_at FROM voce_giornata ORDER BY uid').all())).toBe(prima);
  expect(db.prepare('SELECT COUNT(*) FROM voce_giornata WHERE da_rivedere <> 0').pluck().get()).toBe(0);
});
