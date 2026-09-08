import { verificaCondizioni } from './mappe/mappeService.js';
import { migraTestiCondizioni } from '../../shared/migraCondizioni.js';
// ============================================================
// catalogoService — negozi e articoli aggiunti o corretti dall'utente (Fase 16.1)
// ============================================================
//
// Le righe dell'utente vivono nelle stesse tabelle del seed, distinte da `origine`:
//   - creare  → nuova riga `origine = 'utente'` con chiave generata dal nome (`u-<slug>`, `<negozio>/u-<slug>`)
//   - correggere una riga del seed → la riga passa a `origine = 'utente'` e `seed_json` conserva l'originale
//   - nascondere una riga del seed → `nascosto = 1` (il reseed non la riporterebbe indietro: cancellarla non basterebbe)
//   - ripristinare → la riga torna com'era nel seed (`seed_json`) e `origine` torna 'seed'
// Il caricatore del seed aggiorna e cancella soltanto le righe `origine = 'seed'`, quindi il lavoro dell'utente
// sopravvive agli aggiornamenti dei dati della guida.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { slug } from '../../shared/slug.js';
import type { ElementoCatalogoDto, RiepilogoCatalogoDto, TipoCatalogo } from '../../shared/types.js';

/** Colonne scrivibili dall'utente, per tabella: quello che il modulo dell'interfaccia mostra e che i pacchetti trasportano. */
const CAMPI: Record<TipoCatalogo, readonly string[]> = {
  negozio: ['condizioni_json', 'nome', 'luogo', 'luogo_chiave', 'tipo', 'gestore', 'confidente_chiave', 'orari', 'sblocco', 'note', 'fonte'],
  articolo: ['condizioni_json', 'negozio_chiave', 'nome', 'nome_it', 'categoria', 'per', 'prezzo', 'quantita', 'oggetto_fonte', 'oggetto_chiave', 'effetto_json', 'effetto', 'statistiche', 'disponibile_dal', 'condizione', 'nota', 'fonte'],
  libro: ['condizioni_json', 'nome', 'nome_it', 'dove', 'prezzo', 'disponibile_dal', 'dote', 'note', 'sblocca', 'sessioni', 'dettagli', 'fonte'],
  film: ['condizioni_json', 'nome', 'nome_it', 'dove', 'periodo', 'dote', 'note', 'note_successive', 'prezzo', 'sessioni', 'dettagli', 'fonte'],
  attivita: ['condizioni_json', 'nome', 'tipo', 'luogo', 'luogo_chiave', 'fascia', 'costo', 'sblocco', 'sessioni', 'doti_json', 'altri_effetti', 'regole', 'premi', 'paga', 'fonte'],
  domanda: ['data', 'tipo', 'chi', 'domanda', 'risposte_json', 'ricompensa', 'note', 'fonte'],
  cruciverba: ['data', 'indizio', 'risposta', 'risposta_en', 'fonte'],
};
const TABELLA: Record<TipoCatalogo, string> = { negozio: 'negozio', articolo: 'articolo', libro: 'libro', film: 'film', attivita: 'attivita', domanda: 'domanda', cruciverba: 'cruciverba' };

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
  negozio: { condizioniDa: (d) => [d.sblocco as string | null], haVerificato: false, campoNome: 'nome', etichettaCampoNome: 'Il nome', nomeTipo: 'Il negozio' },
  articolo: { condizioniDa: (d) => [d.disponibile_dal as string | null, d.condizione as string | null], haVerificato: true, padre: { campo: 'negozio_chiave', tabella: 'negozio', codice: 'negozio-sconosciuto', nome: 'Il negozio' }, raggruppaOrdinePer: 'negozio_chiave', campoNome: 'nome', etichettaCampoNome: 'Il nome', nomeTipo: "L'articolo" },
  libro: { condizioniDa: (d) => [d.disponibile_dal as string | null], haVerificato: true, campoNome: 'nome', etichettaCampoNome: 'Il nome', nomeTipo: 'Il libro' },
  film: { condizioniDa: (d) => [d.periodo as string | null], haVerificato: true, campoNome: 'nome', etichettaCampoNome: 'Il nome', nomeTipo: 'Il film' },
  attivita: { condizioniDa: (d) => [d.sblocco as string | null], haVerificato: true, padre: { campo: 'luogo_chiave', tabella: 'quartiere', codice: 'quartiere-sconosciuto', nome: 'Il quartiere' }, campoNome: 'nome', etichettaCampoNome: 'Il nome', nomeTipo: "L'attività" },
  domanda: { haVerificato: false, campoNome: 'domanda', etichettaCampoNome: 'Il testo della domanda', nomeTipo: 'La domanda' },
  cruciverba: { haVerificato: false, campoNome: 'indizio', etichettaCampoNome: "L'indizio", nomeTipo: 'La riga del cruciverba' },
};

type Riga = Record<string, unknown> & { chiave: string; origine: string; nascosto: number; seed_json: string | null; updated_at: string | null };

function riga(tipo: TipoCatalogo, chiave: string): Riga {
  const r = prepared(`SELECT * FROM ${TABELLA[tipo]} WHERE chiave = ?`).get(chiave) as Riga | undefined;
  if (!r) throw httpErrors.notFound(`${tipo}-non-trovato`, `${PROFILO[tipo].nomeTipo} '${chiave}' non esiste.`);
  return r;
}

function dto(tipo: TipoCatalogo, r: Riga): ElementoCatalogoDto {
  const dati: Record<string, unknown> = {};
  for (const c of CAMPI[tipo]) dati[c] = r[c] ?? null;
  return {
    tipo, chiave: r.chiave, nome: String(r[PROFILO[tipo].campoNome] ?? r.chiave), origine: r.origine === 'utente' ? 'utente' : 'seed',
    modificata: r.origine === 'utente' && r.seed_json !== null, nascosta: r.nascosto === 1,
    aggiornata: r.updated_at, dati,
  };
}

/** Chiave libera a partire dal nome: `u-<slug>` (articolo: `<negozio>/u-<slug>`), con suffisso numerico se già presa. */
function chiaveLibera(tipo: TipoCatalogo, nome: string, negozio?: string): string {
  const base = slug(nome) || 'senza-nome';
  // Le chiavi degli articoli sono annidate sotto il negozio (`untouchable/pugnale`), quindi anche
  // quelle aggiunte lo sono; per gli altri tipi la chiave è piatta.
  const prefisso = tipo === 'articolo' ? `${negozio}/u-` : 'u-';
  let chiave = `${prefisso}${base}`.slice(0, 190);
  for (let i = 2; prepared(`SELECT 1 FROM ${TABELLA[tipo]} WHERE chiave = ?`).get(chiave); i++) {
    const suffisso = `-${i}`;
    chiave = `${prefisso}${base}`.slice(0, 190 - suffisso.length) + suffisso;
  }
  return chiave;
}

/** I riferimenti indicati devono esistere davvero: un negozio in un quartiere inventato sparirebbe dalle pagine. */
function verificaRiferimenti(tipo: TipoCatalogo, dati: Record<string, unknown>): void {
  const esiste = (tabella: string, chiave: unknown) => typeof chiave === 'string' && !!prepared(`SELECT 1 FROM ${tabella} WHERE chiave = ?`).get(chiave);
  if (tipo === 'negozio') {
    if (dati.luogo_chiave != null && !esiste('quartiere', dati.luogo_chiave)) throw httpErrors.badRequest('quartiere-sconosciuto', `Il quartiere '${String(dati.luogo_chiave)}' non esiste.`);
    if (dati.confidente_chiave != null && !esiste('confidente', dati.confidente_chiave)) throw httpErrors.badRequest('confidente-sconosciuto', `Il Confidente '${String(dati.confidente_chiave)}' non esiste.`);
    return;
  }
  const padre = PROFILO[tipo].padre;
  if (padre && dati[padre.campo] != null && !esiste(padre.tabella, dati[padre.campo])) {
    throw httpErrors.badRequest(padre.codice, `${padre.nome} '${String(dati[padre.campo])}' non esiste.`);
  }
}

/** Riepilogo per la sezione «Catalogo» delle Impostazioni: quante righe ha aggiunto, corretto o nascosto l'utente. */
export function riepilogoCatalogo(): RiepilogoCatalogoDto {
  const perTipo = (Object.keys(TABELLA) as TipoCatalogo[]).map((tipo) => {
    const t = TABELLA[tipo];
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

/** Una riga qualunque del catalogo (anche del seed), per il modulo di modifica. */
export function leggiElemento(tipo: TipoCatalogo, chiave: string): ElementoCatalogoDto {
  return dto(tipo, riga(tipo, chiave));
}

function ordineSuccessivo(tipo: TipoCatalogo, dati: Record<string, unknown>): number {
  const per = PROFILO[tipo].raggruppaOrdinePer;
  if (per) return ((prepared(`SELECT MAX(ordine) AS m FROM ${TABELLA[tipo]} WHERE ${per} = ?`).get(dati[per]) as { m: number | null }).m ?? 0) + 1;
  return ((prepared(`SELECT MAX(ordine) AS m FROM ${TABELLA[tipo]}`).get() as { m: number | null }).m ?? 0) + 1;
}

/** Crea una riga del catalogo (origine «utente»): la chiave nasce dal nome e non collide mai con quelle del seed. */
export function creaElemento(tipo: TipoCatalogo, dati: Record<string, unknown>): ElementoCatalogoDto {
  const nome = typeof dati[PROFILO[tipo].campoNome] === 'string' ? String(dati[PROFILO[tipo].campoNome]).trim() : '';
  if (!nome) throw httpErrors.badRequest('nome-mancante', `${PROFILO[tipo].etichettaCampoNome} è obbligatorio.`);
  if(typeof dati.condizioni_json === 'string') verificaCondizioni(JSON.parse(dati.condizioni_json));
  verificaRiferimenti(tipo, dati);
  const chiave = chiaveLibera(tipo, nome, typeof dati.negozio_chiave === 'string' ? dati.negozio_chiave : undefined);
  const adesso = nowIso();
  // Si scrivono **solo le colonne che il modulo ha davvero compilato**: quelle lasciate vuote le
  // riempie il valore predefinito della tabella. Scrivendo `null` su tutte, come si faceva prima,
  // si scavalca il predefinito — e con `attivita.sessioni`, che è `NOT NULL DEFAULT 1`, la
  // creazione falliva con un errore di vincolo che l'utente si vedeva come «errore interno».
  const valori: Record<string, unknown> = { chiave, ordine: ordineSuccessivo(tipo, dati), origine: 'utente', nascosto: 0, updated_at: adesso };
  const compilate = CAMPI[tipo].filter((c) => dati[c] !== undefined);
  for (const c of compilate) valori[c] = dati[c] ?? null;
  const colonne = ['chiave', 'ordine', ...compilate, 'origine', 'nascosto', 'updated_at'];
  const daProsa = PROFILO[tipo].condizioniDa;
  if (daProsa && valori.condizioni_json === undefined) {
    valori.condizioni_json = JSON.stringify(migraTestiCondizioni(daProsa(dati), dati.confidente_chiave as string | null));
    colonne.push('condizioni_json');
  }
  // Una riga che aggiungi tu non viene dalla guida: parte «non verificata», e la scheda lo dice.
  if (PROFILO[tipo].haVerificato) valori.verificato = 0;
  const extra = PROFILO[tipo].haVerificato ? ', verificato' : '';
  const extraVal = PROFILO[tipo].haVerificato ? ', @verificato' : '';
  prepared(`INSERT INTO ${TABELLA[tipo]} (${colonne.join(', ')}${extra}) VALUES (${colonne.map((c) => `@${c}`).join(', ')}${extraVal})`).run(valori);
  return dto(tipo, riga(tipo, chiave));
}

/** Modifica una riga: quella del seed viene «adottata» dall'utente conservando l'originale in `seed_json`. */
export function aggiornaElemento(tipo: TipoCatalogo, chiave: string, dati: Record<string, unknown>): ElementoCatalogoDto {
  const r = riga(tipo, chiave);
  if(typeof dati.condizioni_json === 'string') verificaCondizioni(JSON.parse(dati.condizioni_json));
  verificaRiferimenti(tipo, dati);
  const adesso = nowIso();
  const seedJson = r.seed_json ?? (r.origine === 'seed' ? JSON.stringify(Object.fromEntries(CAMPI[tipo].map((c) => [c, r[c] ?? null]))) : null);
  const set = CAMPI[tipo].filter((c) => c in dati).map((c) => `${c} = @${c}`);
  const valori: Record<string, unknown> = { chiave, origine: 'utente', seed_json: seedJson, updated_at: adesso };
  for (const c of CAMPI[tipo]) if (c in dati) valori[c] = dati[c] ?? null;
  prepared(`UPDATE ${TABELLA[tipo]} SET ${[...set, "origine = 'utente'", 'seed_json = @seed_json', 'updated_at = @updated_at'].join(', ')} WHERE chiave = @chiave`).run(valori);
  return dto(tipo, riga(tipo, chiave));
}

/** Nasconde (o rimostra) una riga: usato per le voci del seed che nel gioco non esistono. */
export function nascondiElemento(tipo: TipoCatalogo, chiave: string, nascosta: boolean): ElementoCatalogoDto {
  const r = riga(tipo, chiave);
  const seedJson = r.seed_json ?? (r.origine === 'seed' ? JSON.stringify(Object.fromEntries(CAMPI[tipo].map((c) => [c, r[c] ?? null]))) : null);
  prepared(`UPDATE ${TABELLA[tipo]} SET nascosto = ?, seed_json = ?, updated_at = ? WHERE chiave = ?`).run(nascosta ? 1 : 0, seedJson, nowIso(), chiave);
  return dto(tipo, riga(tipo, chiave));
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
    })();
    return { esito: 'eliminata', elemento: null };
  }
  const originale = r.seed_json ? (JSON.parse(r.seed_json) as Record<string, unknown>) : null;
  if (!originale) throw httpErrors.badRequest('riga-del-seed', 'Questa riga arriva dai dati della guida e non è stata modificata: non c\'è nulla da ripristinare. Usa «Nascondi» se non vuoi vederla.');
  const daProsaRip = PROFILO[tipo].condizioniDa;
  if (daProsaRip && originale.condizioni_json == null) originale.condizioni_json = JSON.stringify(migraTestiCondizioni(daProsaRip(originale), originale.confidente_chiave as string | null));
  const set = CAMPI[tipo].map((c) => `${c} = @${c}`);
  const valori: Record<string, unknown> = { chiave, ...Object.fromEntries(CAMPI[tipo].map((c) => [c, originale[c] ?? null])) };
  prepared(`UPDATE ${TABELLA[tipo]} SET ${set.join(', ')}, origine = 'seed', nascosto = 0, seed_json = NULL, updated_at = NULL WHERE chiave = @chiave`).run(valori);
  return { esito: 'ripristinata', elemento: dto(tipo, riga(tipo, chiave)) };
}
