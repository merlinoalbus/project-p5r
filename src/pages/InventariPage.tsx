import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getOggettiGuida, ricercaArticoli } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { ArticoliTabella } from '../components/guida/ArticoliTabella';
import { NOME_CATEGORIA_ARTICOLO } from '../utils/negozi';

const CATEGORIE = [['arma-mischia', 'Armi da mischia'], ['arma-distanza', 'Armi a distanza'], ['arma', 'Altre armi'], ['protezione', 'Protezioni'], ['accessorio', 'Accessori'], ['abito', 'Abiti'], ['regalo', 'Regali'], ['consumabile', 'Consumabili'], ['cibo', 'Cibo'], ['materiale', 'Materiali'], ['chiave', 'Oggetti chiave'], ['carte', 'Carte abilità']] as const;

export function InventariPage() {
  useDocumentTitle('Inventari per categoria');
  const partitaId = usePartitaStore((s) => s.attiva?.id ?? null);
  const [params, setParams] = useSearchParams();
  const categoria = CATEGORIE.some(([k]) => k === params.get('categoria')) ? params.get('categoria')! : 'arma-mischia';
  const [query, setQuery] = useState('');
  const categoriaApi = categoria.startsWith('arma-') ? 'arma' : categoria === 'chiave' || categoria === 'carte' || categoria === 'abito' ? undefined : categoria;
  const articoli = useCarica(() => ricercaArticoli({ categoria: categoriaApi, q: query.trim() || undefined }, partitaId ?? undefined), [categoriaApi, partitaId, query]);
  const oggetti = useCarica(() => getOggettiGuida(), []);
  const titolo = useMemo(() => CATEGORIE.find(([k]) => k === categoria)?.[1] ?? NOME_CATEGORIA_ARTICOLO[categoria] ?? categoria, [categoria]);
  const oggettiChiave = useMemo(() => (oggetti.dati?.chiaveEMateriali ?? []).filter((x) => x.tipo === 'chiave' && (!query || `${x.nome} ${x.uso} ${x.dove}`.toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it')))), [oggetti.dati, query]);
  const righe = useMemo(() => (articoli.dati?.articoli ?? []).filter((a) => categoria === 'arma-mischia' ? a.fonte.includes('armi-da-mischia') : categoria === 'arma-distanza' ? a.fonte.includes('armi-a-distanza') : categoria === 'arma' ? !a.fonte.includes('armi-da-mischia') && !a.fonte.includes('armi-a-distanza') : true), [articoli.dati, categoria]);
  const carte = categoria === 'carte';
  return <PageState isLoading={(articoli.caricamento || (categoria === 'chiave' && oggetti.caricamento)) && !articoli.dati && !oggetti.dati} error={articoli.errore ?? (categoria === 'chiave' ? oggetti.errore : null)} onRetry={() => { void articoli.ricarica(); if (categoria === 'chiave') void oggetti.ricarica(); }}><div className="flex flex-col gap-3"><IntestazionePagina titolo="Inventari per categoria" sottotitolo="Cataloghi ufficiali senza duplicare prezzi o disponibilità: l'acquisto resta nella scheda del negozio e le posizioni usano un pannello contestuale." /><FilaScorrevole role="tablist" aria-label="Categorie inventario">{CATEGORIE.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={categoria === k} className={`chip touch ${categoria === k ? 'chip--attivo' : ''}`} onClick={() => { setQuery(''); setParams({ categoria: k }, { replace: true }); }}>{l}</button>)}</FilaScorrevole><CampoRicerca valore={query} onCambia={setQuery} segnaposto={`Cerca in ${titolo.toLocaleLowerCase('it')}…`} /><h2 className="m-0 text-lg">{titolo}</h2>{categoria === 'chiave' ? <><p className="m-0 text-sm text-text-secondary">{oggettiChiave.length} oggetti chiave dal catalogo Oggetti.</p><ul className="m-0 grid list-none gap-2 p-0 md:grid-cols-2">{oggettiChiave.map((x) => <li key={x.nome} className="card"><strong>{x.nome}</strong><p className="m-0 text-sm">{x.uso}</p><span className="text-xs text-text-secondary">{x.dove}</span></li>)}</ul></> : categoria === 'abito' ? <section className="card"><p className="m-0">Gli abiti sono nel catalogo Oggetti, sezione «Abiti e lavanderia».</p></section> : carte ? <section className="card flex flex-col gap-2"><p className="m-0">Le carte abilità sono consultabili nella guida dedicata e nella duplicazione di Yusuke.</p><a href="https://www.allgamestaff.it/persona-5-royal/carte-abilita/" target="_blank" rel="noreferrer" className="credito self-start">Apri la fonte delle carte abilità</a></section> : <><p className="m-0 text-sm text-text-secondary">{righe.length} articoli trovati.</p>{articoli.dati && <ArticoliTabella articoli={righe} partitaId={partitaId} mostraNegozio onCambiato={() => void articoli.ricarica()} />}</>}</div></PageState>;
}
