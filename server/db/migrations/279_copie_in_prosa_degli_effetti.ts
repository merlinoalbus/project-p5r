// ============================================================
// Migrazione 279 — via le copie in prosa dell'effetto di un oggetto, lette dalle pagine accanto all'oggetto (Ondata 5, Lotto F)
// ============================================================
//
// Decisione 21 (a) dell'utente: «si tiene un solo punto per il testo dell'effetto (catalogo), si tolgono le copie (articoli, traduzioni,
// descrizioni)». Revisione avversariale del lotto F (rilievo medio): oltre alle offerte (270) e alle traduzioni (271) l'effetto era ripetuto in
// prosa in altri dati che le pagine mostrano. Censimento completo (ogni effetto del catalogo di almeno 25 caratteri cercato in ogni blocco di
// `dati_guida` e in ogni colonna di testo di ogni tabella, 2026-10-26):
//   1. `dati_guida.oggetti-guida` → `fabbricazione.ricette[].effetto` (10 ricette, tutte uguali all'effetto del prodotto collegato): la tabella
//      della fabbricazione e le fonti delle ricompense leggono ora l'effetto del prodotto dal catalogo; la ricetta tiene un testo suo solo senza
//      un prodotto unico collegato o se l'utente l'ha corretto (la correzione resta e vale);
//   2. `ricompensa_oggetto.nota` → la riga uguale all'effetto dell'oggetto ricompensato (le 10 ricette; il Velo invisibile del Covo, dove la nota
//      ripete sblocco, effetto e fonte): si toglie solo quella riga;
//   3. `dati_guida.completamento` → `covo.premi[].effetto` del premio con un solo oggetto collegato e lo stesso effetto (il Velo invisibile): la
//      pagina del Covo legge l'effetto dall'oggetto (`completamentoService`). La Lettera dei Reali dice altro sulla pagina del Covo («tutte le
//      Personae già ottenute») e sulla pagina Oggetti chiave/essenziali («una Persona», la scheda): vale la scheda e il testo del Covo va in una
//      nota storica legata alla scheda, come la 270 per il Chiodo ossidato;
//   4. `articolo.nota` delle offerte di Jose: «Indicazioni originali della fonte: Aver sbloccato il Dedalo di …. <effetto>», dove l'effetto è il
//      testo della guida di Jose (`dati_guida.jose.scambi[].effetto`, stesso requisito): resta la sola indicazione del requisito;
//   5. `catalogo_oggetto.descrizione` dei film e dei libri identica ai `dettagli` della loro scheda di lettura (29 film e 1 libro, più Il cameriere
//      oscuro, uguale salvo «allgamestaff.it» per «AllGameStaff»), che la scheda dell'oggetto mostra già nella sezione «Visione»/«Lettura»: la
//      descrizione si svuota;
//   6. `film.dettagli`: la frase «Prima visione: +N punti …; visioni successive: +1 punto.» e, per i DVD, «Ogni titolo richiede 2 sessioni di
//      visione …» ripetono gli effetti strutturati del film (`effetti_json`, `note`, `note_successive`, `sessioni`), mostrati accanto: si tolgono
//      solo se dicono gli stessi numeri. I film dove la frase dice «+1» alle visioni successive ma il dato no restano com'erano (l'audit li
//      elenca come discordanze da verificare: la frase viene da una fonte secondaria).
// Restano, perché nessuna pagina li mostra quando c'è il catalogo: i nodi di `dati_guida.oggetti-guida` (consumabili, chiave e materiali) e
// `dati_guida.jose.scambi`, sorgenti storiche della guida sostituite dal catalogo e dal listino di Jose nella lettura.
//
// Conservativa: tocca solo righe della guida mai corrette dall'utente (`origine = 'seed'` e `seed_json` vuoto dove la tabella li ha; nessuna
// correzione dell'utente sull'indirizzo nei blocchi della guida) e solo testi uguali nella sostanza (`sostanzaTesto`). Nessuna voce del Diario
// cambia. Idempotente. Audit `audit-279-copie-in-prosa`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { improntaDiario, notaStoricaTesti, scriviAuditTesti, sostanzaTesto, type NotaStoricaTesti } from './testiOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';
import { segmentoSelettore } from '../../../shared/percorsoGuida.js';
import { riallineaFotografieProposte } from './chiusuraOndata5.js';

const AUDIT = 'audit-279-copie-in-prosa';
const errore = (motivo: string): never => { throw new Error(`279: ${motivo}; nessuna modifica applicata.`); };
type Esito = { dove: string; chiave: string; esito: string; prima?: string | null; dopo?: string | null };

function blocco(db: AppDatabase, chiave: string): Record<string, unknown> | null {
  const j = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(chiave) as string | undefined;
  if (!j) return null;
  try { const v = JSON.parse(j) as unknown; return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null; } catch { return null; }
}
function scriviBlocco(db: AppDatabase, chiave: string, valore: unknown): void {
  if (db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ?').run(JSON.stringify(valore), chiave).changes !== 1) errore(`il blocco ${chiave} non si aggiorna`);
}
/** Le correzioni dell'utente di un blocco della guida (la tabella c'è dalla 178). */
function correzioni(db: AppDatabase, chiave: string): string[] {
  if (!esisteTabella(db, 'correzione_dati_guida')) return [];
  return db.prepare('SELECT percorso FROM main.correzione_dati_guida WHERE blocco = ?').pluck().all(chiave) as string[];
}
/**
 * Vero se fra le correzioni c'è quella del campo `effetto` dell'elemento scelto con il selettore. L'indirizzo salvato codifica il valore del
 * selettore (`segmentoSelettore`: «[nome=Velo%20invisibile%20(ricompensa%20finale)]»): si confronta con lo stesso segmento, non con il nome
 * in chiaro (revisione del lotto F, terzo giro, rilievo 4: un nome con spazi non si trovava mai).
 */
function effettoCorretto(corrette: readonly string[], campo: string, valore: string): boolean {
  const segmento = segmentoSelettore(campo, valore);
  return corrette.some((p) => p.split('/').includes(segmento) && /(^|\/)effetto$/.test(p));
}
/** L'effetto dell'oggetto del catalogo, se è uno solo l'oggetto collegato alla fonte (una ricetta, un premio del Covo). */
function effettoDellUnicoOggetto(db: AppDatabase, tipo: string, fonte: string): { chiave: string; effetto: string } | null {
  if (!esisteTabella(db, 'ricompensa_oggetto')) return null;
  const righe = db.prepare(`SELECT c.chiave, c.effetto FROM main.ricompensa_oggetto r JOIN main.catalogo_oggetto c ON c.chiave = r.catalogo_chiave
    WHERE r.fonte_tipo = ? AND r.fonte_chiave = ?`).all(tipo, fonte) as Array<{ chiave: string; effetto: string }>;
  return righe.length === 1 && righe[0].effetto.trim() ? righe[0] : null;
}

/** 1. Le ricette della fabbricazione: l'effetto è quello del prodotto. */
function ricette(db: AppDatabase, esiti: Esito[]): number {
  const og = blocco(db, 'oggetti-guida');
  const fab = og?.fabbricazione as { ricette?: Array<Record<string, unknown>> } | undefined;
  if (!og || !fab || !Array.isArray(fab.ricette)) { esiti.push({ dove: 'ricette', chiave: 'oggetti-guida', esito: 'blocco assente' }); return 0; }
  const corrette = correzioni(db, 'oggetti-guida');
  let cambiate = 0;
  const nuove = fab.ricette.map((r) => {
    const attrezzo = String(r.attrezzo ?? '');
    const testo = typeof r.effetto === 'string' ? r.effetto : '';
    if (!testo) return r;
    const prodotto = effettoDellUnicoOggetto(db, 'ricetta', attrezzo);
    if (effettoCorretto(corrette, 'attrezzo', attrezzo)) { esiti.push({ dove: 'ricette', chiave: attrezzo, esito: 'effetto corretto dall’utente: non toccato', prima: testo }); return r; }
    if (!prodotto) { esiti.push({ dove: 'ricette', chiave: attrezzo, esito: 'senza un prodotto unico collegato: resta', prima: testo }); return r; }
    if (sostanzaTesto(testo) !== sostanzaTesto(prodotto.effetto)) { esiti.push({ dove: 'ricette', chiave: attrezzo, esito: `diverso dall’effetto di ${prodotto.chiave}: resta`, prima: testo, dopo: prodotto.effetto }); return r; }
    cambiate++;
    esiti.push({ dove: 'ricette', chiave: attrezzo, esito: `copia tolta (vale ${prodotto.chiave})`, prima: testo });
    return { ...r, effetto: '' };
  });
  if (cambiate) scriviBlocco(db, 'oggetti-guida', { ...og, fabbricazione: { ...fab, ricette: nuove } });
  return cambiate;
}

/** 2. Le note delle ricompense: la riga uguale all'effetto dell'oggetto ricompensato. */
function noteRicompense(db: AppDatabase, esiti: Esito[]): number {
  if (!esisteTabella(db, 'ricompensa_oggetto')) return 0;
  const righe = db.prepare(`SELECT r.rowid AS id, r.fonte_tipo, r.fonte_chiave, r.catalogo_chiave, r.nota, c.effetto FROM main.ricompensa_oggetto r
    JOIN main.catalogo_oggetto c ON c.chiave = r.catalogo_chiave WHERE r.nota IS NOT NULL AND r.nota <> '' AND c.effetto <> ''`).all() as
    Array<{ id: number; fonte_tipo: string; fonte_chiave: string; catalogo_chiave: string; nota: string; effetto: string }>;
  let cambiate = 0;
  for (const r of righe) {
    const linee = r.nota.split('\n');
    // anche il testo del Covo valutato (la Lettera dei Reali), che dopo la 279 vive nella nota storica legata alla scheda
    const valutato = r.fonte_tipo === 'covo' ? COVO_VALUTATI[r.fonte_chiave] : undefined;
    const copie = [r.effetto, ...(valutato && valutato.nota.catalogo.includes(r.catalogo_chiave) ? [valutato.testo] : [])].map(sostanzaTesto);
    const resto = linee.filter((l) => !copie.includes(sostanzaTesto(l)));
    if (resto.length === linee.length) continue;
    const nota = resto.join('\n').trim() || null;
    if (db.prepare('UPDATE main.ricompensa_oggetto SET nota = ? WHERE rowid = ? AND nota = ?').run(nota, r.id, r.nota).changes !== 1) errore(`la nota della ricompensa ${r.fonte_tipo}/${r.fonte_chiave} non si aggiorna`);
    cambiate++;
    esiti.push({ dove: 'ricompensa_oggetto.nota', chiave: `${r.fonte_tipo}/${r.fonte_chiave} → ${r.catalogo_chiave}`, esito: 'riga dell’effetto tolta', prima: r.nota, dopo: nota });
  }
  return cambiate;
}

/**
 * I premi del Covo il cui testo dice altro dall'oggetto, valutati contro la guida: la pagina Oggetti chiave/essenziali [C] è la scheda
 * dell'oggetto e vale quella; il testo della pagina del Covo resta in una nota storica legata alla scheda (come la 270 per il Chiodo ossidato).
 * Un testo diverso da quello valutato resta dov'è.
 */
const COVO_VALUTATI: Readonly<Record<string, { testo: string; nota: NotaStoricaTesti }>> = {
  'Lettera dei Reali (ricompensa finale)': {
    testo: 'Permette di evocare gratuitamente tutte le Personae già ottenute (particolarmente utile in Nuova Partita+).',
    nota: { chiave: 'lettera-dei-reali-effetto-fonte', fonte: 'Guida italiana: Covo dei Ladri e Oggetti chiave/essenziali (Lettera dei Reali); decisione 21 dell’utente',
      testo: 'La guida dice due cose diverse sulla Lettera dei Reali: la pagina del Covo dei Ladri «permette di evocare gratuitamente tutte le Personae già ottenute (particolarmente utile in Nuova Partita+)», la pagina Oggetti chiave/essenziali «un documento che permette di evocare una Persona gratuitamente». Vale la scheda dell’oggetto finché non si verifica in gioco. È una nota sulla fonte: non cambia la scheda.',
      catalogo: ['chiave/lettera-dei-reali'], articoli: [] },
  },
};

/**
 * Il premio senza il campo `effetto` (terzo giro, rilievo 3): il campo non resta vuoto ma esce dall'elemento della guida, così la finestra
 * «Modifica» del premio non lo offre più (un campo che la guida non ha non si espone né si corregge: `ripristinoService.schedaBlocco`) e non
 * nasce una correzione che sulla pagina del Covo vincerebbe sulla scheda dell'oggetto. Le fotografie delle proposte di collegamento ancora da
 * approvare della ricompensa del premio (`ricompensa`/`covo/<nome>`, campo `effetto`) si riallineano: altrimenti risulterebbero «fonte cambiata»
 * (revisione del terzo giro, rilievo basso). I premi che non sono un oggetto (decorazioni, statue, galleria) tengono il loro testo, unico punto.
 */
function senzaEffetto(db: AppDatabase, p: Record<string, unknown>, testo: string): Record<string, unknown> {
  const resto = { ...p };
  delete resto.effetto;
  riallineaFotografieProposte(db, 'ricompensa', `covo/${String(p.nome ?? '')}`, 'effetto', testo, null);
  return resto;
}

/** 3. I premi del Covo con un solo oggetto collegato: l'effetto è quello dell'oggetto. */
function premiCovo(db: AppDatabase, esiti: Esito[]): number {
  const comp = blocco(db, 'completamento');
  const covo = comp?.covo as { premi?: Array<Record<string, unknown>> } | undefined;
  if (!comp || !covo || !Array.isArray(covo.premi)) { esiti.push({ dove: 'covo', chiave: 'completamento', esito: 'blocco assente' }); return 0; }
  const corrette = correzioni(db, 'completamento');
  let cambiate = 0;
  const nuovi = covo.premi.map((p) => {
    const nome = String(p.nome ?? '');
    const testo = typeof p.effetto === 'string' ? p.effetto : '';
    const oggetto = testo ? effettoDellUnicoOggetto(db, 'covo', nome) : null;
    if (!oggetto) return p;
    if (effettoCorretto(corrette, 'nome', nome)) { esiti.push({ dove: 'covo', chiave: nome, esito: 'effetto corretto dall’utente: non toccato', prima: testo }); return p; }
    if (sostanzaTesto(testo) !== sostanzaTesto(oggetto.effetto)) {
      const valutato = COVO_VALUTATI[nome];
      if (!valutato || valutato.testo !== testo || !valutato.nota.catalogo.includes(oggetto.chiave)) {
        esiti.push({ dove: 'covo', chiave: nome, esito: `diverso dall’effetto di ${oggetto.chiave}: resta`, prima: testo, dopo: oggetto.effetto }); return p;
      }
      const nota = notaStoricaTesti(db, valutato.nota);
      cambiate++;
      esiti.push({ dove: 'covo', chiave: nome, esito: `diverso dalla scheda, valutato: vale ${oggetto.chiave}, il testo del Covo va nella nota storica ${valutato.nota.chiave} (${nota.esito})`, prima: testo });
      return senzaEffetto(db, p, testo);
    }
    cambiate++;
    esiti.push({ dove: 'covo', chiave: nome, esito: `copia tolta (vale ${oggetto.chiave})`, prima: testo });
    return senzaEffetto(db, p, testo);
  });
  if (cambiate) scriviBlocco(db, 'completamento', { ...comp, covo: { ...covo, premi: nuovi } });
  return cambiate;
}

/** 4. Le note delle offerte di Jose: resta il requisito, l'effetto della guida di Jose va via. */
function noteJose(db: AppDatabase, esiti: Esito[]): number {
  if (!esisteTabella(db, 'articolo')) return 0;
  const jose = blocco(db, 'jose');
  const scambi = (Array.isArray(jose?.scambi) ? jose.scambi : []) as Array<{ effetto?: unknown; requisito?: unknown }>;
  const conSeed = haColonna(db, 'articolo', 'seed_json');
  const righe = db.prepare(`SELECT chiave, nota, origine${conSeed ? ', seed_json' : ', NULL AS seed_json'} FROM main.articolo
    WHERE negozio_chiave = 'jose' AND nota LIKE 'Indicazioni originali della fonte: %'`).all() as Array<{ chiave: string; nota: string; origine: string; seed_json: string | null }>;
  let cambiate = 0;
  for (const r of righe) {
    // già senza effetto (la migrazione rieseguita): niente da fare
    if (/^Indicazioni originali della fonte: Aver sbloccato il Dedalo di [^.]+\.$/.test(r.nota)) continue;
    const m = /^(Indicazioni originali della fonte: (Aver sbloccato il Dedalo di [^.]+)\.) (.+)$/s.exec(r.nota);
    if (!m) { esiti.push({ dove: 'jose', chiave: r.chiave, esito: 'nota di altra forma: resta', prima: r.nota }); continue; }
    const [, testa, requisito, coda] = m;
    if (!scambi.some((s) => s.requisito === requisito && s.effetto === coda)) { esiti.push({ dove: 'jose', chiave: r.chiave, esito: 'il testo non è l’effetto della guida di Jose: resta', prima: r.nota }); continue; }
    if (r.origine !== 'seed' || r.seed_json !== null) { esiti.push({ dove: 'jose', chiave: r.chiave, esito: 'offerta corretta dall’utente: non toccata', prima: r.nota }); continue; }
    if (db.prepare("UPDATE main.articolo SET nota = ?, updated_at = ? WHERE chiave = ? AND nota = ? AND origine = 'seed'").run(testa, new Date().toISOString(), r.chiave, r.nota).changes !== 1) errore(`la nota di ${r.chiave} non si aggiorna`);
    cambiate++;
    esiti.push({ dove: 'jose', chiave: r.chiave, esito: 'effetto tolto dalla nota', prima: r.nota, dopo: testa });
  }
  return cambiate;
}

/**
 * Le descrizioni che differiscono dai dettagli della lettura solo nella forma, valutate una per una: Il cameriere oscuro scrive
 * «allgamestaff.it» dove i dettagli del film scrivono «AllGameStaff», per il resto è la stessa frase. Testo esatto della descrizione.
 */
const DESCRIZIONI_VALUTATE: Readonly<Record<string, string>> = {
  'film/il-cameriere-oscuro': 'Prima visione: +3 punti nella dote indicata; visioni successive dello stesso film: +1 punto. Titolo in inglese da fonte secondaria (samurai-gamers.com); mappatura 1:1 con i titoli italiani confermati da allgamestaff.it non verificata.',
};

/** 5. La descrizione della scheda di un film o di un libro identica (o valutata uguale) ai dettagli della sua scheda di lettura. */
function descrizioniLetture(db: AppDatabase, esiti: Esito[]): number {
  let cambiate = 0;
  for (const t of ['film', 'libro'] as const) {
    if (!esisteTabella(db, t) || !haColonna(db, t, 'catalogo_chiave') || !haColonna(db, t, 'dettagli')) continue;
    const valutate = Object.entries(DESCRIZIONI_VALUTATE).filter(([k]) => k.startsWith(`${t}/`));
    const righe = db.prepare(`SELECT c.chiave, c.descrizione, c.origine, c.seed_json FROM main.${t} x JOIN main.catalogo_oggetto c ON c.chiave = x.catalogo_chiave
      WHERE c.descrizione <> '' AND (c.descrizione = x.dettagli OR (c.chiave, c.descrizione) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?)))`)
      .all(JSON.stringify(valutate)) as Array<{ chiave: string; descrizione: string; origine: string; seed_json: string | null }>;
    for (const r of righe) {
      if (r.origine !== 'seed' || r.seed_json !== null) { esiti.push({ dove: `${t}: descrizione`, chiave: r.chiave, esito: 'scheda corretta dall’utente: non toccata', prima: r.descrizione }); continue; }
      if (db.prepare("UPDATE main.catalogo_oggetto SET descrizione = '', updated_at = ? WHERE chiave = ? AND descrizione = ? AND origine = 'seed' AND seed_json IS NULL")
        .run(new Date().toISOString(), r.chiave, r.descrizione).changes !== 1) errore(`la descrizione di ${r.chiave} non si aggiorna`);
      cambiate++;
      esiti.push({ dove: `${t}: descrizione`, chiave: r.chiave, esito: 'copia dei dettagli della lettura tolta', prima: r.descrizione });
    }
  }
  return cambiate;
}

const maiuscola = (s: string) => s.charAt(0).toLocaleUpperCase('it') + s.slice(1);

/** 6. Nei dettagli di un film, le frasi che ripetono gli effetti strutturati con gli stessi numeri. */
function dettagliFilm(db: AppDatabase, esiti: Esito[]): number {
  if (!esisteTabella(db, 'film') || !haColonna(db, 'film', 'note_successive')) return 0;
  const righe = db.prepare(`SELECT chiave, dote, note, note_successive, sessioni, dettagli, origine, seed_json FROM main.film WHERE dettagli IS NOT NULL AND dettagli <> ''`).all() as
    Array<{ chiave: string; dote: string | null; note: number | null; note_successive: number | null; sessioni: number | null; dettagli: string; origine: string; seed_json: string | null }>;
  let cambiate = 0;
  for (const r of righe) {
    const frasi: string[] = [];
    if (r.note !== null && r.note_successive !== null) {
      frasi.push(`Prima visione: +${r.note} punti nella dote indicata; visioni successive: +${r.note_successive} punto.`);
      if (r.dote) frasi.push(`Prima visione: +${r.note} punti ${maiuscola(r.dote)}; visioni successive: +${r.note_successive} punto.`);
    }
    if (r.sessioni === 2) frasi.push('Ogni titolo richiede 2 sessioni di visione per essere completato e assegnare i punti dote.');
    let testo = r.dettagli;
    for (const f of frasi) if (testo.includes(f)) testo = testo.replace(f, ' ');
    testo = testo.replace(/\s{2,}/g, ' ').trim();
    if (testo === r.dettagli) {
      if (/visioni successive/.test(r.dettagli) && r.note_successive === null) esiti.push({ dove: 'film: dettagli', chiave: r.chiave, esito: 'discordanza: la frase dice un punto alle visioni successive, il dato no; resta, da verificare', prima: r.dettagli });
      continue;
    }
    if (r.origine !== 'seed' || r.seed_json !== null) { esiti.push({ dove: 'film: dettagli', chiave: r.chiave, esito: 'film corretto dall’utente: non toccato', prima: r.dettagli }); continue; }
    if (db.prepare("UPDATE main.film SET dettagli = ?, updated_at = ? WHERE chiave = ? AND dettagli = ? AND origine = 'seed' AND seed_json IS NULL")
      .run(testo, new Date().toISOString(), r.chiave, r.dettagli).changes !== 1) errore(`i dettagli di ${r.chiave} non si aggiornano`);
    cambiate++;
    esiti.push({ dove: 'film: dettagli', chiave: r.chiave, esito: 'frase degli effetti tolta', prima: r.dettagli, dopo: testo });
  }
  return cambiate;
}

export const migration279: Migration = {
  id: 279,
  name: 'copie_in_prosa_degli_effetti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'catalogo_oggetto') || !esisteTabella(db, 'dati_guida')) { logger.warn({ migrazione: 279 }, 'catalogo o guida assenti: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const esiti: Esito[] = [];
    // l'ordine conta: la descrizione delle schede si confronta con i dettagli dei film prima che la 6 li ripulisca
    const ricetteTolte = ricette(db, esiti);
    const noteTolte = noteRicompense(db, esiti);
    const premiTolti = premiCovo(db, esiti);
    const joseTolte = noteJose(db, esiti);
    const descrizioniTolte = descrizioniLetture(db, esiti);
    const dettagliTolti = dettagliFilm(db, esiti);
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const conteggi = {
      ricette: ricetteTolte, noteRicompense: noteTolte, premiCovo: premiTolti, noteJose: joseTolte, descrizioniLetture: descrizioniTolte, dettagliFilm: dettagliTolti,
      discordanzeFilm: esiti.filter((e) => e.esito.startsWith('discordanza')).length,
      nonToccate: esiti.filter((e) => /non toccat|resta/.test(e.esito)).length,
    };
    const cambiate = ricetteTolte + noteTolte + premiTolti + joseTolte + descrizioniTolte + dettagliTolti;
    if (cambiate) invalidaCacheDiGioco();
    scriviAuditTesti(db, AUDIT, 279, { conteggi, esiti }, cambiate);
    logger.info({ migrazione: 279, ...conteggi }, 'Copie in prosa dell’effetto: ricette, ricompense, Covo, note di Jose, letture');
  },
};
