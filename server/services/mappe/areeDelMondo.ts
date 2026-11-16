// ============================================================
// areeDelMondo — la regola che dà un'Area a ogni planimetria del mondo che non ne ha una
// ============================================================
//
// Gerarchia del mondo: **Città → Quartiere → Area → Planimetrie → Luoghi**. Ogni planimetria (`luogo` o `area`) figlia della mappa di
// un quartiere, o di Tokyo, appartiene a un'Area (tabella `area`; `mappa.area_chiave`, `mappa.versione_ordine`,
// `mappa.versione_etichetta`), e l'ingresso di un quartiere porta l'Area della sua planimetria (`quartiere_ingresso.area_chiave`).
// La regola **aggiunge i legami, non riscrive i contenuti**: nessuna chiave di mappa cambia, nessun pin cambia mappa, posizione, nome
// o riferimento. Le planimetrie figlie di Tokyo, che nessun quartiere colloca, diventano un'Area della città **da verificare**
// (l'utente poi la tiene o la rimuove). Si può rieseguire: la seconda volta non tocca niente.
//
// La chiama l'importazione di un pacchetto di mappe (`mappeService`), dopo aver scritto le mappe: una planimetria arrivata senza Area
// la riceve qui.
// ============================================================

import type { AppDatabase } from '../../db/dbService.js';

/** Gli slug che non possono essere di un'Area: sono segmenti delle rotte delle Aree. */
const SLUG_RISERVATI = new Set(['ordine', 'da-collocare', 'nuova']);

/** La regola di `shared/slug.ts`, copiata: minuscolo, senza accenti né apostrofi, ogni altro carattere un trattino. */
function slug(testo: string): string {
  return testo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’`´]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
}

/** I nomi delle colonne di una tabella dei dati di gioco. */
function colonne(db: AppDatabase, tabella: string): Set<string> {
  return new Set((db.prepare(`PRAGMA table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name));
}

interface Gruppo { id: string; nome: string; ordine: number; etichetta?: string; nomeRivisto?: boolean }
/** Il contenitore di un'Area del mondo: un quartiere, o la città (Tokyo) per le planimetrie che non stanno in nessun quartiere. */
type TipoContenitore = 'quartiere' | 'citta';
interface RigaZona { chiave: string; nome: string; ordine: number; origine: string; nome_rivisto: number; tipo: TipoContenitore; contenitore: string; gruppo_json: string | null }

/** Il gruppo d'immagini dichiarato nella presentazione (solo dove la colonna `gruppo_immagini_json` c'è), se è leggibile e ha un id. */
function gruppoDi(json: string | null): Gruppo | null {
  if (!json) return null;
  try {
    const g = JSON.parse(json) as Partial<Gruppo>;
    return typeof g.id === 'string' && g.id.length > 0 ? { id: g.id, nome: typeof g.nome === 'string' ? g.nome : '', ordine: Number.isInteger(g.ordine) ? g.ordine! : 0, etichetta: typeof g.etichetta === 'string' ? g.etichetta : undefined, nomeRivisto: g.nomeRivisto === true } : null;
  } catch {
    return null;
  }
}

/** Esito della regola delle Aree: per il log e per i test. */
export interface EsitoAreeMondo { aree: number; planimetrie: number; etichette: number; ingressi: number }

/**
 * La regola delle Aree del mondo: le planimetrie (`luogo` o `area`) ancora senza Area, figlie di una mappa di quartiere (escluso
 * l'ingresso dei Memento) o di Tokyo, ricevono un'Area: una per planimetria sciolta, una per gruppo d'immagini dove il gruppo c'è. Le
 * Aree di un quartiere stanno nel quartiere; quelle figlie di Tokyo (che nessun quartiere colloca) stanno nella città e nascono **da
 * verificare** (l'utente poi le tiene o le rimuove). Un'Area esistente non si ricrea; le nuove vanno in fondo al loro contenitore,
 * nell'ordine delle loro planimetrie. Poi gli ingressi dei quartieri ricevono l'Area della loro planimetria.
 */
export function assegnaAreeDelMondo(db: AppDatabase, adesso: string): EsitoAreeMondo {
  // Il quartiere di una planimetria si ricava dalla chiave della mappa del quartiere (`citta-<q>`). Dove la base ha le colonne
  // `mappa.entita_*` e `mappa_presentazione.gruppo_immagini_json` (lo schema dei dati di gioco non le prevede) la regola le legge: il
  // quartiere viene dall'entità della mappa e le planimetrie dello stesso gruppo d'immagini condividono l'Area, come versioni.
  const conEntita = colonne(db, 'mappa').has('entita_tipo');
  const gruppoSql = colonne(db, 'mappa_presentazione').has('gruppo_immagini_json') ? 'p.gruppo_immagini_json' : 'NULL';
  const zone = [
    ...db.prepare(`SELECT m.chiave, m.nome, m.ordine, m.origine, COALESCE(m.nome_rivisto, 0) AS nome_rivisto, 'quartiere' AS tipo,
        ${conEntita ? 'q.entita_chiave' : "substr(q.chiave, 7)"} AS contenitore, ${gruppoSql} AS gruppo_json
      FROM mappa m
      JOIN mappa q ON q.chiave = m.genitore_chiave AND q.tipo = 'quartiere' AND ${conEntita ? "q.entita_tipo = 'quartiere' AND q.entita_chiave <> 'mementos'" : "q.chiave LIKE 'citta-%' AND q.chiave <> 'citta-mementos'"}
      JOIN quartiere qq ON qq.chiave = ${conEntita ? 'q.entita_chiave' : 'substr(q.chiave, 7)'}
      LEFT JOIN mappa_presentazione p ON p.mappa_chiave = m.chiave
      WHERE m.tipo IN ('luogo', 'area') AND m.area_chiave IS NULL`).all() as RigaZona[],
    // la città: solo Tokyo (il CHECK di `area.citta_chiave`)
    ...db.prepare(`SELECT m.chiave, m.nome, m.ordine, m.origine, COALESCE(m.nome_rivisto, 0) AS nome_rivisto, 'citta' AS tipo,
        'tokyo' AS contenitore, ${gruppoSql} AS gruppo_json
      FROM mappa m
      JOIN mappa c ON c.chiave = m.genitore_chiave AND c.chiave = 'tokyo' AND c.tipo = 'citta'
      LEFT JOIN mappa_presentazione p ON p.mappa_chiave = m.chiave
      WHERE m.tipo IN ('luogo', 'area') AND m.area_chiave IS NULL`).all() as RigaZona[],
  ];
  // i gruppi (contenitore e gruppo → planimetrie); le sciolte sono gruppi di una
  const gruppi = new Map<string, { tipo: TipoContenitore; contenitore: string; gruppo: Gruppo | null; righe: RigaZona[] }>();
  for (const z of zone) {
    const g = gruppoDi(z.gruppo_json);
    const id = `${z.tipo}:${z.contenitore}|${g ? `g:${g.id}` : `m:${z.chiave}`}`;
    const voce = gruppi.get(id) ?? { tipo: z.tipo, contenitore: z.contenitore, gruppo: g, righe: [] };
    voce.righe.push(z);
    gruppi.set(id, voce);
  }
  const esito: EsitoAreeMondo = { aree: 0, planimetrie: 0, etichette: 0, ingressi: 0 };
  const perContenitore = new Map<string, { tipo: TipoContenitore; contenitore: string; aree: Array<{ gruppo: Gruppo | null; righe: RigaZona[] }> }>();
  for (const v of gruppi.values()) {
    // le versioni nell'ordine del gruppo (a parità, della mappa e della chiave); una sciolta è la versione 0
    v.righe.sort((a, b) => (gruppoDi(a.gruppo_json)?.ordine ?? 0) - (gruppoDi(b.gruppo_json)?.ordine ?? 0) || a.ordine - b.ordine || a.chiave.localeCompare(b.chiave));
    const id = `${v.tipo}:${v.contenitore}`;
    const elenco = perContenitore.get(id) ?? { tipo: v.tipo, contenitore: v.contenitore, aree: [] };
    elenco.aree.push({ gruppo: v.gruppo, righe: v.righe });
    perContenitore.set(id, elenco);
  }
  const inserisci = db.prepare(`INSERT INTO area (chiave, quartiere_chiave, dungeon_chiave, citta_chiave, slug, nome, nome_rivisto, ordine, planimetria_predefinita, origine, seed_json, da_verificare, updated_at)
    VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`);
  const lega = db.prepare('UPDATE mappa SET area_chiave = ?, versione_ordine = ?, versione_etichetta = ? WHERE chiave = ? AND area_chiave IS NULL');
  for (const { tipo, contenitore, aree } of [...perContenitore.values()].sort((a, b) => `${a.tipo}:${a.contenitore}`.localeCompare(`${b.tipo}:${b.contenitore}`))) {
    const colonna = tipo === 'quartiere' ? 'quartiere_chiave' : 'citta_chiave';
    // dove comincia la numerazione: dopo le Aree che il contenitore ha già (una seconda esecuzione, un'Area creata dall'app)
    const giaUsati = new Set((db.prepare(`SELECT slug FROM area WHERE ${colonna} = ?`).all(contenitore) as Array<{ slug: string }>).map((r) => r.slug));
    const base = (db.prepare(`SELECT COALESCE(MAX(ordine) + 100, 0) AS n FROM area WHERE ${colonna} = ?`).get(contenitore) as { n: number }).n;
    const chiaveOrdine = (a: { righe: RigaZona[] }) => ({ ordine: Math.min(...a.righe.map((r) => r.ordine)), chiave: [...a.righe].map((r) => r.chiave).sort()[0] });
    aree.sort((a, b) => { const x = chiaveOrdine(a); const y = chiaveOrdine(b); return x.ordine - y.ordine || x.chiave.localeCompare(y.chiave); });
    aree.forEach((a, i) => {
      const predefinita = a.righe[0];
      const nome = (a.gruppo?.nome?.trim() || predefinita.nome).trim();
      let s = slug(nome) || 'area';
      if (SLUG_RISERVATI.has(s)) s = `${s}-area`;
      let candidato = s; let n = 2;
      while (giaUsati.has(candidato)) candidato = `${s}-${n++}`;
      giaUsati.add(candidato);
      // `citta/<quartiere>/<slug>`, e per la città `citta/tokyo/<slug>`
      const chiave = `citta/${contenitore}/${candidato}`;
      const utente = a.righe.some((r) => r.origine === 'utente' || r.nome_rivisto === 1);
      const rivisto = a.righe.some((r) => r.nome_rivisto === 1) || a.gruppo?.nomeRivisto === true;
      inserisci.run(chiave, tipo === 'quartiere' ? contenitore : null, tipo === 'citta' ? contenitore : null, candidato, nome, rivisto ? 1 : 0, base + 100 * i,
        predefinita.chiave, utente ? 'utente' : 'seed', tipo === 'citta' ? 1 : 0, adesso);
      esito.aree++;
      const conVersioni = a.righe.length > 1;
      a.righe.forEach((r, v) => {
        const etichetta = conVersioni ? (gruppoDi(r.gruppo_json)?.etichetta?.trim() || null) : null;
        esito.planimetrie += lega.run(chiave, v, etichetta, r.chiave).changes;
        if (etichetta) esito.etichette++;
      });
    });
  }
  // gli ingressi: l'Area della loro planimetria (planimetria, punto e zoom invariati)
  esito.ingressi = db.prepare(`UPDATE quartiere_ingresso SET area_chiave = (SELECT area_chiave FROM mappa WHERE chiave = quartiere_ingresso.mappa_chiave)
    WHERE area_chiave IS NULL AND (SELECT area_chiave FROM mappa WHERE chiave = quartiere_ingresso.mappa_chiave) IS NOT NULL`).run().changes;
  return esito;
}
