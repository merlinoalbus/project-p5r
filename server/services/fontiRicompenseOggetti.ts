// Nomi, testi e destinazioni attuali delle fonti, condivisi da dettaglio e proposte.
// Nessuna dipendenza da avanzamenti o servizi aggregati; costi dal lettore base del catalogo.
import { prepared } from '../db/dbService.js';
import { datiGuida } from './datiGuida.js';
import type { CompletamentoDto, CostoOggettoDto, OggettiGuidaDto, SfideDto } from '../../shared/types.js';
import { catalogoOggettiDisponibile, costoOggetto, oggettiConChiavi, ricompensePerFonte } from './catalogoOggettiLetture.js';
import { normalizzaCostoScambio } from '../../shared/catalogo.js';

export interface FonteRicompensaOggetto { nome: string; testo: string; casa: string; costo?: CostoOggettoDto | null; costoDaVerificare?: boolean; prezzo?: number | null }
export function fontiRicompenseOggetti(tipi: Iterable<string>): Map<string, FonteRicompensaOggetto> {
  const richiesti = new Set(tipi);
  const out = new Map<string, FonteRicompensaOggetto>();
  const aggiungi = (tipo: string, chiave: string, fonte: FonteRicompensaOggetto) => out.set(`${tipo}\0${chiave}`, fonte);
  if (richiesti.has('articolo') && catalogoOggettiDisponibile()) {
    const righe = prepared(`SELECT a.chiave,COALESCE(c.nome,a.nome) AS nome,a.nota,a.prezzo,a.costo_json,n.nome AS negozio,n.chiave AS negozio_chiave FROM articolo a
      JOIN negozio n ON n.chiave = a.negozio_chiave LEFT JOIN catalogo_oggetto c ON c.chiave = a.catalogo_chiave WHERE a.nascosto = 0 AND n.nascosto = 0
        AND (a.catalogo_chiave IS NULL
          OR EXISTS (SELECT 1 FROM ricompensa_oggetto r WHERE r.fonte_tipo = 'articolo' AND r.fonte_chiave = a.chiave))`).all() as Array<{
        chiave: string; nome: string; nota: string | null; prezzo: number | null; costo_json: string | null; negozio: string; negozio_chiave: string;
      }>;
    const riferimenti = oggettiConChiavi(righe.flatMap((r) => {
      const costo = normalizzaCostoScambio(r.costo_json); return costo?.tipo === 'oggetti' ? costo.oggetti.map((o) => o.chiave) : [];
    }));
    for (const r of righe) {
      const costo = costoOggetto(r.costo_json, riferimenti);
      aggiungi('articolo', r.chiave, { nome: `${r.negozio} · ${r.nome}`, testo: r.nota ?? '',
        casa: `/guida/negozi/${encodeURIComponent(r.negozio_chiave)}`, costo, prezzo: r.prezzo, costoDaVerificare: r.costo_json !== null && costo === null });
    }
  }
  for (const [tipo, query] of [
    ['richiesta', 'SELECT chiave,nome,ricompense_json AS testo FROM richiesta'],
    ['domanda', 'SELECT chiave,domanda AS nome,ricompensa AS testo FROM domanda WHERE chiave IS NOT NULL'],
    ['esame', 'SELECT chiave,nome,note AS testo FROM esame'],
    ['confidente', "SELECT chiave,nome,'' AS testo FROM confidente"],
  ] as const) {
    if (!richiesti.has(tipo)) continue;
    for (const r of prepared(query).all() as Array<{ chiave: string; nome: string; testo: string | null }>) {
      let testo = r.testo ?? '';
      if (tipo === 'richiesta') {
        let valore: unknown; try { valore = JSON.parse(testo) as unknown; } catch { valore = null; }
        if (Array.isArray(valore)) testo = valore.filter((v): v is string => typeof v === 'string').join(' · ');
      }
      const casa = tipo === 'richiesta' ? `/guida/richieste?richiesta=${encodeURIComponent(r.chiave)}`
        : tipo === 'confidente' ? `/confidenti/${encodeURIComponent(r.chiave)}` : '/guida/domande';
      aggiungi(tipo, r.chiave, { nome: r.nome, testo, casa });
    }
  }
  if (richiesti.has('ricetta')) {
    const prodotti = ricompensePerFonte('ricetta');
    for (const r of datiGuida<OggettiGuidaDto>('oggetti-guida')?.fabbricazione.ricette ?? []) {
      const collegati = prodotti.get(r.attrezzo) ?? [];
      aggiungi('ricetta', r.attrezzo, { nome: collegati.length ? collegati.map((p) => p.nome).join(' / ') : 'Prodotto non collegato',
        testo: [r.effetto, !collegati.length ? `Nome nella fonte: ${r.attrezzo}` : null].filter(Boolean).join(' · '), casa: '/guida/oggetti?scheda=fabbricazione' });
    }
  }
  if (richiesti.has('covo')) for (const r of datiGuida<CompletamentoDto>('completamento')?.covo.premi ?? []) {
    const fonte = { nome: r.nome, testo: [r.sblocco, r.effetto].filter(Boolean).join(' · '), casa: '/guida/covo' };
    aggiungi('covo', r.nome, fonte);
  }
  if (richiesti.has('sfida')) {
    const sfide = datiGuida<SfideDto>('sfide');
    for (const r of sfide?.battaglieSfida.elenco ?? []) aggiungi('sfida', r.chiave,
      { nome: r.nomeIt ?? r.nome, testo: r.ricompense.join(' · '), casa: '/guida/sfide?scheda=battaglie' });
    for (const r of sfide?.bossSegreti ?? []) aggiungi('sfida', r.chiave,
      { nome: r.nome, testo: r.ricompense.join(' · '), casa: '/guida/sfide?scheda=boss' });
  }
  return out;
}

export function fonteRicompensaOggetto(tipo: string, chiave: string): FonteRicompensaOggetto | null {
  return fontiRicompenseOggetti([tipo]).get(`${tipo}\0${chiave}`) ?? null;
}
