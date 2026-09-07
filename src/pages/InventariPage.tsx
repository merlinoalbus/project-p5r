import { useMemo, useState, type ReactNode } from 'react';
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

const CATEGORIE = [['arma-mischia', 'Armi da mischia'], ['arma-distanza', 'Armi a distanza'], ['arma', 'Altre armi'], ['protezione', 'Protezioni'], ['accessorio', 'Accessori'], ['abito', 'Abiti'], ['regalo', 'Regali'], ['consumabile', 'Consumabili'], ['cibo', 'Cibo'], ['materiale', 'Materiali'], ['chiave', 'Oggetti chiave'], ['carte', 'Carte abilità']] as const;

export function InventariPage() {
  useDocumentTitle('Inventari per categoria');
  const partitaId = usePartitaStore((s) => s.attiva?.id ?? null);
  const [params, setParams] = useSearchParams();
  const categoria = CATEGORIE.some(([k]) => k === params.get('categoria')) ? params.get('categoria')! : 'arma-mischia';
  const [query, setQuery] = useState('');
  const [negozio, setNegozio] = useState<string | null>(null);
  const apiCategoria = categoria.startsWith('arma-') ? 'arma' : ['chiave', 'abito', 'carte'].includes(categoria) ? undefined : categoria;
  const articoli = useCarica(() => ricercaArticoli({ categoria: apiCategoria, q: categoria === 'carte' ? undefined : query.trim() || undefined }, partitaId ?? undefined), [apiCategoria, partitaId, query, categoria]);
  const oggetti = useCarica(() => getOggettiGuida(), []);
  const titolo = CATEGORIE.find(([k]) => k === categoria)?.[1] ?? categoria;
  const righe = useMemo(() => (articoli.dati?.articoli ?? []).filter((a) => categoria === 'arma-mischia' ? a.fonte.includes('armi-da-mischia') : categoria === 'arma-distanza' ? a.fonte.includes('armi-a-distanza') : categoria === 'arma' ? !a.fonte.includes('armi-da-mischia') && !a.fonte.includes('armi-a-distanza') : true), [articoli.dati, categoria]);
  const abiti = useMemo(() => (oggetti.dati?.abiti.elenco ?? []).filter((x) => !query || `${x.nome} ${x.per} ${x.dove}`.toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it'))), [oggetti.dati, query]);
  const chiavi = useMemo(() => (oggetti.dati?.chiaveEMateriali ?? []).filter((x) => x.tipo === 'chiave' && (!query || `${x.nome} ${x.uso} ${x.dove}`.toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it')))), [oggetti.dati, query]);
  const negozioAttivo = negozio && righe.some((a) => a.negozioChiave === negozio) ? negozio : null;
  let contenuto: ReactNode;
  if (categoria === 'abito') contenuto = <><p>{abiti.length} abiti trovati.</p><ul className="grid list-none gap-2 p-0 md:grid-cols-2">{abiti.map((x) => <li className="card" key={x.nome}><strong>{x.nome}</strong><p className="m-0 text-sm">Per: {x.per}; Dove: {x.dove}</p></li>)}</ul><Link to="/guida/oggetti?scheda=abiti" className="credito">Apri Abiti e lavanderia</Link></>;
  else if (categoria === 'chiave') contenuto = <><p>{chiavi.length} oggetti chiave trovati.</p><ul className="grid list-none gap-2 p-0 md:grid-cols-2">{chiavi.map((x) => <li className="card" key={x.nome}><strong>{x.nome}</strong><p className="m-0 text-sm">{x.uso}</p><span className="text-xs">{x.dove}</span><Link to="/guida/oggetti?scheda=chiave" className="credito block">Catalogo chiavi</Link></li>)}</ul></>;
  else if (categoria === 'carte') contenuto = <section className="card"><p>Il catalogo locale delle carte abilità non è ancora materializzato: nessuna riga di altri inventari viene classificata per sottostringa. Consulta la fonte ufficiale.</p><a href="https://www.allgamestaff.it/persona-5-royal/carte-abilita/" target="_blank" rel="noreferrer" className="credito">Fonte carte abilità</a></section>;
  else contenuto = <><p>{righe.length} articoli trovati.</p><div className="flex flex-wrap gap-1">{[...new Set(righe.map((a) => a.negozioChiave))].map((k) => <button className="chip touch" type="button" key={k} onClick={() => setNegozio((x) => x === k ? null : k)}>Posizione: {righe.find((a) => a.negozioChiave === k)?.negozioNome}</button>)}</div>{negozioAttivo && <DoveSiTrova tipo="negozio" chiave={negozioAttivo} titolo={righe.find((a) => a.negozioChiave === negozioAttivo)?.negozioNome ?? 'Negozio'} altezza={300} />}{articoli.dati && <ArticoliTabella articoli={righe} partitaId={partitaId} mostraNegozio onCambiato={() => void articoli.ricarica()} />}</>;
  return <PageState isLoading={articoli.caricamento || oggetti.caricamento} error={articoli.errore ?? oggetti.errore} onRetry={() => { void articoli.ricarica(); void oggetti.ricarica(); }}><div className="flex flex-col gap-3"><IntestazionePagina titolo="Inventari per categoria" sottotitolo="Cataloghi ufficiali con ricerca, posizione contestuale e collegamento alla guida completa." /><FilaScorrevole role="tablist" aria-label="Categorie inventario">{CATEGORIE.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={categoria === k} className={`chip touch ${categoria === k ? 'chip--attivo' : ''}`} onClick={() => { setQuery(''); setNegozio(null); setParams({ categoria: k }, { replace: true }); }}>{l}</button>)}</FilaScorrevole><CampoRicerca valore={query} onCambia={setQuery} segnaposto={`Cerca in ${titolo.toLocaleLowerCase('it')}…`} /><h2 className="m-0">{titolo}</h2>{contenuto}</div></PageState>;
}
