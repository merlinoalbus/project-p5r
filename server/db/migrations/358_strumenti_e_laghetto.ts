// ============================================================
// 358 — gli Strumenti del cercatore all'Akiba e i cinque oggetti del laghetto senza scheda (L4-04)
// ============================================================
//
// Rapporto K E15 e E19, pagina «Oggetti chiave essenziali» della guida (righe 391-406) e «Pesca al laghetto di Ichigaya» (righe 176-182):
//   - Strumenti del cercatore: «per artigiani esperti, migliora le abilità per creare strumenti d'infiltrazione», 2.000 ¥ al Negozio di
//     elettronica Akiba di Akihabara; nasce la scheda e l'offerta, con lo sblocco delle altre offerte del negozio (dal 1° settembre). La guida non
//     dice quanti pezzi: è un oggetto chiave che si compra una volta, come il Set di strumenti da PC dello stesso negozio (pezzo unico; regola
//     dell'utente, perché la guida tace);
//   - Canna casuale (300 punti), Canna miracolosa (10.000), Boilie media (60), Boilie grande (250), Boilie di qualità (400): il laghetto non è un
//     negozio (decisione della 286: il suo premio si paga in punti della pesca, che l'app non tiene come valuta), quindi nasce la scheda con il
//     premio nella descrizione, come la Cintura Umi Sachihiko e il Portachiavi esca della 286.
// Restano come sono Stecca jump, Set di freccette e Boilie sospetto: la guida si contraddice (K E5-E7) e l'utente ha scelto di non cambiare nulla
// finché non li verifica in gioco (Q18).
// Conservativa e idempotente come la 286: una scheda o un'offerta che esiste già non si tocca. Le schede e le offerte esistenti non cambiano.
// Verbale: `dati_guida.audit-l4-04-strumenti-laghetto`. Nessun import da `server/services/`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { registraAudit } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`358: ${motivo}; nessuna modifica applicata.`); };
const FONTE_OGGETTI_CHIAVE = 'https://www.allgamestaff.it/persona-5-royal/oggetti-chiave-essenziali/';
const LAGHETTO = (punti: string) => `Laghetto di pesca Ichigaya, in cambio di ${punti} punti della pesca`;

const SCHEDE: ReadonlyArray<{ chiave: string; nome: string; effetto: string; descrizione: string }> = [
  { chiave: 'altro/strumenti-del-cercatore', nome: 'Strumenti del cercatore', effetto: 'Per artigiani esperti: migliora le abilità per creare strumenti d’infiltrazione', descrizione: '' },
  { chiave: 'altro/canna-casuale', nome: 'Canna casuale', effetto: 'Canna semplice ma robusta: rende un po’ più facile catturare i pesci', descrizione: LAGHETTO('300') },
  { chiave: 'altro/canna-miracolosa', nome: 'Canna miracolosa', effetto: 'Canna di nuova generazione: rende facilissimo catturare i pesci', descrizione: LAGHETTO('10.000') },
  { chiave: 'altro/boilie-media', nome: 'Boilie media', effetto: 'Esca per pesci medi: può catturare pesci di medie dimensioni', descrizione: LAGHETTO('60') },
  { chiave: 'altro/boilie-grande', nome: 'Boilie grande', effetto: 'Esca per pesci grandi: cattura i pesci grandi', descrizione: LAGHETTO('250') },
  { chiave: 'altro/boilie-di-qualita', nome: 'Boilie di qualità', effetto: 'Esca gustosa per catturare pesci normali di qualunque dimensione', descrizione: LAGHETTO('400') },
];

const OFFERTA = { chiave: 'akiba/strumenti-del-cercatore', negozio: 'akiba', scheda: 'altro/strumenti-del-cercatore', prezzo: 2000,
  condizioni: JSON.stringify([{ tipo: 'data', dal: '09-01' }]), rifornimento: JSON.stringify({ tipo: 'mai', origine: 'fallback-utente' }) } as const;

export const migration358: Migration = {
  id: 358,
  name: 'strumenti_e_laghetto',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!['catalogo_oggetto', 'articolo', 'negozio', 'dati_guida'].every((t) => esisteTabella(db, t))) return;
    const adesso = new Date().toISOString();
    const primaSchede = db.prepare('SELECT COUNT(*) FROM main.catalogo_oggetto').pluck().get() as number;
    const schede = SCHEDE.map((s) => {
      if (db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(s.chiave)) return { chiave: s.chiave, esito: 'chiave già presente: non toccata' };
      // un oggetto con lo stesso nome sotto un'altra chiave è già la sua scheda: non se ne fa un doppione
      if (db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE nome = ?').get(s.nome)) return { chiave: s.chiave, esito: 'nome già presente sotto un’altra chiave: nessuna scheda' };
      db.prepare(`INSERT INTO main.catalogo_oggetto (chiave, categoria, sottocategoria, nome, nomi_altri_json, nome_originale, effetto, descrizione, statistiche_json, fonte_tipo, fonte_chiave, origine, nascosto, updated_at)
        VALUES (?, 'altro', NULL, ?, '[]', NULL, ?, ?, NULL, 'guida', ?, 'seed', 0, ?)`).run(s.chiave, s.nome, s.effetto, s.descrizione, `oggetti-chiave-essenziali/${s.nome}`, adesso);
      return { chiave: s.chiave, esito: 'scheda creata' };
    });

    let offerta = 'offerta creata (2.000 ¥, dal 1° settembre)';
    if (db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ?').get(OFFERTA.chiave)) offerta = 'offerta già presente: non toccata';
    else if (!db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ?').get(OFFERTA.negozio)) offerta = 'negozio assente: nessuna offerta';
    else if (!haColonna(db, 'articolo', 'catalogo_chiave') || !haColonna(db, 'articolo', 'rifornimento_json')) offerta = 'schema vecchio: nessuna offerta';
    else if (!db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ? AND nascosto = 0').get(OFFERTA.scheda)) offerta = 'scheda assente o nascosta: nessuna offerta';
    else if (db.prepare('SELECT 1 FROM main.articolo WHERE negozio_chiave = ? AND catalogo_chiave = ?').get(OFFERTA.negozio, OFFERTA.scheda)) offerta = 'il negozio ha già un’offerta della scheda: non toccata';
    else {
      const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.articolo WHERE negozio_chiave = ?').pluck().get(OFFERTA.negozio) as number;
      const conRegola = haColonna(db, 'articolo', 'regola_comune');
      db.prepare(`INSERT INTO main.articolo (chiave, negozio_chiave, ordine, nome, categoria, per, prezzo, nota, fonte, verificato, origine, nascosto, updated_at, condizioni_json, catalogo_chiave, quantita, rifornimento_json${conRegola ? ', regola_comune' : ''})
        VALUES (?, ?, ?, '', 'altro', NULL, ?, NULL, ?, 1, 'seed', 0, ?, ?, ?, 1, ?${conRegola ? ', 0' : ''})`)
        .run(OFFERTA.chiave, OFFERTA.negozio, ordine, OFFERTA.prezzo, FONTE_OGGETTI_CHIAVE, adesso, OFFERTA.condizioni, OFFERTA.scheda, OFFERTA.rifornimento);
    }
    const create = schede.filter((s) => s.esito === 'scheda creata').length;
    if ((db.prepare('SELECT COUNT(*) FROM main.catalogo_oggetto').pluck().get() as number) !== primaSchede + create) errore('il catalogo non ha le schede attese');
    if (create === 0 && !offerta.startsWith('offerta creata')) return;
    registraAudit(db, 'audit-l4-04-strumenti-laghetto', { migrazione: 'L4-04 · 358', conteggi: { schede: create, offerte: offerta.startsWith('offerta creata') ? 1 : 0 },
      fonte: FONTE_OGGETTI_CHIAVE, schede, offerta: { chiave: OFFERTA.chiave, esito: offerta }, fuori: 'Stecca jump, Set di freccette, Boilie sospetto: Q18, invariati finché non sono verificati in gioco' });
    logger.info({ migrazione: 'L4-04-358', schede: create, offerta }, 'strumenti del cercatore e oggetti del laghetto');
  },
};
