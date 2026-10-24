// ============================================================
// luoghiScritture — posizionare, collocare ed eliminare luoghi e negozi (L5 «Luoghi, negozi, orari», lotti/L5/modifiche.md §3.2, §3.3)
// ============================================================
//
// - **Posiziona** (R5-18, `POST /api/luoghi/posiziona`): in una transazione crea (se `nuovo`) il luogo nel quartiere della planimetria, il pin
//   collegato (riferimento `luogo`, tipo dal catalogo dei tipi di luogo) e mette il luogo nell'Area della planimetria. 409 se il luogo ha già un
//   pin su quella planimetria.
// - **Colloca** (`PUT /api/luoghi/:quartiere/:luogo/area`): un luogo «da collocare» in un'Area del suo quartiere (o di nuovo fuori, con null).
// - **Elimina nel cestino** (R5-21, `DELETE /api/catalogo/{luogo|negozio}/:chiave?conferma=1`): senza conferma e con contenuti → 409 col
//   riepilogo; con conferma il luogo se ne va con i suoi pin (immagini e stati compresi), i negozi e le attività della sede restano senza sede;
//   il negozio con articoli, acquisti e punti delle partite (righe dell'altro file, che il cestino registra: niente più orfani). Si rimette dal
//   Cestino com'era.
// Modulo a sé perché usa sia i pin (`mappeService`) sia i luoghi (`luoghiService`), che si leggono già in un senso solo.
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { idMappa } from './mappe/percorsiMappe.js';
import { entitaDellaRadice } from './mappe/alberoMappe.js';
import { creaSpillo, eliminaSpillo } from './mappe/mappeService.js';
import { conCestino } from './cestinoService.js';
import { preparaRimozioneArticoliAcquistati } from './acquistiService.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { creaElemento } from './catalogoService.js';
import { dettaglioLuogo } from './luoghiService.js';
import { lettureListiniCondivisi, listinoDelNegozio, negoziEquivalenti } from './listiniCondivisi.js';
import { spilloPerLuogo } from '../../shared/tipiLuogo.js';
import type { LuogoDettaglioDto } from '../../shared/types.js';
import type { OrariNegozio } from '../../shared/orariNegozio.js';

/** Il quartiere di una mappa del mondo: dalla sua Area, o la mappa del quartiere stesso (`citta-<q>`); null fuori dai quartieri. */
function quartiereDellaMappa(chiave: string): { quartiere: string | null; area: string | null } {
  const m = prepared('SELECT m.chiave, m.tipo, m.area_chiave, a.quartiere_chiave FROM mappa m LEFT JOIN area a ON a.chiave = m.area_chiave WHERE m.chiave = ?').get(chiave) as
    { chiave: string; tipo: string; area_chiave: string | null; quartiere_chiave: string | null } | undefined;
  if (!m) throw httpErrors.notFound('mappa-non-trovata', `La planimetria '${chiave}' non esiste.`);
  if (m.quartiere_chiave) return { quartiere: m.quartiere_chiave, area: m.area_chiave };
  const radice = entitaDellaRadice(m);
  if (radice?.tipo === 'quartiere') return { quartiere: radice.chiave, area: null };
  return { quartiere: null, area: m.area_chiave };
}

/** I dati di un luogo nuovo creato posizionandolo. */
export interface LuogoNuovo { nome: string; tipo: string; cosaOffre?: string; orari?: OrariNegozio | null }

/**
 * Posiziona un luogo su una planimetria del mondo (R5-18): `luogo` esistente o `nuovo` (creato nel quartiere della planimetria), il pin collegato
 * e l'Area della planimetria, in una transazione. 404 se la planimetria o il luogo mancano; 400 se la planimetria non è di un quartiere o il luogo
 * è di un altro quartiere; 409 `luogo-gia-posizionato` se il luogo ha già un pin su quella planimetria. Restituisce la pagina del luogo.
 */
export function posizionaLuogo(dati: { luogo?: string; nuovo?: LuogoNuovo; mappa: string; x: number; y: number }): LuogoDettaglioDto {
  if ((dati.luogo === undefined) === (dati.nuovo === undefined)) throw httpErrors.badRequest('luogo-o-nuovo', 'Indica un luogo che esiste oppure i dati di un luogo nuovo: uno dei due.');
  const mappa = idMappa(dati.mappa);
  const { quartiere, area } = quartiereDellaMappa(mappa);
  if (!quartiere) throw httpErrors.badRequest('mappa-fuori-dai-quartieri', 'Un luogo si posiziona su una planimetria (o sull’illustrazione) di un quartiere.');
  const chiave = getDb().transaction((): string => {
    let k = dati.luogo ?? null;
    if (k) {
      const l = prepared('SELECT quartiere_chiave FROM luogo WHERE chiave = ?').get(k) as { quartiere_chiave: string } | undefined;
      if (!l) throw httpErrors.notFound('luogo-non-trovato', `Il luogo '${k}' non esiste.`);
      if (l.quartiere_chiave !== quartiere) throw httpErrors.badRequest('luogo-di-altro-quartiere', 'Il luogo è di un altro quartiere: si posiziona sulle planimetrie del suo.');
      if (prepared("SELECT 1 FROM spillo WHERE riferimento_tipo = 'luogo' AND riferimento_chiave = ? AND mappa_chiave = ?").get(k, mappa)) {
        throw httpErrors.conflict('luogo-gia-posizionato', 'Il luogo ha già un pin su questa planimetria.');
      }
    } else {
      const n = dati.nuovo!;
      const creato = creaElemento('luogo', { quartiere_chiave: quartiere, nome: n.nome, tipo: n.tipo, cosa_offre: n.cosaOffre ?? '', ...(n.orari ? { orari_json: JSON.stringify(n.orari) } : {}) });
      k = creato.chiave;
    }
    const l = prepared('SELECT nome, tipo, cosa_offre FROM luogo WHERE chiave = ?').get(k) as { nome: string; tipo: string; cosa_offre: string };
    creaSpillo(mappa, { tipo: spilloPerLuogo(l.tipo), nome: l.nome, descrizione: l.cosa_offre, x: dati.x, y: dati.y, riferimento: { tipo: 'luogo', chiave: k } });
    if (area) prepared('UPDATE luogo SET area_chiave = ? WHERE chiave = ?').run(area, k);
    return k;
  })();
  invalidaCacheDiGioco();
  const i = chiave.indexOf('/');
  return dettaglioLuogo(chiave.slice(0, i), chiave.slice(i + 1));
}

/** Colloca un luogo in un'Area del suo quartiere (slug), o lo rimette fra i «da collocare» (null). 404 se mancano luogo o Area. */
export function collocaLuogo(quartiere: string, luogo: string, area: string | null): LuogoDettaglioDto {
  const chiave = `${quartiere}/${luogo}`;
  if (!prepared('SELECT 1 FROM luogo WHERE chiave = ? AND quartiere_chiave = ?').get(chiave, quartiere)) throw httpErrors.notFound('luogo-non-trovato', `Il luogo '${chiave}' non esiste.`);
  let areaChiave: string | null = null;
  if (area !== null) {
    const a = prepared('SELECT chiave FROM area WHERE quartiere_chiave = ? AND slug = ?').get(quartiere, area) as { chiave: string } | undefined;
    if (!a) throw httpErrors.notFound('area-non-trovata', `Nessuna area '${area}' in questo quartiere.`);
    areaChiave = a.chiave;
  }
  prepared('UPDATE luogo SET area_chiave = ? WHERE chiave = ?').run(areaChiave, chiave);
  invalidaCacheDiGioco();
  return dettaglioLuogo(quartiere, luogo);
}

/** Che cosa si porta via l'eliminazione di un luogo o di un negozio (il riepilogo del 409 e della finestra di conferma). */
export interface RiepilogoEliminazione { pin: number; negozi: number; attivita: number; articoli: number; acquisti: number; punti: number; consumazioni: number; provenienze: number; proposte: number; ricevute: number }

function riepilogo(tipo: 'luogo' | 'negozio', chiave: string): RiepilogoEliminazione {
  const n = (sql: string, ...p: unknown[]) => (prepared(sql).get(...p) as { n: number }).n;
  if (tipo === 'luogo') {
    const listini = lettureListiniCondivisi();
    const extra = listini.sedi.filter((s) => s.luogo === chiave && !(prepared('SELECT 1 FROM negozio WHERE chiave = ? AND sede_chiave = ?').get(s.negozio, chiave))).length;
    return { pin: n("SELECT COUNT(*) AS n FROM spillo WHERE riferimento_tipo IN ('luogo', 'attivita') AND riferimento_chiave = ?", chiave),
      negozi: n('SELECT COUNT(*) AS n FROM negozio WHERE sede_chiave = ?', chiave) + extra, attivita: n('SELECT COUNT(*) AS n FROM attivita WHERE sede_chiave = ?', chiave),
      articoli: 0, acquisti: 0, punti: 0, consumazioni: 0, provenienze: 0, proposte: 0, ricevute: 0 };
  }
  return { pin: n("SELECT COUNT(*) AS n FROM spillo WHERE riferimento_tipo = 'negozio' AND riferimento_chiave = ?", chiave), negozi: 0, attivita: 0,
    articoli: n('SELECT COUNT(*) AS n FROM articolo WHERE negozio_chiave = ?', chiave),
    acquisti: n('SELECT COUNT(*) AS n FROM utente.acquisto_partita WHERE articolo_chiave IN (SELECT chiave FROM articolo WHERE negozio_chiave = ?)', chiave),
    punti: n("SELECT COUNT(*) AS n FROM utente.punti_negozio_partita WHERE negozio_chiave = ?", chiave),
    consumazioni: n('SELECT COUNT(*) AS n FROM utente.acquisto_registrato WHERE articolo_chiave IN (SELECT chiave FROM main.articolo WHERE negozio_chiave=?)', chiave),
    provenienze: n('SELECT COUNT(*) AS n FROM utente.acquisto_provenienza WHERE acquisto_id IN (SELECT id FROM utente.acquisto_registrato WHERE articolo_chiave IN (SELECT chiave FROM main.articolo WHERE negozio_chiave=?))', chiave),
    proposte: n("SELECT COUNT(*) AS n FROM utente.da_applicare WHERE causa_tipo='acquisto' AND causa_chiave IN (SELECT id FROM utente.acquisto_registrato WHERE articolo_chiave IN (SELECT chiave FROM main.articolo WHERE negozio_chiave=?))", chiave),
    ricevute: n("SELECT COUNT(*) AS n FROM utente.effetto_applicato WHERE tipo='acquisto' AND chiave IN (SELECT chiave FROM main.articolo WHERE negozio_chiave=?)", chiave) };
}

/**
 * Elimina un luogo o un negozio nel cestino (R5-21, DELETE elimina e basta: «Ripristina i valori della guida» è un'altra rotta). Senza conferma e
 * con contenuti → 409 `luogo-con-contenuti` / `negozio-con-acquisti` col riepilogo; con la conferma (o senza contenuti) va nel cestino.
 */
export function eliminaNelCestino(tipo: 'luogo' | 'negozio', chiave: string, conferma: boolean): { esito: 'eliminata'; elemento: null; riepilogo: RiepilogoEliminazione } {
  const listini = lettureListiniCondivisi();
  if (tipo === 'negozio') chiave = listinoDelNegozio(chiave, listini);
  const negozi = tipo === 'negozio' ? negoziEquivalenti(chiave, listini) : [];
  const r = prepared(`SELECT chiave, nome, ${tipo === 'luogo' ? 'quartiere_chiave' : 'luogo_chiave'} AS quartiere FROM ${tipo} WHERE chiave = ?`).get(chiave) as { chiave: string; nome: string; quartiere: string | null } | undefined;
  if (!r) throw httpErrors.notFound(`${tipo}-non-trovato`, `${tipo === 'luogo' ? 'Il luogo' : 'Il negozio'} '${chiave}' non esiste.`);
  const conti = tipo === 'luogo' ? riepilogo(tipo, chiave) : negozi.map((k) => riepilogo('negozio', k)).reduce((a, b) => ({
    pin: a.pin + b.pin, negozi: a.negozi + b.negozi, attivita: a.attivita + b.attivita,
    articoli: a.articoli + b.articoli, acquisti: a.acquisti + b.acquisti, punti: a.punti + b.punti,
    consumazioni: a.consumazioni + b.consumazioni, provenienze: a.provenienze + b.provenienze, proposte: a.proposte + b.proposte, ricevute: a.ricevute + b.ricevute,
  }), { pin: 0, negozi: negozi.length - 1, attivita: 0, articoli: 0, acquisti: 0, punti: 0, consumazioni: 0, provenienze: 0, proposte: 0, ricevute: 0 });
  const contenuti = Object.values(conti).reduce((a, b) => a + b, 0);
  if (!conferma && contenuti > 0) {
    throw httpErrors.conflict(tipo === 'luogo' ? 'luogo-con-contenuti' : 'negozio-con-acquisti', `«${r.nome}» ha dei contenuti: conferma per metterlo nel cestino.`, { ...conti });
  }
  const contesto = r.quartiere ? ((prepared('SELECT nome FROM quartiere WHERE chiave = ?').get(r.quartiere) as { nome: string } | undefined)?.nome ?? r.quartiere) : '';
  conCestino({ tipo, chiave, nome: r.nome, contesto }, () => getDb().transaction(() => {
    if (tipo === 'luogo') {
      // i pin del luogo se ne vanno con lui (immagini e stati compresi); negozi e attività della sede restano, senza sede
      for (const s of prepared("SELECT id FROM spillo WHERE riferimento_tipo IN ('luogo', 'attivita') AND riferimento_chiave = ?").all(chiave) as Array<{ id: number }>) eliminaSpillo(s.id);
      prepared('UPDATE negozio SET sede_chiave = NULL WHERE sede_chiave = ?').run(chiave);
      prepared('UPDATE attivita SET sede_chiave = NULL WHERE sede_chiave = ?').run(chiave);
      prepared('DELETE FROM luogo WHERE chiave = ?').run(chiave);
    } else {
      const articoli = negozi.flatMap(k => (prepared('SELECT chiave FROM main.articolo WHERE negozio_chiave=?').all(k) as Array<{ chiave: string }>).map(a => a.chiave));
      preparaRimozioneArticoliAcquistati(articoli);
      // Anche i duplicati archiviati vanno nello stesso cestino, col riepilogo già confermato: non devono riapparire dopo il SET NULL della FK.
      for (const k of negozi) {
        prepared('DELETE FROM utente.acquisto_partita WHERE articolo_chiave IN (SELECT chiave FROM articolo WHERE negozio_chiave = ?)').run(k);
        prepared('DELETE FROM utente.punti_negozio_partita WHERE negozio_chiave = ?').run(k);
        prepared("UPDATE spillo SET riferimento_tipo = NULL, riferimento_chiave = NULL WHERE riferimento_tipo = 'negozio' AND riferimento_chiave = ?").run(k);
        prepared('DELETE FROM articolo WHERE negozio_chiave = ?').run(k);
        prepared('DELETE FROM negozio WHERE chiave = ?').run(k);
      }
    }
  })());
  invalidaCacheDiGioco();
  return { esito: 'eliminata', elemento: null, riepilogo: conti };
}
