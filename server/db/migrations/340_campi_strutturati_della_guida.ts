// ============================================================
// Migrazione 340 — i requisiti, le date e i livelli dei testi della guida che l'app può usare, come campi strutturati (L8-03)
// ============================================================
//
// Voce di piano L8-03, decisione D4 di Roberto: «Solo i campi che l'app può usare: requisiti, date, prezzi». Il censimento in sola lettura
// (verifica-L8b, l8-03_censimento) ha cercato nei blocchi `sfide`, `battaglia`, `completamento` e `oggetti-guida` i testi con requisiti, date
// e prezzi e li ha confrontati con le strutture che ci sono già. I prezzi hanno già il loro punto unico (catalogo e listini) e non si toccano.
// Qui si aggiungono, accanto ai testi, i soli campi che la partita sa valutare:
//   - `battaglia.speciali.elenco[]`: `condizioniJson`, lo sblocco (8 Speciali: la data, più il rango massimo di Kasumi per l'ultimo);
//   - `battaglia.mietitore`: `livelloMinimo` (60);
//   - `sfide.battaglieSfida.elenco[]`: `livelloMinimo`, il livello consigliato più basso (6 sfide; la Trial, con un livello
//     per ognuno dei suoi cinque livelli, resta senza numero);
//   - `sfide.bossSegreti[]`: `condizioniJson` (Nuova Partita+, la finestra 9/5–22/12, il terzo semestre) e `livelloMinimo` (99);
//   - `completamento.finali[]`: `condizioniJson` ed `entro` (il rango 9 di Maruki entro il 17 novembre per il finale Royal e per il negativo 3,
//     che passa dal terzo semestre; il suo contrario per il finale standard);
//   - `completamento.covo.sfide[]`: `conteggio` per le 17 sfide che contano uno stato che la partita tiene (attività svolte, lavori, contatori,
//     cruciverba risolti, timbri, yen spesi in un negozio, Confidenti al rango massimo, Richieste completate, Compendio, livello di una Persona);
//     dove il testo dice «tutti», il conteggio non ha un obiettivo scritto e il totale lo ricava il server dal DB a ogni lettura;
//   - `oggetti-guida.fabbricazione.ricette[]`: `condizioniJson`, l'arco dei Palazzi dei materiali avanzati (3 ricette; per il
//     Grimaldello duraturo «almeno una» fra l'arco di Niijima e il Dedalo di Kaitul aperto, le due fonti che la guida nomina).
// Gli altri elementi degli stessi elenchi ricevono il campo vuoto (`'[]'`, `null`), perché la finestra «Modifica» lo offra a tutti.
//
// COSA (conservativa, idempotente): un campo si scrive solo se l'elemento c'è una volta sola e il suo testo è ancora quello letto dal
// censimento, parola per parola; un campo già presente non si tocca (seconda esecuzione: niente da fare). Nessun testo cambia: i testi della
// guida restano nel blocco (il «Ripristina» li rimette com'erano), e le correzioni dell'utente stanno in `correzione_dati_guida`, che qui non
// si tocca. Le altre chiavi di `dati_guida`, le voci del Diario, i Palazzi e le spunte delle partite restano identiche (impronte prima e dopo).
// Audit in `dati_guida.audit-340-campi-guida`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';

const AUDIT = 'audit-340-campi-guida';
const BLOCCHI = ['sfide', 'battaglia', 'completamento', 'oggetti-guida'] as const;
/** Le tabelle che non devono cambiare: Diario, effetti, Palazzi e loro aree. */
const INTATTE = ['voce_giornata', 'voce_effetto', 'voce_infiltrazione', 'dungeon', 'dungeon_area', 'giorno'] as const;
const errore = (motivo: string): never => { throw new Error(`340: ${motivo}; nessuna modifica applicata.`); };

type Oggetto = Record<string, unknown>;
const eOggetto = (v: unknown): v is Oggetto => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Le condizioni come le scrive `normalizzaRequisitoSpillo` (stesso ordine delle chiavi), perché il «Ripristina» le confronti alla pari. */
const data = (dal: string) => ({ tipo: 'data', dal });
const SPECIALI: ReadonlyArray<{ nome: string; sblocco: string; condizioni: unknown[] }> = [
  { nome: 'Via col piombo', sblocco: '21 giugno', condizioni: [data('06-21')] },
  { nome: 'Mad Moxie', sblocco: '22 giugno', condizioni: [data('06-22')] },
  { nome: 'Gyudon senza gloria', sblocco: '17 luglio', condizioni: [data('07-17')] },
  { nome: 'Kabuki Kid', sblocco: '19 settembre', condizioni: [data('09-19')] },
  { nome: 'Duri al volante', sblocco: '20 settembre', condizioni: [data('09-20')] },
  { nome: 'Andarci giù duro', sblocco: '30 ottobre', condizioni: [data('10-30')] },
  { nome: 'Taglienti come lame', sblocco: '2 gennaio', condizioni: [data('01-02')] },
  { nome: 'Ballando con i Ladri', sblocco: '20 gennaio (richiede Rango Confidente Fede di Kasumi al livello massimo)',
    condizioni: [data('01-20'), { tipo: 'confidente', confidente: 'kasumi', rango: 10 }] },
];
const MIETITORE = { livelloConsigliato: 'Almeno livello 60; scontro più gestibile a livello 70-75.', livelloMinimo: 60 };
const BATTAGLIE_SFIDA: ReadonlyArray<{ chiave: string; livelloConsigliato: string; livelloMinimo: number | null }> = [
  // la Trial ha un livello consigliato per ognuno dei suoi cinque livelli (10, 40, 60, 90): un numero solo direbbe «raggiunto» a chi è pronto
  // per il primo e non per gli altri; resta il testo, senza numero
  { chiave: 'trial', livelloConsigliato: 'Variabile per livello: ~Lv 10 (sfida Lv10), ~Lv 40 (sfide Lv20 e Lv30), ~Lv 60 (sfida Lv50), ~Lv 90 (sfida Lv80)', livelloMinimo: null },
  { chiave: 'chain', livelloConsigliato: '~Lv 40, dopo il Palazzo di Futaba', livelloMinimo: 40 },
  { chiave: 'technical', livelloConsigliato: '~Lv 40', livelloMinimo: 40 },
  { chiave: 'survival', livelloConsigliato: '~Lv 90, dopo le Profondità dei Memento', livelloMinimo: 90 },
  { chiave: 'trickster', livelloConsigliato: '~Lv 90, dopo le Profondità dei Memento', livelloMinimo: 90 },
  { chiave: 'full-moon', livelloConsigliato: 'Lv 90 (sfida Lv50) / Lv 99 (sfida Lv???), difficoltà Spietata', livelloMinimo: 90 },
  { chiave: 'foggy-day', livelloConsigliato: 'Lv 90 (sfida Lv50) / Lv 99 (sfida Lv???), difficoltà Spietata', livelloMinimo: 90 },
];
const BOSS: ReadonlyArray<{ chiave: string; requisiti: string[]; livelloConsigliato: string; condizioni: unknown[]; livelloMinimo: number }> = [
  { chiave: 'gemelle-custodi', requisiti: ['Nuova Partita + avviata', 'Finestra temporale: 9 maggio - 22 dicembre'], livelloConsigliato: 'Party al livello 99',
    condizioni: [{ tipo: 'nuova-partita-plus' }, { tipo: 'intervallo', dal: '05-09', al: '12-22' }], livelloMinimo: 99 },
  { chiave: 'lavenza', requisiti: ['Nuova Partita + avviata, terzo semestre', 'Rango Staffetta al massimo', 'Rango Tecnico al massimo', 'Personae di terzo livello (eccetto Akechi)', 'Migliori armi e armature disponibili'],
    livelloConsigliato: 'Party al livello 99', condizioni: [{ tipo: 'nuova-partita-plus' }, { tipo: 'evento', evento: 'terzo-semestre-avviato' }], livelloMinimo: 99 },
];
const FINALI: ReadonlyArray<{ chiave: string; condizione0: string; condizioni: unknown[]; entro: string }> = [
  { chiave: 'finale-perfetto-royal',
    condizione0: 'Portare il Rango Confidente di Takuto Maruki (Consigliere) almeno a 9 entro il 17 novembre (la guida riepiloga anche come "prima del 18/11"): è la condizione che sblocca il terzo semestre e distingue il finale Royal da quello standard.',
    condizioni: [{ tipo: 'confidente', confidente: 'maruki', rango: 9 }], entro: '11-17' },
  { chiave: 'finale-standard', condizione0: 'NON portare il Rango Confidente di Maruki al livello 9 entro il 17 novembre: il terzo semestre non si sblocca.',
    condizioni: [{ tipo: 'non', condizione: { tipo: 'confidente', confidente: 'maruki', rango: 9 } }], entro: '11-17' },
  // il finale negativo 3 si raggiunge solo dal terzo semestre: la guida lo dice con lo stesso requisito del finale Royal
  { chiave: 'finale-negativo-3', condizione0: 'Aver sbloccato il terzo semestre (Rango Maruki 9 entro il 17 novembre).',
    condizioni: [{ tipo: 'confidente', confidente: 'maruki', rango: 9 }], entro: '11-17' },
];
const COVO: ReadonlyArray<{ nome: string; requisito: string; conteggio: Oggetto }> = [
  { nome: "Dita d'oro", requisito: 'Portare a termine tutti i videogiochi di Persona 5 Royal (facilitati dal libro "Segreti di gioco" acquistabile a Shinjuku dopo aver provato almeno un gioco; la maggior parte è ad Akihabara).',
    // «tutti»: nessun obiettivo scritto, il totale lo conta il server a ogni lettura (le attività `videogioco` del DB)
    conteggio: { tipo: 'contatore', contatore: 'videogiochi-completati' } },
  { nome: "Bagnante d'onore di Yongen", requisito: 'Frequentare il bagno pubblico "Fuji no Yu" di Yongen-Jaya per 15 volte.',
    conteggio: { tipo: 'attivita', attivita: 'bagno-pubblico-yongen-jaya', obiettivo: 15 } },
  { nome: 'La leggenda del Drago Nascente', requisito: "Completare 13 sessioni di allenamento in palestra (la tredicesima consiste nell'abbattere il manichino).",
    conteggio: { tipo: 'attivita', attivita: 'allenamento-palestra-protein-lovers', obiettivo: 13 } },
  { nome: 'Topo di biblioteca', requisito: 'Leggere un totale di 40 libri (il libro "Lettura rapida", disponibile dal 7 gennaio dalla biblioteca della Shujin, raddoppia la velocità di lettura).',
    conteggio: { tipo: 'contatore', contatore: 'libri-letti', obiettivo: 40 } },
  { nome: 'Amante delle freccette', requisito: 'Giocare a freccette a Kichijoji per un totale di 10 volte (aumenta il Rango Staffetta).',
    conteggio: { tipo: 'attivita', attivita: 'freccette', obiettivo: 10 } },
  { nome: 'Maniaco del biliardo', requisito: 'Giocare a biliardo (Penguin Sniper, Kichijoji) per 5 volte (sbloccato al Rango 2 con Akechi); aumenta il Rango tecnico.',
    conteggio: { tipo: 'attivita', attivita: 'biliardo', obiettivo: 5 } },
  { nome: 'Mago delle parole', requisito: 'Risolvere almeno 15 cruciverba (compaiono circa una volta a settimana sul tavolo del Leblanc).',
    conteggio: { tipo: 'cruciverba-risolti', obiettivo: 15 } },
  { nome: 'Studente lavoratore', requisito: 'Lavorare part-time per un totale di 15 volte.',
    conteggio: { tipo: 'attivita-del-tipo', tipoAttivita: 'lavoro', obiettivo: 15 } },
  // «tutti»: i totali (Confidenti, Confidenti romanzabili, Richieste, Persona del Compendio) li conta il server dal DB a ogni lettura
  { nome: 'Il club dei Ladri Fantasma', requisito: 'Massimizzare (Rango 10) tutti i Confidenti del gioco.',
    conteggio: { tipo: 'confidenti-al-massimo', quali: 'tutti' } },
  { nome: 'Dongiovanni', requisito: "Iniziare una relazione amorosa con ciascuno dei 10 Confidenti romantici e raggiungere l'evento di Rango 10 per tutti e 10.",
    conteggio: { tipo: 'confidenti-al-massimo', quali: 'in-relazione' } },
  { nome: 'Siamo tutti uguali', requisito: 'Stringere un forte legame di amicizia (Rango 10, senza relazione romantica) con ciascuno dei 10 Confidenti con cui sarebbe possibile una relazione romantica.',
    conteggio: { tipo: 'confidenti-al-massimo', quali: 'amici' } },
  { nome: 'Stanco delle spese', requisito: 'Spendere un totale di 500.000 yen alla Clinica Medica di Tae Takemi a Yongen-Jaya.',
    conteggio: { tipo: 'spesa-negozio', negozio: 'clinica-takemi', obiettivo: 500000 } },
  { nome: 'Ricco guerrafondaio', requisito: "Spendere un totale di 1.000.000 di yen al negozio softair Untouchable di Munehisa Iwai (acquistare e poi rivendere protezioni/accessori riduce l'impatto economico).",
    conteggio: { tipo: 'spesa-negozio', negozio: 'untouchable', obiettivo: 1000000 } },
  { nome: 'Missione compiuta', requisito: 'Completare tutte le richieste nei Memento, il che richiede di portare avanti quasi tutti i Confidenti (molte richieste si sbloccano fra Rango 7 e 8; il Confidente di Mishima ne introduce molte).',
    conteggio: { tipo: 'richieste-completate' } },
  { nome: 'Collezionista di maschere', requisito: 'Completare il Compendio delle Personae (le Personae DLC non contano): richiede tutti i Confidenti al massimo per le Personae supreme di ogni Arcano, lo sblocco degli eventi del terzo semestre, tutti i Demoni del Tesoro, alcune Richieste specifiche nei Memento (es. "Bullismo sui bulli" per Black Frost, "La stalker informatica" per Babau) e la Persona Satanael, ottenibile solo in Nuova Partita+.',
    conteggio: { tipo: 'compendio-registrato' } },
  { nome: 'Una bellissima maschera', requisito: 'Potenziare una Persona fino al Livello 99 (nel terzo semestre facilitato usando ripetutamente la Ghigliottina durante gli Allarmi fusione).',
    conteggio: { tipo: 'persona-livello', obiettivo: 99 } },
  { nome: 'Timbri ovunque', requisito: "Raccogliere un totale di 150 timbri nei Memento (facilitato dall'abilità Scansione dei Memento di Futaba, oltre il Rango 2 con lei).",
    conteggio: { tipo: 'timbri-raccolti', obiettivo: 150 } },
];
const RICETTE: ReadonlyArray<{ attrezzo: string; sblocco: string; condizioni: unknown[] }> = [
  { attrezzo: 'Grimaldello duraturo', sblocco: "Richiede i materiali avanzati (Foglio d'alluminio, Mercurio) disponibili dal Palazzo di Niijima/Dedalo di Kaitul in poi; ottenibile solo tramite fabbricazione",
    // «dal Palazzo di Niijima/Dedalo di Kaitul»: le due fonti dei materiali, alla lettera «almeno una» (il Dedalo di Kaitul si apre prima)
    condizioni: [{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [{ tipo: 'arco', dungeon: 'niijima' }, { tipo: 'evento', evento: 'dedalo-kaitul-aperto' }] }] },
  { attrezzo: 'Nebbia ipnotica', sblocco: 'Ottenibile esclusivamente tramite fabbricazione (richiede la Sabbia ferrea, materiale avanzato dal Palazzo di Kaneshiro in poi)',
    condizioni: [{ tipo: 'arco', dungeon: 'kaneshiro' }] },
  { attrezzo: 'Ribalta', sblocco: 'Richiede materiali avanzati (dal Palazzo di Futaba in poi); ottenibile esclusivamente tramite fabbricazione',
    condizioni: [{ tipo: 'arco', dungeon: 'futaba' }] },
];

/** Il conto di un campo: scritti col valore strutturato, vuoti aggiunti, già presenti, fermi (testo diverso o elemento non unico). */
interface Conto { scritti: string[]; vuoti: number; giaPresenti: number; fermi: Array<{ id: string; motivo: string }> }
const conto = (): Conto => ({ scritti: [], vuoti: 0, giaPresenti: 0, fermi: [] });
const uguale = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Su un elenco di elementi: il campo `campo` col valore della regola dove l'elemento (unico per `sel`) ha ancora il testo atteso, il valore
 * vuoto agli elementi senza regola. Mai sopra un campo già presente; un elemento con regola fermato resta senza campo (si vede nell'audit).
 */
function applica(elenco: unknown, sel: string, campo: string, vuoto: unknown, regole: ReadonlyArray<{ chiave: string; atteso: (e: Oggetto) => boolean; valore: unknown }>, c: Conto, via: string): boolean {
  if (!Array.isArray(elenco)) { c.fermi.push({ id: via, motivo: 'elenco assente' }); return false; }
  let cambiato = false;
  for (const r of regole) {
    const trovati = elenco.filter((e) => eOggetto(e) && e[sel] === r.chiave);
    if (trovati.length !== 1) { c.fermi.push({ id: `${via}[${sel}=${r.chiave}]`, motivo: `elementi trovati: ${trovati.length}` }); continue; }
    const e = trovati[0] as Oggetto;
    if (campo in e) { c.giaPresenti++; continue; }
    if (!r.atteso(e)) { c.fermi.push({ id: `${via}[${sel}=${r.chiave}]`, motivo: 'testo diverso da quello del censimento' }); continue; }
    e[campo] = r.valore; c.scritti.push(r.chiave); cambiato = true;
  }
  for (const e of elenco) {
    if (!eOggetto(e) || regole.some((r) => r.chiave === e[sel])) continue;
    if (campo in e) { c.giaPresenti++; continue; }
    e[campo] = vuoto; c.vuoti++; cambiato = true;
  }
  return cambiato;
}

/** L'impronta delle correzioni dell'utente (`correzione_dati_guida` è WITHOUT ROWID: si ordina per la chiave, non per `rowid`). */
function improntaCorrezioni(db: AppDatabase): string {
  return JSON.stringify(db.prepare('SELECT * FROM main.correzione_dati_guida ORDER BY blocco, percorso').all());
}

/** L'impronta delle righe di `dati_guida` diverse dai quattro blocchi e dall'audit di questa migrazione. */
function improntaAltriBlocchi(db: AppDatabase): string {
  const righe = db.prepare(`SELECT chiave, json FROM main.dati_guida WHERE chiave NOT IN (${BLOCCHI.map(() => '?').join(',')}, ?) ORDER BY chiave`).all(...BLOCCHI, AUDIT) as Array<{ chiave: string; json: string }>;
  return JSON.stringify(righe.map((r) => [r.chiave, r.json]));
}

export const migration340: Migration = {
  id: 340,
  name: 'campi_strutturati_della_guida',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'dati_guida')) { logger.warn({ migrazione: 340 }, 'dati della guida assenti: campi non aggiunti'); return; }

    const prima = new Map<string, string>();
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));
    const altriPrima = improntaAltriBlocchi(db);
    const correzioniPrima = esisteTabella(db, 'correzione_dati_guida') ? improntaCorrezioni(db) : null;
    const contaSpunte = (): number | null => {
      try { return db.prepare('SELECT COUNT(*) FROM utente.spunta_voce_partita').pluck().get() as number; } catch { return null; }
    };
    const spuntePrima = contaSpunte();

    const leggi = (k: string): Oggetto | null => {
      const t = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(k) as string | undefined;
      if (!t) return null;
      const v = JSON.parse(t) as unknown;
      return eOggetto(v) ? v : null;
    };
    const audit: Record<string, Conto | string> = {};
    const scrivere = new Map<string, Oggetto>();

    // ---- battaglia ----
    const b = leggi('battaglia');
    if (!b) audit.battaglia = 'blocco assente';
    else {
      const sp = conto(), mi = conto();
      const speciali = eOggetto(b.speciali) ? b.speciali.elenco : undefined;
      const c1 = applica(speciali, 'nome', 'condizioniJson', '[]',
        SPECIALI.map((x) => ({ chiave: x.nome, atteso: (e: Oggetto) => e.sblocco === x.sblocco, valore: JSON.stringify(x.condizioni) })), sp, 'battaglia.speciali.elenco');
      let c2 = false;
      if (!eOggetto(b.mietitore)) mi.fermi.push({ id: 'battaglia.mietitore', motivo: 'sezione assente' });
      else if ('livelloMinimo' in b.mietitore) mi.giaPresenti++;
      else if (b.mietitore.livelloConsigliato !== MIETITORE.livelloConsigliato) mi.fermi.push({ id: 'battaglia.mietitore', motivo: 'testo diverso da quello del censimento' });
      else { b.mietitore.livelloMinimo = MIETITORE.livelloMinimo; mi.scritti.push('mietitore'); c2 = true; }
      audit['battaglia.speciali.condizioniJson'] = sp; audit['battaglia.mietitore.livelloMinimo'] = mi;
      if (c1 || c2) scrivere.set('battaglia', b);
    }

    // ---- sfide ----
    const s = leggi('sfide');
    if (!s) audit.sfide = 'blocco assente';
    else {
      const bs = conto(), bc = conto(), bl = conto();
      const elenco = eOggetto(s.battaglieSfida) ? s.battaglieSfida.elenco : undefined;
      const c1 = applica(elenco, 'chiave', 'livelloMinimo', null,
        BATTAGLIE_SFIDA.map((x) => ({ chiave: x.chiave, atteso: (e: Oggetto) => e.livelloConsigliato === x.livelloConsigliato, valore: x.livelloMinimo })), bs, 'sfide.battaglieSfida.elenco');
      const c2 = applica(s.bossSegreti, 'chiave', 'condizioniJson', '[]',
        BOSS.map((x) => ({ chiave: x.chiave, atteso: (e: Oggetto) => uguale(e.requisiti, x.requisiti), valore: JSON.stringify(x.condizioni) })), bc, 'sfide.bossSegreti');
      const c3 = applica(s.bossSegreti, 'chiave', 'livelloMinimo', null,
        BOSS.map((x) => ({ chiave: x.chiave, atteso: (e: Oggetto) => e.livelloConsigliato === x.livelloConsigliato, valore: x.livelloMinimo })), bl, 'sfide.bossSegreti');
      audit['sfide.battaglieSfida.livelloMinimo'] = bs; audit['sfide.bossSegreti.condizioniJson'] = bc; audit['sfide.bossSegreti.livelloMinimo'] = bl;
      if (c1 || c2 || c3) scrivere.set('sfide', s);
    }

    // ---- completamento ----
    const c = leggi('completamento');
    if (!c) audit.completamento = 'blocco assente';
    else {
      const fc = conto(), fe = conto(), cv = conto();
      const primaCondizione = (x: { condizione0: string }) => (e: Oggetto) => Array.isArray(e.condizioni) && e.condizioni[0] === x.condizione0;
      const c1 = applica(c.finali, 'chiave', 'condizioniJson', '[]', FINALI.map((x) => ({ chiave: x.chiave, atteso: primaCondizione(x), valore: JSON.stringify(x.condizioni) })), fc, 'completamento.finali');
      const c2 = applica(c.finali, 'chiave', 'entro', null, FINALI.map((x) => ({ chiave: x.chiave, atteso: primaCondizione(x), valore: x.entro })), fe, 'completamento.finali');
      // le sfide del Covo: il conteggio solo dove serve (nessun vuoto: senza `conteggio` la sfida non conta niente, come prima della 258)
      let c3 = false;
      const sfide = eOggetto(c.covo) ? c.covo.sfide : undefined;
      if (!Array.isArray(sfide)) cv.fermi.push({ id: 'completamento.covo.sfide', motivo: 'elenco assente' });
      else for (const x of COVO) {
        const trovate = sfide.filter((e) => eOggetto(e) && e.nome === x.nome) as Oggetto[];
        if (trovate.length !== 1) { cv.fermi.push({ id: `completamento.covo.sfide[nome=${x.nome}]`, motivo: `elementi trovati: ${trovate.length}` }); continue; }
        const e = trovate[0]!;
        if (e.conteggio !== undefined) { cv.giaPresenti++; continue; }
        if (e.requisito !== x.requisito) { cv.fermi.push({ id: `completamento.covo.sfide[nome=${x.nome}]`, motivo: 'testo diverso da quello del censimento' }); continue; }
        e.conteggio = { ...x.conteggio }; cv.scritti.push(x.nome); c3 = true;
      }
      audit['completamento.finali.condizioniJson'] = fc; audit['completamento.finali.entro'] = fe; audit['completamento.covo.sfide.conteggio'] = cv;
      if (c1 || c2 || c3) scrivere.set('completamento', c);
    }

    // ---- oggetti-guida ----
    const o = leggi('oggetti-guida');
    if (!o) audit['oggetti-guida'] = 'blocco assente';
    else {
      const rc = conto();
      const ricette = eOggetto(o.fabbricazione) ? o.fabbricazione.ricette : undefined;
      const c1 = applica(ricette, 'attrezzo', 'condizioniJson', '[]',
        RICETTE.map((x) => ({ chiave: x.attrezzo, atteso: (e: Oggetto) => e.sblocco === x.sblocco, valore: JSON.stringify(x.condizioni) })), rc, 'oggetti-guida.fabbricazione.ricette');
      audit['oggetti-guida.fabbricazione.ricette.condizioniJson'] = rc;
      if (c1) scrivere.set('oggetti-guida', o);
    }

    const aggiorna = db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ?');
    for (const [k, v] of scrivere) if (aggiorna.run(JSON.stringify(v), k).changes !== 1) errore(`il blocco ${k} non si scrive`);

    const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
    let esecuzioni: unknown[] = [];
    if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
    db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
      .run(AUDIT, JSON.stringify({ migrazione: 340, voce: 'L8-03', decisione: 'D4', esecuzioni: [...esecuzioni, { il: new Date().toISOString(), blocchiScritti: [...scrivere.keys()], campi: audit }] }));

    // le verifiche: le altre chiavi della guida, le correzioni dell'utente, il Diario, i Palazzi e le spunte identici
    if (improntaAltriBlocchi(db) !== altriPrima) errore('altre chiavi di dati_guida sono cambiate');
    if (correzioniPrima !== null && improntaCorrezioni(db) !== correzioniPrima) errore('le correzioni dell’utente sono cambiate');
    for (const t of INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    if (contaSpunte() !== spuntePrima) errore('le spunte delle partite sono cambiate');
    const fermi = Object.values(audit).reduce((n, x) => n + (typeof x === 'string' ? 0 : x.fermi.length), 0);
    if (fermi) logger.warn({ migrazione: 340, fermi }, 'campi della guida: alcuni elementi non corrispondono al censimento e restano senza campo (vedi audit)');
    logger.info({ migrazione: 340, blocchi: [...scrivere.keys()] }, 'guida: requisiti, date e livelli strutturati accanto ai testi');
  },
};
