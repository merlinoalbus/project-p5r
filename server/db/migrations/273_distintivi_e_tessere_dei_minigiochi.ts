// ============================================================
// Migrazione 273 — distintivi, Tessere dei minigiochi e Carta Phoenix Rangers nel catalogo; gli scambi del Super Baron (Ondata 5, Lotto F)
// ============================================================
//
// Decisione 21 dell'utente: «Non sono d'accordo nel rimandare attività a fasi successive»; il testo dell'effetto vive nel catalogo. Censimento
// ECC (O5-10): nel catalogo mancavano i distintivi della Big Bang Burger, del Super Baron e il Distintivo Featherman, le 6 Tessere dei
// minigiochi e la Carta Phoenix Rangers; il Super Baron non aveva gli scambi.
//
// Guida italiana, Accessori [A] (letta il 2026-10-26):
//   - Big Bang Burger: «Distintivo numero due» HP massimi +10% (Comet Burger), «Distintivo numero uno» +20% (Gravity Burger), «Distintivo del
//     capitano» +30% (Cosmic Tower Burger). Prevale il dato Royal: i premi delle sfide dicevano «+10/30/50 HP» (corretti dalla 274). Sono premi
//     delle sfide, non offerte: si ottengono vincendo (il collegamento strutturato dell'esito all'oggetto è del lotto G).
//   - Super Baron (Akihabara, dal 1° settembre), in cambio di una tessera: Distintivo di Forneus (Ghiaccio +50%, cumulabile; Tessera
//     shooter), del treno (Elettricità +50%, cumulabile; Tessera ferrovia), dei pugni (elusione molto alta dalle abilità di Fuoco, non
//     cumulabile; Tessera boxe), Gambla (elusione molto alta dalle abilità elettriche, non cumulabile; Tessera azzardo), Golfer (Psicocinesi
//     +50%, cumulabile; Tessera golf), PI (Nucleare +50%, cumulabile; Tessera combattimento), Featherman (Vento +50%, cumulabile; Carta
//     Phoenix Rangers).
// Oggetti chiave/essenziali [C], sezione «Altro»: le tessere e la carta sono oggetti da collezione per appassionati e si ottengono completando
//   il videogioco (Star Forneus, Train of Life, Punch Ouch, Gambla Goemon, Golfer Sarutahiko, Power Intuition, Featherman Seeker).
//
//   - Laghetto di pesca Ichigaya: Distintivo dio-pesce (Danza di Ali, riduce di molto la precisione di un nemico; 100.000 punti); DLC:
//     Distintivo St. Hermelin (annulla le abilità sacre e maledette).
// Che cosa fa: 12 schede «accessorio» (i distintivi) e 7 schede «altro» (tessere e carta), della guida; 7 offerte di scambio al Super Baron
// (`costo_json` «oggetti»: la tessera, 1 pezzo), nello stesso quartiere e dalla stessa data delle altre offerte del negozio, pezzo unico (la
// tessera è una sola). Conservativa: una scheda o un'offerta che c'è già (anche nascosta) non si tocca; con lo stesso nome nella stessa
// categoria non si crea un doppione (l'audit lo dice). Nessuna voce del Diario e nessun dato delle partite cambia. Idempotente.
// Audit `dati_guida.audit-273-distintivi`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { UNICO } from './rifornimentoOndata5.js';
import { FONTE_ACCESSORI, FONTE_CHIAVE, improntaDiario, scriviAuditTesti } from './testiOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-273-distintivi';
const errore = (motivo: string): never => { throw new Error(`273: ${motivo}; nessuna modifica applicata.`); };
type Esito = { chiave: string; esito: string };

interface SchedaNuova { chiave: string; categoria: 'accessorio' | 'altro'; nome: string; nomeOriginale: string | null; effetto: string; descrizione: string; fonte: string }

const BBB = (sfida: string) => `Premio della sfida «${sfida}» del Big Bang Burger (Shibuya, Central Street)`;
const TESSERA = (gioco: string) => `Si ottiene completando il videogioco ${gioco}`;
const COLLEZIONE = (distintivo: string) => `Oggetto da collezione per appassionati: al Super Baron di Akihabara si scambia con il ${distintivo}`;

// i nomi originali (inglesi) non sono nella guida italiana, l'unica fonte di queste schede: restano vuoti (rilievo della revisione del lotto F)
const DISTINTIVI: readonly SchedaNuova[] = [
  { chiave: 'accessorio/distintivo-numero-due', categoria: 'accessorio', nome: 'Distintivo numero due', nomeOriginale: null, effetto: 'HP massimi +10 percento', descrizione: BBB('Comet Burger'), fonte: FONTE_ACCESSORI },
  { chiave: 'accessorio/distintivo-numero-uno', categoria: 'accessorio', nome: 'Distintivo numero uno', nomeOriginale: null, effetto: 'HP massimi +20 percento', descrizione: BBB('Gravity Burger'), fonte: FONTE_ACCESSORI },
  { chiave: 'accessorio/distintivo-del-capitano', categoria: 'accessorio', nome: 'Distintivo del capitano', nomeOriginale: null, effetto: 'HP massimi +30 percento', descrizione: BBB('Cosmic Tower Burger'), fonte: FONTE_ACCESSORI },
  { chiave: 'accessorio/distintivo-di-forneus', categoria: 'accessorio', nome: 'Distintivo di Forneus', nomeOriginale: null, effetto: 'Potenzia abilità di Ghiaccio del 50 percento (cumulabile)', descrizione: '', fonte: FONTE_ACCESSORI },
  { chiave: 'accessorio/distintivo-del-treno', categoria: 'accessorio', nome: 'Distintivo del treno', nomeOriginale: null, effetto: 'Potenzia abilità di Elettricità del 50 percento (cumulabile)', descrizione: '', fonte: FONTE_ACCESSORI },
  { chiave: 'accessorio/distintivo-dei-pugni', categoria: 'accessorio', nome: 'Distintivo dei pugni', nomeOriginale: null, effetto: 'Aumenta molto l’elusione dalle abilità di Fuoco (non cumulabile)', descrizione: '', fonte: FONTE_ACCESSORI },
  { chiave: 'accessorio/distintivo-gambla', categoria: 'accessorio', nome: 'Distintivo Gambla', nomeOriginale: null, effetto: 'Aumenta molto l’elusione dalle abilità di Elettricità (non cumulabile)', descrizione: '', fonte: FONTE_ACCESSORI },
  { chiave: 'accessorio/distintivo-golfer', categoria: 'accessorio', nome: 'Distintivo Golfer', nomeOriginale: null, effetto: 'Potenzia abilità di Psicocinesi del 50 percento (cumulabile)', descrizione: '', fonte: FONTE_ACCESSORI },
  { chiave: 'accessorio/distintivo-pi', categoria: 'accessorio', nome: 'Distintivo PI', nomeOriginale: null, effetto: 'Potenzia abilità Nucleari del 50 percento (cumulabile)', descrizione: '', fonte: FONTE_ACCESSORI },
  { chiave: 'accessorio/distintivo-featherman', categoria: 'accessorio', nome: 'Distintivo Featherman', nomeOriginale: null, effetto: 'Potenzia abilità di Vento del 50 percento (cumulabile)', descrizione: '', fonte: FONTE_ACCESSORI },
  // [A], gli altri due distintivi della pagina (rilievo della revisione del lotto F: nulla si rimanda). Il Laghetto di pesca non è un negozio
  // dei dati (i punti della pesca non sono una moneta delle offerte): il costo in punti resta nella descrizione, come per le altre schede
  // della guida senza offerta
  { chiave: 'accessorio/distintivo-dio-pesce', categoria: 'accessorio', nome: 'Distintivo dio-pesce', nomeOriginale: null, effetto: 'Attiva Danza di Ali: riduce di molto la precisione di un nemico', descrizione: 'Laghetto di pesca Ichigaya, in cambio di 100.000 punti della pesca', fonte: FONTE_ACCESSORI },
  { chiave: 'accessorio/distintivo-st-hermelin', categoria: 'accessorio', nome: 'Distintivo St. Hermelin', nomeOriginale: null, effetto: 'Annulla le abilità sacre e maledette', descrizione: 'Contenuto scaricabile (DLC e bonus di Persona 5 Royal)', fonte: FONTE_ACCESSORI },
];

/** Le tessere e la carta, con il distintivo che si riceve in cambio al Super Baron. */
const TESSERE: ReadonlyArray<SchedaNuova & { distintivo: string }> = [
  { chiave: 'altro/tessera-shooter', categoria: 'altro', nome: 'Tessera shooter', nomeOriginale: null, effetto: COLLEZIONE('Distintivo di Forneus'), descrizione: TESSERA('Star Forneus'), fonte: FONTE_CHIAVE, distintivo: 'accessorio/distintivo-di-forneus' },
  { chiave: 'altro/tessera-ferrovia', categoria: 'altro', nome: 'Tessera ferrovia', nomeOriginale: null, effetto: COLLEZIONE('Distintivo del treno'), descrizione: TESSERA('Train of Life'), fonte: FONTE_CHIAVE, distintivo: 'accessorio/distintivo-del-treno' },
  { chiave: 'altro/tessera-boxe', categoria: 'altro', nome: 'Tessera boxe', nomeOriginale: null, effetto: COLLEZIONE('Distintivo dei pugni'), descrizione: TESSERA('Punch Ouch'), fonte: FONTE_CHIAVE, distintivo: 'accessorio/distintivo-dei-pugni' },
  { chiave: 'altro/tessera-azzardo', categoria: 'altro', nome: 'Tessera azzardo', nomeOriginale: null, effetto: COLLEZIONE('Distintivo Gambla'), descrizione: TESSERA('Gambla Goemon'), fonte: FONTE_CHIAVE, distintivo: 'accessorio/distintivo-gambla' },
  { chiave: 'altro/tessera-golf', categoria: 'altro', nome: 'Tessera golf', nomeOriginale: null, effetto: COLLEZIONE('Distintivo Golfer'), descrizione: TESSERA('Golfer Sarutahiko'), fonte: FONTE_CHIAVE, distintivo: 'accessorio/distintivo-golfer' },
  { chiave: 'altro/tessera-combattimento', categoria: 'altro', nome: 'Tessera combattimento', nomeOriginale: null, effetto: COLLEZIONE('Distintivo PI'), descrizione: TESSERA('Power Intuition'), fonte: FONTE_CHIAVE, distintivo: 'accessorio/distintivo-pi' },
  { chiave: 'altro/carta-phoenix-rangers', categoria: 'altro', nome: 'Carta Phoenix Rangers', nomeOriginale: null, effetto: COLLEZIONE('Distintivo Featherman'), descrizione: TESSERA('Featherman Seeker'), fonte: FONTE_CHIAVE, distintivo: 'accessorio/distintivo-featherman' },
];

const SUPER_BARON = 'super-baron';
/** Le condizioni delle offerte del Super Baron, come quelle che ci sono già (Akihabara, dal 1° settembre). */
const CONDIZIONI_SUPER_BARON = [{ tipo: 'quartiere', quartiere: 'akihabara' }, { tipo: 'data', dal: '09-01' }];

function scheda(db: AppDatabase, s: SchedaNuova): Esito {
  const gia = db.prepare('SELECT nascosto FROM main.catalogo_oggetto WHERE chiave = ?').get(s.chiave) as { nascosto: number } | undefined;
  if (gia) return { chiave: s.chiave, esito: gia.nascosto ? 'scheda già presente ma nascosta: non toccata' : 'scheda già presente' };
  const omonima = db.prepare('SELECT chiave FROM main.catalogo_oggetto WHERE categoria = ? AND lower(nome) = lower(?)').pluck().get(s.categoria, s.nome) as string | undefined;
  if (omonima) return { chiave: s.chiave, esito: `c’è già una scheda con lo stesso nome (${omonima}): nessun doppione` };
  db.prepare(`INSERT INTO main.catalogo_oggetto (chiave, categoria, sottocategoria, nome, nomi_altri_json, nome_originale, effetto, descrizione, statistiche_json, fonte_tipo, fonte_chiave, origine, nascosto, updated_at)
    VALUES (?, ?, NULL, ?, '[]', ?, ?, ?, NULL, 'guida', ?, 'seed', 0, ?)`)
    .run(s.chiave, s.categoria, s.nome, s.nomeOriginale, s.effetto, s.descrizione, `${s.fonte === FONTE_ACCESSORI ? 'accessori' : 'oggetti-chiave-essenziali'}/${s.nome}`, new Date().toISOString());
  return { chiave: s.chiave, esito: 'scheda creata' };
}

function scambio(db: AppDatabase, t: (typeof TESSERE)[number]): Esito {
  const distintivo = DISTINTIVI.find((d) => d.chiave === t.distintivo)!;
  const chiave = `${SUPER_BARON}/${distintivo.chiave.split('/')[1]}`;
  const gia = db.prepare('SELECT nascosto FROM main.articolo WHERE chiave = ?').get(chiave) as { nascosto: number } | undefined;
  if (gia) return { chiave, esito: gia.nascosto ? 'offerta già presente ma nascosta: non toccata' : 'offerta già presente' };
  if (!db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ? AND nascosto = 0').get(SUPER_BARON)) return { chiave, esito: 'negozio del Super Baron assente o nascosto: nessuna offerta' };
  for (const k of [distintivo.chiave, t.chiave]) {
    if (!db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ? AND nascosto = 0').get(k)) return { chiave, esito: `scheda ${k} assente o nascosta: nessuna offerta` };
  }
  const doppia = db.prepare('SELECT chiave FROM main.articolo WHERE negozio_chiave = ? AND catalogo_chiave = ? AND nascosto = 0').pluck().get(SUPER_BARON, distintivo.chiave) as string | undefined;
  if (doppia) return { chiave, esito: `il negozio ha già un’offerta dello stesso oggetto (${doppia}): nessuna offerta nuova` };
  const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.articolo WHERE negozio_chiave = ?').pluck().get(SUPER_BARON) as number;
  db.prepare(`INSERT INTO main.articolo (chiave, negozio_chiave, ordine, nome, categoria, per, prezzo, effetto, statistiche, nota, fonte, verificato, origine, nascosto, updated_at,
      condizioni_json, catalogo_chiave, costo_json, quantita, rifornimento_json)
    VALUES (?, ?, ?, ?, 'accessorio', NULL, NULL, NULL, NULL, NULL, ?, 1, 'seed', 0, ?, ?, ?, ?, ?, ?)`)
    .run(chiave, SUPER_BARON, ordine, distintivo.nome, FONTE_ACCESSORI, new Date().toISOString(), JSON.stringify(CONDIZIONI_SUPER_BARON), distintivo.chiave,
      JSON.stringify({ tipo: 'oggetti', oggetti: [{ chiave: t.chiave, quantita: 1 }] }), UNICO.q, JSON.stringify(UNICO.r));
  return { chiave, esito: `creata (in cambio di ${t.nome}, ordine ${ordine})` };
}

export const migration273: Migration = {
  id: 273,
  name: 'distintivi_e_tessere_dei_minigiochi',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['catalogo_oggetto', 'articolo', 'negozio']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 273, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    if (!haColonna(db, 'articolo', 'rifornimento_json') || !haColonna(db, 'articolo', 'costo_json')) { logger.warn({ migrazione: 273 }, 'colonne delle offerte assenti: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const esiti: Esito[] = [...DISTINTIVI.map((s) => scheda(db, s)), ...TESSERE.map((s) => scheda(db, s)), ...TESSERE.map((t) => scambio(db, t))];
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const conteggi = {
      schedeCreate: esiti.filter((e) => e.esito === 'scheda creata').length,
      offerteCreate: esiti.filter((e) => e.esito.startsWith('creata')).length,
      giaPresenti: esiti.filter((e) => e.esito.startsWith('scheda già presente') || e.esito.startsWith('offerta già presente')).length,
      nonToccate: esiti.filter((e) => /non toccat|nessun/.test(e.esito)).length,
    };
    if (conteggi.schedeCreate + conteggi.offerteCreate) invalidaCacheDiGioco();
    scriviAuditTesti(db, AUDIT, 273, { fonti: [FONTE_ACCESSORI, FONTE_CHIAVE], conteggi, esiti }, conteggi.schedeCreate + conteggi.offerteCreate);
    logger.info({ migrazione: 273, ...conteggi }, 'Catalogo: distintivi, Tessere dei minigiochi, Carta Phoenix Rangers e scambi del Super Baron');
  },
};
