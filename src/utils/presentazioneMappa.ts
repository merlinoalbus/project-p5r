import type { MappaDto, MappaRiassuntoDto } from '../types';
import { nomeConVersione } from './etichettaVersione';
type IdentitaMappa = Pick<MappaRiassuntoDto, 'nome' | 'contesti' | 'gruppoImmagini' | 'genitoreNome'>;
type RisoluzioneContesto = { stato: 'assente' | 'non-valido' | 'senza-titolo' | 'multiplo'; titolo: null; ids: string[] } | { stato: 'nominato'; titolo: string; ids: string[] };

/** Raggruppa i titoli noti uguali; i contesti privi di titolo restano distinti. */
export function alternativeMappa(mappa: IdentitaMappa): Array<{ nome: string | null; ids: string[]; valore: string }> {
  const gruppi = new Map<string, { nome: string | null; ids: string[] }>();
  for (const c of mappa.contesti ?? []) {
    const chiave = c.nome === null ? `ignoto:${c.id}` : `nome:${c.nome}`;
    const gruppo = gruppi.get(chiave) ?? { nome: c.nome, ids: [] };
    gruppo.ids.push(c.id); gruppi.set(chiave, gruppo);
  }
  return [...gruppi.values()].map(g => ({ ...g, valore: [...g.ids].sort().join('|') }));
}
export function risolviContesto(mappa: IdentitaMappa, selezione?: string | null): RisoluzioneContesto {
  if (!selezione) return { stato: 'assente', titolo: null, ids: [] };
  const ids = selezione.split('|');
  const contesti = ids.map(id => mappa.contesti?.find(c => c.id === id));
  if (ids.some(id => !id) || new Set(ids).size !== ids.length || contesti.some(c => !c)) return { stato: 'non-valido', titolo: null, ids };
  if (contesti.some(c => c!.nome === null)) return { stato: 'senza-titolo', titolo: null, ids };
  const nomi = new Set(contesti.map(c => c!.nome!));
  return nomi.size === 1 ? { stato: 'nominato', titolo: contesti[0]!.nome!, ids } : { stato: 'multiplo', titolo: null, ids };
}
export function titoloContesto(mappa: IdentitaMappa, selezione?: string | null): string | null {
  return risolviContesto(mappa, selezione).titolo;
}
export function nomePresentazioneMappa(mappa: IdentitaMappa, selezione?: string | null): string {
  const titolo = titoloContesto(mappa, selezione);
  if (titolo) return titolo;
  if (mappa.contesti?.some(c => c.nome === null)) return mappa.genitoreNome ? `${mappa.genitoreNome} — Planimetria` : 'Planimetria';
  return alternativeMappa(mappa).map(c => c.nome).join(' / ') || mappa.gruppoImmagini?.nome || mappa.nome;
}
export function presentaMappa(mappa: MappaDto, selezione?: string | null): MappaDto {
  const nome = nomePresentazioneMappa(mappa, selezione);
  return { ...mappa, nome, percorso: mappa.percorso.map((p, i) => i === mappa.percorso.length - 1 ? { ...p, nome } : p), figli: mappa.figli.map(f => ({ ...f, nome: nomePresentazioneMappa(f) })) };
}
/** Etichetta del selettore con la gerarchia verificata, mai un piano inventato. La parte che
 * descrive la versione viene da `etichettaVersione`, la stessa che usano indice e albero. */
export function etichettaPlanimetria(mappa: MappaRiassuntoDto): string {
  if (mappa.contesti?.some(c => c.nome === null)) return nomePresentazioneMappa(mappa);
  const nome = nomeConVersione(mappa, mappa.gruppoImmagini?.nome ?? nomePresentazioneMappa(mappa));
  return mappa.nomeCompleto?.endsWith(mappa.nome) ? mappa.nomeCompleto.slice(0, -mappa.nome.length) + nome : nome;
}
