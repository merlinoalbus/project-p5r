// ============================================================
// verifica-bundle-rilascio — controllo statico del bundle del frontend di rilascio (L12, passo 8)
// ============================================================
//
//   VITE_MODALITA=rilascio npx vite build --outDir dist-rilascio
//   npx tsx scripts/verifica-bundle-rilascio.ts dist-rilascio [--confronta dist-preparazione]
//
// Non è un test: è un passo di build (`.github/workflows/ci.yml`). Nell'istanza pubblica di rilascio gli utenti non modificano nulla, e il
// frontend non deve nemmeno contenere gli editor e le chiamate all'API che scrivono i contenuti. Il bundler elimina quel codice solo se la
// condizione costante di build sta nello stesso modulo (vedi `src/utils/modalita.ts`): un refuso o un modulo nuovo che dimentica la
// condizione lascia il codice nel bundle SENZA nessun errore a runtime. Questo controllo lo scopre: legge ogni file testuale del `dist` e
// fallisce (codice di uscita 1) se trova una delle stringhe sotto, cioè percorsi dell'API che esistono solo nella preparazione ed
// etichette di strumenti che esistono solo lì.
//
// Come si sceglie una stringa: deve comparire nel bundle di PREPARAZIONE e non poterci stare in un modulo di sola lettura. I percorsi
// condivisi fra una lettura e una scrittura (per esempio `/compendio/dungeon/`, usato anche dal GET) NON vanno in elenco: avrebbero falsi
// allarmi. Con `--confronta <dist di preparazione>` lo script verifica anche che ogni stringa compaia davvero là, così una voce
// diventata obsoleta (rinominata nel codice) non resta in elenco a non controllare più niente.
//
// Il dominio, gli indirizzi e le chiavi dell'istanza non si scrivono qui né altrove nel repository (è pubblico): le stringhe sono tutte
// parti di percorsi relativi dell'API e testi dell'interfaccia.
// ============================================================

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

interface Vietata {
  /** La stringa, cercata tale e quale. */
  testo: string;
  /** Che cosa è, per il messaggio d'errore. */
  cosa: string;
}

/** Percorsi dell'API che scrivono i contenuti o servono solo agli editor: nel rilascio non devono comparire. */
const PERCORSI_VIETATI: readonly Vietata[] = [
  { testo: '/impostazioni/', cosa: 'API delle Impostazioni dei contenuti (pacchetto, backup, cestino dei contenuti)' },
  { testo: '/correzioni', cosa: 'API delle correzioni della guida' },
  { testo: '/mappe/importa', cosa: 'importazione delle mappe' },
  { testo: '/mappe/pezzi', cosa: 'editor delle mappe: pezzi' },
  { testo: '/mappe/spilli', cosa: 'editor delle mappe: pin' },
  { testo: '/passaggi', cosa: 'editor delle mappe: passaggi' },
  { testo: '/aree/colloca', cosa: 'collocazione delle planimetrie' },
  { testo: '/luoghi/posiziona', cosa: 'posizionamento dei luoghi' },
  { testo: '/luoghi/da-pin', cosa: 'creazione di un luogo da un pin' },
  { testo: '/compendio/punti/', cosa: 'scrittura delle voci della guida' },
  { testo: '/compendio/aree/', cosa: 'scrittura delle infiltrazioni' },
  { testo: '/compendio/dedali', cosa: 'scrittura delle aree dei dedali' },
  { testo: '/compendio/aree-dedalo', cosa: 'scrittura delle aree dei dedali' },
  { testo: '/compendio/schede', cosa: 'sistemazione delle schede della guida' },
  { testo: '/compendio/giorni', cosa: 'scrittura dei giorni del diario' },
  { testo: '/compendio/percorso/voci/trasferisci', cosa: 'trasferimento delle voci del diario' },
  // appunti del Diario (2026-10-26): Copia / Taglia / Incolla con gli appunti di sistema, solo nella preparazione
  { testo: '/compendio/percorso/voci/appunti', cosa: 'voci del diario per gli appunti' },
  { testo: '/compendio/percorso/voci/incolla', cosa: 'incolla delle voci del diario' },
  { testo: '/compendio/percorso/voci/operazioni', cosa: 'annullo delle operazioni sulle voci del diario' },
  { testo: 'data-p5r-diario', cosa: 'blocco delle voci del diario negli appunti' },
  { testo: 'p5r-diario-voci', cosa: 'formato delle voci del diario negli appunti' },
  { testo: 'P5R-DIARIO-VOCI', cosa: 'marca del blocco delle voci del diario negli appunti' },
  { testo: '/sblocco', cosa: 'scrittura delle condizioni di sblocco' },
  { testo: '/atterraggi', cosa: 'scrittura degli atterraggi dei Palazzi' },
  { testo: '/doti-incontro', cosa: 'scrittura delle Doti dei Confidenti' },
  { testo: '/ranghi/', cosa: 'scrittura dei ranghi dei Confidenti' },
  { testo: '/abilita/', cosa: 'scrittura delle abilità dei Confidenti' },
  { testo: '/dialoghi/', cosa: 'scrittura dei dialoghi dei Confidenti' },
  { testo: '/affinita', cosa: 'scrittura delle affinità delle Persona' },
  { testo: '/da-url', cosa: 'importazione di immagini da indirizzo' },
  { testo: '/note-storiche', cosa: 'scrittura delle note storiche' },
  { testo: '/catalogo-oggetti/legami', cosa: 'scrittura dei legami degli oggetti' },
  { testo: '/nascosta', cosa: 'nascondere le righe del catalogo' },
  { testo: '/ripristina-costo', cosa: 'ripristino dei costi dei regali' },
  { testo: '/traduzioni/', cosa: 'scrittura delle traduzioni' },
  { testo: '/pesca/regola', cosa: 'scrittura delle regole di pesca' },
  { testo: '/legacy/rimozione', cosa: 'rimozione del vecchio segno «Acquistato» (rotte /partite/:id/acquisti/legacy, escluse dal rilascio)' },
  { testo: '/compendio/proposte-conversione', cosa: 'proposte «da completare» delle voci del Diario (L13, ondata 4a)' },
  // C7 (2026-10-31): gli appunti fissi del Diario, solo nella preparazione
  { testo: '/appunti-fissi', cosa: 'API degli appunti fissi del Diario' },
  { testo: '/api/docs', cosa: 'documentazione delle API' },
  { testo: '/api/openapi.json', cosa: 'documento OpenAPI' },
];

/** Etichette di strumenti di modifica: se compaiono, un editor è rimasto nel bundle. */
const ETICHETTE_VIETATE: readonly Vietata[] = [
  { testo: 'Correggi la scheda', cosa: 'modulo di correzione della scheda' },
  { testo: 'Modifica area', cosa: 'finestra di modifica delle aree' },
  { testo: 'Aggiungi planimetria', cosa: 'finestra di aggiunta delle planimetrie' },
  { testo: 'Elimina area', cosa: 'eliminazione delle aree' },
  { testo: 'Sblocco dell’area', cosa: 'condizione propria delle aree (migrazione 303)' },
  { testo: 'Salva contenuto', cosa: 'modulo del contenuto della guida' },
  { testo: 'Pacchetto di gioco', cosa: 'sezione del pacchetto di gioco' },
  { testo: 'Documentazione delle API', cosa: 'sezione della documentazione delle API' },
  { testo: 'Modifica la guida', cosa: 'modalità «Modifica la guida» dei dedali' },
  { testo: 'Collega pin', cosa: 'collegamento dei pin alle voci' },
  { testo: 'Nuova infiltrazione', cosa: 'modulo della nuova infiltrazione' },
  { testo: 'Aggiungi una voce', cosa: 'aggiunta di voci alla guida' },
  { testo: 'Modifica il giorno', cosa: 'editor del giorno' },
  { testo: 'Aggiungi una Richiesta', cosa: 'aggiunta di Richieste' },
  { testo: 'Modifica requisiti', cosa: 'editor dei requisiti dei Confidenti' },
  { testo: 'Carica file', cosa: 'caricamento di immagini' },
  { testo: 'Rimuovi immagine', cosa: 'rimozione di immagini' },
  { testo: 'Modifica nota', cosa: 'editor delle note storiche' },
  { testo: 'Nuovo oggetto', cosa: 'creazione di oggetti del catalogo' },
  { testo: 'Correggi la regola comune', cosa: 'correzione della regola comune della pesca' },
  { testo: 'Togli solo il vecchio segno', cosa: 'rimozione del vecchio segno «Acquistato» (rotte legacy)' },
  { testo: 'Luoghi da collocare', cosa: 'sezione dei luoghi da collocare con «Colloca»' },
  { testo: 'Proposte da completare', cosa: 'elenco e finestra delle proposte «da completare» (L13, ondata 4a)' },
  { testo: 'Salva negli appunti fissi', cosa: 'salvataggio delle voci del Diario negli appunti fissi (C7)' },
  { testo: 'Riduci a icona gli appunti fissi', cosa: 'finestra fluttuante degli appunti fissi (C7)' },
  { testo: 'p5r.appuntiFissi', cosa: 'stato e posto della finestra degli appunti fissi (C7)' },
  { testo: 'Altre azioni per: ', cosa: 'menu a tendina dei gesti di una voce del Diario (C9, MenuVoce)' },
  { testo: 'Senza condizioni la voce si fa sempre', cosa: 'riquadro «Si fa solo se» del modulo della voce del Diario (L13, O9-3)' },
];

const VIETATE: readonly Vietata[] = [...PERCORSI_VIETATI, ...ETICHETTE_VIETATE];

/** Estensioni dei file che si leggono (il resto, immagini e font, non contiene testo di codice). */
const ESTENSIONI_TESTO = new Set(['.js', '.mjs', '.cjs', '.css', '.html', '.json', '.webmanifest', '.map']);

/** Tutti i file di una cartella, a ogni profondità. */
function elencaFile(cartella: string): string[] {
  const fuori: string[] = [];
  for (const nome of readdirSync(cartella)) {
    const completo = path.join(cartella, nome);
    if (statSync(completo).isDirectory()) fuori.push(...elencaFile(completo));
    else fuori.push(completo);
  }
  return fuori;
}

/** Il testo di tutti i file leggibili del `dist` (le mappe dei sorgenti no: contengono i sorgenti originali e farebbero rumore). */
function leggiDist(cartella: string): Array<{ file: string; testo: string }> {
  return elencaFile(cartella)
    .filter((f) => ESTENSIONI_TESTO.has(path.extname(f)) && !f.endsWith('.map'))
    .map((f) => ({ file: path.relative(cartella, f).replaceAll('\\', '/'), testo: readFileSync(f, 'utf8') }));
}

function main(): number {
  const argomenti = process.argv.slice(2);
  const iConfronta = argomenti.indexOf('--confronta');
  const cartellaConfronto = iConfronta >= 0 ? argomenti[iConfronta + 1] : undefined;
  if (iConfronta >= 0 && !cartellaConfronto) { console.error('--confronta vuole la cartella del bundle di preparazione'); return 2; }
  // la cartella del bundle di rilascio è il primo argomento che non è un'opzione né il valore di `--confronta`
  const cartella = argomenti.find((a, i) => !a.startsWith('--') && (iConfronta < 0 || i !== iConfronta + 1)) ?? 'dist';
  if (!statSync(cartella, { throwIfNoEntry: false })?.isDirectory()) { console.error(`Cartella non trovata: ${cartella}`); return 2; }

  const file = leggiDist(cartella);
  if (file.length === 0) { console.error(`Nessun file leggibile in ${cartella}: la build è vuota?`); return 2; }

  let errori = 0;
  for (const v of VIETATE) {
    const dove = file.filter((f) => f.testo.includes(v.testo)).map((f) => f.file);
    if (dove.length > 0) {
      errori += 1;
      console.error(`VIETATA «${v.testo}» (${v.cosa}) trovata in: ${dove.slice(0, 5).join(', ')}${dove.length > 5 ? ` e altri ${dove.length - 5}` : ''}`);
    }
  }

  // le stringhe devono esistere nella preparazione, altrimenti non controllano più niente
  if (cartellaConfronto) {
    const preparazione = leggiDist(cartellaConfronto);
    for (const v of VIETATE) {
      if (!preparazione.some((f) => f.testo.includes(v.testo))) {
        errori += 1;
        console.error(`OBSOLETA «${v.testo}» (${v.cosa}): non compare nemmeno nel bundle di preparazione, va aggiornato l'elenco`);
      }
    }
  }

  if (errori > 0) {
    console.error(`\nBundle di rilascio NON valido: ${errori} problema/i. Dove c'è una VIETATA, il modulo che la contiene deve escludere il ramo di modifica con la condizione costante di build (vedi src/utils/modalita.ts).`);
    return 1;
  }
  console.log(`Bundle di rilascio valido: ${file.length} file controllati, ${VIETATE.length} stringhe vietate assenti${cartellaConfronto ? ' e tutte presenti nella preparazione' : ''}.`);
  return 0;
}

process.exit(main());
