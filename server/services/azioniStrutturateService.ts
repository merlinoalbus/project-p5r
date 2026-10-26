// ============================================================
// azioniStrutturateService — collegamenti ed effetti di un'azione della giornata: verifica e nomi
// ============================================================
//
// Un'azione della guida (corretta dall'utente) o dell'utente si classifica e si collega come ogni altra
// (richiesta dell'utente, 2026-09-30: «devo poter modificare al 100% gli eventi della guida»): tipo,
// collegamento a un Confidente, un Palazzo, una richiesta, un libro, un film, un'attività, un negozio o
// una Dote, rango atteso ed effetti della spunta. Qui si verifica che ciò a cui punta esista (un
// collegamento a vuoto non si salva: la spunta non saprebbe che cosa fare) e si danno i nomi per
// l'interfaccia (`riferimentoTesto`, `produceTesto`).
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { t } from './traduzioniService.js';
import { destinazionePalazzo } from './palazziService.js';
import { postoDelPin } from './mappe/nomiDeiPosti.js';
import { catalogoOggettiDisponibile } from './catalogoOggettiLetture.js';
import { eTracciamentoAttivita, tracciamentoPerTipo } from '../../shared/attivita.js';
import { descriviEffettoAzione, normalizzaEffettiAzione, TIPI_RIFERIMENTO_AZIONE, type EffettoAzione, type NomiEffettiAzione } from '../../shared/effettiAzione.js';
import type { DatoConYen, NomiFraseEffetto } from '../../shared/effettiVoce.js';
import { SQL_YEN_DEL_DATO } from './yenDeiDati.js';
import { eOffertaAojiru } from '../../shared/acquisti.js';
import { leggiEsitiAttivita } from '../../shared/esitiAttivita.js';
import { leggiCondizioniSalvate, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { contenutoArticoli, mappaIncompatibili } from './alternativeAcquistiService.js';
import type { ConfidentePartitaDto, ElenchiAzioneDto, ElenchiEffettiVoceDto, StatoAzioneDto } from '../../shared/types.js';

const TIPI_RIFERIMENTO = new Set<string>(TIPI_RIFERIMENTO_AZIONE.map((r) => r.chiave));

/** Le chiavi di lettura restano quelle originali; il titolo corrente segue anche una fonte confluita. */
function titoliLettura(tabella: 'libro' | 'film' | 'attivita', coda = ''): string {
  const originale = 'l.nome';
  if (!catalogoOggettiDisponibile()) return `SELECT l.*,${originale} AS titolo_corrente FROM ${tabella} l ${coda}`;
  return `SELECT l.*,COALESCE(c.nome,${originale}) AS titolo_corrente FROM ${tabella} l
    LEFT JOIN catalogo_oggetto c ON c.chiave = l.catalogo_chiave ${tabella === 'attivita' ? "AND l.tipo = 'videogioco'" : ''} ${coda}`;
}

/** Il minimo di un'azione (della guida o dell'utente) che stato e mappa leggono. */
export interface AzioneClassificata { tipo: string; riferimento: { tipo: string; chiave: string } | null; rangoAtteso: number | null; /** MM-GG della voce, se è di un giorno. */ giorno?: string }

/** R10-17/4: se il passaggio a quel rango è stato segnato a mano dalla pagina Confidenti, la voce del Diario lo dice (con il giorno di gioco
 *  in cui è stato segnato); altrimenti niente. Lettura soltanto. */
function correzioneARango(partitaId: number | undefined, confidente: string, rango: number): string {
  if (partitaId === undefined) return '';
  const r = prepared("SELECT data, fascia FROM incontro_confidente_partita WHERE partita_id = ? AND confidente_chiave = ? AND passaggio = 1 AND verso_rango = ? AND origine = 'pagina' ORDER BY id DESC LIMIT 1")
    .get(partitaId, confidente, rango) as { data: string; fascia: string } | undefined;
  return r ? ` — segnato a mano dalla pagina Confidenti${r.data ? ` il ${r.data}${r.fascia ? ` (${r.fascia})` : ''}` : ''}` : '';
}

/** Stato dell'azione nella partita (12.4): per gli incontri con un Confidente valuta i semafori del rango atteso (o del prossimo). */
export function statoAzione(a: AzioneClassificata, conf: Map<string, ConfidentePartitaDto>, partitaId?: number): StatoAzioneDto {
  if (a.tipo !== 'confidente' || a.riferimento?.tipo !== 'confidente') return { tipo: 'neutra', motivo: null };
  const c = conf.get(a.riferimento.chiave);
  if (!c) return { tipo: 'neutra', motivo: null };
  const atteso = a.rangoAtteso ?? null;
  // senza rango atteso la voce non prevede una salita di rango: nessuna frase sui requisiti del rango successivo (scelta dell'utente,
  // 2026-10-24: «non serve visualizzare nessuna frase per supportare la salita di rango»)
  if (atteso === null) return { tipo: 'neutra', motivo: null };
  if (c.rango >= atteso) return { tipo: 'neutra', motivo: `rango ${atteso} già raggiunto${correzioneARango(partitaId, c.chiave, atteso)}` };
  if (!c.sbloccato && atteso > 1) return { tipo: 'bloccata', motivo: 'Confidente non ancora sbloccato nella partita' };
  const obiettivo = atteso;
  // Solo il semaforo del rango obiettivo: un rango senza requisiti e libero (non si ripiega sul rango successivo).
  const sem = c.semafori.find((s) => s.rango === obiettivo);
  if (!sem || sem.requisiti.length === 0) return { tipo: 'neutra', motivo: null };
  // un requisito non bloccante (`bloccante === false`: le avvertenze, e il semaforo «Giorno e fascia dell'incontro», che parla di oggi e non della data della voce)
  // può essere rosso senza che la voce sia «Bloccata»: la disponibilità è sempre un avviso (nel Diario l'avviso «Fuori giorno» usa la data della voce)
  const rossi = sem.requisiti.filter((r) => r.stato === 'rosso' && r.bloccante !== false);
  if (rossi.length > 0) return { tipo: 'bloccata', motivo: rossi.map((r) => (r.dettaglio ? `${r.testo} (${r.dettaglio})` : r.testo)).join(' · ') };
  if (sem.pronto || sem.requisiti.every((r) => r.stato === 'verde')) return { tipo: 'consigliata', motivo: `requisiti del rango ${sem.rango} soddisfatti` };
  // le avvertenze (`bloccante: false`) non sono «da confermare»: si controllano nel gioco e non fermano niente
  const grigi = sem.requisiti.filter((r) => r.stato === 'grigio' && r.bloccante !== false);
  return { tipo: 'neutra', motivo: grigi.length > 0 ? `da confermare: ${grigi.map((r) => r.testo).join(' · ')}` : null };
}

/** Mappa (e spillo) del luogo dell'azione: Palazzo → la sua destinazione del giorno (`destinazionePalazzo`: la regola d'atterraggio, o
 *  l'ingresso: lo spillo in città, o la prima planimetria), richiesta → l'ingresso dei Mementos, negozio/Confidente → spillo del luogo in città. Con `posto`, il nome del posto del
 *  pin (L5, M23). */
export function mappaAzione(a: AzioneClassificata): { chiave: string; spilloId: number | null; posto?: string | null } | null {
  const m = mappaAzioneSenzaPosto(a);
  return m ? { ...m, posto: postoDelPin(m.chiave, m.spilloId) } : null;
}

function mappaAzioneSenzaPosto(a: AzioneClassificata): { chiave: string; spilloId: number | null } | null {
  const r = a.riferimento;
  // L6 (R6-17): la destinazione unica del Palazzo (regola d'atterraggio del giorno, o l'ingresso), la stessa della metro
  if (r?.tipo === 'dungeon') return destinazionePalazzo(r.chiave, a.giorno);
  if (r?.tipo === 'richiesta' || a.tipo === 'richiesta') return destinazionePalazzo('mementos', a.giorno);
  if (r?.tipo === 'negozio') {
    const s = prepared(`SELECT id, mappa_chiave FROM spillo WHERE (riferimento_tipo = 'negozio' AND riferimento_chiave = ?)
      OR (riferimento_tipo = 'luogo' AND riferimento_chiave IN (SELECT sede_chiave FROM negozio WHERE chiave = ? AND sede_chiave IS NOT NULL)) ORDER BY id LIMIT 1`).get(r.chiave, r.chiave) as { id: number; mappa_chiave: string } | undefined;
    return s ? { chiave: s.mappa_chiave, spilloId: s.id } : null;
  }
  if (r?.tipo === 'confidente') {
    const s = prepared(`SELECT s.id, s.mappa_chiave FROM spillo s WHERE (s.riferimento_tipo = 'confidente' AND s.riferimento_chiave = ?)
      OR (s.riferimento_tipo = 'luogo' AND s.riferimento_chiave IN (SELECT chiave FROM luogo WHERE nascosto = 0 AND confidenti_json LIKE ?)) ORDER BY s.id LIMIT 1`).get(r.chiave, `%"${r.chiave}"%`) as { id: number; mappa_chiave: string } | undefined;
    return s ? { chiave: s.mappa_chiave, spilloId: s.id } : null;
  }
  return null;
}

/** Il nome dell'elemento collegato, come lo scrive la guida («Tae Takemi - Morte»); 400 se il collegamento non esiste.
 *  Un libro, un film, un'attività o un negozio nascosti dal catalogo non si collegano (collegamento nuovo); per **leggere** il
 *  nome di un collegamento che la voce ha già, `ancheNascosti` li trova lo stesso: nasconderli non toglie il nome alle voci. */
export function nomeRiferimento(rif: { tipo: string; chiave: string }, opz: { ancheNascosti?: boolean } = {}): string {
  if (!TIPI_RIFERIMENTO.has(rif.tipo)) throw httpErrors.badRequest('riferimento-non-valido', `Non si collega un'azione a «${rif.tipo}».`);
  const visibile = opz.ancheNascosti ? '' : ' AND nascosto = 0';
  const riga = ((): { nome: string } | undefined => {
    switch (rif.tipo) {
      case 'confidente': {
        const c = prepared('SELECT nome, arcana FROM confidente WHERE chiave = ?').get(rif.chiave) as { nome: string; arcana: string } | undefined;
        return c ? { nome: `${c.nome} - ${t('arcana', c.arcana)}` } : undefined;
      }
      case 'dungeon': return prepared('SELECT nome FROM dungeon WHERE chiave = ?').get(rif.chiave) as { nome: string } | undefined;
      case 'richiesta': return prepared('SELECT nome FROM richiesta WHERE chiave = ?').get(rif.chiave) as { nome: string } | undefined;
      case 'libro': case 'film': case 'attivita': {
        const r = prepared(titoliLettura(rif.tipo, `WHERE l.chiave = ?${opz.ancheNascosti ? '' : ' AND l.nascosto = 0'}`)).get(rif.chiave) as { titolo_corrente: string } | undefined;
        return r ? { nome: r.titolo_corrente } : undefined;
      }
      case 'negozio': return prepared(`SELECT nome FROM negozio WHERE chiave = ?${visibile}`).get(rif.chiave) as { nome: string } | undefined;
      case 'dote': return prepared('SELECT nome FROM dote_sociale WHERE chiave = ?').get(rif.chiave) as { nome: string } | undefined;
      default: return undefined;
    }
  })();
  if (!riga) throw httpErrors.badRequest('riferimento-inesistente', `Il collegamento «${rif.tipo}: ${rif.chiave}» non esiste nella guida.`);
  return riga.nome;
}

/** Effetti validi e che puntano a elementi esistenti; 400 con il motivo altrimenti (una voce storta non si butta in silenzio). */
export function verificaEffetti(grezzi: unknown[]): EffettoAzione[] {
  const produce = normalizzaEffettiAzione(grezzi);
  if (produce.length !== grezzi.length) throw httpErrors.badRequest('effetto-non-valido', 'Uno degli effetti non è valido: controlla Dote e note (1–3), la lettura o il turno.');
  for (const e of produce) {
    if (e.tipo === 'lettura') {
      const esiste = e.categoria === 'libro' ? prepared('SELECT 1 FROM libro WHERE chiave = ? AND nascosto = 0').get(e.chiave)
        : e.categoria === 'film' ? prepared('SELECT 1 FROM film WHERE chiave = ? AND nascosto = 0').get(e.chiave)
          : prepared("SELECT 1 FROM attivita WHERE chiave = ? AND tipo = 'videogioco' AND nascosto = 0").get(e.chiave);
      if (!esiste) throw httpErrors.badRequest('effetto-inesistente', `La lettura «${e.chiave}» non esiste nella guida.`);
    } else if (e.tipo === 'turno') {
      const a = prepared('SELECT tipo, tracciamento, confidente_chiave,pesca_regola_chiave FROM attivita WHERE chiave = ? AND nascosto = 0').get(e.attivita) as { tipo: string; tracciamento: string; confidente_chiave: string | null;pesca_regola_chiave:string|null } | undefined;
      if (!a) throw httpErrors.badRequest('effetto-inesistente', `L'attività «${e.attivita}» non esiste nella guida.`);
      if (a.confidente_chiave) throw httpErrors.conflict('attivita-fonte-confidente', 'L’attività collegata a un Confidente non genera un turno autonomo.');
      if(a.pesca_regola_chiave)throw httpErrors.conflict('attivita-fonte-pesca','L’attività collegata alla pesca richiede il suo effetto canonico, senza un secondo turno generico.');
      if ((eTracciamentoAttivita(a.tracciamento) ? a.tracciamento : tracciamentoPerTipo(a.tipo)) !== 'svolta') {
        throw httpErrors.badRequest('effetto-non-valido', `L'attività «${e.attivita}» non si conta per volte: non ha turni.`);
      }
      // L13: con gli esiti dichiarati le Doti del turno sono quelle dell'esito (un solo punto): niente Doti proprie, e l'esito atteso deve esistere
      const esiti = leggiEsitiAttivita((prepared('SELECT * FROM attivita WHERE chiave = ?').get(e.attivita) as { esiti_json?: string | null }).esiti_json);
      if (esiti && e.doti?.length) throw httpErrors.badRequest('turno-doti-con-esiti', `L'attività «${e.attivita}» dichiara i suoi esiti: le Doti del turno vengono dall'esito scelto, non si scrivono nella voce.`);
      if (e.esito && !esiti?.esiti.some((x) => x.chiave === e.esito)) throw httpErrors.badRequest('esito-sconosciuto', `L'attività «${e.attivita}» non dichiara l'esito «${e.esito}».`);
      if (e.esito && esiti?.modo === 'automatico') throw httpErrors.badRequest('esito-automatico', `L'attività «${e.attivita}» ricava l'esito dal giorno: la voce non ne indica uno.`);
    }
  }
  return produce;
}

/** L13: i nomi degli esiti («attività/esito») e il modo di ogni attività che li dichiara, per la frase del turno. */
function nomiEsiti(): Pick<NomiEffettiAzione, 'esiti' | 'modiEsiti'> {
  const esiti: Record<string, string> = {}, modiEsiti: Record<string, 'scelta' | 'automatico'> = {};
  // `SELECT *`: su uno schema di prima della 233 la colonna non c'è e nessuna attività ha esiti
  for (const r of prepared('SELECT * FROM attivita').all() as Array<{ chiave: string; esiti_json?: string | null }>) {
    const e = leggiEsitiAttivita(r.esiti_json);
    if (!e) continue;
    modiEsiti[r.chiave] = e.modo;
    for (const x of e.esiti) esiti[`${r.chiave}/${x.chiave}`] = x.nome;
  }
  return { esiti, modiEsiti };
}

/** I nomi di libri, film, videogiochi e attività per descrivere gli effetti: una lettura per richiesta. */
export function nomiEffetti(): NomiEffettiAzione {
  /** Esegue la query (che deve dare `chiave` e `nome`) e ne fa un oggetto chiave → nome. */
  const mappa = (sql: string) => Object.fromEntries((prepared(sql).all() as Array<{ chiave: string; nome: string }>).map((r) => [r.chiave, r.nome]));
  return {
    libri: mappa(`SELECT chiave,titolo_corrente AS nome FROM (${titoliLettura('libro')})`),
    film: mappa(`SELECT chiave,titolo_corrente AS nome FROM (${titoliLettura('film')})`),
    videogiochi: mappa(`SELECT chiave,titolo_corrente AS nome FROM (${titoliLettura('attivita', "WHERE l.tipo = 'videogioco'")})`),
    attivita: mappa(`SELECT chiave,titolo_corrente AS nome FROM (${titoliLettura('attivita')})`),
    ...nomiEsiti(),
  };
}

/** Il nome dell'articolo come lo vede l'utente: quello del catalogo (la colonna `nome` dell'articolo può essere vuota), altrimenti la chiave. */
const SQL_ARTICOLO = "SELECT COALESCE(NULLIF(c.nome, ''), NULLIF(a.nome, ''), a.chiave) AS nome, a.prezzo FROM articolo a LEFT JOIN catalogo_oggetto c ON c.chiave = a.catalogo_chiave WHERE a.chiave = ?";
export const articoloConNome = (chiave: string): { nome: string; prezzo: number | null } | undefined => prepared(SQL_ARTICOLO).get(chiave) as { nome: string; prezzo: number | null } | undefined;

/**
 * R12-01/1: i nomi per scrivere le frasi degli effetti che citano il loro oggetto per chiave o per id (domanda, Richiesta, articolo,
 * invito, Persona). Una ricerca per volta sulla riga che serve: le stesse fonti degli elenchi `elenchiEffettiVoce` che la pagina usa
 * negli editor, così la frase è la stessa in ogni vista (`fraseEffettoConNomi`).
 */
export function nomiFraseEffetto(): NomiFraseEffetto {
  return {
    domanda: (id) => (prepared('SELECT domanda FROM domanda WHERE id = ?').pluck().get(id) as string | undefined) ?? undefined,
    richiesta: (chiave) => (prepared('SELECT nome FROM richiesta WHERE chiave = ?').pluck().get(chiave) as string | undefined) ?? undefined,
    articolo: articoloConNome,
    invito: (chiave) => {
      const r = prepared('SELECT c.nome AS confidenteNome, i.data FROM confidente_invito i JOIN confidente c ON c.chiave = i.confidente_chiave WHERE i.chiave = ?').get(chiave) as { confidenteNome: string; data: string | null } | undefined;
      return r ?? undefined;
    },
    persona: (id) => (prepared('SELECT nome FROM persona WHERE id = ?').pluck().get(id) as string | undefined) ?? undefined,
    oggetto: (chiave) => (prepared('SELECT nome FROM catalogo_oggetto WHERE chiave = ?').pluck().get(chiave) as string | undefined) ?? undefined,
    trofeo: (chiave) => (prepared('SELECT nome FROM trofeo WHERE chiave = ?').pluck().get(chiave) as string | undefined) ?? undefined,
    attivita: (chiave) => (prepared('SELECT nome FROM attivita WHERE chiave = ?').pluck().get(chiave) as string | undefined) ?? undefined,
  };
}

/** La frase di ogni effetto, nello stesso ordine, con i nomi presi da `nomi`. */
export function testoEffetti(produce: EffettoAzione[], nomi: NomiEffettiAzione): string[] {
  return produce.map((e) => descriviEffettoAzione(e, nomi));
}

/** Gli elenchi da cui la finestra dell'azione sceglie collegamento ed effetti: gli stessi elementi che `nomeRiferimento` e
 *  `verificaEffetti` accettano (le attività con i turni sono quelle contate per volte). */
export function elenchiAzione(): ElenchiAzioneDto {
  /** Le righe della query: `chiave`, `nome` e, se la query lo dà, `dettaglio`. */
  const voci = (sql: string) => prepared(sql).all() as Array<{ chiave: string; nome: string; dettaglio?: string | null }>;
  /** Le stesse righe senza `dettaglio` quando è vuoto o nullo, così il campo compare solo se ha un valore. */
  const pulite = (r: Array<{ chiave: string; nome: string; dettaglio?: string | null }>) => r.map((x) => ({ chiave: x.chiave, nome: x.nome, ...(x.dettaglio ? { dettaglio: x.dettaglio } : {}) }));
  // `*` e poi `titolo_corrente`: su uno schema di prima della 233 `esiti_json` non c'è (nessun esito)
  const attivita = (prepared(`SELECT * FROM (${titoliLettura('attivita', 'WHERE l.nascosto = 0 ORDER BY l.ordine')})`).all() as Array<{ chiave: string; titolo_corrente: string; tipo: string; tracciamento: string; confidente_chiave: string | null; esiti_json?: string | null }>)
    .map((a) => ({ ...a, nome: a.titolo_corrente, esiti_json: a.esiti_json ?? null }));
  // L13: gli esiti di ogni attività, per scegliere nella voce l'esito atteso del turno (solo nel modo «scelta»)
  const esitiDi = (json: string | null) => { const e = leggiEsitiAttivita(json); return e ? { esiti: { modo: e.modo, elenco: e.esiti.map((x) => ({ chiave: x.chiave, nome: x.nome })) } } : {}; };
  // L13 (decisione 2): gli yen che film, attività e Richieste portano già (`yenDeiDati`, la stessa definizione del controllo del server), perché
  // l'editor della voce avvisi subito di un effetto «yen» che li conterebbe due volte
  const yenDi = (tabella: DatoConYen): Map<string, number> => new Map((prepared(`SELECT chiave, ${SQL_YEN_DEL_DATO[tabella]} AS yen FROM ${tabella}`).all() as Array<{ chiave: string; yen: number | null }>)
    .flatMap((r) => (typeof r.yen === 'number' && r.yen > 0 ? [[r.chiave, r.yen] as [string, number]] : [])));
  const conYen = <T extends { chiave: string }>(elenco: T[], yen: Map<string, number>): Array<T & { yen?: number }> => elenco.map((x) => (yen.has(x.chiave) ? { ...x, yen: yen.get(x.chiave)! } : x));
  const yenFilm = yenDi('film'), yenAttivita = yenDi('attivita'), yenRichieste = yenDi('richiesta');
  return {
    confidenti: (prepared('SELECT chiave, nome, arcana FROM confidente ORDER BY ordine').all() as Array<{ chiave: string; nome: string; arcana: string }>).map((c) => ({ chiave: c.chiave, nome: c.nome, dettaglio: t('arcana', c.arcana) })),
    dungeon: pulite(voci('SELECT chiave, nome FROM dungeon ORDER BY ordine')),
    richieste: conYen(pulite(voci('SELECT chiave, nome, committente AS dettaglio FROM richiesta ORDER BY ordine')), yenRichieste),
    libri: pulite(voci(`SELECT chiave,titolo_corrente AS nome,${catalogoOggettiDisponibile() ? 'NULL' : 'dove'} AS dettaglio FROM (${titoliLettura('libro', 'WHERE l.nascosto = 0 ORDER BY l.ordine')})`)),
    film: conYen(pulite(voci(`SELECT chiave,titolo_corrente AS nome,CASE dove WHEN 'cinema' THEN 'Cinema' ELSE 'DVD' END AS dettaglio FROM (${titoliLettura('film', 'WHERE l.nascosto = 0 ORDER BY l.ordine')})`)), yenFilm),
    videogiochi: attivita.filter((a) => a.tipo === 'videogioco').map((a) => ({ chiave: a.chiave, nome: a.nome })),
    attivita: attivita.map((a) => ({ chiave: a.chiave, nome: a.nome, ...(yenAttivita.has(a.chiave) ? { yen: yenAttivita.get(a.chiave)! } : {}), turni: !a.confidente_chiave && (eTracciamentoAttivita(a.tracciamento) ? a.tracciamento : tracciamentoPerTipo(a.tipo)) === 'svolta', ...(a.confidente_chiave ? {} : esitiDi(a.esiti_json)) })),
    negozi: pulite(voci('SELECT chiave, nome, luogo AS dettaglio FROM negozio WHERE nascosto = 0 ORDER BY ordine')),
    doti: pulite(voci('SELECT chiave, nome FROM dote_sociale ORDER BY ordine')),
  };
}

/** Il giorno «MM-GG» in cui solo si compra un articolo: un «intervallo» di un giorno fra le sue condizioni (i set delle televendite); null se no. */
function giornoUnico(json: string | null): string | null {
  const g = leggiCondizioniSalvate(json).find((c): c is Extract<RequisitoSpillo, { tipo: 'intervallo' }> => c.tipo === 'intervallo' && c.dal === c.al);
  return g ? g.dal : null;
}

/** Gli elenchi per scegliere per nome gli oggetti che gli effetti di una voce citano con una chiave interna: gli stessi che
 *  `verificaEffettoDiStato` accetta (l'Aojiru ha il suo effetto, quindi non è fra gli articoli). Sola lettura. */
export function elenchiEffettiVoce(): ElenchiEffettiVoceDto {
  // L13 (decisione 4): con le alternative (le condizioni «non: articolo ottenuto», in tutte e due le direzioni), il giorno unico in cui si compra
  // e il contenuto; un articolo nascosto resta per il suo nome (una voce che lo cita ancora lo mostra) ma l'editor non lo propone
  const incompatibili = mappaIncompatibili();
  const righe = prepared(`SELECT a.chiave, COALESCE(NULLIF(c.nome, ''), NULLIF(a.nome, ''), a.chiave) AS nome, a.negozio_chiave AS negozio, n.nome AS negozioNome, a.prezzo, a.catalogo_chiave AS catalogoChiave, a.nascosto, a.condizioni_json
    FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave AND n.nascosto = 0 LEFT JOIN catalogo_oggetto c ON c.chiave = a.catalogo_chiave ORDER BY n.ordine, a.ordine`).all() as Array<{ chiave: string; nome: string; negozio: string; negozioNome: string; prezzo: number | null; catalogoChiave: string | null; nascosto: number; condizioni_json: string | null }>;
  const contenuti = contenutoArticoli(righe.map((a) => a.chiave));
  const articoli = righe
    .filter((a) => !eOffertaAojiru({ chiave: a.chiave, catalogoChiave: a.catalogoChiave }))
    .map(({ catalogoChiave: _scartata, nascosto, condizioni_json, ...a }) => {
      const giorno = giornoUnico(condizioni_json);
      const altri = incompatibili.get(a.chiave), contenuto = contenuti.get(a.chiave);
      return { ...a, ...(nascosto ? { nascosto: true as const } : {}), ...(altri?.length ? { incompatibili: [...altri] } : {}), ...(giorno ? { giorno } : {}), ...(contenuto?.length ? { contenuto } : {}) };
    });
  return {
    articoli,
    domande: (prepared('SELECT id, data AS giorno, domanda AS testo, tipo FROM domanda ORDER BY ordine').all() as ElenchiEffettiVoceDto['domande']),
    cruciverba: prepared('SELECT data, indizio FROM cruciverba ORDER BY ordine').all() as ElenchiEffettiVoceDto['cruciverba'],
    inviti: prepared(`SELECT i.chiave, i.confidente_chiave AS confidente, c.nome AS confidenteNome, i.data, i.nota FROM confidente_invito i JOIN confidente c ON c.chiave = i.confidente_chiave ORDER BY c.ordine, i.data`).all() as ElenchiEffettiVoceDto['inviti'],
    persone: (prepared('SELECT id, nome, arcana, livello FROM persona ORDER BY nome').all() as Array<{ id: number; nome: string; arcana: string; livello: number }>).map((p) => ({ ...p, nomeIt: t('persona', p.nome), arcana: t('arcana', p.arcana) })),
    // L13 (ondata 3): gli oggetti del catalogo visibili e i trofei, scelti per nome negli effetti «oggetto ricevuto» e «trofeo»
    oggetti: prepared('SELECT chiave, nome, categoria FROM catalogo_oggetto WHERE nascosto = 0 ORDER BY nome').all() as NonNullable<ElenchiEffettiVoceDto['oggetti']>,
    trofei: prepared('SELECT chiave, nome, tipo FROM trofeo ORDER BY ordine').all() as NonNullable<ElenchiEffettiVoceDto['trofei']>,
  };
}
