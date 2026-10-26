import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CATEGORIA_OGGETTO, GRUPPI_OGGETTO, normalizzaNomeOggetto, type GruppoOggetto } from '../../../shared/catalogo';
import { descriviVoceEffetto, leggiVociEffetto } from '../../../shared/effettiCatalogo';
import type { CatalogoOggettoDto } from '../../types';
import { getCatalogoOggetti } from '../../services/api/catalogoOggetti';
import { useCarica } from '../../hooks/useCarica';
import { formattaYen } from '../../utils/letture';
import { PageState } from '../shared/PageState';
import { CampoRicerca } from '../shared/CampoRicerca';
import { Selettore } from '../shared/Selettore';
import { ModuloOggetto } from './ModuloOggetto';

/** Nel rilascio il catalogo si consulta soltanto: niente creazione di oggetti (costante di build, come negli altri moduli). */
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { TestoNote } from '../shared/TestoNote';
// il `title` è la descrizione accessibile della cella: le note vi stanno a parole («1 nota»), la cella le mostra come ♪
import { noteInSimboli, testoNoteAParole } from '../../../shared/note';

const GRUPPI = Object.entries(GRUPPI_OGGETTO) as Array<[GruppoOggetto, string]>;

/** Ondata 5, lotto F: un libro, un film o un videogioco dice che cosa dà con le voci della sua lettura (`statistiche.effetti`, lette dalla
 *  scheda della lettura), non con un testo dell'effetto: la cella le mostra invece di «Non dichiarato». */
function effettiDellaLettura(o: CatalogoOggettoDto): string {
  const effetti = o.statistiche?.effetti;
  return Array.isArray(effetti) ? leggiVociEffetto(JSON.stringify(effetti)).map((v) => descriviVoceEffetto(v)).join(' · ') : '';
}

/** La cella «Effetto»: il testo dell'effetto, le statistiche di armi e protezioni (`statistiche.testo`, migrazione 275) o le voci della
 *  lettura; «Non dichiarato» solo se non c'è nessuno dei tre. Il `title` dice le note a parole («1 nota»), la cella le mostra come ♪. */
function CellaEffetto({ o }: { o: CatalogoOggettoDto }) {
  const lettura = o.effetto ? '' : effettiDellaLettura(o);
  const statistiche = typeof o.statistiche?.testo === 'string' ? o.statistiche.testo : '';
  return (
    <td className="tabella-oggetti__effetto break-words" title={o.effetto ? testoNoteAParole(noteInSimboli(o.effetto)) : lettura ? testoNoteAParole(lettura) : undefined}>
      {o.effetto && <TestoNote testo={o.effetto} daParole="conteggi" />}
      {statistiche && <span className="block testo-12 text-text-secondary">{statistiche}</span>}
      {lettura && <span className="block">{lettura}</span>}
      {!o.effetto && !statistiche && !lettura && 'Non dichiarato'}
    </td>
  );
}

const ORDINI =[{ chiave: 'nome', nome: 'Nome' }, { chiave: 'prezzo', nome: 'Prezzo minimo' }];

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
  // Lotto C: sul telefono il primo oggetto stava a y ≈ 640, dopo quattro file di filtri. Ricerca e «Filtri» restano in vista,
  // ordinamento, categoria, gruppo e destinatario stanno nel pannello (come nel Compendio), riassunti da chip rimovibili.
  const filtriAttivi: Array<{ chiave: string; testo: string; togli: () => void }> = [];
  if (gruppo) filtriAttivi.push({ chiave: 'gruppo', testo: GRUPPI.find(([k]) => k === gruppo)?.[1] ?? gruppo, togli: () => cambia('gruppo', '') });
  if (categoria) filtriAttivi.push({ chiave: 'categoria', testo: CATEGORIA_OGGETTO[categoria as keyof typeof CATEGORIA_OGGETTO]?.nome ?? categoria, togli: () => cambia('categoria', '') });
  if (per) filtriAttivi.push({ chiave: 'per', testo: per === 'nessuno' ? 'Senza vincolo' : `Per ${per}`, togli: () => cambia('per', '') });
  if (ordine === 'prezzo') filtriAttivi.push({ chiave: 'ordine', testo: 'Per prezzo minimo', togli: () => cambia('ordine', '') });
  const [pannelloAperto, setPannelloAperto] = useState(() => ['gruppo', 'categoria', 'per', 'ordine'].some((k) => params.has(k)));
  /** Toglie in un colpo gruppo, categoria, destinatario e ordinamento, lasciando la ricerca. */
  const azzera = () => setParams((prima) => {
    const dopo = new URLSearchParams(prima);
    for (const k of ['scheda', 'gruppo', 'categoria', 'per', 'ordine']) dopo.delete(k);
    return dopo;
  }, { replace: true });
  return <PageState isLoading={dati.caricamento && !dati.dati} error={dati.errore} onRetry={() => void dati.ricarica()}>
    <section className="flex min-w-0 flex-col gap-2" aria-label="Catalogo degli oggetti">
      <div className="flex flex-wrap items-center gap-2">
        <CampoRicerca className="max-sm:basis-full" valore={q} onCambia={(v) => cambia('q', v)} segnaposto="Cerca per nome o effetto…" />
        <PulsanteVisivo attivo={pannelloAperto} compatto icona={<IconaAzione chiave="filtri" dimensione={20} />} titolo="Filtri" dettaglio={filtriAttivi.length > 0 ? `(${filtriAttivi.length})` : undefined}
          onClick={() => setPannelloAperto((v) => !v)} aria-expanded={pannelloAperto} aria-controls="pannello-filtri-oggetti" />
        {filtriAttivi.length > 0 && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="deseleziona" dimensione={20} />} titolo="Azzera" onClick={azzera} />}
        {!IN_RILASCIO && <PulsanteVisivo compatto className="ml-auto" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Nuovo oggetto" onClick={() => setNuovo(true)} />}
      </div>
      {filtriAttivi.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Filtri attivi">
          {filtriAttivi.map((f) => <li key={f.chiave}><button type="button" className="chip chip--attivo touch" onClick={f.togli} aria-label={`Togli il filtro ${f.testo}`}>{f.testo} ×</button></li>)}
        </ul>
      )}
      {pannelloAperto && (
        <div id="pannello-filtri-oggetti" className="card pannello-filtri" role="group" aria-label="Filtri del catalogo">
          <div className="pannello-filtri__gruppo">
            <span className="pannello-filtri__etichetta">Ordina per</span>
            <Selettore compatto etichetta="Ordina per" valore={ordine} opzioni={ORDINI} ricerca="mai" onCambia={(v) => cambia('ordine', v === 'nome' ? '' : v)} />
          </div>
          <div className="pannello-filtri__gruppo">
            <span className="pannello-filtri__etichetta">Categoria</span>
            <Selettore compatto etichetta="Categoria" valore={categoria} vuoto="Tutte" opzioni={categorie} onCambia={(v) => cambia('categoria', v)} />
          </div>
          {(gruppo === 'equipaggiamento' || per) && <div className="pannello-filtri__gruppo">
            <span className="pannello-filtri__etichetta">Per chi</span>
            <Selettore compatto etichetta="Per chi" valore={per} vuoto="Tutti" ricerca="auto"
              opzioni={[{ chiave: 'nessuno', nome: 'Senza vincolo' }, ...destinatari.map((n) => ({ chiave: n, nome: n }))]} onCambia={(v) => cambia('per', v)} />
          </div>}
          <div className="pannello-filtri__gruppo col-span-full">
            <span className="pannello-filtri__etichetta" id="gruppi-oggetti">Gruppo</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="gruppi-oggetti">
              <button type="button" className={`chip touch${!gruppo ? ' chip--attivo' : ''}`} aria-pressed={!gruppo} onClick={() => cambia('gruppo', '')}>Tutti</button>
              {GRUPPI.map(([k, nome]) => <button key={k} type="button" className={`chip touch${gruppo === k ? ' chip--attivo' : ''}`} aria-pressed={gruppo === k} onClick={() => cambia('gruppo', k)}>{nome}</button>)}
            </div>
          </div>
        </div>
      )}
      <p role="status" className="m-0 testo-12 text-text-muted">{visibili.length} oggetti su {dati.dati?.length ?? 0}.</p>
      {/* Sul telefono ogni oggetto è una riga compatta (nome e prezzo, poi categoria ed effetto): `.tabella-oggetti` in src/tailwind.css. */}
      <div className="min-w-0"><table className="tabella tabella-oggetti w-full testo-13">
        <thead><tr><th>Oggetto</th><th>Categoria</th><th>Che cosa fa</th><th>Prezzo minimo</th></tr></thead>
        <tbody>{visibili.map((o) => <tr key={o.chiave}>
          <td className="tabella-oggetti__nome"><Link to={o.casa} className="touch inline-flex items-center font-semibold">{o.nome}</Link>
            {o.nomeOriginale && o.nomeOriginale !== o.nome && <span className="tabella-oggetti__altro block break-words testo-12 text-text-muted">{o.nomeOriginale}</span>}
            {typeof o.statistiche?.per === 'string' && o.statistiche.per && <span className="tabella-oggetti__altro block testo-12 text-text-secondary">{o.statistiche.per}</span>}
          </td>
          <td className="tabella-oggetti__categoria">{CATEGORIA_OGGETTO[o.categoria].nome}</td>
          <CellaEffetto o={o} />
          <td className="tabella-oggetti__prezzo">{o.prezzoMinimo === null ? <><span className="tabella-oggetti__lungo">Nessuna offerta in yen</span><span className="tabella-oggetti__breve" role="img" aria-label="Nessuna offerta in yen">—</span></> : o.prezzoMinimo === 0 ? 'Gratis' : formattaYen(o.prezzoMinimo)}</td>
        </tr>)}</tbody>
      </table></div>
      {!visibili.length && <p className="m-0 testo-13 text-text-secondary">Nessun oggetto con questi filtri.</p>}
      {visibili.length > 0 && <p className="m-0 testo-12 text-text-muted">Il prezzo minimo è quello delle offerte in yen; apri l’oggetto per i negozi e gli scambi.</p>}
    </section>
    {nuovo && <ModuloOggetto onChiudi={() => setNuovo(false)} onSalvato={(o) => { setNuovo(false); naviga(o.casa); }} />}
  </PageState>;
}
