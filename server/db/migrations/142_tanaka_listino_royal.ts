// ============================================================
// 142 — il listino di Tanaka portato ai dati di Persona 5 Royal (BON-08, regola dell'utente del 23/10: «vince il dato di Royal, sempre»)
// ============================================================
//
// Il piano è quello documentato in lotti/L7/tanaka-decisione-unitaria.md e nel manifesto G-034 (AllGameStaff, «Negozi speciali»): delle
// 20 offerte correnti di «Affari loschi di Tanaka», 10 conservano la chiave e prendono i valori Royal (nome, categoria, prezzo, grado,
// oggetto del catalogo), 10 senza riscontro Royal si NASCONDONO (mai cancellate), 8 offerte Royal sono NUOVE. Risultato: esattamente
// 18 offerte Royal attive. Nessuna riga di acquisto, Diario, Dote o yen cambia (`partite.db` non si tocca): la spesa storica è congelata.
//
// - Archivio: PRIMA di cambiare, la fotografia integrale delle 20 righe di prima (e dei legami) entra nel registro immutabile
//   `decisione_tanaka` (migrazione 141), con il piano e la fotografia di dopo. Il Cestino non ha un tipo «articolo»: il registro è
//   l'archivio consultabile delle identità commerciali precedenti, con i loro prezzi.
// - Le 28 proposte di abbinamento 121 che riguardano Tanaka sono superate dal piano: quelle coerenti con il dato Royal (stessa offerta e
//   stesso oggetto, oppure «nascondi») risultano `confermata`; le altre `scartata`. La storia delle proposte resta.
// - Grado come condizione: `rango-cliente` (Nero > 10.000, Oscuro > 50.000, Caos > 100.000 yen spesi, «oltre» nella fonte); iniziale = nessuna.
// - Idempotente: se la decisione è già nel registro, non fa nulla. Se il negozio o un'identità del catalogo non c'è, non la ricrea.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const NEGOZIO = 'tanaka-affari-loschi';
const OPERAZIONE = 'migrazione-142-tanaka-royal';
const FONTE = 'G-034 e L7 dati §11.1 / modifiche §2 alla revisione43ad8889';

/** Le 20 offerte correnti, nell'ordine del listino. */
const CORRENTI = ['nirvana-ring', 'black-stone', 'five-inch-nail', 'condenser-lens', 'inspired-hand-mirror', 'gemme-elementali', 'hercules-anklet',
  'heros-eyepatch', 'black-robe', 'magic-rosary', 'black-kogatana', 'atom-match', 'retribution-mirror', 'holy-cloth', 'ouija-board', 'dispel-ring',
  'model-gun', 'roland-medal', 'homunculus', 'crown-of-salvation'].map((s) => `${NEGOZIO}/${s}`);

type Grado = 'iniziale' | 'nero' | 'oscuro' | 'caos';
/** Il listino Royal (manifesto G-034): chiave, nome, oggetto del catalogo, prezzo, grado. */
const ROYAL: ReadonlyArray<{ s: string; nome: string; catalogo: string; prezzo: number; grado: Grado }> = [
  { s: 'five-inch-nail', nome: 'Chiodo ossidato', catalogo: 'consumabile/chiodo-ossidato', prezzo: 5000, grado: 'iniziale' },
  { s: 'inspired-hand-mirror', nome: 'Spec. senso spirit.', catalogo: 'consumabile/spec-senso-spirit-2', prezzo: 5000, grado: 'iniziale' },
  { s: 'gemme-elementali', nome: 'Magatama infernale', catalogo: 'consumabile/magatama-infernale', prezzo: 6000, grado: 'iniziale' },
  { s: 'magatama-ciclonico', nome: 'Magatama ciclonico', catalogo: 'consumabile/magatama-ciclonico', prezzo: 6000, grado: 'iniziale' },
  { s: 'magatama-del-gelo', nome: 'Magatama del gelo', catalogo: 'consumabile/magatama-del-gelo', prezzo: 6000, grado: 'iniziale' },
  { s: 'magatama-elettrico', nome: 'Magatama elettrico', catalogo: 'consumabile/magatama-elettrico', prezzo: 6000, grado: 'iniziale' },
  { s: 'magatama-divino', nome: 'Magatama divino', catalogo: 'consumabile/magatama-divino', prezzo: 6000, grado: 'nero' },
  { s: 'magatama-esplosivo', nome: 'Magatama esplosivo', catalogo: 'consumabile/magatama-esplosivo', prezzo: 6000, grado: 'nero' },
  { s: 'black-robe', nome: 'Veste nera', catalogo: 'materiale/veste-nera', prezzo: 500, grado: 'nero' },
  { s: 'spec-spirit-oscuro', nome: 'Spec. spirit. oscuro', catalogo: 'consumabile/spec-spirit-oscuro', prezzo: 5000, grado: 'nero' },
  { s: 'black-kogatana', nome: 'Kogatana nera', catalogo: 'materiale/kogatana-nera', prezzo: 1000, grado: 'oscuro' },
  { s: 'holy-cloth', nome: 'Sacra Sindone', catalogo: 'consumabile/sacra-sindone', prezzo: 10000, grado: 'oscuro' },
  { s: 'ouija-board', nome: 'Tavola Ouija', catalogo: 'consumabile/tavola-ouija', prezzo: 10000, grado: 'oscuro' },
  { s: 'fotocamera-spirituale', nome: 'Fotocamera spirituale', catalogo: 'consumabile/fotocamera-spirituale', prezzo: 5000, grado: 'oscuro' },
  { s: 'model-gun', nome: 'Replica d\'arma', catalogo: 'materiale/replica-darma', prezzo: 1000, grado: 'caos' },
  { s: 'homunculus', nome: 'Homunculus', catalogo: 'consumabile/homunculus', prezzo: 5000, grado: 'caos' },
  { s: 'crown-of-salvation', nome: 'Corona della salvezza', catalogo: 'accessorio/corona-della-salvezza-2', prezzo: 990000, grado: 'caos' },
  { s: 'maschera-sorridente', nome: 'Maschera sorridente', catalogo: 'consumabile/maschera-sorridente', prezzo: 5000, grado: 'caos' },
];

const condizioni = (g: Grado): string => JSON.stringify(g === 'iniziale' ? [] : [{ tipo: 'rango-cliente', negozio: NEGOZIO, rango: g }]);
const sha = (v: unknown): string => createHash('sha256').update(JSON.stringify(v)).digest('hex');
type Riga = Record<string, unknown>;

export const migration142: Migration = {
  id: 142,
  name: 'tanaka_listino_royal',
  up(db) {
    const tabella = (n: string) => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(n);
    if (!tabella('articolo') || !tabella('negozio') || !tabella('decisione_tanaka')) { logger.warn('[migration142] schema incompleto: listino di Tanaka non toccato'); return; }
    if (!db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ?').get(NEGOZIO)) { logger.warn('[migration142] il negozio di Tanaka non c\'è: nessuna ricreazione'); return; }
    if (db.prepare('SELECT 1 FROM main.decisione_tanaka WHERE operazione_id = ?').get(OPERAZIONE)) return;

    const chiaviRoyal = ROYAL.map((r) => `${NEGOZIO}/${r.s}`);
    const tutte = [...new Set([...CORRENTI, ...chiaviRoyal])].sort();
    const leggi = () => Object.fromEntries(tutte.map((k) => [k, (db.prepare('SELECT * FROM main.articolo WHERE chiave = ?').get(k) as Riga | undefined) ?? null]));
    const prima = leggi();
    // se una chiave nuova è occupata da un altro negozio non si tocca: nessun suffisso scelto in automatico
    const occupate = chiaviRoyal.filter((k) => !CORRENTI.includes(k) && prima[k] && prima[k]!.negozio_chiave !== NEGOZIO);
    const catalogoPresente = (k: string) => !!db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(k);
    const adesso = new Date().toISOString();

    // 1. archivio: la fotografia integrale di prima (offerte, legami, proposte pertinenti) nel registro immutabile
    const legami = db.prepare(`SELECT * FROM main.ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave IN (${tutte.map(() => '?').join(',')}) ORDER BY fonte_chiave, catalogo_chiave`).all(...tutte);
    const proposte = tabella('proposta_abbinamento')
      ? db.prepare(`SELECT * FROM main.proposta_abbinamento WHERE riga_tipo = 'articolo' AND riga_chiave IN (${tutte.map(() => '?').join(',')}) ORDER BY riga_chiave, gruppo, catalogo_chiave`).all(...tutte) as Riga[] : [];
    const piano = { versione: 1, negozio: NEGOZIO, fonte: FONTE, aggiornate: chiaviRoyal.filter((k) => CORRENTI.includes(k)),
      nuove: chiaviRoyal.filter((k) => !CORRENTI.includes(k)), nascoste: CORRENTI.filter((k) => !chiaviRoyal.includes(k)), saltate: occupate };

    // 2. le 10 chiavi esistenti prendono i valori Royal; le 8 nuove si creano; le 10 senza riscontro si nascondono
    let ordine = (db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 AS n FROM main.articolo WHERE negozio_chiave = ?').get(NEGOZIO) as { n: number }).n;
    let aggiornate = 0, create = 0, nascoste = 0;
    for (const r of ROYAL) {
      const k = `${NEGOZIO}/${r.s}`;
      if (occupate.includes(k)) continue;
      const catalogo = catalogoPresente(r.catalogo) ? r.catalogo : null;
      if (catalogo === null) logger.warn({ catalogo: r.catalogo }, '[migration142] identità del catalogo assente: offerta senza oggetto collegato');
      const categoria = r.catalogo.split('/')[0]!;
      const esistente = prima[k];
      if (esistente) {
        aggiornate += db.prepare(`UPDATE main.articolo SET nome = ?, nome_it = NULL, categoria = ?, prezzo = ?, condizioni_json = ?, catalogo_chiave = ?, nascosto = 0,
          seed_json = COALESCE(seed_json, ?), origine = 'utente', updated_at = ? WHERE chiave = ? AND negozio_chiave = ?`)
          .run(r.nome, categoria, r.prezzo, condizioni(r.grado), catalogo, JSON.stringify(esistente), adesso, k, NEGOZIO).changes;
      } else {
        db.prepare(`INSERT INTO main.articolo (chiave, negozio_chiave, ordine, nome, categoria, prezzo, condizioni_json, catalogo_chiave, fonte, origine, nascosto, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'utente', 0, ?)`).run(k, NEGOZIO, ordine++, r.nome, categoria, r.prezzo, condizioni(r.grado), catalogo, FONTE, adesso);
        create++;
      }
    }
    for (const k of CORRENTI.filter((c) => !chiaviRoyal.includes(c))) {
      if (!prima[k]) continue;
      nascoste += db.prepare("UPDATE main.articolo SET nascosto = 1, seed_json = COALESCE(seed_json, ?), origine = 'utente', updated_at = ? WHERE chiave = ? AND negozio_chiave = ?")
        .run(JSON.stringify(prima[k]), adesso, k, NEGOZIO).changes;
    }

    // 3. le proposte 121 su Tanaka sono superate dal piano
    let confermate = 0, scartate = 0;
    if (proposte.length) {
      const royalPerChiave = new Map(ROYAL.map((r) => [`${NEGOZIO}/${r.s}`, r.catalogo]));
      const aggiorna = db.prepare("UPDATE main.proposta_abbinamento SET stato = ?, nota = COALESCE(nota || char(10), '') || ?, updated_at = ? WHERE riga_tipo = 'articolo' AND riga_chiave = ? AND gruppo = ? AND catalogo_chiave IS ?");
      for (const p of proposte) {
        if (p.stato !== 'da-approvare') continue;
        let modifica: Riga | null;
        try { modifica = p.modifica_json ? JSON.parse(String(p.modifica_json)) as Riga : null; } catch { modifica = null; }
        const coerente = modifica?.azione === 'nascondi' ? !royalPerChiave.has(String(p.riga_chiave)) : royalPerChiave.get(String(p.riga_chiave)) === p.catalogo_chiave;
        const stato = coerente ? 'confermata' : 'scartata';
        aggiorna.run(stato, coerente ? 'Applicata dal listino Royal di Tanaka (migrazione 142).' : 'Superata dal listino Royal di Tanaka (migrazione 142): il dato Royal prevale.', adesso, p.riga_chiave, p.gruppo, p.catalogo_chiave);
        if (coerente) confermate++; else scartate++;
      }
    }

    // 4. il registro: piano, prima, dopo
    const dopo = { offerte: leggi(), legami, proposte: tabella('proposta_abbinamento')
      ? db.prepare(`SELECT * FROM main.proposta_abbinamento WHERE riga_tipo = 'articolo' AND riga_chiave IN (${tutte.map(() => '?').join(',')}) ORDER BY riga_chiave, gruppo, catalogo_chiave`).all(...tutte) : [] };
    const attive = (db.prepare('SELECT COUNT(*) AS n FROM main.articolo WHERE negozio_chiave = ? AND nascosto = 0').get(NEGOZIO) as { n: number }).n;
    if (occupate.length === 0 && attive !== ROYAL.length) throw new Error(`Migrazione 142: dopo il piano le offerte attive di Tanaka sono ${attive}, non ${ROYAL.length}`);
    db.prepare(`INSERT INTO main.decisione_tanaka (operazione_id, versione, negozio_chiave, revisione_confronto, revisione_piano, piano_json, prima_json, dopo_json, confermata_il)
      VALUES (?, 1, ?, 'migrazione-142', ?, ?, ?, ?, ?)`).run(OPERAZIONE, NEGOZIO, sha(piano), JSON.stringify(piano),
      JSON.stringify({ offerte: prima, legami, proposte }), JSON.stringify(dopo), adesso);
    logger.info({ aggiornate, create, nascoste, confermate, scartate, attive }, '[migration142] listino di Tanaka portato ai dati Royal');
  },
};
