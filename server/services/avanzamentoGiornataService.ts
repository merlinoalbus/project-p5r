// ============================================================
// avanzamentoGiornataService — l'unica regola che fa avanzare in automatico la fascia e il giorno di una partita (decisione A1, 2026-10-25)
// ============================================================
//
// Richiesta dell'utente (2026-09-30, estesa con la scelta «A1» del 2026-10-25): la partita avanza da sola mentre si spunta il Diario.
//   1. spuntata l'ultima attività di GIORNO del giorno corrente, e senza decisioni aperte per le voci di giorno, la partita passa alla SERA;
//   2. spuntata l'ultima attività di SERA, e senza decisioni aperte nel giorno, la partita passa al GIORNO DOPO (di giorno);
//   3. se una decisione resta aperta, l'avanzamento scatta quando si chiude l'ultima (`avanzaDopoDecisioni`, chiamata da `decidiProposte`
//      nella stessa transazione), e la risposta lo dice (`fasciaAvanzata` / `giornoAvanzato`);
//      Vale anche per le decisioni che si chiudono da sole (`avanzaDopoChiusuraAutomatica`, da `propostePartitaService`): l'esito si ricorda nel contesto
//      della richiesta e la risposta della rotta lo porta (`prelevaAvanzamentoValido`, `responseShape`); dentro `decidiProposte`, che riconcilia più
//      cause, le chiusure automatiche si raccolgono e l'avanzamento si valuta una volta sola, alla fine (`avanzaUnaVoltaAllaFine`);
//   4. togliere una spunta NON riporta indietro né la fascia né il giorno: chi chiama lo invoca solo a una spunta nuova o a una decisione chiusa;
//   5. la regola è la stessa per ogni strada che spunta una voce: Diario, Home e Guida (domande, cruciverba) passano tutte da `spuntaEAvanza`.
//
// «Decisione aperta» = proposta di punti `utente.da_applicare` ancora aperta per la voce (o per il consumo che la voce ha confermato:
// ramo `acquisto_provenienza`), lo stesso conteggio del pulsante «Applica» sulla voce (`decisioniApertePerVoce`). I gesti ancora da verificare
// (richieste inviate senza ricevuta) vivono nel registro del client (`gestiPartita`) e il server non li vede: se ne occupa il client, che non
// invia il gesto successivo finché la ricevuta non è recuperata, e lo stesso avanzamento torna alla chiusura dell'ultima decisione.
//
// Casi limite: se il giorno ha attività solo di giorno (o solo di sera) e sono tutte fatte, la partita passa direttamente al giorno dopo (non c'è
// una sera da spuntare); se le attività sono tutte fatte fuori ordine, idem. Senza attività spuntabili non scatta niente. Nell'ultimo giorno
// del percorso il giorno non avanza (non c'è un giorno dopo). L13 (O9-3): una voce non dovuta nella partita (`voceDovuta`: le sue condizioni
// «Si fa solo se» sono false al suo giorno, per esempio la consegna delle televendite senza nessun set comprato) vale come fatta.
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { cambiaGiornoPartita, passaAllaSeraPartita } from './giornoPartitaService.js';
import { decisioniApertePerVoce, righeDelGiorno, spuntePartita } from './giornataService.js';
import { leggiPartita } from './partiteService.js';
import { prelevaAvanzamentoRichiesta, registraAvanzamentoRichiesta } from '../middleware/requestContext.js';
import type { AvanzamentoGiornataDto } from '../../shared/types.js';
import { vociNonDovute } from './voceDovuta.js';

/** Le decisioni aperte di tutte le voci date. */
const decisioniAperteDelleVoci = (partitaId: number, uids: readonly string[]): number => uids.reduce((n, uid) => n + decisioniApertePerVoce(partitaId, uid), 0);

/**
 * Se la fascia (o il giorno) della partita è completa, la fa avanzare: «giorno» → «sera», oppure «sera» → giorno dopo (vedi sopra). `data` è il giorno della
 * voce spuntata o decisa; se non è il giorno corrente della partita non succede niente. Restituisce il passaggio avvenuto, o null. Idempotente:
 * rilanciata a cose già avanzate (o a condizioni non soddisfatte) non fa niente.
 */
export function avanzaSeFasciaCompleta(partitaId: number, data: string): AvanzamentoGiornataDto | null {
  return getDb().transaction((): AvanzamentoGiornataDto | null => {
    const p = prepared('SELECT data_gioco, fascia_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null; fascia_gioco: string } | undefined;
    if (!p || p.data_gioco !== data) return null;
    const r = prepared('SELECT ordine FROM giorno WHERE data = ?').get(data) as { ordine: number } | undefined;
    if (!r) return null;
    const righe = righeDelGiorno(data);
    const azioni = righe.filter((v) => v.genere === 'azione');
    if (azioni.length === 0) return null;
    const spuntate = spuntePartita(partitaId, data);
    // L13 (O9-3, «in tal caso viene meno la consegna»): una voce non dovuta nella partita (le sue condizioni sono false al suo giorno) non è
    // una cosa da fare: per l'avanzamento vale come fatta (`voceDovuta`)
    const nonDovute = vociNonDovute(partitaId, azioni, spuntate);
    const fatte = { has: (uid: string) => spuntate.has(uid) || nonDovute.has(uid) };
    const tutteFatte = azioni.every((a) => fatte.has(a.uid));

    // 2. il giorno intero è fatto e senza decisioni aperte: giorno dopo, di giorno (la regola unica del cambio giorno, R10-16)
    if (tutteFatte && decisioniAperteDelleVoci(partitaId, righe.map((v) => v.uid)) === 0) {
      const succ = prepared('SELECT data FROM giorno WHERE ordine > ? ORDER BY ordine ASC LIMIT 1').get(r.ordine) as { data: string } | undefined;
      if (!succ) return null;
      cambiaGiornoPartita(partitaId, succ.data, { titolo: `Giornata del ${data} completata`, dettaglio: `Tutte le attività del giorno sono fatte e nessuna decisione è rimasta aperta: la partita passa al ${succ.data}, di giorno.` });
      return { giornoAvanzato: { da: data, a: succ.data, partita: leggiPartita(partitaId), decisioniAperte: decisioniAperteDelleVoci(partitaId, righe.map((v) => v.uid)) } };
    }

    // 1. le attività di giorno sono fatte e le loro decisioni chiuse: si fa sera, nello stesso giorno
    if (p.fascia_gioco !== 'sera') {
      const diGiorno = righe.filter((v) => v.fascia !== 'sera');
      const azioniDiGiorno = azioni.filter((v) => v.fascia !== 'sera');
      if (azioniDiGiorno.length > 0 && azioniDiGiorno.every((a) => fatte.has(a.uid)) && decisioniAperteDelleVoci(partitaId, diGiorno.map((v) => v.uid)) === 0) {
        const passata = passaAllaSeraPartita(partitaId, { titolo: `Attività di giorno del ${data} completate`, dettaglio: `Tutte le attività di giorno sono fatte e nessuna decisione è rimasta aperta: la partita passa alla sera del ${data}.` });
        if (!passata) return null;
        return { fasciaAvanzata: { giorno: data, da: 'giorno', a: 'sera', partita: leggiPartita(partitaId), decisioniAperte: decisioniAperteDelleVoci(partitaId, righe.map((v) => v.uid)) } };
      }
    }
    return null;
  })();
}

/** Una proposta appena decisa, quanto basta per risalire alla sua voce (e quindi al suo giorno). */
export interface PropostaDecisa { voce_uid: string | null; causa_tipo: string; causa_chiave: string }

/** Per partita: le chiusure automatiche raccolte mentre è in corso un'operazione `avanzaUnaVoltaAllaFine` (transazioni sincrone: niente si intreccia). */
const chiusureDifferite = new Map<number, PropostaDecisa[]>();

/**
 * Dopo che una decisione si è chiusa DA SOLA (la causa non la richiede più, la dote è rivendicata da un acquisto, la configurazione è cambiata:
 * `propostePartitaService`): stessa regola di una decisione dell'utente, nella stessa transazione di chi ha provocato la chiusura. Chi ha
 * provocato la chiusura non sa dell'avanzamento: l'esito si ricorda nel contesto della richiesta e la risposta della rotta lo porta
 * (`prelevaAvanzamentoValido`, applicato anche dal middleware `responseShape`), così il client si allinea come dopo una spunta.
 */
export function avanzaDopoChiusuraAutomatica(partitaId: number, decise: readonly PropostaDecisa[]): void {
  // dentro un'operazione che riconcilia più cause (`avanzaUnaVoltaAllaFine`) la chiusura si raccoglie e si valuta alla fine, con le altre
  const raccolte = chiusureDifferite.get(partitaId);
  if (raccolte) { raccolte.push(...decise); return; }
  const esito = avanzaDopoDecisioni(partitaId, decise);
  if (esito) registraAvanzamentoRichiesta(partitaId, esito);
}

/**
 * Un'operazione che decide proposte e poi riconcilia più cause in sequenza (`decidiProposte`): ogni riconciliazione può chiudere da sola una
 * decisione, e l'avanzamento valutato a metà sarebbe prematuro (la causa A chiude l'ultima decisione aperta, la causa B subito dopo ne apre una
 * nuova: la partita sarebbe già avanzata, irreversibilmente, con una decisione aperta). Qui le chiusure automatiche si raccolgono e l'avanzamento
 * si valuta UNA volta, alla fine, dopo tutte le riconciliazioni, insieme alle proposte decise dall'operazione (`fn` le restituisce in `decise`).
 * Va chiamata dentro la transazione dell'operazione. Annidata per la stessa partita, consegna tutto a quella esterna, che valuta lei.
 */
export function avanzaUnaVoltaAllaFine<T>(partitaId: number, fn: () => { valore: T; decise: readonly PropostaDecisa[] }): { valore: T; avanzamento: AvanzamentoGiornataDto | null } {
  const esterna = chiusureDifferite.get(partitaId);
  if (esterna) {
    const { valore, decise } = fn();
    esterna.push(...decise);
    return { valore, avanzamento: null };
  }
  const chiuse: PropostaDecisa[] = [];
  chiusureDifferite.set(partitaId, chiuse);
  let risultato: { valore: T; decise: readonly PropostaDecisa[] };
  try { risultato = fn(); } finally { chiusureDifferite.delete(partitaId); }
  return { valore: risultato.valore, avanzamento: avanzaDopoDecisioni(partitaId, [...risultato.decise, ...chiuse]) };
}

/**
 * L'avanzamento che la richiesta in corso ha provocato per la partita (chiusure automatiche comprese), togliendolo dal contesto; undefined se non
 * c'è o se non corrisponde più allo stato della partita (la transazione che l'aveva prodotto è stata annullata: niente da dire al client).
 */
export function prelevaAvanzamentoValido(partitaId: number): AvanzamentoGiornataDto | undefined {
  const esito = prelevaAvanzamentoRichiesta(partitaId);
  if (!esito) return undefined;
  const p = prepared('SELECT data_gioco, fascia_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null; fascia_gioco: string } | undefined;
  if (!p) return undefined;
  const g = esito.giornoAvanzato;
  const f = esito.fasciaAvanzata;
  if (g && p.data_gioco === g.a) return { giornoAvanzato: g };
  if (f && p.data_gioco === f.giorno && p.fascia_gioco === f.a) return { fasciaAvanzata: f };
  return undefined;
}

/**
 * Dopo una decisione sulle proposte: chiusa l'ultima decisione aperta, la fascia o il giorno già spuntati per intero avanzano (punto 3). Si guardano
 * solo i giorni delle voci delle proposte decise (la voce della proposta, o quelle che hanno confermato il consumo da cui nasce): una decisione
 * su una voce di un altro giorno non fa avanzare quello corrente. Va chiamata nella stessa transazione della decisione.
 */
export function avanzaDopoDecisioni(partitaId: number, decise: readonly PropostaDecisa[]): AvanzamentoGiornataDto | null {
  const uids = new Set<string>();
  for (const q of decise) {
    if (q.voce_uid) uids.add(q.voce_uid);
    if (q.causa_tipo === 'acquisto') {
      for (const v of prepared('SELECT voce_uid FROM utente.acquisto_provenienza WHERE partita_id = ? AND acquisto_id = ? AND voce_uid IS NOT NULL').all(partitaId, q.causa_chiave) as Array<{ voce_uid: string }>) uids.add(v.voce_uid);
    }
  }
  const giorni = new Set<string>();
  for (const uid of uids) {
    const g = (prepared('SELECT data FROM voce_giornata WHERE uid = ?').get(uid) as { data: string } | undefined)?.data;
    if (g) giorni.add(g);
  }
  for (const g of giorni) {
    const esito = avanzaSeFasciaCompleta(partitaId, g);
    if (esito) return esito;
  }
  return null;
}
