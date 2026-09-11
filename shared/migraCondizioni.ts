// ============================================================
// Prosa della guida → condizioni. Conversione **all'ingresso dei dati**, mai a runtime.
// ============================================================
//
// La guida esprime la disponibilità come frasi: «a partire dall'arco del Palazzo di Madarame»,
// «rango cliente Oscuro», «dopo aver giocato a biliardo almeno una volta», «solo la domenica
// sera». L'app non legge frasi: legge stati (`condizioniSpillo.ts`). Questo modulo è l'unico
// posto dove una frase diventa uno stato, e lo fa in tre momenti soltanto: la migrazione che
// converte le righe esistenti, il caricamento del seed, l'esportazione verso il seed.
//
// **Che cosa non fa.** Non produce mai una condizione «testuale»: se una frase non corrisponde
// a nessuna regola, non diventa niente — la riga resta disponibile e la frase finisce fra le
// `scartate` dell'esito, che il chiamante registra. È il contrario di prima, quando la frase
// diventava un «da configurare» che l'app mostrava come punto interrogativo per sempre.
//
// Le regole sono quelle che servono alle 128 frasi distinte censite l'11 settembre 2026 nelle
// 324 righe rimaste prosa (docs/analisi/2026-09-11-modello-mappe-negozi-oggetti.md). Ogni regola
// chiede «la frase dice questo?», non «contiene questa parola?»: «a partire dall'arco del Palazzo
// di Niijima» è un arco, «durante l'arco del Palazzo di Niijima» è un periodo, e le due frasi
// condividono tutte le parole.
// ============================================================

import { ARCHI_STORIA, dataValida, type RequisitoSpillo } from './condizioniSpillo.js';

/** Quello che il convertitore deve chiedere ai dati: nomi → chiavi, e la finestra di un arco. */
export interface ContestoConversione {
  /** Negozio della riga (articolo o negozio stesso): per grado cliente e punti negozio. */
  negozio?: string | null;
  /** Confidente che gestisce il negozio: «Rango Confidente 3» senza nome si riferisce a lui. */
  confidenteNegozio?: string | null;
  /** Chiave della riga che si sta convertendo: «tutti gli altri libri di Jinbocho» la esclude. */
  chiaveCorrente?: string | null;
  richiesta?: (nome: string) => string | null;
  libro?: (nome: string) => string | null;
  film?: (nome: string) => string | null;
  articolo?: (nome: string) => string | null;
  attivita?: (nome: string) => string | null;
  /** Quartiere con una data di sblocco nella Guida (gli altri non si possono valutare). */
  quartiereDatato?: (chiave: string) => boolean;
  /** Le chiavi dei libri in vendita a Jinbocho. */
  libriJinbocho?: () => string[];
  /** Finestra «dal–al» in cui un Palazzo esiste (data/seed/finestre-dungeon.json). */
  finestraArco?: (dungeon: string) => { dal: string; al: string | null } | null;
}

export interface EsitoConversione { condizioni: RequisitoSpillo[]; scartate: string[] }

const MESI: Record<string, number> = { gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6, luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12 };
const GIORNI = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'] as const;
const CONFIDENTI = ['igor', 'morgana', 'ryuji', 'ann', 'yusuke', 'makoto', 'futaba', 'haru', 'akechi', 'kasumi', 'sojiro', 'chihaya', 'iwai', 'takemi', 'kawakami', 'ohya', 'shinya', 'hifumi', 'mishima', 'yoshida', 'sae', 'gemelle', 'maruki'] as const;
/** Come la guida chiama i Confidenti quando non usa la chiave. */
const ALIAS_CONFIDENTE: Record<string, string> = { 'ichiko ohya': 'ohya', ichiko: 'ohya', 'tae takemi': 'takemi', 'shinya oda': 'shinya', 'gemelle custodi': 'gemelle', eremita: 'takemi', torre: 'shinya', imperatrice: 'haru', morte: 'takemi', imperatore: 'yusuke', luna: 'mishima', sole: 'yoshida', diavolo: 'ohya', stella: 'hifumi', forza: 'gemelle', fortuna: 'chihaya', 'appeso': 'iwai', temperanza: 'kawakami', gerarca: 'sojiro', giudizio: 'sae', consigliere: 'maruki' };
const QUARTIERI: Record<string, string> = {
  'yongen-jaya': 'yongen-jaya', yongen: 'yongen-jaya', shibuya: 'shibuya', shinjuku: 'shinjuku', kichijoji: 'kichijoji', akihabara: 'akihabara',
  shujin: 'shujin-academy', kanda: 'kanda-jinbocho', jinbocho: 'kanda-jinbocho', ikebukuro: 'ikebukuro', harajuku: 'harajuku', ueno: 'ueno',
  inokashira: 'inokashira-park', odaiba: 'odaiba', shinagawa: 'shinagawa', nakano: 'nakano', ogikubo: 'ogikubo', chinatown: 'yokohama-chinatown',
  yokohama: 'yokohama-chinatown', maihama: 'maihama', roppongi: 'roppongi', tsukishima: 'tsukishima', meiji: 'meiji-shrine', ichigaya: 'ichigaya',
  suidobashi: 'suidobashi', asakusa: 'asakusa',
};
/** Le attività della guida come le frasi le nominano → chiave in tabella `attivita`. */
const ATTIVITA: ReadonlyArray<[RegExp, string]> = [
  [/biliardo/, 'biliardo'], [/freccette/, 'freccette'], [/pesca|pescare/, 'pesca-ichigaya'], [/gabbie di battuta|centro battute/, 'centro-battute-yongen-jaya'],
  [/fior(?:aio|i) rafflesia|rafflesia/, 'lavoro-rafflesia'],
];
const RANGO_CLIENTE: Record<string, string> = { iniziale: 'iniziale', nero: 'nero', oscuro: 'oscuro', oscurita: 'oscuro', caos: 'caos' };
/** Richieste che la guida cita con un titolo diverso da quello della sua stessa tabella. */
const ALIAS_RICHIESTA: Record<string, string> = { 'i baro non vincono mai': 'I vincenti non imbrogliano' };

/** Testo piatto: minuscolo, senza accenti, virgolette e spazi normalizzati, niente punto finale. */
function piatto(testo: string): string {
  return testo.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`´“”„"]/g, "'").toLowerCase().replace(/\s+/g, ' ').replace(/\.$/, '').trim();
}
function data(giorno: string, mese: string): string | null {
  const m = MESI[mese];
  if (!m) return null;
  const g = giorno === 'primo' || giorno === '1°' ? 1 : Number(giorno);
  const d = `${String(m).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
  return dataValida(d) ? d : null;
}
function fineMese(mese: string): string | null {
  const m = MESI[mese];
  if (!m) return null;
  const giorni: Record<number, number> = { 1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31 };
  return `${String(m).padStart(2, '0')}-${giorni[m]}`;
}
function richiestaDa(nome: string, ctx: ContestoConversione): string | null {
  const n = piatto(nome);
  return ctx.richiesta?.(ALIAS_RICHIESTA[n] ?? nome) ?? null;
}
function confidenteDa(nome: string): string | null {
  const n = nome.trim();
  if ((CONFIDENTI as readonly string[]).includes(n)) return n;
  return ALIAS_CONFIDENTE[n] ?? null;
}
const tutte = (c: RequisitoSpillo[]): RequisitoSpillo => (c.length === 1 ? c[0] : { tipo: 'gruppo', modo: 'tutte', condizioni: c });
const almenoUna = (c: RequisitoSpillo[]): RequisitoSpillo => (c.length === 1 ? c[0] : { tipo: 'gruppo', modo: 'almeno-una', condizioni: c });

/** Frammenti che non sono condizioni (posizione, prezzo, rifornimenti, note): si scartano senza rumore. */
const RUMORE = /^(?:sempre (?:disponibile|acquistabile)(?:, oggetto selezionato casualmente)?|rifornimento .*|riforniti.*|nuovi prodotti.*|grado base|scambio con .*|barattando .*|in vendita anche .*|iniziale|(?:disponibile |disponibili |presente )?fin dai? .*|elenco parziale|discrepanza.*|contenuto royal|esclusivo royal|un solo acquisto|un succo al giorno|prezzo variabile|rango massimo|oggetto selezionato casualmente|salvo eccezioni.*|in date selezionate.*|rotazione settimanale fissa|indicativo)$/;

/**
 * Una parte di frase → condizioni, oppure `null` se nessuna regola la riconosce. Le regole
 * guardano la parte **intera**: mai un riconoscimento parziale.
 */
function regola(t: string, ctx: ContestoConversione): RequisitoSpillo[] | null {
  let m: RegExpMatchArray | null;

  // — archi della storia —
  if ((m = t.match(/^(?:a partire )?dall'arco del palazzo di ([a-z]+)$/)) && (ARCHI_STORIA as readonly string[]).includes(m[1])) return [{ tipo: 'arco', dungeon: m[1] }];
  if ((m = t.match(/^durante l'arco del palazzo di ([a-z]+)(?: \([a-z ]+\))?$/))) {
    const f = ctx.finestraArco?.(m[1]);
    return f && f.al ? [{ tipo: 'intervallo', dal: f.dal, al: f.al }] : null;
  }
  if ((m = t.match(/^dopo (?:il )?(?:primo )?palazzo(?: di)? \(?([a-z]+)\)?$/)) && (ARCHI_STORIA as readonly string[]).includes(m[1])) return [{ tipo: 'palazzo', dungeon: m[1] }];

  // — date —
  if ((m = t.match(/^(?:disponibile |disponibili )?(?:dal|dalla|da|a partire dal) (?:\w+ )?(\d{1,2}|primo|1°) ([a-z]+)$/)) && MESI[m[2]]) { const d = data(m[1], m[2]); return d ? [{ tipo: 'data', dal: d }] : null; }
  if ((m = t.match(/^(?:scambio )?(?:solo |disponibile solo |disponibile )?(?:dal|dalla|da) (\d{1,2}|primo|1°)(?: ([a-z]+))? al (\d{1,2}) ([a-z]+)$/)) && MESI[m[4]]) {
    const dal = data(m[1], m[2] ?? m[4]); const al = data(m[3], m[4]);
    return dal && al ? [{ tipo: 'intervallo', dal, al }] : null;
  }
  if ((m = t.match(/^(\d{1,2}|primo)-(\d{1,2}) ([a-z]+)$/)) && MESI[m[3]]) { const dal = data(m[1], m[3]); const al = data(m[2], m[3]); return dal && al ? [{ tipo: 'intervallo', dal, al }] : null; }
  if ((m = t.match(/^(?:disponibile )?fino al (\d{1,2}) ([a-z]+)(?: secondo .*)?$/)) && MESI[m[2]]) { const al = data(m[1], m[2]); return al ? [{ tipo: 'intervallo', dal: '04-09', al }] : null; }
  if ((m = t.match(/^(?:domenica |lunedi |martedi |mercoledi |giovedi |venerdi |sabato )?(\d{1,2}|primo) ([a-z]+)$/)) && MESI[m[2]]) {
    const d = data(m[1], m[2]);
    // «domenica 24 aprile» è quel giorno solo; «18 aprile» in un campo «disponibile dal» è un inizio
    return d ? [/^[a-z]+ \d/.test(t) ? { tipo: 'intervallo', dal: d, al: d } : { tipo: 'data', dal: d }] : null;
  }
  if ((m = t.match(/^([a-z]+)(?: \(indicativo\))?$/)) && MESI[m[1]]) { const dal = data('1', m[1]); const al = fineMese(m[1]); return dal && al ? [{ tipo: 'intervallo', dal, al }] : null; }
  if ((m = t.match(/^([a-z]+)-([a-z]+)$/)) && MESI[m[1]] && MESI[m[2]]) { const dal = data('1', m[1]); const al = fineMese(m[2]); return dal && al ? [{ tipo: 'intervallo', dal, al }] : null; }

  // — quartieri —
  if ((m = t.match(/^(?:disponibile )?(?:da quando si sblocca|dopo aver scoperto l'area di|dopo lo sblocco di) ([a-z-]+)$/)) && QUARTIERI[m[1]]) {
    const q = QUARTIERI[m[1]];
    return ctx.quartiereDatato?.(q) ? [{ tipo: 'quartiere', quartiere: q }] : null;
  }
  if ((m = t.match(/^(?:disponibile )?(?:dal|dalla) (?:\w+ )?(\d{1,2}|primo) ([a-z]+), quando si sblocca ([a-z-]+)$/)) && MESI[m[2]]) {
    const q = QUARTIERI[m[3]];
    if (q && ctx.quartiereDatato?.(q)) return [{ tipo: 'quartiere', quartiere: q }];
    const d = data(m[1], m[2]); return d ? [{ tipo: 'data', dal: d }] : null;
  }

  // — calendario e meteo —
  if (/^(?:solo )?(?:nei giorni di pioggia|(?:se|quando) piove)$/.test(t)) return [{ tipo: 'piove' }];
  if (/^(?:non (?:e )?disponibile (?:in caso di|se|con la) pioggia|solo se non piove|mai (?:in caso di|con la) pioggia)$/.test(t)) return [{ tipo: 'meteo', condizione: 'non-piove' }];
  if ((m = t.match(/^(?:solo )?dal (lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica) al (lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica)(?:, di (giorno|sera))?$/))) {
    const da = GIORNI.indexOf(m[1] as typeof GIORNI[number]); const a = GIORNI.indexOf(m[2] as typeof GIORNI[number]);
    const giorni = da <= a ? GIORNI.slice(da, a + 1) : [...GIORNI.slice(da), ...GIORNI.slice(0, a + 1)];
    const out: RequisitoSpillo[] = [{ tipo: 'giorno-settimana', giorni: [...giorni] }];
    if (m[3]) out.push({ tipo: 'fascia', fascia: m[3] as 'giorno' | 'sera' });
    return out;
  }
  if ((m = t.match(/^solo (?:la |il |di )?(lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica)(?: (sera|di sera|di giorno))?$/))) {
    const out: RequisitoSpillo[] = [{ tipo: 'giorno-settimana', giorni: [m[1]] }];
    if (m[2]) out.push({ tipo: 'fascia', fascia: m[2].includes('sera') ? 'sera' : 'giorno' });
    return out;
  }
  if (/^(?:solo |esclusivamente |aperto solo )?di sera$/.test(t)) return [{ tipo: 'fascia', fascia: 'sera' }];
  if (/^(?:solo |esclusivamente |aperto solo )?di giorno$/.test(t)) return [{ tipo: 'fascia', fascia: 'giorno' }];
  if ((m = t.match(/^solo in (primavera|estate|autunno|inverno)$/))) return [{ tipo: 'stagione', stagione: m[1] }];

  // — doti, confidenti, richieste —
  if ((m = t.match(/^(?:richiede )?(conoscenza|coraggio|perizia|gentilezza|fascino) rango ([1-5])$/))) return [{ tipo: 'dote', dote: m[1], rango: Number(m[2]) }];
  if ((m = t.match(/^(?:richiede )?(?:le tre statistiche|coraggio, conoscenza e perizia|coraggio\/conoscenza\/perizia)(?: almeno)?(?: al livello| rango) ([1-5])$/))) return ['coraggio', 'conoscenza', 'perizia'].map((d) => ({ tipo: 'dote', dote: d, rango: Number(m![1]) }));
  if ((m = t.match(/^(?:richiede )?(?:il )?rango confidente ([a-z ]+?) (\d{1,2})(?:, rango massimo)?(?: \(.*\))?$/)) && Number(m[2]) >= 1 && Number(m[2]) <= 10) { const c = confidenteDa(m[1]); return c ? [{ tipo: 'confidente', confidente: c, rango: Number(m[2]) }] : null; }
  if ((m = t.match(/^(?:richiede )?(?:il )?rango confidente (\d{1,2})$/)) && ctx.confidenteNegozio && Number(m[1]) >= 1 && Number(m[1]) <= 10) return [{ tipo: 'confidente', confidente: ctx.confidenteNegozio, rango: Number(m[1]) }];
  if ((m = t.match(/^(?:richiede )?rango massimo del confidente ([a-z ]+?)(?:, [a-z ]+)?$/))) { const c = confidenteDa(m[1]); return c ? [{ tipo: 'confidente', confidente: c, rango: 10 }] : null; }
  if ((m = t.match(/^rango (\d{1,2}) (?:di|del confidente di|del confidente) ([a-z ]+)$/)) && Number(m[1]) >= 1 && Number(m[1]) <= 10) { const c = confidenteDa(m[2]); return c ? [{ tipo: 'confidente', confidente: c, rango: Number(m[1]) }] : null; }
  if ((m = t.match(/^rango confidente (\d{1,2}) con ([a-z ]+)$/)) && Number(m[1]) >= 1 && Number(m[1]) <= 10) { const c = confidenteDa(m[2]); return c ? [{ tipo: 'confidente', confidente: c, rango: Number(m[1]) }] : null; }
  if ((m = t.match(/^con l'avvio del confidente di ([a-z ]+?)(?: \(.*\))?$/))) { const c = confidenteDa(m[1]); return c ? [{ tipo: 'confidente', confidente: c, rango: 1 }] : null; }
  if ((m = t.match(/^confidente di ([a-z ]+) avviato$/))) { const c = confidenteDa(m[1]); return c ? [{ tipo: 'confidente', confidente: c, rango: 1 }] : null; }
  if ((m = t.match(/^legato al confidente (?:del(?:la)? |dell')?([a-z ]+?)(?: \(([a-z ]+)\))?$/))) { const c = confidenteDa(m[2] ?? m[1]) ?? confidenteDa(m[1]); return c ? [{ tipo: 'confidente', confidente: c, rango: 1 }] : null; }
  if ((m = t.match(/^(?:richiede il completamento della |dopo la |richiede la |tramite la )?richiesta(?: (?:dei )?mementos)? '([^']+)'$/)) || (m = t.match(/^richiede il completamento della richiesta (.+)$/))) {
    const k = richiestaDa(m[1], ctx); return k ? [{ tipo: 'richiesta', richiesta: k }] : null;
  }
  if ((m = t.match(/^avviabile dal (\d{1,2}|primo) ([a-z]+) tramite la richiesta(?: mementos)? '([^']+)'$/)) && MESI[m[2]]) {
    const d = data(m[1], m[2]); const k = richiestaDa(m[3], ctx);
    return d && k ? [{ tipo: 'data', dal: d }, { tipo: 'richiesta', richiesta: k }] : null;
  }

  // — letture —
  if ((m = t.match(/^dopo '([^']+)'$/))) { const l = ctx.libro?.(m[1]); if (l) return [{ tipo: 'lettura', categoria: 'libro', chiave: l }]; const f = ctx.film?.(m[1]); return f ? [{ tipo: 'lettura', categoria: 'film', chiave: f }] : null; }
  if ((m = t.match(/^dopo aver letto (?:il libro )?'([^']+)'(?: \(.*\))?$/))) { const k = ctx.libro?.(m[1]); return k ? [{ tipo: 'lettura', categoria: 'libro', chiave: k }] : null; }
  if ((m = t.match(/^dopo aver letto (?:il libro )?([a-z' ]+?)(?: \([a-z ,]+\))?$/)) && !/tutti/.test(t)) { const k = ctx.libro?.(m[1]); return k ? [{ tipo: 'lettura', categoria: 'libro', chiave: k }] : null; }
  if (/^dopo aver letto tutti (?:gli altri )?(?:i )?libri di jinbocho$/.test(t)) {
    const libri = (ctx.libriJinbocho?.() ?? []).filter((k) => k !== ctx.chiaveCorrente);
    return libri.length ? [tutte(libri.map((k): RequisitoSpillo => ({ tipo: 'lettura', categoria: 'libro', chiave: k })))] : null;
  }
  if (/^dopo la prima visione di un film\/dvd$/.test(t) || /^dopo essere andati al cinema o aver visto un dvd almeno una volta$/.test(t)) return [{ tipo: 'contatore', cosa: 'film-completati', almeno: 1 }];
  if (/^dopo il completamento di un videogioco$/.test(t)) return [{ tipo: 'contatore', cosa: 'videogiochi-completati', almeno: 1 }];

  // — attività ed eventi —
  if ((m = t.match(/^dopo (?:aver (?:giocato a|lavorato almeno una volta al negozio di|lavorato al)|essere stati almeno una volta alle|essere andati a|la prima (?:partita a|sessione di|visita al|esperienza al lavoro dal)) ([a-z ]+?)(?: almeno una volta| a ichigaya)?$/))) {
    const a = ATTIVITA.find(([rx]) => rx.test(m![1]));
    return a ? [{ tipo: 'attivita', attivita: a[1], volte: 1 }] : null;
  }
  if (/^dopo (?:aver creato uno strumento di infiltrazione almeno una volta|la prima creazione di uno strumento)$/.test(t)) return [{ tipo: 'evento', evento: 'primo-strumento-creato' }];
  if (/^dopo rango tecnico 3 al biliardo$/.test(t)) return [{ tipo: 'evento', evento: 'biliardo-rango-tecnico-3' }];
  if ((m = t.match(/^dopo l'evento con (makoto|futaba|haru|akechi)$/))) return [{ tipo: 'evento', evento: `evento-${m[1]}` }];
  if ((m = t.match(/^dal (\d{1,2}|primo) ([a-z]+), interagendo con la sedia .*\(dopo aver pulito la mansarda\)$/)) && MESI[m[2]]) { const d = data(m[1], m[2]); return d ? [{ tipo: 'data', dal: d }, { tipo: 'evento', evento: 'mansarda-pulita' }] : null; }
  if (/^dopo aver pulito la mansarda(?: del leblanc)?$/.test(t) || /^interagendo con la sedia .*\(dopo aver pulito la mansarda\)$/.test(t)) return [{ tipo: 'evento', evento: 'mansarda-pulita' }];
  if (/^solo se la mansarda del leblanc non viene pulita$/.test(t)) return [{ tipo: 'non', condizione: { tipo: 'evento', evento: 'mansarda-pulita' } }];
  if ((m = t.match(/^(\d{1,2}) ([a-z]+), evento con [a-z ]+$/)) && MESI[m[2]]) { const d = data(m[1], m[2]); return d ? [{ tipo: 'data', dal: d }] : null; }
  if ((m = t.match(/^(\d{1,2}) ([a-z]+) \(evento con [a-z ]+\)$/)) && MESI[m[2]]) { const d = data(m[1], m[2]); return d ? [{ tipo: 'data', dal: d }] : null; }
  if ((m = t.match(/^leggendo il libro '([^']+)'$/))) { const k = ctx.libro?.(m[1]); return k ? [{ tipo: 'lettura', categoria: 'libro', chiave: k }] : null; }

  // — negozi —
  if ((m = t.match(/^rango cliente (iniziale|nero|oscuro|caos)$/))) return m[1] === 'iniziale' ? [] : ctx.negozio ? [{ tipo: 'rango-cliente', negozio: ctx.negozio, rango: m[1] as 'nero' | 'oscuro' | 'caos' }] : null;
  if ((m = t.match(/^grado (nero|oscurita|caos) \(spendere oltre [\d.]+ yen\)$/))) return ctx.negozio ? [{ tipo: 'rango-cliente', negozio: ctx.negozio, rango: RANGO_CLIENTE[m[1]] as 'nero' | 'oscuro' | 'caos' }] : null;
  if ((m = t.match(/^(\d+) punti negozio$/))) return ctx.negozio ? [{ tipo: 'punti-negozio', negozio: ctx.negozio, punti: Number(m[1]) }] : null;
  if ((m = t.match(/^richiede (?:il |lo |la |l')?([a-z' ]+?) \(.*\) riparato con (?:il |lo |la |l')?([a-z' ]+?) \(.*\)$/))) {
    const a = ctx.articolo?.(m[1]); const b = ctx.articolo?.(m[2]);
    return a && b ? [{ tipo: 'articolo', articolo: a }, { tipo: 'articolo', articolo: b }] : null;
  }
  if ((m = t.match(/^incluso nel set per retrogaming \(.*, dal (\d{1,2}|primo) ([a-z]+)\)$/)) && MESI[m[2]]) { const d = data(m[1], m[2]); return d ? [{ tipo: 'data', dal: d }] : null; }

  // — sfide con più doti —
  if ((m = t.match(/^guardiano: perizia rango ([1-5]); boss: .*$/))) return [{ tipo: 'dote', dote: 'perizia', rango: Number(m[1]) }];
  if ((m = t.match(/^tre sfide progressive: [a-z ]+ \(coraggio\/conoscenza\/perizia rango ([1-5])\).*$/))) return ['coraggio', 'conoscenza', 'perizia'].map((d) => ({ tipo: 'dote', dote: d, rango: Number(m![1]) }));

  return null;
}

/** Spezza una frase in parti: «;» e «,» separano condizioni in E; «oppure»/«o» separano alternative. */
function converti(testo: string, ctx: ContestoConversione, scartate: string[]): RequisitoSpillo[] {
  const t = piatto(testo);
  if (!t) return [];
  if (RUMORE.test(t)) return [];
  const intera = regola(t, ctx);
  if (intera) return intera;

  // Alternative: «A oppure B» → almeno una fra A e B
  const alternative = t.split(/,? oppure /);
  if (alternative.length > 1) {
    const rami = alternative.map((a) => converti(a, ctx, scartate)).filter((r) => r.length > 0).map(tutte);
    return rami.length > 1 ? [almenoUna(rami)] : rami;
  }
  // La mansarda: «solo se non pulita (altrimenti si ottiene dopo aver pulito, dal 18 aprile)»
  const mansarda = t.match(/^solo se la mansarda del leblanc non viene pulita \(altrimenti si ottiene dopo aver pulito la mansarda del leblanc, dal (\d{1,2}) ([a-z]+)\)$/);
  if (mansarda) {
    const d = data(mansarda[1], mansarda[2]);
    if (d) return [almenoUna([{ tipo: 'non', condizione: { tipo: 'evento', evento: 'mansarda-pulita' } }, tutte([{ tipo: 'evento', evento: 'mansarda-pulita' }, { tipo: 'data', dal: d }])])];
  }
  // Congiunzioni: «;», «,», «: », « e » (non dentro parentesi)
  const parti = t.split(/\s*;\s*|,\s+(?![^(]*\))|:\s+(?![^(]*\))|\s+e\s+(?![^(]*\))/).map((p) => p.trim()).filter(Boolean);
  if (parti.length > 1) {
    const out: RequisitoSpillo[] = [];
    for (const p of parti) {
      if (RUMORE.test(p)) continue;
      const r = regola(p, ctx);
      if (r) out.push(...r); else scartate.push(p);
    }
    return out;
  }
  scartate.push(t);
  return [];
}

/** Converte le frasi di una riga; i doppioni spariscono. */
export function convertiProsa(testi: Array<string | null | undefined>, ctx: ContestoConversione = {}): EsitoConversione {
  const scartate: string[] = [];
  const viste = new Set<string>();
  const condizioni: RequisitoSpillo[] = [];
  for (const testo of testi) {
    if (!testo?.trim()) continue;
    for (const c of converti(testo, ctx, scartate)) {
      const k = JSON.stringify(c);
      if (!viste.has(k)) { viste.add(k); condizioni.push(c); }
    }
  }
  return { condizioni, scartate };
}

/** Solo le condizioni, per chi non registra gli scarti. */
export function migraTestiCondizioni(testi: Array<string | null | undefined>, ctx: ContestoConversione = {}): RequisitoSpillo[] {
  return convertiProsa(testi, ctx).condizioni;
}
