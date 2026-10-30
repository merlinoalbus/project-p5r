// ============================================================
// ripristinoService — correggere e rimettere com'era ciò che la guida dice, senza dipendenze (L11 · B11)
// ============================================================
//
// Un servizio unico con un registro dichiarativo (`ripristino/registro.ts` per i blocchi JSON, `ripristino/righe.ts` per le tabelle):
//   - `elencaCorrezioni` — le correzioni attive;
//   - `schedaCorrezione` — i campi di un oggetto col valore di adesso, quello della guida e se è corretto;
//   - `correggi`         — corregge i campi inviati (un valore uguale alla guida toglie la correzione di quel campo);
//   - `ripristina`       — rimette il valore della guida, per tutto l'oggetto o per alcuni campi.
//
// Il valore della guida non si ricarica da nessun pacchetto (regola dei dati del 21/10): per le righe è la fotografia `seed_json` presa alla
// prima correzione; per i blocchi è il blocco stesso, che non si riscrive mai (le correzioni stanno in `correzione_dati_guida` e si applicano
// in lettura: `datiGuidaCorretti`). «Ripristina» non elimina e non crea «Da rivedere»: sostituisce un valore con quello della guida.
// ============================================================

import { TIPI_MODIFICABILI, type CampoCorrezioneDto, type EsitoRipristinoCorrezioneDto, type RiepilogoCorrezioneDto, type SchedaCorrezioneDto,
  type TipoCampoCorrezione, type TipoModificabile, type ValoreCampoCorrezione } from '../../shared/types.js';
import { analizzaPercorso, risolvi, segmentoSelettore, uguali } from '../../shared/percorsoGuida.js';
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { correzioniOrfane, datiGuida, datiGuidaCorretti } from './datiGuida.js';
import { ricompensePerFonte } from './catalogoOggettiLetture.js';
import { DEFINIZIONI_BLOCCO, LIMITE_NUMERO, LIMITE_TESTO, LIMITE_TESTO_LUNGO, LIMITE_VOCE_ELENCO, LIMITE_VOCI, type CampoDef, type DefBlocco } from './ripristino/registro.js';
import { DEFINIZIONI_RIGA, type DefRiga, type Valori } from './ripristino/righe.js';

export { TIPI_MODIFICABILI };

const NOTE: Partial<Record<TipoModificabile, string>> = {
  quartiere: 'Il nome del quartiere si riflette anche nel nome della sua mappa e nei percorsi delle mappe (gli indirizzi di prima restano validi).',
  dote: 'Il rango mostrato nelle partite si ricalcola dai punti: cambiare una soglia sposta il rango senza toccare i punti già segnati.',
  'evento-calendario': 'La data e il tipo dell’evento non si correggono; le voci del Diario collegate restano collegate.',
  ombra: 'Le affinità della Persona e la Persona abbinata non si correggono da qui: le affinità si correggono dalla scheda della Persona. I luoghi d’incontro si correggono dal loro posto nella pagina dell’Ombra. Qui le differenze proprie dell’Ombra.',
  'ombra-luogo': 'Si corregge il posto: l’Ombra e la fonte della riga non cambiano. Le righe «da una voce Persona» nascono dalla voce: se la voce passa a un’altra Ombra, il suo luogo non la segue da solo. I luoghi non si aggiungono né si tolgono da qui.',
  'ombra-voce': 'Si corregge quale Ombra descrive la voce; le aree dei dedali dove si incontra l’Ombra seguono da sole. Cambiando Ombra cambia anche la Persona che la voce fa catturare, e i luoghi d’incontro dell’Ombra non si spostano con la voce: si correggono a parte.',
  persona: 'Le affinità della Persona si correggono dal loro editor; il nome e le forme non si correggono. Le skill si scrivono «nome @ livello» (0 = innata). Cambiare una skill o una statistica cambia anche le fusioni e le Ombre che la usano.',
  skill: 'La resa italiana dell’effetto vale per tutte le skill con lo stesso testo di effetto e si modifica solo dalle Traduzioni (Impostazioni). Il nome della skill non si corregge: è la chiave delle traduzioni e delle Persona.',
  regalo: 'Il nome e l’effetto del regalo sono quelli dell’oggetto del catalogo (si correggono dal catalogo); i punti già dati nelle partite non cambiano.',  arcana: 'L’ordine dell’Arcano (la sua posizione nella tabella di fusione) e il suo nome italiano non si correggono da qui: il nome si corregge dalle traduzioni.',
  'fusione-arcana': 'Vale per la coppia nella forma in cui sta in tabella (una sola volta, in qualunque ordine si fondano i due Arcani). Il motore di fusione usa subito il risultato nuovo.',
  'fusione-speciale': 'La Persona risultato non si corregge: si scrivono gli ingredienti, nell’ordine della ricetta, con il nome della Persona nel dataset.',
  tesoro: 'Lo spostamento di rango vale per la fusione del Demone con una Persona di quell’Arcano: più alto sposta verso l’alto, meno verso il basso.',
  'eredita-tipo': 'Dice quali tipi di skill un tipo può ereditare nella fusione; l’ordine e i nomi delle colonne non si correggono.',
  confidente: 'La chiave e l’ordine del Confidente non si correggono (li usano ranghi, partite e mappe). Il nome si legge in tutta l’app.',
  'esame-premi': 'Ogni testo delle note sugli esami si corregge a parte; i premi per piazzamento e il requisito di Conoscenza si correggono sull’esame.',
  'settimana-guida': 'Il numero della settimana e l’indirizzo della fonte non si correggono.',
  'evento-voce': 'Si corregge la certezza del collegamento; quale evento e quale voce sono collegati non si cambia da qui.',
  'negoziazione-variante': 'Si corregge la resa italiana; il testo originale, la fonte e il localizzatore non si correggono.',
  'negoziazione-risposta': 'Si corregge la resa italiana; il testo originale e i collegamenti con le risposte dell’app non si correggono.',
  'negoziazione-verdetto': 'L’esito e la sua origine vanno insieme: senza esito non c’è origine. Il valore grezzo della fonte, l’umore e il localizzatore non si correggono.',
  'negoziazione-umore': 'Nome, descrizione, cose da evitare e il testo di ogni esempio; la provenienza degli esempi non si corregge.',
  'dedalo-confluenza': 'Il Palazzo che confluisce è l’identità della riga e non si corregge.',
  'mappa-dedalo': 'L’area del dedalo a cui appartiene la planimetria del vecchio Palazzo.',
  'infiltrazione-dedalo': 'Registro di conversione di Iweleth: nessuna pagina lo mostra.',
  'oggetto-compendio': 'Il nome e la descrizione dell’oggetto si correggono dalle traduzioni, il legame col catalogo dal catalogo.',
  'note-categorie-attivita': 'La frase comune a tutte le attività della categoria (oggi i videogiochi).',
  'sinonimo-ricerca': 'Tipo e chiave della voce non si correggono. La ricerca legge al più 8 nomi per voce, di al più 80 caratteri: gli altri non hanno effetto.',
  'abbreviazione-ricerca': 'La ricerca espande l’abbreviazione quando un nome comincia così: le altre forme non si inventano.',
  'dlc-set': 'Una Persona sta in un solo set. Il set non ha un nome: si riconosce dalle sue Persona.',
  'libro-posizioni': 'Ogni posizione è un posto (quartiere, luogo, negozio o attività) con il nome da mostrare; un posto lasciato su «Nessuno» non compare. Se cambi il posto, cambia anche il nome mostrato. I negozi che vendono il libro si correggono dal negozio.',
  'film-posizioni': 'Ogni posizione è un posto (quartiere, luogo, negozio o attività) con il nome da mostrare e come si usa (cinema, noleggio o visione); un posto lasciato su «Nessuno» non compare. Se cambi il posto, cambia anche il nome mostrato.',
  'negozio-sedi': 'Sono gli altri luoghi in cui il negozio vende lo stesso listino (la sede del negozio si corregge dal negozio). Il pin che conferma una sede deve essere un pin di questo negozio sull’Area del luogo; togliendo una sede si toglie anche il suo pin. Per un luogo appena aggiunto il pin si sceglie al salvataggio successivo.',
  'nota-storica-legami': 'Il testo della nota si corregge dalla nota stessa: qui si sceglie su quali offerte e oggetti compare. Togliere un’offerta o un oggetto toglie solo la nota, non cambia prezzi, acquisti o progressi.',
  'allerta-meteo': 'Vale per questo giorno: le condizioni delle partite che leggono l’allerta (per esempio «piove») seguono le fasce che scegli.',
};

// ---- Tipi e lettura del registro ----

function eRiga(tipo: TipoModificabile): tipo is keyof typeof DEFINIZIONI_RIGA {
  return Object.prototype.hasOwnProperty.call(DEFINIZIONI_RIGA, tipo);
}

function verificaTipo(tipo: string): TipoModificabile {
  if (!(TIPI_MODIFICABILI as readonly string[]).includes(tipo)) throw httpErrors.notFound('tipo-non-modificabile', `«${tipo}» non è un oggetto che si possa correggere.`);
  return tipo as TipoModificabile;
}

function defBlocco(tipo: TipoModificabile): DefBlocco {
  const d = DEFINIZIONI_BLOCCO[tipo];
  if (!d) throw httpErrors.notFound('tipo-non-modificabile', `«${tipo}» non è un oggetto che si possa correggere.`);
  return d;
}

// ---- Valori ----

/** Il tipo con cui il campo si modifica adesso: quello del valore della guida se c'è (un campo numerico in un oggetto e testuale in un altro), altrimenti quello del registro. */
function tipoEffettivo(def: CampoDef, guida: unknown): TipoCampoCorrezione {
  if (def.t === 'scelta' || def.t === 'oggetto') return def.t;
  if (typeof guida === 'string') return def.t === 'testolungo' ? 'testolungo' : 'testo';
  if (typeof guida === 'number') return 'numero';
  if (typeof guida === 'boolean') return 'booleano';
  if (Array.isArray(guida)) return 'elenco';
  return def.t;
}

const invalido = (def: CampoDef, motivo: string) => httpErrors.badRequest('valore-non-valido', `${def.e}: ${motivo}`, { campo: def.p });

/** Controlla e porta in forma il valore inviato per un campo (testi senza spazi ai capi, il vuoto dei campi che lo ammettono diventa null, elenchi senza voci vuote). */
function normalizza(def: CampoDef, tipo: TipoCampoCorrezione, valore: unknown, guida: unknown): ValoreCampoCorrezione {
  if (valore === null) {
    if (def.nullable) return null;
    throw invalido(def, 'non può essere vuoto.');
  }
  switch (tipo) {
    case 'testo': case 'testolungo': {
      if (typeof valore !== 'string') throw invalido(def, 'serve un testo.');
      const t = valore.trim();
      const massimo = def.max ?? (tipo === 'testolungo' ? LIMITE_TESTO_LUNGO : LIMITE_TESTO);
      if (t.length > massimo) throw invalido(def, `è troppo lungo (al più ${massimo} caratteri).`);
      if (t === '') {
        if (def.nullable) return null;
        if (guida === '') return '';
        throw invalido(def, 'non può essere vuoto.');
      }
      return t;
    }
    case 'numero': {
      if (typeof valore !== 'number' || !Number.isInteger(valore) || valore < 0) throw invalido(def, 'serve un numero intero, zero o più.');
      const massimo = def.max ?? LIMITE_NUMERO;
      if (valore > massimo) throw invalido(def, `non può superare ${massimo}.`);
      return valore;
    }
    case 'booleano':
      if (typeof valore !== 'boolean') throw invalido(def, 'serve sì o no.');
      return valore;
    case 'elenco': {
      if (!Array.isArray(valore) || valore.some((v) => typeof v !== 'string')) throw invalido(def, 'serve un elenco di testi.');
      const voci = (valore as string[]).map((v) => v.trim()).filter((v) => v !== '');
      if (voci.length > LIMITE_VOCI) throw invalido(def, `troppe voci (al più ${LIMITE_VOCI}).`);
      if (voci.some((v) => v.length > LIMITE_VOCE_ELENCO)) throw invalido(def, `una voce è troppo lunga (al più ${LIMITE_VOCE_ELENCO} caratteri).`);
      return voci;
    }
    case 'scelta': {
      if (typeof valore !== 'string' || !(def.opzioni ?? []).some((o) => o.chiave === valore)) throw invalido(def, 'scegli uno dei valori proposti.');
      return valore;
    }
    case 'oggetto': {
      if (typeof valore !== 'string' || valore.trim() === '') {
        if (def.nullable && valore === '') return null;
        throw invalido(def, 'scegli un oggetto.');
      }
      return valore.trim();
    }
  }
}

/** Un valore del blocco o della riga nella forma del DTO (i campi che non sono scalari o elenchi di testi non si espongono). */
function comeValore(v: unknown): ValoreCampoCorrezione | undefined {
  if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return [...v] as string[];
  return undefined;
}

function campoDto(def: CampoDef, valore: ValoreCampoCorrezione, guida: ValoreCampoCorrezione): CampoCorrezioneDto {
  const tipo = tipoEffettivo(def, guida);
  const massimo = def.max ?? (tipo === 'testolungo' ? LIMITE_TESTO_LUNGO : tipo === 'testo' ? LIMITE_TESTO : undefined);
  return {
    percorso: def.p, etichetta: def.e, ...(def.gruppo ? { gruppo: def.gruppo } : {}), tipo,
    ...(def.nullable ? { nullable: true } : {}), ...(massimo !== undefined && tipo !== 'elenco' ? { max: massimo } : {}),
    ...(def.opzioni ? { opzioni: def.opzioni } : {}),
    valore, valoreGuida: guida, modificato: !uguali(valore, guida),
  };
}

// ---- Modalità «riga» ----

function metaRiga(def: DefRiga, chiave: string): { seed: Valori | null; aggiornata: string | null } {
  const r = prepared(`SELECT seed_json, updated_at FROM ${def.tabella} WHERE ${def.colonnaChiave} = ?`).get(chiave) as { seed_json: string | null; updated_at: string | null } | undefined;
  if (!r?.seed_json) return { seed: null, aggiornata: null };
  try {
    const seed = JSON.parse(r.seed_json) as Valori;
    return { seed: def.normalizzaGuida ? def.normalizzaGuida(seed, chiave) : seed, aggiornata: r.updated_at };
  } catch {
    return { seed: null, aggiornata: null };
  }
}

/** Scrive la fotografia nella riga: con una fotografia diversa dai valori di adesso la riga è «dell'utente», altrimenti torna quella della guida. */
function scriviMetaRiga(def: DefRiga, chiave: string, seed: Valori | null, correnti: Valori): void {
  // le chiavi che iniziano con «~» sono la traccia delle propagazioni (non sono campi): non contano nel confronto
  const corretta = seed !== null && !Object.keys(seed).filter((p) => !p.startsWith('~')).every((p) => uguali(seed[p], correnti[p]));
  if (corretta) prepared(`UPDATE ${def.tabella} SET origine = 'utente', seed_json = ?, updated_at = ? WHERE ${def.colonnaChiave} = ?`).run(JSON.stringify(seed), nowIso(), chiave);
  else if (def.aggiornataSempre) prepared(`UPDATE ${def.tabella} SET origine = 'seed', seed_json = NULL, updated_at = ? WHERE ${def.colonnaChiave} = ?`).run(nowIso(), chiave);
  else prepared(`UPDATE ${def.tabella} SET origine = 'seed', seed_json = NULL, updated_at = NULL WHERE ${def.colonnaChiave} = ?`).run(chiave);
}

/** Le chiavi «~…» della fotografia: traccia delle propagazioni, che la propagazione può aggiornare. */
const soloTraccia = (seed: Valori): Valori => Object.fromEntries(Object.entries(seed).filter(([k]) => k.startsWith('~')));

function rigaDi(tipo: TipoModificabile, chiave: string): DefRiga {
  if (!eRiga(tipo)) throw httpErrors.notFound('tipo-non-modificabile', `«${tipo}» non è un oggetto che si possa correggere.`);
  const def: DefRiga = DEFINIZIONI_RIGA[tipo];
  if (!def.esiste(chiave)) throw httpErrors.notFound('elemento-della-guida-non-trovato', `${def.etichetta} «${chiave}»: non esiste nella guida.`);
  return def;
}

function schedaRiga(tipo: TipoModificabile, chiave: string): SchedaCorrezioneDto {
  const def = rigaDi(tipo, chiave);
  const attuale = def.leggi(chiave);
  const meta = metaRiga(def, chiave);
  const guida = meta.seed ?? attuale;
  // un valore della guida vuoto (null) è un valore: se la fotografia ha il campo, il confronto è con quello (non con il valore di adesso)
  const campi = def.campi(chiave).map((c) => campoDto(c, attuale[c.p] ?? null, c.p in guida ? (guida[c.p] ?? null) : (attuale[c.p] ?? null)));
  return { tipo, chiave, nome: def.nome(chiave, attuale), modalita: 'riga', campi, modificata: campi.some((c) => c.modificato), guidaCambiata: [], aggiornata: meta.aggiornata, nota: NOTE[tipo] ?? null };
}

function correggiRiga(tipo: TipoModificabile, chiave: string, campi: Record<string, unknown>): void {
  const def = rigaDi(tipo, chiave);
  const definiti = new Map(def.campi(chiave).map((c) => [c.p, c]));
  const attuale = def.leggi(chiave);
  const meta = metaRiga(def, chiave);
  const guida = meta.seed ?? attuale;
  const nuovi: Valori = {};
  for (const [p, grezzo] of Object.entries(campi)) {
    const c = definiti.get(p);
    if (!c) throw httpErrors.badRequest('campo-non-modificabile', `Il campo «${p}» non si può correggere.`, { campo: p });
    const v = normalizza(c, tipoEffettivo(c, guida[p]), grezzo, guida[p]);
    if (!uguali(v, attuale[p])) nuovi[p] = v;
  }
  if (Object.keys(nuovi).length === 0) return;
  const fusi: Valori = { ...attuale, ...nuovi };
  def.valida?.(chiave, fusi);
  getDb().transaction(() => {
    // la fotografia di una correzione fatta prima che il tipo avesse un campo non lo contiene: lo completa il valore di adesso, che per quel campo è ancora quello della guida
    const seed: Valori = { ...attuale, ...(meta.seed ?? {}) };
    const traccia = soloTraccia(seed);
    def.scrivi(chiave, nuovi);
    def.propaga?.(chiave, attuale, fusi, { ripristino: false, traccia });
    scriviMetaRiga(def, chiave, { ...seed, ...traccia }, def.leggi(chiave));
  })();
}

function ripristinaRiga(tipo: TipoModificabile, chiave: string, campi?: string[]): string[] {
  const def = rigaDi(tipo, chiave);
  const definiti = new Set(def.campi(chiave).map((c) => c.p));
  for (const p of campi ?? []) if (!definiti.has(p)) throw httpErrors.badRequest('campo-non-modificabile', `Il campo «${p}» non si può correggere.`, { campo: p });
  const attuale = def.leggi(chiave);
  const { seed } = metaRiga(def, chiave);
  if (!seed) throw httpErrors.conflict('nessuna-correzione', 'Non c’è niente da rimettere: i valori sono quelli della guida.');
  const daRimettere = (campi ?? [...definiti]).filter((p) => p in seed && !uguali(seed[p], attuale[p]));
  if (daRimettere.length === 0) throw httpErrors.conflict('nessuna-correzione', 'Non c’è niente da rimettere: i valori sono quelli della guida.');
  const valori: Valori = Object.fromEntries(daRimettere.map((p) => [p, seed[p]!]));
  def.verificaRipristino?.(chiave, valori);
  getDb().transaction(() => {
    def.scrivi(chiave, valori);
    const dopo = def.leggi(chiave);
    const traccia = soloTraccia(seed);
    def.propaga?.(chiave, attuale, dopo, { ripristino: true, traccia });
    // la propagazione può cambiare la traccia (e altri dati): lo stato (origine, fotografia) si decide sui valori di adesso, riletti dopo
    scriviMetaRiga(def, chiave, { ...seed, ...traccia }, def.leggi(chiave));
  })();
  return daRimettere;
}

// ---- Modalità «blocco» ----

interface ElementoBlocco {
  chiave: string;
  chiaveBase: string;
  titolo: string;
  /** L'indirizzo dell'elemento con i selettori della guida (non i valori corretti: le correzioni si indicizzano sulla guida). */
  percorsoElemento: string[];
  campi: CampoDef[];
  /** I campi che l'elemento non offre perché è un oggetto del catalogo (`DefBlocco.soloSenzaOggetto`): solo per rimettere una correzione di prima. */
  soloRipristino: ReadonlySet<string>;
  corretto: unknown;
  ambiguo: boolean;
}
const NESSUNO: ReadonlySet<string> = new Set();

/** I selettori della guida collegati a un oggetto del catalogo per la fonte di `soloSenzaOggetto` (insieme vuoto se il tipo non la dichiara). */
function selettoriConOggetto(def: DefBlocco): ReadonlySet<string> {
  return def.soloSenzaOggetto ? new Set(ricompensePerFonte(def.soloSenzaOggetto.fonte).keys()) : NESSUNO;
}

const eOggetto = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
function cammina(radice: unknown, props: ReadonlyArray<string>): unknown {
  let n = radice;
  for (const s of props) {
    if (!eOggetto(n)) return undefined;
    n = n[s];
  }
  return n;
}
const comeChiave = (v: unknown): string | null => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : null);

/** Gli elementi di un tipo a blocco, nella guida e con le correzioni sopra; null se il blocco non c'è. */
function elementiBlocco(def: DefBlocco): ElementoBlocco[] | null {
  const base = datiGuida<unknown>(def.blocco);
  if (base === null) return null;
  const corretto = datiGuidaCorretti<unknown>(def.blocco);
  const uscita: ElementoBlocco[] = [];
  if (def.varianti) {
    for (const [chiave, v] of Object.entries(def.varianti)) {
      const el = cammina(base, v.radice);
      if (!eOggetto(el)) continue;
      uscita.push({ chiave, chiaveBase: chiave, titolo: v.etichetta, percorsoElemento: [...v.radice], campi: v.campi, soloRipristino: NESSUNO, corretto: cammina(corretto, v.radice), ambiguo: false });
    }
    return uscita;
  }
  if (!def.sel) {
    const el = cammina(base, def.radice);
    if (eOggetto(el)) uscita.push({ chiave: def.chiaveFissa ?? '', chiaveBase: def.chiaveFissa ?? '', titolo: def.etichetta, percorsoElemento: [...def.radice], campi: def.campi, soloRipristino: NESSUNO, corretto: cammina(corretto, def.radice), ambiguo: false });
    return uscita;
  }
  const elenco = cammina(base, def.radice);
  const elencoCorretto = cammina(corretto, def.radice);
  if (!Array.isArray(elenco)) return uscita;
  const chiaveCampo = def.chiaveCampo ?? def.sel;
  const conteggio = new Map<string, number>();
  const conOggetto = selettoriConOggetto(def);
  for (const e of elenco) {
    const s = eOggetto(e) ? comeChiave(e[def.sel]) : null;
    if (s !== null) conteggio.set(s, (conteggio.get(s) ?? 0) + 1);
  }
  elenco.forEach((e: unknown, i: number) => {
    if (!eOggetto(e)) return;
    const selettore = comeChiave(e[def.sel!]);
    const chiaveBase = comeChiave(e[chiaveCampo]);
    if (selettore === null || chiaveBase === null) return;
    const ec = Array.isArray(elencoCorretto) && eOggetto(elencoCorretto[i]) ? elencoCorretto[i] as Record<string, unknown> : e;
    const chiave = comeChiave(ec[chiaveCampo]) ?? chiaveBase;
    const titolo = def.titolo ? def.titolo(ec) : comeChiave(ec[def.campoTitolo ?? 'nome']) ?? chiave;
    const soloRipristino = conOggetto.has(selettore) ? new Set(def.soloSenzaOggetto?.campi ?? []) : NESSUNO;
    uscita.push({ chiave, chiaveBase, titolo, percorsoElemento: [...def.radice, segmentoSelettore(def.sel!, selettore)], campi: def.campi, soloRipristino, corretto: ec, ambiguo: (conteggio.get(selettore) ?? 0) > 1 });
  });
  return uscita;
}

function trovaElemento(def: DefBlocco, chiave: string): ElementoBlocco {
  const elenco = elementiBlocco(def);
  if (elenco === null) throw httpErrors.conflict('guida-non-disponibile', `La parte «${def.blocco}» della guida non c'è in questa istanza.`);
  // le pagine mostrano i valori corretti: prima la chiave di adesso, poi quella della guida
  const e = elenco.find((x) => x.chiave === chiave) ?? elenco.find((x) => x.chiaveBase === chiave);
  if (!e) throw httpErrors.notFound('elemento-della-guida-non-trovato', `${def.etichetta} «${chiave}»: non esiste nella guida.`);
  if (e.ambiguo) throw httpErrors.conflict('elemento-ambiguo', `${def.etichetta} «${chiave}»: nella guida ce n'è più di uno con lo stesso identificativo, non si può indicare con certezza.`);
  return e;
}

const percorsoCampo = (e: ElementoBlocco, p: string): string => [...e.percorsoElemento, ...p.split('/')].join('/');

interface RigaCorrezioneDb { percorso: string; guida_json: string; updated_at: string }
function correzioniDelBloccoDb(blocco: string): Map<string, RigaCorrezioneDb> {
  const righe = prepared('SELECT percorso, guida_json, updated_at FROM correzione_dati_guida WHERE blocco = ?').all(blocco) as RigaCorrezioneDb[];
  return new Map(righe.map((r) => [r.percorso, r]));
}

function schedaBlocco(tipo: TipoModificabile, chiave: string): SchedaCorrezioneDto {
  const def = defBlocco(tipo);
  const e = trovaElemento(def, chiave);
  const base = datiGuida<unknown>(def.blocco);
  const righe = correzioniDelBloccoDb(def.blocco);
  const campi: CampoCorrezioneDto[] = [];
  const guidaCambiata: string[] = [];
  let aggiornata: string | null = null;
  for (const c of e.campi) {
    const percorso = percorsoCampo(e, c.p);
    // il campo che vive sulla scheda dell'oggetto si mostra solo se c'è una correzione di prima da rimettere com'era
    if (e.soloRipristino.has(c.p) && !righe.has(percorso)) continue;
    const segmenti = analizzaPercorso(percorso);
    const g = risolvi(base, segmenti);
    const guida = g.trovato ? comeValore(g.valore) : undefined;
    if (guida === undefined) continue; // un campo che la guida non ha (o che non è un testo, un numero, un sì/no o un elenco di testi) non si espone
    // il valore di adesso si legge nell'elemento corretto (stessa posizione nell'elenco), non con l'indirizzo della guida: se si è corretto il nome che identifica l'elemento, l'indirizzo non lo trova più
    const attuale = comeValore(cammina(e.corretto, c.p.split('/'))) ?? guida;
    campi.push(campoDto(c, attuale, guida));
    const r = righe.get(percorso);
    if (r) {
      if (aggiornata === null || r.updated_at > aggiornata) aggiornata = r.updated_at;
      if (r.guida_json !== JSON.stringify(g.valore)) guidaCambiata.push(c.p);
    }
  }
  return { tipo, chiave: e.chiave, nome: e.titolo, modalita: 'blocco', campi, modificata: campi.some((c) => c.modificato), guidaCambiata, aggiornata, nota: NOTE[tipo] ?? null };
}

/** Restituisce la chiave dell'oggetto nella guida (serve a ritrovarlo se la correzione ha cambiato il campo che lo identifica). */
function correggiBlocco(tipo: TipoModificabile, chiave: string, campi: Record<string, unknown>): string {
  const def = defBlocco(tipo);
  const e = trovaElemento(def, chiave);
  const base = datiGuida<unknown>(def.blocco);
  const daScrivere: Array<{ percorso: string; guida: unknown; valore: ValoreCampoCorrezione }> = [];
  for (const [p, grezzo] of Object.entries(campi)) {
    const c = e.campi.find((x) => x.p === p);
    if (!c) throw httpErrors.badRequest('campo-non-modificabile', `Il campo «${p}» non si può correggere.`, { campo: p });
    const percorso = percorsoCampo(e, p);
    const g = risolvi(base, analizzaPercorso(percorso));
    const inGuida = g.trovato && comeValore(g.valore) !== undefined;
    // su un campo che vive sulla scheda dell'oggetto si accetta solo il ritorno al valore della guida (toglie la correzione di prima); la 279
    // ha già tolto l'effetto dai premi che sono oggetti, quindi di norma il campo non c'è nemmeno nella guida
    if (e.soloRipristino.has(p) && (!inGuida || !uguali(normalizza(c, tipoEffettivo(c, g.valore), grezzo, g.valore), g.valore))) {
      throw httpErrors.badRequest('campo-dell-oggetto', `${def.etichetta} «${chiave}»: «${c.e}» è un dato dell'oggetto del catalogo e si corregge sulla sua scheda.`, { campo: p });
    }
    if (!inGuida) throw httpErrors.notFound('elemento-della-guida-non-trovato', `${def.etichetta} «${chiave}»: il campo «${c.e}» non c'è nella guida.`);
    daScrivere.push({ percorso, guida: g.valore, valore: normalizza(c, tipoEffettivo(c, g.valore), grezzo, g.valore) });
  }
  getDb().transaction(() => {
    for (const d of daScrivere) {
      if (uguali(d.valore, d.guida)) {
        prepared('DELETE FROM correzione_dati_guida WHERE blocco = ? AND percorso = ?').run(def.blocco, d.percorso);
      } else {
        // `guida_json` si scrive alla prima correzione e non si tocca più: è il valore della guida di quel momento
        prepared(`INSERT INTO correzione_dati_guida (blocco, percorso, valore_json, guida_json, updated_at) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(blocco, percorso) DO UPDATE SET valore_json = excluded.valore_json, updated_at = excluded.updated_at`)
          .run(def.blocco, d.percorso, JSON.stringify(d.valore), JSON.stringify(d.guida), nowIso());
      }
    }
  })();
  return e.chiaveBase;
}

function ripristinaBlocco(tipo: TipoModificabile, chiave: string, campi?: string[]): { rimessi: string[]; chiaveGuida: string } {
  const def = defBlocco(tipo);
  const e = trovaElemento(def, chiave);
  const scelti = campi ?? e.campi.map((c) => c.p);
  for (const p of scelti) if (!e.campi.some((c) => c.p === p)) throw httpErrors.badRequest('campo-non-modificabile', `Il campo «${p}» non si può correggere.`, { campo: p });
  const righe = correzioniDelBloccoDb(def.blocco);
  const daTogliere = scelti.filter((p) => righe.has(percorsoCampo(e, p)));
  if (daTogliere.length === 0) throw httpErrors.conflict('nessuna-correzione', 'Non c’è niente da rimettere: i valori sono quelli della guida.');
  getDb().transaction(() => {
    for (const p of daTogliere) prepared('DELETE FROM correzione_dati_guida WHERE blocco = ? AND percorso = ?').run(def.blocco, percorsoCampo(e, p));
  })();
  return { rimessi: daTogliere, chiaveGuida: e.chiaveBase };
}

// ---- API del servizio ----

/** La scheda di modifica di un oggetto: campi con valore attuale, valore della guida e se sono corretti. */
export function schedaCorrezione(tipo: string, chiave: string): SchedaCorrezioneDto {
  const t = verificaTipo(tipo);
  return eRiga(t) ? schedaRiga(t, chiave) : schedaBlocco(t, chiave);
}

/** Corregge i soli campi inviati (la chiave è l'indirizzo del campo nell'oggetto); un valore uguale a quello della guida toglie la correzione di quel campo. */
export function correggi(tipo: string, chiave: string, campi: Record<string, unknown>): SchedaCorrezioneDto {
  const t = verificaTipo(tipo);
  let chiaveGuida = chiave;
  try {
    if (eRiga(t)) correggiRiga(t, chiave, campi);
    else chiaveGuida = correggiBlocco(t, chiave, campi);
  } finally {
    // anche una correzione fallita a metà (transazione annullata) lascia le copie in memoria com'erano; svuotarle è innocuo
    invalidaCacheDiGioco();
  }
  // se si è corretto il campo che identifica l'oggetto (il suo nome), la chiave data non c'è più nella guida corretta: si ritrova da quella della guida
  try {
    return schedaCorrezione(t, chiave);
  } catch (err) {
    if (chiaveGuida === chiave) throw err;
    return schedaCorrezione(t, chiaveGuida);
  }
}

/** Rimette il valore della guida: per tutti i campi dell'oggetto o solo per `campi`. 409 `nessuna-correzione` se non c'è niente da rimettere. */
export function ripristina(tipo: string, chiave: string, campi?: string[]): EsitoRipristinoCorrezioneDto {
  const t = verificaTipo(tipo);
  let rimessi: string[];
  let chiaveGuida = chiave;
  try {
    if (eRiga(t)) rimessi = ripristinaRiga(t, chiave, campi);
    else ({ rimessi, chiaveGuida } = ripristinaBlocco(t, chiave, campi));
  } finally {
    invalidaCacheDiGioco();
  }
  // se si è rimesso il campo che identifica l'oggetto (il suo nome), la chiave di adesso è quella della guida
  let scheda: SchedaCorrezioneDto;
  try {
    scheda = schedaCorrezione(t, chiave);
  } catch (err) {
    if (chiaveGuida === chiave) throw err;
    scheda = schedaCorrezione(t, chiaveGuida);
  }
  return { tipo: t, chiave: scheda.chiave, campiRipristinati: rimessi, scheda };
}

/** Le correzioni attive, per tipo se indicato; quelle che la guida di oggi non accoglie più sono segnate «orfane» (non si applicano e non si cancellano). */
export function elencaCorrezioni(tipo?: string): RiepilogoCorrezioneDto[] {
  const filtro = tipo === undefined ? null : verificaTipo(tipo);
  const uscita: RiepilogoCorrezioneDto[] = [];
  for (const t of TIPI_MODIFICABILI) {
    if (filtro && t !== filtro) continue;
    if (!eRiga(t)) continue;
    const def: DefRiga = DEFINIZIONI_RIGA[t];
    // una chiave per oggetto: dove un oggetto sta su più righe (le fasce di un'allerta meteo) la stessa chiave non si ripete
    const chiavi = [...new Set(prepared(`SELECT ${def.colonnaChiave} FROM ${def.tabella} WHERE seed_json IS NOT NULL`).pluck().all() as string[])];
    for (const chiave of chiavi) {
      if (!def.esiste(chiave)) continue;
      const attuale = def.leggi(chiave);
      const { seed, aggiornata } = metaRiga(def, chiave);
      const diversi = seed ? def.campi(chiave).map((c) => c.p).filter((p) => p in seed && !uguali(seed[p], attuale[p])) : [];
      if (diversi.length > 0) uscita.push({ tipo: t, chiave, nome: def.nome(chiave, attuale), campi: diversi, aggiornata, orfana: false });
    }
  }
  const blocchi = new Set(Object.values(DEFINIZIONI_BLOCCO).map((d) => d!.blocco));
  for (const blocco of blocchi) {
    const righe = correzioniDelBloccoDb(blocco);
    if (righe.size === 0) continue;
    const orfane = new Set(correzioniOrfane(blocco));
    const spiegate = new Set<string>();
    for (const t of TIPI_MODIFICABILI) {
      const def = DEFINIZIONI_BLOCCO[t];
      if (!def || def.blocco !== blocco) continue;
      for (const e of elementiBlocco(def) ?? []) {
        const trovati = e.campi.filter((c) => righe.has(percorsoCampo(e, c.p)));
        if (trovati.length === 0) continue;
        for (const c of trovati) spiegate.add(percorsoCampo(e, c.p));
        if (filtro && t !== filtro) continue;
        const aggiornata = trovati.map((c) => righe.get(percorsoCampo(e, c.p))!.updated_at).sort().at(-1) ?? null;
        uscita.push({ tipo: t, chiave: e.chiave, nome: e.titolo, campi: trovati.map((c) => c.p), aggiornata, orfana: trovati.some((c) => orfane.has(percorsoCampo(e, c.p))) });
      }
    }
    // le correzioni che nessun elemento di oggi spiega (l'elemento non c'è più): si mostrano, non si perdono
    const primo = TIPI_MODIFICABILI.find((t) => DEFINIZIONI_BLOCCO[t]?.blocco === blocco);
    if (primo && (!filtro || filtro === primo)) {
      for (const [percorso, r] of righe) if (!spiegate.has(percorso)) uscita.push({ tipo: primo, chiave: percorso, nome: percorso, campi: [percorso], aggiornata: r.updated_at, orfana: true });
    }
  }
  return uscita;
}

/** Le chiavi degli oggetti di un tipo che si possono correggere (per le prove e per gli elenchi): di una riga le sue righe, di un blocco i suoi elementi. */
export function chiaviDelTipo(tipo: string): string[] {
  const t = verificaTipo(tipo);
  if (eRiga(t)) return DEFINIZIONI_RIGA[t].chiavi();
  return (elementiBlocco(defBlocco(t)) ?? []).map((e) => e.chiave);
}
