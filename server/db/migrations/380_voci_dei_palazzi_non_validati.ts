// ============================================================
// 380 — le voci dei Palazzi non validati secondo la guida (L9-04, rilievi P1, P2, P5, P6, P7, P10, P11, P12, P13, evento 152, T1)
// ============================================================
//
// Porta in `punto_interesse` ciò che la riverifica sul testo della guida ha CONFERMATO (rapporto N §1.2); dove N smentisce il rilievo non si tocca
// nulla (Magatama infernale x3 di P12, Pane per l'anima x2 e il forziere della sala d'aspetto di P13), e P3, P8, P9 restano fuori. Dipende dalla 379:
// le voci che qui cambiano Infiltrazione mantengono la chiave, così i collegamenti ai pin e gli stati restano validi.
//
// Tre generi di scrittura, ciascuno con la guardia sul dato atteso (nome, tipo, Infiltrazione, contenuto): se la riga non è quella, non si scrive e il
// caso va nell'audit col motivo.
//   - `VOCI_NUOVE`: 25 voci che la guida ha e l'app no. Chiave nuova «<infiltrazione>/<ordine>», `ordine` in coda alla loro Infiltrazione (in ordine di
//     guida), fonte la pagina del Palazzo, nessuna data. Non si inserisce se la chiave o l'ordine sono occupati o se l'Infiltrazione ha già una voce con
//     quel nome.
//   - `CORREZIONI`: nome, contenuto, tipo, Infiltrazione della voce esistente. Nessuna voce si cancella: la seconda copia dello Spray detergente (P13) resta
//     come «Racconto» (`carattere = 'descrittiva'`). Il dato superato del boss di Futaba resta in `dettagli_json.nota_storica` (dato Royal, regola «il dato superato
//     resta come nota storica separata»).
//   - i legami con il catalogo (`voce_oggetto`) che seguono le correzioni: gli oggetti spostati in un forziere nuovo e i due contenuti sbagliati di Shido.
// T1: i Semi senza `dettagli_json.contenuto` lo ricevono dalla guida (riga in `riga`); le due voci chiuse senza fonte del contenuto (`okumura-08…/1`,
// `maruki-04…/3`) restano com'erano. P11: si traducono solo i nomi con una fonte (Diamante nel catalogo, Granato nella pagina `tesori` r.155, Catena di perline nel
// contenuto della voce stessa); «Life Jacket», «Parapsy Ring», «Classified Armor» e «Soul Food» non hanno una resa documentata e restano, col motivo nell'audit.
//
// Il verbale è in `dati_guida.audit-l9-04-voci-palazzi`. Nessuna scrittura in `utente`. Idempotente: una seconda esecuzione trova tutto già scritto.
// Kamoshida, Madarame, Iweleth e i Memento non si toccano.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';
import { registraAudit } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`380: ${motivo}; nessuna modifica applicata.`); };

const FONTE = (pagina: string): string => `https://www.allgamestaff.it/persona-5-royal/${pagina}/`;
const KANESHIRO = 'palazzo-di-kaneshiro';
const FUTABA = 'palazzo-di-futaba';
const NIIJIMA = 'palazzo-di-sae';
const SHIDO = 'palazzo-di-shido';

const K02 = 'kaneshiro-02-corridoio-dei-banchieri';
const K03 = 'kaneshiro-03-ufficio-riciclaggio';
const K04 = 'kaneshiro-04-caveau-sotterraneo';
const F07 = 'futaba-07-camera-del-rigetto-chamber-of-rejection';
const F08 = 'futaba-08-camera-del-rimorso-chamber-of-guilt';
const F09 = 'futaba-09-camera-del-santuario-chamber-of-sanctuary';
const F10 = 'futaba-10-santuario-interno-camera-del-vuoto-area-finale-dato-parzialm';
const N03 = 'niijima-03-area-riservata-allo-staff-parte-i';
const N04 = 'niijima-04-area-riservata-allo-staff-parte-ii';
const N05 = 'niijima-05-area-riservata-allo-staff-parte-iii';
const N11 = 'niijima-11-lobby-piano-puntate-alte';
const N13 = 'niijima-13-oscura-dimora';
const S01 = 'shido-01-passaggio-centrale-sala-d-ingresso';
const S02 = 'shido-02-sala-centrale';

interface VoceNuova {
  area: string; ordine: number; tipo: 'forziere' | 'forziere-chiuso' | 'miniboss' | 'volonta';
  nome: string; descrizione: string; dettagli: Record<string, unknown>; pagina: string; rilievo: string; riga: string;
}

/** In ordine di guida dentro ogni Infiltrazione: gli `ordine` sono quelli dopo l'ultimo occupato sulla copia (controllati all'esecuzione). */
const VOCI_NUOVE: readonly VoceNuova[] = [
  { area: K02, ordine: 6, tipo: 'forziere-chiuso', nome: 'Forziere chiuso Stella della Gang', descrizione: 'Scrigno chiuso a chiave non sorvegliato, oltre le scale a sud.', dettagli: { contenuto: 'Stella della Gang (arma per Ryuji)' }, pagina: KANESHIRO, rilievo: 'P2', riga: 'r.447' },
  { area: K02, ordine: 7, tipo: 'forziere', nome: 'Forziere Polvere d’anima', descrizione: 'Forziere nella stanza prima del lettore di tessere.', dettagli: { contenuto: 'Polvere d’anima' }, pagina: KANESHIRO, rilievo: 'P2', riga: 'r.497' },
  { area: K02, ordine: 8, tipo: 'forziere', nome: 'Forziere Magatama psichico x3', descrizione: 'Forziere in una presa d’aria a nord, raggiunta da armadietti e tubi.', dettagli: { contenuto: '3x Magatama psichico' }, pagina: KANESHIRO, rilievo: 'P2', riga: 'r.603' },
  // la guida (r.647-707) la descrive nella stessa stanza del Seme verde, che la scheda e il suo pin collocano nell'Ufficio riciclaggio; l'intestazione della pagina arriva solo a r.749
  { area: K03, ordine: 7, tipo: 'forziere', nome: 'Forziere Kogatana nera', descrizione: 'Forziere raggiungibile scendendo dalle travi al centro della stanza.', dettagli: { contenuto: 'Kogatana nera' }, pagina: KANESHIRO, rilievo: 'P2', riga: 'r.673 (stanza del Seme verde, r.647-707)' },
  { area: K04, ordine: 17, tipo: 'miniboss', nome: 'Spirito divoravita (Kumbhanda)', descrizione: 'Mini-boss del caveau. Usa Bagno di sangue, attacco globale con possibile Paura.', dettagli: { debolezze: ['Sacro'], resistenze: ['resiste ad Armi da fuoco', 'annulla Fuoco'] }, pagina: KANESHIRO, rilievo: 'P2', riga: 'r.1012' },
  { area: K04, ordine: 18, tipo: 'miniboss', nome: 'Mastino dell’Ade (Cerbero)', descrizione: 'Mini-boss a guardia delle scale che portano al terzo Seme della Bramosia.', dettagli: { debolezze: ['Ghiaccio'] }, pagina: KANESHIRO, rilievo: 'P2', riga: 'r.1040' },
  { area: K04, ordine: 19, tipo: 'forziere-chiuso', nome: 'Forziere chiuso Catena di perline — Caveau 3P', descrizione: 'Forziere chiuso a chiave nel Caveau 3P.', dettagli: { contenuto: 'Catena di perline' }, pagina: KANESHIRO, rilievo: 'P2', riga: 'r.1082' },
  { area: K04, ordine: 20, tipo: 'forziere', nome: 'Forziere 3 Incensi FO — Caveau 3P', descrizione: 'Cassa raggiungibile con il Rampino, a sud del quadro elettrico.', dettagli: { contenuto: '3x Incenso FO' }, pagina: KANESHIRO, rilievo: 'P2', riga: 'r.1134' },
  { area: K04, ordine: 21, tipo: 'forziere', nome: 'Forziere Polvere d’anima — Caveau 3P', descrizione: 'Forziere raggiungibile con il Rampino salendo sugli schedari a sud, nella stanza col porcellino dorato.', dettagli: { contenuto: 'Polvere d’anima' }, pagina: KANESHIRO, rilievo: 'P2', riga: 'r.1180' },

  { area: F07, ordine: 7, tipo: 'forziere', nome: 'Forziere - Idaten Ofuda', descrizione: 'Forziere a nord dopo aver sconfitto il cane da guardia e il nemico potente.', dettagli: { contenuto: 'Idaten Ofuda' }, pagina: FUTABA, rilievo: 'P6', riga: 'r.703' },
  { area: F07, ordine: 8, tipo: 'forziere', nome: 'Forziere - Balsamo vitale', descrizione: 'Forziere nella stanza vuota oltre la porta di fronte alle scale.', dettagli: { contenuto: 'Balsamo vitale' }, pagina: FUTABA, rilievo: 'P6', riga: 'r.733' },
  { area: F07, ordine: 9, tipo: 'forziere-chiuso', nome: 'Forziere chiuso - Sciabola animale', descrizione: 'Primo forziere chiuso a chiave del dungeon, a nord sul terreno più alto.', dettagli: { contenuto: 'Sciabola animale (arma per Mona)' }, pagina: FUTABA, rilievo: 'P6', riga: 'r.777' },
  { area: F09, ordine: 4, tipo: 'forziere-chiuso', nome: 'Forziere chiuso - Veste dell’odio', descrizione: 'Forziere chiuso a chiave nella rientranza a nord-est della grande stanza del nemico potente.', dettagli: { contenuto: 'Veste dell’odio' }, pagina: FUTABA, rilievo: 'P6', riga: 'r.1137' },
  { area: F09, ordine: 5, tipo: 'forziere', nome: 'Forziere - Roccia nera', descrizione: 'Forziere a est nella stanza a sud delle piattaforme luminose.', dettagli: { contenuto: 'Roccia nera' }, pagina: FUTABA, rilievo: 'P6', riga: 'r.1197' },
  { area: F09, ordine: 6, tipo: 'forziere-chiuso', nome: 'Forziere chiuso - Coltello del supporto', descrizione: 'Cassa chiusa a chiave raggiunta con il Rampino saltando verso nord.', dettagli: { contenuto: 'Coltello del supporto (arma per Joker)' }, pagina: FUTABA, rilievo: 'P6', riga: 'r.1215' },
  { area: F09, ordine: 7, tipo: 'forziere', nome: 'Forziere - Balsamo vitale (cornicione ovest)', descrizione: 'Forziere lungo lo stretto cornicione verso ovest, oltre le scale ignorate.', dettagli: { contenuto: 'Balsamo vitale' }, pagina: FUTABA, rilievo: 'P6', riga: 'r.1229' },
  { area: F09, ordine: 8, tipo: 'miniboss', nome: 'Falso dio decadente', descrizione: 'Mini-boss a guardia del terzo Seme della Bramosia. Respinge attacchi fisici e Armi da fuoco; usa Bufudyne, Raffica, Mudoon e Concentrazione.', dettagli: { debolezze: ['Fuoco'], resistenze: ['respinge Attacchi fisici', 'respinge Armi da fuoco'] }, pagina: FUTABA, rilievo: 'P6', riga: 'r.1247-1257' },
  { area: F10, ordine: 1, tipo: 'forziere', nome: 'Forziere - Polvere d’anima', descrizione: 'Cassa in cima alle scale, oltre il varco a nord pattugliato da un Anubis.', dettagli: { contenuto: 'Polvere d’anima' }, pagina: FUTABA, rilievo: 'P6', riga: 'r.1449' },

  { area: N03, ordine: 5, tipo: 'forziere', nome: 'Forziere Polvere d’anima', descrizione: 'Cesto del tesoro sorvegliato da una Sentinella.', dettagli: { contenuto: 'Polvere d’anima' }, pagina: NIIJIMA, rilievo: 'P10', riga: 'r.396' },
  { area: N04, ordine: 4, tipo: 'forziere', nome: 'Forziere Roccia nera', descrizione: 'Forziere nella stanza con due Ornamenti e una Tavola dei semi.', dettagli: { contenuto: 'Roccia nera' }, pagina: NIIJIMA, rilievo: 'P10', riga: 'r.632' },
  { area: N04, ordine: 5, tipo: 'forziere', nome: 'Forziere Replica d’arma', descrizione: 'Baule del tesoro nella stanza al di là del cancello bloccato.', dettagli: { contenuto: 'Replica d’arma' }, pagina: NIIJIMA, rilievo: 'P10', riga: 'r.650' },
  { area: N05, ordine: 1, tipo: 'forziere', nome: 'Forziere Magatama del gelo x3', descrizione: 'Scrigno oltre la scala bloccata, raggiunta da sud.', dettagli: { contenuto: 'Magatama del gelo x3' }, pagina: NIIJIMA, rilievo: 'P10', riga: 'r.740' },
  { area: N11, ordine: 1, tipo: 'miniboss', nome: 'Sovrano degli apostati (Baal)', descrizione: 'Mini-boss a guardia del terzo Seme della Bramosia. Usa Magarudyne, Rakunda e Ayamur.', dettagli: { debolezze: ['Nucleare'] }, pagina: NIIJIMA, rilievo: 'P10', riga: 'r.1133-1139' },
  { area: N11, ordine: 2, tipo: 'volonta', nome: 'Seme Invidia Blu', descrizione: 'Terzo Seme del Palazzo, oltre la porta difesa da Baal.', dettagli: { contenuto: 'Seme della Bramosia (Invidia) blu; i tre semi formano il Cristallo dell’Invidia (Masukukaja)' }, pagina: NIIJIMA, rilievo: 'P10', riga: 'r.1141' },
  { area: N13, ordine: 6, tipo: 'forziere', nome: 'Forziere — Ofuda debilitante', descrizione: 'Forziere nella piccola stanza oltre la porta a est del labirinto.', dettagli: { contenuto: 'Ofuda debilitante' }, pagina: NIIJIMA, rilievo: 'P10', riga: 'r.1269' },
];

interface Correzione {
  chiave: string; rilievo: string; riga: string;
  atteso: { nome: string; tipo?: string; area?: string; contenuto?: string | null; carattere?: string | null; descrizione?: string };
  /** Le voci che devono esserci col nome dato perché la correzione valga: togliere un oggetto da una voce ha senso solo se un'altra voce lo porta. */
  richiede?: ReadonlyArray<{ chiave: string; nome: string }>;
  nuovo: { nome?: string; tipo?: string; area?: string; ordine?: number; descrizione?: string; contenuto?: string; notaStorica?: string; fonte?: string; fonteInPiu?: string; carattere?: string };
}

const CORREZIONI: readonly Correzione[] = [
  // P1: il quarto pannello PIN
  { chiave: `${K04}/1`, rilievo: 'P1', riga: 'palazzo-di-kaneshiro r.807, r.881, r.990, r.1205',
    atteso: { nome: 'Pannelli PIN del caveau', contenuto: 'Codici: RICH=0102, REAP=0931, HUGE=2319', descrizione: "3 pannelli PIN totali da risolvere usando le lettere trovate sulle pagine strappate: 'RICH' -> codice 0102 (R=0, I=1, H=2); 'REAP' -> codice 0931 (E=9, A=3); 'HUGE' -> codice 2319 (H=2, U=3, G=1, E=9)." },
    nuovo: { descrizione: "4 pannelli PIN totali da risolvere usando le lettere trovate sulle pagine strappate: 'RICH' -> codice 0102 (R=0, I=1, H=2); 'REAP' -> codice 0931 (E=9, A=3); 'HUGE' -> codice 2319 (H=2, U=3, G=1, E=9); 'GOLD' -> codice 1841 (Caveau 3P).", contenuto: 'Codici: RICH=0102, REAP=0931, HUGE=2319, GOLD=1841' } },
  // P5: Catena di perline e Seme ira verde stanno nella Camera del rimorso; la chiave resta (come per le voci di altri Palazzi spostate di Infiltrazione)
  { chiave: `${F07}/5`, rilievo: 'P5 (rilievo nuovo di N)', riga: 'palazzo-di-futaba r.945',
    atteso: { nome: 'Forziere - Catena di perline', area: F07, contenuto: 'Catena di perline', descrizione: 'Forziere raggiungibile nella Camera del Rigetto, contiene una Catena di perline.' },
    nuovo: { area: F08, ordine: 7, descrizione: 'Cassa con una Catena di perline a sud della Porta del Seme della Bramosia, all’estremità nord-orientale dei corridoi della Camera del rimorso.' } },
  { chiave: `${F07}/6`, rilievo: 'P5', riga: 'palazzo-di-futaba r.945',
    atteso: { nome: "Porta con Seme dell'Ira verde (dettaglio incerto)", tipo: 'oggetto', area: F07, contenuto: null, descrizione: "Secondo il riassunto automatico di allgamestaff, una porta protetta condurrebbe a un 'Seme ira verde'; il nome esatto della porta riportato ('Porta Seme della Bramosia') è probabilmente un errore di traduzione/estrazione automatica poiché 'Bramosia' (Lust) non è l'Arcana di questo Palazzo (Ira/Wrath). Dato da verificare manualmente sulla pagina originale." },
    nuovo: { tipo: 'volonta', nome: "Seme di Volontà dell'Ira (verde)", area: F08, ordine: 8, descrizione: 'Secondo Seme dell’Ira, dietro la Porta di un Seme della Bramosia all’estremità nord-orientale dei corridoi della Camera del rimorso.', contenuto: 'Seme ira verde (2 di 3, si combina nel Cristallo dell’ira)', fonte: FONTE(FUTABA) } },
  // P7: le statistiche del boss secondo la guida; il dato superato resta come nota storica
  { chiave: `${F10}/0`, rilievo: 'P7', riga: 'palazzo-di-futaba r.1473-1475',
    atteso: { nome: "La Sfinge / Wakaba Isshiki (Cognizione, non un'Ombra)", contenuto: 'HP stimati: circa 18.000 (fonte samurai-gamers.com, non-allgamestaff)' },
    nuovo: { contenuto: 'HP: 11.000 / SP: 1.000 — PE: 4.830 / Yen: 26.000', notaStorica: 'HP stimati circa 18.000 (samurai-gamers.com): dato superato dalla guida Royal.', fonteInPiu: FONTE(FUTABA) } },
  // P10: Roccia nera e Replica d'arma sono forzieri, non oggetti sparsi
  { chiave: `${N04}/1`, rilievo: 'P10', riga: 'palazzo-di-sae r.632, r.650',
    atteso: { nome: 'Oggetti sparsi Staff II', contenuto: "Roccia nera, Ornamenti, Tavola dei semi, Replica d'arma" },
    richiede: [{ chiave: `${N04}/4`, nome: 'Forziere Roccia nera' }, { chiave: `${N04}/5`, nome: 'Forziere Replica d’arma' }],
    nuovo: { contenuto: 'Ornamenti, Tavola dei semi' } },
  // P11: i nomi inglesi di Shido con una resa documentata
  { chiave: 'shido-05-ponte-piscina/2', rilievo: 'P11', riga: 'Diamante in catalogo (altro/diamante); Granato in tesori r.155',
    atteso: { nome: 'Life Jacket, Diamond, Garnet', contenuto: 'Life Jacket, Diamond, Garnet' },
    nuovo: { nome: 'Life Jacket, Diamante, Granato', contenuto: 'Life Jacket, Diamante, Granato' } },
  { chiave: 'shido-08-sala-intrattenimento/3', rilievo: 'P11', riga: 'Granato in tesori r.155',
    atteso: { nome: 'Ascia di Gilgamesh, Garnet, Unguento magico', contenuto: 'Ascia di Gilgamesh, Garnet, Unguento magico' },
    nuovo: { nome: 'Ascia di Gilgamesh, Granato, Unguento magico', contenuto: 'Ascia di Gilgamesh, Granato, Unguento magico' } },
  { chiave: 'shido-14-sala-macchine/2', rilievo: 'P11', riga: 'il contenuto della voce stessa',
    atteso: { nome: 'Bead Chain / Diamond', contenuto: 'Catena di perline, Diamante' },
    nuovo: { nome: 'Catena di perline / Diamante' } },
  // P12: Fiala della paura e Nirvana FR (la parte confermata da N: la Magatama infernale resta dov'è)
  { chiave: `${S01}/3`, rilievo: 'P12', riga: 'palazzo-di-shido r.179',
    atteso: { nome: '3 Fiale delle vertigini S', contenuto: 'Fiala delle vertigini S x3' },
    nuovo: { nome: '3 Fiale della paura S', contenuto: 'Fiala della paura S x3', fonte: FONTE(SHIDO) } },
  { chiave: `${S02}/3`, rilievo: 'P12', riga: 'palazzo-di-shido r.263',
    atteso: { nome: 'Modello di pistola', area: S02, contenuto: 'Modello di pistola (Nirvana ST nella versione Royal)', descrizione: "Forziere non chiuso nell'area (chiamata 'Central Passage' nella guida inglese), lato nord-ovest." },
    nuovo: { nome: 'Incenso Nirvana FR', area: S01, ordine: 6, descrizione: 'Forziere in fondo alle scale a sinistra delle porte del Passaggio centrale.', contenuto: 'Nirvana FR', fonte: FONTE(SHIDO) } },
  // P13: un solo forziere con lo Spray detergente; la voce doppia resta come racconto (nessuna fusione senza un elenco approvato)
  { chiave: 'maruki-01-ingresso/1', rilievo: 'P13', riga: 'palazzo-di-maruki r.475',
    atteso: { nome: 'Forziere chiuso a chiave — Percorso di prova (raggiungibile da qui il 12 gennaio)', contenuto: 'Spray detergente', carattere: null, descrizione: "Tornando indietro fino all'area del Percorso di prova, dopo aver ottenuto il Tesserino del personale si può aprire un forziere chiuso a chiave." },
    nuovo: { carattere: 'descrittiva', descrizione: 'È lo stesso forziere della voce «Forziere chiuso a chiave» del Percorso di prova: la guida ne indica uno solo, con lo Spray detergente.' } },
  // T1: il contenuto dei Semi dalla guida
  { chiave: `${K02}/0`, rilievo: 'T1', riga: 'palazzo-di-kaneshiro r.611', atteso: { nome: 'Seme di Volontà — Corridoio dei banchieri', contenuto: null }, nuovo: { contenuto: 'Seme gola rosso (1 di 3, si combina nel Cristallo della gola)' } },
  { chiave: 'kaneshiro-03-ufficio-riciclaggio/1', rilievo: 'T1', riga: 'palazzo-di-kaneshiro r.707', atteso: { nome: 'Seme di Volontà — Ufficio riciclaggio', contenuto: null }, nuovo: { contenuto: 'Seme gola verde (2 di 3, si combina nel Cristallo della gola)' } },
  { chiave: `${K04}/10`, rilievo: 'T1', riga: 'palazzo-di-kaneshiro r.1042-1046', atteso: { nome: 'Seme di Volontà — Caveau sotterraneo', contenuto: null }, nuovo: { contenuto: 'Seme gola blu (3 di 3, i tre semi formano il Cristallo della gola: Marakukaja)' } },
  { chiave: `${F07}/4`, rilievo: 'T1', riga: 'palazzo-di-futaba r.781', atteso: { nome: "Seme di Volontà dell'Ira (rosso)", contenuto: null }, nuovo: { contenuto: 'Seme ira rosso (1 di 3, si combina nel Cristallo dell’ira)' } },
  { chiave: `${F09}/2`, rilievo: 'T1', riga: 'palazzo-di-futaba r.1259', atteso: { nome: "Seme di Volontà dell'Ira (blu)", contenuto: null }, nuovo: { contenuto: 'Seme ira blu (3 di 3, i tre semi formano il Cristallo dell’ira: Sig. della velocità)' } },
  { chiave: 'shido-04-corridoio-mezzavia-tribordo/3', rilievo: 'T1', riga: 'palazzo-di-shido r.489', atteso: { nome: 'Seme superbia rosso', contenuto: null }, nuovo: { contenuto: 'Seme superbia rosso (1 di 3, si combina nel Cristallo della boria)' } },
  { chiave: 'shido-09-corridoio-inferiore-babordo/2', rilievo: 'T1', riga: 'palazzo-di-shido r.1045', atteso: { nome: 'Seme superbia verde', contenuto: null }, nuovo: { contenuto: 'Seme superbia verde (2 di 3, si combina nel Cristallo della boria)' } },
  { chiave: 'shido-13-ponte-laterale-parte-ii/1', rilievo: 'T1', riga: 'palazzo-di-shido r.1233', atteso: { nome: 'Seme superbia blu', contenuto: null }, nuovo: { contenuto: 'Seme superbia blu (3 di 3, i tre semi formano il Cristallo della boria: Rakukaja)' } },
];

/** I legami col catalogo che seguono le correzioni (`voce_oggetto`, prima/dopo). `nomeVoce`: il nome che la voce d'arrivo deve avere dopo inserimenti e
 *  correzioni, altrimenti il legame finirebbe su una voce che non è quella della guida. `atteso`: quantità e nota della riga che cambia oggetto. */
const LEGAMI: ReadonlyArray<{ voce: string; catalogo: string; versoVoce?: string; versoCatalogo?: string; nomeVoce: string; atteso?: { quantita: number; nota: string | null }; rilievo: string }> = [
  { voce: `${N04}/1`, catalogo: 'materiale/roccia-nera', versoVoce: `${N04}/4`, nomeVoce: 'Forziere Roccia nera', rilievo: 'P10' },
  { voce: `${N04}/1`, catalogo: 'materiale/replica-darma', versoVoce: `${N04}/5`, nomeVoce: 'Forziere Replica d’arma', rilievo: 'P10' },
  { voce: `${S01}/3`, catalogo: 'consumabile/fiala-delle-vertigini-s', versoCatalogo: 'consumabile/fiala-della-paura-s', nomeVoce: '3 Fiale della paura S', atteso: { quantita: 3, nota: null }, rilievo: 'P12' },
  { voce: `${S02}/3`, catalogo: 'altro/modello-di-pistola', versoCatalogo: 'consumabile/nirvana-fr', nomeVoce: 'Incenso Nirvana FR', atteso: { quantita: 1, nota: 'Nirvana ST nella versione Royal' }, rilievo: 'P12' },
];

const EVENTO_152 = { id: 152, data: '01-09', titoloAtteso: 'Scontro finale con il dottor Maruki nel suo Palazzo', titoloNuovo: 'Confronto con il dottor Maruki nel suo Palazzo' };

/** Ciò che resta com'è, con il motivo (fonte nella guida o nel catalogo mancante, o rilievo smentito da N). */
const NON_FATTI: ReadonlyArray<{ voce: string; rilievo: string; motivo: string }> = [
  { voce: 'shido-04-corridoio-mezzavia-tribordo/7', rilievo: 'P11', motivo: '«Soul Food»: nessuna resa italiana documentata per questo forziere; la guida non lo elenca e `consumabile/pane-per-lanima` non ha il nome inglese fra gli alias' },
  { voce: 'shido-05-ponte-piscina/2', rilievo: 'P11', motivo: '«Life Jacket»: nessuna resa italiana documentata (il catalogo ha `altro/gilet-della-vita`, ma nessuna fonte dice che sia lo stesso oggetto)' },
  { voce: 'shido-06-corridoio-superiore-tribordo/6', rilievo: 'P11', motivo: '«Parapsy Ring»: né la guida né il catalogo hanno una resa italiana' },
  { voce: 'shido-07-ponte-di-poppa/3', rilievo: 'P11', motivo: '«Classified Armor»: né la guida né il catalogo hanno una resa italiana' },
  { voce: 'okumura-08-fabbrica-centrale/1', rilievo: 'T1', motivo: 'la voce è una porta chiusa, la guida non dice che cosa c’è oltre: nessun contenuto da riportare' },
  { voce: 'maruki-04-corridoio/3', rilievo: 'T1', motivo: 'la «Staff Room» è una porta chiusa: la guida (r.355, r.447) non indica un contenuto' },
  { voce: 'shido-04-corridoio-mezzavia-tribordo/6', rilievo: 'P12', motivo: 'Magatama infernale x3: smentito da N, la guida (r.529) la mette dove l’ha l’app' },
  { voce: 'maruki-07-sala-di-controllo/7', rilievo: 'P13', motivo: 'Pane per l’anima x2: smentito da N, la guida (r.882) lo mette in Sala di controllo' },
];

interface RigaVoce { area_chiave: string; ordine: number; tipo: string; nome: string; descrizione: string; dettagli_json: string; fonte: string; carattere: string | null }

type Dettagli = Record<string, unknown>;

/** I dettagli della voce, o null se il testo non è un oggetto JSON: una riga così non si riscrive (si perderebbe ciò che contiene). */
const leggiDettagli = (json: string): Dettagli | null => {
  try {
    const v: unknown = JSON.parse(json);
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? v as Dettagli : null;
  } catch { return null; }
};

/** Il `dettagli_json` e la `fonte` dopo la correzione, senza toccare gli altri campi dei dettagli. */
function dopoLaCorrezione(riga: RigaVoce, attuali: Dettagli, n: Correzione['nuovo']): { dettagli: Dettagli; fonte: string } {
  const dettagli = { ...attuali, ...(n.contenuto !== undefined ? { contenuto: n.contenuto } : {}), ...(n.notaStorica !== undefined ? { nota_storica: n.notaStorica } : {}) };
  const fonte = n.fonte ?? (n.fonteInPiu && !riga.fonte.includes(n.fonteInPiu) ? `${riga.fonte} ; ${n.fonteInPiu}` : riga.fonte);
  return { dettagli, fonte };
}

/** Vero se la riga ha già tutti i valori nuovi. */
function giaCorretta(riga: RigaVoce, attuali: Dettagli, n: Correzione['nuovo']): boolean {
  const { dettagli, fonte } = dopoLaCorrezione(riga, attuali, n);
  return (n.nome === undefined || riga.nome === n.nome) && (n.tipo === undefined || riga.tipo === n.tipo) && (n.area === undefined || riga.area_chiave === n.area)
    && (n.ordine === undefined || riga.ordine === n.ordine) && (n.descrizione === undefined || riga.descrizione === n.descrizione)
    && (n.carattere === undefined || riga.carattere === n.carattere) && fonte === riga.fonte
    && JSON.stringify(dettagli) === JSON.stringify(attuali);
}

/** Il motivo per cui la riga non è quella attesa, o null. */
function rigaInattesa(riga: RigaVoce, attuali: Dettagli, a: Correzione['atteso']): string | null {
  if (riga.nome !== a.nome) return `il nome è «${riga.nome}»`;
  if (a.tipo !== undefined && riga.tipo !== a.tipo) return `il tipo è «${riga.tipo}»`;
  if (a.area !== undefined && riga.area_chiave !== a.area) return `l’Infiltrazione è «${riga.area_chiave}»`;
  const contenuto = attuali.contenuto ?? null;
  if (a.contenuto !== undefined && contenuto !== a.contenuto) return `il contenuto è «${String(contenuto)}»`;
  if (a.carattere !== undefined && riga.carattere !== a.carattere) return `il carattere è «${String(riga.carattere)}»`;
  if (a.descrizione !== undefined && riga.descrizione !== a.descrizione) return 'la descrizione è cambiata';
  return null;
}

function correggiVoci(db: AppDatabase): { corrette: unknown[]; scartate: unknown[] } {
  const leggi = db.prepare('SELECT area_chiave, ordine, tipo, nome, descrizione, dettagli_json, fonte, carattere FROM main.punto_interesse WHERE chiave = ?');
  const ordineOccupato = db.prepare('SELECT 1 FROM main.punto_interesse WHERE area_chiave = ? AND ordine = ? AND chiave <> ?');
  const nomeDi = db.prepare('SELECT nome FROM main.punto_interesse WHERE chiave = ?').pluck();
  const scrivi = db.prepare('UPDATE main.punto_interesse SET area_chiave = @area, ordine = @ordine, tipo = @tipo, nome = @nome, descrizione = @descrizione, dettagli_json = @dettagli, fonte = @fonte, carattere = @carattere WHERE chiave = @chiave');
  const corrette: unknown[] = [];
  const scartate: unknown[] = [];
  for (const c of CORREZIONI) {
    const riga = leggi.get(c.chiave) as RigaVoce | undefined;
    if (!riga) { scartate.push({ voce: c.chiave, rilievo: c.rilievo, motivo: 'la voce non c’è' }); continue; }
    const attuali = leggiDettagli(riga.dettagli_json);
    if (!attuali) { scartate.push({ voce: c.chiave, rilievo: c.rilievo, motivo: 'dettagli_json illeggibile' }); continue; }
    if (giaCorretta(riga, attuali, c.nuovo)) continue;
    const inattesa = rigaInattesa(riga, attuali, c.atteso);
    if (inattesa) { scartate.push({ voce: c.chiave, rilievo: c.rilievo, motivo: `non è il dato atteso: ${inattesa}` }); continue; }
    // le voci nuove si inseriscono prima: se una manca, il suo oggetto resta nel testo di questa voce
    const assente = c.richiede?.find((r) => nomeDi.get(r.chiave) !== r.nome);
    if (assente) { scartate.push({ voce: c.chiave, rilievo: c.rilievo, motivo: `manca la voce «${assente.nome}» (${assente.chiave}) che deve portare l’oggetto tolto` }); continue; }
    const area = c.nuovo.area ?? riga.area_chiave;
    const ordine = c.nuovo.ordine ?? riga.ordine;
    if (ordineOccupato.get(area, ordine, c.chiave)) { scartate.push({ voce: c.chiave, rilievo: c.rilievo, motivo: `l’ordine ${ordine} di ${area} è occupato` }); continue; }
    const { dettagli, fonte } = dopoLaCorrezione(riga, attuali, c.nuovo);
    if (scrivi.run({ chiave: c.chiave, area, ordine, tipo: c.nuovo.tipo ?? riga.tipo, nome: c.nuovo.nome ?? riga.nome, descrizione: c.nuovo.descrizione ?? riga.descrizione, dettagli: JSON.stringify(dettagli), fonte, carattere: c.nuovo.carattere ?? riga.carattere }).changes !== 1) errore(`la voce ${c.chiave} non si aggiorna`);
    corrette.push({ voce: c.chiave, rilievo: c.rilievo, riga: c.riga, prima: riga, dopo: c.nuovo });
  }
  return { corrette, scartate };
}

function inserisciVoci(db: AppDatabase): { inserite: unknown[]; scartate: unknown[] } {
  const areaEsiste = db.prepare('SELECT 1 FROM main.dungeon_area WHERE chiave = ?');
  const chiaveEsiste = db.prepare('SELECT nome FROM main.punto_interesse WHERE chiave = ?').pluck();
  const ordineOccupato = db.prepare('SELECT chiave FROM main.punto_interesse WHERE area_chiave = ? AND ordine = ?').pluck();
  const nomeEsiste = db.prepare('SELECT chiave FROM main.punto_interesse WHERE area_chiave = ? AND nome = ? AND chiave <> ?').pluck();
  const inserisci = db.prepare('INSERT INTO main.punto_interesse (chiave, area_chiave, ordine, tipo, nome, descrizione, esauribile, dettagli_json, fonte) VALUES (@chiave, @area, @ordine, @tipo, @nome, @descrizione, 1, @dettagli, @fonte)');
  const inserite: unknown[] = [];
  const scartate: unknown[] = [];
  for (const v of VOCI_NUOVE) {
    const chiave = `${v.area}/${v.ordine}`;
    const presente = chiaveEsiste.get(chiave) as string | undefined;
    if (presente === v.nome) continue;
    if (presente !== undefined) { scartate.push({ voce: chiave, rilievo: v.rilievo, motivo: `la chiave è occupata da «${presente}»` }); continue; }
    if (!areaEsiste.get(v.area)) { scartate.push({ voce: chiave, rilievo: v.rilievo, motivo: 'l’Infiltrazione non c’è' }); continue; }
    const occupante = ordineOccupato.get(v.area, v.ordine) as string | undefined;
    if (occupante) { scartate.push({ voce: chiave, rilievo: v.rilievo, motivo: `l’ordine è occupato da ${occupante}` }); continue; }
    const omonima = nomeEsiste.get(v.area, v.nome, chiave) as string | undefined;
    if (omonima) { scartate.push({ voce: chiave, rilievo: v.rilievo, motivo: `l’Infiltrazione ha già «${v.nome}» (${omonima})` }); continue; }
    inserisci.run({ chiave, area: v.area, ordine: v.ordine, tipo: v.tipo, nome: v.nome, descrizione: v.descrizione, dettagli: JSON.stringify(v.dettagli), fonte: FONTE(v.pagina) });
    inserite.push({ voce: chiave, rilievo: v.rilievo, riga: `${v.pagina} ${v.riga}`, nome: v.nome });
  }
  return { inserite, scartate };
}

function aggiornaLegami(db: AppDatabase): { aggiornati: unknown[]; scartati: unknown[] } {
  const riga = db.prepare('SELECT quantita, nota FROM main.voce_oggetto WHERE voce_chiave = ? AND catalogo_chiave = ?');
  const nomeVoce = db.prepare('SELECT nome FROM main.punto_interesse WHERE chiave = ?').pluck();
  const catalogoEsiste = db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?');
  const spostaVoce = db.prepare('UPDATE main.voce_oggetto SET voce_chiave = ? WHERE voce_chiave = ? AND catalogo_chiave = ?');
  const spostaCatalogo = db.prepare('UPDATE main.voce_oggetto SET catalogo_chiave = ?, nota = NULL WHERE voce_chiave = ? AND catalogo_chiave = ?');
  const aggiornati: unknown[] = [];
  const scartati: unknown[] = [];
  for (const l of LEGAMI) {
    const voceDopo = l.versoVoce ?? l.voce;
    const catalogoDopo = l.versoCatalogo ?? l.catalogo;
    const partenza = riga.get(l.voce, l.catalogo) as { quantita: number; nota: string | null } | undefined;
    if (riga.get(voceDopo, catalogoDopo)) {
      if (partenza) scartati.push({ ...l, motivo: 'il legame d’arrivo c’è già accanto a quello di partenza' });
      continue;
    }
    if (!partenza) { scartati.push({ ...l, motivo: 'il legame di partenza non c’è' }); continue; }
    // dopo inserimenti e correzioni: un nome diverso vuol dire che la voce non è stata scritta da qui e non è quella della guida
    const nome = nomeVoce.get(voceDopo) as string | undefined;
    if (nome !== l.nomeVoce) { scartati.push({ ...l, motivo: nome === undefined ? 'la voce d’arrivo non c’è' : `la voce d’arrivo non è quella attesa: si chiama «${nome}»` }); continue; }
    if (!catalogoEsiste.get(catalogoDopo)) { scartati.push({ ...l, motivo: 'la riga di catalogo d’arrivo non c’è' }); continue; }
    if (l.atteso && (partenza.quantita !== l.atteso.quantita || partenza.nota !== l.atteso.nota)) {
      scartati.push({ ...l, motivo: `quantità o nota diverse da quelle attese: ${partenza.quantita}, ${JSON.stringify(partenza.nota)}` });
      continue;
    }
    if (l.versoVoce) spostaVoce.run(l.versoVoce, l.voce, l.catalogo);
    else spostaCatalogo.run(catalogoDopo, l.voce, l.catalogo);
    aggiornati.push({ ...l, notaTolta: l.versoVoce ? null : partenza.nota });
  }
  return { aggiornati, scartati };
}

function correggiEvento(db: AppDatabase): { corretto: boolean; scartato: string | null } {
  if (!esisteTabella(db, 'evento_calendario')) return { corretto: false, scartato: null };
  const r = db.prepare('SELECT titolo, data, seed_json FROM main.evento_calendario WHERE id = ?').get(EVENTO_152.id) as { titolo: string; data: string; seed_json: string | null } | undefined;
  if (!r) return { corretto: false, scartato: 'l’evento 152 non c’è' };
  if (r.titolo === EVENTO_152.titoloNuovo) return { corretto: false, scartato: null };
  if (r.titolo !== EVENTO_152.titoloAtteso || r.data !== EVENTO_152.data) return { corretto: false, scartato: `non è il dato atteso: «${r.titolo}» del ${r.data}` };
  // con una fotografia (`seed_json`, presa alla prima correzione dell'utente) il titolo si corregge anche lì: «Ripristina» non riporta il titolo superato e la
  // correzione vale pure se l'utente ha cambiato soltanto il dettaglio o la fonte
  let fotografia = r.seed_json;
  if (r.seed_json !== null) {
    const foto = leggiDettagli(r.seed_json);
    if (!foto || foto.titolo !== EVENTO_152.titoloAtteso) return { corretto: false, scartato: 'la fotografia seed_json è illeggibile o ha un altro titolo' };
    fotografia = JSON.stringify({ ...foto, titolo: EVENTO_152.titoloNuovo });
  }
  db.prepare('UPDATE main.evento_calendario SET titolo = ?, seed_json = ? WHERE id = ?').run(EVENTO_152.titoloNuovo, fotografia, EVENTO_152.id);
  return { corretto: true, scartato: null };
}

/** Le tabelle che la migrazione non deve toccare. */
const INTATTE = ['spillo', 'dungeon', 'dungeon_area', 'infiltrazione_area', 'mappa'] as const;

/** Impronta delle voci di Kamoshida e Madarame (intoccabili). */
function improntaValidati(db: AppDatabase): string {
  return JSON.stringify(db.prepare("SELECT p.chiave, p.area_chiave, p.ordine, p.tipo, p.nome, p.descrizione, p.dettagli_json, p.fonte, p.carattere FROM main.punto_interesse p JOIN main.dungeon_area a ON a.chiave = p.area_chiave WHERE a.dungeon_chiave IN ('kamoshida', 'madarame') ORDER BY p.chiave").all());
}

const AUDIT = 'audit-l9-04-voci-palazzi';

/** Vero se l'ultima voce del verbale ha già esattamente questi scarti. */
function scartiGiaNelVerbale(db: AppDatabase, scarti: unknown[]): boolean {
  const json = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (!json) return false;
  let voci: Array<{ scartate?: unknown }>;
  try { voci = (JSON.parse(json) as { voci?: Array<{ scartate?: unknown }> }).voci ?? []; }
  catch { return errore(`il verbale ${AUDIT} non è leggibile`); }
  return JSON.stringify(voci[voci.length - 1]?.scartate) === JSON.stringify(scarti);
}

export const migration380: Migration = {
  id: 380,
  name: 'voci_dei_palazzi_non_validati',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['punto_interesse', 'dungeon_area', 'dati_guida', 'voce_oggetto', 'catalogo_oggetto']) if (!esisteTabella(db, t)) return;

    const prima = new Map(INTATTE.filter((t) => esisteTabella(db, t)).map((t) => [t, improntaTabella(db, t)]));
    const voceTotali = db.prepare('SELECT COUNT(*) FROM main.punto_interesse').pluck();
    const totaliPrima = voceTotali.get() as number;
    const validatiPrima = improntaValidati(db);
    const legamiPinVoce = () => JSON.stringify(db.prepare('SELECT spillo_id, voce_chiave FROM main.spillo_voce ORDER BY 1, 2').all());
    const legamiPrima = legamiPinVoce();

    const { inserite, scartate: voci } = inserisciVoci(db);
    const { corrette, scartate: correzioni } = correggiVoci(db);
    const { aggiornati, scartati } = aggiornaLegami(db);
    const evento = correggiEvento(db);

    if (voceTotali.get() !== totaliPrima + inserite.length) errore('il numero delle voci non è quello atteso');
    for (const [t, impronta] of prima) if (improntaTabella(db, t) !== impronta) errore(`la tabella ${t} è cambiata`);
    if (improntaValidati(db) !== validatiPrima) errore('le voci di Kamoshida o Madarame sono cambiate');
    if (legamiPinVoce() !== legamiPrima) errore('i collegamenti fra pin e voci sono cambiati');

    const scarti = [...voci, ...correzioni, ...scartati, ...(evento.scartato ? [{ evento: EVENTO_152.id, motivo: evento.scartato }] : [])];
    const nienteScritto = inserite.length === 0 && corrette.length === 0 && aggiornati.length === 0 && !evento.corretto;
    // gli scarti vanno sempre nel verbale; una riesecuzione identica non accoda una voce uguale
    if (nienteScritto && (scarti.length === 0 || scartiGiaNelVerbale(db, scarti))) return;
    registraAudit(db, AUDIT, {
      migrazione: 'L9-04 · 380',
      inserite,
      corrette,
      legamiCatalogo: aggiornati,
      evento152: evento.corretto ? { id: EVENTO_152.id, prima: EVENTO_152.titoloAtteso, dopo: EVENTO_152.titoloNuovo, riga: 'palazzo-di-maruki r.294, r.1744' } : null,
      scartate: scarti,
      nonFatti: NON_FATTI,
    });
    logger.info({ migrazione: 'L9-04-380', inserite: inserite.length, corrette: corrette.length, legami: aggiornati.length }, 'voci dei Palazzi non validati allineate alla guida');
  },
};
