// Nomi, testi e destinazioni attuali delle fonti, condivisi da dettaglio e proposte.
// Nessuna dipendenza da avanzamenti o servizi aggregati; costi dal lettore base del catalogo.
import { prepared } from '../db/dbService.js';
import { datiGuidaCorretti } from './datiGuida.js';
import type { CompletamentoDto, CostoOggettoDto, OggettiGuidaDto, SfideDto } from '../../shared/types.js';
import { catalogoOggettiDisponibile, costoOggetto, oggettiConChiavi, ricompensePerFonte } from './catalogoOggettiLetture.js';
import { normalizzaCostoScambio } from '../../shared/catalogo.js';

export interface FonteRicompensaOggetto { nome: string; testo: string; casa: string; costo?: CostoOggettoDto | null; costoDaVerificare?: boolean; prezzo?: number | null }

/** L'indirizzo che porta in vista un elemento della sua pagina (`?elemento=<chiave>`, `useElementoDaIndirizzo`); `base` può avere già parametri. */
export function conElemento(base: string, chiave: string): string {
  return `${base}${base.includes('?') ? '&' : '?'}elemento=${encodeURIComponent(chiave)}`;
}
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
    // L10-01 (381): la Richiesta non ha più testi di ricompensa (vuoti in 33/33): i suoi premi sono i legami stessi
    ['richiesta', "SELECT chiave,nome,'' AS testo FROM richiesta"],
    ['domanda', 'SELECT chiave,domanda AS nome,ricompensa AS testo FROM domanda WHERE chiave IS NOT NULL'],
    ['esame', 'SELECT chiave,nome,note AS testo FROM esame'],
    ['confidente', "SELECT chiave,nome,'' AS testo FROM confidente"],
  ] as const) {
    if (!richiesti.has(tipo)) continue;
    for (const r of prepared(query).all() as Array<{ chiave: string; nome: string; testo: string | null }>) {
      const testo = r.testo ?? '';
      // L4-02: la casa è l'elemento, non l'elenco (`?elemento=`, letto da RichiestePage e, per domande ed esami, da DomandePage)
      const casa = tipo === 'richiesta' ? conElemento('/guida/richieste', r.chiave)
        : tipo === 'confidente' ? `/confidenti/${encodeURIComponent(r.chiave)}` : conElemento('/guida/domande', r.chiave);
      aggiungi(tipo, r.chiave, { nome: r.nome, testo, casa });
    }
  }
  if (richiesti.has('ricetta')) {
    const prodotti = ricompensePerFonte('ricetta');
    for (const r of datiGuidaCorretti<OggettiGuidaDto>('oggetti-guida')?.fabbricazione.ricette ?? []) {
      const collegati = prodotti.get(r.attrezzo) ?? [];
      // Ondata 5, lotto F (migrazione 279): l'effetto della ricetta è quello del prodotto, che la scheda dell'oggetto dice già; qui resta solo il
      // testo proprio della ricetta, se c'è (senza un prodotto unico collegato, o corretto dall'utente)
      aggiungi('ricetta', r.attrezzo, { nome: collegati.length ? collegati.map((p) => p.nome).join(' / ') : 'Prodotto non collegato',
        testo: [r.effetto?.trim() ? r.effetto : null, !collegati.length ? `Nome nella fonte: ${r.attrezzo}` : null].filter(Boolean).join(' · '), casa: conElemento('/guida/oggetti?scheda=fabbricazione', r.attrezzo) });
    }
  }
  if (richiesti.has('covo')) for (const r of datiGuidaCorretti<CompletamentoDto>('completamento')?.covo.premi ?? []) {
    const fonte = { nome: r.nome, testo: [r.sblocco, r.effetto].filter(Boolean).join(' · '), casa: conElemento('/guida/covo', r.nome) };
    aggiungi('covo', r.nome, fonte);
  }
  if (richiesti.has('sfida')) {
    const sfide = datiGuidaCorretti<SfideDto>('sfide');
    for (const r of sfide?.battaglieSfida.elenco ?? []) aggiungi('sfida', r.chiave,
      { nome: r.nomeIt ?? r.nome, testo: r.ricompense.join(' · '), casa: conElemento('/guida/sfide?scheda=battaglie', r.chiave) });
    for (const r of sfide?.bossSegreti ?? []) aggiungi('sfida', r.chiave,
      { nome: r.nome, testo: r.ricompense.join(' · '), casa: conElemento('/guida/sfide?scheda=boss', r.chiave) });
  }
  return out;
}

export function fonteRicompensaOggetto(tipo: string, chiave: string): FonteRicompensaOggetto | null {
  return fontiRicompenseOggetti([tipo]).get(`${tipo}\0${chiave}`) ?? null;
}
