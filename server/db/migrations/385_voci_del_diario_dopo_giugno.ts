// ============================================================
// 385 — le voci e le Doti del Diario dopo il 1° giugno secondo la guida (L6-09, elenco approvato dall'utente il 10/11)
// ============================================================
//
// Applica l'elenco «L6-09 — voci del Diario e Doti dopo il 1° giugno» (blocchi A-G) con le risposte dell'utente del 10/11:
//   - voci nuove dei blocchi A, B, C, F («Sì, inseriscile»), più la quarta proposta di Sakai (G-15, confermata dalla guida: settimana 16,
//     «26 LUGLIO», «Razione militare» in cambio de «La fattorizzazione», dal 7/26 al 7/30). Delle quattro righe «da verificare»: A-16 (la guida
//     conferma la serata di fabbricazione; la Perizia la dà l'esito del turno), A-18 (gli Strumenti del cercatore sono nel listino
//     `akiba/strumenti-del-cercatore` dalla 375) e F-09 (settimana 25, «6 OTTOBRE»: «ci restituirà i 100.000 YEN che abbiamo speso»; l'acquisto
//     del 28/06 è l'offerta `chihaya-shinjuku/pietra-sacra` da 100.000 yen) entrano; A-09 resta fuori: né la settimana 17 né la pagina di Yusuke
//     nominano il film del 5 agosto, e il titolo che l'app ha in quel periodo viene da una fonte secondaria non verificata (la Gentilezza +3 resta
//     nella nota della voce A-08);
//   - G-06 «una voce per rango» per le Gemelle: le voci aggregate `85cce8fc…` (09-06) e `d26ea049…` (11-06) restano, ristrette al rango 8 e al 10
//     (stesso uid, quindi le spunte restano dove sono), e i ranghi 6, 7 e 9 hanno la loro voce subito prima (B-10, B-11, B-20). Le spunte delle
//     partite le porta la migrazione delle partite 071;
//   - D-62 e G-09: le voci dei videogiochi collegate all'attività con la lettura dell'avanzamento della guida (Punch Ouch 2/3 del 30/11,
//     Featherman Seeker 1/3 e 2/3 del 22-23/11, Power Intuition 2/3 del 12/12); per coerenza con la guida («12 DICEMBRE» 2/3, «14 DICEMBRE»
//     3/3) anche la voce del 14/12 passa da 2/3 a 3/3, e perde l'effetto `dote` che ripeteva la Dote del videogioco collegato;
//   - G-04: il rango 10 di Sae e il trofeo «Lastrico del casinò dell'invidia» al 20/11 (settimana 31, «20 NOVEMBRE»); G-05: rango atteso 7 sulla
//     voce di Ohya del 29/08; G-07: Perizia +2 come Dote dell'incontro del rango 10 di Iwai; G-08: il trofeo «Occhio di falco» passa dalla voce
//     del 05/06 (spuntata nella partita 1: le ricevute non si toccano, decisione dell'utente) alla prima partita a freccette del 04/08 (A-04);
//     G-10: i titoli dei tre libri come nella guida (per il 19/01 anche il collegamento e la lettura: la guida legge «Comprendere il cuore», la
//     voce era collegata a «La fattorizzazione»); G-11: le due voci segnaposto (06-26, 08-02) vanno nel Cestino quando le voci vere ci sono;
//     G-18: la pesca serale del 29/11 dà Perizia +1 (settimana 32, «29 NOVEMBRE»), come la pesca del 27/11;
//   - le trame degli 8 giorni «non coperti» del blocco A (solo se la trama è ancora «Non coperto dalle fonti disponibili.»).
// Le Dote per incontro dei blocchi C e F (Hifumi, Ohya, Shinya, Sojiro) sono già scritte dalla 360: qui si contano soltanto, nell'audit.
// G-01, G-02, G-03, G-12, G-13, G-14, G-16, G-17: nessuna azione (decisione dell'utente).
//
// Regole: una voce nuova ha un uid derivato da un seme (stesso su ogni copia), va in coda alla sua fascia (le tre delle Gemelle subito prima della
// voce aggregata), non si crea se il giorno manca, se la fascia ha già una voce con lo stesso testo o se un'altra voce dà già quel rango di quel
// Confidente. Gli effetti si scrivono con `convertiVoce` (registro di transizione e delle operazioni). Una voce esistente si cambia solo se è
// ancora com'era (testo, giorno, effetti) e nessuna partita la cita, salvo la voce del 05/06 di G-08 per decisione dell'utente. Nessuna voce,
// nessun effetto e nessun giorno con `giorno.ordine <= 53` si scrive (controllo a fine migrazione); Kamoshida e Madarame non si toccano; le
// Doti restano a mano: nessun effetto `dote` dove la Dote viene dalla Dote per incontro del Confidente o dall'elemento collegato. Le tabelle
// delle partite restano identiche. Verbale in `dati_guida.audit-l6-09-diario-dopo-giugno`. Nessun import da `server/services/`. Idempotente.
// ============================================================

import { randomBytes } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { registraAudit } from './archivioL1.js';
import { convertiVoce, impronta, tabellePartiteConVoce, uidDa } from './fbisOndata5.js';
import { diverseFuori, improntaPartite, righePerChiave } from './decisioniDati0111.js';
import type { EffettoVoce } from '../../../shared/effettiVoce.js';

const LOTTO = 'L6-09';
const AUDIT = 'audit-l6-09-diario-dopo-giugno';
/** L'ultimo giorno del Diario validato dall'utente: nessuna scrittura fino al suo `giorno.ordine` compreso (53 sulla copia del 7/11). */
const ULTIMO_GIORNO_VALIDATO = '06-01';
const errore = (motivo: string): never => { throw new Error(`385: ${motivo}; nessuna modifica applicata.`); };

type Fascia = 'giorno' | 'sera';
type Dote = 'coraggio' | 'conoscenza' | 'gentilezza' | 'perizia' | 'fascino';
interface Rif { tipo: string; chiave: string }
interface VoceNuova {
  id: string; data: string; fascia: Fascia; azione: string; note?: string; tipo: string; rif: Rif | null; rifTesto?: string;
  rango?: number; effetti?: EffettoVoce[];
  /** Le voci delle Gemelle vanno subito prima della voce aggregata (uid): i ranghi in ordine nella fascia. */
  prima?: string;
}

const confidente = (chiave: string): Rif => ({ tipo: 'confidente', chiave });
const sblocco = (chiave: string): EffettoVoce => ({ tipo: 'sblocco', bersaglio: 'richiesta', chiave });
const trofeo = (chiave: string): EffettoVoce => ({ tipo: 'trofeo', trofeo: chiave });
const articolo = (chiave: string): EffettoVoce => ({ tipo: 'articolo', articolo: chiave });
const libro = (chiave: string): EffettoVoce => ({ tipo: 'lettura', categoria: 'libro', chiave, almeno: null });
const film = (chiave: string, almeno: number): EffettoVoce => ({ tipo: 'lettura', categoria: 'film', chiave, almeno });
const videogioco = (chiave: string, almeno: number): EffettoVoce => ({ tipo: 'lettura', categoria: 'videogioco', chiave, almeno });
/** L'Aojiru: la Dote la dà la regola dell'offerta (una nota della variante, con la Fortuna la sua regola), senza un effetto `dote` a parte. */
const aojiru = (variante: Dote): EffettoVoce => ({ tipo: 'acquisto', articolo: 'chiosco-kiyasuku/succo-aojiru', variante, sostituisceDoti: [] });

const GEMELLE_8 = '85cce8fcb43e4ca9a05707de5a8ea993';
const GEMELLE_10 = 'd26ea0495813e93e62e5940a9912c419';
const GEMELLE_TESTO = 'Gemelle Custodi - Forza';

/** In ordine di guida dentro ogni giorno e fascia. */
const VOCI_NUOVE: readonly VoceNuova[] = [
  // ---- blocco A: gli 8 giorni «non coperti» (A-09 fuori, vedi testa) ----
  { id: 'A-01', data: '08-04', fascia: 'giorno', tipo: 'richiesta', rif: { tipo: 'richiesta', chiave: 'non-siamo-i-tuoi-schiavi' },
    azione: 'Mishima ci informa di una nuova richiesta: Non siamo i tuoi schiavi (da completare lavorando al Crossroads)', effetti: [sblocco('non-siamo-i-tuoi-schiavi')] },
  { id: 'A-02', data: '08-04', fascia: 'giorno', tipo: 'velluto', rif: null,
    azione: 'Stanza di Velluto: Crea Nuove Personae › Potenzia Persona con due Persona qualsiasi (prima esecuzione con la Forca)', effetti: [trofeo('il-successo-richiede-sacrifici')] },
  { id: 'A-03', data: '08-04', fascia: 'giorno', tipo: 'attivita', rif: { tipo: 'attivita', chiave: 'tempio-vecchio-kichijoji' },
    azione: 'Kichijoji, Tempio a sud-est: parlare con il Prete dall’aspetto gentile e meditare (tutorial)', effetti: [trofeo('momento-di-serenita')] },
  { id: 'A-04', data: '08-04', fascia: 'giorno', tipo: 'attivita', rif: { tipo: 'attivita', chiave: 'freccette' },
    azione: 'Kichijoji, Freccette e Biliardo: giocare una partita a freccette invitando i compagni (si può uscire dopo una partita)',
    effetti: [{ tipo: 'turno', attivita: 'freccette' }, trofeo('occhio-di-falco')] },
  { id: 'A-05', data: '08-04', fascia: 'sera', tipo: 'confidente', rif: confidente('chihaya'),
    azione: 'Uscire con Chihaya a Shinjuku (nessun cambio di rango)', note: '3 Punti per la visita' },
  { id: 'A-06', data: '08-05', fascia: 'giorno', tipo: 'richiesta', rif: { tipo: 'richiesta', chiave: 'chi-e-laggressore' },
    azione: 'Mishima ci informa di una nuova richiesta: Chi è l’aggressore? (aggressioni nel Centro commerciale sotterraneo)', effetti: [sblocco('chi-e-laggressore')] },
  { id: 'A-07', data: '08-05', fascia: 'giorno', tipo: 'confidente', rif: confidente('takemi'),
    azione: 'Uscire con Takemi al Parco Inokashira: Che c’è in programma oggi? (nessun cambio di rango, non serve una Persona di Arcano Morte)', note: '3 Punti' },
  { id: 'A-08', data: '08-05', fascia: 'sera', tipo: 'confidente', rif: confidente('yusuke'),
    azione: 'Uscire con Yusuke al Cinema di Shibuya: Non è un problema (nessun cambio di rango)', note: '3 Punti; Gentilezza +3 guardando il film (la guida non dice quale)' },
  { id: 'A-10', data: '08-06', fascia: 'giorno', tipo: 'richiesta', rif: { tipo: 'richiesta', chiave: 'giustizia-per-i-gatti' },
    azione: 'Mishima ci informa di una nuova richiesta: Giustizia per i gatti!', effetti: [sblocco('giustizia-per-i-gatti')] },
  { id: 'A-11', data: '08-06', fascia: 'giorno', tipo: 'lavoro', rif: { tipo: 'attivita', chiave: 'lavoro-rafflesia' },
    azione: 'Lavoro al Fioraio del Centro commerciale sotterraneo di Shibuya: comporre il bouquet del sabato (Rosa scarlatta, Gerbera dorata, Garofano)',
    note: '7.800 yen e Gentilezza +3 con il cliente estremamente felice', effetti: [{ tipo: 'turno', attivita: 'lavoro-rafflesia', esito: 'bouquet-tre-fiori' }] },
  { id: 'A-12', data: '08-07', fascia: 'giorno', tipo: 'confidente', rif: confidente('chihaya'),
    azione: 'Chihaya a Shinjuku: Lettura della buona sorte, «Voglio aumentare la mia Perizia» (5.000 yen, raddoppia i guadagni di Perizia)', effetti: [{ tipo: 'fortuna', dote: 'perizia' }] },
  { id: 'A-13', data: '08-07', fascia: 'giorno', tipo: 'acquisto', rif: { tipo: 'negozio', chiave: 'mercante-sakai' },
    azione: 'Scambio con il mercante Sakai a Kichijoji (quinta proposta, 7-13 agosto): Acqua benedetta in cambio di una Replica d’arma', effetti: [articolo('mercante-sakai/replica-darma')] },
  { id: 'A-14', data: '10-05', fascia: 'giorno', tipo: 'libro', rif: { tipo: 'libro', chiave: 'esperto-a-biliardo' },
    azione: 'A scuola, nel tempo libero: completare la lettura di Esperto a biliardo (1/1), che sblocca i tiri a effetto e il Rango tecnico', effetti: [libro('esperto-a-biliardo')] },
  { id: 'A-15', data: '10-05', fascia: 'giorno', tipo: 'palazzo', rif: { tipo: 'dungeon', chiave: 'okumura' },
    azione: 'Ritrovo: scena con Haru (sblocca il suo Attacco speciale con Morgana) e invio della lettera di sfida a Okumura' },
  { id: 'A-16', data: '10-05', fascia: 'sera', tipo: 'attivita', rif: { tipo: 'attivita', chiave: 'fabbricazione-strumenti' },
    azione: 'Fabbricare strumenti d’infiltrazione al Leblanc (Morgana non permette di uscire) o, in alternativa, giocare a un videogioco', effetti: [{ tipo: 'turno', attivita: 'fabbricazione-strumenti' }] },
  { id: 'A-17', data: '10-07', fascia: 'giorno', tipo: 'libro', rif: { tipo: 'libro', chiave: 'donna-nel-buio' },
    azione: 'Biblioteca: restituire Vestito di ceneri e prendere in prestito Donna nel buio' },
  { id: 'A-18', data: '10-07', fascia: 'giorno', tipo: 'acquisto', rif: { tipo: 'negozio', chiave: 'akiba' },
    azione: 'Akihabara, Negozio di componenti: Strumenti del cercatore (2.000 yen), che migliorano la fabbricazione degli strumenti d’infiltrazione', effetti: [articolo('akiba/strumenti-del-cercatore')] },
  { id: 'A-19', data: '10-08', fascia: 'giorno', tipo: 'richiesta', rif: { tipo: 'richiesta', chiave: 'mille-volti-e-mille-debiti' },
    azione: 'Mishima ci informa di una nuova richiesta: Mille volti e mille…debiti', effetti: [sblocco('mille-volti-e-mille-debiti')] },
  { id: 'A-20', data: '10-08', fascia: 'giorno', tipo: 'palazzo', rif: { tipo: 'dungeon', chiave: 'mementos' },
    azione: 'Memento con Futaba (solo Joker): sconfiggere l’Ombra di Isshiki e prendere la Sciabola del rischio', note: 'Completa Lo zio ingordo e riapre il rango di Sojiro',
    effetti: [{ tipo: 'richiesta', richiesta: 'lo-zio-ingordo' }] },
  { id: 'A-21', data: '10-09', fascia: 'giorno', tipo: 'acquisto', rif: { tipo: 'negozio', chiave: 'libreria-nagiuri' },
    azione: 'Libreria di Jinbocho: comprare i quattro libri sbloccati da Spadaccino provetto (Chiamami Capo, Casanova spregiudicato, Rivelazioni eroiche, Come fare karakuri; 8.000 yen ciascuno)',
    effetti: [articolo('libreria-nagiuri/chiamami-capo'), articolo('libreria-nagiuri/casanova-spregiudicato'), articolo('libreria-nagiuri/rivelazioni-eroiche'), articolo('libreria-nagiuri/come-fare-karakuri')] },

  // ---- blocco B: i passaggi di rango senza voce (B-09, B-22, B-25 sono già resi da altre voci) ----
  { id: 'B-01', data: '06-26', fascia: 'giorno', tipo: 'velluto', rif: confidente('gemelle'), rifTesto: GEMELLE_TESTO, rango: 5,
    azione: 'Stanza di Velluto: consegnare alle Gemelle Custodi un Setanta con Rakukaja (Lamia + Silky; la Lamia da Nekomata + Take-Minakata), «Controlla stato lavori forzati»', note: 'Sblocca Trattamento speciale' },
  { id: 'B-02', data: '08-02', fascia: 'giorno', tipo: 'confidente', rif: confidente('takemi'), rango: 9,
    azione: 'Uscire con Takemi al Parco Inokashira: È stata dura / E i tuoi pazienti?; poi amore («Volevo vederti», «Ti amo», «Non sto scherzando») o amicizia («L’ho fatto per gli esami», «Secondo te?»); telefonata: «Sono felice che ce l’abbiamo fatta» (amicizia) o «Anche tu» (amore)' },
  { id: 'B-03', data: '08-02', fascia: 'sera', tipo: 'confidente', rif: confidente('chihaya'), rango: 3,
    azione: 'Uscire con Chihaya a Shinjuku: Segui il cuore / Dei ladri potrebbero rapirla', note: 'Sblocca Lettura del denaro' },
  { id: 'B-04', data: '08-04', fascia: 'giorno', tipo: 'confidente', rif: confidente('ann'), rango: 8,
    azione: 'Uscire con Ann in palestra con Ryuji (dal Centro commerciale sotterraneo): Hai davvero fegato / Non ho il minimo dubbio / Ottimo consiglio / Sarà felice di sentirlo; telefonata: Puoi chiederglielo di persona', note: 'Sblocca Stoicismo' },
  { id: 'B-05', data: '08-06', fascia: 'sera', tipo: 'confidente', rif: confidente('akechi'), rango: 2,
    azione: 'Uscire con Akechi a Kichijoji (biliardo, serve una Persona di Arcano Giustizia): Sembri sempre così occupato / Colpirò con cautela / Vedo un sacco di cose; telefonata: Come rivali?', note: 'Sblocca Istinto di caccia' },
  { id: 'B-06', data: '08-07', fascia: 'giorno', tipo: 'confidente', rif: confidente('ann'), rango: 9,
    azione: 'Uscire con Ann sul tetto della scuola con Shiho: Perché volevi venire qui? / Se n’è andata, vero? / Tieni duro; poi amore «Hai me» o amicizia «Hai tutti gli altri»; con l’amore, telefonata: Sarò per sempre tuo', note: 'Sblocca Baluardo' },
  { id: 'B-07', data: '08-07', fascia: 'sera', tipo: 'confidente', rif: confidente('chihaya'), rango: 4,
    azione: 'Uscire con Chihaya a Shinjuku (su suo messaggio): Vuoi testarlo di nuovo? / Credi in te stessa / Sembra un posto tranquillo / Funzionerà; telefonata: Non ho fatto molto' },
  { id: 'B-08', data: '08-22', fascia: 'giorno', tipo: 'confidente', rif: confidente('sae'), rango: 3,
    azione: 'Leblanc, riunione dopo Medjed: scene con Sae nel presente (risposte libere)', note: 'Il rango sale da solo' },
  { id: 'B-10', data: '09-06', fascia: 'giorno', tipo: 'velluto', rif: confidente('gemelle'), rifTesto: GEMELLE_TESTO, rango: 6, prima: GEMELLE_8,
    azione: 'Stanza di Velluto: consegnare alle Gemelle Custodi un Neko Shogun con Dekaja (Fusione avanzata di un Anzu di Lv 28 con Kodama e Sudama)' },
  { id: 'B-11', data: '09-06', fascia: 'giorno', tipo: 'velluto', rif: confidente('gemelle'), rifTesto: GEMELLE_TESTO, rango: 7, prima: GEMELLE_8,
    azione: 'Stanza di Velluto: consegnare alle Gemelle Custodi un Lachesi con Tetraja (Lamia + Sandman → Principati; Principati + Sandman → Thoth; Thoth + Anzu)' },
  { id: 'B-12', data: '10-04', fascia: 'sera', tipo: 'confidente', rif: confidente('sojiro'), rango: 8,
    azione: 'Uscire con Sojiro (dopo la Lettura delle affinità su Sojiro da Chihaya): Qualcosa col curry / L’ho fatto per Futaba', note: 'Nuova richiesta: Lo zio ingordo',
    effetti: [sblocco('lo-zio-ingordo')] },
  { id: 'B-13', data: '10-06', fascia: 'sera', tipo: 'confidente', rif: confidente('morgana'), rango: 9,
    azione: 'Dopo Okumura, in camera con Morgana (risposte libere)', note: 'Sblocca Baluardo' },
  { id: 'F-09', data: '10-06', fascia: 'sera', tipo: 'confidente', rif: confidente('chihaya'),
    azione: 'Chihaya si scusa per la truffa della pietra sacra e restituisce i 100.000 yen spesi', effetti: [{ tipo: 'yen', importo: 100_000 }] },
  { id: 'B-14', data: '10-06', fascia: 'sera', tipo: 'confidente', rif: confidente('chihaya'), rango: 9,
    azione: 'Uscire con Chihaya a Shinjuku (serve una Persona di Arcano Fortuna): Ascoltate Chihaya / Il fato si può cambiare; poi amore «Per poter stare con te» (serve aver risposto «Per me sei solo Chihaya» al rango 6 e «Puoi scommetterci» al rango 8) o amicizia «Mi piace farmi leggere il futuro»; telefonata' },
  { id: 'B-15', data: '10-07', fascia: 'giorno', tipo: 'confidente', rif: confidente('makoto'), rango: 8,
    azione: 'Uscire con Makoto al Big Bang Burger con Eiko: Lo dice a tutte / Assolutamente', note: 'Sblocca Stoicismo' },
  { id: 'B-16', data: '10-07', fascia: 'sera', tipo: 'confidente', rif: confidente('mishima'), rango: 8,
    azione: 'Uscire con Mishima ad Akihabara: Non me ne vado / Credi in te stesso / Aspetta, stavi recintando?; telefonata: Ce la farai' },
  { id: 'B-17', data: '10-08', fascia: 'sera', tipo: 'confidente', rif: confidente('sojiro'), rango: 9,
    azione: 'Uscire con Sojiro (ispettori al Leblanc): È fantastico / Hai una figlia fantastica; telefonata: Sei andato benissimo', note: 'Sblocca Precetti del curry' },
  { id: 'B-18', data: '10-09', fascia: 'giorno', tipo: 'confidente', rif: confidente('makoto'), rango: 9,
    azione: 'Uscire con Makoto ad Aoyama-Itchome e Shinjuku (promoter irritato): Conosci un certo Tsukasa? / Non direi / Prenditela con me / Seguimi / Hai fatto la cosa giusta / Vengo spesso qui; poi amore («Studiamo insieme», «Sì») o amicizia («Vedrai, troverai qualcuno», «Non intendevo quello»); telefonata', note: 'Sblocca Baluardo' },
  { id: 'B-19', data: '10-09', fascia: 'sera', tipo: 'confidente', rif: confidente('chihaya'), rango: 10,
    azione: 'Uscire con Chihaya a Shinjuku: Sei cambiata / Hai il mio supporto', note: 'Sblocca Lettura speciale del legame e la fusione di Lakshmi' },
  { id: 'B-20', data: '11-06', fascia: 'giorno', tipo: 'velluto', rif: confidente('gemelle'), rifTesto: GEMELLE_TESTO, rango: 9, prima: GEMELLE_10,
    azione: 'Stanza di Velluto: consegnare alle Gemelle Custodi un Babau con Samarecarm (Fusione avanzata di Pixie, Pisaca e Hariti)' },
  { id: 'B-21', data: '11-13', fascia: 'sera', tipo: 'confidente', rif: confidente('iwai'), rango: 10,
    azione: 'Uscire con Iwai al negozio softair (Kaoru): Ora dipende da te, Iwai / Non potevo abbandonarlo / E se avessi ragione?', note: 'Sblocca Offre la casa' },
  { id: 'B-23', data: '12-11', fascia: 'giorno', tipo: 'confidente', rif: confidente('akechi'), rango: 9,
    azione: 'Palazzo di Shido: dopo il mini-boss «Lo spazzino», sequenza narrativa con Akechi' },
  { id: 'B-24', data: '12-11', fascia: 'giorno', tipo: 'confidente', rif: confidente('akechi'), rango: 10,
    azione: 'Palazzo di Shido: dopo lo scontro con Akechi (secondo round) e la lunga sequenza, Akechi al rango massimo', note: 'Sblocca la fusione di Metatron' },

  // ---- blocco C: le Doti senza fonte (le righe di Dote per incontro C-05, C-06, C-09, C-10, C-11 ci sono dalla 360) ----
  { id: 'C-01', data: '06-26', fascia: 'giorno', tipo: 'dote', rif: { tipo: 'dote', chiave: 'coraggio' },
    azione: 'Sottopasso, chiosco delle bevande: Aojiru disgustoso (5.000 yen)', note: 'Coraggio +1', effetti: [aojiru('coraggio')] },
  { id: 'C-02', data: '08-03', fascia: 'sera', tipo: 'dote', rif: { tipo: 'dote', chiave: 'conoscenza' },
    azione: 'Cruciverba (Zona di calore stazionaria: Isola)', note: 'Conoscenza +1',
    effetti: [{ tipo: 'dote', dote: 'conoscenza', note: 1 }, { tipo: 'cruciverba', data: '08-03' }] },
  { id: 'C-03', data: '08-03', fascia: 'sera', tipo: 'dvd', rif: { tipo: 'film', chiave: 'dvd-doctor-mouse' },
    azione: 'Guardare il DVD Doctor Mouse (1/2)', note: 'Gentilezza +3', effetti: [film('dvd-doctor-mouse', 1)] },
  { id: 'C-04', data: '08-07', fascia: 'giorno', tipo: 'dote', rif: { tipo: 'dote', chiave: 'perizia' },
    azione: 'Sottopasso: Aojiru Vitalità (5.000 yen)', note: 'Perizia +2 con la Lettura della buona sorte', effetti: [aojiru('perizia')] },
  { id: 'C-07', data: '10-02', fascia: 'giorno', tipo: 'dote', rif: { tipo: 'dote', chiave: 'perizia' },
    azione: 'Sottopasso: Aojiru Vitalità (5.000 yen)', note: 'Perizia +1 (+2 con la Lettura della buona sorte)', effetti: [aojiru('perizia')] },
  { id: 'C-08', data: '10-09', fascia: 'giorno', tipo: 'dote', rif: { tipo: 'dote', chiave: 'coraggio' },
    azione: 'Sottopasso: Aojiru disgustoso (5.000 yen)', note: 'Coraggio +1 (+2 con la Lettura della buona sorte)', effetti: [aojiru('coraggio')] },
  { id: 'C-12', data: '10-30', fascia: 'giorno', tipo: 'dote', rif: { tipo: 'dote', chiave: 'conoscenza' },
    azione: 'Sottopasso: Aojiru alle alghe (5.000 yen)', note: 'Conoscenza +1 (+2 con la Lettura della buona sorte)', effetti: [aojiru('conoscenza')] },
  { id: 'C-13', data: '01-29', fascia: 'giorno', tipo: 'dote', rif: { tipo: 'dote', chiave: 'perizia' },
    azione: 'Sottopasso: Aojiru Vitalità (5.000 yen)', note: 'Perizia +1', effetti: [aojiru('perizia')] },

  // ---- blocco F: voci emerse dai controlli sistematici (F-09 sta col rango 9 di Chihaya, sopra) ----
  { id: 'F-01', data: '06-25', fascia: 'sera', tipo: 'attivita', rif: { tipo: 'attivita', chiave: 'fabbricazione-strumenti' },
    azione: 'Tavolo da lavoro: fabbricare 8 Grimaldelli superando le aspettative di Morgana (almeno uno in più)', note: 'Perizia +3',
    // la guida (settimana 11, «25 GIUGNO»): 8 creazioni, con il bonus Perizia +3 (come la voce del 25/07 della 290)
    effetti: [{ tipo: 'turno', attivita: 'fabbricazione-strumenti', esito: 'grimaldello-bonus', quantita: 8 }] },
  { id: 'F-02', data: '06-26', fascia: 'sera', tipo: 'libro', rif: { tipo: 'libro', chiave: 'esplorando-yoncha-4' },
    azione: 'Leggere Esplorando Yoncha 4 (1/1, si completa da solo)', effetti: [libro('esplorando-yoncha-4')] },
  { id: 'F-03', data: '06-26', fascia: 'sera', tipo: 'libro', rif: { tipo: 'libro', chiave: 'anima-da-cineasta' },
    azione: 'Leggere Anima da cineasta (1/1): migliora i guadagni di film e DVD', effetti: [libro('anima-da-cineasta')] },
  { id: 'F-04', data: '06-26', fascia: 'giorno', tipo: 'acquisto', rif: { tipo: 'negozio', chiave: 'mercante-sakai' },
    azione: 'Scambio con il mercante Sakai a Kichijoji (seconda proposta, 26 giugno - 2 luglio): Panino con yakisoba in cambio di una Veste nera', effetti: [articolo('mercante-sakai/veste-nera')] },
  { id: 'F-05', data: '08-01', fascia: 'sera', tipo: 'dvd', rif: { tipo: 'film', chiave: 'dvd-prison-escape' },
    azione: 'Finire il DVD Prison Escape (2/2)', note: 'Perizia +3', effetti: [film('dvd-prison-escape', 2)] },
  { id: 'F-06', data: '09-19', fascia: 'giorno', tipo: 'acquisto', rif: { tipo: 'negozio', chiave: 'mercante-sakai' },
    azione: 'Scambio con il mercante Sakai a Kichijoji (ottava proposta, 19-24 settembre): Maschera del ladro in cambio di 2 Ofuda della magia', effetti: [articolo('mercante-sakai/ofuda-della-magia')] },
  { id: 'F-07', data: '10-02', fascia: 'giorno', tipo: 'acquisto', rif: { tipo: 'negozio', chiave: 'mercante-sakai' },
    azione: 'Scambio con il mercante Sakai a Kichijoji (nona proposta, 2-8 ottobre): Cartolina in cambio di 2 Daifuku alla fragola', effetti: [articolo('mercante-sakai/daifuku-alla-fragola')] },
  { id: 'F-08', data: '10-06', fascia: 'giorno', tipo: 'libro', rif: { tipo: 'libro', chiave: 'vestito-di-ceneri' },
    azione: 'In metropolitana: completare la lettura di Vestito di ceneri (2/2)', note: 'Fascino +3', effetti: [libro('vestito-di-ceneri')] },

  // ---- G-15: la quarta proposta di Sakai ----
  { id: 'G-15', data: '07-26', fascia: 'giorno', tipo: 'acquisto', rif: { tipo: 'negozio', chiave: 'mercante-sakai' },
    azione: 'Scambio con il mercante Sakai a Kichijoji (quarta proposta, 26-30 luglio): Razione militare in cambio del libro La fattorizzazione', effetti: [articolo('mercante-sakai/la-fattorizzazione')] },
];

/** Le trame degli 8 giorni del blocco A (A-T1…A-T8): si scrivono solo al posto della frase «non coperto». */
const TRAMA_NON_COPERTO = 'Non coperto dalle fonti disponibili.';
const TRAME: ReadonlyArray<{ id: string; data: string; trama: string }> = [
  { id: 'A-T1', data: '08-04', trama: 'Messaggi dei Confidenti; nuova richiesta di Mishima; domanda in TV; trofei di Forca, Tempio e Freccette; Ann sale al rango 8.' },
  { id: 'A-T2', data: '08-05', trama: 'Nuova richiesta di Mishima; uscite con Takemi e con Yusuke al cinema.' },
  { id: 'A-T3', data: '08-06', trama: 'Nuova richiesta di Mishima; lavoro al Fioraio; Akechi sale al rango 2.' },
  { id: 'A-T4', data: '08-07', trama: 'Televendite, Aojiru e scambio con Sakai; Ann al rango 9 e Chihaya al rango 4.' },
  { id: 'A-T5', data: '10-05', trama: 'Giornata di preparazione: libro, lettera di sfida a Okumura, strumenti d’infiltrazione.' },
  { id: 'A-T6', data: '10-07', trama: 'Palazzo di Okumura concluso: Makoto al rango 8 e Mishima al rango 8.' },
  { id: 'A-T7', data: '10-08', trama: 'Nuova richiesta di Mishima; Ombra di Isshiki nei Memento con Futaba; Sojiro al rango 9.' },
  { id: 'A-T8', data: '10-09', trama: 'Libri a Jinbocho e Aojiru; Makoto al rango 9 e Chihaya al rango massimo.' },
];

/** Una voce esistente che cambia testo, rango o posto: `atteso` è com'è oggi (sulla copia del 7/11 portata a main), `nuovo` com'è dopo. */
interface CambioVoce {
  id: string; uid: string;
  atteso: { data: string; fascia: Fascia; azione: string; note: string | null; rango: number | null };
  nuovo: { azione?: string; note?: string | null; rango?: number | null; data?: string; fascia?: Fascia };
  /** Il cambio vale solo se la voce non porta più questo trofeo (la nota che lo cita esce con lui). */
  seNonHaIlTrofeo?: string;
  /** Il cambio vale anche se una partita ha spuntato la voce (decisione dell'utente su QUESTA voce): l'uid resta, quindi resta la spunta;
   *  le ricevute delle partite non si toccano. */
  ancheSpuntata?: string;
}
const DECISIONE_G06 = 'risposta dell\'utente del 10/11 su G-06: «una voce per rango», dividendo le voci aggregate e conservando le spunte';
const DECISIONE_G04 = 'risposta dell\'utente del 10/11 su G-04: Sae 10 e il trofeo «Lastrico del casinò dell\'invidia» al 20/11';

const CAMBI: readonly CambioVoce[] = [
  // G-06: le voci aggregate delle Gemelle tengono il rango più alto (8 e 10), con il passaggio della guida per quel rango
  { id: 'G-06/B-10-B-11', uid: GEMELLE_8,
    atteso: { data: '09-06', fascia: 'giorno', azione: 'Stanza di Velluto: fusioni con le Gemelle (Anzu, Kodama, Sudama, Lilim) fino al rango 8 (Forza)', note: 'Sblocca l\'Amplificatore Ghigliottina', rango: 8 },
    nuovo: { azione: 'Stanza di Velluto: consegnare alle Gemelle Custodi un Hecatoncheires con Masukunda (Lilim di Lv 34, da Thoth + Jikokuten o Thoth + Orthrus, fusa con un Anzu)' }, ancheSpuntata: DECISIONE_G06 },
  { id: 'G-06/B-20', uid: GEMELLE_10,
    atteso: { data: '11-06', fascia: 'giorno', azione: 'Stanza di Velluto: Gemelle Custodi fino al rango massimo', note: 'Sblocca la fusione di Zaou-Gongen', rango: 10 },
    nuovo: { azione: 'Stanza di Velluto: consegnare alle Gemelle Custodi un Seth con Rimonta (Fusione avanzata di Anubis, Iside, Thoth e Horus, poi la carta abilità Rimonta)',
      note: 'Sblocca Trattamento esclusivo e la fusione di Zaou-Gongen' }, ancheSpuntata: DECISIONE_G06 },
  // G-05: la visita a Ohya del 29/08 è il passaggio al rango 7
  { id: 'G-05', uid: '1c0f710e38e9c0782d672c803004dc4e',
    atteso: { data: '08-29', fascia: 'sera', azione: 'Visita a Ohya al Crossroads: Hai detto...? - si scopre il nome del capo, Shinpei Honjo', note: 'Nuova richiesta: Lottare per la libertà di stampa', rango: null },
    nuovo: { rango: 7 } },
  // G-04: Sae sale al rango 10 il 20/11 (settimana 31, «20 NOVEMBRE»)
  { id: 'G-04/Sae', uid: 'e7cbf612421baa9c4bb1579927b0e9b6',
    atteso: { data: '11-19', fascia: 'sera', note: 'IMPORTANTE: queste risposte determinano l\'accesso alla True Ending e quindi al terzo semestre; scegliere sempre l\'opzione che rifiuta di tradire i compagni e persegue la vera giustizia', rango: 10,
      azione: 'Interrogatorio con Sae: scelte cruciali per la True Ending (Mai sentiti nominare / Non c\'erano persone simili / Impossibile / Non so niente / Va contro la giustizia / La chiami giustizia questa? / Salvare gli innocenti / E il vero colpevole? / Non vuoi vincere? / Darglielo? / Voglio fare un accordo / Il telefono... / Te l\'ho già detto / Devi fidarti...)' },
    nuovo: { data: '11-20', fascia: 'giorno' }, ancheSpuntata: DECISIONE_G04 },
  { id: 'G-04/trofeo-nota', uid: '589d82e823703ee879d72f974fd51139',
    atteso: { data: '11-19', fascia: 'giorno', azione: 'Palazzo di Sae Niijima: battaglia contro l\'Ombra di Sae (fase della roulette truccata), poi Sae Leviathan (a ogni turno la roulette assegna un elemento: attacca con quello opposto)', note: 'Trofeo: Lastrico del Casinò dell\'Invidia', rango: null },
    nuovo: { note: null }, seNonHaIlTrofeo: 'lastrico-del-casino-dell-invidia', ancheSpuntata: DECISIONE_G04 },
  // G-09: l'avanzamento dei videogiochi come nella guida (gli effetti più sotto)
  { id: 'G-09/22-11', uid: '66b80cfb13c42a296eb71a7821aa2bef',
    atteso: { data: '11-22', fascia: 'sera', azione: 'Attività opzionale: fabbricare grimaldelli con Kawakami, giocare a Featherman Seeker (2/3), oppure allenarsi', note: null, rango: null },
    nuovo: { azione: 'Attività opzionale: fabbricare grimaldelli con Kawakami, giocare a Featherman Seeker (1/3), oppure allenarsi', note: 'Conoscenza +2 e Grimaldello x12 con Featherman Seeker' } },
  { id: 'G-09/23-11', uid: '4f9a2062073e94761d9c50416cb55743',
    atteso: { data: '11-23', fascia: 'sera', azione: 'Stesse opzioni del 22 novembre', note: null, rango: null },
    nuovo: { azione: 'Stesse opzioni del 22 novembre: fabbricare grimaldelli con Kawakami, continuare Featherman Seeker (2/3), oppure allenarsi', note: 'Conoscenza +2 e Grimaldello x12 con Featherman Seeker' } },
  { id: 'G-09/12-12', uid: 'aff05c4efde8479df2888062cd40368c',
    atteso: { data: '12-12', fascia: 'sera', azione: 'Minigioco Power Intuition (1/3)', note: null, rango: null },
    nuovo: { azione: 'Minigioco Power Intuition (2/3): la mossa dell’ultima volta più una nuova', note: 'Coraggio +2' } },
  { id: 'G-09/14-12', uid: '34fdfebbd7848e5f8d671c6c70e6a45d',
    atteso: { data: '12-14', fascia: 'sera', azione: 'Minigioco Power Intuition (2/3)', note: 'Coraggio +2', rango: null },
    nuovo: { azione: 'Completare il minigioco Power Intuition (3/3)' } },
  // G-18: la pesca serale del 29/11
  { id: 'G-18', uid: '658d1ba1e6c561606d34872f7df9cad6',
    atteso: { data: '11-29', fascia: 'sera', azione: 'Pesca serale a Ichigaya (1.000 yen, tariffa serale) per pesci medi, oppure Jazz Club con Ryuji/Yusuke (drink Spritz +1)', note: null, rango: null },
    nuovo: { note: 'Perizia +1 con la pesca' } },
  // G-10: i titoli dei libri come nella guida
  { id: 'G-10/12-10', uid: 'd41c684cc236d131800bc548cc7783af',
    atteso: { data: '10-12', fascia: 'sera', azione: 'Leggere La dolce cucina cinese (completato): sblocca Chinatown', note: null, rango: null },
    nuovo: { azione: 'Leggere Dolci cinesi (completato): sblocca Chinatown' } },
  { id: 'G-10/29-10', uid: 'b4cfcf38279c1af0800b9da5b89fe4e3',
    atteso: { data: '10-29', fascia: 'sera', azione: 'Leggere Donna nell\'ombra', note: 'Perizia +3', rango: null },
    nuovo: { azione: 'Completare la lettura di Donna nel buio (2/2)' } },
  { id: 'G-10/19-01', uid: '670b4120526f0bca185ef1fb5669d270',
    atteso: { data: '01-19', fascia: 'giorno', azione: 'Completare la lettura de La fattorizzazione in treno: sblocca nuove combinazioni di attacco tecnico', note: null, rango: null },
    nuovo: { azione: 'Completare la lettura di Comprendere il cuore in treno: sblocca nuove combinazioni di attacco tecnico' } },
];

/** Gli effetti che cambiano su voci esistenti (prima dei cambi di testo: `convertiVoce` legge il testo di oggi). */
interface EffettiVoce {
  id: string; uid: string; data: string; azione: string;
  attesi: Array<{ uid: string; effetto: EffettoVoce; togli?: true }>;
  aggiungi?: EffettoVoce[]; modifica?: Array<{ uid: string; effetto: EffettoVoce }>;
  collega?: { tipoPrima: string; riferimentoPrima: Rif | null; tipo: string; riferimento: Rif };
  ancheSpuntata?: string;
}

const EFFETTI: readonly EffettiVoce[] = [
  // D-62
  { id: 'D-62', uid: '1d92511155a456f7baafac692bbc7125', data: '11-30',
    azione: 'Minigioco Punch Ouch in sala giochi (Fascino +2 per colpo riuscito, progresso 2/3) oppure due sessioni di allenamento in palestra per grandi guadagni di HP/SP',
    attesi: [], aggiungi: [videogioco('videogioco-punch-ouch', 2)],
    collega: { tipoPrima: 'attivita', riferimentoPrima: null, tipo: 'attivita', riferimento: { tipo: 'attivita', chiave: 'videogioco-punch-ouch' } } },
  // G-09
  { id: 'G-09/22-11', uid: '66b80cfb13c42a296eb71a7821aa2bef', data: '11-22',
    azione: 'Attività opzionale: fabbricare grimaldelli con Kawakami, giocare a Featherman Seeker (2/3), oppure allenarsi',
    attesi: [], aggiungi: [videogioco('videogioco-featherman-seeker', 1)],
    collega: { tipoPrima: 'dote', riferimentoPrima: null, tipo: 'attivita', riferimento: { tipo: 'attivita', chiave: 'videogioco-featherman-seeker' } } },
  { id: 'G-09/23-11', uid: '4f9a2062073e94761d9c50416cb55743', data: '11-23', azione: 'Stesse opzioni del 22 novembre',
    attesi: [], aggiungi: [videogioco('videogioco-featherman-seeker', 2)],
    collega: { tipoPrima: 'dote', riferimentoPrima: null, tipo: 'attivita', riferimento: { tipo: 'attivita', chiave: 'videogioco-featherman-seeker' } } },
  { id: 'G-09/12-12', uid: 'aff05c4efde8479df2888062cd40368c', data: '12-12', azione: 'Minigioco Power Intuition (1/3)',
    attesi: [], aggiungi: [videogioco('videogioco-power-intuition', 2)],
    collega: { tipoPrima: 'attivita', riferimentoPrima: null, tipo: 'attivita', riferimento: { tipo: 'attivita', chiave: 'videogioco-power-intuition' } } },
  { id: 'G-09/14-12', uid: '34fdfebbd7848e5f8d671c6c70e6a45d', data: '12-14', azione: 'Minigioco Power Intuition (2/3)',
    // la Dote del videogioco la dà l'attività collegata (Coraggio ♪♪ per sessione), come per le altre sessioni dei videogiochi: l'effetto `dote`
    // ripetuto sulla voce la contava due volte e si toglie
    attesi: [{ uid: '76153500a7586855743f2402092cfc44', effetto: { tipo: 'dote', dote: 'coraggio', note: 2 }, togli: true }, { uid: 'e0ff8c44abfa47ce42152381114a86db', effetto: videogioco('videogioco-power-intuition', 2) }],
    modifica: [{ uid: 'e0ff8c44abfa47ce42152381114a86db', effetto: videogioco('videogioco-power-intuition', 3) }] },
  // G-18
  { id: 'G-18', uid: '658d1ba1e6c561606d34872f7df9cad6', data: '11-29',
    azione: 'Pesca serale a Ichigaya (1.000 yen, tariffa serale) per pesci medi, oppure Jazz Club con Ryuji/Yusuke (drink Spritz +1)',
    attesi: [], aggiungi: [{ tipo: 'dote', dote: 'perizia', note: 1 }],
    collega: { tipoPrima: 'attivita', riferimentoPrima: null, tipo: 'attivita', riferimento: { tipo: 'attivita', chiave: 'pesca-ichigaya' } } },
  // G-08: il trofeo lascia la voce del 05/06 (la nuova voce A-04 del 04/08 lo porta)
  { id: 'G-08', uid: '010c2a0fb7b8ae58b6ac05bbb7ed4e64', data: '06-05', azione: 'Kichijoji. Raggiungi la sala "Freccette & Biliardo".',
    attesi: [{ uid: 'b65e492ed4eb2026717eee21c5ae74b1', effetto: { tipo: 'turno', attivita: 'freccette' } }, { uid: '5475813d9d7ba44e947654193870aff5', effetto: trofeo('occhio-di-falco'), togli: true }],
    ancheSpuntata: 'risposta dell\'utente del 10/11 su G-08: il trofeo «Occhio di falco» alla voce del 4/8 della prima partita a freccette' },
  // G-04: il trofeo passa dalla battaglia del 19/11 all'inizio del 20/11
  { id: 'G-04/trofeo-via', uid: '589d82e823703ee879d72f974fd51139', data: '11-19',
    azione: 'Palazzo di Sae Niijima: battaglia contro l\'Ombra di Sae (fase della roulette truccata), poi Sae Leviathan (a ogni turno la roulette assegna un elemento: attacca con quello opposto)',
    attesi: [{ uid: '7c2edde797ee14d59ed478203f0778a8', effetto: trofeo('lastrico-del-casino-dell-invidia'), togli: true }], ancheSpuntata: DECISIONE_G04 },
  { id: 'G-04/trofeo-qui', uid: '7e3a008d1230fb8106094cb8d3d374bb', data: '11-20', azione: 'Seguire la sequenza narrativa dell\'interrogatorio e delle rivelazioni',
    attesi: [], aggiungi: [trofeo('lastrico-del-casino-dell-invidia')], ancheSpuntata: DECISIONE_G04 },
  // G-10: il 19/01 si legge «Comprendere il cuore»
  { id: 'G-10/19-01', uid: '670b4120526f0bca185ef1fb5669d270', data: '01-19',
    azione: 'Completare la lettura de La fattorizzazione in treno: sblocca nuove combinazioni di attacco tecnico',
    attesi: [{ uid: '3dd6e0eba545be729ba9738b32fa815e', effetto: libro('la-fattorizzazione'), togli: true }], aggiungi: [libro('comprendere-il-cuore')],
    collega: { tipoPrima: 'libro', riferimentoPrima: { tipo: 'libro', chiave: 'la-fattorizzazione' }, tipo: 'libro', riferimento: { tipo: 'libro', chiave: 'comprendere-il-cuore' } } },
];

/** G-11: le voci segnaposto, nel Cestino solo quando le voci vere della guida per quel giorno ci sono (`sostitute`, id delle voci nuove). */
const SEGNAPOSTO: ReadonlyArray<{ id: string; uid: string; data: string; fascia: Fascia; azione: string; sostitute: readonly string[] }> = [
  { id: 'G-11/06-26', uid: '80914911', data: '06-26', fascia: 'giorno', azione: 'Giornata libera: proseguire il Palazzo di Kaneshiro o allenare Doti/Confidenti secondo necessità', sostitute: ['B-01', 'C-01', 'F-02', 'F-03', 'F-04'] },
  { id: 'G-11/08-02', uid: 'b52d71c4', data: '08-02', fascia: 'giorno', azione: 'Nessuna azione specifica riportata dalla fonte per questa data', sostitute: ['B-02', 'B-03'] },
];

/** G-07: la Dote dell'incontro del rango 10 di Iwai (settimana 30, «13 NOVEMBRE»: «Perizia +2»). */
const IWAI_10 = { confidente: 'iwai', rango: 10, dote: 'perizia', note: 2 } as const;
/** Le Dote per incontro dei blocchi C e F, già scritte dalla 360: solo il controllo nell'audit. */
const DOTI_GIA_SCRITTE: ReadonlyArray<readonly [string, string, number, string, number]> = [
  ['C-05', 'hifumi', 3, 'conoscenza', 1], ['C-06', 'ohya', 8, 'fascino', 3], ['C-09', 'shinya', 8, 'gentilezza', 3], ['C-10', 'shinya', 9, 'gentilezza', 3],
  ['C-11', 'hifumi', 8, 'conoscenza', 1], ['F-10', 'ohya', 7, 'fascino', 3], ['F-11', 'shinya', 1, 'gentilezza', 3], ['F-12', 'shinya', 3, 'gentilezza', 2],
  ['F-13', 'shinya', 6, 'gentilezza', 2], ['F-14', 'shinya', 10, 'gentilezza', 1], ['F-15', 'hifumi', 2, 'conoscenza', 1], ['F-16', 'hifumi', 7, 'conoscenza', 1],
  ['F-17', 'sojiro', 6, 'gentilezza', 3], ['F-18', 'sojiro', 7, 'gentilezza', 3],
];

/** L'uid di una voce nuova dell'elenco (stesso su ogni copia). Esportato per la migrazione delle partite 071. */
export const uidVoceL609 = (id: string): string => uidDa(`${LOTTO}:voce:${id}`);

interface RigaVoce { uid: string; data: string; fascia: Fascia; ordine: number; azione: string; note: string | null; rango_atteso: number | null; tipo: string;
  riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null; testo_precedente_json: string | null }

export const migration385: Migration = {
  id: 385,
  name: 'voci_del_diario_dopo_giugno',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['voce_giornata', 'voce_effetto', 'voce_effetto_transizione', 'giorno', 'confidente_dote_incontro', 'dati_guida']) if (!esisteTabella(db, t)) return;
    const partite = tabellePartiteConVoce(db);
    // senza lo schema delle partite non si sa quali voci sono spuntate: non si scrive niente
    if (partite === null) errore('schema delle partite non attaccato: spunte non verificabili');
    const adesso = new Date().toISOString();
    // la soglia del Diario validato si legge dal calendario (il giorno del 1° giugno); senza quel giorno non si scrive niente
    const ORDINE_VALIDATO = db.prepare('SELECT ordine FROM main.giorno WHERE data = ?').pluck().get(ULTIMO_GIORNO_VALIDATO) as number | undefined;
    if (ORDINE_VALIDATO === undefined) return errore(`manca il giorno ${ULTIMO_GIORNO_VALIDATO}: la soglia del Diario validato non si legge`);

    const vociPrima = righePerChiave(db, 'voce_giornata', ['uid']);
    const effettiPrima = righePerChiave(db, 'voce_effetto', ['uid']);
    const transizioniPrima = righePerChiave(db, 'voce_effetto_transizione', ['voce_uid']);
    const giorniPrima = righePerChiave(db, 'giorno', ['data']);
    const dotiPrima = righePerChiave(db, 'confidente_dote_incontro', ['confidente_chiave', 'verso_rango']);
    const partitePrima = improntaPartite(db);

    const esiti: Array<{ id: string; esito: string; uid?: string; prima?: unknown; dopo?: unknown }> = [];
    const vociToccate = new Set<string>();
    const effettiToccati = new Set<string>();
    const transizioniToccate = new Set<string>();
    const giorniToccati = new Set<string>();
    const dotiToccate = new Set<string>();
    let cambiato = false;

    const leggiVoce = db.prepare('SELECT uid, data, fascia, ordine, azione, note, rango_atteso, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo, testo_precedente_json FROM main.voce_giornata WHERE uid = ?');
    const ordineGiorno = db.prepare('SELECT ordine FROM main.giorno WHERE data = ?').pluck();
    const fasciaDi = db.prepare('SELECT uid, ordine FROM main.voce_giornata WHERE data = ? AND fascia = ? ORDER BY ordine, uid');
    const effettiDi = db.prepare('SELECT uid FROM main.voce_effetto WHERE voce_uid = ?').pluck();
    const segnaEffetti = (uid: string) => { for (const e of effettiDi.all(uid) as string[]) effettiToccati.add(e); transizioniToccate.add(uid); };
    /** Ricompatta l'ordine di una fascia (0, 1, 2…) dopo che una voce l'ha lasciata. */
    /** Le voci che cambiano solo posto nella fascia (ricompattamento o voci delle Gemelle inserite prima): nel verbale, uid per uid. */
    const riordinate: Array<{ uid: string; data: string; fascia: Fascia; prima: number; dopo: number }> = [];
    const riordina = (uid: string, data: string, fascia: Fascia, prima: number, dopo: number) => {
      db.prepare('UPDATE main.voce_giornata SET ordine = ? WHERE uid = ?').run(dopo, uid);
      vociToccate.add(uid);
      riordinate.push({ uid, data, fascia, prima, dopo });
    };
    const compatta = (data: string, fascia: Fascia) => {
      (fasciaDi.all(data, fascia) as Array<{ uid: string; ordine: number }>).forEach((r, i) => { if (r.ordine !== i) riordina(r.uid, data, fascia, r.ordine, i); });
    };
    /** Esiste ciò che una voce nuova cita (collegamento ed effetti)? Il motivo se no. */
    const esiste = (tabella: string, colonna: string, valore: string): boolean => esisteTabella(db, tabella) && !!db.prepare(`SELECT 1 FROM main."${tabella}" WHERE "${colonna}" = ?`).get(valore);
    const TABELLA_RIF: Record<string, string> = { confidente: 'confidente', richiesta: 'richiesta', attivita: 'attivita', libro: 'libro', film: 'film', negozio: 'negozio', dungeon: 'dungeon', dote: 'dote_sociale' };
    const riferimentoMancante = (v: VoceNuova): string | null => {
      if (v.rif && TABELLA_RIF[v.rif.tipo] && !esiste(TABELLA_RIF[v.rif.tipo]!, 'chiave', v.rif.chiave)) return `${v.rif.tipo} ${v.rif.chiave}`;
      for (const e of v.effetti ?? []) {
        const [t, k] = e.tipo === 'articolo' || e.tipo === 'acquisto' ? ['articolo', e.articolo] : e.tipo === 'trofeo' ? ['trofeo', e.trofeo]
          : e.tipo === 'sblocco' ? ['richiesta', e.chiave] : e.tipo === 'richiesta' ? ['richiesta', e.richiesta]
          : e.tipo === 'lettura' ? [e.categoria === 'videogioco' ? 'attivita' : e.categoria, e.chiave] : e.tipo === 'turno' ? ['attivita', e.attivita] : [null, null];
        if (t && k && !esiste(t, 'chiave', k)) return `${t} ${k}`;
      }
      return null;
    };

    // Un trofeo sta su una voce sola: quello che una voce nuova o un'aggiunta porterebbe resta fuori se un'altra voce lo ha ancora (G-04, G-08 su
    // dati dove la voce di prima non è quella attesa e quindi non si è potuta correggere)
    const trofeoAltrove = (effetto: EffettoVoce, uid: string): string | null => effetto.tipo !== 'trofeo' ? null
      : (db.prepare("SELECT voce_uid FROM main.voce_effetto WHERE tipo = 'trofeo' AND chiave = ? AND voce_uid <> ? LIMIT 1").pluck().get(effetto.trofeo, uid) as string | undefined) ?? null;

    // (1) gli effetti delle voci esistenti (con il testo di oggi): prima le uscite dei trofei, poi le voci nuove e i cambi di testo
    for (const e of EFFETTI) {
      const aggiungi = (e.aggiungi ?? []).flatMap((effetto, i) => (trofeoAltrove(effetto, e.uid) ? [] : [{ seme: `${LOTTO}:${e.id}:effetto:${i}`, effetto }]));
      if ((e.aggiungi ?? []).length > aggiungi.length && !aggiungi.length && !e.modifica && !e.attesi.some((a) => a.togli)) {
        esiti.push({ id: e.id, uid: e.uid, esito: 'il trofeo è ancora su un’altra voce: non aggiunto' });
        continue;
      }
      const r = convertiVoce(db, {
        uid: e.uid, data: e.data, azione: e.azione, lotto: LOTTO, motivo: `${LOTTO} ${e.id}: allineata alla guida`,
        attesi: e.attesi.map((a) => ({ uid: a.uid, effetto: a.effetto, ...(a.togli ? { togli: true as const } : {}) })), togli: [], aggiungi,
        ...(e.modifica ? { modifica: e.modifica } : {}), ...(e.collega ? { collega: e.collega } : {}), ...(e.ancheSpuntata ? { ancheSpuntata: { decisione: e.ancheSpuntata } } : {}),
      }, partite, adesso);
      if (r.esito.startsWith('convertita')) { vociToccate.add(e.uid); segnaEffetti(e.uid); for (const a of e.attesi) effettiToccati.add(a.uid); cambiato = true; }
      esiti.push({ id: e.id, uid: e.uid, esito: r.esito, prima: r.prima, dopo: r.dopo });
    }

    // (2) le voci nuove
    for (const v of VOCI_NUOVE) {
      const uid = uidVoceL609(v.id);
      const esistente = leggiVoce.get(uid) as RigaVoce | undefined;
      if (esistente) { esiti.push({ id: v.id, uid, esito: esistente.data === v.data ? 'già presente' : `l'uid è di un'altra voce (${esistente.data}): non toccata` }); continue; }
      const ordineDelGiorno = ordineGiorno.get(v.data) as number | undefined;
      if (ordineDelGiorno === undefined) { esiti.push({ id: v.id, esito: 'giorno assente: nessuna voce' }); continue; }
      if (ordineDelGiorno <= ORDINE_VALIDATO) errore(`la voce ${v.id} cadrebbe nel Diario validato (${v.data})`);
      if (db.prepare('SELECT 1 FROM main.voce_giornata WHERE data = ? AND fascia = ? AND azione = ?').get(v.data, v.fascia, v.azione)) { esiti.push({ id: v.id, esito: 'la fascia ha già una voce con questo testo: nessuna voce' }); continue; }
      const mancante = riferimentoMancante(v);
      if (mancante) { esiti.push({ id: v.id, esito: `manca ${mancante} nei dati di gioco: nessuna voce` }); continue; }
      if (v.rango !== undefined && v.rif) {
        const gia = db.prepare("SELECT uid, data FROM main.voce_giornata WHERE riferimento_tipo = 'confidente' AND riferimento_chiave = ? AND rango_atteso = ?").all(v.rif.chiave, v.rango) as Array<{ uid: string; data: string }>;
        if (gia.length) { esiti.push({ id: v.id, esito: `una voce dà già il rango ${v.rango} (${gia.map((g) => `${g.data} ${g.uid}`).join(', ')}): nessuna voce` }); continue; }
      }
      const sorelle = fasciaDi.all(v.data, v.fascia) as Array<{ uid: string; ordine: number }>;
      let ordine = sorelle.length ? Math.max(...sorelle.map((s) => s.ordine)) + 1 : 0;
      if (v.prima) {
        const dopo = sorelle.find((s) => s.uid === v.prima);
        if (!dopo) { esiti.push({ id: v.id, esito: `la voce ${v.prima} non è più in questa fascia: nessuna voce` }); continue; }
        ordine = dopo.ordine;
        for (const s of [...sorelle].reverse()) if (s.ordine >= ordine) riordina(s.uid, v.data, v.fascia, s.ordine, s.ordine + 1);
      }
      db.prepare(`INSERT INTO main.voce_giornata (uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo, rango_atteso,
          indice_guida, created_at, updated_at, da_rivedere, aggiunta_da)
        VALUES (?, ?, ?, ?, 'azione', ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 0, 'team')`)
        .run(uid, v.data, v.fascia, ordine, v.azione, v.note ?? null, v.tipo, v.rif?.tipo ?? null, v.rif?.chiave ?? null, v.rifTesto ?? null, v.rango ?? null, adesso, adesso);
      vociToccate.add(uid);
      const fuoriTrofei = (v.effetti ?? []).filter((e) => trofeoAltrove(e, uid));
      const effetti = (v.effetti ?? []).filter((e) => !fuoriTrofei.includes(e));
      if (fuoriTrofei.length) esiti.push({ id: v.id, uid, esito: `trofeo ancora su un’altra voce, non aggiunto: ${fuoriTrofei.map((e) => (e.tipo === 'trofeo' ? e.trofeo : e.tipo)).join(', ')}` });
      if (effetti.length) {
        const r = convertiVoce(db, { uid, data: v.data, azione: v.azione, attesi: [], togli: [], lotto: LOTTO, motivo: `${LOTTO} ${v.id}: voce della guida`,
          aggiungi: effetti.map((effetto) => ({ seme: `${LOTTO}:${v.id}:effetto:${(v.effetti ?? []).indexOf(effetto)}`, effetto })) }, partite, adesso);
        if (!r.esito.startsWith('convertita')) errore(`gli effetti della voce nuova ${v.id} non si scrivono (${r.esito})`);
      } else {
        // come ogni voce nuova senza effetti (`motoreDiario.scriviLista`): convertita, elenco vuoto
        db.prepare("INSERT INTO main.voce_effetto_transizione (voce_uid, stato, raw_json, motivo, impronta, aggiornata_il) VALUES (?, 'convertita', '[]', NULL, ?, ?)").run(uid, impronta([]), adesso);
      }
      segnaEffetti(uid);
      cambiato = true;
      esiti.push({ id: v.id, uid, esito: 'creata', dopo: { data: v.data, fascia: v.fascia, ordine, rango: v.rango ?? null, effetti: effetti.length } });
    }

    // (3) testi, ranghi e posti
    for (const c of CAMBI) {
      if (c.seNonHaIlTrofeo && db.prepare("SELECT 1 FROM main.voce_effetto WHERE voce_uid = ? AND tipo = 'trofeo' AND chiave = ?").get(c.uid, c.seNonHaIlTrofeo)) {
        esiti.push({ id: c.id, uid: c.uid, esito: 'la voce porta ancora il trofeo: la nota resta' });
        continue;
      }
      const r = leggiVoce.get(c.uid) as RigaVoce | undefined;
      if (!r) { esiti.push({ id: c.id, uid: c.uid, esito: 'voce assente' }); continue; }
      const n = c.nuovo;
      const fatto = (n.azione === undefined || r.azione === n.azione) && (n.note === undefined || r.note === n.note) && (n.rango === undefined || r.rango_atteso === n.rango)
        && (n.data === undefined || r.data === n.data) && (n.fascia === undefined || r.fascia === n.fascia);
      if (fatto) { esiti.push({ id: c.id, uid: c.uid, esito: 'già fatto' }); continue; }
      const a = c.atteso;
      if (r.data !== a.data || r.fascia !== a.fascia || r.azione !== a.azione || r.note !== a.note || r.rango_atteso !== a.rango) { esiti.push({ id: c.id, uid: c.uid, esito: 'voce diversa da quella attesa: non toccata' }); continue; }
      const citata = partite!.filter((t) => db.prepare(`SELECT 1 FROM utente."${t}" WHERE voce_uid = ? LIMIT 1`).get(c.uid));
      if (citata.length && !c.ancheSpuntata) { esiti.push({ id: c.id, uid: c.uid, esito: `citata nelle partite (${citata.join(', ')}): non toccata` }); continue; }
      if (n.rango !== undefined && n.rango !== null && r.riferimento_tipo === 'confidente' && r.riferimento_chiave) {
        const gia = db.prepare("SELECT uid FROM main.voce_giornata WHERE riferimento_tipo = 'confidente' AND riferimento_chiave = ? AND rango_atteso = ? AND uid <> ?").pluck().all(r.riferimento_chiave, n.rango, c.uid) as string[];
        if (gia.length) { esiti.push({ id: c.id, uid: c.uid, esito: `un'altra voce dà già il rango ${n.rango} (${gia.join(', ')}): non toccata` }); continue; }
      }
      if (n.data !== undefined) {
        const o = ordineGiorno.get(n.data) as number | undefined;
        if (o === undefined) { esiti.push({ id: c.id, uid: c.uid, esito: `giorno ${n.data} assente: non spostata` }); continue; }
        if (o <= ORDINE_VALIDATO) errore(`la voce ${c.uid} andrebbe nel Diario validato`);
      }
      // il testo di prima va in `testo_precedente_json` (come la 222 e la 341), se la voce non ne ha già uno
      const cambiaTesto = (n.azione !== undefined && n.azione !== r.azione) || (n.note !== undefined && n.note !== r.note);
      const precedente = cambiaTesto && r.testo_precedente_json === null
        ? JSON.stringify({ azione: r.azione, note: r.note, riferimento_tipo: r.riferimento_tipo, riferimento_chiave: r.riferimento_chiave, riferimento_testo: r.riferimento_testo })
        : r.testo_precedente_json;
      const data = n.data ?? r.data, fascia = n.fascia ?? r.fascia;
      const sposta = data !== r.data || fascia !== r.fascia;
      const arrivo = sposta ? (fasciaDi.all(data, fascia) as Array<{ uid: string; ordine: number }>) : [];
      const ordine = sposta ? (arrivo.length ? Math.max(...arrivo.map((s) => s.ordine)) + 1 : 0) : r.ordine;
      if (db.prepare('UPDATE main.voce_giornata SET azione = ?, note = ?, rango_atteso = ?, data = ?, fascia = ?, ordine = ?, testo_precedente_json = ?, updated_at = ? WHERE uid = ?')
        .run(n.azione ?? r.azione, n.note === undefined ? r.note : n.note, n.rango === undefined ? r.rango_atteso : n.rango, data, fascia, ordine, precedente, adesso, c.uid).changes !== 1) errore(`la voce ${c.uid} non si aggiorna`);
      if (sposta) compatta(r.data, r.fascia);
      vociToccate.add(c.uid);
      cambiato = true;
      esiti.push({ id: c.id, uid: c.uid, esito: citata.length ? `aggiornata anche se citata nelle partite (${citata.join(', ')}): ${c.ancheSpuntata}` : 'aggiornata', prima: a, dopo: { ...n, ...(sposta ? { ordine } : {}) } });
    }

    // (4) G-11: le voci segnaposto nel Cestino, nello stesso formato dell'eliminazione dal Diario (come la 195)
    for (const s of SEGNAPOSTO) {
      const trovate = db.prepare('SELECT * FROM main.voce_giornata WHERE uid LIKE ?').all(`${s.uid}%`) as Array<Record<string, unknown>>;
      if (trovate.length === 0) { esiti.push({ id: s.id, esito: 'già tolta' }); continue; }
      if (trovate.length > 1) errore(`${trovate.length} voci cominciano con ${s.uid}`);
      const v = trovate[0]!;
      const uid = String(v.uid);
      if (v.data !== s.data || v.fascia !== s.fascia || v.azione !== s.azione) { esiti.push({ id: s.id, uid, esito: 'voce diversa da quella attesa: resta' }); continue; }
      const mancanti = s.sostitute.filter((id) => !leggiVoce.get(uidVoceL609(id)));
      if (mancanti.length) { esiti.push({ id: s.id, uid, esito: `mancano le voci vere (${mancanti.join(', ')}): resta` }); continue; }
      const citata = partite!.filter((t) => db.prepare(`SELECT 1 FROM utente."${t}" WHERE voce_uid = ? LIMIT 1`).get(uid));
      if (citata.length) { esiti.push({ id: s.id, uid, esito: `citata nelle partite (${citata.join(', ')}): resta, la spunta non si perde` }); continue; }
      const legami = ['voce_infiltrazione', 'proposta_infiltrazione_voce', 'evento_calendario_voce', 'proposta_effetto_voce', 'proposta_conversione_voce', 'operazione_effetti_voce']
        .filter((t) => esisteTabella(db, t) && db.prepare(`SELECT 1 FROM main.${t} WHERE voce_uid = ?`).get(uid));
      if (legami.length) { esiti.push({ id: s.id, uid, esito: `ha righe in ${legami.join(', ')}: resta` }); continue; }
      if (!esisteTabella(db, 'cestino')) { esiti.push({ id: s.id, uid, esito: 'Cestino assente: resta' }); continue; }
      const passi: Array<{ seq: number; tabella: string; op: 'D' | 'U'; prima: Record<string, unknown>; dopo?: Record<string, unknown> }> = [];
      let seq = 0;
      for (const r of db.prepare('SELECT * FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').all(uid) as Array<Record<string, unknown>>) { passi.push({ seq: seq++, tabella: 'voce_effetto', op: 'D', prima: r }); effettiToccati.add(String(r.uid)); }
      for (const r of db.prepare('SELECT * FROM main.voce_effetto_transizione WHERE voce_uid = ?').all(uid) as Array<Record<string, unknown>>) passi.push({ seq: seq++, tabella: 'voce_effetto_transizione', op: 'D', prima: r });
      passi.push({ seq: seq++, tabella: 'voce_giornata', op: 'D', prima: v });
      const vicini = (fasciaDi.all(s.data, s.fascia) as Array<{ uid: string }>).map((x) => x.uid);
      const posto = vicini.indexOf(uid);
      const restano = db.prepare('SELECT * FROM main.voce_giornata WHERE data = ? AND fascia = ? AND uid <> ? ORDER BY ordine, uid').all(s.data, s.fascia, uid) as Array<Record<string, unknown>>;
      restano.forEach((r, i) => { if (r.ordine !== i) passi.push({ seq: seq++, tabella: 'voce_giornata', op: 'U', prima: r, dopo: { ...r, ordine: i } }); });
      db.prepare('DELETE FROM main.voce_effetto WHERE voce_uid = ?').run(uid);
      db.prepare('DELETE FROM main.voce_effetto_transizione WHERE voce_uid = ?').run(uid);
      db.prepare('DELETE FROM main.voce_giornata WHERE uid = ?').run(uid);
      compatta(s.data, s.fascia);
      const conti: Record<string, number> = {};
      for (const p of passi) if (p.op === 'D') conti[p.tabella] = (conti[p.tabella] ?? 0) + 1;
      db.prepare('INSERT INTO main.cestino (uid, tipo, chiave, nome, contesto, riepilogo_json, registro_json, con_partite, vicini_json, eliminato_il) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)')
        .run(randomBytes(16).toString('hex'), 'voce-diario', uid, String(v.azione), `${s.data} · ${s.fascia}`, JSON.stringify(conti), JSON.stringify(passi),
          JSON.stringify({ prima: vicini[posto - 1] ?? null, dopo: vicini[posto + 1] ?? null }), adesso);
      vociToccate.add(uid);
      transizioniToccate.add(uid);
      cambiato = true;
      esiti.push({ id: s.id, uid, esito: 'nel Cestino', prima: { data: s.data, fascia: s.fascia, azione: s.azione } });
    }

    // (5) le trame degli 8 giorni del blocco A
    for (const t of TRAME) {
      const g = db.prepare('SELECT ordine, trama FROM main.giorno WHERE data = ?').get(t.data) as { ordine: number; trama: string } | undefined;
      if (!g) { esiti.push({ id: t.id, esito: 'giorno assente' }); continue; }
      if (g.trama === t.trama) { esiti.push({ id: t.id, esito: 'già scritta' }); continue; }
      if (g.trama !== TRAMA_NON_COPERTO) { esiti.push({ id: t.id, esito: 'trama già diversa da «non coperto»: resta', prima: g.trama }); continue; }
      if (g.ordine <= ORDINE_VALIDATO) errore(`il giorno ${t.data} è nel Diario validato`);
      db.prepare('UPDATE main.giorno SET trama = ?, updated_at = ? WHERE data = ? AND trama = ?').run(t.trama, adesso, t.data, TRAMA_NON_COPERTO);
      giorniToccati.add(t.data);
      cambiato = true;
      esiti.push({ id: t.id, esito: 'scritta', prima: g.trama, dopo: t.trama });
    }

    // (6) G-07, e il controllo delle Dote per incontro già scritte
    {
      const chiave = `${IWAI_10.confidente}|${IWAI_10.rango}`;
      const valore = JSON.stringify([{ effetto: { famiglia: 'dote', dote: IWAI_10.dote, note: IWAI_10.note } }]);
      const r = db.prepare('SELECT effetti_json FROM main.confidente_dote_incontro WHERE confidente_chiave = ? AND verso_rango = ?').get(IWAI_10.confidente, IWAI_10.rango) as { effetti_json: string } | undefined;
      if (r?.effetti_json === valore) esiti.push({ id: 'G-07', esito: 'già scritta' });
      else if (r && r.effetti_json !== '[]') esiti.push({ id: 'G-07', esito: 'già diversa: resta', prima: r.effetti_json });
      else if (db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave = ?').get(`confidente-seed-v1:dote-incontro:${IWAI_10.confidente}:${IWAI_10.rango}`)) esiti.push({ id: 'G-07', esito: 'modificata dall’utente (c’è la fotografia): resta' });
      else if (!db.prepare('SELECT 1 FROM main.confidente WHERE chiave = ?').get(IWAI_10.confidente)) esiti.push({ id: 'G-07', esito: 'Confidente assente' });
      else {
        db.prepare('INSERT INTO main.confidente_dote_incontro (confidente_chiave, verso_rango, effetti_json) VALUES (?, ?, ?) ON CONFLICT(confidente_chiave, verso_rango) DO UPDATE SET effetti_json = excluded.effetti_json').run(IWAI_10.confidente, IWAI_10.rango, valore);
        dotiToccate.add(chiave);
        cambiato = true;
        esiti.push({ id: 'G-07', esito: r ? 'scritta (era [])' : 'aggiunta', dopo: valore });
      }
      for (const [id, c, rango, dote, note] of DOTI_GIA_SCRITTE) {
        const v = db.prepare('SELECT effetti_json FROM main.confidente_dote_incontro WHERE confidente_chiave = ? AND verso_rango = ?').pluck().get(c, rango) as string | undefined;
        esiti.push({ id, esito: v === JSON.stringify([{ effetto: { famiglia: 'dote', dote, note } }]) ? 'già scritta dalla 360' : `valore diverso da quello della guida, non toccato: ${v ?? 'riga assente'}` });
      }
    }

    // (7) le verifiche: solo le righe dell'elenco sono cambiate, niente nel Diario validato, partite identiche
    const fuori = [
      ...diverseFuori(vociPrima, righePerChiave(db, 'voce_giornata', ['uid']), vociToccate).map((k) => `voce_giornata ${k}`),
      ...diverseFuori(effettiPrima, righePerChiave(db, 'voce_effetto', ['uid']), effettiToccati).map((k) => `voce_effetto ${k}`),
      ...diverseFuori(transizioniPrima, righePerChiave(db, 'voce_effetto_transizione', ['voce_uid']), transizioniToccate).map((k) => `voce_effetto_transizione ${k}`),
      ...diverseFuori(giorniPrima, righePerChiave(db, 'giorno', ['data']), giorniToccati).map((k) => `giorno ${k}`),
      ...diverseFuori(dotiPrima, righePerChiave(db, 'confidente_dote_incontro', ['confidente_chiave', 'verso_rango']), dotiToccate).map((k) => `confidente_dote_incontro ${k}`),
    ];
    if (fuori.length) errore(`righe cambiate fuori dall'elenco: ${fuori.slice(0, 5).join(', ')}`);
    const nelValidato = (data: string) => ((ordineGiorno.get(data) as number | undefined) ?? Infinity) <= ORDINE_VALIDATO;
    for (const uid of vociToccate) {
      const dopo = leggiVoce.get(uid) as RigaVoce | undefined;
      if (dopo && nelValidato(dopo.data)) errore(`la voce ${uid} è nel Diario validato`);
    }
    for (const s of SEGNAPOSTO) if (nelValidato(s.data)) errore(`la voce ${s.uid} è nel Diario validato`);
    for (const e of EFFETTI) if (nelValidato(e.data)) errore(`la voce ${e.uid} è nel Diario validato`);
    for (const c of CAMBI) if (nelValidato(c.atteso.data)) errore(`la voce ${c.uid} è nel Diario validato`);
    for (const g of giorniToccati) if (nelValidato(g)) errore(`il giorno ${g} è nel Diario validato`);
    if (improntaPartite(db) !== partitePrima) errore('le tabelle delle partite sono cambiate');

    if (cambiato) registraAudit(db, AUDIT, { migrazione: 385, lotto: LOTTO, il: adesso, decisione: 'risposte dell\'utente del 10/11 all\'elenco L6-09 (blocchi A-G)',
      escluse: [{ id: 'A-09', motivo: 'la guida non nomina il film del 5 agosto (settimana 17 e pagina di Yusuke); il titolo dell’app viene da una fonte secondaria non verificata' }],
      esiti, riordinate });
    logger.info({ migrazione: 385, riordinate: riordinate.length, voci: esiti.filter((e) => e.esito === 'creata').length, esiti: esiti.map((e) => `${e.id}: ${e.esito}`) }, 'voci e Doti del Diario dopo il 1° giugno');
  },
};
