// ============================================================
// CompletamentoPage — trofei con spunta per partita, finali con condizioni, DLC, meteo, Nuova Partita+, gestione del tempo (Fase 9.1), con un rimando al Covo dei Ladri
// ============================================================

import { useMemo, useState } from 'react';
import { Fonte, VoceTesto } from '../components/shared/VoceFonte';
import { Selettore } from '../components/shared/Selettore';
import { opzioniDaNomi } from '../utils/selettore';
import { useSearchParams } from 'react-router-dom';
import { getCompletamento, impostaTrofeo } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useSchede } from '../hooks/useSchede';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useElementoDaIndirizzo } from '../hooks/useElementoDaIndirizzo';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import type { CompletamentoDto, TrofeoDto } from '../types';
import { IconaScheda } from '../components/shared/IconaAzione';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { IconMedaglia } from '../components/shared/iconeGuida';
import { ModificaGuida } from '../components/guida/ModificaGuida';
import { TitoloSezione } from '../components/shared/TitoloSezione';

// Il Covo dei Ladri non è più una linguetta qui: ha una pagina sua, `/guida/covo`. Non era un
// capitolo dei trofei — è un'area con una valuta propria, 52 sfide che la guadagnano e 36 premi
// che la spendono — e schiacciata in una scheda non si poteva né cercare né contare. Qui resta un
// rimando in cima, così chi la cercava dov'era la trova lo stesso.
const SCHEDE = [
  ['trofei', 'Trofei', 'trofei'], ['finali', 'Finali', 'finali'], ['dlc', 'DLC', 'dlc'],
  ['meteo', 'Meteo', 'meteo'], ['ng', 'Nuova Partita+', 'nuova-partita'], ['tempo', 'Tempo e fasce', 'tempo'],
] as const;
type Scheda = (typeof SCHEDE)[number][0];
const NOME_TIPO_TROFEO: Record<TrofeoDto['tipo'], string> = { bronzo: 'Bronzo', argento: 'Argento', oro: 'Oro', platino: 'Platino' };

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
function Trofeo({ t, partitaId, onCambiato, onModificato }: { t: TrofeoDto; partitaId: number | null; onCambiato: (t: TrofeoDto) => void; onModificato: () => void }) {
  const [occupato, setOccupato] = useState(false);
  const colore = COLORE_TROFEO[t.tipo];
  /** Segna il trofeo come ottenuto o no nella partita (solo se c'è una partita), disattivando la spunta durante la richiesta; passa al genitore il trofeo aggiornato o notifica l'errore. */
  const cambia = async (ottenuto: boolean) => {
    if (!partitaId) return;
    setOccupato(true);
    try { onCambiato(await impostaTrofeo(partitaId, t.chiave, ottenuto)); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupato(false); }
  };
  return (
    <li id={`elemento-${t.chiave}`} className={`card flex min-w-0 flex-col gap-2 testo-13 ${t.ottenuto ? 'opacity-60' : ''}`} style={{ borderLeft: `3px solid ${colore}` }}>
      <div className="flex items-start gap-2.5">
        <span aria-hidden className="mt-0.5 shrink-0" style={{ color: colore }}><IconMedaglia size={28} /></span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <strong className={`testo-15 leading-tight ${t.ottenuto ? 'line-through' : ''}`}>{t.nome}</strong>
          {t.nomeEn && t.nomeEn !== t.nome && <span className="testo-12 text-text-muted">{t.nomeEn}</span>}
        </div>
        <ModificaGuida tipo="trofeo" chiave={t.chiave} cosa={`il trofeo «${t.nome}»`} soloIcona onSalvato={onModificato} />
        {partitaId && (
          <label className="touch flex shrink-0 items-center gap-1.5 testo-12" title={`Segna «${t.nome}» come ottenuto`}>
            <input type="checkbox" className="h-5 w-5" checked={t.ottenuto} disabled={occupato} onChange={(e) => void cambia(e.target.checked)} aria-label={`Trofeo ${t.nome} ottenuto`} />
            Ottenuto
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="chip testo-12" style={{ borderColor: colore, color: colore }}>{NOME_TIPO_TROFEO[t.tipo]}</span>
        {t.mancabile && <span className="chip chip--attivo testo-12" title="Se lo salti, in questa partita non lo prendi più">mancabile</span>}
        {!t.verificato && <span className="chip testo-12" title="Dato da fonte secondaria">da fonte secondaria</span>}
      </div>
      <p className="m-0 text-text-secondary">{t.descrizione}</p>
      {(t.come || t.quando) && (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {t.come && <span className="flex flex-col gap-0.5 rounded-md bg-white/[0.04] px-2.5 py-1.5">
            <span className="testo-12 uppercase tracking-[0.08em] text-text-muted">Come</span>{t.come}
          </span>}
          {t.quando && <span className="flex flex-col gap-0.5 rounded-md bg-white/[0.04] px-2.5 py-1.5">
            <span className="testo-12 uppercase tracking-[0.08em] text-text-muted">Quando</span>{t.quando}
          </span>}
        </div>
      )}
    </li>
  );
}

/**
 * Pagina di trofei e finali: carica il completamento per la partita attiva, sceglie la scheda dal
 * parametro `scheda` dell'URL (i trofei quando manca) e offre un rimando al Covo dei Ladri. Nella
 * scheda dei trofei filtra per metallo e, con una partita, per «solo da ottenere», mostra i
 * conteggi per metallo e le spunte; le altre schede elencano finali, DLC, meteo, Nuova Partita+ e
 * regole del tempo. La spunta aggiorna il trofeo nei dati correnti e ricalcola il totale ottenuto.
 */
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
  /** Dopo una correzione o un ripristino dei testi della guida (L11 · B11): la pagina rilegge i suoi dati. */
  const ricarica = () => void dati.ricarica();
  // L11 B4 (R11-07/3): `?elemento=<chiave>` (la «casa» di un trofeo nella ricerca globale) porta in vista il trofeo e lo evidenzia
  useElementoDaIndirizzo(!!d && scheda === 'trofei', scheda);
  const schede = useSchede({ chiavi: SCHEDE.map(([k]) => k), attiva: scheda, onScegli: (k) => setParams(k === 'trofei' ? {} : { scheda: k }, { replace: true }) });
  const trofeiVisibili = useMemo(() => (d?.trofei ?? []).filter((t) => (!tipo || t.tipo === tipo) && (!soloDaFare || !t.ottenuto)), [d, tipo, soloDaFare]);
  // dai dati correnti: la riga arriva dopo un `await`, e due spunte ravvicinate non devono annullarsi
  const aggiorna = (t: TrofeoDto) => dati.imposta((attuale) => { const trofei = attuale.trofei.map((x) => (x.chiave === t.chiave ? t : x)); return { ...attuale, trofei, ottenuti: trofei.filter((x) => x.ottenuto).length } as CompletamentoDto; });
  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-3">
          <IntestazionePagina titolo="Trofei e finali" sottotitolo={<>{d.trofei.length} trofei con come e quando ottenerli, i finali con le condizioni e le date, i DLC, gli effetti del meteo, la Nuova Partita+ e le regole del tempo.{partitaId ? ` Nella partita «${attiva?.nome}»: ${d.ottenuti} trofei ottenuti.` : ' Attiva una partita per spuntare i trofei ottenuti.'}</>} />
          {/* Il Covo stava qui come terza linguetta ed è andato in una pagina sua: chi lo cercava
              dov'era lo trova lo stesso, invece di concludere che è sparito. */}
          <CollegamentoVisivo to="/guida/covo" tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Covo dei Ladri" dettaglio="sfide, premi e Medaglie P" />
          <FilaScorrevole {...schede.lista} aria-label="Sezioni">
            {SCHEDE.map(([k, l, icona]) => (
              <button key={k} type="button" {...schede.scheda(k)} title={l}
                className={`piastrella-scheda touch ${scheda === k ? 'piastrella-scheda--attiva' : ''}`}>
                <IconaScheda chiave={icona} dimensione={28} /><span>{l}</span>
              </button>
            ))}
          </FilaScorrevole>
          <div {...schede.pannello(scheda)} className="flex min-w-0 flex-col gap-3">
          {scheda === 'trofei' && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Selettore compatto etichetta="Tipo di trofeo" valore={tipo} vuoto="Tutti i tipi" opzioni={opzioniDaNomi(NOME_TIPO_TROFEO)} onCambia={setTipo} />
                {partitaId && <label className="flex items-center gap-1.5 testo-13 touch"><input type="checkbox" className="w-5 h-5" checked={soloDaFare} onChange={(e) => setSoloDaFare(e.target.checked)} /> Solo da ottenere</label>}
                <span className="testo-12 text-text-muted ml-auto">{trofeiVisibili.length} trofei</span>
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
                    {/* Niente segno qui: sarebbe la stessa medaglia quattro volte di fila, e a
                        distinguere i metalli ci pensa già la banda di colore a sinistra. Un segno
                        identico ripetuto non aggiunge informazione, la diluisce. */}
                    <span className="kpi-label">{NOME_TIPO_TROFEO[k]}</span>
                  </div>;
                })}
              </section>}
              {/* Una griglia: le schede sono corte e su uno schermo largo la colonna unica
                  lasciava due terzi di pagina vuoti per cinquantatré voci. */}
              <ul className="m-0 grid list-none grid-cols-1 items-start gap-2 p-0 lg:grid-cols-2 2xl:grid-cols-3" aria-label="Trofei">{trofeiVisibili.map((t) => <Trofeo key={t.chiave} t={t} partitaId={partitaId} onCambiato={aggiorna} onModificato={ricarica} />)}</ul>
            </div>
          )}
          {scheda === 'finali' && (
            <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Finali">
              {d.finali.map((f) => (
                <li key={f.chiave} className="card flex flex-col gap-1 testo-13">
                  <div className="flex items-start gap-2">
                    <TitoloSezione className="min-w-0 flex-1">{f.nome}</TitoloSezione>
                    <ModificaGuida tipo="finale" chiave={f.chiave} cosa={`il finale «${f.nome}»`} soloIcona onSalvato={ricarica} />
                  </div>
                  {f.descrizione && <p className="m-0 text-text-secondary">{f.descrizione}</p>}
                  {f.condizioni.length > 0 && <ul className="m-0 pl-4">{f.condizioni.map((c) => <li key={c}>{c}</li>)}</ul>}
                  {f.date.length > 0 && <VoceTesto titolo="Date chiave">{f.date.join(' · ')}</VoceTesto>}
                  <Fonte url={f.fonte} />
                </li>
              ))}
            </ul>
          )}
          {scheda === 'dlc' && (
            <ul className="m-0 p-0 list-none flex flex-col gap-2 testo-13" aria-label="DLC">
              {d.dlc.map((x) => <li key={x.nome} className="card flex flex-col gap-1"><div className="flex items-start gap-2"><strong className="min-w-0 flex-1 testo-15">{x.nome}</strong><ModificaGuida tipo="dlc" chiave={x.nome} cosa={`il contenuto «${x.nome}»`} soloIcona onSalvato={ricarica} /></div><p className="m-0">{x.contenuto}</p>{x.note && <p className="m-0 text-text-muted">{x.note}</p>}<Fonte url={x.fonte} /></li>)}
            </ul>
          )}
          {scheda === 'meteo' && (
            <ul className="m-0 p-0 list-none flex flex-col gap-2 testo-13" aria-label="Meteo">
              {d.meteo.map((m) => <li key={m.condizione} className="card flex flex-col gap-1"><div className="flex items-start gap-2"><strong className="min-w-0 flex-1 testo-15">{m.condizione}</strong><ModificaGuida tipo="meteo" chiave={m.condizione} cosa={`il meteo «${m.condizione}»`} soloIcona onSalvato={ricarica} /></div><ul className="m-0 pl-4">{m.effetti.map((e) => <li key={e}>{e}</li>)}</ul><Fonte url={m.fonte} /></li>)}
            </ul>
          )}
          {scheda === 'ng' && (
            <div className="flex flex-col gap-2 testo-13">
              <section className="card flex flex-col gap-1">
                <div className="flex items-start gap-2">
                  <TitoloSezione className="min-w-0 flex-1">Nuova Partita+</TitoloSezione>
                  <ModificaGuida tipo="completamento-sezione" chiave="ng" cosa="la sezione «Nuova Partita+»" soloIcona onSalvato={ricarica} />
                </div>
                {d.nuovaPartitaPlus.note && <p className="m-0 text-text-secondary">{d.nuovaPartitaPlus.note}</p>}
                <VoceTesto titolo="Si trasferisce">{d.nuovaPartitaPlus.trasferito.join(' · ')}</VoceTesto>
                <VoceTesto titolo="Non si trasferisce">{d.nuovaPartitaPlus.nonTrasferito.join(' · ')}</VoceTesto>
                <Fonte url={d.nuovaPartitaPlus.fonte} />
              </section>
              <section className="card flex flex-col gap-1">
                <div className="flex items-start gap-2">
                  <TitoloSezione className="min-w-0 flex-1">Differenze rispetto a Persona 5</TitoloSezione>
                  <ModificaGuida tipo="completamento-sezione" chiave="differenze" cosa="le differenze rispetto a Persona 5" soloIcona onSalvato={ricarica} />
                </div>
                <ul className="m-0 pl-4">{d.differenzeRoyal.map((x) => <li key={x}>{x}</li>)}</ul>
              </section>
            </div>
          )}
          {scheda === 'tempo' && (
            <section className="card flex flex-col gap-1 testo-13">
              <div className="flex items-start gap-2">
                <TitoloSezione className="min-w-0 flex-1">Fasce orarie e regole del tempo</TitoloSezione>
                <ModificaGuida tipo="completamento-sezione" chiave="tempo" cosa="le fasce orarie e le regole del tempo" soloIcona onSalvato={ricarica} />
              </div>
              <ul className="m-0 pl-4">{d.tempo.fasce.map((x) => <li key={x}>{x}</li>)}</ul>
              <h3 className="m-0 mt-1 testo-14 font-semibold">Regole</h3>
              <ul className="m-0 pl-4">{d.tempo.regole.map((x) => <li key={x}>{x}</li>)}</ul>
              <Fonte url={d.tempo.fonte} />
            </section>
          )}
          </div>
        </div>
      )}
    </PageState>
  );
}
