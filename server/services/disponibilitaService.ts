// ============================================================
// disponibilitaService — quando un articolo o un negozio è davvero raggiungibile nella partita (Fase 15.18)
// ============================================================
//
// La guida esprime lo sblocco come testo libero: «dal 18 aprile», «dopo Palazzo di Kaneshiro», «richiede Fascino Rango 3»,
// «Rango Confidente Sojiro 6», «rango cliente Oscuro», «solo nei giorni di pioggia», «solo la domenica», «solo in inverno»,
// «scambio disponibile dal 26 al 30 luglio», «richiede il completamento della richiesta Lo zio ingordo», «a partire dall'arco del
// Palazzo di Madarame» (l'arco di un Palazzo inizia quando il precedente è stato completato), «da quando si sblocca Akihabara»
// (data di sblocco del quartiere dalla Guida), «solo dal lunedì al venerdì», «domenica 24 aprile» (solo quel giorno). Qui quel testo viene
// tradotto negli stessi requisiti dei semafori dei Confidenti e valutato con lo stesso valutatore (`semaforiService.valuta`),
// così Doti, Palazzi, richieste dei Mementos, ranghi e meteo hanno un'unica regola in tutta l'app. Ciò che non si sa
// valutare («dopo aver pescato una volta», «rango cliente Caos») resta visibile come «ignoto», mai nascosto.
// ============================================================

import { prepared } from '../db/dbService.js';
import { confidenti, dotiSociali } from './partiteService.js';
import { dataLeggibile, statoPartitaSemafori, valuta, type RigaRequisito, type StatoPartitaSemafori } from './semaforiService.js';
import type { RequisitoSeed } from '../../shared/seed.js';
import type { DisponibilitaDto, SemaforoRequisitoDto } from '../../shared/types.js';

const MESI: Record<string, number> = { gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6, luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12 };
const PALAZZI = ['kamoshida', 'madarame', 'kaneshiro', 'futaba', 'okumura', 'niijima', 'shido', 'maruki'] as const;
const DOTI = ['conoscenza', 'coraggio', 'perizia', 'gentilezza', 'fascino'] as const;
const GIORNI = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'] as const;
/** Nomi dei quartieri come compaiono nei testi della guida → chiave del quartiere (tabella `quartiere`). */
const QUARTIERI: Record<string, string> = {
  'yongen-jaya': 'yongen-jaya', yongen: 'yongen-jaya', shibuya: 'shibuya', shinjuku: 'shinjuku', kichijoji: 'kichijoji', akihabara: 'akihabara',
  shujin: 'shujin-academy', kanda: 'kanda-jinbocho', jinbocho: 'kanda-jinbocho', ikebukuro: 'ikebukuro', harajuku: 'harajuku', ueno: 'ueno',
  inokashira: 'inokashira-park', odaiba: 'odaiba', shinagawa: 'shinagawa', nakano: 'nakano', ogikubo: 'ogikubo', chinatown: 'yokohama-chinatown',
  yokohama: 'yokohama-chinatown', maihama: 'maihama', roppongi: 'roppongi', tsukishima: 'tsukishima', meiji: 'meiji-shrine', ichigaya: 'ichigaya',
  suidobashi: 'suidobashi', asakusa: 'asakusa', mementos: 'mementos', memento: 'mementos',
};
const CONFIDENTI = ['igor', 'morgana', 'ryuji', 'ann', 'yusuke', 'makoto', 'futaba', 'haru', 'akechi', 'kasumi', 'sojiro', 'chihaya', 'iwai', 'takemi', 'kawakami', 'ohya', 'shinya', 'hifumi', 'mishima', 'yoshida', 'sae', 'gemelle', 'maruki'] as const;
/** Stagioni del calendario di gioco per mese (aprile → marzo). */
const STAGIONE_PER_MESE: Record<number, string> = { 4: 'primavera', 5: 'primavera', 6: 'estate', 7: 'estate', 8: 'estate', 9: 'autunno', 10: 'autunno', 11: 'autunno', 12: 'inverno', 1: 'inverno', 2: 'inverno', 3: 'primavera' };

/** Testo piatto: minuscolo, senza accenti, spazi normalizzati. */
function piatto(testo: string): string {
  return testo.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`´]/g, "'").toLowerCase().replace(/\s+/g, ' ').trim();
}

/** «18 aprile» / «primo settembre» → «MM-GG». */
function dataDaTesto(giorno: string, mese: string): string | null {
  const m = MESI[mese];
  if (!m) return null;
  const g = giorno === 'primo' ? 1 : Number(giorno);
  if (!Number.isInteger(g) || g < 1 || g > 31) return null;
  return `${String(m).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
}

/** Ordine del calendario di gioco: da aprile (04) a marzo (03) dell'anno dopo. */
export function ordineGioco(d: string): number {
  const [m, g] = d.split('-').map(Number);
  return ((m + 8) % 12) * 100 + g;
}

/** Requisito locale non previsto dai semafori dei Confidenti (intervallo di date, pioggia richiesta, giorno della settimana, stagione). */
type RequisitoLocale =
  | { tipo: 'intervallo'; dal: string; al: string; testo: string }
  | { tipo: 'piove'; testo: string }
  | { tipo: 'giorno-settimana'; giorni: string[]; testo: string }
  | { tipo: 'stagione'; stagione: string; testo: string }
  /** «da quando si sblocca Akihabara»: la data la dà la Guida (tabella `quartiere`). */
  | { tipo: 'quartiere'; quartiere: string; testo: string }
  | { tipo: 'ignoto'; testo: string };

export type RequisitoDisponibilita = RequisitoSeed | RequisitoLocale;

export interface ContestoTesto {
  /** Confidente che gestisce il negozio: «Rango Confidente 3» senza nome si riferisce a lui. */
  confidenteNegozio?: string | null;
}

/** Frammenti che non sono condizioni (note di posizione, rifornimenti, dettagli di prezzo): non producono requisiti. */
const RUMORE = /^(sempre disponibile|sempre acquistabile|rifornimento|riforniti|nuovi prodotti|rango massimo(?! del confidente)|rango cliente iniziale|grado base|scambio con|barattando|solo di (?:sera|giorno|notte)|aperto solo|esclusivamente di sera|(?:disponibile |disponibili |presente )?fin da|elenco parziale|distributori speciali|\d+ distributori|shujin academy|sottopasso di shibuya|sala giochi|accanto al|in vendita anche|\d+ punti negozio|\d+ o \d+ punti negozio|\d+ monete|\d+ yen|discrepanza|contenuto royal|esclusivo royal|terzo semestre|fonte non italiana|articolo piu caro|kasumi\/sumire|akechi torna|oggetto selezionato|un solo acquisto|un succo al giorno|prezzo variabile)/;

/**
 * Traduce un testo della guida in requisiti. Le parti separate da «;», «,» o « e » vengono lette una per una; ogni parte
 * riconosciuta diventa un requisito, le parti di rumore (posizione, prezzo, rifornimenti) si scartano, il resto è «ignoto».
 */
export function requisitiDaTesto(testo: string | null | undefined, ctx: ContestoTesto = {}): RequisitoDisponibilita[] {
  if (!testo || !testo.trim()) return [];
  const out: RequisitoDisponibilita[] = [];
  // gli incisi tra parentesi di più di due parole sono spiegazioni («(altrimenti si ottiene … dal 18 aprile)», «(Yumenoshima, in vendita
  // dal primo settembre)»): non producono requisiti; quelli brevi sono nomi che servono («(Kamoshida)», «(Arcano Morte)», «(max)»)
  const t = piatto(testo).replace(/\(([^)]*)\)/g, (m, dentro: string) => (dentro.trim().split(/\s+/).length <= 2 ? m : ''));
  // le frasi con più condizioni («Rango Confidente Sojiro 9, richiede il completamento della richiesta Lo zio ingordo») si spezzano
  const parti = t.split(/\s*;\s*|,\s*(?=richiede|dopo|dal |solo|rango|esclusivo|contenuto|fonte|terzo|oppure|un solo)|\s+oppure\s+/).map((p) => p.trim()).filter(Boolean);
  for (const parte of parti) {
    if (RUMORE.test(parte)) continue;
    let m: RegExpExecArray | null;
    // intervallo: «scambio disponibile dal 26 al 30 luglio», «dal 22 gennaio al 2 febbraio», «disponibile solo dal 28 agosto al 10 ottobre»
    if ((m = /dal\s+(\d{1,2}|primo)\s+(?:([a-z]+)\s+)?al\s+(\d{1,2})\s+([a-z]+)/.exec(parte))) {
      const meseInizio = m[2] ?? m[4];
      const dal = dataDaTesto(m[1], meseInizio); const al = dataDaTesto(m[3], m[4]);
      if (dal && al) { out.push({ tipo: 'intervallo', dal, al, testo: testo.trim() }); continue; }
    }
    // «domenica 24 aprile» da solo (televendite): l'articolo c'è solo quel giorno
    if ((m = /^(?:domenica|lunedi|martedi|mercoledi|giovedi|venerdi|sabato)\s+(\d{1,2}|primo)\s+([a-z]+)$/.exec(parte))) {
      const giorno = dataDaTesto(m[1], m[2]);
      if (giorno) { out.push({ tipo: 'intervallo', dal: giorno, al: giorno, testo: testo.trim() }); continue; }
    }
    // data: «dal 18 aprile», «disponibile dal primo settembre», «dalla domenica 5 giugno»
    if ((m = /(?:dal|dalla|dall'|da)\s+(?:domenica\s+|lunedi\s+|martedi\s+|mercoledi\s+|giovedi\s+|venerdi\s+|sabato\s+)?(\d{1,2}|primo)\s+([a-z]+)/.exec(parte))) {
      const dal = dataDaTesto(m[1], m[2]);
      if (dal) { out.push({ tipo: 'data', dal, testo: testo.trim() }); continue; }
    }
    // Quartiere: «da quando si sblocca Akihabara», «dopo aver scoperto l'area di Kichijoji» (la data la dà la Guida)
    if ((m = /(?:quando si sblocca|dopo aver scoperto(?: l'area di)?|dopo lo sblocco di)\s+([a-z-]+)/.exec(parte)) && QUARTIERI[m[1]]) {
      out.push({ tipo: 'quartiere', quartiere: QUARTIERI[m[1]], testo: testo.trim() }); continue;
    }
    // Arco di un Palazzo: «a partire dall'arco del Palazzo di Madarame», «durante l'arco del Palazzo di Niijima» — la guida dice che
    // l'inventario si espande quando inizia l'infiltrazione: l'arco di un Palazzo comincia quando il precedente è stato completato
    // (il primo, Kamoshida, dall'inizio del gioco).
    if ((m = /arco\s+(?:narrativo\s+)?del\s+palazzo\s+(?:di\s+)?([a-z]+)/.exec(parte)) && (PALAZZI as readonly string[]).includes(m[1])) {
      const indice = (PALAZZI as readonly string[]).indexOf(m[1]);
      if (indice > 0) out.push({ tipo: 'palazzo', dungeon: PALAZZI[indice - 1], testo: testo.trim() });
      continue;
    }
    // Palazzo: «dopo Palazzo di Niijima», «dopo il primo Palazzo (Kamoshida)»
    if ((m = /dopo\s+(?:il\s+)?(?:primo\s+)?palazzo\s+(?:di\s+)?\(?([a-z]+)\)?/.exec(parte)) && (PALAZZI as readonly string[]).includes(m[1])) {
      out.push({ tipo: 'palazzo', dungeon: m[1], testo: testo.trim() }); continue;
    }
    // Dote: «richiede Fascino Rango 3», «Fascino Rango 2 (Interessante)», «Coraggio Rango 2, Conoscenza Rango 2 e Perizia Rango 2»
    const doti = [...parte.matchAll(/(conoscenza|coraggio|perizia|gentilezza|fascino)\s+rango\s+(\d)/g)];
    if (doti.length) {
      for (const d of doti) out.push({ tipo: 'dote', dote: d[1], rango: Number(d[2]), testo: testo.trim() });
      continue;
    }
    if ((m = /almeno al livello\s+(\d)/.exec(parte))) {
      const doti = (DOTI as readonly string[]).filter((d) => parte.includes(d));
      const elenco = /le tre statistiche/.test(parte) ? ['conoscenza', 'coraggio', 'perizia'] : doti;
      if (elenco.length) { for (const d of elenco) out.push({ tipo: 'dote', dote: d, rango: Number(m[1]), testo: testo.trim() }); continue; }
    }
    // Confidente: «Rango Confidente Sojiro 6», «Rango Confidente 3» (il gestore del negozio), «richiede rango massimo del Confidente Haru»
    if ((m = /rango\s+confidente\s+(?:([a-z]+)\s+)?(\d{1,2})/.exec(parte))) {
      const chiave = m[1] && (CONFIDENTI as readonly string[]).includes(m[1]) ? m[1] : ctx.confidenteNegozio ?? null;
      if (chiave) { out.push({ tipo: 'confidente', confidente: chiave, rango: Number(m[2]), testo: testo.trim() }); continue; }
    }
    if ((m = /rango massimo del confidente\s+([a-z]+)/.exec(parte)) && (CONFIDENTI as readonly string[]).includes(m[1])) {
      out.push({ tipo: 'confidente', confidente: m[1], rango: 10, testo: testo.trim() }); continue;
    }
    if ((m = /confidente\s+([a-z]+)\s+(?:\([^)]*\)\s+)?rango\s+(\d{1,2})/.exec(parte)) && (CONFIDENTI as readonly string[]).includes(m[1])) {
      out.push({ tipo: 'confidente', confidente: m[1], rango: Number(m[2]), testo: testo.trim() }); continue;
    }
    // Richiesta dei Mementos: «richiede il completamento della richiesta Lo zio ingordo»
    if ((m = /richiesta\s+(?:memento\s+)?"?([^"]+?)"?\s*(?:completata)?$/.exec(parte)) && /richiesta/.test(parte)) {
      const nome = testo.trim().match(/richiesta\s+(?:Memento\s+)?"?([^",;]+?)"?\s*(?:completata)?\s*$/i)?.[1] ?? m[1];
      out.push({ tipo: 'richiesta', richiesta: nome.trim(), testo: testo.trim() }); continue;
    }
    // Meteo: «solo nei giorni di pioggia», «giorni di pioggia»
    if (/giorni di pioggia|solo (?:se|quando) piove/.test(parte)) { out.push({ tipo: 'piove', testo: testo.trim() }); continue; }
    if (/non (?:e )?disponibile (?:in caso di|se) pioggia|solo se non piove/.test(parte)) { out.push({ tipo: 'meteo', condizione: 'non-piove', testo: testo.trim() }); continue; }
    // Giorni della settimana: «dal lunedì al venerdì»
    if ((m = /dal\s+(lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica)\s+al\s+(lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica)/.exec(parte))) {
      const da = GIORNI.indexOf(m[1] as typeof GIORNI[number]); const a = GIORNI.indexOf(m[2] as typeof GIORNI[number]);
      const giorni = da <= a ? GIORNI.slice(da, a + 1) : [...GIORNI.slice(da), ...GIORNI.slice(0, a + 1)];
      out.push({ tipo: 'giorno-settimana', giorni: [...giorni], testo: testo.trim() }); continue;
    }
    // Giorno della settimana: «solo la domenica», «solo il venerdi», «solo la domenica sera»
    if ((m = /solo (?:la |il |di )?(lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica)/.exec(parte))) {
      out.push({ tipo: 'giorno-settimana', giorni: [m[1]], testo: testo.trim() }); continue;
    }
    // Stagione: «solo in inverno»
    if ((m = /solo in (primavera|estate|autunno|inverno)/.exec(parte))) { out.push({ tipo: 'stagione', stagione: m[1], testo: testo.trim() }); continue; }
    // condizioni che l'app non sa leggere dai dati della partita («dopo aver pescato una volta», «rango cliente Oscuro»)
    out.push({ tipo: 'ignoto', testo: testo.trim() });
  }
  return out;
}

/** Stato della partita per la disponibilità: lo stesso dei semafori dei Confidenti più il giorno della settimana corrente. */
export interface SbloccoQuartiere { nome: string; dal: string | null }
export interface StatoDisponibilita extends StatoPartitaSemafori {
  giornoSettimana: string | null;
  /** Quartieri della Guida con la data di sblocco («MM-GG») quando il testo dello sblocco comincia con una data. */
  sbloccoQuartieri: Map<string, SbloccoQuartiere>;
}

/** «18 giugno (evento di trama)» → «06-18»; testi che non cominciano con una data (Confidenti, libri) → null. */
export function dataSbloccoQuartiere(sblocco: string | null | undefined): string | null {
  if (!sblocco) return null;
  const m = /^(\d{1,2}|primo|1°)\s+([a-z]+)/.exec(piatto(sblocco).replace(/^1°/, 'primo'));
  return m ? dataDaTesto(m[1], m[2]) : null;
}

export function sbloccoQuartieri(): Map<string, SbloccoQuartiere> {
  const righe = prepared('SELECT chiave, nome, sblocco FROM quartiere').all() as Array<{ chiave: string; nome: string; sblocco: string | null }>;
  return new Map(righe.map((q) => [q.chiave, { nome: q.nome, dal: dataSbloccoQuartiere(q.sblocco) }]));
}

export function statoDisponibilitaPartita(partitaId: number): StatoDisponibilita {
  const ranghi = new Map(confidenti(partitaId).map((c) => [c.chiave, c.rango]));
  const doti = new Map(dotiSociali(partitaId).map((d) => [d.chiave, d.rango]));
  const st = statoPartitaSemafori(partitaId, ranghi, doti);
  const giorno = st.dataGioco ? (prepared('SELECT giorno_settimana FROM giorno_calendario WHERE data = ?').get(st.dataGioco) as { giorno_settimana: string | null } | undefined)?.giorno_settimana ?? null : null;
  return { ...st, giornoSettimana: giorno ? piatto(giorno) : null, sbloccoQuartieri: sbloccoQuartieri() };
}

/** Valuta un requisito: quelli dei Confidenti col valutatore dei semafori, quelli locali qui. */
function valutaRequisito(r: RequisitoDisponibilita, indice: number, st: StatoDisponibilita): SemaforoRequisitoDto {
  const base = { indice, testo: r.testo, confermato: false } as const;
  switch (r.tipo) {
    case 'intervallo': {
      if (!st.dataGioco) return { ...base, tipo: 'data', stato: 'grigio', dettaglio: 'Imposta il giorno corrente della partita', manuale: false };
      const oggi = ordineGioco(st.dataGioco);
      const dentro = oggi >= ordineGioco(r.dal) && oggi <= ordineGioco(r.al);
      return { ...base, tipo: 'data', stato: dentro ? 'verde' : 'rosso', dettaglio: r.dal === r.al ? (dentro ? `Solo il ${dataLeggibile(r.dal)}: è oggi` : `Solo il ${dataLeggibile(r.dal)}, oggi è il ${dataLeggibile(st.dataGioco)}`) : dentro ? `Nel periodo dal ${dataLeggibile(r.dal)} al ${dataLeggibile(r.al)} (oggi ${dataLeggibile(st.dataGioco)})` : `Solo dal ${dataLeggibile(r.dal)} al ${dataLeggibile(r.al)}, oggi è il ${dataLeggibile(st.dataGioco)}`, manuale: false };
    }
    case 'piove': {
      if (!st.meteoOggi) return { ...base, tipo: 'meteo', stato: 'grigio', dettaglio: 'Meteo del giorno corrente non noto', manuale: false };
      const piove = /piogg|tempor/i.test(st.meteoOggi);
      return { ...base, tipo: 'meteo', stato: piove ? 'verde' : 'rosso', dettaglio: piove ? `Oggi ${st.meteoOggi}` : `Solo con la pioggia: oggi ${st.meteoOggi}`, manuale: false };
    }
    case 'giorno-settimana': {
      if (!st.giornoSettimana) return { ...base, tipo: 'giorno-settimana', stato: 'grigio', dettaglio: 'Imposta il giorno corrente della partita', manuale: false };
      const ok = r.giorni.includes(st.giornoSettimana);
      return { ...base, tipo: 'giorno-settimana', stato: ok ? 'verde' : 'rosso', dettaglio: ok ? `Oggi è ${st.giornoSettimana}` : `Solo ${r.giorni.join(', ')}: oggi è ${st.giornoSettimana}`, manuale: false };
    }
    case 'stagione': {
      if (!st.dataGioco) return { ...base, tipo: 'stagione', stato: 'grigio', dettaglio: 'Imposta il giorno corrente della partita', manuale: false };
      const attuale = STAGIONE_PER_MESE[Number(st.dataGioco.slice(0, 2))] ?? '';
      const ok = attuale === r.stagione;
      return { ...base, tipo: 'stagione', stato: ok ? 'verde' : 'rosso', dettaglio: ok ? `Siamo in ${attuale}` : `Solo in ${r.stagione}: siamo in ${attuale}`, manuale: false };
    }
    case 'quartiere': {
      const q = st.sbloccoQuartieri.get(r.quartiere);
      const nome = q?.nome ?? r.quartiere;
      if (!q?.dal) return { ...base, tipo: 'data', stato: 'grigio', dettaglio: `${nome}: la Guida non indica una data di sblocco`, manuale: true };
      // stessa valutazione (e stesso testo) di una data della guida
      const esito = valutaRequisito({ tipo: 'data', dal: q.dal, testo: r.testo }, indice, st);
      return { ...esito, dettaglio: `${nome}: ${esito.dettaglio}` };
    }
    case 'ignoto':
      return { ...base, tipo: 'manuale', stato: 'grigio', dettaglio: 'Condizione non verificabile dai dati della partita', manuale: true };
    default: {
      const { tipo, testo, ...dati } = r as RequisitoSeed & Record<string, unknown>;
      const riga: RigaRequisito = { confidente_chiave: '', rango: 0, indice, tipo, dati_json: JSON.stringify(dati), testo };
      const esito = valuta(riga, st);
      // Palazzo non completato e richiesta non conclusa sono fatti che l'app registra (boss segnato, richiesta completata): per la
      // disponibilita valgono come blocco, non come dubbio da confermare a mano.
      if ((tipo === 'palazzo' || tipo === 'richiesta') && esito.stato === 'grigio') {
        return { ...esito, stato: 'rosso', manuale: false, dettaglio: esito.dettaglio.replace(/\s*(?:—\s*)?(?:o|oppure) conferma qui\s*$/, '') };
      }
      return esito;
    }
  }
}

/**
 * Disponibilità complessiva da uno o più testi della guida: «bloccato» se almeno un requisito è rosso, «ignoto» se nessun rosso ma
 * c'è del grigio (non verificabile o dato mancante), «disponibile» altrimenti (anche senza requisiti).
 */
export function valutaDisponibilita(testi: Array<string | null | undefined>, st: StatoDisponibilita, ctx: ContestoTesto = {}): DisponibilitaDto {
  const requisiti = testi.flatMap((t) => requisitiDaTesto(t, ctx)).map((r, i) => valutaRequisito(r, i, st));
  const stato = requisiti.some((q) => q.stato === 'rosso') ? 'bloccato' : requisiti.some((q) => q.stato === 'grigio') ? 'ignoto' : 'disponibile';
  return { stato, requisiti };
}
