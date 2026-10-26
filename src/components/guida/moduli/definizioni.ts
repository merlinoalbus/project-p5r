// ============================================================
// definizioni — con quali valori parte ogni modulo, quando è salvabile, che cosa manda all'API (funzioni pure, provate senza interfaccia)
// ============================================================

import { ORARI_SEMPRE, normalizzaOrari } from '../../../../shared/orariNegozio';
import { normalizzaRequisitoSpillo } from '../../../../shared/condizioniSpillo';
import { normalizzaVociEffetto, type VoceEffetto } from '../../../../shared/effettiCatalogo';
import { descriviEffetto, type EffettoOggetto } from '../../../../shared/effettiOggetto';
import { tracciamentoPerTipo } from '../../../../shared/attivita';
import { campiAutonomiAttivitaConfidente } from '../../../../shared/attivitaConfidente';
import { campiAutonomiAttivitaPesca } from '../../../../shared/attivitaPesca';
import { leggiGiorniQuiz, normalizzaQuiz, type QuizAttivita } from '../../../../shared/quizAttivita';
import { normalizzaCostoScambio } from '../../../../shared/catalogo';
import { normalizzaEsitiAttivita } from '../../../../shared/esitiAttivita';
import { normalizzaRifornimento, type RegolaRifornimento } from '../../../../shared/rifornimento';
import type { TipoCatalogo } from '../../../types';
import { jsonDi, jsonSenzaPerdite, numeroDi, senzaTemporanei, testoDi, testoOnull, verificatoDi, type Dati, type DefinizioneModulo } from './base';

export interface ProgrammaPunti { nome: string; unita: string; calcolo: 'manuale' | 'rango-cliente' }
/** Un piatto del menu di un luogo (L5, R5-07). */
export interface PiattoLuogo { nome: string; prezzo: number | null; effetto: string }
export interface Risposta { ordine: number; testo: string; domanda?: string }

export const negozio: DefinizioneModulo = {
  conCondizioni: false,
  conVerificato: false,
  iniziali: (e) => ({
    sblocco_json: jsonDi(e?.dati.sblocco_json, []),
    nome: testoDi(e?.dati.nome), tipo: testoDi(e?.dati.tipo) || 'altro',
    sede_chiave: (e?.dati.sede_chiave as string | null) ?? null, luogo_chiave: (e?.dati.luogo_chiave as string | null) ?? null,
    luogo: testoDi(e?.dati.luogo), gestore: testoDi(e?.dati.gestore), confidente_chiave: (e?.dati.confidente_chiave as string | null) ?? null,
    // L5 (R5-12b): gli orari sono del luogo; il negozio ha solo la sua eccezione (null = valgono quelli della sede)
    eccezione_orari_json: e?.dati.eccezione_orari_json ? normalizzaOrari(jsonDi(e.dati.eccezione_orari_json, ORARI_SEMPRE)) : null,
    programma_punti_json: jsonDi<ProgrammaPunti | null>(e?.dati.programma_punti_json, null),
    note: testoDi(e?.dati.note),
  }),
  valido: (d) => {
    const p = d.programma_punti_json as ProgrammaPunti | null;
    const condizioni = d.sblocco_json;
    return Array.isArray(condizioni) && condizioni.every((c) => normalizzaRequisitoSpillo(c) !== null)
      && testoDi(d.nome).trim().length > 0 && (p === null || (p.nome.trim().length > 0 && p.unita.trim().length > 0));
  },
  prepara: (d) => {
    const p = d.programma_punti_json as ProgrammaPunti | null;
    return {
      ...senzaTemporanei(d),
      nome: testoDi(d.nome).trim(), luogo: testoDi(d.luogo).trim(), gestore: testoOnull(d.gestore), note: testoOnull(d.note),
      programma_punti_json: p ? { nome: p.nome.trim(), unita: p.unita.trim(), calcolo: p.calcolo } : null,
    };
  },
};

export const articolo: DefinizioneModulo = {
  conCondizioni: true,
  conVerificato: true,
  iniziali: (e, negozioChiave) => ({
    negozio_chiave: testoDi(e?.dati.negozio_chiave) || negozioChiave || '',
    nome: testoDi(e?.dati.nome), categoria: testoDi(e?.dati.categoria) || 'altro',
    prezzo: numeroDi(e?.dati.prezzo), quantita: numeroDi(e?.dati.quantita), per: (e?.dati.per as string | null) ?? null,
    // Ondata 5 (decisione 21): la regola di rifornimento (null = nessuna regola); `quantita` sono i pezzi per ciclo. Si rimanda solo se
    // modificata (`_rifornimentoModificato`): una regola salvata che il modulo non sa leggere (`_rifornimentoNonLeggibile`) non si
    // cancella salvando un altro campo, come il costo dello scambio
    rifornimento_json: normalizzaRifornimento(e?.dati.rifornimento_json ?? null),
    _rifornimentoNonLeggibile: e?.dati.rifornimento_json != null && normalizzaRifornimento(e.dati.rifornimento_json) === null, _rifornimentoModificato: false,
    oggetto_fonte: (e?.dati.oggetto_fonte as string | null) ?? null, oggetto_chiave: (e?.dati.oggetto_chiave as string | null) ?? null,
    catalogo_chiave: (e?.dati.catalogo_chiave as string | null) ?? null,
    costo_json: e?.dati.costo_json ?? null,
    _costoIniziale: e?.dati.costo_json ?? null, _costoModificato: false,
    _tipoCosto: e?.dati.costo_json == null ? 'yen' : normalizzaCostoScambio(e.dati.costo_json)?.tipo ?? 'non-leggibile',
    effetto_json: jsonDi<EffettoOggetto | null>(e?.dati.effetto_json, null), statistiche: testoDi(e?.dati.statistiche), nota: testoDi(e?.dati.nota),
    verificato: verificatoDi(e),
    // Il nome storico resta solo per le offerte esistenti non collegate: non si copia dal catalogo.
    _esistente: !!e, _aMano: !!e && !e.dati.catalogo_chiave,
    _catalogoIniziale: (e?.dati.catalogo_chiave as string | null) ?? null,
  }),
  // Un collegamento non disponibile resta salvabile senza modificarlo; una nuova offerta sceglie un'identità.
  valido: (d) => (!!testoDi(d.catalogo_chiave).trim() || (d._esistente === true && d._aMano === true && testoDi(d.nome).trim().length > 0))
    && (d._costoModificato !== true || d.costo_json == null || normalizzaCostoScambio(d.costo_json) !== null)
    && (d._rifornimentoModificato !== true || d.rifornimento_json == null || normalizzaRifornimento(d.rifornimento_json) !== null),
  prepara: (d) => {
    const chiave = testoOnull(d.catalogo_chiave);
    const corpo: Dati = { negozio_chiave: d.negozio_chiave, quantita: numeroDi(d.quantita), nota: testoOnull(d.nota), verificato: d.verificato };
    if (d._rifornimentoModificato === true) corpo.rifornimento_json = (d.rifornimento_json as RegolaRifornimento | null) ?? null;
    if (d.costo_json == null) corpo.prezzo = numeroDi(d.prezzo);
    if (d._costoModificato === true) {
      const costo = normalizzaCostoScambio(d.costo_json);
      if (d.costo_json != null && !costo) throw new Error('Completa il costo dello scambio prima di salvare.');
      corpo.costo_json = costo;
      if (costo) corpo.prezzo = null;
    }
    // Non rispedire un legame immutato evita di rifiutare la correzione della nota se l'oggetto è stato nascosto.
    if (chiave !== d._catalogoIniziale) corpo.catalogo_chiave = chiave;
    if (!chiave) {
      const effetto = (d.effetto_json as EffettoOggetto | null) ?? null;
      Object.assign(corpo, { nome: testoDi(d.nome).trim(), categoria: d.categoria, per: testoOnull(d.per),
        oggetto_fonte: d.oggetto_fonte ?? null, oggetto_chiave: d.oggetto_chiave ?? null,
        effetto_json: effetto, effetto: effetto ? descriviEffetto(effetto) : null, statistiche: testoOnull(d.statistiche) });
    }
    return corpo;
  },
};

export const libro: DefinizioneModulo = {
  conCondizioni: true,
  conVerificato: true,
  iniziali: (e) => ({
    nome: testoDi(e?.dati.nome), prezzo: numeroDi(e?.dati.prezzo), sessioni: numeroDi(e?.dati.sessioni) ?? 1, dettagli: testoDi(e?.dati.dettagli),
    effetti_json: normalizzaVociEffetto(jsonDi(e?.dati.effetti_json, [])), verificato: verificatoDi(e),
  }),
  valido: (d) => testoDi(d.nome).trim().length > 0 && (numeroDi(d.sessioni) ?? 1) >= 1,
  prepara: (d) => ({ ...senzaTemporanei(d), nome: testoDi(d.nome).trim(), prezzo: numeroDi(d.prezzo), sessioni: numeroDi(d.sessioni) ?? 1, dettagli: testoOnull(d.dettagli) }),
};

export const film: DefinizioneModulo = {
  conCondizioni: true,
  conVerificato: true,
  iniziali: (e) => {
    const dove = testoDi(e?.dati.dove) === 'dvd' ? 'dvd' : 'cinema';
    return {
      nome: testoDi(e?.dati.nome), dove, prezzo: numeroDi(e?.dati.prezzo), sessioni: dove === 'cinema' ? 1 : (numeroDi(e?.dati.sessioni) ?? 2), dettagli: testoDi(e?.dati.dettagli),
      effetti_json: normalizzaVociEffetto(jsonDi(e?.dati.effetti_json, [])), verificato: verificatoDi(e),
    };
  },
  valido: (d) => testoDi(d.nome).trim().length > 0 && (d.dove === 'cinema' || (numeroDi(d.sessioni) ?? 0) >= 1),
  prepara: (d) => {
    // Le visioni ripetute valgono solo al cinema; al cinema la visione è una.
    const voci = (d.effetti_json as VoceEffetto[]).map((v) => (d.dove === 'cinema' ? v : { ...v, ripetuto: undefined }));
    return { ...senzaTemporanei(d), nome: testoDi(d.nome).trim(), prezzo: numeroDi(d.prezzo), sessioni: d.dove === 'cinema' ? 1 : numeroDi(d.sessioni), dettagli: testoOnull(d.dettagli), effetti_json: voci };
  },
};

/**
 * La definizione del modulo delle attività; con `tipoFisso` = 'videogioco' il tipo resta fissato (segnato nel campo
 * temporaneo `_tipoFisso`), le sessioni partono da 1 e devono essere almeno 1, e il conteggio salvato è per sessioni.
 * Paga e paga massima si salvano solo per i lavori; il conteggio mancante si deduce dal tipo. La guida del quiz (105) si
 * modifica con i giorni scritti a mano (campo temporaneo `_giorniQuiz`): salvabile solo se sono giorni del mese.
 */
function attivitaCon(tipoFisso?: 'videogioco'): DefinizioneModulo {
  return {
    conCondizioni: true,
    conVerificato: true,
    iniziali: (e) => {
      const tipo = tipoFisso ?? (testoDi(e?.dati.tipo) || 'altro');
      const quiz = normalizzaQuiz(jsonDi<unknown>(e?.dati.quiz_json, null));
      return {
        nome: testoDi(e?.dati.nome), tipo, fascia: e ? testoOnull(e.dati.fascia) : 'entrambe',
        confidente_chiave: testoOnull(e?.dati.confidente_chiave),
        _confidenteIniziale: testoOnull(e?.dati.confidente_chiave),
        _fonteConfidente: e?.dati._fonteConfidente ?? null,
        pesca_regola_chiave: e?.dati.pesca_regola_chiave ?? null,
        pesca_ruolo: e?.dati.pesca_ruolo ?? null,
        _fontePesca: e?.dati._fontePesca ?? null,
        _dotiStoriche: e?.dati.doti_json ?? [],
        _effettiRaw: e?.dati.effetti_json ?? null, _quizRaw: e?.dati.quiz_json ?? null,
        _effettiDaRisolvere: !jsonSenzaPerdite(e?.dati.effetti_json, normalizzaVociEffetto),
        _quizDaRisolvere: !jsonSenzaPerdite(e?.dati.quiz_json, normalizzaQuiz),
        // L13: gli esiti scelti alla spunta; un valore salvato che l'editor non sa leggere resta com'è finché non lo si sostituisce
        esiti_json: normalizzaEsitiAttivita(jsonDi<unknown>(e?.dati.esiti_json, null)),
        _esitiRaw: e?.dati.esiti_json ?? null,
        _esitiDaRisolvere: e?.dati.esiti_json != null && normalizzaEsitiAttivita(jsonDi<unknown>(e.dati.esiti_json, null)) === null,

        sede_chiave: (e?.dati.sede_chiave as string | null) ?? null, luogo_chiave: (e?.dati.luogo_chiave as string | null) ?? null,
        costo: numeroDi(e?.dati.costo), paga_yen: numeroDi(e?.dati.paga_yen), paga_massima: numeroDi(e?.dati.paga_massima),
        sessioni: numeroDi(e?.dati.sessioni) ?? (tipo === 'videogioco' ? 1 : null),
        tracciamento: testoDi(e?.dati.tracciamento) || tracciamentoPerTipo(tipo),
        dettagli: testoDi(e?.dati.dettagli), effetti_json: normalizzaVociEffetto(jsonDi(e?.dati.effetti_json, [])),
        // la guida del quiz (105) e i suoi giorni come testo da scrivere a mano («7, 17, 27»)
        quiz_json: quiz, _giorniQuiz: quiz ? quiz.giorni.join(', ') : '',
        verificato: verificatoDi(e), _tipoFisso: tipoFisso ?? null,
      };
    },
    // con la guida del quiz i giorni devono essere giorni del mese
    valido: (d) => testoDi(d.nome).trim().length > 0 && (d.tipo !== 'videogioco' || (numeroDi(d.sessioni) ?? 0) >= 1)
      && !d._effettiDaRisolvere && !d._quizDaRisolvere && !d._esitiDaRisolvere
      && (d.esiti_json == null || normalizzaEsitiAttivita(d.esiti_json) !== null)
      && (!d.quiz_json || leggiGiorniQuiz(testoDi(d._giorniQuiz)) !== null)
      && (!testoOnull(d.pesca_regola_chiave) ? !testoOnull(d.pesca_ruolo) : (d.tipo !== 'videogioco' && !testoOnull(d.confidente_chiave) && (d.pesca_ruolo === 'visita' || d.pesca_ruolo === 'obiettivi')
        && campiAutonomiAttivitaPesca({ ...d, fascia: testoOnull(d.fascia), doti_json: d.doti_json ?? d._dotiStoriche }).length === 0))
      && (!testoOnull(d.confidente_chiave) || campiAutonomiAttivitaConfidente({ ...d, fascia: testoOnull(d.fascia), doti_json: d.doti_json ?? d._dotiStoriche },
        !!d._confidenteIniziale && d.confidente_chiave === d._confidenteIniziale).length === 0),
    prepara: (d) => {
      const quiz = d.quiz_json as QuizAttivita | null;
      return {
        ...senzaTemporanei(d), nome: testoDi(d.nome).trim(), costo: numeroDi(d.costo), sessioni: numeroDi(d.sessioni), dettagli: testoOnull(d.dettagli),
        confidente_chiave: testoOnull(d.confidente_chiave), fascia: testoOnull(d.fascia),
        pesca_regola_chiave: testoOnull(d.pesca_regola_chiave), pesca_ruolo: testoOnull(d.pesca_ruolo),
        paga_yen: d.tipo === 'lavoro' ? numeroDi(d.paga_yen) : null, paga_massima: d.tipo === 'lavoro' ? numeroDi(d.paga_massima) : null,
        tracciamento: d.tipo === 'videogioco' ? 'sessioni' : testoDi(d.tracciamento) || tracciamentoPerTipo(testoDi(d.tipo)),
        // righe vuote e spazi li toglie il server (normalizzaQuiz); un quiz senza domanda né elementi vale «nessun quiz»
        quiz_json: quiz ? { ...quiz, giorni: leggiGiorniQuiz(testoDi(d._giorniQuiz)) ?? [] } : null,
      };
    },
  };
}
export const attivita = attivitaCon();
export const videogioco = attivitaCon('videogioco');

export const luogo: DefinizioneModulo = {
  conCondizioni: true,
  conVerificato: true,
  iniziali: (e) => ({
    nome: testoDi(e?.dati.nome), tipo: testoDi(e?.dati.tipo) || 'altro', quartiere_chiave: testoDi(e?.dati.quartiere_chiave),
    cosa_offre: testoDi(e?.dati.cosa_offre), note: testoDi(e?.dati.note),
    verificato: verificatoDi(e),
    // ---- L5 (R5-07): un modulo solo per tutto il luogo ----
    // gli orari del luogo; null = la guida non li dà (regola dell'app, «giorno e sera»)
    orari_json: e?.dati.orari_json ? normalizzaOrari(jsonDi(e.dati.orari_json, ORARI_SEMPRE)) : null,
    area_chiave: (e?.dati.area_chiave as string | null) ?? null,
    confidenti_json: (jsonDi<unknown>(e?.dati.confidenti_json, []) as unknown[]).filter((c): c is string => typeof c === 'string'),
    piatti_json: jsonDi<PiattoLuogo[] | null>(e?.dati.piatti_json, null),
  }),
  valido: (d) => testoDi(d.nome).trim().length > 0 && testoDi(d.quartiere_chiave).length > 0 && ((d.piatti_json as PiattoLuogo[] | null) ?? []).every((p) => p.nome.trim().length > 0),
  prepara: (d) => {
    const piatti = (d.piatti_json as PiattoLuogo[] | null) ?? null;
    return {
      ...senzaTemporanei(d), nome: testoDi(d.nome).trim(), cosa_offre: testoDi(d.cosa_offre).trim(), note: testoOnull(d.note),
      confidenti_json: Array.isArray(d.confidenti_json) ? d.confidenti_json : [],
      piatti_json: piatti && piatti.length > 0 ? piatti.map((p) => ({ nome: p.nome.trim(), prezzo: p.prezzo, effetto: p.effetto.trim() })) : null,
    };
  },
};

/** `nullable`: vuoto = null (lo schema lo ammette); altrimenti vuoto = '' (lo schema vuole una stringa, come `ricompensa` e `note` della domanda). */
export interface CampoGenerico { nome: string; etichetta: string; tipo: 'testo' | 'testolungo'; opzioni?: Record<string, string>; aiuto?: string; obbligatorio?: boolean; nullable?: boolean; /** L'etichetta della scelta vuota: il campo a opzioni parte vuoto invece che dalla prima voce. */ vuoto?: string }

/** I campi di domande e cruciverba, nell'ordine. La risposta non è qui: sta in «Risposte giuste», l'editor a righe. */
export const CAMPI_GENERICI: Record<Extract<TipoCatalogo, 'domanda' | 'cruciverba'>, CampoGenerico[]> = {
  domanda: [
    { nome: 'data', etichetta: 'Giorno', tipo: 'testo', aiuto: 'Nel formato del calendario di gioco, mese-giorno: «04-12»', obbligatorio: true },
    { nome: 'tipo', etichetta: 'Quando', tipo: 'testo', opzioni: { classe: 'Domanda in classe', 'esame-medio': 'Esame di metà semestre', 'esame-finale': 'Esame finale', tv: 'Quiz in TV', altro: 'Altro' } },
    { nome: 'chi', etichetta: 'Chi la fa', tipo: 'testo', vuoto: 'Non indicato', opzioni: { 'Prof. Ushimaru': 'Prof. Ushimaru', 'Prof. Kawakami': 'Prof. Kawakami', 'Prof. Hiruta': 'Prof. Hiruta', 'Prof. Inui': 'Prof. Inui', 'Prof. Chuono': 'Prof. Chuono', 'Prof. Maruki': 'Prof. Maruki', 'Prof. Usami': 'Prof. Usami', 'Game show in TV': 'Game show in TV' } },
    { nome: 'domanda', etichetta: 'Domanda', tipo: 'testolungo', obbligatorio: true },
    { nome: 'ricompensa', etichetta: 'Che cosa dà', tipo: 'testo', aiuto: 'Per esempio: Conoscenza ♪' },
    { nome: 'note', etichetta: 'Note', tipo: 'testolungo' },
  ],
  cruciverba: [
    { nome: 'data', etichetta: 'Giorno', tipo: 'testo', aiuto: 'Nel formato del calendario di gioco, mese-giorno: «04-18»', obbligatorio: true },
    { nome: 'indizio', etichetta: 'Indizio', tipo: 'testolungo', obbligatorio: true },
    { nome: 'risposta', etichetta: 'Risposta', tipo: 'testo', obbligatorio: true },
    { nome: 'risposta_en', etichetta: 'Risposta in inglese', tipo: 'testo', aiuto: 'Solo se ti serve: è la parola con cui la risolve chi gioca in inglese', nullable: true },
  ],
};

/**
 * La definizione del modulo di domande e cruciverba, costruita da `CAMPI_GENERICI`: senza condizioni né «Confermato».
 * All'inizio un campo a opzioni senza voce vuota parte dalla prima opzione; è valido se gli obbligatori sono pieni; al
 * salvataggio i testi si ripuliscono (vuoto = null o '' secondo il campo) e per una domanda le risposte vuote cadono, le altre rinumerate da 1.
 */
function generico(tipo: 'domanda' | 'cruciverba'): DefinizioneModulo {
  const campi = CAMPI_GENERICI[tipo];
  return {
    conCondizioni: false,
    conVerificato: false,
    iniziali: (e) => {
      const d: Dati = {};
      for (const c of campi) d[c.nome] = testoDi(e?.dati[c.nome]) || (c.opzioni && !c.vuoto ? Object.keys(c.opzioni)[0] : '');
      if (tipo === 'domanda') d.risposte_json = jsonDi<Risposta[]>(e?.dati.risposte_json, []);
      return d;
    },
    valido: (d) => campi.every((c) => !c.obbligatorio || testoDi(d[c.nome]).trim().length > 0),
    prepara: (d) => {
      const out = senzaTemporanei(d);
      for (const c of campi) {
        const t = testoDi(d[c.nome]).trim();
        out[c.nome] = t || (c.nullable ? null : '');
      }
      if (tipo === 'domanda') out.risposte_json = (d.risposte_json as Risposta[]).map((r) => ({ ...r, testo: r.testo.trim() })).filter((r) => r.testo).map((r, i) => ({ ordine: i + 1, testo: r.testo, ...(r.domanda ? { domanda: r.domanda } : {}) }));
      return out;
    },
  };
}
export const domanda = generico('domanda');
export const cruciverba = generico('cruciverba');
