// ============================================================
// esportaSeed — il catalogo corretto dall'utente torna dentro `data/seed`, e diventa il dato di partenza
// ============================================================
//
// **A che serve.** Oggi le correzioni al catalogo — un negozio aggiunto, un prezzo sbagliato, una
// riga della guida da nascondere — vivono nel database di *quella* istanza: sopravvivono al
// reseed, perché sono marcate `origine = 'utente'`, ma non escono di lì. Una nuova installazione
// riparte dal seed e non le ha mai viste.
//
// L'utente lavora sulle guide e sul gioco e corregge i cataloghi mano a mano; ha chiesto che
// quello che corregge diventi **il catalogo di partenza dell'app**, non una modifica personale da
// riportare a mano. Questo modulo fa esattamente quel passaggio: rilegge il catalogo com'è adesso
// e ne ricostruisce il file di seed, così che chi installa da zero — o chi rifà il seed — trovi
// già tutto.
//
// **Che cosa entra e che cosa no.** Entra il catalogo come si vede: righe della guida, righe
// aggiunte, correzioni. **Non** entrano le righe nascoste, che è il senso di averle nascoste, e
// non entra niente che riguardi una partita — gli acquisti, le spunte e i progressi sono dati di
// chi gioca e non hanno posto in un seed.
//
// **Il punto delicato sono le condizioni.** Nel seed sono frasi («dal 18 aprile», «dopo il
// completamento di un videogioco») e il caricatore le traduce leggendole. Una condizione
// costruita a mano nell'editor però può dire cose che nessuna frase esprime — un gruppo «almeno
// una», un fatto di sistema, una negazione — e se la si riscrivesse solo come prosa tornerebbe
// indietro trasformata. Perciò l'esportazione scrive il campo `condizioni` **solo quando serve**:
// quando la traduzione della prosa non ridarebbe la stessa condizione. Nei casi normali — la
// stragrande maggioranza — il file resta identico a com'è sempre stato.
// ============================================================

import { prepared } from '../../db/dbService.js';
import { migraTestiCondizioni } from '../../../shared/migraCondizioni.js';
import type { AttivitaSeed, NegoziSeed } from '../../../shared/seed.js';
import { conPreposizione } from '../../db/migrations/052_condizioni_letture_attivita.js';

interface RigaNegozio {
  chiave: string; ordine: number; nome: string; luogo: string; luogo_chiave: string | null; tipo: string;
  gestore: string | null; confidente_chiave: string | null; orari: string | null; sblocco: string | null;
  note: string | null; fonte: string; condizioni_json: string | null;
}
interface RigaArticolo {
  chiave: string; negozio_chiave: string; ordine: number; nome: string; nome_it: string | null; categoria: string;
  per: string | null; prezzo: number | null; effetto: string | null; statistiche: string | null;
  disponibile_dal: string | null; condizione: string | null; nota: string | null; fonte: string;
  verificato: number; condizioni_json: string | null;
}

/** Le condizioni da scrivere nel file, oppure `undefined` se la prosa basta a ricostruirle.
 *
 * Il confronto è sul JSON normalizzato, non sull'oggetto: due condizioni uguali scritte con le
 * chiavi in ordine diverso sono la stessa condizione, e non vale la pena sporcare il file per
 * quello. */
function condizioniDaScrivere(condizioniJson: string | null, testi: Array<string | null>, confidente: string | null): unknown[] | undefined {
  if (!condizioniJson) return undefined;
  let attuali: unknown[];
  try { attuali = JSON.parse(condizioniJson) as unknown[]; } catch { return undefined; }
  const dallaProsa = migraTestiCondizioni(testi, confidente);
  return JSON.stringify(attuali) === JSON.stringify(dallaProsa) ? undefined : attuali;
}

/** I campi che il file ha e il database no, ripresi tali e quali dal file precedente.
 *
 * **Un'esportazione non deve mai buttare via quello che non capisce.** Nel file dei negozi ci sono
 * quattordici voci con un campo `nota` che nessuna tabella ha — il caricatore legge `note`, non
 * `nota` — e cinque di quelle hanno del testo vero dentro («Qui gli integratori costano meno che
 * altrove»). Riscrivendo il file dal solo database quelle frasi sparirebbero dal repository per
 * sempre, e nessuno se ne accorgerebbe: non si vedono nemmeno nell'app.
 *
 * Finché non si decide che farne, l'esportazione le riporta dove stavano. Il costo è nullo, il
 * rischio di non farlo è perdere dati per distrazione. */
function campiEstranei(precedente: Record<string, unknown> | undefined, prodotti: Record<string, unknown>): Record<string, unknown> {
  if (!precedente) return {};
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(precedente)) if (!(k in prodotti) && k !== 'articoli') extra[k] = v;
  return extra;
}

/** Lo stesso contenuto, ma con i campi **nell'ordine in cui stavano nel file**.
 *
 * Non è pignoleria: `JSON.stringify` scrive le chiavi nell'ordine in cui sono state messe, quindi
 * un'esportazione che le riordina produce un `git diff` lungo diecimila righe in cui non è
 * cambiato niente — e dentro quel diff nessuno troverebbe più la riga che è cambiata davvero.
 * Il senso del comando è che `git diff` mostri **solo** la correzione: qui si paga il biglietto.
 *
 * I campi nuovi (per esempio `condizioni`, la prima volta che serve) vanno in fondo. */
function conOrdineDi<T extends Record<string, unknown>>(precedente: Record<string, unknown> | undefined, prodotto: T): T {
  if (!precedente) return prodotto;
  const ordinato: Record<string, unknown> = {};
  for (const k of Object.keys(precedente)) if (k in prodotto) ordinato[k] = prodotto[k];
  for (const [k, v] of Object.entries(prodotto)) if (!(k in ordinato)) ordinato[k] = v;
  return ordinato as T;
}

/** Il catalogo dei negozi come sta adesso, nella forma esatta che `caricaSeed` si aspetta.
 *
 * `precedente` è il contenuto attuale del file: serve solo a non perdere i campi che il database
 * non conosce (vedi `campiEstranei`). Omesso, l'esportazione contiene esattamente ciò che il
 * database sa. */
export function esportaNegoziSeed(precedente?: NegoziSeed): NegoziSeed {
  const primaNegozi = new Map<string, Record<string, unknown>>();
  const primaArticoli = new Map<string, Record<string, unknown>>();
  for (const n of precedente?.negozi ?? []) {
    primaNegozi.set(n.chiave, n as unknown as Record<string, unknown>);
    for (const a of n.articoli) primaArticoli.set(a.chiave, a as unknown as Record<string, unknown>);
  }
  // `nascosto = 0`: una riga nascosta è una riga che l'utente ha deciso di non vedere, e riportarla
  // nel seed la farebbe tornare da sola alla prossima installazione.
  const negozi = prepared('SELECT * FROM negozio WHERE nascosto = 0 ORDER BY ordine, chiave').all() as RigaNegozio[];
  const articoli = prepared('SELECT * FROM articolo WHERE nascosto = 0 ORDER BY ordine, chiave').all() as RigaArticolo[];
  const perNegozio = new Map<string, RigaArticolo[]>();
  for (const a of articoli) {
    const elenco = perNegozio.get(a.negozio_chiave);
    if (elenco) elenco.push(a); else perNegozio.set(a.negozio_chiave, [a]);
  }
  return {
    negozi: negozi.map((n) => {
      const cond = condizioniDaScrivere(n.condizioni_json, [n.sblocco], n.confidente_chiave);
      const prodotto = {
        chiave: n.chiave, ordine: n.ordine, nome: n.nome, luogo: n.luogo, luogoChiave: n.luogo_chiave,
        tipo: n.tipo, gestore: n.gestore, confidente: n.confidente_chiave, orari: n.orari,
        sblocco: n.sblocco, note: n.note, fonte: n.fonte,
        ...(cond ? { condizioni: cond } : {}),
      };
      const prima = primaNegozi.get(n.chiave);
      return {
        ...conOrdineDi(prima, { ...prodotto, ...campiEstranei(prima, prodotto) }),
        articoli: (perNegozio.get(n.chiave) ?? []).map((a) => {
          const condA = condizioniDaScrivere(a.condizioni_json, [a.disponibile_dal, a.condizione], n.confidente_chiave);
          const prodottoA = {
            chiave: a.chiave, ordine: a.ordine, nome: a.nome, nomeIt: a.nome_it, categoria: a.categoria,
            per: a.per, prezzo: a.prezzo, effetto: a.effetto, statistiche: a.statistiche,
            disponibileDal: a.disponibile_dal, condizione: a.condizione, nota: a.nota, fonte: a.fonte,
            verificato: a.verificato === 1,
            ...(condA ? { condizioni: condA } : {}),
          };
          const primaA = primaArticoli.get(a.chiave);
          return conOrdineDi(primaA, { ...prodottoA, ...campiEstranei(primaA, prodottoA) });
        }),
      };
    }),
  };
}

interface RigaAttivitaSeed {
  chiave: string; ordine: number; nome: string; tipo: string; luogo: string; luogo_chiave: string | null;
  fascia: string | null; costo: number | null; sblocco: string | null; sessioni: number | null;
  doti_json: string; altri_effetti: string | null; regole: string; premi: string | null; paga: string | null;
  fonte: string; verificato: number; condizioni_json: string | null;
}
interface RigaLibroSeed {
  chiave: string; ordine: number; nome: string; nome_it: string | null; dove: string; prezzo: number | null;
  disponibile_dal: string | null; dote: string | null; note: number | null; sblocca: string | null;
  sessioni: number | null; dettagli: string | null; fonte: string; verificato: number; condizioni_json: string | null;
}
interface RigaFilmSeed {
  chiave: string; ordine: number; nome: string; nome_it: string | null; dove: 'cinema' | 'dvd'; periodo: string;
  dote: string | null; note: number | null; note_successive: number | null; prezzo: number | null; sessioni: number; dettagli: string | null;
  fonte: string; verificato: number; condizioni_json: string | null;
}

/** Attività, libri e film come stanno adesso, nella forma di `data/seed/attivita.json`.
 *
 * Stesse tre garanzie dei negozi, e per le stesse ragioni: le righe **nascoste** non tornano nel
 * seed — nasconderle è una decisione, e riportarle le farebbe rispuntare alla prossima
 * installazione —, i campi che il file ha e il database no si riportano dove stavano, e l'ordine
 * delle chiavi resta quello del file, perché un `git diff` di diecimila righe nasconde la riga che
 * è cambiata davvero.
 *
 * Il campo `condizioni` si scrive solo quando la prosa non basta a ricostruirlo, ed è nuovo per
 * queste tre famiglie: la colonna delle condizioni ce l'hanno dalla migrazione 052. */
export function esportaAttivitaSeed(precedente?: AttivitaSeed): AttivitaSeed {
  const indice = <T extends { chiave: string }>(righe: T[] | undefined): Map<string, Record<string, unknown>> =>
    new Map((righe ?? []).map((r) => [r.chiave, r as unknown as Record<string, unknown>]));
  const primaAttivita = indice(precedente?.attivita);
  const primaLibri = indice(precedente?.libri);
  const primaFilm = indice(precedente?.film);

  const attivita = (prepared('SELECT * FROM attivita WHERE COALESCE(nascosto, 0) = 0 ORDER BY ordine, chiave').all() as RigaAttivitaSeed[]).map((a) => {
    // **La stessa normalizzazione che ha scritto la condizione.** Senza, il confronto fallisce
    // sempre — la regola nel database viene da «dal 18 aprile», la prosa nel file dice «18
    // aprile» — e il file si riempirebbe di blocchi `condizioni` identici a quel che il
    // caricatore ricava da solo: rumore in ogni riga, e la correzione vera introvabile nel diff.
    const cond = condizioniDaScrivere(a.condizioni_json, [conPreposizione(a.sblocco)], null);
    const prodotto = {
      chiave: a.chiave, ordine: a.ordine, nome: a.nome, tipo: a.tipo, luogo: a.luogo, luogoChiave: a.luogo_chiave,
      fascia: a.fascia, costo: a.costo, sblocco: a.sblocco,
      // `attivita.sessioni` è `NOT NULL DEFAULT 1`: le righe che nel file non lo dicevano lo
      // riprendono dal database come 1, e riscriverlo aggiungerebbe ventitré righe che non
      // dicono niente di nuovo. Si scrive solo se il file ce l'aveva o se il valore è un altro.
      ...(primaAttivita.get(a.chiave)?.sessioni !== undefined || a.sessioni !== 1 ? { sessioni: a.sessioni } : {}),
      doti: JSON.parse(a.doti_json) as AttivitaSeed['attivita'][number]['doti'],
      altriEffetti: a.altri_effetti, regole: a.regole, premi: a.premi, paga: a.paga, fonte: a.fonte,
      verificato: a.verificato === 1,
      ...(cond ? { condizioni: cond } : {}),
    };
    const p = primaAttivita.get(a.chiave);
    return conOrdineDi(p, { ...prodotto, ...campiEstranei(p, prodotto) });
  });

  const libri = (prepared('SELECT * FROM libro WHERE COALESCE(nascosto, 0) = 0 ORDER BY ordine, chiave').all() as RigaLibroSeed[]).map((l) => {
    const cond = condizioniDaScrivere(l.condizioni_json, [conPreposizione(l.disponibile_dal)], null);
    const prodotto = {
      chiave: l.chiave, ordine: l.ordine, nome: l.nome, nomeIt: l.nome_it, dove: l.dove, prezzo: l.prezzo,
      disponibileDal: l.disponibile_dal, dote: l.dote, note: l.note, sblocca: l.sblocca, sessioni: l.sessioni,
      dettagli: l.dettagli, fonte: l.fonte, verificato: l.verificato === 1,
      ...(cond ? { condizioni: cond } : {}),
    };
    const p = primaLibri.get(l.chiave);
    return conOrdineDi(p, { ...prodotto, ...campiEstranei(p, prodotto) });
  });

  const film = (prepared('SELECT * FROM film WHERE COALESCE(nascosto, 0) = 0 ORDER BY ordine, chiave').all() as RigaFilmSeed[]).map((f) => {
    const cond = condizioniDaScrivere(f.condizioni_json, [conPreposizione(f.periodo)], null);
    const prodotto = {
      chiave: f.chiave, ordine: f.ordine, nome: f.nome, nomeIt: f.nome_it, dove: f.dove, periodo: f.periodo,
      dote: f.dote, note: f.note, ...(f.note_successive !== null && f.note_successive !== undefined ? { noteSuccessive: f.note_successive } : {}), prezzo: f.prezzo, sessioni: f.sessioni, dettagli: f.dettagli, fonte: f.fonte,
      verificato: f.verificato === 1,
      ...(cond ? { condizioni: cond } : {}),
    };
    const p = primaFilm.get(f.chiave);
    return conOrdineDi(p, { ...prodotto, ...campiEstranei(p, prodotto) });
  });

  return { attivita, libri, film } as unknown as AttivitaSeed;
}

/** Quanto pesa l'esportazione, per dirlo prima di scrivere il file. */
export function riepilogoEsportazioneCatalogo(): { negozi: number; articoli: number; negoziUtente: number; articoliUtente: number; nascosti: number; conCondizioniProprie: number } {
  const n = (sql: string): number => (prepared(sql).get() as { n: number }).n;
  const seed = esportaNegoziSeed();
  const conCond = seed.negozi.reduce((s, x) => s + (x.condizioni ? 1 : 0) + x.articoli.filter((a) => a.condizioni).length, 0);
  return {
    negozi: seed.negozi.length,
    articoli: seed.negozi.reduce((s, x) => s + x.articoli.length, 0),
    negoziUtente: n("SELECT COUNT(*) AS n FROM negozio WHERE origine = 'utente' AND nascosto = 0"),
    articoliUtente: n("SELECT COUNT(*) AS n FROM articolo WHERE origine = 'utente' AND nascosto = 0"),
    nascosti: n('SELECT COUNT(*) AS n FROM negozio WHERE nascosto = 1') + n('SELECT COUNT(*) AS n FROM articolo WHERE nascosto = 1'),
    conCondizioniProprie: conCond,
  };
}

interface RigaDomandaSeed {
  chiave: string; ordine: number; data: string; tipo: string; chi: string; domanda: string;
  risposte_json: string; ricompensa: string; note: string; fonte: string;
}
interface RigaCruciverbaSeed {
  chiave: string; data: string; ordine: number; indizio: string; risposta: string; risposta_en: string | null; fonte: string;
}

/** Le domande in classe e agli esami come stanno adesso, nella forma di `data/seed/domande.json`.
 *
 * Il file ha tre parti — `domande`, `esami`, `premi` — e qui si rifà **solo la prima**: le altre
 * due non passano dal catalogo, quindi si riportano identiche da quel che c'era. Rifarle
 * dal database sarebbe riscriverle senza motivo, ed è il modo migliore per perdere per strada un
 * campo che nessuno guardava.
 *
 * Le righe nascoste non tornano nel seed, come per tutte le altre famiglie: nasconderle è una
 * decisione, riportarle le farebbe rispuntare alla prossima installazione. */
export function esportaDomandeSeed(precedente?: Record<string, unknown>): Record<string, unknown> {
  const prima = new Map(((precedente?.domande as Array<Record<string, unknown>> | undefined) ?? []).map((d) => [String(d.data), d]));
  const domande = (prepared('SELECT * FROM domanda WHERE COALESCE(nascosto, 0) = 0 ORDER BY ordine, chiave').all() as RigaDomandaSeed[]).map((d) => {
    const prodotto = {
      data: d.data, tipo: d.tipo, chi: d.chi, domanda: d.domanda,
      risposte: JSON.parse(d.risposte_json) as unknown[],
      ricompensa: d.ricompensa, note: d.note, fonte: d.fonte,
    };
    // Il confronto è per giorno perché è così che il file identifica una domanda: la chiave del
    // catalogo è la stessa cosa, con un progressivo dove il giorno ne ha due.
    const p = prima.get(d.data);
    return conOrdineDi(p, { ...prodotto, ...campiEstranei(p, prodotto) });
  });
  return { ...(precedente ?? {}), domande };
}

/** Il cruciverba come sta adesso, nella forma di `data/seed/cruciverba.json`. */
export function esportaCruciverbaSeed(precedente?: Record<string, unknown>): Record<string, unknown> {
  const prima = new Map(((precedente?.cruciverba as Array<Record<string, unknown>> | undefined) ?? []).map((c) => [String(c.data), c]));
  const cruciverba = (prepared('SELECT * FROM cruciverba WHERE COALESCE(nascosto, 0) = 0 ORDER BY ordine, data').all() as RigaCruciverbaSeed[]).map((c) => {
    const prodotto = { data: c.data, ordine: c.ordine, indizio: c.indizio, risposta: c.risposta, rispostaEn: c.risposta_en, fonte: c.fonte };
    const p = prima.get(c.data);
    return conOrdineDi(p, { ...prodotto, ...campiEstranei(p, prodotto) });
  });
  return { ...(precedente ?? {}), cruciverba };
}
