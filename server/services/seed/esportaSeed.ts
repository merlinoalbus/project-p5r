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
import type { NegoziSeed } from '../../../shared/seed.js';

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
