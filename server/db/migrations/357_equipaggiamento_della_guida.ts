// ============================================================
// 357 — l'equipaggiamento della guida senza scheda, le offerte dell'Untouchable che mancavano, le armi a distanza riclassificate (L4-03)
// ============================================================
//
// Rapporto N §2.1 (censimento per nome delle pagine d'inventario) e K §4.2 (Untouchable):
//   - 54 armi a distanza senza scheda (le 53 assenti e l'Eliminatore di Haru, che aveva una sola scheda con quello di Joker), 15 armi da mischia
//     (le 17 assenti meno due varianti di nome già presenti) e 99 protezioni: nascono con nome, statistiche, effetto e reperibilità della guida
//     (`equipaggiamentoL4.ts`), come le schede della 286; il «per» segue le schede d'equipaggiamento («Solo Joker», «Solo donne», …);
//   - le offerte dell'Untouchable che la guida dà e il listino non aveva: le 42 armi a distanza dei compagni e il Collare commemorativo, con il
//     prezzo della pagina d'inventario (quella che l'app già segue, K §4.3) e lo sblocco come le altre offerte del negozio (l'arco del Palazzo o
//     la data), rifornimento come le altre offerte dell'Untouchable (il giorno dopo, regola dell'utente perché la guida tace);
//   - 18 armi a distanza che la scheda aveva come «arma» (mischia) passano ad «arma-da-fuoco»: cambia la colonna `categoria`, mai la chiave;
//   - i nomi della guida di sei schede già presenti con un altro nome diventano «altri nomi» (la ricerca le trova col nome della guida).
// Fuori, con il motivo: Teschio di Cristallo e R (le schede «Distintivo dell'angelo»: decisione dell'utente, migrazione 284); la Replica d'arma
// resta materiale (l'uso è la trasmutazione); gli abiti assenti per nome sono già presenti con un altro nome (alias qui sopra).
//
// Conservativa: una scheda o un'offerta con la stessa chiave non si tocca; un'offerta nasce solo se la scheda c'è e il negozio non ne ha già
// una della stessa scheda. Le schede e le offerte esistenti non cambiano, salvo la colonna `categoria` delle 18 e gli altri nomi delle sei
// (confronto delle due tabelle senza quelle colonne, prima e dopo). Nessuna voce del Diario e nessun dato delle partite cambia. Idempotente.
// Verbale: `dati_guida.audit-l4-03-equipaggiamento`. Nessun import da `server/services/`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { registraAudit } from './archivioL1.js';
import { slug } from '../../../shared/slug.js';
import {
  ALIAS, ARMI_DA_RICLASSIFICARE, ARMI_DISTANZA, ARMI_MISCHIA, FONTE_ARMI_DISTANZA, FONTE_ARMI_MISCHIA, FONTE_PROTEZIONI, PROTEZIONI,
  type RigaArma, type RigaProtezione, type Sblocco,
} from './equipaggiamentoL4.js';

const errore = (motivo: string): never => { throw new Error(`357: ${motivo}; nessuna modifica applicata.`); };
const MIGRAZIONE = 'L4-03 · 357';
const NEGOZIO = 'untouchable';
const RIFORNIMENTO_UNTOUCHABLE = JSON.stringify({ tipo: 'giorno', origine: 'fallback-utente' });

/** Lo sblocco della guida come condizione, come le altre offerte dell'Untouchable. */
function condizioni(s: Sblocco): string {
  return JSON.stringify(/^\d{2}-\d{2}$/.test(s) ? [{ tipo: 'data', dal: s }] : [{ tipo: 'arco', dungeon: s }]);
}

/**
 * La fonte della scheda: la pagina e la parte finale della chiave («protezioni/veste-vecchia-maschile»). Non il nome: la guida ha due «Veste
 * vecchia» diverse, e (`fonte_tipo`, `fonte_chiave`) è unica.
 */
const fonteDi = (pagina: string, chiave: string) => `${pagina}/${chiave.slice(chiave.indexOf('/') + 1)}`;

/** Le righe esistenti di una tabella senza alcune colonne (le righe nuove si escludono per chiave), come testo da confrontare. */
function fotografia(db: AppDatabase, tabella: string, senza: readonly string[], escluse: ReadonlySet<string>): string {
  const colonne = (db.prepare(`SELECT name FROM main.pragma_table_info('${tabella}')`).pluck().all() as string[]).filter((c) => !senza.includes(c));
  const righe = (db.prepare(`SELECT ${colonne.map((c) => `"${c}"`).join(', ')} FROM main.${tabella} ORDER BY chiave`).all() as Array<Record<string, unknown>>)
    .filter((r) => !escluse.has(String(r.chiave)));
  return JSON.stringify(righe);
}

export const migration357: Migration = {
  id: 357,
  name: 'equipaggiamento_della_guida',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!['catalogo_oggetto', 'articolo', 'negozio', 'dati_guida'].every((t) => esisteTabella(db, t))) return;
    if (ARMI_DISTANZA.length !== 54 || ARMI_MISCHIA.length !== 15 || PROTEZIONI.length !== 99) errore('le righe della guida non sono quelle censite (54, 15, 99)');
    const chiaviNuove = [...ARMI_DISTANZA, ...ARMI_MISCHIA, ...PROTEZIONI].map((r) => r.chiave);
    if (new Set(chiaviNuove).size !== chiaviNuove.length) errore('due righe della guida hanno la stessa chiave');

    const adesso = new Date().toISOString();
    const esiste = (chiave: string) => !!db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(chiave);
    const nuoveSchede = new Set(chiaviNuove.filter((k) => !esiste(k)));
    const conRegola = haColonna(db, 'articolo', 'regola_comune');
    const conRifornimento = haColonna(db, 'articolo', 'rifornimento_json');
    const conCatalogo = haColonna(db, 'articolo', 'catalogo_chiave');
    const primaSchede = fotografia(db, 'catalogo_oggetto', ['categoria', 'nomi_altri_json', 'updated_at'], nuoveSchede);
    const primaOfferte = fotografia(db, 'articolo', [], new Set());

    // (1) le schede
    const scheda = db.prepare(`INSERT INTO main.catalogo_oggetto (chiave, categoria, sottocategoria, nome, nomi_altri_json, nome_originale, effetto, descrizione, statistiche_json, fonte_tipo, fonte_chiave, origine, nascosto, updated_at)
      VALUES (?, ?, NULL, ?, '[]', NULL, ?, ?, ?, 'guida', ?, 'seed', 0, ?)`);
    const schede: Array<{ chiave: string; esito: string }> = [];
    const creaArma = (r: RigaArma, categoria: 'arma' | 'arma-da-fuoco', pagina: string) => {
      if (esiste(r.chiave)) { schede.push({ chiave: r.chiave, esito: 'chiave già presente: non toccata' }); return; }
      const testo = [`Attacco ${r.attacco}`, `Precisione ${r.precisione}`, ...(r.colpi !== null ? [`Colpi ${r.colpi}`] : [])].join(', ');
      scheda.run(r.chiave, categoria, r.nome, r.effetto, r.descrizione, JSON.stringify({ per: r.per, testo }), fonteDi(pagina, r.chiave), adesso);
      schede.push({ chiave: r.chiave, esito: 'scheda creata' });
    };
    for (const r of ARMI_DISTANZA) creaArma(r, 'arma-da-fuoco', 'armi-a-distanza');
    for (const r of ARMI_MISCHIA) creaArma(r, 'arma', 'armi-da-mischia');
    for (const r of PROTEZIONI) {
      if (esiste(r.chiave)) { schede.push({ chiave: r.chiave, esito: 'chiave già presente: non toccata' }); continue; }
      scheda.run(r.chiave, 'protezione', r.nome, r.effetto, r.descrizione, JSON.stringify({ per: r.per, testo: `Difesa ${r.difesa}, Elusione ${r.elusione}` }), fonteDi('protezioni', r.chiave), adesso);
      schede.push({ chiave: r.chiave, esito: 'scheda creata' });
    }

    // (2) le offerte dell'Untouchable
    const offerte: Array<{ chiave: string; esito: string }> = [];
    const negozio = !!db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ?').get(NEGOZIO);
    const libera = (k: string) => !db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ?').get(k);
    // un'offerta collegata non ha nome, categoria né «per chi» propri (li dà la scheda, L4-07): nome vuoto, categoria «altro», per NULL
    const creaOfferta = (r: RigaArma | RigaProtezione, fonte: string) => {
      if (!r.negozio) return;
      const parte = r.chiave.split('/')[1]!;
      // l'Eliminatore di Joker ha già `untouchable/eliminatore`: l'offerta di Haru porta il personaggio nella chiave
      const giaDiAltri = !libera(`${NEGOZIO}/${parte}`) && db.prepare('SELECT catalogo_chiave FROM main.articolo WHERE chiave = ?').pluck().get(`${NEGOZIO}/${parte}`) !== r.chiave;
      const chiave = giaDiAltri ? `${NEGOZIO}/${parte}-${slug(r.per.replace(/^Solo /, ''))}` : `${NEGOZIO}/${parte}`;
      if (!negozio) { offerte.push({ chiave, esito: 'negozio assente: nessuna offerta' }); return; }
      if (!conCatalogo) { offerte.push({ chiave, esito: 'catalogo non collegabile (schema vecchio): nessuna offerta' }); return; }
      if (!db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ? AND nascosto = 0').get(r.chiave)) { offerte.push({ chiave, esito: 'scheda assente o nascosta: nessuna offerta' }); return; }
      if (db.prepare('SELECT 1 FROM main.articolo WHERE negozio_chiave = ? AND catalogo_chiave = ?').get(NEGOZIO, r.chiave)) { offerte.push({ chiave, esito: 'il negozio ha già un’offerta della scheda: non toccata' }); return; }
      if (!libera(chiave)) { offerte.push({ chiave, esito: 'chiave già presente: non toccata' }); return; }
      const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.articolo WHERE negozio_chiave = ?').pluck().get(NEGOZIO) as number;
      const colonne = ['chiave', 'negozio_chiave', 'ordine', 'nome', 'categoria', 'per', 'prezzo', 'nota', 'fonte', 'verificato', 'origine', 'nascosto', 'updated_at', 'condizioni_json', 'catalogo_chiave',
        ...(conRifornimento ? ['quantita', 'rifornimento_json'] : []), ...(conRegola ? ['regola_comune'] : [])];
      const valori = [chiave, NEGOZIO, ordine, '', 'altro', null, r.negozio.prezzo, null, fonte, 1, 'seed', 0, adesso, condizioni(r.negozio.sblocco), r.chiave,
        ...(conRifornimento ? [null, RIFORNIMENTO_UNTOUCHABLE] : []), ...(conRegola ? [0] : [])];
      db.prepare(`INSERT INTO main.articolo (${colonne.join(', ')}) VALUES (${colonne.map(() => '?').join(', ')})`).run(...valori);
      offerte.push({ chiave, esito: `offerta creata (${r.negozio.prezzo} ¥, ${r.negozio.sblocco})` });
    };
    for (const r of ARMI_DISTANZA) creaOfferta(r, FONTE_ARMI_DISTANZA);
    for (const r of PROTEZIONI) creaOfferta(r, FONTE_PROTEZIONI);

    // (3) le armi a distanza riclassificate: solo la colonna `categoria`
    const riclassificate: Array<{ chiave: string; esito: string }> = [];
    for (const k of ARMI_DA_RICLASSIFICARE) {
      const c = db.prepare('SELECT categoria FROM main.catalogo_oggetto WHERE chiave = ?').pluck().get(k) as string | undefined;
      if (c === undefined) riclassificate.push({ chiave: k, esito: 'scheda assente' });
      else if (c === 'arma-da-fuoco') riclassificate.push({ chiave: k, esito: 'già arma da fuoco' });
      else if (c !== 'arma') riclassificate.push({ chiave: k, esito: `categoria «${c}» diversa da quella attesa: non toccata` });
      else { db.prepare("UPDATE main.catalogo_oggetto SET categoria = 'arma-da-fuoco', updated_at = ? WHERE chiave = ? AND categoria = 'arma'").run(adesso, k); riclassificate.push({ chiave: k, esito: 'arma → arma-da-fuoco' }); }
    }

    // (4) i nomi della guida delle schede già presenti con un altro nome
    const alias: Array<{ chiave: string; nome: string; esito: string }> = [];
    for (const a of ALIAS) {
      const r = db.prepare('SELECT nome, nomi_altri_json FROM main.catalogo_oggetto WHERE chiave = ?').get(a.chiave) as { nome: string; nomi_altri_json: string } | undefined;
      if (!r) { alias.push({ ...a, esito: 'scheda assente' }); continue; }
      const altri = JSON.parse(r.nomi_altri_json) as string[];
      if (r.nome === a.nome || altri.includes(a.nome)) { alias.push({ ...a, esito: 'nome già presente' }); continue; }
      db.prepare('UPDATE main.catalogo_oggetto SET nomi_altri_json = ?, updated_at = ? WHERE chiave = ?').run(JSON.stringify([...altri, a.nome]), adesso, a.chiave);
      alias.push({ ...a, esito: 'altro nome aggiunto' });
    }

    if (fotografia(db, 'catalogo_oggetto', ['categoria', 'nomi_altri_json', 'updated_at'], nuoveSchede) !== primaSchede) errore('le schede esistenti sono cambiate oltre a categoria e altri nomi');
    const nuoveOfferte = new Set(offerte.filter((o) => o.esito.startsWith('offerta creata')).map((o) => o.chiave));
    if (fotografia(db, 'articolo', [], nuoveOfferte) !== primaOfferte) errore('le offerte esistenti sono cambiate');

    const conteggi = {
      schede: schede.filter((s) => s.esito === 'scheda creata').length, offerte: nuoveOfferte.size,
      riclassificate: riclassificate.filter((r) => r.esito.startsWith('arma →')).length, alias: alias.filter((a) => a.esito === 'altro nome aggiunto').length,
    };
    if (conteggi.schede + conteggi.offerte + conteggi.riclassificate + conteggi.alias === 0) return;
    registraAudit(db, 'audit-l4-03-equipaggiamento', { migrazione: MIGRAZIONE, conteggi, fonti: [FONTE_ARMI_DISTANZA, FONTE_ARMI_MISCHIA, FONTE_PROTEZIONI], schede, offerte, riclassificate, alias });
    logger.info({ migrazione: 'L4-03-357', ...conteggi }, 'equipaggiamento della guida');
  },
};
