// ============================================================
// statiMancantiService — l'elenco degli effetti di stato mai applicati (L13, decisione 19)
// ============================================================
//
// Segnalazione dell'utente (2026-10-26): «al momento non viene aggiornato il Compendio Personale» (un effetto Persona aggiunto alla voce già
// spuntata). Fino alla decisione 19 gli effetti di stato salvati su una voce già spuntata non si applicavano («valgono dalla prossima spunta»):
// lo stato restava fuori dalla partita, in silenzio, finché non si toglieva e rimetteva la spunta. Dalla decisione 19 il salvataggio li applica
// subito (`motoreDiario.riallineaStatiDellaVoce`); per il passato l'utente ha scelto «Elenco da approvare»: niente si applica da solo.
//
// Il censimento (`proponiStatiMancanti`): per ogni spunta e per ogni effetto di stato della voce (non la Fortuna, che vale solo il giorno della
// spunta) senza la riga del «prima» (`utente.effetto_stato_voce`, che la spunta scrive per ogni effetto applicato):
//   - lo stato è già vero nella partita (la stessa lettura della spunta, `statoGiaVero`): non c'è niente da proporre, solo il registro;
//   - un articolo in alternativa con altri della voce (L13, decisione 4, `effettiInAlternativa`): lo sceglie solo la spunta (uno, o nessuno), e
//     senza la sua riga non è stato scelto: non entra (una sua proposta aperta di prima si chiude);
//   - altrimenti entra nell'elenco della partita: una proposta «da applicare» (`dati.passato`), con le stesse guardie delle altre (una aperta
//     con la stessa configurazione resta, una tolta dall'utente con «Non applicare» non torna). Si applica solo con «Applica alla
//     partita» (`motoreDiario.applicaStatoDelPassato`).
// Il registro (`utente.censimento_stato_voce`, utente 050) tiene l'esito per coppia, ed è una decisione presa una volta sola: una coppia trovata
// «già vera» (con lo stesso effetto: tipo e chiave) non si rivaluta più, così uno stato che l'utente toglie dopo (una Persona consumata in una
// fusione, un trofeo tolto a mano) non torna nell'elenco a ogni avvio. Idempotente: un secondo giro non aggiunge niente.
// Gira a ogni avvio (dopo le migrazioni e le regole) e dopo l'importazione di un gioco.db: copre anche le migrazioni di gioco che aggiungono
// effetti a voci già spuntate. Non è un gesto dell'utente: una proposta che si chiude qui non fa avanzare la partita (`senzaAvanzamento`).
// Nel log solo i conteggi per partita (l'id), mai nomi né email; gli effetti non riconoscibili si contano (`nonRiconosciuti`), non si saltano in silenzio.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { normalizzaEffettoVoce, eEffettoDiStato, fraseEffettoConNomi, type EffettoDiStatoVoce, type EffettoVoceDto } from '../../shared/effettiVoce.js';
import { fraseMotivoDelPassato, mancaPersonaConScorta, statoGiaVero, statoSegnatoDallaVoce } from './effettiDiStatoService.js';
import { chiudiPropostePassato, creaPropostaEffettoStorico } from './propostePartitaService.js';
import { effettiInAlternativa } from './alternativeAcquistiService.js';
import { nomiFraseEffetto } from './azioniStrutturateService.js';
// Ondata 5 (lotto E): la frase dell'articolo dice il prezzo della fascia della voce, lo stesso che la spunta scala
import { fasciaDellaVoce } from './prezziArticoli.js';

/** I conteggi del censimento di una partita. */
export interface CensimentoPartita {
  partitaId: number;
  /** Gli effetti di stato delle voci spuntate. */
  spunteConStati: number;
  /** Quelli con la riga del «prima»: applicati da una spunta, dal salvataggio o da un'approvazione. */
  conRiga: number;
  /** Senza riga, ma lo stato era già vero nella partita: niente da proporre. */
  giaPresenti: number;
  /** Entrati nell'elenco (proposta aperta nuova). */
  proposte: number;
  /** Senza riga e non già veri, già nell'elenco o scartati dall'utente: invariati. */
  invariate: number;
  /** Articoli in alternativa con altri della voce (decisione 4) senza riga: non scelti alla spunta, quindi non mancano e non entrano nell'elenco. */
  inAlternativa: number;
  /** Effetti della voce che non si riconoscono come effetti di stato (la configurazione salvata non è leggibile per intero): non entrano. */
  nonRiconosciuti: number;
  /** Coppie il cui esame non è riuscito (un registro illeggibile): tornate indietro da sole, le altre proseguono; il prossimo giro le riprova. */
  errori: number;
  /** Il motivo del primo errore della partita, per il log (testo del dominio, mai nomi né email). */
  primoErrore?: string;
}

interface RigaCandidato { partita_id: number; voce_uid: string; effetto_uid: string; tipo: string; chiave: string | null; dati_json: string; fatta_at: string; data: string; azione: string }

const leggi = (json: string): unknown => { try { return JSON.parse(json) as unknown; } catch { return null; } };

/**
 * Il censimento: vedi l'intestazione del file. Scrive solo le proposte «da applicare» e il registro, dentro UNA transazione, con un savepoint per
 * coppia: una coppia che non si esamina torna indietro da sola e si conta in `errori`, le altre restano.
 * Una voce con la fonte non convertita o un effetto non riconoscibile non entra (si vede già «da correggere» sulla voce).
 */
export function proponiStatiMancanti(): { partite: CensimentoPartita[] } {
  return getDb().transaction(() => {
    const righe = prepared(`SELECT s.partita_id, s.voce_uid, e.uid AS effetto_uid, e.tipo, e.chiave, e.dati_json, s.fatta_at, v.data, v.azione
      FROM utente.spunta_voce_partita s
      JOIN main.voce_giornata v ON v.uid = s.voce_uid
      JOIN main.voce_effetto_transizione t ON t.voce_uid = s.voce_uid AND t.stato = 'convertita'
      JOIN main.voce_effetto e ON e.voce_uid = s.voce_uid
      WHERE e.tipo IN ('storia','domanda','cruciverba','richiesta','articolo','invito','persona','oggetto','trofeo','sblocco')
      ORDER BY s.partita_id, v.data, s.voce_uid, e.ordine`).all() as RigaCandidato[];
    const perPartita = new Map<number, CensimentoPartita>();
    const conta = (p: number): CensimentoPartita => {
      let c = perPartita.get(p);
      if (!c) { c = { partitaId: p, spunteConStati: 0, conRiga: 0, giaPresenti: 0, proposte: 0, invariate: 0, inAlternativa: 0, nonRiconosciuti: 0, errori: 0 }; perPartita.set(p, c); }
      return c;
    };
    // decisione 4: gli articoli in alternativa di ogni voce (le righe portano tutti i suoi effetti «articolo»): quale si è comprato lo sceglie solo
    // la spunta (uno, o nessuno), quindi un membro senza riga non è «mai applicato» ma non scelto
    const articoliPerVoce = new Map<string, Map<string, EffettoVoceDto>>();
    for (const r of righe) {
      if (r.tipo !== 'articolo') continue;
      const e = normalizzaEffettoVoce(leggi(r.dati_json));
      const m = articoliPerVoce.get(r.voce_uid) ?? new Map<string, EffettoVoceDto>();
      if (!e || e.tipo !== 'articolo' || m.has(r.effetto_uid)) continue;
      m.set(r.effetto_uid, { uid: r.effetto_uid, ordine: m.size, effetto: e, origine: 'seed' });
      articoliPerVoce.set(r.voce_uid, m);
    }
    const inAlternativa = new Map([...articoliPerVoce].map(([voce, m]) => [voce, effettiInAlternativa([...m.values()])]));
    const nomi = nomiFraseEffetto(), adesso = nowIso();
    const registra = (r: RigaCandidato, esito: 'proposta' | 'gia-presente'): void => {
      prepared(`INSERT INTO utente.censimento_stato_voce (partita_id, voce_uid, effetto_uid, tipo, chiave, esito, rilevato_il) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(partita_id, voce_uid, effetto_uid) DO UPDATE SET tipo = excluded.tipo, chiave = excluded.chiave, esito = excluded.esito,
          rilevato_il = CASE WHEN censimento_stato_voce.esito = excluded.esito THEN censimento_stato_voce.rilevato_il ELSE excluded.rilevato_il END`)
        .run(r.partita_id, r.voce_uid, r.effetto_uid, r.tipo, r.chiave, esito, adesso);
    };
    for (const r of righe) {
      const e = normalizzaEffettoVoce(leggi(r.dati_json));
      if (!e || !eEffettoDiStato(e) || e.tipo !== r.tipo) { conta(r.partita_id).nonRiconosciuti += 1; continue; }
      const c = conta(r.partita_id);
      c.spunteConStati += 1;
      // ogni coppia nel suo savepoint (revisione B3): una riga che non si legge (un registro illeggibile della proposta) si conta in `errori`
      // e torna indietro da sola, senza fermare il censimento delle altre coppie e delle altre partite
      try {
        getDb().transaction(() => {
          // le righe della voce: per la Persona «anche nella scorta» quella dell'effetto e quella della scorta (2026-10-26, `statoSegnatoDallaVoce`)
          if (statoSegnatoDallaVoce(r.partita_id, r.voce_uid, r.effetto_uid, e)) { c.conRiga += 1; return; }
          // un articolo in alternativa non scelto: niente da proporre, e una sua proposta aperta di prima non è più dovuta
          if (inAlternativa.get(r.voce_uid)?.has(r.effetto_uid)) { chiudiPropostePassato(r.partita_id, r.voce_uid, r.effetto_uid); c.inAlternativa += 1; return; }
          // già trovata vera da un censimento di prima, con lo stesso effetto: la decisione è presa, anche se poi lo stato è cambiato nella partita
          // (togliendo la spunta della voce il registro della coppia se ne va: `giornataService`, la spunta rifatta si rivaluta)
          if (prepared("SELECT 1 FROM utente.censimento_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ? AND esito = 'gia-presente' AND tipo = ? AND chiave IS ?")
            .get(r.partita_id, r.voce_uid, r.effetto_uid, r.tipo, r.chiave)) { c.giaPresenti += 1; return; }
          // l'oggetto ricevuto somma, non è uno stato sì/no: senza la sua riga manca sempre
          if (e.tipo !== 'oggetto' && statoGiaVero(r.partita_id, e)) { registra(r, 'gia-presente'); c.giaPresenti += 1; return; }
          const aperteprima = contaAperte(r.partita_id, r.voce_uid, r.effetto_uid);
          creaPropostaEffettoStorico(r.partita_id, r.voce_uid, r.effetto_uid, undefined, { passato: { descrizione: fraseEffettoConNomi(e as EffettoDiStatoVoce, e.tipo === 'articolo' ? nomiFraseEffetto(fasciaDellaVoce(r.voce_uid)) : nomi), motivo: motivoDelPassato(r.partita_id, e) }, senzaAvanzamento: true });
          const aperteDopo = contaAperte(r.partita_id, r.voce_uid, r.effetto_uid, true);
          if (aperteDopo > 0) registra(r, 'proposta');
          if (aperteDopo > 0 && aperteprima === 0) c.proposte += 1; else c.invariate += 1;
        })();
      } catch (err) {
        c.errori += 1;
        c.primoErrore ??= err instanceof Error ? err.message : String(err);
      }
    }
    return { partite: [...perPartita.values()] };
  })();
}

/** Le proposte aperte della coppia (con `soloPassato`, solo quelle dell'elenco del passato). */
function contaAperte(p: number, voce: string, effetto: string, soloPassato = false): number {
  return prepared(`SELECT COUNT(*) FROM utente.da_applicare WHERE partita_id = ? AND causa_tipo = 'voce' AND causa_chiave = ? AND tipo = 'effetto-voce' AND stato = 'aperta'${soloPassato ? " AND json_extract(dati_json, '$.passato') = 1" : ''}`)
    .pluck().get(p, `${voce}:${effetto}`) as number;
}

/**
 * Perché l'effetto è nell'elenco, a parole: che cosa manca nella partita `p`. Per la Persona «Compendio e scorta» la parte che manca cambia con
 * la partita: il dto delle proposte la riscrive in lettura (`motivoPersonaConScortaAdesso`).
 */
function motivoDelPassato(p: number, e: EffettoDiStatoVoce): string {
  const manca = e.tipo === 'persona' ? (e.scorta ? mancaPersonaConScorta(p, e) : 'la Persona non è nel Compendio Personale')
    : e.tipo === 'trofeo' ? 'il trofeo non risulta ottenuto'
      : e.tipo === 'articolo' ? 'l’articolo non risulta comprato'
        : e.tipo === 'oggetto' ? 'l’oggetto non risulta ricevuto'
          : e.tipo === 'sblocco' ? 'lo sblocco non risulta segnato'
            : e.tipo === 'invito' ? 'l’invito non risulta avvenuto'
              : e.tipo === 'richiesta' ? 'la Richiesta non risulta completata'
                : e.tipo === 'domanda' ? 'la domanda non risulta risposta'
                  : e.tipo === 'cruciverba' ? 'il cruciverba non risulta risolto'
                    : 'l’evento di storia non risulta segnato';
  // il motivo vale per tutti i casi dell'elenco: un effetto aggiunto dopo la spunta, quando il salvataggio non lo applicava, o un articolo
  // saltato alla spunta perché in quel momento non risultava in vendita (`applicaUnEffettoDiStato`, «non-disponibile»)
  return fraseMotivoDelPassato(manca);
}
