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
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import type { CompletamentoDto, TrofeoDto } from '../types';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { IconMedaglia } from '../components/shared/iconeGuida';

// Il Covo dei Ladri non è più una linguetta qui: ha una pagina sua, `/guida/covo`. Non era un
// capitolo dei trofei — è un'area con una valuta propria, 52 sfide che la guadagnano e 36 premi
// che la spendono — e schiacciata in una scheda non si poteva né cercare né contare. Qui resta un
// rimando in cima, così chi la cercava dov'era la trova lo stesso.
const SCHEDE = [['trofei', 'Trofei'], ['finali', 'Finali'], ['dlc', 'DLC'], ['meteo', 'Meteo'], ['ng', 'Nuova Partita+'], ['tempo', 'Tempo e fasce']] as const;
type Scheda = (typeof SCHEDE)[number][0];
const NOME_TIPO_TROFEO: Record<TrofeoDto['tipo'], string> = { bronzo: 'Bronzo', argento: 'Argento', oro: 'Oro', platino: 'Platino' };

function Fonte({ url }: { url: string }) {
  return url ? <a href={url} target="_blank" rel="noreferrer" className="credito self-start">fonte</a> : null;
}
function Voce({ titolo, children }: { titolo: string; children: ReactNode }) {
  return <p className="m-0"><strong>{titolo}:</strong> {children}</p>;
}

/** Il colore del metallo: un trofeo si riconosce dal metallo prima che dal nome. */
const COLORE_TROFEO: Record<TrofeoDto['tipo'], string> = {
  bronzo: '#c07a44', argento: '#c9ced8', oro: '#f5c542', platino: '#9fe8ff',
};

/** La scheda di un trofeo: **la medaglia, il nome, e come si prende**.
 *
 * Erano cinquantatré righe a tutta larghezza, tutte uguali e tutte grigie, con «Come:» e
 * «Quando:» in grassetto dentro il testo: per trovare i quattro d'oro bisognava leggerle una per
 * una. Ora il metallo è un colore e una medaglia, «mancabile» è un avviso acceso — perché quello
 * è il dato che, ignorato, costa la partita — e i due testi hanno l'etichetta piccola sopra. */
function Trofeo({ t, partitaId, onCambiato }: { t: TrofeoDto; partitaId: number | null; onCambiato: (t: TrofeoDto) => void }) {
  const [occupato, setOccupato] = useState(false);
  const colore = COLORE_TROFEO[t.tipo];
  const cambia = async (ottenuto: boolean) => {
    if (!partitaId) return;
    setOccupato(true);
    try { onCambiato(await impostaTrofeo(partitaId, t.chiave, ottenuto)); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupato(false); }
  };
  return (
    <li className={`card flex min-w-0 flex-col gap-2 text-[13px] ${t.ottenuto ? 'opacity-60' : ''}`} style={{ borderLeft: `3px solid ${colore}` }}>
      <div className="flex items-start gap-2.5">
        <span aria-hidden className="mt-0.5 shrink-0" style={{ color: colore }}><IconMedaglia size={28} /></span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <strong className={`text-[15px] leading-tight ${t.ottenuto ? 'line-through' : ''}`}>{t.nome}</strong>
          {t.nomeEn && t.nomeEn !== t.nome && <span className="text-[11px] text-text-muted">{t.nomeEn}</span>}
        </div>
        {partitaId && (
          <label className="touch flex shrink-0 items-center gap-1.5 text-[12px]" title={`Segna «${t.nome}» come ottenuto`}>
            <input type="checkbox" className="h-5 w-5" checked={t.ottenuto} disabled={occupato} onChange={(e) => void cambia(e.target.checked)} aria-label={`Trofeo ${t.nome} ottenuto`} />
            Ottenuto
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="chip text-[11px]" style={{ borderColor: colore, color: colore }}>{NOME_TIPO_TROFEO[t.tipo]}</span>
        {t.mancabile && <span className="chip chip--attivo text-[11px]" title="Se lo salti, in questa partita non lo prendi più">mancabile</span>}
        {!t.verificato && <span className="chip text-[11px]" title="Dato da fonte secondaria">da fonte secondaria</span>}
      </div>
      <p className="m-0 text-text-secondary">{t.descrizione}</p>
      {(t.come || t.quando) && (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {t.come && <span className="flex flex-col gap-0.5 rounded-md bg-white/[0.04] px-2.5 py-1.5">
            <span className="text-[10px] uppercase tracking-[0.08em] text-text-muted">Come</span>{t.come}
          </span>}
          {t.quando && <span className="flex flex-col gap-0.5 rounded-md bg-white/[0.04] px-2.5 py-1.5">
            <span className="text-[10px] uppercase tracking-[0.08em] text-text-muted">Quando</span>{t.quando}
          </span>}
        </div>
      )}
    </li>
  );
}

export function CompletamentoPage() {
  useDocumentTitle('Trofei e finali');
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
          <IntestazionePagina titolo="Trofei e finali" sottotitolo={<>{d.trofei.length} trofei con come e quando ottenerli, i finali con le condizioni e le date, i DLC, gli effetti del meteo, la Nuova Partita+ e le regole del tempo.{partitaId ? ` Nella partita «${attiva?.nome}»: ${d.ottenuti} trofei ottenuti.` : ' Attiva una partita per spuntare i trofei ottenuti.'}</>} />
          {/* Il Covo stava qui come terza linguetta ed è andato in una pagina sua: chi lo cercava
              dov'era lo trova lo stesso, invece di concludere che è sparito. */}
          <CollegamentoVisivo to="/guida/covo" tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Covo dei Ladri" dettaglio="sfide, premi e Medaglie P" />
          <FilaScorrevole role="tablist" aria-label="Sezioni">
            {SCHEDE.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={scheda === k} className={`chip touch ${scheda === k ? 'chip--attivo' : ''}`} onClick={() => setParams(k === 'trofei' ? {} : { scheda: k }, { replace: true })}>{l}</button>)}
          </FilaScorrevole>
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
              {/* Quanti ne mancano per metallo: la domanda che si fa chi guarda i trofei, e che
                  prima si poteva rispondere solo filtrando quattro volte e contando a occhio. */}
              {partitaId && <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Trofei per metallo">
                {(Object.keys(NOME_TIPO_TROFEO) as TrofeoDto['tipo'][]).map((k) => {
                  const dello = d.trofei.filter((t) => t.tipo === k);
                  if (dello.length === 0) return null;
                  const presi = dello.filter((t) => t.ottenuto).length;
                  return <div key={k} className="kpi-tile" style={{ borderLeft: `3px solid ${COLORE_TROFEO[k]}` }}>
                    <span className="kpi-value">{presi}<span className="text-text-muted">/{dello.length}</span></span>
                    <span className="kpi-label">{NOME_TIPO_TROFEO[k]}</span>
                  </div>;
                })}
              </section>}
              {/* Una griglia: le schede sono corte e su uno schermo largo la colonna unica
                  lasciava due terzi di pagina vuoti per cinquantatré voci. */}
              <ul className="m-0 grid list-none grid-cols-1 items-start gap-2 p-0 lg:grid-cols-2 2xl:grid-cols-3" aria-label="Trofei">{trofeiVisibili.map((t) => <Trofeo key={t.chiave} t={t} partitaId={partitaId} onCambiato={aggiorna} />)}</ul>
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
