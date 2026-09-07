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
/** Il nome con cui presentare una mappa: il titolo del contesto scelto, altrimenti il nome del
 * luogo seguito da ciò che questa versione mostra. È la resa unica: titolo della pagina,
 * breadcrumb del visore, mappa incorporata e selettori passano tutti di qui, così lo stesso
 * luogo non compare con due nomi diversi a seconda della schermata. */
export function nomePresentazioneMappa(mappa: IdentitaMappa, selezione?: string | null): string {
  const titolo = titoloContesto(mappa, selezione);
  if (titolo) return titolo;
  if (mappa.contesti?.some(c => c.nome === null)) return mappa.genitoreNome ? `${mappa.genitoreNome} — Planimetria` : 'Planimetria';
  const base = alternativeMappa(mappa).map(c => c.nome).join(' / ') || mappa.gruppoImmagini?.nome || mappa.nome;
  return senzaGergo(nomeConVersione(mappa as MappaRiassuntoDto, base));
}

/** Il vocabolario dell'estrattore non arriva a chi gioca.
 *
 * Quattordici mappe dell'atlante si presentano così: «Palazzo di Madarame — Immagini native che
 * nessun campo usa — tela quadrata, disegno minuto — la seconda per estensione». Ogni pezzo vuol
 * dire qualcosa a chi ha estratto i file — nessun campo del gioco fa riferimento a quell'immagine,
 * il rapporto fra i lati della tela, quanta parte ne occupa il disegno, l'ordine per estensione —
 * e **niente** a chi sta cercando dove andare. Due di quelle di Kamoshida hanno pure cinque
 * spilli, quindi non stanno nemmeno in fondo: compaiono fra le aree vere.
 *
 * Qui resta il fatto onesto — è una planimetria che l'estrazione non ha saputo attribuire a una
 * stanza — e sparisce il resto. A distinguerle ci pensano la miniatura, che si vede, e il numero
 * che `etichetteDistinte` aggiunge quando due finiscono con lo stesso nome. Il nome tecnico resta
 * nei dati: la ricerca lo trova ancora, e chi cura l'atlante ce l'ha nell'editor. */
function senzaGergo(nome: string): string {
  const i = nome.search(/(?:\s*—\s*)?Immagini native che nessun campo usa/i);
  if (i < 0) return nome;
  const prefisso = nome.slice(0, i).replace(/\s*—\s*$/, '');
  return prefisso ? `${prefisso} — Planimetria non attribuita` : 'Planimetria non attribuita';
}

/** Le etichette di un elenco, con un numero d'ordine dove due mappe si chiamerebbero uguale.
 *
 * Togliere il gergo fa comparire il problema che il gergo nascondeva: quattro fogli non attribuiti
 * dello stesso Palazzo diventano quattro «Planimetria non attribuita». Succede anche senza gergo —
 * due «Sala d'ingresso» in Palazzi diversi, tre «Banchina della metropolitana» in quartieri
 * diversi — ma lì il contesto le separa; dentro un elenco solo, no. Il numero si aggiunge **solo**
 * dove serve, nell'ordine in cui l'elenco le mostra. */
export function etichetteDistinte(mappe: IdentitaMappa[], trasforma: (nome: string) => string = (n) => n): string[] {
  const nomi = mappe.map(m => trasforma(nomePresentazioneMappa(m)));
  const quante = new Map<string, number>();
  for (const n of nomi) quante.set(n, (quante.get(n) ?? 0) + 1);
  const visti = new Map<string, number>();
  return nomi.map(n => {
    if ((quante.get(n) ?? 0) < 2) return n;
    const i = (visti.get(n) ?? 0) + 1;
    visti.set(n, i);
    return `${n} · ${i}`;
  });
}
export function presentaMappa(mappa: MappaDto, selezione?: string | null): MappaDto {
  const nome = nomePresentazioneMappa(mappa, selezione);
  return { ...mappa, nome, percorso: mappa.percorso.map((p, i) => i === mappa.percorso.length - 1 ? { ...p, nome } : p), figli: mappa.figli.map(f => ({ ...f, nome: nomePresentazioneMappa(f) })) };
}
/** Etichetta del selettore con la gerarchia verificata, mai un piano inventato. La parte che
 * descrive la versione viene da `etichettaVersione`, la stessa che usano indice e albero. */
export function etichettaPlanimetria(mappa: MappaRiassuntoDto): string {
  if (mappa.contesti?.some(c => c.nome === null)) return nomePresentazioneMappa(mappa);
  const nome = nomePresentazioneMappa(mappa);
  return mappa.nomeCompleto?.endsWith(mappa.nome) ? mappa.nomeCompleto.slice(0, -mappa.nome.length) + nome : nome;
}
