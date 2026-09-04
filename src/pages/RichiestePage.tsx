// ============================================================
// RichiestePage — Richieste dei Mementos con bersaglio, ricompense, Confidente e stato per partita; Jose (Fase 7.2)
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRichieste, impostaStatoRichiesta } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import type { RichiestaDto, StatoRichiesta } from '../types';

type Filtro = 'tutte' | 'da-fare' | 'accettate' | 'completate';

function Richiesta({ r, partitaId, onCambiata }: { r: RichiestaDto; partitaId: number | null; onCambiata: (r: RichiestaDto) => void }) {
  const [aperta, setAperta] = useState(false);
  const [occupato, setOccupato] = useState(false);
  const cambia = async (stato: StatoRichiesta | null) => {
    if (!partitaId) return;
    setOccupato(true);
    try { onCambiata(await impostaStatoRichiesta(partitaId, r.chiave, stato)); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupato(false); }
  };
  return (
    <li className={`card flex flex-col gap-1 ${r.stato === 'completata' ? 'opacity-70' : ''}`}>
      <button type="button" className="text-left flex flex-wrap items-center gap-2 touch" onClick={() => setAperta((a) => !a)} aria-expanded={aperta}>
        <strong className="text-[15px]">{r.nome}</strong>
        {r.stato && <span className="chip chip--attivo">{r.stato}</span>}
        <span className="text-[12px] text-text-muted">{r.area}{r.piano ? ` · ${r.piano}` : ''}</span>
        {r.confidente && <span className="chip">{r.confidente.nome}{r.confidente.rango ? ` rango ${r.confidente.rango}` : ''}</span>}
      </button>
      <div className="text-[13px] text-text-secondary flex flex-wrap gap-x-3 gap-y-0.5">
        <span><strong className="text-text">Bersaglio:</strong> {r.bersaglio.nome}{r.bersaglio.formaDemoniaca ? ` (${r.bersaglio.formaDemoniaca})` : ''}{r.bersaglio.livello ? ` · livello ${r.bersaglio.livello}` : ''}</span>
        {r.bersaglio.debolezze.length > 0 && <span><strong className="text-text">Debole a:</strong> {r.bersaglio.debolezze.join(', ')}</span>}
        {r.bersaglio.resistenze.length > 0 && <span><strong className="text-text">Resiste a:</strong> {r.bersaglio.resistenze.join(', ')}</span>}
        {r.bersaglio.vulnerabileConfusione && <span className="chip text-[11px]">Confusione utile (yen)</span>}
      </div>
      {aperta && (
        <div className="flex flex-col gap-1 text-[13px]">
          <span><strong>Da:</strong> {r.committente || '—'} · <strong>disponibile dal</strong> {r.disponibileDal || '—'}{r.scadenza ? ` · scadenza ${r.scadenza}` : ''}</span>
          {r.ricompense.length > 0 && <span><strong>Ricompense:</strong> {r.ricompense.join(', ')}</span>}
          {r.note && <span className="text-text-secondary">{r.note}</span>}
          <div className="flex flex-wrap gap-1.5 items-center">
            {r.areaChiave && <Link to={`/guida/dungeon/mementos?area=${r.areaChiave}`} className="btn btn-ghost btn-sm no-underline">Apri il Dedalo</Link>}
            {r.confidente && <Link to={`/confidenti/${r.confidente.chiave}`} className="btn btn-ghost btn-sm no-underline">Scheda Confidente</Link>}
            {r.fonte && <a href={r.fonte} target="_blank" rel="noreferrer" className="credito">fonte</a>}
            {partitaId && r.stato !== 'accettata' && r.stato !== 'completata' && <button type="button" className="btn btn-secondary btn-sm" disabled={occupato} onClick={() => void cambia('accettata')}>Accettata</button>}
            {partitaId && r.stato !== 'completata' && <button type="button" className="btn btn-primary btn-sm" disabled={occupato} onClick={() => void cambia('completata')}>Completata</button>}
            {partitaId && r.stato && <button type="button" className="btn btn-ghost btn-sm" disabled={occupato} onClick={() => void cambia(null)}>Riapri</button>}
          </div>
        </div>
      )}
    </li>
  );
}

export function RichiestePage() {
  useDocumentTitle('Richieste dei Mementos');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getRichieste(partitaId ?? undefined), [partitaId]);
  const [filtro, setFiltro] = useState<Filtro>('tutte');
  const [area, setArea] = useState<string | null>(null);
  const d = dati.dati;
  const aree = useMemo(() => [...new Set((d?.richieste ?? []).map((r) => r.area))], [d]);
  const visibili = useMemo(() => (d?.richieste ?? []).filter((r) => (area === null || r.area === area) && (filtro === 'tutte' || (filtro === 'da-fare' && !r.stato) || (filtro === 'accettate' && r.stato === 'accettata') || (filtro === 'completate' && r.stato === 'completata'))), [d, filtro, area]);
  const aggiorna = (r: RichiestaDto) => { if (d) dati.imposta({ ...d, richieste: d.richieste.map((x) => (x.chiave === r.chiave ? r : x)), completate: d.richieste.filter((x) => (x.chiave === r.chiave ? r.stato : x.stato) === 'completata').length }); };

  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="m-0 text-2xl font-bold">Richieste dei Mementos</h1>
            <p className="m-0 mt-1 text-[13px] text-text-secondary">{d.totale} Richieste dalla guida allgamestaff: committente, date, Dedalo e area, bersaglio con debolezze, ricompense e Confidente collegato.{partitaId ? ` Nella partita «${attiva?.nome}»: ${d.completate} completate.` : ' Attiva una partita per segnare accettate e completate.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {([['tutte', 'Tutte'], ['da-fare', 'Da fare'], ['accettate', 'Accettate'], ['completate', 'Completate']] as Array<[Filtro, string]>).map(([k, l]) => (
              <button key={k} type="button" className={`chip touch ${filtro === k ? 'chip--attivo' : ''}`} onClick={() => setFiltro(k)} aria-pressed={filtro === k}>{l}</button>
            ))}
            <select className="form-input w-auto ml-auto" value={area ?? ''} onChange={(e) => setArea(e.target.value || null)} aria-label="Dedalo">
              <option value="">Tutti i Dedali</option>
              {aree.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Richieste">
            {visibili.length === 0 && <li className="text-[13px] text-text-muted">Nessuna Richiesta con questi filtri.</li>}
            {visibili.map((r) => <Richiesta key={r.chiave} r={r} partitaId={partitaId} onCambiata={aggiorna} />)}
          </ul>
          {d.jose && (
            <section className="card flex flex-col gap-2 text-[13px]">
              <h2 className="m-0 text-[15px] font-semibold">Jose: fiori, timbri e scambi</h2>
              <p className="m-0 text-text-secondary">{d.jose.introduzione}</p>
              {d.jose.fiori && <p className="m-0"><strong>Fiori:</strong> {typeof d.jose.fiori === 'string' ? d.jose.fiori : d.jose.fiori.descrizione}</p>}
              {d.jose.timbri && <p className="m-0"><strong>Timbri:</strong> {typeof d.jose.timbri === 'string' ? d.jose.timbri : d.jose.timbri.descrizione}</p>}
              {d.jose.bossSegreto && <p className="m-0"><strong>Boss segreto:</strong> {d.jose.bossSegreto.nome} — {d.jose.bossSegreto.condizione}</p>}
              {d.jose.scambi.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="tabella tabella--adattiva text-[12px]">
                    <thead><tr><th>Oggetto</th><th>Fiori</th><th>Effetto</th><th>Requisito</th></tr></thead>
                    <tbody>{d.jose.scambi.map((s, i) => <tr key={i}><td data-etichetta="Oggetto"><strong>{s.nome}</strong></td><td data-etichetta="Fiori" className="tabular-nums">{s.costo}</td><td data-etichetta="Effetto">{s.effetto}</td><td data-etichetta="Requisito">{s.requisito}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </PageState>
  );
}
