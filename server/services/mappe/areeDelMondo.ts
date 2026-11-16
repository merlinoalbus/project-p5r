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

/** Il contenitore di un'Area del mondo: un quartiere, o la città (Tokyo) per le planimetrie che non stanno in nessun quartiere. */
type TipoContenitore = 'quartiere' | 'citta';
interface RigaZona { chiave: string; nome: string; ordine: number; origine: string; nome_rivisto: number; tipo: TipoContenitore; contenitore: string }

/** Esito della regola delle Aree: per il log e per i test. */
export interface EsitoAreeMondo { aree: number; planimetrie: number; ingressi: number }

/**
 * La regola delle Aree del mondo: le planimetrie (`luogo` o `area`) ancora senza Area, figlie di una mappa di quartiere (escluso
 * l'ingresso dei Memento) o di Tokyo, ricevono un'Area: una per planimetria. Le
 * Aree di un quartiere stanno nel quartiere; quelle figlie di Tokyo (che nessun quartiere colloca) stanno nella città e nascono **da
 * verificare** (l'utente poi le tiene o le rimuove). Un'Area esistente non si ricrea; le nuove vanno in fondo al loro contenitore,
 * nell'ordine delle loro planimetrie. Poi gli ingressi dei quartieri ricevono l'Area della loro planimetria.
 */
export function assegnaAreeDelMondo(db: AppDatabase, adesso: string): EsitoAreeMondo {
  // Il quartiere di una planimetria si ricava dalla chiave della mappa del quartiere (`citta-<q>`).
  const zone = [
    ...db.prepare(`SELECT m.chiave, m.nome, m.ordine, m.origine, COALESCE(m.nome_rivisto, 0) AS nome_rivisto, 'quartiere' AS tipo,
        substr(q.chiave, 7) AS contenitore
      FROM mappa m
      JOIN mappa q ON q.chiave = m.genitore_chiave AND q.tipo = 'quartiere' AND q.chiave LIKE 'citta-%' AND q.chiave <> 'citta-mementos'
      JOIN quartiere qq ON qq.chiave = substr(q.chiave, 7)
      WHERE m.tipo IN ('luogo', 'area') AND m.area_chiave IS NULL`).all() as RigaZona[],
    // la città: solo Tokyo (il CHECK di `area.citta_chiave`)
    ...db.prepare(`SELECT m.chiave, m.nome, m.ordine, m.origine, COALESCE(m.nome_rivisto, 0) AS nome_rivisto, 'citta' AS tipo,
        'tokyo' AS contenitore
      FROM mappa m
      JOIN mappa c ON c.chiave = m.genitore_chiave AND c.chiave = 'tokyo' AND c.tipo = 'citta'
      WHERE m.tipo IN ('luogo', 'area') AND m.area_chiave IS NULL`).all() as RigaZona[],
  ];
  const esito: EsitoAreeMondo = { aree: 0, planimetrie: 0, ingressi: 0 };
  // ogni planimetria è un'Area a sé (versione 0): contenitore → le sue planimetrie
  const perContenitore = new Map<string, { tipo: TipoContenitore; contenitore: string; aree: Array<{ righe: RigaZona[] }> }>();
  for (const z of zone) {
    const id = `${z.tipo}:${z.contenitore}`;
    const elenco = perContenitore.get(id) ?? { tipo: z.tipo, contenitore: z.contenitore, aree: [] };
    elenco.aree.push({ righe: [z] });
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
      const nome = predefinita.nome.trim();
      let s = slug(nome) || 'area';
      if (SLUG_RISERVATI.has(s)) s = `${s}-area`;
      let candidato = s; let n = 2;
      while (giaUsati.has(candidato)) candidato = `${s}-${n++}`;
      giaUsati.add(candidato);
      // `citta/<quartiere>/<slug>`, e per la città `citta/tokyo/<slug>`
      const chiave = `citta/${contenitore}/${candidato}`;
      const utente = a.righe.some((r) => r.origine === 'utente' || r.nome_rivisto === 1);
      const rivisto = a.righe.some((r) => r.nome_rivisto === 1);
      inserisci.run(chiave, tipo === 'quartiere' ? contenitore : null, tipo === 'citta' ? contenitore : null, candidato, nome, rivisto ? 1 : 0, base + 100 * i,
        predefinita.chiave, utente ? 'utente' : 'seed', tipo === 'citta' ? 1 : 0, adesso);
      esito.aree++;
      a.righe.forEach((r, v) => {
        esito.planimetrie += lega.run(chiave, v, null, r.chiave).changes;
      });
    });
  }
  // gli ingressi: l'Area della loro planimetria (planimetria, punto e zoom invariati)
  esito.ingressi = db.prepare(`UPDATE quartiere_ingresso SET area_chiave = (SELECT area_chiave FROM mappa WHERE chiave = quartiere_ingresso.mappa_chiave)
    WHERE area_chiave IS NULL AND (SELECT area_chiave FROM mappa WHERE chiave = quartiere_ingresso.mappa_chiave) IS NOT NULL`).run().changes;
  return esito;
}
