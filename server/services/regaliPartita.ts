// La chiave identifica il regalo; nome e data della consegna restano quelli storici.
//
// Ondata 5 (decisione 21 dell'utente, «regalo ripetibile con consumo di copie»; utente 052): ogni consegna è una riga con il suo `id`, anche la
// seconda dello stesso oggetto allo stesso Confidente. L'azione «Regala» scrive e toglie una consegna alla volta (`inserisciConsegna`,
// `togliConsegna`); il vecchio comando per nome (`scriviRegaloPartita`, la spunta dei regali senza oggetto del catalogo) resta com'era: una
// consegna per nome, e togliendo si tolgono le consegne di quel nome. Il movimento automatico degli yen di ogni consegna ha la sua causa
// (`causa_yen`): le consegne di prima della 052 quella di sempre («Confidente:nome storico»), le nuove una propria con il loro `id`.
import { nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { nomiAltriOggetto } from './catalogoOggettiLetture.js';
import { causaYenRegalo, liberaRegaloDiPrima, nataPrimaDegliYenAutomatici, restituisciYenAutomatico, segnaRegaloDiPrimaTolto, type CausaYen } from './yenAutomaticiService.js';
import type { ModoRegalo } from '../../shared/regali.js';

/** La consegna di prima degli yen automatici che aveva segnato anche l'acquisto: l'oggetto e il momento di gioco della consegna. */
interface ConsegnaDiPrima { catalogo: string; data: string | null; fascia: string | null }

/** Una riga di `regalo_partita` con quel che serve per toglierla (le colonne mancanti di un file vecchio valgono null). */
interface RigaConsegna {
  rid: number; id: number | null; confidente_chiave: string; regalo: string; fatto_at: string; catalogo_chiave: string | null; acquisto_articolo: string | null;
  data_gioco: string | null; fascia_gioco: string | null; causa_yen: string | null;
}

const colonne = (): Set<string> => new Set((prepared('PRAGMA utente.table_info(regalo_partita)').all() as Array<{ name: string }>).map((c) => c.name));
/** Il file delle partite ha le consegne ripetibili (utente 052). */
export const consegneRipetibili = (): boolean => colonne().has('id');

/** Le colonne di una consegna, con null dove il file non le ha ancora. */
function selezione(): string {
  const c = colonne();
  const o = (nome: string) => (c.has(nome) ? nome : `NULL AS ${nome}`);
  return `rowid AS rid, ${o('id')}, confidente_chiave, regalo, fatto_at, ${o('catalogo_chiave')}, ${o('acquisto_articolo')}, ${o('data_gioco')}, ${o('fascia_gioco')}, ${o('causa_yen')}`;
}

/** La causa del movimento automatico degli yen della consegna: la sua, o quella di sempre per le consegne di prima della 052. */
export function causaDellaConsegna(r: { confidente_chiave: string; regalo: string; causa_yen: string | null }): CausaYen {
  return r.causa_yen ? { tipo: 'regalo', chiave: r.causa_yen } : causaYenRegalo(r.confidente_chiave, r.regalo);
}

/**
 * La consegna, se era di prima degli yen automatici e aveva segnato anche l'acquisto dell'articolo (colonne della 035; su un file più vecchio
 * nessuna consegna lo ricorda): solo allora il suo prezzo era nel saldo di allora (senza acquisto non c'era niente da pagare). Da leggere
 * prima di toglierla.
 */
function consegnaDiPrima(r: RigaConsegna): ConsegnaDiPrima | null {
  return r.acquisto_articolo && r.catalogo_chiave && nataPrimaDegliYenAutomatici(r.fatto_at) ? { catalogo: r.catalogo_chiave, data: r.data_gioco, fascia: r.fascia_gioco } : null;
}

/**
 * L13 (decisione 18): la consegna tolta, per qualunque strada, porta con sé il prezzo che il regalo aveva scalato da solo: torna ciò che era
 * stato scalato. Una consegna di prima degli yen automatici con l'acquisto non ha movimento (il suo prezzo era già nel saldo): si segna con
 * l'oggetto e il momento di gioco, così ridando lo stesso oggetto nello stesso momento il saldo non cambia, e in un altro momento si paga.
 */
function togliRiga(partita: number, r: RigaConsegna): void {
  const diPrima = consegnaDiPrima(r);
  prepared('DELETE FROM regalo_partita WHERE rowid = ? AND partita_id = ?').run(r.rid, partita);
  if (diPrima) segnaRegaloDiPrimaTolto(partita, r.confidente_chiave, diPrima.catalogo, diPrima.data, diPrima.fascia);
  // ondata 5 (revisione): la consegna che aveva usato il segno di quella di prima (ridata nello stesso momento senza scalare il prezzo) lo
  // rende: il prezzo è ancora nel saldo, e ridando lo stesso oggetto in quel momento di nuovo non si scala
  if (r.id !== null) liberaRegaloDiPrima(partita, r.id);
  restituisciYenAutomatico(partita, causaDellaConsegna(r), 'regalo-tolto');
}

export type SceltaRegalo = string | { catalogo: string };
export interface RegaloDellaPartita {
  /** L'id della consegna (utente 052); null su un file più vecchio. */
  id: number | null;
  confidente: string; nome: string; catalogo: string | null;
  /** La consegna ha usato una copia posseduta (utente 052). */
  copiaConsumata: boolean;
  modo: ModoRegalo;
  /** Il momento di gioco della consegna (colonne della 035; null se non registrato). */
  dataGioco: string | null;
  fasciaGioco: string | null;
}

/** Compatibilità durante la preparazione di M7 e con un file delle partite ancora precedente alla 026. */
function chiaviDisponibili(): boolean {
  return !!prepared("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'catalogo_oggetto'").get()
    && colonne().has('catalogo_chiave');
}

/** Solo nomi esatti attestati per quel Confidente: nessuna somiglianza e nessuna scelta fra omonimi. */
function nomiDeiRegali(confidente?: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const righe = prepared(`SELECT g.confidente_chiave,g.nome AS nome_storico,c.chiave,c.nome,c.nomi_altri_json
    FROM confidente_regalo g JOIN catalogo_oggetto c ON c.chiave = g.catalogo_chiave
    ${confidente === undefined ? '' : 'WHERE g.confidente_chiave = ?'}`).all(...(confidente === undefined ? [] : [confidente])) as Array<{
      confidente_chiave: string; nome_storico: string; chiave: string; nome: string; nomi_altri_json: string;
    }>;
  for (const r of righe) for (const nome of [r.nome_storico, r.nome, ...nomiAltriOggetto(r.nomi_altri_json)]) {
    const indice = JSON.stringify([r.confidente_chiave, nome]);
    const chiavi = out.get(indice) ?? new Set<string>(); chiavi.add(r.chiave); out.set(indice, chiavi);
  }
  return out;
}

function chiaveUnivoca(nomi: Map<string, Set<string>>, confidente: string, nome: string): string | null {
  const chiavi = nomi.get(JSON.stringify([confidente, nome]));
  return chiavi?.size === 1 ? [...chiavi][0] : null;
}

/** Dopo 026 vale il riferimento salvato. Un riferimento scollegato non viene reinterpretato per nome. Una riga per consegna, dalla più vecchia. */
export function regaliDellaPartita(partita: number, confidente?: string): RegaloDellaPartita[] {
  const conChiavi = chiaviDisponibili();
  const c = colonne();
  const righe = prepared(`SELECT ${c.has('id') ? 'id' : 'NULL AS id'}, confidente_chiave, regalo, ${conChiavi ? 'catalogo_chiave' : 'NULL AS catalogo_chiave'},
      ${c.has('copia_consumata') ? 'copia_consumata' : '0 AS copia_consumata'}, ${c.has('modo') ? 'modo' : "'consegna' AS modo"},
      ${c.has('data_gioco') ? 'data_gioco' : 'NULL AS data_gioco'}, ${c.has('fascia_gioco') ? 'fascia_gioco' : 'NULL AS fascia_gioco'}
    FROM regalo_partita WHERE partita_id = ?${confidente === undefined ? '' : ' AND confidente_chiave = ?'} ORDER BY fatto_at, rowid`)
    .all(partita, ...(confidente === undefined ? [] : [confidente])) as Array<{ id: number | null; confidente_chiave: string; regalo: string; catalogo_chiave: string | null; copia_consumata: number; modo: string;
      data_gioco: string | null; fascia_gioco: string | null }>;
  return righe.map((r) => ({ id: r.id, confidente: r.confidente_chiave, nome: r.regalo, catalogo: r.catalogo_chiave, copiaConsumata: r.copia_consumata === 1,
    modo: r.modo === 'cartolina' ? 'cartolina' : 'consegna', dataGioco: r.data_gioco, fasciaGioco: r.fascia_gioco }));
}

/** Ondata 5: i dati di una consegna nuova dell'azione «Regala». */
export interface NuovaConsegna {
  catalogo: string; nome: string; puntiDati: number | null; rangoAlRegalo: number | null; acquistoArticolo: string | null; registroId: number | null;
  dataGioco: string | null; fasciaGioco: string | null; copiaConsumata: boolean; modo: ModoRegalo;
}

/**
 * Ondata 5: scrive una consegna nuova (anche dello stesso oggetto allo stesso Confidente) e ne restituisce l'id e la causa degli yen. Dentro la
 * transazione dell'azione. Su un file di prima della 052 lo stesso oggetto si consegna una volta sola (409, come prima).
 */
export function inserisciConsegna(partita: number, confidente: string, n: NuovaConsegna): { id: number; causa: CausaYen } {
  if (!consegneRipetibili()) {
    if (prepared('SELECT 1 FROM regalo_partita WHERE partita_id = ? AND confidente_chiave = ? AND regalo = ?').get(partita, confidente, n.nome))
      throw httpErrors.conflict('regalo-gia-consegnato', `«${n.nome}» risulta già consegnato: il file delle partite va aggiornato per ridarlo.`);
    const c = colonne();
    const extra = c.has('punti_dati');
    const rid = Number(prepared(`INSERT INTO regalo_partita (partita_id, confidente_chiave, regalo, catalogo_chiave, fatto_at${extra ? ', punti_dati, rango_al_regalo, acquisto_articolo, data_gioco, fascia_gioco' : ''})
      VALUES (?, ?, ?, ?, ?${extra ? ', ?, ?, ?, ?, ?' : ''})`).run(partita, confidente, n.nome, n.catalogo, nowIso(), ...(extra ? [n.puntiDati, n.rangoAlRegalo, n.acquistoArticolo, n.dataGioco, n.fasciaGioco] : [])).lastInsertRowid);
    return { id: rid, causa: causaYenRegalo(confidente, n.nome) };
  }
  const id = Number(prepared(`INSERT INTO regalo_partita (partita_id, confidente_chiave, regalo, catalogo_chiave, fatto_at, punti_dati, rango_al_regalo, acquisto_articolo,
      data_gioco, fascia_gioco, registro_id, copia_consumata, modo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(partita, confidente, n.nome, n.catalogo, nowIso(), n.puntiDati, n.rangoAlRegalo, n.acquistoArticolo, n.dataGioco, n.fasciaGioco, n.registroId, n.copiaConsumata ? 1 : 0, n.modo).lastInsertRowid);
  // la causa porta il nome storico (resta uguale se l'oggetto si fonde o si elimina) e l'id: due consegne dello stesso oggetto hanno due movimenti
  const causa = `${confidente}:${n.nome}#${id}`;
  prepared('UPDATE regalo_partita SET causa_yen = ? WHERE id = ?').run(causa, id);
  return { id, causa: { tipo: 'regalo', chiave: causa } };
}

/** Ondata 5: la consegna da annullare: quella con `id`, o l'ultima di quell'oggetto a quel Confidente. */
export function consegnaDaAnnullare(partita: number, confidente: string, catalogo: string, id?: number): (RigaConsegna & { punti_dati: number | null; rango_al_regalo: number | null; registro_id: number | null; modo: string }) | undefined {
  const c = colonne();
  const o = (nome: string) => (c.has(nome) ? nome : `NULL AS ${nome}`);
  const campi = `${selezione()}, ${o('punti_dati')}, ${o('rango_al_regalo')}, ${o('registro_id')}, ${c.has('modo') ? 'modo' : "'consegna' AS modo"}`;
  if (id !== undefined) {
    if (!c.has('id')) return undefined;
    return prepared(`SELECT ${campi} FROM regalo_partita WHERE partita_id = ? AND confidente_chiave = ? AND catalogo_chiave = ? AND id = ?`).get(partita, confidente, catalogo, id) as ReturnType<typeof consegnaDaAnnullare>;
  }
  return prepared(`SELECT ${campi} FROM regalo_partita WHERE partita_id = ? AND confidente_chiave = ? AND catalogo_chiave = ? ORDER BY fatto_at DESC, rowid DESC LIMIT 1`)
    .get(partita, confidente, catalogo) as ReturnType<typeof consegnaDaAnnullare>;
}

/** Ondata 5: toglie una consegna sola, con il suo prezzo scalato da solo (decisione 18). Dentro la transazione di chi chiama. */
export function togliConsegna(partita: number, riga: RigaConsegna): void {
  togliRiga(partita, riga);
}

/** Si usa nella transazione del gesto esistente; non aggiunge punti né eventi allo storico. Il vecchio comando: una consegna per nome. */
export function scriviRegaloPartita(partita: number, confidente: string, scelta: SceltaRegalo, fatto: boolean): void {
  const conChiavi = chiaviDisponibili();
  const nomeLegacy = typeof scelta === 'string' ? scelta.trim() : null;
  if (nomeLegacy !== null && !nomeLegacy) throw httpErrors.badRequest('regalo-vuoto', 'Indica il nome del regalo.');
  const righeDi = (): RigaConsegna[] => prepared(`SELECT ${selezione()} FROM regalo_partita WHERE partita_id = ? AND confidente_chiave = ?`).all(partita, confidente) as RigaConsegna[];
  if (!conChiavi) {
    if (nomeLegacy === null) throw httpErrors.conflict('catalogo-non-disponibile', 'Il catalogo dei regali non è ancora disponibile.');
    if (fatto) {
      if (!righeDi().some((r) => r.regalo === nomeLegacy)) prepared('INSERT INTO regalo_partita (partita_id,confidente_chiave,regalo,fatto_at) VALUES (?,?,?,?)').run(partita, confidente, nomeLegacy, nowIso());
    } else {
      for (const r of righeDi().filter((x) => x.regalo === nomeLegacy)) togliRiga(partita, r);
    }
    return;
  }

  const nomi = nomiDeiRegali(confidente);
  const righe = righeDi();
  // Il riferimento già salvato prevale su un'associazione della guida cambiata nel frattempo.
  const storica = nomeLegacy === null ? undefined : righe.find((r) => r.regalo === nomeLegacy);
  const catalogo = typeof scelta === 'string' ? storica ? storica.catalogo_chiave : chiaveUnivoca(nomi, confidente, nomeLegacy!) : scelta.catalogo;
  const oggetto = catalogo === null ? undefined : prepared('SELECT chiave,nome,nascosto FROM catalogo_oggetto WHERE chiave = ?').get(catalogo) as { chiave: string; nome: string; nascosto: number } | undefined;
  const nome = nomeLegacy ?? oggetto?.nome ?? '';
  const equivalenti = righe.filter((r) => catalogo !== null
    ? r.catalogo_chiave === catalogo
    : r.regalo === nome && r.catalogo_chiave === null);

  if (!fatto) {
    // Se la guida è cambiata, il vecchio comando per nome può ancora togliere la propria riga storica.
    const daTogliere = nomeLegacy !== null ? righe.filter((r) => equivalenti.includes(r) || r.regalo === nomeLegacy) : equivalenti;
    for (const r of daTogliere) togliRiga(partita, r);
    return;
  }
  if (equivalenti.length) {
    // Una consegna già registrata resta identica: data, nome storico e collegamento.
    return;
  }
  if (catalogo !== null && !oggetto) throw httpErrors.notFound('oggetto-non-trovato', 'L’oggetto del regalo non è più nel catalogo.');
  if (oggetto?.nascosto === 1) throw httpErrors.conflict('oggetto-nascosto', 'Ripristina l’oggetto nel catalogo prima di registrare una nuova consegna.');
  if (righe.some((r) => r.regalo === nome)) throw httpErrors.conflict('regalo-omonimo', 'Esiste già una consegna con questo nome ma un riferimento diverso: non viene sovrascritta.');
  prepared('INSERT INTO regalo_partita (partita_id,confidente_chiave,regalo,catalogo_chiave,fatto_at) VALUES (?,?,?,?,?)')
    .run(partita, confidente, nome, catalogo, nowIso());
}
