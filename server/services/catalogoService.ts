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
const CAMPI = {
  negozio: ['condizioni_json', 'nome', 'luogo', 'luogo_chiave', 'tipo', 'gestore', 'confidente_chiave', 'orari', 'sblocco', 'note', 'fonte'] as const,
  articolo: ['condizioni_json', 'negozio_chiave', 'nome', 'nome_it', 'categoria', 'per', 'prezzo', 'effetto', 'statistiche', 'disponibile_dal', 'condizione', 'nota', 'fonte'] as const,
};
const TABELLA: Record<TipoCatalogo, string> = { negozio: 'negozio', articolo: 'articolo' };

type Riga = Record<string, unknown> & { chiave: string; origine: string; nascosto: number; seed_json: string | null; updated_at: string | null };

function riga(tipo: TipoCatalogo, chiave: string): Riga {
  const r = prepared(`SELECT * FROM ${TABELLA[tipo]} WHERE chiave = ?`).get(chiave) as Riga | undefined;
  if (!r) throw httpErrors.notFound(`${tipo}-non-trovato`, `${tipo === 'negozio' ? 'Il negozio' : "L'articolo"} '${chiave}' non esiste.`);
  return r;
}

function dto(tipo: TipoCatalogo, r: Riga): ElementoCatalogoDto {
  const dati: Record<string, unknown> = {};
  for (const c of CAMPI[tipo]) dati[c] = r[c] ?? null;
  return {
    tipo, chiave: r.chiave, nome: String(r.nome ?? r.chiave), origine: r.origine === 'utente' ? 'utente' : 'seed',
    modificata: r.origine === 'utente' && r.seed_json !== null, nascosta: r.nascosto === 1,
    aggiornata: r.updated_at, dati,
  };
}

/** Chiave libera a partire dal nome: `u-<slug>` (articolo: `<negozio>/u-<slug>`), con suffisso numerico se già presa. */
function chiaveLibera(tipo: TipoCatalogo, nome: string, negozio?: string): string {
  const base = slug(nome) || 'senza-nome';
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
  } else if (dati.negozio_chiave != null && !esiste('negozio', dati.negozio_chiave)) {
    throw httpErrors.badRequest('negozio-sconosciuto', `Il negozio '${String(dati.negozio_chiave)}' non esiste.`);
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
  const righe = prepared(`SELECT * FROM ${TABELLA[tipo]} WHERE origine = 'utente' OR nascosto = 1 ORDER BY nome`).all() as Riga[];
  return righe.map((r) => dto(tipo, r));
}

/** Una riga qualunque del catalogo (anche del seed), per il modulo di modifica. */
export function leggiElemento(tipo: TipoCatalogo, chiave: string): ElementoCatalogoDto {
  return dto(tipo, riga(tipo, chiave));
}

function ordineSuccessivo(tipo: TipoCatalogo, dati: Record<string, unknown>): number {
  if (tipo === 'articolo') return ((prepared('SELECT MAX(ordine) AS m FROM articolo WHERE negozio_chiave = ?').get(dati.negozio_chiave) as { m: number | null }).m ?? 0) + 1;
  return ((prepared('SELECT MAX(ordine) AS m FROM negozio').get() as { m: number | null }).m ?? 0) + 1;
}

/** Crea una riga del catalogo (origine «utente»): la chiave nasce dal nome e non collide mai con quelle del seed. */
export function creaElemento(tipo: TipoCatalogo, dati: Record<string, unknown>): ElementoCatalogoDto {
  const nome = typeof dati.nome === 'string' ? dati.nome.trim() : '';
  if (!nome) throw httpErrors.badRequest('nome-mancante', 'Il nome è obbligatorio.');
  if(typeof dati.condizioni_json === 'string') verificaCondizioni(JSON.parse(dati.condizioni_json));
  verificaRiferimenti(tipo, dati);
  const chiave = chiaveLibera(tipo, nome, typeof dati.negozio_chiave === 'string' ? dati.negozio_chiave : undefined);
  const adesso = nowIso();
  const colonne = ['chiave', 'ordine', ...CAMPI[tipo], 'origine', 'nascosto', 'updated_at'];
  const valori: Record<string, unknown> = { chiave, ordine: ordineSuccessivo(tipo, dati), origine: 'utente', nascosto: 0, updated_at: adesso };
  for (const c of CAMPI[tipo]) valori[c] = dati[c] ?? null;
  valori.condizioni_json ??= JSON.stringify(migraTestiCondizioni((tipo==='negozio'?[dati.sblocco]:[dati.disponibile_dal,dati.condizione]) as Array<string|null>,dati.confidente_chiave as string|null));
  if (tipo === 'articolo') valori.verificato = 0;
  const extra = tipo === 'articolo' ? ', verificato' : '';
  const extraVal = tipo === 'articolo' ? ', @verificato' : '';
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
  if(originale.condizioni_json == null)originale.condizioni_json=JSON.stringify(migraTestiCondizioni((tipo==='negozio'?[originale.sblocco]:[originale.disponibile_dal,originale.condizione]) as Array<string|null>,originale.confidente_chiave as string|null));
  const set = CAMPI[tipo].map((c) => `${c} = @${c}`);
  const valori: Record<string, unknown> = { chiave, ...Object.fromEntries(CAMPI[tipo].map((c) => [c, originale[c] ?? null])) };
  prepared(`UPDATE ${TABELLA[tipo]} SET ${set.join(', ')}, origine = 'seed', nascosto = 0, seed_json = NULL, updated_at = NULL WHERE chiave = @chiave`).run(valori);
  return { esito: 'ripristinata', elemento: dto(tipo, riga(tipo, chiave)) };
}
