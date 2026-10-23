// Descrizioni L7 registrate con il router del catalogo e le migrazioni 121/122 e utente 026.
import type { DescrizioniArea } from '../tipi.js';

export const DESCRIZIONI_CATALOGO_OGGETTI: DescrizioniArea = {
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
  'PUT /api/catalogo-oggetti/legami': {
    sommario: 'Collega, sostituisce o toglie un riferimento per chiave',
    descrizione: 'Il tipo della riga distingue articolo, regalo, voce, materiale di ricetta, ricompensa e fusione di catalogo. Per una ricompensa la chiave della riga è tipoFonte/chiaveFonte; il Covo usa il nome completo della riga della guida. Quantità positive intere, oppure null solo per ricompensa di ricetta. Nota omessa conserva quella del legame; null manuale esplicito la cancella. precedente_catalogo_chiave richiede che il legame esista e non consente di sovrascrivere un altro contenuto già presente. proposta_catalogo_chiave sceglie un’alternativa preservando quantità/nota della proposta se omesse e risolve soltanto il gruppo scelto. Un’identità nascosta già collegata può essere conservata, non scelta come nuovo contenuto. Togliere e scegliere un’alternativa sono gesti distinti. Non sincronizza testo della guida, pin o avanzamento.',
    risposta: '{ salvato: true }; articolo/chiaveOfferta è anche una fonte di ricompensa per correggere i risultati dal listino. Scegliere un’alternativa a una proposta richiede ancora lo snapshot coerente della fonte (409 fonte-cambiata-dopo-proposta); una correzione manuale esplicita resta distinta. Non si possono mescolare oggetto singolo e risultati separati. La fusione trasferisce anche costi/risultati interni alle proposte e i riferimenti noti degli snapshot, con lo stesso schema di validazione; rifiuta alternative con note diverse, quantità incompatibili, costi non validi o più di 60 alias. Non raddoppia un risultato equivalente. Una vecchia proposta scartata non annulla una pendente; varianti e cambi restano nel registro del cestino.',
    errori: [[404, 'oggetto-non-trovato'], [404, 'fonte-ricompensa-non-trovata'], [409, 'contenuto-cambiato'], [409, 'contenuto-destinazione-presente'], [409, 'proposta-gia-gestita'], [409, 'fonte-cambiata-dopo-proposta'], [409, 'offerta-gia-collegata'], [409, 'offerta-con-risultati'], [400, 'gesti-legame-distinti']],
  },
};
