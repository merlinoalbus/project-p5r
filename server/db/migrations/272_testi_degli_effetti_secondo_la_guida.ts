// ============================================================
// Migrazione 272 — i testi degli effetti del catalogo secondo la guida italiana (Ondata 5, Lotto F; decisione 21 dell'utente)
// ============================================================
//
// Decisione 21 (a): «si correggono i testi sbagliati»; (b) «Nulla si rimanda: Cartolina e premio "Benefattore" entrano nell'ondata». Prevale
// il dato Royal della guida italiana. Il testo dell'effetto vive solo in `catalogo_oggetto.effetto` (le copie delle offerte le toglie la 270).
//
// 1. Correzioni O5-08 (censimento ECC dell'ondata 5) — Oggetti [O] e Accessori [A], letti il 2026-10-26:
//    - Collana cremisi: [A] «Fuoco +50%», cumulabile (la scheda non diceva che si cumula); con lei le altre sette collane di Stoneon, che
//      dicevano «Potenzia attacco Luce/Oscurità/Psi…» senza la misura né i nomi degli elementi della guida;
//    - Unguento fisico: [O] respinge una volta gli attacchi fisici e da arma da fuoco (la scheda diceva solo «fisici»; l'offerta della Clinica
//      lo diceva giusto, ma era una copia);
//    - Vino della grazia (tutti gli HP di tutti gli alleati), Soma (HP e SP di tutti gli alleati), Spray supremo (statistiche di un nemico per
//      tre turni), Curry del Leblanc (50 SP a tutti gli alleati): la scheda è già quella della guida (decisione 11: vale il catalogo; il bersaglio
//      resta da confermare in gioco) — qui solo il controllo, che l'audit riporta; le frasi sbagliate stavano nelle offerte (270).
// 2. Accessori senza effetto (O5-09): le 42 schede di categoria «accessorio» con l'effetto vuoto, completate da [A] — le 11 del listino
//    (Tsurukame Diamond, Venditore ambulante) e le 31 della guida (premi delle Battaglie sfida, Semi della Bramosia, scambi con Jose). Per le 31
//    della guida la descrizione ripeteva l'effetto in poche parole («accessorio, attiva Diarahan»): diventa il modo di ottenerle, secondo [A];
//    per quelle del listino la descrizione resta vuota (lo dicono le offerte). In più la Perla dell'attaccamento, senza effetto anche lei
//    (accessorio nel pacchetto iniziale, «altro» nei dati dell'istanza).
// 3. Cartolina (RG-18): l'effetto «Regalo economico» non diceva che cosa fa. [Regali]: si spedisce dalla cassetta rossa di Yongen-Jaya e dà +1
//    punto affinità (le condizioni — non con la pioggia, non a chi è al rango massimo, solo con la popolarità al massimo — le valuta e le dice la
//    finestra «Regala», `shared/regali.ts`). Il premio «Benefattore» è già completo dal lotto D (258: conteggio dei regali della partita).
//
// Conservativa: ogni testo si scrive solo su una scheda della guida mai corretta dall'utente e solo se è il testo atteso
// (`correggiTestoCatalogo`); altrimenti resta e l'audit lo dice. Nessuna voce del Diario cambia. Idempotente. Audit `audit-272-testi-effetti`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { FONTE_ACCESSORI, FONTE_OGGETTI, FONTE_REGALI, correggiTestoCatalogo, improntaDiario, scriviAuditTesti, type EsitoTesto } from './testiOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-272-testi-effetti';
const errore = (motivo: string): never => { throw new Error(`272: ${motivo}; nessuna modifica applicata.`); };

/** O5-08: le schede da correggere (testo atteso → testo della guida). */
const CORREZIONI: ReadonlyArray<{ chiave: string; prima: string; dopo: string }> = [
  { chiave: 'accessorio/collana-cremisi', prima: 'Potenzia abilità di Fuoco del 50 percento', dopo: 'Potenzia abilità di Fuoco del 50 percento (cumulabile)' },
  { chiave: 'consumabile/unguento-fisico', prima: 'Crea una barriera che respinge una volta gli attacchi fisici', dopo: 'Crea una barriera che respinge una volta gli attacchi fisici e da arma da fuoco' },
  // le altre sette collane di Stoneon, come la Collana cremisi: [A] «+50%», cumulabili; i nomi degli elementi della guida (Sacro, non «Luce»;
  // Maledizione, non «Oscurità»; Psicocinesi, non «Psi»)
  { chiave: 'accessorio/collana-del-ghiaccio', prima: 'Potenzia attacco Ghiaccio', dopo: 'Potenzia abilità di Ghiaccio del 50 percento (cumulabile)' },
  { chiave: 'accessorio/collana-vento-di-giada', prima: 'Potenzia attacco Vento', dopo: 'Potenzia abilità di Vento del 50 percento (cumulabile)' },
  { chiave: 'accessorio/collana-fulmine-viola', prima: 'Potenzia attacco Elettrico', dopo: 'Potenzia abilità di Elettricità del 50 percento (cumulabile)' },
  { chiave: 'accessorio/collana-nucleare', prima: 'Potenzia attacco Nucleare', dopo: 'Potenzia abilità Nucleari del 50 percento (cumulabile)' },
  { chiave: 'accessorio/collana-psicocinetica', prima: 'Potenzia attacco Psi', dopo: 'Potenzia abilità di Psicocinesi del 50 percento (cumulabile)' },
  { chiave: 'accessorio/collana-divina-3', prima: 'Potenzia attacco Luce', dopo: 'Potenzia abilità Sacre del 50 percento (cumulabile)' },
  { chiave: 'accessorio/collana-della-notte', prima: 'Potenzia attacco Oscurità', dopo: 'Potenzia abilità di Maledizione del 50 percento (cumulabile)' },
];
/** O5-08: le schede già giuste secondo la guida (solo controllo). */
const CONFORMI: ReadonlyArray<{ chiave: string; testo: string }> = [
  { chiave: 'consumabile/vino-della-grazia', testo: 'Ridona tutti gli HP a tutti gli alleati' },
  { chiave: 'consumabile/soma', testo: 'Ripristina interamente HP e SP di tutti gli alleati' },
  { chiave: 'consumabile/spray-supremo', testo: 'Riduce le statistiche di un nemico per 3 turni' },
  { chiave: 'consumabile/curry-del-leblanc', testo: 'Ripristina 50 SP a tutti gli alleati' },
];

const JOSE = (cristallo: string) => `Jose nei Memento, in cambio del ${cristallo}`;
const SFIDA = (nome: string, livello?: number) => `Ricompensa della Battaglia sfida «${nome}»${livello ? `, livello ${livello}` : ''}`;
const SEMI = (palazzo: string) => `Ricompensa per i 3 Semi della Bramosia del Palazzo di ${palazzo}`;

/** O5-09: gli accessori senza effetto, con il testo di [A]; `descrizione` (attesa → nuova) solo dove la guida dice come si ottengono. */
const ACCESSORI: ReadonlyArray<{ chiave: string; effetto: string; descrizione?: { prima: string; dopo: string } }> = [
  // listino: Tsurukame Diamond e Venditore ambulante (Shibuya)
  { chiave: 'accessorio/braccialetto-bianco', effetto: 'Potenzia abilità Sacre del 25 percento' },
  { chiave: 'accessorio/braccialetto-circolare', effetto: 'Potenzia abilità di Psicocinesi del 25 percento' },
  { chiave: 'accessorio/braccialetto-nero', effetto: 'Potenzia abilità di Maledizione del 25 percento' },
  { chiave: 'accessorio/braccialetto-stelle', effetto: 'Potenzia abilità Nucleari del 25 percento' },
  { chiave: 'accessorio/fascia-gialla', effetto: 'Potenzia abilità di Elettricità del 25 percento' },
  { chiave: 'accessorio/fascia-verde', effetto: 'Potenzia abilità di Vento del 25 percento' },
  { chiave: 'accessorio/piastrina-incisa', effetto: 'Potenzia gli attacchi con arma da fuoco del 25 percento' },
  { chiave: 'accessorio/portafortuna-croce', effetto: 'Aumenta la probabilità di successo delle abilità Hama' },
  { chiave: 'accessorio/portafortuna-teschio', effetto: 'Aumenta la probabilità di successo delle abilità Mudo' },
  { chiave: 'accessorio/specchio-del-rimbotto', effetto: 'Probabilità del 15 percento di riflettere gli attacchi fisici (non cumulabile)' },
  { chiave: 'accessorio/specchio-di-rappresaglia', effetto: 'Probabilità del 20 percento di riflettere gli attacchi fisici (non cumulabile)' },
  // guida: scambi con Jose (gli Anelli dei peccati, in cambio dei Cristalli)
  { chiave: 'accessorio/anello-della-gola', effetto: 'Attiva Guardia del caveau: aumenta la Difesa di tutti gli alleati per 3 turni', descrizione: { prima: '', dopo: JOSE('Cristallo della gola') } },
  { chiave: 'accessorio/anello-della-lussuria', effetto: 'Attiva Coppa del campione: ripristina una quantità media di HP di un alleato e ne aumenta l’Attacco per 3 turni', descrizione: { prima: '', dopo: JOSE('Cristallo della lussuria') } },
  { chiave: 'accessorio/anello-della-superbia', effetto: 'Attiva Volontà del tiranno: raddoppia il danno del prossimo attacco fisico di un alleato', descrizione: { prima: '', dopo: JOSE('Cristallo della boria') } },
  { chiave: 'accessorio/anello-della-tristezza', effetto: 'Attiva Tentacolo guida: un attacco che atterra tutti i nemici, solo durante un’imboscata', descrizione: { prima: '', dopo: `${JOSE('Cristallo del dolore')} (solo in Nuova partita +)` } },
  { chiave: 'accessorio/anello-della-vanita', effetto: 'Attiva Tratto dissanguante: crea una barriera che assorbe un attacco non divino', descrizione: { prima: '', dopo: JOSE('Cristallo della vanità') } },
  { chiave: 'accessorio/anello-dellavarizia', effetto: 'Attiva Intuito del presidente: raddoppia il danno del prossimo attacco magico di un alleato', descrizione: { prima: '', dopo: JOSE('Cristallo dell’avarizia') } },
  { chiave: 'accessorio/anello-dellinvidia', effetto: 'Attiva Previsione d’azzardo: aumenta l’Agilità di tutti gli alleati per 3 turni', descrizione: { prima: '', dopo: JOSE('Cristallo dell’invidia') } },
  { chiave: 'accessorio/anello-dellira', effetto: 'Attiva Ali della saggezza: cura le alterazioni di stato non speciali di tutti gli alleati', descrizione: { prima: '', dopo: JOSE('Cristallo dell’ira') } },
  // guida: i Cristalli dei Semi della Bramosia
  { chiave: 'accessorio/cristallo-della-lussuria', effetto: 'Attiva Diarama: ripristina una quantità media di HP di un alleato', descrizione: { prima: '', dopo: SEMI('Kamoshida') } },
  { chiave: 'accessorio/cristallo-della-vanita', effetto: 'Attiva Pennello della vanità: annulla le debolezze', descrizione: { prima: '', dopo: SEMI('Madarame') } },
  { chiave: 'accessorio/cristallo-della-gola', effetto: 'Attiva Marakukaja: aumenta la Difesa di tutti gli alleati per 3 turni', descrizione: { prima: '', dopo: SEMI('Kaneshiro') } },
  { chiave: 'accessorio/cristallo-dellira', effetto: 'Attiva Sukukaja all’inizio della battaglia', descrizione: { prima: '', dopo: SEMI('Futaba') } },
  { chiave: 'accessorio/cristallo-dellavarizia', effetto: 'Attiva Tarukaja all’inizio della battaglia', descrizione: { prima: 'accessorio · accessorio', dopo: SEMI('Okumura') } },
  { chiave: 'accessorio/cristallo-dellinvidia', effetto: 'Attiva Masukukaja: aumenta Precisione ed Elusione di tutti gli alleati per 3 turni', descrizione: { prima: '', dopo: SEMI('Niijima') } },
  { chiave: 'accessorio/cristallo-della-boria', effetto: 'Attiva Signore della difesa: Rakukaja all’inizio della battaglia', descrizione: { prima: '', dopo: SEMI('Shido') } },
  { chiave: 'accessorio/cristallo-del-dolore', effetto: 'Attiva Supporto medico: ripristina l’8 percento di HP e SP massimi dopo ogni battaglia', descrizione: { prima: '', dopo: SEMI('Maruki') } },
  // guida: premi delle Battaglie sfida, della battaglia con le Gemelle custodi e di una Richiesta
  { chiave: 'accessorio/anello-della-velocita', effetto: 'Punti esperienza ottenuti in battaglia +50 percento', descrizione: { prima: 'accessorio, +50% PE', dopo: 'Premio di partecipazione della battaglia con le Gemelle custodi, dopo averle sconfitte almeno una volta' } },
  { chiave: 'accessorio/anello-supremo', effetto: 'Attiva Megidolaon: danno divino grave a tutti i nemici', descrizione: { prima: 'accessorio, attiva Megidolaon', dopo: SFIDA('Trial', 80) } },
  { chiave: 'accessorio/cav-debilitazione', effetto: 'Attiva Debilitazione: riduce Attacco, Difesa, Precisione ed Elusione di un nemico', descrizione: { prima: 'accessorio, attiva debilitazione sui nemici', dopo: SFIDA('Trickster') } },
  { chiave: 'accessorio/cav-potenziamento', effetto: 'Attiva Potenziamento: aumenta Attacco, Difesa, Precisione ed Elusione di un alleato', descrizione: { prima: 'accessorio, attiva Potenziamento', dopo: SFIDA('Survival') } },
  { chiave: 'accessorio/cav-rasetsu-a-spir', effetto: 'Attiva Matarukaja: aumenta l’Attacco di tutti gli alleati per 3 turni', descrizione: { prima: 'accessorio, attiva Matarukaja', dopo: SFIDA('Trial', 30) } },
  { chiave: 'accessorio/cav-spirale-di-idaten', effetto: 'Attiva Masukukaja: aumenta Precisione ed Elusione di tutti gli alleati per 3 turni', descrizione: { prima: 'accessorio, attiva Masukukaja', dopo: SFIDA('Survival') } },
  { chiave: 'accessorio/cint-ondata-di-caldo', effetto: 'Attiva Ondata di caldo: danno fisico pesante a tutti i nemici', descrizione: { prima: 'accessorio, danno fisico pesante a tutti', dopo: SFIDA('Trial', 20) } },
  { chiave: 'accessorio/cintura-miracolosa', effetto: 'Attiva Colpo miracoloso: danno fisico medio a un nemico, con alta probabilità di critico', descrizione: { prima: 'accessorio, danno fisico medio, alta chance critico', dopo: `${SFIDA('Trial', 50)}, oppure con la trasmutazione durante l’Allarme fusione (Persona dal livello 36 al 55)` } },
  // la Perla dell'attaccamento: nel pacchetto iniziale come «accessorio», nei dati dell'istanza come «altro» (la categoria non si tocca qui);
  // la scheda che non c'è la funzione la dice nell'audit («scheda assente»)
  { chiave: 'accessorio/perla-dellattaccamento', effetto: 'Attiva Annulla Amnesia: previene l’Amnesia', descrizione: { prima: 'accessorio, effetto Annulla Amnesia', dopo: 'Ricompensa della Richiesta «Un ex piuttosto appiccicoso» (Dedalo di Qimranut)' } },
  { chiave: 'altro/perla-dellattaccamento', effetto: 'Attiva Annulla Amnesia: previene l’Amnesia', descrizione: { prima: '', dopo: 'Ricompensa della Richiesta «Un ex piuttosto appiccicoso» (Dedalo di Qimranut)' } },
  { chiave: 'accessorio/corona-del-tumulto', effetto: 'Attiva Lavaggio del cervello: probabilità media di infliggere Soggiogamento a tutti i nemici', descrizione: { prima: 'accessorio', dopo: 'Ricompensa della Richiesta «La ballata del rubacuori» (Dedalo di Sheriruth)' } },
  { chiave: 'accessorio/fascia-dellaudacia', effetto: 'Attiva Signore delle armi: dimezza il costo in HP delle abilità', descrizione: { prima: 'accessorio, attiva Signore delle armi: dimezza il costo in HP delle abilità', dopo: SFIDA('Foggy Day') } },
  { chiave: 'accessorio/misanga-magico', effetto: 'Attiva Signore della magia: dimezza il costo in SP delle abilità', descrizione: { prima: 'accessorio, attiva Signore della magia: dimezza il costo SP delle abilità', dopo: SFIDA('Full Moon') } },
  { chiave: 'accessorio/la-coppa-della-vittoria', effetto: 'Attiva Urla di trionfo: ripristina del tutto HP e SP dopo la battaglia', descrizione: { prima: 'accessorio, "Urla di trionfo": ripristina completamente HP/SP dopo battaglia', dopo: 'Si ottiene vincendo la battaglia con le Gemelle custodi' } },
  { chiave: 'accessorio/masc-prosc-spirit', effetto: 'Attiva Risucchio spirituale: assorbe SP da un nemico', descrizione: { prima: 'accessorio, attiva Risucchio spirituale: assorbe SP da un nemico', dopo: SFIDA('Technical') } },
  { chiave: 'accessorio/portaf-guarigione', effetto: 'Attiva Diarahan: ripristina tutti gli HP di un alleato', descrizione: { prima: 'accessorio, attiva Diarahan', dopo: `${SFIDA('Chain')}, oppure in un forziere del Palazzo di Maruki` } },
  { chiave: 'accessorio/portafort-del-tuono', effetto: 'Attiva Dio del tuono: danno elettrico grave a tutti i nemici, con probabilità di Folgorazione', descrizione: { prima: 'accessorio, attiva Dio del tuono', dopo: SFIDA('Foggy Day', 50) } },
];

const CARTOLINA = { chiave: 'regalo/cartolina', prima: 'Regalo economico', dopo: 'Si spedisce a un Confidente dalla cassetta rossa della posta di Yongen-Jaya: +1 punto affinità' };

export const migration272: Migration = {
  id: 272,
  name: 'testi_degli_effetti_secondo_la_guida',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'catalogo_oggetto')) { logger.warn({ migrazione: 272 }, 'catalogo assente: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const esiti: EsitoTesto[] = [];
    for (const c of CORREZIONI) esiti.push(correggiTestoCatalogo(db, c.chiave, 'effetto', c.prima, c.dopo));
    // i testi già giusti: «già conforme», oppure diversi (la riga resta com'è; l'audit lo dice)
    for (const c of CONFORMI) esiti.push(correggiTestoCatalogo(db, c.chiave, 'effetto', [], c.testo));
    for (const a of ACCESSORI) {
      esiti.push(correggiTestoCatalogo(db, a.chiave, 'effetto', '', a.effetto));
      if (a.descrizione) esiti.push(correggiTestoCatalogo(db, a.chiave, 'descrizione', a.descrizione.prima, a.descrizione.dopo));
    }
    esiti.push(correggiTestoCatalogo(db, CARTOLINA.chiave, 'effetto', CARTOLINA.prima, CARTOLINA.dopo));
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const conteggi = {
      corretti: esiti.filter((e) => e.esito === 'corretto').length,
      effettiScritti: esiti.filter((e) => e.esito === 'corretto' && e.campo === 'effetto').length,
      descrizioniScritte: esiti.filter((e) => e.esito === 'corretto' && e.campo === 'descrizione').length,
      giaConformi: esiti.filter((e) => e.esito === 'già conforme alla guida').length,
      nonToccati: esiti.filter((e) => /non toccat/.test(e.esito)).length,
      accessoriSenzaEffetto: db.prepare("SELECT COUNT(*) FROM main.catalogo_oggetto WHERE categoria = 'accessorio' AND nascosto = 0 AND effetto = ''").pluck().get() as number,
    };
    if (conteggi.corretti) invalidaCacheDiGioco();
    scriviAuditTesti(db, AUDIT, 272, { fonti: [FONTE_OGGETTI, FONTE_ACCESSORI, FONTE_REGALI], conteggi, esiti });
    logger.info({ migrazione: 272, ...conteggi }, 'Catalogo: testi degli effetti secondo la guida (O5-08, accessori, Cartolina)');
  },
};
