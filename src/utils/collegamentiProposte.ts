import { TIPI_PROPOSTA_OGGETTO, type PropostaAbbinamentoDto, type TipoPropostaOggetto } from '../../shared/types';

export interface IdentitaProposta {
  rigaTipo: TipoPropostaOggetto;
  rigaChiave: string;
  catalogoChiave: string | null;
  gruppo: string;
}

/** Il collegamento individua il candidato, senza perdere le alternative del suo gruppo. */
export function leggiIdentitaProposta(testo: string | null): { identita: IdentitaProposta | null; errore: string | null } {
  if (testo === null) return { identita: null, errore: null };
  try {
    const o: unknown = JSON.parse(testo);
    if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error();
    const r = o as Record<string, unknown>;
    if (Object.keys(r).sort().join(',') !== 'catalogoChiave,gruppo,rigaChiave,rigaTipo'
      || !TIPI_PROPOSTA_OGGETTO.some(t => t === r.rigaTipo)
      || typeof r.rigaChiave !== 'string' || !r.rigaChiave.length
      || typeof r.gruppo !== 'string'
      || !(r.catalogoChiave === null || typeof r.catalogoChiave === 'string' && r.catalogoChiave.length > 0)) throw new Error();
    return { identita: r as unknown as IdentitaProposta, errore: null };
  } catch { return { identita: null, errore: 'Il collegamento alla proposta non contiene un’identità completa riconoscibile.' }; }
}

export const stessaProposta = (p: PropostaAbbinamentoDto, i: IdentitaProposta) =>
  p.rigaTipo === i.rigaTipo && p.rigaChiave === i.rigaChiave && p.gruppo === i.gruppo && (p.catalogo?.chiave ?? null) === i.catalogoChiave;
export const stessoGruppoProposta = (p: PropostaAbbinamentoDto, i: IdentitaProposta) =>
  p.rigaTipo === i.rigaTipo && p.rigaChiave === i.rigaChiave && p.gruppo === i.gruppo;
export const collegamentoProposta = (i: IdentitaProposta) => `/guida/oggetti?scheda=catalogo&${new URLSearchParams({ proposta: JSON.stringify({
  rigaTipo: i.rigaTipo, rigaChiave: i.rigaChiave, catalogoChiave: i.catalogoChiave, gruppo: i.gruppo,
}) })}`;
