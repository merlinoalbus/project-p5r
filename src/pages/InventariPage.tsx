import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ricercaArticoli } from '../services/api/compendio';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { ArticoliTabella } from '../components/guida/ArticoliTabella';
import { NOME_CATEGORIA_ARTICOLO } from '../utils/negozi';

const CATEGORIE = [['arma', 'Armi da mischia e a distanza'], ['protezione', 'Protezioni'], ['accessorio', 'Accessori'], ['abito', 'Abiti'], ['regalo', 'Regali'], ['consumabile', 'Consumabili e cibo'], ['materiale', 'Materiali']] as const;

export function InventariPage() {
  useDocumentTitle('Inventari per categoria');
  const partitaId = usePartitaStore((s) => s.attiva?.id ?? null);
  const [params, setParams] = useSearchParams();
  const categoria = CATEGORIE.some(([k]) => k === params.get('categoria')) ? params.get('categoria')! : 'arma';
  const dati = useCarica(() => ricercaArticoli({ categoria }, partitaId ?? undefined), [categoria, partitaId]);
  const titolo = useMemo(() => CATEGORIE.find(([k]) => k === categoria)?.[1] ?? NOME_CATEGORIA_ARTICOLO[categoria] ?? categoria, [categoria]);
  return <PageState isLoading={dati.caricamento && !dati.dati} error={dati.errore} onRetry={() => void dati.ricarica()}>
    {dati.dati && <div className="flex flex-col gap-3"><IntestazionePagina titolo="Inventari per categoria" sottotitolo="Armi, protezioni, accessori, abiti, regali, consumabili e materiali raccolti dalle guide ufficiali. Prezzi e disponibilità restano collegati ai negozi." /><FilaScorrevole role="tablist" aria-label="Categorie inventario">{CATEGORIE.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={categoria === k} className={`chip touch ${categoria === k ? 'chip--attivo' : ''}`} onClick={() => setParams({ categoria: k }, { replace: true })}>{l}</button>)}</FilaScorrevole><h2 className="m-0 text-lg">{titolo}</h2><p className="m-0 text-sm text-text-secondary">{dati.dati.totale} articoli trovati; mostrati i dati disponibili per partita.</p><ArticoliTabella articoli={dati.dati.articoli} partitaId={partitaId} mostraNegozio onCambiato={() => void dati.ricarica()} /></div>}
  </PageState>;
}
