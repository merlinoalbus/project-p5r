// ============================================================
// definizioni — con quali valori parte ogni modulo, quando è salvabile, che cosa manda all'API (funzioni pure, provate senza interfaccia)
// ============================================================

import { ORARI_SEMPRE, normalizzaOrari } from '../../../../shared/orariNegozio';
import { normalizzaVociEffetto, type VoceEffetto } from '../../../../shared/effettiCatalogo';
import { descriviEffetto, type EffettoOggetto } from '../../../../shared/effettiOggetto';
import { tracciamentoPerTipo } from '../../../../shared/attivita';
import type { OggettoSelezionabileDto, TipoCatalogo } from '../../../types';
import { jsonDi, numeroDi, senzaTemporanei, testoDi, testoOnull, verificatoDi, type Dati, type DefinizioneModulo } from './base';

export interface ProgrammaPunti { nome: string; unita: string; calcolo: 'manuale' | 'rango-cliente' }
export interface Risposta { ordine: number; testo: string; domanda?: string }

export const negozio: DefinizioneModulo = {
  conCondizioni: false,
  conVerificato: false,
  iniziali: (e) => ({
    nome: testoDi(e?.dati.nome), tipo: testoDi(e?.dati.tipo) || 'altro',
    sede_chiave: (e?.dati.sede_chiave as string | null) ?? null, luogo_chiave: (e?.dati.luogo_chiave as string | null) ?? null,
    luogo: testoDi(e?.dati.luogo), gestore: testoDi(e?.dati.gestore), confidente_chiave: (e?.dati.confidente_chiave as string | null) ?? null,
    orari_json: normalizzaOrari(jsonDi(e?.dati.orari_json, ORARI_SEMPRE)),
    programma_punti_json: jsonDi<ProgrammaPunti | null>(e?.dati.programma_punti_json, null),
    note: testoDi(e?.dati.note),
  }),
  valido: (d) => {
    const p = d.programma_punti_json as ProgrammaPunti | null;
    return testoDi(d.nome).trim().length > 0 && (p === null || (p.nome.trim().length > 0 && p.unita.trim().length > 0));
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
    oggetto_fonte: (e?.dati.oggetto_fonte as string | null) ?? null, oggetto_chiave: (e?.dati.oggetto_chiave as string | null) ?? null,
    effetto_json: jsonDi<EffettoOggetto | null>(e?.dati.effetto_json, null), statistiche: testoDi(e?.dati.statistiche), nota: testoDi(e?.dati.nota),
    verificato: verificatoDi(e),
    // Una riga esistente senza collegamento è «a mano» fin dall'apertura; una nuova aspetta la scelta.
    _collegato: null, _aMano: !!e && !e.dati.oggetto_fonte,
  }),
  // Salvabile con un oggetto collegato, con un legame salvato che l'archivio non ha più (si conserva,
  // non si scollega in silenzio), o a mano con un nome.
  valido: (d) => (d._collegato !== null && d._collegato !== undefined) || (d._aMano !== true && !!d.oggetto_fonte && !!d.oggetto_chiave) || (d._aMano === true && testoDi(d.nome).trim().length > 0),
  prepara: (d) => {
    const collegato = (d._collegato as OggettoSelezionabileDto | null) ?? null;
    const legame = collegato ? { fonte: collegato.fonte, chiave: collegato.chiave } : (d._aMano !== true && d.oggetto_fonte && d.oggetto_chiave ? { fonte: d.oggetto_fonte, chiave: d.oggetto_chiave } : null);
    const effetto = legame ? null : ((d.effetto_json as EffettoOggetto | null) ?? null);
    return {
      ...senzaTemporanei(d), nome: testoDi(d.nome).trim(), prezzo: numeroDi(d.prezzo), quantita: numeroDi(d.quantita), per: testoOnull(d.per), nota: testoOnull(d.nota),
      oggetto_fonte: legame?.fonte ?? null, oggetto_chiave: legame?.chiave ?? null,
      // La dichiarazione e la frase che ne discende, così la ricerca per testo la trova.
      effetto_json: effetto, effetto: effetto ? descriviEffetto(effetto) : null, statistiche: legame ? null : testoOnull(d.statistiche),
    };
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

function attivitaCon(tipoFisso?: 'videogioco'): DefinizioneModulo {
  return {
    conCondizioni: true,
    conVerificato: true,
    iniziali: (e) => {
      const tipo = tipoFisso ?? (testoDi(e?.dati.tipo) || 'altro');
      return {
        nome: testoDi(e?.dati.nome), tipo, fascia: testoDi(e?.dati.fascia) || 'entrambe',
        sede_chiave: (e?.dati.sede_chiave as string | null) ?? null, luogo_chiave: (e?.dati.luogo_chiave as string | null) ?? null,
        costo: numeroDi(e?.dati.costo), paga_yen: numeroDi(e?.dati.paga_yen), paga_massima: numeroDi(e?.dati.paga_massima),
        sessioni: numeroDi(e?.dati.sessioni) ?? (tipo === 'videogioco' ? 1 : null),
        tracciamento: testoDi(e?.dati.tracciamento) || tracciamentoPerTipo(tipo),
        dettagli: testoDi(e?.dati.dettagli), effetti_json: normalizzaVociEffetto(jsonDi(e?.dati.effetti_json, [])),
        verificato: verificatoDi(e), _tipoFisso: tipoFisso ?? null,
      };
    },
    valido: (d) => testoDi(d.nome).trim().length > 0 && (d.tipo !== 'videogioco' || (numeroDi(d.sessioni) ?? 0) >= 1),
    prepara: (d) => ({
      ...senzaTemporanei(d), nome: testoDi(d.nome).trim(), costo: numeroDi(d.costo), sessioni: numeroDi(d.sessioni), dettagli: testoOnull(d.dettagli),
      paga_yen: d.tipo === 'lavoro' ? numeroDi(d.paga_yen) : null, paga_massima: d.tipo === 'lavoro' ? numeroDi(d.paga_massima) : null,
      tracciamento: d.tipo === 'videogioco' ? 'sessioni' : testoDi(d.tracciamento) || tracciamentoPerTipo(testoDi(d.tipo)),
    }),
  };
}
export const attivita = attivitaCon();
export const videogioco = attivitaCon('videogioco');

export const luogo: DefinizioneModulo = {
  conCondizioni: true,
  conVerificato: true,
  iniziali: (e) => ({
    nome: testoDi(e?.dati.nome), tipo: testoDi(e?.dati.tipo) || 'altro', quartiere_chiave: testoDi(e?.dati.quartiere_chiave),
    cosa_offre: testoDi(e?.dati.cosa_offre), quando: (e?.dati.quando as string | null) ?? null, giorni: testoDi(e?.dati.giorni), note: testoDi(e?.dati.note),
    verificato: verificatoDi(e),
  }),
  valido: (d) => testoDi(d.nome).trim().length > 0 && testoDi(d.quartiere_chiave).length > 0,
  prepara: (d) => ({ ...senzaTemporanei(d), nome: testoDi(d.nome).trim(), cosa_offre: testoDi(d.cosa_offre).trim(), giorni: testoOnull(d.giorni), note: testoOnull(d.note) }),
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
    { nome: 'ricompensa', etichetta: 'Che cosa dà', tipo: 'testo', aiuto: 'Per esempio: Conoscenza +1 nota' },
    { nome: 'note', etichetta: 'Note', tipo: 'testolungo' },
  ],
  cruciverba: [
    { nome: 'data', etichetta: 'Giorno', tipo: 'testo', aiuto: 'Nel formato del calendario di gioco, mese-giorno: «04-18»', obbligatorio: true },
    { nome: 'indizio', etichetta: 'Indizio', tipo: 'testolungo', obbligatorio: true },
    { nome: 'risposta', etichetta: 'Risposta', tipo: 'testo', obbligatorio: true },
    { nome: 'risposta_en', etichetta: 'Risposta in inglese', tipo: 'testo', aiuto: 'Solo se ti serve: è la parola con cui la risolve chi gioca in inglese', nullable: true },
  ],
};

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
