// ============================================================
// catalogoService — le righe della guida aggiunte, corrette o nascoste dall'utente: negozi, articoli, libri, film, attività,
// luoghi, domande e cruciverba (nato con la Fase 16.1 per negozi e articoli)
// ============================================================
//
// Le righe dell'utente vivono nelle stesse tabelle dei dati della guida, distinte da `origine`:
//   - creare  → nuova riga `origine = 'utente'` con chiave generata dal nome (`u-<slug>`, `<negozio>/u-<slug>`)
//   - correggere una riga della guida → la riga passa a `origine = 'utente'` e `seed_json` conserva l'originale
//   - nascondere una riga della guida → `nascosto = 1` (una ricarica dei dati la riporterebbe indietro: cancellarla non basterebbe)
//   - ripristinare → la riga torna com'era nei dati della guida (`seed_json`) e `origine` torna 'seed'
// I nomi `seed` e `seed_json` vengono dal seed JSON, dismesso il 2026-09-12: oggi «seed» vuol dire «dato della guida, arrivato
// con il pacchetto di gioco». La ricarica dei dati della guida (`ricaricaPacchetto`) aggiorna e sostituisce soltanto le righe
// `origine = 'seed'`, quindi il lavoro dell'utente sopravvive agli aggiornamenti.
// ============================================================

import { verificaCondizioni } from './mappe/mappeService.js';
import { giorniDallaFrase } from '../db/migrations/080_giorni_luogo_strutturati.js';
import { convertiProsa } from '../../shared/migraCondizioni.js';
import { normalizzaRequisitoSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { isDeepStrictEqual } from 'node:util';
import { contestoConversione, contestoRiga } from './condizioni/contestoConversione.js';
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { HttpError, httpErrors } from '../utils/httpError.js';
import { slug } from '../../shared/slug.js';
import type { ElementoCatalogoDto, RiepilogoCatalogoDto, TipoCatalogo } from '../../shared/types.js';
import { normalizzaVociEffetto, type VoceEffetto } from '../../shared/effettiCatalogo.js';
import { tracciamentoPerTipo } from '../../shared/attivita.js';
import { articoloDelListino, lettureListiniCondivisi, listinoDelNegozio } from './listiniCondivisi.js';
import { catalogoOggettiDisponibile, riferimentoOggetto, oggettiPerFonte } from './catalogoOggettiLetture.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { normalizzaCostoScambio } from '../../shared/catalogo.js';
import { aggiornaOggetto, creaOggetto } from './catalogoOggettiScritture.js';
import { fonteConfidenteAttivita } from './fonteConfidenteAttivitaService.js';
import { verificaAttivitaConfidente, verificaCampiAttivitaConfidente } from './vincoliAttivitaConfidente.js';

/** Colonne scrivibili dall'utente, per tabella: quello che il modulo dell'interfaccia mostra e che i pacchetti trasportano. */
// Dalla voce 5 (2026-09-12) il negozio non ha più `sblocco`, `fonte` e `condizioni_json` fra i campi
// scrivibili (la disponibilità sono gli orari, le condizioni stanno sugli articoli), gli articoli
// non hanno `disponibile_dal`/`condizione`/`fonte` (prosa: si scrivono le condizioni), libri, film
// e attività portano `effetti_json`; `fonte` resta colonna ma non si scrive più da qui.
const CAMPI: Record<TipoCatalogo, readonly string[]> = {
  // L5: `orari_json` conta solo per un negozio senza sede (online, televisione); con la sede valgono gli orari del luogo, salvo
  // `eccezione_orari_json` quando la guida distingue il negozio (R5-12b)
  negozio: ['nome', 'luogo', 'luogo_chiave', 'sede_chiave', 'tipo', 'gestore', 'confidente_chiave', 'orari_json', 'eccezione_orari_json', 'sblocco_json', 'programma_punti_json', 'note'],
  articolo: ['condizioni_json', 'negozio_chiave', 'nome', 'nome_it', 'categoria', 'per', 'prezzo', 'quantita', 'oggetto_fonte', 'oggetto_chiave', 'catalogo_chiave', 'costo_json', 'effetto_json', 'effetto', 'statistiche', 'nota', 'verificato'],
  libro: ['condizioni_json', 'nome', 'nome_it', 'dove', 'prezzo', 'dote', 'note', 'sblocca', 'effetto_json', 'effetti_json', 'sessioni', 'dettagli', 'verificato'],
  film: ['condizioni_json', 'nome', 'nome_it', 'dove', 'dote', 'note', 'note_successive', 'effetti_json', 'prezzo', 'sessioni', 'dettagli', 'verificato'],
  attivita: ['confidente_chiave', 'condizioni_json', 'nome', 'tipo', 'luogo', 'luogo_chiave', 'sede_chiave', 'fascia', 'costo', 'sblocco', 'sessioni', 'doti_json', 'altri_effetti', 'regole', 'premi', 'paga', 'paga_yen', 'paga_massima', 'dettagli', 'effetti_json', 'tracciamento', 'quiz_json', 'verificato'],
  // L5 (R5-07, un modulo solo): orari strutturati (null = regola dell'app), Area, sblocco, Confidenti e piatti; `quando`/`giorni_json` non si
  // leggono più (restano scrivibili per i pacchetti di prima)
  luogo: ['condizioni_json', 'quartiere_chiave', 'tipo', 'nome', 'cosa_offre', 'quando', 'giorni_json', 'orari_json', 'area_chiave', 'sblocco', 'confidenti_json', 'piatti_json', 'note', 'verificato'],
  domanda: ['data', 'tipo', 'chi', 'domanda', 'risposte_json', 'ricompensa', 'note', 'fonte'],
  cruciverba: ['data', 'indizio', 'risposta', 'risposta_en', 'fonte'],
};
const TABELLA: Record<TipoCatalogo, string> = { negozio: 'negozio', articolo: 'articolo', libro: 'libro', film: 'film', attivita: 'attivita', luogo: 'luogo', domanda: 'domanda', cruciverba: 'cruciverba' };

/** Quel che cambia da un tipo all'altro, raccolto in un posto solo.
 *
 * Prima erano `if (tipo === 'articolo')` sparsi in cinque funzioni: con due tipi si leggevano
 * ancora, con cinque sarebbero diventati il posto dove si dimentica un caso. Qui si vede a colpo
 * d'occhio che cosa ha ogni tabella, e aggiungerne una è una riga.
 *
 * - `condizioniDa`: i campi in prosa da cui si ricavano le condizioni, per le sole tabelle che
 *   hanno `condizioni_json`. Le altre non ne hanno, e non se ne inventano;
 * - `haVerificato`: la colonna che distingue il dato della guida da quello di fonte secondaria.
 *   Una riga aggiunta a mano parte da «non verificata», che è la verità;
 * - `padre`: il riferimento che deve esistere davvero — un articolo senza il suo negozio, o
 *   un'attività in un quartiere inventato, sparirebbe dalle pagine senza dire perché;
 * - `raggruppaOrdinePer`: dove l'ordine è relativo al genitore invece che globale;
 * - `campoNome`: la colonna che fa da titolo. Quasi ovunque è `nome`; una domanda in classe si
 *   chiama con **la domanda** e una riga del cruciverba col suo **indizio**, perché quelle tabelle
 *   una colonna `nome` non ce l'hanno e senza questo l'elenco mostrerebbe la chiave, cioè una data;
 * - `etichettaCampoNome`: come chiamarlo quando manca, nel messaggio d'errore;
 * - `nomeTipo`: come nominare la riga nei messaggi, articolo determinativo compreso. */
const PROFILO: Record<TipoCatalogo, {
  condizioniDa?: (d: Record<string, unknown>) => Array<string | null>;
  haVerificato: boolean;
  padre?: { campo: string; tabella: string; codice: string; nome: string };
  raggruppaOrdinePer?: string;
  campoNome: string;
  etichettaCampoNome: string;
  nomeTipo: string;
}> = {
  negozio: { haVerificato: false, campoNome: 'nome', etichettaCampoNome: 'Il nome', nomeTipo: 'Il negozio' },
  articolo: { haVerificato: true, padre: { campo: 'negozio_chiave', tabella: 'negozio', codice: 'negozio-sconosciuto', nome: 'Il negozio' }, raggruppaOrdinePer: 'negozio_chiave', campoNome: 'nome', etichettaCampoNome: 'Il nome', nomeTipo: "L'articolo" },
  libro: { haVerificato: true, campoNome: 'nome', etichettaCampoNome: 'Il nome', nomeTipo: 'Il libro' },
  // `periodo` non è più nello schema (voce 11): resta qui solo per `eliminaElemento`, che ripristina istantanee
  // (`seed_json`) di prima, dove la frase c'era ancora e va convertita in condizioni come allora.
  film: { condizioniDa: (d) => [d.periodo as string | null], haVerificato: true, campoNome: 'nome', etichettaCampoNome: 'Il nome', nomeTipo: 'Il film' },
  attivita: { condizioniDa: (d) => [d.sblocco as string | null], haVerificato: true, padre: { campo: 'luogo_chiave', tabella: 'quartiere', codice: 'quartiere-sconosciuto', nome: 'Il quartiere' }, campoNome: 'nome', etichettaCampoNome: 'Il nome', nomeTipo: "L'attività" },
  luogo: { haVerificato: true, padre: { campo: 'quartiere_chiave', tabella: 'quartiere', codice: 'quartiere-sconosciuto', nome: 'Il quartiere' }, raggruppaOrdinePer: 'quartiere_chiave', campoNome: 'nome', etichettaCampoNome: 'Il nome', nomeTipo: 'Il luogo' },
  domanda: { haVerificato: false, campoNome: 'domanda', etichettaCampoNome: 'Il testo della domanda', nomeTipo: 'La domanda' },
  cruciverba: { haVerificato: false, campoNome: 'indizio', etichettaCampoNome: "L'indizio", nomeTipo: 'La riga del cruciverba' },
};

type Riga = Record<string, unknown> & { chiave: string; origine: string; nascosto: number; seed_json: string | null; updated_at: string | null };

/** La riga intera di un tipo del catalogo (anche nascosta o del seed); 404 se la chiave non esiste. */
function riga(tipo: TipoCatalogo, chiave: string): Riga {
  const r = prepared(`SELECT * FROM ${TABELLA[tipo]} WHERE chiave = ?`).get(chiave) as Riga | undefined;
  if (!r) throw httpErrors.notFound(`${tipo}-non-trovato`, `${PROFILO[tipo].nomeTipo} '${chiave}' non esiste.`);
  return r;
}

/** Gli indirizzi storici aprono lo stesso punto di modifica, non una copia non più letta. */
function chiaveCondivisa(tipo: TipoCatalogo, chiave: string): string {
  if (tipo !== 'negozio' && tipo !== 'articolo') return chiave;
  const l = lettureListiniCondivisi();
  return tipo === 'negozio' ? listinoDelNegozio(chiave, l) : articoloDelListino(chiave, l);
}

/** Una riga come elemento del catalogo: i soli campi scrivibili del tipo (`CAMPI`, assenti come null), il titolo dalla
 *  colonna del profilo (o la chiave se vuoto), l'origine, se è una riga del seed corretta (utente con `seed_json`) e se è nascosta. */
function dto(tipo: TipoCatalogo, r: Riga): ElementoCatalogoDto {
  const dati: Record<string, unknown> = {};
  for (const c of campiDisponibili(tipo)) dati[c] = r[c] ?? null;
  if (tipo === 'attivita') dati._fonteConfidente = fonteConfidenteAttivita(r);
  if (tipo === 'articolo' && 'costo_json' in r) dati.costo_json = r.costo_json;
  const oggetto = typeof r.catalogo_chiave === 'string' ? riferimentoOggetto(r.catalogo_chiave) : null;
  if (categoriaLettura(tipo, r) && oggetto) {
    dati.nome = oggetto.nome; dati.nome_it = oggetto.nome;
    dati._catalogoCasa = oggetto.casa;
  }
  return {
    tipo, chiave: r.chiave, nome: oggetto?.nome ?? (tipo === 'articolo' && !r.nome ? 'Oggetto da collegare' : String(r[PROFILO[tipo].campoNome] ?? r.chiave)), origine: r.origine === 'utente' ? 'utente' : 'seed',
    modificata: r.origine === 'utente' && r.seed_json !== null, nascosta: r.nascosto === 1,
    aggiornata: r.updated_at, dati,
  };
}

function categoriaLettura(tipo: TipoCatalogo, dati: Record<string, unknown>): 'libro' | 'film' | 'videogioco' | null {
  return tipo === 'libro' || tipo === 'film' ? tipo : tipo === 'attivita' && dati.tipo === 'videogioco' ? 'videogioco' : null;
}

/** Crea il riferimento diretto soltanto per una sorgente esplicitamente aggiunta/corretta dall'utente. */
function assicuraIdentitaLettura(tipo: TipoCatalogo, chiave: string, nome: string): void {
  if (!catalogoOggettiDisponibile()) return;
  const sorgente = riga(tipo, chiave);
  const categoria = categoriaLettura(tipo, sorgente);
  if (!categoria || typeof sorgente.catalogo_chiave === 'string') return;
  const o = creaOggetto({ categoria, nome, sottocategoria: tipo === 'film' && typeof sorgente.dove === 'string' ? sorgente.dove : null,
    nomiAltri: [], nomeOriginale: null, effetto: '', descrizione: typeof sorgente.dettagli === 'string' ? sorgente.dettagli : '', statistiche: null });
  prepared(`UPDATE ${TABELLA[tipo]} SET catalogo_chiave = ? WHERE chiave = ?`).run(o.chiave, chiave);
}

/** Prima di M7 non legge/scrive la colonna nuova, neppure negli snapshot dei gesti esistenti. */
function campiDisponibili(tipo: TipoCatalogo): readonly string[] {
  return tipo === 'articolo' && !catalogoOggettiDisponibile() ? CAMPI[tipo].filter((c) => c !== 'catalogo_chiave' && c !== 'costo_json') : CAMPI[tipo];
}

function legameStoricoCambiato(d: Record<string, unknown>, r: Riga | null): boolean {
  return ['oggetto_fonte', 'oggetto_chiave'].some((c) => c in d && (d[c] ?? null) !== (r?.[c] ?? null));
}

/** Compatibilità dei vecchi corpi: risolve soltanto la fonte/chiave dichiarata, non il nome. */
function chiaveDaLegameStorico(d: Record<string, unknown>, r: Riga | null): string | null {
  const fonte = 'oggetto_fonte' in d ? d.oggetto_fonte : r?.oggetto_fonte;
  const chiave = 'oggetto_chiave' in d ? d.oggetto_chiave : r?.oggetto_chiave;
  if (fonte == null && chiave == null) return null;
  if (fonte === 'catalogo' && typeof chiave === 'string') {
    const o = prepared('SELECT chiave FROM catalogo_oggetto WHERE chiave = ? AND nascosto = 0').get(chiave) as { chiave: string } | undefined;
    if (!o) throw httpErrors.badRequest('oggetto-sconosciuto', 'L’oggetto scelto non è disponibile nel catalogo.');
    return o.chiave;
  }
  const fonti: Record<string, Parameters<typeof oggettiPerFonte>[0]> = { equipaggiamento: 'equipaggiamento', guida: 'guida', libri: 'libro', film: 'film', videogiochi: 'videogioco' };
  const tipoFonte = typeof fonte === 'string' ? fonti[fonte] : undefined;
  const oggetto = tipoFonte && typeof chiave === 'string' ? oggettiPerFonte(tipoFonte, [chiave]).get(chiave) : undefined;
  if (!oggetto || oggetto.nascosto) throw httpErrors.badRequest('oggetto-sconosciuto', 'Il vecchio collegamento non identifica un oggetto disponibile del catalogo: scegli l’identità da collegare.');
  return oggetto.chiave;
}

/** Chiave libera a partire dal nome: `u-<slug>` (articolo: `<negozio>/u-<slug>`), con suffisso numerico se già presa. */
function chiaveLibera(tipo: TipoCatalogo, nome: string, negozio?: string): string {
  const base = slug(nome) || 'senza-nome';
  // Le chiavi degli articoli sono annidate sotto il negozio (`untouchable/pugnale`) e quelle dei
  // luoghi sotto il quartiere (`shibuya/untouchable`), quindi anche quelle aggiunte lo sono; per gli
  // altri tipi la chiave è piatta.
  const prefisso = tipo === 'articolo' || tipo === 'luogo' ? `${negozio}/u-` : 'u-';
  let chiave = `${prefisso}${base}`.slice(0, 190);
  for (let i = 2; prepared(`SELECT 1 FROM ${TABELLA[tipo]} WHERE chiave = ?`).get(chiave); i++) {
    const suffisso = `-${i}`;
    chiave = `${prefisso}${base}`.slice(0, 190 - suffisso.length) + suffisso;
  }
  return chiave;
}

/** I riferimenti indicati devono esistere davvero: un negozio in un quartiere inventato sparirebbe dalle pagine. */
function verificaRiferimenti(tipo: TipoCatalogo, dati: Record<string, unknown>, esistente: Riga | null = null): void {
  /** Vero se la chiave è una stringa e nella tabella indicata c'è una riga con quella chiave. */
  const esiste = (tabella: string, chiave: unknown) => typeof chiave === 'string' && !!prepared(`SELECT 1 FROM ${tabella} WHERE chiave = ?`).get(chiave);
  // la sede di un negozio o di un'attività è un luogo della città, e deve esistere
  if ((tipo === 'negozio' || tipo === 'attivita') && dati.sede_chiave != null && !esiste('luogo', dati.sede_chiave)) throw httpErrors.badRequest('luogo-sconosciuto', `Il luogo '${String(dati.sede_chiave)}' non esiste.`);
  if (tipo === 'negozio') {
    if (dati.luogo_chiave != null && !esiste('quartiere', dati.luogo_chiave)) throw httpErrors.badRequest('quartiere-sconosciuto', `Il quartiere '${String(dati.luogo_chiave)}' non esiste.`);
    if (dati.confidente_chiave != null && !esiste('confidente', dati.confidente_chiave)) throw httpErrors.badRequest('confidente-sconosciuto', `Il Confidente '${String(dati.confidente_chiave)}' non esiste.`);
    return;
  }
  const padre = PROFILO[tipo].padre;
  if (padre && dati[padre.campo] != null && !esiste(padre.tabella, dati[padre.campo])) {
    throw httpErrors.badRequest(padre.codice, `${padre.nome} '${String(dati[padre.campo])}' non esiste.`);
  }
  if (tipo === 'articolo' && dati.oggetto_fonte === 'catalogo' && !catalogoOggettiDisponibile()) throw httpErrors.conflict('catalogo-non-disponibile', 'Il catalogo degli oggetti non è ancora disponibile.');
  if (tipo === 'articolo' && (dati.catalogo_chiave != null || (catalogoOggettiDisponibile() && legameStoricoCambiato(dati, esistente)))) {
    if (!catalogoOggettiDisponibile()) throw httpErrors.conflict('catalogo-non-disponibile', 'Il catalogo degli oggetti non è ancora disponibile.');
    const chiave = 'catalogo_chiave' in dati ? dati.catalogo_chiave : chiaveDaLegameStorico(dati, esistente);
    if (chiave != null) {
      if (esistente?.chiave && prepared("SELECT 1 FROM ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave = ?").get(esistente.chiave)) {
        throw httpErrors.conflict('offerta-con-risultati', 'Questa offerta ha risultati collegati nel listino: correggili lì oppure toglili prima di scegliere un oggetto singolo.');
      }
      const o = prepared('SELECT nascosto FROM catalogo_oggetto WHERE chiave = ?').get(chiave) as { nascosto: number } | undefined;
      if (!o || (o.nascosto === 1 && chiave !== esistente?.catalogo_chiave)) throw httpErrors.badRequest('oggetto-sconosciuto', 'L’oggetto scelto non è disponibile nel catalogo.');
    }
  }
  if (tipo === 'articolo' && dati.costo_json != null) {
    if (!catalogoOggettiDisponibile()) throw httpErrors.conflict('catalogo-non-disponibile', 'Il catalogo degli oggetti non è ancora disponibile.');
    const costo = normalizzaCostoScambio(dati.costo_json);
    if (!costo) throw httpErrors.badRequest('costo-non-valido', 'Completa il costo dello scambio prima di salvare.');
    if (costo.tipo === 'oggetti') {
      const prima = normalizzaCostoScambio(esistente?.costo_json);
      const giaUsate = new Set(prima?.tipo === 'oggetti' ? prima.oggetti.map((o) => o.chiave) : []);
      const righe = prepared(`SELECT chiave,nascosto FROM catalogo_oggetto WHERE chiave IN (${costo.oggetti.map(() => '?').join(',')})`).all(...costo.oggetti.map((o) => o.chiave)) as Array<{ chiave: string; nascosto: number }>;
      const disponibili = new Map(righe.map((r) => [r.chiave, r.nascosto]));
      if (costo.oggetti.some((o) => !disponibili.has(o.chiave) || (disponibili.get(o.chiave) === 1 && !giaUsate.has(o.chiave)))) {
        throw httpErrors.badRequest('oggetto-costo-sconosciuto', 'Un oggetto da cedere non è disponibile nel catalogo: scegli un’identità esistente.');
      }
    }
  }
  // L5: l'Area di un luogo è del suo quartiere; i Confidenti citati esistono
  if (tipo === 'luogo') {
    if (dati.area_chiave != null) {
      const a = prepared('SELECT quartiere_chiave FROM area WHERE chiave = ?').get(dati.area_chiave) as { quartiere_chiave: string | null } | undefined;
      if (!a) throw httpErrors.badRequest('area-sconosciuta', `L’area '${String(dati.area_chiave)}' non esiste.`);
      const quartiere = typeof dati.quartiere_chiave === 'string' ? dati.quartiere_chiave : esistente?.quartiere_chiave;
      if (quartiere && a.quartiere_chiave !== quartiere) throw httpErrors.badRequest('area-di-altro-quartiere', 'L’area scelta è di un altro quartiere.');
    }
    if (typeof dati.confidenti_json === 'string') {
      for (const c of JSON.parse(dati.confidenti_json) as string[]) if (!esiste('confidente', c)) throw httpErrors.badRequest('confidente-sconosciuto', `Il Confidente '${c}' non esiste.`);
    }
  }
}

/** Le regole che valgono su ogni scrittura, prima di toccare la tabella.
 *
 * - **Invariante della sede** (072): con una sede, `luogo_chiave` è il quartiere della sede;
 * - **effetti dal modulo vecchio**: finché il modulo scrive `dote`/`note`/`note_successive` (libri,
 *   film), `effetto_json` (libri) o `doti_json` (attività) senza `effetti_json`, la dichiarazione
 *   strutturata si ricava da lì come ha fatto la migrazione 074 — ma **solo se quei campi cambiano
 *   davvero** rispetto alla riga, e conservando le voci che non vengono da lì (uno «sblocca un
 *   quartiere» letto dalla prosa, una voce «descrittivo», le voci con condizioni come lo studio
 *   con la pioggia): il modulo rimanda sempre tutti i campi, e ricostruire ogni volta cancellerebbe
 *   ciò che la migrazione aveva ricavato. Su una riga nuova non c'è niente da conservare;
 * - **tracciamento** dal tipo, dove il modulo non lo dice. */
const CAMPI_EFFETTI: Record<string, readonly string[]> = { libro: ['dote', 'note', 'effetto_json'], film: ['dote', 'note', 'note_successive'], attivita: ['doti_json'] };

/** Le voci di effetto ricavate dai campi del modulo vecchio: per libri e film la Dote con le sue note (e, per i film, la
 *  voce `ripetuto` con `note_successive`), per i libri anche `effetto_json`, per le attività ogni Dote di `doti_json`.
 *  Un JSON illeggibile non dà voci. */
function vociDaiCampiVecchi(tipo: TipoCatalogo, d: Record<string, unknown>): VoceEffetto[] {
  /** Una voce «dote» se nome e note sono validi (nome non vuoto, note numeriche positive), con la chiave in minuscolo; altrimenti null. */
  const dote = (nome: unknown, note: unknown, extra: Partial<VoceEffetto> = {}): VoceEffetto | null =>
    typeof nome === 'string' && nome && typeof note === 'number' && note > 0 ? { effetto: { famiglia: 'dote', dote: nome.toLowerCase(), note }, ...extra } : null;
  const voci: VoceEffetto[] = [];
  if (tipo === 'libro' || tipo === 'film') {
    const prima = dote(d.dote, d.note); if (prima) voci.push(prima);
    if (tipo === 'film') { const dopo = dote(d.dote, d.note_successive, { ripetuto: true }); if (dopo) voci.push(dopo); }
    if (tipo === 'libro' && typeof d.effetto_json === 'string') { try { voci.push(...normalizzaVociEffetto([{ effetto: JSON.parse(d.effetto_json) }])); } catch { /* dichiarazione illeggibile: nessuna voce */ } }
  }
  if (tipo === 'attivita' && typeof d.doti_json === 'string') {
    let doti: Array<{ dote?: string | null; note?: number | null }> = [];
    try { doti = JSON.parse(d.doti_json) as typeof doti; } catch { doti = []; }
    voci.push(...doti.map((x) => dote(x.dote, x.note)).filter((v): v is VoceEffetto => v !== null));
  }
  return voci;
}

/** Vero se una voce viene dai campi vecchi (una Dote semplice, senza condizioni): è quella che si può ricostruire. */
const eVoceDerivabile = (v: VoceEffetto) => v.effetto.famiglia === 'dote' && !(v.condizioni && v.condizioni.length);

/** Applica ai dati in arrivo le regole descritte sopra `CAMPI_EFFETTI`: quartiere ricavato dalla sede, `effetti_json`
 *  ricostruito dai campi vecchi solo se cambiano (tenendo le voci non derivabili della riga), tracciamento dal tipo su
 *  un'attività nuova, e `effetti_json` sempre normalizzato (illeggibile → lista vuota). Non tocca l'oggetto ricevuto. */
function normalizzaScrittura(tipo: TipoCatalogo, dati: Record<string, unknown>, esistente: Riga | null): Record<string, unknown> {
  const d = { ...dati };
  const collegata = tipo === 'attivita' && (d.confidente_chiave !== undefined ? d.confidente_chiave : esistente?.confidente_chiave) != null;
  if (collegata) verificaCampiAttivitaConfidente({ ...esistente, ...d }, esistente);
  if (catalogoOggettiDisponibile() && categoriaLettura(tipo, { ...esistente, ...d })) {
    delete d.prezzo;
    if (tipo === 'attivita') delete d.costo;
  }
  if (tipo === 'articolo') {
    const conCatalogo = catalogoOggettiDisponibile();
    if (!conCatalogo) { delete d.catalogo_chiave; delete d.costo_json; }
    else if (!('catalogo_chiave' in d) && legameStoricoCambiato(d, esistente)) d.catalogo_chiave = chiaveDaLegameStorico(d, esistente);
    const chiave = 'catalogo_chiave' in d ? d.catalogo_chiave : esistente?.catalogo_chiave;
    if (d.costo_json != null) d.prezzo = null;
    if (conCatalogo && typeof chiave === 'string') {
      // Questi campi sono solo residui storici: non si copiano né si corregge l'identità dal listino.
      for (const c of ['nome', 'nome_it', 'categoria', 'per', 'effetto_json', 'effetto', 'statistiche']) delete d[c];
      // I vecchi NOT NULL restano fino a L11; valori vuoti/non classificati, mai una copia del nome.
      if (!esistente) { d.nome = ''; d.categoria = 'altro'; }
      if ('catalogo_chiave' in dati && dati.catalogo_chiave !== esistente?.catalogo_chiave) { d.oggetto_fonte = null; d.oggetto_chiave = null; }
    } else {
      if (!esistente && d.categoria === undefined) d.categoria = 'altro';
      const nome = typeof d.nome === 'string' ? d.nome.trim() : esistente?.nome;
      if (!nome) throw httpErrors.badRequest('nome-mancante', 'Per un’offerta senza oggetto collegato indica il nome.');
    }
  }
  if ((tipo === 'negozio' || tipo === 'attivita') && typeof d.sede_chiave === 'string') {
    const q = prepared('SELECT quartiere_chiave FROM luogo WHERE chiave = ?').get(d.sede_chiave) as { quartiere_chiave: string } | undefined;
    if (q) d.luogo_chiave = q.quartiere_chiave;
  }
  const campi = collegata ? [] : CAMPI_EFFETTI[tipo] ?? [];
  if (campi.length && d.effetti_json === undefined && campi.some((c) => c in d)) {
    const cambiati = !esistente || campi.some((c) => c in d && (d[c] ?? null) !== (esistente[c] ?? null));
    if (cambiati) {
      const attuali = esistente ? normalizzaVociEffetto((() => { try { return JSON.parse(String(esistente.effetti_json ?? '[]')); } catch { return []; } })()) : [];
      // i campi vecchi non inviati si leggono dalla riga: un PUT che tocca solo `note_successive` non deve perdere la voce della prima visione
      const campiVecchi = Object.fromEntries(campi.map((c) => [c, c in d ? d[c] : (esistente?.[c] ?? null)]));
      d.effetti_json = JSON.stringify(normalizzaVociEffetto([...vociDaiCampiVecchi(tipo, campiVecchi), ...attuali.filter((v) => !eVoceDerivabile(v))]));
    }
  }
  if (tipo === 'attivita' && d.tracciamento === undefined && typeof d.tipo === 'string' && !esistente) d.tracciamento = collegata ? 'nessuno' : tracciamentoPerTipo(d.tipo);
  if (!collegata && typeof d.effetti_json === 'string') { try { d.effetti_json = JSON.stringify(normalizzaVociEffetto(JSON.parse(d.effetti_json))); } catch { d.effetti_json = '[]'; } }
  return d;
}

/** Riepilogo per la sezione «Catalogo» delle Impostazioni: quante righe ha aggiunto, corretto o nascosto l'utente. */
export function riepilogoCatalogo(): RiepilogoCatalogoDto {
  const perTipo = (Object.keys(TABELLA) as TipoCatalogo[]).map((tipo) => {
    const t = TABELLA[tipo];
    /** Quante righe della tabella soddisfano la condizione SQL data. */
    const n = (sql: string) => (prepared(`SELECT COUNT(*) AS n FROM ${t} WHERE ${sql}`).get() as { n: number }).n;
    return { tipo, creati: n("origine = 'utente' AND seed_json IS NULL"), modificati: n("origine = 'utente' AND seed_json IS NOT NULL"), nascosti: n('nascosto = 1'), totale: n('1 = 1') };
  });
  return { perTipo };
}

/** Righe del catalogo toccate dall'utente (create, corrette o nascoste), per tipo. */
export function elencaCatalogo(tipo: TipoCatalogo): ElementoCatalogoDto[] {
  // Le tabelle senza colonna `nome` — domande e cruciverba — si ordinano per chiave, che per loro
  // è il giorno: è anche l'ordine in cui uno le cerca.
  const per = PROFILO[tipo].campoNome === 'nome' ? 'nome' : 'chiave';
  const righe = prepared(`SELECT * FROM ${TABELLA[tipo]} WHERE origine = 'utente' OR nascosto = 1 ORDER BY ${per}`).all() as Riga[];
  return righe.map((r) => dto(tipo, r));
}

/** Le righe nascoste di un tipo (per la pagina «Rimossi»), eventualmente di un solo negozio. */
export function elencaNascosti(tipo: TipoCatalogo, filtro: { negozio?: string } = {}): ElementoCatalogoDto[] {
  const per = PROFILO[tipo].campoNome === 'nome' ? 'nome' : 'chiave';
  const perNegozio = filtro.negozio && tipo === 'articolo' ? ' AND negozio_chiave = ?' : '';
  const par = perNegozio ? [filtro.negozio] : [];
  const righe = prepared(`SELECT * FROM ${TABELLA[tipo]} WHERE nascosto = 1${perNegozio} ORDER BY ${per}`).all(...par) as Riga[];
  return righe.map((r) => dto(tipo, r));
}

/** Una riga qualunque del catalogo (anche del seed), per il modulo di modifica. */
export function leggiElemento(tipo: TipoCatalogo, chiave: string): ElementoCatalogoDto {
  return dto(tipo, riga(tipo, chiaveCondivisa(tipo, chiave)));
}

/** L'ordine da dare a una riga nuova: uno più del massimo, fra le righe dello stesso genitore dove l'ordine è relativo
 *  (`raggruppaOrdinePer`), altrimenti su tutta la tabella. */
function ordineSuccessivo(tipo: TipoCatalogo, dati: Record<string, unknown>): number {
  const per = PROFILO[tipo].raggruppaOrdinePer;
  if (per) return ((prepared(`SELECT MAX(ordine) AS m FROM ${TABELLA[tipo]} WHERE ${per} = ?`).get(dati[per]) as { m: number | null }).m ?? 0) + 1;
  return ((prepared(`SELECT MAX(ordine) AS m FROM ${TABELLA[tipo]}`).get() as { m: number | null }).m ?? 0) + 1;
}

function verificaTipoVideogioco(tipo: TipoCatalogo, attuale: Riga, nuovoTipo: unknown): void {
  if (tipo !== 'attivita' || attuale.tipo !== 'videogioco' || nuovoTipo === 'videogioco') return;
  if (typeof attuale.catalogo_chiave === 'string' || prepared('SELECT 1 FROM progresso_videogioco_partita WHERE videogioco_chiave = ? LIMIT 1').get(attuale.chiave)
    || prepared('SELECT 1 FROM sessione_videogioco_partita WHERE videogioco_chiave = ? LIMIT 1').get(attuale.chiave)) {
    throw httpErrors.conflict('videogioco-con-avanzamento', 'Questa attività è un videogioco collegato al catalogo o a progressi registrati. Il cambio di tipo li renderebbe incoerenti: nessun dato è stato cambiato.');
  }
}

type OperazioneCondizioni = 'creazione' | 'ripristino';

/** Nessun testo o fotografia privati nei dettagli: soltanto esito, campi e motivo classificato. */
function condizioniDaDefinire(operazione: OperazioneCondizioni, motivo: string, scarti = 0): never {
  const messaggio = operazione === 'ripristino'
    ? 'La fotografia della guida contiene condizioni incomplete o non leggibili. Nessun dato è stato ripristinato e la fotografia è conservata. Puoi modificare la riga corrente come gesto distinto; tale modifica non corregge la fotografia e non rende possibile questo ripristino.'
    : 'Le condizioni non sono interamente definite. Nessun dato è stato salvato: definisci le condizioni nell’editor prima di procedere.';
  throw httpErrors.conflict('condizioni-da-definire', messaggio,
    { operazione, campi: ['condizioni_json'], motivo, scarti });
}

/** Valida senza riscrivere la fotografia: anche una forma che perderebbe campi richiede una scelta esplicita. */
function verificaFormulaCompleta(valore: unknown, operazione: OperazioneCondizioni): string {
  let formula: unknown = valore;
  if (typeof valore === 'string') {
    try { formula = JSON.parse(valore); }
    catch { condizioniDaDefinire(operazione, 'formula-illeggibile'); }
  }
  if (!Array.isArray(formula) || formula.length > 20) condizioniDaDefinire(operazione, 'formula-non-valida');
  const normalizzate = formula.map((c) => normalizzaRequisitoSpillo(c));
  if (normalizzate.some((c) => c === null) || !isDeepStrictEqual(formula, normalizzate)) condizioniDaDefinire(operazione, 'formula-non-supportata');
  try { verificaCondizioni(formula as RequisitoSpillo[]); }
  catch (err) {
    if (operazione === 'ripristino' && err instanceof HttpError && err.status < 500) condizioniDaDefinire(operazione, 'riferimenti-non-validi');
    throw err;
  }
  return typeof valore === 'string' ? valore : JSON.stringify(formula);
}

/** Conversione accettata soltanto se completa; una frase ignota non equivale a nessuna condizione. */
function condizioniCompleteDaProsa(tipo: TipoCatalogo, chiave: string, dati: Record<string, unknown>, operazione: OperazioneCondizioni): string {
  const testi = PROFILO[tipo].condizioniDa?.(dati) ?? [];
  if (testi.some((t) => t != null && typeof t !== 'string')) condizioniDaDefinire(operazione, 'prosa-non-valida');
  const esito = convertiProsa(testi, contestoRiga(getDb(), contestoConversione(getDb()), {
    tabella: tipo, chiave, negozio_chiave: dati.negozio_chiave, confidente_chiave: dati.confidente_chiave, catalogo_chiave: dati.catalogo_chiave,
  }));
  if (esito.scartate.length) condizioniDaDefinire(operazione, 'prosa-incompleta', esito.scartate.length);
  verificaFormulaCompleta(esito.condizioni, operazione);
  return JSON.stringify(esito.condizioni);
}

/** Crea una riga del catalogo e l'eventuale identità nella stessa transazione, compresi conversione e riferimenti. */
export function creaElemento(tipo: TipoCatalogo, grezzi: Record<string, unknown>): ElementoCatalogoDto {
  const elemento = getDb().transaction(() => creaElementoNellaTransazione(tipo, grezzi))();
  invalidaCacheDiGioco();
  return elemento;
}

function creaElementoNellaTransazione(tipo: TipoCatalogo, grezzi: Record<string, unknown>): ElementoCatalogoDto {
  if (tipo === 'negozio' && typeof grezzi.sblocco_json === 'string') verificaCondizioni(JSON.parse(grezzi.sblocco_json));
  if (tipo === 'articolo' && typeof grezzi.negozio_chiave === 'string') grezzi = { ...grezzi, negozio_chiave: chiaveCondivisa('negozio', grezzi.negozio_chiave) };
  if (grezzi.condizioni_json != null) grezzi = { ...grezzi, condizioni_json: verificaFormulaCompleta(grezzi.condizioni_json, 'creazione') };
  verificaRiferimenti(tipo, grezzi);
  const dati = normalizzaScrittura(tipo, grezzi, null);
  if (tipo === 'attivita') verificaAttivitaConfidente(getDb(), dati);
  const nome = tipo === 'articolo' && typeof dati.catalogo_chiave === 'string' ? riferimentoOggetto(dati.catalogo_chiave)?.nome ?? ''
    : typeof dati[PROFILO[tipo].campoNome] === 'string' ? String(dati[PROFILO[tipo].campoNome]).trim() : '';
  if (!nome) throw httpErrors.badRequest('nome-mancante', `${PROFILO[tipo].etichettaCampoNome} è obbligatorio.`);
  const chiave = chiaveLibera(tipo, nome, typeof dati.negozio_chiave === 'string' ? dati.negozio_chiave : typeof dati.quartiere_chiave === 'string' ? dati.quartiere_chiave : undefined);
  const adesso = nowIso();
  // Si scrivono **solo le colonne che il modulo ha davvero compilato**: quelle lasciate vuote le
  // riempie il valore predefinito della tabella. Scrivendo `null` su tutte, come si faceva prima,
  // si scavalca il predefinito — e con `attivita.sessioni`, che è `NOT NULL DEFAULT 1`, la
  // creazione falliva con un errore di vincolo che l'utente si vedeva come «errore interno».
  const valori: Record<string, unknown> = { chiave, ordine: ordineSuccessivo(tipo, dati), origine: 'utente', nascosto: 0, updated_at: adesso };
  const compilate = campiDisponibili(tipo).filter((c) => dati[c] !== undefined);
  // SQLite non ha booleani: `verificato` viaggia come `true`/`false` e in tabella e' 1/0.
  for (const c of compilate) valori[c] = c === 'verificato' ? (dati[c] === true ? 1 : 0) : (dati[c] ?? null);
  const colonne = ['chiave', 'ordine', ...compilate, 'origine', 'nascosto', 'updated_at'];
  const daProsa = PROFILO[tipo].condizioniDa;
  if (daProsa && valori.condizioni_json == null) {
    valori.condizioni_json = condizioniCompleteDaProsa(tipo, chiave, dati, 'creazione');
    if (!colonne.includes('condizioni_json')) colonne.push('condizioni_json');
  }
  // **Quel che aggiungi tu e' verificato: la fonte sei tu.**
  //
  // Nasceva a `verificato = 0`, e la scheda lo mostrava come «da fonte secondaria» — un marchio che
  // si poteva solo mettere, perche' il campo non era ne' nel modulo ne' accettato dall'API: ogni
  // riga inserita restava «da verificare» per sempre, senza che esistesse un modo di verificarla.
  // Ma il problema non era il modo mancante: era il significato. `verificato` distingue il dato
  // confermato da quello preso da una fonte secondaria della guida, e una riga che scrive chi gioca
  // guardando il gioco e' confermata quanto le altre.
  //
  // Quel che davvero la distingue e' **da dove viene**, e per quello c'e' gia' `origine = 'utente'`:
  // e' l'informazione utile — questa riga e' tua e va ancora recepita nel seed canonico — ed e'
  // quella che la scheda mostra.
  if (PROFILO[tipo].haVerificato) valori.verificato = dati.verificato === false ? 0 : 1;
  const extra = PROFILO[tipo].haVerificato ? ', verificato' : '';
  const extraVal = PROFILO[tipo].haVerificato ? ', @verificato' : '';
  if (tipo === 'attivita') verificaAttivitaConfidente(getDb(), valori);
  prepared(`INSERT INTO ${TABELLA[tipo]} (${colonne.join(', ')}${extra}) VALUES (${colonne.map((c) => `@${c}`).join(', ')}${extraVal})`).run(valori);
  assicuraIdentitaLettura(tipo, chiave, nome);
  return dto(tipo, riga(tipo, chiave));
}

/** Modifica una riga: quella del seed viene «adottata» dall'utente conservando l'originale in `seed_json`. */
export function aggiornaElemento(tipo: TipoCatalogo, chiave: string, grezzi: Record<string, unknown>): ElementoCatalogoDto {
  const elemento = getDb().transaction(() => aggiornaElementoNellaTransazione(tipo, chiave, grezzi))();
  invalidaCacheDiGioco();
  return elemento;
}

function aggiornaElementoNellaTransazione(tipo: TipoCatalogo, chiave: string, grezzi: Record<string, unknown>): ElementoCatalogoDto {
  if (tipo === 'negozio' && typeof grezzi.sblocco_json === 'string') verificaCondizioni(JSON.parse(grezzi.sblocco_json));
  chiave = chiaveCondivisa(tipo, chiave);
  if (tipo === 'articolo' && typeof grezzi.negozio_chiave === 'string') grezzi = { ...grezzi, negozio_chiave: chiaveCondivisa('negozio', grezzi.negozio_chiave) };
  const r = riga(tipo, chiave);
  if (typeof grezzi.condizioni_json === 'string') verificaCondizioni(JSON.parse(grezzi.condizioni_json));
  verificaRiferimenti(tipo, grezzi, r);
  const dati = normalizzaScrittura(tipo, grezzi, r);
  if (tipo === 'attivita') verificaAttivitaConfidente(getDb(), { ...r, ...dati }, r);
  const lettura = categoriaLettura(tipo, { ...r, ...dati });
  const titolo = lettura && typeof dati.nome === 'string' ? dati.nome.trim() : null;
  if (lettura && catalogoOggettiDisponibile()) {
    // Il titolo si modifica sull'identità; i valori storici della sorgente non si riscrivono.
    delete dati.nome; delete dati.nome_it; delete dati.prezzo;
    if (tipo === 'attivita') delete dati.costo;
  }
  const adesso = nowIso();
  const campi = campiDisponibili(tipo);
  const seedJson = r.seed_json ?? (r.origine === 'seed' ? JSON.stringify(Object.fromEntries(campi.map((c) => [c, r[c] ?? null]))) : null);
  const set = campi.filter((c) => c in dati).map((c) => `${c} = @${c}`);
  const valori: Record<string, unknown> = { chiave, origine: 'utente', seed_json: seedJson, updated_at: adesso };
  for (const c of campi) if (c in dati) valori[c] = c === 'verificato' ? (dati[c] === true ? 1 : 0) : (dati[c] ?? null);
  getDb().transaction(() => {
    verificaTipoVideogioco(tipo, r, dati.tipo ?? r.tipo);
    prepared(`UPDATE ${TABELLA[tipo]} SET ${[...set, "origine = 'utente'", 'seed_json = @seed_json', 'updated_at = @updated_at'].join(', ')} WHERE chiave = @chiave`).run(valori);
    if (lettura && catalogoOggettiDisponibile()) {
      assicuraIdentitaLettura(tipo, chiave, titolo || String(r.nome));
      const aggiornata = riga(tipo, chiave);
      if (titolo && typeof aggiornata.catalogo_chiave === 'string') aggiornaOggetto(aggiornata.catalogo_chiave, { nome: titolo });
    }
  })();
  return dto(tipo, riga(tipo, chiave));
}

/** Nasconde (o rimostra) una riga: usato per le voci del seed che nel gioco non esistono. */
export function nascondiElemento(tipo: TipoCatalogo, chiave: string, nascosta: boolean): ElementoCatalogoDto {
  chiave = chiaveCondivisa(tipo, chiave);
  const r = riga(tipo, chiave);
  const seedJson = r.seed_json ?? (r.origine === 'seed' ? JSON.stringify(Object.fromEntries(campiDisponibili(tipo).map((c) => [c, r[c] ?? null]))) : null);
  prepared(`UPDATE ${TABELLA[tipo]} SET nascosto = ?, seed_json = ?, updated_at = ? WHERE chiave = ?`).run(nascosta ? 1 : 0, seedJson, nowIso(), chiave);
  invalidaCacheDiGioco();
  return dto(tipo, riga(tipo, chiave));
}

/** I riferimenti dei pin e delle mappe sono polimorfici (tipo + chiave) e nessuna chiave esterna li segue: eliminata una riga
 *  dell'utente, chi la citava perde il collegamento invece di puntare a una cosa che non c'è (`dettaglioRiferimento` restituiva
 *  `null` in silenzio). Come per i punti della guida tolti (`eliminaArea`), il pin resta e torna senza riferimento. Un pin
 *  «attività» cita un luogo (`dettaglioRiferimento`), quindi il luogo li stacca entrambi. */
function staccaDalleMappe(tipo: TipoCatalogo, chiave: string): void {
  const tipiPin = tipo === 'luogo' ? ['luogo', 'attivita'] : tipo === 'negozio' ? ['negozio'] : [];
  for (const t of tipiPin) prepared('UPDATE spillo SET riferimento_tipo = NULL, riferimento_chiave = NULL WHERE riferimento_tipo = ? AND riferimento_chiave = ?').run(t, chiave);
  if (tipo === 'luogo' || tipo === 'negozio') {
    prepared('DELETE FROM mappa_entita WHERE entita_tipo = ? AND entita_chiave = ?').run(tipo, chiave);
    prepared('UPDATE mappa SET entita_tipo = NULL, entita_chiave = NULL WHERE entita_tipo = ? AND entita_chiave = ?').run(tipo, chiave);
  }
}

/**
 * Elimina una riga creata dall'utente, oppure riporta al seed una riga del seed che l'utente aveva corretto o nascosto.
 * Restituisce che cosa è successo, perché l'interfaccia lo dice all'utente.
 */
export function eliminaElemento(tipo: TipoCatalogo, chiave: string): { esito: 'eliminata' | 'ripristinata'; elemento: ElementoCatalogoDto | null } {
  const r = riga(tipo, chiave);
  if (r.origine === 'utente' && r.seed_json === null) {
    getDb().transaction(() => {
      // gli articoli di un negozio creato dall'utente se ne vanno con lui (chiave esterna a cascata)
      prepared(`DELETE FROM ${TABELLA[tipo]} WHERE chiave = ?`).run(chiave);
      staccaDalleMappe(tipo, chiave);
    })();
    invalidaCacheDiGioco();
    return { esito: 'eliminata', elemento: null };
  }
  return { esito: 'ripristinata', elemento: ripristinaElemento(tipo, chiave) };
}

/**
 * «Ripristina i valori della guida» (L5, M §3.2, `POST /api/catalogo/:tipo/:chiave/ripristina`, per tutti i tipi): rimette `seed_json` sulla riga.
 * 400 `creata-da-te` per una riga dell'utente (non c'è un valore della guida), 400 `riga-del-seed` per una riga della guida mai corretta. Non
 * elimina mai.
 */
export function ripristinaElemento(tipo: TipoCatalogo, chiave: string): ElementoCatalogoDto {
  const elemento = getDb().transaction(() => ripristinaElementoNellaTransazione(tipo, chiave))();
  invalidaCacheDiGioco();
  return elemento;
}

function ripristinaElementoNellaTransazione(tipo: TipoCatalogo, chiave: string): ElementoCatalogoDto {
  chiave = chiaveCondivisa(tipo, chiave);
  const r = riga(tipo, chiave);
  if (r.origine === 'utente' && r.seed_json === null) throw httpErrors.badRequest('creata-da-te', 'Questa riga l’hai creata tu: non c’è un valore della guida da rimettere. Per toglierla usa «Elimina».');
  let fotografia: unknown = null;
  if (r.seed_json !== null) {
    try { fotografia = JSON.parse(r.seed_json); }
    catch { condizioniDaDefinire('ripristino', 'fotografia-illeggibile'); }
  }
  if (r.seed_json !== null && (fotografia === null || typeof fotografia !== 'object' || Array.isArray(fotografia))) condizioniDaDefinire('ripristino', 'fotografia-non-valida');
  const originale = fotografia as Record<string, unknown> | null;
  if (!originale) throw httpErrors.badRequest('riga-del-seed', 'Questa riga arriva dai dati della guida e non è stata modificata: non c\'è nulla da ripristinare. Usa «Nascondi» se non vuoi vederla.');
  const conservaFonteConfidente = tipo === 'attivita' && r.confidente_chiave != null && !('confidente_chiave' in originale);
  if (conservaFonteConfidente) {
    for (const c of ['fascia', 'condizioni_json', 'effetti_json', 'tracciamento', 'sessioni', 'quiz_json', 'costo', 'sblocco', 'paga_yen', 'paga_massima', 'paga', 'premi', 'altri_effetti', 'doti_json']) originale[c] = r[c];
  }
  const daProsaRip = PROFILO[tipo].condizioniDa;
  if (daProsaRip && originale.condizioni_json == null) originale.condizioni_json = condizioniCompleteDaProsa(tipo, String(r.chiave), originale, 'ripristino');
  else if (originale.condizioni_json != null) originale.condizioni_json = verificaFormulaCompleta(originale.condizioni_json, 'ripristino');
  // **Un'istantanea vecchia non conosce i campi aggiunti dopo.** `seed_json` conserva la riga com'era
  // il giorno in cui l'hai corretta: se da allora la tabella ha guadagnato una colonna — `verificato`
  // e' entrata fra i campi salvati con la stellina delle righe tue — quel campo nell'istantanea non
  // c'e', e riscriverlo come `null` fa fallire il vincolo `NOT NULL` con un errore che l'utente
  // vede come «errore interno» mentre stava solo annullando una modifica.
  //
  // Il valore giusto e' quello che la riga aveva prima di essere adottata: una riga della guida e'
  // verificata, ed e' l'unico caso in cui si arriva qui.
  //
  // Stessa cosa per `giorni_json` (migrazione 080): un'istantanea di prima porta la frase `giorni`, e da quella si
  // ricavano le chiavi, come ha fatto la migrazione; senza nemmeno la frase, nessuna limitazione.
  const predefinito = (c: string): unknown => c === 'verificato' ? 1 : c === 'giorni_json' ? JSON.stringify(giorniDallaFrase(typeof originale.giorni === 'string' ? originale.giorni : null).giorni) : null;
  // Un'istantanea anteriore a L5/M7 non azzera orari, Area o il legame canonico aggiunti dopo.
  const campiSuccessivi = new Set(['orari_json', 'area_chiave', 'eccezione_orari_json', 'sblocco_json', 'catalogo_chiave', 'costo_json', 'confidente_chiave']);
  const campi = campiDisponibili(tipo).filter((c) => c in originale || !campiSuccessivi.has(c));
  if (tipo === 'articolo' && campi.includes('catalogo_chiave') && typeof originale.catalogo_chiave === 'string'
    && !prepared('SELECT 1 FROM catalogo_oggetto WHERE chiave = ?').get(originale.catalogo_chiave)) {
    throw httpErrors.conflict('oggetto-originale-mancante', 'L’oggetto originale non esiste più. Rimettilo dal cestino prima di ripristinare l’offerta.');
  }
  if (tipo === 'articolo' && campi.includes('costo_json') && originale.costo_json != null) {
    const costo = normalizzaCostoScambio(originale.costo_json);
    if (!costo) throw httpErrors.conflict('costo-originale-non-valido', 'Il costo originale non è leggibile: nessun valore viene ripristinato.');
    if (costo.tipo === 'oggetti' && costo.oggetti.some((o) => !prepared('SELECT 1 FROM catalogo_oggetto WHERE chiave = ?').get(o.chiave))) {
      throw httpErrors.conflict('oggetto-costo-originale-mancante', 'Un oggetto del costo originale non esiste più. Rimettilo dal cestino prima di ripristinare l’offerta.');
    }
  }
  const set = campi.map((c) => `${c} = @${c}`);
  const valori: Record<string, unknown> = { chiave, ...Object.fromEntries(campi.map((c) => [c, originale[c] ?? predefinito(c)])) };
  if (tipo === 'attivita') verificaAttivitaConfidente(getDb(), { ...r, ...valori }, r);
  verificaTipoVideogioco(tipo, r, originale.tipo ?? r.tipo);
  prepared(`UPDATE ${TABELLA[tipo]} SET ${set.join(', ')}, origine = 'seed', nascosto = 0, seed_json = NULL, updated_at = NULL WHERE chiave = @chiave`).run(valori);
  const risultato = dto(tipo, riga(tipo, chiave));
  if (conservaFonteConfidente) risultato.avvisi = ['La fotografia precede il collegamento al Confidente: fonte, requisiti e campi operativi correnti sono stati conservati. Gli altri valori sono stati ripristinati.'];
  return risultato;
}
