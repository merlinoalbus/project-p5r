// Descrizioni L7 registrate con il router del catalogo e le migrazioni 121/122 e utente 026.
import type { DescrizioniArea } from '../tipi.js';

export const DESCRIZIONI_CATALOGO_OGGETTI: DescrizioniArea = {
  'GET /api/catalogo-oggetti/confronto-tanaka': {
    sommario: 'Confronto unitario readonly fra storico121, fonti correnti e proposta Royal',
    descrizione: 'Unica transazione, no-store. Include offerte assenti/nascoste/aggiunte/collisioni e proposte in tutti gli stati, senza aggiornare tuple, fotografie o stati. Riconciliazione124 solo diagnostica con formule intere, provenienza seed, rendiconto esatto e confronto integrale degli altri campi e legami. Candidate Royal dal manifest18 con solo grado proprio e sblocco corrente del negozio separato; non equivalgono a consenso o conferma applicabile. revisione è un hash della lettura, non una ricevuta commerciale. Conferma e scelta alternativa individuali delle fonti Tanaka rispondono409 tanaka-decisione-unitaria-richiesta; scarto esplicito resta disponibile.',
    risposta: 'ConfrontoTanakaDto, versione1',
  },
  'GET /api/catalogo-oggetti/censimento-scambi': {
    sommario: 'Fonti correnti Jose/scambi e raccordi documentali alle offerte e proposte',
    descrizione: 'Sola lettura coerente in transazione; Cache-Control no-store. Proietta jose.scambi (nome, effetto, costo, requisito, fonte) e oggetti-guida.scambi (venditore, fonte, offerte ricevi/dai/note/fonte), con percorsi e UID soltanto quando esistono. Stati assente, null, vuoto, valido, malformato e non-supportato distinti. Il registro 132 deve corrispondere integralmente al manifest dei 97 percorsi e target espliciti. Per ogni fonte ricontrolla RAW e metadati correnti contro la fotografia registrata: una fonte mutata non viene ricollegata per nome. Destinazioni correnti, costi, formule, risultati e proposte di tutti gli stati sono letti per chiavi; raccordoDocumentale indica soltanto il rinvio documentato, mai equivalenza semantica o approvazione. Le copie sintetiche restano archivi con divergenze esplicite, non nuove offerte. Le fonti attese assenti sono esposte in fontiMancanti; le nuove restano fuori-manifest. Registro mancante o incompatibile diagnosticato senza sovrascriverlo. Nessun RAW privato del registro, partita o immagine viene restituito. completo indica assenza di taglio delle righe proiettate, non correttezza semantica. Non interpreta prosa né modifica dati.',
    risposta: 'CensimentoScambiCatalogoDto, versione 1',
  },
  'GET /api/catalogo-oggetti/audit': {
    sommario: 'Censimento ricostruito e risultati effettivi della conversione del catalogo',
    descrizione: 'Legge la fotografia privata dell’istanza registrata dalla migrazione 121. Fonti, esiti, motivi, riferimenti ai risultati e alle proposte, ingressi nuovi o cambiati rispetto al manifest pubblico. Quando presente, proietta separatamente residuiVoci dal rendiconto delle future conversioni: fonte, campo, motivo e locatori dei contenuti da verificare, senza riscrivere la fotografia 121. La granularità per fonte aggregata non prova l’abbinamento di ogni contenuto. Non è il file preliminare di proposte perduto né una certificazione del catalogo dopo modifiche successive. Prima della conversione risponde null. Nessuna scrittura.',
    risposta: 'AuditCatalogo oppure null',
    errori: [[409, 'audit-catalogo-illeggibile'], [409, 'audit-catalogo-incompatibile']],
  },
  'POST /api/catalogo-oggetti/regali/:confidente/:ordine/ripristina-costo': {
    sommario: 'Ripristina soltanto il costo precedente della rettifica G-034',
    descrizione: 'Ripristino mirato di Shinya/ordine1, Modellino di moto: snapshot validato e costoAttuale come precondizione contro aggiornamenti concorrenti. Cambia esclusivamente costo, preservando nome, identità, nota storica, gradimento e consegne della partita. Lo snapshot pre-correzione rimane conservato.',
    risposta: '{ ripristinato: true }',
    errori: [[404, 'regalo-non-trovato'], [409, 'costo-regalo-senza-snapshot'], [409, 'costo-regalo-cambiato']],
  },
  'GET /api/catalogo-oggetti': {
    sommario: 'Catalogo unico degli oggetti con ricerca e filtro per categoria',
    descrizione: 'Identità per chiave stabile, nome italiano/originale, alias, categoria, effetto, descrizione, statistiche e provenienza. La ricerca q confronta nome, alias, nome originale ed effetto; categoria filtra la classificazione corrente. nascosti=1 include anche le identità nascoste, non soltanto quelle nascoste. Il prezzo minimo deriva dalle offerte visibili in yen, non dai costi di scambio. partita, se indicata, viene verificata ma non aggiunge uno stato di possesso al catalogo.',
    risposta: 'Elenco di CatalogoOggettoDto',
    errori: [[404, 'partita-non-trovata'], [409, 'categoria-oggetto-non-valida']],
  },
  'POST /api/catalogo-oggetti': {
    sommario: 'Crea una nuova identità nel catalogo',
    descrizione: 'Categoria e nome sono obbligatori; alias, nome originale, sottocategoria, effetto, descrizione e statistiche hanno i default della creazione. La chiave nasce da categoria/nome, con suffisso se già usata. Non crea offerte, acquisti o ottenimenti e non unisce omonimi.',
    risposta: 'CatalogoOggettoDto creato (201)',
  },
  'GET /api/catalogo-oggetti/:categoria/:slug': {
    sommario: 'Pagina aggregata di un oggetto e delle sue fonti',
    descrizione: 'Offerte e sedi effettive con prezzo/costo propri, regali graditi e sconsigliati, forzieri, ricompense, ricette, scambi e dati della lettura associata. Senza partita nessuna disponibilità o acquisizione viene presunta. Con partita si leggono gli stati esistenti: acquisti, doni consegnati, letture e forzieri. Il forziere non preso di un Palazzo concluso è non più ottenibile; i passaggi della voce non valgono come forziere preso. La nota su un Seme da Jose resta esplicitamente da verificare. Nome e casa delle fonti sono quelli correnti; una fonte eliminata è dichiarata, non mostrata come chiave tecnica. La quantità del prodotto di ricetta può essere null quando la guida non la dichiara.',
    risposta: 'OggettoDettaglioDto',
    errori: [[404, 'oggetto-non-trovato'], [404, 'partita-non-trovata']],
  },
  'PUT /api/catalogo-oggetti/:categoria/:slug': {
    sommario: 'Corregge i campi inviati senza cambiare la chiave',
    descrizione: 'Modifica parziale: i campi omessi non vengono azzerati dai default della creazione. La prima correzione di un oggetto della guida conserva lo snapshot per Ripristina. Rinomina e categoria corrente non cambiano la chiave originale né riscrivono nomi/date dello storico; i lettori usano il riferimento stabile. Non corregge prezzi o condizioni delle singole offerte.',
    risposta: 'CatalogoOggettoDto aggiornato',
    errori: [[404, 'oggetto-non-trovato'], [409, 'categoria-lettura-collegata']],
  },
  'POST /api/catalogo-oggetti/:categoria/:slug/ripristina': {
    sommario: 'Ripristina i dati della guida dalla copia conservata',
    descrizione: 'Ripristina soltanto i campi dell’identità nello snapshot; non ripristina offerte o avanzamenti di partita. Controlla anche il JSON interno di alias/statistiche e gli stessi vincoli della creazione. Una copia assente, incompleta, incompatibile o illeggibile produce 409 prima della scrittura. La chiave e i riferimenti restano gli stessi.',
    risposta: 'CatalogoOggettoDto ripristinato',
    senzaCorpo: true,
    errori: [[404, 'oggetto-non-trovato'], [409, 'oggetto-senza-snapshot'], [409, 'snapshot-oggetto-non-valido'], [409, 'snapshot-oggetto-incompleto'], [409, 'categoria-lettura-collegata']],
  },
  'DELETE /api/catalogo-oggetti/:categoria/:slug': {
    sommario: 'Elimina un’identità passando dal cestino',
    descrizione: 'La rimozione usa il cestino comune con il registro delle dipendenze per il ripristino. Non è una fusione: per trasferire esplicitamente collegamenti e alias a un’altra identità si usa la proposta di tipo catalogo o il gesto di legame corrispondente.',
    risposta: '{ eliminato: true, chiave }',
    senzaCorpo: true,
    errori: [[404, 'oggetto-non-trovato']],
  },
  'GET /api/catalogo-oggetti/proposte': {
    sommario: 'Elenca abbinamenti, rettifiche e fusioni da approvare',
    descrizione: 'Filtri per tipo, chiave della riga e stato; lo stato predefinito è da-approvare. Ogni proposta mostra fonte/testo attuali, identità candidata, gruppo di alternative, quantità, nota del contenuto, motivo, certezza e rettifiche commerciali previste. Le fonti dei premi e delle voci sono lette in blocco. Una lettura non conferma né modifica la fonte. Un gruppo è un contenuto distinto, non l’insieme degli oggetti di tutta la voce.',
    risposta: 'Elenco di PropostaAbbinamentoDto. Le proposte di baratto composto espongono nomeOfferta, costo per chiave, ricevuti con quantità/note e notaOfferta; riferimenti letti in blocco. La capsula candidata è quella da cedere, non un risultato o un oggetto-bundle.',
    errori: [[409, 'categoria-proposta-non-valida'], [409, 'proposta-non-leggibile'], [409, 'proposta-non-valida']],
  },
  'POST /api/catalogo-oggetti/proposte/conferma': {
    sommario: 'Conferma una proposta e le sole alternative del suo gruppo',
    descrizione: 'Identifica tipo/chiave della riga, oggetto candidato e gruppo. Il corpo storico senza gruppo si accetta solo se non ambiguo. Applica in transazione e scarta solo gli altri candidati dello stesso gruppo; una conferma già applicata è idempotente. Conserva quantità e nota originali, compresa la quantità null del prodotto di ricetta. Un contenuto distinto può sommarsi a un legame già presente; la resa di ricetta non è additiva. Le note precedenti non vengono cancellate. Le rettifiche con confronto del valore precedente rifiutano una riga cambiata nel frattempo. La fusione passa dal cestino e non può perdere avanzamenti di letture distinte.',
    risposta: '{ confermata: true }. Prima della conferma si confrontano fonte e collegamenti correnti con lo snapshot di generazione: una fonte cambiata o uno snapshot assente produce 409 fonte-cambiata-dopo-proposta. Un baratto composto crea in transazione una sola offerta con catalogo_chiave null e risultati in ricompensa_oggetto (fonte articolo); non scrive acquisti né contatori. Rifiuta chiavi occupate, risultati preesistenti o riferimenti non disponibili. Mothman conserva i premi come alternative annotate, non dedotte dalla spunta.',
    errori: [[404, 'proposta-non-trovata'], [409, 'gruppo-proposta-richiesto'], [409, 'proposta-scartata'], [409, 'riga-cambiata-dopo-proposta'], [409, 'fonte-cambiata-dopo-proposta'], [409, 'fusione-letture-distinte'], [409, 'fusione-proposte-incompatibili'], [409, 'fusione-troppi-alias'], [409, 'fusione-costo-non-valido'], [409, 'articolo-proposta-occupato'], [409, 'risultati-proposta-occupati'], [409, 'baratto-proposta-incompatibile'], [409, 'fusione-proposta-non-valida'], [409, 'fusione-risultati-alternativi']],
  },
  'POST /api/catalogo-oggetti/proposte/scarta': {
    sommario: 'Scarta una proposta senza applicarla alla fonte',
    descrizione: 'Scarta soltanto il candidato identificato, non tutti gli oggetti della voce né le altre alternative. Una proposta già confermata non si può scartare per annullarne gli effetti: si modifica il legame o si usa il ripristino del cestino per una fusione.',
    risposta: '{ scartata: true }',
    errori: [[404, 'proposta-non-trovata'], [409, 'gruppo-proposta-richiesto'], [409, 'proposta-gia-confermata']],
  },
  'PUT /api/catalogo-oggetti/legami': {
    sommario: 'Collega, sostituisce o toglie un riferimento per chiave',
    descrizione: 'Il tipo della riga distingue articolo, regalo, voce, materiale di ricetta, ricompensa e fusione di catalogo. Per una ricompensa la chiave della riga è tipoFonte/chiaveFonte; il Covo usa il nome completo della riga della guida. Quantità positive intere, oppure null solo per ricompensa di ricetta. Nota omessa conserva quella del legame; null manuale esplicito la cancella. precedente_catalogo_chiave richiede che il legame esista e non consente di sovrascrivere un altro contenuto già presente. proposta_catalogo_chiave sceglie un’alternativa preservando quantità/nota della proposta se omesse e risolve soltanto il gruppo scelto. Un’identità nascosta già collegata può essere conservata, non scelta come nuovo contenuto. Togliere e scegliere un’alternativa sono gesti distinti. Non sincronizza testo della guida, pin o avanzamento.',
    risposta: '{ salvato: true }; articolo/chiaveOfferta è anche una fonte di ricompensa per correggere i risultati dal listino. Scegliere un’alternativa a una proposta richiede ancora lo snapshot coerente della fonte (409 fonte-cambiata-dopo-proposta); una correzione manuale esplicita resta distinta. Non si possono mescolare oggetto singolo e risultati separati. La fusione trasferisce anche costi/risultati interni alle proposte e i riferimenti noti degli snapshot, con lo stesso schema di validazione; rifiuta alternative con note diverse, quantità incompatibili, costi non validi o più di 60 alias. Non raddoppia un risultato equivalente. Una vecchia proposta scartata non annulla una pendente; varianti e cambi restano nel registro del cestino.',
    errori: [[404, 'oggetto-non-trovato'], [404, 'fonte-ricompensa-non-trovata'], [409, 'contenuto-cambiato'], [409, 'contenuto-destinazione-presente'], [409, 'proposta-gia-gestita'], [409, 'fonte-cambiata-dopo-proposta'], [409, 'offerta-gia-collegata'], [409, 'offerta-con-risultati'], [400, 'gesti-legame-distinti']],
  },
};
