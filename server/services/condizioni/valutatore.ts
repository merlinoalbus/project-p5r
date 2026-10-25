// ============================================================
// valutatore — il solo valutatore delle condizioni (L6 «Condizioni uniche», lotti/L6/modifiche.md §2)
// ============================================================
//
// Un vocabolario (`shared/condizioniSpillo.ts`), un valutatore (qui), e l'interfaccia mostra gli esiti senza rivalutarli. Prima i
// valutatori erano due — `disponibilitaService` per spilli, catalogo e città, `semaforiService.valuta` per i requisiti dei Confidenti —
// e i tipi dei requisiti passavano dall'uno all'altro: ora tutti i tipi stanno in un solo `switch`, chiamato da entrambi.
// Le due letture che restano diverse lo sono per scelta dell'utente, e qui sono dette con `comeRequisito`:
//   - un evento di storia non segnato, in un requisito di rango, è «da segnare» (grigio, si segna dal Confidente); in una condizione
//     del catalogo o di un pin è falso (la cosa non c'è finché l'evento non è avvenuto);
//   - per la disponibilità un Palazzo o una Richiesta che non risultano sono un blocco, non un dubbio.
// Un `avviso` non blocca mai (R6-01b): è grigio con `bloccante: false`, e l'insieme non lo conta.
// Le date senza partita (scegliere l'ingresso di un Palazzo o la regola d'atterraggio di un giorno) passano da `copreIlGiorno`.
// ============================================================

import { prepared } from '../../db/dbService.js';
import { nellaFinestraPalazzo } from './finestrePalazzi.js';
import { t } from '../traduzioniService.js';
import { nomiCondizioniMemo, pinCitato } from './nomiCondizioni.js';
import { condizioneDelLuogo, condizioneEffettivaQuartiere, tuttiGliInviti, type RigaInvito } from './condizioneEffettiva.js';
import { ARCHI_STORIA, CONTATORI, EVENTI_STORIA, RANGHI_CLIENTE, condizioneConTesto, dataLeggibile, descriviRequisitoSpillo, membroDellEvento, nomePalazzo, ordineGioco, proiezioneDiPresenza, type NomiCondizioni, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { guastaLAperto, nomeMeteo, piove } from '../../../shared/meteoPartita.js';
import { nomeDote } from '../../../shared/doti.js';
import { puntoDescrittivo } from '../../../shared/spilli.js';
import { sqlVoceDiCattura } from '../catturePersona.js';
import type { DisponibilitaDto, EsitoCondizione, RequisitoRango, SemaforoRequisitoDto, ValutazioneCondizioneDto } from '../../../shared/types.js';
import type { StatoDisponibilita } from '../disponibilitaService.js';
import type { StatoPartitaSemafori } from '../semaforiService.js';
import { EVENTI_PESCA } from '../../../shared/pesca.js';

/** Lo stato che il valutatore legge: quello dei semafori, con quel che serve alle condizioni del catalogo e dei pin quando c'è (chi valuta
 *  solo requisiti di rango può passare lo stato dei semafori: quel che manca vale «niente», mai un errore). */
export type StatoValutazione = StatoPartitaSemafori & Partial<Omit<StatoDisponibilita, keyof StatoPartitaSemafori>>;

/** Un requisito da valutare: quello di un Confidente (con la sua frase) o una condizione con il testo generato. */
export type RequisitoDisponibilita = RequisitoRango | (RequisitoSpillo & { testo: string });

/** Come leggere la condizione: un requisito di rango di un Confidente (`comeRequisito`) o una condizione di catalogo, pin, posto. */
export interface OpzioniValutazione { nomi?: NomiCondizioni; comeRequisito?: boolean }

/** Stagioni del calendario di gioco per mese (aprile → marzo). */
const STAGIONE_PER_MESE: Record<number, string> = { 4: 'primavera', 5: 'primavera', 6: 'estate', 7: 'estate', 8: 'estate', 9: 'autunno', 10: 'autunno', 11: 'autunno', 12: 'inverno', 1: 'inverno', 2: 'inverno', 3: 'primavera' };

/** Una voce della guida citata da una condizione: il nome e il tipo (una descrittiva non ha stato). */
interface VoceCitata { nome: string; tipo: string; area_dedalo_chiave: string | null; di_cattura: number }

/** `pinCitato` con la memoria dello stato della richiesta, se lo stato ce l'ha. */
function pinCitatoNelloStato(uid: string, st: StatoValutazione): ReturnType<typeof pinCitato> {
  if (!st.pinCitati) return pinCitato(uid);
  if (!st.pinCitati.has(uid)) st.pinCitati.set(uid, pinCitato(uid));
  return st.pinCitati.get(uid)!;
}

/** La voce della guida citata da una condizione, con la memoria dello stato della richiesta se lo stato ce l'ha; null se non c'è. */
function voceCitataNelloStato(chiave: string, st: StatoValutazione): VoceCitata | null {
  /** La voce dal database: nome e tipo, o null. */
  const leggi = () => (prepared(`SELECT p.nome, p.tipo, p.area_dedalo_chiave, ${sqlVoceDiCattura('p')} AS di_cattura FROM punto_interesse p WHERE p.chiave = ?`).get(chiave) as VoceCitata | undefined) ?? null;
  if (!st.vociCitate) return leggi();
  if (!st.vociCitate.has(chiave)) st.vociCitate.set(chiave, leggi());
  return st.vociCitate.get(chiave)!;
}

/** Gli inviti letti una volta per stato (la tabella è piccola, ma un elenco di luoghi la chiederebbe per ognuno). */
function invitiDelloStato(st: StatoValutazione): RigaInvito[] {
  if (!st.inviti) st.inviti = tuttiGliInviti();
  return st.inviti;
}

/** Il nome del negozio, o la chiave se non esiste. */
function nomeNegozio(chiave: string): string {
  return (prepared('SELECT nome FROM negozio WHERE chiave = ?').get(chiave) as { nome: string } | undefined)?.nome ?? chiave;
}
/** Il nome dell'attività, o la chiave se non esiste. */
function nomeAttivita(chiave: string): string {
  return (prepared('SELECT nome FROM attivita WHERE chiave = ?').get(chiave) as { nome: string } | undefined)?.nome ?? chiave;
}
/** Il nome di una Persona o di un'abilità citate per id (le condizioni per chiave, R6-03); null se non è un id che c'è. */
function nomePerId(tabella: 'persona' | 'skill', valore: string): string | null {
  if (!/^\d+$/.test(valore)) return null;
  return (prepared(`SELECT nome FROM ${tabella} WHERE id = ?`).get(Number(valore)) as { nome: string } | undefined)?.nome ?? null;
}

/** L'esito di una condizione di un posto (quartiere o luogo), con la memoria dello stato e la guardia sui cicli (un posto che, per una via,
 *  cita sé stesso è grigio invece di girare per sempre). */
function esitoDelPosto(chiave: string, condizioni: () => RequisitoSpillo[] | null, st: StatoValutazione, nomi: NomiCondizioni): SemaforoRequisitoDto['stato'] | null {
  st.esitiPosti ??= new Map();
  const memo = st.esitiPosti.get(chiave);
  if (memo !== undefined) return memo;
  st.postiInCorso ??= new Set();
  if (st.postiInCorso.has(chiave)) return 'grigio';
  const elenco = condizioni();
  if (elenco === null) return null;
  st.postiInCorso.add(chiave);
  try {
    const esiti = elenco.map((c, i) => valutaCondizione(condizioneConTesto(c, nomi), i, st, { nomi }));
    const contano = esiti.filter((e) => e.bloccante !== false);
    const stato = contano.some((e) => e.stato === 'rosso') ? 'rosso' : contano.some((e) => e.stato === 'grigio') ? 'grigio' : 'verde';
    st.esitiPosti.set(chiave, stato);
    return stato;
  } finally { st.postiInCorso.delete(chiave); }
}

/**
 * Il semaforo di una condizione sullo stato della partita: verde, rosso, o grigio quando alla partita manca il dato (il giorno non
 * impostato, un pin eliminato) o la condizione non si può dire (un avviso: non blocca). `nomi` servono a scrivere il testo delle
 * condizioni dentro un gruppo o un NON (quelle di primo livello arrivano col testo già scritto).
 */
export function valutaCondizione(r: RequisitoDisponibilita, indice: number, st: StatoValutazione, opz: OpzioniValutazione = {}): SemaforoRequisitoDto {
  const base = { indice, testo: r.tipo === 'avviso' ? descriviRequisitoSpillo(r) : r.testo, confermato: false } as const;
  /** Il semaforo con tipo, colore e dettaglio, mai manuale. */
  const esito = (tipo: SemaforoRequisitoDto['tipo'], stato: SemaforoRequisitoDto['stato'], dettaglio: string): SemaforoRequisitoDto => ({ ...base, tipo, stato, dettaglio, manuale: false });
  const nomi = () => opz.nomi ?? nomiCondizioniMemo();
  switch (r.tipo) {
    case 'gruppo': {
      const n = nomi();
      const esiti = r.condizioni.map((c, i) => valutaCondizione(condizioneConTesto(c, n), i, st, { ...opz, nomi: n }));
      // un avviso dentro un gruppo non decide niente (non blocca, R6-01b)
      const contano = esiti.filter((e) => e.bloccante !== false);
      if (esiti.length > 0 && contano.length === 0) return { ...esito('gruppo', 'grigio', esiti.map((e) => e.testo + ': ' + e.dettaglio).join(' · ')), bloccante: false };
      const stato = contano.length === 0 ? 'verde' : r.modo === 'tutte'
        ? (contano.some((e) => e.stato === 'rosso') ? 'rosso' : contano.some((e) => e.stato === 'grigio') ? 'grigio' : 'verde')
        : (contano.some((e) => e.stato === 'verde') ? 'verde' : contano.some((e) => e.stato === 'grigio') ? 'grigio' : 'rosso');
      return esito('gruppo', stato, esiti.map((e) => e.testo + ': ' + e.dettaglio).join(' · '));
    }
    case 'non': {
      const n = nomi();
      const dentro = valutaCondizione(condizioneConTesto(r.condizione, n), indice, st, { ...opz, nomi: n });
      return { ...dentro, ...base, tipo: 'non', stato: dentro.stato === 'verde' ? 'rosso' : dentro.stato === 'rosso' ? 'verde' : 'grigio', dettaglio: 'Non: ' + dentro.dettaglio };
    }
    // — L6 —
    case 'da-subito': return esito('da-subito', 'verde', 'Disponibile dall’inizio');
    case 'avviso':
      // da controllare nel gioco, ma non ferma niente: senza un dato che lo dica, bloccare vorrebbe dire bloccare anche quando è tutto a
      // posto (scelta dell'utente, 2026-09-30; R6-01b)
      // la frase dell'avviso è già il testo del semaforo: il dettaglio dice solo che non ferma niente
      return { ...esito('avviso', 'grigio', opz.comeRequisito ? 'Da controllare nel gioco: non blocca il rango' : 'Da controllare nel gioco: non blocca'), bloccante: false };
    case 'invito': {
      const n = nomi();
      const nome = n.inviti?.[r.invito] ?? `l’invito ${r.invito}`;
      if (!invitiDelloStato(st).some((i) => i.chiave === r.invito)) return esito('invito', 'grigio', `${nome.charAt(0).toUpperCase()}${nome.slice(1)} non c’è più: correggi quel che lo cita`);
      const ok = st.invitiRegistrati?.has(r.invito) ?? false;
      return esito('invito', ok ? 'verde' : 'rosso', ok ? `Avvenuto: ${nome}` : `Non ancora avvenuto: ${nome} (pagina del Confidente → Inviti)`);
    }
    case 'luogo': {
      const n = nomi();
      const nome = n.luoghi?.[r.luogo] ?? r.luogo;
      if (!prepared('SELECT 1 FROM luogo WHERE chiave = ?').get(r.luogo)) return esito('luogo', 'grigio', `Il luogo «${nome}» non c’è più: correggi quel che lo cita`);
      // lo sblocco del luogo (la sua condizione e gli inviti che lo aprono), non i suoi orari e non il quartiere (L5: `presenzaDelLuogo`)
      const stato = esitoDelPosto(`luogo:${r.luogo}`, () => condizioneDelLuogo(r.luogo, invitiDelloStato(st)), st, n) ?? 'verde';
      return esito('luogo', stato, stato === 'verde' ? `${nome}: sbloccato` : stato === 'rosso' ? `${nome}: non ancora sbloccato` : `${nome}: non si sa ancora`);
    }
    case 'quartiere': {
      const n = nomi();
      const q = st.sbloccoQuartieri?.get(r.quartiere);
      const nome = q?.nome ?? r.quartiere;
      // L6 (R6-09): la condizione del quartiere, con gli inviti; un quartiere senza condizione salvata (schema di prima, Memento) segue la
      // data della guida come prima
      const stato = esitoDelPosto(`quartiere:${r.quartiere}`, () => condizioneEffettivaQuartiere(r.quartiere, invitiDelloStato(st)), st, n);
      if (stato !== null) return esito('quartiere', stato, stato === 'verde' ? `${nome}: sbloccato` : stato === 'rosso' ? `${nome}: non ancora sbloccato` : `${nome}: non si sa ancora`);
      if (!q?.dal) return esito('data', 'rosso', `${nome}: la Guida non indica una data di sblocco, quindi lo sblocco non risulta`);
      const esitoData = valutaCondizione({ tipo: 'data', dal: q.dal, testo: r.testo }, indice, st, opz);
      return { ...esitoData, dettaglio: `${nome}: ${esitoData.dettaglio}` };
    }
    // — calendario e mondo —
    case 'data': {
      if (!st.dataGioco) return esito('data', 'rosso', `Disponibile dal ${dataLeggibile(r.dal)}: il giorno corrente della partita non è impostato (Partita → Oggi)`);
      const ok = ordineGioco(st.dataGioco) >= ordineGioco(r.dal);
      return esito('data', ok ? 'verde' : 'rosso', ok ? `Disponibile dal ${dataLeggibile(r.dal)} (oggi ${dataLeggibile(st.dataGioco)})` : `Disponibile dal ${dataLeggibile(r.dal)}, oggi è il ${dataLeggibile(st.dataGioco)}`);
    }
    case 'intervallo': {
      if (!st.dataGioco) return esito('data', 'rosso', 'Il giorno corrente della partita non è impostato: la condizione non risulta soddisfatta (Partita → Oggi)');
      const oggi = ordineGioco(st.dataGioco);
      const dentro = oggi >= ordineGioco(r.dal) && oggi <= ordineGioco(r.al);
      return esito('data', dentro ? 'verde' : 'rosso', r.dal === r.al ? (dentro ? `Solo il ${dataLeggibile(r.dal)}: è oggi` : `Solo il ${dataLeggibile(r.dal)}, oggi è il ${dataLeggibile(st.dataGioco)}`) : dentro ? `Nel periodo dal ${dataLeggibile(r.dal)} al ${dataLeggibile(r.al)} (oggi ${dataLeggibile(st.dataGioco)})` : `Solo dal ${dataLeggibile(r.dal)} al ${dataLeggibile(r.al)}, oggi è il ${dataLeggibile(st.dataGioco)}`);
    }
    case 'finestra-palazzo': {
      if (!st.dataGioco) return esito('data', 'rosso', 'Il giorno corrente della partita non è impostato');
      const aperta = nellaFinestraPalazzo(r.dungeon, st.dataGioco);
      return esito('data', aperta === null ? 'grigio' : aperta ? 'verde' : 'rosso', aperta === null
        ? `Finestra di ${nomePalazzo(r.dungeon)} non disponibile: correggi la scheda del Palazzo`
        : `${nomePalazzo(r.dungeon)}: ${aperta ? 'dentro' : 'fuori'} la finestra del Palazzo`);
    }
    case 'arco': {
      if (!st.arcoCorrente) return esito('arco', 'rosso', 'Il giorno corrente della partita non è impostato: la condizione non risulta soddisfatta (Partita → Oggi)');
      const ok = ARCHI_STORIA.indexOf(st.arcoCorrente as typeof ARCHI_STORIA[number]) >= ARCHI_STORIA.indexOf(r.dungeon as typeof ARCHI_STORIA[number]);
      return esito('arco', ok ? 'verde' : 'rosso', ok ? `Siamo nell'arco del ${nomePalazzo(st.arcoCorrente)}` : `Dall'arco del ${nomePalazzo(r.dungeon)}: siamo ancora in quello del ${nomePalazzo(st.arcoCorrente)}`);
    }
    case 'piove': {
      // il meteo della fascia corrente (segnato nella partita o della guida); senza, non si sa — come «non deve piovere»
      if (!st.meteoOra) return esito('meteo', 'grigio', 'Il meteo di oggi non è segnato: segnalo in Partita → Oggi');
      const come = `${st.fasciaGioco === 'sera' ? 'stasera' : 'oggi'} ${nomeMeteo(st.meteoOra.meteo).toLowerCase()}${st.meteoOra.origine === 'guida' ? ' (dalla guida)' : ''}`;
      const ok = piove(st.meteoOra.meteo);
      return esito('meteo', ok ? 'verde' : 'rosso', ok ? come.charAt(0).toUpperCase() + come.slice(1) : `Solo con la pioggia: ${come}`);
    }
    case 'meteo': {
      if (r.condizione === 'senza-allerta') {
        const nome = nomi().allerte?.[r.allerta];
        if (!nome) return esito('meteo', 'grigio', 'Allerta meteo non presente nel calendario: correggi la condizione.');
        if (!st.dataGioco || !st.fasciaGioco) return esito('meteo', 'grigio', 'Data o momento della giornata non impostati: impossibile verificare l’allerta.');
        const presente = !!prepared('SELECT 1 FROM allerta_meteo WHERE data = ? AND fascia = ? AND chiave = ?').get(st.dataGioco, st.fasciaGioco, r.allerta);
        return esito('meteo', presente ? 'rosso' : 'verde', presente ? `${nome}: non disponibile nella fascia corrente.` : `${nome}: assente nella fascia corrente.`);
      }
      // Senza meteo (né segnato né nella guida) non si sa: da controllare, ma non si blocca per un dato che manca (scelta dell'utente,
      // 2026-09-30). Col meteo, conta quello della fascia in cui si è: «Sereno/Pioggia» di sera è pioggia.
      if (!st.meteoOra) return { ...esito('meteo', 'grigio', 'Il meteo di oggi non è segnato: controllalo nel gioco o segnalo in Partita → Oggi (non blocca)'), bloccante: false };
      const quando = st.fasciaGioco === 'sera' ? 'Stasera' : 'Oggi';
      const come = `${quando} ${nomeMeteo(st.meteoOra.meteo).toLowerCase()}${st.meteoOra.origine === 'guida' ? ' (dalla guida)' : ''}`;
      const guasto = guastaLAperto(st.meteoOra.meteo);
      return esito('meteo', guasto ? 'rosso' : 'verde', guasto ? `${come}: evento all'aperto non disponibile` : come);
    }
    case 'giorno-settimana': {
      if (!st.giornoSettimana) return esito('giorno-settimana', 'rosso', 'Il giorno corrente della partita non è impostato: la condizione non risulta soddisfatta (Partita → Oggi)');
      const ok = r.giorni.includes(st.giornoSettimana);
      return esito('giorno-settimana', ok ? 'verde' : 'rosso', ok ? `Oggi è ${st.giornoSettimana}` : `Solo ${r.giorni.join(', ')}: oggi è ${st.giornoSettimana}`);
    }
    case 'fascia': {
      if (!st.fasciaGioco) return esito('fascia', 'rosso', 'Il momento della giornata non è impostato: la condizione non risulta soddisfatta (Partita → Oggi)');
      const ok = st.fasciaGioco === r.fascia;
      return esito('fascia', ok ? 'verde' : 'rosso', ok ? `Ora è ${st.fasciaGioco}` : `Solo di ${r.fascia}: ora è ${st.fasciaGioco}`);
    }
    case 'stagione': {
      if (!st.dataGioco) return esito('stagione', 'rosso', 'Il giorno corrente della partita non è impostato: la condizione non risulta soddisfatta (Partita → Oggi)');
      const attuale = STAGIONE_PER_MESE[Number(st.dataGioco.slice(0, 2))] ?? '';
      const ok = attuale === r.stagione;
      return esito('stagione', ok ? 'verde' : 'rosso', ok ? `Siamo in ${attuale}` : `Solo in ${r.stagione}: siamo in ${attuale}`);
    }
    // — progressi —
    case 'palazzo': {
      const nome = nomePalazzo(r.dungeon);
      const perche = st.palazziConclusi.get(r.dungeon);
      if (perche) return esito('palazzo', 'verde', `${nome}: concluso (${perche})`);
      // Tesoro e boss finale insieme (2026-10-04, il boss da solo non basta; dal 2026-10-20 la raccolta completa non serve, §8.10): si dice
      // quel che manca. Il boss sconfitto è uno stato che l'app registra: finché non risulta la condizione è falsa (2026-09-13)
      const manca = st.palazziMancanze?.get(r.dungeon) ?? 'il Tesoro del Palazzo raccolto, il boss finale sconfitto';
      return esito('palazzo', 'rosso', `${nome}: non risulta concluso — manca ${manca} (Guida → Palazzi)`);
    }
    case 'dote': {
      const attuale = st.doti.get(r.dote) ?? 1;
      return esito('dote', attuale >= r.rango ? 'verde' : 'rosso', `${nomeDote(r.dote)}: rango ${attuale} di ${r.rango}`);
    }
    case 'confidente': {
      const attuale = st.ranghiConfidenti.get(r.confidente) ?? 0;
      return esito('confidente', attuale >= r.rango ? 'verde' : 'rosso', `${t('confidente', r.confidente)}: rango ${attuale} di ${r.rango}`);
    }
    case 'squadra': {
      // Il protagonista nel gruppo c'è sempre. **Due risposte, non tre** (2026-09-13): un Ladro che non risulta nel gruppo non c'è
      const dentro = r.membro === 'joker' || st.membriSquadra.has(r.membro);
      return dentro ? esito('squadra', 'verde', `${t('confidente', r.membro)} e' in squadra`) : esito('squadra', 'rosso', `${t('confidente', r.membro)} non e' in squadra (Partita → Denaro e squadra)`);
    }
    case 'richiesta': {
      // per chiave (R6-03, B4: niente più nomi; un pacchetto di prima si converte all'ingresso, `migraCondizioni`)
      const chiave = r.richiesta;
      // eliminata (nel cestino) o mai esistita: la condizione resta, grigia (R6-04: «Richiesta eliminata»)
      if (st.nomiRichieste && !st.nomiRichieste.has(chiave)) return esito('richiesta', 'grigio', `Richiesta eliminata («${chiave}»): rimettila dal cestino o correggi quel che la cita`);
      const ok = st.richiesteCompletate.has(chiave);
      const visibile = st.nomiRichieste?.get(chiave) ?? r.richiesta;
      return ok ? esito('richiesta', 'verde', `Richiesta «${visibile}» completata`) : esito('richiesta', 'rosso', `Richiesta «${visibile}» non risulta completata (Guida → Richieste)`);
    }
    case 'sblocco': {
      // L13 (decisioni 1 e 17): lo sblocco lo dà soltanto la spunta di una voce del Diario con l'effetto «sblocco». Il bersaglio deve
      // esistere (altrimenti grigio, da correggere). Finché NESSUNA voce della guida dà questo sblocco la condizione non blocca (grigio,
      // `bloccante: false`): un dato non ancora collegato non chiude un lavoro o una Richiesta nelle partite in corso; collegata la voce,
      // vale per davvero (rosso fino alla spunta, verde dopo; togliendo la spunta torna rosso).
      const tabella = r.bersaglio === 'richiesta' ? 'richiesta' : 'attivita';
      const nome = (prepared(`SELECT nome FROM ${tabella} WHERE chiave = ?`).get(r.chiave) as { nome: string } | undefined)?.nome;
      if (!nome) return esito('sblocco', 'grigio', `${r.bersaglio === 'richiesta' ? 'La Richiesta' : 'L’attività'} «${r.chiave}» non c’è più: correggi quel che la cita`);
      const chiave = `${r.bersaglio}:${r.chiave}`;
      if (st.sblocchiRicevuti?.has(chiave)) return esito('sblocco', 'verde', `${nome}: sbloccata da una voce del Diario`);
      const voce = prepared("SELECT v.data, v.azione FROM voce_effetto e JOIN voce_giornata v ON v.uid = e.voce_uid WHERE e.tipo = 'sblocco' AND e.chiave = ? ORDER BY v.data, v.ordine LIMIT 1").get(chiave) as { data: string; azione: string } | undefined;
      if (!voce) return { ...esito('sblocco', 'grigio', `${nome}: nessuna voce del Diario dà ancora questo sblocco, quindi non blocca`), bloccante: false };
      return esito('sblocco', 'rosso', `${nome}: non ancora sbloccata. Lo sblocca la voce del ${dataLeggibile(voce.data)} «${voce.azione.length > 70 ? `${voce.azione.slice(0, 69)}…` : voce.azione}», spuntandola`);
    }
    case 'evento': {
      const nome = EVENTI_STORIA.find((e) => e.chiave === r.evento)?.nome ?? r.evento;
      if(EVENTI_PESCA.includes(r.evento as typeof EVENTI_PESCA[number])){
        const valore=st.fattiPesca?.get(r.evento)??'ignoto';
        return esito('evento',valore==='ignoto'?'grigio':valore==='avvenuto'?'verde':'rosso',`${nome}: ${valore==='ignoto'?'non attestato per questo momento':valore==='avvenuto'?'avvenuto secondo le fonti temporali':'non ancora avvenuto al limite osservato'}`);
      }
      const membro = membroDellEvento(r.evento);
      if (membro) {
        // «In squadra» è booleano (2026-09-13): chi non è segnato non è in squadra; il rimando alla scheda resta nel dettaglio
        const dentro = st.membriSquadra.has(membro);
        return esito('evento', dentro ? 'verde' : 'rosso', dentro ? `${nome}: in squadra` : `${nome}: non in squadra (Partita → Denaro e squadra)`);
      }
      const ok = st.eventi.has(r.evento);
      // in un requisito di rango l'evento si segna dal Confidente: «da segnare», non un blocco (il «Condizione soddisfatta» lo scrive)
      if (opz.comeRequisito) return { ...base, tipo: 'evento', confermato: ok, stato: ok ? 'verde' : 'grigio', dettaglio: ok ? `${nome}: segnato` : `${nome}: da segnare, qui o in Partita → Progressi`, manuale: true };
      return esito('evento', ok ? 'verde' : 'rosso', ok ? `${nome}: avvenuto` : `${nome}: non ancora segnato (Partita → Progressi)`);
    }
    case 'pesca-sessione': {
      const o=st.contestoPesca;if(!o)return esito('pesca-sessione','grigio','Questa condizione richiede il contesto di una visita di pesca.');
      const v=r.dato==='esca-speciale'?o.escaSpecialePosseduta:r.dato==='tentativo-residuo'?o.rangoPeriziaOsservato===null||o.tentativiConsumati===null?null:o.rangoPeriziaOsservato+2-o.tentativiConsumati>0:o.catture===null?null:o.catture.some(c=>c.specie===(r.dato==='guardiano-catturato'?'guardiano':'boss'));
      return esito('pesca-sessione',v===null?'grigio':v===r.valore?'verde':'rosso',v===null?'Osservazione della visita ignota.':descriviRequisitoSpillo(r));
    }
    case 'contatore': {
      const v = st.contatori?.get(r.cosa) ?? 0;
      const nome = CONTATORI.find((c) => c.chiave === r.cosa)?.nome ?? r.cosa;
      return esito('contatore', v >= r.almeno ? 'verde' : 'rosso', `${nome}: ${v} di ${r.almeno}`);
    }
    case 'lettura': {
      const ok = st.letture?.has(r.categoria + '/' + r.chiave) ?? false;
      return esito('lettura', ok ? 'verde' : 'rosso', ok ? 'Completato nella partita' : 'Ancora da completare (Partita → Letture e giochi)');
    }
    case 'articolo': {
      const ok = st.articoliOttenuti?.has(r.articolo) ?? false;
      return esito('articolo', ok ? 'verde' : 'rosso', ok ? 'Articolo segnato come ottenuto' : 'Segna l’articolo come acquistato/ottenuto nel negozio');
    }
    case 'attivita': {
      const v = st.attivitaSvolte?.get(r.attivita) ?? 0;
      return esito('attivita', v >= r.volte ? 'verde' : 'rosso', `${nomeAttivita(r.attivita)}: svolta ${v} ${v === 1 ? 'volta' : 'volte'} di ${r.volte} (Partita → Progressi)`);
    }
    case 'rango-cliente': {
      const spesa = st.spesaPerNegozio?.get(r.negozio) ?? 0;
      const richiesto = RANGHI_CLIENTE.find((x) => x.chiave === r.rango);
      const attuale = [...RANGHI_CLIENTE].reverse().find((x) => spesa >= x.spesa) ?? RANGHI_CLIENTE[0];
      const ok = !!richiesto && spesa >= richiesto.spesa;
      return esito('rango-cliente', ok ? 'verde' : 'rosso', `${nomeNegozio(r.negozio)}: grado ${attuale.nome} (spesi ¥${spesa.toLocaleString('it-IT')}${richiesto && !ok ? `, servono ¥${richiesto.spesa.toLocaleString('it-IT')}` : ''})`);
    }
    case 'punti-negozio': {
      const v = st.puntiNegozio?.get(r.negozio) ?? 0;
      return esito('punti-negozio', v >= r.punti ? 'verde' : 'rosso', `${nomeNegozio(r.negozio)}: ${v} punti di ${r.punti} (Partita → Progressi)`);
    }
    // — scorta —
    case 'persona-arcano': {
      const ok = st.arcaniInScorta.has(r.arcano);
      return esito('persona-arcano', ok ? 'verde' : 'rosso', ok ? `Persona ${t('arcana', r.arcano)} in scorta` : `Nessuna Persona ${t('arcana', r.arcano)} in scorta`);
    }
    case 'persona-abilita': {
      // per id (R6-03, B4: Persona e abilità per chiave, niente più nomi)
      const persona = nomePerId('persona', r.persona);
      const skill = nomePerId('skill', r.abilita);
      if (persona === null || skill === null) return esito('persona-abilita', 'grigio', `«${persona ?? r.persona}» con «${skill ?? r.abilita}»: Persona o abilità non riconosciute, correggi quel che le cita`);
      const ok = st.personeConAbilitaId?.has(`${r.persona}|${r.abilita}`) ?? false;
      return esito('persona-abilita', ok ? 'verde' : 'rosso', ok ? `${persona} con ${skill} in scorta` : `Nessuna ${persona} con ${skill} in scorta`);
    }
    // — mappe —
    case 'spillo': {
      const p = pinCitatoNelloStato(r.spillo, st);
      // un pin eliminato dopo aver scritto la condizione: non si sa, e lo si dice dove correggerlo
      if (!p) return esito('spillo', 'grigio', 'Il pin di questa condizione non c’è più: correggila nell’editor della mappa');
      // il pin non ha più uno stato (diventato una nota, o scollegato dalla sua voce della guida): la condizione non deve nascondere per sempre
      const parola = p.parola;
      if (parola === null) return esito('spillo', 'grigio', `${p.nome} non ha più uno stato da segnare: correggi la condizione nell’editor della mappa`);
      const segnato = st.spilliSegnati?.has(r.spillo) ?? false;
      return esito('spillo', segnato === r.segnato ? 'verde' : 'rosso', `${p.nome}: ${segnato ? parola : `non ${parola}`}`);
    }
    case 'voce-guida': {
      const v = voceCitataNelloStato(r.voce, st);
      if (!v) return esito('voce-guida', 'grigio', 'La voce della guida di questa condizione non c’è più: correggila nell’editor della mappa');
      // diventata descrittiva («Altro»): non ha più uno stato, quindi la condizione è grigia (da correggere nell'editor), non rossa
      if (puntoDescrittivo(v.tipo, v.area_dedalo_chiave)) return esito('voce-guida', 'grigio', `«${v.nome}» è diventata una voce descrittiva, senza stato: correggi la condizione nell’editor della mappa`);
      const segnata = st.vociSegnate?.has(r.voce) ?? false;
      // una Persona da catturare (dedali e Palazzi) è «segnata» se è catturata, cioè registrata nel compendio della partita (2026-10-12; L8)
      const parola = v.di_cattura === 1 ? (segnata ? 'catturata (nel compendio)' : 'non catturata (non è nel compendio)') : segnata ? 'segnata' : 'non segnata';
      return esito('voce-guida', segnata === r.segnata ? 'verde' : 'rosso', `«${v.nome}»: ${parola}`);
    }
  }
}

/** Disponibilità complessiva: «bloccato» con almeno un rosso, «ignoto» se resta del grigio, «disponibile» altrimenti (anche senza
 *  requisiti). Un avviso non conta (R6-01b). */
export function valutaInsieme(elenco: RequisitoDisponibilita[], st: StatoValutazione, opz: OpzioniValutazione = {}): DisponibilitaDto {
  const requisiti = elenco.map((r, i) => valutaCondizione(r, i, st, opz));
  const contano = requisiti.filter((q) => q.bloccante !== false);
  const stato = contano.some((q) => q.stato === 'rosso') ? 'bloccato' : contano.some((q) => q.stato === 'grigio') ? 'ignoto' : 'disponibile';
  return { stato, requisiti };
}

/** Come sopra, per uno spillo: **solo la presenza nasconde** (la proiezione di presenza di ogni requisito, `proiezioneDiPresenza`); il resto
 *  concorre al più a un «ignoto». */
export function valutaInsiemeSpillo(elenco: RequisitoDisponibilita[], st: StatoValutazione, nomi?: NomiCondizioni): DisponibilitaDto {
  const requisiti = elenco.map((r, i) => valutaCondizione(r, i, st, { nomi }));
  const presenzaRossa = elenco.some((r, i) => {
    const presenza = proiezioneDiPresenza(r as unknown as { tipo: string }) as RequisitoDisponibilita | null;
    return presenza !== null && valutaCondizione({ ...presenza, testo: r.testo }, i, st, { nomi }).stato === 'rosso';
  });
  const stato = presenzaRossa ? 'bloccato'
    : requisiti.some((q) => q.bloccante !== false && q.stato !== 'verde') ? 'ignoto' : 'disponibile';
  return { stato, requisiti };
}

/** L'esito per l'interfaccia (R6-02: il client mostra, non valuta). */
export function esitoDi(s: SemaforoRequisitoDto): EsitoCondizione {
  if (s.bloccante === false) return 'avviso';
  return s.stato === 'verde' ? 'vero' : s.stato === 'rosso' ? 'falso' : 'grigio';
}

/**
 * Che cosa manca perché una condizione sia vera, in italiano: in un `tutte` le parti che mancano (unite da «e»), in un `almeno-una` le
 * vie possibili (unite da «oppure»); null se la condizione è già vera o se non si può dire.
 */
export function cosaManca(c: RequisitoSpillo, st: StatoValutazione, nomi: NomiCondizioni = nomiCondizioniMemo()): string | null {
  const s = valutaCondizione(condizioneConTesto(c, nomi), 0, st, { nomi });
  if (s.stato !== 'rosso') return null;
  if (c.tipo === 'gruppo') {
    if (c.modo === 'almeno-una') return c.condizioni.filter((f) => valutaCondizione(condizioneConTesto(f, nomi), 0, st, { nomi }).bloccante !== false).map((f) => descriviRequisitoSpillo(f, nomi)).join(' oppure ');
    return c.condizioni.map((f) => cosaManca(f, st, nomi)).filter((x): x is string => !!x).join(' e ') || null;
  }
  return descriviRequisitoSpillo(c, nomi);
}

/** La valutazione di una condizione per l'interfaccia: esito, testo e cosa manca. */
export function valutazione(c: RequisitoSpillo, st: StatoValutazione, nomi: NomiCondizioni = nomiCondizioniMemo()): ValutazioneCondizioneDto {
  const testo = descriviRequisitoSpillo(c, nomi);
  const s = valutaCondizione(condizioneConTesto(c, nomi), 0, st, { nomi });
  const e = esitoDi(s);
  const manca = e === 'falso' ? cosaManca(c, st, nomi) : null;
  return { esito: e, testo, ...(manca ? { manca } : {}) };
}

/**
 * Le condizioni di data reggono quel giorno? Senza partita: per scegliere, fra più ingressi o più regole d'atterraggio, quella del giorno.
 * Date, intervalli e finestre contano a ogni profondità; le altre foglie restano indeterminate. Non sostituisce l'accessibilità della mappa.
 */
export function copreIlGiorno(condizioni: readonly RequisitoSpillo[], giorno: string): boolean {
  const oggi = ordineGioco(giorno);
  // undefined = avviso non operando; null = condizione non temporale, dunque indeterminata.
  const valuta = (c: RequisitoSpillo): boolean | null | undefined => {
    if (c.tipo === 'avviso') return undefined;
    if (c.tipo === 'da-subito') return true;
    if (c.tipo === 'data') return oggi >= ordineGioco(c.dal);
    if (c.tipo === 'intervallo') return oggi >= ordineGioco(c.dal) && oggi <= ordineGioco(c.al);
    if (c.tipo === 'finestra-palazzo') return nellaFinestraPalazzo(c.dungeon, giorno);
    if (c.tipo === 'non') { const v = valuta(c.condizione); return typeof v === 'boolean' ? !v : v; }
    if (c.tipo !== 'gruppo') return null;
    const esiti = c.condizioni.map(valuta).filter((v) => v !== undefined);
    if (!esiti.length) return c.condizioni.length ? undefined : true;
    if (c.modo === 'tutte') return esiti.includes(false) ? false : esiti.includes(null) ? null : true;
    return esiti.includes(true) ? true : esiti.includes(null) ? null : false;
  };
  return condizioni.every((c) => valuta(c) !== false);
}
