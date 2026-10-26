// ============================================================
// Migrazione 239 — le televendite: due articoli distinti per Set A e Set B, in alternativa, con prezzo e contenuto propri (L13, decisione 4)
// ============================================================
//
// Richiesta dell'utente (2026-10-26) sulla voce «Leblanc: esaminare la TV per il Canale di televendite»: «tv shopping con due prodotti da
// scegliere gestito malissimo... i prodotti per altro sono rimasti in inglese... e non posso effettivamente scegliere». Decisione 4 già
// approvata: «Televendite: due articoli distinti per Set A e Set B, ciascuno con prezzo e contenuto propri». Fino a qui il negozio «Home
// Shopping in TV» aveva UN articolo per domenica, con il nome inglese dei due set insieme, il prezzo del solo Set A e il contenuto in prosa.
//
// Dati di gioco (`gioco.db`), append-only e conservativa; i dati vengono dalla guida italiana (pagine «Soluzione settimana N», «Accessori» e
// «Oggetti», lette il 2026-10-26), che prevale:
//   (1) **Oggetti del catalogo** che i set contengono e il catalogo non aveva (12, dalle pagine «Accessori» e «Oggetti»): `origine='seed'`,
//       fonte «guida». Uno già presente con la stessa chiave non si tocca. (1b) Il nome «Flan al te matcha» (oggetto e articolo del Body
//       Chop, gli unici del catalogo senza l'accento) diventa «Flan al tè matcha», come nella guida, solo se è ancora quello di seed.
//   (2) **Articoli**: per ognuna delle 20 domeniche, Set A e Set B con nome italiano, prezzo, fonte (la pagina della settimana) e condizioni:
//       la domenica, quel giorno solo, e «non insieme all'altro set» (`non` + `articolo`: è il modo di dichiarare un'alternativa, valutato
//       ovunque dal motore della disponibilità). Un articolo già presente non si tocca.
//   (3) **Contenuto** dei set in `ricompensa_oggetto` (fonte «articolo»: lo stesso dato degli scambi del Gachapon), con le copie.
//   (4) **Vecchi articoli** (i 20 «Set A / Set B» in inglese) e i loro 20 oggetti fittizi `altro/…`: non si cancellano, diventano nascosti
//       (`nascosto=1`): una voce o una partita che li cita li risolve ancora. La nota del negozio dice i fatti in italiano.
//   (5) **Voci del Diario** (16 voci d'acquisto delle televendite): una proposta «da completare» per voce (`proposta_conversione_voce`,
//       lotto «L13-televendite») con i due set come effetti «articolo», il collegamento al negozio e, da togliere, gli effetti che citano il
//       vecchio articolo. Si APPLICA, con la funzione della pagina «Da completare» (`applicaPropostaConversione`), solo fuori dal periodo
//       validato (04-01…05-31) e solo se nessuna partita cita la voce (come la 238); altrimenti resta proposta, da decidere.
//   (6) **Audit** in `dati_guida.audit-239-televendite`: un'esecuzione per giro, con i conteggi, gli oggetti nuovi, la mappa vecchio → set
//       e ogni riferimento delle partite ai vecchi articoli (letti in sola lettura: nessuna riga delle partite cambia).
//
// Controlli (un controllo che non torna annulla tutto): lo schema `utente` identico; ogni «non» punta a un articolo che esiste; ogni set ha
// il suo contenuto; il negozio ha 40 articoli visibili; ogni condizione scritta si rilegge identica. Idempotente: `ON CONFLICT DO NOTHING`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import { getDb, type AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { leggiCondizioniSalvate, ordineGioco } from '../../../shared/condizioniSpillo.js';
import { applicaPropostaConversione, elencaProposteConversione } from '../../services/proposteConversioneService.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-239-televendite';
const LOTTO = 'L13-televendite';
const NEGOZIO = 'home-shopping-tv';
const GUIDA = 'https://www.allgamestaff.it/persona-5-royal/';
/** (1b) Il nome dell'oggetto del Set regalo giapponese come lo scrive la guida italiana, e quello di seed rimasto senza accento. */
const NOME_FLAN = 'Flan al tè matcha';
const NOME_FLAN_SENZA_ACCENTO = 'Flan al te matcha';
const errore = (motivo: string): never => { throw new Error(`239: ${motivo}; nessuna modifica applicata.`); };

/** Il periodo del Diario validato dall'utente (giorni di gioco, estremi compresi): lì nessuna voce si converte senza il suo sì. */
const nelPeriodoValidato = (data: string): boolean => ordineGioco(data) >= ordineGioco('04-01') && ordineGioco(data) <= ordineGioco('05-31');

interface SetTv { slug: string; nome: string; prezzo: number; contenuto: Array<[string, number]> }
interface DomenicaTv { data: string; settimana: number; vecchio: string; a: SetTv; b: SetTv }

/** Le 20 domeniche delle televendite: il vecchio articolo unico e i due set della guida italiana (nome, prezzo, contenuto per chiave del catalogo). */
const DOMENICHE: DomenicaTv[] = [
  { data: '04-24', settimana: 2, vecchio: 'spring-awake-set-share-of-spring-set',
    a: { slug: 'set-sveglia-primaverile', nome: 'Set sveglia primaverile', prezzo: 1680, contenuto: [['accessorio/cerotto-alla-caffeina', 1], ['consumabile/gocce-per-occhioni', 10], ['consumabile/te-caldo-e-aspro', 10]] },
    b: { slug: 'set-condiv-primaverile', nome: 'Set Condiv. primaverile', prezzo: 5980, contenuto: [['consumabile/sakura-mochi', 5], ['consumabile/pacco-di-frutta-primav', 1], ['consumabile/festa-in-lattina', 1]] } },
  { data: '05-01', settimana: 4, vecchio: 'military-ration-set-muscle-workout-set',
    a: { slug: 'set-della-razione-militare', nome: 'Set della razione militare', prezzo: 1980, contenuto: [['consumabile/porzione-di-torimeshi', 3], ['consumabile/razione-militare', 2], ['consumabile/razione-di-polpette', 2]] },
    b: { slug: 'set-dellallenamento', nome: 'Set dell’allenamento', prezzo: 4980, contenuto: [['consumabile/frullato-proteico', 2], ['consumabile/frullato-iperproteico', 2]] } },
  { data: '05-08', settimana: 4, vecchio: 'relaxation-set-bio-nutrients-set',
    a: { slug: 'set-rilassante', nome: 'Set rilassante', prezzo: 4600, contenuto: [['consumabile/olio-del-recupero', 1], ['consumabile/gel-rilassante', 3], ['consumabile/capsula-dallerta', 3]] },
    b: { slug: 'set-bionutrienti', nome: 'Set Bionutrienti', prezzo: 2680, contenuto: [['materiale/megafertilizzante', 1], ['regalo/energia-del-giardino', 5]] } },
  { data: '05-15', settimana: 5, vecchio: 'allergy-relief-pack-cosmetic-cure-gift',
    a: { slug: 'pacchetto-allevia-allergie', nome: 'Pacchetto allevia allergie', prezzo: 1680, contenuto: [['accessorio/maschera-calmante', 2], ['consumabile/gocce-per-occhioni', 20]] },
    b: { slug: 'dono-cure-cosmetiche', nome: 'Dono cure cosmetiche', prezzo: 14800, contenuto: [['regalo/diffusore-di-aromi', 1], ['regalo/multivitaminico', 1]] } },
  { data: '05-22', settimana: 6, vecchio: 'muscle-plus-set-outdoors-kit',
    a: { slug: 'set-muscoli-plus', nome: 'Set Muscoli Plus', prezzo: 4980, contenuto: [['consumabile/muscoli-dacciaio-s', 2], ['consumabile/scorza-dura-s', 2], ['consumabile/pie-veloce-s', 2]] },
    b: { slug: 'kit-di-avventure-allaperto', nome: 'Kit di avventure all’aperto', prezzo: 7980, contenuto: [['consumabile/fiamma-ossidrica', 3], ['consumabile/ghiaccio-secco', 3], ['consumabile/bobina-magnetica', 3]] } },
  { data: '05-29', settimana: 7, vecchio: 'japanese-gift-set-folding-screen-set',
    a: { slug: 'set-regalo-giapponese', nome: 'Set regalo giapponese', prezzo: 3980, contenuto: [['regalo/ventaglio-sakura', 1], ['regalo/portachiavi-katana', 1], ['regalo/flan-al-te-matcha', 1]] },
    b: { slug: 'set-paravento-giapponese', nome: 'Set Paravento giapponese', prezzo: 4980, contenuto: [['accessorio/strang-antielettr', 1], ['accessorio/strang-antivento', 1]] } },
  { data: '06-19', settimana: 10, vecchio: 'supportive-gift-set-busy-revival-set',
    a: { slug: 'set-regalo-di-sostegno', nome: 'Set Regalo di sostegno', prezzo: 9980, contenuto: [['regalo/sveglia-chiassosa', 1], ['regalo/maschera-di-bellezza', 1]] },
    b: { slug: 'set-risveglio-impegnato', nome: 'Set Risveglio impegnato', prezzo: 9980, contenuto: [['consumabile/rianidrin', 3], ['consumabile/recup-ro-100-mg', 10]] } },
  { data: '06-26', settimana: 11, vecchio: 'dark-power-set-cursed-tools-set',
    a: { slug: 'set-oscuro-potere', nome: 'Set oscuro potere', prezzo: 1980, contenuto: [['materiale/roccia-nera', 2], ['materiale/veste-nera', 1]] },
    b: { slug: 'set-di-strumenti-maledetti', nome: 'Set di strumenti maledetti', prezzo: 9980, contenuto: [['consumabile/chiodo-ossidato', 3], ['consumabile/bambola-di-paglia', 10]] } },
  { data: '07-03', settimana: 12, vecchio: 'body-building-set-calm-mind-set',
    a: { slug: 'set-culturismo', nome: 'Set Culturismo', prezzo: 12800, contenuto: [['consumabile/proteine-dimportazione', 1], ['consumabile/frullato-iperproteico', 3], ['consumabile/frullato-proteico', 3]] },
    b: { slug: 'set-mente-calma', nome: 'Set Mente calma', prezzo: 12800, contenuto: [['consumabile/ambra-grigia-fr', 1], ['consumabile/ambra-grigia-rs', 1], ['consumabile/ambra-grigia-fo', 1]] } },
  { data: '08-07', settimana: 17, vecchio: 'phantom-thief-set-heroic-set',
    a: { slug: 'set-ladro-fantasma', nome: 'Set Ladro Fantasma', prezzo: 7980, contenuto: [['consumabile/grimaldello', 5], ['consumabile/palla-evanescente', 3], ['consumabile/muro-di-fumo', 3]] },
    b: { slug: 'set-eroico', nome: 'Set eroico', prezzo: 8980, contenuto: [['consumabile/lama-a-vuoto', 4], ['consumabile/ruota-psicocinetica', 4], ['consumabile/spaccanucleo', 4]] } },
  { data: '08-14', settimana: 18, vecchio: 'drink-set-floral-gift-set',
    a: { slug: 'set-di-bibite', nome: 'Set di bibite', prezzo: 2980, contenuto: [['consumabile/second-maid', 20], ['consumabile/acqua-della-rinascita', 20]] },
    b: { slug: 'set-regalo-floreale', nome: 'Set regalo floreale', prezzo: 2980, contenuto: [['regalo/vaso-di-vetro', 1], ['regalo/cestino-di-fiori', 1]] } },
  { data: '09-25', settimana: 23, vecchio: 'phantom-thief-set-2-phantom-thief-fun-set',
    a: { slug: 'set-ladro-fantasma-2', nome: 'Set Ladro Fantasma 2', prezzo: 8980, contenuto: [['consumabile/aroma-calmante', 3], ['consumabile/muro-di-fumo', 5], ['consumabile/grimaldello', 5]] },
    b: { slug: 'set-divertimento-dei-ladri', nome: 'Set divertimento dei Ladri', prezzo: 2000, contenuto: [['consumabile/wafer-dei-ladri', 5], ['regalo/cartolina', 3]] } },
  { data: '10-02', settimana: 25, vecchio: 'pumpkin-ghost-set-haunted-repel-set',
    a: { slug: 'set-zucca-stregata', nome: 'Set zucca stregata', prezzo: 14800, contenuto: [['accessorio/collana-lanterna', 1], ['consumabile/zuppa-di-zucca', 5]] },
    b: { slug: 'set-scaccia-fantasmi', nome: 'Set scaccia fantasmi', prezzo: 9980, contenuto: [['consumabile/acqua-battesimale', 5], ['consumabile/acqua-benedetta', 5]] } },
  { data: '11-06', settimana: 29, vecchio: 'sturdy-ointment-set-inner-muscle-set',
    a: { slug: 'set-unguento-resistente', nome: 'Set unguento resistente', prezzo: 19800, contenuto: [['consumabile/unguento-fisico', 3], ['consumabile/unguento-magico', 3]] },
    b: { slug: 'set-dei-muscoli-interiori', nome: 'Set dei muscoli interiori', prezzo: 14800, contenuto: [['consumabile/salvezza-s', 1], ['consumabile/trambusto-s', 5]] } },
  { data: '11-13', settimana: 30, vecchio: 'instant-spray-set-meditative-set',
    a: { slug: 'set-spray-istantaneo', nome: 'Set spray istantaneo', prezzo: 34500, contenuto: [['consumabile/spray-supremo', 1], ['consumabile/spray-detergente', 5], ['consumabile/spray-rapido', 5]] },
    b: { slug: 'set-di-meditazione', nome: 'Set di meditazione', prezzo: 29800, contenuto: [['consumabile/nirvana-ma', 1], ['consumabile/nirvana-rs', 1], ['consumabile/nirvana-fo', 1]] } },
  { data: '11-27', settimana: 32, vecchio: 'ishiyaki-potato-set-limited-sweets-set',
    a: { slug: 'set-yaki-imo', nome: 'Set Yaki-Imo', prezzo: 9800, contenuto: [['consumabile/yaki-imo-leggendario', 3], ['consumabile/beni-azuma', 10]] },
    b: { slug: 'set-dolci-speciali', nome: 'Set dolci speciali', prezzo: 4800, contenuto: [['consumabile/melon-pan', 3], ['consumabile/dango-lunare', 5]] } },
  { data: '12-11', settimana: 33, vecchio: 'super-detox-set-fancy-magatama-set',
    a: { slug: 'set-super-disintossicante', nome: 'Set super-disintossicante', prezzo: 39800, contenuto: [['consumabile/aroma-rinfrescante', 3], ['consumabile/olio-del-recupero', 5]] },
    b: { slug: 'set-magatama-preziosi', nome: 'Set magatama preziosi', prezzo: 16800, contenuto: [['consumabile/magatama-infernale', 3], ['consumabile/magatama-del-gelo', 3], ['consumabile/magatama-ciclonico', 3], ['consumabile/magatama-elettrico', 3]] } },
  { data: '01-15', settimana: 37, vecchio: 'lucky-worker-bag-lucky-muscle-bag',
    a: { slug: 'borsa-fortunata-lavoratore', nome: 'Borsa fortunata lavoratore', prezzo: 44800, contenuto: [['accessorio/cravatta-rinvigorente', 1], ['consumabile/unguento-fisico', 3], ['consumabile/unguento-magico', 3]] },
    b: { slug: 'borsa-fortunata-dei-muscoli', nome: 'Borsa fortunata dei muscoli', prezzo: 39800, contenuto: [['consumabile/proteine-dimportazione', 3], ['consumabile/nirvana-fr', 3], ['consumabile/trambusto-s', 5]] } },
  { data: '01-22', settimana: 38, vecchio: 'talisman-set-sweet-delight-set',
    a: { slug: 'set-di-talismani', nome: 'Set di talismani', prezzo: 12800, contenuto: [['consumabile/rasetsu-ofuda', 3], ['consumabile/idaten-ofuda', 3], ['consumabile/kongou-ofuda', 3]] },
    b: { slug: 'set-della-dolce-delizia', nome: 'Set della dolce delizia', prezzo: 29800, contenuto: [['consumabile/daifuku-alla-fragola', 3], ['consumabile/amazake-definitivo', 20], ['consumabile/oh-shiruko', 20]] } },
  { data: '01-29', settimana: 39, vecchio: 'energetic-set-delicious-revival-set',
    a: { slug: 'set-energetico', nome: 'Set energetico', prezzo: 49800, contenuto: [['consumabile/salvezza-s', 3], ['consumabile/muscoli-dacciaio-s', 5], ['consumabile/scorza-dura-s', 5], ['consumabile/pie-veloce-s', 5]] },
    b: { slug: 'set-della-resurrezione', nome: 'Set della resurrezione', prezzo: 69800, contenuto: [['consumabile/pappa-reale-r', 2], ['consumabile/melon-pan', 3]] } },
];

/** Gli oggetti dei set che il catalogo non aveva, dalle pagine «Accessori» e «Oggetti» della guida (abilità ed effetto come li scrive la guida). */
const OGGETTI_NUOVI: Array<{ chiave: string; categoria: 'accessorio' | 'consumabile'; sottocategoria: string | null; nome: string; effetto: string; descrizione: string; pagina: 'accessori' | 'oggetti' }> = [
  { chiave: 'accessorio/maschera-calmante', categoria: 'accessorio', sottocategoria: null, nome: 'Maschera calmante', effetto: 'Resiste Confusione: diminuisce le chance di essere colpiti da Confusione', descrizione: 'Televendite: «Pacchetto allevia allergie» (15 maggio)', pagina: 'accessori' },
  { chiave: 'accessorio/strang-antielettr', categoria: 'accessorio', sottocategoria: null, nome: 'Strang. antielettr.', effetto: 'Schiva elettricità: aumenta l’elusione dalle abilità elettriche', descrizione: 'Televendite: «Set Paravento giapponese» (29 maggio)', pagina: 'accessori' },
  { chiave: 'accessorio/strang-antivento', categoria: 'accessorio', sottocategoria: null, nome: 'Strang. antivento', effetto: 'Schiva vento: aumenta l’elusione dalle abilità di Vento', descrizione: 'Televendite: «Set Paravento giapponese» (29 maggio)', pagina: 'accessori' },
  { chiave: 'accessorio/collana-lanterna', categoria: 'accessorio', sottocategoria: null, nome: 'Collana lanterna', effetto: 'Amplifica fuoco: potenzia le abilità di Fuoco del 50% (cumulabile)', descrizione: 'Televendite: «Set zucca stregata» (2 ottobre)', pagina: 'accessori' },
  { chiave: 'accessorio/cravatta-rinvigorente', categoria: 'accessorio', sottocategoria: null, nome: 'Cravatta rinvigorente', effetto: 'Guarigione ist.: riduce a 1 turno il tempo per guarire dalle alterazioni negative', descrizione: 'Televendite: «Borsa fortunata lavoratore» (15 gennaio)', pagina: 'accessori' },
  { chiave: 'consumabile/fiamma-ossidrica', categoria: 'consumabile', sottocategoria: 'battaglia', nome: 'Fiamma ossidrica', effetto: 'Infligge 50 danni da fuoco a tutti i nemici', descrizione: 'Televendite: «Kit di avventure all’aperto» (22 maggio); negoziazione (Moloch)', pagina: 'oggetti' },
  { chiave: 'consumabile/ghiaccio-secco', categoria: 'consumabile', sottocategoria: 'battaglia', nome: 'Ghiaccio secco', effetto: 'Infligge 50 danni da ghiaccio a tutti i nemici', descrizione: 'Televendite: «Kit di avventure all’aperto» (22 maggio); negoziazione (Belphegor, Re Frost)', pagina: 'oggetti' },
  { chiave: 'consumabile/bobina-magnetica', categoria: 'consumabile', sottocategoria: 'battaglia', nome: 'Bobina magnetica', effetto: 'Infligge 50 danni elettrici a tutti i nemici', descrizione: 'Televendite: «Kit di avventure all’aperto» (22 maggio)', pagina: 'oggetti' },
  { chiave: 'consumabile/bambola-di-paglia', categoria: 'consumabile', sottocategoria: 'battaglia', nome: 'Bambola di paglia', effetto: 'Chance media che questa abilità maledetta uccida un nemico', descrizione: 'Forzieri: Palazzo di Madarame (Stanza della mostra SP); tesori dei Dedali di Qimranut, Aiyatsbus e Chemdah; televendite: «Set di strumenti maledetti» (26 giugno); negoziazione', pagina: 'oggetti' },
  { chiave: 'consumabile/lama-a-vuoto', categoria: 'consumabile', sottocategoria: 'battaglia', nome: 'Lama a vuoto', effetto: 'Infligge 50 danni da vento a tutti i nemici', descrizione: 'Televendite: «Set eroico» (7 agosto); negoziazione (Jatayu, Garuda, Hastur)', pagina: 'oggetti' },
  { chiave: 'consumabile/ruota-psicocinetica', categoria: 'consumabile', sottocategoria: 'battaglia', nome: 'Ruota psicocinetica', effetto: 'Infligge 50 danni psicocinetici a tutti i nemici', descrizione: 'Televendite: «Set eroico» (7 agosto); negoziazione (Kaiwan)', pagina: 'oggetti' },
  { chiave: 'consumabile/spaccanucleo', categoria: 'consumabile', sottocategoria: 'battaglia', nome: 'Spaccanucleo', effetto: 'Infligge 50 danni nucleari a tutti i nemici', descrizione: 'Televendite: «Set eroico» (7 agosto)', pagina: 'oggetti' },
];

/** Le voci d'acquisto delle televendite nel Diario (non le consegne, che non comprano niente), con il giorno in cui stanno. */
const VOCI: Array<{ uid: string; data: string }> = [
  { uid: '055e267c419a45e5706194a2aa31162b', data: '04-24' }, { uid: '1e202ac91321bc3ce30e98456cfebceb', data: '05-01' },
  { uid: '7f6470501ff00db41ffc4d5e59d083bb', data: '05-08' }, { uid: 'd0a68550f64240566662691d55a1cd97', data: '05-15' },
  { uid: '671aa4250e5f130a0e708067ab257514', data: '05-22' }, { uid: '422fd22992f3031030cc97c98bbc9f3e', data: '05-29' },
  { uid: '9c033f7ebcf1d41acb3dc8dd397a46b4', data: '06-19' }, { uid: '3e64ea0272172f83b16e6373db279fd7', data: '07-03' },
  { uid: '5f538699f27d2391ee131e1583aba88e', data: '08-14' }, { uid: 'e4576319bcca3408b96bdbc89e289025', data: '10-02' },
  { uid: 'eb709e58f21589f525ecb575cde46a53', data: '11-06' }, { uid: 'c594c2f65ce61772670fdbb3c350eac3', data: '11-13' },
  { uid: '313993bb5b6ff48947e440f27370b395', data: '11-27' }, { uid: '13ccde99c2802a3600a7bc57f6cbc778', data: '12-11' },
  { uid: '078099af355878baca301ec53bece99c', data: '01-15' }, { uid: 'ea41aba5950449eb441bbaaf131e0ed6', data: '01-22' },
];

/** La nota del negozio prima della 239 (dalla fonte non italiana): si sostituisce solo se è ancora questa. */
const NOTA_VECCHIA = 'Televendita che offre due set alternativi (A o B) in ciascuna data; se ne può scegliere solo uno, disponibile solo il giorno stesso. Dati e prezzi da fonte non italiana, nomi dei set non tradotti ufficialmente in italiano; composizione articolo per articolo di ogni set non reperita per intero. Ogni set è disponibile solo nel giorno in cui viene offerto';
const NOTA_NUOVA = 'Televendita al televisore del Leblanc, in onda la domenica: in ogni data due set alternativi (A e B), se ne compra uno solo, o nessuno, e solo quel giorno. La consegna arriva a domicilio dopo qualche giorno.';

const chiaveArticolo = (slug: string): string => `${NEGOZIO}/${slug}`;
/** Le condizioni di un set: la domenica, quel giorno solo, e mai insieme all'altro set dello stesso giorno. */
const condizioniSet = (data: string, altro: string): unknown[] => [
  { tipo: 'giorno-settimana', giorni: ['domenica'] }, { tipo: 'intervallo', dal: data, al: data }, { tipo: 'non', condizione: { tipo: 'articolo', articolo: chiaveArticolo(altro) } },
];

/** Le tabelle dello schema `utente` con la colonna `voce_uid`, o null se lo schema non è attaccato o non ha le spunte (come la 238). */
function tabellePartiteConVoce(db: AppDatabase): string[] | null {
  if (!(db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente')) return null;
  const tabelle = (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((t) => t.name);
  const conVoce = tabelle.filter((t) => (db.prepare(`PRAGMA utente.table_info("${t}")`).all() as Array<{ name: string }>).some((c) => c.name === 'voce_uid'));
  return conVoce.includes('spunta_voce_partita') ? conVoce : null;
}
/** L'impronta di tutto lo schema `utente` (ogni tabella, ogni riga): dopo la migrazione deve essere identica. */
function improntaPartite(db: AppDatabase): string {
  const h = createHash('sha256');
  for (const t of (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map((x) => x.name)) {
    h.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}"`).iterate()) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}
/** Le righe delle partite che citano una chiave in una colonna, se tabella e colonna ci sono (sola lettura). */
function righePartite(db: AppDatabase, tabella: string, colonna: string, chiavi: readonly string[], filtro = ''): Array<Record<string, unknown>> {
  const colonne = (db.prepare(`PRAGMA utente.table_info("${tabella}")`).all() as Array<{ name: string }>).map((c) => c.name);
  if (!colonne.includes(colonna)) return [];
  return db.prepare(`SELECT * FROM utente."${tabella}" WHERE "${colonna}" IN (SELECT value FROM json_each(?)) ${filtro}`).all(JSON.stringify(chiavi)) as Array<Record<string, unknown>>;
}

export const migration239: Migration = {
  id: 239,
  name: 'televendite_set_alternativi',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['negozio', 'articolo', 'catalogo_oggetto', 'ricompensa_oggetto', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 239, tabella: t }, 'tabella assente: televendite non convertite'); return; }
    }
    if (!db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ?').get(NEGOZIO)) { logger.warn({ migrazione: 239 }, 'negozio delle televendite assente: nulla da convertire'); return; }
    const adesso = new Date().toISOString();
    const partite = tabellePartiteConVoce(db);
    const partitePrima = partite ? improntaPartite(db) : null;

    // ---- (1) gli oggetti nuovi del catalogo
    const oggettiCreati: string[] = [], oggettiGiaPresenti: string[] = [];
    const inserisciOggetto = db.prepare(`INSERT INTO main.catalogo_oggetto (chiave, categoria, sottocategoria, nome, nomi_altri_json, nome_originale, effetto, descrizione, statistiche_json, fonte_tipo, fonte_chiave, origine, nascosto, updated_at)
      VALUES (?, ?, ?, ?, '[]', NULL, ?, ?, ?, 'guida', ?, 'seed', 0, ?) ON CONFLICT(chiave) DO NOTHING`);
    for (const o of OGGETTI_NUOVI) {
      const r = inserisciOggetto.run(o.chiave, o.categoria, o.sottocategoria, o.nome, o.effetto, o.descrizione, o.categoria === 'accessorio' ? JSON.stringify({ per: 'tutti', testo: null }) : null, `${o.pagina === 'accessori' ? 'accessori' : 'consumabili'}/${o.nome}`, adesso);
      (r.changes === 1 ? oggettiCreati : oggettiGiaPresenti).push(o.chiave);
    }
    const contenuti = [...new Set(DOMENICHE.flatMap((d) => [...d.a.contenuto, ...d.b.contenuto].map(([k]) => k)))];
    const mancanti = contenuti.filter((k) => !db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(k));
    if (mancanti.length) errore(`oggetti dei set assenti dal catalogo: ${mancanti.join(', ')}`);
    // ---- (1b) il nome italiano della guida per l'oggetto del Set regalo giapponese (rilievo della revisione): «Flan al tè matcha», con
    // l'accento, come le pagine «Oggetti» e «Soluzione settimana 7» e come il testo della voce. Censimento completo del catalogo: l'oggetto e
    // l'articolo del Body Chop che lo vende sono gli unici nomi senza accento; si corregge solo il nome di seed rimasto com'era
    const nomiCorretti: string[] = [];
    for (const [tabella, chiave] of [['catalogo_oggetto', 'regalo/flan-al-te-matcha'], ['articolo', 'body-chop/flan-al-te-matcha']] as const) {
      if (db.prepare(`UPDATE main.${tabella} SET nome = ?, updated_at = ? WHERE chiave = ? AND nome = ? AND origine = 'seed'`).run(NOME_FLAN, adesso, chiave, NOME_FLAN_SENZA_ACCENTO).changes === 1) nomiCorretti.push(`${tabella}:${chiave}`);
    }

    // ---- (2) e (3) gli articoli dei set e il loro contenuto
    const inserisciArticolo = db.prepare(`INSERT INTO main.articolo (chiave, negozio_chiave, ordine, nome, categoria, per, prezzo, effetto, statistiche, nota, fonte, verificato, origine, nascosto, updated_at, condizioni_json, catalogo_chiave)
      VALUES (?, ?, ?, ?, 'altro', NULL, ?, NULL, NULL, NULL, ?, 0, 'seed', 0, ?, ?, NULL) ON CONFLICT(chiave) DO NOTHING`);
    const inserisciContenuto = db.prepare("INSERT INTO main.ricompensa_oggetto (fonte_tipo, fonte_chiave, catalogo_chiave, quantita, ordine, nota) VALUES ('articolo', ?, ?, ?, ?, NULL) ON CONFLICT(fonte_tipo, fonte_chiave, catalogo_chiave) DO NOTHING");
    let articoliCreati = 0, articoliGiaPresenti = 0, righeContenuto = 0;
    const mappa: Array<{ data: string; vecchio: string; vecchioPresente: boolean; setA: string; setB: string }> = [];
    DOMENICHE.forEach((d, i) => {
      const vecchio = chiaveArticolo(d.vecchio);
      const v = db.prepare('SELECT condizioni_json FROM main.articolo WHERE chiave = ? AND negozio_chiave = ?').get(vecchio, NEGOZIO) as { condizioni_json: string | null } | undefined;
      // il vecchio articolo deve essere quello del giorno: la mappa vecchio → set non si scrive per un articolo di un altro giorno
      if (v && !leggiCondizioniSalvate(v.condizioni_json).some((c) => c.tipo === 'intervallo' && c.dal === d.data && c.al === d.data)) errore(`il vecchio articolo ${vecchio} non è quello del ${d.data}`);
      for (const [k, s, altro] of [[0, d.a, d.b], [1, d.b, d.a]] as const) {
        const condizioni = condizioniSet(d.data, altro.slug);
        if (leggiCondizioniSalvate(JSON.stringify(condizioni)).length !== condizioni.length) errore(`le condizioni di ${s.nome} non si rileggono`);
        const r = inserisciArticolo.run(chiaveArticolo(s.slug), NEGOZIO, 100 + i * 2 + k, s.nome, s.prezzo, `${GUIDA}soluzione-settimana-${d.settimana}/`, adesso, JSON.stringify(condizioni));
        if (r.changes === 1) articoliCreati++; else articoliGiaPresenti++;
        s.contenuto.forEach(([oggetto, quantita], ordine) => { righeContenuto += inserisciContenuto.run(chiaveArticolo(s.slug), oggetto, quantita, ordine).changes; });
      }
      mappa.push({ data: d.data, vecchio, vecchioPresente: !!v, setA: chiaveArticolo(d.a.slug), setB: chiaveArticolo(d.b.slug) });
    });

    // ---- (4) i vecchi articoli e i loro oggetti fittizi: nascosti, non cancellati; la nota del negozio in italiano
    const vecchi = mappa.filter((m) => m.vecchioPresente).map((m) => m.vecchio);
    const fittizi = (db.prepare(`SELECT DISTINCT catalogo_chiave FROM main.articolo WHERE chiave IN (SELECT value FROM json_each(?)) AND catalogo_chiave LIKE 'altro/%'`).pluck().all(JSON.stringify(vecchi)) as string[]);
    // un oggetto fittizio che un altro articolo (non delle televendite) usa resta visibile
    const fittiziCondivisi = fittizi.filter((k) => db.prepare(`SELECT 1 FROM main.articolo WHERE catalogo_chiave = ? AND chiave NOT IN (SELECT value FROM json_each(?)) LIMIT 1`).get(k, JSON.stringify(vecchi)));
    const articoliNascosti = db.prepare(`UPDATE main.articolo SET nascosto = 1, updated_at = ? WHERE chiave IN (SELECT value FROM json_each(?)) AND nascosto = 0`).run(adesso, JSON.stringify(vecchi)).changes;
    const oggettiNascosti = db.prepare(`UPDATE main.catalogo_oggetto SET nascosto = 1, updated_at = ? WHERE chiave IN (SELECT value FROM json_each(?)) AND nascosto = 0 AND origine = 'seed'`)
      .run(adesso, JSON.stringify(fittizi.filter((k) => !fittiziCondivisi.includes(k)))).changes;
    const negozio = db.prepare('SELECT note, fonte, origine FROM main.negozio WHERE chiave = ?').get(NEGOZIO) as { note: string | null; fonte: string; origine: string };
    const notaCambiata = negozio.note === NOTA_VECCHIA && negozio.origine === 'seed'
      ? db.prepare('UPDATE main.negozio SET note = ?, fonte = ?, updated_at = ? WHERE chiave = ? AND note = ?').run(NOTA_NUOVA, `${GUIDA}soluzione-settimana-2/`, adesso, NEGOZIO, NOTA_VECCHIA).changes === 1
      : false;
    // gli articoli, le condizioni e i nomi sono cambiati: le letture in memoria dei servizi (la mappa delle alternative, che vive un secondo, e
    // i nomi delle condizioni) si svuotano, così le proposte applicate qui sotto e le prime letture dopo l'avvio vedono i set nuovi in
    // alternativa (prova sulle copie: una lettura fatta da una migrazione precedente nello stesso secondo li lasciava piatti)
    invalidaCacheDiGioco();

    // ---- riferimenti ai vecchi articoli: nelle voci del Diario (dati di gioco) e nelle partite (sola lettura, per l'elenco nell'audit)
    const vociConVecchio = db.prepare(`SELECT e.voce_uid AS voce, v.data, e.uid AS effetto, e.chiave FROM main.voce_effetto e JOIN main.voce_giornata v ON v.uid = e.voce_uid
      WHERE e.tipo = 'articolo' AND e.chiave IN (SELECT value FROM json_each(?)) ORDER BY v.data`).all(JSON.stringify(vecchi)) as Array<{ voce: string; data: string; effetto: string; chiave: string }>;
    const nellePartite = partite === null ? 'schema delle partite non attaccato' : {
      acquistoPartita: righePartite(db, 'acquisto_partita', 'articolo_chiave', vecchi),
      effettoStatoVoce: righePartite(db, 'effetto_stato_voce', 'chiave', vecchi, "AND tipo = 'articolo'"),
      acquistoRegistrato: righePartite(db, 'acquisto_registrato', 'articolo_chiave', vecchi),
    };

    // ---- (5) le voci: una proposta per voce; applicata solo fuori dal periodo validato e su una voce che nessuna partita cita
    const proposteTabella = esisteTabella(db, 'proposta_conversione_voce');
    const stessaConnessione = (() => { try { return getDb() === db; } catch { return false; } })();
    const inserisciProposta = proposteTabella ? db.prepare(`INSERT INTO main.proposta_conversione_voce (id, voce_uid, lotto, tipo_proposto, riferimento_tipo, riferimento_chiave, effetti_json, togli_json, motivo, certezza, creata_il)
      VALUES (?, ?, ?, NULL, 'negozio', ?, ?, ?, ?, 'certa', ?) ON CONFLICT(id) DO NOTHING`) : null;
    const statoDi = (id: string): string | undefined => db.prepare('SELECT stato FROM main.proposta_conversione_voce WHERE id = ?').pluck().get(id) as string | undefined;
    const voci: Array<{ voce: string; giorno: string; proposta: string | null; esito: string; citataDa?: string[] }> = [];
    for (const { uid, data } of VOCI) {
      const riga = db.prepare('SELECT data, genere FROM main.voce_giornata WHERE uid = ?').get(uid) as { data: string; genere: string } | undefined;
      if (!riga) { voci.push({ voce: uid, giorno: data, proposta: null, esito: 'voce assente' }); continue; }
      if (riga.data !== data || riga.genere !== 'azione') { voci.push({ voce: uid, giorno: riga.data, proposta: null, esito: `voce spostata o non spuntabile (${riga.data}, ${riga.genere}): nessuna proposta` }); continue; }
      if (!inserisciProposta) { voci.push({ voce: uid, giorno: data, proposta: null, esito: 'tabella delle proposte assente' }); continue; }
      const d = DOMENICHE.find((x) => x.data === data)!;
      const id = `${LOTTO}-${uid.slice(0, 8)}-set`;
      const citataDa = partite ? partite.filter((t) => db.prepare(`SELECT 1 FROM utente."${t}" WHERE voce_uid = ? LIMIT 1`).get(uid)) : [];
      const togli = vociConVecchio.filter((x) => x.voce === uid).map((x) => x.effetto);
      const effetti = [d.a, d.b].map((s) => ({ effetto: { tipo: 'articolo', articolo: chiaveArticolo(s.slug) }, completa: [], scelte: null }));
      const motivo = `Decisione 4 (L13): le televendite del ${data} sono due articoli alternativi, «${d.a.nome}» (¥${d.a.prezzo.toLocaleString('it-IT')}) e «${d.b.nome}» (¥${d.b.prezzo.toLocaleString('it-IT')}): alla spunta se ne sceglie uno, o nessuno.`
        + (togli.length ? ' Toglie il vecchio articolo unico in inglese.' : '')
        + (citataDa.length ? ' La voce è già spuntata in una partita: dopo l’applicazione togli e rimetti la spunta per scegliere il set.' : '');
      inserisciProposta.run(id, uid, LOTTO, NEGOZIO, JSON.stringify(effetti), JSON.stringify(togli), motivo, adesso);
      const stato = statoDi(id);
      const base = { voce: uid, giorno: data, proposta: id, ...(citataDa.length ? { citataDa } : {}) };
      if (stato !== 'aperta') { voci.push({ ...base, esito: `proposta già ${stato ?? 'assente'}` }); continue; }
      if (nelPeriodoValidato(data)) { voci.push({ ...base, esito: 'periodo validato: proposta da decidere (serve il sì dell’utente)' }); continue; }
      if (!stessaConnessione) { voci.push({ ...base, esito: 'connessione diversa da quella dei servizi: proposta solo caricata' }); continue; }
      if (partite === null) { voci.push({ ...base, esito: 'schema delle partite non attaccato: proposta solo caricata' }); continue; }
      if (citataDa.length) { voci.push({ ...base, esito: 'citata nelle partite: proposta da decidere (una migrazione non tocca le partite)' }); continue; }
      try {
        db.transaction(() => {
          const dto = elencaProposteConversione({ da: data, a: data, stato: 'aperta' }).find((x) => x.id === id);
          if (!dto?.leggibile) throw new Error(`proposta ${id} non leggibile: ${dto?.problema ?? 'assente'}`);
          applicaPropostaConversione(id, { revisionePropostaAttesa: dto.revisione });
          if (statoDi(id) !== 'applicata') throw new Error(`proposta ${id} non applicata`);
        })();
        voci.push({ ...base, esito: 'applicata' });
      } catch (e) {
        const x = e as { code?: unknown; message?: unknown };
        voci.push({ ...base, esito: `rifiutata dal servizio, resta proposta: ${typeof x.code === 'string' ? `${x.code} ` : ''}${typeof x.message === 'string' ? x.message : String(e)}` });
      }
    }

    // ---- controlli
    if (partitePrima !== null && improntaPartite(db) !== partitePrima) errore('lo schema delle partite è cambiato');
    for (const m of mappa) for (const [chiave, altro] of [[m.setA, m.setB], [m.setB, m.setA]] as const) {
      const r = db.prepare('SELECT condizioni_json FROM main.articolo WHERE chiave = ?').get(chiave) as { condizioni_json: string } | undefined;
      if (!r) return errore(`l'articolo ${chiave} non c'è`);
      const non = leggiCondizioniSalvate(r.condizioni_json).flatMap((c) => (c.tipo === 'non' ? [c.condizione] : []));
      if (non.length !== 1 || non[0]!.tipo !== 'articolo' || non[0]!.articolo !== altro || !db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ?').get(altro)) errore(`l'alternativa di ${chiave} non punta a ${altro}`);
      if (!db.prepare("SELECT 1 FROM main.ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave = ?").get(chiave)) errore(`il set ${chiave} è senza contenuto`);
    }
    const visibili = db.prepare('SELECT COUNT(*) FROM main.articolo WHERE negozio_chiave = ? AND nascosto = 0').pluck().get(NEGOZIO) as number;
    if (visibili !== DOMENICHE.length * 2) errore(`il negozio ha ${visibili} articoli visibili invece di ${DOMENICHE.length * 2}`);

    // ---- (6) audit: un'esecuzione per giro
    const esecuzione = {
      il: adesso,
      conteggi: {
        domeniche: DOMENICHE.length, articoliCreati, articoliGiaPresenti, righeContenutoCreate: righeContenuto, oggettiCreati: oggettiCreati.length, oggettiGiaPresenti: oggettiGiaPresenti.length,
        vecchiArticoliNascosti: articoliNascosti, oggettiFittiziNascosti: oggettiNascosti, notaNegozioCambiata: notaCambiata, articoliVisibiliDelNegozio: visibili, nomiCorretti: nomiCorretti.length,
        vociConIlVecchioArticolo: vociConVecchio.length, vociApplicate: voci.filter((v) => v.esito === 'applicata').length, vociDaDecidere: voci.filter((v) => v.esito !== 'applicata').length,
      },
      oggettiCreati, oggettiGiaPresenti, nomiCorretti, fittiziCondivisi, mappa, vociConVecchio, nellePartite, voci, stessaConnessione,
      segnalazioni: [
        'Domeniche senza una voce d’acquisto nel Diario: 06-26, 08-07, 09-25, 01-29 (gli articoli ci sono; la voce la decide l’utente).',
        'Che il gioco permetta un solo set per domenica, o nessuno, lo dicono la nota del negozio e la guida in modo indiretto (settimane 21 e 25): da confermare con l’utente. Se una domenica permettesse tutti e due, basta togliere le due condizioni «non» di quel giorno.',
      ],
    };
    const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
    const esecuzioni = vecchio ? (JSON.parse(vecchio) as { esecuzioni?: unknown[] }).esecuzioni ?? [] : [];
    db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
      .run(AUDIT, JSON.stringify({ migrazione: 239, lotto: LOTTO, esecuzioni: [...esecuzioni, esecuzione] }));
    logger.info({ migrazione: 239, ...esecuzione.conteggi }, 'Televendite: Set A e Set B come articoli alternativi');
  },
};
