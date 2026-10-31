// ============================================================
// edizioneContenuti — il congelamento dei contenuti dentro «Prepara edizione» (L12 · R12-04, Fase 4)
// ============================================================
//
// Due lavori, sulla COPIA di `gioco.db` che `edizioneService` prepara (mai sui dati della preparazione):
//
// 1. `unisciCorrezioniGuida` — le correzioni dell'utente ai blocchi JSON della guida stanno in `correzione_dati_guida` e si applicano IN
//    LETTURA sopra il blocco (`datiGuidaCorretti`). L'edizione deve avere UN valore solo: le correzioni si scrivono dentro i blocchi di
//    `dati_guida` (con la stessa funzione che le applica in lettura, `applicaCorrezioni` di `datiGuida.ts`, senza una seconda copia della
//    logica), poi la tabella nella copia si svuota. Si tolgono anche le fotografie che servivano solo a «Ripristina» (le chiavi
//    `confidente-seed-v1:*` di `dati_guida` e le righe delle tabelle-fotografia `…_foto`): nel rilascio non esiste nessun «Ripristina».
//    **Non si toccano** le colonne `seed_json` e `origine` delle tabelle di contenuto: portano la provenienza che le letture usano per
//    dire «creato da te» / «modificato» (`inviti.ts` `daUtente` = `seed_json IS NULL`, `luoghiService.ts` `modificato`, `catalogoService.ts`
//    conteggi per origine); azzerarle cambierebbe il significato delle righe (una riga della guida diventerebbe «creata dall'utente») e
//    alcune hanno vincoli di forma. Restano come dato di provenienza, senza alcuna funzione di modifica nel rilascio.
//
// 2. `controllaContenuti` — il controllo completo dei contenuti, oggetto per oggetto, con il nome e la pagina dove correggerlo. Distingue
//    BLOCCANTI (l'edizione non esce) e AVVISI. **Nessuna correzione automatica**: si segnala, corregge l'utente nella preparazione.
//      bloccanti: condizioni illeggibili o non riconosciute (oggi diventerebbero «nessuna condizione» e aprirebbero ciò che doveva restare
//                 chiuso: `leggiCondizioniSalvate`), JSON malformati, chiavi che non esistono (riferimenti delle condizioni, violazioni delle
//                 chiavi esterne, riferimenti senza chiave esterna), spilli senza uid;
//      avvisi:    regole di pesca con `puntiBase` diverso da 2 (decisione 2026-10-25: la regola è dell'utente, ma l'acquisto del Fortuna usa 2),
//                 immagini referenziate e assenti (le viste mostrano il segnaposto), correzioni della guida che la guida di oggi non accoglie più.
// ============================================================

import type Database from 'better-sqlite3';
import { applicaCorrezioni, correzioniDelBloccoDi } from './datiGuida.js';
import { foglieCondizione, normalizzaRequisitoSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import type {
  CategoriaProblemaEdizione, ProblemaContenutoEdizioneDto, RiepilogoProblemiEdizioneDto, UnioneBloccoEdizioneDto, UnioneCorrezioniEdizioneDto,
} from '../../shared/types.js';

type Db = Database.Database;
type Gravita = ProblemaContenutoEdizioneDto['gravita'];
type Riga = Record<string, unknown>;

/** Quanti problemi per genere e gravità finiscono nell'elenco leggibile (i totali sono comunque esatti). */
export const MASSIMO_PER_GENERE = 300;
/** Quante condizioni leggono insieme le letture (`CONDIZIONI_PER_GRUPPO` di `shared/condizioniSpillo.ts`): oltre, le altre vengono scartate. */
const CONDIZIONI_LETTE = 20;
/** Le colonne che contengono un elenco di condizioni (stesso elenco della conversione `condizioni/importazione.ts`). */
const COLONNE_CONDIZIONI: readonly string[] = ['condizioni_json', 'sblocco_json', 'condizioni_guida_json'];
/** Il prefisso delle fotografie degli editor dei Confidenti in `dati_guida` (`confidentiScritture.ts`). */
const PREFISSO_FOTOGRAFIE_CONFIDENTI = 'confidente-seed-v1:';

const q = (nome: string): string => `"${nome.replaceAll('"', '""')}"`;
const testo = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : typeof v === 'number' || typeof v === 'bigint' ? String(v) : null);

// ---- Schema ----

/** Vero se la tabella esiste nello schema principale. */
export function haTabella(db: Db, tabella: string): boolean {
  return !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(tabella);
}

/** Le colonne di una tabella dello schema principale (nome e tipo dichiarato). */
function colonneDi(db: Db, tabella: string): Array<{ name: string; type: string }> {
  return db.prepare(`PRAGMA main.table_info(${q(tabella)})`).all() as Array<{ name: string; type: string }>;
}

/** Vero se la tabella (nello schema principale) ha la colonna. */
export function haColonna(db: Db, tabella: string, colonna: string): boolean {
  return colonneDi(db, tabella).some((c) => c.name === colonna);
}

/** I nomi delle tabelle dello schema principale (senza quelle interne di SQLite), in ordine. */
function tabelleDi(db: Db): string[] {
  return (db.prepare("SELECT name FROM main.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").pluck().all() as string[]);
}

/** Vero se la colonna è dichiarata come chiave esterna (allora la controlla già `foreign_key_check`). */
function haChiaveEsterna(db: Db, tabella: string, colonna: string): boolean {
  return (db.prepare(`PRAGMA main.foreign_key_list(${q(tabella)})`).all() as Array<{ from: string }>).some((f) => f.from === colonna);
}

// ---- Chi è una riga, e dove si corregge ----

interface Anagrafica { etichetta: string; pagina?: (r: Riga) => string | null }

/** `/prefisso/<valore>` se il valore c'è, altrimenti il ripiego. */
const con = (valore: unknown, prefisso: string, ripiego: string | null): string | null => {
  const v = testo(valore);
  return v ? `${prefisso}${encodeURI(v)}` : ripiego;
};
const paginaConfidente = (r: Riga): string | null => con(r.confidente_chiave ?? r.chiave, '/confidenti/', '/guida/personaggi');
const paginaDi = (etichetta: string, pagina: string | null): Anagrafica => ({ etichetta, pagina: () => pagina });

/** Per ogni tabella: come chiamarla e la pagina dell'app dove si corregge una sua riga (le pagine sono quelle di `src/router.tsx`). */
const ANAGRAFICA: Record<string, Anagrafica> = {
  negozio: { etichetta: 'Negozio', pagina: (r) => con(r.chiave, '/guida/negozi/', '/guida/negozi') },
  articolo: { etichetta: 'Articolo', pagina: (r) => con(r.negozio_chiave, '/guida/negozi/', '/guida/negozi') },
  luogo: {
    etichetta: 'Luogo',
    pagina: (r) => {
      const chiave = testo(r.chiave);
      if (chiave?.includes('/')) return `/guida/luogo/${encodeURI(chiave)}`;
      const quartiere = testo(r.quartiere_chiave);
      return chiave && quartiere ? `/guida/luogo/${encodeURI(quartiere)}/${encodeURI(chiave)}` : '/guida/citta';
    },
  },
  quartiere: { etichetta: 'Quartiere', pagina: (r) => con(r.chiave, '/guida/citta/', '/guida/citta') },
  attivita: paginaDi('Attività', '/guida/attivita'),
  libro: paginaDi('Libro', '/guida/libri'),
  film: paginaDi('Film', '/guida/film'),
  cruciverba: paginaDi('Cruciverba', '/guida/cruciverba'),
  confidente: { etichetta: 'Confidente', pagina: paginaConfidente },
  confidente_invito: { etichetta: 'Invito di un Confidente', pagina: paginaConfidente },
  confidente_regalo: { etichetta: 'Regalo di un Confidente', pagina: paginaConfidente },
  confidente_dialogo: { etichetta: 'Dialogo di un Confidente', pagina: paginaConfidente },
  confidente_abilita: { etichetta: 'Abilità di un Confidente', pagina: paginaConfidente },
  confidente_rango: { etichetta: 'Rango di un Confidente', pagina: paginaConfidente },
  confidente_disponibilita: { etichetta: 'Disponibilità di un Confidente', pagina: paginaConfidente },
  confidente_dote_incontro: { etichetta: 'Incontro di un Confidente', pagina: paginaConfidente },
  confidente_requisito: { etichetta: 'Requisito di un Confidente', pagina: paginaConfidente },
  confidente_requisito_guida: { etichetta: 'Requisito di un Confidente (guida)', pagina: paginaConfidente },
  dungeon: { etichetta: 'Palazzo o Memento', pagina: (r) => con(r.chiave, '/guida/dungeon/', '/guida/dungeon') },
  dungeon_area: { etichetta: 'Area o infiltrazione di un Palazzo', pagina: () => '/guida/dungeon' },
  punto_interesse: { etichetta: 'Voce della guida di un Palazzo', pagina: () => '/guida/dungeon' },
  area: paginaDi('Area', '/guida/mappe'),
  mappa: { etichetta: 'Planimetria', pagina: (r) => (testo(r.chiave) ? `/guida/mappe/${encodeURI(testo(r.chiave)!)}/modifica` : '/guida/mappe') },
  spillo: { etichetta: 'Pin di una mappa', pagina: (r) => (testo(r.mappa_chiave) ? `/guida/mappe/${encodeURI(testo(r.mappa_chiave)!)}/modifica` : '/guida/mappe') },
  spillo_immagine: paginaDi('Immagine di un pin', '/guida/mappe'),
  richiesta: paginaDi('Richiesta', '/guida/richieste'),
  domanda: paginaDi('Domanda', '/guida/domande'),
  esame: paginaDi('Esame', '/guida/domande'),
  esame_premi: paginaDi('Note sugli esami', '/guida/domande'),
  persona: { etichetta: 'Persona', pagina: (r) => con(r.id, '/compendio/persona/', '/compendio') },
  skill: { etichetta: 'Skill', pagina: (r) => con(r.id, '/skill/', '/skill') },
  allerta_meteo: paginaDi('Allerta meteo', '/guida/calendario'),
  giorno_calendario: paginaDi('Giorno del calendario', '/guida/calendario'),
  evento_calendario: paginaDi('Evento del calendario', '/guida/calendario'),
  // L13 (O7-4, migrazione 313): il «quando» dei trofei è nelle condizioni (`trofeo.condizioni_json`), controllate come le altre
  trofeo: paginaDi('Trofeo', '/guida/completamento'),
  giorno_percorso: paginaDi('Giorno del percorso', '/guida/percorso'),
  voce_giornata: paginaDi('Voce del diario', '/guida/percorso'),
  voce_effetto: paginaDi('Effetto di una voce del diario', '/guida/percorso'),
  voce_infiltrazione: paginaDi('Infiltrazione di una voce del diario', '/guida/percorso'),
  voce_oggetto: paginaDi('Oggetto di una voce della guida', '/guida/oggetti'),
  regola_pesca: paginaDi('Regola di pesca', '/guida/attivita'),
  catalogo_oggetto: paginaDi('Oggetto del catalogo', '/guida/oggetti'),
  immagine: { etichetta: 'Immagine' },
  dati_guida: {
    etichetta: 'Blocco della guida',
    pagina: (r) => PAGINA_BLOCCO[testo(r.chiave) ?? ''] ?? '/guida',
  },
};

/** La pagina che mostra ciascun blocco di `dati_guida` (quelli non elencati: la Guida). */
const PAGINA_BLOCCO: Record<string, string> = {
  'oggetti-guida': '/guida/oggetti', personaggi: '/guida/personaggi', sfide: '/guida/sfide', battaglia: '/guida/battaglia',
  completamento: '/guida/completamento', jose: '/guida/richieste', 'finestre-dungeon': '/guida/dungeon', 'sblocco-quartieri': '/guida/citta',
  'sblocco-luoghi': '/guida/citta', 'note-categorie-attivita': '/guida/attivita',
};

/** Le colonne che bastano a riconoscere una riga e a trovare la sua pagina (solo quelle che la tabella ha). */
const COLONNE_IDENTITA = ['chiave', 'nome', 'uid', 'id', 'data', 'quartiere_chiave', 'mappa_chiave', 'negozio_chiave', 'confidente_chiave'] as const;

/**
 * Chi è la riga `rowid` di `tabella`, in parole («Negozio · Leblanc (leblanc)»), e la pagina dove correggerla. Una tabella senza anagrafica si
 * chiama col suo nome tecnico; una riga che non si legge (tabella senza rowid) resta «la tabella».
 */
export function descriviRiga(db: Db, tabella: string, rowid: number | bigint | null): { oggetto: string; dove: string | null } {
  const anagrafica = ANAGRAFICA[tabella];
  const etichetta = anagrafica?.etichetta ?? tabella;
  let riga: Riga | undefined;
  if (rowid !== null) {
    try {
      const nomi = new Set(colonneDi(db, tabella).map((c) => c.name));
      const colonne = COLONNE_IDENTITA.filter((c) => nomi.has(c));
      if (colonne.length > 0) riga = db.prepare(`SELECT ${colonne.map(q).join(', ')} FROM main.${q(tabella)} WHERE rowid = ?`).get(rowid) as Riga | undefined;
    } catch { /* tabella senza rowid: resta il nome della tabella */ }
  }
  if (!riga) return { oggetto: rowid === null ? etichetta : `${etichetta} · riga ${String(rowid)}`, dove: anagrafica?.pagina ? anagrafica.pagina({}) : null };
  const nome = testo(riga.nome);
  const chiave = testo(riga.chiave) ?? testo(riga.uid) ?? testo(riga.id) ?? (tabella === 'giorno_calendario' ? testo(riga.data) : null);
  const chi = nome && chiave && nome !== chiave ? `${nome} (${chiave})` : (nome ?? chiave ?? `riga ${String(rowid)}`);
  return { oggetto: `${etichetta} · ${chi}`, dove: anagrafica?.pagina ? anagrafica.pagina(riga) : null };
}

// ---- La raccolta dei problemi ----

const ORDINE_CATEGORIE: readonly CategoriaProblemaEdizione[] = [
  'condizione-illeggibile', 'condizione-non-riconosciuta', 'json-malformato', 'chiave-orfana', 'spillo-senza-uid', 'regola-pesca', 'immagine-mancante', 'correzione-orfana',
];

/** Come si chiama ciascun genere di problema, al plurale, nel riepilogo che accompagna bloccanti e avvisi. */
const NOME_CATEGORIA: Record<CategoriaProblemaEdizione, string> = {
  'condizione-illeggibile': 'colonne di condizioni illeggibili (oggi varrebbero «nessuna condizione»)',
  'condizione-non-riconosciuta': 'condizioni non riconosciute (oggi verrebbero scartate)',
  'json-malformato': 'campi JSON malformati',
  'chiave-orfana': 'riferimenti a chiavi che non esistono',
  'spillo-senza-uid': 'spilli senza uid',
  'regola-pesca': 'regole di pesca con punti base diversi da 2',
  'immagine-mancante': 'immagini referenziate e assenti',
  'correzione-orfana': 'correzioni della guida che la guida di oggi non accoglie più',
};

/** Raccoglie i problemi trovati: totali esatti, elenco leggibile limitato (la riga si descrive solo se entra nell'elenco). */
export class RaccoltaProblemi {
  private readonly gruppi = new Map<string, { categoria: CategoriaProblemaEdizione; gravita: Gravita; totale: number; elenco: ProblemaContenutoEdizioneDto[] }>();
  /** I controlli che non si sono potuti eseguire (un errore interno non deve far credere che il contenuto sia a posto). */
  readonly nonEseguiti: string[] = [];

  aggiungi(categoria: CategoriaProblemaEdizione, gravita: Gravita, crea: () => Omit<ProblemaContenutoEdizioneDto, 'gravita' | 'categoria'>): void {
    const k = `${gravita}|${categoria}`;
    let g = this.gruppi.get(k);
    if (!g) { g = { categoria, gravita, totale: 0, elenco: [] }; this.gruppi.set(k, g); }
    g.totale++;
    if (g.elenco.length < MASSIMO_PER_GENERE) g.elenco.push({ gravita, categoria, ...crea() });
  }

  private ordinati() {
    const peso = (g: { categoria: CategoriaProblemaEdizione; gravita: Gravita }) => (g.gravita === 'bloccante' ? 0 : 100) + ORDINE_CATEGORIE.indexOf(g.categoria);
    return [...this.gruppi.values()].sort((a, b) => peso(a) - peso(b));
  }

  /** L'elenco leggibile: prima i bloccanti, poi gli avvisi, nell'ordine dei generi. */
  elenco(): ProblemaContenutoEdizioneDto[] {
    return this.ordinati().flatMap((g) => g.elenco);
  }

  riepilogo(): RiepilogoProblemiEdizioneDto[] {
    return this.ordinati().map((g) => ({ categoria: g.categoria, gravita: g.gravita, totale: g.totale, mostrati: g.elenco.length }));
  }

  /** Le frasi di riepilogo per `bloccanti` o `avvisi` dell'edizione: «12 campi JSON malformati (vedi l'elenco dei contenuti)». */
  frasi(gravita: Gravita): string[] {
    return this.ordinati().filter((g) => g.gravita === gravita)
      .map((g) => `${g.totale} ${NOME_CATEGORIA[g.categoria]}${g.elenco.length < g.totale ? ` (nell'elenco i primi ${g.elenco.length})` : ''}: vedi l'elenco dei contenuti.`);
  }
}

// ---- 1. Le correzioni della guida dentro i blocchi ----

/** Righe di una tabella (0 se la tabella non c'è). */
function contaRighe(db: Db, tabella: string): number {
  return haTabella(db, tabella) ? (db.prepare(`SELECT COUNT(*) FROM main.${q(tabella)}`).pluck().get() as number) : 0;
}

/** Le tabelle-fotografia di «Ripristina»: nome che finisce in `_foto` e colonna `seed_json` (migrazione 227: una riga per padre). */
function tabelleFotografia(db: Db): string[] {
  return tabelleDi(db).filter((t) => t.endsWith('_foto') && haColonna(db, t, 'seed_json'));
}

/**
 * Scrive le correzioni della guida dentro i blocchi di `dati_guida` della COPIA, svuota `correzione_dati_guida` e toglie le fotografie di
 * «Ripristina». Restituisce i conteggi prima e dopo. Un blocco che non si legge resta com'è, con le sue correzioni, ed è un problema BLOCCANTE
 * (l'edizione non esce); un blocco che non c'è più, o una correzione che la guida non accoglie più, è un AVVISO e quelle correzioni non entrano.
 */
export function unisciCorrezioniGuida(db: Db, raccolta: RaccoltaProblemi): UnioneCorrezioniEdizioneDto {
  const haGuida = haTabella(db, 'dati_guida');
  const haCorrezioni = haTabella(db, 'correzione_dati_guida');
  const fotografie = tabelleFotografia(db);
  const chiaviGuida = (): number => (haGuida ? (db.prepare('SELECT COUNT(*) FROM main.dati_guida WHERE chiave LIKE ?').pluck().get(`${PREFISSO_FOTOGRAFIE_CONFIDENTI}%`) as number) : 0);
  const righeFoto = (): Record<string, number> => Object.fromEntries(fotografie.map((t) => [t, contaRighe(db, t)]));

  const esito: UnioneCorrezioniEdizioneDto = {
    correzioniPrima: haCorrezioni ? contaRighe(db, 'correzione_dati_guida') : 0,
    correzioniApplicate: 0, correzioniOrfane: 0, correzioniDopo: 0,
    blocchiGuida: { prima: contaRighe(db, 'dati_guida'), riscritti: 0, dopo: 0 },
    blocchi: [],
    fotografie: { chiaviGuidaPrima: chiaviGuida(), chiaviGuidaDopo: 0, righeFotoPrima: righeFoto(), righeFotoDopo: {} },
  };

  db.transaction(() => {
    if (haGuida && haCorrezioni) {
      const blocchi = db.prepare('SELECT blocco, COUNT(*) AS n FROM main.correzione_dati_guida GROUP BY blocco ORDER BY blocco').all() as Array<{ blocco: string; n: number }>;
      const leggi = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?');
      const scrivi = db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ?');
      const toglie = db.prepare('DELETE FROM main.correzione_dati_guida WHERE blocco = ?');
      for (const { blocco, n } of blocchi) {
        const voce: UnioneBloccoEdizioneDto = { blocco, prima: n, applicate: 0, orfane: 0, dopo: n };
        const riga = leggi.get(blocco) as { json: string } | undefined;
        const dovePagina = (): string | null => PAGINA_BLOCCO[blocco] ?? '/guida';
        if (!riga) {
          // il blocco non c'è più: le sue correzioni non hanno dove entrare
          voce.orfane = n; voce.dopo = 0; toglie.run(blocco);
          raccolta.aggiungi('correzione-orfana', 'avviso', () => ({ tabella: 'correzione_dati_guida', oggetto: `Blocco della guida · ${blocco}`, campo: null, dove: dovePagina(),
            dettaglio: `Il blocco «${blocco}» non esiste più nei dati di gioco: le ${n} correzioni non entrano nell'edizione.` }));
        } else {
          let base: unknown;
          try { base = JSON.parse(riga.json) as unknown; } catch {
            // un blocco illeggibile non si riscrive e le sue correzioni restano dove sono: l'edizione non esce finché non lo si ripara
            raccolta.aggiungi('json-malformato', 'bloccante', () => ({ tabella: 'dati_guida', oggetto: `Blocco della guida · ${blocco}`, campo: 'json', dove: dovePagina(),
              dettaglio: `Il blocco non è JSON valido: le ${n} correzioni non si possono unire.` }));
            esito.blocchi.push(voce);
            continue;
          }
          const righe = correzioniDelBloccoDi(db, blocco);
          const applicato = applicaCorrezioni(base, righe);
          voce.orfane = applicato.orfane.length;
          voce.applicate = righe.length - applicato.orfane.length;
          if (voce.applicate > 0) { scrivi.run(JSON.stringify(applicato.dati), blocco); esito.blocchiGuida.riscritti++; }
          for (const percorso of applicato.orfane) {
            raccolta.aggiungi('correzione-orfana', 'avviso', () => ({ tabella: 'correzione_dati_guida', oggetto: `Blocco della guida · ${blocco}`, campo: percorso, dove: dovePagina(),
              dettaglio: 'La guida di oggi non accoglie più questa correzione (elemento sparito o valore di un altro tipo): non entra nell\'edizione.' }));
          }
          toglie.run(blocco);
          voce.dopo = 0;
        }
        esito.blocchi.push(voce);
        esito.correzioniApplicate += voce.applicate;
        esito.correzioniOrfane += voce.orfane;
      }
    }
    // le fotografie di «Ripristina»: nel rilascio non c'è nessun «Ripristina» che le legga
    if (haGuida) db.prepare('DELETE FROM main.dati_guida WHERE chiave LIKE ?').run(`${PREFISSO_FOTOGRAFIE_CONFIDENTI}%`);
    for (const t of fotografie) db.prepare(`DELETE FROM main.${q(t)}`).run();
  })();

  esito.correzioniDopo = haCorrezioni ? contaRighe(db, 'correzione_dati_guida') : 0;
  esito.blocchiGuida.dopo = contaRighe(db, 'dati_guida');
  esito.fotografie.chiaviGuidaDopo = chiaviGuida();
  esito.fotografie.righeFotoDopo = righeFoto();
  return esito;
}

// ---- 2. Il controllo dei contenuti ----

/** Le chiavi esistenti di una colonna, lette una volta (null se la tabella o la colonna non ci sono: allora non si può dire che manchi). */
class Esistenze {
  private readonly insiemi = new Map<string, Set<string> | null>();
  constructor(private readonly db: Db) {}
  ha(tabella: string, colonna: string, valore: string): boolean | null {
    const k = `${tabella}.${colonna}`;
    if (!this.insiemi.has(k)) {
      this.insiemi.set(k, haTabella(this.db, tabella) && haColonna(this.db, tabella, colonna)
        ? new Set(this.db.prepare(`SELECT CAST(${q(colonna)} AS TEXT) FROM main.${q(tabella)} WHERE ${q(colonna)} IS NOT NULL`).pluck().all() as string[])
        : null);
    }
    const s = this.insiemi.get(k);
    return s ? s.has(valore) : null;
  }
}

/** Una chiave citata da una condizione che non esiste: il posto dove andrebbe cercata e la frase che lo dice; null se c'è (o non si può dire). */
function chiaveMancante(c: RequisitoSpillo, e: Esistenze): string | null {
  const manca = (tabella: string, colonna: string, valore: string, cosa: string): string | null =>
    (e.ha(tabella, colonna, valore) === false ? `${cosa} «${valore}» non esiste` : null);
  switch (c.tipo) {
    case 'luogo': return manca('luogo', 'chiave', c.luogo, 'Il luogo');
    case 'quartiere': return manca('quartiere', 'chiave', c.quartiere, 'Il quartiere');
    case 'confidente': return manca('confidente', 'chiave', c.confidente, 'Il Confidente');
    case 'invito': return manca('confidente_invito', 'chiave', c.invito, 'L\'invito');
    case 'richiesta': return manca('richiesta', 'chiave', c.richiesta, 'La richiesta');
    case 'sblocco': return c.bersaglio === 'richiesta' ? manca('richiesta', 'chiave', c.chiave, 'La richiesta') : manca('attivita', 'chiave', c.chiave, 'L\'attività');
    case 'palazzo': return manca('dungeon', 'chiave', c.dungeon, 'Il Palazzo');
    case 'rango-cliente': case 'punti-negozio': return manca('negozio', 'chiave', c.negozio, 'Il negozio');
    case 'articolo': return manca('articolo', 'chiave', c.articolo, 'L\'articolo');
    case 'attivita': return manca('attivita', 'chiave', c.attivita, 'L\'attività');
    case 'lettura': return manca(c.categoria, 'chiave', c.chiave, c.categoria === 'libro' ? 'Il libro' : 'Il film');
    case 'spillo': return manca('spillo', 'uid', c.spillo, 'Il pin (uid)');
    case 'voce-guida': return manca('punto_interesse', 'chiave', c.voce, 'La voce della guida');
    case 'persona-abilita': return manca('persona', 'id', c.persona, 'La Persona (id)') ?? manca('skill', 'id', c.abilita, 'L\'abilità (id)');
    case 'meteo': return c.condizione === 'senza-allerta' ? manca('allerta_meteo', 'chiave', c.allerta, 'L\'allerta meteo') : null;
    default: return null;
  }
}

/** Un elemento che non si legge, descritto per riconoscerlo: il tipo (se c'è) e l'inizio del contenuto. */
function descriviElemento(el: unknown): string {
  const grezzo = (() => { try { return JSON.stringify(el) ?? String(el); } catch { return String(el); } })();
  const tipo = el && typeof el === 'object' && !Array.isArray(el) && typeof (el as { tipo?: unknown }).tipo === 'string' ? (el as { tipo: string }).tipo : null;
  return `${tipo ? `tipo «${tipo}» sconosciuto o con campi non validi` : 'non è una condizione'} — ${grezzo.length > 140 ? `${grezzo.slice(0, 140)}…` : grezzo}`;
}

/** Condizioni: illeggibili, non riconosciute (le stesse regole di lettura dell'app) e con riferimenti a chiavi che non esistono. */
function controllaCondizioni(db: Db, r: RaccoltaProblemi): void {
  const esistenze = new Esistenze(db);
  for (const tabella of tabelleDi(db)) {
    const colonne = colonneDi(db, tabella).map((c) => c.name).filter((n) => COLONNE_CONDIZIONI.includes(n));
    for (const campo of colonne) {
      const righe = db.prepare(`SELECT rowid AS _r, CAST(${q(campo)} AS TEXT) AS v FROM main.${q(tabella)} WHERE ${q(campo)} IS NOT NULL`).all() as Array<{ _r: number; v: string }>;
      for (const { _r, v } of righe) {
        const grezzo = v.trim();
        if (grezzo === '') continue;
        const segnala = (categoria: CategoriaProblemaEdizione, dettaglio: string) =>
          r.aggiungi(categoria, 'bloccante', () => ({ tabella, ...descriviRiga(db, tabella, _r), campo, dettaglio }));
        let valore: unknown;
        try { valore = JSON.parse(grezzo) as unknown; } catch { segnala('condizione-illeggibile', 'Il campo non è JSON valido: nell\'app varrebbe «nessuna condizione».'); continue; }
        if (valore === null) continue;
        if (!Array.isArray(valore)) { segnala('condizione-illeggibile', 'Il campo non è un elenco di condizioni: nell\'app varrebbe «nessuna condizione».'); continue; }
        const lette: RequisitoSpillo[] = [];
        valore.forEach((el, i) => {
          const c = normalizzaRequisitoSpillo(el);
          if (c) lette.push(c); else segnala('condizione-non-riconosciuta', `Condizione ${i + 1}: ${descriviElemento(el)}. Nell'app verrebbe scartata.`);
        });
        const distinte = new Set(lette.map((c) => JSON.stringify(c)));
        if (distinte.size > CONDIZIONI_LETTE) segnala('condizione-non-riconosciuta', `Ci sono ${distinte.size} condizioni distinte: l'app ne legge ${CONDIZIONI_LETTE}, le altre ${distinte.size - CONDIZIONI_LETTE} verrebbero scartate.`);
        for (const c of lette.flatMap(foglieCondizione)) {
          const frase = chiaveMancante(c, esistenze);
          if (frase) r.aggiungi('chiave-orfana', 'bloccante', () => ({ tabella, ...descriviRiga(db, tabella, _r), campo, dettaglio: `${frase}: la condizione resterebbe senza risposta.` }));
        }
      }
    }
  }
}

/** I JSON malformati nelle colonne `…_json` (tranne le condizioni, che hanno il loro controllo) e nei blocchi della guida. */
function controllaJson(db: Db, r: RaccoltaProblemi): void {
  for (const tabella of tabelleDi(db)) {
    const colonne = colonneDi(db, tabella).filter((c) => /(^|_)json$/i.test(c.name) && !/BLOB/i.test(c.type) && !COLONNE_CONDIZIONI.includes(c.name));
    for (const { name: campo } of colonne) {
      const dove = `${q(campo)} IS NOT NULL AND TRIM(CAST(${q(campo)} AS TEXT)) <> '' AND NOT json_valid(${q(campo)})`;
      let righe: Array<{ _r: number | null }>;
      try { righe = db.prepare(`SELECT rowid AS _r FROM main.${q(tabella)} WHERE ${dove}`).all() as Array<{ _r: number }>; }
      catch { righe = db.prepare(`SELECT NULL AS _r FROM main.${q(tabella)} WHERE ${dove}`).all() as Array<{ _r: null }>; } // tabella senza rowid
      for (const { _r } of righe) {
        r.aggiungi('json-malformato', 'bloccante', () => ({ tabella, ...descriviRiga(db, tabella, _r), campo, dettaglio: 'Il contenuto non è JSON valido.' }));
      }
    }
  }
}

/** I riferimenti senza chiave esterna: colonna di una tabella → chiave di un'altra, con un filtro quando la colonna cita tabelle diverse per tipo. */
interface RiferimentoSenzaChiaveEsterna { t: string; c: string; rt: string; rc: string; quando?: string; cosa: string }
const RIFERIMENTI: readonly RiferimentoSenzaChiaveEsterna[] = [
  // diario ed effetti
  { t: 'voce_infiltrazione', c: 'voce_uid', rt: 'voce_giornata', rc: 'uid', cosa: 'la voce del diario' },
  { t: 'voce_effetto', c: 'voce_uid', rt: 'voce_giornata', rc: 'uid', cosa: 'la voce del diario' },
  ...([['confidente', 'confidente'], ['dungeon', 'dungeon'], ['libro', 'libro'], ['film', 'film'], ['attivita', 'attivita'], ['negozio', 'negozio'], ['richiesta', 'richiesta'], ['dote', 'dote_sociale']] as const)
    .map(([tipo, tabella]): RiferimentoSenzaChiaveEsterna => ({ t: 'voce_giornata', c: 'riferimento_chiave', rt: tabella, rc: 'chiave', quando: `t.riferimento_tipo = '${tipo}'`, cosa: `l'elemento collegato (${tipo})` })),
  // inviti dei Confidenti
  ...([['quartiere', 'quartiere'], ['luogo', 'luogo'], ['area', 'area']] as const)
    .map(([tipo, tabella]): RiferimentoSenzaChiaveEsterna => ({ t: 'confidente_invito', c: 'apre_chiave', rt: tabella, rc: 'chiave', quando: `t.apre_tipo = '${tipo}'`, cosa: `il posto che l'invito apre (${tipo})` })),
  // articoli, attività, letture, regali, voci: oggetto del catalogo
  ...(['articolo', 'attivita', 'libro', 'film', 'confidente_regalo', 'voce_oggetto'] as const)
    .map((t): RiferimentoSenzaChiaveEsterna => ({ t, c: 'catalogo_chiave', rt: 'catalogo_oggetto', rc: 'chiave', cosa: 'l\'oggetto del catalogo' })),
  // chi gestisce o richiede
  { t: 'negozio', c: 'confidente_chiave', rt: 'confidente', rc: 'chiave', cosa: 'il Confidente' },
  { t: 'attivita', c: 'confidente_chiave', rt: 'confidente', rc: 'chiave', cosa: 'il Confidente' },
  { t: 'richiesta', c: 'confidente_chiave', rt: 'confidente', rc: 'chiave', cosa: 'il Confidente' },
  // aree, planimetrie, alias
  { t: 'mappa', c: 'area_chiave', rt: 'area', rc: 'chiave', cosa: 'l\'Area' },
  { t: 'mappa', c: 'genitore_chiave', rt: 'mappa', rc: 'chiave', cosa: 'la planimetria genitore' },
  { t: 'guida_alias', c: 'area_chiave', rt: 'area', rc: 'chiave', cosa: 'l\'Area' },
  { t: 'mappa_alias', c: 'mappa_chiave', rt: 'mappa', rc: 'chiave', cosa: 'la planimetria' },
];

/** Le violazioni delle chiavi esterne (`PRAGMA foreign_key_check`) e i riferimenti senza chiave esterna che non trovano la loro riga. */
function controllaChiavi(db: Db, r: RaccoltaProblemi, violazioni: ReadonlyArray<unknown>): void {
  for (const v of violazioni as Array<{ table: string; rowid: number | null; parent: string; fkid: number }>) {
    r.aggiungi('chiave-orfana', 'bloccante', () => {
      let campo: string | null = null;
      try {
        const fk = (db.prepare(`PRAGMA main.foreign_key_list(${q(v.table)})`).all() as Array<{ id: number; from: string }>).find((f) => f.id === v.fkid);
        campo = fk?.from ?? null;
      } catch { /* resta senza campo */ }
      return { tabella: v.table, ...descriviRiga(db, v.table, v.rowid), campo, dettaglio: `Cita una riga di «${v.parent}» che non esiste.` };
    });
  }
  for (const x of RIFERIMENTI) {
    try {
      if (!haTabella(db, x.t) || !haTabella(db, x.rt) || !haColonna(db, x.t, x.c) || !haColonna(db, x.rt, x.rc) || haChiaveEsterna(db, x.t, x.c)) continue;
      const cerca = (idRiga: string) => db.prepare(`SELECT ${idRiga} AS _r, CAST(t.${q(x.c)} AS TEXT) AS v FROM main.${q(x.t)} t
        WHERE t.${q(x.c)} IS NOT NULL AND CAST(t.${q(x.c)} AS TEXT) <> '' ${x.quando ? `AND (${x.quando})` : ''}
        AND NOT EXISTS (SELECT 1 FROM main.${q(x.rt)} p WHERE CAST(p.${q(x.rc)} AS TEXT) = CAST(t.${q(x.c)} AS TEXT))`).all() as Array<{ _r: number | null; v: string }>;
      let righe: Array<{ _r: number | null; v: string }>;
      try { righe = cerca('t.rowid'); } catch { righe = cerca('NULL'); } // tabella senza rowid: si dice la tabella, non la riga
      for (const { _r, v } of righe) {
        r.aggiungi('chiave-orfana', 'bloccante', () => ({ tabella: x.t, ...descriviRiga(db, x.t, _r), campo: x.c, dettaglio: `Cita ${x.cosa} «${v}», che non esiste.` }));
      }
    } catch (err) {
      r.nonEseguiti.push(`Riferimenti ${x.t}.${x.c}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

/** Spilli senza uid, uno per uno (nel rilascio non se ne potrebbero assegnare). */
function controllaSpilli(db: Db, r: RaccoltaProblemi): void {
  if (!haTabella(db, 'spillo') || !haColonna(db, 'spillo', 'uid')) return;
  for (const { _r } of db.prepare("SELECT rowid AS _r FROM main.spillo WHERE uid IS NULL OR uid = ''").all() as Array<{ _r: number }>) {
    r.aggiungi('spillo-senza-uid', 'bloccante', () => ({ tabella: 'spillo', ...descriviRiga(db, 'spillo', _r), campo: 'uid', dettaglio: 'Il pin non ha un uid: nel rilascio non se ne potrebbe assegnare uno.' }));
  }
}

/** Le regole di pesca: `beneficioPerizia.puntiBase` diverso da 2 (decisione 2026-10-25: la regola è dell'utente; l'acquisto del Fortuna conta 2). */
function controllaPesca(db: Db, r: RaccoltaProblemi): void {
  if (!haTabella(db, 'regola_pesca') || !haColonna(db, 'regola_pesca', 'dati_json')) return;
  for (const { _r, v } of db.prepare('SELECT rowid AS _r, dati_json AS v FROM main.regola_pesca').all() as Array<{ _r: number; v: string | null }>) {
    const dati = ((): { beneficioPerizia?: { puntiBase?: unknown } } | null | undefined => {
      try { return v ? (JSON.parse(v) as { beneficioPerizia?: { puntiBase?: unknown } } | null) : null; } catch { return undefined; }
    })();
    if (dati === undefined) continue; // l'illeggibile lo dice già il controllo dei JSON
    const base = dati?.beneficioPerizia?.puntiBase;
    if (base === 2) continue;
    r.aggiungi('regola-pesca', 'avviso', () => ({ tabella: 'regola_pesca', ...descriviRiga(db, 'regola_pesca', _r), campo: 'dati_json',
      dettaglio: typeof base === 'number' ? `beneficioPerizia.puntiBase vale ${base}: la regola di fabbrica e l'acquisto del Fortuna usano 2 (scelta tua, se voluta).` : 'beneficioPerizia.puntiBase manca o non è un numero.' }));
  }
}

/** Immagini citate per chiave (planimetrie, immagini dei pin) che non hanno contenuto in `immagine`: le viste mostrano il segnaposto. */
function controllaImmagini(db: Db, r: RaccoltaProblemi): void {
  if (!haTabella(db, 'immagine') || !haColonna(db, 'immagine', 'contenuto')) return;
  for (const [tabella, ambito] of [['mappa', 'mappa'], ['spillo_immagine', 'spillo']] as const) {
    if (!haTabella(db, tabella) || !haColonna(db, tabella, 'immagine_chiave')) continue;
    const righe = db.prepare(`SELECT t.rowid AS _r, t.immagine_chiave AS v FROM main.${q(tabella)} t
      WHERE t.immagine_chiave IS NOT NULL AND t.immagine_chiave <> ''
      AND NOT EXISTS (SELECT 1 FROM main.immagine i WHERE i.ambito = ? AND i.chiave = t.immagine_chiave AND i.contenuto IS NOT NULL)`).all(ambito) as Array<{ _r: number; v: string }>;
    for (const { _r, v } of righe) {
      r.aggiungi('immagine-mancante', 'avviso', () => ({ tabella, ...descriviRiga(db, tabella, _r), campo: 'immagine_chiave', dettaglio: `L'immagine «${v}» (ambito «${ambito}») non ha contenuto nel database.` }));
    }
  }
}

/**
 * Il controllo completo dei contenuti della COPIA già compattata (sola lettura). `violazioni` è il risultato di `PRAGMA foreign_key_check`,
 * già letto da chi prepara l'edizione. Un controllo che va in errore non resta muto: finisce in `raccolta.nonEseguiti`.
 */
export function controllaContenuti(db: Db, raccolta: RaccoltaProblemi, violazioni: ReadonlyArray<unknown>): void {
  const passi: Array<[string, () => void]> = [
    ['condizioni', () => controllaCondizioni(db, raccolta)],
    ['JSON', () => controllaJson(db, raccolta)],
    ['chiavi', () => controllaChiavi(db, raccolta, violazioni)],
    ['spilli', () => controllaSpilli(db, raccolta)],
    ['regole di pesca', () => controllaPesca(db, raccolta)],
    ['immagini', () => controllaImmagini(db, raccolta)],
  ];
  for (const [nome, passo] of passi) {
    try { passo(); } catch (err) { raccolta.nonEseguiti.push(`Controllo dei contenuti «${nome}» non eseguito: ${err instanceof Error ? err.message : String(err)}`); }
  }
}
