// ============================================================
// I nomi dei posti per i gesti che aprono la mappa (L5, M23-M24)
// ============================================================
//
// Un gesto che porta alla mappa dice dove porta («Clinica Takemi», «Central Street»), mai «Sulla mappa». Senza dipendenze da
// altri servizi (solo il DB): lo leggono il diario (`azioniStrutturateService`) e gli oggetti della guida (`routes/compendio`).
// ============================================================

import { prepared } from '../../db/dbService.js';

/**
 * Il nome del posto di un pin: il luogo se il pin è di un luogo (o di un negozio, con la sua sede), altrimenti l'Area della sua
 * planimetria, altrimenti il nome della mappa senza il percorso. Null se la mappa non c'è.
 */
export function postoDelPin(mappaChiave: string, spilloId: number | null): string | null {
  if (spilloId !== null) {
    const s = prepared('SELECT riferimento_tipo, riferimento_chiave FROM spillo WHERE id = ?').get(spilloId) as { riferimento_tipo: string | null; riferimento_chiave: string | null } | undefined;
    if (s?.riferimento_tipo === 'luogo' && s.riferimento_chiave) {
      const l = prepared('SELECT nome FROM luogo WHERE chiave = ?').get(s.riferimento_chiave) as { nome: string } | undefined;
      if (l) return l.nome;
    }
    if (s?.riferimento_tipo === 'negozio' && s.riferimento_chiave) {
      const n = postoDelNegozio(s.riferimento_chiave);
      if (n) return n;
    }
  }
  const m = prepared('SELECT m.nome, a.nome AS area FROM mappa m LEFT JOIN area a ON a.chiave = m.area_chiave WHERE m.chiave = ?').get(mappaChiave) as { nome: string; area: string | null } | undefined;
  if (!m) return null;
  return m.area ?? m.nome.split('›').pop()!.trim();
}

/** Il nome del posto di un negozio: la sua sede (il luogo), altrimenti il nome del negozio. Null se il negozio non c'è. */
export function postoDelNegozio(negozioChiave: string): string | null {
  const r = prepared('SELECT n.nome, l.nome AS sede FROM negozio n LEFT JOIN luogo l ON l.chiave = n.sede_chiave WHERE n.chiave = ?').get(negozioChiave) as { nome: string; sede: string | null } | undefined;
  return r ? r.sede ?? r.nome : null;
}

/** Il nome del posto di un articolo del catalogo: quello del negozio che lo vende. Null se l'articolo o il negozio non ci sono. */
export function postoDellArticolo(articoloChiave: string): string | null {
  const a = prepared('SELECT negozio_chiave FROM articolo WHERE chiave = ?').get(articoloChiave) as { negozio_chiave: string | null } | undefined;
  return a?.negozio_chiave ? postoDelNegozio(a.negozio_chiave) : null;
}
