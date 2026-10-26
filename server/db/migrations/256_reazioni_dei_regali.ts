// ============================================================
// Migrazione 256 — la reazione di ogni regalo (+3/+2/+1), gli sconsigliati a +1, le righe mancanti e quelle sbagliate (ondata 5, lotto D)
// ============================================================
//
// Decisione 21 (c) dell'utente (26/10/2026): «reazione dei regali strutturata con i punti attuali finché non verificati in gioco»,
// «sconsigliati riconvertiti a +1», «righe senza fonte italiana tenute con la fonte dichiarata». Fonte: la guida italiana dei regali
// (`GUIDA_REGALI`): colonna «Bonus affinità» +3/+2/+1; «ogni regalo garantisce almeno 1 punto»; nessun regalo sconsigliato; «non serve una
// relazione romantica»; non si regala a Yoshida, Mishima, Morgana, Igor, Gemelle e Sae. Censimento ECC dei regali: RG-04…RG-08, RG-11, RG-12.
//
// Che cosa fa (sui dati di gioco; nessuna partita e nessuna voce del Diario cambia):
//   (1) `confidente.regalabile` = 1 per i 17 Confidenti della guida, 0 per gli altri 6 (RG-11);
//   (2) RG-06: la riga «sconsigliata» della Tazza nera di Kasumi contraddice la riga a +2 dello stesso oggetto e va nel Cestino (reversibile);
//   (3) RG-08: `reazione` dal testo della reazione, con la corrispondenza certa della guida («+3…» = 3, «+2…» = 2, «+forte» = 3,
//       «+normale» = 2); RG-05/RG-07: le righe «sconsigliate» (senza reazione scritta) valgono +1 e non sono più sconsigliate;
//   (4) il testo della reazione si svuota (il dato è la colonna): i commenti che dicono qualcosa passano nella nota (elenco scritto
//       `COMMENTI`), quelli sbagliati si tolgono (RG-12: l'Anello del cuore non richiede una relazione romantica; il Braccialetto è un regalo
//       universale per i ragazzi, che ora la guida italiana dice). Un testo diverso da quello atteso non si tocca: resta com'è, nell'audit;
//   (5) RG-04: le cinque righe che la guida elenca e mancavano (Ann e Chihaya Sveglia chiassosa +2, Chihaya Set di mascotte locali +2,
//       Hifumi Tazza nera +2 e Cuscino Mochi +2), in fondo all'elenco del Confidente; una riga già presente per lo stesso oggetto non si ripete;
//   (6) le cinque righe che la guida italiana non elenca (ryuji/7, shinya/7-9, hifumi/3) restano con la fonte dichiarata nella nota (D4).
// Le righe cambiate dall'utente (`origine = 'utente'`) ricevono la reazione (il testo della reazione non è un campo che l'utente corregge)
// ma la loro nota non si tocca. Append-only, conservativa, idempotente (ogni passo agisce solo se trova lo stato di partenza). Audit in
// `dati_guida.audit-256-reazioni`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { conCestino144 } from './cestinoRegistro144.js';
import { CONFIDENTI_NON_REGALABILI, CONFIDENTI_REGALABILI, haColonna, scriviAuditRegali } from './regaliOndata5.js';

const AUDIT = 'audit-256-reazioni';

/** I testi della reazione che dicono soltanto il valore (la reazione intera è la colonna). */
const SOLO_VALORE: Readonly<Record<string, 1 | 2 | 3>> = {
  '+3': 3, '+2': 2, '+1': 1, '+3 punti affinità': 3, '+2 punti affinità': 2, '+1 punti affinità': 1, '+forte': 3, '+normale': 2,
};

/** I testi con un commento: il valore e che cosa diventa il commento (null = si toglie perché sbagliato o superato dalla guida). */
interface Commento { confidente: string; ordine: number; testo: string; reazione: 1 | 2 | 3; nota: string | null; perche: string }
const COMMENTI: readonly Commento[] = [
  { confidente: 'ann', ordine: 3, testo: '+3 punti affinità; è il regalo 3+ più economico secondo fonti inglesi', reazione: 3,
    nota: 'È il regalo da +3 più economico per Ann (secondo fonti inglesi).', perche: 'commento informativo, con la fonte dichiarata' },
  { confidente: 'ann', ordine: 9, testo: "+3 punti affinità; richiede relazione romantica attiva (percorso 'Amore' scelto al rango 9)", reazione: 3, nota: null,
    perche: 'RG-12: la guida dice che non serve una relazione romantica' },
  { confidente: 'futaba', ordine: 6, testo: '+3 (regalo a tema romantico)', reazione: 3, nota: null, perche: 'RG-12: non serve una relazione romantica' },
  { confidente: 'haru', ordine: 4, testo: '+3 (regalo a tema romantico)', reazione: 3, nota: null, perche: 'RG-12: non serve una relazione romantica' },
  { confidente: 'makoto', ordine: 9, testo: '+3 (regalo a tema romantico)', reazione: 3, nota: null, perche: 'RG-12: non serve una relazione romantica' },
  { confidente: 'kasumi', ordine: 5, testo: '+3 (regalo legato alla relazione romantica)', reazione: 3, nota: null, perche: 'RG-12: non serve una relazione romantica' },
  { confidente: 'kawakami', ordine: 10, testo: '+3 (percorso romantico)', reazione: 3, nota: null, perche: 'RG-12: non serve una relazione romantica' },
  { confidente: 'takemi', ordine: 4, testo: '+3 (disponibile solo nel percorso romantico)', reazione: 3, nota: null, perche: 'RG-12: non serve una relazione romantica' },
  { confidente: 'ryuji', ordine: 3, testo: '+3 punti affinità; regalo generico valido per qualunque Confidente maschio (secondo fonti inglesi, non specificato da allgamestaff)', reazione: 3,
    nota: null, perche: 'superato: la guida italiana lo dice ora regalo universale per i ragazzi' },
  { confidente: 'ryuji', ordine: 7, testo: '+2 punti affinità (fonte: samurai-gamers.com)', reazione: 2,
    nota: 'Fonte secondaria: samurai-gamers.com. La guida italiana non elenca questo regalo per Ryuji.', perche: 'D4: riga senza fonte italiana, tenuta con la fonte dichiarata' },
];

/** D4: le righe senza fonte italiana (nome e luogo «non specificato dalle fonti consultate»): la nota dichiara la fonte. */
const FONTE_SECONDARIA: ReadonlyArray<{ confidente: string; ordine: number; nota: string }> = [
  { confidente: 'shinya', ordine: 7, nota: 'Fonte secondaria in inglese («Cup Noodle Set»). La guida italiana non elenca questo regalo per Shinya.' },
  { confidente: 'shinya', ordine: 8, nota: 'Fonte secondaria in inglese. La guida italiana non elenca questo regalo per Shinya.' },
  { confidente: 'shinya', ordine: 9, nota: 'Fonte secondaria in inglese («Blaring Alarm Clock»). La guida italiana non elenca questo regalo per Shinya.' },
  { confidente: 'hifumi', ordine: 3, nota: 'Fonte secondaria in inglese («Bath of Roses»). La guida italiana non elenca questo regalo per Hifumi.' },
];

/** RG-04: le righe della guida che mancavano. */
const MANCANTI: ReadonlyArray<{ confidente: string; oggetto: string; reazione: 1 | 2 | 3 }> = [
  { confidente: 'ann', oggetto: 'regalo/sveglia-chiassosa', reazione: 2 },
  { confidente: 'chihaya', oggetto: 'regalo/sveglia-chiassosa', reazione: 2 },
  { confidente: 'chihaya', oggetto: 'regalo/set-di-mascotte-locali', reazione: 2 },
  { confidente: 'hifumi', oggetto: 'regalo/tazza-nera', reazione: 2 },
  { confidente: 'hifumi', oggetto: 'regalo/cuscino-mochi', reazione: 2 },
];

/** RG-06: la riga che contraddice un'altra dello stesso oggetto. */
const CONTRADDITTORIA = { confidente: 'kasumi', ordine: 11, oggetto: 'regalo/tazza-nera' } as const;

interface RigaRegalo { confidente_chiave: string; ordine: number; nome: string; effetto: string | null; sconsigliato: number; catalogo_chiave: string | null; nota: string | null; origine: string; reazione: number | null }

function togliContraddittoria(db: AppDatabase): Record<string, unknown> {
  const { confidente, ordine, oggetto } = CONTRADDITTORIA;
  const riga = db.prepare('SELECT * FROM main.confidente_regalo WHERE confidente_chiave = ? AND ordine = ?').get(confidente, ordine) as RigaRegalo | undefined;
  if (!riga) return { esito: 'gia-tolta' };
  if (riga.catalogo_chiave !== oggetto || riga.sconsigliato !== 1) return { esito: 'gia-tolta', nota: 'la riga a quell’indirizzo non è più quella sconsigliata della Tazza nera' };
  const buona = db.prepare('SELECT ordine FROM main.confidente_regalo WHERE confidente_chiave = ? AND catalogo_chiave = ? AND sconsigliato = 0 AND ordine <> ?').get(confidente, oggetto, ordine) as { ordine: number } | undefined;
  if (!buona) return { esito: 'ferma', motivo: 'manca la riga a +2 dello stesso oggetto: la riga resta', riga };
  const proposte = esisteTabella(db, 'proposta_abbinamento')
    ? db.prepare("SELECT COUNT(*) FROM main.proposta_abbinamento WHERE riga_tipo = 'regalo' AND riga_chiave = ?").pluck().get(`${confidente}:${ordine}`) as number : 0;
  if (proposte) return { esito: 'ferma', motivo: `citata da ${proposte} proposte di abbinamento: va decisa a parte`, riga };
  conCestino144(db, { tipo: 'oggetto', chiave: oggetto, nome: `Regalo di Kasumi: ${riga.nome} (riga sconsigliata)`,
    contesto: `Contraddiceva la riga a +2 dello stesso oggetto (ordine ${buona.ordine}): la guida dà la Tazza nera a +2 per Kasumi (RG-06)` }, () => db.transaction(() => {
    db.prepare('DELETE FROM main.confidente_regalo WHERE confidente_chiave = ? AND ordine = ?').run(confidente, ordine);
  })());
  return { esito: 'tolta', riga, rigaBuona: buona.ordine };
}

export const migration256: Migration = {
  id: 256,
  name: 'reazioni_dei_regali',
  up(db) {
    if (!db.inTransaction) throw new Error('256: manca la transazione della migrazione; nessuna modifica applicata.');
    for (const t of ['confidente', 'confidente_regalo', 'catalogo_oggetto', 'cestino', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 256, tabella: t }, 'tabella assente: reazioni dei regali non convertite'); return; }
    }
    if (!haColonna(db, 'confidente_regalo', 'reazione') || !haColonna(db, 'confidente', 'regalabile')) throw new Error('256: mancano le colonne della 255; nessuna modifica applicata.');
    const adesso = new Date().toISOString();

    // (1) a chi si regala
    const assenti = [...CONFIDENTI_REGALABILI, ...CONFIDENTI_NON_REGALABILI].filter((k) => !db.prepare('SELECT 1 FROM main.confidente WHERE chiave = ?').get(k));
    const regalabili = db.prepare(`UPDATE main.confidente SET regalabile = 1 WHERE regalabile = 0 AND chiave IN (${CONFIDENTI_REGALABILI.map(() => '?').join(', ')})`).run(...CONFIDENTI_REGALABILI).changes;
    const nonRegalabiliConElenco = db.prepare(`SELECT DISTINCT confidente_chiave FROM main.confidente_regalo WHERE confidente_chiave IN (${CONFIDENTI_NON_REGALABILI.map(() => '?').join(', ')})`)
      .pluck().all(...CONFIDENTI_NON_REGALABILI) as string[];

    // (2) RG-06
    const contraddittoria = togliContraddittoria(db);

    // (3)-(4) la reazione di ogni riga
    const commenti = new Map(COMMENTI.map((c) => [`${c.confidente}:${c.ordine}`, c]));
    const convertite: Array<Record<string, unknown>> = [];
    const ferme: Array<Record<string, unknown>> = [];
    const righe = db.prepare('SELECT confidente_chiave, ordine, nome, effetto, sconsigliato, catalogo_chiave, nota, origine, reazione FROM main.confidente_regalo WHERE reazione IS NULL ORDER BY confidente_chiave, ordine').all() as RigaRegalo[];
    const scrivi = db.prepare('UPDATE main.confidente_regalo SET reazione = ?, sconsigliato = 0, effetto = NULL, nota = ? WHERE confidente_chiave = ? AND ordine = ? AND reazione IS NULL AND effetto IS ?');
    for (const r of righe) {
      const indirizzo = `${r.confidente_chiave}:${r.ordine}`;
      const testo = r.effetto?.trim() ?? null;
      let reazione: 1 | 2 | 3 | null = null;
      let nota = r.nota;
      let perche = '';
      const commento = commenti.get(indirizzo);
      if (testo === null) {
        if (r.sconsigliato === 1) { reazione = 1; perche = 'sconsigliato riconvertito a +1 (RG-05, RG-07: la guida non elenca regali sconsigliati, ognuno dà almeno 1 punto)'; }
      } else if (SOLO_VALORE[testo] !== undefined) {
        reazione = SOLO_VALORE[testo]!; perche = `dal testo «${testo}»`;
      } else if (commento && commento.testo === testo) {
        reazione = commento.reazione; perche = commento.perche;
        if (r.origine !== 'utente' && commento.nota !== null) nota = r.nota ? (r.nota.includes(commento.nota) ? r.nota : `${r.nota}\n${commento.nota}`) : commento.nota;
      }
      if (reazione === null) { ferme.push({ indirizzo, effetto: r.effetto, sconsigliato: r.sconsigliato, motivo: 'testo della reazione non riconosciuto: resta com’è' }); continue; }
      const fonte = FONTE_SECONDARIA.find((f) => f.confidente === r.confidente_chiave && f.ordine === r.ordine);
      if (fonte && r.origine !== 'utente' && !(nota ?? '').includes(fonte.nota)) nota = nota ? `${nota}\n${fonte.nota}` : fonte.nota;
      if (scrivi.run(reazione, nota, r.confidente_chiave, r.ordine, r.effetto).changes) {
        convertite.push({ indirizzo, prima: { effetto: r.effetto, sconsigliato: r.sconsigliato, nota: r.nota }, reazione, ...(nota !== r.nota ? { nota } : {}), perche });
      }
    }

    // (5) RG-04
    const aggiunte: Array<Record<string, unknown>> = [];
    for (const m of MANCANTI) {
      const oggetto = db.prepare('SELECT nome FROM main.catalogo_oggetto WHERE chiave = ? AND nascosto = 0').get(m.oggetto) as { nome: string } | undefined;
      if (!oggetto) { ferme.push({ aggiunta: m, motivo: 'oggetto assente o nascosto nel catalogo' }); continue; }
      const gia = db.prepare('SELECT ordine, reazione FROM main.confidente_regalo WHERE confidente_chiave = ? AND catalogo_chiave = ?').get(m.confidente, m.oggetto) as { ordine: number; reazione: number | null } | undefined;
      if (gia) { if (gia.reazione !== m.reazione) ferme.push({ aggiunta: m, motivo: `il Confidente ha già una riga per l’oggetto (ordine ${gia.ordine}, reazione ${gia.reazione}): resta com’è` }); continue; }
      const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.confidente_regalo WHERE confidente_chiave = ?').pluck().get(m.confidente) as number;
      db.prepare(`INSERT INTO main.confidente_regalo (confidente_chiave, ordine, nome, dove, costo, effetto, sconsigliato, catalogo_chiave, nota, seed_json, origine, updated_at, reazione)
        VALUES (?, ?, ?, NULL, NULL, NULL, 0, ?, NULL, NULL, 'seed', ?, ?)`).run(m.confidente, ordine, oggetto.nome, m.oggetto, adesso, m.reazione);
      aggiunte.push({ indirizzo: `${m.confidente}:${ordine}`, oggetto: m.oggetto, reazione: m.reazione });
    }

    // controllo: le sole righe senza reazione sono quelle ferme e dichiarate
    const senzaReazione = db.prepare('SELECT COUNT(*) FROM main.confidente_regalo WHERE reazione IS NULL').pluck().get() as number;
    const fermeDiRiga = ferme.filter((f) => 'indirizzo' in f).length;
    if (senzaReazione !== fermeDiRiga) throw new Error(`256: ${senzaReazione} righe senza reazione, attese ${fermeDiRiga}; nessuna modifica applicata.`);
    const conteggi = {
      regalabili, assenti, nonRegalabiliConElenco, contraddittoria: contraddittoria.esito, convertite: convertite.length, aggiunte: aggiunte.length, ferme: ferme.length,
      perReazione: Object.fromEntries((db.prepare('SELECT reazione, COUNT(*) AS n FROM main.confidente_regalo GROUP BY reazione ORDER BY reazione').all() as Array<{ reazione: number | null; n: number }>).map((x) => [String(x.reazione), x.n])),
      righe: db.prepare('SELECT COUNT(*) FROM main.confidente_regalo').pluck().get() as number,
    };
    scriviAuditRegali(db, AUDIT, 256, { conteggi, contraddittoria, convertite, aggiunte, ferme });
    for (const f of ferme) logger.warn({ migrazione: 256, ...f }, 'regalo lasciato com’è');
    logger.info({ migrazione: 256, ...conteggi, perReazione: JSON.stringify(conteggi.perReazione) }, 'Regali: reazione strutturata, sconsigliati a +1, righe mancanti aggiunte');
  },
};
