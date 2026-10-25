// ============================================================
// percorsoService — guida giorno per giorno: indice dei giorni, scheda del giorno con le voci spuntabili, giorno corrente della partita (Fase 7.5b)
// ============================================================
//
// Le voci della giornata (azioni della guida, cose da fare ed eventi aggiunti dall'utente, tutti canone) stanno in
// `voce_giornata` e le gestisce `giornataService`; qui la scheda del giorno, l'indice dei giorni e il giorno corrente.
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { cambiaGiornoPartita } from './giornoPartitaService.js';
import { avanzaSeFasciaCompleta, prelevaAvanzamentoValido } from './avanzamentoGiornataService.js';
import type { AzionePercorsoDto, GiornoCorrenteDto, PercorsoGiornoDto, PercorsoIndiceDto } from '../../shared/types.js';
import { confidenti, leggiPartita } from './partiteService.js';
import { conteggiGiornate, spuntaVoce, vociDelGiorno } from './giornataService.js';
import type { OpzioniSpunta } from './effettiAzioneService.js';
import { allerteDelGiorno, meteoDelGiorno, testoMeteo } from './meteoService.js';
import { giornoDellaSettimana } from '../../shared/date.js';

interface Riga { data: string; ordine: number; fase: string; trama: string; vincoli_json: string; meteo: string | null; avvisi_json: string; fonte: string; coperto: number }
/** Una riga di `giorno` (R9-15) come la vede il percorso: il meteo è il testo del giorno unico, lo stesso del calendario. */
interface RigaGiorno extends Omit<Riga, 'meteo'> { meteo_giorno: string | null; meteo_sera: string | null; nota_meteo: string | null }
const comeRiga = ({ meteo_giorno, meteo_sera, nota_meteo, ...r }: RigaGiorno): Riga => ({ ...r, meteo: testoMeteo({ meteo_giorno, meteo_sera, nota_meteo }) });

/** La data di gioco della partita ('MM-GG'); null senza partita, se la partita non esiste o se la data non è impostata. */
function dataCorrente(partitaId: number | undefined): string | null {
  if (partitaId === undefined) return null;
  return (prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null } | undefined)?.data_gioco ?? null;
}

/** R9-16: il giorno della settimana si calcola dalla data; la guida del percorso lo mostra in sigla («sab»), come prima. */
const sigla = (data: string): string | null => giornoDellaSettimana(data)?.slice(0, 3).toLowerCase() ?? null;

/** Indice di tutti i giorni (leggero) con conteggi delle azioni e delle azioni fatte; giorno corrente della partita.
 *  Le azioni contate sono le voci che si spuntano (eventi, scadenze e promemoria no). */
export function indicePercorso(partitaId?: number): PercorsoIndiceDto {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const conteggi = conteggiGiornate(partitaId);
  const righe = (prepared('SELECT data, ordine, fase, meteo_giorno, meteo_sera, nota_meteo, avvisi_json, coperto FROM giorno ORDER BY ordine').all() as Array<Pick<RigaGiorno, 'data' | 'ordine' | 'fase' | 'meteo_giorno' | 'meteo_sera' | 'nota_meteo' | 'avvisi_json' | 'coperto'>>)
    .map(({ meteo_giorno, meteo_sera, nota_meteo, ...r }) => ({ ...r, meteo: testoMeteo({ meteo_giorno, meteo_sera, nota_meteo }) }));
  const giorni = righe.map((r) => {
    const c = conteggi.get(r.data) ?? { azioni: 0, fatte: 0 };
    return {
      giorno: r.data, giornoSettimana: sigla(r.data) ?? '', fase: r.fase, meteo: r.meteo, azioni: c.azioni, fatte: c.fatte,
      avvisi: (JSON.parse(r.avvisi_json) as string[]).length, coperto: r.coperto === 1,
    };
  });
  return { giorni, dataCorrente: dataCorrente(partitaId), totaleGiorni: giorni.length, giorniCoperti: giorni.filter((g) => g.coperto).length };
}

/** Scheda di un giorno con le voci nel loro ordine (fatte nella partita), giorno precedente e successivo. */
export function giornoPercorso(data: string, partitaId?: number): PercorsoGiornoDto {
  // R9-15: il giorno è uno solo (modificabile dall'editor, R9-19): trama, vincoli e meteo sono gli stessi del calendario
  const grezza = prepared('SELECT * FROM giorno WHERE data = ?').get(data) as RigaGiorno | undefined;
  if (!grezza) throw httpErrors.notFound('giorno-non-trovato', `Nessun giorno del percorso il ${data}.`);
  const r = comeRiga(grezza);
  if (partitaId !== undefined) verificaPartita(partitaId);
  const conf = partitaId ? new Map(confidenti(partitaId).map((c) => [c.chiave, c])) : null;
  const azioni = vociDelGiorno(data, partitaId, conf, true);
  const prec = prepared('SELECT data FROM giorno WHERE ordine < ? ORDER BY ordine DESC LIMIT 1').get(r.ordine) as { data: string } | undefined;
  const succ = prepared('SELECT data FROM giorno WHERE ordine > ? ORDER BY ordine ASC LIMIT 1').get(r.ordine) as { data: string } | undefined;
  return {
    giorno: r.data, giornoSettimana: sigla(r.data) ?? '', fase: r.fase, trama: r.trama, vincoli: JSON.parse(r.vincoli_json) as string[], meteo: r.meteo, azioni, avvisi: JSON.parse(r.avvisi_json) as string[], fonte: r.fonte, coperto: r.coperto === 1,
    precedente: prec?.data ?? null, successivo: succ?.data ?? null, dataCorrente: dataCorrente(partitaId), fatte: azioni.filter((a) => a.fatta).length,
    meteoPartita: partitaId ? meteoDelGiorno(partitaId, data) : null,
    allerte: allerteDelGiorno(data),
  };
}

/**
 * La spunta di una voce e l'eventuale avanzamento della partita, in UN'unica transazione: o succedono tutte e due o nessuna. Prima la rotta
 * leggeva «era già fatta», spuntava e poi faceva avanzare il giorno in passi separati: se l'avanzamento falliva la spunta restava salvata e
 * il giorno non avanzava più (una nuova spunta la trovava «già fatta»). L'avanzamento (decisione A1 del 2026-10-25) è `avanzaSeFasciaCompleta`:
 * dall'ultima attività di giorno alla sera, dall'ultima di sera al giorno dopo, sempre senza decisioni aperte (altrimenti scatta alla chiusura
 * dell'ultima, in `decidiProposte`). Scatta solo alla spunta nuova (togliere una spunta o ripetere quella già data non fa avanzare niente né
 * torna indietro). È l'unica porta di tutte le spunte del Diario, dalla rotta come dalla Guida.
 */
export function spuntaEAvanza(partitaId: number, uid: string, fatta: boolean, opz: OpzioniSpunta = {}): AzionePercorsoDto {
  return getDb().transaction(() => {
    const giaFatta = !!prepared('SELECT 1 FROM spunta_voce_partita WHERE partita_id = ? AND voce_uid = ?').get(partitaId, uid);
    const azione = spuntaVoce(partitaId, uid, fatta, opz);
    const esplicito = fatta && !giaFatta ? avanzaSeFasciaCompleta(partitaId, azione.giorno) : null;
    // una chiusura automatica di una decisione, durante la spunta o la sua riconciliazione, può aver già fatto avanzare la partita (A1): l'esito
    // ricordato dalla richiesta si prende comunque, così non resta nel contesto e la risposta lo porta
    const registrato = prelevaAvanzamentoValido(partitaId);
    const avanzamento = esplicito ?? registrato;
    return avanzamento ? { ...azione, ...avanzamento } : azione;
  })();
}

/** Imposta il giorno corrente della partita (data del calendario di gioco) e restituisce anche la partita aggiornata, così il client allinea lo store senza ricaricare l'elenco. */
export function impostaGiornoCorrente(partitaId: number, data: string): GiornoCorrenteDto {
  // giorno esistente, fascia a «giorno» se il giorno è nuovo (rimarcare lo stesso non la tocca), storico: la regola unica (R10-16)
  cambiaGiornoPartita(partitaId, data);
  return { dataCorrente: data, partita: leggiPartita(partitaId) };
}
