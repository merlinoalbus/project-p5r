import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CATEGORIA_OGGETTO, GRUPPI_OGGETTO, normalizzaNomeOggetto, type GruppoOggetto } from '../../../shared/catalogo';
import { getCatalogoOggetti } from '../../services/api/catalogoOggetti';
import { useCarica } from '../../hooks/useCarica';
import { formattaYen } from '../../utils/letture';
import { PageState } from '../shared/PageState';
import { CampoRicerca } from '../shared/CampoRicerca';
import { Selettore } from '../shared/Selettore';
import { ModuloOggetto } from './ModuloOggetto';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

const GRUPPI = Object.entries(GRUPPI_OGGETTO) as Array<[GruppoOggetto, string]>;
const ORDINI = [{ chiave: 'nome', nome: 'Nome' }, { chiave: 'prezzo', nome: 'Prezzo minimo' }];

/** Un elenco per tutte le identità; i gruppi sono filtri, non cataloghi separati. */
export function CatalogoOggetti({ gruppoIniziale = '' }: { gruppoIniziale?: GruppoOggetto | '' }) {
  const dati = useCarica(() => getCatalogoOggetti(), []);
  const [params, setParams] = useSearchParams();
  const naviga = useNavigate();
  const [nuovo, setNuovo] = useState(false);
  const q = params.get('q') ?? '';
  const gruppo = GRUPPI.some(([k]) => k === params.get('gruppo')) ? params.get('gruppo')! : gruppoIniziale;
  const ordine = params.get('ordine') === 'prezzo' ? 'prezzo' : 'nome';
  const categoria = params.get('categoria') ?? '';
  const per = params.get('per') ?? '';
  const cambia = (campo: string, valore: string) => setParams((prima) => {
    const dopo = new URLSearchParams(prima);
    // I segnalibri delle vecchie schede restano validi; al primo filtro si usa l'URL del catalogo.
    dopo.delete('scheda');
    if (gruppo && campo !== 'gruppo' && !dopo.has('gruppo')) dopo.set('gruppo', gruppo);
    if (campo === 'gruppo') { dopo.delete('categoria'); if (valore !== 'equipaggiamento') dopo.delete('per'); }
    if (valore) dopo.set(campo, valore); else dopo.delete(campo);
    return dopo;
  }, { replace: true });
  const destinatari = useMemo(() => [...new Set((dati.dati ?? []).flatMap((o) => typeof o.statistiche?.per === 'string' && o.statistiche.per ? [o.statistiche.per] : []))]
    .sort((a, b) => a.localeCompare(b, 'it')), [dati.dati]);
  const categorie = useMemo(() => [...new Set((dati.dati ?? []).filter((o) => !gruppo || CATEGORIA_OGGETTO[o.categoria].gruppo === gruppo).map((o) => o.categoria))]
    .map((k) => ({ chiave: k, nome: CATEGORIA_OGGETTO[k].nome })), [dati.dati, gruppo]);
  const visibili = useMemo(() => {
    const ricerca = normalizzaNomeOggetto(q);
    return (dati.dati ?? []).filter((o) => (!gruppo || CATEGORIA_OGGETTO[o.categoria].gruppo === gruppo)
      && (!categoria || o.categoria === categoria)
      && (!per || (per === 'nessuno' ? !o.statistiche?.per : o.statistiche?.per === per))
      && (!ricerca || [o.nome, o.nomeOriginale ?? '', ...o.nomiAltri, o.effetto].some((n) => normalizzaNomeOggetto(n).includes(ricerca))))
      .sort((a, b) => {
        if (ordine === 'prezzo') {
          if (a.prezzoMinimo === null && b.prezzoMinimo !== null) return 1;
          if (b.prezzoMinimo === null && a.prezzoMinimo !== null) return -1;
          if (a.prezzoMinimo !== null && b.prezzoMinimo !== null && a.prezzoMinimo !== b.prezzoMinimo) return a.prezzoMinimo - b.prezzoMinimo;
        }
        return a.nome.localeCompare(b.nome, 'it') || a.chiave.localeCompare(b.chiave);
      });
  }, [dati.dati, q, gruppo, categoria, per, ordine]);
  return <PageState isLoading={dati.caricamento && !dati.dati} error={dati.errore} onRetry={() => void dati.ricarica()}>
    <section className="flex min-w-0 flex-col gap-3" aria-label="Catalogo degli oggetti">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 basis-64"><CampoRicerca valore={q} onCambia={(v) => cambia('q', v)} segnaposto="Cerca un nome, un altro nome o un effetto…" /></div>
        <Selettore etichetta="Ordina per" valore={ordine} opzioni={ORDINI} ricerca="mai" onCambia={(v) => cambia('ordine', v === 'nome' ? '' : v)} />
        <Selettore etichetta="Categoria" valore={categoria} vuoto="Tutte" opzioni={categorie} onCambia={(v) => cambia('categoria', v)} />
        <PulsanteVisivo icona={<IconaAzione chiave="piu" dimensione={22} />} titolo="Nuovo oggetto" onClick={() => setNuovo(true)} />
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Gruppi di oggetti">
        <button type="button" className={`chip touch${!gruppo ? ' chip--attivo' : ''}`} aria-pressed={!gruppo} onClick={() => cambia('gruppo', '')}>Tutti</button>
        {GRUPPI.map(([k, nome]) => <button key={k} type="button" className={`chip touch${gruppo === k ? ' chip--attivo' : ''}`} aria-pressed={gruppo === k} onClick={() => cambia('gruppo', k)}>{nome}</button>)}
      </div>
      {(gruppo === 'equipaggiamento' || per) && <Selettore etichetta="Per chi" valore={per} vuoto="Tutti" ricerca="auto"
        opzioni={[{ chiave: 'nessuno', nome: 'Senza vincolo' }, ...destinatari.map((n) => ({ chiave: n, nome: n }))]} onCambia={(v) => cambia('per', v)} />}
      <p role="status" className="m-0 testo-12 text-text-muted">{visibili.length} oggetti su {dati.dati?.length ?? 0}. Il prezzo minimo è quello delle offerte in yen; apri l’oggetto per i negozi e gli scambi.</p>
      <div className="min-w-0"><table className="tabella tabella--adattiva w-full testo-13">
        <thead><tr><th>Oggetto</th><th>Categoria</th><th>Che cosa fa</th><th>Prezzo minimo</th></tr></thead>
        <tbody>{visibili.map((o) => <tr key={o.chiave}>
          <td data-etichetta="Oggetto"><Link to={o.casa} className="touch inline-flex items-center font-semibold">{o.nome}</Link>
            {o.nomeOriginale && o.nomeOriginale !== o.nome && <span className="block break-words testo-12 text-text-muted">{o.nomeOriginale}</span>}
            {typeof o.statistiche?.per === 'string' && o.statistiche.per && <span className="block testo-12 text-text-secondary">{o.statistiche.per}</span>}
          </td>
          <td data-etichetta="Categoria">{CATEGORIA_OGGETTO[o.categoria].nome}</td>
          <td data-etichetta="Che cosa fa" className="break-words">{o.effetto || 'Non dichiarato'}</td>
          <td data-etichetta="Prezzo minimo">{o.prezzoMinimo === null ? 'Nessuna offerta in yen' : o.prezzoMinimo === 0 ? 'Gratis' : formattaYen(o.prezzoMinimo)}</td>
        </tr>)}</tbody>
      </table></div>
      {!visibili.length && <p className="m-0 testo-13 text-text-secondary">Nessun oggetto con questi filtri.</p>}
    </section>
    {nuovo && <ModuloOggetto onChiudi={() => setNuovo(false)} onSalvato={(o) => { setNuovo(false); naviga(o.casa); }} />}
  </PageState>;
}
