// ============================================================
// scorteService — la scorta degli articoli nella partita: regola dell'articolo + registro degli acquisti (Ondata 5, Lotto A)
// ============================================================
//
// Decisione 21 dell'utente (26 ottobre): la rigenerazione dei negozi per tutte le categorie, con la regola della guida e, dove tace, la regola
// dell'utente (il segno vale fino al cambio di giornata). Il ciclo si calcola in lettura (`shared/rifornimento.statoScorta`) dalla data della
// partita e dalle righe di `utente.registro_acquisti` (utente 051): nessuna scrittura al cambio di giornata, quindi il conto resta giusto se
// la data torna indietro o si toglie una spunta.
//
// Le righe le scrivono soltanto `negoziService.impostaAcquisto` (la pagina del negozio, i regali, la spunta di una voce che segna lo stato) e
// `effettiDiStatoService` (una voce che compra di nuovo un articolo già ottenuto): una riga per acquisto, con giorno, fascia, pezzi e fonte.
// `ottenuto_qui` dice quale riga ha creato il segno «ottenuto» (`acquisto_partita`): togliendola, il segno passa alla riga più vecchia che
// resta (`togliRiga`), e se non ne resta nessuna chi chiama toglie anche il segno, come prima. Ogni riga registra la sede in cui si è comprato
// (`sede_chiave`, NULL = la principale): la scorta è della sede che si guarda, perché le sedi di un listino condiviso sono distributori diversi.
// ============================================================

import { prepared } from '../db/dbService.js';
import { ordineGioco } from '../../shared/condizioniSpillo.js';
import { descriviRifornimento, descriviStatoScorta, normalizzaRifornimento, numeroGiorno, statoScorta, type RegolaRifornimento } from '../../shared/rifornimento.js';
import type { ScortaArticoloDto } from '../../shared/types.js';
import type { StatoDisponibilita } from './disponibilitaService.js';
import { copieRestituite } from './consumiOggettiService.js';

/** Una riga del registro degli acquisti. `sede_chiave`: il luogo in cui si è comprato; null = la sede principale del negozio della chiave. */
export interface RigaRegistro { id: number; partita_id: number; articolo_chiave: string; giorno: string; fascia: 'giorno' | 'sera'; quantita: number; fonte: 'negozio' | 'voce'; voce_uid: string | null; effetto_uid: string | null; ottenuto_qui: number; creato_il: string; sede_chiave?: string | null }

/** Quel che serve della riga dell'articolo: la regola, i pezzi per ciclo, per la biblioteca il libro e la sede in cui lo si guarda
 *  (`negozio_sede`, quella effettiva dopo `conSede`: la principale o una sede aggiuntiva del listino condiviso). */
export interface ArticoloConRegola { chiave: string; quantita: number | null; rifornimento_json?: string | null; oggetto_fonte?: string | null; oggetto_chiave?: string | null; negozio_sede?: string | null }

/** La sede principale del negozio di ogni chiave: la sede delle righe senza `sede_chiave` (le voci del Diario, le righe della 051). */
function sediPrincipali(chiavi: readonly string[]): Map<string, string | null> {
  if (!chiavi.length) return new Map();
  return new Map((prepared(`SELECT a.chiave, n.sede_chiave FROM main.articolo a JOIN main.negozio n ON n.chiave = a.negozio_chiave
    WHERE a.chiave IN (${chiavi.map(() => '?').join(', ')})`).all(...chiavi) as Array<{ chiave: string; sede_chiave: string | null }>).map((r) => [r.chiave, r.sede_chiave]));
}

/** La sede di una riga: quella registrata, o la principale del negozio della sua chiave. */
function sedeDellaRiga(r: RigaRegistro, principali: ReadonlyMap<string, string | null>): string | null {
  return r.sede_chiave ?? principali.get(r.articolo_chiave) ?? null;
}

/** Vero se due sedi sono la stessa (null = nessuna sede: televendite, negozi online, Palazzi). */
const stessaSede = (a: string | null | undefined, b: string | null | undefined): boolean => (a ?? '') === (b ?? '');

/** Il registro esiste (partite.db già migrato alla 051): prima della migrazione nessuna scorta, tutto come prima. */
function conRegistro(): boolean {
  return !!prepared("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'registro_acquisti'").get();
}

/** La regola dell'articolo, o null se non ne ha (né la colonna c'è ancora). */
export function regolaDi(a: ArticoloConRegola): RegolaRifornimento | null {
  return normalizzaRifornimento(a.rifornimento_json ?? null);
}

/**
 * Le righe del registro di un articolo nella partita, dalla più vecchia. Ogni riga porta la chiave con cui l'acquisto è stato segnato (la
 * stessa di `acquisto_partita`, come la migrazione utente 051): il segno «ottenuto» e la riga che lo porta restano così della stessa chiave.
 */
export function righeDellArticolo(partitaId: number, articolo: string): RigaRegistro[] {
  if (!conRegistro()) return [];
  return prepared('SELECT * FROM utente.registro_acquisti WHERE partita_id = ? AND articolo_chiave = ? ORDER BY id').all(partitaId, articolo) as RigaRegistro[];
}

/** Le righe di più chiavi (l'offerta e le vecchie chiavi dello stesso listino condiviso: una scorta sola), dalla più vecchia. */
function righeDelleChiavi(partitaId: number, chiavi: readonly string[]): RigaRegistro[] {
  if (!conRegistro() || !chiavi.length) return [];
  return prepared(`SELECT * FROM utente.registro_acquisti WHERE partita_id = ? AND articolo_chiave IN (${chiavi.map(() => '?').join(', ')}) ORDER BY id`).all(partitaId, ...chiavi) as RigaRegistro[];
}

/**
 * Le chiavi del gruppo con un segno «ottenuto» che nessuna riga del registro porta: segnate prima del registro (utente 051), oppure in una
 * partita senza data di gioco (nessun giorno da registrare). L'interfaccia le mostra con il loro «Annulla», così restano visibili e
 * correggibili anche per ciò che si rifornisce.
 */
export function presenzeSenzaRiga(partitaId: number, chiavi: readonly string[]): string[] {
  return chiavi.filter((k) => !!prepared('SELECT 1 FROM utente.acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').get(partitaId, k)
    && !(conRegistro() && prepared('SELECT 1 FROM utente.registro_acquisti WHERE partita_id = ? AND articolo_chiave = ? AND ottenuto_qui = 1').get(partitaId, k)));
}

/**
 * Tanaka: il negozio che spedisce (almeno un suo articolo ha la regola `consegna`) e gli acquisti degli ALTRI articoli dello stesso negozio,
 * qualunque sia la loro regola, perché un ordine in viaggio blocca tutto il negozio fino all'arrivo (guida italiana, Negozi speciali: «fino
 * all'arrivo della spedizione non sarà possibile effettuare nuovi ordini»). null per i negozi che non spediscono.
 */
function consegnaDelNegozio(partitaId: number, chiavi: readonly string[]): { giorni: number; ordini: RigaRegistro[] } | null {
  if (!conRegistro()) return null;
  const negozio = prepared('SELECT negozio_chiave FROM main.articolo WHERE chiave = ?').pluck().get(chiavi[0]) as string | undefined;
  if (!negozio) return null;
  const giorni = prepared(`SELECT MAX(json_extract(rifornimento_json, '$.giorni')) FROM main.articolo
    WHERE negozio_chiave = ? AND json_valid(rifornimento_json) AND json_extract(rifornimento_json, '$.tipo') = 'consegna'`).pluck().get(negozio) as number | null;
  if (typeof giorni !== 'number' || giorni < 1) return null;
  const ordini = prepared(`SELECT r.* FROM utente.registro_acquisti r JOIN main.articolo a ON a.chiave = r.articolo_chiave
    WHERE r.partita_id = ? AND a.negozio_chiave = ? AND r.articolo_chiave NOT IN (${chiavi.map(() => '?').join(', ')}) ORDER BY r.id`).all(partitaId, negozio, ...chiavi) as RigaRegistro[];
  return { giorni, ordini };
}

/**
 * La scorta di un articolo nella partita (`st.partitaId`), alla data di `st`: null senza partita o senza regola. Il libro della biblioteca
 * (`restituzione`) torna quando il libro preso in prestito risulta letto (`st.letture`: la sua lettura completata). `chiavi`: l'offerta e le
 * vecchie chiavi del suo listino condiviso (una scorta sola); senza, la sola chiave dell'offerta.
 *
 * `righe` sono TUTTI gli acquisti registrati (`nelCiclo` = contano nel ciclo in corso): quelli dei cicli passati restano visibili e si
 * annullano uno per uno; `senzaGiorno` sono le chiavi con il segno «ottenuto» senza una riga che lo porti.
 *
 * La scorta è della sede in cui si guarda l'articolo (`a.negozio_sede`): le sedi aggiuntive di un listino condiviso sono distributori
 * diversi, ognuno con la sua scorta (censimento D2: «stessa offerta» non vuol dire scorte comuni). Le righe di un'altra sede restano
 * nell'elenco (`altraSede`, con il nome del luogo) e si annullano, ma non contano qui; quelle con un giorno dopo la data della partita (la
 * data tornata indietro) portano `dopoLaData` e non contano in nessun ciclo finché la data non le raggiunge.
 */
export function scortaDellArticolo(a: ArticoloConRegola, st: StatoDisponibilita | undefined, chiavi: readonly string[] = [a.chiave]): ScortaArticoloDto | null {
  const regola = regolaDi(a);
  if (!regola || st?.partitaId === undefined) return null;
  const gruppo = chiavi.includes(a.chiave) ? chiavi : [a.chiave, ...chiavi];
  const righe = righeDelleChiavi(st.partitaId, gruppo);
  const principali = sediPrincipali(gruppo);
  const sede = a.negozio_sede ?? null;
  const qui = righe.filter((r) => stessaSede(sedeDellaRiga(r, principali), sede));
  // il prestito torna quando il libro è letto o (Ondata 5, lotto F-bis: il noleggio dei DVD di Scarlet) il DVD è visto per intero
  const letto = regola.tipo === 'restituzione' && !!a.oggetto_chiave
    && ((a.oggetto_fonte === 'libri' && st.letture.has(`libro/${a.oggetto_chiave}`)) || (a.oggetto_fonte === 'film' && st.letture.has(`film/${a.oggetto_chiave}`)));
  // 2026-10-28 (effetto della voce «oggetto restituito»): le copie del prestito restituite da una voce fino alla data della partita liberano i
  // prestiti più vecchi, anche senza aver letto o visto il titolo per intero
  const oggi = numeroGiorno(st.dataGioco);
  const catalogo = regola.tipo === 'restituzione' ? prepared('SELECT catalogo_chiave FROM main.articolo WHERE chiave = ?').pluck().get(a.chiave) as string | null | undefined : null;
  const restituiti = catalogo ? copieRestituite(st.partitaId, catalogo, (g) => { const n = numeroGiorno(g); return oggi === null || n === null || n <= oggi; }) : 0;
  const spedisce = consegnaDelNegozio(st.partitaId, gruppo);
  const s = statoScorta(regola, a.quantita, qui, st.dataGioco, { letto, ...(restituiti > 0 ? { restituiti } : {}), ...(spedisce ? { consegnaDelNegozio: spedisce } : {}) });
  const nelCiclo = new Set(s.nelCiclo.map((i) => qui[i]!.id));
  const nomeLuogo = prepared('SELECT nome FROM main.luogo WHERE chiave = ?').pluck();
  const nomeNegozio = prepared('SELECT n.nome FROM main.articolo a JOIN main.negozio n ON n.chiave = a.negozio_chiave WHERE a.chiave = ?').pluck();
  return {
    comprati: s.comprati, rimasti: s.rimasti, quantita: s.quantita, esaurito: s.esaurito, torna: s.torna, testo: descriviStatoScorta(regola, s),
    ...(s.ordineInViaggio ? { ordineInViaggio: true } : {}),
    righe: righe.map((r) => {
      const sedeRiga = sedeDellaRiga(r, principali);
      const giorno = numeroGiorno(r.giorno);
      return { id: r.id, articolo: r.articolo_chiave, giorno: r.giorno, fascia: r.fascia, quantita: r.quantita, fonte: r.fonte, voceUid: r.voce_uid, nelCiclo: nelCiclo.has(r.id),
        dopoLaData: oggi !== null && giorno !== null && giorno > oggi,
        // il nome del luogo dell'altra sede, e del negozio della vecchia chiave di un listino condiviso: si dicono solo quando sono diversi
        ...(stessaSede(sedeRiga, sede) ? {} : { altraSede: (sedeRiga ? nomeLuogo.get(sedeRiga) as string | undefined : undefined) ?? 'Un’altra sede' }),
        ...(r.articolo_chiave === a.chiave ? {} : { negozioNome: (nomeNegozio.get(r.articolo_chiave) as string | undefined) ?? 'Offerta precedente' }) };
    }),
    senzaGiorno: presenzeSenzaRiga(st.partitaId, gruppo),
  };
}

/** La regola a parole, senza partita (dettagli dell'offerta, modulo): null senza regola. */
export function rifornimentoDellArticolo(a: ArticoloConRegola): { regola: RegolaRifornimento; testo: string } | null {
  const regola = regolaDi(a);
  return regola ? { regola, testo: descriviRifornimento(regola, a.quantita) } : null;
}

/**
 * Il requisito della scorta per la disponibilità: rosso se esaurita, verde se resta qualcosa di un ciclo a più pezzi («Rimasti 1 di 3»);
 * null se l'articolo non ha un limite di pezzi o se il suo unico pezzo c'è ancora («Rimasti 1 di 1» non dice niente di più di «disponibile»).
 * Il pezzo unico (`mai`) non ha requisito: già comprato lo dice la riga barrata, e un'etichetta in più non informa (regola dell'utente);
 * resta «disponibile» come prima del registro, e una seconda spunta non crea una seconda copia (`impostaAcquisto`). Fa eccezione il pezzo
 * unico non ancora comprato di un negozio che spedisce, mentre un altro ordine è in viaggio: lì il requisito rosso dice quando si riordina.
 */
export function requisitoScorta(scorta: ScortaArticoloDto | null, indice: number, regola: RegolaRifornimento | null = null) {
  if (!scorta) return null;
  const bloccatoDallOrdine = scorta.ordineInViaggio === true && scorta.comprati === 0;
  if (!bloccatoDallOrdine && (regola?.tipo === 'mai' || scorta.rimasti === null || (!scorta.esaurito && scorta.quantita === 1))) return null;
  return { indice, tipo: 'scorta', testo: 'Scorta del negozio', stato: scorta.esaurito ? 'rosso' as const : 'verde' as const, dettaglio: scorta.testo, manuale: false, confermato: false };
}

/** I dati di una riga nuova. `sede`: il luogo in cui si compra (la pagina del negozio); senza, la sede principale (le voci del Diario). */
export interface NuovaRiga { giorno: string; fascia: 'giorno' | 'sera'; quantita: number; fonte: 'negozio' | 'voce'; voceUid?: string; effettoUid?: string; ottenutoQui: boolean; sede?: string | null }

/**
 * Scrive una riga del registro (dentro la transazione di chi chiama). Per una voce la riga è una sola per voce ed effetto: se c'è già, si
 * aggiornano giorno, fascia e pezzi (la voce corretta nella guida), e il segno «ottenuto» resta quello di prima. Restituisce l'id.
 */
export function scriviRiga(partitaId: number, articolo: string, r: NuovaRiga): number | null {
  if (!conRegistro()) return null;
  const adesso = new Date().toISOString();
  const quantita = Math.min(999, Math.max(1, Math.trunc(r.quantita) || 1));
  if (r.fonte === 'voce') {
    const vecchia = prepared("SELECT id FROM utente.registro_acquisti WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ? AND fonte = 'voce'").get(partitaId, r.voceUid, r.effettoUid) as { id: number } | undefined;
    if (vecchia) {
      prepared('UPDATE utente.registro_acquisti SET articolo_chiave = ?, giorno = ?, fascia = ?, quantita = ? WHERE id = ?').run(articolo, r.giorno, r.fascia, quantita, vecchia.id);
      return vecchia.id;
    }
  }
  const valori = [partitaId, articolo, r.giorno, r.fascia, quantita, r.fonte, r.fonte === 'voce' ? r.voceUid : null, r.fonte === 'voce' ? r.effettoUid : null, r.ottenutoQui ? 1 : 0, adesso];
  // un registro creato prima della colonna della sede (la 051 la aggiunge sempre: qui per un file che non l'avesse) vale la sede principale
  if (!conColonnaSede()) return Number(prepared(`INSERT INTO utente.registro_acquisti (partita_id, articolo_chiave, giorno, fascia, quantita, fonte, voce_uid, effetto_uid, ottenuto_qui, creato_il)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(...valori).lastInsertRowid);
  return Number(prepared(`INSERT INTO utente.registro_acquisti (partita_id, articolo_chiave, giorno, fascia, quantita, fonte, voce_uid, effetto_uid, ottenuto_qui, creato_il, sede_chiave)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(...valori, r.fonte === 'negozio' ? r.sede ?? null : null).lastInsertRowid);
}

/** Il registro ha la colonna della sede (utente 051). */
function conColonnaSede(): boolean {
  return !!prepared("SELECT 1 FROM pragma_table_info('registro_acquisti', 'utente') WHERE name = 'sede_chiave'").get();
}

/**
 * Toglie una riga (dentro la transazione di chi chiama). Se portava il segno «ottenuto» e restano altre righe dello stesso articolo, il segno
 * passa alla più vecchia; `tolgoOttenuto` = era l'ultima con il segno: chi chiama toglie anche `acquisto_partita`, come faceva prima.
 */
export function togliRiga(partitaId: number, id: number): { riga: RigaRegistro | null; tolgoOttenuto: boolean } {
  if (!conRegistro()) return { riga: null, tolgoOttenuto: false };
  const riga = prepared('SELECT * FROM utente.registro_acquisti WHERE partita_id = ? AND id = ?').get(partitaId, id) as RigaRegistro | undefined;
  if (!riga) return { riga: null, tolgoOttenuto: false };
  prepared('DELETE FROM utente.registro_acquisti WHERE id = ?').run(id);
  if (riga.ottenuto_qui !== 1) return { riga, tolgoOttenuto: false };
  const erede = prepared('SELECT id FROM utente.registro_acquisti WHERE partita_id = ? AND articolo_chiave = ? ORDER BY id LIMIT 1').get(partitaId, riga.articolo_chiave) as { id: number } | undefined;
  if (erede) { prepared('UPDATE utente.registro_acquisti SET ottenuto_qui = 1 WHERE id = ?').run(erede.id); return { riga, tolgoOttenuto: false }; }
  return { riga, tolgoOttenuto: true };
}

/** La riga della voce e del suo effetto, se c'è. */
export function rigaDellaVoce(partitaId: number, voceUid: string, effettoUid: string): RigaRegistro | null {
  if (!conRegistro()) return null;
  return (prepared("SELECT * FROM utente.registro_acquisti WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ? AND fonte = 'voce'").get(partitaId, voceUid, effettoUid) as RigaRegistro | undefined) ?? null;
}

/**
 * L'ultima riga della pagina del negozio per l'articolo (la più recente nel calendario di gioco, poi la più nuova). Con `sede` (definita,
 * anche null = nessuna sede) si preferiscono le righe di quella sede: togliendo la spunta in un distributore si toglie il suo acquisto, e
 * solo se lì non ce n'è uno quello di un'altra sede.
 */
export function ultimaRigaDelNegozio(partitaId: number, articolo: string, sede?: string | null): RigaRegistro | null {
  const tutte = righeDellArticolo(partitaId, articolo).filter((r) => r.fonte === 'negozio');
  if (!tutte.length) return null;
  const principali = sede === undefined ? null : sediPrincipali([articolo]);
  const diQui = principali ? tutte.filter((r) => stessaSede(sedeDellaRiga(r, principali), sede)) : [];
  const righe = diQui.length ? diQui : tutte;
  return righe.reduce((a, b) => (ordineGioco(b.giorno) > ordineGioco(a.giorno) || (ordineGioco(b.giorno) === ordineGioco(a.giorno) && b.id > a.id) ? b : a));
}

/** Il giorno e la fascia di una voce del Diario (null se la voce non c'è o non ha una data di gioco). */
export function momentoDellaVoce(voceUid: string): { giorno: string; fascia: 'giorno' | 'sera' } | null {
  const v = prepared('SELECT data, fascia FROM main.voce_giornata WHERE uid = ?').get(voceUid) as { data: string; fascia: string } | undefined;
  if (!v || !/^\d{2}-\d{2}$/.test(v.data) || (v.fascia !== 'giorno' && v.fascia !== 'sera')) return null;
  return { giorno: v.data, fascia: v.fascia };
}
