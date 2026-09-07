import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getOggettiGuida, ricercaArticoli } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { ArticoliTabella } from '../components/guida/ArticoliTabella';
import { DoveSiTrova } from '../components/mappe/DoveSiTrova';
import { NOME_CATEGORIA_ARTICOLO } from '../utils/negozi';

const CATEGORIE = [['arma-mischia', 'Armi da mischia'], ['arma-distanza', 'Armi a distanza'], ['arma', 'Altre armi'], ['protezione', 'Protezioni'], ['accessorio', 'Accessori'], ['abito', 'Abiti'], ['regalo', 'Regali'], ['consumabile', 'Consumabili'], ['cibo', 'Cibo'], ['materiale', 'Materiali'], ['chiave', 'Oggetti chiave'], ['carte', 'Carte abilità']] as const;

export function InventariPage() {
  useDocumentTitle('Inventari per categoria');
  const partitaId = usePartitaStore((s) => s.attiva?.id ?? null);
  const [params, setParams] = useSearchParams();
  const categoria = CATEGORIE.some(([k]) => k === params.get('categoria')) ? params.get('categoria')! : 'arma-mischia';
  const [query, setQuery] = useState('');
  const [negozio, setNegozio] = useState<string | null>(null);
  const apiCategoria = categoria.startsWith('arma-') ? 'arma' : ['chiave', 'carte', 'abito'].includes(categoria) ? undefined : categoria;
  const articoli = useCarica(() => ricercaArticoli({ categoria: apiCategoria, q: query.trim() || undefined }, partitaId ?? undefined), [apiCategoria, partitaId, query]);
  const oggetti = useCarica(() => getOggettiGuida(), []);
  const titolo = useMemo(() => CATEGORIE.find(([k]) => k === categoria)?.[1] ?? NOME_CATEGORIA_ARTICOLO[categoria] ?? categoria, [categoria]);
  const righe = useMemo(() => (articoli.dati?.articoli ?? []).filter((a) => categoria === 'arma-mischia' ? a.fonte.includes('armi-da-mischia') : categoria === 'arma-distanza' ? a.fonte.includes('armi-a-distanza') : categoria === 'arma' ? !a.fonte.includes('armi-da-mischia') && !a.fonte.includes('armi-a-distanza') : true), [articoli.dati, categoria]);
  const abiti = useMemo(() => (oggetti.dati?.abiti.elenco ?? []).filter((x) => !query || `${x.nome} ${x.per} ${x.dove}`.toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it'))), [oggetti.dati, query]);
  const chiavi = useMemo(() => (oggetti.dati?.chiaveEMateriali ?? []).filter((x) => x.tipo === 'chiave' && (!query || `${x.nome} ${x.uso} ${x.dove}`.toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it')))), [oggetti.dati, query]);
  const negozioRighe = righe.filter((a) => a.negozioChiave === negozio);
  return <PageState isLoading={(articoli.caricamento || oggetti.caricamento) && !articoli.dati && !oggetti.dati} error={articoli.errore ?? oggetti.errore} onRetry={() => { void articoli.ricarica(); void oggetti.ricarica(); }}><div className="flex flex-col gap-3"><IntestazionePagina titolo="Inventari per categoria" sottotitolo="Cataloghi ufficiali con ricerca, posizione contestuale e collegamento alla scheda del negozio." /><FilaScorrevole role="tablist" aria-label="Categorie inventario">{CATEGORIE.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={categoria === k} className={`chip touch ${categoria === k ? 'chip--attivo' : ''}`} onClick={() => { setQuery(''); setNegozio(null); setParams({ categoria: k }, { replace: true }); }}>{l}</button>)}</FilaScorrevole><CampoRicerca valore={query} onCambia={setQuery} segnaposto={`Cerca in ${titolo.toLocaleLowerCase('it')}…`} /><h2 className="m-0 text-lg">{titolo}</h2>{categoria === 'abito' ? <><p className="text-sm">{abiti.length} abiti nel catalogo Oggetti.</p><Link to="/guida/oggetti?scheda=abiti" className="btn btn-secondary self-start">Apri Abiti e lavanderia</Link></> : categoria === 'chiave' ? <><p className="text-sm">{chiavi.length} oggetti chiave nel catalogo Oggetti.</p><ul className="grid list-none gap-2 p-0 md:grid-cols-2">{chiavi.map((x) => <li key={x.nome} className="card"><strong>{x.nome}</strong><p className="m-0 text-sm">{x.uso}</p><span className="text-xs">{x.dove}</span>{x.articolo && <Link to="/guida/negozi" className="credito block">Vedi nel catalogo negozi</Link>}</li>)}</ul></> : categoria === 'carte' ? <section className="card"><p>Le carte abilità sono documentate nella sezione dedicata della guida e nella duplicazione di Yusuke.</p><a href="https://www.allgamestaff.it/persona-5-royal/carte-abilita/" target="_blank" rel="noreferrer" className="credito">Fonte carte abilità</a></section> : <><p className="text-sm">{righe.length} articoli trovati.</p>{righe.length > 0 && <div className="flex flex-wrap gap-1">{[...new Set(righe.map((a) => a.negozioChiave))].map((k) => <button key={k} className="chip touch" type="button" onClick={() => setNegozio((x) => x === k ? null : k)}>Posizione: {righe.find((a) => a.negozioChiave === k)?.negozioNome}</button>)}</div>}{negozio && <DoveSiTrova tipo="negozio" chiave={negozio} titolo={negozioRighe[0]?.negozioNome ?? 'Negozio'} altezza={300} />}{articoli.dati && <ArticoliTabella articoli={righe} partitaId={partitaId} mostraNegozio onCambiato={() => void articoli.ricarica()} />}</>}</div></PageState>;
}
