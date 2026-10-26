// ============================================================
// alternativeAcquistiService — gli articoli in alternativa fra loro: uno solo, o nessuno (L13, decisione 4: le televendite)
// ============================================================
//
// Richiesta dell'utente (2026-10-26) sulla voce «Leblanc: esaminare la TV per il Canale di televendite»: «tv shopping con due prodotti da
// scegliere gestito malissimo... i prodotti per altro sono rimasti in inglese... e non posso effettivamente scegliere». Decisione 4 già
// approvata: «Televendite: due articoli distinti per Set A e Set B, ciascuno con prezzo e contenuto propri».
//
// Il modello (un solo punto di modifica, il catalogo):
//   - l'alternativa si dichiara nell'ARTICOLO, con la condizione che c'è già: il Set A porta «non: articolo ottenuto = Set B» e viceversa
//     (`articoliIncompatibili`). Il motore della disponibilità la applica ovunque (pagina Negozi, ricerca, spunta); basta da una parte;
//   - nella voce non si dichiara niente: gli effetti «articolo» restano piatti. Due o più articoli della voce legati da un'esclusione formano
//     un gruppo di alternative (`gruppiAlternativi`), e alla spunta se ne sceglie UNO, o nessuno (`SceltaEsitoSpunta` di tipo «alternativa»,
//     lo stesso meccanismo delle scelte d'esito: decisione A1, nessuna scelta implicita);
//   - gli effetti non scelti non si applicano: niente riga in `effetto_stato_voce`, niente acquisto segnato, niente yen da scalare;
//     togliendo la spunta non c'è niente da annullare per loro;
//   - la disponibilità si valuta al giorno della voce (`statoAlMomento`): un set si compra solo la sua domenica.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { articoliIncompatibili, leggiCondizioniSalvate } from '../../shared/condizioniSpillo.js';
import { gruppiAlternativi, type EffettoVoceDto } from '../../shared/effettiVoce.js';
import type { OpzioneAlternativaDto, SceltaEsitoSpunta, SceltaEsitoVoceDto } from '../../shared/esitiAttivita.js';
import { registraCacheDiGioco } from './cacheDiGioco.js';
import { ricompensePerFonte } from './catalogoOggettiLetture.js';
import { disponibilitaArticoloNelloStato } from './negoziService.js';
import type { StatoDisponibilita } from './disponibilitaService.js';
// il nome dell'articolo come lo vede l'utente: la stessa lettura degli elenchi e delle frasi (import ciclico solo di funzioni, mai usate al caricamento)
import { articoloConNome } from './azioniStrutturateService.js';

type SceltaAlternativa = Extract<SceltaEsitoSpunta, { tipo: 'alternativa' }>;

let memo: { mappa: ReadonlyMap<string, readonly string[]>; a: number } | null = null;
registraCacheDiGioco(() => { memo = null; });

/**
 * Per ogni articolo, gli articoli con cui non si compra insieme, in tutte e due le direzioni (basta che uno dei due lo dichiari). Si leggono
 * solo le righe che citano un «non» e un articolo; la mappa resta in memoria un secondo (come i nomi delle condizioni) e si svuota con la
 * cache dei dati di gioco.
 */
export function mappaIncompatibili(): ReadonlyMap<string, readonly string[]> {
  const ora = Date.now();
  if (memo && ora - memo.a <= 1000) return memo.mappa;
  const righe = prepared(`SELECT chiave, condizioni_json FROM articolo WHERE condizioni_json LIKE '%"non"%' AND condizioni_json LIKE '%"articolo"%'`).all() as Array<{ chiave: string; condizioni_json: string }>;
  const m = new Map<string, string[]>();
  const aggiungi = (a: string, b: string) => { const l = m.get(a) ?? []; if (!l.includes(b)) l.push(b); m.set(a, l); };
  for (const r of righe) for (const altro of articoliIncompatibili(leggiCondizioniSalvate(r.condizioni_json))) {
    if (altro === r.chiave) continue;
    aggiungi(r.chiave, altro);
    aggiungi(altro, r.chiave);
  }
  memo = { mappa: m, a: ora };
  return m;
}

/** Gli articoli con cui `chiave` non si compra insieme (undefined se nessuno): la funzione che `gruppiAlternativi` e il riepilogo vogliono. */
export const incompatibiliDi = (chiave: string): readonly string[] | undefined => mappaIncompatibili().get(chiave);

/** Che cosa contengono gli articoli (le righe di `ricompensa_oggetto`, fonte «articolo»), con le copie: per la scelta e il riepilogo. */
export function contenutoArticoli(chiavi: Iterable<string>): Map<string, Array<{ nome: string; quantita: number | null }>> {
  return new Map([...ricompensePerFonte('articolo', chiavi)].map(([k, v]) => [k, v.map((o) => ({ nome: o.nome, quantita: o.quantita }))]));
}

/** I gruppi di alternative fra gli effetti «articolo» della voce: per ogni gruppo gli effetti, nell'ordine della voce. */
function gruppiDellaVoce(effetti: readonly EffettoVoceDto[]): Array<Array<EffettoVoceDto & { effetto: { tipo: 'articolo'; articolo: string; quantita?: number } }>> {
  const articoli = effetti.filter((e): e is EffettoVoceDto & { effetto: { tipo: 'articolo'; articolo: string; quantita?: number } } => e.effetto.tipo === 'articolo');
  if (articoli.length < 2) return [];
  return gruppiAlternativi(articoli.map((e) => e.effetto.articolo), incompatibiliDi)
    .map((membri) => articoli.filter((e) => membri.includes(e.effetto.articolo)));
}

/** Il motivo per cui un articolo non si compra in quello stato, in parole (i requisiti rossi, con il loro testo); null se si compra. */
function motivoNonDisponibile(chiave: string, st: StatoDisponibilita): string | null {
  const d = disponibilitaArticoloNelloStato(chiave, st);
  if (!d) return 'L’articolo non è più nel catalogo';
  if (d.stato === 'disponibile') return null;
  const rossi = d.requisiti.filter((r) => r.stato !== 'verde' && r.bloccante !== false).map((r) => r.testo.trim()).filter(Boolean);
  return rossi.length ? [...new Set(rossi)].join(' · ') : 'Le condizioni non sono soddisfatte';
}

/**
 * Le scelte fra alternative che la spunta della voce chiede, una per gruppo, con la disponibilità di ogni articolo al giorno della voce
 * (`stato`, chiesto solo se la voce ha un gruppo). Restituisce anche la posizione del primo effetto del gruppo, perché chi le unisce alle
 * altre scelte le tenga nell'ordine degli effetti.
 */
export function scelteAlternativeDellaVoce(effetti: readonly EffettoVoceDto[], stato: () => StatoDisponibilita): Array<{ posizione: number; scelta: SceltaEsitoVoceDto }> {
  const gruppi = gruppiDellaVoce(effetti);
  if (!gruppi.length) return [];
  const st = stato();
  const contenuti = contenutoArticoli(gruppi.flat().map((e) => e.effetto.articolo));
  return gruppi.map((g) => {
    const primo = g[0]!;
    const negozio = primo.effetto.articolo.includes('/') ? primo.effetto.articolo.slice(0, primo.effetto.articolo.indexOf('/')) : primo.effetto.articolo;
    const negozioNome = (prepared('SELECT nome FROM negozio WHERE chiave = ?').pluck().get(negozio) as string | undefined) ?? null;
    const opzioni = g.map((e): OpzioneAlternativaDto => {
      const a = articoloConNome(e.effetto.articolo);
      const motivo = motivoNonDisponibile(e.effetto.articolo, st);
      return {
        effettoUid: e.uid, articolo: { chiave: e.effetto.articolo, nome: a?.nome ?? 'Articolo non più nel catalogo', prezzo: a?.prezzo ?? null },
        quantita: e.effetto.quantita ?? 1, contenuto: contenuti.get(e.effetto.articolo) ?? [], disponibile: motivo === null, motivo,
      };
    });
    // già comprato nella partita (per esempio dalla pagina del negozio): è la scelta proposta
    const comprato = g.find((e) => st.articoliOttenuti.has(e.effetto.articolo));
    return { posizione: effetti.indexOf(primo), scelta: { effettoUid: primo.uid, tipo: 'alternativa', negozioNome, opzioni, preselezionato: comprato?.uid ?? null } };
  });
}

/**
 * Le scelte fra alternative della spunta, verificate: una e una sola per gruppo (l'UID del suo primo effetto), il membro scelto deve essere
 * del gruppo e comprabile al giorno della voce (`st`); null = nessuno. Restituisce gli UID degli effetti da NON applicare (gli altri membri,
 * o tutti con «nessuno») e quelli scelti. Errori: 400 `scelta-alternativa-non-valida`, 409 `alternativa-da-scegliere` (nessuna scelta
 * implicita), 409 `articolo-non-disponibile`.
 */
export function risolviAlternativeAcquisti(effetti: readonly EffettoVoceDto[], scelte: readonly SceltaAlternativa[], stato: () => StatoDisponibilita): { esclusi: Set<string>; scelti: Set<string> } {
  const gruppi = gruppiDellaVoce(effetti);
  if (!gruppi.length && !scelte.length) return { esclusi: new Set(), scelti: new Set() };
  let calcolato: StatoDisponibilita | undefined;
  const st = (): StatoDisponibilita => (calcolato ??= stato());
  const perGruppo = new Map<string, SceltaAlternativa>();
  for (const s of scelte) {
    if (perGruppo.has(s.effettoUid) || !gruppi.some((g) => g[0]!.uid === s.effettoUid)) throw httpErrors.badRequest('scelta-alternativa-non-valida', 'Una scelta fra articoli alternativi non appartiene a un gruppo della voce, oppure è ripetuta: rileggi la voce.');
    perGruppo.set(s.effettoUid, s);
  }
  const esclusi = new Set<string>(), scelti = new Set<string>();
  for (const g of gruppi) {
    const s = perGruppo.get(g[0]!.uid);
    const nomi = g.map((e) => `«${articoloConNome(e.effetto.articolo)?.nome ?? e.effetto.articolo}»`).join(' o ');
    if (!s) throw httpErrors.conflict('alternativa-da-scegliere', `Scegli quale hai comprato fra ${nomi} (o «Nessuno») prima di spuntare.`);
    const membro = s.scelto === null ? null : g.find((e) => e.uid === s.scelto);
    if (s.scelto !== null && !membro) throw httpErrors.badRequest('scelta-alternativa-non-valida', `L’articolo scelto non è fra ${nomi}: rileggi la voce.`);
    if (membro) {
      const motivo = motivoNonDisponibile(membro.effetto.articolo, st());
      if (motivo) throw httpErrors.conflict('articolo-non-disponibile', `«${articoloConNome(membro.effetto.articolo)?.nome ?? membro.effetto.articolo}» non si può comprare il giorno della voce: ${motivo}.`);
      scelti.add(membro.uid);
    }
    for (const e of g) if (e !== membro) esclusi.add(e.uid);
  }
  return { esclusi, scelti };
}

/** Gli articoli che la spunta della voce ha segnato nella partita (le righe di `effetto_stato_voce`): il riepilogo della voce fatta li mostra. */
export function articoliSegnatiDallaVoce(partitaId: number, voceUid: string): Set<string> {
  return new Set(prepared("SELECT chiave FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND tipo = 'articolo'").pluck().all(partitaId, voceUid) as string[]);
}
