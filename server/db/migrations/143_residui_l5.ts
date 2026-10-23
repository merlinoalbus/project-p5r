// ============================================================
// 143 — i residui di L5 approvati dall'utente il 23/10 (docs/coordinamento/lotti/L5/proposta-residui-29.md)
// ============================================================
//
// Che cosa fa, e solo questo:
//   - crea 11 luoghi: i distributori di Shinjuku e di Kichijoji e i 9 servizi del Covo (tipo `servizio`, Area del Covo, dal 5 maggio);
//   - collega 18 pin senza riferimento al loro luogo (Akihabara 272–275, Kichijoji 359, Shinjuku 1564–1566, Chiesa 349, Casa di Sojiro 1641,
//     Covo 375–383) e il cancello 339 al listino `distributore-shujin-cancello-1`;
//   - sposta 1584 al listino del bagno di Yongen e 1769 al listino Nastea, con la sua sede a Central Street;
//   - passa il pin 386 (Jose nel Covo) da `negozio` a `dialogo`: è la guida all'ingresso, non vende;
//   - dà una sede funzionale a Tanaka e all'Home Shopping (Leblanc) e a Jose (negozio dei Memento).
// Il pin 1753 (Ann al 2° piano della Shujin) va nel Cestino con il gesto ordinario dell'app: lo snapshot del Cestino non si riscrive qui.
//
// Conservativa: ogni pin si cambia solo se corrisponde ancora a identità e valore attesi (id, tipo, planimetria, origine, riferimento di
// partenza); ogni sede solo se è ancora vuota; un luogo eliminato (Cestino) o dell'utente non si ricrea né si occupa. Nessun listino è
// assegnato a un pin per posizione o per ordine. Non tocca `partite.db`. Idempotente; l'esito di ogni voce resta in `dati_guida`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';

const FONTE_DISTRIBUTORI = 'https://www.allgamestaff.it/persona-5-royal/distributori-automatici/';
const FONTE_COVO = 'https://www.allgamestaff.it/persona-5-royal/covo-dei-ladri/';
const AREA_COVO = 'citta/yongen-jaya/covo-dei-ladri';
const ASSORTIMENTO_A = 'Second Maid, Manta, Earl Green e Ultimate Amazake';
const ASSORTIMENTO_B = 'Dr. Salt NEO, Arginade e Acqua della rinascita';
const PREMI = 'Una delle quattro sezioni dei premi del Covo (Vita scolastica, Confidenti, Battaglia, Fantasma); le fonti non dicono quale sezione sia su quale punto.';

interface NuovoLuogo { chiave: string; quartiere: string; area: string; tipo: string; nome: string; cosaOffre: string; fonte: string; condizioni: string }
const COVO = (chiave: string, nome: string, cosaOffre: string): NuovoLuogo => ({
  chiave: `yongen-jaya/${chiave}`, quartiere: 'yongen-jaya', area: AREA_COVO, tipo: 'servizio', nome, cosaOffre, fonte: FONTE_COVO,
  condizioni: JSON.stringify([{ tipo: 'data', dal: '05-05' }]),
});
const NUOVI_LUOGHI: readonly NuovoLuogo[] = [
  { chiave: 'shinjuku/distributori-shinjuku', quartiere: 'shinjuku', area: 'citta/shinjuku/quartiere-a-luci-rosse', tipo: 'distributore',
    nome: 'Distributori di Shinjuku', fonte: FONTE_DISTRIBUTORI, condizioni: '[]',
    cosaOffre: `Tre distributori automatici: uno con ${ASSORTIMENTO_A}; due con ${ASSORTIMENTO_B}. Le fonti non dicono quale pin sia quale macchina.` },
  { chiave: 'kichijoji/distributori-kichijoji', quartiere: 'kichijoji', area: 'citta/kichijoji/quartiere-dello-shopping', tipo: 'distributore',
    nome: 'Distributori di Kichijoji', fonte: FONTE_DISTRIBUTORI, condizioni: '[]',
    cosaOffre: `Tre distributori automatici nella zona dello shopping: due con ${ASSORTIMENTO_A}; uno con ${ASSORTIMENTO_B}. Sulla mappa c'è un solo pin.` },
  COVO('covo-creatore-palazzo', 'Creatore del Palazzo del Covo', 'Decorazioni e ambientazioni del Covo acquistabili con Medaglie P.'),
  COVO('covo-musica', 'Lettore musicale del Covo', 'Tracce musicali sbloccabili del Covo.'),
  COVO('covo-film', 'Film del Covo', 'Filmati sbloccabili del Covo.'),
  COVO('covo-galleria', 'Galleria del Covo', 'Illustrazioni, fotografie e concept art sbloccabili del Covo.'),
  COVO('covo-area-giochi', 'Area giochi del Covo', 'Gioco di carte Magnate contro tre Ladri, in tre difficoltà.'),
  ...[8, 9, 10, 11].map((n) => COVO(`covo-premi-${n}`, 'Premi del Covo', PREMI)),
];

interface Collegamento { id: number; tipo: string; mappa: string; origine: 'seed' | 'utente'; da: [string | null, string | null]; a: [string, string] }
const luogo = (id: number, tipo: string, mappa: string, origine: 'seed' | 'utente', chiave: string): Collegamento =>
  ({ id, tipo, mappa, origine, da: [null, null], a: ['luogo', chiave] });
const COLLEGAMENTI: readonly Collegamento[] = [
  ...[272, 273, 274, 275].map((id) => luogo(id, 'distributore', 'nativo-rmap-007-1-0', 'seed', 'akihabara/distributori-akihabara')),
  luogo(359, 'distributore', 'nativo-rmap-005-1-0', 'seed', 'kichijoji/distributori-kichijoji'),
  ...[1564, 1565, 1566].map((id) => luogo(id, 'distributore', 'nativo-rmap-006-1-0', 'seed', 'shinjuku/distributori-shinjuku')),
  luogo(349, 'culto', 'nativo-rmap-010-4-0', 'seed', 'kanda-jinbocho/chiesa-kanda'),
  luogo(1641, 'casa', 'nativo-rmap-009-2-0', 'utente', 'yongen-jaya/sakura-residence'),
  luogo(375, 'attivita', 'nativo-rmap-022-1-1', 'seed', 'yongen-jaya/covo-creatore-palazzo'),
  luogo(376, 'attivita', 'nativo-rmap-022-1-1', 'seed', 'yongen-jaya/covo-musica'),
  luogo(377, 'attivita', 'nativo-rmap-022-1-1', 'seed', 'yongen-jaya/covo-film'),
  luogo(378, 'attivita', 'nativo-rmap-022-1-1', 'seed', 'yongen-jaya/covo-galleria'),
  luogo(379, 'attivita', 'nativo-rmap-022-1-1', 'seed', 'yongen-jaya/covo-area-giochi'),
  ...[380, 381, 382, 383].map((id, i) => luogo(id, 'attivita', 'nativo-rmap-022-1-1', 'seed', `yongen-jaya/covo-premi-${8 + i}`)),
  // Cancello della Shujin: due macchine e due assortimenti; 1760 è già il cancello-2 (Joylent), quindi 339 è per esclusione il cancello-1.
  { id: 339, tipo: 'distributore', mappa: 'nativo-rmap-002-1-0', origine: 'utente', da: [null, null], a: ['negozio', 'distributore-shujin-cancello-1'] },
  // Yongen: il cortile della Shujin non è a Yongen; 1585 è il tabaccaio, il pin a 4 unità dal bagno (1590) è la macchina del bagno.
  { id: 1584, tipo: 'distributore', mappa: 'nativo-rmap-009-2-0', origine: 'utente', da: ['negozio', 'distributore-shujin-cortile'], a: ['negozio', 'distributore-yongen-bagno'] },
  // Central Street: tre macchine, tre assortimenti; 1768 resta Joylent, 1769 passa al listino Nastea (decisione dell'utente).
  { id: 1769, tipo: 'distributore', mappa: 'nativo-rmap-001-3-0', origine: 'utente', da: ['negozio', 'distributore-shujin-cancello-2'], a: ['negozio', 'distributore-yongen-tabaccaio'] },
];

const SEDI: ReadonlyArray<readonly [negozio: string, sede: string]> = [
  ['tanaka-affari-loschi', 'yongen-jaya/leblanc'],
  ['home-shopping-tv', 'yongen-jaya/leblanc'],
  ['jose', 'mementos/negozio-jose'],
];

type Esito = { voce: string; esito: 'applicata' | 'gia-fatta' | 'saltata'; motivo?: string };

function creaLuoghi(db: AppDatabase, adesso: string, esiti: Esito[]): void {
  const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 AS n FROM main.luogo WHERE quartiere_chiave = ?');
  const inserisci = db.prepare(`INSERT INTO main.luogo (chiave, quartiere_chiave, ordine, tipo, nome, cosa_offre, area_chiave, condizioni_json, fonte, verificato, origine, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'seed', ?)`);
  for (const l of NUOVI_LUOGHI) {
    const voce = `luogo ${l.chiave}`;
    if (db.prepare('SELECT 1 FROM main.luogo WHERE chiave = ?').get(l.chiave)) { esiti.push({ voce, esito: 'gia-fatta' }); continue; }
    if (db.prepare("SELECT 1 FROM main.cestino WHERE tipo = 'luogo' AND chiave = ?").get(l.chiave)) { esiti.push({ voce, esito: 'saltata', motivo: 'nel Cestino' }); continue; }
    const area = db.prepare('SELECT quartiere_chiave FROM main.area WHERE chiave = ?').get(l.area) as { quartiere_chiave: string | null } | undefined;
    if (!area || area.quartiere_chiave !== l.quartiere) { esiti.push({ voce, esito: 'saltata', motivo: 'Area assente o di un altro quartiere' }); continue; }
    const n = (ordine.get(l.quartiere) as { n: number }).n;
    inserisci.run(l.chiave, l.quartiere, n, l.tipo, l.nome, l.cosaOffre, l.area, l.condizioni, l.fonte, adesso);
    esiti.push({ voce, esito: 'applicata' });
  }
}

function collegaPin(db: AppDatabase, adesso: string, esiti: Esito[]): void {
  const leggi = db.prepare('SELECT uid, tipo, mappa_chiave, origine, riferimento_tipo, riferimento_chiave FROM main.spillo WHERE id = ?');
  const scrivi = db.prepare(`UPDATE main.spillo SET riferimento_tipo = ?, riferimento_chiave = ?, updated_at = CASE WHEN origine = 'utente' THEN ? ELSE updated_at END
    WHERE id = ? AND tipo = ? AND mappa_chiave = ? AND origine = ? AND riferimento_tipo IS ? AND riferimento_chiave IS ?`);
  const bersaglio = (tipo: string, chiave: string): boolean => tipo === 'luogo'
    ? !!db.prepare('SELECT 1 FROM main.luogo WHERE chiave = ? AND nascosto = 0').get(chiave)
    : !!db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ? AND nascosto = 0').get(chiave);
  for (const c of COLLEGAMENTI) {
    const voce = `pin ${c.id} → ${c.a[0]}:${c.a[1]}`;
    const p = leggi.get(c.id) as { uid: string | null; tipo: string; mappa_chiave: string | null; origine: string; riferimento_tipo: string | null; riferimento_chiave: string | null } | undefined;
    if (!p) { esiti.push({ voce, esito: 'saltata', motivo: 'pin assente' }); continue; }
    if (p.riferimento_tipo === c.a[0] && p.riferimento_chiave === c.a[1]) { esiti.push({ voce, esito: 'gia-fatta' }); continue; }
    if (!bersaglio(c.a[0], c.a[1])) { esiti.push({ voce, esito: 'saltata', motivo: 'destinazione assente o nascosta' }); continue; }
    if (scrivi.run(c.a[0], c.a[1], adesso, c.id, c.tipo, c.mappa, c.origine, c.da[0], c.da[1]).changes !== 1) {
      esiti.push({ voce, esito: 'saltata', motivo: 'il pin non corrisponde più a identità e riferimento attesi' }); continue;
    }
    esiti.push({ voce, esito: 'applicata' });
    // 1769 resta a Central Street anche se il listino ha la sede a Yongen: la sede del singolo pin lo dice, come per 1768.
    if (c.id === 1769 && p.uid) {
      db.prepare("INSERT OR IGNORE INTO main.negozio_luogo_extra (negozio_chiave, luogo_chiave) SELECT 'distributore-yongen-tabaccaio', 'shibuya/distributori-central-street' WHERE EXISTS (SELECT 1 FROM main.luogo WHERE chiave = 'shibuya/distributori-central-street')").run();
      db.prepare("INSERT OR IGNORE INTO main.negozio_sede_spillo (spillo_uid, negozio_chiave, luogo_chiave) SELECT ?, 'distributore-yongen-tabaccaio', 'shibuya/distributori-central-street' WHERE EXISTS (SELECT 1 FROM main.luogo WHERE chiave = 'shibuya/distributori-central-street')").run(p.uid);
    }
  }
}

function tipoJose(db: AppDatabase, esiti: Esito[]): void {
  const voce = 'pin 386: tipo negozio → dialogo';
  const p = db.prepare('SELECT tipo FROM main.spillo WHERE id = 386').get() as { tipo: string } | undefined;
  if (!p) { esiti.push({ voce, esito: 'saltata', motivo: 'pin assente' }); return; }
  if (p.tipo === 'dialogo') { esiti.push({ voce, esito: 'gia-fatta' }); return; }
  const r = db.prepare("UPDATE main.spillo SET tipo = 'dialogo' WHERE id = 386 AND tipo = 'negozio' AND mappa_chiave = 'nativo-rmap-022-1-1' AND origine = 'seed' AND riferimento_tipo IS NULL AND riferimento_chiave IS NULL").run();
  esiti.push(r.changes === 1 ? { voce, esito: 'applicata' } : { voce, esito: 'saltata', motivo: 'il pin non corrisponde più a identità e riferimento attesi' });
}

function sedi(db: AppDatabase, esiti: Esito[]): void {
  const scrivi = db.prepare(`UPDATE main.negozio SET sede_chiave = ?, luogo_chiave = (SELECT quartiere_chiave FROM main.luogo WHERE chiave = ?)
    WHERE chiave = ? AND sede_chiave IS NULL`);
  for (const [negozio, sede] of SEDI) {
    const voce = `sede di ${negozio}: ${sede}`;
    const n = db.prepare('SELECT sede_chiave FROM main.negozio WHERE chiave = ?').get(negozio) as { sede_chiave: string | null } | undefined;
    if (!n) { esiti.push({ voce, esito: 'saltata', motivo: 'negozio assente' }); continue; }
    if (n.sede_chiave === sede) { esiti.push({ voce, esito: 'gia-fatta' }); continue; }
    if (n.sede_chiave !== null) { esiti.push({ voce, esito: 'saltata', motivo: 'sede già decisa' }); continue; }
    if (!db.prepare('SELECT 1 FROM main.luogo WHERE chiave = ? AND nascosto = 0').get(sede)) { esiti.push({ voce, esito: 'saltata', motivo: 'luogo assente o nascosto' }); continue; }
    esiti.push(scrivi.run(sede, sede, negozio).changes === 1 ? { voce, esito: 'applicata' } : { voce, esito: 'saltata', motivo: 'la sede non è più vuota' });
  }
}

export const migration143: Migration = {
  id: 143,
  name: 'residui_l5',
  up(db) {
    const adesso = new Date().toISOString();
    const esiti: Esito[] = [];
    const ok = (t: string) => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t);
    if (!['luogo', 'area', 'spillo', 'negozio', 'cestino', 'dati_guida', 'negozio_sede_spillo', 'negozio_luogo_extra'].every(ok)) return;
    creaLuoghi(db, adesso, esiti);
    collegaPin(db, adesso, esiti);
    tipoJose(db, esiti);
    sedi(db, esiti);
    db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run('residui-l5-143', JSON.stringify({ versione: 1, esiti }));
    const conta = (e: Esito['esito']) => esiti.filter((x) => x.esito === e).length;
    logger.info({ applicate: conta('applicata'), giaFatte: conta('gia-fatta'), saltate: esiti.filter((x) => x.esito === 'saltata') }, '[migration143] residui di L5');
  },
};
