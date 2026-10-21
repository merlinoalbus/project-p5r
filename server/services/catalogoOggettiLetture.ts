// Letture del catalogo condivise dai consumatori: nessuna dipendenza da negozi, letture o avanzamento.
// Il dettaglio aggregato vive in catalogoOggettiService; questa base evita cicli fra i servizi.
import { prepared } from '../db/dbService.js';
import { casaOggetto, eCategoriaOggetto, normalizzaCostoScambio, normalizzaNomeOggetto, type CategoriaOggetto } from '../../shared/catalogo.js';
import type { CatalogoOggettoDto, ContenutoOggettoDto, CostoOggettoDto, OggettiGuidaDto, RicompensaOggettoDto, RiferimentoOggettoDto } from '../../shared/types.js';
import { httpErrors } from '../utils/httpError.js';
import { nodiCatalogoGuida } from '../../shared/riferimentiCatalogoGuida.js';
import { effettiVisibiliDelLibro } from '../../shared/effettiLibro.js';
import { leggiVociEffetto } from '../../shared/effettiCatalogo.js';

export interface RigaCatalogoOggetto {
  chiave: string; categoria: string; sottocategoria: string | null; nome: string; nomi_altri_json: string;
  nome_originale: string | null; effetto: string; descrizione: string; statistiche_json: string | null;
  fonte_tipo: CatalogoOggettoDto['fonte']['tipo']; fonte_chiave: string | null; origine: 'seed' | 'utente';
  seed_json: string | null; nascosto: number; updated_at: string; prezzo_minimo?: number | null;
}

function analizza(json: string | null): unknown { try { return json ? JSON.parse(json) as unknown : null; } catch { return null; } }
/** Nessuna query alle colonne nuove finché M7 non è registrata e applicata. */
export function catalogoOggettiDisponibile(): boolean {
  return !!prepared("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'catalogo_oggetto'").get();
}
export function nomiAltriOggetto(json: string): string[] {
  const v = analizza(json); return Array.isArray(v) ? v.filter((n): n is string => typeof n === 'string') : [];
}
export function statisticheOggetto(json: string | null): Record<string, unknown> | null {
  const v = analizza(json); return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
}

/** Un costo di scambio illeggibile non diventa mai «gratis». Chi lo espone mantiene anche la nota del listino. */
export function costoOggetto(json: string | null, riferimenti?: ReadonlyMap<string, RiferimentoOggettoDto>): CostoOggettoDto | null {
  const v = normalizzaCostoScambio(json);
  if (!v) return null;
  if (v.tipo === 'fiori') return v;
  const out: Extract<CostoOggettoDto, { tipo: 'oggetti' }>['oggetti'] = [];
  for (const o of v.oggetti) {
    const r = riferimenti === undefined ? riferimentoOggetto(o.chiave) : riferimenti.get(o.chiave);
    out.push({ chiave: o.chiave, quantita: o.quantita, ...(r ? { nome: r.nome, casa: r.casa } : {}) });
  }
  return { tipo: 'oggetti', oggetti: out };
}

export function riferimentoOggetto(chiave: string | null | undefined): RiferimentoOggettoDto | null {
  if (!chiave) return null;
  const r = prepared('SELECT chiave,nome FROM catalogo_oggetto WHERE chiave = ?').get(chiave) as { chiave: string; nome: string } | undefined;
  return r ? { ...r, casa: casaOggetto(r.chiave) } : null;
}

export function dtoOggetto(r: RigaCatalogoOggetto): CatalogoOggettoDto {
  if (!eCategoriaOggetto(r.categoria)) throw httpErrors.conflict('categoria-oggetto-non-valida', `La categoria di «${r.nome}» non è riconosciuta: correggi l’oggetto prima di usarlo.`);
  let statistiche = statisticheOggetto(r.statistiche_json);
  // Sessioni ed effetti restano sulla sorgente della lettura: anche una correzione successiva
  // alla migrazione si vede nel catalogo, senza una seconda copia da sincronizzare.
  const tabella = r.categoria === 'libro' ? 'libro' : r.categoria === 'film' ? 'film' : r.categoria === 'videogioco' ? 'attivita' : null;
  if (tabella) {
    const lettura = prepared(`SELECT sessioni,effetti_json FROM ${tabella} WHERE catalogo_chiave = ?`).get(r.chiave) as { sessioni: number | null; effetti_json: string | null } | undefined;
    const effetti = leggiVociEffetto(lettura?.effetti_json ?? JSON.stringify(statistiche?.effetti ?? []));
    statistiche = { ...statistiche, ...(lettura ? { sessioni: lettura.sessioni } : {}), effetti: r.categoria === 'libro' ? effettiVisibiliDelLibro(effetti) : effetti };
  }
  return { chiave: r.chiave, categoria: r.categoria, sottocategoria: r.sottocategoria, nome: r.nome,
    nomiAltri: nomiAltriOggetto(r.nomi_altri_json), nomeOriginale: r.nome_originale, effetto: r.effetto, descrizione: r.descrizione,
    statistiche, casa: casaOggetto(r.chiave),
    fonte: { tipo: r.fonte_tipo, chiave: r.fonte_chiave }, origine: r.origine,
    modificato: r.seed_json !== null, nascosto: r.nascosto === 1, prezzoMinimo: r.prezzo_minimo ?? null };
}

const SQL_CATALOGO = `SELECT c.*,
  (SELECT MIN(a.prezzo) FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave
    WHERE a.catalogo_chiave = c.chiave AND a.nascosto = 0 AND n.nascosto = 0 AND a.articolo_condiviso IS NULL AND a.costo_json IS NULL) AS prezzo_minimo
  FROM catalogo_oggetto c`;

export function rigaOggetto(chiave: string, ancheNascosto = false): RigaCatalogoOggetto {
  const r = prepared(`${SQL_CATALOGO} WHERE c.chiave = ?${ancheNascosto ? '' : ' AND c.nascosto = 0'}`).get(chiave) as RigaCatalogoOggetto | undefined;
  if (!r) throw httpErrors.notFound('oggetto-non-trovato', 'L’oggetto non è presente nel catalogo.');
  return r;
}

export function elencaCatalogoOggetti(filtro: { categoria?: CategoriaOggetto; q?: string; nascosti?: boolean } = {}): CatalogoOggettoDto[] {
  const condizioni: string[] = []; const parametri: string[] = [];
  if (!filtro.nascosti) condizioni.push('c.nascosto = 0');
  if (filtro.categoria) { condizioni.push('c.categoria = ?'); parametri.push(filtro.categoria); }
  const righe = prepared(`${SQL_CATALOGO}${condizioni.length ? ` WHERE ${condizioni.join(' AND ')}` : ''} ORDER BY c.nome COLLATE NOCASE,c.chiave`).all(...parametri) as RigaCatalogoOggetto[];
  const q = normalizzaNomeOggetto(filtro.q ?? '');
  return righe.map(dtoOggetto).filter((o) => !q || [o.nome, ...o.nomiAltri, o.nomeOriginale ?? '', o.effetto].some((n) => normalizzaNomeOggetto(n).includes(q)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it') || a.chiave.localeCompare(b.chiave));
}

/** SQL chiuso: il riferimento vive sulla sorgente, non in una tabella di raccordo. */
export function sqlRiferimentiFonte(fonte: CatalogoOggettoDto['fonte']['tipo']): string {
  switch (fonte) {
    case 'equipaggiamento': return 'SELECT CAST(id AS TEXT) AS fonte_chiave,catalogo_chiave FROM oggetto';
    case 'libro': return 'SELECT chiave AS fonte_chiave,catalogo_chiave FROM libro';
    case 'film': return 'SELECT chiave AS fonte_chiave,catalogo_chiave FROM film';
    case 'videogioco': return "SELECT chiave AS fonte_chiave,catalogo_chiave FROM attivita WHERE tipo = 'videogioco'";
    case 'listino': return 'SELECT chiave AS fonte_chiave,catalogo_chiave FROM articolo';
    case 'utente': return "SELECT chiave AS fonte_chiave,chiave AS catalogo_chiave FROM catalogo_oggetto WHERE fonte_tipo = 'utente'";
    case 'guida': throw new Error('I riferimenti della guida si leggono dai suoi nodi strutturati.');
  }
}

/** Le fonti confluite restano riferimenti diretti, senza copie d'identità o ricerche per nome. */
export function oggettiPerFonte(fonte: CatalogoOggettoDto['fonte']['tipo'], chiavi?: Iterable<string>): Map<string, CatalogoOggettoDto> {
  if (!catalogoOggettiDisponibile()) return new Map();
  const richieste = chiavi === undefined ? undefined : [...new Set(chiavi)];
  if (richieste?.length === 0) return new Map();
  if (fonte === 'guida') {
    const r = prepared("SELECT json FROM dati_guida WHERE chiave = 'oggetti-guida'").get() as { json: string } | undefined;
    const nodi = nodiCatalogoGuida(analizza(r?.json ?? null)).filter((n) => !richieste || richieste.includes(n.fonte));
    const oggetti = oggettiConChiavi(nodi.flatMap(({ nodo }) => typeof nodo.catalogoChiave === 'string' ? [nodo.catalogoChiave] : []));
    return new Map(nodi.flatMap(({ fonte: k, nodo }) => {
      const o = typeof nodo.catalogoChiave === 'string' ? oggetti.get(nodo.catalogoChiave) : undefined;
      return o ? [[k, o] as const] : [];
    }));
  }
  const righe = prepared(`SELECT x.*,f.fonte_chiave AS fonte_richiesta FROM (${SQL_CATALOGO}) x
    JOIN (${sqlRiferimentiFonte(fonte)}) f ON f.catalogo_chiave = x.chiave
    ${richieste ? 'WHERE f.fonte_chiave IN (SELECT value FROM json_each(?))' : ''}`)
    .all(...(richieste ? [JSON.stringify(richieste)] : [])) as Array<RigaCatalogoOggetto & { fonte_richiesta: string }>;
  return new Map(righe.map((r) => [r.fonte_richiesta, dtoOggetto(r)]));
}

/** Un'unica lettura delle identità richieste dal listino; mai una ricerca o una fusione per nome. */
export function riferimentiOggettiPerFonti(fonti: Iterable<CatalogoOggettoDto['fonte']['tipo']>): Map<string, RiferimentoOggettoDto> {
  const tipi = [...new Set(fonti)];
  if (!tipi.length || !catalogoOggettiDisponibile()) return new Map();
  const out = new Map<string, RiferimentoOggettoDto>();
  for (const tipo of tipi) for (const [fonte, o] of oggettiPerFonte(tipo)) out.set(`${tipo}/${fonte}`, { chiave: o.chiave, nome: o.nome, casa: o.casa });
  return out;
}

/** Un'unica lettura delle identità richieste dal listino; mai una ricerca o una fusione per nome. */
export function oggettiConChiavi(chiavi: Iterable<string>): Map<string, CatalogoOggettoDto> {
  const elenco = [...new Set(chiavi)];
  if (!elenco.length || !catalogoOggettiDisponibile()) return new Map();
  return new Map((prepared(`${SQL_CATALOGO} WHERE c.chiave IN (SELECT value FROM json_each(?))`).all(JSON.stringify(elenco)) as RigaCatalogoOggetto[])
    .map((r) => [r.chiave, dtoOggetto(r)]));
}

export interface OffertaBaseOggetto {
  negozioNome: string; sedeNome: string | null; prezzo: number | null; costo: CostoOggettoDto | null; costoDaVerificare: boolean;
}

/** Nomi e numero delle offerte correnti: prezzi, costi, condizioni e gesti restano nel listino L5. */
export function riferimentiListiniScambi(): NonNullable<OggettiGuidaDto['listiniScambi']> {
  if (!catalogoOggettiDisponibile()) return [];
  const negozi = ['mercante-sakai', 'venditore-ambulante', 'gachapon-akihabara', 'tanaka-affari-loschi', 'jose'];
  return (prepared(`SELECT n.chiave,n.nome,l.nome AS posto,
    (SELECT COUNT(*) FROM articolo a WHERE a.negozio_chiave = COALESCE(n.listino_condiviso,n.chiave) AND a.nascosto = 0 AND a.articolo_condiviso IS NULL) AS offerte
    FROM negozio n LEFT JOIN luogo l ON l.chiave = n.sede_chiave
    WHERE n.chiave IN (SELECT value FROM json_each(?)) AND n.nascosto = 0
      AND (n.sede_chiave IS NULL OR l.nascosto = 0) ORDER BY n.ordine,n.chiave`).all(JSON.stringify(negozi)) as Array<{
      chiave: string; nome: string; posto: string | null; offerte: number;
    }>).map((n) => ({ ...n, casa: `/guida/negozi/${encodeURIComponent(n.chiave)}` }));
}

/** Indicazioni commerciali della guida, senza inventare disponibilità o acquisti in assenza di una partita. */
export function offerteBaseDegliOggetti(chiavi: Iterable<string>): Map<string, OffertaBaseOggetto[]> {
  const out = new Map<string, OffertaBaseOggetto[]>(); const elenco = [...new Set(chiavi)];
  if (!elenco.length || !catalogoOggettiDisponibile()) return out;
  const righe = prepared(`SELECT a.catalogo_chiave,n.nome AS negozio_nome,l.nome AS sede_nome,a.prezzo,a.costo_json
    FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave
    LEFT JOIN (SELECT chiave AS negozio,sede_chiave AS luogo FROM negozio UNION SELECT negozio_chiave,luogo_chiave FROM negozio_luogo_extra) s ON s.negozio = n.chiave
    LEFT JOIN luogo l ON l.chiave = s.luogo
    WHERE a.catalogo_chiave IN (SELECT value FROM json_each(?)) AND a.nascosto = 0 AND n.nascosto = 0
      AND a.articolo_condiviso IS NULL AND (s.luogo IS NULL OR l.nascosto = 0)
    ORDER BY n.ordine,a.ordine,l.nome,a.chiave`).all(JSON.stringify(elenco)) as Array<{
      catalogo_chiave: string; negozio_nome: string; sede_nome: string | null; prezzo: number | null; costo_json: string | null;
    }>;
  for (const r of righe) {
    const offerte = out.get(r.catalogo_chiave) ?? []; const costo = costoOggetto(r.costo_json);
    offerte.push({ negozioNome: r.negozio_nome, sedeNome: r.sede_nome, prezzo: r.prezzo, costo, costoDaVerificare: r.costo_json !== null && costo === null });
    out.set(r.catalogo_chiave, offerte);
  }
  return out;
}

/** Le offerte delle letture seguono il legame canonico, anche se il vecchio oggetto_fonte non c'è più. */
export function negoziPerFonte(fonte: 'libro' | 'film' | 'videogioco'): Map<string, Array<{ articolo: string; negozio: string; negozioNome: string; prezzo: number | null }>> {
  const out = new Map<string, Array<{ articolo: string; negozio: string; negozioNome: string; prezzo: number | null }>>();
  if (!catalogoOggettiDisponibile()) return out;
  const righe = prepared(`SELECT f.fonte_chiave,a.chiave,n.chiave AS negozio,n.nome AS negozio_nome,a.prezzo
    FROM (${sqlRiferimentiFonte(fonte)}) f JOIN articolo a ON a.catalogo_chiave = f.catalogo_chiave JOIN negozio n ON n.chiave = a.negozio_chiave
    WHERE a.nascosto = 0 AND n.nascosto = 0
      AND a.articolo_condiviso IS NULL AND a.costo_json IS NULL ORDER BY n.ordine,a.ordine,a.chiave`).all() as Array<{
      fonte_chiave: string; chiave: string; negozio: string; negozio_nome: string; prezzo: number | null;
    }>;
  for (const r of righe) {
    const elenco = out.get(r.fonte_chiave) ?? [];
    elenco.push({ articolo: r.chiave, negozio: r.negozio, negozioNome: r.negozio_nome, prezzo: r.prezzo }); out.set(r.fonte_chiave, elenco);
  }
  return out;
}

/** Contenuto per voce letto in blocco: non rilegge il catalogo per ogni punto della guida. */
export function contenutiDelleVoci(voci?: Iterable<string>): Map<string, ContenutoOggettoDto[]> {
  const out = new Map<string, ContenutoOggettoDto[]>();
  const chiavi = voci === undefined ? undefined : [...new Set(voci)];
  if (chiavi?.length === 0 || !catalogoOggettiDisponibile()) return out;
  const righe = prepared(`SELECT v.voce_chiave,c.chiave,c.nome,v.quantita,v.nota FROM voce_oggetto v
    JOIN catalogo_oggetto c ON c.chiave = v.catalogo_chiave ${chiavi ? 'WHERE v.voce_chiave IN (SELECT value FROM json_each(?))' : ''}
    ORDER BY v.voce_chiave,v.ordine,c.chiave`).all(...(chiavi ? [JSON.stringify(chiavi)] : [])) as Array<ContenutoOggettoDto & { voce_chiave: string }>;
  for (const r of righe) {
    const v = out.get(r.voce_chiave) ?? [];
    v.push({ chiave: r.chiave, nome: r.nome, quantita: r.quantita, nota: r.nota, casa: casaOggetto(r.chiave) });
    out.set(r.voce_chiave, v);
  }
  return out;
}

export function ricompensePerFonte(tipo: string, fonti?: Iterable<string>): Map<string, RicompensaOggettoDto[]> {
  const out = new Map<string, RicompensaOggettoDto[]>();
  const chiavi = fonti === undefined ? undefined : [...new Set(fonti)];
  if (chiavi?.length === 0 || !catalogoOggettiDisponibile()) return out;
  const righe = prepared(`SELECT r.fonte_chiave,c.chiave,c.nome,r.quantita,r.nota FROM ricompensa_oggetto r
    JOIN catalogo_oggetto c ON c.chiave = r.catalogo_chiave WHERE r.fonte_tipo = ? ${chiavi ? 'AND r.fonte_chiave IN (SELECT value FROM json_each(?))' : ''}
    ORDER BY r.fonte_chiave,r.ordine,c.chiave`).all(tipo, ...(chiavi ? [JSON.stringify(chiavi)] : [])) as Array<RicompensaOggettoDto & { fonte_chiave: string }>;
  for (const r of righe) {
    const v = out.get(r.fonte_chiave) ?? [];
    v.push({ chiave: r.chiave, nome: r.nome, quantita: r.quantita, nota: r.nota, casa: casaOggetto(r.chiave) });
    out.set(r.fonte_chiave, v);
  }
  return out;
}

/** Materiali per le ricette esistenti: la chiave della ricetta non viene rinominata insieme al prodotto. */
export function materialiDelleRicette(): Map<string, ContenutoOggettoDto[]> {
  const out = new Map<string, ContenutoOggettoDto[]>();
  if (!catalogoOggettiDisponibile()) return out;
  const righe = prepared(`SELECT r.ricetta,c.chiave,c.nome,r.quantita FROM ricetta_materiale r
    JOIN catalogo_oggetto c ON c.chiave = r.catalogo_chiave ORDER BY r.ricetta,c.nome,c.chiave`).all() as Array<{ ricetta: string; chiave: string; nome: string; quantita: number }>;
  for (const r of righe) {
    const materiali = out.get(r.ricetta) ?? [];
    materiali.push({ chiave: r.chiave, nome: r.nome, quantita: r.quantita, nota: null, casa: casaOggetto(r.chiave) }); out.set(r.ricetta, materiali);
  }
  return out;
}
