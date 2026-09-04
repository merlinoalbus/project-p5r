// ============================================================
// CompletamentoPage — trofei con spunta per partita, finali con condizioni, Covo dei Ladri, DLC, meteo, Nuova Partita+, gestione del tempo (Fase 9.1)
// ============================================================

import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCompletamento, impostaTrofeo } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import type { CompletamentoDto, TrofeoDto } from '../types';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';

const SCHEDE = [['trofei', 'Trofei'], ['finali', 'Finali'], ['covo', 'Covo dei Ladri'], ['dlc', 'DLC'], ['meteo', 'Meteo'], ['ng', 'Nuova Partita+'], ['tempo', 'Tempo e fasce']] as const;
type Scheda = (typeof SCHEDE)[number][0];
const NOME_TIPO_TROFEO: Record<TrofeoDto['tipo'], string> = { bronzo: 'Bronzo', argento: 'Argento', oro: 'Oro', platino: 'Platino' };

function Fonte({ url }: { url: string }) {
  return url ? <a href={url} target="_blank" rel="noreferrer" className="credito self-start">fonte</a> : null;
}
function Voce({ titolo, children }: { titolo: string; children: ReactNode }) {
  return <p className="m-0"><strong>{titolo}:</strong> {children}</p>;
}

function Trofeo({ t, partitaId, onCambiato }: { t: TrofeoDto; partitaId: number | null; onCambiato: (t: TrofeoDto) => void }) {
  const [occupato, setOccupato] = useState(false);
  const cambia = async (ottenuto: boolean) => {
    if (!partitaId) return;
    setOccupato(true);
    try { onCambiato(await impostaTrofeo(partitaId, t.chiave, ottenuto)); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupato(false); }
  };
  return (
    <li className={`card flex flex-col gap-1 text-[13px] ${t.ottenuto ? 'opacity-70' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        {partitaId && <input type="checkbox" className="w-5 h-5" checked={t.ottenuto} disabled={occupato} onChange={(e) => void cambia(e.target.checked)} aria-label={`Trofeo ${t.nome} ottenuto`} />}
        <strong className={`text-[15px] ${t.ottenuto ? 'line-through' : ''}`}>{t.nome}</strong>
        {t.nomeEn && <span className="text-text-muted text-[12px]">({t.nomeEn})</span>}
        <span className={`chip ${t.tipo === 'platino' || t.tipo === 'oro' ? 'chip--attivo' : ''}`}>{NOME_TIPO_TROFEO[t.tipo]}</span>
        {t.mancabile && <span className="chip text-[11px]">mancabile</span>}
        {!t.verificato && <span className="chip text-[11px]" title="Dato da fonte secondaria">da fonte secondaria</span>}
      </div>
      <p className="m-0 text-text-secondary">{t.descrizione}</p>
      {t.come && <p className="m-0"><strong>Come:</strong> {t.come}</p>}
      {t.quando && <p className="m-0"><strong>Quando:</strong> {t.quando}</p>}
    </li>
  );
}

export function CompletamentoPage() {
  useDocumentTitle('Trofei, finali e Covo dei Ladri');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getCompletamento(partitaId ?? undefined), [partitaId]);
  const [params, setParams] = useSearchParams();
  const scheda = (SCHEDE.some(([k]) => k === params.get('scheda')) ? params.get('scheda') : 'trofei') as Scheda;
  const [tipo, setTipo] = useState('');
  const [soloDaFare, setSoloDaFare] = useState(false);
  const d = dati.dati;
  const trofeiVisibili = useMemo(() => (d?.trofei ?? []).filter((t) => (!tipo || t.tipo === tipo) && (!soloDaFare || !t.ottenuto)), [d, tipo, soloDaFare]);
  const aggiorna = (t: TrofeoDto) => { if (d) { const trofei = d.trofei.map((x) => (x.chiave === t.chiave ? t : x)); dati.imposta({ ...d, trofei, ottenuti: trofei.filter((x) => x.ottenuto).length } as CompletamentoDto); } };
  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-3">
          <IntestazionePagina titolo="Trofei, finali e Covo dei Ladri" sottotitolo={<>{d.trofei.length} trofei con come e quando ottenerli, i finali con le condizioni e le date, il Covo dei Ladri con sfide e premi, i DLC, gli effetti del meteo, la Nuova Partita+ e le regole del tempo.{partitaId ? ` Nella partita «${attiva?.nome}»: ${d.ottenuti} trofei ottenuti.` : ' Attiva una partita per spuntare i trofei ottenuti.'}</>} />
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Sezioni">
            {SCHEDE.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={scheda === k} className={`chip touch ${scheda === k ? 'chip--attivo' : ''}`} onClick={() => setParams(k === 'trofei' ? {} : { scheda: k }, { replace: true })}>{l}</button>)}
          </div>
          {scheda === 'trofei' && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <select className="form-input w-auto" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo di trofeo">
                  <option value="">Tutti i tipi</option>
                  {Object.entries(NOME_TIPO_TROFEO).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                </select>
                {partitaId && <label className="flex items-center gap-1.5 text-[13px] touch"><input type="checkbox" className="w-5 h-5" checked={soloDaFare} onChange={(e) => setSoloDaFare(e.target.checked)} /> Solo da ottenere</label>}
                <span className="text-[12px] text-text-muted ml-auto">{trofeiVisibili.length} trofei</span>
              </div>
              <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Trofei">{trofeiVisibili.map((t) => <Trofeo key={t.chiave} t={t} partitaId={partitaId} onCambiato={aggiorna} />)}</ul>
            </div>
          )}
          {scheda === 'finali' && (
            <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Finali">
              {d.finali.map((f) => (
                <li key={f.chiave} className="card flex flex-col gap-1 text-[13px]">
                  <h2 className="m-0 text-[15px] font-semibold">{f.nome}</h2>
                  {f.descrizione && <p className="m-0 text-text-secondary">{f.descrizione}</p>}
                  {f.condizioni.length > 0 && <ul className="m-0 pl-4">{f.condizioni.map((c) => <li key={c}>{c}</li>)}</ul>}
                  {f.date.length > 0 && <Voce titolo="Date chiave">{f.date.join(' · ')}</Voce>}
                  <Fonte url={f.fonte} />
                </li>
              ))}
            </ul>
          )}
          {scheda === 'covo' && (
            <div className="flex flex-col gap-2 text-[13px]">
              <section className="card flex flex-col gap-1">
                <h2 className="m-0 text-[15px] font-semibold">Covo dei Ladri</h2>
                <p className="m-0">{d.covo.introduzione}</p>
                <Voce titolo="Medaglie P">{d.covo.medaglie}</Voce>
                <Fonte url={d.covo.fonte} />
              </section>
              <section className="card flex flex-col gap-1">
                <h2 className="m-0 text-[15px] font-semibold">Sfide ({d.covo.sfide.length})</h2>
                <ul className="m-0 pl-4">{d.covo.sfide.map((s) => <li key={s.nome}><strong>{s.nome}</strong>: {s.requisito}{s.medaglie !== null ? ` (${s.medaglie} medaglie)` : ''}</li>)}</ul>
              </section>
              <section className="card flex flex-col gap-1">
                <h2 className="m-0 text-[15px] font-semibold">Premi e catalogo ({d.covo.premi.length})</h2>
                <div className="overflow-x-auto">
                  <table className="tabella tabella--adattiva text-[12px]">
                    <thead><tr><th>Premio</th><th>Medaglie</th><th>Sblocco</th><th>Effetto</th></tr></thead>
                    <tbody>{d.covo.premi.map((p) => <tr key={p.nome}><td data-etichetta="Premio"><strong>{p.nome}</strong></td><td data-etichetta="Medaglie" className="tabular-nums">{p.costo ?? '—'}</td><td data-etichetta="Sblocco">{p.sblocco ?? '—'}</td><td data-etichetta="Effetto">{p.effetto ?? '—'}</td></tr>)}</tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
          {scheda === 'dlc' && (
            <ul className="m-0 p-0 list-none flex flex-col gap-2 text-[13px]" aria-label="DLC">
              {d.dlc.map((x) => <li key={x.nome} className="card flex flex-col gap-1"><strong className="text-[15px]">{x.nome}</strong><p className="m-0">{x.contenuto}</p>{x.note && <p className="m-0 text-text-muted">{x.note}</p>}<Fonte url={x.fonte} /></li>)}
            </ul>
          )}
          {scheda === 'meteo' && (
            <ul className="m-0 p-0 list-none flex flex-col gap-2 text-[13px]" aria-label="Meteo">
              {d.meteo.map((m) => <li key={m.condizione} className="card flex flex-col gap-1"><strong className="text-[15px]">{m.condizione}</strong><ul className="m-0 pl-4">{m.effetti.map((e) => <li key={e}>{e}</li>)}</ul><Fonte url={m.fonte} /></li>)}
            </ul>
          )}
          {scheda === 'ng' && (
            <div className="flex flex-col gap-2 text-[13px]">
              <section className="card flex flex-col gap-1">
                <h2 className="m-0 text-[15px] font-semibold">Nuova Partita+</h2>
                {d.nuovaPartitaPlus.note && <p className="m-0 text-text-secondary">{d.nuovaPartitaPlus.note}</p>}
                <Voce titolo="Si trasferisce">{d.nuovaPartitaPlus.trasferito.join(' · ')}</Voce>
                <Voce titolo="Non si trasferisce">{d.nuovaPartitaPlus.nonTrasferito.join(' · ')}</Voce>
                <Fonte url={d.nuovaPartitaPlus.fonte} />
              </section>
              <section className="card flex flex-col gap-1">
                <h2 className="m-0 text-[15px] font-semibold">Differenze rispetto a Persona 5</h2>
                <ul className="m-0 pl-4">{d.differenzeRoyal.map((x) => <li key={x}>{x}</li>)}</ul>
              </section>
            </div>
          )}
          {scheda === 'tempo' && (
            <section className="card flex flex-col gap-1 text-[13px]">
              <h2 className="m-0 text-[15px] font-semibold">Fasce orarie e regole del tempo</h2>
              <ul className="m-0 pl-4">{d.tempo.fasce.map((x) => <li key={x}>{x}</li>)}</ul>
              <h3 className="m-0 mt-1 text-[14px] font-semibold">Regole</h3>
              <ul className="m-0 pl-4">{d.tempo.regole.map((x) => <li key={x}>{x}</li>)}</ul>
              <Fonte url={d.tempo.fonte} />
            </section>
          )}
        </div>
      )}
    </PageState>
  );
}
