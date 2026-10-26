// ============================================================
// Migrazione 270 — le copie dell'effetto e delle statistiche nelle offerte si tolgono: si leggono dall'oggetto del catalogo (Ondata 5, Lotto F)
// ============================================================
//
// Decisione 21 (a) dell'utente: «Gli effetti degli oggetti ai fini di questa app non è necessario gestirli se non come informazione testuale»;
// un solo punto per il testo dell'effetto (`catalogo_oggetto.effetto`) e per le statistiche (`catalogo_oggetto.statistiche_json`); «si tolgono
// le copie (articoli, traduzioni, descrizioni) e si correggono i testi sbagliati». Censimento sulla copia alla 268: 431 offerte con
// `articolo.effetto` e 199 con `articolo.statistiche`, tutte collegate a un oggetto del catalogo (che la lettura usa già, `negoziService`).
//
// Un testo dell'offerta si toglie solo se l'oggetto dice la stessa cosa. Il confronto è sulla sostanza (`sostanzaTesto`: maiuscole, apostrofi,
// «percento», punteggiatura e spazi non contano): 311 effetti e tutte le 199 statistiche sono uguali così. Per gli altri (120 effetti, più 15
// copie rimaste solo nella fotografia della guida) c'è un esito deciso voce per voce contro la guida italiana (Oggetti, Accessori, Oggetti
// chiave/essenziali, Regali, lette il 2026-10-26), in `ESITI`, con il testo dell'offerta che è stato valutato:
//   - «forma»: stesso effetto, detto in un altro modo; la scheda è quella della guida;
//   - «catalogo»: l'offerta è generica («regalo», «materiale crafting», «videogioco») o sbagliata (O5-08: Vino della grazia, Soma, Spray
//     supremo, Curry del Leblanc, Collana cremisi, Sicchenina, Incenso del risveglio…), e la scheda è quella della guida — dove la scheda
//     stessa è incompleta la corregge la 272; dove la guida non ha la voce resta la scheda con la fonte dichiarata (raccomandazione 15) e,
//     per il Chiodo ossidato e il Distintivo dell'angelo (raccomandazioni 17 e 18: da verificare in gioco), il testo della guida finisce in
//     una nota storica legata a scheda e offerta;
//   - «offerta»: l'offerta diceva la cosa giusta e la scheda no (Frusta decorativa: «FO +5», la correzione Royal della 146; Unguento
//     fisico; Spec. senso spirit. di Tanaka, Capsula d'allerta, Boilie sospetto e le due canne, schede vuote): prima si corregge la scheda
//     (`correggiTestoCatalogo`, solo se è ancora il testo atteso), poi si toglie la copia; se la scheda non si corregge, l'offerta resta;
//   - «superata»: «gradito a …» dei regali (decisione 13, a chi piace un regalo si legge da `confidente_regalo`).
// Un testo diverso dalla scheda senza un esito, o diverso da quello valutato, resta com'è e l'audit lo dice. Il resto è conservativo come
// prima: una riga creata dall'utente (`origine = 'utente'` senza `seed_json`) o corretta dall'utente in uno di questi campi (diverso dalla
// fotografia) non si tocca; dove c'è la fotografia della guida (`seed_json`) la copia si toglie anche da lì, perché «Ripristina» non la
// rimetta. I valori di prima di ogni riga stanno nell'audit `dati_guida.audit-270-effetti-offerte`. Nessuna voce del Diario e nessun dato
// delle partite cambia (impronta controllata). Idempotente: rieseguita non trova copie e non scrive niente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { FONTE_ACCESSORI, FONTE_CHIAVE, FONTE_OGGETTI, FONTE_REGALI, correggiTestoCatalogo, improntaDiario, notaStoricaTesti, scriviAuditTesti, sostanzaTesto,
  type NotaStoricaTesti } from './testiOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-270-effetti-offerte';
const errore = (motivo: string): never => { throw new Error(`270: ${motivo}; nessuna modifica applicata.`); };
const CAMPI = ['effetto', 'statistiche', 'effetto_json'] as const;
type Campo = (typeof CAMPI)[number];

type Esito = 'forma' | 'catalogo' | 'offerta' | 'superata';
/** L'esito di un testo dell'offerta diverso dalla scheda: il testo valutato, l'esito, il motivo e (per «offerta») la correzione della scheda. */
interface Verdetto { testo: string; esito: Esito; motivo: string; correzione?: { chiave: string; prima: string; dopo: string } }

const FORMA = 'stesso effetto della scheda, detto in un altro modo; la scheda è quella della guida [Oggetti]';
const GENERICO = 'testo generico dell’offerta: l’effetto è quello della scheda, secondo la guida [Oggetti]';
const MATERIALE = 'testo generico («materiale crafting»): la scheda dice a che cosa serve il materiale';
const SBAGLIATO = 'frase sbagliata dell’offerta (O5-08): la scheda è quella della guida [Oggetti]';
const INCOMPLETO = 'offerta meno precisa della scheda; la scheda la completa la 272 secondo la guida';
const LETTURA = 'la scheda lo dice negli effetti strutturati della lettura (statistiche_json.effetti), come la guida [Oggetti chiave/essenziali]';
const VIDEOGIOCO = 'testo generico («videogioco»): la Dote del videogioco è negli effetti strutturati della scheda, come la guida [Oggetti chiave/essenziali]';
const FONTE_SECONDARIA = 'nessuna voce nelle pagine della guida italiana lette: resta la scheda, con la fonte dichiarata (raccomandazione 15, decisione 21 c)';
const REGALO = 'a chi piace un regalo si legge da confidente_regalo (decisione 13)';

const v = (esito: Esito, motivo: string) => (testo: string): Verdetto => ({ testo, esito, motivo });
const forma = v('forma', FORMA), generico = v('catalogo', GENERICO), materiale = v('catalogo', MATERIALE), sbagliato = v('catalogo', SBAGLIATO);
const incompleto = v('catalogo', INCOMPLETO), lettura = v('catalogo', LETTURA), videogioco = v('catalogo', VIDEOGIOCO), secondaria = v('catalogo', FONTE_SECONDARIA);
const regalo = v('superata', REGALO);
const offerta = (testo: string, motivo: string, chiave: string, prima: string, dopo: string): Verdetto => ({ testo, esito: 'offerta', motivo, correzione: { chiave, prima, dopo } });

/** Gli esiti dei testi delle offerte diversi dalla scheda (censimento sulla copia alla 268, confronto con la guida del 2026-10-26). */
const ESITI: Readonly<Record<string, Verdetto>> = {
  // forma: stesso effetto
  'big-bang-burger/big-bang-burger': forma('Ripristina 20 HP a tutto il gruppo'),
  'big-bang-burger/panino-lunare': forma('Ripristina 120 HP a tutto il gruppo'),
  'big-bang-burger/panino-supernova': forma('Ripristina 200 HP a tutto il gruppo'),
  'chiesa-kanda/acqua-battesimale': forma('Rimuove i bonus statistici dei nemici'),
  'chiosco-kiyasuku/gomma-non-statica': forma('Cura Folgorazione'),
  'chiosco-kiyasuku/lenzuolo-rinfrescante': forma('Cura In fiamme'),
  'chiosco-kiyasuku/scaldamani': forma('Cura Congelamento'),
  'clinica-takemi/iv-100': forma('Da usare solo in posti sicuri: ripristina il 100 percento degli HP di tutti gli alleati'),
  'clinica-takemi/iv-50': forma('Da usare solo in posti sicuri: ripristina il 50 percento degli HP di tutti gli alleati'),
  'clinica-takemi/reviv-all': forma('Rianima tutti gli alleati con il 50 percento degli HP'),
  'clinica-takemi/rinnov-all': forma('Rianima tutti gli alleati caduti con tutti gli HP'),
  'clinica-takemi/rianidrin': forma('Rianima un alleato caduto con il 50 percento degli HP'),
  'clinica-takemi/unguento-magico': forma('Respinge tutte le magie non divine una volta'),
  'clinica-takemi/unguento-vitale': forma('Rianima un alleato ripristinando tutti gli HP'),
  'clinica-takemi/gel-rilassante': forma('Cura Furia, Soggiogamento, Confusione, Paura, Disperazione'),
  'clinica-takemi/nohar-m': forma('Cura un alleato da In fiamme, Congelato, Folgorato'),
  'discount-rocinante/wafer-dei-ladri': forma('Ripristina 50 HP e cura le alterazioni di stato'),
  'distributore-akihabara-4/curry-alla-fragola': forma('Ripristina 100 HP, riduce difesa, precisione ed elusione'),
  'distributore-akihabara-4/locusta-alla-maionese': forma('Ripristina 100 HP, riduce attacco, precisione ed elusione'),
  'distributore-akihabara-4/miso-di-stella-marina': forma('Ripristina 100 HP, riduce attacco e difesa'),
  'distributore-akihabara-5/bevanda-energetica': forma('Ripristina il 30% degli HP, potenzia l’attacco, riduce la difesa'),
  'distributore-akihabara-5/salsa-rancida': forma('Ripristina il 30% degli HP, potenzia precisione ed elusione, riduce l’attacco'),
  'distributore-akihabara-5/strano-boccone': forma('Ripristina il 30% degli HP, potenzia l’attacco, riduce precisione ed elusione'),
  'distributore-akihabara-6/creatura': forma('Cura il sonno'),
  'distributore-shibuya-sala-giochi/creatura': forma('Cura il sonno'),
  'farmacia-aohige/benda-adesiva': forma('Ripristina 20 HP'),
  'farmacia-aohige/gocce-per-occhioni': forma('Cura Vertigini'),
  'farmacia-aohige/sicchenina-a': forma('Ripristina 100 HP ma riduce attacco'),
  'farmacia-aohige/sicchenina-ex': forma('Ripristina 200 HP ma riduce difesa'),
  'friggitoria-hagoromo/katsu-a-pezzettoni': forma('Ripristina 30 SP'),
  'mercante-sakai/daifuku-alla-fragola': forma('cura alterazioni e ripristina tutti gli HP'),
  'mercante-sakai/elisir-del-padre': forma('Ridona tutti gli HP e gli SP a tutti gli alleati'),
  'mercante-sakai/ofuda-del-potere': forma('potenzia le statistiche per 3 turni'),
  'panetteria-yon-germain/melon-pan': forma('Rianima un alleato caduto con tutti gli HP'),
  'prossimo-asso/gelatina-viennese': forma('Ripristina 100 HP di un alleato'),
  'prossimo-asso/trambusto-s': forma('Aumenta la probabilità di colpi critici'),
  'prossimo-asso/set-di-freccette': v('forma', 'il testo dell’offerta ripete solo il nome dell’oggetto')('Set da freccette'),
  'street-food-houraku/chimaki-speciale': forma('Ripristina 100 SP'),
  'super-muramasa/tris-di-calamari': forma('Ripristina 20 HP a tutto il gruppo'),
  'tanaka-affari-loschi/homunculus': forma('Protegge dalla morte istantanea, oggetto monouso'),
  'triple-seven/soba-calmante': forma('Ripristina 200 HP'),
  'venditore-patate-dolci/beni-azuma': forma('Ripristina 10 SP'),
  'venditore-patate-dolci/yaki-imo-leggendario': forma('Ripristina 50 SP'),
  'vestiti-usati-kichijoji/spray-detergente': forma('Riduce la difesa dei nemici'),
  'vestiti-usati-kichijoji/spray-rapido': forma('Riduce precisione ed elusione dei nemici'),
  // catalogo: frasi sbagliate dell'offerta (O5-08 e altre), la scheda è quella della guida
  'chiesa-kanda/vino-della-grazia': sbagliato('Ripristina tutti gli HP di un alleato'),
  'negozio-palazzo-niijima/soma': sbagliato('Ripristina completamente HP e SP di un alleato'),
  'vestiti-usati-kichijoji/spray-supremo': sbagliato('Rimuove uno stato negativo da tutti gli alleati'),
  'leblanc/curry-del-leblanc': sbagliato('Curry: ripristina leggermente gli SP di tutti gli alleati'),
  'stoneon/collana-cremisi': v('catalogo', 'frase sbagliata dell’offerta (O5-08): la scheda dice la misura della guida [Accessori]; «cumulabile» lo aggiunge la 272')('Potenzia attacco Fuoco'),
  'farmacia-aohige/sicchenina': v('catalogo', 'l’offerta dimentica l’elusione: la guida [Oggetti] dice «riduce precisione ed elusione», come la scheda')('Ripristina 50 HP ma riduce la precisione'),
  'untouchable/razione-militare': v('catalogo', 'l’offerta descriveva il distributore, non l’oggetto: la scheda è quella della guida [Oggetti]')('Distributore automatico interno al negozio; contenuto casuale con effetti curativi o bonus/malus statistici temporanei; catalogo stagionale a rotazione'),
  'tanaka-affari-loschi/gemme-elementali': v('catalogo', 'frase delle quattro gemme di prima: l’offerta è ora il Magatama infernale (le gemme separate, lotto C), e la scheda è quella della guida [Oggetti]')('150 danni elementali a fuoco, vento, freddo o folgorazione su un nemico'),
  // catalogo: l'offerta è meno precisa e la scheda la completa la 272
  'vestiti-usati-kichijoji/incenso-del-risveglio': incompleto('Rimuove uno stato negativo da un alleato'),
  'tanaka-affari-loschi/holy-cloth': incompleto('Possibilità di morte istantanea di tipo Sacro'),
  'tanaka-affari-loschi/ouija-board': incompleto('Possibilità di morte istantanea di tipo Maledetto'),
  'tanaka-affari-loschi/crown-of-salvation': incompleto('Accessorio top-tier legato a un abilità passiva potente'),
  'mantra-ganda/sandalo-rasta': v('catalogo', 'frase sbagliata dell’offerta (sono tre statistiche, non tre elementi): la scheda la corregge la 272 secondo la guida [Oggetti chiave/essenziali]')('Potenzia tre elementi combinati'),
  // catalogo: testo generico dell'offerta
  'body-chop/aroma-rinfrescante': generico('Oggetto regalo'),
  'body-chop/olio-del-recupero': generico('Oggetto regalo'),
  'taisho-store/natto-rugiadoso': generico('Regalo'),
  'taisho-store/crostatina-angelo': generico('Regalo; funge anche da oggetto di rianimazione con tutti gli HP'),
  'big-bang-burger/panino-terrestre': generico('Panino stagionale'),
  'prossimo-asso/frullato-iperproteico': generico('Oggetto vario'),
  'akiba/cesta-di-vestiti': v('catalogo', 'la scheda dice che cosa contiene la cesta, come la guida [Oggetti chiave/essenziali]')('Regalo/oggetto: scorciatoia per ottenere equipaggiamenti senza lavare le armature sporche'),
  'vestiti-usati-kichijoji/cesta-di-vestiti': v('catalogo', 'la scheda dice che cosa contiene la cesta, come la guida [Oggetti chiave/essenziali]')('Regalo'),
  'akiba/fosforo-rosso': materiale('Materiale crafting avanzato'),
  'akiba/lente-condensante': materiale('Materiale crafting'),
  'akiba/sabbia-ferrea': materiale('Materiale crafting'),
  'fiorista-rafflesia/balsamo-vegetale': materiale('Materiale crafting'),
  'fiorista-rafflesia/sughero': materiale('Materiale crafting'),
  'yumenoshima/cuoio-conciato': materiale('Materiale crafting'),
  'yumenoshima/fibbia-di-latta': materiale('Materiale crafting'),
  'yumenoshima/gomitolo-di-seta': materiale('Materiale crafting'),
  'yumenoshima/mercurio': materiale('Materiale crafting'),
  'yumenoshima/pergamena-spessa': materiale('Materiale/oggetto raro'),
  'tanaka-affari-loschi/condenser-lens': materiale('Materiale di crafting'),
  // catalogo: voci senza una riga nelle pagine della guida lette (fonte dichiarata nella scheda)
  'mercante-sakai/replica-darma': secondaria('materiale mutageno per la Trasmutazione'),
  'tanaka-affari-loschi/model-gun': secondaria('Materiale di crafting'),
  'tanaka-affari-loschi/black-kogatana': secondaria('Materiale di crafting'),
  'untouchable/kogatana-nera': secondaria('Materiale/arma da mischia base'),
  'tanaka-affari-loschi/black-robe': secondaria('Materiale di crafting'),
  'mercante-sakai/veste-nera': v('catalogo', 'l’offerta diceva il costo dello scambio (Panino con yakisoba), già nel costo dell’offerta (costo_json); per l’effetto ' + FONTE_SECONDARIA)('Ottenuta in cambio di Yakisoba Pan, secondo fonte non italiana'),
  'stoneon/roccia-nera': v('catalogo', 'la guida [Accessori] non dà un effetto per la Roccia nera: resta la scheda, con la fonte dichiarata (raccomandazione 15)')('Materiale per la fusione di Persona'),
  // catalogo: da verificare in gioco (raccomandazioni 17 e 18): la scheda resta, il testo della guida va nella nota storica
  'tanaka-affari-loschi/five-inch-nail': v('catalogo', 'raccomandazione 17 (decisione 21 c): si tiene la scheda («un nemico») finché non si verifica in gioco; «tutti i nemici» della pagina Oggetti è nella nota storica chiodo-ossidato-bersaglio-fonte')('50 danni Maledetto a tutti i nemici'),
  'mercante-sakai/distintivo-dellangelo': v('catalogo', 'raccomandazione 18 (decisione 21 c): l’equipaggiamento resta com’è finché non si verifica l’abbinamento in gioco; il testo della guida è nella nota storica distintivo-dellangelo-abbinamento-fonte')('accessorio: elusione magia'),
  // catalogo: letture e videogiochi, con gli effetti strutturati
  'hinokuniya/anima-da-cineasta': lettura('Migliora i bonus di film e DVD'),
  'hinokuniya/enciclopedia-floreale': lettura('Sblocca suggerimenti al negozio di fiori'),
  'hinokuniya/la-scienza-del-baseball': lettura('Abilita il Terzo Occhio nelle gabbie di battuta'),
  'hinokuniya/lo-zen-della-pesca': lettura('Abilita il Terzo Occhio nella pesca'),
  'hinokuniya/maestro-a-freccette': lettura('Abilita il Terzo Occhio a freccette'),
  'hinokuniya/pagine-ammuffite': lettura('Sblocca Jinbocho'),
  'hinokuniya/segreti-di-gioco': lettura('Sblocca trucchi per i videogiochi'),
  'libreria-nagiuri/casanova-spregiudicato': lettura('Fascino, quattro note musicali'),
  'libreria-nagiuri/chiamami-capo': lettura('Gentilezza, quattro note musicali'),
  'libreria-nagiuri/come-fare-karakuri': lettura('Perizia, quattro note musicali'),
  'libreria-nagiuri/comprendere-il-cuore': lettura('Amplia le condizioni per gli attacchi tecnici'),
  'libreria-nagiuri/rivelazioni-eroiche': lettura('Conoscenza, quattro note musicali'),
  'libreria-nagiuri/spadaccino-provetto': lettura('Coraggio, tre note musicali'),
  'libreria-taiheido/arte-della-persuasione': lettura('Fascino, tre note musicali'),
  'libreria-taiheido/cieli-notturni': lettura('Sblocca il Planetario di Ikebukuro'),
  'libreria-taiheido/eredita-dell-impiccato': lettura('Conoscenza, tre note musicali'),
  'libreria-taiheido/esplorando-nakano': lettura('Sblocca Nakano'),
  'libreria-taiheido/esplorando-yoncha-4': lettura('Sblocca scorciatoie a Yongen-Jaya'),
  'libreria-taiheido/il-pensiero-sociale': lettura('Conoscenza, tre note musicali'),
  'libreria-taiheido/incontri-spettrali': lettura('Coraggio, tre note musicali'),
  'libreria-taiheido/la-pulizia-del-cuore': lettura('Perizia, tre note musicali'),
  'libreria-taiheido/luoghi-della-movida': lettura('Sblocca il punto di ritrovo Seaside Park'),
  'libreria-taiheido/minaccia-medjed': lettura('Conoscenza, tre note musicali'),
  'libreria-taiheido/santuari-di-tokyo': lettura('Sblocca il Santuario Meiji'),
  'libreria-taiheido/storia-di-buchiko': lettura('Gentilezza, tre note musicali'),
  'libreria-taiheido/un-acquario-al-giorno': lettura('Sblocca il punto di ritrovo Shinagawa'),
  'libreria-taiheido/vague': lettura('Sblocca il punto di ritrovo Takenoko Street a Harajuku'),
  'libreria-taiheido/vedetta-lacustre': lettura('Sblocca il punto di ritrovo Ichigaya'),
  'prossimo-asso/esperto-a-biliardo': lettura('Libro, sblocca tiri speciali al biliardo'),
  'mercante-sakai/la-fattorizzazione': lettura('Libro con bonus alle statistiche di studio'),
  'super-baron/featherman-seeker': videogioco('Videogioco regalo'),
  'super-baron/golfer-sarutahiko': videogioco('Videogioco regalo'),
  'super-baron/power-intuition': videogioco('Videogioco regalo'),
  'super-baron/punch-ouch': videogioco('Videogioco regalo'),
  'super-baron/train-of-life': videogioco('Videogioco regalo'),
  'yumenoshima/gambla-goemon': videogioco('Videogioco'),
  // superata: «gradito a …» dei regali
  '37-gradi-celsius/braccialetto-argento': v('superata', `${REGALO}; offerta nascosta (lotto C, 252)`)('Regalo top-tier per i personaggi maschili: Ryuji, Yusuke, Sojiro, Akechi, Iwai, Shinya, Maruki'),
  'body-chop/rossetto-cremisi': regalo('Regalo, gradito a Ann, Sadayo, Kasumi'),
  'tsurukame-diamond/anello-del-cuore': regalo('Regalo top-tier per quasi tutti i personaggi femminili: Ann, Makoto, Futaba, Haru, Tae, Sadayo, Kasumi e altre'),
  'prossimo-asso/proteine-d-importazione': regalo('Regalo'),
  // offerta: diceva la cosa giusta, la scheda si corregge prima di togliere la copia
  'mercante-sakai/frusta-decorativa': offerta('Arma per Ann: Fo +5',
    'l’offerta ha il testo Royal della 146 (guida, Sakai 12/6–17/6); la scheda diceva il costo dello scambio, già nel costo dell’offerta: diventa «FO +5» (Fortuna, sigla del glossario; «per Ann» è già nella scheda)',
    'arma/frusta-decorativa', 'Ottenuta in cambio di Proteine d importazione', 'FO +5'),
  'clinica-takemi/unguento-fisico': offerta('Respinge una volta attacchi fisici e da arma da fuoco', 'giusta l’offerta (O5-08): la guida [Oggetti] dice «attacchi fisici e da arma»',
    'consumabile/unguento-fisico', 'Crea una barriera che respinge una volta gli attacchi fisici', 'Crea una barriera che respinge una volta gli attacchi fisici e da arma da fuoco'),
  'tanaka-affari-loschi/inspired-hand-mirror': offerta('Accessorio legato a un abilità passiva', 'la scheda collegata era vuota: la guida [Accessori] dice «Alito mefitico: aumenta le chance di infliggere alterazioni negative a un nemico»',
    'consumabile/spec-senso-spirit-2', '', 'Attiva Alito mefitico: aumenta la probabilità di infliggere alterazioni negative a un nemico'),
  'clinica-takemi/capsula-d-allerta': offerta('Cura Vertigini, Amnesia, Sonno, Fame per un alleato', 'la scheda era vuota: la guida [Oggetti] dice lo stesso, con la nota che la Fame non si cura (errore di traduzione del gioco)',
    'consumabile/capsula-d-allerta', '', 'Cura Vertigini, Amnesia e Sonno di un alleato (il gioco cita anche la Fame, ma è un errore di traduzione: non la cura)'),
  'prossimo-asso/boilie-sospetto': offerta('Esca da pesca di fascia alta', 'la scheda era vuota: la guida [Oggetti chiave/essenziali] dice che cosa fa l’esca',
    'altro/boilie-sospetto', '', 'Esca di origine ignota: fa abboccare solo un tipo speciale di pesce'),
  'prossimo-asso/canna-hi-tech': offerta('Canna da pesca avanzata', 'la scheda era vuota: la guida [Oggetti chiave/essenziali] descrive la canna',
    'altro/canna-hi-tech', '', 'Canna da pesca realizzata con tecnologia spaziale, dalla qualità di un altro mondo'),
  'prossimo-asso/canna-potente': offerta('Canna da pesca base', 'la scheda era vuota: la guida [Oggetti chiave/essenziali] dice che cosa fa la canna',
    'altro/canna-potente', '', 'Canna molto robusta: rende ancora più facile catturare i pesci'),
};

/** Le note storiche dei due oggetti da verificare in gioco: il testo della guida che la scheda non dice resta leggibile, legato a scheda e offerta. */
const NOTE: readonly NotaStoricaTesti[] = [
  { chiave: 'chiodo-ossidato-bersaglio-fonte', fonte: 'Guida italiana: Oggetti (Chiodo ossidato); censimento dell’ondata 5 (listino di Tanaka); raccomandazione 17, decisione 21 dell’utente',
    testo: 'La guida si contraddice sul bersaglio del Chiodo ossidato: la pagina Oggetti dice «infligge 50 danni maledetti a tutti i nemici», il listino di Tanaka «a un nemico». Vale la scheda («a un nemico») finché non si verifica in gioco. È una nota sulla fonte: non cambia la scheda.',
    catalogo: ['consumabile/chiodo-ossidato'], articoli: ['tanaka-affari-loschi/five-inch-nail'] },
  { chiave: 'distintivo-dellangelo-abbinamento-fonte', fonte: 'Guida italiana: Accessori (Distintivo dell’angelo); raccomandazione 18, decisione 21 dell’utente',
    testo: 'Per il Distintivo dell’angelo che si ottiene da Sakai a Kichijoji (in cambio di Stufato misterioso, dal 30 ottobre al 5 novembre) la guida dice: «Grazia angelica: aumenta l’elusione dagli attacchi magici, tranne quelli divini». Le due schede del Distintivo dell’angelo vengono dai dati dell’equipaggiamento (tutte le statistiche +5 e +6) e restano come sono finché l’abbinamento non si verifica in gioco. È una nota sulla fonte: non cambia le schede.',
    catalogo: ['accessorio/distintivo-dellangelo', 'accessorio/distintivo-dellangelo-2'], articoli: ['mercante-sakai/distintivo-dellangelo'] },
];

interface Riga { chiave: string; origine: string; seed_json: string | null; effetto: string | null; statistiche: string | null; effetto_json: string | null;
  c_chiave: string; c_effetto: string; c_statistiche: string | null }
interface EsitoRiga { chiave: string; esito: string; prima?: Partial<Record<Campo, string | null>>; valutazione?: string }

const pieno = (x: string | null | undefined): boolean => typeof x === 'string' && x.trim() !== '';

/** Il testo delle statistiche della scheda (`statistiche_json.testo`), o null. */
function statisticheScheda(json: string | null): string | null {
  try {
    const s = JSON.parse(json ?? 'null') as { testo?: unknown } | null;
    return s && typeof s.testo === 'string' ? s.testo : null;
  } catch { return null; }
}

/**
 * Decide se una copia (effetto o statistiche dell'offerta, o della sua fotografia) si può togliere: uguale nella sostanza alla scheda, oppure
 * con un esito per quel testo (e, per «offerta», la scheda corretta). `resta` è null se si toglie, altrimenti il motivo per cui resta.
 */
function valuta(db: AppDatabase, chiave: string, campo: Campo, valore: string | null, r: Pick<Riga, 'c_chiave' | 'c_effetto' | 'c_statistiche'>, correzioni: string[]): { resta: string | null; valutazione?: string } {
  if (valore === null || (campo !== 'effetto_json' && !pieno(valore))) return { resta: null };
  if (campo === 'effetto_json') return { resta: 'effetto dichiarato (effetto_json) sull’offerta: non toccata' };
  if (campo === 'statistiche') return sostanzaTesto(valore) === sostanzaTesto(statisticheScheda(r.c_statistiche)) ? { resta: null } : { resta: 'statistiche diverse da quelle della scheda: non toccata' };
  if (sostanzaTesto(valore) === sostanzaTesto(r.c_effetto)) return { resta: null, valutazione: 'uguale alla scheda' };
  const ver = ESITI[chiave];
  if (!ver) return { resta: 'effetto diverso dalla scheda, senza un esito deciso: non toccata' };
  if (sostanzaTesto(ver.testo) !== sostanzaTesto(valore)) return { resta: 'effetto diverso da quello valutato: non toccata' };
  if (ver.correzione) {
    if (ver.correzione.chiave !== r.c_chiave) return { resta: `l’offerta è collegata a ${r.c_chiave}, non a ${ver.correzione.chiave}: non toccata` };
    const c = correggiTestoCatalogo(db, ver.correzione.chiave, 'effetto', ver.correzione.prima, ver.correzione.dopo);
    if (c.esito === 'corretto') correzioni.push(ver.correzione.chiave);
    else if (c.esito !== 'già conforme alla guida') return { resta: `scheda ${ver.correzione.chiave} non corretta (${c.esito}): l’offerta resta com’è` };
  }
  return { resta: null, valutazione: `${ver.esito}: ${ver.motivo}` };
}

function togli(db: AppDatabase, r: Riga, correzioni: string[]): EsitoRiga {
  const prima = Object.fromEntries(CAMPI.filter((c) => r[c] !== null).map((c) => [c, r[c]])) as Partial<Record<Campo, string | null>>;
  if (r.origine === 'utente' && r.seed_json === null) return { chiave: r.chiave, esito: 'offerta creata dall’utente: non toccata', prima };
  let foto: Record<string, unknown> | null = null;
  if (r.seed_json !== null) {
    try {
      const x = JSON.parse(r.seed_json) as unknown;
      if (!x || typeof x !== 'object' || Array.isArray(x)) return { chiave: r.chiave, esito: 'fotografia della guida illeggibile: non toccata', prima };
      foto = x as Record<string, unknown>;
    } catch { return { chiave: r.chiave, esito: 'fotografia della guida illeggibile: non toccata', prima }; }
    // un campo corretto dall'utente (diverso dalla fotografia) resta: un dato salvato non si cambia in silenzio
    const corretto = CAMPI.find((c) => c in foto! && (foto![c] ?? null) !== r[c]);
    if (corretto) return { chiave: r.chiave, esito: `${corretto} corretto dall’utente: non toccata`, prima };
  }
  const valutazioni: string[] = [];
  for (const c of CAMPI) {
    const e = valuta(db, r.chiave, c, r[c], r, correzioni);
    if (e.resta) return { chiave: r.chiave, esito: e.resta, prima };
    if (e.valutazione && c === 'effetto') valutazioni.push(e.valutazione);
  }
  const nuovaFoto = foto ? JSON.stringify({ ...foto, ...Object.fromEntries(CAMPI.filter((c) => c in foto!).map((c) => [c, null])) }) : null;
  const n = db.prepare(`UPDATE main.articolo SET effetto = NULL, statistiche = NULL, effetto_json = NULL, seed_json = ?, updated_at = ?
    WHERE chiave = ? AND effetto IS ? AND statistiche IS ? AND effetto_json IS ? AND seed_json IS ?`)
    .run(nuovaFoto, new Date().toISOString(), r.chiave, r.effetto, r.statistiche, r.effetto_json, r.seed_json).changes;
  if (n !== 1) errore(`l'offerta ${r.chiave} non si aggiorna`);
  return { chiave: r.chiave, esito: 'copia tolta', prima, valutazione: valutazioni.join('; ') || 'uguale alla scheda' };
}

/**
 * Le offerte collegate che non hanno più la copia nella riga (già tolta quando l'utente ha collegato l'oggetto) ma la conservano nella
 * fotografia della guida: la copia si toglie anche da lì, con le stesse regole delle righe (uguale alla scheda o con un esito; per
 * «offerta» la scheda corretta prima). La riga mostra già la scheda: la fotografia serve solo a «Ripristina».
 */
function fotografieConCopia(db: AppDatabase, correzioni: string[]): EsitoRiga[] {
  const righe = db.prepare(`SELECT a.chiave, a.seed_json, c.chiave AS c_chiave, c.effetto AS c_effetto, c.statistiche_json AS c_statistiche
    FROM main.articolo a JOIN main.catalogo_oggetto c ON c.chiave = a.catalogo_chiave
    WHERE a.seed_json IS NOT NULL AND a.effetto IS NULL AND a.statistiche IS NULL AND a.effetto_json IS NULL ORDER BY a.chiave`).all() as Array<{ chiave: string; seed_json: string } & Pick<Riga, 'c_chiave' | 'c_effetto' | 'c_statistiche'>>;
  const esiti: EsitoRiga[] = [];
  for (const r of righe) {
    let foto: Record<string, unknown>;
    try {
      const x = JSON.parse(r.seed_json) as unknown;
      if (!x || typeof x !== 'object' || Array.isArray(x)) continue;
      foto = x as Record<string, unknown>;
    } catch { continue; }
    const conCopia = CAMPI.filter((c) => foto[c] !== undefined && foto[c] !== null);
    if (!conCopia.length) continue;
    const prima = Object.fromEntries(conCopia.map((c) => [c, typeof foto[c] === 'string' ? foto[c] : JSON.stringify(foto[c])])) as Partial<Record<Campo, string | null>>;
    let resta: string | null = null;
    const valutazioni: string[] = [];
    for (const c of conCopia) {
      const e = valuta(db, r.chiave, c, prima[c] ?? null, r, correzioni);
      if (e.resta) { resta = e.resta; break; }
      if (e.valutazione && c === 'effetto') valutazioni.push(e.valutazione);
    }
    if (resta) { esiti.push({ chiave: r.chiave, esito: `fotografia: ${resta}`, prima }); continue; }
    const nuova = JSON.stringify({ ...foto, ...Object.fromEntries(conCopia.map((c) => [c, null])) });
    if (db.prepare('UPDATE main.articolo SET seed_json = ? WHERE chiave = ? AND seed_json = ?').run(nuova, r.chiave, r.seed_json).changes !== 1) errore(`la fotografia dell'offerta ${r.chiave} non si aggiorna`);
    esiti.push({ chiave: r.chiave, esito: 'copia tolta dalla fotografia della guida', prima, valutazione: valutazioni.join('; ') || 'uguale alla scheda' });
  }
  return esiti;
}

export const migration270: Migration = {
  id: 270,
  name: 'effetti_copiati_negli_articoli',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'catalogo_oggetto') || !esisteTabella(db, 'articolo')) { logger.warn({ migrazione: 270 }, 'catalogo o articoli assenti: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const correzioni: string[] = [];
    const righe = db.prepare(`SELECT a.chiave, a.origine, a.seed_json, a.effetto, a.statistiche, a.effetto_json, c.chiave AS c_chiave, c.effetto AS c_effetto, c.statistiche_json AS c_statistiche
      FROM main.articolo a JOIN main.catalogo_oggetto c ON c.chiave = a.catalogo_chiave
      WHERE a.effetto IS NOT NULL OR a.statistiche IS NOT NULL OR a.effetto_json IS NOT NULL ORDER BY a.chiave`).all() as Riga[];
    const esitiRighe = righe.map((r) => togli(db, r, correzioni));
    const esitiFoto = fotografieConCopia(db, correzioni);
    const esitiNote = NOTE.map((n) => ({ nota: n.chiave, ...notaStoricaTesti(db, n) }));
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const tolte = esitiRighe.filter((e) => e.esito === 'copia tolta');
    const fotoRipulite = esitiFoto.filter((e) => e.esito === 'copia tolta dalla fotografia della guida');
    const perEsito = (lista: EsitoRiga[]) => lista.reduce<Record<string, number>>((a, e) => { const k = (e.valutazione ?? '').split(':')[0] || 'uguale alla scheda'; a[k] = (a[k] ?? 0) + 1; return a; }, {});
    const noteNuove = esitiNote.reduce((n, e) => n + e.cambiate, 0);
    const conteggi = {
      offerteConCopia: righe.length,
      copieTolte: tolte.length,
      copieTolteSecondoEsito: perEsito(tolte),
      fotografieRipulite: fotoRipulite.length,
      fotografieSecondoEsito: perEsito(fotoRipulite),
      effettiTolti: tolte.filter((e) => pieno(e.prima?.effetto)).length,
      statisticheTolte: tolte.filter((e) => pieno(e.prima?.statistiche)).length,
      schedeCorrette: correzioni.length,
      nonToccate: esitiRighe.length - tolte.length + esitiFoto.length - fotoRipulite.length,
      noteNuove,
      senzaOggetto: db.prepare("SELECT COUNT(*) FROM main.articolo WHERE catalogo_chiave IS NULL AND (COALESCE(effetto, '') <> '' OR COALESCE(statistiche, '') <> '' OR effetto_json IS NOT NULL)").pluck().get() as number,
    };
    const cambiate = tolte.length + fotoRipulite.length + correzioni.length + noteNuove;
    if (cambiate) invalidaCacheDiGioco();
    scriviAuditTesti(db, AUDIT, 270, { fonti: [FONTE_OGGETTI, FONTE_ACCESSORI, FONTE_CHIAVE, FONTE_REGALI], conteggi, correzioni, note: esitiNote, esiti: [...esitiRighe, ...esitiFoto] }, cambiate);
    logger.info({ migrazione: 270, ...conteggi }, 'Offerte: effetto e statistiche si leggono solo dall’oggetto del catalogo');
  },
};
