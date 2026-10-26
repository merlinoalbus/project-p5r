// ============================================================
// Migrazione 278 — gli accessori della guida in ogni categoria e le offerte visibili senza effetto, secondo la guida (Ondata 5, Lotto F)
// ============================================================
//
// Decisione 21 dell'utente: «Gli effetti degli oggetti ai fini di questa app non è necessario gestirli se non come informazione testuale. Non
// sono d'accordo nel rimandare attività a fasi successive»: il testo dell'effetto vive in `catalogo_oggetto.effetto` e i testi sbagliati si
// correggono secondo la guida italiana (prevale il dato Royal). Revisione avversariale del lotto F (rilievo alto): la 272 completava solo le
// schede di categoria «accessorio», ma la categoria nei dati non dice sempre che cos'è l'oggetto (O5-09 contava gli accessori del listino).
//
// Censimento completo (2026-10-26): le 301 righe della pagina Accessori [A] confrontate con tutte le schede del catalogo con lo stesso nome,
// di qualunque categoria, e tutte le offerte visibili confrontate con la loro scheda (effetto vuoto o generico, senza statistiche). Esiti:
//   1. accessori della guida in un'altra categoria, con l'effetto vuoto o generico: Bracciale confuso e Pend. disperazione («arma», in vendita al
//      Palazzo di Niijima), Collana magnetica («regalo», Prossimo Asso: «Regalo od oggetto»), Maschera del ladro («regalo», Discount Rocinante:
//      vuoto), Cintura eccentrica, Cintura del fastidio, Fermaglio per gatti, Cristallo della boria e Batterie portatili («altro»). Dove la
//      descrizione ripeteva l'effetto in poche parole diventa il modo di ottenerli secondo [A], come nella 272;
//   2. accessori di categoria «accessorio» con un testo generico o sbagliato: Cintura di Idaten («Accessorio equipaggiabile»; [A] scrive
//      «Masukaja», l'abilità Auto-Masuku lancia Masukukaja), Cintura della forza («accessorio: resistenza fisica»), Fascia capel. bianca («+50
//      HP»; [A]: Ondata vitale, HP massimi +30%, Rs +5), Collare di Ardhanari («a 1 nemico»; [A]: a tutti i nemici), Anello del gelo («a tutti i
//      nemici»; [A]: Bufu a un nemico), Cint. colpo speciale («ad area»; [A]: a un nemico), Cav. della ribellione e Cav. rivoluzione (manca «per
//      3 turni»; Rivoluzione è «di tutti gli alleati», non «di tutti sul campo»), Amul. curat. a spir. («Madiarahan»: l'abilità è Mediarahan),
//      Luna nera (senza abilità né statistica: [A] «Discepolo sagace / Fr +5»);
//   3. tre schede «accessorio» con il nome inglese che sono oggetti della pagina Oggetti [O] (identità doppie, da unire su elenco approvato,
//      decisione 21 c): Inspired Hand Mirror (lo Spec. senso spirit., «Accessorio legato a un abilità passiva», testo che la 270 giudicava già
//      sbagliato nell'offerta di Tanaka), Holy Cloth e Ouija Board (Sacra sindone e Tavola Ouija, «Possibilità di morte istantanea…»): lo stesso
//      testo della guida delle schede gemelle, finché l'unione non le toglie;
//   4. offerte visibili la cui scheda non ha effetto e che la guida descrive: Proteine d'importazione (Prossimo Asso, [O]: 30% degli HP di un
//      alleato) e Carne in scatola speciale (MealPort, [O]: 40 HP di tutti gli alleati);
//   5. l'offerta `tsurukame-diamond/braccialetti-tematici` (12.800 ¥, «Braccialetti stelle, circolare, bianco, nero») è una seconda copia delle
//      quattro offerte dei braccialetti dello stesso negozio, ciascuna a 12.800 ¥ [A]: si nasconde come la `fasce-colorate` (già nascosta) e
//      come la 277, solo se nessun dato la usa;
//   6. le descrizioni che erano solo l'etichetta della categoria: «accessorio» su cinque accessori (Cintura resistente, Pendente del Leblanc,
//      Specchio del damerino, Intimo del capo: premi di Sojiro per gli esami; Velo invisibile: ricompensa finale del Covo) diventa il modo di
//      ottenerli secondo [A]; «oggetto chiave» su sei oggetti chiave (Seme tristezza blu, le cinque Lettere di raccomandazione) si svuota.
// Fuori da qui, con l'esito nell'audit: i regali con l'effetto «Regalo» (il loro effetto è l'affinità, che vive in `confidente_regalo`), gli
// oggetti chiave senza effetto di battaglia, la Fascia capel. bianca R (la guida le dà «Rs +5» come alla base, le altre varianti R crescono di
// 3: resta «RS +8», da verificare in gioco) e le identità doppie.
//
// Conservativa: ogni testo si scrive con `correggiTestoCatalogo` (solo schede della guida mai corrette dall'utente e solo se il testo è quello
// atteso); altrimenti resta e l'audit lo dice. Nessuna voce del Diario cambia. Idempotente. Audit `audit-278-accessori-della-guida`, con il
// conteggio degli accessori senza effetto in ogni categoria (le schede della guida Accessori di qualunque categoria).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { FONTE_ACCESSORI, FONTE_OGGETTI, correggiTestoCatalogo, improntaDiario, scriviAuditTesti, type EsitoTesto } from './testiOndata5.js';
import { nascondiOffertaDellaGuida } from './277_collana_cremisi_di_37_gradi.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-278-accessori-della-guida';
const errore = (motivo: string): never => { throw new Error(`278: ${motivo}; nessuna modifica applicata.`); };

const RICHIESTA = (nome: string) => `Ricompensa della Richiesta «${nome}»`;

/** Le schede da completare o correggere: effetto atteso → effetto della guida; `descrizione` (attesa → nuova) solo dove la guida dice come si ottengono. */
const SCHEDE: ReadonlyArray<{ chiave: string; prima: string; dopo: string; descrizione?: { prima: string; dopo: string } }> = [
  // 1. accessori della guida in un'altra categoria
  { chiave: 'arma/bracciale-confuso', prima: '', dopo: 'Attiva Pulinpa: probabilità alta di infliggere Confusione a un nemico' },
  { chiave: 'arma/pend-disperazione', prima: '', dopo: 'Attiva Annulla Disperazione: previene la Disperazione' },
  { chiave: 'regalo/collana-magnetica', prima: 'Regalo od oggetto', dopo: 'Attiva Guarigione rapida: dimezza il tempo che serve per guarire dalle alterazioni negative' },
  { chiave: 'regalo/maschera-del-ladro', prima: '', dopo: 'Attiva Annulla Soggiogamento: previene il Soggiogamento' },
  { chiave: 'altro/cintura-eccentrica', prima: '', dopo: 'Attiva Potenzia alterazioni: aumenta la probabilità di infliggere alterazioni negative',
    descrizione: { prima: 'aumenta le probabilità di infliggere alterazioni negative', dopo: RICHIESTA('Falsità in scena') } },
  { chiave: 'altro/cintura-del-fastidio', prima: '', dopo: 'Attiva Ambiente benevolo: aumenta la probabilità di infliggere alterazioni negative con pioggia o neve',
    descrizione: { prima: '', dopo: RICHIESTA('Il senso della vita nella terza età') } },
  { chiave: 'altro/fermaglio-per-gatti', prima: '', dopo: 'Attiva Sukukaja: aumenta Precisione ed Elusione di un alleato per 3 turni',
    descrizione: { prima: '', dopo: RICHIESTA('Se scomparissero i gatti') } },
  { chiave: 'altro/cristallo-della-boria', prima: '', dopo: 'Attiva Signore della difesa: Rakukaja all’inizio della battaglia',
    descrizione: { prima: '', dopo: 'Ricompensa per i 3 Semi della Bramosia del Palazzo di Shido' } },
  { chiave: 'altro/batterie-portatili', prima: '', dopo: 'Attiva Potenzia Folgorazione: aumenta la probabilità di infliggere Folgorazione',
    descrizione: { prima: 'abilità Potenzia Folgorazione', dopo: 'Negozio Softair Untouchable (dall’arco del Palazzo di Madarame) e un forziere del Palazzo di Kaneshiro (Sala d’ingresso)' } },
  // 2. accessori di categoria «accessorio» con un testo generico o sbagliato
  { chiave: 'accessorio/cintura-di-idaten', prima: 'Accessorio equipaggiabile', dopo: 'Attiva Auto-Masuku: Masukukaja in automatico all’inizio della battaglia' },
  { chiave: 'accessorio/cintura-della-forza', prima: 'accessorio: resistenza fisica', dopo: 'Attiva Resiste att. fisici: aumenta la resistenza agli attacchi fisici e annulla la debolezza relativa' },
  { chiave: 'accessorio/fascia-capel-bianca', prima: '+50 HP', dopo: '+Ondata vitale (HP +30%) / RS +5' },
  { chiave: 'accessorio/collare-di-ardhanari', prima: '+Inferno di fuoco (danni di Fuoco gravi a 1 nemico)', dopo: '+Inferno di fuoco (danni di Fuoco gravi a tutti i nemici)' },
  { chiave: 'accessorio/anello-del-gelo', prima: '+Bufu (danni di Ghiaccio lievi a tutti i nemici)', dopo: '+Bufu (danni di Ghiaccio lievi a 1 nemico)' },
  { chiave: 'accessorio/cint-colpo-speciale', prima: '+Centro perfetto (danni da Arma da fuoco pesanti ad area con alta probabilità di critico)', dopo: '+Centro perfetto (danni da Arma da fuoco gravi a 1 nemico con alta probabilità di critico)' },
  { chiave: 'accessorio/cav-della-ribellione', prima: '+Ribellione (aumenta la probabilità di critico di 1 alleato)', dopo: '+Ribellione (aumenta la probabilità di critico di 1 alleato per 3 turni)' },
  { chiave: 'accessorio/cav-rivoluzione', prima: '+Rivoluzione (aumenta la probabilità di critico di tutti sul campo)', dopo: '+Rivoluzione (aumenta la probabilità di critico di tutti gli alleati per 3 turni)' },
  { chiave: 'accessorio/amul-curat-a-spir', prima: '+Madiarahan (recupero completo degli HP di tutto il gruppo)', dopo: '+Mediarahan (recupero completo degli HP di tutto il gruppo)' },
  { chiave: 'accessorio/luna-nera', prima: '+Probabilità di critico (alta)', dopo: '+Discepolo sagace (aumenta la probabilità di critico) / FR +5' },
  // 3. identità doppie con il nome inglese: il testo della guida delle schede gemelle
  { chiave: 'accessorio/inspired-hand-mirror', prima: 'Accessorio legato a un abilità passiva', dopo: 'Attiva Alito mefitico: aumenta la probabilità di infliggere alterazioni negative a un nemico' },
  { chiave: 'accessorio/holy-cloth', prima: 'Possibilità di morte istantanea di tipo Sacro', dopo: 'Probabilità media che un’abilità sacra uccida all’istante tutti i nemici' },
  { chiave: 'accessorio/ouija-board', prima: 'Possibilità di morte istantanea di tipo Maledetto', dopo: 'Probabilità media che un’abilità maledetta uccida all’istante tutti i nemici' },
  // 4. offerte visibili senza effetto, descritte dalla pagina Oggetti
  { chiave: 'regalo/proteine-d-importazione', prima: '', dopo: 'Ripristina il 30 percento degli HP di un alleato' },
  { chiave: 'cibo/carne-in-scatola-speciale', prima: '', dopo: 'Ripristina 40 HP di tutti gli alleati' },
];

const SOJIRO = (esami: string) => `Da Sojiro, dopo un ottimo punteggio negli esami della ${esami}`;
/**
 * 6. Le descrizioni che erano solo l'etichetta della categoria («accessorio», «oggetto chiave»): un'etichetta si vede solo se ha senso (regola
 * dell'utente). Per i cinque accessori diventa il modo di ottenerli secondo [A]; per gli oggetti chiave senza altro testo si svuota.
 */
const DESCRIZIONI: ReadonlyArray<{ chiave: string; prima: string; dopo: string }> = [
  { chiave: 'accessorio/cintura-resistente', prima: 'accessorio', dopo: SOJIRO('prima sessione di metà semestre') },
  { chiave: 'accessorio/pendente-del-leblanc', prima: 'accessorio', dopo: SOJIRO('seconda sessione di metà semestre') },
  { chiave: 'accessorio/specchio-del-damerino', prima: 'accessorio', dopo: SOJIRO('prima sessione di fine semestre') },
  { chiave: 'accessorio/intimo-del-capo', prima: 'accessorio', dopo: SOJIRO('seconda sessione di fine semestre') },
  { chiave: 'accessorio/velo-invisibile', prima: 'accessorio', dopo: 'Scatolone nello scaffale della soffitta del Leblanc, dopo aver ottenuto tutte le ricompense del Covo dei Ladri e parlato con Jose' },
  { chiave: 'chiave/seme-tristezza-blu', prima: 'oggetto chiave', dopo: '' },
  { chiave: 'chiave/prima-lettera-di-raccomandazione', prima: 'oggetto chiave', dopo: '' },
  { chiave: 'chiave/seconda-lettera-di-raccomandazione', prima: 'oggetto chiave', dopo: '' },
  { chiave: 'chiave/terza-lettera-di-raccomandazione', prima: 'oggetto chiave', dopo: '' },
  { chiave: 'chiave/quarta-lettera-di-raccomandazione', prima: 'oggetto chiave', dopo: '' },
  { chiave: 'chiave/quinta-e-ultima-lettera-di-raccomandazione', prima: 'oggetto chiave', dopo: '' },
];

/** 5. L'offerta doppia dei quattro braccialetti di Tsurukame Diamond. */
const OFFERTA_DOPPIA = 'tsurukame-diamond/braccialetti-tematici';

/** Le schede della guida Accessori fuori dalla categoria «accessorio» (272 e qui), per il conteggio degli accessori senza effetto. */
const ACCESSORI_ALTROVE = ['arma/bracciale-confuso', 'arma/pend-disperazione', 'regalo/collana-magnetica', 'regalo/maschera-del-ladro',
  'altro/cintura-eccentrica', 'altro/cintura-del-fastidio', 'altro/fermaglio-per-gatti', 'altro/cristallo-della-boria', 'altro/batterie-portatili',
  'altro/perla-dellattaccamento', 'consumabile/corona-della-salvezza'] as const;
/** I testi che non dicono che cosa fa un accessorio (quelli trovati dal censimento, tolti qui). */
const GENERICI = ['Accessorio equipaggiabile', 'accessorio: resistenza fisica', 'Accessorio legato a un abilità passiva', 'Regalo od oggetto', 'Regalo'] as const;

export const migration278: Migration = {
  id: 278,
  name: 'accessori_e_offerte_senza_effetto',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'catalogo_oggetto')) { logger.warn({ migrazione: 278 }, 'catalogo assente: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const esiti: EsitoTesto[] = [];
    for (const s of SCHEDE) {
      esiti.push(correggiTestoCatalogo(db, s.chiave, 'effetto', s.prima, s.dopo));
      if (s.descrizione) esiti.push(correggiTestoCatalogo(db, s.chiave, 'descrizione', s.descrizione.prima, s.descrizione.dopo));
    }
    for (const s of DESCRIZIONI) esiti.push(correggiTestoCatalogo(db, s.chiave, 'descrizione', s.prima, s.dopo));
    const doppia = esisteTabella(db, 'articolo') ? nascondiOffertaDellaGuida(db, OFFERTA_DOPPIA, 278) : { esito: 'articoli assenti', nascoste: 0, usi: [] };
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const segnaposto = ACCESSORI_ALTROVE.map(() => '?').join(', ');
    const conteggi = {
      corretti: esiti.filter((e) => e.esito === 'corretto').length,
      effettiScritti: esiti.filter((e) => e.esito === 'corretto' && e.campo === 'effetto').length,
      descrizioniScritte: esiti.filter((e) => e.esito === 'corretto' && e.campo === 'descrizione').length,
      giaConformi: esiti.filter((e) => e.esito === 'già conforme alla guida').length,
      nonToccati: esiti.filter((e) => /non toccat/.test(e.esito)).length,
      offertaDoppia: doppia.esito,
      // gli accessori della guida in ogni categoria: senza effetto, o con un testo che non dice che cosa fanno
      accessoriSenzaEffetto: db.prepare(`SELECT COUNT(*) FROM main.catalogo_oggetto WHERE nascosto = 0 AND effetto = ''
        AND (categoria = 'accessorio' OR chiave IN (${segnaposto}))`).pluck().get(...ACCESSORI_ALTROVE) as number,
      accessoriConTestoGenerico: db.prepare(`SELECT COUNT(*) FROM main.catalogo_oggetto WHERE nascosto = 0 AND effetto IN (${GENERICI.map(() => '?').join(', ')})
        AND (categoria = 'accessorio' OR chiave IN (${segnaposto}))`).pluck().get(...GENERICI, ...ACCESSORI_ALTROVE) as number,
    };
    const cambiate = conteggi.corretti + doppia.nascoste;
    if (cambiate) invalidaCacheDiGioco();
    scriviAuditTesti(db, AUDIT, 278, {
      fonti: [FONTE_ACCESSORI, FONTE_OGGETTI], conteggi, esiti, offertaDoppia: { chiave: OFFERTA_DOPPIA, ...doppia },
      fuoriDaQui: [
        'regali con l’effetto «Regalo»: il loro effetto è l’affinità, in confidente_regalo',
        'accessorio/fascia-capel-bianca-r: la guida dà «Rs +5» come alla base, le altre varianti R crescono di 3; resta «RS +8», da verificare in gioco',
        'identità doppie (Spec. senso spirit. ×3, Sacra sindone e Tavola Ouija ×2, Cristallo della boria ×2): unione su elenco approvato, decisione 21 c',
        'accessorio/maschera-del-ladro e -2: hanno «Hades Harp» fra i nomi e le statistiche dell’Arpa dell’Ade; nome e identità da verificare (la Maschera del ladro della guida è regalo/maschera-del-ladro)',
      ],
    }, cambiate);
    logger.info({ migrazione: 278, ...conteggi }, 'Catalogo: accessori della guida in ogni categoria e offerte senza effetto');
  },
};
