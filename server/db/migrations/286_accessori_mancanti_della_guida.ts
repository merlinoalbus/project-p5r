// ============================================================
// Migrazione 286 — gli accessori della pagina Accessori senza scheda, e le loro offerte (chiusura dell'ondata 5)
// ============================================================
//
// Revisione finale dell'ondata 5, rilievo 1 (alto): «Le 47 righe della pagina Accessori senza scheda (Anello dell'oscurità, Portafortuna
// imperiale, Teschio di Cristallo, Oricalco, Cerotti rigenerativi, Adesivi SP e altre) non sono create». Decisione 21: «Non sono d'accordo nel
// rimandare attività a fasi successive». Dopo la 284 (che ha ridato il nome della guida a 15 schede dell'equipaggiamento: Anello dell'oscurità e
// R, Portafortuna imperiale e R, Arpa dell'Ade e R, Koh-i-Noor e R, Kugelbein e R, Oricalco e R, Orlov e R, Luna nera R) il censimento delle 301
// righe della pagina Accessori [A] contro nome, nomi alternativi e nome originale di ogni scheda lascia senza scheda le righe qui sotto, che
// nascono con il testo di [A]: effetto «Attiva <abilità>: <effetto>» come le schede della 272/278, la descrizione solo dove nessun altro dato
// dice come si ottengono (la «Reperibilità» di [A]: Sedia elettrica, incidente di trasmutazione, Gabbie di battuta, gita alle Hawaii, Laghetto di
// pesca, contenuti scaricabili). Dove [A] dà un negozio nasce anche l'offerta, che porta il prezzo (la descrizione resta vuota):
//   - Clinica di Takemi, rango 5 della Morte (condizioni come le altre offerte del rango 5): Cerotto rigenerativo 1-3 (30.000, 60.000, 90.000 ¥)
//     e Adesivo SP 1-3 (40.000, 80.000, 100.000 ¥); [A] scrive anche la metà del prezzo, che è lo sconto del rango 7 della Clinica (269): non
//     si copia;
//   - Untouchable, dall'arco del Palazzo di Madarame (condizione come le altre offerte di quell'arco): Pacchetto di petrolio e Impacco di ghiaccio
//     (2.000 ¥), e le Batterie portatili (2.000 ¥, scheda già presente: revisione del lotto F, terzo giro, rilievo 7: il negozio stava nella
//     descrizione, che la 278 ora lascia vuota).
// Il Laghetto di pesca non ha un negozio (il suo premio si paga in punti della pesca, che l'app non tiene come valuta): Cintura Umi Sachihiko e
// Portachiavi esca dicono il premio nella descrizione, come il Distintivo dio-pesce della 273.
// La Calzamaglia nera c'era come «altro» con «Costume predefinito»: diventa l'accessorio predefinito di Makoto, come le altre nove.
// Fuori da qui: Teschio di Cristallo e R (le due schede Crystal Skull, chiamate «Distintivo dell'angelo»: decisione dell'utente, vedi la 284) e la
// Pietra sacra come offerta di Chihaya (il suo acquisto con i tre Salgemmi è del lotto F-bis, decisione 22): qui nasce la sola scheda.
//
// Conservativa: una scheda o un'offerta con la stessa chiave che esiste già non si tocca (l'audit lo dice); l'offerta nasce solo se la sua scheda
// c'è e il negozio c'è. Nessuna voce del Diario e nessun dato delle partite cambia. Idempotente. Audit in `dati_guida.audit-286-accessori-mancanti`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { FALLBACK_UTENTE } from './rifornimentoOndata5.js';
import { FONTE_ACCESSORI, improntaDiario, scriviAuditChiusura, scriviColonnaCatalogo } from './chiusuraOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-286-accessori-mancanti';

interface Scheda { chiave: string; nome: string; effetto: string; descrizione: string }
const s = (chiave: string, nome: string, effetto: string, descrizione = ''): Scheda => ({ chiave, nome, effetto, descrizione });
const PREDEFINITO = (chi: string) => `Accessorio predefinito di ${chi}`;
const HAWAII = (chi: string) => `Gita alle Hawaii, sabato 10 settembre: trascorrendo del tempo con ${chi}`;
const INCIDENTE = (livelli: string) => `Incidente durante una trasmutazione in un Allarme Fusione (Personae di livello ${livelli})`;
const GABBIE = (difficolta: string) => `Premio fuoricampo nelle Gabbie di battuta a difficoltà ${difficolta}`;
const DLC = 'Contenuto scaricabile o bonus di Persona 5 Royal';

/** Le schede nuove, con il testo di [A] (nome, abilità ed effetto, reperibilità). */
const SCHEDE: readonly Scheda[] = [
  // accessori predefiniti dei personaggi ([A]: nessuna abilità né effetto)
  s('accessorio/occhiali-alla-moda', 'Occhiali alla moda', '', PREDEFINITO('Joker')),
  s('accessorio/marsupio', 'Marsupio', '', PREDEFINITO('Morgana')),
  s('accessorio/bretelle', 'Bretelle', '', PREDEFINITO('Ryuji')),
  s('accessorio/forcina', 'Forcina', '', PREDEFINITO('Ann')),
  s('accessorio/portachiavi-dargento', 'Portachiavi d\'argento', '', PREDEFINITO('Yusuke')),
  s('accessorio/cuffie', 'Cuffie', '', PREDEFINITO('Futaba')),
  s('accessorio/calzamaglia-a-pois', 'Calzamaglia a pois', '', PREDEFINITO('Haru')),
  s('accessorio/cravatta-nera', 'Cravatta nera', '', PREDEFINITO('Akechi')),
  s('accessorio/fiocco-rosso', 'Fiocco rosso', '', PREDEFINITO('Kasumi')),
  s('accessorio/pietra-sacra', 'Pietra sacra', '', 'Si ottiene durante un evento con Chihaya Mifune e si trasforma subito in 3 Salgemmi infranti'),
  // Sedia elettrica durante un Allarme Fusione
  s('accessorio/collare-della-fiamma', 'Collare della fiamma', 'Attiva Inferno: danno da fuoco grave a un nemico (probabilità di infliggere In fiamme)', 'Esecuzione: Sedia elettrica su Mada durante un Allarme Fusione'),
  // incidenti di trasmutazione
  s('accessorio/cintura-fortunata', 'Cintura fortunata', 'Attiva Colpo fortunato: danno fisico minimo a un nemico (alta probabilità di critico)', INCIDENTE('1-35')),
  s('accessorio/cintura-furia-letale', 'Cintura furia letale', 'Attiva Furia letale: danno fisico grave a un nemico (più potente dopo una Staffetta)', INCIDENTE('56-99')),
  s('accessorio/anello-dellinferno', 'Anello dell\'inferno', 'Attiva Mudoon: probabilità media che l’abilità maledetta uccida un nemico', INCIDENTE('36-55')),
  s('accessorio/anello-della-possanza', 'Anello della possanza', 'Attiva Megido: danno divino medio a tutti i nemici', INCIDENTE('1-35')),
  s('accessorio/anello-dellonnipotenza', 'Anello dell\'onnipotenza', 'Attiva Megidola: danno divino pesante a tutti i nemici', INCIDENTE('36-55')),
  s('accessorio/cintura-affascinante', 'Cintura affascinante', 'Attiva Aura provocatoria: aumenta la probabilità di essere scelti dai nemici', INCIDENTE('1-35')),
  // gita alle Hawaii
  s('accessorio/pendente-honu-hawaii', 'Pendente honu', 'Attiva Evita maledizione: aumenta di molto l’elusione dalle abilità non Mudo (non cumulabile)', HAWAII('Hifumi')),
  s('accessorio/bambole-di-menehune', 'Bambole di Menehune', 'Attiva Aumento mana: aumenta gli SP massimi del 20%', HAWAII('Ann')),
  s('accessorio/portachiavi-tiki', 'Portachiavi tiki', 'Attiva Grazia divina: aumenta in automatico del 50% l’effetto della magia curativa', HAWAII('Makoto')),
  s('accessorio/anello-delle-hawaii', 'Anello delle Hawaii', 'Attiva Evita sacro: aumenta di molto l’elusione dalle abilità non Hama (non cumulabile)', HAWAII('Kawakami')),
  // Gabbie di battuta
  s('accessorio/cintura-hall-of-fame-gabbie', 'Cintura Hall of fame', 'Attiva Auto-Maraku: Marakukaja in automatico all’inizio della battaglia', GABBIE('Folle')),
  s('accessorio/calze-contenitive-gabbie', 'Calze contenitive', 'Attiva Evita att. fisici: aumenta di molto l’elusione dalle abilità fisiche', GABBIE('Esperto')),
  s('accessorio/portaf-grande-colpo-gabbie', 'Portaf. grande colpo', 'Attiva Discepolo sagace: aumenta la probabilità di critico', GABBIE('Avanzato')),
  s('accessorio/bretelle-robuste', 'Bretelle robuste', 'Attiva Volontà incrollabile: previene Confusione, Paura, Furia e Disperazione', GABBIE('Lo svanitore')),
  s('accessorio/berretto-asso', 'Berretto asso', 'Attiva Studente in gamba: riduce la probabilità di subire un critico', 'Gabbie di battuta di Yongen-Jaya, ottenendo un fuoricampo'),
  s('accessorio/polsiera-furente', 'Polsiera furente', 'Attiva Att. in furia aument.: aumenta l’attacco se colpito da Furia', 'Gabbie di battuta di Yongen-Jaya, ottenendo un fuoricampo'),
  // Laghetto di pesca (premi in punti della pesca)
  s('accessorio/cintura-umi-sachihiko-pesca', 'Cintura Umi Sachihiko', 'Attiva Auto-Mataru: Matarukaja in automatico all’inizio della battaglia', 'Laghetto di pesca Ichigaya, in cambio di 30.000 punti della pesca'),
  s('accessorio/portachiavi-esca', 'Portachiavi esca', 'Attiva Spirito tenace: aumenta la probabilità di critico in un’imboscata', 'Laghetto di pesca Ichigaya, in cambio di 6.000 punti della pesca'),
  // negozi: la descrizione resta vuota, il negozio lo dice l'offerta
  s('accessorio/pacchetto-di-petrolio', 'Pacchetto di petrolio', 'Attiva Potenzia In fiamme: aumenta la probabilità di infliggere In fiamme'),
  s('accessorio/impacco-di-ghiaccio', 'Impacco di ghiaccio', 'Attiva Pot. Congelamento: aumenta la probabilità di infliggere Congelamento'),
  s('accessorio/cerotto-rigenerativo-1', 'Cerotto rigenerativo 1', 'Attiva Rigenerazione 1: ripristina il 2% degli HP massimi a ogni turno in battaglia'),
  s('accessorio/cerotto-rigenerativo-2', 'Cerotto rigenerativo 2', 'Attiva Rigenerazione 2: ripristina il 4% degli HP massimi a ogni turno in battaglia'),
  s('accessorio/cerotto-rigenerativo-3', 'Cerotto rigenerativo 3', 'Attiva Rigenerazione 3: ripristina il 6% degli HP massimi a ogni turno in battaglia'),
  s('accessorio/adesivo-sp-1', 'Adesivo SP 1', 'Attiva Recupero 1: ripristina 3 SP a ogni turno in battaglia'),
  s('accessorio/adesivo-sp-2', 'Adesivo SP 2', 'Attiva Recupero 2: ripristina 5 SP a ogni turno in battaglia'),
  s('accessorio/adesivo-sp-3', 'Adesivo SP 3', 'Attiva Recupero 3: ripristina 7 SP a ogni turno in battaglia'),
  // altro
  s('accessorio/pilastro-divino', 'Pilastro divino', 'Attiva Strenua resistenza: si subiscono i colpi, ma il danno si dimezza', 'Bottino raro del Mietitore'),
  s('accessorio/sfera-onnipotente', 'Sfera onnipotente', 'Attiva Difesa zenit: annulla gli attacchi magici, tranne quelli divini', 'Si ottiene vincendo la battaglia contro Lavenza'),
  // contenuti scaricabili e bonus
  s('accessorio/stemma-seven-sisters', 'Stemma Seven Sisters', 'Attiva Nasconditi: riduce la probabilità di essere presi di mira dai nemici', DLC),
  s('accessorio/fascia-bracc-sees', 'Fascia bracc. S.E.E.S.', 'Attiva Potenzia Soldi: aumenta del 15% il denaro guadagnato', DLC),
  s('accessorio/occhiali-della-squadra', 'Occhiali della squadra', 'Attiva PE +15%: aumenta del 15% i PE guadagnati in battaglia', DLC),
  s('accessorio/evocatore', 'Evocatore', 'Attiva Precisione arma +5%: migliora del 5% la precisione degli attacchi con arma da fuoco', DLC),
  s('accessorio/bandana-di-mezzanotte', 'Bandana di mezzanotte', 'Attiva Potenzia Assalto: aumenta la forza degli Assalti', DLC),
  s('accessorio/guanto-luce-stellare', 'Guanto luce stellare', 'Attiva Tocco dell’anima: ripristina 5 SP dopo una Staffetta', DLC),
  s('accessorio/manganello-custode', 'Manganello custode', 'Attiva Incremento vita: aumenta gli HP massimi del 40%', DLC),
  s('accessorio/manto-di-piume', 'Manto di piume', 'Attiva Ultimo baluardo: se circondati, diminuisce molto la Precisione di ogni attacco nemico (tranne quelli divini)', DLC),
  s('accessorio/dispositivo-demonica', 'Dispositivo Demonica', 'Attiva Amplifica arma: potenzia del 50% le abilità da arma da fuoco (cumulabile)', DLC),
  s('accessorio/cinghia-fotocamera', 'Cinghia fotocamera', 'Attiva Riscaldamento: ripristina il 5% degli HP massimi e 10 SP a ogni turno in un’imboscata', DLC),
  s('accessorio/guanto', 'Guanto', 'Attiva Spirito del samurai: aumenta l’elusione dagli attacchi critici e magici', DLC),
  s('accessorio/deck', 'DECK', 'Attiva Potenzia Vita: aumenta di 20 gli SP massimi / Tutte le statistiche +3', DLC),
  s('accessorio/tubi-di-kuzunoha', 'Tubi di Kuzunoha', 'Attiva Emblema di Kuzunoha: riduce del 25% il costo in SP e HP delle abilità', DLC),
  s('accessorio/cuscino-dagnello', 'Cuscino d\'agnello', 'Attiva Forza spirituale: diminuisce la probabilità di subire alterazioni negative', DLC),
];

const RANGO_5_TAKEMI = [{ tipo: 'data', dal: '04-16' }, { tipo: 'confidente', confidente: 'takemi', rango: 1 }, { tipo: 'confidente', confidente: 'takemi', rango: 5 }];
const ARCO_MADARAME = [{ tipo: 'arco', dungeon: 'madarame' }];

/** Le offerte dei negozi di [A]: chiave, negozio, scheda, nome, prezzo, condizioni. */
const OFFERTE: ReadonlyArray<{ chiave: string; negozio: string; scheda: string; nome: string; prezzo: number; condizioni: unknown[] }> = [
  { chiave: 'clinica-takemi/cerotto-rigenerativo-1', negozio: 'clinica-takemi', scheda: 'accessorio/cerotto-rigenerativo-1', nome: 'Cerotto rigenerativo 1', prezzo: 30000, condizioni: RANGO_5_TAKEMI },
  { chiave: 'clinica-takemi/cerotto-rigenerativo-2', negozio: 'clinica-takemi', scheda: 'accessorio/cerotto-rigenerativo-2', nome: 'Cerotto rigenerativo 2', prezzo: 60000, condizioni: RANGO_5_TAKEMI },
  { chiave: 'clinica-takemi/cerotto-rigenerativo-3', negozio: 'clinica-takemi', scheda: 'accessorio/cerotto-rigenerativo-3', nome: 'Cerotto rigenerativo 3', prezzo: 90000, condizioni: RANGO_5_TAKEMI },
  { chiave: 'clinica-takemi/adesivo-sp-1', negozio: 'clinica-takemi', scheda: 'accessorio/adesivo-sp-1', nome: 'Adesivo SP 1', prezzo: 40000, condizioni: RANGO_5_TAKEMI },
  { chiave: 'clinica-takemi/adesivo-sp-2', negozio: 'clinica-takemi', scheda: 'accessorio/adesivo-sp-2', nome: 'Adesivo SP 2', prezzo: 80000, condizioni: RANGO_5_TAKEMI },
  { chiave: 'clinica-takemi/adesivo-sp-3', negozio: 'clinica-takemi', scheda: 'accessorio/adesivo-sp-3', nome: 'Adesivo SP 3', prezzo: 100000, condizioni: RANGO_5_TAKEMI },
  { chiave: 'untouchable/pacchetto-di-petrolio', negozio: 'untouchable', scheda: 'accessorio/pacchetto-di-petrolio', nome: 'Pacchetto di petrolio', prezzo: 2000, condizioni: ARCO_MADARAME },
  { chiave: 'untouchable/impacco-di-ghiaccio', negozio: 'untouchable', scheda: 'accessorio/impacco-di-ghiaccio', nome: 'Impacco di ghiaccio', prezzo: 2000, condizioni: ARCO_MADARAME },
  { chiave: 'untouchable/batterie-portatili', negozio: 'untouchable', scheda: 'altro/batterie-portatili', nome: 'Batterie portatili', prezzo: 2000, condizioni: ARCO_MADARAME },
];

function creaScheda(db: AppDatabase, x: Scheda): string {
  if (db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(x.chiave)) return 'chiave già presente: non toccata';
  db.prepare(`INSERT INTO main.catalogo_oggetto (chiave, categoria, sottocategoria, nome, nomi_altri_json, nome_originale, effetto, descrizione, statistiche_json, fonte_tipo, fonte_chiave, origine, nascosto, updated_at)
    VALUES (?, 'accessorio', NULL, ?, '[]', NULL, ?, ?, NULL, 'guida', ?, 'seed', 0, ?)`)
    .run(x.chiave, x.nome, x.effetto, x.descrizione, `accessori/${x.nome}`, new Date().toISOString());
  return 'scheda creata';
}

function creaOfferta(db: AppDatabase, o: (typeof OFFERTE)[number]): string {
  if (db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ?').get(o.chiave)) return 'offerta già presente: non toccata';
  if (!db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ?').get(o.negozio)) return `negozio ${o.negozio} assente: nessuna offerta`;
  if (!db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ? AND nascosto = 0').get(o.scheda)) return `scheda ${o.scheda} assente o nascosta: nessuna offerta`;
  if (db.prepare('SELECT 1 FROM main.articolo WHERE negozio_chiave = ? AND catalogo_chiave = ?').get(o.negozio, o.scheda)) return 'il negozio ha già un’offerta della stessa scheda: nessuna offerta';
  const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.articolo WHERE negozio_chiave = ?').pluck().get(o.negozio) as number;
  db.prepare(`INSERT INTO main.articolo (chiave, negozio_chiave, ordine, nome, categoria, per, prezzo, effetto, statistiche, nota, fonte, verificato, origine, nascosto, updated_at,
      condizioni_json, catalogo_chiave, quantita, rifornimento_json)
    VALUES (?, ?, ?, ?, 'accessorio', NULL, ?, NULL, NULL, NULL, ?, 1, 'seed', 0, ?, ?, ?, ?, ?)`)
    .run(o.chiave, o.negozio, ordine, o.nome, o.prezzo, FONTE_ACCESSORI, new Date().toISOString(), JSON.stringify(o.condizioni), o.scheda, FALLBACK_UTENTE.q, JSON.stringify(FALLBACK_UTENTE.r));
  return `offerta creata (${o.prezzo.toLocaleString('it-IT')} ¥)`;
}

export const migration286: Migration = {
  id: 286,
  name: 'accessori_mancanti_della_guida',
  up(db) {
    if (!db.inTransaction) throw new Error('286: manca la transazione della migrazione; nessuna modifica applicata.');
    if (!esisteTabella(db, 'catalogo_oggetto') || !esisteTabella(db, 'articolo') || !esisteTabella(db, 'negozio')) { logger.warn({ migrazione: 286 }, 'catalogo o listini assenti: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const schede = SCHEDE.map((x) => ({ chiave: x.chiave, nome: x.nome, esito: creaScheda(db, x) }));
    // la Calzamaglia nera c'era come «altro»: è l'accessorio predefinito di Makoto
    const calzamaglia = [
      scriviColonnaCatalogo(db, 'altro/calzamaglia-nera', 'categoria', 'altro', 'accessorio'),
      scriviColonnaCatalogo(db, 'altro/calzamaglia-nera', 'descrizione', 'Costume predefinito', PREDEFINITO('Makoto')),
    ];
    const offerte = OFFERTE.map((o) => ({ chiave: o.chiave, esito: creaOfferta(db, o) }));
    if (improntaDiario(db) !== diarioPrima) throw new Error('286: le voci del Diario sono cambiate; nessuna modifica applicata.');
    const create = schede.filter((x) => x.esito === 'scheda creata').length;
    const offerteCreate = offerte.filter((x) => x.esito.startsWith('offerta creata')).length;
    const cambiate = create + offerteCreate + calzamaglia.filter((e) => e.esito === 'scritto').length;
    if (cambiate) invalidaCacheDiGioco();
    scriviAuditChiusura(db, AUDIT, 286, { conteggi: { schede: create, offerte: offerteCreate, calzamaglia: calzamaglia.filter((e) => e.esito === 'scritto').length }, fonte: FONTE_ACCESSORI, schede, offerte, calzamaglia }, cambiate);
    logger.info({ migrazione: 286, schede: create, offerte: offerteCreate }, 'Accessori della guida senza scheda: schede e offerte create');
  },
};
