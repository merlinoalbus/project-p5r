// ============================================================
// catalogoService — le righe della guida aggiunte, corrette o nascoste dall'utente: negozi, articoli, libri, film, attività,
// luoghi, domande e cruciverba (nato con la Fase 16.1 per negozi e articoli)
// ============================================================
//
// Le righe dell'utente vivono nelle stesse tabelle dei dati della guida, distinte da `origine`:
//   - creare  → nuova riga `origine = 'utente'` con chiave generata dal nome (`u-<slug>`, `<negozio>/u-<slug>`)
//   - correggere una riga della guida → la riga passa a `origine = 'utente'` e `seed_json` conserva l'originale
//   - nascondere una riga della guida → `nascosto = 1` (una ricarica dei dati la riporterebbe indietro: cancellarla non basterebbe)
// Non c'è un ritorno ai valori della guida (decisione dell'utente del 10/11): `seed_json` resta come segno «corretta da te» e lo leggono il
// riepilogo, l'importazione e il cestino.
// I nomi `seed` e `seed_json` vengono dal seed JSON, dismesso il 2026-09-12: oggi «seed» vuol dire «dato della guida, arrivato
// con il pacchetto di gioco». La ricarica dei dati della guida (`ricaricaPacchetto`) aggiorna e sostituisce soltanto le righe
// `origine = 'seed'`, quindi il lavoro dell'utente sopravvive agli aggiornamenti.
// ============================================================

import { verificaCondizioni } from './mappe/mappeService.js';
import { convertiProsa } from '../../shared/migraCondizioni.js';
import { normalizzaRequisitoSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { isDeepStrictEqual } from 'node:util';
import { contestoConversione, contestoRiga } from './condizioni/contestoConversione.js';
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { haColonnaMain } from '../db/schemaMemo.js';
import { httpErrors } from '../utils/httpError.js';
import { slug } from '../../shared/slug.js';
import { TIPI_CATALOGO, type ElementoCatalogoDto, type RiepilogoCatalogoDto, type TipoCatalogo } from '../../shared/types.js';
import { normalizzaVociEffetto } from '../../shared/effettiCatalogo.js';
import { tracciamentoPerTipo } from '../../shared/attivita.js';
import { catalogoOggettiDisponibile, identitaDellOggettoPerLOfferta, riferimentoOggetto, oggettiPerFonte } from './catalogoOggettiLetture.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { conCestino } from './cestinoService.js';
import { IDENTITA_DI_UN_OFFERTA_COLLEGATA, normalizzaCostoScambio } from '../../shared/catalogo.js';
import { aggiornaOggetto, creaOggetto } from './catalogoOggettiScritture.js';
import { fonteConfidenteAttivita } from './fonteConfidenteAttivitaService.js';
import { verificaAttivitaConfidente, verificaCampiAttivitaConfidente } from './vincoliAttivitaConfidente.js';
import { verificaAttivitaPesca, verificaCampiAttivitaPesca } from './vincoliAttivitaPesca.js';
import { leggiRegolaPesca } from './regolePescaService.js';
import { verificaDomandaEsame } from './esamiCollegamento.js';
import { normalizzaSconto } from '../../shared/scontiNegozi.js';
import { tipoPuntoVenditaDelLuogo } from '../../shared/puntoVendita.js';
import { allineaSegnoDelNegozio, allineaSegnoRegola, completaConLaRegola } from './regoleNegoziService.js';
import { verificaEliminazioneDiVendita, verificaModificaLuogo, verificaModificaPuntoVendita, verificaNuovoPuntoVendita, verificaPuntoVenditaNascosto } from './invariantiPuntoVendita.js';

/** Colonne scrivibili dall'utente, per tabella: quello che il modulo dell'interfaccia mostra e che i pacchetti trasportano. */
// Dalla voce 5 (2026-09-12) il negozio non ha più `sblocco`, `fonte` e `condizioni_json` fra i campi
// scrivibili (la disponibilità sono gli orari, le condizioni stanno sugli articoli), gli articoli
// non hanno `disponibile_dal`/`condizione`/`fonte` (prosa: si scrivono le condizioni), libri, film
// e attività portano `effetti_json`; `fonte` resta colonna ma non si scrive più da qui.
const CAMPI: Record<TipoCatalogo, readonly string[]> = {
  // L5: con la sede valgono gli orari del luogo, salvo `eccezione_orari_json` quando la guida distingue il negozio (R5-12b); L4-02 (373):
  // `orari_json` del negozio non c'è più, e chi non ha sede tiene i suoi orari come eccezione
  // chiusura dell'ondata 5: `sconto_json`, lo sconto legato al rango di un Confidente (migrazione 254), il suo unico punto
  // La posizione è solo `sede_chiave` (luogo → quartiere): il quartiere si deriva sempre, non si scrive.
  negozio: ['nome', 'sede_chiave', 'tipo', 'gestore', 'confidente_chiave', 'eccezione_orari_json', 'sblocco_json', 'programma_punti_json', 'sconto_json', 'note'],
  // `effetto_json`, `effetto` e `statistiche` non sono più dell'offerta (colonne tolte): il testo dell'effetto e le statistiche vivono
  // in un punto solo, l'oggetto del catalogo (`catalogo_oggetto.effetto`, `statistiche_json`).
  articolo: ['condizioni_json', 'negozio_chiave', 'nome', 'categoria', 'per', 'prezzo', 'prezzo_per_fascia_json', 'quantita', 'rifornimento_json', 'oggetto_fonte', 'oggetto_chiave', 'catalogo_chiave', 'costo_json', 'nota', 'verificato'],
  // L13 (ondata 7, O7-4, migrazione 313): `dove`, `dote`, `note`, `sblocca`, `effetto_json` dei libri e `dote`, `note`, `note_successive` dei
  // film non si scrivono più: che cosa dà la lettura sono gli effetti, dove si ottiene sono articoli, posizioni e ricompense (il prezzo del
  // libro è quello dell'articolo: colonna uscita con la 363)
  libro: ['condizioni_json', 'nome', 'effetti_json', 'sessioni', 'dettagli', 'verificato'],
  film: ['condizioni_json', 'nome', 'dove', 'effetti_json', 'prezzo', 'sessioni', 'dettagli', 'verificato'],
  attivita: ['pesca_regola_chiave','pesca_ruolo','confidente_chiave', 'condizioni_json', 'nome', 'tipo', 'sede_chiave', 'fascia',
    'costo', 'sessioni', 'paga_yen', 'paga_massima', 'dettagli', 'effetti_json', 'tracciamento', 'quiz_json', 'verificato', 'esiti_json'],
  // L5 (R5-07, un modulo solo): orari strutturati (null = regola dell'app), Area, sblocco, Confidenti e piatti; `quando` non è più una
  // colonna (L11, migrazione 193: si ricava dagli orari) e i `giorni_json` del luogo sono gli orari (L11, migrazione 184)
  luogo: ['condizioni_json', 'quartiere_chiave', 'tipo', 'nome', 'cosa_offre', 'orari_json', 'area_chiave', 'confidenti_json', 'piatti_json', 'note', 'verificato'],
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
 *   un luogo in un quartiere inventato, sparirebbe dalle pagine senza dire perché (la sede di un
 *   negozio o di un'attività è il luogo, verificato a parte: il loro quartiere si deriva da lì);
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
  // `periodo` non è più nello schema (voce 11): un film creato senza condizioni nasce con l'elenco vuoto, come allora.
  film: { condizioniDa: (d) => [d.periodo as string | null], haVerificato: true, campoNome: 'nome', etichettaCampoNome: 'Il nome', nomeTipo: 'Il film' },
  attivita: { condizioniDa: (d) => [d.sblocco as string | null], haVerificato: true, campoNome: 'nome', etichettaCampoNome: 'Il nome', nomeTipo: "L'attività" },
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

/** Una riga come elemento del catalogo: i soli campi scrivibili del tipo (`CAMPI`, assenti come null), il titolo dalla
 *  colonna del profilo (o la chiave se vuoto), l'origine, se è una riga del seed corretta (utente con `seed_json`) e se è nascosta. */
function dto(tipo: TipoCatalogo, r: Riga): ElementoCatalogoDto {
  const dati: Record<string, unknown> = {};
  for (const c of campiDisponibili(tipo)) dati[c] = r[c] ?? null;
  if (tipo === 'attivita') dati._fonteConfidente = fonteConfidenteAttivita(r);
  if (tipo === 'attivita') dati._fontePesca = typeof r.pesca_regola_chiave==='string'?leggiRegolaPesca(r.pesca_regola_chiave):null;
  if (tipo === 'articolo' && 'costo_json' in r) dati.costo_json = r.costo_json;
  const oggetto = typeof r.catalogo_chiave === 'string' ? riferimentoOggetto(r.catalogo_chiave) : null;
  if (categoriaLettura(tipo, r) && oggetto) {
    dati.nome = oggetto.nome;
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
  // un file di gioco di prima della 254 non ha lo sconto del negozio: non si legge né si scrive
  if (tipo === 'negozio' && !haColonnaMain(getDb(), 'negozio', 'sconto_json')) return CAMPI.negozio.filter((c) => c !== 'sconto_json');
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
    if (dati.confidente_chiave != null && !esiste('confidente', dati.confidente_chiave)) throw httpErrors.badRequest('confidente-sconosciuto', `Il Confidente '${String(dati.confidente_chiave)}' non esiste.`);
    // revisione della chiusura dell'ondata 5 (N3): il Confidente dello sconto esiste (con una chiave inesistente lo sconto non varrebbe mai)
    const sconto = typeof dati.sconto_json === 'string' ? normalizzaSconto(dati.sconto_json) : null;
    if (sconto && !esiste('confidente', sconto.confidente)) throw httpErrors.badRequest('confidente-sconosciuto', `Il Confidente '${sconto.confidente}' dello sconto non esiste.`);
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

/** Le regole che valgono su ogni scrittura, prima di toccare la tabella: tracciamento dal tipo su un'attività nuova, dove il modulo non
 *  lo dice, e `effetti_json` sempre normalizzato (illeggibile → lista vuota). Che cosa dà un'attività lo dicono solo gli effetti e gli
 *  esiti: i campi vecchi (`doti_json`, tolto con la 362) non esistono più. Non tocca l'oggetto ricevuto. */
function normalizzaScrittura(tipo: TipoCatalogo, dati: Record<string, unknown>, esistente: Riga | null): Record<string, unknown> {
  const d = { ...dati };
  const pesca=tipo==='attivita'&&(d.pesca_regola_chiave!==undefined?d.pesca_regola_chiave:esistente?.pesca_regola_chiave)!=null;
  if(pesca)verificaCampiAttivitaPesca({...esistente,...d});
  const collegata = tipo === 'attivita' && (d.confidente_chiave !== undefined ? d.confidente_chiave : esistente?.confidente_chiave) != null;
  if (collegata) verificaCampiAttivitaConfidente({ ...esistente, ...d });
  if (catalogoOggettiDisponibile() && categoriaLettura(tipo, { ...esistente, ...d })) {
    delete d.prezzo;
    if (tipo === 'attivita') delete d.costo;
  }
  if (tipo === 'articolo') {
    const conCatalogo = catalogoOggettiDisponibile();
    // Ondata 5, lotto F (decisione 21): il testo dell'effetto e le statistiche vivono solo nell'oggetto del catalogo (l'offerta non ha più le
    // colonne). Un valore mandato per l'offerta non si accetta in silenzio: si rifiuta e si dice dove si scrive. `null` o vuoto passano.
    const mandati = (['effetto', 'statistiche', 'effetto_json'] as const).filter((c) => d[c] != null && (typeof d[c] !== 'string' || (d[c] as string).trim() !== ''));
    if (mandati.length) throw httpErrors.badRequest('effetto-nell-oggetto', `L’effetto e le statistiche si scrivono nell’oggetto del catalogo, non nell’offerta (campi: ${mandati.join(', ')}).`);
    for (const c of ['effetto_json', 'effetto', 'statistiche']) delete d[c];
    if (!conCatalogo) { delete d.catalogo_chiave; delete d.costo_json; }
    else if (!('catalogo_chiave' in d) && legameStoricoCambiato(d, esistente)) d.catalogo_chiave = chiaveDaLegameStorico(d, esistente);
    const chiave = 'catalogo_chiave' in d ? d.catalogo_chiave : esistente?.catalogo_chiave;
    // uno scambio non ha prezzo in yen, né in una fascia (Ondata 5, lotto E)
    if (d.costo_json != null) { d.prezzo = null; d.prezzo_per_fascia_json = null; }
    if (conCatalogo && typeof chiave === 'string') {
      // L4-07: nome, categoria e «per chi» valgono solo per un'offerta senza legame; con il legame li dà l'oggetto del catalogo. Non si
      // copiano né si corregge l'identità dal listino: la riga collegata li ha vuoti (NOT NULL: nome vuoto, categoria «altro»), anche
      // quando un'offerta che aveva i suoi viene collegata adesso (la migrazione 376 ha portato così le righe di prima, con l'archivio).
      for (const c of ['nome', 'categoria', 'per']) delete d[c];
      Object.assign(d, IDENTITA_DI_UN_OFFERTA_COLLEGATA);
      if ('catalogo_chiave' in dati && dati.catalogo_chiave !== esistente?.catalogo_chiave) { d.oggetto_fonte = null; d.oggetto_chiave = null; }
    } else {
      if (!esistente && d.categoria === undefined) d.categoria = 'altro';
      // L4-07: un'offerta che perde adesso il legame senza un nome scritto qui tiene nome, categoria e «per chi» che mostrava (dall'oggetto);
      // con un nome scritto valgono i valori mandati
      if (conCatalogo && typeof esistente?.catalogo_chiave === 'string' && (typeof d.nome !== 'string' || !d.nome.trim())) {
        const prima = identitaDellOggettoPerLOfferta(esistente.catalogo_chiave);
        if (prima) Object.assign(d, prima);
      }
      const nome = typeof d.nome === 'string' ? d.nome.trim() : esistente?.nome;
      if (!nome) throw httpErrors.badRequest('nome-mancante', 'Per un’offerta senza oggetto collegato indica il nome.');
    }
  }
  if (tipo === 'attivita' && d.tracciamento === undefined && typeof d.tipo === 'string' && !esistente) d.tracciamento = collegata ? 'nessuno' : tracciamentoPerTipo(d.tipo);
  if (!collegata && !pesca && typeof d.effetti_json === 'string') { try { d.effetti_json = JSON.stringify(normalizzaVociEffetto(JSON.parse(d.effetti_json))); } catch { d.effetti_json = '[]'; } }
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

/**
 * R10-23/4: tutte le righe nascoste dalla guida, di ogni tipo del catalogo, in un solo elenco: è la sezione «Nascosti dalla guida» del
 * Cestino (la vecchia pagina «Rimossi» ne è una vista). Si rimettono con lo stesso gesto di prima, `PUT /api/catalogo/:tipo/:chiave/nascosta`.
 * Sola lettura; nasconde = flag `nascosto` (la riga resta nei dati), non è un'eliminazione.
 */
export function elencaTuttiNascosti(): ElementoCatalogoDto[] {
  return TIPI_CATALOGO.flatMap((tipo) => elencaNascosti(tipo));
}

/** Una riga qualunque del catalogo (anche del seed), per il modulo di modifica. */
export function leggiElemento(tipo: TipoCatalogo, chiave: string): ElementoCatalogoDto {
  return dto(tipo, riga(tipo, chiave));
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

type OperazioneCondizioni = 'creazione';

/** Nessun testo o fotografia privati nei dettagli: soltanto esito, campi e motivo classificato. */
function condizioniDaDefinire(operazione: OperazioneCondizioni, motivo: string, scarti = 0): never {
  throw httpErrors.conflict('condizioni-da-definire', 'Le condizioni non sono interamente definite. Nessun dato è stato salvato: definisci le condizioni nell’editor prima di procedere.',
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
  verificaCondizioni(formula as RequisitoSpillo[]);
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

/** La creazione dentro la transazione di chi chiama (l'editor del posto salva luogo, punti vendita e offerte insieme). */
export function creaElementoNellaTransazione(tipo: TipoCatalogo, grezzi: Record<string, unknown>): ElementoCatalogoDto {
  if (tipo === 'negozio' && typeof grezzi.sblocco_json === 'string') verificaCondizioni(JSON.parse(grezzi.sblocco_json));
  if (grezzi.condizioni_json != null) grezzi = { ...grezzi, condizioni_json: verificaFormulaCompleta(grezzi.condizioni_json, 'creazione') };
  verificaRiferimenti(tipo, grezzi);
  if (tipo === 'negozio') verificaNuovoPuntoVendita(grezzi);
  // L4-01: un'offerta nuova di un punto vendita con la regola comune prende dalla regola i campi che non dice
  const dati = tipo === 'articolo' ? completaConLaRegola(normalizzaScrittura(tipo, grezzi, null)) : normalizzaScrittura(tipo, grezzi, null);
  if (tipo === 'domanda' && typeof dati.data === 'string' && typeof dati.tipo === 'string') verificaDomandaEsame(null, { data: dati.data, tipo: dati.tipo });
  if (tipo === 'attivita') verificaAttivitaConfidente(getDb(), dati);
  if (tipo === 'attivita') verificaAttivitaPesca(getDb(), dati);
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
  if (tipo === 'attivita') verificaAttivitaPesca(getDb(), valori);
  prepared(`INSERT INTO ${TABELLA[tipo]} (${colonne.join(', ')}${extra}) VALUES (${colonne.map((c) => `@${c}`).join(', ')}${extraVal})`).run(valori);
  assicuraIdentitaLettura(tipo, chiave, nome);
  if (tipo === 'articolo') allineaSegnoRegola(chiave);
  // L3 (I4): un luogo che nasce per vendere nasce col suo primo punto vendita, dallo stesso nome; il listino si scrive nell'editor del posto
  const venduto = tipo === 'luogo' && typeof dati.tipo === 'string' ? tipoPuntoVenditaDelLuogo(dati.tipo) : null;
  const creato = dto(tipo, riga(tipo, chiave));
  if (venduto) creato.puntoVendita = creaElementoNellaTransazione('negozio', { nome, tipo: venduto, sede_chiave: chiave }).chiave;
  return creato;
}

/** Modifica una riga: quella del seed viene «adottata» dall'utente conservando l'originale in `seed_json`. */
export function aggiornaElemento(tipo: TipoCatalogo, chiave: string, grezzi: Record<string, unknown>): ElementoCatalogoDto {
  const elemento = getDb().transaction(() => aggiornaElementoNellaTransazione(tipo, chiave, grezzi))();
  invalidaCacheDiGioco();
  return elemento;
}

/** La modifica dentro la transazione di chi chiama (l'editor del posto). */
export function aggiornaElementoNellaTransazione(tipo: TipoCatalogo, chiave: string, grezzi: Record<string, unknown>): ElementoCatalogoDto {
  if (tipo === 'negozio' && typeof grezzi.sblocco_json === 'string') verificaCondizioni(JSON.parse(grezzi.sblocco_json));
  const r = riga(tipo, chiave);
  if (typeof grezzi.condizioni_json === 'string') verificaCondizioni(JSON.parse(grezzi.condizioni_json));
  verificaRiferimenti(tipo, grezzi, r);
  if (tipo === 'negozio') verificaModificaPuntoVendita(r, grezzi);
  if (tipo === 'luogo') verificaModificaLuogo(r, grezzi);
  const dati = normalizzaScrittura(tipo, grezzi, r);
  if (tipo === 'domanda') verificaDomandaEsame({ id: Number(r.id), data: String(r.data), tipo: String(r.tipo) }, { data: String(dati.data ?? r.data), tipo: String(dati.tipo ?? r.tipo) });
  if (tipo === 'attivita') verificaAttivitaConfidente(getDb(), { ...r, ...dati }, r);
  if (tipo === 'attivita') verificaAttivitaPesca(getDb(), { ...r, ...dati }, r);
  const lettura = categoriaLettura(tipo, { ...r, ...dati });
  const titolo = lettura && typeof dati.nome === 'string' ? dati.nome.trim() : null;
  if (lettura && catalogoOggettiDisponibile()) {
    // Il titolo si modifica sull'identità; i valori storici della sorgente non si riscrivono.
    delete dati.nome; delete dati.prezzo;
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
    // L4-01: un'offerta che cambia pezzi, rifornimento o condizioni diventa un'eccezione alla regola comune (o ci torna se li rimette uguali);
    // un punto vendita che cambia genere ricalcola il segno delle sue offerte
    if (tipo === 'articolo') allineaSegnoRegola(chiave);
    if (tipo === 'negozio' && 'tipo' in dati && dati.tipo !== r.tipo) allineaSegnoDelNegozio(chiave);
  })();
  return dto(tipo, riga(tipo, chiave));
}

/** L4-01: una riga che cambia per un gesto fuori dal suo modulo (la regola comune riscrive le offerte che la seguono) è adottata come in
 *  `aggiornaElementoNellaTransazione`: passa a `origine = 'utente'` e, se era della guida, conserva l'originale in `seed_json`. */
export function adottaRigaDellaGuida(tipo: TipoCatalogo, chiave: string): void {
  const r = riga(tipo, chiave);
  const seedJson = r.seed_json ?? (r.origine === 'seed' ? JSON.stringify(Object.fromEntries(campiDisponibili(tipo).map((c) => [c, r[c] ?? null]))) : null);
  prepared(`UPDATE ${TABELLA[tipo]} SET origine = 'utente', seed_json = ? WHERE chiave = ?`).run(seedJson, chiave);
}

/** Nasconde (o rimostra) una riga: usato per le voci del seed che nel gioco non esistono. */
export function nascondiElemento(tipo: TipoCatalogo, chiave: string, nascosta: boolean): ElementoCatalogoDto {
  const r = riga(tipo, chiave);
  if (tipo === 'negozio' && nascosta) verificaPuntoVenditaNascosto(r);
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
}

/**
 * Elimina una riga creata dall'utente (nel Cestino). Una riga della guida, corretta o no, non si elimina: si nasconde («Nascondi»), e non c'è
 * un ritorno ai valori della guida (decisione dell'utente del 10/11): 400 `riga-della-guida`.
 */
export function eliminaElemento(tipo: TipoCatalogo, chiave: string): { esito: 'eliminata'; elemento: null } {
  const r = riga(tipo, chiave);
  if (r.origine !== 'utente' || r.seed_json !== null) throw httpErrors.badRequest('riga-della-guida', 'Questa riga arriva dai dati della guida: non si elimina. Usa «Nascondi» se non vuoi vederla.');
  if (tipo === 'luogo' || tipo === 'negozio') verificaEliminazioneDiVendita(tipo, chiave);
  // R10-23/3: l'eliminazione passa dal Cestino (si rimette dalla sezione Cestino), non è più una cancellazione a mano
  conCestino({ tipo, chiave, nome: dto(tipo, r).nome }, () => getDb().transaction(() => {
    // gli articoli di un negozio creato dall'utente se ne vanno con lui (chiave esterna a cascata)
    prepared(`DELETE FROM ${TABELLA[tipo]} WHERE chiave = ?`).run(chiave);
    staccaDalleMappe(tipo, chiave);
  })());
  invalidaCacheDiGioco();
  return { esito: 'eliminata', elemento: null };
}
