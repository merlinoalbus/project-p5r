import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CATEGORIA_OGGETTO } from '../../shared/catalogo';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { eliminaOggettoCatalogo, getOggettoCatalogo, ripristinaOggettoCatalogo } from '../services/api/catalogoOggetti';
import { usePartitaStore } from '../stores/partitaStore';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { PageState } from '../components/shared/PageState';
import { LetturaDellOggetto } from '../components/catalogo/LetturaDellOggetto';
import { OfferteDellOggetto } from '../components/catalogo/OfferteDellOggetto';
import { NoteStoricheOfferta } from '../components/catalogo/NoteStoricheOfferta';
import { CostoDellOggetto } from '../components/catalogo/CostoDellOggetto';
import { ModuloOggetto } from '../components/catalogo/ModuloOggetto';
import { Modal } from '../components/shared/Modal';
import { notifica } from '../stores/notificationStore';
import { impostaRegaloOggettoFatto } from '../services/api/partite';
import { TrasformazioniDiJose } from '../components/catalogo/TrasformazioniDiJose';
import { PosizioniDellaLettura } from '../components/catalogo/PosizioniDellaLettura';

const STATO_FORZIERE = { preso: 'Preso', 'non-piu-ottenibile': 'Non più ottenibile', 'da-prendere': 'Da prendere', 'da-jose': 'Da Jose', 'da-verificare': 'Raccolta da verificare: pin forziere non collegato' } as const;

/** Una sola casa dell'oggetto; prezzi, stati dei forzieri e disponibilità arrivano dai rispettivi servizi. */
export function OggettoPage() {
  const { categoria = '', slug = '' } = useParams();
  const chiave = `${categoria}/${slug}`;
  const partitaId = usePartitaStore((s) => s.attiva?.id ?? null);
  return <SchedaOggetto key={`${chiave}:${partitaId}`} chiave={chiave} partitaId={partitaId} />;
}

/** Oggetto e partita delimitano anche moduli e richieste in volo, non solo il caricamento. */
function SchedaOggetto({ chiave, partitaId }: { chiave: string; partitaId: number | null }) {
  const dati = useCarica(() => getOggettoCatalogo(chiave, partitaId ?? undefined), [chiave, partitaId]);
  const o = dati.dati;
  const naviga = useNavigate();
  const [azione, setAzione] = useState<'modifica' | 'elimina' | 'ripristina' | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [regaloInCorso, setRegaloInCorso] = useState(false);
  const regala = async (confidente: string, fatto: boolean) => {
    if (!o || partitaId === null || regaloInCorso || occupato) return;
    setRegaloInCorso(true);
    try {
      await impostaRegaloOggettoFatto(partitaId, confidente, o.chiave, fatto);
      dati.imposta((corrente) => {
        const regalo = corrente.regalo.map((r) => r.confidente === confidente ? { ...r, regalato: fatto } : r);
        return { ...corrente, regalo, partita: corrente.partita ? { ...corrente.partita, regalato: regalo.some((r) => r.regalato) } : null };
      });
      notifica('info', fatto ? 'Regalo segnato come consegnato. I punti non cambiano.' : 'Consegna del regalo rimossa. I punti non cambiano.');
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Consegna non aggiornata.');
    } finally { setRegaloInCorso(false); }
  };
  const conferma = async () => {
    if (!o || occupato || regaloInCorso || (azione !== 'elimina' && azione !== 'ripristina')) return;
    setOccupato(true);
    try {
      if (azione === 'elimina') {
        await eliminaOggettoCatalogo(o.chiave);
        notifica('success', 'Oggetto nel cestino. Puoi rimetterlo da Impostazioni › Cestino.');
        naviga('/guida/oggetti');
      } else { await ripristinaOggettoCatalogo(o.chiave); await dati.ricarica(); }
      setAzione(null);
    } catch (e) { notifica('error', e instanceof Error ? e.message : 'Operazione non eseguita.'); }
    finally { setOccupato(false); }
  };
  useDocumentTitle(o?.nome ?? 'Oggetto');
  return <PageState isLoading={dati.caricamento && !o} error={dati.errore} onRetry={() => void dati.ricarica()}>
    {o && <div className="flex min-w-0 flex-col gap-3">
      <IntestazionePagina compatta className="[&_.tassello]:max-w-full [&_.tassello]:whitespace-normal [&_.tassello]:break-words" titolo={o.nome} indietro={{ etichetta: 'Catalogo', to: '/guida/oggetti' }}>
        <span className="chip self-start">{CATEGORIA_OGGETTO[o.categoria].nome}</span>
      </IntestazionePagina>
      <div className="flex flex-wrap gap-2" aria-label="Gestione oggetto">
        <button type="button" className="btn btn-secondary touch" disabled={occupato || regaloInCorso || dati.caricamento} onClick={() => setAzione('modifica')}>Modifica</button>
        {o.modificato && <button type="button" className="btn btn-ghost touch" disabled={occupato || regaloInCorso || dati.caricamento} onClick={() => setAzione('ripristina')}>Ripristina</button>}
        <button type="button" className="btn btn-ghost touch" disabled={occupato || regaloInCorso || dati.caricamento} onClick={() => setAzione('elimina')}>Elimina</button>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-3">
          <section className="card order-1 flex min-w-0 flex-col gap-2 xl:order-none" aria-labelledby="dove-si-compra">
            <h2 id="dove-si-compra" className="m-0 text-lg">Dove si compra</h2>
            <OfferteDellOggetto offerte={o.inVendita} nome={o.nome} partitaId={partitaId} onCambiata={() => dati.ricarica()} />
          </section>
          <section className="card order-3 flex min-w-0 flex-col gap-2 xl:order-none" aria-labelledby="descrizione-oggetto">
            <h2 id="descrizione-oggetto" className="m-0 text-lg">Che cosa fa</h2>
            {o.nomeOriginale && <p className="m-0 text-[13px] text-text-secondary">Nome originale: {o.nomeOriginale}</p>}
            {o.effetto && <p className="m-0 whitespace-pre-line text-[13px]">{o.effetto}</p>}
            {o.descrizione && <p className="m-0 whitespace-pre-line text-[13px] text-text-secondary">{o.descrizione}</p>}
            <NoteStoricheOfferta note={o.noteStoriche} />
            {!o.effetto && !o.descrizione && <p className="m-0 text-[13px] text-text-muted">Nessun effetto o descrizione dichiarato.</p>}
            {o.statistiche && <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">{Object.entries(o.statistiche).filter(([k, v]) => k !== 'effetti' && v !== null && (typeof v === 'number' || typeof v === 'string')).map(([k, v]) =>
              <div key={k} className="contents"><dt className="text-text-muted">{k === 'per' ? 'Per chi' : k === 'testo' ? 'Statistiche' : k === 'sessioni' ? 'Sessioni' : k}</dt><dd className="m-0 break-words">{String(v)}</dd></div>)}</dl>}
            {!!o.nomiAltri.length && <details><summary className="touch text-[13px]">Altri nomi</summary><ul className="m-0 pl-5 text-[13px]">{o.nomiAltri.map((n) => <li key={n}>{n}</li>)}</ul></details>}
          </section>
          {o.lettura && <section className="card order-4 flex min-w-0 flex-col gap-3 xl:order-none" aria-labelledby="lettura-oggetto">
            <h2 id="lettura-oggetto" className="m-0 text-lg">{o.lettura.tipo === 'libro' ? 'Lettura' : o.lettura.tipo === 'film' ? 'Visione' : 'Round giocati'}</h2>
            <LetturaDellOggetto key={`${o.chiave}:${partitaId}`} lettura={o.lettura} partitaId={partitaId} onSalvata={(lettura) => dati.imposta((corrente) => corrente.chiave !== chiave ? corrente : {
              ...corrente, lettura, partita: corrente.partita ? { ...corrente.partita, letto: lettura.voce.fatto } : null,
            })} />
          </section>}
          {!o.lettura && ['libro', 'film', 'videogioco'].includes(o.fonte.tipo) && <p className="card order-4 m-0 text-[13px] text-text-secondary xl:order-none">La voce di avanzamento non è disponibile: può essere nascosta o eliminata. I progressi già registrati non vengono ricreati.</p>}
        </div>
        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-3">
          <section className="card order-2 flex min-w-0 flex-col gap-2 xl:order-none" aria-labelledby="a-chi-piace">
            <h2 id="a-chi-piace" className="m-0 text-lg">A chi piace</h2>
            {o.regalo.length ? <ul className="m-0 list-none divide-y divide-border p-0">{o.regalo.map((r) => <li key={`${r.confidente}:${r.sconsigliato}`} className="flex flex-wrap items-center gap-2 py-1">
              <Link to={r.casa} className="touch inline-flex items-center">{r.nome}</Link>
              {r.gradimento && <span className="text-[13px] text-text-secondary">{r.gradimento}</span>}
              {r.sconsigliato && <span className="chip">Sconsigliato</span>}
              {r.regalato && <span className="chip chip--attivo">Regalato</span>}
              {partitaId !== null && (!r.sconsigliato || r.regalato) && <button type="button" className="btn btn-secondary touch" disabled={regaloInCorso || occupato || dati.caricamento} onClick={() => void regala(r.confidente, !r.regalato)}>{r.regalato ? 'Togli consegna' : 'Regala'}</button>}
            </li>)}</ul> : <p className="m-0 text-[13px] text-text-secondary">Nessun regalo gradito collegato.</p>}
          </section>
          <section className="card order-5 flex min-w-0 flex-col gap-3 xl:order-none" aria-labelledby="dove-si-trova">
            <h2 id="dove-si-trova" className="m-0 text-lg">Dove si trova</h2>
            <TrasformazioniDiJose trasformazioni={o.trasformazioni} />
            <PosizioniDellaLettura oggetto={o} />
            {o.forzieri.length > 0 && <div><h3 className="m-0 text-base">Forzieri e contenuti della guida</h3><ul className="m-0 list-none divide-y divide-border p-0">{o.forzieri.map((f) => <li key={f.voce} className="flex flex-col gap-1 py-2 text-[13px]">
              <Link to={f.casa} className="touch inline-flex items-center">{f.palazzoNome} › {f.infiltrazioneNome}{f.areaNome ? ` › ${f.areaNome}` : ''}</Link>
              <span>{f.voceNome} · {f.quantita} × {o.nome}</span>
              {f.stato && <span className={`chip self-start${f.stato === 'preso' ? ' chip--attivo' : ''}`}>{STATO_FORZIERE[f.stato]}</span>}
              {f.jose && <><Link to={f.jose.casa} className="touch inline-flex items-center self-start">Si compra da Jose</Link><span className="text-text-muted">{f.jose.nota}</span></>}
            </li>)}</ul></div>}
            {o.ricompense.length > 0 && <div><h3 className="m-0 text-base">Ricompense</h3><ul className="m-0 list-none p-0">{o.ricompense.map((r) => <li key={`${r.fonteTipo}:${r.fonteChiave}`} className="flex flex-col gap-1 py-1 text-[13px]">
              {r.fonteCasa ? <Link to={r.fonteCasa} className="touch inline-flex items-center">Ricompensa di {r.fonteNome}{r.quantita === null ? ' · quantità non indicata' : ` · ${r.quantita} ×`}</Link> : <span>Ricompensa di {r.fonteNome}{r.quantita === null ? ' · quantità non indicata' : ` · ${r.quantita} ×`}</span>}
              {r.nota && <span className="text-text-secondary">{r.nota}</span>}
              {(r.costo !== undefined || r.costoDaVerificare) && <CostoDellOggetto costo={r.costo ?? null} prezzo={r.prezzo ?? null} daVerificare={r.costoDaVerificare} />}
            </li>)}</ul></div>}
            {o.ricette.length > 0 && <div><h3 className="m-0 text-base">Serve per fabbricare</h3><ul className="m-0 list-none p-0">{o.ricette.map((r) => <li key={r.chiave} className="flex flex-col gap-1 text-[13px]"><Link to={r.casa} className="touch inline-flex items-center">{r.nome} · {r.quantita} × questo materiale</Link>{r.prodotti.map((p) => <Link key={p.chiave} to={p.casa} className="touch inline-flex items-center">{p.nome}{p.quantita === null ? ' · resa non indicata' : ` · ${p.quantita} ×`}</Link>)}{!r.prodotti.length && <span className="text-text-secondary">Nome nella fonte: {r.nomeStorico}</span>}</li>)}</ul></div>}
            {o.scambi.length > 0 && <p className="m-0 text-[13px]">Gli scambi sono elencati in <a href="#dove-si-compra" className="touch inline-flex items-center">Dove si compra</a>, con il costo richiesto.</p>}
            {!o.forzieri.length && !o.ricompense.length && !o.ricette.length && !o.scambi.length && !o.trasformazioni.length && !(o.lettura && o.lettura.tipo !== 'videogioco' && o.lettura.voce.posizioni.length) && <p className="m-0 text-[13px] text-text-secondary">Nessun altro ritrovamento o ricompensa collegato.</p>}
          </section>
        </div>
      </div>
      {azione === 'modifica' && <ModuloOggetto key={o.chiave} oggetto={o} onChiudi={() => setAzione(null)} onSalvato={() => { setAzione(null); void dati.ricarica(); }} />}
      {(azione === 'elimina' || azione === 'ripristina') && <Modal aperta titolo={azione === 'elimina' ? `Elimina «${o.nome}»` : `Ripristina «${o.nome}»`} onChiudi={() => { if (!occupato) setAzione(null); }}
        azioni={<><button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={() => setAzione(null)}>Annulla</button><button type="button" className="btn btn-primary touch" disabled={occupato} onClick={() => void conferma()}>{occupato ? 'Attendi…' : 'Conferma'}</button></>}>
        <p className="m-0">{azione === 'elimina' ? 'L’oggetto e i suoi collegamenti rimossi saranno recuperabili dal cestino. Gli acquisti e i progressi delle letture non vengono cancellati.' : 'Rimetti nome, descrizione e attributi conservati prima della correzione. I progressi della partita non cambiano.'}</p>
      </Modal>}
    </div>}
  </PageState>;
}
