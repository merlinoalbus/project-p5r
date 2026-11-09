// ============================================================
// 345 — le cinque note d'archivio dei negozi, riga per riga (L1-06, lotto «Un solo dove»)
// ============================================================
//
// Cinque negozi (`venditore-ambulante`, `mercante-sakai`, `jose`, `gachapon-akihabara`, `tanaka-affari-loschi`) portano in `negozio.note` un blocco
// «Indicazioni della guida precedente — Scambi (archivio)»: il testo della vecchia pagina Scambi, conservato come nota quando il listino fu
// strutturato. Quasi tutto ripete ciò che i dati strutturati dicono già (sede, orari, prezzi, costi, condizioni, esiti): un testo che ripete si
// toglie con archivio (DECISIONI «AD9»), ciò che è unico resta o si struttura, ciò che contraddice i dati si toglie con archivio.
//
// PRINCIPIO (richiesta dell'utente): ogni dato della guida ancora valido sta in forma strutturata; solo ciò che i dati smentiscono resta in archivio.
// COME: ogni riga del blocco (e, quando una riga ha più parti, ogni parte) si confronta con la riga o la colonna strutturata che la copre. Una
// parte si toglie SOLO se il dato che la copre c'è e coincide (stesso oggetto, stesso prezzo o costo, stessa condizione); una parte valida che
// nessun dato modella NON resta nel blocco d'archivio: diventa una frase normale in coda al primo paragrafo della nota (iniziale maiuscola, punto
// finale), e l'intestazione e la frase standard del blocco spariscono (nessun blocco, se nessuna parte resta). Un indirizzo che non è fra le fonti
// si aggiunge a `negozio.fonte` (separatore « ; »). Il testo originale di ogni nota cambiata resta INTERO nell'archivio. Il primo paragrafo non si
// tocca, salvo due frasi che la migrazione dimostra ripetute:
//   - `venditore-ambulante`: «Gli articoli si sbloccano in base al Rango Fascino (2, 3 e 5)» (i ranghi delle Doti dell'offerta sono 2, 3 e 5);
//   - `tanaka-affari-loschi`: le due frasi sul «30 gennaio», che da qui è una condizione strutturata dello sblocco del negozio.
// Per ogni negozio:
//   - venditore-ambulante, mercante-sakai, jose: le righe che ripetono sede, orari, prezzi, costi, intervalli, condizioni dei Dedali si tolgono; di
//     jose restano, come frasi, la posizione («veicolo particolare…») e il «casualmente… dopo la prima richiesta» (il catalogo che cambia col Dedalo
//     è già nelle condizioni delle offerte); gli indirizzi mancanti vanno in `fonte`;
//   - gachapon-akihabara: il passaggio della Replica d'arma al Balsamo vitale dopo cinque scambi c'è già nel modello degli esiti
//     (`ricompensa_oggetto` dell'offerta «Scambio: Mothman muschiato»), quindi la nota non serve più; la soglia «dal 5° scambio» che la vecchia
//     riga dichiarava è quella che la nota dell'offerta definisce sbagliata (dal 6°);
//   - tanaka-affari-loschi: il termine «30 gennaio» diventa la condizione `non(data dal 01-31)` nello sblocco del negozio (accanto a «laptop
//     riparato»), le frasi sul termine si tolgono, si tolgono con archivio le righe che contraddicono i dati (il «grado Nero» dei prodotti
//     iniziali, «Dal 19 dicembre» come apertura) e «un solo ordine alla volta» (il rifornimento `consegna` lo implementa già: `shared/rifornimento.ts`,
//     «la consegna: un ordine alla volta, qualunque sia la quantità»); il come si ripara il Laptop non è modellato e diventa la frase «Il Laptop si
//     ripara con il Set di strumenti da PC di Akihabara.».
// Le note delle offerte (`articolo.nota`) che ripetono il costo e l'intervallo di Sakai (12), il costo dello scambio (2) o la condizione di
// sblocco del Dedalo di Jose (37) si tolgono con archivio, ciascuna dopo la prova puntuale (51 sulla copia del 7/11, comprese le 3 offerte di Sakai
// adottate dall'utente: ofuda-della-magia, distintivo-dellangelo, mazza-fervente, la cui nota ripete davvero costo e intervallo). Le tre note di
// Tanaka «rango cliente Iniziale» perdono quella parte (è il grado di base, soglia 0 yen, e l'offerta non ha una condizione `rango-cliente`): la
// prima diventa vuota, le altre due restano «Esclusivo Royal.». Le note di Gachapon restano. I NEGOZI di origine diversa da `seed` non si toccano
// (né nota né sblocco né fonte).
//
// IL TESTO TOLTO resta intero in `dati_guida.archivio-frasi-l11` (colonne `negozio.note` e `articolo.nota`, prima copia mai sovrascritta); il
// verbale riga per riga (azione e motivo) è in `dati_guida.audit-l1-06-note-darchivio`. Idempotente: una seconda esecuzione non trova più nulla da
// togliere. Gli orari, i costi, le condizioni e le altre colonne di `negozio` e `articolo` non cambiano (impronte prima e dopo); le altre scritture
// sono lo sblocco di Tanaka e le fonti dei negozi. Nessun `updated_at` cambia, nessun import da `server/services/`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, righeArchiviate, registraAudit } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`345: ${motivo}; nessuna modifica applicata.`); };

const INTESTAZIONE = 'Indicazioni della guida precedente — Scambi (archivio)';
const STANDARD = 'Testo originale conservato come nota. Per costi e requisiti correnti fa fede il listino; questa nota non registra acquisti né collega automaticamente oggetti.';
const NEGOZI = ['venditore-ambulante', 'mercante-sakai', 'jose', 'gachapon-akihabara', 'tanaka-affari-loschi'] as const;
type ChiaveNegozio = (typeof NEGOZI)[number];
const TANAKA = 'tanaka-affari-loschi';

/** Il termine «30 gennaio» di Tanaka: il negozio è aperto fino al 30 incluso, quindi non lo è dal 31. */
const TERMINE_TANAKA = { tipo: 'non', condizione: { tipo: 'data', dal: '01-31' } } as const;

// ---------------------------------------------------------------------------
// Tipi del piano (esportati: la prova li stampa come tabella riga per riga)
// ---------------------------------------------------------------------------

/** dedupe/contraddizione: la parte si toglie con archivio; tenuto: la parte è valida e non modellata, resta come frase della nota (`frase`, se la
 *  parte va riscritta; altrimenti il testo stesso). */
export type Azione = 'dedupe' | 'contraddizione' | 'tenuto';
export interface Segmento { testo: string; azione: Azione; motivo: string; frase?: string }
/** Una riga del blocco: le sue parti (una sola se non si divide), il separatore con cui le parti tenute si rimettono insieme e gli indirizzi
 *  che vanno aggiunti alle fonti del negozio. */
export interface RigaEsaminata { segmenti: Segmento[]; separatore: string; aggiungiFonti?: string[] }
export interface PianoNota {
  negozio: ChiaveNegozio;
  originale: string;
  nuova: string;
  fonteOriginale: string;
  /** La `fonte` nuova, o null se non cambia. */
  fonteNuova: string | null;
  paragrafo: Segmento[];
  righe: RigaEsaminata[];
}
/** `nuova` assente = la nota dell'offerta diventa vuota (NULL); presente = la nota si riscrive così. */
export interface PianoArticolo { articolo: string; negozio: string; originale: string; azione: Azione; motivo: string; nuova?: string }
export interface PianoSblocco { negozio: string; prima: string | null; dopo: string }
export interface Piano { negozi: PianoNota[]; articoli: PianoArticolo[]; articoliTenuti: PianoArticolo[]; sblocco: PianoSblocco[] }

// ---------------------------------------------------------------------------
// Lettura dei dati strutturati che coprono le righe
// ---------------------------------------------------------------------------

interface Condizione { tipo?: string; [campo: string]: unknown }
interface ArticoloCtx {
  chiave: string; nome: string; nomi: string[]; prezzo: number | null; quantita: number | null; nota: string | null;
  condizioni: Condizione[]; costo: { tipo?: string; importo?: number; oggetti?: Array<{ chiave: string; quantita: number }> } | null; costoNomi: string[];
  consegnaInTreGiorni: boolean; haDescrizione: boolean; ricompense: string[]; noteRicompense: string[];
}
interface Contesto {
  chiave: ChiaveNegozio;
  /** La nota com'è nel database, e la stessa in forma NFC (con cui si confrontano le righe). */
  notaGrezza: string | null; nota: string;
  sblocco: Condizione[]; orari: { giorni?: string[]; fasce?: string[]; chiusoConPioggia?: boolean } | null;
  programma: { calcolo?: string } | null; areaNome: string | null; quartiereNome: string | null;
  /** La `fonte` del negozio com'è, e l'insieme degli indirizzi di negozio e offerte. */
  fonteNegozio: string; fonti: Set<string>; articoli: ArticoloCtx[];
}

function leggi<T>(json: string | null): T | null {
  if (json === null || json === '') return null;
  try { return JSON.parse(json) as T; } catch { return null; }
}

/** Il testo senza maiuscole, accenti, apostrofi e punteggiatura: per confrontare i nomi scritti in due modi. */
export function normalizza(testo: string): string {
  return testo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
const PAROLE_VUOTE = new Set(['di', 'del', 'della', 'delle', 'dello', 'dei', 'degli', 'dell', 'd', 'il', 'lo', 'la', 'le', 'i', 'gli', 'l', 'un', 'una', 'a', 'al']);
/** Le sole due parole che la vecchia pagina e il catalogo scrivono in modo diverso per la stessa cosa. */
const SINONIMI: Record<string, string> = { ghiaccio: 'gelo' };
const parole = (testo: string): Set<string> => new Set(normalizza(testo).split(' ').filter((p) => p && !PAROLE_VUOTE.has(p)).map((p) => SINONIMI[p] ?? p));
const sottoinsieme = (a: Set<string>, b: Set<string>): boolean => a.size > 0 && [...a].every((p) => b.has(p));
/** Stesso nome, a meno di articoli, preposizioni e punteggiatura. */
const stessoNome = (a: string, b: string): boolean => { const pa = parole(a); const pb = parole(b); return pa.size === pb.size && sottoinsieme(pa, pb); };
/** Un nome contiene l'altro (le righe d'archivio raggruppano le varianti: «Ambra grigia» per «Ambra grigia MA», «Ambra grigia RS/FR» per RS e FR). */
const nomeCompatibile = (voce: string, nomeOfferta: string): boolean => { const pv = parole(voce); const po = parole(nomeOfferta); return sottoinsieme(pv, po) || sottoinsieme(po, pv); };
const dellOfferta = (voce: string, a: ArticoloCtx): boolean => a.nomi.some((n) => stessoNome(voce, n));
const compatibileConOfferta = (voce: string, a: ArticoloCtx): boolean => a.nomi.some((n) => nomeCompatibile(voce, n));
const soldi = (testo: string): number => Number(testo.replace(/\./g, ''));
const dueCifre = (n: string): string => n.padStart(2, '0');

function leggiContesto(db: AppDatabase, chiave: ChiaveNegozio): Contesto | null {
  const n = db.prepare(`SELECT n.note, n.sblocco_json, n.orari_json, n.programma_punti_json, n.fonte, a.nome AS area_nome, q.nome AS quartiere_nome
      FROM main.negozio n LEFT JOIN main.luogo l ON l.chiave = n.sede_chiave LEFT JOIN main.area a ON a.chiave = l.area_chiave LEFT JOIN main.quartiere q ON q.chiave = l.quartiere_chiave
      WHERE n.chiave = ?`).get(chiave) as { note: string | null; sblocco_json: string | null; orari_json: string | null; programma_punti_json: string | null; fonte: string; area_nome: string | null; quartiere_nome: string | null } | undefined;
  if (!n) return null;
  const nomeOggetto = db.prepare('SELECT nome FROM main.catalogo_oggetto WHERE chiave = ?').pluck();
  const ricompense = db.prepare(`SELECT c.nome AS nome, r.nota AS nota FROM main.ricompensa_oggetto r JOIN main.catalogo_oggetto c ON c.chiave = r.catalogo_chiave
      WHERE r.fonte_tipo = 'articolo' AND r.fonte_chiave = ? ORDER BY r.ordine`);
  const righe = db.prepare(`SELECT a.chiave, a.nome, a.prezzo, a.quantita, a.nota, a.condizioni_json, a.costo_json, a.rifornimento_json, a.fonte, c.nome AS catalogo_nome,
      (COALESCE(c.effetto, '') <> '' OR COALESCE(c.descrizione, '') <> '' OR COALESCE(c.statistiche_json, '') LIKE '%"effetti"%') AS ha_descrizione
      FROM main.articolo a LEFT JOIN main.catalogo_oggetto c ON c.chiave = a.catalogo_chiave WHERE a.negozio_chiave = ? ORDER BY a.ordine, a.chiave`)
    .all(chiave) as Array<{ chiave: string; nome: string; prezzo: number | null; quantita: number | null; nota: string | null; condizioni_json: string | null; costo_json: string | null; rifornimento_json: string | null; fonte: string; catalogo_nome: string | null; ha_descrizione: number }>;
  const fonti = new Set<string>([n.fonte, ...righe.map((r) => r.fonte)].filter((f) => f !== ''));
  const articoli = righe.map((r): ArticoloCtx => {
    const costo = leggi<ArticoloCtx['costo']>(r.costo_json);
    const rifornimento = leggi<{ tipo?: string; giorni?: number }>(r.rifornimento_json);
    const rc = ricompense.all(r.chiave) as Array<{ nome: string; nota: string | null }>;
    return {
      chiave: r.chiave, nome: r.nome, nomi: [r.nome, r.catalogo_nome].filter((x): x is string => !!x), prezzo: r.prezzo, quantita: r.quantita, nota: r.nota,
      condizioni: leggi<Condizione[]>(r.condizioni_json) ?? [], costo,
      costoNomi: (costo?.oggetti ?? []).map((o) => nomeOggetto.get(o.chiave) as string | undefined).filter((x): x is string => !!x),
      consegnaInTreGiorni: rifornimento?.tipo === 'consegna' && rifornimento.giorni === 3,
      haDescrizione: r.ha_descrizione === 1, ricompense: rc.map((x) => x.nome), noteRicompense: rc.map((x) => x.nota).filter((x): x is string => !!x),
    };
  });
  return {
    chiave, notaGrezza: n.note, nota: (n.note ?? '').normalize('NFC'), sblocco: leggi<Condizione[]>(n.sblocco_json) ?? [], orari: leggi<Contesto['orari']>(n.orari_json),
    programma: leggi<Contesto['programma']>(n.programma_punti_json), areaNome: n.area_nome, quartiereNome: n.quartiere_nome, fonteNegozio: n.fonte, fonti, articoli,
  };
}

// ---------------------------------------------------------------------------
// Esame delle righe
// ---------------------------------------------------------------------------

const dedupe = (testo: string, motivo: string): Segmento => ({ testo, azione: 'dedupe', motivo });
const contraddizione = (testo: string, motivo: string): Segmento => ({ testo, azione: 'contraddizione', motivo });
const tenuto = (testo: string, motivo: string): Segmento => ({ testo, azione: 'tenuto', motivo });
const rigaUnica = (segmento: Segmento): RigaEsaminata => ({ segmenti: [segmento], separatore: '' });
const rigaDi = (separatore: string, ...segmenti: Segmento[]): RigaEsaminata => ({ segmenti, separatore });

const haIntervallo = (a: ArticoloCtx, dal: string, al: string): boolean => a.condizioni.some((c) => c.tipo === 'intervallo' && c.dal === dal && c.al === al);
const haDote = (a: ArticoloCtx, dote: string, rango: number): boolean => a.condizioni.some((c) => c.tipo === 'dote' && c.dote === dote && c.rango === rango);
const dedaloDi = (a: ArticoloCtx): string | null => {
  const e = a.condizioni.find((c) => c.tipo === 'evento' && typeof c.evento === 'string' && /^dedalo-.+-aperto$/.test(c.evento));
  return e ? (e.evento as string).replace(/^dedalo-/, '').replace(/-aperto$/, '') : null;
};
const rangoCliente = (a: ArticoloCtx): string => {
  const c = a.condizioni.find((x) => x.tipo === 'rango-cliente');
  return c && typeof c.rango === 'string' ? c.rango : 'iniziale';
};
const importoFiori = (a: ArticoloCtx): number | null => (a.costo?.tipo === 'fiori' && typeof a.costo.importo === 'number' ? a.costo.importo : null);

/** Una riga d'indirizzi: si toglie sempre; gli indirizzi che non sono già fra le fonti del negozio o delle sue offerte si aggiungono a `negozio.fonte`. */
function esaminaUrl(c: Contesto, testo: string): RigaEsaminata | null {
  const url = testo.split(/[\s;]+/).filter(Boolean);
  if (url.length === 0 || !url.every((u) => /^https?:\/\//.test(u))) return null;
  const mancanti = url.filter((u) => !c.fonti.has(u));
  return {
    segmenti: [dedupe(testo, mancanti.length === 0
      ? 'gli indirizzi sono già le fonti del negozio e delle sue offerte (`fonte`)'
      : `indirizzo spostato nelle fonti del negozio (\`fonte\`): ${mancanti.join(' ; ')}`)],
    separatore: '', ...(mancanti.length > 0 ? { aggiungiFonti: mancanti } : {}),
  };
}

/** La `fonte` del negozio con gli indirizzi in più (separatore « ; », come nelle fonti con più indirizzi); null se non c'è niente da aggiungere. */
function fonteConAggiunte(fonte: string, indirizzi: string[]): string | null {
  const presenti = fonte.split(/\s*;\s*/).filter(Boolean);
  const nuovi = [...new Set(indirizzi)].filter((u) => !presenti.includes(u));
  return nuovi.length === 0 ? null : [...presenti, ...nuovi].join(' ; ');
}

/** Una parte valida che nessun dato modella: resta come frase della nota (iniziale maiuscola, punto finale). */
function inFrase(testo: string): string {
  const t = testo.trim();
  const m = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(m) ? m : `${m}.`;
}

function esaminaVenditore(c: Contesto, testo: string): RigaEsaminata {
  if (testo === 'Central Street, Shibuya') {
    if (c.areaNome === 'Central Street' && c.quartiereNome === 'Shibuya') return rigaUnica(dedupe(testo, `la sede è nell'Area «${c.areaNome}» del quartiere «${c.quartiereNome}»`));
    // una sede senza Area (una base più vecchia): il quartiere è quello della sede e «Central Street» lo dice già il primo paragrafo della nota
    if (c.quartiereNome === 'Shibuya' && c.nota.includes('Central Street')) return rigaUnica(dedupe(testo, 'il quartiere è quello della sede (Shibuya) e «Central Street» è già nel primo paragrafo della nota'));
    return rigaUnica(tenuto(testo, 'la sede non è in Central Street, Shibuya'));
  }
  if (testo === 'Sera, dal lunedì al venerdì (non nei giorni di pioggia)') {
    const o = c.orari;
    const uguali = !!o && JSON.stringify(o.giorni) === JSON.stringify(['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi']) && JSON.stringify(o.fasce) === JSON.stringify(['sera']) && o.chiusoConPioggia === true;
    return rigaUnica(uguali ? dedupe(testo, '`orari_json`: lunedì–venerdì, sera, chiuso con la pioggia') : tenuto(testo, 'gli orari strutturati non sono lunedì–venerdì, sera, chiuso con la pioggia'));
  }
  const m = /^Ricevi: (.+) \(accessorio\) · Dai: ([\d.]+)¥ · Fascino Rango (\d+)$/.exec(testo);
  if (m) {
    const [, nome = '', yen = '', rango = ''] = m;
    const trovate = c.articoli.filter((a) => dellOfferta(nome, a) && a.prezzo === soldi(yen) && haDote(a, 'fascino', Number(rango)));
    return rigaUnica(trovate.length > 0
      ? dedupe(testo, `offerta «${trovate[0]!.chiave}»: prezzo ${soldi(yen)} ¥ e Dote Fascino rango ${rango} nelle condizioni`)
      : tenuto(testo, 'nessuna offerta con questo nome, prezzo e rango di Fascino'));
  }
  return esaminaUrl(c, testo) ?? rigaUnica(tenuto(testo, 'riga non riconosciuta'));
}

function esaminaSakai(c: Contesto, testo: string): RigaEsaminata {
  if (testo === 'Kichijoji') return rigaUnica(c.quartiereNome === 'Kichijoji' ? dedupe(testo, `la sede è nel quartiere «${c.quartiereNome}»`) : tenuto(testo, 'la sede non è a Kichijoji'));
  if (testo.replace('’', '\'') === 'Un\'offerta diversa ogni settimana circa; il Mercante scompare e ritorna con nuovi baratti') {
    return rigaUnica(c.nota.includes('ritorna con una nuova proposta') && c.orari !== null
      ? dedupe(testo, 'lo dice già il primo paragrafo della nota («ritorna con una nuova proposta di scambio») e `orari_json.nota`') : tenuto(testo, 'il primo paragrafo non lo ripete'));
  }
  const m = /^Ricevi: (.+?) \((.+)\) · Dai: (.+?) · (\d{1,2})\/(\d{1,2}) - (\d{1,2})\/(\d{1,2})$/.exec(testo);
  if (m) {
    const [, nome = '', , costo = '', m1 = '', g1 = '', m2 = '', g2 = ''] = m;
    const dal = `${dueCifre(m1)}-${dueCifre(g1)}`; const al = `${dueCifre(m2)}-${dueCifre(g2)}`;
    const a = c.articoli.find((x) => dellOfferta(nome, x) && haIntervallo(x, dal, al) && x.costoNomi.some((n) => stessoNome(costo, n)));
    if (!a) return rigaUnica(tenuto(testo, 'nessuna offerta con questo oggetto, questo costo e questo intervallo'));
    return rigaUnica(a.haDescrizione
      ? dedupe(testo, `offerta «${a.chiave}»: oggetto del catalogo (con la sua descrizione), costo «${costo}» e intervallo ${dal}–${al} in \`costo_json\` e \`condizioni_json\``)
      : tenuto(testo, `l'offerta «${a.chiave}» ha costo e intervallo uguali, ma l'oggetto non ha la descrizione nel catalogo`));
  }
  return esaminaUrl(c, testo) ?? rigaUnica(tenuto(testo, 'riga non riconosciuta'));
}

function esaminaJose(c: Contesto, testo: string): RigaEsaminata {
  const m = /^Ricevi: (.+?) · Dai: (\d+)(?:-(\d+))? Fiori · \[Dedalo di (.+?)\](?: (.+))?$/.exec(testo);
  if (m) {
    const [, voci = '', da = '', fino, dedalo = '', descrizione] = m;
    const lo = Number(da); const hi = fino === undefined ? lo : Number(fino);
    const slug = normalizza(dedalo).replace(/ /g, '');
    const nelDedalo = c.articoli.filter((a) => dedaloDi(a) === slug && (importoFiori(a) ?? -1) >= lo && (importoFiori(a) ?? Infinity) <= hi);
    const elenco = voci.split(' / ').map((v) => v.replace(/\s*\(.*\)\s*$/, '').trim());
    // ogni voce deve avere almeno un'offerta del Dedalo, nel prezzo, col nome (o, per le famiglie come «Ofuda speciali», con una parola in comune)
    const esito = elenco.map((v) => ({ voce: v, offerte: nelDedalo.filter((a) => compatibileConOfferta(v, a) || [...parole(v)].some((p) => p.length >= 4 && a.nomi.some((n) => parole(n).has(p)))) }));
    const senza = esito.find((e) => e.offerte.length === 0);
    if (senza) return rigaUnica(tenuto(testo, `nessuna offerta del Dedalo di ${dedalo} a ${lo === hi ? `${lo}` : `${lo}–${hi}`} Fiori per «${senza.voce}»`));
    const descritte = esito.every((e) => e.offerte.every((a) => a.haDescrizione));
    if ((descrizione !== undefined || /\(.+\)/.test(voci)) && !descritte) return rigaUnica(tenuto(testo, 'le offerte corrispondono, ma un oggetto non ha la descrizione nel catalogo'));
    const offerte = new Set(esito.flatMap((e) => e.offerte.map((a) => a.chiave)));
    return rigaUnica(dedupe(testo, `${offerte.size} offerte: costo in Fiori (\`costo_json\`) e condizione «Dedalo di ${dedalo} aperto» (\`condizioni_json\`); descrizione dall'oggetto del catalogo`));
  }
  const casuale = /^(Casualmente durante l['’]esplorazione dei Memento, dopo aver completato la prima richiesta); (il catalogo cambia in base al Dedalo raggiunto)$/.exec(testo);
  if (casuale) {
    const conDedalo = c.articoli.some((a) => dedaloDi(a) !== null);
    return rigaDi('; ',
      tenuto(casuale[1] ?? '', 'il modo in cui il negozio appare non è in nessun dato strutturato: resta come frase della nota'),
      conDedalo ? dedupe(casuale[2] ?? '', 'ogni offerta ha la condizione del suo Dedalo (`condizioni_json`, evento «Dedalo aperto»)') : tenuto(casuale[2] ?? '', 'nessuna offerta ha la condizione del Dedalo'));
  }
  return esaminaUrl(c, testo) ?? rigaUnica(tenuto(testo, 'la posizione e il modo in cui il negozio appare non sono in nessun dato strutturato: resta come frase della nota'));
}

function esaminaGachapon(c: Contesto, testo: string): RigaEsaminata {
  if (testo === 'Akihabara') return rigaUnica(c.quartiereNome === 'Akihabara' ? dedupe(testo, `la sede è nel quartiere «${c.quartiereNome}»`) : tenuto(testo, 'la sede non è ad Akihabara'));
  if (testo === 'Sempre disponibile; la macchina gacha costa 500¥ a capsula') {
    const sempre = !!c.orari && (c.orari.giorni ?? []).length === 0 && (c.orari.fasce ?? []).length === 0 && c.orari.chiusoConPioggia !== true;
    const capsula = c.articoli.find((a) => a.prezzo === 500 && a.nomi.some((n) => normalizza(n).includes('capsula')));
    return rigaDi('; ',
      sempre ? dedupe('Sempre disponibile', '`orari_json` senza giorni, fasce né chiusura con la pioggia') : tenuto('Sempre disponibile', 'gli orari strutturati non sono «sempre»'),
      capsula ? dedupe('la macchina gacha costa 500¥ a capsula', `offerta «${capsula.chiave}»: prezzo 500 ¥`) : tenuto('la macchina gacha costa 500¥ a capsula', 'nessuna offerta «Capsula» a 500 ¥'));
  }
  const mothman = /^Ricevi: Replica d'arma \(poi Balsamo vitale dal 5[°º] scambio\) · Dai: Capsula (.+?) · (Mothman è la capsula più ricercata: dopo 5 scambi la ricompensa cambia in Balsamo vitale)$/.exec(testo);
  if (mothman) {
    const [, capsula = '', commento = ''] = mothman;
    const a = c.articoli.find((x) => normalizza(x.nome) === normalizza(`Scambio: ${capsula}`));
    const regolaNelModello = !!a && a.ricompense.some((n) => stessoNome(n, 'Balsamo vitale')) && a.ricompense.some((n) => stessoNome(n, 'Replica d\'arma')) && a.noteRicompense.some((n) => n.includes('cinque'));
    const costoOk = !!a && a.costoNomi.some((n) => stessoNome(n, capsula));
    const commentoNellaNota = !!a && !!a.nota && a.nota.includes('Mothman è la capsula più ricercata');
    if (!a || !regolaNelModello || !costoOk || !commentoNellaNota) return rigaUnica(tenuto(testo, 'il modello degli esiti (`ricompensa_oggetto`) e la nota dell’offerta non coprono questa riga'));
    const prefisso = testo.slice(0, testo.indexOf(' · Dai:'));
    return rigaDi(' · ',
      contraddizione(prefisso, `il modello degli esiti (\`ricompensa_oggetto\` di «${a.chiave}») ha la Replica d'arma nei primi cinque scambi e il Balsamo vitale dopo cinque Repliche (dal 6°); «dal 5°» è la soglia che la nota dell'offerta dichiara sbagliata`),
      dedupe(`Dai: Capsula ${capsula}`, `\`costo_json\` di «${a.chiave}»`),
      dedupe(commento, `è già nella nota dell'offerta «${a.chiave}»`));
  }
  const scambio = /^Ricevi: (.+) · Dai: Capsula (.+)$/.exec(testo);
  if (scambio) {
    const [, ricevi = '', capsula = ''] = scambio;
    const a = c.articoli.find((x) => normalizza(x.nome) === normalizza(`Scambio: ${capsula}`));
    const attesi = ricevi.split(' + ').map((x) => normalizza(x)).sort();
    const nelModello = a ? a.ricompense.map((x) => normalizza(x)).sort() : [];
    const uguali = !!a && JSON.stringify(attesi) === JSON.stringify(nelModello);
    const costoOk = !!a && a.costoNomi.some((n) => stessoNome(n, capsula));
    return rigaDi(' · ',
      uguali ? dedupe(`Ricevi: ${ricevi}`, `\`ricompensa_oggetto\` dell'offerta «${a!.chiave}»`) : tenuto(`Ricevi: ${ricevi}`, 'le ricompense dell’offerta non coincidono'),
      costoOk ? dedupe(`Dai: Capsula ${capsula}`, `\`costo_json\` dell'offerta «${a!.chiave}»`) : tenuto(`Dai: Capsula ${capsula}`, 'il costo dell’offerta non coincide'));
  }
  return esaminaUrl(c, testo) ?? rigaUnica(tenuto(testo, 'riga non riconosciuta'));
}

/** I gradi cliente di Tanaka e la spesa che li apre (come in `shared/condizioniSpillo.ts`, ripetuti qui perché una migrazione non cambia con il codice). */
const RANGHI_CLIENTE = [{ chiave: 'iniziale', spesa: 0 }, { chiave: 'nero', spesa: 10000 }, { chiave: 'oscuro', spesa: 50000 }, { chiave: 'caos', spesa: 100000 }] as const;

function esaminaTanaka(c: Contesto, testo: string, termineStrutturato: boolean): RigaEsaminata {
  if (testo === 'Online, dal Laptop del protagonista (dopo averlo riparato con il Set di strumenti da PC di Akihabara)') {
    return rigaUnica({
      testo, azione: 'tenuto', frase: 'Il Laptop si ripara con il Set di strumenti da PC di Akihabara.',
      motivo: 'dato valido non modellato: lo sblocco dice «Laptop riparato» ma non come (il Set di strumenti da PC di Akihabara); «Online, dal Laptop» è già la sede (Leblanc), il tipo del negozio (online) e il primo paragrafo',
    });
  }
  if (testo === 'Dal 19 dicembre al 30 gennaio; consegna in 3 giorni per ordine, un solo ordine alla volta') {
    const consegne = c.articoli.filter((a) => a.consegnaInTreGiorni).length;
    return rigaDi('; ',
      termineStrutturato
        ? contraddizione('Dal 19 dicembre al 30 gennaio', 'la guida [samurai-gamers] dà il negozio aperto fino al 19/12 in Persona 5 e fino al 30/1 in Royal: il termine è ora la condizione `non(data dal 01-31)` dello sblocco; «dal 19 dicembre» non è un’apertura')
        : tenuto('Dal 19 dicembre al 30 gennaio', 'il termine non è ancora nello sblocco'),
      consegne > 0 ? dedupe('consegna in 3 giorni per ordine', `\`rifornimento_json\` consegna in 3 giorni su ${consegne} offerte`) : tenuto('consegna in 3 giorni per ordine', 'nessuna offerta con consegna in 3 giorni'),
      consegne > 0
        ? dedupe('un solo ordine alla volta', `il rifornimento di tipo \`consegna\` delle ${consegne} offerte lo implementa già (\`shared/rifornimento.ts\`: «un ordine alla volta, il successivo solo dopo la consegna», riga 33 e riga 187; a parole «Un ordine alla volta: il successivo dopo la consegna, in 3 giorni»)`)
        : tenuto('un solo ordine alla volta', 'nessuna offerta ha il rifornimento di tipo consegna'));
  }
  const parti = testo.split(' · ');
  const ricevi = /^Ricevi: (.+)$/.exec(parti[0] ?? '');
  const dai = /^Dai: ([\d.]+)(?:-([\d.]+))?¥(?: \((.+)\))?$/.exec(parti[1] ?? '');
  if (ricevi && dai) {
    const [, elencoGrezzo = ''] = ricevi;
    const [, daGrezzo = '', fino, gradoGrezzo] = dai;
    const lo = soldi(daGrezzo); const hi = fino === undefined ? lo : soldi(fino);
    const voci = elencoGrezzo.split(' / ').flatMap((v) => {
      const g = /^(.+) \((.+)\)$/.exec(v);
      return g ? g[2]!.split(', ').map((variante) => `${g[1]!} ${variante}`) : [v];
    });
    const trovate = voci.map((v) => ({ voce: v, offerte: c.articoli.filter((a) => compatibileConOfferta(v, a) && a.prezzo !== null && a.prezzo >= lo && a.prezzo <= hi) }));
    const mancante = trovate.find((t) => t.offerte.length === 0);
    const offerte = [...new Set(trovate.flatMap((t) => t.offerte))];
    const segmenti: Segmento[] = [];
    segmenti.push(mancante
      ? tenuto(`Ricevi: ${elencoGrezzo}`, `nessuna offerta per «${mancante.voce}» nel prezzo`)
      : dedupe(`Ricevi: ${elencoGrezzo}`, `${offerte.length} offerte del negozio con questo nome (\`articolo.nome\` e catalogo)`));
    if (mancante) {
      segmenti.push(tenuto(parti[1] ?? '', 'le offerte non coincidono con la riga'));
    } else if (gradoGrezzo !== undefined) {
      const g = /^grado (\p{L}+)(?: avanzato)?(?:, oltre ([\d.]+)¥ spesi)?$/u.exec(gradoGrezzo);
      const parola = g ? normalizza(g[1] ?? '') : '';
      const chiaveGrado = RANGHI_CLIENTE.find((r) => parola.startsWith(r.chiave.slice(0, 5)))?.chiave;
      const soglia = g?.[2] ? soldi(g[2]) : null;
      const rangoGiusto = !!chiaveGrado && offerte.every((a) => rangoCliente(a) === chiaveGrado);
      const sogliaGiusta = soglia === null || RANGHI_CLIENTE.find((r) => r.chiave === chiaveGrado)?.spesa === soglia;
      segmenti.push(rangoGiusto && sogliaGiusta
        ? dedupe(parti[1] ?? '', `prezzi nelle offerte (\`prezzo\`) e grado «${chiaveGrado}» nelle condizioni (\`rango-cliente\`)`)
        : contraddizione(parti[1] ?? '', `i prezzi coincidono ma il grado no: le offerte sono di grado ${[...new Set(offerte.map(rangoCliente))].join('/')} nei dati, la riga dice «${gradoGrezzo}» (la guida [samurai-gamers] dà «Nessuno» per i prodotti iniziali)`));
    } else {
      segmenti.push(dedupe(parti[1] ?? '', 'prezzi nelle offerte (`prezzo`)'));
    }
    for (const extra of parti.slice(2)) {
      if (extra === 'Sblocco progressivo in base al totale speso su Tanaka') {
        segmenti.push(c.programma?.calcolo === 'rango-cliente' ? dedupe(extra, '`programma_punti_json`: grado cliente calcolato sugli yen spesi') : tenuto(extra, 'il negozio non ha il programma a gradi'));
        continue;
      }
      const limiti = extra.split('; ').map((x) => /^(.+) limitata a (\d+) unità$/.exec(x));
      if (limiti.every((x) => x !== null)) {
        const tutteLimitate = limiti.every((x) => c.articoli.some((a) => dellOfferta(x?.[1] ?? '', a) && a.quantita === Number(x?.[2])));
        segmenti.push(tutteLimitate ? dedupe(extra, 'quantità 1 nelle offerte (`quantita`); l’elenco della riga è parziale rispetto ai dati (4 offerte limitate, non 3)') : tenuto(extra, 'una quantità non coincide con le offerte'));
        continue;
      }
      segmenti.push(tenuto(extra, 'parte non riconosciuta'));
    }
    return rigaDi(' · ', ...segmenti);
  }
  return esaminaUrl(c, testo) ?? rigaUnica(tenuto(testo, 'riga non riconosciuta'));
}

function esaminaRiga(c: Contesto, testo: string, termineStrutturato: boolean): RigaEsaminata {
  switch (c.chiave) {
    case 'venditore-ambulante': return esaminaVenditore(c, testo);
    case 'mercante-sakai': return esaminaSakai(c, testo);
    case 'jose': return esaminaJose(c, testo);
    case 'gachapon-akihabara': return esaminaGachapon(c, testo);
    case 'tanaka-affari-loschi': return esaminaTanaka(c, testo, termineStrutturato);
  }
}

// ---------------------------------------------------------------------------
// Il piano
// ---------------------------------------------------------------------------

/** Il primo paragrafo di una nota e le righe del blocco d'archivio che lo segue (dopo la frase standard); `righe` è null se la nota non ha il blocco nella forma nota. */
function dividiNota(nota: string): { paragrafo: string; righe: string[] | null } {
  const inizio = `\n\n${INTESTAZIONE}\n${STANDARD}\n`;
  const i = nota.indexOf(inizio);
  if (i < 0) return { paragrafo: nota, righe: null };
  return { paragrafo: nota.slice(0, i), righe: nota.slice(i + inizio.length).split('\n') };
}

function esaminaParagrafo(c: Contesto, paragrafo: string, termineStrutturato: boolean): { testo: string; segmenti: Segmento[] } {
  const segmenti: Segmento[] = [];
  let testo = paragrafo;
  if (c.chiave === 'venditore-ambulante') {
    const frase = ' Gli articoli si sbloccano in base al Rango Fascino (2, 3 e 5)';
    const ranghi = [...new Set(c.articoli.flatMap((a) => a.condizioni.filter((x) => x.tipo === 'dote' && x.dote === 'fascino').map((x) => x.rango as number)))].sort((a, b) => a - b);
    if (testo.endsWith(frase) && JSON.stringify(ranghi) === '[2,3,5]') {
      const resto = testo.slice(0, -frase.length);
      testo = resto.endsWith('.') ? resto : `${resto}.`;
      segmenti.push(dedupe(frase.trim(), 'le Doti Fascino delle offerte (`condizioni_json`, tipo `dote`) hanno proprio i ranghi 2, 3 e 5'));
    }
  }
  if (c.chiave === 'jose') {
    // dalla migrazione 305 le aperture dei Dedali sono calcolate (`dungeon_area.condizioni_json`, `esitoAperturaDedalo`): la frase che le dice «da segnare
    // in Partita → Progressi, non dedotte dalla data» è smentita dai dati e si toglie (il testo intero resta nell'archivio)
    const frase = ' Le aperture effettive dei dedali si segnano in Partita → Progressi; non sono dedotte dalla data.';
    if (testo.split(frase).length === 2) {
      testo = testo.replace(frase, '');
      segmenti.push(contraddizione(frase.trim(), 'dalla migrazione 305 l’apertura di un Dedalo è una condizione calcolata (`dungeon_area.condizioni_json`), non un segno a mano'));
    }
  }
  if (c.chiave === TANAKA && termineStrutturato) {
    for (const frase of [' Attivo fino al 30 gennaio secondo fonte non italiana.', ' In Persona 5 Royal la disponibilità del negozio è estesa fino al 30 gennaio']) {
      if (testo.split(frase).length === 2) {
        testo = testo.replace(frase, '');
        segmenti.push(dedupe(frase.trim(), 'il termine del 30 gennaio è ora la condizione `non(data dal 01-31)` dello sblocco del negozio (`sblocco_json`)'));
      }
    }
  }
  return { testo, segmenti };
}

/** La nota nuova di un negozio e il verbale di ogni parte; null se la nota non ha niente da cambiare. */
function pianoDiUnNegozio(db: AppDatabase, chiave: ChiaveNegozio, termineStrutturato: boolean): PianoNota | null {
  const c = leggiContesto(db, chiave);
  if (!c || !c.notaGrezza) return null;
  const { paragrafo, righe } = dividiNota(c.nota);
  const par = esaminaParagrafo(c, paragrafo, termineStrutturato);
  const esaminate = (righe ?? []).filter((r) => r !== '').map((r) => esaminaRiga(c, r, termineStrutturato));
  // ciò che resta del blocco diventa frasi normali in coda al primo paragrafo; l'intestazione e la frase standard spariscono
  const frasi = esaminate.flatMap((r) => r.segmenti.filter((s) => s.azione === 'tenuto').map((s) => s.frase ?? inFrase(s.testo)));
  const aperta = par.testo.trimEnd();
  const nuova = frasi.length > 0 ? `${/[.!?]$/.test(aperta) ? aperta : `${aperta}.`} ${frasi.join(' ')}` : par.testo;
  const fonteNuova = fonteConAggiunte(c.fonteNegozio, esaminate.flatMap((r) => r.aggiungiFonti ?? []));
  if (nuova === c.nota && fonteNuova === null) return null;
  return { negozio: chiave, originale: c.notaGrezza, nuova, fonteOriginale: c.fonteNegozio, fonteNuova, paragrafo: par.segmenti, righe: esaminate };
}

/** Le note di offerta che ripetono un dato: Sakai (12 «Scambio…» e 2 «Testo di prima…») e Jose (37 «Aver sbloccato il Dedalo…»), qualunque sia l'origine
 *  dell'offerta: la nota si toglie solo dopo la prova puntuale che il costo e l'intervallo (o il Dedalo) sono già nei dati strutturati. */
function pianoDelleNoteDiOfferta(db: AppDatabase): PianoArticolo[] {
  const piano: PianoArticolo[] = [];
  for (const negozio of ['mercante-sakai', 'jose', TANAKA] as const) {
    const c = leggiContesto(db, negozio);
    if (!c) continue;
    for (const a of c.articoli) {
      if (!a.nota) continue;
      const originale = a.nota;
      const voce = (azione: Azione, motivo: string, nuova?: string): void => { piano.push({ articolo: a.chiave, negozio, originale, azione, motivo, ...(nuova !== undefined ? { nuova } : {}) }); };
      const nota = originale.normalize('NFC');
      if (negozio === TANAKA) {
        // «rango cliente Iniziale» è il grado di base (soglia 0 yen): lo dicono l'assenza di una condizione `rango-cliente` e il programma a gradi del negozio
        const iniziale = /^rango cliente Iniziale(?:, (.+))?$/.exec(nota);
        if (iniziale) {
          const ok = a.condizioni.every((x) => x.tipo !== 'rango-cliente') && c.programma?.calcolo === 'rango-cliente';
          const resto = iniziale[1];
          if (!ok) voce('tenuto', 'l’offerta ha una condizione `rango-cliente` o il negozio non ha il programma a gradi');
          else if (resto === undefined) voce('dedupe', 'grado di base (Iniziale, soglia 0 yen): nessuna condizione `rango-cliente` sull’offerta e `programma_punti_json` a gradi; la nota si svuota');
          else voce('dedupe', `«rango cliente Iniziale» è il grado di base (nessuna condizione \`rango-cliente\`, \`programma_punti_json\` a gradi); resta «${inFrase(resto)}», dato valido non modellato`, inFrase(resto));
          continue;
        }
        voce('tenuto', 'nota non riconosciuta');
        continue;
      }
      if (negozio === 'mercante-sakai') {
        const scambio = /^Scambio: (.+)\. (\d{1,2})\/(\d{1,2}) - (\d{1,2})\/(\d{1,2})\.$/.exec(nota);
        if (scambio) {
          const [, costo = '', m1 = '', g1 = '', m2 = '', g2 = ''] = scambio;
          const ok = haIntervallo(a, `${dueCifre(m1)}-${dueCifre(g1)}`, `${dueCifre(m2)}-${dueCifre(g2)}`) && a.costoNomi.some((n) => stessoNome(costo, n));
          voce(ok ? 'dedupe' : 'tenuto', ok ? `costo «${costo}» e intervallo in \`costo_json\` e \`condizioni_json\`` : 'costo o intervallo diversi da quelli dell’offerta');
          continue;
        }
        const prima = /^Testo di prima dell[’'']effetto \(superato, corretto secondo Royal, guida AGS Sakai\): «Ottenut[ao] in cambio di (.+)»\. È il costo dello scambio, già nel costo dell[’'']offerta\.$/.exec(nota);
        if (prima) {
          const ok = a.costoNomi.some((n) => stessoNome(prima[1] ?? '', n));
          voce(ok ? 'dedupe' : 'tenuto', ok ? `il costo «${prima[1]}» è in \`costo_json\`; la nota è un testo di prima già dichiarato superato` : 'il costo dell’offerta è diverso');
          continue;
        }
      } else {
        const sblocco = /^Indicazioni originali della fonte: Aver sbloccato il Dedalo di (.+)\.$/.exec(nota);
        if (sblocco) {
          const ok = dedaloDi(a) === normalizza(sblocco[1] ?? '').replace(/ /g, '');
          voce(ok ? 'dedupe' : 'tenuto', ok ? `condizione «Dedalo di ${sblocco[1]} aperto» in \`condizioni_json\`` : 'la condizione dell’offerta è un altro Dedalo');
          continue;
        }
      }
      voce('tenuto', 'nota non riconosciuta');
    }
  }
  return piano;
}

/** Tutto ciò che questa migrazione cambierebbe nello stato attuale del database (sola lettura). */
export function pianoNote(db: AppDatabase): Piano {
  const sblocco: PianoSblocco[] = [];
  // un negozio adottato o creato dall'utente (origine diversa da `seed`) non si tocca, come le sue offerte: né la nota né lo sblocco
  const adottati = new Set(db.prepare(`SELECT chiave FROM main.negozio WHERE chiave IN (${NEGOZI.map(() => '?').join(',')}) AND origine <> 'seed'`).pluck().all(...NEGOZI) as string[]);
  const tanaka = db.prepare('SELECT sblocco_json FROM main.negozio WHERE chiave = ?').pluck().get(TANAKA) as string | null | undefined;
  let termineStrutturato = false;
  if (tanaka !== undefined && !adottati.has(TANAKA)) {
    const lista = leggi<Condizione[]>(tanaka);
    if (lista && lista.some((x) => JSON.stringify(x) === JSON.stringify(TERMINE_TANAKA))) {
      termineStrutturato = true;
    } else if (lista) {
      sblocco.push({ negozio: TANAKA, prima: tanaka, dopo: JSON.stringify([...lista, TERMINE_TANAKA]) });
      termineStrutturato = true;
    } else if (tanaka) {
      // lo sblocco c'è ma non si legge: il termine non si struttura e le frasi sul 30 gennaio restano nella nota
      logger.warn({ migrazione: 'L1-06-345', negozio: TANAKA }, 'sblocco_json non leggibile: il termine del 30 gennaio resta nella nota');
    }
  }
  const negozi = NEGOZI.filter((n) => !adottati.has(n)).map((n) => pianoDiUnNegozio(db, n, termineStrutturato)).filter((p): p is PianoNota => p !== null);
  const note = pianoDelleNoteDiOfferta(db);
  return { negozi, articoli: note.filter((a) => a.azione === 'dedupe'), articoliTenuti: note.filter((a) => a.azione !== 'dedupe'), sblocco };
}

const TABELLE_NECESSARIE = ['negozio', 'articolo', 'dati_guida', 'catalogo_oggetto', 'ricompensa_oggetto', 'luogo', 'area', 'quartiere'] as const;
const TABELLE_INTATTE = ['luogo', 'attivita', 'spillo', 'cestino', 'catalogo_oggetto', 'ricompensa_oggetto'] as const;

export const migration345: Migration = {
  id: 345,
  name: 'note_darchivio_dei_negozi',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (TABELLE_NECESSARIE.some((t) => !esisteTabella(db, t))) return;

    const piano = pianoNote(db);
    if (piano.negozi.length === 0 && piano.articoli.length === 0 && piano.sblocco.length === 0) return;

    // le impronte di prima: negozio senza note e sblocco, articolo senza nota, e le tabelle che non devono cambiare
    const prima = new Map<string, string>([['negozio', improntaTabella(db, 'negozio', ['note', 'sblocco_json', 'fonte'])], ['articolo', improntaTabella(db, 'articolo', ['nota'])]]);
    for (const t of TABELLE_INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));
    const articoliPrima = db.prepare('SELECT COUNT(*) FROM main.articolo').pluck().get() as number;

    for (const s of piano.sblocco) {
      if (db.prepare('UPDATE main.negozio SET sblocco_json = ? WHERE chiave = ? AND sblocco_json IS ?').run(s.dopo, s.negozio, s.prima).changes !== 1) errore(`lo sblocco di ${s.negozio} non si aggiorna`);
    }
    const noteNegozi: Record<string, string> = {};
    for (const p of piano.negozi) {
      if (db.prepare('UPDATE main.negozio SET note = ?, fonte = ? WHERE chiave = ? AND note = ? AND fonte = ?').run(p.nuova, p.fonteNuova ?? p.fonteOriginale, p.negozio, p.originale, p.fonteOriginale).changes !== 1) {
        errore(`la nota o la fonte di ${p.negozio} non si aggiorna`);
      }
      noteNegozi[p.negozio] = p.originale;
    }
    const noteOfferte: Record<string, string> = {};
    for (const a of piano.articoli) {
      if (db.prepare('UPDATE main.articolo SET nota = ? WHERE chiave = ? AND nota = ?').run(a.nuova ?? null, a.articolo, a.originale).changes !== 1) errore(`la nota dell’offerta ${a.articolo} non si aggiorna`);
      noteOfferte[a.articolo] = a.originale;
    }

    // l'archivio: il testo originale di ogni nota cambiata (la prima copia non si sovrascrive), poi «righe archiviate = righe tolte»
    const nuoveNegozi = archiviaSenzaSovrascrivere(db, 'L1-06 · 345', 'negozio.note', noteNegozi);
    const nuoveOfferte = archiviaSenzaSovrascrivere(db, 'L1-06 · 345', 'articolo.nota', noteOfferte);
    const inArchivio = (colonna: string, chiavi: string[]): boolean => { const righe = righeArchiviate(db, colonna); return chiavi.every((k) => k in righe); };
    if (!inArchivio('negozio.note', Object.keys(noteNegozi))) errore('l’archivio delle note dei negozi non ha tutte le righe');
    if (!inArchivio('articolo.nota', Object.keys(noteOfferte))) errore('l’archivio delle note delle offerte non ha tutte le righe');

    // i controlli: cambia solo ciò che è dichiarato
    if (db.prepare('SELECT COUNT(*) FROM main.articolo').pluck().get() !== articoliPrima) errore('il numero delle offerte è cambiato');
    if (improntaTabella(db, 'negozio', ['note', 'sblocco_json', 'fonte']) !== prima.get('negozio')) errore('le altre colonne di negozio sono cambiate');
    if (improntaTabella(db, 'articolo', ['nota']) !== prima.get('articolo')) errore('le altre colonne di articolo sono cambiate');
    for (const t of TABELLE_INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);

    registraAudit(db, 'audit-l1-06-note-darchivio', {
      migrazione: 'L1-06 · 345',
      sblocco: piano.sblocco,
      negozi: piano.negozi.map((p) => ({
        negozio: p.negozio, paragrafo: p.paragrafo, righe: p.righe.flatMap((r) => r.segmenti), caratteriPrima: p.originale.length, caratteriDopo: p.nuova.length,
        fonteOriginale: p.fonteOriginale, fonteNuova: p.fonteNuova,
      })),
      offerteCambiate: piano.articoli.map((a) => ({ articolo: a.articolo, nuova: a.nuova ?? null, motivo: a.motivo })),
      offerteConNotaTenuta: piano.articoliTenuti.map((a) => ({ articolo: a.articolo, motivo: a.motivo })),
    });
    logger.info({
      migrazione: 'L1-06-345', negozi: piano.negozi.map((p) => p.negozio), offerte: piano.articoli.length, archiviate: { negozi: nuoveNegozi, offerte: nuoveOfferte },
    }, 'note d’archivio dei negozi ripulite');
  },
};
