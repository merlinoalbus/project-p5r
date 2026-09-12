// ============================================================
// AttivitaPage — attività del tempo libero e lavori: che cosa alzano, dove, quando, quanto pagano
// ============================================================
//
// La scheda legge i valori (tipo e fascia dal catalogo di `shared/attivita`, la sede come luogo
// della città, la paga in yen, gli effetti dichiarati con le loro condizioni) e i dettagli come
// un testo solo. Niente più regole/premi/altri effetti/sblocco in prosa, niente fonte.
// ============================================================

import { useMemo, useState } from 'react';
import { Selettore } from '../components/shared/Selettore';
import { opzioniDaNomi } from '../utils/selettore';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { getAttivita } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { NOME_DOTE, ancoraLuogo } from '../utils/citta';
import { NOME_FASCIA_ATTIVITA, NOME_TIPO_ATTIVITA } from '../../shared/attivita';
import type { AttivitaDto } from '../types';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { IconaCategoria } from '../components/guida/IconaCategoria';
import { ChipDisponibilita } from '../components/guida/ChipDisponibilita';
import { useSuggerimenti } from '../stores/suggerimentiStore';
import { classiSuggerito } from '../utils/suggerimenti';
import { TargaSuggerito } from '../components/shared/Suggerito';
import { CollegamentoMappa } from '../components/mappe/CollegamentoMappa';
import { AssetImg } from '../components/shared/AssetImg';
import { DoveSiTrova } from '../components/mappe/DoveSiTrova';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { AggiungiAlCatalogo, CorreggiElemento } from '../components/guida/AzioniCatalogo';
import { formattaYen, haDote, pagaTesto } from '../utils/letture';

const SCHEDE = [['attivita', 'Attività'], ['lavori', 'Lavori']] as const;
type Scheda = (typeof SCHEDE)[number][0];

/** Gli effetti dichiarati come chip: la Dote con le note e, fra parentesi, la condizione. */
function Effetti({ testi }: { testi: string[] }) {
  if (testi.length === 0) return null;
  return <span className="flex flex-wrap gap-1">{testi.map((t, i) => <span key={i} className="chip chip--attivo">{t}</span>)}</span>;
}

function Attivita({ a, onCambiata, mappaAperta, onMappa }: { a: AttivitaDto; onCambiata: () => void; mappaAperta: boolean; onMappa: () => void }) {
  const [aperta, setAperta] = useState(false);
  const sugg = useSuggerimenti();
  const paga = pagaTesto(a.pagaYen, a.pagaMassima);
  return (
    <li className={`card flex gap-3 text-[13px] ${classiSuggerito(sugg.evidenziato('attivita', a.chiave))}`}>
      {/* La figura dell'attività; finché l'illustrazione non c'è resta l'icona del tipo. */}
      <AssetImg nome={`attivita/${a.chiave}`} alt="" decorativa className="shrink-0 rounded-md object-contain"
        style={{ width: 56, height: 56 }}
        fallback={<span className="shrink-0"><IconaCategoria categoria={a.tipo} dimensione={56} /></span>} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
      <button type="button" className="text-left flex flex-wrap items-center gap-2 touch" onClick={() => setAperta((x) => !x)} aria-expanded={aperta}>
        <strong className="text-[15px]">{a.nome}</strong>
        <span className="chip">{(NOME_TIPO_ATTIVITA as Record<string, string>)[a.tipo] ?? a.tipo}</span>
        {sugg.evidenziato('attivita', a.chiave) && <TargaSuggerito motivo={sugg.motivo('attivita', a.chiave)} compatta />}
        {a.fascia && <span className="chip">{NOME_FASCIA_ATTIVITA[a.fascia] ?? a.fascia}</span>}
        <Effetti testi={a.effettiTesto} />
        <ChipDisponibilita disponibilita={a.disponibilita ?? undefined} compatto />
        {!a.verificato && <span className="chip text-[11px]" title="Dato da fonte secondaria">da fonte secondaria</span>}
      </button>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-text-secondary">
        {/* La sede apre la pagina del quartiere con il luogo evidenziato; senza sede resta il quartiere o il testo. */}
        {(a.sedeChiave || a.luogoChiave || a.luogo) && <span><strong className="text-text">Dove:</strong> {a.sedeChiave && a.luogoChiave ? <Link to={`/guida/citta/${a.luogoChiave}#${ancoraLuogo(a.sedeChiave)}`}>{a.sedeNome ?? a.sedeChiave}</Link> : a.luogoChiave ? <Link to={`/guida/citta/${a.luogoChiave}`}>{a.luogo || a.luogoChiave}</Link> : a.luogo}</span>}
        <CollegamentoMappa tipo="attivita" chiave={a.chiave} compatto />
        {a.costo !== null && a.costo > 0 && <span><strong className="text-text">Costo:</strong> {formattaYen(a.costo)}</span>}
        {paga && <span><strong className="text-text">Paga:</strong> {paga}</span>}
      </div>
      {aperta && (
        <div className="flex flex-col gap-1">
          {a.dettagli && <p className="m-0 whitespace-pre-line">{a.dettagli}</p>}
          {a.effettiTesto.length === 0 && <p className="m-0 text-text-muted">Nessun effetto dichiarato.</p>}
          {/* La mappa si apre una per volta in tutta la pagina. */}
          {mappaAperta
            ? <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-text">Dove si trova</strong>
                  <button type="button" className="btn btn-ghost btn-sm touch" onClick={onMappa}>Chiudi la mappa</button>
                </div>
                <DoveSiTrova tipo="attivita" chiave={a.chiave} titolo={a.nome} altezza={260} />
              </div>
            : null}
          <div className="flex flex-wrap items-center gap-2">
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="posizione" dimensione={20} />}
              titolo={mappaAperta ? 'Nascondi la posizione' : 'Mostra posizione'} onClick={onMappa}
              aria-label={`${mappaAperta ? 'Nascondi' : 'Mostra'} posizione di ${a.nome}`} />
            <CorreggiElemento tipo="attivita" chiave={a.chiave} onSalvato={onCambiata} />
          </div>
        </div>
      )}
      </div>
    </li>
  );
}

export function AttivitaPage() {
  useDocumentTitle('Attività e Doti sociali');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getAttivita(partitaId ?? undefined), [partitaId]);
  const [params, setParams] = useSearchParams();
  const scheda = (SCHEDE.some(([k]) => k === params.get('scheda')) ? params.get('scheda') : 'attivita') as Scheda;
  const [dote, setDote] = useState('');
  // Una sola mappa aperta in tutta la pagina: la chiave dell'attività che la mostra.
  const [conMappa, setConMappa] = useState<string | null>(null);
  const d = dati.dati;
  // I videogiochi hanno la loro pagina, con i round e i contenuti che sbloccano.
  const attivitaVisibili = useMemo(() => (d?.attivita ?? []).filter((a) => a.tipo !== 'videogioco' && (!dote || haDote(a.effetti, dote))), [d, dote]);
  const lavoriVisibili = useMemo(() => (d?.lavori ?? []).filter((a) => !dote || haDote(a.effetti, dote)), [d, dote]);
  if (params.get('scheda') === 'libri') return <Navigate to="/guida/libri" replace />;
  if (params.get('scheda') === 'film') return <Navigate to="/guida/film" replace />;
  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-3">
          <IntestazionePagina titolo="Attività e Doti sociali" sottotitolo={<>Mini-giochi, lavori e studio con le note (♪) delle Doti che alzano, dove e quando farli. I videogiochi hanno la <Link to="/guida/videogiochi" className="text-primary">loro pagina</Link>, con i round e quello che sbloccano.</>} />
          <div className="flex flex-wrap items-center gap-1.5">
            <FilaScorrevole role="tablist" aria-label="Sezioni">
              {SCHEDE.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={scheda === k} className={`piastrella-scheda touch ${scheda === k ? 'piastrella-scheda--attiva' : ''}`} onClick={() => setParams(k === 'attivita' ? {} : { scheda: k }, { replace: true })} title={l}><IconaCategoria categoria={k === 'attivita' ? 'minigiochi' : k} dimensione={28} /><span>{l}</span></button>)}
            </FilaScorrevole>
            <Selettore compatto className="ml-auto" etichetta="Dote" valore={dote} vuoto="Tutte le Doti" opzioni={opzioniDaNomi(NOME_DOTE)} onCambia={setDote} />
            <AggiungiAlCatalogo tipo="attivita" titolo={scheda === 'lavori' ? 'Aggiungi un lavoro' : 'Aggiungi un’attività'} onSalvato={() => void dati.ricarica()} />
          </div>
          {scheda === 'attivita' && <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Attività">{attivitaVisibili.map((a) => <Attivita key={a.chiave} a={a} onCambiata={() => void dati.ricarica()} mappaAperta={conMappa === a.chiave} onMappa={() => setConMappa((x) => (x === a.chiave ? null : a.chiave))} />)}</ul>}
          {scheda === 'lavori' && <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Lavori">{lavoriVisibili.map((a) => <Attivita key={a.chiave} a={a} onCambiata={() => void dati.ricarica()} mappaAperta={conMappa === a.chiave} onMappa={() => setConMappa((x) => (x === a.chiave ? null : a.chiave))} />)}</ul>}
        </div>
      )}
    </PageState>
  );
}
